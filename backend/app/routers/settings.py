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
    return {"status": "saved"}

@router.get("/version")
async def get_version():
    try:
        # Use absolute path to ensure we define it correctly regardless of CWD
        with open("/app/VERSION", "r") as f:
            return {"version": f.read().strip()}
    except FileNotFoundError:
        # Fallback to relative if /app doesn't exist (dev mode outside docker?)
        try:
             with open("VERSION", "r") as f:
                return {"version": f.read().strip()}
        except FileNotFoundError:
            return {"version": "0.0.0"}
