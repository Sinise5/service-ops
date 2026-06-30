import { A } from "@solidjs/router"
import { useAuth } from "../stores/AuthStore"
import { createSignal, type ParentProps } from "solid-js"

export default function Layout(props: ParentProps) {
  const auth = useAuth()
  const [menuOpen, setMenuOpen] = createSignal(false)

  const handleLogout = () => {
    auth?.logout()
    window.location.href = "/login"
  }

  const closeMenu = () => setMenuOpen(false)

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/assets", label: "Assets" },
    { href: "/monitoring", label: "Monitoring" },
    { href: "/alerts", label: "Alerts" },
    { href: "/incidents", label: "Incidents" },
    { href: "/notifications", label: "Notifications" },
    { href: "/sla", label: "SLA" },
    // { href: "/topology", label: "Topology" }, // hidden — still error
    { href: "/logs", label: "Logs" },
    { href: "/docker", label: "🐳 Docker" },
    { href: "/help", label: "📚 Help" },
    { href: "/settings", label: "Settings" },
  ]

  return (
    <div class="min-h-screen bg-slate-950">
      {/* Nav */}
      <nav class="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/70 backdrop-blur-md">
        <div class="px-4 py-2.5 flex items-center justify-between">

          {/* Logo + hamburger row */}
          <div class="flex items-center gap-4">
            <button
              onClick={() => setMenuOpen(!menuOpen())}
              class="lg:hidden p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                {menuOpen()
                  ? <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  : <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                }
              </svg>
            </button>
            <A href="/dashboard" class="text-lg font-bold text-blue-400 flex items-center gap-2 shrink-0">
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              ServiceOps
            </A>
          </div>

          {/* Desktop nav links */}
          <div class="hidden lg:flex items-center gap-1 overflow-x-auto scrollbar-none">
            {links.map(l => (
              <A href={l.href} class="px-2.5 py-1.5 text-sm text-slate-300 hover:text-blue-400 hover:bg-slate-800/50 rounded transition-colors whitespace-nowrap">
                {l.label}
              </A>
            ))}
          </div>

          {/* User info */}
          <div class="flex items-center gap-3 shrink-0">
            <span class="hidden sm:inline text-sm text-slate-400 truncate max-w-[120px]">
              {auth?.user?.email || "User"}
            </span>
            <button
              onClick={handleLogout}
              class="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar overlay */}
      {menuOpen() && (
        <div class="fixed inset-0 z-30 lg:hidden" onClick={closeMenu}>
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <aside
            class="relative w-64 max-w-[75vw] h-full bg-slate-900 border-r border-slate-800 overflow-y-auto p-4 animate-slide-in"
            onClick={e => e.stopPropagation()}
          >
            <div class="flex flex-col gap-1">
              {links.map(l => (
                <A
                  href={l.href}
                  onClick={closeMenu}
                  class="px-3 py-2 text-sm text-slate-300 hover:text-blue-400 hover:bg-slate-800/50 rounded transition-colors"
                >
                  {l.label}
                </A>
              ))}
            </div>
            <div class="mt-6 pt-4 border-t border-slate-800">
              <span class="text-sm text-slate-500 block mb-2">{auth?.user?.email || "User"}</span>
              <button onClick={handleLogout} class="text-sm text-red-400 hover:text-red-300">Logout</button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main class="px-3 sm:px-4 md:px-6 py-4 sm:py-6 mx-auto max-w-[1440px]">
        {props.children}
      </main>
    </div>
  )
}
