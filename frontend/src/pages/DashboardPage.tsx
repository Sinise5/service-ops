import { A } from "@solidjs/router"
import { createSignal, For, onMount, Show } from "solid-js"
import { Activity, ArrowRight, Bell, Boxes, CircleAlert, Plus, Radio, Siren } from "lucide-solid"
import Layout from "../components/Layout"
import { api } from "../lib/api"
import { useAuth } from "../stores/AuthStore"

type DashboardStats = { assets: number; checks: number; alertRules: number; incidents: number }

export default function DashboardPage() {
  const auth = useAuth()
  const [stats, setStats] = createSignal<DashboardStats>({ assets: 0, checks: 0, alertRules: 0, incidents: 0 })
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal("")

  const loadStats = async () => {
    setLoading(true)
    setError("")
    try {
      const [assets, checks, alertRules, incidents] = await Promise.all([
        api.get<any[]>("/assets"),
        api.get<any[]>("/monitoring/checks"),
        api.get<any[]>("/alerts/rules"),
        api.get<any[]>("/incidents"),
      ])
      setStats({
        assets: assets?.length || 0,
        checks: checks?.length || 0,
        alertRules: alertRules?.length || 0,
        incidents: incidents?.length || 0,
      })
    } catch (err) {
      console.error("Failed to load dashboard:", err)
      setError(err instanceof Error ? err.message : "Could not load the workspace summary.")
    } finally {
      setLoading(false)
    }
  }

  onMount(loadStats)

  const metrics = () => [
    { label: "Registered assets", value: stats().assets, detail: "Items in your inventory", href: "/assets", icon: Boxes, tone: "text-blue-300 bg-blue-400/10" },
    { label: "Monitoring checks", value: stats().checks, detail: "Configured checks", href: "/monitoring", icon: Activity, tone: "text-cyan-300 bg-cyan-400/10" },
    { label: "Alert rules", value: stats().alertRules, detail: "Rules configured", href: "/alerts", icon: Bell, tone: "text-amber-300 bg-amber-400/10" },
    { label: "Recorded incidents", value: stats().incidents, detail: "Incidents in the workspace", href: "/incidents", icon: Siren, tone: "text-rose-300 bg-rose-400/10" },
  ]

  return (
    <Layout>
      <div class="space-y-8">
        <section class="flex flex-col gap-5 border-b border-slate-800/80 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-blue-300">Operations overview</p>
            <h1 class="text-2xl font-semibold tracking-tight text-white sm:text-[30px]">Good to see you{auth?.user?.email ? `, ${auth.user.email.split("@")[0]}` : ""}</h1>
            <p class="mt-2 max-w-xl text-sm leading-6 text-slate-400">A clear view of your inventory, monitoring setup, and operational activity.</p>
          </div>
          <A href="/assets" class="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 sm:self-auto">
            <Plus size={17} /> Add asset
          </A>
        </section>

        <section aria-labelledby="summary-heading">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 id="summary-heading" class="text-sm font-semibold text-slate-100">Workspace summary</h2>
              <p class="mt-1 text-xs text-slate-500">Current totals from your ServiceOps workspace</p>
            </div>
          </div>

          <Show when={error()}>
            <div role="alert" class="mb-4 flex flex-col gap-3 rounded-lg border border-rose-900/80 bg-rose-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-start gap-3 text-sm text-rose-200">
                <CircleAlert size={18} class="mt-0.5 shrink-0" />
                <div><p class="font-medium">Summary unavailable</p><p class="mt-1 text-rose-200/75">{error()}</p></div>
              </div>
              <button onClick={loadStats} class="self-start rounded-md border border-rose-800 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-rose-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300 sm:self-auto">Try again</button>
            </div>
          </Show>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <For each={metrics()}>{metric => {
              const Icon = metric.icon
              return (
                <A href={metric.href} class="group rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition-colors hover:border-slate-700 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400">
                  <div class="flex items-start justify-between">
                    <span class={`flex h-9 w-9 items-center justify-center rounded-lg ${metric.tone}`}><Icon size={18} strokeWidth={1.8} /></span>
                    <ArrowRight size={16} class="text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" />
                  </div>
                  <p class="mt-5 text-[13px] font-medium text-slate-300">{metric.label}</p>
                  <Show when={!loading()} fallback={<div class="mt-1 h-9 w-16 animate-pulse rounded bg-slate-800" />}>
                    <p class="mt-1 text-[30px] font-semibold leading-9 tracking-tight text-white">{metric.value}</p>
                  </Show>
                  <p class="mt-1 text-xs text-slate-500">{metric.detail}</p>
                </A>
              )
            }}</For>
          </div>
        </section>

        <section aria-labelledby="actions-heading">
          <div class="mb-4">
            <h2 id="actions-heading" class="text-sm font-semibold text-slate-100">Get started</h2>
            <p class="mt-1 text-xs text-slate-500">Jump into the tools you use to manage your environment.</p>
          </div>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <A href="/monitoring" class="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-cyan-300"><Activity size={19} /></span>
              <span class="min-w-0 flex-1"><span class="block text-sm font-medium text-slate-200">Set up monitoring</span><span class="mt-1 block text-xs text-slate-500">Create checks for your services</span></span>
              <ArrowRight size={16} class="text-slate-600 group-hover:text-slate-300" />
            </A>
            <A href="/alerts" class="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-amber-300"><Bell size={19} /></span>
              <span class="min-w-0 flex-1"><span class="block text-sm font-medium text-slate-200">Configure alert rules</span><span class="mt-1 block text-xs text-slate-500">Choose what needs your attention</span></span>
              <ArrowRight size={16} class="text-slate-600 group-hover:text-slate-300" />
            </A>
            <A href="/notifications" class="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-blue-300"><Radio size={19} /></span>
              <span class="min-w-0 flex-1"><span class="block text-sm font-medium text-slate-200">Connect notifications</span><span class="mt-1 block text-xs text-slate-500">Route updates to your team</span></span>
              <ArrowRight size={16} class="text-slate-600 group-hover:text-slate-300" />
            </A>
          </div>
        </section>
      </div>
    </Layout>
  )
}
