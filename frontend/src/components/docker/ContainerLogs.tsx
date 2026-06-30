import { createSignal, createResource, For, Show, onCleanup } from "solid-js"
import { dockerApi } from "../../lib/docker-api"

export default function ContainerLogs(props: { hostId: string; containerId: string; onClose: () => void }) {
  const [tail, setTail] = createSignal(100)
  const [logs, setLogs] = createSignal<string[]>([])
  const [autoScroll, setAutoScroll] = createSignal(true)
  const [streaming, setStreaming] = createSignal(false)
  let logContainer: HTMLDivElement | undefined
  let abortController: AbortEventSource | undefined

  const fetchLogs = async (n: number) => {
    try {
      const result = await dockerApi.containerLogs(props.hostId, props.containerId, n)
      setLogs(result.split("\n").filter(Boolean))
    } catch {}
  }

  createResource(() => props.containerId, () => fetchLogs(tail()))

  // Auto-scroll
  const scrollToBottom = () => {
    if (autoScroll() && logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight
    }
  }

  return (
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={props.onClose}>
      <div class="bg-slate-800 rounded-xl w-full max-w-4xl max-h-[80vh] border border-slate-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div class="flex items-center gap-3">
            <h2 class="text-white font-semibold text-sm">Logs</h2>
            <span class="text-xs text-slate-500 font-mono">{props.containerId.slice(0, 12)}</span>
          </div>
          <div class="flex items-center gap-2">
            <select
              value={tail()}
              onChange={(e) => { setTail(parseInt(e.currentTarget.value)); fetchLogs(parseInt(e.currentTarget.value)) }}
              class="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
            >
              <option value="50">tail 50</option>
              <option value="100">tail 100</option>
              <option value="200">tail 200</option>
              <option value="500">tail 500</option>
            </select>
            <label class="flex items-center gap-1 text-xs text-slate-400">
              <input type="checkbox" checked={autoScroll()} onChange={(e) => setAutoScroll(e.currentTarget.checked)} class="accent-blue-500" />
              Auto-scroll
            </label>
            <button onClick={() => setLogs([])}
              class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">Clear</button>
            <button onClick={() => {
              const text = logs().join("\n")
              navigator.clipboard.writeText(text)
            }}
              class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">Copy</button>
            <button onClick={() => {
              const blob = new Blob([logs().join("\n")], { type: "text/plain" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a"); a.href = url; a.download = `logs-${props.containerId.slice(0,8)}.txt`; a.click()
            }}
              class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">↓ Download</button>
            <button onClick={() => fetchLogs(tail())}
              class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">⟳</button>
            <button onClick={props.onClose} class="text-slate-400 hover:text-white text-lg">✕</button>
          </div>
        </div>

        {/* Log Output */}
        <div ref={logContainer} class="flex-1 overflow-y-auto p-4 bg-slate-900/50 font-mono text-xs leading-relaxed"
          onScroll={() => {
            if (logContainer) {
              const atBottom = logContainer.scrollHeight - logContainer.scrollTop - logContainer.clientHeight < 50
              if (!atBottom) setAutoScroll(false)
            }
          }}>
          <Show when={logs().length === 0}>
            <p class="text-slate-500">No logs available.</p>
          </Show>
          <For each={logs()}>
            {(line: string) => (
              <div class={line.includes("ERROR") || line.includes("error") ? "text-red-400" :
                          line.includes("WARN") || line.includes("warn") ? "text-yellow-400" :
                          "text-slate-300 whitespace-pre-wrap break-all"}>
                {line}
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}
