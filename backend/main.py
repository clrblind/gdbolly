from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from gdb_controller import gdb
from db_manager import DBManager
import asyncio
import hashlib
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global DB Manager reference
db_manager = None

@app.post("/session/load")
async def load_binary(path: str = "/targets/hello"):
    global db_manager
    if not os.path.exists(path) and os.path.exists(path + ".c"):
        print("Compiling hello.c...")
        os.system(f"gcc -g {path}.c -o {path}")
    
    # Calculate MD5 for DB identification
    try:
        with open(path, "rb") as f:
            file_hash = hashlib.md5(f.read()).hexdigest()[:8]
    except FileNotFoundError:
        file_hash = "000"

    target_name = os.path.basename(path)
    db_manager = DBManager(target_name, file_hash)
    await db_manager.init_db()
    
    await gdb.start(path)
    
    # Load saved state
    comments = await db_manager.get_comments()
    patches = await db_manager.get_patches()
    
    return {
        "status": "ok", 
        "message": f"Loaded {path}",
        "comments": comments,
        "patches": patches
    }

@app.post("/control/run")
async def run_program():
    await gdb.send_command("-exec-run")
    return {"status": "ok"}

@app.post("/control/step_into")
async def step_into():
    await gdb.send_command("-exec-step")
    return {"status": "stepping"}

@app.post("/control/step_over")
async def step_over():
    await gdb.send_command("-exec-next")
    return {"status": "stepping"}

@app.post("/memory/disassemble")
async def get_disassembly(payload: dict = Body(...)):
    start = payload.get("start")
    count = payload.get("count", 100)
    
    if not start:
        return {"error": "Missing start address"}

    try:
        # GDB requires end address. Heuristic: 8 bytes per instr.
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
    # payload: { "address": "0x...", "bytes": [0x90, 0x90] }
    address = payload.get("address")
    new_bytes = payload.get("bytes")
    
    if not address or new_bytes is None:
        return {"error": "Invalid parameters"}
    
    # 1. Read original bytes
    orig_bytes = await gdb.read_memory(address, len(new_bytes))
    
    # 2. Write new bytes
    await gdb.write_memory(address, new_bytes)
    
    # 3. Save to DB
    if db_manager and orig_bytes:
        await db_manager.save_patch(address, orig_bytes, new_bytes)

    return {"status": "written"}

@app.post("/memory/revert")
async def revert_memory(payload: dict = Body(...)):
    address = payload.get("address")
    if not address or not db_manager:
        return {"error": "Invalid params or DB not loaded"}
    
    # 1. Get patch info
    patch = await db_manager.get_patch(address)
    if not patch:
        return {"error": "No patch found"}
    
    # 2. Restore bytes (convert hex string back to ints)
    orig_str = patch['orig_bytes']
    orig_bytes = [int(orig_str[i:i+2], 16) for i in range(0, len(orig_str), 2)]
    
    await gdb.write_memory(address, orig_bytes)
    
    # 3. Delete from DB
    await db_manager.delete_patch(address)
    
    return {"status": "reverted"}

@app.post("/session/comment")
async def save_comment(payload: dict = Body(...)):
    address = payload.get("address")
    comment = payload.get("comment")
    if db_manager and address:
        await db_manager.save_comment(address, comment)
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