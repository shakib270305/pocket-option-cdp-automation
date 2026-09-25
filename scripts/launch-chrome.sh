#!/bin/bash
# launch-chrome.sh — Launch Chrome in CDP mode with dedicated profile

PROFILE_DIR="$HOME/po-chrome-profile"
CDP_PORT=9222

echo "[LAUNCH] Killing any existing Chrome on port $CDP_PORT..."
pkill -f "google-chrome.*remote-debugging-port=$CDP_PORT" 2>/dev/null
sleep 2

echo "[LAUNCH] Starting Chrome with CDP on port $CDP_PORT..."
google-chrome-stable \
    --remote-debugging-port=$CDP_PORT \
    --user-data-dir="$PROFILE_DIR" \
    --no-first-run \
    --no-default-browser-check \
    >/dev/null 2>&1 &

sleep 4

if curl -s http://localhost:$CDP_PORT/json/version >/dev/null 2>&1; then
    echo "[LAUNCH] ✅ Chrome CDP ready on port $CDP_PORT"
    echo "[LAUNCH] Open Pocket Option in Chrome and login to demo"
else
    echo "[LAUNCH] ❌ Chrome CDP failed to start"
    exit 1
fi
