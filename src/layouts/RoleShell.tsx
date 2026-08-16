import { useAuth } from '@/context/AuthContext'
import LGUShell from '@/components/layout/lgu/LGUShell'
import AgencyShell from '@/components/layout/agency/AgencyShell'
import VolunteerShell from '@/components/layout/volunteer/VolunteerShell'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

// Register new role shells here as the app grows
const ROLE_SHELLS: Partial<Record<string, React.ComponentType>> = {
  lgu: LGUShell,
  agency: AgencyShell,
  volunteer: VolunteerShell,
  citizen: VolunteerShell,
}

export default function RoleShell() {
  const { role, loading } = useAuth()
  if (loading) return <LoadingSpinner />

  const Shell = role ? ROLE_SHELLS[role] : undefined
  if (!Shell) return <LoadingSpinner />

  return <Shell />
}
