import { createSignal, onMount, For, Show } from 'solid-js'
import { TrendingUp, AlertCircle, CheckCircle, BarChart3, Calendar } from 'lucide-solid'
import { api } from '../lib/api'
import Layout from "../components/Layout"

interface SLATarget {
  id: string
  asset_id: string
  asset_name: string
  target_uptime: number
  current_uptime: number
  incidents_count: number
  downtime_minutes: number
  period_start: string
  period_end: string
}

interface UptimeSummary {
  asset_id: string
  asset_name: string
  uptime_percentage: number
  downtime_minutes: number
  status: 'healthy' | 'warning' | 'critical'
}

export default function SLAPage() {
  const [targets, setTargets] = createSignal<SLATarget[]>([])
  const [summary, setSummary] = createSignal<UptimeSummary[]>([])
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal("")
  const [period, setPeriod] = createSignal('month')

  const loadTargets = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await api.get<SLATarget[]>("/sla/targets")
      setTargets(data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load SLA targets")
    } finally {
      setLoading(false)
    }
  }

  const loadUptime = async () => {
    try {
      const data = await api.get<UptimeSummary[]>("/sla/uptime/assets")
      setSummary(data || [])
    } catch (e) {
      console.error("Failed to load uptime summary:", e)
    }
  }

  const getStatusColor = (uptime: number) => {
    if (uptime >= 99.5) return 'bg-green-900/20 text-green-400 border-green-700'
    if (uptime >= 95) return 'bg-yellow-900/20 text-yellow-400 border-yellow-700'
    return 'bg-red-900/20 text-red-400 border-red-700'
  }

  const getStatusIcon = (uptime: number) => {
    if (uptime >= 99.5) return <CheckCircle class="w-5 h-5" />
    return <AlertCircle class="w-5 h-5" />
  }

  onMount(() => {
    loadTargets()
    loadUptime()
  })

  return (
    <Layout>
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-slate-100">SLA Reports</h1>
          <div class="flex gap-2">
            <button onClick={() => setPeriod('week')} class={`px-3 py-1 rounded ${period() === 'week' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Week</button>
            <button onClick={() => setPeriod('month')} class={`px-3 py-1 rounded ${period() === 'month' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Month</button>
            <button onClick={() => setPeriod('quarter')} class={`px-3 py-1 rounded ${period() === 'quarter' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Quarter</button>
            <button onClick={() => setPeriod('year')} class={`px-3 py-1 rounded ${period() === 'year' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Year</button>
          </div>
        </div>

        <Show when={error()}>
          <div class="bg-red-900/50 border border-red-700 rounded p-3 text-red-200 text-sm">
            {error()}
          </div>
        </Show>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-2">
            <TrendingUp class="w-5 h-5 text-green-400" />
            <h3 class="text-sm font-medium text-slate-400">Avg Uptime</h3>
          </div>
          <p class="text-3xl font-bold text-slate-100">
            {summary().length > 0 ? (summary().reduce((acc, s) => acc + s.uptime_percentage, 0) / summary().length).toFixed(2) : '0.00'}%
          </p>
        </div>

        <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-2">
            <CheckCircle class="w-5 h-5 text-blue-400" />
            <h3 class="text-sm font-medium text-slate-400">Targets Met</h3>
          </div>
          <p class="text-3xl font-bold text-slate-100">
            {targets().filter(t => t.current_uptime >= t.target_uptime).length} / {targets().length}
          </p>
        </div>

        <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-2">
            <AlertCircle class="w-5 h-5 text-red-400" />
            <h3 class="text-sm font-medium text-slate-400">At Risk</h3>
          </div>
          <p class="text-3xl font-bold text-slate-100">
            {targets().filter(t => t.current_uptime < t.target_uptime).length}
          </p>
        </div>
        </div>

        <div class="bg-slate-900/50 border border-slate-800 rounded-lg">
          <div class="p-4 border-b border-slate-800">
            <h2 class="text-lg font-semibold text-slate-100">Asset Uptime Status</h2>
          </div>
          <div class="divide-y divide-slate-800">
            <For each={summary()}>
              {(item) => (
                <div class="p-4 hover:bg-slate-800/50 transition-colors">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      {getStatusIcon(item.uptime_percentage)}
                      <div>
                        <h3 class="font-medium text-slate-100">{item.asset_name}</h3>
                        <p class="text-sm text-slate-400">Downtime: {item.downtime_minutes} minutes</p>
                      </div>
                    </div>
                    <div class={`px-3 py-1 rounded border ${getStatusColor(item.uptime_percentage)}`}>
                      {item.uptime_percentage.toFixed(2)}%
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </Layout>
  )
}