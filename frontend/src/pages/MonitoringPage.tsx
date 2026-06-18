import { createSignal, onMount, For, Show } from "solid-js"
import { useAuth } from "../stores/AuthStore"
import Layout from "../components/Layout"
import { api } from "../lib/api"

export default function MonitoringPage() {
  const auth = useAuth()
  const [checks, setChecks] = createSignal([])
  const [assets, setAssets] = createSignal([])
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal("")
  const [showForm, setShowForm] = createSignal(false)
  
  // Filter state
  const [selectedAsset, setSelectedAsset] = createSignal<string>("")
  const [selectedStatus, setSelectedStatus] = createSignal<string>("")
  const [searchQuery, setSearchQuery] = createSignal("")
  
  // Filtered checks
  const filteredChecks = () => {
    let result = checks()
    
    if (selectedAsset()) {
      result = result.filter((c: any) => c.asset_id === selectedAsset())
    }
    
    if (selectedStatus()) {
      const passing = selectedStatus() === "passing"
      result = result.filter((c: any) => c.last_status === (passing ? "success" : "failure"))
    }
    
    if (searchQuery()) {
      const query = searchQuery().toLowerCase()
      result = result.filter((c: any) => 
        c.name?.toLowerCase().includes(query)
      )
    }
    
    return result
  }
  
  const [formData, setFormData] = createSignal({
    asset_id: "",
    check_type: "http",
    name: "",
    config: { url: "", method: "GET", expected_status: 200 },
    interval_seconds: 300,
    enabled: true
  })

  onMount(async () => {
    try {
      const [assetsData, checksData] = await Promise.all([
        api.get<any[]>("/assets"),
        api.get<any[]>("/monitoring/checks")
      ])
      setAssets(assetsData || [])
      setChecks(checksData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load monitoring data")
    } finally {
      setLoading(false)
    }
  })

  const handleCreate = async (e: Event) => {
    e.preventDefault()
    const fd = formData()
    if (!fd.name || !fd.asset_id) {
      setError("Name and asset required")
      return
    }
    setError("")
    try {
      await api.post("/monitoring/checks", fd)
      setShowForm(false)
      setFormData({
        asset_id: "",
        check_type: "http",
        name: "",
        config: { url: "", method: "GET", expected_status: 200 },
        interval_seconds: 300,
        enabled: true
      })
      const checksData = await api.get<any[]>("/monitoring/checks")
      setChecks(checksData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create check")
    }
  }

  const handleUpdate = async (check: any) => {
    const newName = prompt("New check name:", check.name)
    if (!newName) return
    try {
      await api.put(`/monitoring/checks/${check.id}`, { name: newName })
      const checksData = await api.get<any[]>("/monitoring/checks")
      setChecks(checksData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update check")
    }
  }

  const handleDelete = async (checkId: string) => {
    if (!confirm("Delete this monitoring check?")) return
    try {
      await api.delete(`/monitoring/checks/${checkId}`)
      const checksData = await api.get<any[]>("/monitoring/checks")
      setChecks(checksData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete check")
    }
  }

  const [execResult, setExecResult] = createSignal<any>(null)
  const [execLoading, setExecLoading] = createSignal(false)

  const handleExecute = async (checkId: string) => {
    setExecLoading(true)
    setExecResult(null)
    try {
      const result = await api.post(`/monitoring/checks/${checkId}/execute`, {})
      setExecResult(result)
      setTimeout(() => setExecResult(null), 5000) // Auto hide after 5s
    } catch (err) {
      setExecResult({ error: err instanceof Error ? err.message : "Execute failed" })
    } finally {
      setExecLoading(false)
    }
  }

  return (
    <Layout>
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold text-white">Monitoring Checks</h1>
          <button
            onClick={() => setShowForm(!showForm())}
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
          >
            {showForm() ? "Cancel" : "+ Add Check"}
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
              placeholder="Search checks..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={selectedAsset()}
              onChange={(e) => setSelectedAsset(e.currentTarget.value)}
              class="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Assets</option>
              <For each={assets()}>
                {(asset: any) => <option value={asset.id}>{asset.name}</option>}
              </For>
            </select>
            <select
              value={selectedStatus()}
              onChange={(e) => setSelectedStatus(e.currentTarget.value)}
              class="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="passing">Passing</option>
              <option value="failing">Failing</option>
            </select>
          </div>
          <div class="mt-2 text-xs text-slate-500">
            Showing {filteredChecks().length} of {checks().length} checks
          </div>
        </div>

        <Show when={showForm()}>
          <form onSubmit={handleCreate} class="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <div>
              <label class="block text-slate-300 text-sm font-medium mb-2">Asset</label>
              <select
                value={formData().asset_id}
                onInput={(e) => setFormData({ ...formData(), asset_id: e.currentTarget.value })}
                class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Select Asset</option>
                <For each={assets()}>
                  {(asset: any) => <option value={asset.id}>{asset.name}</option>}
                </For>
              </select>
            </div>

            <div>
              <label class="block text-slate-300 text-sm font-medium mb-2">Check Type</label>
              <select
                value={formData().check_type}
                onInput={(e) => setFormData({ ...formData(), check_type: e.currentTarget.value })}
                class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="http">HTTP</option>
                <option value="ping">Ping</option>
                <option value="ssl">SSL Certificate</option>
              </select>
            </div>

            <div>
              <label class="block text-slate-300 text-sm font-medium mb-2">Check Name</label>
              <input
                type="text"
                placeholder="e.g., API Health Check"
                value={formData().name}
                onInput={(e) => setFormData({ ...formData(), name: e.currentTarget.value })}
                class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <Show when={formData().check_type === "http"}>
              <div>
                <label class="block text-slate-300 text-sm font-medium mb-2">URL</label>
                <input
                  type="url"
                  placeholder="https://api.example.com/health"
                  value={formData().config.url}
                  onInput={(e) => setFormData({ ...formData(), config: { ...formData().config, url: e.currentTarget.value } })}
                  class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </Show>

            <Show when={formData().check_type === "ping"}>
              <div>
                <label class="block text-slate-300 text-sm font-medium mb-2">Host</label>
                <input
                  type="text"
                  placeholder="8.8.8.8 or example.com"
                  value={formData().config.host || ""}
                  onInput={(e) => setFormData({ ...formData(), config: { host: e.currentTarget.value } })}
                  class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </Show>

            <div>
              <label class="block text-slate-300 text-sm font-medium mb-2">Interval (seconds)</label>
              <input
                type="number"
                value={formData().interval_seconds}
                onInput={(e) => setFormData({ ...formData(), interval_seconds: parseInt(e.currentTarget.value) })}
                class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                min="60"
                required
              />
            </div>

            <button
              type="submit"
              class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
            >
              Create Check
            </button>
          </form>
        </Show>

        <div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <Show when={!loading()} fallback={<div class="p-6 text-slate-400">Loading...</div>}>
            <Show when={checks().length === 0}>
              <div class="p-6 text-slate-400">No monitoring checks yet. Add one to get started!</div>
            </Show>
            <Show when={checks().length > 0}>
              <table class="w-full">
                <thead class="bg-slate-800">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Name</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Type</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Interval</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800">
                  <For each={filteredChecks()} fallback={
                    <tr>
                      <td colspan="6" class="px-6 py-8 text-center text-slate-400 text-sm">
                        No checks found
                      </td>
                    </tr>
                  }>
                    {(check: any) => (
                      <tr class="hover:bg-slate-800/50">
                        <td class="px-6 py-4 text-sm text-white">{check.name}</td>
                        <td class="px-6 py-4 text-sm text-slate-300">{check.check_type}</td>
                        <td class="px-6 py-4 text-sm text-slate-300">{check.interval_seconds}s</td>
                        <td class="px-6 py-4 text-sm">
                          <span class={`px-2 py-1 rounded text-xs font-medium ${
                            check.enabled ? 'bg-green-900/50 text-green-200' : 'bg-gray-900/50 text-gray-400'
                          }`}>
                            {check.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td class="px-6 py-4 text-sm text-right space-x-2">
                          <button
                            onClick={() => handleExecute(check.id)}
                            disabled={execLoading()}
                            class="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
                          >
                            {execLoading() ? "Running..." : "Execute Now"}
                          </button>
                          <button
                            onClick={() => handleUpdate(check)}
                            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(check.id)}
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

      <Show when={execResult()}>
        <div class={`fixed bottom-4 right-4 p-4 rounded-lg text-white ${
          execResult()?.error ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {execResult()?.error ? (
            <div>❌ {execResult().error}</div>
          ) : (
            <div>
              ✅ Status: {execResult()?.status}<br/>
              Response: {execResult()?.response_time_ms}ms
            </div>
          )}
        </div>
      </Show>
    </Layout>
  )
}
