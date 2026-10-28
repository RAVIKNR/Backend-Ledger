const crypto = require('crypto');

const metrics = {
    requests: 0,
    errors: 0,
    durationsMs: 0
};

function requestContext(req, res, next) {
    const requestId = crypto.randomUUID();
    req.requestId = requestId;
    res.set('x-request-id', requestId);
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        metrics.requests += 1;
        metrics.durationsMs += durationMs;
        if (res.statusCode >= 500) metrics.errors += 1;
        console.log(JSON.stringify({
            event: 'http_request',
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs: Math.round(durationMs * 100) / 100
        }));
    });

    next();
}

function getMetrics() {
    return {
        requests: metrics.requests,
        errors: metrics.errors,
        averageDurationMs: metrics.requests === 0
            ? 0
            : Math.round((metrics.durationsMs / metrics.requests) * 100) / 100
    };
}

module.exports = { requestContext, getMetrics };
