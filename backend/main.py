from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from gdb import gdb
from app.state import get_db_manager
from settings_manager import SettingsManager

# Import Routers
from app.routers import session, control, memory, settings, websocket

# Global Managers Init
settings_manager = SettingsManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    await settings_manager.init_db()
    
    # We might want to init helper state here if needed
    
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

# Include Routers
app.include_router(session.router)
app.include_router(control.router)
app.include_router(memory.router)
app.include_router(settings.router)
app.include_router(websocket.router)
