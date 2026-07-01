import { createSignal, createEffect, Show, For } from "solid-js"
import { dockerApi } from "../../api/docker-api"

interface Props {
  hostId: string
  hostName?: string
}

export default function HostMonitor(props: Props) {
  const [data, setData] = createSignal<any>(null)
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal("")

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

  createEffect(() => {
    if (props.hostId) fetchMonitor()
  })

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
          {/* Uptime */}
          <div class="p-3 bg-gray-800/60 rounded border border-gray-700">
            <div class="text-xs text-gray-400 uppercase mb-1">Uptime</div>
            <div class="text-sm text-gray-100">{getValue("echo '__UPTIME__' && uptime 2>/dev/null")}</div>
          </div>
          {/* CPU */}
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
          {/* Memory */}
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
          {/* Storage */}
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
                  <th class="py-1 pr-2">USER</th>
                  <th class="py-1 pr-2">PID</th>
                  <th class="py-1 pr-2">%CPU</th>
                  <th class="py-1 pr-2">%MEM</th>
                  <th class="py-1 pr-2">COMMAND</th>
                </tr>
              </thead>
              <tbody>
                <For each={
                  getValue("echo '__TOP_CPU__' && ps aux --sort=-%cpu 2>/dev/null | head -10")
                    .split("\n")
                    .slice(1)
                    .filter(Boolean)
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
    </div>
  )
}
