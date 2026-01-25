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

## Key Files

| File | Purpose |
|------|---------|
| `src-tauri/src/lib.rs` | Main Rust logic (tray, window management, commands) |
| `src-tauri/tauri.conf.json` | Tauri configuration (app ID, icons, security) |
| `src/App.tsx` | Main React component |
| `vite.config.ts` | Vite dev server config (port 1420 required by Tauri) |

## Coding Guidelines
- Don't add any comments to code.

## Your Role
- Your role is to write code. You do NOT have access to the running app, so you cannot test the code. You MUST rely on me, the user, to test the code.
- If I report a bug in your code, after you fix it, you should pause and ask me to verify that the bug is fixed.
- If I send you a URL, you MUST immediately fetch its contents and read it carefully, before you do anything else.