const SOUND_PREFERENCE_KEY = 'ledgerguard-success-sound'

type AudioContextWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

export function isSuccessSoundEnabled() {
  try {
    return localStorage.getItem(SOUND_PREFERENCE_KEY) !== 'muted'
  } catch {
    return true
  }
}

export function setSuccessSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(SOUND_PREFERENCE_KEY, enabled ? 'enabled' : 'muted')
  } catch {
    // An unavailable preference store should not prevent a confirmed transfer.
  }
}

export function playTransactionSuccessSound(transactionId: string) {
  playTransactionSound('success', transactionId)
}

const playedTransactionSounds = new Set<string>()
const transactionAudioSources: Partial<Record<'success' | 'failure', string>> = {
  success: '/audio/transaction-success.mpeg',
  failure: '/audio/transaction-failure.mpeg'
}

export function playTransactionSound(kind: 'success' | 'failure' | 'pending', transactionId: string) {
  const soundKey = `${kind}:${transactionId}`
  if (!transactionId || playedTransactionSounds.has(soundKey) || !isSuccessSoundEnabled()) return
  playedTransactionSounds.add(soundKey)

  try {
    const audioSource = kind === 'pending' ? undefined : transactionAudioSources[kind]
    if (audioSource) {
      const audio = new Audio(audioSource)
      audio.preload = 'auto'
      audio.volume = 1
      void audio.play().catch(() => {})
      return
    }

    const AudioContextConstructor = window.AudioContext || (window as AudioContextWindow).webkitAudioContext
    if (!AudioContextConstructor) return
    const context = new AudioContextConstructor()
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-12, context.currentTime)
    compressor.knee.setValueAtTime(8, context.currentTime)
    compressor.ratio.setValueAtTime(5, context.currentTime)
    compressor.attack.setValueAtTime(0.003, context.currentTime)
    compressor.release.setValueAtTime(0.12, context.currentTime)
    const master = context.createGain()
    master.gain.setValueAtTime(0.78, context.currentTime)
    master.connect(compressor)
    compressor.connect(context.destination)

    const tones = kind === 'success'
      ? [{ frequency: 740, start: 0, duration: 0.18 }, { frequency: 1046, start: 0.13, duration: 0.34 }]
      : kind === 'failure'
        ? [{ frequency: 540, start: 0, duration: 0.2 }, { frequency: 330, start: 0.18, duration: 0.34 }]
        : [{ frequency: 1320, start: 0, duration: 0.24 }, { frequency: 1980, start: 0.035, duration: 0.3 }]
    let remaining = tones.length
    tones.forEach(({ frequency, start, duration }) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const startAt = context.currentTime + start
      const endAt = startAt + duration
      oscillator.type = kind === 'failure' ? 'triangle' : kind === 'pending' ? 'sine' : 'triangle'
      oscillator.frequency.setValueAtTime(frequency, startAt)
      gain.gain.setValueAtTime(0.0001, startAt)
      gain.gain.exponentialRampToValueAtTime(kind === 'pending' ? 0.16 : 0.2, startAt + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt)
      oscillator.connect(gain)
      gain.connect(master)
      oscillator.start(startAt)
      oscillator.stop(endAt + 0.01)
      oscillator.addEventListener('ended', () => {
        remaining -= 1
        if (remaining === 0) void context.close()
      }, { once: true })
    })
    void context.resume().catch(() => { void context.close() })
  } catch {
    // Audio is an enhancement; browser audio restrictions must not affect transfers.
  }
}
