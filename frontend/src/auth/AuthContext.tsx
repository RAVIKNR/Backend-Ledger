import axios from 'axios'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getApiErrorMessage, setBearerToken } from '../lib/api'

export type User = {
  id: string
  name: string
  email: string
  status: string
  createdAt: string
}

type Credentials = { email: string; password: string }
type Registration = Credentials & { name: string }
type RegistrationResult = { user: User; verificationRequired: boolean; message: string }
type AuthContextValue = {
  user: User | null
  token: string | null
  loading: boolean
  sessionStatus: 'restoring' | 'authenticated' | 'unauthenticated' | 'error'
  login: (input: Credentials) => Promise<void>
  register: (input: Registration) => Promise<RegistrationResult>
  resendVerification: (email: string) => Promise<string>
  googleLogin: (credential: string) => Promise<void>
  logout: () => Promise<void>
  retrySession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const SESSION_TOKEN_KEY = 'ledgerguard-session-token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<AuthContextValue['sessionStatus']>('restoring')

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
    setUser(null)
    setToken(null)
    setBearerToken(null)
    setSessionStatus('unauthenticated')
  }, [])

  const restoreSession = useCallback(async (storedToken: string) => {
    setSessionStatus('restoring')
    setBearerToken(storedToken)
    try {
      const response = await api.get<{ user: User }>('/users/me')
      setUser(response.data.user)
      setSessionStatus('authenticated')
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearSession()
        return
      }
      setSessionStatus('error')
    }
  }, [clearSession])

  useEffect(() => {
    const storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY)
    if (!storedToken) {
      setSessionStatus('unauthenticated')
      return
    }

    setToken(storedToken)
    void restoreSession(storedToken)
  }, [restoreSession])

  async function authenticate(path: 'login', input: Credentials): Promise<void>
  async function authenticate(path: 'register', input: Registration): Promise<RegistrationResult>
  async function authenticate(path: 'login' | 'register', input: Credentials | Registration): Promise<void | RegistrationResult> {
    setLoading(true)
    try {
      const response = await api.post<{ user: User; token: string }>(`/auth/${path}`, input)
      if (path === 'register') {
        const registrationResponse = response.data as unknown as RegistrationResult
        return registrationResponse
      }
      setUser(response.data.user)
      setToken(response.data.token)
      sessionStorage.setItem(SESSION_TOKEN_KEY, response.data.token)
      setBearerToken(response.data.token)
      setSessionStatus('authenticated')
    } finally {
      setLoading(false)
    }
  }

  async function resendVerification(email: string) {
    const response = await api.post<{ message: string }>('/auth/resend-verification', { email })
    return response.data.message
  }

  async function logout() {
    try {
      if (token) await api.post('/auth/logout')
    } finally {
      clearSession()
    }
  }

  async function googleLogin(credential: string) {
    setLoading(true)
    try {
      const response = await api.post<{ user: User; token: string }>('/auth/google', { credential })
      setUser(response.data.user)
      setToken(response.data.token)
      sessionStorage.setItem(SESSION_TOKEN_KEY, response.data.token)
      setBearerToken(response.data.token)
      setSessionStatus('authenticated')
    } finally {
      setLoading(false)
    }
  }

  const retrySession = useCallback(async () => {
    const storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY)
    if (!storedToken) {
      clearSession()
      return
    }
    setToken(storedToken)
    await restoreSession(storedToken)
  }, [clearSession, restoreSession])

  const value = useMemo(() => ({ user, token, loading, sessionStatus, login: (input: Credentials) => authenticate('login', input), register: (input: Registration) => authenticate('register', input), resendVerification, googleLogin, logout, retrySession }), [user, token, loading, sessionStatus, retrySession])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export { getApiErrorMessage }
