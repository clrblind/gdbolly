# Frontend Documentation

## Directory Structure
The frontend is a React application built with Vite.

```
frontend/src/
├── components/         # UI Components (Presentational)
├── hooks/              # Logic Hooks (Container/Logic)
│   ├── useAppLogic.js  # Main aggregator hook
│   ├── useMemory.js    # Memory features aggregator
│   ├── useSessionManager.js
│   ├── usePatcher.js
│   ├── useClipboardLogic.js
│   ├── useSocket.js
│   └── ...
├── store/              # Redux Slices (State)
└── utils/              # Parsers and Formatters
```

## Hook Architecture (Refactored)
To avoid "God Objects", logic is split into granular hooks.

### `useSessionManager`
- Manages loading binaries and resetting the database.
- Dispatches global resets to Redux.
- Handles file system errors.

### `usePatcher`
- Encapsulates the complex logic of Memory Patching.
- Manages Modals state (Edit, Fill, Comment).
- Handles "Revert" logic by calculating derived addresses from instruction length.

### `useClipboardLogic`
- Centralizes copy-paste functionality.
- Formats data based on user settings (Raw, Python, Hex, ASM).
- Handles cross-browser clipboard write (using fallback textarea if needed).

### `useMemory` (Aggregator)
- Composes the above hooks into a single interface for `App.jsx`.
- Maintains backward compatibility with the component tree.
