
import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, completeMagicLinkSignIn, logout } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      await completeMagicLinkSignIn().catch(() => {})
    })()
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return <AuthCtx.Provider value={{ user, loading, logout }}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  return useContext(AuthCtx)
}
