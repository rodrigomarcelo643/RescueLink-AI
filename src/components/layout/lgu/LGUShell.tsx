import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PanelLeftOpen, PanelLeftClose, Bell } from 'lucide-react'
import LGUSidebar from './LGUSidebar'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/incidents': 'Incidents',
  '/fb-monitor': 'Facebook Monitoring',
  '/donations': 'Donations',
  '/volunteers': 'Volunteers',
  '/public': 'Public View',
  '/map':      'Monitoring Map',
  '/settings': 'Settings',
}

export default function LGUShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'RescueLink AI'

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <LGUSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed(c => !c)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="flex h-14 shrink-0 items-center justify-between bg-white px-4"
          style={{ borderBottom: '1px solid #f0f0f0' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed(c => !c)}
              className="hidden size-8 items-center justify-center text-gray-500 transition-colors hover:text-gray-900 lg:flex"
              style={{ borderRadius: 5 }}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="flex size-8 items-center justify-center text-gray-500 transition-colors hover:text-gray-900 lg:hidden"
              style={{ borderRadius: 5 }}
            >
              <PanelLeftOpen size={18} />
            </button>
            <span className="text-sm font-bold tracking-tight text-gray-900">{pageTitle}</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative flex size-8 items-center justify-center text-gray-500 transition-colors hover:text-gray-900"
              style={{ borderRadius: 5 }}
            >
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-600" />
            </button>

            {notifOpen && (
              <div
                className="absolute right-0 top-10 z-50 w-72 rounded-lg bg-white shadow-lg"
                style={{ border: '1px solid #f0f0f0' }}
              >
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  <button onClick={() => setNotifOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Mark all read</button>
                </div>
                <div className="flex flex-col divide-y divide-gray-50">
                  <div className="px-4 py-3">
                    <p className="text-xs font-medium text-gray-800">New incident reported</p>
                    <p className="text-[11px] text-gray-400">Barangay Poblacion · 2 min ago</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-medium text-gray-800">Volunteer deployment updated</p>
                    <p className="text-[11px] text-gray-400">Team Alpha · 15 min ago</p>
                  </div>
                </div>
                <div className="px-4 py-2" style={{ borderTop: '1px solid #f0f0f0' }}>
                  <button className="text-xs font-medium text-red-600 hover:text-red-700">View all notifications</button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-white">
          <div className="mx-auto max-w-6xl p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
