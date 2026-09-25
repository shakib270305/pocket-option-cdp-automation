// config.js — Central configuration for PO automation
module.exports = {
    // Chrome DevTools Protocol port
    cdpPort: 9222,

    // URL pattern to identify Pocket Option tab
    poUrlPattern: 'pocketoption.com',

    // Warning range: step = multiplier × 10^(-decimalPlaces)
    // Example: entry 1.02596, 8 × 10^-5 = 0.00008
    warningStepMultiplier: 8,

    // Timer master stop at this many seconds
    timerMasterStopSeconds: 3,

    // Tokens for arm detection (must be unique)
    armTokenA1: '__PO_ARM_A1__',
    armTokenA2: '__PO_ARM_A2__',

    // A2 arm-click on BUY/SELL button produces openOrder.
    // This grace period (ms) ignores that initial openOrder.
    a2ArmGraceMs: 800,

    // Mouse click hold duration (ms)
    clickHoldMs: 40,
};
