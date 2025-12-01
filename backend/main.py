from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from gdb_controller import gdb
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/session/load")
async def load_binary(path: str = "/targets/hello"):
    import os
    if not os.path.exists(path) and os.path.exists(path + ".c"):
        print("Compiling hello.c...")
        os.system(f"gcc -g {path}.c -o {path}")
        
    await gdb.start(path)
    return {"status": "ok", "message": f"Loaded {path}"}

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
async def get_disassembly(start: str, count: int = 100):
    # GDB syntax: -data-disassemble -s START -e END -- 2
    # We estimate end based on count * 4 bytes (rough average), 
    # but GDB requires an end address. 
    # Alternatively, use mode 0 (standard) or mixed.
    # We will try to fetch a chunk.
    
    # Simple heuristic: fetch 100 instructions? GDB MI doesn't support "count" directly in all versions 
    # without calculating address. 
    # Let's assume max instruction length 15 bytes to be safe, so 100 * 15 = 1500 bytes.
    
    try:
        start_int = int(start, 16)
        end_int = start_int + (count * 8) # Average 8 bytes per instr
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
    bytes_list = payload.get("bytes")
    
    if not address or bytes_list is None:
        return {"error": "Invalid parameters"}
        
    await gdb.write_memory(address, bytes_list)
    
    # Force refresh of disassembly after patch
    # We don't know the exact range here, but we can assume the frontend will re-request 
    # or we can push a refresh if needed. For now, frontend drives the refresh.
    return {"status": "written"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await gdb.msg_queue.get()
            await websocket.send_json(data)
    except WebSocketDisconnect:
        print("Client disconnected")
