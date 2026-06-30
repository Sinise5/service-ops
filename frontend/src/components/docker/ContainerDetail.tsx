import { createSignal, createResource, For, Show } from "solid-js"
import { dockerApi } from "../../api/docker-api"

type Tab = "overview" | "env" | "ports" | "volumes" | "json"

export default function ContainerDetail(props: { hostId: string; containerId: string; onClose: () => void; onRefresh: () => void }) {
  const [tab, setTab] = createSignal<Tab>("overview")
  const [stats, setStats] = createSignal<any>(null)
  const [statsLoading, setStatsLoading] = createSignal(false)

  const [info] = createResource(() => props.containerId, () => dockerApi.inspectContainer(props.hostId, props.containerId))
  const [, { refetch: refetchStats }] = createResource(
    () => props.containerId,
    async () => {
      setStatsLoading(true)
      try {
        const s = await dockerApi.containerStats(props.hostId, props.containerId)
        setStats(s)
      } catch {}
      setStatsLoading(false)
    }
  )

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "env", label: "Env Vars" },
    { key: "ports", label: "Ports" },
    { key: "volumes", label: "Volumes" },
    { key: "json", label: "Inspect JSON" },
  ]

  return (
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={props.onClose}>
      <div class="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[85vh] border border-slate-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h2 class="text-white font-semibold">{info()?.name || props.containerId}</h2>
            <p class="text-xs text-slate-400">{info()?.image}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class={`text-xs px-2 py-0.5 rounded-full ${info()?.state?.Running ? "bg-emerald-900/50 text-emerald-300" : "bg-slate-700 text-slate-400"}`}>
              {info()?.state?.Running ? "Running" : "Stopped"}
            </span>
            <button onClick={props.onClose} class="text-slate-400 hover:text-white text-lg">✕</button>
          </div>
        </div>

        {/* Stats mini bar */}
        <div class="px-5 py-2 bg-slate-800 border-b border-slate-700 flex gap-6 text-xs">
          <Show when={stats()}>
            <div><span class="text-slate-500">CPU</span> <span class="text-white ml-1">{stats().cpu_percent?.toFixed(1)}%</span></div>
            <div><span class="text-slate-500">Memory</span> <span class="text-white ml-1">{stats().mem_percent?.toFixed(1)}%</span></div>
            <div><span class="text-slate-500">Net I/O</span> <span class="text-white ml-1">{stats().net_io}</span></div>
            <div><span class="text-slate-500">PIDs</span> <span class="text-white ml-1">{stats().pids}</span></div>
          </Show>
          <Show when={statsLoading()}>
            <span class="text-slate-500 animate-pulse">Fetching stats...</span>
          </Show>
          <Show when={!stats() && !statsLoading()}>
            <button onClick={refetchStats} class="text-blue-400 hover:text-blue-300">Load Stats</button>
          </Show>
        </div>

        {/* Tabs */}
        <div class="flex gap-1 px-5 pt-3">
          <For each={tabs}>
            {(t) => (
              <button
                onClick={() => setTab(t.key)}
                class={`px-3 py-1.5 text-xs rounded-t-lg border-b-2 transition-colors ${
                  tab() === t.key ? "border-blue-500 text-blue-400 bg-slate-700/30" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >{t.label}</button>
            )}
          </For>
        </div>

        {/* Content */}
        <div class="overflow-y-auto flex-1 px-5 py-3">
          <Show when={info.loading}>
            <div class="animate-pulse space-y-2">
              <For each={[1,2,3,4,5]}>{() => <div class="h-4 bg-slate-700 rounded"></div>}</For>
            </div>
          </Show>

          <Show when={tab() === "overview"}>
            <Show when={info()}>
              <dl class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {[
                  ["Container ID", info()?.container_id?.slice(0, 12)],
                  ["Image", info()?.image],
                  ["Image ID", info()?.image_id?.slice(0, 20)],
                  ["Created", info()?.created?.slice(0, 19)],
                  ["Status", info()?.state?.Status || "—"],
                  ["Started", info()?.state?.StartedAt?.slice(0, 19) || "—"],
                  ["Platform", info()?.inspect_raw?.Architecture || "—"],
                  ["Command", info()?.config?.Cmd?.join(" ") || "—"],
                ].map(([k, v]) => (
                  <>
                    <dt class="text-slate-500 text-xs">{k}</dt>
                    <dd class="text-slate-200 text-xs font-mono truncate" title={v}>{v || "—"}</dd>
                  </>
                ))}
              </dl>
            </Show>
          </Show>

          <Show when={tab() === "env"}>
            <Show when={info()?.config?.Env}>
              <table class="w-full text-xs">
                <tbody class="divide-y divide-slate-700/50">
                  <For each={info()?.config?.Env || []}>
                    {(env: string) => {
                      const [k, ...rest] = env.split("=")
                      return (
                        <tr>
                          <td class="py-1.5 pr-4 text-blue-400 font-mono whitespace-nowrap">{k}</td>
                          <td class="py-1.5 text-slate-300 font-mono truncate" title={rest.join("=")}>
                            <button onClick={() => copyToClipboard(rest.join("="))} class="text-slate-400 hover:text-white mr-1" title="Copy">⎘</button>
                            {rest.join("=")}
                          </td>
                        </tr>
                      )
                    }}
                  </For>
                </tbody>
              </table>
            </Show>
          </Show>

          <Show when={tab() === "ports"}>
            <Show when={info()?.host_config?.PortBindings}>
              {(() => {
                const ports = info()?.host_config?.PortBindings || {}
                const entries = Object.entries(ports)
                return entries.length > 0 ? (
                  <table class="w-full text-xs">
                    <tbody class="divide-y divide-slate-700/50">
                      <For each={entries}>
                        {([containerPort, bindings]: [string, any]) => (
                          <For each={bindings || []}>
                            {(binding: any) => (
                              <tr>
                                <td class="py-1.5 text-emerald-400 font-mono">{binding.HostIp}:{binding.HostPort}</td>
                                <td class="py-1.5 text-slate-400 px-2">→</td>
                                <td class="py-1.5 text-slate-300 font-mono">{containerPort}</td>
                              </tr>
                            )}
                          </For>
                        )}
                      </For>
                    </tbody>
                  </table>
                ) : <p class="text-slate-500 text-sm">No port mappings.</p>
              })()}
            </Show>
          </Show>

          <Show when={tab() === "volumes"}>
            <Show when={info()?.mounts}>
              <table class="w-full text-xs">
                <tbody class="divide-y divide-slate-700/50">
                  <For each={info()?.mounts || []}>
                    {(m: any) => (
                      <tr>
                        <td class="py-1.5 pr-4 text-yellow-400 font-mono whitespace-nowrap">{m.Type}</td>
                        <td class="py-1.5 text-slate-300 font-mono truncate" title={m.Source}>{m.Source}</td>
                        <td class="py-1.5 text-slate-400 px-2">→</td>
                        <td class="py-1.5 text-slate-300 font-mono truncate" title={m.Destination}>{m.Destination}</td>
                        <td class="py-1.5 text-slate-500 text-xs">{m.Mode}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </Show>
          </Show>

          <Show when={tab() === "json"}>
            <Show when={info()?.inspect_raw}>
              <pre class="text-xs text-slate-400 font-mono overflow-x-auto whitespace-pre">{JSON.stringify(info()?.inspect_raw, null, 2)}</pre>
            </Show>
          </Show>
        </div>

        {/* Footer */}
        <div class="px-5 py-3 border-t border-slate-700 flex justify-between">
          <button onClick={props.onRefresh}
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">
            ⟳ Refresh
          </button>
          <button onClick={props.onClose}
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
