// cdp-actions.js — Trusted CDP actions: click, coordinates, timer
class CDPActions {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.coordCache = { buy: null, sell: null, lastUpdated: 0 };
    }

    // === Get BUY/SELL button coordinates ===
    async getButtonCoords() {
        const now = Date.now();
        if (this.coordCache.buy && now - this.coordCache.lastUpdated < 5000) {
            return this.coordCache;
        }

        const result = await this.client.Runtime.evaluate({
            expression: `
                (() => {
                    const buy  = document.querySelector('.btn-call, button[class*="btn-call"]');
                    const sell = document.querySelector('.btn-put, button[class*="btn-put"]');
                    if (!buy || !sell) return JSON.stringify({error: 'buttons not found'});
                    const rb = buy.getBoundingClientRect();
                    const rs = sell.getBoundingClientRect();
                    return JSON.stringify({
                        buy:  {x: rb.left + rb.width/2,  y: rb.top + rb.height/2},
                        sell: {x: rs.left + rs.width/2, y: rs.top + rs.height/2}
                    });
                })()
            `,
            returnByValue: true
        });

        const parsed = JSON.parse(result.result.value);
        if (parsed.error) throw new Error(parsed.error);
        this.coordCache = { ...parsed, lastUpdated: now };
        return parsed;
    }

    // === Trusted mouse click via CDP ===
    async clickAt(x, y) {
        await this.client.Input.dispatchMouseEvent({
            type: 'mouseMoved', x, y, button: 'none', clickCount: 0
        });
        await new Promise(r => setTimeout(r, 20));
        await this.client.Input.dispatchMouseEvent({
            type: 'mousePressed', x, y, button: 'left', clickCount: 1
        });
        await new Promise(r => setTimeout(r, this.config.clickHoldMs));
        await this.client.Input.dispatchMouseEvent({
            type: 'mouseReleased', x, y, button: 'left', clickCount: 1
        });
    }

    // === Click opposite button (BUY trade → SELL click) ===
    async triggerOpposite(originalAction) {
        const opposite = originalAction === 'BUY' ? 'SELL' : 'BUY';
        const coords = await this.getButtonCoords();
        const target = opposite === 'BUY' ? coords.buy : coords.sell;

        const t0 = Date.now();
        await this.clickAt(target.x, target.y);
        const t1 = Date.now();

        console.log(`[CDP-CLICK] ${opposite} at (${target.x.toFixed(0)}, ${target.y.toFixed(0)}) took ${t1-t0}ms`);
    }

    // === Timer-related helpers ===
    async getTimerInfo() {
        const result = await this.client.Runtime.evaluate({
            expression: `
                (() => {
                    const timer = document.querySelector('.block--expiration-inputs .control__value');
                    if (!timer) return JSON.stringify({error: 'timer not found'});
                    const minusButtons = document.querySelectorAll('.trading-panel-modal .btn-minus');
                    if (minusButtons.length < 3) return JSON.stringify({error: 'minus not found'});
                    const minus = minusButtons[2];
                    const r = minus.getBoundingClientRect();
                    if (r.width === 0) return JSON.stringify({error: 'minus hidden'});
                    return JSON.stringify({
                        timerText: timer.textContent.trim(),
                        minusX: r.left + r.width/2,
                        minusY: r.top + r.height/2
                    });
                })()
            `,
            returnByValue: true
        });
        return JSON.parse(result.result.value);
    }

    async clickMinus() {
        const info = await this.getTimerInfo();
        if (info.error) return { error: info.error };
        await this.clickAt(info.minusX, info.minusY);
        return { timerText: info.timerText };
    }

    async openTimerPopup() {
        const result = await this.client.Runtime.evaluate({
            expression: `
                (() => {
                    const timer = document.querySelector('.block--expiration-inputs .control__value');
                    if (!timer) return JSON.stringify({error: 'timer not found'});
                    const r = timer.getBoundingClientRect();
                    return JSON.stringify({x: r.left + r.width/2, y: r.top + r.height/2});
                })()
            `,
            returnByValue: true
        });
        const info = JSON.parse(result.result.value);
        if (info.error) return info;
        await this.clickAt(info.x, info.y);
        return { ok: true };
    }

    async getTimerSeconds() {
        const info = await this.getTimerInfo();
        if (info.error) return null;
        const m = info.timerText.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
        if (!m) return null;
        return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    }
}

module.exports = CDPActions;
