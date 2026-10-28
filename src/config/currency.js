const SUPPORTED_CURRENCY = 'INR';

function normalizeInr(value) {
    return typeof value === 'string' && value.trim().toUpperCase() === SUPPORTED_CURRENCY
        ? SUPPORTED_CURRENCY
        : null;
}

module.exports = { SUPPORTED_CURRENCY, normalizeInr };
