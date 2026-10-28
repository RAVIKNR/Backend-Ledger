import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { CheckCircle2, Mail, ShieldCheck } from 'lucide-react'
import { Button } from './ui'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../auth/AuthContext'
import { formatRetryAfter, getCooldownDeadline, getRetryDeadline } from '../lib/emailOtpRetry.mjs'

type StatusResponse = {
  email: string
  status: string
  verified: boolean
  expiresAt: string | null
  resendAfterAt: string | null
  resendCooldownSeconds: number
  sendLimitRetryAt?: string | null
  sendLimitRetryAfterSeconds?: number
}

type EmailVerificationProps = {
  email: string
  disabled?: boolean
  onVerificationChange: (verified: boolean) => void
}

function getEmailOtpError(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: { code?: string; message?: string } }>(error)) {
    const status = error.response?.status
    if (status === 503) return 'Email verification is temporarily unavailable. Please ask support to check the backend email configuration.'
    if (status === 502) return 'The email could not be delivered. Please check your inbox later or contact support.'
    return error.response?.data?.error?.message ||
      (error.request ? 'Unable to reach LedgerGuard. Check the API server.' : fallback)
  }
  return fallback
}

export function EmailVerification({ email, disabled = false, onVerificationChange }: EmailVerificationProps) {
  const onVerificationChangeRef = useRef(onVerificationChange)
  onVerificationChangeRef.current = onVerificationChange
  const [status, setStatus] = useState<'loading' | 'idle' | 'sent' | 'verified'>('loading')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [message, setMessage] = useState('')
  const [codeExpired, setCodeExpired] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [secondsRemaining, setSecondsRemaining] = useState(0)

useEffect(() => {
  let active = true
  onVerificationChangeRef.current(false)
  setStatus('loading')
  setError('')
  setErrorCode('')
  setMessage('')
  setCodeExpired(false)
  setCooldownUntil(0)
  setSecondsRemaining(0)

  api.get<StatusResponse>('/users/me/email-otp/status', {
    params: { _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  })
    .then(({ data }) => {
      if (!active) return

      setStatus(
        data.verified
          ? 'verified'
          : data.status === 'SENT' || data.status === 'EXPIRED'
            ? 'sent'
            : 'idle'
      )

      const now = Date.now()
      const deadline = getCooldownDeadline(data, now)
      const sendLimitDeadline = getCooldownDeadline({
        sendLimitRetryAt: data.sendLimitRetryAt,
        sendLimitRetryAfterSeconds: data.sendLimitRetryAfterSeconds
      }, now)

      setCooldownUntil(deadline)
      setSecondsRemaining(
        Math.max(0, Math.ceil((deadline - now) / 1000))
      )

      setErrorCode(sendLimitDeadline > now ? 'OTP_SEND_LIMIT' : '')

      setCodeExpired(
        !data.verified &&
        (data.status === 'EXPIRED' || Boolean(data.expiresAt && new Date(data.expiresAt).getTime() <= now))
      )

      if (data.verified) {
        onVerificationChangeRef.current(true)
      }
    })
    .catch((requestError: unknown) => {
      if (active) {
        setStatus('idle')
        setError(
          getApiErrorMessage(
            requestError,
            'We could not check email verification status.'
          )
        )
      }
    })

  return () => {
    active = false
  }
}, [email])


  useEffect(() => {
    if (!cooldownUntil) return
    const update = () => setSecondsRemaining(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [cooldownUntil])

  async function requestCode(resend: boolean) {
    if (busy || disabled) return
    setBusy(true)
    setError('')
    setErrorCode('')
    setMessage('')
    try {
      const { data } = await api.post<StatusResponse & { message: string }>(
        `/users/me/email-otp/${resend ? 'resend' : 'send'}`
      )
      setStatus(data.verified ? 'verified' : 'sent')
      const now = Date.now()
      setCooldownUntil(getCooldownDeadline(data, now))
      setCodeExpired(false)
      setErrorCode(
        getCooldownDeadline({
          sendLimitRetryAt: data.sendLimitRetryAt,
          sendLimitRetryAfterSeconds: data.sendLimitRetryAfterSeconds
        }, now) > now
          ? 'OTP_SEND_LIMIT'
          : ''
      )
      setMessage(data.message)
      setOtp('')
      onVerificationChangeRef.current(data.verified)
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 410) {
        setStatus('sent')
        setCodeExpired(true)
      }
      if (axios.isAxiosError<{ error?: { code?: string }; retryAfterSeconds?: number; retryAt?: string }>(requestError)) {
        const code = requestError.response?.data?.error?.code || ''
        const retryAfter = Number(requestError.response?.data?.retryAfterSeconds)
        setErrorCode(code)
        const retryAt = requestError.response?.data?.retryAt
        setCooldownUntil(getRetryDeadline(retryAt, retryAfter))
        if (code === 'EMAIL_DELIVERY_FAILED' || code === 'EMAIL_DELIVERY_UNAVAILABLE') {
          setStatus('idle')
          setCooldownUntil(0)
        }
        if (code === 'OTP_COOLDOWN') setStatus('sent')
      }
      setError(getEmailOtpError(requestError, 'We could not send a verification code.'))
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || disabled || !/^\d{6}$/.test(otp)) return
    setBusy(true)
    setError('')
    setErrorCode('')
    setMessage('')
    try {
      const { data } = await api.post<{ verified: boolean; message: string }>('/users/me/email-otp/verify', { otp })
      setStatus('verified')
      setMessage(data.message)
      setOtp('')
      onVerificationChangeRef.current(true)
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 410) {
        setStatus('sent')
        setCodeExpired(true)
      }
      if (axios.isAxiosError<{ error?: { code?: string }; retryAfterSeconds?: number; retryAt?: string }>(requestError)) {
        setErrorCode(requestError.response?.data?.error?.code || '')
        const retryAfter = Number(requestError.response?.data?.retryAfterSeconds)
        const retryAt = requestError.response?.data?.retryAt
        if (retryAt || retryAfter > 0) {
          setCooldownUntil(getRetryDeadline(retryAt, retryAfter))
        }
      }
      setError(getEmailOtpError(requestError, 'We could not verify this code.'))
    } finally {
      setBusy(false)
    }
  }

  const isVerified = status === 'verified'
  const hasCode = status === 'sent'

  return <section className="email-verification" aria-labelledby="email-verification-heading">
    <div className="email-verification-heading">
      <span className={`email-verification-icon ${isVerified ? 'verified' : ''}`}>{isVerified ? <ShieldCheck size={17} /> : <Mail size={17} />}</span>
      <div>
        <h3 id="email-verification-heading">Email verification</h3>
        <p>Verify the email address registered to your LedgerGuard account.</p>
      </div>
      {isVerified && <span className="verification-badge"><CheckCircle2 size={14} /> Verified</span>}
    </div>
    <div className="email-verification-address"><span>Registered email</span><strong>{email}</strong></div>
    {status === 'loading' && <p className="email-verification-note">Checking verification status…</p>}
    {!isVerified && status !== 'loading' && <>
      {!hasCode ? <Button type="button" disabled={busy || disabled || !email || secondsRemaining > 0} onClick={() => void requestCode(false)}>
      {busy ? 'Sending code…' : secondsRemaining > 0 ? `Try again in ${formatRetryAfter(secondsRemaining)}` : 'Send OTP'}
      </Button> : <form className="email-otp-form" onSubmit={(event) => void verifyCode(event)}>
        <label className="field">
          <span className="field-label">Six-digit email code</span>
          <input className="ui-input email-otp-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} aria-label="Six-digit email verification code" />
        </label>
        <div className="email-otp-actions">
          <Button type="submit" disabled={busy || disabled || otp.length !== 6}>{busy ? 'Verifying…' : 'Verify email'}</Button>
          <Button type="button" variant="secondary" disabled={busy || disabled || secondsRemaining > 0} onClick={() => void requestCode(true)}>
            {busy ? 'Sending…' : secondsRemaining > 0 ? `Resend in ${formatRetryAfter(secondsRemaining)}` : 'Resend OTP'}
          </Button>
        </div>
      </form>}
      {hasCode && !codeExpired && <p className="email-verification-note">Enter the code sent to the email above. It expires after five minutes.</p>}
    </>}
    {codeExpired && <p className="email-verification-note">
      {errorCode === 'OTP_SEND_LIMIT' && secondsRemaining > 0
        ? 'The previous verification code has expired. The daily email-code limit is still active, so a new code cannot be sent yet.'
        : 'The verification code has expired. Resend a new code to continue.'}
    </p>}
    {(error || errorCode === 'OTP_SEND_LIMIT') && <div className="form-error" role="alert">
      {errorCode === 'OTP_COOLDOWN'
        ? secondsRemaining > 0
          ? `Please wait ${formatRetryAfter(secondsRemaining)} before requesting another code.`
          : 'The resend cooldown has ended. You can request a new code.'
        : errorCode === 'OTP_SEND_LIMIT'
          ? secondsRemaining > 0
            ? `You have reached the daily email-code limit. Try again in ${formatRetryAfter(secondsRemaining)}.`
            : 'The 24-hour email-code limit has reset. You can request a new code.'
          : errorCode === 'OTP_ATTEMPTS_EXCEEDED'
            ? secondsRemaining > 0
              ? `Too many incorrect codes. Request a new code in ${formatRetryAfter(secondsRemaining)}.`
              : 'You can request a new code now.'
            : errorCode === 'EMAIL_DELIVERY_FAILED'
              ? 'The email could not be delivered. Check the backend email settings and try again.'
              : error}
    </div>}
    {message && <div className="profile-success" role="status">{message}</div>}
  </section>
}
