import { createSignal, onMount, For, Show } from "solid-js"
import { useAuth } from "../stores/AuthStore"
import Layout from "../components/Layout"
import { api } from "../lib/api"

interface LogEntry {
  id: string
  level: string
  message: string
  source?: string
  tags?: string[]
  timestamp: string
}

export default function LogsPage() {
  const auth = useAuth()
  const [logs, setLogs] = createSignal<LogEntry[]>([])
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal("")
  const [search, setSearch] = createSignal("")
  const [selectedLevel, setSelectedLevel] = createSignal<string | null>(null)
  const [autoRefresh, setAutoRefresh] = createSignal(false)
  const [stats, setStats] = createSignal<Record<string, number>>({})
  
  // Filter state
  const [selectedSource, setSelectedSource] = createSignal<string>("")
  
  // Filtered logs
  const filteredLogs = () => {
    let result = logs()
    
    if (selectedLevel()) {
      result = result.filter((l: any) => l.level === selectedLevel())
    }
    
    if (selectedSource()) {
      result = result.filter((l: any) => l.source === selectedSource())
    }
    
    if (search()) {
      const query = search().toLowerCase()
      result = result.filter((l: any) => 
        l.message?.toLowerCase().includes(query)
      )
    }
    
    return result
  }

  let refreshInterval: number | undefined

  onMount(async () => {
    await loadLogs()
    await loadStats()
  })

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError("")
      const body = {
        search: search() || undefined,
        level: selectedLevel() || undefined,
        limit: 100
      }
      const data = await api.post<LogEntry[]>("/logs/search", body)
      setLogs(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs")
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await api.get<Record<string, number>>("/logs/stats")
      setStats(data || {})
    } catch (err) {
      console.error("Failed to load stats:", err)
    }
  }

  const getLevelColor = (level: string) => {
    const colors = {
      debug: "text-slate-400 bg-slate-900/50",
      info: "text-blue-400 bg-blue-900/20",
      warning: "text-yellow-400 bg-yellow-900/20",
      error: "text-red-400 bg-red-900/20",
      critical: "text-red-500 bg-red-900/50 font-bold"
    }
    return colors[level.toLowerCase()] || colors.info
  }

  const toggleAutoRefresh = () => {
    const newState = !autoRefresh()
    setAutoRefresh(newState)
    if (newState) {
      refreshInterval = setInterval(() => loadLogs(), 5000)
    } else if (refreshInterval) {
      clearInterval(refreshInterval)
    }
  }

  return (
    <Layout>
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold text-white">Logs</h1>
          <div class="flex gap-2">
            <button
              onClick={toggleAutoRefresh}
              class={`px-4 py-2 rounded font-medium transition-colors ${autoRefresh() ? "bg-green-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              {autoRefresh() ? "Live ✓" : "Live Mode"}
            </button>
            <button
              onClick={() => loadLogs()}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        <Show when={error()}>
          <div class="bg-red-900/50 border border-red-700 rounded p-3 text-red-200 text-sm">
            {error()}
          </div>
        </Show>

        <div class="grid grid-cols-5 gap-4">
          <For each={Object.entries(stats())}>
            {([level, count]) => (
              <div class="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <p class="text-sm text-slate-400 uppercase">{level}</p>
                <p class="text-2xl font-bold text-white">{count}</p>
              </div>
            )}
          </For>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
          <div class="flex gap-4">
            <input
              type="text"
              placeholder="Search logs..."
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
              onKeyPress={(e) => e.key === "Enter" && loadLogs()}
              class="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={selectedLevel() || ""}
              onChange={(e) => {
                setSelectedLevel(e.currentTarget.value || null)
                loadLogs()
              }}
              class="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={selectedSource()}
              onChange={(e) => setSelectedSource(e.currentTarget.value)}
              class="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Sources</option>
              <option value="system">System</option>
              <option value="api">API</option>
              <option value="database">Database</option>
              <option value="monitoring">Monitoring</option>
              <option value="notification">Notification</option>
              <option value="auth">Auth</option>
              <option value="alert">Alert</option>
              <option value="cache">Cache</option>
            </select>
            <button
              onClick={() => loadLogs()}
              class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
            >
              Search
            </button>
          </div>
          <div class="text-xs text-slate-500">
            Showing {filteredLogs().length} of {logs().length} logs
          </div>
        </div>

        <Show when={!loading()} fallback={<div class="text-slate-400">Loading logs...</div>}>
          <div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Time</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Level</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Source</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Message</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800">
                  <For each={filteredLogs()} fallback={
                    <tr>
                      <td colspan="4" class="px-4 py-8 text-center text-slate-400">No logs found</td>
                    </tr>
                  }>
                    {(log) => (
                      <tr class="hover:bg-slate-800/50 transition-colors">
                        <td class="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td class="px-4 py-3">
                          <span class={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-sm text-slate-400">{log.source || "-"}</td>
                        <td class="px-4 py-3 text-sm text-white">{log.message}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>
      </div>
    </Layout>
  )
}
