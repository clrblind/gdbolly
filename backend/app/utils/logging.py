from gdb import gdb

async def broadcast_log(msg: str):
    await gdb.msg_queue.put({"type": "system_log", "payload": msg})

async def broadcast_progress(message: str, percent: int, show: bool = True):
    await gdb.msg_queue.put({
        "type": "progress", 
        "payload": {
            "message": message, 
            "percent": percent,
            "show": show
        }
    })
