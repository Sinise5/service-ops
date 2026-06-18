import { createSignal, onMount, For, Show } from "solid-js"
import { useAuth } from "../stores/AuthStore"
import Layout from "../components/Layout"
import { api } from "../lib/api"

export default function AlertsPage() {
  const auth = useAuth()
  const [alerts, setAlerts] = createSignal([])
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal("")
  const [showForm, setShowForm] = createSignal(false)
  
  // Filter state
  const [selectedSeverity, setSelectedSeverity] = createSignal<string>("")
  const [selectedStatus, setSelectedStatus] = createSignal<string>("")
  const [searchQuery, setSearchQuery] = createSignal("")
  
  // Filtered alerts
  const filteredAlerts = () => {
    let result = alerts()
    
    if (selectedSeverity()) {
      result = result.filter((a: any) => a.severity === selectedSeverity())
    }
    
    if (selectedStatus()) {
      const isEnabled = selectedStatus() === "enabled"
      result = result.filter((a: any) => a.enabled === isEnabled)
    }
    
    if (searchQuery()) {
      const query = searchQuery().toLowerCase()
      result = result.filter((a: any) => 
        a.name?.toLowerCase().includes(query)
      )
    }
    
    return result
  }
  
  const [formData, setFormData] = createSignal({
    name: "",
    check_id: "",
    condition: "threshold_exceeded",
    threshold: 80,
    conditions: [] as any[],
    logic: "AND",
    severity: "warning",
    enabled: true
  })

  const addCondition = () => {
    setFormData({
      ...formData(),
      conditions: [...formData().conditions, { field: "response_time_ms", operator: ">", value: 1000 }]
    })
  }

  const removeCondition = (idx: number) => {
    const c = [...formData().conditions]
    c.splice(idx, 1)
    setFormData({ ...formData(), conditions: c })
  }

  const updateCondition = (idx: number, field: string, value: any) => {
    const c = [...formData().conditions]
    c[idx] = { ...c[idx], [field]: value }
    setFormData({ ...formData(), conditions: c })
  }

  const toggleLogic = () => {
    setFormData({ ...formData(), logic: formData().logic === "AND" ? "OR" : "AND" })
  }

  onMount(async () => {
    try {
      const data = await api.get<any[]>("/alerts/rules")
      setAlerts(data || [])
    } catch (err) {
      console.error("Failed to load alerts:", err)
      setError(err instanceof Error ? err.message : "Failed to load alerts")
    } finally {
      setLoading(false)
    }
  })

  const handleUpdate = async (rule: any) => {
    const newName = prompt("New rule name:", rule.name)
    if (!newName) return
    try {
      await api.put(`/alerts/rules/${rule.id}`, { name: newName })
      const updated = await api.get<any[]>("/alerts/rules")
      setAlerts(updated || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update alert rule")
    }
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Delete this alert rule?")) return
    try {
      await api.delete(`/alerts/rules/${ruleId}`)
      const updated = await api.get<any[]>("/alerts/rules")
      setAlerts(updated || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete alert rule")
    }
  }

  const handleCreate = async (e: Event) => {
    e.preventDefault()
    const fd = formData()
    if (!fd.name) {
      setError("Alert name required")
      return
    }
    setError("")
    try {
      await api.post("/alerts/rules", fd)
      setShowForm(false)
      const updated = await api.get<any[]>("/alerts/rules")
      setAlerts(updated || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create alert rule")
    }
  }

  return (
    <Layout>
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold text-white">Alert Rules</h1>
          <button
            onClick={() => setShowForm(!showForm())}
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
          >
            {showForm() ? "Cancel" : "+ Add Alert Rule"}
          </button>
        </div>

        <Show when={error()}>
          <div class="bg-red-900/50 border border-red-700 rounded p-3 text-red-200 text-sm">
            {error()}
          </div>
        </Show>

        {/* Filter bar */}
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div class="flex gap-4">
            <input
              type="text"
              placeholder="Search alert rules..."
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
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div class="mt-2 text-xs text-slate-500">
            Showing {filteredAlerts().length} of {alerts().length} alert rules
          </div>
        </div>

        <Show when={showForm()}>
          <form onSubmit={handleCreate} class="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <input
              type="text"
              placeholder="Alert Name"
              value={formData().name}
              onInput={(e) => setFormData({ ...formData(), name: e.currentTarget.value })}
              class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
            <select
              value={formData().condition}
              onInput={(e) => setFormData({ ...formData(), condition: e.currentTarget.value })}
              class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="threshold_exceeded">Threshold Exceeded</option>
              <option value="check_failed">Check Failed</option>
              <option value="ssl_expiring">SSL Certificate Expiring</option>
            </select>
            <input
              type="number"
              placeholder="Threshold Value"
              value={formData().threshold}
              onInput={(e) => setFormData({ ...formData(), threshold: parseInt(e.currentTarget.value) })}
              class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={formData().severity}
              onInput={(e) => setFormData({ ...formData(), severity: e.currentTarget.value })}
              class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>

            {/* Advanced Conditions Builder */}
            <div class="border border-slate-700 rounded p-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-slate-300">Conditions</span>
                <div class="flex items-center gap-2">
                  <button type="button" onClick={toggleLogic}
                    class={`px-3 py-1 rounded text-xs font-medium transition-colors ${formData().logic === "AND" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"}`}>
                    AND
                  </button>
                  <span class="text-slate-500 text-xs">or</span>
                  <button type="button" onClick={toggleLogic}
                    class={`px-3 py-1 rounded text-xs font-medium transition-colors ${formData().logic === "OR" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"}`}>
                    OR
                  </button>
                  <button type="button" onClick={addCondition}
                    class="px-2 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs">+ Add</button>
                </div>
              </div>
              <Show when={formData().conditions.length === 0}>
                <div class="text-slate-500 text-xs py-2">No custom conditions. Using single condition mode.</div>
              </Show>
              <For each={formData().conditions}>
                {(cond: any, idx: any) => (
                  <div class="flex items-center gap-2 py-1">
                    <select value={cond.field} onChange={(e) => updateCondition(idx(), "field", e.currentTarget.value)}
                      class="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs">
                      <option value="response_time_ms">Response Time</option>
                      <option value="status">Status</option>
                      <option value="output">Output</option>
                    </select>
                    <select value={cond.operator} onChange={(e) => updateCondition(idx(), "operator", e.currentTarget.value)}
                      class="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs">
                      <option value=">">&gt;</option><option value="<">&lt;</option>
                      <option value="==">==</option><option value="!=">!=</option>
                    </select>
                    <input type={cond.field === "status" ? "text" : "number"} value={cond.value}
                      onInput={(e) => updateCondition(idx(), "value", cond.field === "status" ? e.currentTarget.value : Number(e.currentTarget.value))}
                      class="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs" />
                    <button type="button" onClick={() => removeCondition(idx())}
                      class="px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-xs">✕</button>
                  </div>
                )}
              </For>
            </div>

            <button
              type="submit"
              class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
            >
              Create Alert Rule
            </button>
          </form>
        </Show>

        <div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <Show when={!loading()} fallback={<div class="p-6 text-slate-400">Loading...</div>}>
            <Show when={alerts().length === 0}>
              <div class="p-6 text-slate-400">No alert rules configured yet</div>
            </Show>
            <Show when={alerts().length > 0}>
              <table class="w-full">
                <thead class="bg-slate-800">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Name</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Condition</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Severity</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Threshold</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800">
                  <For each={filteredAlerts()} fallback={
                    <tr>
                      <td colspan="6" class="px-6 py-8 text-center text-slate-400 text-sm">
                        No alert rules found
                      </td>
                    </tr>
                  }>
                    {(rule) => (
                      <tr class="hover:bg-slate-800/50">
                        <td class="px-6 py-4 text-sm text-white">{rule.name}</td>
                        <td class="px-6 py-4 text-sm text-slate-300">{rule.condition}</td>
                        <td class="px-6 py-4 text-sm">
                          <span class={`px-2 py-1 rounded text-xs font-medium ${
                            rule.severity === 'critical' ? 'bg-red-900/50 text-red-200' :
                            rule.severity === 'warning' ? 'bg-yellow-900/50 text-yellow-200' :
                            'bg-blue-900/50 text-blue-200'
                          }`}>
                            {rule.severity}
                          </span>
                        </td>
                        <td class="px-6 py-4 text-sm text-slate-300">{rule.threshold || '-'}</td>
                        <td class="px-6 py-4 text-sm">
                          <span class={`px-2 py-1 rounded text-xs font-medium ${
                            rule.enabled ? 'bg-green-900/50 text-green-200' : 'bg-gray-900/50 text-gray-400'
                          }`}>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td class="px-6 py-4 text-sm text-right space-x-2">
                          <button
                            onClick={() => handleUpdate(rule)}
                            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </Show>
          </Show>
        </div>
      </div>
    </Layout>
  )
}
