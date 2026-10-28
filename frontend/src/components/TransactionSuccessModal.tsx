import { useEffect, useRef, useState } from 'react'
import { Check, Volume2, VolumeX } from 'lucide-react'
import { Button } from './ui'
import { LedgerObject } from './LedgerObject'
import { isSuccessSoundEnabled, playTransactionSuccessSound, setSuccessSoundEnabled } from '../lib/successSound'

type TransactionSuccess = {
  id: string
  reference?: string | null
  amountMinor: string
  currency: string
  status: string
  createdAt: string
}

export function TransactionSuccessModal({
  transaction,
  transactionType,
  onClose,
}: {
  transaction: TransactionSuccess
  transactionType: 'DEBIT' | 'CREDIT'
  onClose: () => void
}) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const [soundEnabled, setSoundEnabled] = useState(isSuccessSoundEnabled)

  useEffect(() => {
    if (transaction.status === 'COMPLETED') playTransactionSuccessSound(transaction.id)
  }, [transaction.id, transaction.status])
  useEffect(() => {
    closeButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  useEffect(() => {
    const syncPreference = () => setSoundEnabled(isSuccessSoundEnabled())
    window.addEventListener('ledgerguard-sound-preference', syncPreference)
    return () => window.removeEventListener('ledgerguard-sound-preference', syncPreference)
  }, [])

  if (transaction.status !== 'COMPLETED') return null

  const amount = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: transaction.currency,
  }).format(Number(transaction.amountMinor) / 100)

  return <div className="success-modal-backdrop" role="presentation">
    <section className="transaction-success-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-success-title" aria-describedby="transaction-success-description">
      <button ref={closeButton} className="transaction-success-close" type="button" onClick={onClose} aria-label="Close transaction success dialog">×</button>
      <div className="transaction-success-art" aria-hidden="true">
        <LedgerObject variant="dashboard" className="transaction-success-ledger" />
        <span className="transaction-success-check"><Check size={23} strokeWidth={2.5} /></span>
      </div>
      <div className="transaction-success-copy">
        <span className="section-kicker">Transaction confirmed</span>
        <h2 id="transaction-success-title">Payment complete</h2>
        <p id="transaction-success-description">Your transaction was committed successfully to the LedgerGuard ledger.</p>
      </div>
      <div className="transaction-success-details">
        <div><span>Type</span><strong>{transactionType === 'DEBIT' ? 'Debit' : 'Credit'}</strong></div>
        <div><span>Amount</span><strong>{amount}</strong></div>
        <div><span>Status</span><strong className="transaction-success-status">COMPLETED</strong></div>
        <div><span>Reference</span><strong>{transaction.reference || transaction.id}</strong></div>
        <div><span>Timestamp</span><strong>{new Date(transaction.createdAt).toLocaleString()}</strong></div>
      </div>
      <div className="transaction-success-actions">
        <Button type="button" variant="secondary" onClick={() => {
          const nextEnabled = !soundEnabled
          setSuccessSoundEnabled(nextEnabled)
          setSoundEnabled(nextEnabled)
          window.dispatchEvent(new Event('ledgerguard-sound-preference'))
        }} aria-label={soundEnabled ? 'Mute success sound' : 'Enable success sound'}>
          {soundEnabled ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
          {soundEnabled ? 'Sound on' : 'Sound off'}
        </Button>
        <Button type="button" onClick={onClose}>Continue</Button>
      </div>
    </section>
  </div>
}
