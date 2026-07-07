import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('asterUser')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  function login(userInfo) {
    localStorage.setItem('asterUser', JSON.stringify(userInfo))
    setUser(userInfo)
  }

  function logout() {
    localStorage.removeItem('asterUser')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
