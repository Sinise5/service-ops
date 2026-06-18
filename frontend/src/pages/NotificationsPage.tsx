import { createSignal, onMount, For, Show } from 'solid-js'
import { Database, Send, MessageCircle, Mail, Webhook, CheckCircle, AlertCircle, Plus, Edit, Trash2, RotateCw } from 'lucide-solid'
import { api } from '../lib/api'
import Layout from "../components/Layout"

interface NotificationChannel {
  id: string
  name: string
  type: string
  enabled: boolean
  config: Record<string, any>
  created_at: string
  updated_at: string
}

interface NotificationLog {
  id: string
  channel_id: string
  channel_name: string
  status: string
  message: string
  created_at: string
}

export default function NotificationsPage() {
  const [channels, setChannels] = createSignal<NotificationChannel[]>([])
  const [logs, setLogs] = createSignal<NotificationLog[]>([])
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal("")
  const [showForm, setShowForm] = createSignal(false)
  const [editingChannel, setEditingChannel] = createSignal<NotificationChannel | null>(null)
  const [testingChannel, setTestingChannel] = createSignal<string | null>(null)
  const [testResult, setTestResult] = createSignal<{ status: string; message: string } | null>(null)
  const [selectedChannel, setSelectedChannel] = createSignal<string | null>(null)

  const [formData, setFormData] = createSignal({
    name: '',
    type: 'telegram',
    config: { bot_token: '', chat_id: '', webhook_url: '', smtp_host: '', smtp_port: '587', username: '', password: '' }
  })

  const loadChannels = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await api.get<{success: boolean, channels: NotificationChannel[], total: number}>("/notifications/channels")
      setChannels(data.channels || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load channels")
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    const channelId = selectedChannel()
    if (!channelId) return
    try {
      const data = await api.get<NotificationLog[]>(`/notifications/channels/${channelId}/logs`)
      setLogs(data || [])
    } catch (e) {
      console.error("Failed to load logs:", e)
    }
  }

  const saveChannel = async () => {
    const editing = editingChannel()
    const fd = formData()
    
    if (!fd.name || !fd.type) {
      setError("Name and type required")
      return
    }

    // Build config based on type
    let conf: Record<string, any> = {}
    if (fd.type === 'telegram') conf = { bot_token: fd.config.bot_token, chat_id: fd.config.chat_id }
    else if (fd.type === 'discord') conf = { webhook_url: fd.config.webhook_url }
    else if (fd.type === 'email') conf = { smtp_host: fd.config.smtp_host, smtp_port: parseInt(fd.config.smtp_port), username: fd.config.username, password: fd.config.password }
    else if (fd.type === 'webhook') conf = { webhook_url: fd.config.webhook_url }

    setError("")
    try {
      if (editing) {
        await api.put(`/notifications/channels/${editing.id}`, { name: fd.name, type: fd.type, config: conf })
      } else {
        await api.post("/notifications/channels", { name: fd.name, type: fd.type, config: conf })
      }
      resetForm()
      loadChannels()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save channel")
    }
  }

  const deleteChannel = async (id: string) => {
    if (!confirm('Delete this notification channel?')) return
    setError("")
    try {
      await api.delete(`/notifications/channels/${id}`)
      loadChannels()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete channel")
    }
  }

  const testChannel = async (id: string) => {
    setTestingChannel(id)
    setTestResult(null)
    try {
      const data = await api.post<{ message: string; status: string }>(`/notifications/channels/test`, { channel_id: id })
      setTestResult({ status: 'success', message: data.message || 'Test notification sent' })
    } catch (e) {
      setTestResult({ status: 'error', message: e instanceof Error ? e.message : 'Test failed' })
    } finally {
      setTestingChannel(null)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', type: 'telegram', config: { bot_token: '', chat_id: '', webhook_url: '', smtp_host: '', smtp_port: '587', username: '', password: '' } })
    setEditingChannel(null)
    setShowForm(false)
  }

  const editChannel = (ch: NotificationChannel) => {
    setEditingChannel(ch)
    setFormData({ name: ch.name, type: ch.type, config: ch.config })
    setShowForm(true)
  }

  onMount(() => {
    loadChannels()
  })

  const getChannelIcon = (type: string) => {
    if (type === 'telegram') return <Send class="w-5 h-5" />
    if (type === 'discord' || type === 'slack') return <MessageCircle class="w-5 h-5" />
    if (type === 'email') return <Mail class="w-5 h-5" />
    return <Webhook class="w-5 h-5" />
  }

  return (
    <Layout>
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-slate-100">Notification Channels</h1>
          <button
            onClick={() => setShowForm(!showForm())}
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus class="w-4 h-4" />
            {showForm() ? 'Cancel' : 'Add Channel'}
          </button>
        </div>

        <Show when={error()}>
          <div class="bg-red-900/50 border border-red-700 rounded p-3 text-red-200 text-sm">
            {error()}
          </div>
        </Show>

        <Show when={testResult()}>
          <div class={`p-4 rounded-lg ${testResult()!.status === 'success' ? 'bg-green-900/20 border border-green-700' : 'bg-red-900/20 border border-red-700'}`}>
            <div class="flex items-center gap-2">
              {testResult()!.status === 'success' ? <CheckCircle class="w-5 h-5 text-green-400" /> : <AlertCircle class="w-5 h-5 text-red-400" />}
              <p class={testResult()!.status === 'success' ? 'text-green-400' : 'text-red-400'}>{testResult()!.message}</p>
            </div>
          </div>
        </Show>

        <Show when={showForm()}>
          <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h2 class="text-lg font-semibold text-slate-100 mb-4">{editingChannel() ? 'Edit Channel' : 'Create Channel'}</h2>
            <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Name</label>
              <input
                type="text"
                value={formData().name}
                onInput={(e) => setFormData({ ...formData(), name: e.currentTarget.value })}
                class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="My Telegram Channel"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">Type</label>
              <select
                value={formData().type}
                onChange={(e) => setFormData({ ...formData(), type: e.currentTarget.value })}
                class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
                <option value="email">Email</option>
                <option value="webhook">Webhook</option>
              </select>
            </div>

            <Show when={formData().type === 'telegram'}>
              <div class="space-y-3">
                <input type="text" placeholder="Bot Token" value={formData().config.bot_token} onInput={(e) => setFormData({ ...formData(), config: { ...formData().config, bot_token: e.currentTarget.value } })} class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100" />
                <input type="text" placeholder="Chat ID" value={formData().config.chat_id} onInput={(e) => setFormData({ ...formData(), config: { ...formData().config, chat_id: e.currentTarget.value } })} class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100" />
              </div>
            </Show>

            <Show when={formData().type === 'discord'}>
              <input type="text" placeholder="Webhook URL" value={formData().config.webhook_url} onInput={(e) => setFormData({ ...formData(), config: { ...formData().config, webhook_url: e.currentTarget.value } })} class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100" />
            </Show>

            <Show when={formData().type === 'email'}>
              <div class="space-y-3">
                <input type="text" placeholder="SMTP Host" value={formData().config.smtp_host} onInput={(e) => setFormData({ ...formData(), config: { ...formData().config, smtp_host: e.currentTarget.value } })} class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100" />
                <input type="number" placeholder="SMTP Port" value={formData().config.smtp_port} onInput={(e) => setFormData({ ...formData(), config: { ...formData().config, smtp_port: e.currentTarget.value } })} class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100" />
                <input type="text" placeholder="Username" value={formData().config.username} onInput={(e) => setFormData({ ...formData(), config: { ...formData().config, username: e.currentTarget.value } })} class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100" />
                <input type="password" placeholder="Password" value={formData().config.password} onInput={(e) => setFormData({ ...formData(), config: { ...formData().config, password: e.currentTarget.value } })} class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100" />
              </div>
            </Show>

            <Show when={formData().type === 'webhook'}>
              <input type="text" placeholder="Webhook URL" value={formData().config.webhook_url} onInput={(e) => setFormData({ ...formData(), config: { ...formData().config, webhook_url: e.currentTarget.value } })} class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100" />
            </Show>

            <div class="flex gap-3 pt-4">
              <button onClick={saveChannel} class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">Save</button>
              <button onClick={resetForm} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-colors">Cancel</button>
            </div>
            </div>
          </div>
        </Show>

        <div class="grid gap-4">
          <For each={channels()}>
            {(channel) => (
              <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    {getChannelIcon(channel.type)}
                    <div>
                      <h3 class="font-medium text-slate-100">{channel.name}</h3>
                      <p class="text-sm text-slate-400 capitalize">{channel.type}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button onClick={() => testChannel(channel.id)} disabled={testingChannel() === channel.id} class="p-2 hover:bg-slate-800 rounded transition-colors disabled:opacity-50">
                      <RotateCw class="w-4 h-4 text-blue-400" />
                    </button>
                    <button onClick={() => editChannel(channel)} class="p-2 hover:bg-slate-800 rounded transition-colors">
                      <Edit class="w-4 h-4 text-yellow-400" />
                    </button>
                    <button onClick={() => deleteChannel(channel.id)} class="p-2 hover:bg-slate-800 rounded transition-colors">
                      <Trash2 class="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </Layout>
  )
}