import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, LoaderCircle, Mail, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Button, Input } from '../components/ui'
import { api, getApiErrorMessage } from '../lib/api'
import { useAuth } from './AuthContext'

type VerificationState = 'loading' | 'success' | 'error'

export function VerifyEmailPage() {
  const [state, setState] = useState<VerificationState>('loading')
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendMessage, setResendMessage] = useState('')
  const [resending, setResending] = useState(false)
  const autoVerificationStarted = useRef(false)
  const { user, resendVerification } = useAuth()
  const reducedMotion = useReducedMotion()
  const token = new URLSearchParams(window.location.search).get('token')

  const verify = useCallback(async () => {
    if (!token) {
      setState('error')
      setMessage('This verification link is missing its security token.')
      return
    }

    setState('loading')
    setMessage('')
    setResendMessage('')
    try {
      const response = await api.get<{ message: string }>('/auth/verify-email', { params: { token } })
      setState('success')
      setMessage(response.data.message)
      window.history.replaceState({}, '', window.location.pathname)
    } catch (error) {
      setState('error')
      setMessage(getApiErrorMessage(error, 'We could not verify this link. It may be expired or already used.'))
    }
  }, [token])

  useEffect(() => {
    if (autoVerificationStarted.current) return
    autoVerificationStarted.current = true
    void verify()
  }, [verify])

  async function resend() {
    if (!resendEmail.trim()) {
      setResendMessage('Enter the email address you used to create your account.')
      return
    }

    setResending(true)
    setResendMessage('')
    try {
      setResendMessage(await resendVerification(resendEmail.trim()))
    } catch (error) {
      setResendMessage(getApiErrorMessage(error, 'We could not resend the verification email.'))
    } finally {
      setResending(false)
    }
  }

  const isSuccess = state === 'success'
  const heading = isSuccess ? 'Email verified successfully' : state === 'loading' ? 'Verifying your email' : 'We could not verify this link'

  return <main className="verification-page">
    <div className="verification-orbit verification-orbit-one" />
    <div className="verification-orbit verification-orbit-two" />
    <section className="verification-card" aria-live="polite">
      <div className="brand verification-brand"><div className="brand-mark"><ShieldCheck size={18} /></div><span>ledger<span>guard</span></span></div>
      <motion.div
        className={`verification-icon ${isSuccess ? 'success' : state === 'error' ? 'error' : 'loading'}`}
        initial={reducedMotion ? false : { scale: .9, opacity: 0 }}
        animate={reducedMotion ? undefined : { scale: 1, opacity: 1 }}
        aria-hidden="true"
      >
        {isSuccess ? <Check size={29} /> : state === 'error' ? <TriangleAlert size={27} /> : <LoaderCircle className="verification-spinner" size={28} />}
      </motion.div>
      <span className="verification-kicker">{isSuccess ? 'Account protected' : 'Email confirmation'}</span>
      <h1>{heading}</h1>
      <p className="verification-copy">
        {isSuccess
          ? 'Your email address is confirmed. You can now sign in and securely access your LedgerGuard workspace.'
          : state === 'loading'
            ? 'We are securely checking your one-time verification link. This will only take a moment.'
            : message}
      </p>
      {state === 'error' && <div className="verification-recovery">
        <p>Links expire after 24 hours and can only be used once. Request a fresh link if needed.</p>
        <div className="verification-resend">
          <Input label="Account email" type="email" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
          <Button onClick={() => void resend()} disabled={resending}>{resending ? <LoaderCircle className="verification-spinner" size={15} /> : <Mail size={15} />} {resending ? 'Sending...' : 'Resend verification'}</Button>
        </div>
        {resendMessage && <p className="verification-resend-message" role="status">{resendMessage}</p>}
      </div>}
      <div className="verification-actions">
        {state === 'error' && token && <Button variant="secondary" onClick={() => void verify()}><RefreshCw size={15} /> Try again</Button>}
        {state !== 'loading' && <Button onClick={() => { window.location.assign('/') }}>{user ? 'Continue to dashboard' : 'Return to sign in'}</Button>}
      </div>
      <p className="verification-footnote"><ShieldCheck size={13} /> LedgerGuard keeps every account protected.</p>
    </section>
  </main>
}
