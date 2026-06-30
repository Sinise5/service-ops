import { createSignal, For, Show, createResource } from "solid-js"
import { dockerApi } from "../../api/docker-api"

type Tab = "clone" | "repo" | "log" | "branches"

export default function GitPanel(props: { hostId: string }) {
  const [activeTab, setActiveTab] = createSignal<Tab>("repo")
  const [workingPath, setWorkingPath] = createSignal("")
  const [output, setOutput] = createSignal("")
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal("")
  const [activeBranch, setActiveBranch] = createSignal("")
  const [webUrl, setWebUrl] = createSignal("")

  // Clone form
  const [cloneUrl, setCloneUrl] = createSignal("")
  const [clonePath, setClonePath] = createSignal("")
  const [cloneBranch, setCloneBranch] = createSignal("")
  const [cloneDepth, setCloneDepth] = createSignal<number | undefined>(undefined)

  // Repo form
  const [repoPath, setRepoPath] = createSignal("")

  // Branch form
  const [newBranch, setNewBranch] = createSignal("")
  const [checkoutTarget, setCheckoutTarget] = createSignal("")

  // Diff
  const [diffOutput, setDiffOutput] = createSignal("")
  const [diffStaged, setDiffStaged] = createSignal(false)

  // Log
  const [logCount, setLogCount] = createSignal(20)
  const [logBranch, setLogBranch] = createSignal("")

  const [status, setStatus] = createSignal<any>(null)
  const [branches, setBranches] = createSignal<any[]>([])
  const [commits, setCommits] = createSignal<any[]>([])
  const [remotes, setRemotes] = createSignal<any[]>([])
  const [browseEntries, setBrowseEntries] = createSignal<any[]>([])
  const [browsePath, setBrowsePath] = createSignal("/")
  const [browseLoading, setBrowseLoading] = createSignal(false)
  const [showBrowser, setShowBrowser] = createSignal(false)

  const loadDir = async (path: string) => {
    setBrowseLoading(true)
    setBrowsePath(path)
    try {
      const r = await dockerApi.gitLsDir(props.hostId, path)
      setBrowseEntries(r.entries || [])
    } catch {
      setBrowseEntries([])
    } finally {
      setBrowseLoading(false)
    }
  }

  const enterDir = (name: string) => {
    const newPath = browsePath() === "/" ? `/${name}` : `${browsePath()}/${name}`
    loadDir(newPath)
  }

  const doRefresh = async (path: string) => {
    if (!path) return
    setLoading(true)
    setError("")
    try {
      const [s, b, r] = await Promise.all([
        dockerApi.gitStatus(props.hostId, path),
        dockerApi.gitBranches(props.hostId, path),
        dockerApi.gitRemotes(props.hostId, path),
      ])
      setStatus(s)
      setBranches(b.branches || [])
      setRemotes(r.remotes || [])
      // active branch from status response, not branches list
      if (s?.branch) setActiveBranch(s.branch)
      else {
        const ab = (b.branches || []).find((br: any) => br.is_current)
        if (ab) setActiveBranch(ab.name)
      }
      // Try guess web URL
      try {
        const u = await dockerApi.gitRemoteUrl(props.hostId, path)
        setWebUrl(u.url || "")
      } catch {}
    } catch (e: any) {
      setStatus(null)
      setBranches([])
      setRemotes([])
    } finally {
      setLoading(false)
    }
  }

  const setRepo = (p: string) => {
    setRepoPath(p)
    setWorkingPath(p)
    doRefresh(p)
  }

  const clone = async () => {
    if (!cloneUrl() || !clonePath()) { setError("URL and path required"); return }
    setLoading(true)
    setError("")
    setOutput("")
    try {
      const r = await dockerApi.gitClone(props.hostId, cloneUrl(), clonePath(), cloneBranch() || undefined, cloneDepth() || undefined)
      setOutput(r.message || "Cloned successfully")
      setRepo(clonePath())
    } catch (e: any) {
      setError(e?.message || e?.error || String(e))
    } finally {
      setLoading(false)
    }
  }

  const pull = async () => {
    if (!workingPath()) { setError("No repo path"); return }
    setLoading(true)
    setError("")
    try {
      const r = await dockerApi.gitPull(props.hostId, workingPath())
      setOutput(r.message || "Pulled")
      doRefresh(workingPath())
    } catch (e: any) {
      setError(e?.message || e?.error || String(e))
    } finally {
      setLoading(false)
    }
  }

  const fetch = async () => {
    if (!workingPath()) { setError("No repo path"); return }
    setLoading(true)
    setError("")
    try {
      const r = await dockerApi.gitFetch(props.hostId, workingPath())
      setOutput(r.message || "Fetched")
      doRefresh(workingPath())
    } catch (e: any) {
      setError(e?.message || e?.error || String(e))
    } finally {
      setLoading(false)
    }
  }

  const push = async () => {
    if (!workingPath()) { setError("No repo path"); return }
    setLoading(true)
    setError("")
    try {
      const r = await dockerApi.gitPush(props.hostId, workingPath())
      setOutput(r.message || "Pushed")
      doRefresh(workingPath())
    } catch (e: any) {
      setError(e?.message || e?.error || String(e))
    } finally {
      setLoading(false)
    }
  }

  const checkout = async (branch: string, create = false) => {
    if (!workingPath() || !branch) { setError("Path and branch required"); return }
    setLoading(true)
    setError("")
    try {
      const r = await dockerApi.gitCheckout(props.hostId, workingPath(), branch, create)
      setOutput(r.message || `Checked out ${branch}`)
      doRefresh(workingPath())
    } catch (e: any) {
      setError(e?.message || e?.error || String(e))
    } finally {
      setLoading(false)
    }
  }

  const loadLog = async () => {
    if (!workingPath()) { setError("No repo path"); return }
    setLoading(true)
    setError("")
    try {
      const r = await dockerApi.gitLog(props.hostId, workingPath(), logCount(), logBranch() || undefined)
      setCommits(r.commits || [])
    } catch (e: any) {
      setError(e?.message || e?.error || String(e))
    } finally {
      setLoading(false)
    }
  }

  const loadDiff = async () => {
    if (!workingPath()) { setError("No repo path"); return }
    setLoading(true)
    setError("")
    try {
      const r = await dockerApi.gitDiff(props.hostId, workingPath(), diffStaged())
      setDiffOutput(r.diff || "(no changes)")
    } catch (e: any) {
      setError(e?.message || e?.error || String(e))
    } finally {
      setLoading(false)
    }
  }

  const stash = async (pop = false) => {
    if (!workingPath()) return
    setLoading(true)
    setError("")
    try {
      const r = await dockerApi.gitStash(props.hostId, workingPath(), pop)
      setOutput(r.message || (pop ? "Stash popped" : "Stashed"))
      doRefresh(workingPath())
    } catch (e: any) {
      setError(e?.message || e?.error || String(e))
    } finally {
      setLoading(false)
    }
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      "M": "text-yellow-400", "A": "text-green-400", "D": "text-red-400",
      "R": "text-purple-400", "C": "text-orange-400",
      "?": "text-slate-400",
    }
    return map[s?.trim()] || "text-slate-400"
  }

  return (
    <div class="space-y-4">
      {/* Repo path input */}
      <div class="flex gap-2">
        <input value={repoPath()} onInput={(e) => setRepoPath(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && setRepo(repoPath())}
          class="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
          placeholder="/home/app/myproject" />
        <button onClick={() => setRepo(repoPath())}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Open</button>
        <button onClick={() => { setShowBrowser(!showBrowser()); if (!showBrowser()) loadDir(browsePath()) }}
          class={`px-3 py-2 rounded-lg text-sm ${showBrowser() ? "bg-slate-700 text-slate-300" : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"}`}>
          📁 Browse
        </button>
      </div>

      {/* File Browser */}
      <Show when={showBrowser()}>
        <div class="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs text-slate-500 font-mono flex-1 truncate">{browsePath()}</span>
            <button onClick={() => loadDir("/")}
              class="text-xs px-2 py-1 bg-slate-700 rounded text-slate-400 hover:text-white">/</button>
            <Show when={browsePath() !== "/"}>
              <button onClick={() => {
                const parts = browsePath().replace(/\/$/, "").split("/")
                parts.pop()
                loadDir(parts.join("/") || "/")
              }}
                class="text-xs px-2 py-1 bg-slate-700 rounded text-slate-400 hover:text-white">↑</button>
            </Show>
            <Show when={browseLoading()}>
              <span class="text-xs text-slate-500">loading...</span>
            </Show>
          </div>
          <div class="max-h-64 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1">
            <For each={browseEntries()}>
              {(e: any) => (
                <Show when={e.is_dir}>
                  <button onClick={() => enterDir(e.name)}
                    class="flex items-center gap-1 px-2 py-1 rounded text-xs text-left hover:bg-slate-700/50 group">
                    <span class="text-blue-400 shrink-0">📁</span>
                    <span class="text-slate-300 truncate">{e.name}/</span>
                    <span class="ml-auto opacity-0 group-hover:opacity-100 text-slate-500">↪</span>
                  </button>
                </Show>
              )}
            </For>
            <For each={browseEntries()}>
              {(e: any) => (
                <Show when={!e.is_dir}>
                  <button onClick={() => {
                    const fullPath = browsePath() === "/" ? `/${e.name}` : `${browsePath()}/${e.name}`
                    setRepoPath(fullPath)
                    setRepo(fullPath)
                    setShowBrowser(false)
                  }}
                    class="flex items-center gap-1 px-2 py-1 rounded text-xs text-left hover:bg-slate-700/50">
                    <span class="text-slate-500 shrink-0">{e.is_exec ? "⚙" : "📄"}</span>
                    <span class="text-slate-400 truncate">{e.name}</span>
                  </button>
                </Show>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Active branch + web URL */}
      <Show when={activeBranch()}>
        <div class="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 uppercase">Branch:</span>
            <span class="text-sm font-mono text-cyan-400">{activeBranch()}</span>
          </div>
          <Show when={webUrl()}>
            <a href={webUrl()} target="_blank" rel="noopener"
              class="text-xs text-blue-400 hover:text-blue-300 font-mono truncate max-w-xs">
              {webUrl()}
            </a>
          </Show>
        </div>
      </Show>

      {/* Action bar */}
      <Show when={workingPath()}>
        <div class="flex flex-wrap gap-2">
          <button onClick={pull} disabled={loading()}
            class="px-3 py-1.5 bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 rounded text-xs border border-emerald-800/50 disabled:opacity-50">
            Pull
          </button>
          <button onClick={fetch} disabled={loading()}
            class="px-3 py-1.5 bg-sky-900/30 hover:bg-sky-800/50 text-sky-400 rounded text-xs border border-sky-800/50 disabled:opacity-50">
            Fetch
          </button>
          <button onClick={push} disabled={loading()}
            class="px-3 py-1.5 bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 rounded text-xs border border-blue-800/50 disabled:opacity-50">
            Push
          </button>
          <button onClick={() => loadDiff()} disabled={loading()}
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs disabled:opacity-50">
            Diff
          </button>
          <button onClick={() => stash(false)} disabled={loading()}
            class="px-3 py-1.5 bg-amber-900/30 hover:bg-amber-800/50 text-amber-400 rounded text-xs border border-amber-800/50 disabled:opacity-50">
            Stash
          </button>
          <button onClick={() => stash(true)} disabled={loading()}
            class="px-3 py-1.5 bg-amber-900/30 hover:bg-amber-800/50 text-amber-300 rounded text-xs border border-amber-800/50 disabled:opacity-50">
            Stash Pop
          </button>
          <button onClick={loadLog} disabled={loading()}
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs disabled:opacity-50">
            Log
          </button>
          <button onClick={() => setActiveTab("clone")}
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">
            Clone
          </button>
        </div>
      </Show>

      {/* Tabs */}
      <div class="flex gap-1 border-b border-slate-700">
        {(["repo", "branches", "log"] as Tab[]).map((t) => (
          <button onClick={() => setActiveTab(t)}
            class={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab() === t ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-white"
            }`}>
            {t === "repo" ? "Status" : t === "branches" ? "Branches" : "Commits"}
          </button>
        ))}
      </div>

      {/* Status tab */}
      <Show when={activeTab() === "repo" && status()}>
        <div class="space-y-2">
          <Show when={status().changes?.staged?.length > 0}>
            <div>
              <p class="text-xs text-slate-500 uppercase mb-1">Staged</p>
              <For each={status().changes.staged}>
                {(c: any) => (
                  <div class="flex gap-2 text-xs font-mono">
                    <span class={statusBadge(c.status)}>[{c.status}]</span>
                    <span class="text-slate-300">{c.file}</span>
                  </div>
                )}
              </For>
            </div>
          </Show>
          <Show when={status().changes?.unstaged?.length > 0}>
            <div>
              <p class="text-xs text-slate-500 uppercase mb-1">Changed</p>
              <For each={status().changes.unstaged}>
                {(c: any) => (
                  <div class="flex gap-2 text-xs font-mono">
                    <span class={statusBadge(c.status)}>[{c.status}]</span>
                    <span class="text-slate-300">{c.file}</span>
                  </div>
                )}
              </For>
            </div>
          </Show>
          <Show when={status().changes?.untracked?.length > 0}>
            <div>
              <p class="text-xs text-slate-500 uppercase mb-1">Untracked</p>
              <For each={status().changes.untracked}>
                {(c: any) => (
                  <div class="flex gap-2 text-xs font-mono">
                    <span class="text-slate-400">[??]</span>
                    <span class="text-slate-300">{c.file}</span>
                  </div>
                )}
              </For>
            </div>
          </Show>
          <Show when={
            !status().changes?.staged?.length &&
            !status().changes?.unstaged?.length &&
            !status().changes?.untracked?.length
          }>
            <p class="text-xs text-slate-500 italic">Clean — no changes</p>
          </Show>
        </div>

        {/* Remotes */}
        <Show when={remotes().length > 0}>
          <div class="mt-4">
            <p class="text-xs text-slate-500 uppercase mb-1">Remotes</p>
            <For each={remotes()}>
              {(r: any) => (
                <div class="text-xs font-mono text-slate-400">
                  {r.name} → {r.url} <span class="text-slate-600">({r.type})</span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* Branches tab */}
      <Show when={activeTab() === "branches"}>
        <div class="space-y-3">
          <div class="flex gap-2">
            <input value={checkoutTarget()} onInput={(e) => setCheckoutTarget(e.currentTarget.value)}
              class="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white font-mono"
              placeholder="branch-name" />
            <button onClick={() => checkout(checkoutTarget(), false)} disabled={loading() || !checkoutTarget().trim()}
              class="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-xs disabled:opacity-50">Checkout</button>
            <button onClick={() => checkout(checkoutTarget(), true)} disabled={loading() || !checkoutTarget().trim()}
              class="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs disabled:opacity-50">New Branch</button>
          </div>
          <div class="max-h-80 overflow-y-auto space-y-1">
            <For each={branches()}>
              {(br: any) => (
                <div class="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded text-xs font-mono group">
                  <span class={br.is_current ? "text-green-400" : "text-slate-500"}>
                    {br.is_current ? "★" : " "}
                  </span>
                  <span class={br.is_current ? "text-white" : "text-slate-300"}>{br.name}</span>
                  <Show when={br.upstream}>
                    <span class="text-slate-500">{br.upstream}</span>
                  </Show>
                  <Show when={!br.is_current && workingPath()}>
                    <button onClick={() => {
                      // Remote ref → create local tracking branch; local → simple checkout
                      checkout(br.name, !!br.is_remote)
                    }}
                      class="ml-auto opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">
                      checkout
                    </button>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Log tab */}
      <Show when={activeTab() === "log"}>
        <div class="space-y-2">
          <div class="flex gap-2">
            <input type="number" value={logCount()} onInput={(e) => setLogCount(parseInt(e.currentTarget.value) || 20)}
              class="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" min="1" max="500" />
            <input value={logBranch()} onInput={(e) => setLogBranch(e.currentTarget.value)}
              class="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white font-mono"
              placeholder="branch (optional)" />
            <button onClick={loadLog} disabled={loading()}
              class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs disabled:opacity-50">Load</button>
          </div>
          <div class="max-h-96 overflow-y-auto space-y-1">
            <For each={commits()}>
              {(c: any) => (
                <div class="flex gap-2 px-3 py-2 bg-slate-800/30 rounded text-xs">
                  <span class="text-slate-500 font-mono flex-shrink-0">{c.hash?.slice(0, 7)}</span>
                  <span class="text-slate-400">{c.author}</span>
                  <span class="text-slate-600 flex-shrink-0">{c.date?.split(" ")[0]}</span>
                  <span class="text-slate-300">{c.message}</span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Clone tab */}
      <Show when={activeTab() === "clone"}>
        <div class="bg-slate-800/40 border border-dashed border-slate-700 rounded-lg p-4 space-y-3">
          <h4 class="text-xs font-medium text-slate-400 uppercase">Clone Repository</h4>
          <input value={cloneUrl()} onInput={(e) => setCloneUrl(e.currentTarget.value)}
            class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white font-mono"
            placeholder="https://github.com/user/repo.git" />
          <input value={clonePath()} onInput={(e) => setClonePath(e.currentTarget.value)}
            class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white font-mono"
            placeholder="/opt/app" />
          <div class="flex gap-2">
            <input value={cloneBranch()} onInput={(e) => setCloneBranch(e.currentTarget.value)}
              class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white font-mono"
              placeholder="branch (optional)" />
            <input type="number" value={cloneDepth() ?? ""} onInput={(e) => setCloneDepth(e.currentTarget.value ? parseInt(e.currentTarget.value) : undefined)}
              class="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white"
              placeholder="depth" title="Shallow clone depth" />
          </div>
          <button onClick={clone} disabled={loading()}
            class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {loading() ? "Cloning..." : "Clone"}
          </button>
        </div>
      </Show>

      {/* Diff panel */}
      <Show when={diffOutput()}>
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <p class="text-xs text-slate-500 uppercase">Diff {diffStaged() ? "(staged)" : "(unstaged)"}</p>
            <div class="flex gap-2">
              <button onClick={() => { setDiffStaged(!diffStaged()); loadDiff() }}
                class={`text-xs px-2 py-0.5 rounded ${diffStaged() ? "bg-amber-900/30 text-amber-400" : "bg-slate-700 text-slate-400"}`}>
                {diffStaged() ? "Staged" : "Unstaged"}
              </button>
              <button onClick={() => setDiffOutput("")}
                class="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">Close</button>
            </div>
          </div>
          <pre class="bg-slate-950 border border-slate-800 rounded p-3 text-xs text-slate-300 max-h-60 overflow-auto font-mono whitespace-pre">{diffOutput()}</pre>
        </div>
      </Show>

      {/* Output */}
      <Show when={output()}>
        <div class="bg-slate-800 border border-slate-700 rounded p-3 text-xs text-emerald-400 font-mono">{output()}</div>
      </Show>

      {/* Error */}
      <Show when={error()}>
        <div class="bg-red-950 border border-red-800 rounded p-3 text-xs text-red-400">{error()}</div>
      </Show>
    </div>
  )
}
