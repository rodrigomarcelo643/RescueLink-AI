import { useAuth } from '@/context/AuthContext'
import LGUShell from '@/components/layout/lgu/LGUShell'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

// Register new role shells here as the app grows
const ROLE_SHELLS: Partial<Record<string, React.ComponentType>> = {
  lgu: LGUShell,
  // ngo: NGOShell,
  // volunteer: VolunteerShell,
  // citizen: CitizenShell,
  // admin: AdminShell,
}

export default function RoleShell() {
  const { role, loading } = useAuth()
  if (loading) return <LoadingSpinner />

  const Shell = role ? ROLE_SHELLS[role] : undefined
  if (!Shell) return <LoadingSpinner />

  return <Shell />
}
