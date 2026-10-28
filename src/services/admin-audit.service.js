function sanitizeAuditReason(reason) {
    if (typeof reason !== 'string') return null;
    return reason
        .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi, '[REDACTED PRIVATE KEY]')
        .replace(/\b(password|passwd|secret|token|access[_ -]?token|refresh[_ -]?token|api[_ -]?key)\b(\s*[:=]\s*)[^\s,;]+/gi, '$1$2[REDACTED]')
        .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]');
}

async function recordAdminAudit(client, {
    actorId,
    action,
    targetType,
    targetId,
    reason = null,
    metadata = null
}) {
    const data = { actorId, action, targetType, targetId };
    if (reason !== null) data.reason = sanitizeAuditReason(reason);
    if (metadata !== null) data.metadata = metadata;
    return client.adminAuditLog.create({
        data
    });
}

module.exports = { recordAdminAudit, sanitizeAuditReason };
