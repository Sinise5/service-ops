import { createSignal, onMount, Show } from "solid-js"
import { useAuth } from "../stores/AuthStore"
import Layout from "../components/Layout"
import { api } from "../lib/api"

export default function DashboardPage() {
  const auth = useAuth()
  const [stats, setStats] = createSignal({ assets: 0, checks: 0, alerts: 0, incidents: 0 })
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal("")

  onMount(async () => {
    try {
      const [assetsRes, checksRes, alertsRes, incidentsRes] = await Promise.all([
        api.get<any[]>("/assets"),
        api.get<any[]>("/monitoring/checks"),
        api.get<any[]>("/alerts/rules"),
        api.get<any[]>("/incidents"),
      ])
      setStats({
        assets: assetsRes?.length || 0,
        checks: checksRes?.length || 0,
        alerts: alertsRes?.length || 0,
        incidents: incidentsRes?.length || 0,
      })
    } catch (err) {
      console.error("Failed to load dashboard:", err)
      setError(err instanceof Error ? err.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  })

  return (
    <Layout>
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 class="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
          <div class="text-slate-400 text-sm">
            Welcome back, <span class="text-blue-400">{auth?.user?.email}</span>
          </div>
        </div>

        <Show when={!loading()} fallback={<div class="text-slate-400">Loading...</div>}>
          <Show when={error()}>
            <div class="bg-red-900/50 border border-red-700 rounded p-3 mb-6 text-red-200 text-sm">
              {error()}
            </div>
          </Show>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5">
              <div class="text-slate-400 text-sm uppercase tracking-wide">Total Assets</div>
              <div class="text-3xl font-bold text-white mt-2">{stats().assets}</div>
              <div class="text-slate-500 text-xs mt-1">Registered in CMDB</div>
            </div>
            
            <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5">
              <div class="text-slate-400 text-sm uppercase tracking-wide">Healthy</div>
              <div class="text-3xl font-bold text-green-400 mt-2">{stats().assets}</div>
              <div class="text-slate-500 text-xs mt-1">All systems operational</div>
            </div>
            
            <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5">
              <div class="text-slate-400 text-sm uppercase tracking-wide">Active Checks</div>
              <div class="text-3xl font-bold text-blue-400 mt-2">{stats().checks}</div>
              <div class="text-slate-500 text-xs mt-1">Monitoring enabled</div>
            </div>
            
            <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5">
              <div class="text-slate-400 text-sm uppercase tracking-wide">Active Alerts</div>
              <div class="text-3xl font-bold text-red-400 mt-2">{stats().alerts}</div>
              <div class="text-slate-500 text-xs mt-1">Requires attention</div>
            </div>
          </div>
        </Show>

        <div class="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 class="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a href="/assets" class="p-4 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-center transition-colors">
              <div class="text-2xl mb-2">📦</div>
              <div class="text-sm text-slate-300">Add Asset</div>
            </a>
            <a href="/monitoring" class="p-4 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-center transition-colors">
              <div class="text-2xl mb-2">🔍</div>
              <div class="text-sm text-slate-300">Create Check</div>
            </a>
            <a href="/alerts" class="p-4 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-center transition-colors">
              <div class="text-2xl mb-2">🔔</div>
              <div class="text-sm text-slate-300">Configure Alerts</div>
            </a>
            <a href="/incidents" class="p-4 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-center transition-colors">
              <div class="text-2xl mb-2">🚨</div>
              <div class="text-sm text-slate-300">View Incidents</div>
            </a>
          </div>
        </div>
      </div>
    </Layout>
  )
}
