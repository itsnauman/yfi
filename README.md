# Yfy

*Figure out why your Wi-Fi sucks.*

A tiny macOS menu bar app that tells you what's actually going on with your internet connection. No more wondering if it's your router, your ISP, or just the universe conspiring against your video call.

## What it does

Click the menu bar icon and instantly see:

- **Router connection** — Signal strength, link speed, and noise levels
- **Home network** — Ping, jitter, and packet loss to your router
- **Internet connection** — Same metrics, but to the actual internet (1.1.1.1)
- **DNS lookups** — How fast your domain names resolve
- **Live graphs** — Watch your connection quality over time
- **Interference check** — Find out if your neighbors' Wi-Fi is fighting with yours
- **Speed test** — Because sometimes you just need to know

Everything is color-coded: green is good, yellow is meh, red is why-is-this-happening.

## Install

```bash
brew install itsnauman/yfy/yfy
sudo ln -sf "$(brew --prefix)/opt/yfy/yfy.app" /Applications/
```

That's it.

## Usage

1. Launch Yfy
2. Click the icon in your menu bar
3. Understand your Wi-Fi situation
4. Press `Esc` to close, or just click away

## License

MIT. Free as in beer, free as in speech.

---

*Built with the tireless assistance of [Claude Code](https://claude.ai/download). Thanks for writing most of this, buddy.*
