import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MonitorCloud, Sparkles, User, LogOut, ChevronUp, ChevronDown
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useModal } from '@/context/ModalContext'

export interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
}

const VOLUNTEER_NAV = [
  { to: '/volunteer-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/volunteer/map', label: 'Operations Map', icon: MonitorCloud },
  { to: '/volunteer/matches', label: 'AI Matches & Endorsements', icon: Sparkles },
  { to: '/volunteer/profile', label: 'My Skills & Gear', icon: User },
]

export default function VolunteerSidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { openModal } = useModal()
  const [profileOpen, setProfileOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  const isExpanded = !collapsed || hovered

  const handleSignOut = () => {
    openModal({
      title: 'Sign Out',
      description: 'Are you sure you want to sign out of the Volunteer Portal?',
      icon: <LogOut size={20} className="text-red-600" />,
      confirmLabel: 'Yes, Sign Out',
      cancelLabel: 'Stay Signed In',
      danger: true,
      onConfirm: async () => {
        await signOut()
        navigate('/login')
      },
    })
  }

  const inner = (expanded: boolean, _isMobile = false) => (
    <div className="flex h-full flex-col overflow-hidden bg-white text-gray-900">
      
      {/* ── Nav Items ── */}
      <nav className="flex flex-1 flex-col overflow-y-auto" style={{ padding: '12px 8px' }}>
        <div className="flex flex-col gap-1">
          {VOLUNTEER_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/volunteer-dashboard'}
              onClick={onCloseMobile}
              title={!expanded ? label : undefined}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 py-2.5 text-xs font-bold transition-colors',
                  expanded ? 'px-3' : 'justify-center px-2',
                  isActive ? 'bg-red-50 text-red-700 font-extrabold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                ].join(' ')
              }
              style={{ borderRadius: 6 }}
            >
              <Icon size={16} className="shrink-0" />
              {expanded && <span>{label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── Profile Footer ── */}
      <div className="relative shrink-0" style={{ borderTop: '1px solid #f0f0f0' }}>
        {expanded ? (
          <div className="p-2">
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="flex w-full items-center justify-between p-2 text-left transition-colors hover:bg-gray-50 cursor-pointer"
              style={{ borderRadius: 6 }}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex size-7 shrink-0 items-center justify-center bg-red-100 text-xs font-bold text-red-700 rounded-full">
                  {profile?.full_name?.charAt(0).toUpperCase() || 'V'}
                </div>
                <div className="truncate">
                  <p className="truncate text-xs font-bold text-gray-900">{profile?.full_name || 'Volunteer'}</p>
                  <p className="truncate text-[10px] text-gray-400">📍 {profile?.barangay || 'Cebu Sector'}</p>
                </div>
              </div>
              {profileOpen ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronUp size={14} className="text-gray-400 shrink-0" />}
            </button>

            {profileOpen && (
              <div className="mt-1 flex flex-col gap-1 p-1 bg-white border border-gray-100 shadow-2xs rounded-md">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center p-3 text-gray-400 hover:text-red-600 cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>

    </div>
  )

  return (
    <>
      {/* Desktop Sidebar beneath Top Header */}
      <aside
        onMouseEnter={() => collapsed && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="hidden lg:flex flex-col bg-white shrink-0 transition-all duration-200 relative border-r border-gray-200 h-full"
        style={{
          width: isExpanded ? 240 : 64,
          zIndex: 20,
        }}
      >
        {inner(isExpanded)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-xs" onClick={onCloseMobile} />
          <aside className="relative w-60 h-full z-50 bg-white border-r border-gray-200 shadow-2xl">
            {inner(true, true)}
          </aside>
        </div>
      )}
    </>
  )
}
