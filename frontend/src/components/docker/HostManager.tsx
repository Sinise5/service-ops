import { createSignal, For, Show } from "solid-js"
import { dockerApi } from "../../lib/docker-api"

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
    // Default: unknown — show connected if last_connected_at exists
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
    <div>
      {/* Host Grid */}
      <Show
        when={!props.loading}
        fallback={
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={[1, 2, 3]}>
              {() => (
                <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 animate-pulse">
                  <div class="h-5 bg-slate-700 rounded w-3/4 mb-3"></div>
                  <div class="h-3 bg-slate-700 rounded w-1/2 mb-2"></div>
                  <div class="h-3 bg-slate-700 rounded w-1/3"></div>
                </div>
              )}
            </For>
          </div>
        }
      >
        <Show when={props.hosts?.length > 0}>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={props.hosts}>
              {(host: any) => (
                <div
                  class="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-blue-600/50 transition-colors cursor-pointer group"
                  onClick={() => props.onSelect(host.id)}
                >
                  <div class="flex items-start justify-between mb-3">
                    <div>
                      <h3 class="font-semibold text-white flex items-center gap-2">
                        <span class={`inline-block w-2 h-2 rounded-full ${statusColor(host)}`}></span>
                        {host.name}
                      </h3>
                      <p class="text-xs text-slate-400 mt-1">{host.host}:{host.port}</p>
                    </div>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); testConnection(host) }}
                        title="Test Connection"
                        class="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-400 hover:text-white text-xs">
                        {testing()[host.id] === "testing" ? "..." : "⟳"}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); props.onEdit(host) }}
                        title="Edit"
                        class="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-400 hover:text-white text-xs">
                        ✎
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteHost(host.id) }}
                        title="Delete"
                        class="p-1.5 bg-slate-700 hover:bg-red-500/30 rounded text-slate-400 hover:text-red-400 text-xs">
                        ✕
                      </button>
                    </div>
                  </div>
                  <div class="text-xs text-slate-400 space-y-1">
                    <p>Status: {statusLabel(host)}</p>
                    <p>Path: {host.default_path}</p>
                    <Show when={host.tags?.length > 0}>
                      <div class="flex gap-1 flex-wrap mt-1">
                        <For each={host.tags}>
                          {(tag: string) => (
                            <span class="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-300">{tag}</span>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                  <div class="mt-3 pt-3 border-t border-slate-700 flex justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); props.onSelect(host.id) }}
                      class="text-blue-400 hover:text-blue-300 text-xs font-medium uppercase tracking-wider"
                    >
                      Manage →
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
        <Show when={!props.hosts?.length}>
          <div class="text-center py-16 text-slate-500">
            <svg class="w-16 h-16 mx-auto mb-4 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
              <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119..."/>
            </svg>
            <p class="text-lg font-medium">No Docker hosts yet</p>
            <p class="text-sm mt-1">Add your first VM to start managing Docker containers.</p>
            <button
              onClick={() => {/* parent handles add */}}
              class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              + Add Host
            </button>
          </div>
        </Show>
      </Show>
    </div>
  )
}
