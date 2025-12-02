
# Changelog

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
