function getDeadline(timestamp, seconds, now) {
  const parsedTimestamp = timestamp ? new Date(timestamp).getTime() : Number.NaN
  if (Number.isFinite(parsedTimestamp)) return parsedTimestamp

  const retrySeconds = Number(seconds) || 0
  return retrySeconds > 0 ? now + retrySeconds * 1000 : 0
}

export function getCooldownDeadline(data, now = Date.now()) {
  return Math.max(
    getDeadline(data.resendAfterAt, data.resendCooldownSeconds, now),
    getDeadline(data.sendLimitRetryAt, data.sendLimitRetryAfterSeconds, now)
  )
}

export function getRetryDeadline(retryAt, retryAfterSeconds, now = Date.now()) {
  return getDeadline(retryAt, retryAfterSeconds, now)
}

export function formatRetryAfter(seconds) {
  if (seconds >= 3600) {
    const totalMinutes = Math.ceil(seconds / 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const remainder = seconds % 60
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`
  }
  return `${seconds}s`
}
