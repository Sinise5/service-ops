import { createSignal, onMount, For, Show } from "solid-js"
import { useAuth } from "../stores/AuthStore"
import Layout from "../components/Layout"
import { api } from "../lib/api"

export default function AssetsPage() {
  const auth = useAuth()
  const [assets, setAssets] = createSignal([])
  const [assetTypes, setAssetTypes] = createSignal([])
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal("")
  const [showForm, setShowForm] = createSignal(false)
  const [editingId, setEditingId] = createSignal<string | null>(null)
  const [formData, setFormData] = createSignal({ name: "", description: "", asset_type_id: "" })
  
  // Filter state
  const [selectedType, setSelectedType] = createSignal<string>("")
  const [searchQuery, setSearchQuery] = createSignal("")
  
  // Filtered assets
  const filteredAssets = () => {
    let result = assets()
    
    // Filter by type
    if (selectedType()) {
      result = result.filter((a: any) => a.asset_type_id === selectedType())
    }
    
    // Filter by search query
    if (searchQuery()) {
      const query = searchQuery().toLowerCase()
      result = result.filter((a: any) => 
        a.name?.toLowerCase().includes(query) || 
        a.description?.toLowerCase().includes(query)
      )
    }
    
    return result
  }

  onMount(async () => {
    try {
      const [assetsData, typesData] = await Promise.all([
        api.get<any[]>("/assets"),
        api.get<any[]>("/asset-types")
      ])
      setAssets(assetsData || [])
      setAssetTypes(typesData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets")
    } finally {
      setLoading(false)
    }
  })

  const handleCreateAsset = async (e: Event) => {
    e.preventDefault()
    const fd = formData()
    if (!fd.name || !fd.asset_type_id) {
      setError("Name and asset type required")
      return
    }
    setError("")
    try {
      const editing = editingId()
      if (editing) {
        await api.put(`/assets/${editing}`, fd)
      } else {
        await api.post("/assets", fd)
      }
      setFormData({ name: "", description: "", asset_type_id: "" })
      setEditingId(null)
      setShowForm(false)
      const updatedAssets = await api.get<any[]>("/assets")
      setAssets(updatedAssets || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save asset")
    }
  }

  const handleEdit = (asset: any) => {
    setEditingId(asset.id)
    setFormData({ name: asset.name, description: asset.description, asset_type_id: asset.asset_type_id })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this asset?')) return
    setError("")
    try {
      await api.delete(`/assets/${id}`)
      const updatedAssets = await api.get<any[]>("/assets")
      setAssets(updatedAssets || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete asset")
    }
  }

  return (
    <Layout>
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold text-white">Assets</h1>
          <button
            onClick={() => setShowForm(!showForm())}
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
          >
            {showForm() ? "Cancel" : "+ Add Asset"}
          </button>
        </div>

        <Show when={error()}>
          <div class="bg-red-900/50 border border-red-700 rounded p-3 text-red-200 text-sm">
            {error()}
          </div>
        </Show>

        {/* Filter bar */}
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div class="flex gap-4">
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={selectedType()}
              onChange={(e) => setSelectedType(e.currentTarget.value)}
              class="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Types</option>
              <For each={assetTypes()}>
                {(type: any) => <option value={type.id}>{type.name}</option>}
              </For>
            </select>
          </div>
          <div class="mt-2 text-xs text-slate-500">
            Showing {filteredAssets().length} of {assets().length} assets
          </div>
        </div>

        <Show when={showForm()}>
          <form onSubmit={handleCreateAsset} class="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <h2 class="text-lg font-semibold text-white">{editingId() ? "Edit Asset" : "Create Asset"}</h2>
            <input
              type="text"
              placeholder="Asset Name"
              value={formData().name}
              onInput={(e) => setFormData({ ...formData(), name: e.currentTarget.value })}
              class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
            <textarea
              placeholder="Description"
              value={formData().description}
              onInput={(e) => setFormData({ ...formData(), description: e.currentTarget.value })}
              class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              rows="3"
            />
            <select
              value={formData().asset_type_id}
              onInput={(e) => setFormData({ ...formData(), asset_type_id: e.currentTarget.value })}
              class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Select Asset Type</option>
              <For each={assetTypes()}>
                {(type: any) => <option value={type.id}>{type.name}</option>}
              </For>
            </select>
            <div class="flex gap-2">
              <button
                type="submit"
                class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
              >
                {editingId() ? "Update Asset" : "Create Asset"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                  setFormData({ name: "", description: "", asset_type_id: "" })
                }}
                class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Show>

        <Show when={!loading()} fallback={<div class="text-slate-400">Loading assets...</div>}>
          <div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <table class="w-full">
              <thead class="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th class="px-6 py-3 text-left text-sm font-medium text-slate-300">Name</th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-slate-300">Type</th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-slate-300">Status</th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-slate-300">Created</th>
                  <th class="px-6 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700">
                <For each={filteredAssets()} fallback={
                  <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-slate-400 text-sm">
                      No assets found
                    </td>
                  </tr>
                }>
                  {(asset: any) => (
                    <tr class="hover:bg-slate-800/50 transition-colors">
                      <td class="px-6 py-3 text-sm text-white">{asset.name}</td>
                      <td class="px-6 py-3 text-sm text-slate-400">{asset.asset_type_name || asset.asset_type_id}</td>
                      <td class="px-6 py-3 text-sm">
                        <span class="px-2 py-1 bg-green-900/50 border border-green-700 text-green-200 rounded text-xs">
                          {asset.status || "active"}
                        </span>
                      </td>
                      <td class="px-6 py-3 text-sm text-slate-400">
                        {new Date(asset.created_at).toLocaleDateString()}
                      </td>
                      <td class="px-6 py-3 text-sm">
                        <div class="flex gap-2">
                          <button
                            onClick={() => handleEdit(asset)}
                            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(asset.id)}
                            class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
            <Show when={assets().length === 0}>
              <div class="px-6 py-8 text-center text-slate-400">No assets yet. Create one to get started!</div>
            </Show>
          </div>
        </Show>
      </div>
    </Layout>
  )
}
