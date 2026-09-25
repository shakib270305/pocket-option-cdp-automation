# 02 — Chrome CDP Setup

## What is CDP?

CDP (Chrome DevTools Protocol) হলো Chrome-এর একটা special interface। External tools (Node.js script) দিয়ে আমরা এটা use করে:

- WebSocket frames observe করতে পারি (page patch ছাড়াই)
- Trusted click পাঠাতে পারি (isTrusted=true)
- DOM value পড়তে পারি

## Step 1: Chrome Profile Folder তৈরি

```bash
mkdir -p ~/po-chrome-profile
