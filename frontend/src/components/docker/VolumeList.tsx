import { createSignal, createResource, For, Show } from "solid-js"
import { dockerApi } from "../../api/docker-api"

export default function VolumeList(props: { hostId: string }) {
  const [search, setSearch] = createSignal("")
  const [removing, setRemoving] = createSignal("")

  const [volumes, { refetch }] = createResource(() => props.hostId, (id) => dockerApi.listVolumes(id))

  const filtered = () => {
    const q = search().toLowerCase()
    const list = volumes() || []
    if (!q) return list
    return list.filter((v: any) =>
      v.name.toLowerCase().includes(q) || v.driver?.toLowerCase().includes(q)
    )
  }

  const removeVolume = async (name: string) => {
    if (!confirm(`Remove volume "${name}"? Data will be lost.`)) return
    setRemoving(name)
    try {
      await dockerApi.removeVolume(props.hostId, name)
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
    setRemoving("")
  }

  return (
    <div class="space-y-4">
      {/* Toolbar */}
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-3 sm:p-4">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <input
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search volumes..."
            class="flex-1 max-w-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500"
          />
          <button onClick={refetch}
            class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 whitespace-nowrap">
            ⟳ Refresh
          </button>
        </div>
        <div class="mt-2 text-xs text-slate-500">
          Showing {filtered().length} of {volumes()?.length || 0} volumes
        </div>
      </div>

      {/* Volume list */}
      <Show when={!volumes.loading} fallback={
        <div class="space-y-2">
          {[1, 2, 3].map(() => (
            <div class="h-16 bg-slate-900 border border-slate-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
      }>
        <Show when={filtered().length > 0} fallback={
          <div class="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-sm text-slate-500">
            {search() ? "No volumes match your search." : "No volumes found."}
          </div>
        }>
          <div class="space-y-2">
            <For each={filtered()}>
              {(vol: any) => (
                <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-slate-700 transition-colors">
                  <div class="min-w-0 flex-1">
                    <p class="text-white text-sm font-medium font-mono truncate" title={vol.name}>{vol.name}</p>
                    <div class="flex gap-4 mt-1 text-xs text-slate-500">
                      <span>Driver: <span class="text-slate-300">{vol.driver}</span></span>
                      <span>Size: <span class="text-slate-300">{vol.size || "—"}</span></span>
                    </div>
                    <Show when={vol.mountpoint}>
                      <p class="text-xs text-slate-600 font-mono truncate mt-0.5" title={vol.mountpoint}>{vol.mountpoint}</p>
                    </Show>
                  </div>
                  <button
                    onClick={() => removeVolume(vol.name)}
                    disabled={removing() === vol.name}
                    class="px-3 py-1.5 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 rounded-lg text-xs border border-slate-700 disabled:opacity-50 whitespace-nowrap">
                    {removing() === vol.name ? "Removing..." : "Remove"}
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  )
}
