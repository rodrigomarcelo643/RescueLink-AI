import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PanelLeftOpen, PanelLeftClose, Bell, ShieldCheck } from 'lucide-react'
import AgencySidebar from './AgencySidebar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/services/supabase'
import type { Incident } from '@/types/incident'

const PAGE_TITLES: Record<string, string> = {
  '/agency-dashboard': 'Agency Operations & Assigned Tickets',
  '/agency-map':       'Live Incident Operations Map',
  '/agency-profile':   'Station Profile & Hotlines',
}

export type ReadinessStatus = 'available' | 'busy' | 'offline'

export default function AgencyShell() {
  const { agency } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [readiness, setReadiness] = useState<ReadinessStatus>('available')
  const [notifOpen, setNotifOpen] = useState(false)
  const [dispatches, setDispatches] = useState<Incident[]>([])
  const location = useLocation()

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Response Agency Portal'

  // Sync operational status with database if agency exists
  useEffect(() => {
    if (!agency?.id) return
    const updateReadinessInDb = async () => {
      try {
        await supabase
          .from('response_agencies')
          .update({ is_active: readiness !== 'offline' })
          .eq('id', agency.id)
      } catch (e) {
        console.warn('Could not update readiness status:', e)
      }
    }
    updateReadinessInDb()
  }, [readiness, agency?.id])

  // Realtime Supabase listener for dispatch offers to this agency
  useEffect(() => {
    if (!agency) return

    const channel = supabase
      .channel('agency_shell_realtime_dispatches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_tickets' },
        (payload) => {
          const inc = payload.new as Incident
          if (!inc) return
          const isTarget = inc.assigned_agency_id === agency.id ||
            (inc.assigned_agency_name && inc.assigned_agency_name.toLowerCase().includes(agency.name.toLowerCase()))

          if (isTarget && inc.status === 'pending') {
            setDispatches((prev) => [inc, ...prev.filter(i => i.id !== inc.id)])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [agency])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/60 font-sans">
      <AgencySidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed(c => !c)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-14 shrink-0 items-center justify-between bg-white px-4 border-b border-gray-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed(c => !c)}
              className="hidden size-8 items-center justify-center text-gray-500 hover:text-gray-900 lg:flex rounded"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="flex size-8 items-center justify-center text-gray-500 hover:text-gray-900 lg:hidden rounded"
            >
              <PanelLeftOpen size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight text-gray-900">{pageTitle}</span>
            </div>
          </div>

          {/* Operational Readiness Status Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md border border-gray-200 text-xs font-bold">
              <span className="text-[10px] uppercase text-gray-400 font-extrabold px-1.5 hidden sm:inline">Status:</span>
              <button
                type="button"
                onClick={() => setReadiness('available')}
                className={`px-2 py-0.5 rounded text-[11px] font-extrabold transition-all ${
                  readiness === 'available' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-gray-600 hover:text-emerald-700'
                }`}
              >
                🟢 Available
              </button>
              <button
                type="button"
                onClick={() => setReadiness('busy')}
                className={`px-2 py-0.5 rounded text-[11px] font-extrabold transition-all ${
                  readiness === 'busy' ? 'bg-amber-500 text-white shadow-2xs' : 'text-gray-600 hover:text-amber-700'
                }`}
              >
                🟡 On Scene
              </button>
              <button
                type="button"
                onClick={() => setReadiness('offline')}
                className={`px-2 py-0.5 rounded text-[11px] font-extrabold transition-all ${
                  readiness === 'offline' ? 'bg-gray-700 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🔴 Offline
              </button>
            </div>

            {/* Realtime Notification Bell Icon */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen(o => !o)}
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
                    <span className="text-xs font-extrabold text-gray-900">Dispatch Offers ({dispatches.length})</span>
                    <button onClick={() => setNotifOpen(false)} className="text-[11px] text-gray-400 hover:text-gray-600 font-bold">Close</button>
                  </div>
                  <div className="flex flex-col divide-y divide-gray-50 max-h-60 overflow-y-auto">
                    {dispatches.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-400 italic text-center">No pending dispatch offers</div>
                    ) : (
                      dispatches.map((inc) => (
                        <div key={inc.id} className="px-4 py-3 flex flex-col gap-1">
                          <p className="text-xs font-bold text-gray-900 capitalize">{inc.disaster_type} — {inc.severity} priority</p>
                          <p className="text-[11px] text-gray-500 truncate">{inc.location_text}</p>
                          <span className="text-[10px] text-amber-700 font-bold">⚡ Offer Pending Acceptance</span>
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
