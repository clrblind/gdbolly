# Backend Documentation

## Directory Structure
The backend is organized as a modular FastAPI application.

```
backend/
├── main.py                 # Entry point, App initialization, Middleware
├── app/
│   ├── routers/            # API Route definitions
│   │   ├── session.py      # Session management (load, fs list)
│   │   ├── control.py      # Debugger control (run, step, pause)
│   │   ├── memory.py       # Memory operations (read, write, disasm)
│   │   ├── settings.py     # Application settings
│   │   └── websocket.py    # Real-time event socket
│   ├── utils/              # Helper functions
│   └── state.py            # Global state (DBManager instance)
├── gdb/                    # GDB Interface Package
│   ├── __init__.py         # Exports 'gdb' singleton
│   ├── controller.py       # Core GDBController logic
│   └── ...
├── db_manager.py           # Database ORM/Logic
└── settings_manager.py     # Settings persistance
```

## Modularization Details

### Routers
Instead of a monolithic `main.py`, endpoints are grouped by functionality.
- **Session Router**: Handles file listing and binary loading. It manages the `DBManager` lifecycle.
- **Memory Router**: Handles complex patching logic. It validates memory reads before writes to ensure data integrity for "Revert" functionality.
- **Control Router**: Simple wrappers around GDB MI execution commands.

### GDB Package
The GDB interactions are encapsulated in the `backend/gdb` package.
- **Singleton**: The `gdb` object is instantiated once in `__init__.py` and imported everywhere.
- **Controller**: Manages the subprocess `stdin/stdout`, the async read loop, and the token-based callback system for synchronous commands.

## Key Flows

### Loading a Session
1. `POST /session/load` (Session Router)
2. Compiles binary (if .c) or checks permissions.
3. Initializes `DBManager` with file hash.
4. Calls `gdb.start()`.
5. Updates global state in `app.state`.
