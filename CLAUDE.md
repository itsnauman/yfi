# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

whyfi is a macOS menu bar (tray) application built with Tauri 2, React 19, and TypeScript. It displays a popup window when the tray icon is clicked.

## Development Commands

```bash
# Install dependencies
pnpm install

# Development mode (starts Vite dev server + Tauri app)
pnpm tauri dev

# Production build (creates .app bundle)
pnpm tauri build

# Frontend only (for UI development without Tauri)
pnpm dev
```

## Architecture

**Two-layer architecture:**
- `src/` - React/TypeScript frontend (runs in Tauri webview)
- `src-tauri/` - Rust backend (handles system integration)

**Key communication pattern:**
- Frontend calls Rust commands via `invoke()` from `@tauri-apps/api/core`
- Commands are defined in `src-tauri/src/lib.rs` with `#[tauri::command]`
- Commands must be registered in `invoke_handler(tauri::generate_handler![...])`

**Window management (lib.rs):**
- Tray icon click toggles popup window visibility
- Window is created lazily on first click
- Window auto-hides on blur (focus loss)
- Window positioned relative to tray icon using physical coordinates with scale factor handling

**Frontend-to-Rust commands:**
- `hide_window` - Hides the main window (called on Escape key)

## Key Files

| File | Purpose |
|------|---------|
| `src-tauri/src/lib.rs` | Main Rust logic (tray, window management, commands) |
| `src-tauri/tauri.conf.json` | Tauri configuration (app ID, icons, security) |
| `src/App.tsx` | Main React component |
| `vite.config.ts` | Vite dev server config (port 1420 required by Tauri) |

## Tauri-Specific Notes

- Window dimensions are defined as constants in `lib.rs` (WINDOW_WIDTH, WINDOW_HEIGHT)
- Tray icon uses template rendering (`icon_as_template(true)`) for macOS dark/light mode
- Security CSP is currently disabled in tauri.conf.json
- The app has no traditional windows configured - only a tray icon that spawns a popup

## Coding Guidelines
- Don't add any comments to code.