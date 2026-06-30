import { createSignal, createResource, For, Show } from "solid-js"
import { dockerApi } from "../../lib/docker-api"

export default function ImageList(props: { hostId: string }) {
  const [search, setSearch] = createSignal("")
  const [pulling, setPulling] = createSignal(false)
  const [pullImage, setPullImage] = createSignal("")
  const [pullError, setPullError] = createSignal("")
  const [actionLoading, setActionLoading] = createSignal<Record<string, boolean>>({})

  const [images, { refetch }] = createResource(() => props.hostId, (id) => dockerApi.listImages(id))

  const filtered = () => {
    const q = search().toLowerCase()
    const list = images() || []
    if (!q) return list
    return list.filter((i: any) => i.repo_tags?.some((t: string) => t.toLowerCase().includes(q)) || i.id.toLowerCase().includes(q))
  }

  const handlePull = async () => {
    if (!pullImage()) return
    setPulling(true)
    setPullError("")
    try {
      await dockerApi.pullImage(props.hostId, pullImage())
      setPullImage("")
      refetch()
    } catch (e: any) {
      setPullError(e.message)
    }
    setPulling(false)
  }

  const removeImage = async (imageId: string) => {
    if (!confirm("Remove this image?")) return
    setActionLoading({ ...actionLoading(), [imageId]: true })
    try {
      await dockerApi.removeImage(props.hostId, imageId)
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
    setActionLoading({ ...actionLoading(), [imageId]: false })
  }

  return (
    <div>
      {/* Pull Form */}
      <div class="flex gap-2 mb-4">
        <input
          value={pullImage()}
          onInput={(e) => setPullImage(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePull()}
          placeholder="Image to pull (e.g. nginx:alpine)"
          class="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
        />
        <button onClick={handlePull} disabled={pulling() || !pullImage()}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
          {pulling() ? "Pulling..." : "Pull Image"}
        </button>
      </div>
      <Show when={pullError()}>
        <p class="text-sm text-red-400 mb-3">{pullError()}</p>
      </Show>

      {/* Search */}
      <div class="flex items-center justify-between mb-3">
        <input
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          placeholder="Search images..."
          class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 w-64"
        />
        <button onClick={refetch} class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700">
          ⟳ Refresh
        </button>
      </div>

      {/* Grid */}
      <Show when={!images.loading} fallback={
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">{[1,2,3,4].map(() => <div class="h-20 bg-slate-800/50 rounded-xl animate-pulse"></div>)}</div>
      }>
        <Show when={filtered().length > 0} fallback={
          <div class="text-center py-12 text-slate-500 text-sm">{search() ? "No images match." : "No images found."}</div>
        }>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <For each={filtered()}>
              {(img: any) => (
                <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
                  <div class="flex justify-between items-start">
                    <div class="flex-1 min-w-0">
                      <p class="text-white text-sm font-medium truncate" title={img.repo_tags?.[0]}>
                        {img.repo_tags?.[0] || "<none>"}
                      </p>
                      <div class="text-xs text-slate-500 mt-1 space-y-0.5">
                        <p>ID: <span class="text-slate-400 font-mono">{img.id?.slice(7, 19)}</span></p>
                        <p>Size: <span class="text-slate-400">{img.size}</span></p>
                        <p>Created: <span class="text-slate-400">{img.created?.slice(0, 10)}</span></p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeImage(img.id)}
                      disabled={actionLoading()[img.id]}
                      class="ml-2 p-1.5 bg-slate-700 hover:bg-red-900/30 text-slate-400 hover:text-red-400 rounded text-xs disabled:opacity-50"
                    >🗑</button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  )
}
