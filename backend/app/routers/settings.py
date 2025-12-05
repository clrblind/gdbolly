from fastapi import APIRouter, Body
from settings_manager import SettingsManager

router = APIRouter()
settings_manager = SettingsManager()

@router.get("/settings")
async def get_settings():
    settings = await settings_manager.get_all_settings()
    return settings

@router.post("/settings")
async def save_setting_endpoint(payload: dict = Body(...)):
    key = payload.get("key")
    value = payload.get("value")
    if key:
        await settings_manager.save_setting(key, value)
        
        # Apply immediate effects for specific settings
        if key == "disassemblyFlavor":
            flavor = "intel" if value == "intel" else "att"
            from gdb import gdb
            # Use MI command to set flavor
            # -gdb-set disassembly-flavor [att|intel]
            try:
                # We can't use -gdb-set directly via pygdbmi nicely for everything, 
                # but we can run CLI command via interpreter-exec or -gdb-set
                # pygdbmi write returns a future.
                await gdb.send_command(f"-gdb-set disassembly-flavor {flavor}")
            except Exception as e:
                print(f"Failed to set disassembly flavor: {e}")

    return {"status": "saved"}

@router.get("/version")
async def get_version():
    try:
        with open("VERSION", "r") as f:
            return {"version": f.read().strip()}
    except FileNotFoundError:
        return {"version": "0.0.0"}
