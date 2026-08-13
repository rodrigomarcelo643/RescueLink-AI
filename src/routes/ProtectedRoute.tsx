import { Navigate } from 'react-router-dom'
import { useAuth, type UserRole } from '@/context/AuthContext'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import RoleShell from '@/layouts/RoleShell'

interface Props {
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, agency, role, loading } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user && !agency) return <Navigate to="/login" replace />
  if (!role || (allowedRoles && !allowedRoles.includes(role))) {
    return <Navigate to="/unauthorized" replace />
  }

  return <RoleShell />
}
