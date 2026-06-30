import { createSignal, createResource, For, Show } from "solid-js"
import { dockerApi } from "../../api/docker-api"

export default function DeployForm(props: { hostId: string }) {
  const [selectedTemplate, setSelectedTemplate] = createSignal<any>(null)
  const [deploying, setDeploying] = createSignal(false)
  const [error, setError] = createSignal("")
  const [success, setSuccess] = createSignal("")
  const [templates] = createResource(() => dockerApi.listTemplates())

  const [form, setForm] = createSignal({
    image: "", container_name: "", command: "", workdir: "",
    restart_policy: "unless-stopped",
    network: "",
  })
  const [ports, setPorts] = createSignal<{ host: number; container: number }[]>([{ host: 8080, container: 80 }])
  const [envs, setEnvs] = createSignal<{ key: string; value: string }[]>([])
  const [volumes, setVolumes] = createSignal<{ host: string; container: string; readOnly: boolean }[]>([])

  const update = (key: string, value: any) => setForm({ ...form(), [key]: value })

  const applyTemplate = (t: any) => {
    setSelectedTemplate(t)
    setForm({ ...form(), image: t.image, restart_policy: t.restart_policy })
    setPorts(t.default_ports?.map((p: any) => ({ host: p.host_port, container: p.container_port })) || [])
    setEnvs(t.default_envs?.map((e: any) => ({ key: e.key, value: e.value })) || [])
    setVolumes(t.default_volumes?.map((v: any) => ({ host: v.host_path, container: v.container_path, readOnly: v.read_only })) || [])
  }

  const handleDeploy = async () => {
    if (!form().image || !form().container_name) return
    setDeploying(true)
    setError("")
    setSuccess("")
    try {
      await dockerApi.deployContainer(props.hostId, {
        image: form().image,
        container_name: form().container_name,
        command: form().command || undefined,
        workdir: form().workdir || undefined,
        restart_policy: form().restart_policy,
        network: form().network || undefined,
        ports: ports().map((p) => ({ host_port: p.host, container_port: p.container, protocol: "tcp" })),
        envs: envs().filter((e) => e.key),
        volumes: volumes().filter((v) => v.host && v.container).map((v) => ({
          host_path: v.host, container_path: v.container, read_only: v.readOnly,
        })),
      })
      setSuccess(`Container "${form().container_name}" deployed successfully!`)
      setForm({ image: "", container_name: "", command: "", workdir: "", restart_policy: "unless-stopped", network: "" })
      setPorts([{ host: 8080, container: 80 }])
      setEnvs([])
      setVolumes([])
      setSelectedTemplate(null)
    } catch (e: any) {
      setError(e.message)
    }
    setDeploying(false)
  }

  return (
    <div class="space-y-4">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 class="text-lg font-semibold text-white">Deploy from Template</h2>
      </div>

      {/* Template buttons */}
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-3 sm:p-4">
        <div class="flex flex-wrap gap-2">
          <For each={templates()?.filter((t: any) => t.is_system)}>
            {(t: any) => (
              <button
                onClick={() => applyTemplate(t)}
                class={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  selectedTemplate()?.id === t.id
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600"
                }`}
              >
                {t.name}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Form */}
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-6">
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-slate-400 mb-1">Image</label>
                <input value={form().image} onInput={(e) => update("image", e.currentTarget.value)}
                  class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="nginx:alpine" />
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1">Container Name</label>
                <input value={form().container_name} onInput={(e) => update("container_name", e.currentTarget.value)}
                  class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="my-app" />
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1">Restart Policy</label>
                <select value={form().restart_policy} onChange={(e) => update("restart_policy", e.currentTarget.value)}
                  class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="no">no</option>
                  <option value="always">always</option>
                  <option value="unless-stopped">unless-stopped</option>
                  <option value="on-failure">on-failure</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1">Network (optional)</label>
                <input value={form().network} onInput={(e) => update("network", e.currentTarget.value)}
                  class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="host / bridge / network name" />
              </div>
            </div>

            <div class="space-y-3">
              {/* Ports */}
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs text-slate-400">Port Mappings</label>
                  <button onClick={() => setPorts([...ports(), { host: 8080, container: 80 }])}
                    class="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
                </div>
                <For each={ports()}>
                  {(p, i) => (
                    <div class="flex gap-1 mb-1 items-center">
                      <input type="number" value={p.host}
                        onInput={(e) => { const c = [...ports()]; c[i()].host = parseInt(e.currentTarget.value); setPorts(c) }}
                        class="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" />
                      <span class="text-slate-500 text-xs self-center">→</span>
                      <input type="number" value={p.container}
                        onInput={(e) => { const c = [...ports()]; c[i()].container = parseInt(e.currentTarget.value); setPorts(c) }}
                        class="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" />
                      <button onClick={() => setPorts(ports().filter((_, j) => j !== i()))}
                        class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                    </div>
                  )}
                </For>
              </div>

              {/* Env vars */}
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs text-slate-400">Env Vars</label>
                  <button onClick={() => setEnvs([...envs(), { key: "", value: "" }])}
                    class="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
                </div>
                <For each={envs()}>
                  {(e, i) => (
                    <div class="flex gap-1 mb-1">
                      <input value={e.key}
                        onInput={(ev) => { const c = [...envs()]; c[i()].key = ev.currentTarget.value; setEnvs(c) }}
                        class="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="KEY" />
                      <input value={e.value}
                        onInput={(ev) => { const c = [...envs()]; c[i()].value = ev.currentTarget.value; setEnvs(c) }}
                        class="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="value" />
                      <button onClick={() => setEnvs(envs().filter((_, j) => j !== i()))}
                        class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                    </div>
                  )}
                </For>
              </div>

              {/* Volumes */}
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs text-slate-400">Volumes</label>
                  <button onClick={() => setVolumes([...volumes(), { host: "", container: "", readOnly: false }])}
                    class="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
                </div>
                <For each={volumes()}>
                  {(v, i) => (
                    <div class="flex gap-1 mb-1 items-center">
                      <input value={v.host}
                        onInput={(ev) => { const c = [...volumes()]; c[i()].host = ev.currentTarget.value; setVolumes(c) }}
                        class="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="/host" />
                      <span class="text-slate-500 text-xs">→</span>
                      <input value={v.container}
                        onInput={(ev) => { const c = [...volumes()]; c[i()].container = ev.currentTarget.value; setVolumes(c) }}
                        class="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="/container" />
                      <label class="text-xs text-slate-500"><input type="checkbox" checked={v.readOnly}
                        onChange={(ev) => { const c = [...volumes()]; c[i()].readOnly = ev.currentTarget.checked; setVolumes(c) }}
                        class="accent-blue-500" /> RO</label>
                      <button onClick={() => setVolumes(volumes().filter((_, j) => j !== i()))}
                        class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>

          <Show when={error()}>
            <p class="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded px-3 py-2">{error()}</p>
          </Show>
          <Show when={success()}>
            <p class="text-sm text-emerald-400 bg-emerald-900/30 border border-emerald-800 rounded px-3 py-2">{success()}</p>
          </Show>

          <button
            onClick={handleDeploy}
            disabled={deploying() || !form().image || !form().container_name}
            class="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {deploying() ? "Deploying..." : "Deploy & Start Container"}
          </button>
        </div>
      </div>
    </div>
  )
}
