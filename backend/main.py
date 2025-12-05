from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from gdb_controller import gdb
from db_manager import DBManager
from settings_manager import SettingsManager
import asyncio
import hashlib
import os
import stat

# Global Managers
db_manager = None
settings_manager = SettingsManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    await settings_manager.init_db()
    yield
    # Shutdown logic
    await gdb.stop()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

async def broadcast_log(msg: str):
    await gdb.msg_queue.put({"type": "system_log", "payload": msg})

def bytes_to_hex_str(bytes_list):
    """[144, 0x90, '0xcc'] -> [0x90, 0x90, 0xcc]"""
    if not bytes_list: return "[]"
    res = []
    for b in bytes_list:
        if isinstance(b, str):
            res.append(b.lower() if b.startswith("0x") else f"0x{b.lower()}")
        elif isinstance(b, int):
            res.append(f"0x{b:02x}")
        else:
            res.append(str(b))
    return "[" + ", ".join(res) + "]"

def int_to_hex_addr(val: int) -> str:
    return f"0x{val:x}"

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

# Track last opened binary path
last_opened_path = "/targets/hello"

@app.get("/targets/list")
async def list_targets():
    """List all files in /targets directory with metadata"""
    targets_dir = "/targets"
    if not os.path.exists(targets_dir):
        return {"files": []}
    
    files = []
    try:
        for item in os.listdir(targets_dir):
            item_path = os.path.join(targets_dir, item)
            if os.path.isfile(item_path):
                stat = os.stat(item_path)
                files.append({
                    "name": item,
                    "size": stat.st_size,
                    "executable": os.access(item_path, os.X_OK)
                })
    except Exception as e:
        await broadcast_log(f"Error listing targets: {e}")
        return {"error": str(e), "files": []}
    
    return {"files": sorted(files, key=lambda x: x['name'])}

@app.post("/session/load")
async def load_binary(payload: dict = Body(None)):
    global db_manager, last_opened_path
    
    # If no payload or no path specified, use last opened path
    if payload is None or "path" not in payload:
        path = last_opened_path
    else:
        path = payload["path"]
    
    await broadcast_log(f"Session Load Request: {path}")

    # Ensure binary is executable
    if os.path.exists(path):
        try:
            current_mode = os.stat(path).st_mode
            if not (current_mode & stat.S_IXUSR):
                os.chmod(path, current_mode | stat.S_IXUSR)
                await broadcast_log(f"Added executable permission to {path}")
        except Exception as e:
            await broadcast_log(f"Warning: Failed to set executable permission: {e}")
    
    await gdb.stop()
    
    if not os.path.exists(path) and os.path.exists(path + ".c"):
        await broadcast_log(f"Compiling {path}.c ...")
        try:
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
            await broadcast_log(f"Compilation Error ({type(e).__name__}): {str(e)}")
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
    
    # Update last opened path on successful load
    last_opened_path = path
    
    comments = await db_manager.get_comments()
    patches = await db_manager.get_patches()
    await broadcast_log(f"DB Loaded: {len(comments)} comments, {len(patches)} patched bytes")
    
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
    """
    Byte-level patching logic:
    1. Read original memory from GDB (chunk).
    2. Check DB for existing patches to preserve 'original' byte.
    3. Update DB with new bytes.
    4. Write bytes to GDB.
    """
    address_str = payload.get("address") # hex string "0x4000"
    raw_bytes = payload.get("bytes")     # list of ints [144] or strings ["0x90"]
    
    if not address_str or raw_bytes is None:
        return {"error": "Invalid parameters"}
    
    # Normalize inputs for processing
    new_bytes = []
    for b in raw_bytes:
        if isinstance(b, str):
            # Parse hex string "0x90" or "90"
            clean = b.replace("0x", "").strip()
            new_bytes.append(int(clean, 16))
        else:
            new_bytes.append(b)

    await broadcast_log(f"REQ: Write {len(new_bytes)} bytes at {address_str}: {bytes_to_hex_str(new_bytes)}")

    try:
        start_addr = int(address_str, 16)
    except ValueError:
        return {"error": "Invalid address format"}

    # 1. Read current memory state from GDB (to ensure we have base data)
    # We read exactly len(new_bytes)
    current_mem_bytes = await gdb.read_memory(address_str, len(new_bytes))
    
    if current_mem_bytes is None:
        msg = f"Failed to read memory at {address_str}. Aborting patch."
        await broadcast_log(msg)
        return {"error": msg}

    if not db_manager:
        return {"error": "DB not loaded"}

    # 2. Process byte-by-byte
    for i, byte_val in enumerate(new_bytes):
        curr_addr = start_addr + i
        curr_addr_hex = int_to_hex_addr(curr_addr)
        
        # Check if we already have a patch here
        existing_patch = await db_manager.get_patch_byte(curr_addr_hex)
        
        orig_byte = 0
        
        if existing_patch:
            # If patch exists, the 'orig_byte' in DB is the true original.
            # Do NOT overwrite it with current_mem_bytes[i] (which is the previous patch)
            orig_byte = existing_patch['orig_byte']
        else:
            # If no patch, the current GDB memory IS the original
            if i < len(current_mem_bytes):
                orig_byte = current_mem_bytes[i]
            else:
                orig_byte = 0 # Should not happen if read succeeded
        
        # Save to DB
        await db_manager.save_patch_byte(curr_addr_hex, orig_byte, byte_val)

    # 3. Apply to GDB
    success = await gdb.write_memory(address_str, new_bytes)
    
    if success:
        await broadcast_log(f"Patch applied successfully at {address_str}")
        return {"status": "written"}
    else:
        return {"error": "Failed to write to GDB"}

@app.post("/memory/revert")
async def revert_memory(payload: dict = Body(...)):
    """
    Reverts a SINGLE BYTE at specific address.
    """
    address = payload.get("address") # hex string "0x..."
    
    if not address or not db_manager:
        return {"error": "Invalid params"}
    
    # 1. Get patch info
    patch = await db_manager.get_patch_byte(address)
    if not patch:
        await broadcast_log(f"Revert ignore: No patch at {address}")
        return {"error": "No patch found"}
    
    orig_byte = patch['orig_byte']
    
    await broadcast_log(f"REQ: Revert {address} to 0x{orig_byte:02x}")
    
    # 2. Write original byte to GDB
    success = await gdb.write_memory(address, [orig_byte])
    
    if not success:
        return {"error": "Failed to revert memory in GDB"}

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
