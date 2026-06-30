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
    return list.filter((v: any) => v.name.toLowerCase().includes(q) || v.driver?.toLowerCase().includes(q))
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
    <div>
      <div class="flex items-center justify-between mb-4">
        <input value={search()} onInput={(e) => setSearch(e.currentTarget.value)}
          placeholder="Search volumes..." class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 w-64" />
        <button onClick={refetch}
          class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700">⟳ Refresh</button>
      </div>

      <Show when={!volumes.loading} fallback={
        <div class="space-y-2">{[1,2,3].map(() => <div class="h-14 bg-slate-800/50 rounded-lg animate-pulse"></div>)}</div>
      }>
        <Show when={filtered().length > 0} fallback={
          <div class="text-center py-12 text-slate-500 text-sm">{search() ? "No volumes match." : "No volumes found."}</div>
        }>
          <div class="space-y-2">
            <For each={filtered()}>
              {(vol: any) => (
                <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors flex items-center justify-between">
                  <div>
                    <p class="text-white text-sm font-mono">{vol.name}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Driver: {vol.driver} · {vol.size}</p>
                    <Show when={vol.mountpoint}>
                      <p class="text-xs text-slate-600 font-mono truncate mt-0.5" title={vol.mountpoint}>{vol.mountpoint}</p>
                    </Show>
                  </div>
                  <button
                    onClick={() => removeVolume(vol.name)}
                    disabled={removing() === vol.name}
                    class="ml-4 px-3 py-1.5 bg-slate-700 hover:bg-red-900/30 text-slate-400 hover:text-red-400 rounded-lg text-xs disabled:opacity-50"
                  >
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
