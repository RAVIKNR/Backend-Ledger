type EmailOtpRetryStatus = {
  resendAfterAt?: string | null
  resendCooldownSeconds?: number
  sendLimitRetryAt?: string | null
  sendLimitRetryAfterSeconds?: number
}

export function getCooldownDeadline(data: EmailOtpRetryStatus, now?: number): number
export function getRetryDeadline(retryAt?: string | null, retryAfterSeconds?: number, now?: number): number
export function formatRetryAfter(seconds: number): string
