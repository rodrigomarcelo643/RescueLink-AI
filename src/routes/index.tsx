import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import ProtectedRoute from './ProtectedRoute'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import Dashboard from '@/pages/Dashboard'
import Incidents from '@/pages/Incidents'
import Donations from '@/pages/Donations'
import Volunteers from '@/pages/Volunteers'
import PublicDashboard from '@/pages/PublicDashboard'
import PublicReport from '@/pages/PublicReport'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Unauthorized from '@/pages/Unauthorized'
import ForgotPassword from '@/pages/ForgotPassword'

import TrackReport from '@/pages/TrackReport'
import Settings from '@/pages/Settings'
import MonitoringMap from '@/pages/MonitoringMap'
import FbMonitor from '@/pages/FbMonitor'
import MessengerTest from '@/pages/MessengerTest'
import EvacuationCenters from '@/pages/EvacuationCenters'
import ResponseAgencies from '@/pages/ResponseAgencies'

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (user && role) {
    const landing: Partial<Record<string, string>> = {
      lgu: '/',
      // ngo: '/ngo',
      // volunteer: '/volunteer',
      // citizen: '/citizen',
      // admin: '/admin',
    }
    return <Navigate to={landing[role] ?? '/unauthorized'} replace />
  }
  // user exists but rol  e not yet resolved — keep waiting
  if (user && !role) return <LoadingSpinner />
  return <>{children}</>
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
        {/* Public routes — redirect to dashboard if already logged in */}
        <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
        <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />
        <Route path="/forgot-password" element={<AuthRedirect><ForgotPassword /></AuthRedirect>} />
        <Route path="/public" element={<PublicDashboard />} />
        <Route path="/report" element={<PublicReport />} />
        <Route path="/track/:id" element={<TrackReport />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/messenger-test" element={<MessengerTest />} />

        {/* Protected — role shell handles per-role layout */}
        <Route element={<ProtectedRoute allowedRoles={['lgu']} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/fb-monitor" element={<FbMonitor />} />
          <Route path="/donations" element={<Donations />} />
          <Route path="/volunteers" element={<Volunteers />} />
          <Route path="/evacuation-centers" element={<EvacuationCenters />} />
          <Route path="/response-agencies" element={<ResponseAgencies />} />
          <Route path="/map" element={<MonitoringMap />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
