import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PanelLeftOpen, PanelLeftClose, Bell, ShieldCheck } from 'lucide-react'
import AgencySidebar from './AgencySidebar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/services/supabase'
import { updateAgencyStatus } from '@/services/responseAgencies.service'
import { updateAgencySession } from '@/services/agencyAuth.service'
import type { Incident } from '@/types/incident'

const PAGE_TITLES: Record<string, string> = {
  '/agency-dashboard': 'Agency Operations & Assigned Tickets',
  '/agency-map':       'Live Incident Operations Map',
  '/agency-profile':   'Station Profile & Hotlines',
}

export type ReadinessStatus = 'available' | 'busy' | 'offline'

const STATUS_CONFIG: Record<ReadinessStatus, { label: string; active: string; idle: string }> = {
  available: { label: '🟢 Available', active: 'bg-emerald-600 text-white shadow-2xs', idle: 'text-gray-600 hover:text-emerald-700' },
  busy:      { label: '🟡 On Scene',  active: 'bg-amber-500 text-white shadow-2xs',   idle: 'text-gray-600 hover:text-amber-700'   },
  offline:   { label: '🔴 Offline',   active: 'bg-gray-700 text-white shadow-2xs',    idle: 'text-gray-600 hover:text-gray-900'    },
}

export default function AgencyShell() {
  const { agency } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [readiness, setReadiness] = useState<ReadinessStatus>('available')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [dispatches, setDispatches] = useState<Incident[]>([])
  const location = useLocation()

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Response Agency Portal'

  // Restore status from session on mount
  useEffect(() => {
    if (!agency) return
    const saved = agency.operational_status as ReadinessStatus | undefined
    setReadiness(saved && saved in STATUS_CONFIG ? saved : 'available')
  }, [agency?.id])

  const handleReadinessChange = async (status: ReadinessStatus) => {
    if (!agency?.id || statusUpdating || readiness === status) return
    setReadiness(status)
    setStatusUpdating(true)
    try {
      const fresh = await updateAgencyStatus(agency.id, status)
      // Persist to session — use DB result if available, otherwise patch current session
      const updated = fresh ?? { ...agency, operational_status: status, is_active: status !== 'offline' }
      updateAgencySession(updated)
    } finally {
      setStatusUpdating(false)
    }
  }

  // Realtime Supabase listener for dispatch offers to this agency
  useEffect(() => {
    if (!agency) return

    const channelName = `agency_shell_dispatches_${agency.id}_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_tickets' },
        (payload) => {
          const inc = payload.new as Incident
          if (!inc) return
          const isTarget =
            inc.assigned_agency_id === agency.id ||
            (inc.assigned_agency_name &&
              inc.assigned_agency_name.toLowerCase().includes(agency.name.toLowerCase()))

          if (isTarget && inc.status === 'pending') {
            setDispatches((prev) => [inc, ...prev.filter((i) => i.id !== inc.id)])
          }
        }
      )
      .subscribe()

    return () => {
      setTimeout(() => {
        supabase.removeChannel(channel)
      }, 100)
    }
  }, [agency])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/60 font-sans">
      <AgencySidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-14 shrink-0 items-center justify-between bg-white px-2.5 sm:px-4 border-b border-gray-200 shadow-2xs gap-2">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden size-8 items-center justify-center text-gray-500 hover:text-gray-900 lg:flex rounded"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="flex size-8 items-center justify-center text-gray-500 hover:text-gray-900 lg:hidden rounded shrink-0"
              title="Open Sidebar Menu"
            >
              <PanelLeftOpen size={18} />
            </button>
            <span className="text-xs sm:text-sm font-extrabold tracking-tight text-gray-900 truncate">
              {pageTitle}
            </span>
          </div>

          {/* Operational Readiness Status Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 p-0.5 sm:p-1 rounded-md border border-gray-200">
              <span className="text-[10px] uppercase text-gray-400 font-extrabold px-1.5 hidden md:inline">
                Status:
              </span>
              {(Object.keys(STATUS_CONFIG) as ReadinessStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => handleReadinessChange(s)}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-extrabold transition-all disabled:opacity-60 whitespace-nowrap ${
                    readiness === s ? STATUS_CONFIG[s].active : STATUS_CONFIG[s].idle
                  }`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>

            {/* Realtime Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative flex size-8 items-center justify-center text-gray-500 hover:text-gray-900 rounded"
              >
                <Bell size={18} />
                {dispatches.length > 0 && (
                  <span className="absolute right-1 top-1 size-2 rounded-full bg-red-600 animate-ping" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-10 z-50 w-72 rounded-lg bg-white shadow-xl border border-gray-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-xs font-extrabold text-gray-900">
                      Dispatch Offers ({dispatches.length})
                    </span>
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="text-[11px] text-gray-400 hover:text-gray-600 font-bold"
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex flex-col divide-y divide-gray-50 max-h-60 overflow-y-auto">
                    {dispatches.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-400 italic text-center">
                        No pending dispatch offers
                      </div>
                    ) : (
                      dispatches.map((inc) => (
                        <div key={inc.id} className="px-4 py-3 flex flex-col gap-1">
                          <p className="text-xs font-bold text-gray-900 capitalize">
                            {inc.disaster_type} — {inc.severity} priority
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">{inc.location_text}</p>
                          <span className="text-[10px] text-amber-700 font-bold">
                            ⚡ Offer Pending Acceptance
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">
              <ShieldCheck size={13} className="text-blue-600" />
              <span className="truncate max-w-[140px]">{agency?.name || 'Response Agency'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="mx-auto max-w-6xl p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
