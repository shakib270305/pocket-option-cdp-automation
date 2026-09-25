# 04 — Troubleshooting

## Problem: Chrome CDP `Connection refused`

**Cause:** Chrome `--remote-debugging-port=9222` ছাড়া চলছে।

**Solution:**

```bash
pkill -f "google-chrome"
sleep 2
./scripts/launch-chrome.sh
```

---

## Problem: PO tab not found

**Cause:** Controller PO page load হওয়ার আগেই start হয়েছে।

**Solution:** PO fully load হওয়ার পর controller restart করুন।

---

## Problem: Timer popup খোলে কিন্তু minus click হয় না

**Cause:** Timer popup animation এখনো শেষ হয়নি।

**Solution:** Controller 3 সেকেন্ড ধরে poll করে। তবুও fail করলে ensure করুন আপনি `demo-quick-high-low` page-এ আছেন।

---

## Problem: `[A2] Manual trade detected` arm করার সাথে সাথেই fire হয়

**Cause:** A2-এর arm-click (Ctrl+Shift+Click on BUY/SELL button) নিজেই `openOrder` frame তৈরি করে।

**Solution:** Controller-এ 800ms grace period আছে (`a2ArmGraceMs` in config.js)। তবুও fail করলে 1500ms বাড়ান।

---

## Problem: Automation 1 range hit-এ opposite trade fire করে না

**Cause (historical bug):** Grace period প্রথম `openOrder` ignore করছিল।

**Solution:** v1.2-এ A1-এর grace period বাদ দেওয়া হয়েছে। `onOutgoingOpenOrder` সরাসরি `handleA1Order` call করে।

---

## Problem: Ctrl+Shift+Click detect হয় না

**Cause:** Chrome DevTools shortcut নিচ্ছে, অথবা PO page load হয়নি।

**Solution:**

1. DevTools বন্ধ করুন (F12)
2. PO page reload করুন
3. Injected listener verify: Chrome console-এ type করুন:
   ```js
   window.__poAutoInstalled   // true return করা উচিত
   ```

---

## Problem: দুইটা automation interfere করছে

**Expected behavior:** কখনো একসাথে run হবে না।

- A1 active + Ctrl+Shift+Click → A1 stop, A2 start
- A2 active + Shift+Click → A2 stop, A1 start

---

## Problem: `Cannot find module 'chrome-remote-interface'`

**Cause:** Dependencies install হয়নি।

**Solution:**

```bash
cd ~/po-automation
npm install
```

---

## Problem: Page reload করলে listener মুছে যায়

**Cause:** Injected listener reload-এ হারিয়ে যায়।

**Solution:** v1.2-এ `Page.loadEventFired` handler আছে যা auto-reinject করে। কাজ না করলে reload-এর পর controller restart করুন।

---

## Problem: `--enable-automation` flag ভুলে যোগ করা

**Cause:** Puppeteer/automation tools এই flag যোগ করে, যেটা detectable।

**Solution:** আমাদের launch command-এ এই flag নেই। যদি অন্য কোথাও থেকে Chrome চালু থাকে:

```bash
pkill -f "google-chrome"
# তারপর আমাদের launch command চালান
```

---

## Problem: Wayland-এ Chrome খোলে না

**Solution:** `--ozone-platform=wayland` flag যোগ করুন:

```bash
google-chrome-stable \
  --remote-debugging-port=9222 \
  --user-data-dir=/home/$(whoami)/po-chrome-profile \
  --no-first-run \
  --no-default-browser-check \
  --ozone-platform=wayland &
```
