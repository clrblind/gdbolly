

# Changelog

## [0.1.1] - 2025-12-05
### Critical Fixes
- **GDB Initialization**: 
    - Fixed a critical race condition where "register names" were never received by the frontend, causing registers to display with 64-bit fallbacks (RAX vs EAX) and breaking "Jump to RIP" functionality.
    - Implemented a robust synchronous `execute_command` in `gdb_controller` that uses numeric tokens to pair GDB MI requests with responses.
- **Development Environment**: 
    - Fixed `docker-compose.yml` to correctly mount the `backend` code directory. Previously, code changes were not being hot-reloaded or applied due to missing volume mounts.
- **Frontend State**:
    - `RegistersPane.jsx` now correctly uses dynamic register names from the backend instead of hardcoded defaults.
    - Added extensive logging to WebSocket and GDB Controller to trace data flow issues.

## [0.1.0] - 2025-12-04
### Added
- **File Browser**: Добавлено модальное окно "File -> Open" для выбора файлов из директории `/targets`
- **Last Opened File**: "Reload Binary" теперь перезагружает последний открытый файл вместо дефолтного
- **Version Display**: Версия программы отображается справа в строке меню
- **JMP Highlighting**: Команда JMP теперь подсвечивается темно-зеленым цветом

### Changed
- **GDB Startup**: Добавлен флаг `-q` для сокращения логов при запуске GDB
- **Status Bar**: Статус-бар теперь показывает актуальное имя загруженного файла и ID потока
- **Binary Support**: Улучшена поддержка бинарных файлов без отладочных символов - программа запускается даже если breakpoint на main не установлен

### Fixed
- **Error Handling**: Улучшена обработка ошибок GDB, включая "No symbol table" и неожиданные сообщения от отлаживаемой программы
- **Runtime Errors**: Исправлена ошибка `NoneType is not iterable` в gdb_controller.py
- **Code Quality**: Исправлены все выявленные ошибки: Python 3.14->3.13, bare except handlers, deprecated substr()
## [0.0.9] - 2025-12-02
### Critical Fixes
- **GDB Controller**: Completely rewrote `_read_stdout` parsing loop. Fixed a critical bug where `pygdbmi` return types `result` (containing status `done` or `error` in payload) were not correctly matched with awaiting Futures, causing timeouts for all memory operations.
- **Protocol Logging**: Implemented deep logging for the GDB controller. All raw requests (TX) and responses (RX) are now broadcast to the System Log for transparency.

## [0.0.8] - 2025-12-02
### Security & Stability
- **GDB Controller**: Fixed a critical deadlock where the GDB process would freeze if too much data was written to `stderr`. Now `stderr` is redirected to `stdout`.
- **Backend**: Replaced potentially unsafe `os.system` calls with `asyncio.create_subprocess_exec` to prevent command injection vulnerabilities.
- **Startup**: Migrated from deprecated `@app.on_event("startup")` to the modern `lifespan` context manager mechanism in FastAPI.

### Fixed
- **Patching Algorithm**: 
    - Completely rewrote the memory writing logic. Replaced the unstable `set {array} = ...` syntax with the standard GDB MI command `-data-write-memory-bytes`.
    - Added **Token-based synchronization** for writes. The backend now waits for GDB to confirm the write operation (`^done`) before updating the database or responding to the frontend. This fixes the "non-working state" of binary patching and ensures atomic updates.

## [0.0.7] - 2025-12-02
### Changed
- **Layout**: The "System Log" window now occupies the entire workspace (Full Screen), hiding the Disassembly, Registers, Dump, and Stack panels when active. This mimics the "Window" switching behavior of classic debuggers.
- **Terminology**: Renamed the main view from "Disassembly" to "CPU" in menus and toolbars to reflect that it contains registers, stack, and dump as well.
- **Goto (Ctrl+G)**: 
    - Added support for register names. You can now type `rax`, `rip`, `ecx` etc., to jump to the address stored in that register.
    - Improved address validation.
- **Toolbar**: 
    - Added a "CPU" button to quickly switch back to the main view.
    - Fixed the "System Log" button functionality.

### Fixed
- **System Log**: Pressing `Escape` now correctly closes/hides the log window.
- **Disassembly**: Fixed an issue where the listing buffer might display incorrect start addresses after a "Goto" operation.

## [0.0.6] - 2025-12-02
### Fixed
- **Logging Consistency**: Unified log format across Backend and Frontend. All logs now include millisecond-precision timestamps (`HH:MM:SS.mmm`). Removed redundant prefixes.
- **Patching Stability**: Fixed `Read memory timeout` errors by implementing unique UUID tokens for GDB memory requests. Increased GDB read timeout to 4s.
- **Data Integrity**: Patch operations now strictly validate that original bytes are read successfully before writing new bytes or saving to DB.
- **UI Layout**: System Log window now correctly occupies the top workspace pane (replacing Disassembly/Registers) instead of floating on top. Fixed row height jitter on hover.
- **Navigation**: 
    - Fixed `Num *` (Jump to RIP) not working due to address normalization issues.
    - Fixed "Scroll Up" pre-fetching in Disassembly view using correct BigInt arithmetic for negative offsets.
- **Hotkeys**: Added `Alt+C` to quickly switch back to Disassembly view from Log.

### Added
- **Detailed Logging**: User actions (Settings change, Comments, Patches, Reverts) are now verbosely logged to the System Log.
- **Hex Formatting**: Byte arrays in logs are now displayed as `[0x90, 0x90]` instead of decimal.

## [0.0.5] - 2025-12-02
### Added
- **Refactoring**: Split `useAppLogic` into granular hooks (`useSocket`, `useDebuggerControl`, `useMemory`, `useLayout`, `useAPI`).
- **Address Normalization**: Implemented `normalizeAddress` utility to fix issues with patch highlighting and context menus (0x00401000 vs 0x401000).
- **Navigation**:
    - **Arrow Keys**: Move selection up/down in Disassembly view.
    - **Num ***: Jump to current RIP/EIP.
- **Scrolling**: Added pre-fetching logic to Disassembly view to load code before/after the current view when scrolling.
- **State Reset**: `Reload Binary` and `Remove DB` now correctly clear all frontend state (red lines, history, registers).
- **System Log**:
    - Renamed "Debugger Log" to "System Log".
    - Implemented table layout with Timestamp and Message columns.
    - Added keyboard navigation (Up/Down) and row selection.
    - Added millisecond precision to timestamps.
    - Logs are now structured objects.
- **Patching Reliability**: 
    - Frontend now waits for backend confirmation before coloring lines red.
    - Backend validates "Read Original Bytes" before writing new patch. Prevents corrupting the Revert database.
    - Logging of byte arrays is now in HEX format.

### Changed
- **UI**: System Log window is now a persistent overlay with Z-index management.
- **Menu**: Added "Window -> Disassembly" to bring main view to focus.
- **Bugfix**: Fixed optimistic UI updates where failed Revert operations would still remove red highlighting.

## [0.0.4] - 2025-12-02
### Added
- **Refactoring**: Split monolithic `App.jsx` into `useAppLogic` hook and separate components (`MainMenu`, `MainToolbar`, `ModalManager`).
- **System Log Window**: New non-modal, full-screen "DebuggerWindow" for logs. No word wrap. Logs all DB I/O, user actions, and target events.
- **Info Pane**: Small panel below disassembly showing details about the selected/current instruction (jump targets, memory access).
- **Go To Address (Ctrl+G)**: Modal with validation for Hex/Dec formats. Checks address validity.
- **Database Reset**: Menu option "File -> Database -> Remove DB" to wipe session data.
- **Copy Offset**: Context menu option to copy the calculated file offset (RVA).
- **Selection**: Drag-to-select support in Disassembly View.
- **History Tracing**: Step Into/Over actions now push the previous address to history for navigation.

### Changed
- **Architecture**: Split `DisassemblyPane` into logical components (`DisassemblyRow`, `asmFormatter`).
- **Clipboard**: Fixed "Copy" functionality to respect current view settings (Case, Swap Args, Hex format).
- **Formatting**: Fixed "Swap Arguments" logic to handle operands with parentheses correctly (e.g., `0x0(%rax,%rax,1)`).
- **Layout**: Fixed column alignment between header and content in Disassembly View.
- **Scrolling**: Fixed "viewing up" issue where code above the current view wasn't accessible.
- **Binary Fill**: 
    - Added input validation (supports 0xAA, AA, AAh). 
    - Fixed highlighting: now all changed bytes are marked red, not just the first one.
    - Input field now auto-focuses.
- **Revert**: Context menu option now only appears on actually modified lines.
- **Reload Binary**: Now performs a full session restart/recompile.
- **Jumps**: Relative jump addresses are now resolved to absolute addresses in the view.
- **Syntax**: Fixed JSX error in MenuBar.

## [0.0.3] - 2025-12-02
### Changed
- Debugger Control: Switched `Step Into` and `Step Over` from source-line stepping (`-exec-step`) to instruction-level stepping (`-exec-step-instruction`). This fixes the issue where multiple assembly instructions were skipped in the UI.

## [0.0.2] - 2025-12-02
### Added
- System Log window (accessible via Menu > Window > System Log).
- Context Menu: "Revert" option in Binary submenu (Alt+Backspace).
- Settings: Number formatting options ($0xA, 0xA, 010h, 10).
- Settings: Negative number formatting options (Signed, Unsigned).
- Database support for storing comments, patches, and session state.
- Backend: Endpoints for binary patching and reverting changes.

### Changed
- Disassembly Pane: Fixed jitter effect when hovering over rows.
- Disassembly Pane: RET instructions are now highlighted in red.
- Copy: Copying bytes now results in a single continuous string without newlines.
- Revert: Fixed issue where bytes were not visually reverting to original state immediately.
- UI: Improved layout stability and overflow handling.
- Modals: Fill with byte modal now focuses input automatically.

## [0.0.1] - Initial Release
- Basic GDB integration (Step, Run, Pause).
- Disassembly view with resizing.
- Registers view.
- Basic memory patching.
