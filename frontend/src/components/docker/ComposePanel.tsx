import { createSignal, createResource, For, Show } from "solid-js"
import { dockerApi } from "../../api/docker-api"
import ComposeEditor from "./ComposeEditor"

export default function ComposePanel(props: { hostId: string }) {
  const [showAdd, setShowAdd] = createSignal(false)
  const [addForm, setAddForm] = createSignal({ name: "", path: "" })
  const [actionLoading, setActionLoading] = createSignal<Record<string, string>>({})
  const [editingProject, setEditingProject] = createSignal<any>(null)
  const [showFile, setShowFile] = createSignal<any>(null)

  const [projects, { refetch }] = createResource(() => props.hostId, (id) => dockerApi.listCompose(id))

  const doAction = async (projectId: string, action: string) => {
    setActionLoading({ ...actionLoading(), [projectId]: action })
    try {
      await dockerApi[`compose${action.charAt(0).toUpperCase() + action.slice(1)}`](props.hostId, projectId)
      refetch()
    } catch (e: any) {
      alert(`${action} failed: ${e.message}`)
    }
    setActionLoading({ ...actionLoading(), [projectId]: "" })
  }

  const addProject = async () => {
    const f = addForm()
    if (!f.name || !f.path) return
    try {
      await dockerApi.addCompose(props.hostId, { name: f.name, path: f.path })
      setShowAdd(false)
      setAddForm({ name: "", path: "" })
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const viewFile = async (project: any) => {
    try {
      const content = await dockerApi.composeReadFile(props.hostId, project.id)
      setShowFile({ project, content: content.content })
    } catch (e: any) {
      alert(e.message)
    }
  }

  const statusColor = (status: string) => {
    if (status === "running") return "bg-emerald-400"
    if (status === "stopped") return "bg-slate-500"
    return "bg-yellow-400"
  }

  return (
    <div class="space-y-4">
      {/* Header + Add button */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="text-xs text-slate-500">
          <Show when={projects()} fallback="Loading...">
            {projects()?.length || 0} compose project{projects()?.length !== 1 ? "s" : ""}
          </Show>
        </div>
        <button onClick={() => setShowAdd(true)}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
          + Add Project
        </button>
      </div>

      {/* Add form */}
      <Show when={showAdd()}>
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div class="space-y-3">
            <input value={addForm().name} onInput={(e) => setAddForm({ ...addForm(), name: e.currentTarget.value })}
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
              placeholder="Project name" />
            <input value={addForm().path} onInput={(e) => setAddForm({ ...addForm(), path: e.currentTarget.value })}
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
              placeholder="/opt/compose/project" />
          </div>
          <div class="flex gap-2 mt-3">
            <button onClick={addProject}
              class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">Create</button>
            <button onClick={() => setShowAdd(false)}
              class="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs">Cancel</button>
          </div>
        </div>
      </Show>

      {/* Project list */}
      <Show when={!projects.loading} fallback={
        <div class="space-y-2">
          {[1, 2, 3].map(() => (
            <div class="h-24 bg-slate-900 border border-slate-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
      }>
        <Show when={projects()?.length > 0} fallback={
          <div class="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-sm text-slate-500">
            No compose projects registered. Add one to get started.
          </div>
        }>
          <div class="space-y-2">
            <For each={projects()}>
              {(proj: any) => (
                <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <span class={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${statusColor(proj.status)}`}></span>
                      <h3 class="text-white text-sm font-medium">{proj.name}</h3>
                    </div>
                    <div class="flex gap-1 flex-wrap">
                      <button onClick={() => doAction(proj.id, "up")}
                        disabled={actionLoading()[proj.id] === "up"}
                        class="px-2 py-1 bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 rounded text-xs border border-emerald-800/50 disabled:opacity-50">Up</button>
                      <button onClick={() => doAction(proj.id, "down")}
                        disabled={actionLoading()[proj.id] === "down"}
                        class="px-2 py-1 bg-red-900/30 hover:bg-red-800/50 text-red-400 rounded text-xs border border-red-800/50 disabled:opacity-50">Down</button>
                      <button onClick={() => doAction(proj.id, "restart")}
                        disabled={actionLoading()[proj.id] === "restart"}
                        class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs disabled:opacity-50">Restart</button>
                      <button onClick={() => viewFile(proj)}
                        class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">Edit</button>
                    </div>
                  </div>
                  <p class="text-xs text-slate-500 font-mono mt-1">{proj.path}</p>
                  <Show when={proj.services?.length > 0}>
                    <div class="flex gap-1 flex-wrap mt-2">
                      <For each={proj.services}>
                        {(svc: string) => (
                          <span class="px-2 py-0.5 bg-slate-800 rounded-full text-xs text-slate-300">{svc}</span>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* Editor Modal */}
      <Show when={showFile()}>
        <ComposeEditor
          hostId={props.hostId}
          project={showFile()!.project}
          initialContent={showFile()!.content}
          onClose={() => setShowFile(null)}
          onSaved={() => { setShowFile(null); refetch() }}
        />
      </Show>
    </div>
  )
}
