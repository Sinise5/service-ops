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
  { value: "gt", label: ">" }, { value: "gte", label: ">=" },
  { value: "lt", label: "<" }, { value: "lte", label: "<=" },
]
const BASE = "http://localhost:9080"

const out = (val: any): string => (val?.stdout || "")
const orEmpty = (d: any) => Array.isArray(d) ? d : []

export default function HostMonitor(props: Props) {
  const [data, setData] = createSignal<any>(null)
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal("")
  const [alertRules, setAlertRules] = createSignal<AlertRule[]>([])
  const [loadingAlert, setLoadingAlert] = createSignal(false)
  const [showAdd, setShowAdd] = createSignal(false)
  const [toast, setToast] = createSignal<{ msg: string; ok: boolean } | null>(null)
  const [f, setF] = createSignal({
    name: "", metric: "cpu_percent", operator: "gt",
    threshold: 80, duration_minutes: 5, cooldown_minutes: 10, enabled: true,
  })

  let tmr: any
  const t = (msg: string, ok = true) => { clearTimeout(tmr); setToast({ msg, ok }); tmr = setTimeout(() => setToast(null), 3000) }

  // ── Monitor ──
  const fetchMonitor = async () => {
    setLoading(true); setError("")
    try { setData(await dockerApi.monitorHost(props.hostId)) }
    catch (e: any) { setError(e.message || "Failed") }
    finally { setLoading(false) }
  }

  const parseDf = (key: string) => {
    const p = out(data()?.[key]).trim().split(/\s+/)
    return p.length >= 5 ? { size: p[1], used: p[2], avail: p[3], usePct: p[4] } : null
  }
  const parseMem = (key: string) => {
    const l = out(data()?.[key]).split("\n").find((l: string) => l.startsWith("Mem:"))
    if (!l) return null
    const p = l.trim().split(/\s+/)
    return { total: p[1], used: p[2], free: p[3], avail: p[6] || "?" }
  }
  const getV = (key: string) => out(data()?.[key]).replace(/^__\w+__\n?/, "").trim()

  // ── Alert Rules ──
  const fetchRules = async () => {
    if (!props.hostId) return
    setLoadingAlert(true)
    try {
      const res = await fetch(`${BASE}/hosts/${props.hostId}/alerts/rules`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      const r = orEmpty(d)
      setAlertRules(r)
      props.onAlertCount?.(r.filter((x: AlertRule) => x.enabled).length)
    } catch (e: any) { console.error("[AlertRules]", e) }
    finally { setLoadingAlert(false) }
  }

  createEffect(() => {
    if (props.hostId) { fetchMonitor(); fetchRules() }
  })

  const addRule = async () => {
    const v = f()
    if (!v.name.trim()) { t("Name required", false); return }
    try {
      const res = await fetch(`${BASE}/hosts/${props.hostId}/alerts/rules`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, host_id: props.hostId, channel_ids: [] }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`) }
      setShowAdd(false)
      setF({ name: "", metric: "cpu_percent", operator: "gt", threshold: 80, duration_minutes: 5, cooldown_minutes: 10, enabled: true })
      t("Rule added ✅")
      await fetchRules()
    } catch (e: any) { t(`Error: ${e.message}`, false) }
  }
  const toggle = async (ruleId: string, enabled: boolean) => {
    try {
      const res = await fetch(`${BASE}/hosts/${props.hostId}/alerts/rules/${ruleId}/toggle`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      t(enabled ? "Disabled" : "Enabled")
      await fetchRules()
    } catch (e: any) { t(`Error: ${e.message}`, false) }
  }
  const del = async (ruleId: string) => {
    try {
      const res = await fetch(`${BASE}/hosts/${props.hostId}/alerts/rules/${ruleId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      t("Deleted")
      await fetchRules()
    } catch (e: any) { t(`Error: ${e.message}`, false) }
  }

  const ml = (m: string) => METRICS.find((x) => x.value === m)?.label || m
  const sc = (s: string) =>
    s === "critical" ? "bg-red-900 text-red-300" : s === "warning" ? "bg-yellow-900 text-yellow-300" : "bg-blue-900 text-blue-300"

  return (
    <div class="space-y-4">
      {/* Toast */}
      <Show when={toast()}>
        <div class={`fixed top-4 right-4 z-50 px-4 py-2 rounded text-sm shadow-lg ${toast()!.ok ? "bg-green-800 text-green-200" : "bg-red-800 text-red-200"}`}>
          {toast()!.msg}
        </div>
      </Show>

      {/* Header */}
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-100">{props.hostName || "Host"} — Monitor</h3>
        <button onClick={fetchMonitor} disabled={loading()}
          class={`px-3 py-1 text-sm rounded transition ${loading() ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"} text-white`}>
          {loading() ? "Loading..." : "⟳ Refresh"}
        </button>
      </div>

      <Show when={error()}>
        <div class="p-3 bg-red-900/40 border border-red-700 rounded text-red-300 text-sm">{error()}</div>
      </Show>

      <Show when={!loading() && data()}>
        {/* ══ Summary Cards ══ */}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="p-3 bg-gray-800/60 rounded border border-gray-700">
            <div class="text-xs text-gray-400 uppercase mb-1">Uptime</div>
            <div class="text-sm text-gray-100">{getV("echo '__UPTIME__' && uptime 2>/dev/null")}</div>
          </div>
          <div class="p-3 bg-gray-800/60 rounded border border-gray-700">
            <div class="text-xs text-gray-400 uppercase mb-1">CPU</div>
            <div class="text-sm text-gray-100">{getV("echo '__NPROC__' && nproc 2>/dev/null")} cores</div>
            <div class="text-xs text-gray-500">
              {getV("echo '__LSCPU__' && lscpu 2>/dev/null | grep -E 'Model name|CPU\\(s\\)|Thread|Core|Socket'")
                .split("\n").filter((l: string) => l.includes("Model name"))
                .map((l: string) => l.replace(/.*:\s*/, "")).join("")}
            </div>
            <div class="text-xs text-gray-500">Load: {getV("echo '__LOADAVG__' && cat /proc/loadavg 2>/dev/null")}</div>
          </div>
          <div class="p-3 bg-gray-800/60 rounded border border-gray-700">
            <div class="text-xs text-gray-400 uppercase mb-1">Memory</div>
            <Show when={parseMem("free -h 2>/dev/null")} fallback={<div class="text-sm text-gray-500">N/A</div>}>
              {(m) => (<><div class="text-sm text-gray-100">{m().used} / {m().total}</div><div class="text-xs text-gray-500">Avail: {m().avail}</div></>)}
            </Show>
          </div>
          <div class="p-3 bg-gray-800/60 rounded border border-gray-700">
            <div class="text-xs text-gray-400 uppercase mb-1">Storage</div>
            <Show when={parseDf("df -h --total 2>/dev/null | tail -1")} fallback={<div class="text-sm text-gray-500">N/A</div>}>
              {(d) => (<><div class="text-sm text-gray-100">{d().used} / {d().size}</div><div class="text-xs text-gray-500">{d().usePct} used</div></>)}
            </Show>
          </div>
        </div>

        {/* ══ Top CPU ══ */}
        <div>
          <h4 class="text-sm font-medium text-gray-300 mb-2">Top CPU Processes</h4>
          <table class="w-full text-xs text-gray-300">
            <thead>
              <tr class="text-left text-gray-500 uppercase border-b border-gray-700">
                <th class="py-1 pr-2">USER</th><th class="py-1 pr-2">PID</th>
                <th class="py-1 pr-2">%CPU</th><th class="py-1 pr-2">%MEM</th><th class="py-1 pr-2">COMMAND</th>
              </tr>
            </thead>
            <tbody>
              <For each={getV("echo '__TOP_CPU__' && ps aux --sort=-%cpu 2>/dev/null | head -10").split("\n").slice(1).filter(Boolean)}>
                {(line) => { const p = line.trim().split(/\s+/); if (p.length < 11) return null
                  return (
                    <tr class="border-b border-gray-800 hover:bg-gray-800/40">
                      <td class="py-1 pr-2">{p[0]}</td><td class="py-1 pr-2">{p[1]}</td>
                      <td class="py-1 pr-2 text-yellow-400">{p[2]}</td><td class="py-1 pr-2">{p[3]}</td>
                      <td class="py-1 truncate max-w-[300px]" title={p.slice(10).join(" ")}>{p.slice(10).join(" ")}</td>
                    </tr>
                  )
                }}
              </For>
            </tbody>
          </table>
        </div>

        {/* ══ Top MEM ══ */}
        <div>
          <h4 class="text-sm font-medium text-gray-300 mb-2">Top Memory Processes</h4>
          <table class="w-full text-xs text-gray-300">
            <thead>
              <tr class="text-left text-gray-500 uppercase border-b border-gray-700">
                <th class="py-1 pr-2">USER</th><th class="py-1 pr-2">PID</th>
                <th class="py-1 pr-2">%CPU</th><th class="py-1 pr-2">%MEM</th><th class="py-1 pr-2">COMMAND</th>
              </tr>
            </thead>
            <tbody>
              <For each={getV("echo '__TOP_MEM__' && ps aux --sort=-%mem 2>/dev/null | head -10").split("\n").slice(1).filter(Boolean)}>
                {(line) => { const p = line.trim().split(/\s+/); if (p.length < 11) return null
                  return (
                    <tr class="border-b border-gray-800 hover:bg-gray-800/40">
                      <td class="py-1 pr-2">{p[0]}</td><td class="py-1 pr-2">{p[1]}</td>
                      <td class="py-1 pr-2">{p[2]}</td><td class="py-1 pr-2 text-red-400">{p[3]}</td>
                      <td class="py-1 truncate max-w-[300px]" title={p.slice(10).join(" ")}>{p.slice(10).join(" ")}</td>
                    </tr>
                  )
                }}
              </For>
            </tbody>
          </table>
        </div>

        {/* ══ Docker Disk ══ */}
        <div>
          <h4 class="text-sm font-medium text-gray-300 mb-2">Docker Disk Usage</h4>
          <pre class="text-xs text-gray-400 bg-gray-900/60 p-3 rounded border border-gray-700 overflow-x-auto whitespace-pre-wrap font-mono">
            {getV("echo '__DOCKER_DF__' && docker system df 2>/dev/null") || "No data"}
          </pre>
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
          <button onClick={() => setShowAdd(!showAdd())}
            class={`px-3 py-1 text-xs rounded transition ${showAdd() ? "bg-gray-600 hover:bg-gray-500" : "bg-green-700 hover:bg-green-600"} text-white`}>
            {showAdd() ? "✕ Cancel" : "+ Add Rule"}
          </button>
        </div>

        <Show when={showAdd()}>
          <div class="p-4 mb-3 bg-gray-800 rounded border border-gray-600 space-y-3">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="md:col-span-2">
                <label class="text-xs text-gray-400 mb-1 block">Rule Name</label>
                <input type="text" value={f().name} onInput={(e) => setF({ ...f(), name: e.currentTarget.value })}
                  placeholder="e.g. CPU High Alert"
                  class="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200 placeholder-gray-500" />
              </div>
              <div>
                <label class="text-xs text-gray-400 mb-1 block">Metric</label>
                <select value={f().metric} onChange={(e) => setF({ ...f(), metric: e.currentTarget.value })}
                  class="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200">
                  <For each={METRICS}>{(m) => <option value={m.value}>{m.label}</option>}</For>
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-400 mb-1 block">Condition</label>
                <select value={f().operator} onChange={(e) => setF({ ...f(), operator: e.currentTarget.value })}
                  class="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200">
                  <For each={OPERATORS}>{(o) => <option value={o.value}>{o.label}</option>}</For>
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-400 mb-1 block">Threshold (%)</label>
                <input type="number" value={f().threshold} onInput={(e) => setF({ ...f(), threshold: +e.currentTarget.value })}
                  class="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200" />
              </div>
              <div>
                <label class="text-xs text-gray-400 mb-1 block">Duration (min)</label>
                <input type="number" value={f().duration_minutes} onInput={(e) => setF({ ...f(), duration_minutes: +e.currentTarget.value })}
                  class="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200" />
              </div>
              <div>
                <label class="text-xs text-gray-400 mb-1 block">Cooldown (min)</label>
                <input type="number" value={f().cooldown_minutes} onInput={(e) => setF({ ...f(), cooldown_minutes: +e.currentTarget.value })}
                  class="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200" />
              </div>
            </div>
            <div class="flex gap-2 pt-1">
              <button onClick={addRule} class="px-4 py-1.5 text-xs rounded bg-green-600 hover:bg-green-500 text-white font-medium">Save Rule</button>
              <button onClick={() => setShowAdd(false)} class="px-4 py-1.5 text-xs rounded bg-gray-600 hover:bg-gray-500 text-gray-200">Cancel</button>
            </div>
          </div>
        </Show>

        <Show when={loadingAlert()}>
          <div class="text-xs text-gray-500 py-2">Loading rules...</div>
        </Show>

        <Show when={!loadingAlert() && alertRules().length === 0}>
          <div class="text-xs text-gray-500 italic py-4 text-center border border-dashed border-gray-700 rounded">
            No alert thresholds configured. Click "+ Add Rule" to create one.
          </div>
        </Show>

        <Show when={alertRules().length > 0}>
          <div class="space-y-2">
            <For each={alertRules()}>
              {(rule) => (
                <div class="flex items-center justify-between p-3 bg-gray-800/40 rounded border border-gray-700 hover:border-gray-600 transition">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-200">{rule.name}</span>
                      <span class={`px-1.5 py-0.5 text-xs rounded ${sc(rule.severity)}`}>{rule.severity}</span>
                      <span class={`px-1.5 py-0.5 text-xs rounded ${rule.enabled ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"}`}>
                        {rule.enabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <div class="text-xs text-gray-400 mt-1">
                      {ml(rule.metric)} {rule.operator} {rule.threshold}% · sustained {rule.duration_minutes}m · cooldown {rule.cooldown_minutes}m
                    </div>
                  </div>
                  <div class="flex gap-1 ml-3 flex-shrink-0">
                    <button onClick={() => toggle(rule.id, rule.enabled)}
                      class={`px-2 py-1 text-xs rounded transition ${rule.enabled ? "bg-yellow-700 hover:bg-yellow-600 text-yellow-200" : "bg-green-700 hover:bg-green-600 text-green-200"}`}>
                      {rule.enabled ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => del(rule.id)}
                      class="px-2 py-1 text-xs rounded bg-red-800 hover:bg-red-700 text-red-200 transition">Delete</button>
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