import { createSignal, createEffect, Show, For } from "solid-js"
import { dockerApi } from "../../api/docker-api"

interface Props {
  hostId: string
  hostName?: string
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

export default function HostMonitor(props: Props) {
  const [data, setData] = createSignal<any>(null)
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal("")

  // Alert rules
  const [alertRules, setAlertRules] = createSignal<AlertRule[]>([])
  const [loadingAlert, setLoadingAlert] = createSignal(false)
  const [showAddForm, setShowAddForm] = createSignal(false)
  const [form, setForm] = createSignal({ name: "", metric: "cpu_percent", operator: "gt",
    threshold: 80, duration_minutes: 5, cooldown_minutes: 10, enabled: true })

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
      const res = await fetch(`/hosts/${props.hostId}/alerts/rules`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAlertRules(Array.isArray(data) ? data : [])
    } catch (e: any) {
      console.error("[AlertRules] fetch error:", e)
    } finally { setLoadingAlert(false) }
  }

  const BASE = `http://localhost:9080`

  createEffect(() => {
    if (props.hostId) { fetchMonitor(); fetchAlertRules() }
  })

  const addRule = async () => {
    const f = form()
    try {
      const res = await fetch(`${BASE}/hosts/${props.hostId}/alerts/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, host_id: props.hostId, channel_ids: [] }),
      })
      if (!res.ok) throw new Error(`addRule HTTP ${res.status}`)
      setShowAddForm(false)
      setForm({ name: "", metric: "cpu_percent", operator: "gt",
        threshold: 80, duration_minutes: 5, cooldown_minutes: 10, enabled: true })
      await fetchAlertRules()
    } catch (e: any) { console.error("[AlertRules] add error:", e) }
  }

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const res = await fetch(`${BASE}/hosts/${props.hostId}/alerts/rules/${ruleId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      })
      if (!res.ok) throw new Error(`toggle HTTP ${res.status}`)
      await fetchAlertRules()
    } catch (e: any) { console.error("[AlertRules] toggle error:", e) }
  }

  const deleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`${BASE}/hosts/${props.hostId}/alerts/rules/${ruleId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`delete HTTP ${res.status}`)
      await fetchAlertRules()
    } catch (e: any) { console.error("[AlertRules] delete error:", e) }
  }

  const parseDf = (key: string): { size: string; used: string; avail: string; usePct: string } | null => {
    const raw = data()?.[key]?.stdout || ""
    const parts = raw.trim().split(/\s+/)
    if (parts.length < 5) return null
    return { size: parts[1], used: parts[2], avail: parts[3], usePct: parts[4] }
  }

  const parseMem = (key: string): { total: string; used: string; free: string; avail: string } | null => {
    const raw = data()?.[key]?.stdout || ""
    const lines = raw.split("\n")
    const memLine = lines.find((l: string) => l.startsWith("Mem:"))
    if (!memLine) return null
    const parts = memLine.trim().split(/\s+/)
    return { total: parts[1], used: parts[2], free: parts[3], avail: parts[6] || "?" }
  }

  const getValue = (key: string): string => {
    const raw = data()?.[key]?.stdout || ""
    return raw.replace(/^__\w+__\n?/, "").trim()
  }

  return (
    <div class="space-y-4">
      {/* Header + Refresh */}
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-100">
          {props.hostName || "Host"} — Monitor
        </h3>
        <button
          onClick={fetchMonitor}
          disabled={loading()}
          class={`px-3 py-1 text-sm rounded ${
            loading()
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500"
          } text-white transition`}
        >
          {loading() ? "Loading..." : "⟳ Refresh"}
        </button>
      </div>

      <Show when={error()}>
        <div class="p-3 bg-red-900/40 border border-red-700 rounded text-red-300 text-sm">{error()}</div>
      </Show>

      <Show when={!loading() && data()}>
        {/* Summary cards */}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="p-3 bg-gray-800/60 rounded border border-gray-700">
            <div class="text-xs text-gray-400 uppercase mb-1">Uptime</div>
            <div class="text-sm text-gray-100">{getValue("echo '__UPTIME__' && uptime 2>/dev/null")}</div>
          </div>
          <div class="p-3 bg-gray-800/60 rounded border border-gray-700">
            <div class="text-xs text-gray-400 uppercase mb-1">CPU</div>
            <div class="text-sm text-gray-100">{getValue("echo '__NPROC__' && nproc 2>/dev/null")} cores</div>
            <div class="text-xs text-gray-500">
              {getValue("echo '__LSCPU__' && lscpu 2>/dev/null | grep -E 'Model name|CPU\\(s\\)|Thread|Core|Socket'")
                .split("\n")
                .filter((l: string) => l.includes("Model name"))
                .map((l: string) => l.replace(/.*:\s*/, ""))
                .join("")}
            </div>
            <div class="text-xs text-gray-500">
              Load: {getValue("echo '__LOADAVG__' && cat /proc/loadavg 2>/dev/null")}
            </div>
          </div>
          <div class="p-3 bg-gray-800/60 rounded border border-gray-700">
            <div class="text-xs text-gray-400 uppercase mb-1">Memory</div>
            <Show when={parseMem("free -h 2>/dev/null")} fallback={<div class="text-sm text-gray-500">N/A</div>}>
              {(m) => (
                <>
                  <div class="text-sm text-gray-100">{m().used} / {m().total}</div>
                  <div class="text-xs text-gray-500">Avail: {m().avail}</div>
                </>
              )}
            </Show>
          </div>
          <div class="p-3 bg-gray-800/60 rounded border border-gray-700">
            <div class="text-xs text-gray-400 uppercase mb-1">Storage</div>
            <Show when={parseDf("df -h --total 2>/dev/null | tail -1")} fallback={<div class="text-sm text-gray-500">N/A</div>}>
              {(d) => (
                <>
                  <div class="text-sm text-gray-100">{d().used} / {d().size}</div>
                  <div class="text-xs text-gray-500">{d().usePct} used</div>
                </>
              )}
            </Show>
          </div>
        </div>

        {/* Top CPU processes */}
        <div>
          <h4 class="text-sm font-medium text-gray-300 mb-2">Top CPU Processes</h4>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-gray-300">
              <thead>
                <tr class="text-left text-gray-500 uppercase border-b border-gray-700">
                  <th class="py-1 pr-2">USER</th><th class="py-1 pr-2">PID</th>
                  <th class="py-1 pr-2">%CPU</th><th class="py-1 pr-2">%MEM</th>
                  <th class="py-1 pr-2">COMMAND</th>
                </tr>
              </thead>
              <tbody>
                <For each={
                  getValue("echo '__TOP_CPU__' && ps aux --sort=-%cpu 2>/dev/null | head -10")
                    .split("\n").slice(1).filter(Boolean)
                }>
                  {(line) => {
                    const parts = line.trim().split(/\s+/)
                    if (parts.length < 11) return null
                    return (
                      <tr class="border-b border-gray-800 hover:bg-gray-800/40">
                        <td class="py-1 pr-2">{parts[0]}</td>
                        <td class="py-1 pr-2">{parts[1]}</td>
                        <td class="py-1 pr-2 text-yellow-400">{parts[2]}</td>
                        <td class="py-1 pr-2">{parts[3]}</td>
                        <td class="py-1 truncate max-w-[300px]" title={parts.slice(10).join(" ")}>{parts.slice(10).join(" ")}</td>
                      </tr>
                    )
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      <Show when={loading() && !data()}>
        <div class="text-center text-gray-500 py-8">Loading monitor data...</div>
      </Show>

      {/* ════ Alert Rules Section (inline) ════ */}
      <div class="border-t border-gray-700 pt-4 mt-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium text-gray-300">Alert Thresholds</h4>
          <button
            onClick={() => setShowAddForm(true)}
            class="px-3 py-1 text-xs rounded bg-green-700 hover:bg-green-600 text-white transition"
          >+ Add Rule</button>
        </div>

        <Show when={showAddForm()}>
          <div class="p-3 mb-3 bg-gray-800 rounded border border-gray-600 space-y-2">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label class="text-xs text-gray-400">Rule Name</label>
                <input type="text" value={form().name}
                  onInput={(e) => setForm({ ...form(), name: e.currentTarget.value })}
                  class="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200" />
              </div>
              <div>
                <label class="text-xs text-gray-400">Metric</label>
                <select value={form().metric}
                  onChange={(e) => setForm({ ...form(), metric: e.currentTarget.value })}
                  class="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200">
                  <For each={METRICS}>{(m) => <option value={m.value}>{m.label}</option>}</For>
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-400">Operator</label>
                <select value={form().operator}
                  onChange={(e) => setForm({ ...form(), operator: e.currentTarget.value })}
                  class="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200">
                  <For each={OPERATORS}>{(o) => <option value={o.value}>{o.label}</option>}</For>
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-400">Threshold (%)</label>
                <input type="number" value={form().threshold}
                  onInput={(e) => setForm({ ...form(), threshold: +e.currentTarget.value })}
                  class="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200" />
              </div>
              <div>
                <label class="text-xs text-gray-400">Duration (min)</label>
                <input type="number" value={form().duration_minutes}
                  onInput={(e) => setForm({ ...form(), duration_minutes: +e.currentTarget.value })}
                  class="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200" />
              </div>
              <div>
                <label class="text-xs text-gray-400">Cooldown (min)</label>
                <input type="number" value={form().cooldown_minutes}
                  onInput={(e) => setForm({ ...form(), cooldown_minutes: +e.currentTarget.value })}
                  class="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200" />
              </div>
            </div>
            <div class="flex gap-2 pt-1">
              <button onClick={addRule}
                class="px-3 py-1 text-xs rounded bg-green-600 hover:bg-green-500 text-white">Save</button>
              <button onClick={() => setShowAddForm(false)}
                class="px-3 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500 text-gray-200">Cancel</button>
            </div>
          </div>
        </Show>

        <Show when={loadingAlert()}>
          <div class="text-xs text-gray-500">Loading rules...</div>
        </Show>

        <Show when={!loadingAlert() && alertRules().length === 0}>
          <div class="text-xs text-gray-500 italic">No alert thresholds configured yet.</div>
        </Show>

        <Show when={alertRules().length > 0}>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-gray-300">
              <thead>
                <tr class="text-left text-gray-500 uppercase border-b border-gray-700">
                  <th class="py-1 pr-2">Name</th><th class="py-1 pr-2">Metric</th>
                  <th class="py-1 pr-2">Cond</th><th class="py-1 pr-2">Thresh</th>
                  <th class="py-1 pr-2">Duration</th><th class="py-1 pr-2">Status</th>
                  <th class="py-1 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                <For each={alertRules()}>
                  {(rule) => (
                    <tr class="border-b border-gray-800 hover:bg-gray-800/40">
                      <td class="py-1 pr-2">{rule.name}</td>
                      <td class="py-1 pr-2">{rule.metric}</td>
                      <td class="py-1 pr-2">{rule.operator}</td>
                      <td class="py-1 pr-2">{rule.threshold}%</td>
                      <td class="py-1 pr-2">{rule.duration_minutes}m</td>
                      <td class="py-1 pr-2">
                        <span class={`px-1.5 py-0.5 rounded text-xs ${rule.enabled ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                          {rule.enabled ? "On" : "Off"}
                        </span>
                      </td>
                      <td class="py-1 pr-2 text-right whitespace-nowrap">
                        <button onClick={() => toggleRule(rule.id, rule.enabled)}
                          class="text-xs text-blue-400 hover:text-blue-300 mr-2"
                          title={rule.enabled ? "Disable" : "Enable"}>{rule.enabled ? "✕" : "✓"}</button>
                        <button onClick={() => deleteRule(rule.id)}
                          class="text-xs text-red-400 hover:text-red-300"
                          title="Delete">🗑</button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>
    </div>
  )
}
