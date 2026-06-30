import { createSignal, onMount, For, Show } from "solid-js"
import { useAuth } from "../stores/AuthStore"
import Layout from "../components/Layout"
import { api } from "../lib/api"

export default function IncidentsPage() {
  const auth = useAuth()
  const [incidents, setIncidents] = createSignal([])
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal("")
  const [filter, setFilter] = createSignal("all")
  
  // Enhanced filters
  const [selectedSeverity, setSelectedSeverity] = createSignal<string>("")
  const [selectedStatus, setSelectedStatus] = createSignal<string>("")
  const [searchQuery, setSearchQuery] = createSignal("")
  
  // Filtered incidents
  const filteredIncidents = () => {
    let result = incidents()
    
    if (selectedSeverity()) {
      result = result.filter((i: any) => i.severity === selectedSeverity())
    }
    
    if (selectedStatus()) {
      result = result.filter((i: any) => i.status === selectedStatus())
    }
    
    if (searchQuery()) {
      const query = searchQuery().toLowerCase()
      result = result.filter((i: any) => 
        i.message?.toLowerCase().includes(query)
      )
    }
    
    return result
  }

  onMount(async () => {
    await loadIncidents()
  })

  const loadIncidents = async (status?: string) => {
    try {
      setLoading(true)
      setError("")
      const url = status ? `/incidents?status=${status}` : "/incidents"
      const data = await api.get<any[]>(url)
      setIncidents(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load incidents")
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter)
    loadIncidents(newFilter === "all" ? undefined : newFilter)
  }

  const handleAcknowledge = async (id: string) => {
    setError("")
    try {
      await api.post(`/incidents/${id}/acknowledge`, {})
      await loadIncidents()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to acknowledge incident")
    }
  }

  const handleResolve = async (id: string) => {
    try {
      const token = auth?.token()
      await fetch(`/alerts/incidents/${id}/resolve`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      })
      await loadIncidents()
    } catch (err) {
      console.error("Failed to resolve:", err)
    }
  }

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: "text-red-400 bg-red-900/20 border-red-800",
      warning: "text-yellow-400 bg-yellow-900/20 border-yellow-800",
      info: "text-blue-400 bg-blue-900/20 border-blue-800"
    }
    return colors[severity] || colors.info
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      open: "bg-red-600 text-white",
      acknowledged: "bg-yellow-600 text-white",
      resolved: "bg-green-600 text-white"
    }
    return badges[status] || badges.open
  }

  return (
    <Layout>
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 class="text-2xl sm:text-3xl font-bold text-white">Alert Incidents</h1>
          <div class="flex flex-wrap gap-1 sm:gap-2">
            <button
              onClick={() => handleFilterChange("all")}
              class={`px-4 py-2 rounded font-medium transition-colors ${filter() === "all" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange("open")}
              class={`px-4 py-2 rounded font-medium transition-colors ${filter() === "open" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Open
            </button>
            <button
              onClick={() => handleFilterChange("acknowledged")}
              class={`px-4 py-2 rounded font-medium transition-colors ${filter() === "acknowledged" ? "bg-yellow-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Acknowledged
            </button>
            <button
              onClick={() => handleFilterChange("resolved")}
              class={`px-4 py-2 rounded font-medium transition-colors ${filter() === "resolved" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Resolved
            </button>
          </div>
        </div>

        <Show when={error()}>
          <div class="bg-red-900/50 border border-red-700 rounded p-3 text-red-200 text-sm">
            {error()}
          </div>
        </Show>

        {/* Filter bar */}
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-3 sm:p-4">
          <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={selectedSeverity()}
              onChange={(e) => setSelectedSeverity(e.currentTarget.value)}
              class="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <select
              value={selectedStatus()}
              onChange={(e) => setSelectedStatus(e.currentTarget.value)}
              class="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div class="mt-2 text-xs text-slate-500">
            Showing {filteredIncidents().length} of {incidents().length} incidents
          </div>
        </div>

        <Show when={!loading()} fallback={<div class="text-slate-400">Loading incidents...</div>}>
          <div class="space-y-4">
            <For each={filteredIncidents()} fallback={
              <div class="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-400">
                No incidents found
              </div>
            }>
              {(incident) => (
                <div class={`bg-slate-900 border rounded-lg p-6 ${getSeverityColor(incident.severity)}`}>
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-2">
                        <span class={`px-3 py-1 rounded text-xs font-bold uppercase ${getStatusBadge(incident.status)}`}>
                          {incident.status}
                        </span>
                        <span class={`px-3 py-1 rounded text-xs font-bold uppercase ${getSeverityColor(incident.severity)}`}>
                          {incident.severity}
                        </span>
                      </div>
                      <p class="text-white font-medium mb-1">{incident.message}</p>
                      <p class="text-slate-400 text-sm">
                        Triggered: {new Date(incident.triggered_at).toLocaleString()}
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <Show when={incident.status === "open"}>
                        <button
                          onClick={() => handleAcknowledge(incident.id)}
                          class="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-medium transition-colors"
                        >
                          Acknowledge
                        </button>
                      </Show>
                      <Show when={incident.status !== "resolved"}>
                        <button
                          onClick={() => handleResolve(incident.id)}
                          class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                        >
                          Resolve
                        </button>
                      </Show>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </Layout>
  )
}
