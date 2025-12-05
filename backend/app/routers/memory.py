from fastapi import APIRouter, Body
from gdb import gdb
from app.state import get_db_manager
from app.utils.formatting import bytes_to_hex_str, int_to_hex_addr

router = APIRouter()

async def broadcast_log(msg: str):
    await gdb.msg_queue.put({"type": "system_log", "payload": msg})

@router.post("/memory/disassemble")
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

@router.post("/memory/write")
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

    db_manager = get_db_manager()
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

@router.post("/memory/revert")
async def revert_memory(payload: dict = Body(...)):
    """
    Reverts a SINGLE BYTE at specific address.
    """
    address = payload.get("address") # hex string "0x..."
    
    db_manager = get_db_manager()
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
