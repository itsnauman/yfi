## Project Overview

yfy is a macOS menu bar (tray) application built with Tauri 2, React 19, and TypeScript. It displays a popup window when the tray icon is clicked.

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

## Logging

- Logs are located in the directory: `~/Library/Logs/com.naumanahmad.yfy/`
- You can add logging and then read the log file to validate your changes.

**TypeScript:**
```typescript
import { trace, debug, info, warn, error, attachConsole } from '@tauri-apps/plugin-log';

info('message');
error('message');

const detach = await attachConsole(); // forwards console.log/warn/error to logger
```

**Rust:**
```rust
log::info!("message");
log::error!("message");
```

## Release Process

To publish a new release to GitHub and Homebrew:

### 1. Update Version

Update the version in `src-tauri/tauri.conf.json`:
```json
"version": "X.Y.Z"
```

### 2. Commit and Tag

```bash
git add -A
git commit -m "Bump version to X.Y.Z"
git push origin main
```

### 3. Create GitHub Release

```bash
gh release create vX.Y.Z \
  --repo itsnauman/yfy \
  --title "vX.Y.Z" \
  --notes "Release notes here"
```

### 4. Update Homebrew Tap

Clone the tap repository:
```bash
gh repo clone itsnauman/homebrew-yfy /tmp/homebrew-yfy
```

Get the SHA256 of the source tarball:
```bash
curl -sL https://github.com/itsnauman/yfy/archive/refs/tags/vX.Y.Z.tar.gz | shasum -a 256
```

Edit `Formula/yfy.rb` with the new version and SHA256:
```ruby
class Yfy < Formula
  url "https://github.com/itsnauman/yfy/archive/refs/tags/vX.Y.Z.tar.gz"
  sha256 "NEW_SHA256_HASH"
  # ... rest unchanged
end
```

Commit and push:
```bash
cd /tmp/homebrew-yfy
git add -A
git commit -m "Update yfy to vX.Y.Z"
git push origin main
```

### Repositories

| Repository | URL |
|------------|-----|
| Main repo | https://github.com/itsnauman/yfy |
| Homebrew tap | https://github.com/itsnauman/homebrew-yfy |

### Installation

Users install via:
```bash
brew tap itsnauman/yfy
brew install yfy
ln -sf $(brew --prefix)/opt/yfy/yfy.app /Applications/yfy.app
```

Building from source avoids macOS code signing issues since the app is compiled locally on your machine.

## Coding Guidelines
- Don't add any comments to code.

## Your Role
- Your role is to write code. You do NOT have access to the running app, so you cannot test the code. Although, you can add logging and inspect the log file.
Alternatively, you can rely on me to interact with the app.
- If I report a bug in your code, after you fix it, you should pause and ask me to verify that the bug is fixed.
- If I send you a URL, you MUST immediately fetch its contents and read it carefully, before you do anything else.
