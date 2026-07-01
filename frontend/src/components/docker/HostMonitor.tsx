import { createSignal, createEffect, Show, For } from "solid-js"
import { dockerApi } from "../../api/docker-api"

interface Props {
  hostId: string
  hostName?: string
  onAlertCount?: (count: number) => void
}

interface AlertRule {
  id: string
  name: string
  metric: string
  operator: string
  threshold: number
  duration_minutes: number
  cooldown_minutes: number
  severity: string
  enabled: boolean
  channels?: any[]
}

const METRICS = [
  { value: "cpu_percent", label: "CPU %" },
  { value: "memory_percent", label: "Memory %" },
  { value: "disk_used_percent", label: "Storage %" },
  { value: "disk_inode_percent", label: "Inode %" },
]

const OPERATORS = [
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
]

const BASE = "http://localhost:9080"

export default function HostMonitor(props: Props) {
  const [data, setData] = createSignal<any>(null)
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal("")
  const [alertRules, setAlertRules] = createSignal<AlertRule[]>([])
  const [loadingAlert, setLoadingAlert] = createSignal(false)
  const [showAddForm, setShowAddForm] = createSignal(false)
  const [toast, setToast] = createSignal<{ msg: string; ok: boolean } | null>(null)
  const [form, setForm] = createSignal({
    name: "", metric: "cpu_percent", operator: "gt",
    threshold: 80, duration_minutes: 5, cooldown_minutes: 10, enabled: true,
  })

  let toastTimer: any

  const showToast = (msg: string, ok = true) => {
    clearTimeout(toastTimer)
    setToast({ msg, ok })
    toastTimer = setTimeout(() => setToast(null), 3000)
  }

  const fetchMonitor = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await dockerApi.monitorHost(props.hostId)
      setData(res)
    } catch (e: any) {
      setError(e.message || "Failed to load monitor data")
    } finally {
      setLoading(false)
    }
  }

  const fetchAlertRules = async () => {
    if (!props.hostId) return
    setLoadingAlert(true)
    try {
      const res = await fetch(`${BASE}/hosts/${props.hostId}/alerts/rules`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      const rules = Array.isArray(d) ? d : []
      setAlertRules(rules)
      props.onAlertCount?.(rules.filter((r: AlertRule) => r.enabled).length)
    } catch (e: any) {
      console.error("[AlertRules] fetch:", e)
    } finally {
      setLoadingAlert(false)
    }
  }

  createEffect(() => {
    if (props.hostId) {
      fetchMonitor()
      fetchAlertRules()
    }
  })

  const addRule = async () => {
    const f = form()
    if (!f.name.trim()) { showToast("Name required", false); return }
    try {
      const res = await fetch(`${BASE}/hosts/${props.hostId}/alerts/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, host_id: props.hostId, channel_ids: [] }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setShowAddForm(false)
      setForm({ name: "", metric: "cpu_percent", operator: "gt",
        threshold: 80, duration_minutes: 5, cooldown_minutes: 10, enabled: true })
      showToast("Rule added ✅")
      await fetchAlertRules()
    } catch (e: any) {
      showToast(`Error: ${e.message}`, false)
    }
  }

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const res = await fetch(`${BASE}/hosts/${props.hostId}/alerts/rules/${ruleId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      showToast(enabled ? "Rule disabled" : "Rule enabled")
      await fetchAlertRules()
    } catch (e: any) {
      showToast(`Error: ${e.message}`, false)
    }
  }

  const deleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`${BASE}/hosts/${props.hostId}/alerts/rules/${ruleId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      showToast("Rule deleted")
      await fetchAlertRules()
    } catch (e: any) {
      showToast(`Error: ${e.message}`, false)
    }
  }

  const metricLabel = (m: string) => METRICS.find((x) => x.value === m)?.label || m
  const severityColor = (s: string) =>
    s === "critical" ? "bg-red-900 text-red-300" :
    s === "warning" ? "bg-yellow-900 text-yellow-300" :
    "bg-blue-900 text-blue-300"

  return (
    <div class="space-y-4">
      {/* Toast */}
      <Show when={toast()}>
        <div
          class={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm shadow-lg transition-opacity ${
            toast()!.ok ? "bg-green-800 text-green-200" : "bg-red-800 text-red-200"
          }`}
        >
          {toast()!.msg}
        </div>
      </Show>

      {/* Monitor Data */}
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-100">
          {props.hostName || "Host"} — Monitor
        </h3>
        <button
          onClick={fetchMonitor}
          disabled={loading()}
          class={`px-3 py-1 text-sm rounded transition ${
            loading()
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500"
          } text-white`}
        >
          {loading() ? "..." : "⟳ Refresh"}
        </button>
      </div>

      <Show when={error()}>
        <div class="p-3 bg-red-900/40 border border-red-700 rounded text-red-300 text-sm">{error()}</div>
      </Show>

      <Show when={!loading() && data()}>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* cards same as before */}
          <div class="p-3 bg-gray-800/60 rounded border border-gray-700">
            <div class="text-xs text-gray-400 uppercase mb-1">Uptime</div>
            <div class="text-sm text-gray-100">{(data()?.echo__UPTIME__ || "").replace(/[^\S\n]*\n/, "").trim()}</div>
          </div>
          <div class="p-3 bg-gray-800/60 rounded border border-gray-700">
            <div class="text-xs text-gray-400 uppercase mb-1">CPU</div>
            <div class="text-sm text-gray-100">{(data()?.echo__NPROC__ || "").trim()} cores</div>
            <div class="text-xs text-gray-500">Load: {(data()?.echo__LOADAVG__ || "").trim()}</div>
          </div>
          <div class="p-3 bg-gray-800/60 rounded border border-gray-700">
            <div class="text-xs text-gray-400 uppercase mb-1">Memory</div>
            <div class="text-sm text-gray-100">{(data()?.["free -h 2>/dev/null"]?.stdout || "").split("\n").find((l: string) => l.startsWith("Mem:"))?.trim() || "N/A"}</div>
          </div>
          <div class="p-3 bg-gray-800/60 rounded border border-gray-700">
            <div class="text-xs text-gray-400 uppercase mb-1">Storage</div>
            <div class="text-sm text-gray-100">{(data()?.["df -h --total 2>/dev/null | tail -1"]?.stdout || "").trim().split(/\s+/).slice(1,3).join(" / ") || "N/A"}</div>
          </div>
        </div>
      </Show>

      <Show when={loading() && !data()}>
        <div class="text-center text-gray-500 py-8">Loading monitor data...</div>
      </Show>

      {/* ════ ALERT THRESHOLDS ════ */}
      <div class="border-t border-gray-700 pt-4 mt-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium text-gray-300">
            Alert Thresholds
            <Show when={alertRules().length > 0}>
              <span class="ml-2 px-1.5 py-0.5 text-xs rounded bg-blue-900 text-blue-300">{alertRules().length}</span>
            </Show>
          </h4>
          <button
            onClick={() => setShowAddForm(!showAddForm())}
            class={`px-3 py-1 text-xs rounded transition ${
              showAddForm()
                ? "bg-gray-600 hover:bg-gray-500"
                : "bg-green-700 hover:bg-green-600"
            } text-white`}
          >
            {showAddForm() ? "✕ Cancel" : "+ Add Rule"}
          </button>
        </div>

        {/* Add Form */}
        <Show when={showAddForm()}>
          <div class="p-4 mb-3 bg-gray-800 rounded border border-gray-600 space-y-3">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="md:col-span-2">
                <label class="text-xs text-gray-400 mb-1 block">Rule Name</label>
                <input
                  type="text" value={form().name}
                  onInput={(e) => setForm({ ...form(), name: e.currentTarget.value })}
                  placeholder="e.g. CPU High Alert"
                  class="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200 placeholder-gray-500"
                />
              </div>
              <div>
                <label class="text-xs text-gray-400 mb-1 block">Metric</label>
                <select
                  value={form().metric}
                  onChange={(e) => setForm({ ...form(), metric: e.currentTarget.value })}
                  class="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200"
                >
                  <For each={METRICS}>{(m) => <option value={m.value}>{m.label}</option>}</For>
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-400 mb-1 block">Condition</label>
                <select
                  value={form().operator}
                  onChange={(e) => setForm({ ...form(), operator: e.currentTarget.value })}
                  class="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200"
                >
                  <For each={OPERATORS}>{(o) => <option value={o.value}>{o.label}</option>}</For>
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-400 mb-1 block">Threshold (%)</label>
                <input
                  type="number" value={form().threshold}
                  onInput={(e) => setForm({ ...form(), threshold: +e.currentTarget.value })}
                  class="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200"
                />
              </div>
              <div>
                <label class="text-xs text-gray-400 mb-1 block">Duration (min)</label>
                <input
                  type="number" value={form().duration_minutes}
                  onInput={(e) => setForm({ ...form(), duration_minutes: +e.currentTarget.value })}
                  class="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200"
                />
              </div>
              <div>
                <label class="text-xs text-gray-400 mb-1 block">Cooldown (min)</label>
                <input
                  type="number" value={form().cooldown_minutes}
                  onInput={(e) => setForm({ ...form(), cooldown_minutes: +e.currentTarget.value })}
                  class="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200"
                />
              </div>
            </div>
            <div class="flex gap-2 pt-1">
              <button
                onClick={addRule}
                class="px-4 py-1.5 text-xs rounded bg-green-600 hover:bg-green-500 text-white font-medium"
              >
                Save Rule
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                class="px-4 py-1.5 text-xs rounded bg-gray-600 hover:bg-gray-500 text-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </Show>

        {/* Loading */}
        <Show when={loadingAlert()}>
          <div class="text-xs text-gray-500 py-2">Loading rules...</div>
        </Show>

        {/* Empty */}
        <Show when={!loadingAlert() && alertRules().length === 0}>
          <div class="text-xs text-gray-500 italic py-4 text-center border border-dashed border-gray-700 rounded">
            No alert thresholds configured. Click "+ Add Rule" to create one.
          </div>
        </Show>

        {/* Rule List */}
        <Show when={alertRules().length > 0}>
          <div class="space-y-2">
            <For each={alertRules()}>
              {(rule) => (
                <div class="flex items-center justify-between p-3 bg-gray-800/40 rounded border border-gray-700 hover:border-gray-600 transition">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-200">{rule.name}</span>
                      <span class={`px-1.5 py-0.5 text-xs rounded ${severityColor(rule.severity)}`}>
                        {rule.severity}
                      </span>
                      <span class={`px-1.5 py-0.5 text-xs rounded ${
                        rule.enabled ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"
                      }`}>
                        {rule.enabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <div class="text-xs text-gray-400 mt-1">
                      {metricLabel(rule.metric)} {rule.operator} {rule.threshold}% · sustained {rule.duration_minutes}m · cooldown {rule.cooldown_minutes}m
                    </div>
                  </div>
                  <div class="flex gap-1 ml-3 flex-shrink-0">
                    <button
                      onClick={() => toggleRule(rule.id, rule.enabled)}
                      class={`px-2 py-1 text-xs rounded transition ${
                        rule.enabled
                          ? "bg-yellow-700 hover:bg-yellow-600 text-yellow-200"
                          : "bg-green-700 hover:bg-green-600 text-green-200"
                      }`}
                    >
                      {rule.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      class="px-2 py-1 text-xs rounded bg-red-800 hover:bg-red-700 text-red-200 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  )
}