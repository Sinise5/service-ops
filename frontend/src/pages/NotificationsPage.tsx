import Layout from "../components/Layout"

export default function NotificationsPage() {
  return (
    <Layout>
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-3xl font-bold text-slate-900">Notifications</h1>
          <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + New Channel
          </button>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <p class="text-slate-600">Notification channels coming soon...</p>
        </div>
      </div>
    </Layout>
  )
}
