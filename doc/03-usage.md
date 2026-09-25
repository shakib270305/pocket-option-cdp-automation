# 03 — Usage Guide

## Daily Startup Sequence

### Terminal 1: Chrome CDP Launch

```bash
pkill -f "google-chrome" 2>/dev/null; sleep 2

google-chrome-stable \
  --remote-debugging-port=9222 \
  --user-data-dir=/home/$(whoami)/po-chrome-profile \
  --no-first-run \
  --no-default-browser-check &
```

### Chrome: PO Demo Login

```
https://pocketoption.com/en/cabinet/demo-quick-high-low/
```

### Terminal 2: Start Controller

```bash
cd ~/po-automation
node po-auto.js
```

Expected output:

```
[CDP] Found: https://pocketoption.com/...
[ARM] Listeners installed
========================================
[AUTO] PO-AUTO v1.2 ACTIVE
[AUTO] Shift+Click       → A1 (warning + opposite)
[AUTO] Ctrl+Shift+Click  → A2 (timer only, toggle)
========================================
```

---

## Automation 1 — Shift + Left Click

### Trigger
**Shift + Left Click** on empty chart area (NOT on BUY/SELL button)

### What Happens
1. Timer popup opens → auto-decrement every 1 second
2. You place a manual trade (BUY or SELL button click, $1 demo stake)
3. Script detects entry price from `successopenOrder` response
4. Warning range is computed:
   - BUY: `entry - step < price < entry`
   - SELL: `entry < price < entry + step`
   - `step = 8 × 10^(-decimalPlaces)`
5. When live price enters range:
   - CDP clicks opposite button
   - Warning message printed
   - Master stop

### Stop Conditions
| Condition | Result |
|---|---|
| Price enters warning range | Opposite trade + stop |
| Timer reaches `00:00:03` | Stop |

---

## Automation 2 — Ctrl + Shift + Left Click

### Trigger
**Ctrl + Shift + Left Click** anywhere

### What Happens
1. Timer popup opens → auto-decrement every 1 second
2. No warning range, no opposite click
3. Waits for stop condition

### Stop Conditions
| Condition | Result |
|---|---|
| `Ctrl + Shift + Left Click` again | Toggle off |
| Manual trade (BUY or SELL) | Stop |
| Timer reaches `00:00:03` | Stop |

---

## Quick Reference

| Action | Trigger |
|---|---|
| Start Automation 1 | `Shift + Left Click` (empty chart area) |
| Start Automation 2 | `Ctrl + Shift + Left Click` |
| Stop Automation 2 | `Ctrl + Shift + Left Click` (again) |
| Stop All | Close controller (`Ctrl + C`) |

---

## Example Run — Automation 1

```
$ node po-auto.js
[CDP] Found: https://pocketoption.com/en/cabinet/demo-quick-high-low/
[ARM] Listeners installed
[AUTO] PO-AUTO v1.2 ACTIVE

--- User: Shift + Left Click on chart ---
[A1] ========================================
[A1] MASTER AUTOMATION STARTED
[A1] ========================================
[TIMER] Popup opened, waiting for minus...
[TIMER] Minus found. Starting loop.
[TIMER] MINUS CLICK | Timer: 00:00:47

--- User: Manual BUY trade ($1, 60s) ---
[A1] [PO ORDER SENT] AUDCAD_otc | BUY | reqId: 12345 | 60s
[A1] [ENTRY] AUDCAD_otc | BUY | E: 1.02596 | RANGE: 1.02588 < X < 1.02596 | 60s

[TIMER] MINUS CLICK | Timer: 00:00:46
[TIMER] MINUS CLICK | Timer: 00:00:45
...

--- Price enters range ---
[CDP-CLICK] SELL at (1420, 352) took 103ms
Buy warning massage | [PO TICK] AUDCAD_otc | LOCAL: 2026-09-25 10:35:22.468 UTC+06:00 | price: 1.02595 | TIME LEFT: 42.5s
[A1] ========================================
[A1] MASTER STOP | BUY warning triggered
[A1] ========================================
```
