# 01 — Installation Guide

> CDP-based automation-এর জন্য মাত্র ২টা install লাগে। ESP32, Arduino, Bluetooth — কিছুই লাগবে না।

## Starting Point

- **OS:** Arch Linux + KDE Plasma + Wayland (X11-ও কাজ করবে)
- **Browser:** Google Chrome
- **Goal:** Pure CDP-based automation

## Why CDP?

Chrome DevTools Protocol (CDP) allows external tools to:
- Observe WebSocket frames without patching browser JS
- Dispatch trusted input events (`isTrusted=true`)
- Read DOM values without injecting code

This avoids Tampermonkey, browser extensions, and page-side WebSocket patching.

---

## Step 1: System Verification

Terminal খুলুন (`Ctrl + Alt + T`)। নিচের command চালান:

```bash
uname -a
echo $XDG_SESSION_TYPE
which google-chrome-stable
node --version
```

| Command | Expected |
|---|---|
| `uname -a` | `Linux ... x86_64 GNU/Linux` |
| `echo $XDG_SESSION_TYPE` | `wayland` or `x11` |
| `which google-chrome-stable` | `/usr/bin/google-chrome-stable` |
| `node --version` | `command not found` (first time) |

---

## Step 2: Install Node.js + npm

```bash
sudo pacman -S nodejs npm
```

Verify:

```bash
node --version
# v26.x.x
npm --version
# 12.x.x
```

---

## Step 3: Create Project Folder

```bash
mkdir -p ~/po-automation/lib
cd ~/po-automation
```

Folder structure:

```
~/po-automation/
└── lib/
```

---

## Step 4: Initialize npm Project

```bash
npm init -y
```

This creates `package.json`.

---

## Step 5: Install chrome-remote-interface

```bash
npm install chrome-remote-interface
```

Verify:

```bash
node -e "const CDP = require('chrome-remote-interface'); console.log('CDP library OK');"
# Expected: CDP library OK
```

---

## Step 6: Final Verification

```bash
cd ~/po-automation
ls -la
cat package.json
```

Expected `ls -la` output:

```
drwxr-xr-x  lib/
drwxr-xr-x  node_modules/
-rw-r--r--  package.json
-rw-r--r--  package-lock.json
```

---

## Checklist

- [ ] System verify
- [ ] Node.js + npm installed
- [ ] Project folder created
- [ ] npm initialized
- [ ] chrome-remote-interface installed
- [ ] Verification passed

**Total time: ~5 minutes**
