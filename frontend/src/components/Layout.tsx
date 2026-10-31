import { A, useLocation } from "@solidjs/router"
import { createSignal, For, Show, type ParentProps } from "solid-js"
import {
  Activity,
  Bell,
  Boxes,
  CircleHelp,
  Container,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Radio,
  Settings,
  Siren,
  X,
} from "lucide-solid"
import { useAuth } from "../stores/AuthStore"

const sections = [
  {
    label: "OVERVIEW",
    links: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "OBSERVABILITY",
    links: [
      { href: "/monitoring", label: "Monitoring", icon: Activity },
      { href: "/alerts", label: "Alert rules", icon: Bell },
      { href: "/incidents", label: "Incidents", icon: Siren },
      { href: "/logs", label: "Logs", icon: FileText },
      { href: "/sla", label: "SLA reports", icon: Gauge },
    ],
  },
  {
    label: "INVENTORY & TOOLS",
    links: [
      { href: "/assets", label: "Assets", icon: Boxes },
      { href: "/docker", label: "Docker", icon: Container },
      { href: "/notifications", label: "Notifications", icon: Radio },
    ],
  },
  {
    label: "PREFERENCES",
    links: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/help", label: "Help center", icon: CircleHelp },
    ],
  },
]

export default function Layout(props: ParentProps) {
  const auth = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = createSignal(false)

  const handleLogout = () => {
    auth?.logout()
    window.location.href = "/login"
  }

  const closeMenu = () => setMenuOpen(false)
  const email = () => auth?.user?.email || "User"
  const initials = () => email().slice(0, 1).toUpperCase()

  const sidebar = (mobile = false) => (
    <>
      <div class="flex h-[72px] items-center justify-between border-b border-slate-800/80 px-5">
        <A href="/dashboard" onClick={mobile ? closeMenu : undefined} class="flex items-center gap-3">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm shadow-blue-950/50">
            <Activity size={19} strokeWidth={2.4} />
          </span>
          <span>
            <span class="block text-[15px] font-semibold tracking-tight text-white">ServiceOps</span>
            <span class="block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Operations</span>
          </span>
        </A>
        <Show when={mobile}>
          <button onClick={closeMenu} aria-label="Close navigation" class="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400">
            <X size={18} />
          </button>
        </Show>
      </div>

      <nav aria-label="Main navigation" class="flex-1 space-y-7 overflow-y-auto px-3 py-6">
        <For each={sections}>{section => (
          <section>
            <h2 class="mb-2 px-3 text-[10px] font-semibold tracking-[0.14em] text-slate-500">{section.label}</h2>
            <div class="space-y-1">
              <For each={section.links}>{link => {
                const Icon = link.icon
                return (
                  <A
                    href={link.href}
                    onClick={mobile ? closeMenu : undefined}
                    activeClass="!bg-blue-500/10 !text-blue-300 before:absolute before:inset-y-2 before:left-0 before:w-[2px] before:rounded-full before:bg-blue-400"
                    inactiveClass="text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                    class="relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                  >
                    <Icon size={17} strokeWidth={1.8} />
                    {link.label}
                  </A>
                )
              }}</For>
            </div>
          </section>
        )}</For>
      </nav>

      <div class="border-t border-slate-800/80 p-3">
        <div class="flex items-center gap-3 rounded-lg p-2">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-200">{initials()}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-xs font-medium text-slate-200">{email()}</span>
            <span class="block text-[11px] text-slate-500">ServiceOps account</span>
          </span>
          <button onClick={handleLogout} aria-label="Log out" title="Log out" class="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  )

  const pageTitle = () => {
    for (const section of sections) {
      const match = section.links.find(link => link.href === location.pathname)
      if (match) return match.label
    }
    return "ServiceOps"
  }

  return (
    <div class="min-h-screen bg-slate-950 text-slate-100 lg:pl-[252px]">
      <aside class="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-slate-800/80 bg-slate-900/95 lg:flex">
        {sidebar()}
      </aside>

      <header class="sticky top-0 z-20 flex h-[60px] items-center justify-between border-b border-slate-800/80 bg-slate-950/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div class="flex items-center gap-3">
          <button onClick={() => setMenuOpen(true)} aria-label="Open navigation" class="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 lg:hidden">
            <Menu size={19} />
          </button>
          <div class="text-sm font-medium text-slate-200">{pageTitle()}</div>
        </div>
        <div class="hidden text-xs text-slate-500 sm:block">
          ServiceOps workspace
        </div>
      </header>

      <Show when={menuOpen()}>
        <div class="fixed inset-0 z-40 lg:hidden" onClick={closeMenu} onKeyDown={event => event.key === "Escape" && closeMenu()}>
          <div class="absolute inset-0 bg-black/60" />
          <aside role="dialog" aria-modal="true" aria-label="Main navigation" onClick={event => event.stopPropagation()} class="relative flex h-full w-[280px] max-w-[85vw] flex-col border-r border-slate-800 bg-slate-900 shadow-2xl animate-slide-in">
            {sidebar(true)}
          </aside>
        </div>
      </Show>

      <main class="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {props.children}
      </main>
    </div>
  )
}
