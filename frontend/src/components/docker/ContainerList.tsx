import { createSignal, createResource, For, Show } from "solid-js"
import { dockerApi } from "../../api/docker-api"
import ContainerDetail from "./ContainerDetail"
import ContainerLogs from "./ContainerLogs"

export default function ContainerList(props: { hostId: string }) {
  const [filter, setFilter] = createSignal<"all" | "running" | "stopped">("all")
  const [search, setSearch] = createSignal("")
  const [selected, setSelected] = createSignal<string | null>(null)
  const [showLogs, setShowLogs] = createSignal<string | null>(null)
  const [actionLoading, setActionLoading] = createSignal<Record<string, string>>({})
  const [bulkSelected, setBulkSelected] = createSignal<Set<string>>(new Set())

  // SSH password confirmation state
  const [passModal, setPassModal] = createSignal(false)
  const [sshPass, setSshPass] = createSignal("")
  const [showSshPass, setShowSshPass] = createSignal(false)
  const [passError, setPassError] = createSignal("")
  const [removeTarget, setRemoveTarget] = createSignal<string | null>(null)
  const [bulkRemoveMode, setBulkRemoveMode] = createSignal(false)

  const [containers, { refetch }] = createResource(
    () => [props.hostId, filter()],
    ([hostId]) => dockerApi.listContainers(hostId, true)
  )

  const filtered = () => {
    const list = containers() || []
    let result = list
    if (filter() === "running") {
      result = list.filter((c: any) => c.state?.toLowerCase() === "running")
    } else if (filter() === "stopped") {
      result = list.filter((c: any) => c.state?.toLowerCase() !== "running")
    }
    const q = search().toLowerCase()
    if (!q) return result
    return result.filter((c: any) =>
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

  // Remove single container — asks SSH password
  const promptRemove = (containerId: string) => {
    setRemoveTarget(containerId)
    setBulkRemoveMode(false)
    setSshPass("")
    setPassError("")
    setPassModal(true)
  }

  const doRemove = async () => {
    const cid = removeTarget()
    if (!cid) return
    if (!sshPass()) { setPassError("SSH password required."); return }
    setPassModal(false)
    setActionLoading({ ...actionLoading(), [cid]: "remove" })
    try {
      await dockerApi.removeContainer(props.hostId, cid, sshPass())
      refetch()
    } catch (e: any) {
      alert(`Remove failed: ${e.message}`)
    }
    setActionLoading({ ...actionLoading(), [cid]: "" })
    setSshPass("")
  }

  // Bulk remove — asks SSH password
  const promptBulkRemove = () => {
    const ids = Array.from(bulkSelected())
    if (!ids.length) return
    setRemoveTarget(null)
    setBulkRemoveMode(true)
    setSshPass("")
    setPassError("")
    setPassModal(true)
  }

  const doBulkRemove = async () => {
    const ids = Array.from(bulkSelected())
    if (!ids.length) return
    if (!sshPass()) { setPassError("SSH password required."); return }
    setPassModal(false)
    try {
      for (const cid of ids) {
        await dockerApi.removeContainer(props.hostId, cid, sshPass())
      }
      setBulkSelected(new Set())
      refetch()
    } catch (e: any) {
      alert(`Bulk remove failed: ${e.message}`)
    }
    setSshPass("")
  }

  // Bulk actions (start/stop/restart — no password needed)
  const toggleBulk = (id: string) => {
    const s = new Set(bulkSelected())
    if (s.has(id)) s.delete(id); else s.add(id)
    setBulkSelected(s)
  }

  const toggleAll = () => {
    if (bulkSelected().size === filtered().length) {
      setBulkSelected(new Set())
    } else {
      setBulkSelected(new Set(filtered().map((c: any) => c.container_id)))
    }
  }

  const bulkAction = async (action: string) => {
    const ids = Array.from(bulkSelected())
    if (!ids.length) return
    if (!confirm(`${action} ${ids.length} container(s)?`)) return
    try {
      await dockerApi.bulkContainerAction(props.hostId, ids, action)
      setBulkSelected(new Set())
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div class="space-y-4">
      {/* Toolbar */}
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-3 sm:p-4">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
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
          <button onClick={refetch}
            class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700">
            ⟳ Refresh
          </button>
        </div>

        {/* Bulk actions bar */}
        <Show when={bulkSelected().size > 0}>
          <div class="mt-3 flex items-center gap-3 p-2 bg-blue-900/20 border border-blue-800 rounded-lg">
            <span class="text-xs text-blue-300">{bulkSelected().size} selected</span>
            <button onClick={() => bulkAction("start")}
              class="px-2.5 py-1 bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 rounded text-xs border border-emerald-800">▶ Start All</button>
            <button onClick={() => bulkAction("stop")}
              class="px-2.5 py-1 bg-red-900/30 hover:bg-red-800/50 text-red-400 rounded text-xs border border-red-800">⏹ Stop All</button>
            <button onClick={() => bulkAction("restart")}
              class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs border border-slate-600">🔄 Restart All</button>
            <button onClick={promptBulkRemove}
              class="px-2.5 py-1 bg-red-900/30 hover:bg-red-800/50 text-red-400 rounded text-xs border border-red-800">🗑 Remove All</button>
            <button onClick={() => setBulkSelected(new Set())}
              class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs border border-slate-600 ml-auto">Clear</button>
          </div>
        </Show>
      </div>

      {/* Table */}
      <div class="bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
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
                  <th class="px-4 py-3 w-8">
                    <input type="checkbox" checked={bulkSelected().size === filtered().length && filtered().length > 0}
                      onChange={toggleAll} class="accent-blue-500" />
                  </th>
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
                      <td class="px-4 py-3">
                        <input type="checkbox" checked={bulkSelected().has(c.container_id)}
                          onChange={() => toggleBulk(c.container_id)} class="accent-blue-500" />
                      </td>
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
                            onClick={() => promptRemove(c.container_id)}
                            disabled={actionLoading()[c.container_id] === "remove"}
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

      {/* SSH Password Confirmation Modal */}
      <Show when={passModal()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => { setPassModal(false); setRemoveTarget(null); }}>
          <div class="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-white font-semibold text-sm mb-1">
              {removeTarget() ? "Remove container?" : `Remove ${bulkSelected().size} container${bulkSelected().size !== 1 ? 's' : ''}?`}
            </h3>
            <p class="text-slate-400 text-xs mb-4">Enter SSH password for this host to proceed.</p>
            <div class="relative mb-3">
              <input
                type={showSshPass() ? "text" : "password"}
                value={sshPass()}
                onInput={(e) => setSshPass(e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Enter" && (removeTarget() ? doRemove() : doBulkRemove())}
                placeholder="SSH password"
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowSshPass(!showSshPass())}
                class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >{showSshPass() ? "Hide" : "Show"}</button>
            </div>
            <Show when={passError()}>
              <p class="text-xs text-red-400 mb-2">{passError()}</p>
            </Show>
            <div class="flex gap-2 justify-end">
              <button onClick={() => { setPassModal(false); setRemoveTarget(null); }}
                class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">Cancel</button>
              <button onClick={() => removeTarget() ? doRemove() : doBulkRemove()}
                class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs">Delete</button>
            </div>
          </div>
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
