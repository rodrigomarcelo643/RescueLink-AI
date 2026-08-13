import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PanelLeftOpen, PanelLeftClose, Bell, Zap } from 'lucide-react'
import LGUSidebar from './LGUSidebar'
import IncidentToast, { type ToastItem } from '@/components/shared/IncidentToast'
import { supabase } from '@/services/supabase'
import { updateIncidentStatus } from '@/services/incidents.service'
import { updateIncident, addIncident } from '@/redux/slices/incidentSlice'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/redux/store'
import type { Incident } from '@/types/incident'

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
  const dispatch = useDispatch()
  const incidents = useSelector((s: RootState) => s.incidents.items)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'RescueLink AI'

  const criticalCount = incidents.filter(i => i.severity === 'critical' && i.status !== 'closed').length
  const highCount = incidents.filter(i => i.severity === 'high' && i.status !== 'closed').length

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback((incident: Incident) => {
    const newToast: ToastItem = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      incident,
      timestamp: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
    }
    setToasts((prev) => [newToast, ...prev].slice(0, 5)) // keep max 5 active toasts
  }, [])

  // Supabase Realtime Listener for new rescue tickets & agency acceptance/declination updates
  useEffect(() => {
    const channel = supabase
      .channel('lgu_shell_realtime_toasts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rescue_tickets' },
        (payload) => {
          const newIncident = payload.new as Incident
          dispatch(addIncident(newIncident))
          pushToast(newIncident)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rescue_tickets' },
        (payload) => {
          const updated = payload.new as Incident
          const oldRecord = payload.old as Partial<Incident>
          dispatch(updateIncident(updated))

          // Real-time toast feedback when agency accepts or declines dispatch
          if (updated.status === 'responding' && oldRecord.status !== 'responding') {
            const acceptToast: Incident = {
              ...updated,
              severity: 'low',
              ai_summary: `🟢 ${updated.assigned_agency_name || 'Response Agency'} accepted dispatch and is now en route!`
            }
            pushToast(acceptToast)
          } else if (oldRecord.assigned_agency_name && !updated.assigned_agency_name && updated.status === 'pending') {
            const declineToast: Incident = {
              ...updated,
              severity: 'high',
              ai_summary: `🔴 Agency declined dispatch offer for ${updated.disaster_type} incident. Please select another agency to re-route!`
            }
            pushToast(declineToast)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [dispatch, pushToast])

  const handleStatusChange = async (id: string, status: Incident['status']) => {
    try {
      await updateIncidentStatus(id, status)
      dispatch(updateIncident({ id, status } as Incident))
    } catch (e) {
      console.error('Status change error:', e)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Top-Right Real-Time Toast Alert Container */}
      <IncidentToast
        toasts={toasts}
        onDismiss={removeToast}
        onStatusChange={handleStatusChange}
      />

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

          <div className="flex items-center gap-3">
            {/* AI Alert Indicators */}
            <div className="flex items-center gap-1.5">
              <span
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-red-700 rounded shadow-xs select-none"
                title="Critical Alerts Indicator"
              >
                <Zap size={11} /> Critical Alert {criticalCount > 0 ? `(${criticalCount})` : ''}
              </span>
              <span
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-orange-600 rounded shadow-xs select-none"
                title="High Alerts Indicator"
              >
                High Alert {highCount > 0 ? `(${highCount})` : ''}
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative flex size-8 items-center justify-center text-gray-500 transition-colors hover:text-gray-900"
                style={{ borderRadius: 5 }}
              >
                <Bell size={18} />
                {toasts.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-600 animate-ping" />
                )}
              </button>

              {notifOpen && (
                <div
                  className="absolute right-0 top-10 z-50 w-72 rounded-lg bg-white shadow-lg"
                  style={{ border: '1px solid #f0f0f0' }}
                >
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <span className="text-sm font-semibold text-gray-900">Notifications ({toasts.length})</span>
                    <button onClick={() => setNotifOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
                  </div>
                  <div className="flex flex-col divide-y divide-gray-50 max-h-60 overflow-y-auto">
                    {toasts.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-400 italic text-center">No active alerts</div>
                    ) : (
                      toasts.map(({ id, incident, timestamp }) => (
                        <div key={id} className="px-4 py-3 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold capitalize text-gray-900">{incident.disaster_type} — {incident.severity}</p>
                            <p className="text-[11px] text-gray-500 truncate max-w-[180px]">{incident.location_text}</p>
                            <span className="text-[10px] text-gray-400">{timestamp}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
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
