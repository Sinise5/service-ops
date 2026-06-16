import { Router, Route, Navigate } from "@solidjs/router"
import { AuthProvider } from "./stores/AuthStore"
import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import AssetsPage from "./pages/AssetsPage"
import MonitoringPage from "./pages/MonitoringPage"
import AlertsPage from "./pages/AlertsPage"
import IncidentsPage from "./pages/IncidentsPage"
import LogsPage from "./pages/LogsPage"
import NotificationsPage from "./pages/NotificationsPage"
import SLAPage from "./pages/SLAPage"
import TopologyPage from "./pages/TopologyPage"
import SettingsPage from "./pages/SettingsPage"
import { ProtectedRoute } from "./components/ProtectedRoute"
import "./index.css"

function WrappedProtectedRoute(props: { component: any }) {
  const Comp = props.component
  return (
    <ProtectedRoute>
      <Comp />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Route path="/login" component={LoginPage} />
        <Route path="/dashboard" component={() => <WrappedProtectedRoute component={DashboardPage} />} />
        <Route path="/assets" component={() => <WrappedProtectedRoute component={AssetsPage} />} />
        <Route path="/monitoring" component={() => <WrappedProtectedRoute component={MonitoringPage} />} />
        <Route path="/alerts" component={() => <WrappedProtectedRoute component={AlertsPage} />} />
        <Route path="/incidents" component={() => <WrappedProtectedRoute component={IncidentsPage} />} />
        <Route path="/notifications" component={() => <WrappedProtectedRoute component={NotificationsPage} />} />
        <Route path="/sla" component={() => <WrappedProtectedRoute component={SLAPage} />} />
        <Route path="/topology" component={() => <WrappedProtectedRoute component={TopologyPage} />} />
        <Route path="/settings" component={() => <WrappedProtectedRoute component={SettingsPage} />} />
        <Route path="/logs" component={() => <WrappedProtectedRoute component={LogsPage} />} />
        <Route path="/" component={() => <Navigate href="/dashboard" />} />
      </Router>
    </AuthProvider>
  )
}
