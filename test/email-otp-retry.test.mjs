import assert from 'node:assert/strict'
import test from 'node:test'
import { formatRetryAfter, getCooldownDeadline, getRetryDeadline } from '../frontend/src/lib/emailOtpRetry.mjs'

const now = Date.parse('2026-10-26T12:00:00.000Z')

test('uses the server absolute timestamp instead of extending a stale countdown', () => {
  const retryAt = new Date(now + 30_000).toISOString()

  assert.equal(getCooldownDeadline({
    sendLimitRetryAt: retryAt,
    sendLimitRetryAfterSeconds: 70_090
  }, now), now + 30_000)
})

test('does not revive an expired server deadline from stale relative seconds', () => {
  const retryAt = new Date(now - 1_000).toISOString()

  assert.equal(getRetryDeadline(retryAt, 70_090, now), now - 1_000)
  assert.equal(getCooldownDeadline({
    resendAfterAt: retryAt,
    resendCooldownSeconds: 60
  }, now), now - 1_000)
})

test('uses relative retry seconds only when the server did not provide a valid timestamp', () => {
  assert.equal(getRetryDeadline(null, 60, now), now + 60_000)
  assert.equal(getCooldownDeadline({
    resendAfterAt: 'not-a-date',
    resendCooldownSeconds: 60
  }, now), now + 60_000)
})

  test('formats a long rolling-window retry as hours and minutes', () => {
    assert.equal(formatRetryAfter(70_090), '19h 29m')
  })
