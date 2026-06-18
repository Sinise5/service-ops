import { createSignal, onMount, Show, For } from 'solid-js'
import { Settings, Key, Bell, Shield, AlertCircle, CheckCircle, Save } from 'lucide-solid'
import { api } from '../lib/api'
import Layout from "../components/Layout"

interface UserSettings {
  id: string
  email: string
  name: string
  theme: string
  notifications_enabled: boolean
  two_factor_enabled: boolean
  api_keys: ApiKey[]
}

interface ApiKey {
  id: string
  name: string
  key: string
  created_at: string
  last_used: string
}

export default function SettingsPage() {
  const [user, setUser] = createSignal<UserSettings | null>(null)
  const [settings, setSettings] = createSignal({
    theme: 'dark',
    notifications_enabled: true,
    two_factor_enabled: false,
    name: ''
  })
  const [savedMessage, setSavedMessage] = createSignal<string | null>(null)
  const [error, setError] = createSignal("")
  const [apiKeyName, setApiKeyName] = createSignal('')
  const [showNewApiKey, setShowNewApiKey] = createSignal(false)
  const [newApiKey, setNewApiKey] = createSignal<string | null>(null)

  const loadSettings = async () => {
    try {
      const userData = await api.get<UserSettings>("/auth/me")
      setUser(userData)
      setSettings({
        theme: 'dark',
        notifications_enabled: true,
        two_factor_enabled: userData.two_factor_enabled || false,
        name: userData.name || userData.email
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings")
    }
  }

  const saveSettings = async () => {
    setError("")
    try {
      await api.put("/auth/me", settings())
      setSavedMessage('✓ Settings saved successfully')
      setTimeout(() => setSavedMessage(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings")
    }
  }

  const createApiKey = async () => {
    if (!apiKeyName()) return
    setError("")
    try {
      const data = await api.post<{ key: string }>("/auth/api-keys", { name: apiKeyName() })
      setNewApiKey(data.key)
      setApiKeyName('')
      setShowNewApiKey(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create API key")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  onMount(() => {
    loadSettings()
  })

  return (
    <Layout>
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-slate-100">Settings</h1>
          {savedMessage() && <p class="text-green-400 text-sm">{savedMessage()}</p>}
        </div>

        <Show when={error()}>
          <div class="bg-red-900/50 border border-red-700 rounded p-3 text-red-200 text-sm">
            {error()}
          </div>
        </Show>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-slate-100">Account</h2>
          <div class="flex items-center gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
            <div class="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
              {(user()?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p class="font-medium text-slate-100">{user()?.name || 'User'}</p>
              <p class="text-sm text-slate-400">{user()?.email}</p>
            </div>
          </div>
        </div>

        <div class="lg:col-span-2 space-y-4">
          <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div class="flex items-center gap-2 mb-4">
              <Bell class="w-5 h-5 text-blue-400" />
              <h2 class="text-lg font-semibold text-slate-100">Notifications</h2>
            </div>
            <div class="space-y-3">
              <label class="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings().notifications_enabled}
                  onChange={(e) => setSettings({ ...settings(), notifications_enabled: e.currentTarget.checked })}
                  class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                />
                <span class="text-sm text-slate-300">Enable notifications</span>
              </label>
            </div>
          </div>

          <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div class="flex items-center gap-2 mb-4">
              <Shield class="w-5 h-5 text-green-400" />
              <h2 class="text-lg font-semibold text-slate-100">Security</h2>
            </div>
            <div class="space-y-3">
              <label class="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings().two_factor_enabled}
                  onChange={(e) => setSettings({ ...settings(), two_factor_enabled: e.currentTarget.checked })}
                  class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                />
                <span class="text-sm text-slate-300">Two-factor authentication</span>
              </label>
            </div>
          </div>

          <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div class="flex items-center gap-2 mb-4">
              <Key class="w-5 h-5 text-yellow-400" />
              <h2 class="text-lg font-semibold text-slate-100">API Keys</h2>
            </div>
            <div class="space-y-3">
              <Show when={newApiKey()}>
                <div class="p-4 bg-green-900/20 border border-green-700 rounded-lg mb-3">
                  <p class="text-green-400 text-sm mb-2">New API key created!</p>
                  <div class="flex items-center gap-2">
                    <code class="text-sm text-slate-100 bg-slate-800 px-2 py-1 rounded">{newApiKey()}</code>
                    <button onClick={() => copyToClipboard(newApiKey()!)} class="text-sm text-blue-400 hover:text-blue-300">Copy</button>
                  </div>
                </div>
              </Show>

              <div class="flex gap-3">
                <input
                  type="text"
                  value={apiKeyName()}
                  onChange={(e) => setApiKeyName(e.currentTarget.value)}
                  placeholder="API key name"
                  class="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                />
                <button onClick={createApiKey} class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                  Create Key
                </button>
              </div>

              <Show when={user() && user()!.api_keys && user()!.api_keys.length > 0}>
                <For each={user()!.api_keys}>
                  {key => (
                    <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                      <div>
                        <p class="text-sm text-slate-100">{key.name}</p>
                        <p class="text-xs text-slate-400">Created: {new Date(key.created_at).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => copyToClipboard(key.key)} class="p-2 hover:bg-slate-700 rounded transition-colors">
                        <Shield class="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </div>

          <button onClick={saveSettings} class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
            <Save class="w-4 h-4" />
            Save Settings
          </button>
        </div>
        </div>
      </div>
    </Layout>
  )
}