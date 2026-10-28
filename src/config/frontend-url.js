function getFrontendUrl(value = process.env.FRONTEND_URL, nodeEnv = process.env.NODE_ENV) {
    const configuredUrl = value || (nodeEnv === 'production' ? '' : 'http://localhost:5173');
    if (!configuredUrl) {
        throw new Error('FRONTEND_URL is required in production');
    }

    let url;
    try {
        url = new URL(configuredUrl);
    } catch {
        throw new TypeError('FRONTEND_URL must be a valid HTTP(S) origin');
    }

    if (
        (url.protocol !== 'https:' && url.protocol !== 'http:') ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
    ) {
        throw new TypeError('FRONTEND_URL must be an HTTP(S) origin without credentials, path, query, or fragment');
    }
    if (nodeEnv === 'production' && url.protocol !== 'https:') {
        throw new TypeError('FRONTEND_URL must use HTTPS in production');
    }

    return url.origin;
}

module.exports = { getFrontendUrl };
