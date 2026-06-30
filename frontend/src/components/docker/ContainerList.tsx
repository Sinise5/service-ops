import { createSignal, createResource, For, Show } from "solid-js"
import { dockerApi } from "../../lib/docker-api"
import ContainerDetail from "./ContainerDetail"
import ContainerLogs from "./ContainerLogs"

export default function ContainerList(props: { hostId: string }) {
  const [filter, setFilter] = createSignal<"all" | "running" | "stopped">("all")
  const [search, setSearch] = createSignal("")
  const [selected, setSelected] = createSignal<string | null>(null)
  const [showLogs, setShowLogs] = createSignal<string | null>(null)
  const [actionLoading, setActionLoading] = createSignal<Record<string, string>>({})

  const [containers, { refetch }] = createResource(
    () => props.hostId,
    (hostId) => dockerApi.listContainers(hostId, filter() !== "stopped")
  )

  const filtered = () => {
    const list = containers() || []
    const q = search().toLowerCase()
    if (!q) return list
    return list.filter((c: any) =>
      c.name.toLowerCase().includes(q) || c.image.toLowerCase().includes(q)
    )
  }

  const statusBadge = (state: string) => {
    if (state === "running")
      return <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-700">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Running
      </span>
    if (state === "paused")
      return <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-300 border border-yellow-700">
        <span class="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>Paused
      </span>
    return <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600">
      <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>{state || "Stopped"}
    </span>
  }

  const doAction = async (containerId: string, action: string) => {
    setActionLoading({ ...actionLoading(), [containerId]: action })
    try {
      await dockerApi.containerAction(props.hostId, containerId, action)
      refetch()
    } catch (e: any) {
      alert(`${action} failed: ${e.message}`)
    }
    setActionLoading({ ...actionLoading(), [containerId]: "" })
  }

  const removeContainer = async (containerId: string) => {
    if (!confirm("Remove this container? This cannot be undone.")) return
    await doAction(containerId, "remove")
  }

  return (
    <div>
      {/* Toolbar */}
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <input
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search containers..."
            class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 w-64"
          />
          <div class="flex gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
            {(["all", "running", "stopped"] as const).map((f) => (
              <button
                onClick={() => setFilter(f)}
                class={`px-3 py-1 text-xs rounded-md transition-colors ${
                  filter() === f
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div class="flex gap-2">
          <button onClick={refetch}
            class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700">
            ⟳ Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div class="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <Show
          when={!containers.loading}
          fallback={
            <div class="p-8 text-center text-slate-500">
              <div class="animate-pulse space-y-2">
                <For each={[1,2,3,4,5]}>
                  {() => <div class="h-12 bg-slate-700/50 rounded"></div>}
                </For>
              </div>
            </div>
          }
        >
          <Show when={filtered().length > 0} fallback={
            <div class="p-12 text-center text-slate-500 text-sm">
              {search() ? "No containers match your search." : "No containers found."}
            </div>
          }>
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-700 text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th class="px-4 py-3">Name</th>
                  <th class="px-4 py-3">Image</th>
                  <th class="px-4 py-3">Status</th>
                  <th class="px-4 py-3">Ports</th>
                  <th class="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700/50">
                <For each={filtered()}>
                  {(c: any) => (
                    <tr class="hover:bg-slate-700/20 transition-colors group">
                      <td class="px-4 py-3 font-mono text-slate-200 text-xs">{c.name}</td>
                      <td class="px-4 py-3 text-slate-400 text-xs">{c.image}</td>
                      <td class="px-4 py-3">{statusBadge(c.state?.toLowerCase())}</td>
                      <td class="px-4 py-3 text-slate-400 text-xs">
                        <Show when={c.ports?.length > 0} fallback="—">
                          {c.ports.join(", ")}
                        </Show>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {/* Start */}
                          <Show when={c.state?.toLowerCase() !== "running"}>
                            <button
                              onClick={() => doAction(c.container_id, "start")}
                              disabled={actionLoading()[c.container_id]}
                              title="Start"
                              class="p-1.5 bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 rounded text-xs"
                            >▶</button>
                          </Show>
                          {/* Stop */}
                          <Show when={c.state?.toLowerCase() === "running"}>
                            <button
                              onClick={() => doAction(c.container_id, "stop")}
                              disabled={actionLoading()[c.container_id]}
                              title="Stop"
                              class="p-1.5 bg-red-900/30 hover:bg-red-800/50 text-red-400 rounded text-xs"
                            >⏹</button>
                          </Show>
                          {/* Restart */}
                          <button
                            onClick={() => doAction(c.container_id, "restart")}
                            disabled={actionLoading()[c.container_id]}
                            title="Restart"
                            class="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
                          >🔄</button>
                          {/* Logs */}
                          <button
                            onClick={() => setShowLogs(c.container_id)}
                            title="Logs"
                            class="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
                          >📜</button>
                          {/* Inspect */}
                          <button
                            onClick={() => setSelected(c.container_id)}
                            title="Details"
                            class="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
                          >🔍</button>
                          {/* Remove */}
                          <button
                            onClick={() => removeContainer(c.container_id)}
                            disabled={actionLoading()[c.container_id]}
                            title="Remove"
                            class="p-1.5 bg-slate-700 hover:bg-red-900/30 text-slate-300 hover:text-red-400 rounded text-xs"
                          >🗑</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Show>
        </Show>
      </div>

      {/* Stats bar */}
      <Show when={containers()}>
        <div class="mt-3 text-xs text-slate-500">
          Showing {filtered().length} of {containers()?.length || 0} containers
          {" · "}
          {(containers() || []).filter((c: any) => c.state?.toLowerCase() === "running").length} running
          {" · "}
          {(containers() || []).filter((c: any) => c.state?.toLowerCase() !== "running").length} stopped
        </div>
      </Show>

      {/* Detail Modal */}
      <Show when={selected()}>
        <ContainerDetail
          hostId={props.hostId}
          containerId={selected()!}
          onClose={() => setSelected(null)}
          onRefresh={refetch}
        />
      </Show>

      {/* Logs Modal */}
      <Show when={showLogs()}>
        <ContainerLogs
          hostId={props.hostId}
          containerId={showLogs()!}
          onClose={() => setShowLogs(null)}
        />
      </Show>
    </div>
  )
}
