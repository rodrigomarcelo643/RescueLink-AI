import {
  LayoutDashboard, AlertTriangle, Heart, Users, Globe, Settings, MessageSquare, Map, Building2, ShieldCheck, Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/context/AuthContext'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles: UserRole[]
  group?: string
}

export const NAV_ITEMS: NavItem[] = [
  // ── LGU ──────────────────────────────────────────
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard, roles: ['lgu'], group: 'Overview'    },
  { to: '/incidents',   label: 'Incidents',        icon: AlertTriangle,  roles: ['lgu'], group: 'Operations'  },
  { to: '/fb-monitor',  label: 'FB Monitoring',    icon: MessageSquare,  roles: ['lgu'], group: 'Monitoring'  },
  { to: '/map',          label: 'Monitoring Map',   icon: Map,            roles: ['lgu'], group: 'Monitoring'  },
  { to: '/near-incident-live-monitoring', label: 'Live Incident Feed', icon: Sparkles,    roles: ['lgu'], group: 'Monitoring'  },
  { to: '/donations',   label: 'Donations',        icon: Heart,          roles: ['lgu'], group: 'Operations'  },
  { to: '/volunteers',  label: 'Volunteers',       icon: Users,          roles: ['lgu'], group: 'Operations'  },
  { to: '/evacuation-centers', label: 'Evacuation Centers', icon: Building2, roles: ['lgu'], group: 'Operations' },
  { to: '/response-agencies',  label: 'Response Agencies',  icon: ShieldCheck, roles: ['lgu'], group: 'Operations' },
  { to: '/public',     label: 'Public View',icon: Globe,           roles: ['lgu'], group: 'Overview'    },
  { to: '/settings',   label: 'Settings',   icon: Settings,        roles: ['lgu'], group: 'Account'     },

  // ── Future roles (ngo, volunteer, citizen, admin) ─
  // Add items here with their roles array — sidebar filters automatically
]

export function getNavForRole(role: UserRole | null): NavItem[] {
  if (!role) return []
  return NAV_ITEMS.filter(n => n.roles.includes(role))
}

export function groupNav(items: NavItem[]): Record<string, NavItem[]> {
  return items.reduce<Record<string, NavItem[]>>((acc, item) => {
    const g = item.group ?? 'General'
    ;(acc[g] ??= []).push(item)
    return acc
  }, {})
}
