// po-auto.js — Single-file controller for BOTH automations
const CDP = require('chrome-remote-interface');
const config = require('./config');
const CDPActions = require('./lib/cdp-actions');

const ARM_A1_TOKEN = config.armTokenA1;
const ARM_A2_TOKEN = config.armTokenA2;
const A2_ARM_GRACE_MS = config.a2ArmGraceMs;

let cdpActions;

const state = {
    active: null,        // null | 'A1' | 'A2'
    timerGen: 0,
    timerRunning: false,
    timerInterval: null,
    timerPopupPoll: null,
};

const a1 = {
    armed: false,
    masterStopped: true,
    pendingOrders: new Map(),
    activeTrades: new Map(),
};

const a2 = { armedAt: 0 };

function log(...x) { console.log(...x); }

function normalizeAction(a) {
    if (!a) return null;
    const s = String(a).toLowerCase();
    if (['call','buy','up','1'].includes(s)) return 'BUY';
    if (['put','sell','down','0'].includes(s)) return 'SELL';
    return null;
}

function decimalPlaces(v) {
    const s = String(v);
    if (s.includes('e-')) {
        const [b, e] = s.split('e-');
        return (b.split('.')[1] || '').length + Number(e);
    }
    return (s.split('.')[1] || '').length;
}

function calculateStep(entry) {
    return config.warningStepMultiplier * Math.pow(10, -decimalPlaces(entry));
}

function formatNumber(v) {
    if (!Number.isFinite(v)) return String(v);
    return Number(v.toFixed(12)).toString();
}

function localTime(ts = Date.now()) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const abs = Math.abs(off);
    const oh = pad(Math.floor(abs / 60));
    const om = pad(abs % 60);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
           `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms} ` +
           `UTC${sign}${oh}:${om}`;
}

// ============ TIMER ============
function stopTimer(reason) {
    state.timerGen++;
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
    if (state.timerPopupPoll) { clearInterval(state.timerPopupPoll); state.timerPopupPoll = null; }
    if (state.timerRunning) log(`[TIMER] STOPPED | ${reason}`);
    state.timerRunning = false;
}

async function startTimer() {
    if (state.timerRunning) return;
    const myGen = ++state.timerGen;

    const openResult = await cdpActions.openTimerPopup();
    if (myGen !== state.timerGen) return;
    if (openResult.error) { log('[TIMER] Open popup failed:', openResult.error); return; }

    log('[TIMER] Popup opened, waiting for minus...');

    let tries = 0;
    state.timerPopupPoll = setInterval(async () => {
        if (myGen !== state.timerGen) {
            clearInterval(state.timerPopupPoll); state.timerPopupPoll = null; return;
        }
        tries++;
        const info = await cdpActions.getTimerInfo();
        if (myGen !== state.timerGen) {
            clearInterval(state.timerPopupPoll); state.timerPopupPoll = null; return;
        }
        if (!info.error) {
            clearInterval(state.timerPopupPoll); state.timerPopupPoll = null;
            log('[TIMER] Minus found. Starting loop.');
            state.timerRunning = true;
            await timerMinus(myGen);
            if (myGen !== state.timerGen || !state.timerRunning) return;
            state.timerInterval = setInterval(() => timerMinus(myGen), 1000);
            return;
        }
        if (tries >= 30) {
            clearInterval(state.timerPopupPoll); state.timerPopupPoll = null;
            log('[TIMER] Minus button not found');
        }
    }, 100);
}

async function timerMinus(myGen) {
    if (myGen !== state.timerGen || !state.timerRunning) return;
    const seconds = await cdpActions.getTimerSeconds();
    if (myGen !== state.timerGen) return;

    if (seconds !== null && seconds <= config.timerMasterStopSeconds) {
        onTimerStop();
        return;
    }
    const result = await cdpActions.clickMinus();
    if (myGen !== state.timerGen) return;
    if (result.error) { log('[TIMER] Click fail:', result.error); return; }
    log(`[TIMER] MINUS CLICK | ${result.timerText}`);
}

function onTimerStop() {
    const reason = `00:00:0${config.timerMasterStopSeconds} reached`;
    if (state.active === 'A1') stopA1(reason);
    else if (state.active === 'A2') stopA2(reason);
    else stopTimer(reason);
}

// ============ A1 ============
async function startA1() {
    log('[A1] ========================================');
    log('[A1] MASTER AUTOMATION STARTED');
    log('[A1] ========================================');
    state.active = 'A1';
    a1.armed = true;
    a1.masterStopped = false;
    a1.pendingOrders.clear();
    a1.activeTrades.clear();
    await startTimer();
}

function stopA1(reason) {
    if (state.active !== 'A1') return;
    log('[A1] ========================================');
    log('[A1] MASTER STOP | ' + reason);
    log('[A1] ========================================');
    state.active = null;
    a1.masterStopped = true;
    a1.armed = false;
    a1.pendingOrders.clear();
    a1.activeTrades.clear();
    stopTimer('A1 stopped');
}

// ============ A2 ============
async function startA2() {
    log('[A2] ========================================');
    log('[A2] TIMER-ONLY STARTED');
    log('[A2] ========================================');
    state.active = 'A2';
    a2.armedAt = Date.now();
    await startTimer();
}

function stopA2(reason) {
    if (state.active !== 'A2') return;
    log('[A2] ========================================');
    log('[A2] STOPPED | ' + reason);
    log('[A2] ========================================');
    state.active = null;
    stopTimer('A2 stopped');
}

// ============ WS HANDLERS ============
function onOutgoingOpenOrder(data) {
    if (state.active === 'A1') {
        handleA1Order(data);
    } else if (state.active === 'A2') {
        if (Date.now() - a2.armedAt < A2_ARM_GRACE_MS) {
            log('[A2] Ignoring initial openOrder (from arm click)');
            return;
        }
        log('[A2] Manual trade detected -> STOP');
        stopA2('Manual trade placed');
    }
}

function handleA1Order(text) {
    if (a1.masterStopped || !a1.armed) {
        log('[A1] [PO ORDER IGNORED] Not armed');
        return;
    }
    let t = text;
    if (t.startsWith('42')) t = t.slice(2);
    let packet;
    try { packet = JSON.parse(t); } catch { return; }
    if (!Array.isArray(packet) || packet[0] !== 'openOrder') return;

    const order = packet[1];
    if (!order || typeof order !== 'object') return;
    const asset = order.asset;
    const action = normalizeAction(order.action);
    const requestId = order.requestId;
    if (!asset || !action || requestId == null) return;

    const duration = Number(order.time);
    const item = {
        requestId: String(requestId), asset, action,
        duration: Number.isFinite(duration) && duration > 0 ? duration : 15,
        sentAt: Date.now(),
    };
    a1.pendingOrders.set(String(requestId), item);
    a1.armed = false;
    log(`[A1] [PO ORDER SENT] ${asset} | ${action} | reqId: ${requestId} | ${item.duration}s`);
}

function findOpenPrice(o, v = new WeakSet()) {
    if (!o || typeof o !== 'object' || v.has(o)) return null;
    v.add(o);
    if (Object.prototype.hasOwnProperty.call(o, 'openPrice') && typeof o.openPrice === 'number') return o.openPrice;
    if (Array.isArray(o)) { for (const i of o) { const f = findOpenPrice(i, v); if (f !== null) return f; } }
    else { for (const k of Object.keys(o)) { const f = findOpenPrice(o[k], v); if (f !== null) return f; } }
    return null;
}

function findAsset(o, v = new WeakSet()) {
    if (!o || typeof o !== 'object' || v.has(o)) return null;
    v.add(o);
    if (typeof o.asset === 'string' && /^[A-Z0-9]+_otc$/i.test(o.asset)) return o.asset;
    if (Array.isArray(o)) { for (const i of o) { const f = findAsset(i, v); if (f) return f; } }
    else { for (const k of Object.keys(o)) { const f = findAsset(o[k], v); if (f) return f; } }
    return null;
}

function onServerObject(obj) {
    if (state.active !== 'A1' || a1.masterStopped) return;
    const openPrice = findOpenPrice(obj);
    if (openPrice === null) return;
    const asset = findAsset(obj);
    let order = null;
    if (asset) order = Array.from(a1.pendingOrders.values()).filter(x => x.asset === asset).sort((a,b) => b.sentAt - a.sentAt)[0];
    if (!order) {
        const cands = Array.from(a1.pendingOrders.values()).filter(x => Date.now() - x.sentAt < 10000).sort((a,b) => b.sentAt - a.sentAt);
        if (cands.length) order = cands[0];
    }
    if (!order) return;
    confirmA1Entry(asset || order.asset, openPrice, order);
}

function confirmA1Entry(asset, entry, order) {
    if (state.active !== 'A1') return;
    const step = calculateStep(entry);
    const lower = order.action === 'BUY' ? entry - step : entry;
    const upper = order.action === 'BUY' ? entry : entry + step;
    const confirmedAt = Date.now();
    const expiresAt = confirmedAt + order.duration * 1000;
    const id = `${order.requestId}_${confirmedAt}`;
    a1.activeTrades.set(id, {
        id, requestId: order.requestId, asset, action: order.action,
        entry, step, lower, upper, duration: order.duration,
        confirmedAt, expiresAt, warningTriggered: false,
    });
    a1.pendingOrders.delete(order.requestId);
    log(`[A1] [ENTRY] ${asset} | ${order.action} | E: ${formatNumber(entry)} | RANGE: ${formatNumber(lower)} < X < ${formatNumber(upper)} | ${order.duration}s`);
}

async function onTick(asset, ts, price) {
    if (state.active !== 'A1' || a1.masterStopped) return;
    if (!/^[A-Z0-9]+_otc$/i.test(asset)) return;

    for (const [id, trade] of a1.activeTrades) {
        if (state.active !== 'A1') break;
        const now = Date.now();
        if (now >= trade.expiresAt) { a1.activeTrades.delete(id); continue; }
        if (trade.asset !== asset || trade.warningTriggered) continue;
        if (!(price > trade.lower && price < trade.upper)) continue;

        trade.warningTriggered = true;
        const timeLeft = Math.max(0, (trade.expiresAt - now) / 1000).toFixed(1);
        const type = trade.action === 'BUY' ? 'Buy warning massage' : 'Sell warning massage';

        try { await cdpActions.triggerOpposite(trade.action); }
        catch (e) { log('[A1] Opposite fail:', e.message); }

        log(`${type} | [PO TICK] ${asset} | LOCAL: ${localTime(ts*1000)} | price: ${formatNumber(price)} | TIME LEFT: ${timeLeft}s`);

        stopA1(`${trade.action} warning triggered`);
        return;
    }
}

// ============ TRIGGERS ============
async function onShiftClick() {
    if (state.active === 'A1') { log('[A1] Already active'); return; }
    if (state.active === 'A2') stopA2('A1 takeover via Shift+Click');
    await startA1();
}

async function onCtrlShiftClick() {
    if (state.active === 'A2') { stopA2('Ctrl+Shift toggle OFF'); return; }
    if (state.active === 'A1') stopA1('A2 takeover via Ctrl+Shift+Click');
    await startA2();
}

// ============ MAIN ============
async function main() {
    const targets = await CDP.List({ port: config.cdpPort });
    const poTarget = targets.find(t => t.url.includes(config.poUrlPattern));
    if (!poTarget) { console.error('[FATAL] PO tab not found'); process.exit(1); }
    log('[CDP] Found:', poTarget.url.substring(0, 80));

    const client = await CDP({ target: poTarget, port: config.cdpPort });
    await client.Runtime.enable();
    await client.Network.enable();
    await client.Page.enable();

    cdpActions = new CDPActions(client, config);

    client.Runtime.consoleAPICalled(({ type, args }) => {
        if (type !== 'log') return;
        const text = args.map(a => a.value || a.description || '').join(' ');
        if (text === ARM_A1_TOKEN) onShiftClick();
        else if (text === ARM_A2_TOKEN) onCtrlShiftClick();
    });

    const INJECT = `
        (() => {
            if (window.__poAutoInstalled) return 'already';
            window.__poAutoInstalled = true;
            document.addEventListener('click', (e) => {
                if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    console.log('${ARM_A1_TOKEN}');
                } else if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
                    console.log('${ARM_A2_TOKEN}');
                }
            }, true);
            return 'installed';
        })()
    `;
    await client.Runtime.evaluate({ expression: INJECT, returnByValue: true });
    log('[ARM] Listeners installed');

    client.Page.loadEventFired(async () => {
        log('[PAGE] Reload — reinjecting...');
        await client.Runtime.evaluate({ expression: `window.__poAutoInstalled=false;'r';` });
        await client.Runtime.evaluate({ expression: INJECT, returnByValue: true });
        if (state.active === 'A1') stopA1('Page reloaded');
        else if (state.active === 'A2') stopA2('Page reloaded');
    });

    let lastBinHeader = null;

    client.Network.webSocketFrameSent(({ response }) => {
        const d = response.payloadData;
        if (d && typeof d === 'string' && d.includes('openOrder')) onOutgoingOpenOrder(d);
    });

    client.Network.webSocketFrameReceived(({ response }) => {
        const d = response.payloadData;
        const op = response.opcode;
        if (op === 1) {
            if (d === '2' || d === '3') return;
            if (d.includes('chat_room_list_update')) return;
            const m = d.match(/^45\d+-\["(\w+)",/);
            if (m) { lastBinHeader = m[1]; }
            return;
        }
        if (op === 2) {
            let dec;
            try { dec = JSON.parse(Buffer.from(d, 'base64').toString('utf8')); } catch { return; }
            if (lastBinHeader === 'successopenOrder') {
                onServerObject(dec); lastBinHeader = null; return;
            }
            if (Array.isArray(dec) && dec[0] && Array.isArray(dec[0])) {
                const t = dec[0];
                if (t.length >= 3 && typeof t[0] === 'string' && typeof t[1] === 'number' && typeof t[2] === 'number') {
                    onTick(t[0], t[1], t[2]);
                }
                return;
            }
            lastBinHeader = null;
        }
    });

    log('========================================');
    log('[AUTO] PO-AUTO v1.2 ACTIVE');
    log('[AUTO] Shift+Click       → A1 (warning + opposite)');
    log('[AUTO] Ctrl+Shift+Click  → A2 (timer only, toggle)');
    log('========================================');

    process.on('SIGINT', async () => {
        log('\n[SHUTDOWN]');
        stopTimer('SIGINT');
        try { await client.close(); } catch {}
        process.exit(0);
    });
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
