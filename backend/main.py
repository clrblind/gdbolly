
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from gdb_controller import gdb
from db_manager import DBManager
from settings_manager import SettingsManager
import asyncio
import hashlib
import os

# Global Managers
db_manager = None
settings_manager = SettingsManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    await settings_manager.init_db()
    yield
    # Shutdown logic if needed (e.g. gdb.stop())
    await gdb.stop()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

async def broadcast_log(msg: str):
    # Frontend handles timestamps and formatting, just send raw message
    await gdb.msg_queue.put({"type": "system_log", "payload": msg})

def bytes_to_hex_str(bytes_list):
    """[144, 144] -> [0x90, 0x90]"""
    if not bytes_list: return "[]"
    return "[" + ", ".join([f"0x{b:02x}" for b in bytes_list]) + "]"

@app.get("/settings")
async def get_settings():
    settings = await settings_manager.get_all_settings()
    return settings

@app.post("/settings")
async def save_setting_endpoint(payload: dict = Body(...)):
    key = payload.get("key")
    value = payload.get("value")
    if key:
        await settings_manager.save_setting(key, value)
    return {"status": "saved"}

@app.post("/session/load")
async def load_binary(path: str = "/targets/hello"):
    global db_manager
    await broadcast_log(f"Session Load Request: {path}")
    
    await gdb.stop()
    
    # Fix: Secure compilation without shell injection
    if not os.path.exists(path) and os.path.exists(path + ".c"):
        await broadcast_log(f"Compiling {path}.c ...")
        try:
            # -g for debug info
            process = await asyncio.create_subprocess_exec(
                "gcc", "-g", f"{path}.c", "-o", path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            if process.returncode != 0:
                error_msg = stderr.decode()
                await broadcast_log(f"Compilation Failed: {error_msg}")
                return {"error": "Compilation failed", "details": error_msg}
            
            await broadcast_log("Compilation successful.")
        except Exception as e:
            await broadcast_log(f"Compilation Error: {str(e)}")
            return {"error": str(e)}
    
    try:
        with open(path, "rb") as f:
            file_hash = hashlib.md5(f.read()).hexdigest()[:8]
    except FileNotFoundError:
        file_hash = "000"

    target_name = os.path.basename(path)
    db_manager = DBManager(target_name, file_hash)
    await db_manager.init_db()
    
    await gdb.start(path)
    await broadcast_log(f"GDB Started for {path}")
    
    comments = await db_manager.get_comments()
    patches = await db_manager.get_patches()
    await broadcast_log(f"DB Loaded: {len(comments)} comments, {len(patches)} patches")
    
    return {
        "status": "ok", 
        "message": f"Loaded {path}",
        "comments": comments,
        "patches": patches
    }

@app.post("/database/reset")
async def reset_database():
    if db_manager:
        await broadcast_log("Resetting database...")
        await db_manager.reset_db()
        await broadcast_log("Database cleared and re-initialized.")
        return {"status": "ok"}
    return {"error": "No DB loaded"}

@app.post("/control/run")
async def run_program():
    await broadcast_log("CMD: Run")
    await gdb.send_command("-exec-run")
    return {"status": "ok"}

@app.post("/control/step_into")
async def step_into():
    await broadcast_log("CMD: Step Into")
    await gdb.send_command("-exec-step-instruction")
    return {"status": "stepping"}

@app.post("/control/step_over")
async def step_over():
    await broadcast_log("CMD: Step Over")
    await gdb.send_command("-exec-next-instruction")
    return {"status": "stepping"}

@app.post("/memory/disassemble")
async def get_disassembly(payload: dict = Body(...)):
    start = payload.get("start")
    count = payload.get("count", 100)
    
    if not start:
        return {"error": "Missing start address"}

    try:
        start_int = int(start, 16)
        end_int = start_int + (count * 8) 
        end_hex = hex(end_int)
        
        cmd = f"-data-disassemble -s {start} -e {end_hex} -- 2"
        await gdb.send_command(cmd)
        return {"status": "requested", "cmd": cmd}
    except Exception as e:
        return {"error": str(e)}

@app.post("/memory/write")
async def write_memory(payload: dict = Body(...)):
    address = payload.get("address")
    new_bytes = payload.get("bytes")
    
    if not address or new_bytes is None:
        return {"error": "Invalid parameters"}
    
    await broadcast_log(f"Request write at {address}: {bytes_to_hex_str(new_bytes)}")

    # 1. Read original bytes (Wait for reliable response)
    # Using existing read_memory which uses tokens
    orig_bytes = await gdb.read_memory(address, len(new_bytes))
    
    if not orig_bytes:
        msg = f"Failed to read original bytes at {address}. Aborting write."
        await broadcast_log(msg)
        return {"error": msg}

    await broadcast_log(f"Original bytes at {address}: {bytes_to_hex_str(orig_bytes)}")
    
    # 2. Write new bytes
    # FIX: Now awaits for actual GDB confirmation via token
    success = await gdb.write_memory(address, new_bytes)
    
    if not success:
        msg = f"Failed to write memory at {address}."
        await broadcast_log(msg)
        return {"error": msg}
    
    # 3. Save to DB
    if db_manager:
        await db_manager.save_patch(address, orig_bytes, new_bytes)
        await broadcast_log(f"Patch saved to DB")

    return {"status": "written"}

@app.post("/memory/revert")
async def revert_memory(payload: dict = Body(...)):
    address = payload.get("address")
    if not address or not db_manager:
        return {"error": "Invalid params or DB not loaded"}
    
    # 1. Get patch info
    patch = await db_manager.get_patch(address)
    if not patch:
        await broadcast_log(f"Revert failed: No patch found for {address}")
        return {"error": "No patch found"}
    
    # 2. Restore bytes
    orig_str = patch['orig_bytes']
    orig_bytes = [int(orig_str[i:i+2], 16) for i in range(0, len(orig_str), 2)]
    
    await broadcast_log(f"Reverting {address} to {bytes_to_hex_str(orig_bytes)}")
    
    success = await gdb.write_memory(address, orig_bytes)
    if not success:
        return {"error": "Failed to revert memory write"}

    # 3. Delete from DB
    await db_manager.delete_patch(address)
    
    return {"status": "reverted"}

@app.post("/session/comment")
async def save_comment(payload: dict = Body(...)):
    address = payload.get("address")
    comment = payload.get("comment")
    if db_manager and address:
        await db_manager.save_comment(address, comment)
        await broadcast_log(f"Comment saved for {address}: {comment}")
    return {"status": "saved"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await gdb.msg_queue.get()
            await websocket.send_json(data)
    except WebSocketDisconnect:
        print("Client disconnected")
