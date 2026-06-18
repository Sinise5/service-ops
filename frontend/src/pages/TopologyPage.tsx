import { createSignal, onMount, For, Show } from 'solid-js'
import { Network, AlertCircle, TrendingUp, GitBranch } from 'lucide-solid'
import { api } from '../lib/api'

interface Asset {
  id: string
  name: string
  type: string
}

interface Dependency {
  id: string
  source_asset_id: string
  target_asset_id: string
  dependency_type: string
  source_name?: string
  target_name?: string
}

interface GraphNode {
  id: string
  label: string
  type: string
}

interface GraphEdge {
  from: string
  to: string
  type: string
}

export default function TopologyPage() {
  const [assets, setAssets] = createSignal<Asset[]>([])
  const [dependencies, setDependencies] = createSignal<Dependency[]>([])
  const [selectedAsset, setSelectedAsset] = createSignal<string | null>(null)
  const [impactAnalysis, setImpactAnalysis] = createSignal<any>(null)
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal("")

  const loadAssets = async () => {
    try {
      const data = await api.get<Asset[]>("/assets")
      setAssets(data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assets")
    }
  }

  const loadDependencies = async () => {
    try {
      const data = await api.get<{ edges: Dependency[]; nodes: GraphNode[] }>("/topology/graph")
      setDependencies(data?.edges || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load topology")
    }
  }

  const loadImpact = async (assetId: string) => {
    setLoading(true)
    setError("")
    try {
      const data = await api.get(`/topology/assets/${assetId}/impact`)
      setImpactAnalysis(data || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load impact analysis")
    } finally {
      setLoading(false)
    }
  }

  const getDependencyIcon = (type: string) => {
    if (type === 'network') return <Network class="w-4 h-4 text-blue-400" />
    if (type === 'data') return <AlertCircle class="w-4 h-4 text-purple-400" />
    return <TrendingUp class="w-4 h-4 text-green-400" />
  }

  onMount(() => {
    loadAssets()
    loadDependencies()
  })

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-100">Topology & Dependencies</h1>
      </div>

      <Show when={error()}>
        <div class="bg-red-900/50 border border-red-700 rounded p-3 text-red-200 text-sm">
          {error()}
        </div>
      </Show>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <GitBranch class="w-5 h-5" />
            Dependency Graph
          </h2>
          <div class="bg-slate-800/50 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
            <div class="text-center text-slate-400">
              <Network class="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p class="text-sm">Visual graph rendering (integrate vis.js/d3.js)</p>
              <p class="text-xs mt-2">{dependencies().length} dependencies loaded</p>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-slate-100 mb-3">Select Asset</h3>
            <select
              onChange={(e) => {
                setSelectedAsset(e.currentTarget.value)
                if (e.currentTarget.value) loadImpact(e.currentTarget.value)
              }}
              class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
            >
              <option value="">Choose asset...</option>
              <For each={assets()}>
                {(asset) => <option value={asset.id}>{asset.name}</option>}
              </For>
            </select>
          </div>

          <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <AlertTriangle class="w-4 h-4 text-yellow-400" />
              Impact Analysis
            </h3>
            {impactAnalysis() ? (
              <div class="space-y-2">
                <div class="text-sm">
                  <span class="text-slate-400">Upstream:</span>
                  <span class="ml-2 text-slate-100">{impactAnalysis().upstream_count || 0}</span>
                </div>
                <div class="text-sm">
                  <span class="text-slate-400">Downstream:</span>
                  <span class="ml-2 text-slate-100">{impactAnalysis().downstream_count || 0}</span>
                </div>
                <div class="text-sm">
                  <span class="text-slate-400">Total Impact:</span>
                  <span class="ml-2 text-slate-100">{impactAnalysis().total_impacted || 0}</span>
                </div>
              </div>
            ) : (
              <p class="text-sm text-slate-400">Select an asset to analyze impact</p>
            )}
          </div>
        </div>
      </div>

      <div class="bg-slate-900/50 border border-slate-800 rounded-lg">
        <div class="p-4 border-b border-slate-800">
          <h2 class="text-lg font-semibold text-slate-100">All Dependencies</h2>
        </div>
        <div class="divide-y divide-slate-800">
          <For each={dependencies()}>
            {(dep) => (
              <div class="p-4 hover:bg-slate-800/50 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    {getDependencyIcon(dep.dependency_type)}
                    <div>
                      <p class="text-sm text-slate-100">
                        <span class="font-medium">{dep.source_name || dep.source_asset_id}</span>
                        <span class="text-slate-400 mx-2">→</span>
                        <span class="font-medium">{dep.target_name || dep.target_asset_id}</span>
                      </p>
                      <p class="text-xs text-slate-400 capitalize">{dep.dependency_type}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}