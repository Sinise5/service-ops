import { createSignal, createResource, For, Show, createMemo } from "solid-js"
import { dockerApi } from "../../api/docker-api"

export default function ImageList(props: { hostId: string }) {
  const [search, setSearch] = createSignal("")
  const [pulling, setPulling] = createSignal(false)
  const [pullImage, setPullImage] = createSignal("")
  const [pullError, setPullError] = createSignal("")
  const [actionLoading, setActionLoading] = createSignal<Record<string, boolean>>({})
  const [pruning, setPruning] = createSignal(false)
  const [hideNone, setHideNone] = createSignal(true)
  const [selected, setSelected] = createSignal<Set<string>>(new Set())
  const [passModal, setPassModal] = createSignal(false)
  const [sshPass, setSshPass] = createSignal("")
  const [bulkDeleting, setBulkDeleting] = createSignal(false)
  const [bulkError, setBulkError] = createSignal("")

  const [images, { refetch }] = createResource(() => props.hostId, (id) => dockerApi.listImages(id))

  const pruneImages = async () => {
    if (!confirm("Prune unused images? This removes dangling/unused images.")) return
    setPruning(true)
    try {
      const result = await dockerApi.systemPrune(props.hostId, "images")
      alert(result.output || "Prune complete")
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
    setPruning(false)
  }

  const handlePull = async () => {
    const img = pullImage().trim()
    if (!img) return
    setPulling(true)
    setPullError("")
    try {
      const result = await dockerApi.pullImage(props.hostId, img)
      refetch()
      setPullImage("")
      alert(result || "Pull complete")
    } catch (e: any) {
      setPullError(e.message)
    }
    setPulling(false)
  }

  const hasNoneTag = (img: any) => {
    return !img.repository || img.repository === "<none>"
  }

  const imageTag = (img: any) => {
    if (!img.repository || img.repository === "<none>") return "<none>"
    return `${img.repository}:${img.tag}`
  }

  const filtered = createMemo(() => {
    const q = search().toLowerCase()
    const list = images() || []
    let result = list
    if (hideNone()) result = result.filter((i: any) => !hasNoneTag(i))
    if (q) result = result.filter((i: any) => {
      return (i.repository || "").toLowerCase().includes(q) ||
        (i.image_id || "").toLowerCase().includes(q) ||
        (i.tag || "").toLowerCase().includes(q)
    })
    return result
  })

  const noneImages = createMemo(() => {
    if (!images()) return []
    return (images() || []).filter((i: any) => hasNoneTag(i))
  })

  const toggleSelect = (id: string) => {
    const next = new Set(selected())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleAll = () => {
    const cur = filtered()
    const sel = selected()
    const allSelected = cur.every((i: any) => sel.has(i.id))
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(cur.map((i: any) => i.id)))
  }

  // SSH password confirm → bulk delete selected <none> images
  const confirmBulkDeleteNone = () => {
    const noneIds = noneImages().map((i: any) => i.id)
    if (noneIds.length === 0) { alert("No <none> images to delete."); return }
    setSshPass("")
    setBulkError("")
    setPassModal(true)
  }

  const doBulkDelete = async () => {
    const ids = [...selected()]
    if (ids.length === 0) { alert("Select images first."); return }
    if (!sshPass()) { setBulkError("SSH password required."); return }
    setPassModal(false)
    setBulkDeleting(true)
    setBulkError("")
    try {
      const result = await dockerApi.bulkRemoveImages(props.hostId, ids)
      const errors = (result.results || []).filter((r: any) => r.status === "error")
      if (errors.length > 0) {
        setBulkError(`Deleted ${ids.length - errors.length}/${ids.length}. Errors: ${errors.map((e: any) => e.message).join("; ")}`)
      }
      refetch()
      setSelected(new Set())
    } catch (e: any) {
      setBulkError(e.message)
    }
    setBulkDeleting(false)
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

      {/* Toolbar: search, filters, actions */}
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-3 sm:p-4">
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <span class="text-xs text-slate-400 font-medium">
            {filtered().length} / {(images() || []).length} images
          </span>
          <input
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search..."
            class="flex-1 min-w-[120px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 max-w-xs"
          />
          <label class="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap cursor-pointer">
            <input type="checkbox" checked={hideNone()} onChange={(e) => setHideNone(e.currentTarget.checked)} class="accent-blue-500" />
            Hide &lt;none&gt;
          </label>
          <button onClick={refetch}
            class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 whitespace-nowrap">⟳ Refresh</button>
          <button onClick={pruneImages} disabled={pruning()}
            class="px-3 py-1.5 bg-orange-900/30 hover:bg-orange-800/50 text-orange-400 rounded-lg text-xs border border-orange-800 whitespace-nowrap disabled:opacity-50">
            {pruning() ? "..." : "🧹 Prune"}
          </button>
          <div class="flex gap-1 ml-auto">
            <Show when={selected().size > 0}>
              <button
                onClick={doBulkDelete}
                disabled={bulkDeleting()}
                class="px-3 py-1.5 bg-red-900/30 hover:bg-red-800/40 text-red-400 rounded-lg text-xs border border-red-800 whitespace-nowrap disabled:opacity-50"
              >🗑 Delete {selected().size}</button>
            </Show>
            <Show when={noneImages().length > 0}>
              <button onClick={confirmBulkDeleteNone}
                class="px-3 py-1.5 bg-yellow-900/30 hover:bg-yellow-800/40 text-yellow-400 rounded-lg text-xs border border-yellow-800 whitespace-nowrap">
                🧹 Delete {noneImages().length} &lt;none&gt;
              </button>
            </Show>
          </div>
        </div>
        <Show when={bulkError()}>
          <p class="text-sm text-red-400 mt-2">{bulkError()}</p>
        </Show>
      </div>

      {/* SSH Password Confirmation Modal */}
      <Show when={passModal()}>
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setPassModal(false)}>
          <div class="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-white font-semibold text-sm mb-1">Confirm delete {noneImages().length} &lt;none&gt; images</h3>
            <p class="text-slate-400 text-xs mb-4">Enter SSH password for this host to proceed.</p>
            <input
              type="password"
              value={sshPass()}
              onInput={(e) => setSshPass(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && doBulkDelete()}
              placeholder="SSH password"
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 mb-3"
            />
            <Show when={bulkError()}>
              <p class="text-xs text-red-400 mb-2">{bulkError()}</p>
            </Show>
            <div class="flex gap-2 justify-end">
              <button onClick={() => setPassModal(false)}
                class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">Cancel</button>
              <button onClick={doBulkDelete}
                class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs">Delete</button>
            </div>
          </div>
        </div>
      </Show>

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
          {/* Select all checkbox */}
          <div class="flex items-center gap-2 px-1 mb-1">
            <input
              type="checkbox"
              checked={filtered().length > 0 && filtered().every((i: any) => selected().has(i.id))}
              onChange={toggleAll}
              class="accent-blue-500"
            />
            <span class="text-xs text-slate-500">Select all</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <For each={filtered()}>
              {(img: any) => (
                <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors" classList={{ "border-blue-600": selected().has(img.id) }}>
                  <div class="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected().has(img.id)}
                      onChange={() => toggleSelect(img.id)}
                      class="accent-blue-500 mt-1 flex-shrink-0"
                    />
                    <div class="min-w-0 flex-1">
                      <p class="text-white text-sm font-medium truncate" title={imageTag(img)}>
                        {imageTag(img)}
                      </p>
                      <div class="text-xs text-slate-500 mt-1.5 space-y-0.5">
                        <p>ID: <span class="text-slate-400 font-mono">{img.image_id?.slice(0, 12)}</span></p>
                        <p>Size: <span class="text-slate-400">{img.size || "—"}</span></p>
                        <p>Created: <span class="text-slate-400">{img.created?.slice(0, 10) || "—"}</span></p>
                      </div>
                      <Show when={(img.repo_tags?.length || 0) > 1}>
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
