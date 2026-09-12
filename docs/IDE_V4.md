# AI APK Forge IDE v4

This iteration strengthens the editor/build-agent connection.

## IDE systems
- Hierarchical Explorer with collapsible folders
- Find/Replace in current buffer
- Minimap-style code overview
- Live line/column status and word count
- Command Palette actions for formatting, checks, tests and Android builds
- Problems, Output, Search, Git Diff and Source Control panels

## AI integration
- AI receives the current file plus up to 8 open editor buffers
- AI diagnostics are attached to the IDE Problems panel
- AI patches are applied only through the validated Git patch bridge
- Explicit Auto-Fix Build loop is bounded to 3 iterations
- Auto-Fix only applies low-risk AI patches automatically; other cases stop for review
- Each patch invalidates stale build state and refreshes the edited file

## Termux bridge
- Added `format` task
- Build/test tasks receive longer execution windows (up to 10 minutes)
- Existing project path, file and secret guards remain active
