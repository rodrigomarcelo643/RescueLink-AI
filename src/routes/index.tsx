import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import ProtectedRoute from './ProtectedRoute'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import ForgotPassword from '@/pages/auth/ForgotPassword'

import Dashboard from '@/pages/lgu/Dashboard'
import Incidents from '@/pages/lgu/Incidents'
import Donations from '@/pages/lgu/Donations'
import Volunteers from '@/pages/lgu/Volunteers'
import Settings from '@/pages/lgu/Settings'
import MonitoringMap from '@/pages/lgu/MonitoringMap'
import FbMonitor from '@/pages/lgu/FbMonitor'
import EvacuationCenters from '@/pages/lgu/EvacuationCenters'
import ResponseAgencies from '@/pages/lgu/ResponseAgencies'

import AgencyRegistrationPage from '@/pages/agency/AgencyRegistrationPage'
import AgencyDashboard from '@/pages/agency/AgencyDashboard'
import AgencyMap from '@/pages/agency/AgencyMap'
import AgencyProfile from '@/pages/agency/AgencyProfile'

import PublicDashboard from '@/pages/public/PublicDashboard'
import PublicReport from '@/pages/public/PublicReport'
import TrackReport from '@/pages/public/TrackReport'

import Unauthorized from '@/pages/shared/Unauthorized'
import MessengerTest from '@/pages/shared/MessengerTest'

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (user && role) {
    const landing: Partial<Record<string, string>> = {
      lgu: '/',
      agency: '/agency-dashboard',
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
        <Route path="/register-agency" element={<AgencyRegistrationPage />} />
        <Route path="/agency-registration" element={<AgencyRegistrationPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/messenger-test" element={<MessengerTest />} />

        {/* Protected LGU routes */}
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

        {/* Protected Response Agency Portal routes */}
        <Route element={<ProtectedRoute allowedRoles={['agency']} />}>
          <Route path="/agency-dashboard" element={<AgencyDashboard />} />
          <Route path="/agency-map" element={<AgencyMap />} />
          <Route path="/agency-profile" element={<AgencyProfile />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
