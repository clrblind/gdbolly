import os
import stat
import hashlib
import asyncio
from fastapi import APIRouter, Body
from gdb import gdb
from app.utils.formatting import bytes_to_hex_str
from app.utils.logging import broadcast_log, broadcast_progress
from db_manager import DBManager
from app.state import set_db_manager, get_db_manager, get_last_opened_path, set_last_opened_path

router = APIRouter()



@router.get("/targets/list")
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
                stat_info = os.stat(item_path)
                files.append({
                    "name": item,
                    "size": stat_info.st_size,
                    "executable": os.access(item_path, os.X_OK)
                })
    except Exception as e:
        await broadcast_log(f"Error listing targets: {e}")
        return {"error": str(e), "files": []}
    
    return {"files": sorted(files, key=lambda x: x['name'])}

@router.post("/session/load")
async def load_binary(payload: dict = Body(None)):
    # usage: we access globals via getters/setters or direct import if mutable
    # app/state.py handles this
    
    last_path = get_last_opened_path()
    
    # If no payload or no path specified, use last opened path
    if payload is None or "path" not in payload:
        path = last_path
    else:
        path = payload["path"]
    
    await broadcast_log(f"Session Load Request: {path}")
    await broadcast_progress(f"Checking permissions...", 10)

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
        await broadcast_progress(f"Compiling {os.path.basename(path)}...", 30)
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

    await broadcast_progress("Initializing Database...", 50)
    target_name = os.path.basename(path)
    new_db_manager = DBManager(target_name, file_hash)
    await new_db_manager.init_db()
    
    set_db_manager(new_db_manager)
    
    await gdb.start(path)
    await broadcast_log(f"GDB Started for {path}")
    await broadcast_progress("Starting Debugger...", 80)
    
    # Update last opened path on successful load
    set_last_opened_path(path)
    
    comments = await new_db_manager.get_comments()
    patches = await new_db_manager.get_patches()
    await broadcast_log(f"DB Loaded: {len(comments)} comments, {len(patches)} patched bytes")
    
    await broadcast_progress("Ready", 100, show=False)
    
    metadata = await gdb.get_metadata()
    await broadcast_log(f"Metadata: PID={metadata.get('pid')}, Arch={metadata.get('arch')}")

    return {
        "status": "ok", 
        "message": f"Loaded {path}",
        "comments": comments,
        "patches": patches,
        "metadata": metadata
    }

@router.post("/database/reset")
async def reset_database():
    mgr = get_db_manager()
    if mgr:
        await broadcast_log("Resetting database...")
        await mgr.reset_db()
        await broadcast_log("Database cleared and re-initialized.")
        return {"status": "ok"}
    return {"error": "No DB loaded"}

@router.post("/database/reset_all")
async def reset_all_databases():
    """Deletes all session databases in /database folder, keeping app_settings.db"""
    try:
        if os.path.exists("database"):
            count = 0
            for f in os.listdir("database"):
                if f.endswith(".db") and f != "app_settings.db":
                    os.remove(os.path.join("database", f))
                    count += 1
            await broadcast_log(f"Cleared {count} target databases.")
            return {"status": "ok", "deleted_count": count}
        return {"status": "ok", "deleted_count": 0}
    except Exception as e:
        await broadcast_log(f"Error resetting all DBs: {e}")
        return {"error": str(e)}

@router.post("/session/comment")
async def save_comment(payload: dict = Body(...)):
    address = payload.get("address")
    comment = payload.get("comment")
    mgr = get_db_manager()
    if mgr and address:
        await mgr.save_comment(address, comment)
        await broadcast_log(f"Comment saved for {address}: {comment}")
    return {"status": "saved"}
