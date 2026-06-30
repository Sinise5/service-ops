import { createSignal, createResource, For, Show, createEffect } from "solid-js"
import { useNavigate, useParams } from "@solidjs/router"
import Layout from "../components/Layout"
import { dockerApi } from "../api/docker-api"
import HostManager from "../components/docker/HostManager"
import ContainerList from "../components/docker/ContainerList"
import ImageList from "../components/docker/ImageList"
import VolumeList from "../components/docker/VolumeList"
import ComposePanel from "../components/docker/ComposePanel"
import GitPanel from "../components/docker/GitPanel"
import DeployForm from "../components/docker/DeployForm"

type Tab = "hosts" | "containers" | "images" | "volumes" | "compose" | "git" | "deploy"

export default function DockerPage() {
  const [activeTab, setActiveTab] = createSignal<Tab>("hosts")
  const [selectedHost, setSelectedHost] = createSignal<string | null>(null)
  const [showHostForm, setShowHostForm] = createSignal(false)
  const [showDeployForm, setShowDeployForm] = createSignal(false)
  const [editingHost, setEditingHost] = createSignal<any>(null)

  const [hosts, { refetch: refetchHosts }] = createResource(() => dockerApi.listHosts())

  const selectHost = (hostId: string) => {
    setSelectedHost(hostId)
    setActiveTab("containers")
  }

  const backToHosts = () => {
    setSelectedHost(null)
    setActiveTab("hosts")
    refetchHosts()
  }

  const handleHostSaved = () => {
    setShowHostForm(false)
    setEditingHost(null)
    refetchHosts()
  }

  const editHost = (host: any) => {
    setEditingHost(host)
    setShowHostForm(true)
  }

  const tabItems: { key: Tab; label: string }[] = [
    { key: "hosts", label: "Hosts" },
    { key: "containers", label: "Containers" },
    { key: "images", label: "Images" },
    { key: "volumes", label: "Volumes" },
    { key: "compose", label: "Compose" },
    { key: "git", label: "Git" },
    { key: "deploy", label: "Deploy" },
  ]

  return (
    <Layout>
      <div class="space-y-4 sm:space-y-6">
        {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3">
          <Show when={selectedHost()}>
            <button
              onClick={backToHosts}
              class="text-slate-400 hover:text-white flex items-center gap-1 text-sm"
            >
              <span>←</span> Hosts
            </button>
            <span class="text-slate-500">/</span>
          </Show>
          <h1 class="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <svg class="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.186v1.887c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.7h2.118a.187.187 0 00.186-.186V6.276a.186.186 0 00-.186-.185h-2.118a.186.186 0 00-.185.185v1.886c0 .103.082.186.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.276a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.886c0 .103.083.186.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.276a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.886c0 .103.084.186.186.186m5.893 2.7h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.186v1.887c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.184.186v1.887c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.186.186 0 00-.185-.186H5.136a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.186.186 0 00-.184-.186h-2.12a.186.186 0 00-.185.186v1.887c0 .102.083.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.1 12.1 0 003.823-1.389c.98.567 2.054.983 3.206 1.245l.599.134c.128.018.256.027.386.027 1.084.001 2.351-.29 3.16-1.835.431-.818.432-1.776.426-2.612l-.001-.181-.036-.322M16.037 3.237a4.535 4.535 0 013.619 2.148 4.536 4.536 0 01-.041 4.4 4.53 4.53 0 01-3.587 2.161 4.535 4.535 0 01-3.61-2.161 4.532 4.532 0 01.031-4.386 4.535 4.535 0 013.588-2.162z"/>
            </svg>
            Docker Management
          </h1>
          <Show when={selectedHost()}>
            <span class="text-slate-400 text-sm">
              — {hosts()?.find((h: any) => h.id === selectedHost())?.name || selectedHost()}
            </span>
          </Show>
        </div>
        <div class="flex gap-2">
          <Show when={!selectedHost()}>
            <button
              onClick={() => { setEditingHost(null); setShowHostForm(true) }}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <span>+</span> Add Host
            </button>
          </Show>
          <Show when={selectedHost() && activeTab() === "containers"}>
            <button
              onClick={() => setShowDeployForm(true)}
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
            >
              + Deploy
            </button>
          </Show>
        </div>
      </div>

      {/* Tabs */}
      <div class="flex gap-1 border-b border-slate-700 overflow-x-auto">
        <For each={tabItems}>
          {(tab) => (
            <button
              onClick={() => setActiveTab(tab.key)}
              class={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab() === tab.key
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
              disabled={tab.key !== "hosts" && tab.key !== "containers" && !selectedHost()}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>

      {/* Content */}
      <Show when={activeTab() === "hosts"}>
        <HostManager
          hosts={hosts() || []}
          loading={hosts.loading}
          onSelect={selectHost}
          onEdit={editHost}
          onDelete={refetchHosts}
          onRefresh={refetchHosts}
        />
      </Show>

      <Show when={activeTab() === "containers" && selectedHost()}>
        <ContainerList hostId={selectedHost()!} />
      </Show>

      <Show when={activeTab() === "images" && selectedHost()}>
        <ImageList hostId={selectedHost()!} />
      </Show>

      <Show when={activeTab() === "volumes" && selectedHost()}>
        <VolumeList hostId={selectedHost()!} />
      </Show>

      <Show when={activeTab() === "compose" && selectedHost()}>
        <ComposePanel hostId={selectedHost()!} />
      </Show>

      <Show when={activeTab() === "git" && selectedHost()}>
        <GitPanel hostId={selectedHost()!} />
      </Show>

      <Show when={activeTab() === "deploy" && selectedHost()}>
        <DeployForm hostId={selectedHost()!} />
      </Show>

      <Show when={activeTab() !== "hosts" && !selectedHost()}>
        <div class="text-center text-slate-500 py-16">
          <p class="text-lg mb-2">No host selected</p>
          <p class="text-sm">Select a host from the Hosts tab to manage containers, images, and more.</p>
          <button onClick={() => setActiveTab("hosts")} class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
            Go to Hosts
          </button>
        </div>
      </Show>

      {/* Host Form Modal */}
      <Show when={showHostForm()}>
        <HostFormModal
          host={editingHost()}
          onClose={() => { setShowHostForm(false); setEditingHost(null) }}
          onSave={handleHostSaved}
        />
      </Show>

      {/* Deploy Form Modal */}
      <Show when={showDeployForm()}>
        <DeployFormModal
          hostId={selectedHost()!}
          onClose={() => setShowDeployForm(false)}
          onDeployed={() => { setShowDeployForm(false); refetchHosts() }}
        />
      </Show>
    </div>
    </Layout>
  )
}

// ─── HostFormModal ─────────────────────────────────────────────────────────
function HostFormModal(props: { host?: any; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = createSignal({
    name: props.host?.name || "",
    host: props.host?.host || "",
    port: props.host?.port || 22,
    username: props.host?.username || "",
    auth_type: props.host?.auth_type || "password",
    password: "",
    ssh_key: "",
    ssh_key_passphrase: "",
    default_path: props.host?.default_path || "/opt/docker",
    tags: props.host?.tags?.join(", ") || "",
    docker_context: props.host?.docker_context || "",
  })
  const [testing, setTesting] = createSignal(false)
  const [testResult, setTestResult] = createSignal<any>(null)
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal("")
  const [showFormPass, setShowFormPass] = createSignal(false)

  const update = (key: string, value: any) => setForm({ ...form(), [key]: value })

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const data = {
        ...form(),
        tags: form().tags.split(",").map((t: string) => t.trim()).filter(Boolean),
      }
      if (props.host?.id) {
        // Edit mode — save first then test via host id
        await dockerApi.updateHost(props.host.id, data)
        const result = await dockerApi.testHost(props.host.id)
        setTestResult(result)
      } else {
        // New host — test credentials without creating
        const result = await dockerApi.testCredentials(data)
        setTestResult(result)
      }
    } catch (e: any) {
      setTestResult({ status: "offline", error: e.message })
    }
    setTesting(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    try {
      const data = {
        ...form(),
        tags: form().tags.split(",").map((t: string) => t.trim()).filter(Boolean),
      }
      if (props.host?.id) {
        await dockerApi.updateHost(props.host.id, data)
      } else {
        await dockerApi.createHost(data)
      }
      props.onSave()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  return (
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={props.onClose}>
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 class="text-lg font-semibold text-white mb-5">{props.host ? "Edit Host" : "Add Docker Host"}</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-xs text-slate-400 mb-1">Display Name</label>
            <input value={form().name} onInput={(e) => update("name", e.currentTarget.value)}
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500" placeholder="Production API Server" />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-2">
              <label class="block text-xs text-slate-400 mb-1">Host / IP</label>
              <input value={form().host} onInput={(e) => update("host", e.currentTarget.value)}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500" placeholder="192.168.1.10" />
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">SSH Port</label>
              <input type="number" value={form().port} onInput={(e) => update("port", parseInt(e.currentTarget.value))}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Username</label>
            <input value={form().username} onInput={(e) => update("username", e.currentTarget.value)}
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500" placeholder="deploy" />
          </div>

          {/* Auth Type */}
          <div>
            <label class="block text-xs text-slate-400 mb-2">Auth Method</label>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 text-sm text-slate-300">
                <input type="radio" checked={form().auth_type === "password"}
                  onChange={() => update("auth_type", "password")} class="accent-blue-500" />
                Password
              </label>
              <label class="flex items-center gap-2 text-sm text-slate-300">
                <input type="radio" checked={form().auth_type === "key"}
                  onChange={() => update("auth_type", "key")} class="accent-blue-500" />
                SSH Key
              </label>
            </div>
          </div>

          <Show when={form().auth_type === "password"}>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Password</label>
              <div class="relative">
                <input type={showFormPass() ? "text" : "password"} value={form().password} onInput={(e) => update("password", e.currentTarget.value)}
                  class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-white text-sm placeholder-slate-500" placeholder="••••••••" />
                <button type="button" onClick={() => setShowFormPass(!showFormPass())}
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">{showFormPass() ? "Hide" : "Show"}</button>
              </div>
            </div>
          </Show>

          <Show when={form().auth_type === "key"}>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Private Key</label>
              <textarea value={form().ssh_key} onInput={(e) => update("ssh_key", e.currentTarget.value)}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono h-24"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..." />
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Key Passphrase (optional)</label>
              <input type="password" value={form().ssh_key_passphrase} onInput={(e) => update("ssh_key_passphrase", e.currentTarget.value)}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500" />
            </div>
          </Show>

          <div>
            <label class="block text-xs text-slate-400 mb-1">Default Path</label>
            <input value={form().default_path} onInput={(e) => update("default_path", e.currentTarget.value)}
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500" placeholder="/opt/docker" />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Tags (comma-separated)</label>
            <input value={form().tags} onInput={(e) => update("tags", e.currentTarget.value)}
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500" placeholder="production, api, vps" />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Docker Context (optional)</label>
            <input value={form().docker_context} onInput={(e) => update("docker_context", e.currentTarget.value)}
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500"
              placeholder="Leave empty for default context" />
          </div>
        </div>

        <Show when={testResult()}>
          <div class={`mt-4 p-3 rounded-lg text-sm ${testResult().status === "online" ? "bg-emerald-900/50 border border-emerald-800 text-emerald-300" : "bg-red-900/50 border border-red-800 text-red-300"}`}>
            <strong>{testResult().status === "online" ? "✓ Online" : "✗ Offline"}</strong>
            {testResult().docker_version && <span> — Docker {testResult().docker_version}</span>}
            {testResult().error && <p class="mt-1 text-xs">{testResult().error}</p>}
          </div>
        </Show>

        <Show when={error()}>
          <p class="mt-3 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded px-3 py-2">{error()}</p>
        </Show>

        <div class="flex justify-between mt-5">
          <button onClick={testConnection} disabled={testing()}
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm border border-slate-600">
            {testing() ? "Testing..." : "Test Connection"}
          </button>
          <div class="flex gap-2">
            <button onClick={props.onClose} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm border border-slate-600">Cancel</button>
            <button onClick={handleSave} disabled={saving()}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
              {saving() ? "Saving..." : "Save Host"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── DeployFormModal ──────────────────────────────────────────────────────
function DeployFormModal(props: { hostId: string; onClose: () => void; onDeployed: () => void }) {
  const [form, setForm] = createSignal({
    image: "", container_name: "", command: "", workdir: "",
    restart_policy: "unless-stopped", privileged: false, tty: false,
    network: "",
  })
  const [ports, setPorts] = createSignal<{ host: number; container: number }[]>([])
  const [envs, setEnvs] = createSignal<{ key: string; value: string }[]>([])
  const [volumes, setVolumes] = createSignal<{ host: string; container: string; readOnly: boolean }[]>([])
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal("")
  const [templates] = createResource(() => dockerApi.listTemplates())
  const [deploying, setDeploying] = createSignal(false)

  const update = (key: string, value: any) => setForm({ ...form(), [key]: value })

  const applyTemplate = (t: any) => {
    setForm({ ...form(), image: t.image, restart_policy: t.restart_policy })
    setPorts(t.default_ports?.map((p: any) => ({ host: p.host_port, container: p.container_port })) || [])
    setEnvs(t.default_envs?.map((e: any) => ({ key: e.key, value: e.value })) || [])
    setVolumes(t.default_volumes?.map((v: any) => ({ host: v.host_path, container: v.container_path, readOnly: v.read_only })) || [])
  }

  const handleDeploy = async () => {
    setDeploying(true)
    setError("")
    try {
      const data = {
        image: form().image,
        container_name: form().container_name,
        command: form().command || undefined,
        workdir: form().workdir || undefined,
        restart_policy: form().restart_policy,
        privileged: form().privileged,
        tty: form().tty,
        network: form().network || undefined,
        ports: ports().map((p) => ({ host_port: p.host, container_port: p.container, protocol: "tcp" })),
        envs: envs().filter((e) => e.key),
        volumes: volumes().filter((v) => v.host && v.container).map((v) => ({
          host_path: v.host, container_path: v.container, read_only: v.readOnly,
        })),
      }
      await dockerApi.deployContainer(props.hostId, data)
      props.onDeployed()
    } catch (e: any) {
      setError(e.message)
    }
    setDeploying(false)
  }

  return (
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={props.onClose}>
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-5 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 class="text-lg font-semibold text-white mb-5">Deploy Container</h2>

        <Show when={templates()?.length}>
          <div class="mb-5">
            <label class="block text-xs text-slate-400 mb-2">Quick Template</label>
            <div class="flex flex-wrap gap-2">
              <For each={templates()?.filter((t: any) => t.is_system)}>
                {(t: any) => (
                  <button onClick={() => applyTemplate(t)}
                    class="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg text-xs border border-slate-700">
                    {t.name}
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>

        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-slate-400 mb-1">Image *</label>
                <input value={form().image} onInput={(e) => update("image", e.currentTarget.value)}
                  class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="nginx:alpine" />
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1">Container Name *</label>
                <input value={form().container_name} onInput={(e) => update("container_name", e.currentTarget.value)}
                  class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="my-nginx" />
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div class="col-span-2">
                  <label class="block text-xs text-slate-400 mb-1">Restart Policy</label>
                  <select value={form().restart_policy} onChange={(e) => update("restart_policy", e.currentTarget.value)}
                    class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs">
                    <option value="no">no</option>
                    <option value="always">always</option>
                    <option value="unless-stopped">unless-stopped</option>
                    <option value="on-failure">on-failure</option>
                  </select>
                </div>
              </div>
              <div class="flex gap-4">
                <label class="flex items-center gap-1.5 text-xs text-slate-300">
                  <input type="checkbox" checked={form().privileged}
                    onChange={(e) => update("privileged", e.currentTarget.checked)}
                    class="accent-blue-500" /> Privileged
                </label>
                <label class="flex items-center gap-1.5 text-xs text-slate-300">
                  <input type="checkbox" checked={form().tty}
                    onChange={(e) => update("tty", e.currentTarget.checked)}
                    class="accent-blue-500" /> TTY
                </label>
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
                      <input type="number" value={p.host} onInput={(e) => {
                        const copy = [...ports()]; copy[i()].host = parseInt(e.currentTarget.value); setPorts(copy)
                      }}
                        class="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="8080" />
                      <span class="text-slate-500 text-xs">→</span>
                      <input type="number" value={p.container} onInput={(e) => {
                        const copy = [...ports()]; copy[i()].container = parseInt(e.currentTarget.value); setPorts(copy)
                      }}
                        class="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="80" />
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
                      <input value={e.key} onInput={(ev) => {
                        const copy = [...envs()]; copy[i()].key = ev.currentTarget.value; setEnvs(copy)
                      }}
                        class="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="KEY" />
                      <input value={e.value} onInput={(ev) => {
                        const copy = [...envs()]; copy[i()].value = ev.currentTarget.value; setEnvs(copy)
                      }}
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
                      <input value={v.host} onInput={(ev) => {
                        const copy = [...volumes()]; copy[i()].host = ev.currentTarget.value; setVolumes(copy)
                      }}
                        class="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="/data" />
                      <span class="text-slate-500 text-xs">→</span>
                      <input value={v.container} onInput={(ev) => {
                        const copy = [...volumes()]; copy[i()].container = ev.currentTarget.value; setVolumes(copy)
                      }}
                        class="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs" placeholder="/app/data" />
                      <label class="text-xs text-slate-500 flex items-center gap-1">
                        <input type="checkbox" checked={v.readOnly}
                          onChange={(ev) => {
                            const copy = [...volumes()]; copy[i()].readOnly = ev.currentTarget.checked; setVolumes(copy)
                          }}
                          class="accent-blue-500" /> RO
                      </label>
                      <button onClick={() => setVolumes(volumes().filter((_, j) => j !== i()))}
                        class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs text-slate-400 mb-1">Command (optional)</label>
            <input value={form().command} onInput={(e) => update("command", e.currentTarget.value)}
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono"
              placeholder="sh -c 'node server.js'" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-slate-400 mb-1">Workdir (optional)</label>
              <input value={form().workdir} onInput={(e) => update("workdir", e.currentTarget.value)}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs" placeholder="/app" />
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Network (optional)</label>
              <input value={form().network} onInput={(e) => update("network", e.currentTarget.value)}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                placeholder="host, bridge, or network name" />
            </div>
          </div>
        </div>

        <Show when={error()}>
          <p class="mt-4 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded px-3 py-2">{error()}</p>
        </Show>

        <div class="flex justify-end gap-2 mt-5">
          <button onClick={props.onClose} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm border border-slate-600">Cancel</button>
          <button onClick={handleDeploy} disabled={deploying() || !form().image || !form().container_name}
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
            {deploying() ? "Deploying..." : "Deploy & Start"}
          </button>
        </div>
      </div>
    </div>
  )
}
