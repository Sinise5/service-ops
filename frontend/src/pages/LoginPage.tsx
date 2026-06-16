import { createSignal, Show } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { useAuth } from "../stores/AuthStore"

export default function LoginPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [email, setEmail] = createSignal("")
  const [password, setPassword] = createSignal("")
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal("")

  const handleLogin = async (e: Event) => {
    e.preventDefault()
    setError("")
    if (!email() || !password()) {
      setError("Email and password required")
      return
    }
    setLoading(true)
    try {
      await auth?.login(email(), password())
      navigate("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center">
      <div class="w-full max-w-md">
        <div class="bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-8">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-blue-400">ServiceOps</h1>
            <p class="text-slate-400 text-sm mt-2">Asset Management & Monitoring</p>
          </div>

          <Show when={error()}>
            <div class="bg-red-900/50 border border-red-700 rounded p-3 mb-6 text-red-200 text-sm">
              {error()}
            </div>
          </Show>

          <form onSubmit={handleLogin} class="space-y-4">
            <div>
              <label class="block text-slate-300 text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="admin@example.com"
                required
              />
            </div>

            <div>
              <label class="block text-slate-300 text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading()}
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-medium py-2 rounded transition-colors"
            >
              {loading() ? "Logging in..." : "Login"}
            </button>
          </form>

          <p class="text-slate-400 text-xs text-center mt-6">
            Demo: admin@serviceops.local / admin123
          </p>
        </div>
      </div>
    </div>
  )
}
