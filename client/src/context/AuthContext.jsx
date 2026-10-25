import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getCurrentUser, loginAccount, registerAccount } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('indiehub_token')
    if (!token) {
      setLoading(false)
      return
    }
    getCurrentUser()
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem('indiehub_token'))
      .finally(() => setLoading(false))
  }, [])

  async function authenticate(action, payload) {
    const response = await action(payload)
    localStorage.setItem('indiehub_token', response.data.token)
    setUser(response.data.user)
    return response
  }

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login: (payload) => authenticate(loginAccount, payload),
    register: (payload) => authenticate(registerAccount, payload),
    logout: () => {
      localStorage.removeItem('indiehub_token')
      setUser(null)
    },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
