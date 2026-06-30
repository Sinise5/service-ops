import { createSignal, createResource, For, Show } from "solid-js"
import { dockerApi } from "../../api/docker-api"

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
    <div class="space-y-4">
      {/* Pull Image */}
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-3 sm:p-4">
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            value={pullImage()}
            onInput={(e) => setPullImage(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePull()}
            placeholder="Image to pull (e.g. nginx:alpine)"
            class="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
          />
          <button onClick={handlePull} disabled={pulling() || !pullImage()}
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 whitespace-nowrap">
            {pulling() ? "Pulling..." : "Pull Image"}
          </button>
        </div>
        <Show when={pullError()}>
          <p class="text-sm text-red-400 mt-2">{pullError()}</p>
        </Show>
      </div>

      {/* Search + refresh */}
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-3 sm:p-4">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <input
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search images..."
            class="flex-1 s:flex-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 max-w-xs"
          />
          <button onClick={refetch}
            class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 whitespace-nowrap">
            ⟳ Refresh
          </button>
        </div>
      </div>

      {/* Image grid */}
      <Show when={!images.loading} fallback={
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <For each={[1,2,3,4]}>
            {() => <div class="h-24 bg-slate-900 border border-slate-800 rounded-lg animate-pulse"></div>}
          </For>
        </div>
      }>
        <Show when={filtered().length > 0} fallback={
          <div class="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-sm text-slate-500">
            {search() ? "No images match." : "No images found."}
          </div>
        }>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <For each={filtered()}>
              {(img: any) => (
                <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
                  <div class="flex justify-between items-start gap-2">
                    <div class="min-w-0 flex-1">
                      <p class="text-white text-sm font-medium truncate" title={img.repo_tags?.[0]}>
                        {img.repo_tags?.[0] || "<none>"}
                      </p>
                      <div class="text-xs text-slate-500 mt-1.5 space-y-0.5">
                        <p>ID: <span class="text-slate-400 font-mono">{img.id?.slice(7, 19)}</span></p>
                        <p>Size: <span class="text-slate-400">{img.size || "—"}</span></p>
                        <p>Created: <span class="text-slate-400">{img.created?.slice(0, 10) || "—"}</span></p>
                      </div>
                      <Show when={img.repo_tags?.length > 1}>
                        <div class="flex gap-1 flex-wrap mt-1.5">
                          <For each={img.repo_tags.slice(1)}>
                            {(tag: string) => (
                              <span class="px-1 py-0.5 bg-slate-800 rounded text-xs text-slate-400">{tag}</span>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                    <button
                      onClick={() => removeImage(img.id)}
                      disabled={actionLoading()[img.id]}
                      class="px-2 py-1 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 rounded text-xs disabled:opacity-50 flex-shrink-0"
                    >🗑 Remove</button>
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
