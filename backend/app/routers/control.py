from fastapi import APIRouter
from gdb import gdb

router = APIRouter()

async def broadcast_log(msg: str):
    await gdb.msg_queue.put({"type": "system_log", "payload": msg})

@router.post("/control/run")
async def run_program():
    await broadcast_log("CMD: Run")
    await gdb.send_command("-exec-run")
    return {"status": "ok"}

@router.post("/control/step_into")
async def step_into():
    await broadcast_log("CMD: Step Into")
    await gdb.send_command("-exec-step-instruction")
    return {"status": "stepping"}

@router.post("/control/step_over")
async def step_over():
    await broadcast_log("CMD: Step Over")
    await gdb.send_command("-exec-next-instruction")
    return {"status": "stepping"}
