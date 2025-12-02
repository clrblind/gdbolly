# Changelog

## [0.0.2] - 2024-05-23
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