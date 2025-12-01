from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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
    # Для теста скомпилируем файл, если его нет (удобство для первого запуска)
    import os
    if not os.path.exists(path) and os.path.exists(path + ".c"):
        print("Compiling hello.c...")
        os.system(f"gcc -g {path}.c -o {path}")
        
    await gdb.start(path)
    return {"status": "ok", "message": f"Loaded {path}"}

@app.post("/control/run")
async def run_program():
    # -exec-run запускает программу
    await gdb.send_command("-exec-run")
    return {"status": "ok"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Ждем сообщение из очереди GDB контроллера
            data = await gdb.msg_queue.get()
            await websocket.send_json(data)
    except WebSocketDisconnect:
        print("Client disconnected")

@app.post("/control/step_into")
async def step_into():
    await gdb.send_command("-exec-step")
    return {"status": "stepping"}

@app.post("/control/step_over")
async def step_over():
    await gdb.send_command("-exec-next")
    return {"status": "stepping"}