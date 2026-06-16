import { createContext, useContext, createSignal, createEffect } from "solid-js"
import type { ParentProps } from "solid-js"

interface AuthUser {
  id: string
  email: string
  username: string
  role?: string
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: () => boolean
}

const AuthContext = createContext<AuthContextType>()

export function AuthProvider(props: ParentProps) {
  const [user, setUser] = createSignal<AuthUser | null>(null)
  const [token, setToken] = createSignal<string | null>(localStorage.getItem("auth_token"))

  const isAuthenticated = () => !!token()

  const login = async (email: string, password: string) => {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error("Login failed")
    const data = await res.json()
    const t = data.access_token
    setToken(t)
    localStorage.setItem("auth_token", t)
    try {
      const me = await fetch("/auth/me", { headers: { Authorization: `Bearer ${t}` } })
      if (me.ok) setUser(await me.json())
    } catch { setUser({ id: "0", email, username: email }) }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem("auth_token")
    window.location.href = "/login"
  }

  createEffect(() => {
    const stored = token()
    if (stored && !user()) {
      fetch("/auth/me", { headers: { Authorization: `Bearer ${stored}` } })
        .then(r => r.ok ? r.json() : null)
        .then(u => u && setUser(u))
        .catch(() => {})
    }
  })

  const authValue = {
    get user() { return user() },
    get token() { return token() },
    login,
    logout,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={authValue}>
      {props.children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
