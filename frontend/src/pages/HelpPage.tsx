import { createSignal, Show } from "solid-js"
import { ChevronDown, ExternalLink } from "lucide-solid"
import Layout from "../components/Layout"

export default function HelpPage() {
  const [expandedSection, setExpandedSection] = createSignal<string | null>(null)

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection() === section ? null : section)
  }

  const sections = [
    {
      id: "getting-started",
      title: "🚀 Getting Started",
      content: [
        {
          heading: "First Login",
          text: "Email: admin@serviceops.local\nPassword: admin123\n\nChange password in Settings after first login."
        },
        {
          heading: "Dashboard Overview",
          text: "Shows system health, active incidents, recent alerts, asset distribution, and uptime summary."
        }
      ]
    },
    {
      id: "assets",
      title: "📦 Asset Management",
      content: [
        {
          heading: "What is an Asset?",
          text: "Any IT resource: Servers, Databases, APIs, Load Balancers, Storage, etc."
        },
        {
          heading: "Create Asset",
          steps: ["Go to Assets page", "Click + New Asset", "Fill name, type, description", "Add metadata tags", "Click Save"]
        },
        {
          heading: "Asset Types",
          text: "Server • Database • API • Cache • Queue • Load Balancer • Storage • Other"
        }
      ]
    },
    {
      id: "monitoring",
      title: "📊 Monitoring",
      content: [
        {
          heading: "Check Types",
          text: "HTTP — GET/POST to endpoint\nPing — ICMP connectivity\nSSL — certificate expiry\nTCP — port availability"
        },
        {
          heading: "Create HTTP Check",
          steps: ["Go to Monitoring", "Click + New Check", "Select asset + HTTP", "Enter URL", "Set status: 200", "Interval: 60s", "Save"]
        },
        {
          heading: "View Results",
          text: "Click check → View Results. See last 50 executions, status, response time, errors."
        },
        {
          heading: "Complete Guide",
          text: "See MONITORING_GUIDE.md for step-by-step setup, correct configurations, and troubleshooting."
        }
      ]
    },
    {
      id: "documentation",
      title: "📚 Documentation",
      content: [
        {
          heading: "Getting Started",
          text: "New to ServiceOps? Start with INTEGRATION_GUIDE.md — complete step-by-step setup from assets to Telegram notifications."
        },
        {
          heading: "Monitoring Guide",
          text: "MONITORING_GUIDE.md: Asset management, HTTP/Ping/SSL/TCP checks, common mistakes, troubleshooting 10s timeout issues, best practices."
        },
        {
          heading: "Alert Rules Guide",
          text: "ALERT_RULES_GUIDE.md: Single-condition vs multi-condition rules, flexible operators (>, <, ==, !=), AND/OR logic, examples, API reference."
        },
        {
          heading: "All Guides",
          text: "INTEGRATION_GUIDE.md — End-to-end setup\nMONITORING_GUIDE.md — Monitoring setup\nALERT_RULES_GUIDE.md — Alert rules reference"
        }
      ]
    },
    {
      id: "alerts",
      title: "🔔 Alerts & Incidents",
      content: [
        {
          heading: "Alert vs Incident",
          text: "Alert Rule: Condition trigger\\nIncident: Actual event when rule fires"
        },
        {
          heading: "Create Alert Rule",
          steps: ["Go to Alerts", "Click + New Rule", "Select check", "Set condition (status != 200)", "Choose severity", "Enable", "Save"]
        },
        {
          heading: "Incident Lifecycle",
          text: "1. Triggered → created\\n2. Acknowledged → team marks seen\\n3. Resolved → fixed and closed"
        },
        {
          heading: "Advanced Conditions (New)",
          text: "Use multiple conditions with AND/OR logic for complex rules.\\nExample: (response_time > 1000 AND status == 'failed') OR response_time > 2000"
        },
        {
          heading: "Condition Fields",
          text: "response_time_ms • status • output"
        },
        {
          heading: "Operators",
          text: "> (greater) • < (less) • == (equals) • != (not equals) • >= • <="
        },
        {
          heading: "View Full Guide",
          text: "See ALERT_RULES_GUIDE.md for complete examples, best practices, and troubleshooting."
        }
      ]
    },
    {
      id: "notifications",
      title: "💬 Notifications",
      content: [
        {
          heading: "Channels",
          text: "Telegram • Discord • Email • Webhooks"
        },
        {
          heading: "Setup Telegram",
          steps: ["@BotFather → /newbot → copy token", "Create group → get chat ID", "ServiceOps → Notifications → + New", "Type: Telegram", "Paste token + chat ID", "Test → Save"]
        },
        {
          heading: "Test Channel",
          text: "Click channel → Test button. Verifies credentials + delivery."
        }
      ]
    },
    {
      id: "sla",
      title: "📈 SLA & Uptime",
      content: [
        {
          heading: "SLA Targets",
          text: "99% = 7h 20m downtime/month\n99.9% = 43m 50s downtime/month\n99.99% = 4m 23s downtime/month"
        },
        {
          heading: "Create Target",
          steps: ["Go to SLA", "Click + New Target", "Select asset", "Set target: 99.9%", "Period: Monthly", "Save"]
        },
        {
          heading: "View Reports",
          text: "Shows current uptime %, downtime minutes, vs target (pass/fail)."
        }
      ]
    },
    {
      id: "topology",
      title: "🌐 Topology",
      content: [
        {
          heading: "View Graph",
          text: "Topology page shows nodes (assets) + edges (dependencies). Click node for details."
        },
        {
          heading: "Add Dependency",
          steps: ["Click + New Dependency", "Source: which depends", "Target: what it depends on", "Type: depends_on/serves", "Save"]
        },
        {
          heading: "Impact Analysis",
          text: "Click asset → Impact Analysis. Shows cascade if asset fails."
        }
      ]
    },
    {
      id: "logs",
      title: "📝 Logs",
      content: [
        {
          heading: "Search Logs",
          steps: ["Go to Logs", "Enter query", "Filter by asset/time", "Search"]
        },
        {
          heading: "Log Levels",
          text: "error (red) • warn (yellow) • info (blue) • debug (gray)"
        }
      ]
    },
    {
      id: "api",
      title: "🔌 API",
      content: [
        {
          heading: "Base URL",
          text: "http://localhost:9080\n\nRequires JWT:\nAuthorization: Bearer <token>"
        },
        {
          heading: "Get Token",
          text: "POST /auth/login\n{\"email\": \"...\", \"password\": \"...\"}"
        },
        {
          heading: "Example",
          text: "POST /assets\nAuthorization: Bearer <token>\n{\"name\": \"Server\", \"type_id\": \"uuid\"}"
        }
      ]
    },
    {
      id: "troubleshooting",
      title: "🔧 Troubleshooting",
      content: [
        {
          heading: "Can't login",
          text: "Default: admin@serviceops.local / admin123. Reset via admin if needed."
        },
        {
          heading: "Checks show no results",
          text: "New checks take 60s to execute. Check backend: /health. Verify enabled."
        },
        {
          heading: "Incidents not triggering",
          text: "Alert + Check must be enabled. Condition must match. Channel configured."
        },
        {
          heading: "Telegram not working",
          text: "Test channel first. Verify token + chat ID. Check bot permissions."
        }
      ]
    }
  ]

  return (
    <Layout>
      <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div class="max-w-4xl mx-auto mb-12">
          <h1 class="text-4xl font-bold text-slate-900 mb-4">📚 ServiceOps Help</h1>
          <p class="text-lg text-slate-600">
            Complete guide to asset management, monitoring, alerts, and more.
          </p>
        </div>

        <div class="max-w-4xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-4 gap-4">
          <a href="#getting-started" class="bg-white p-4 rounded-lg shadow hover:shadow-md transition border-l-4 border-blue-500">
            <div class="text-2xl mb-2">🚀</div>
            <div class="font-semibold text-slate-900">Getting Started</div>
          </a>
          <a href="#assets" class="bg-white p-4 rounded-lg shadow hover:shadow-md transition border-l-4 border-green-500">
            <div class="text-2xl mb-2">📦</div>
            <div class="font-semibold text-slate-900">Assets</div>
          </a>
          <a href="#monitoring" class="bg-white p-4 rounded-lg shadow hover:shadow-md transition border-l-4 border-purple-500">
            <div class="text-2xl mb-2">📊</div>
            <div class="font-semibold text-slate-900">Monitoring</div>
          </a>
          <a href="#alerts" class="bg-white p-4 rounded-lg shadow hover:shadow-md transition border-l-4 border-red-500">
            <div class="text-2xl mb-2">🔔</div>
            <div class="font-semibold text-slate-900">Alerts</div>
          </a>
          <a href="#notifications" class="bg-white p-4 rounded-lg shadow hover:shadow-md transition border-l-4 border-orange-500">
            <div class="text-2xl mb-2">💬</div>
            <div class="font-semibold text-slate-900">Notifications</div>
          </a>
        </div>

        <div class="max-w-4xl mx-auto space-y-4">
          {sections.map((section) => (
            <div key={section.id} class="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                class="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <h2 class="text-xl font-semibold text-slate-900">{section.title}</h2>
                <ChevronDown
                  size={24}
                  class={`text-slate-500 transition transform ${
                    expandedSection() === section.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              <Show when={expandedSection() === section.id}>
                <div class="px-6 pb-6 border-t border-slate-200 space-y-6">
                  {section.content.map((item, idx) => (
                    <div key={idx} class="space-y-3">
                      <h3 class="text-lg font-semibold text-slate-800">{item.heading}</h3>

                      <Show when={item.text}>
                        <p class="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed">
                          {item.text}
                        </p>
                      </Show>

                      <Show when={item.steps}>
                        <ol class="list-decimal list-inside space-y-2">
                          {item.steps.map((step, sIdx) => (
                            <li key={sIdx} class="text-slate-600">{step}</li>
                          ))}
                        </ol>
                      </Show>
                    </div>
                  ))}
                </div>
              </Show>
            </div>
          ))}
        </div>

        <div class="max-w-4xl mx-auto mt-12 bg-slate-900 rounded-lg p-8 text-white text-center">
          <p class="mb-4">Need more help?</p>
          <div class="flex justify-center gap-4">
            <a href="/settings" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition">
              Settings
            </a>
            <a href="https://gitlab.com/QTI/QTI-Research/service-ops" target="_blank" class="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded transition flex items-center gap-2">
              GitLab <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    </Layout>
  )
}
