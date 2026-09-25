# 05 — Development Log

## Journey Overview

এই automation প্রথমে Tampermonkey script দিয়ে শুরু হয়েছিল। পরে CDP-based (Chrome DevTools Protocol) solution-এ migrate করা হয়েছিল।

---

## Why CDP?

### Problem with Tampermonkey approach:

1. **`event.isTrusted = false`** — `dispatchEvent()` দিয়ে পাঠানো click real click-এর মতো detect হয় না।
2. **WebSocket prototype patching** — `window.WebSocket` কে modify করা detectable।
3. **Extension detection** — Tampermonkey-এর presence detectable।

### Why CDP solves these:

- **`isTrusted = true`** — `Input.dispatchMouseEvent` real input-এর মতো trusted event তৈরি করে।
- **No page patching** — CDP বাইরে থেকে observe করে, page-এ কিছু inject করে না।
- **No extension needed** — Pure Chrome + Node.js script।

---

## Version History

### v1.2 (Current — Working)

**Changes:**
- **Merged** both automations into single file (`po-auto.js`)
- **Single terminal**-এ run হয়
- **Fixed A1 bug:** Removed grace period from Automation 1
  - কারণ: A1-এর arm-click (Shift on empty area) কোনো `openOrder` produce করে না
  - তাই সব outgoing order real trade হিসেবে treat করা হয়
- **Retained A2 grace:** 800ms grace period A2-তে রাখা হয়েছে
  - কারণ: A2-এর arm-click (Ctrl+Shift on BUY/SELL) নিজেই trade খোলে

### v1.1

- Merged both automations into one file
- Single CDP connection
- `Ctrl+Shift+Click` toggle for A2

### v1.0

- Separate scripts for A1 and A2
- Basic CDP monitoring

---

## Tested Configurations

| Config | Status |
|---|---|
| Arch Linux + KDE Plasma + Wayland | ✅ Working |
| Arch Linux + KDE Plasma + X11 | ✅ Working |
| Chrome 152.0.7977.82 | ✅ Tested |

---

## Key Technical Learnings

### 1. CDP `Input.dispatchMouseEvent` sets `isTrusted=true`

Chrome-এর internal input pipeline দিয়ে event inject করে — real hardware click-এর সমতুল্য।

### 2. PO uses Socket.IO binary attachments

**Header frame (text):**
```
451-["successopenOrder",{"_placeholder":true,"num":0}]
```

**Payload frame (binary, base64-encoded JSON):**
```json
{
  "id": "...",
  "openPrice": 1.15978,
  "asset": "EURUSD_otc",
  "requestId": 13610050,
  "closeTimestamp": 1790105785,
  ...
}
```

### 3. `Network.webSocketFrameReceived` exposes raw frames

- `opcode=1` → text frame (headers, outgoing orders)
- `opcode=2` → binary frame (base64 payload)

### 4. PO Hotkeys require ~500ms hold

Manual hotkey (Shift+W) করতে ~500ms লাগে। ESP32 keyboard 500ms-এর কমে send করলে PO reject করে।

### 5. Race condition in async start()

`timer.start()` async, তাই stop() call হওয়ার পরেও start() চলতে পারে। **Solution:** Generation counter pattern।

---

## Abandoned Approaches

### ESP32 Hardware HID

**Tested:**
- ESP32 BLE Mouse — cursor movement ✅
- ESP32 BLE Keyboard — key events ✅

**Abandoned reasons:**
- Wayland per-device cursor conflict (calibration impossible)
- X11 pointer acceleration (movement not linear)
- BLE Keyboard hold requirement (~500ms)
- Too complex vs pure CDP solution

**Result:** CDP solution simpler, faster, more reliable।

---

## Roadmap / Future

- [ ] Add real-account safety guards
- [ ] Config UI for warning range multiplier
- [ ] Multi-asset support
- [ ] Trade history logging
- [ ] Statistical analysis of runs

---

## Disclaimer

⚠️ **Educational use only.** Real Pocket Option accounts-এ automation use করা ToS (Clause 2.9) violate করে। শুধু demo account-এ use করুন।
