import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Map, Building2, LogOut, ChevronUp, ChevronDown, X, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useModal } from '@/context/ModalContext'
import mainLogo from '@/assets/logo/main_logo.jpg'

export interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
}

const NAV_GROUPS = [
  {
    group: 'Operations',
    items: [
      { to: '/agency-dashboard', label: 'Assigned Tickets', icon: LayoutDashboard },
      { to: '/agency-map',       label: 'Operations Map',   icon: Map             },
    ],
  },
  {
    group: 'Station Profile',
    items: [
      { to: '/agency-profile',   label: 'Agency Profile',   icon: Building2       },
    ],
  },
]

export default function AgencySidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate()
  const { agency, signOut } = useAuth()
  const { openModal } = useModal()
  const [profileOpen, setProfileOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  const isExpanded = !collapsed || hovered

  const handleSignOut = () => {
    openModal({
      title: 'Sign Out Agency Portal',
      description: `Are you sure you want to sign out of ${agency?.name || 'the agency portal'}?`,
      icon: <LogOut size={20} className="text-red-600" />,
      confirmLabel: 'Yes, Sign Out',
      cancelLabel: 'Cancel',
      danger: true,
      onConfirm: async () => {
        await signOut()
        navigate('/login')
      },
    })
  }

  const inner = (expanded: boolean, isMobile = false) => (
    <div className="flex h-full flex-col overflow-hidden bg-white">

      {/* ── Brand header ── */}
      <div
        className="flex shrink-0 items-center justify-between"
        style={{ borderBottom: '1px solid #f0f0f0', padding: expanded ? '12px 12px' : '0 8px', minHeight: expanded ? 84 : 56 }}
      >
        {expanded ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <img src={mainLogo} alt="RescueLink AI" className="shrink-0 object-contain" style={{ width: 44, height: 44, borderRadius: 8 }} />
            <p className="mt-1 text-xs font-extrabold tracking-tight text-gray-900">RescueLink AI</p>
            <p className="text-[9px] font-bold text-red-700 uppercase tracking-wider">Response Agency Portal</p>
          </div>
        ) : (
          <div className="flex w-full items-center justify-center">
            <img src={mainLogo} alt="RescueLink AI" className="shrink-0 object-contain" style={{ width: 28, height: 28, borderRadius: 6 }} />
          </div>
        )}
        {isMobile && (
          <button
            onClick={onCloseMobile}
            className="absolute right-3 top-3 flex size-7 items-center justify-center text-gray-400 transition-colors hover:text-gray-700"
            style={{ borderRadius: 5 }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Nav groups ── */}
      <nav className="flex flex-1 flex-col overflow-y-auto" style={{ padding: '12px 8px' }}>
        {NAV_GROUPS.map(({ group, items }) => (
          <div key={group} className="mb-3">
            {expanded && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {group}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onCloseMobile}
                  title={!expanded ? label : undefined}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 py-2 text-sm font-semibold transition-colors',
                      expanded ? 'px-3' : 'justify-center px-2',
                      isActive ? 'bg-red-50 text-red-700 font-extrabold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    ].join(' ')
                  }
                  style={{ borderRadius: 5 }}
                >
                  <Icon size={15} className="shrink-0" />
                  {expanded && label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Agency Footer ── */}
      <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px' }}>
        {profileOpen && expanded && (
          <div className="mb-1 flex flex-col gap-0.5">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              style={{ borderRadius: 5 }}
            >
              <LogOut size={14} className="shrink-0" />
              Sign Out Agency Account
            </button>
          </div>
        )}

        {expanded ? (
          <button
            onClick={() => setProfileOpen(o => !o)}
            className="flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-gray-50 text-left"
            style={{ borderRadius: 5 }}
          >
            <div
              className="flex size-7 shrink-0 items-center justify-center text-white"
              style={{ background: '#b91c1c', borderRadius: 5 }}
            >
              <ShieldCheck size={14} />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[12px] font-extrabold text-gray-900">{agency?.name ?? 'Agency Portal'}</p>
              <p className="text-[10px] font-medium capitalize text-gray-400 truncate">{agency?.category ?? 'Responder'} Unit</p>
            </div>
            {profileOpen ? <ChevronUp size={12} className="shrink-0 text-gray-400" /> : <ChevronDown size={12} className="shrink-0 text-gray-400" />}
          </button>
        ) : (
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="flex w-full items-center justify-center py-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
            style={{ borderRadius: 5 }}
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      <div
        className="relative hidden h-screen shrink-0 lg:block"
        style={{ width: collapsed ? 64 : 240, transition: 'width 0.2s ease' }}
      />
      <aside
        className="fixed inset-y-0 left-0 hidden h-screen flex-col bg-white lg:flex"
        style={{
          width: collapsed && !hovered ? 64 : 240,
          borderRight: '1px solid #f0f0f0',
          transition: 'width 0.2s ease',
          zIndex: collapsed && hovered ? 50 : 1,
          boxShadow: collapsed && hovered ? '4px 0 16px rgba(0,0,0,0.08)' : 'none',
        }}
        onMouseEnter={() => collapsed && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {inner(isExpanded)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className="fixed inset-y-0 left-0 z-40 w-60 bg-white lg:hidden"
        style={{
          borderRight: '1px solid #f0f0f0',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        {inner(true, true)}
      </aside>
    </>
  )
}
