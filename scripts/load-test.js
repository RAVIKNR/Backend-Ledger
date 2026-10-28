const http = require('http');

const url = new URL(process.env.LOAD_URL || 'http://127.0.0.1:3000/health');
const concurrency = Number(process.env.LOAD_CONCURRENCY || 10);
const durationSeconds = Number(process.env.LOAD_DURATION_SECONDS || 10);
const method = process.env.LOAD_METHOD || 'GET';
const body = process.env.LOAD_BODY;
const headers = body ? { 'content-type': 'application/json' } : {};
const samples = [];
let completed = 0;
let failures = 0;
const endsAt = Date.now() + durationSeconds * 1000;

function request() {
    const started = process.hrtime.bigint();
    const req = http.request({
        hostname: url.hostname,
        port: url.port || 80,
        path: `${url.pathname}${url.search}`,
        method,
        headers
    }, (res) => {
        res.resume();
        res.on('end', () => {
            samples.push(Number(process.hrtime.bigint() - started) / 1e6);
            completed += 1;
            if (res.statusCode >= 400) failures += 1;
            if (Date.now() < endsAt) request();
        });
    });
    req.on('error', () => {
        failures += 1;
        if (Date.now() < endsAt) request();
    });
    if (body) req.write(body);
    req.end();
}

for (let i = 0; i < concurrency; i += 1) request();

setTimeout(() => {
    samples.sort((a, b) => a - b);
    const percentile = (value) => samples.length
        ? samples[Math.min(samples.length - 1, Math.floor(samples.length * value))]
        : 0;
    console.log(JSON.stringify({
        url: url.toString(),
        concurrency,
        durationSeconds,
        completed,
        failures,
        throughputRequestsPerSecond: Number((completed / durationSeconds).toFixed(2)),
        latencyMs: {
            p50: Number(percentile(0.5).toFixed(2)),
            p95: Number(percentile(0.95).toFixed(2)),
            p99: Number(percentile(0.99).toFixed(2))
        }
    }, null, 2));
    process.exitCode = failures > 0 ? 1 : 0;
}, durationSeconds * 1000 + 500);
