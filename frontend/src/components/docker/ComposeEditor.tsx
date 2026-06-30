import { createSignal, Show, onMount, onCleanup } from "solid-js"
import { dockerApi } from "../../lib/docker-api"

export default function ComposeEditor(props: {
  hostId: string; project: any; initialContent: string
  onClose: () => void; onSaved: () => void
}) {
  const [content, setContent] = createSignal(props.initialContent)
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal("")
  let textareaRef: HTMLTextAreaElement | undefined

  const handleSave = async () => {
    setSaving(true)
    setError("")
    try {
      await dockerApi.composeWriteFile(props.hostId, props.project.id, content())
      props.onSaved()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  // Simple tab support in textarea
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const ta = e.currentTarget as HTMLTextAreaElement
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newContent = content().substring(0, start) + "  " + content().substring(end)
      setContent(newContent)
      // Restore cursor
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2 }, 0)
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={props.onClose}>
      <div class="bg-slate-800 rounded-xl w-full max-w-4xl max-h-[85vh] border border-slate-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div>
            <h2 class="text-white font-semibold text-sm">Edit docker-compose.yml</h2>
            <p class="text-xs text-slate-500 font-mono">{props.project.path}</p>
          </div>
          <div class="flex gap-2">
            <Show when={error()}>
              <span class="text-xs text-red-400 self-center">{error()}</span>
            </Show>
            <button onClick={props.onClose} class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">Cancel</button>
            <button onClick={handleSave} disabled={saving()}
              class="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium disabled:opacity-50">
              {saving() ? "Saving..." : "Save (Ctrl+S)"}
            </button>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={content()}
          onInput={(e) => setContent(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          spellcheck={false}
          class="flex-1 bg-slate-900 text-slate-200 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
          style="min-height: 400px; tab-size: 2;"
        />
        <div class="px-4 py-2 border-t border-slate-700 text-xs text-slate-500">
          Tab = 2 spaces · Ctrl+S = Save
        </div>
      </div>
    </div>
  )
}
