import { createSignal, For, Show } from "solid-js"
import { dockerApi } from "../../api/docker-api"

interface Props {
  hosts: any[]
  loading: boolean
  onSelect: (hostId: string) => void
  onEdit: (host: any) => void
  onDelete: () => void
  onRefresh: () => void
}

export default function HostManager(props: Props) {
  const [testing, setTesting] = createSignal<Record<string, string>>({})
  const [statuses, setStatuses] = createSignal<Record<string, any>>({})

  const testConnection = async (host: any) => {
    setTesting({ ...testing(), [host.id]: "testing" })
    try {
      const result = await dockerApi.testHost(host.id)
      setStatuses({ ...statuses(), [host.id]: result })
    } catch {
      setStatuses({ ...statuses(), [host.id]: { status: "offline", error: "Test failed" } })
    }
    setTesting({ ...testing(), [host.id]: "done" })
  }

  const deleteHost = async (hostId: string) => {
    if (!confirm("Delete this Docker host and all its projects?")) return
    try {
      await dockerApi.deleteHost(hostId)
      props.onDelete()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const statusColor = (host: any) => {
    const s = statuses()[host.id]
    const testState = testing()[host.id]
    if (testState === "testing") return "bg-yellow-400"
    if (s?.status === "online") return "bg-emerald-400"
    if (s?.status === "offline") return "bg-red-400"
    return host.last_connected_at ? "bg-emerald-400" : "bg-slate-500"
  }

  const statusLabel = (host: any) => {
    const s = statuses()[host.id]
    const testState = testing()[host.id]
    if (testState === "testing") return "Testing..."
    if (s?.status === "online") {
      const ver = s.docker_version ? `Docker ${s.docker_version}` : ""
      return `Online${ver ? " — " + ver : ""}`
    }
    if (s?.status === "offline") return `Offline — ${s.error || ""}`
    return host.last_connected_at ? "Connected" : "Unknown"
  }

  return (
    <div class="space-y-4">
      {/* Loading skeletons */}
      <Show when={props.loading}>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <For each={[1, 2, 3]}>
            {() => (
              <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5 animate-pulse">
                <div class="h-5 bg-slate-800 rounded w-3/4 mb-3"></div>
                <div class="h-3 bg-slate-800 rounded w-1/2 mb-2"></div>
                <div class="h-3 bg-slate-800 rounded w-1/3"></div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Host grid */}
      <Show when={!props.loading && props.hosts?.length > 0}>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <For each={props.hosts}>
            {(host: any) => (
              <div
                class="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5 hover:border-blue-600/50 transition-colors cursor-pointer group"
                onClick={() => props.onSelect(host.id)}
              >
                <div class="flex items-start justify-between mb-3">
                  <div class="min-w-0 flex-1">
                    <h3 class="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
                      <span class={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${statusColor(host)}`}></span>
                      <span class="truncate">{host.name}</span>
                    </h3>
                    <p class="text-xs text-slate-400 mt-1 font-mono">{host.host}:{host.port}</p>
                  </div>
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                    <button onClick={(e) => { e.stopPropagation(); testConnection(host) }}
                      title="Test Connection"
                      class="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white text-xs">
                      {testing()[host.id] === "testing" ? "..." : "⟳"}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); props.onEdit(host) }}
                      title="Edit"
                      class="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white text-xs">✎</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteHost(host.id) }}
                      title="Delete"
                      class="p-1.5 bg-slate-800 hover:bg-red-900/30 rounded text-slate-400 hover:text-red-400 text-xs">✕</button>
                  </div>
                </div>
                <div class="text-xs text-slate-400 space-y-1 mb-3">
                  <p>Status: <span class="text-slate-300">{statusLabel(host)}</span></p>
                  <p>Path: <span class="text-slate-300 font-mono truncate block">{host.default_path || "—"}</span></p>
                  <Show when={host.tags?.length > 0}>
                    <div class="flex gap-1 flex-wrap mt-1">
                      <For each={host.tags}>
                        {(tag: string) => (
                          <span class="px-1.5 py-0.5 bg-slate-800 rounded text-xs text-slate-300">{tag}</span>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
                <div class="pt-3 border-t border-slate-800 flex justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); props.onSelect(host.id) }}
                    class="text-blue-400 hover:text-blue-300 text-xs font-medium uppercase tracking-wider">
                    Manage →
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Empty state */}
      <Show when={!props.loading && !props.hosts?.length}>
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-8 sm:p-12 text-center">
          <svg class="w-12 h-12 mx-auto mb-4 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.186v1.887c0 .102.083.185.185.185M8.1 5.648h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185H8.1a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186M8.1 8.35h2.118a.187.187 0 00.186-.186V6.276a.186.186 0 00-.186-.185H8.1a.186.186 0 00-.185.185v1.886c0 .103.082.186.185.186M5.136 8.35h2.119a.186.186 0 00.185-.186V6.276a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.886c0 .103.084.186.186.186M16.922 8.35h2.118a.186.186 0 00.186-.186V6.276a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.886c0 .103.082.186.185.186M13.968 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.186v1.887c0 .102.083.185.185.185M11.038 11.078h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.184.186v1.887c0 .102.083.185.185.185M8.1 11.078h2.118a.186.186 0 00.185-.185V9.006a.186.186 0 00-.185-.186H8.1a.185.185 0 00-.185.186v1.887c0 .102.082.185.185.185M5.136 11.078h2.119a.185.185 0 00.185-.185V9.006a.186.186 0 00-.185-.186H5.136a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185" />
          </svg>
          <p class="text-lg font-medium text-slate-300 mb-1">No Docker hosts yet</p>
          <p class="text-sm text-slate-500">Add your first VM to start managing Docker containers.</p>
        </div>
      </Show>
    </div>
  )
}
