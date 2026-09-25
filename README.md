# Pocket Option CDP Automation

> ⚠️ **Educational use only.** This project is for demo accounts and learning. Using automation on real Pocket Option accounts violates their Terms of Service (Clause 2.9) and may result in account suspension.

A pure Chrome DevTools Protocol (CDP) based automation controller for Pocket Option.

## Features

- ✅ **Trusted CDP clicks** (`isTrusted=true`) — no JS-level detection
- ✅ No Tampermonkey, no browser extensions
- ✅ No WebSocket patching on the page side
- ✅ Server-confirmed `openPrice` detection
- ✅ Timer automation via CDP
- ✅ ~100ms latency

## Two Automations

| Trigger | Action |
|---|---|
| **Shift + Left Click** | Timer + Warning range + Opposite CDP click + Master stop |
| **Ctrl + Shift + Left Click** | Timer auto-decrement only (toggle on/off) |

## Documentation

- [Installation Guide](doc/01-installation.md)
- [Chrome CDP Setup](doc/02-chrome-cdp-setup.md)
- [Usage Guide](doc/03-usage.md)
- [Troubleshooting](doc/04-troubleshooting.md)
- [Development Log](doc/05-changelog.md)

## License

Educational use only.
