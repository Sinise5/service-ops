import { A } from "@solidjs/router"
import { useAuth } from "../stores/AuthStore"
import type { ParentProps } from "solid-js"

export default function Layout(props: ParentProps) {
  const auth = useAuth()

  const handleLogout = () => {
    auth?.logout()
    window.location.href = "/login"
  }

  return (
    <div class="min-h-screen bg-slate-950">
      <nav class="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-8">
            <A href="/dashboard" class="text-lg font-bold text-blue-400 flex items-center gap-2">
              <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              ServiceOps
            </A>
            
            <div class="flex gap-6">
              <A href="/dashboard" class="text-slate-300 hover:text-blue-400 transition-colors">
                Dashboard
              </A>
              <A href="/assets" class="text-slate-300 hover:text-blue-400 transition-colors">
                Assets
              </A>
              <A href="/monitoring" class="text-slate-300 hover:text-blue-400 transition-colors">
                Monitoring
              </A>
              <A href="/alerts" class="text-slate-300 hover:text-blue-400 transition-colors">
                Alerts
              </A>
              <A href="/incidents" class="text-slate-300 hover:text-blue-400 transition-colors">
                Incidents
              </A>
              <A href="/notifications" class="text-slate-300 hover:text-blue-400 transition-colors">
                Notifications
              </A>
              <A href="/sla" class="text-slate-300 hover:text-blue-400 transition-colors">
                SLA
              </A>
              <A href="/topology" class="text-slate-300 hover:text-blue-400 transition-colors">
                Topology
              </A>
              <A href="/logs" class="text-slate-300 hover:text-blue-400 transition-colors">
                Logs
              </A>
              <A href="/settings" class="text-slate-300 hover:text-blue-400 transition-colors">
                Settings
              </A>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <span class="text-sm text-slate-400">
              {auth?.user?.email || "User"}
            </span>
            <button
              onClick={handleLogout}
              class="px-3 py-1 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main class="max-w-7xl mx-auto px-4 py-6">
        {props.children}
      </main>
    </div>
  )
}
