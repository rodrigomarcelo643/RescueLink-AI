import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PanelLeftOpen, PanelLeftClose, Bell, Zap } from 'lucide-react'
import LGUSidebar from './LGUSidebar'
import IncidentToast, { type ToastItem } from '@/components/shared/IncidentToast'
import { supabase } from '@/services/supabase'
import { updateIncidentStatus } from '@/services/incidents.service'
import { updateIncident, addIncident } from '@/redux/slices/incidentSlice'
import { useDispatch } from 'react-redux'
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
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'RescueLink AI'

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

  // Supabase Realtime Listener for new rescue tickets
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

  // Trigger demo toast for instant user verification
  const triggerDemoAlert = (severity: Incident['severity'] = 'critical') => {
    const sampleIncident: Incident = {
      id: `demo-${Date.now()}`,
      channel: 'web',
      disaster_type: severity === 'critical' ? 'Flood & Fire' : severity === 'high' ? 'Landslide' : 'Flooding',
      location_text: 'Barangay San Jose, Pasig City',
      latitude: 14.5772,
      longitude: 121.1234,
      people_affected: severity === 'critical' ? 12 : 4,
      severity,
      status: 'pending',
      priority_score: severity === 'critical' ? 98 : severity === 'high' ? 82 : 55,
      ai_summary: `AI Validated ${severity.toUpperCase()} Alert: Rapidly rising chest-deep flood waters trapped residents on roof. Emergency dispatch required.`,
      media_urls: [
        'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=600&auto=format&fit=crop',
      ],
      raw_message: 'Saklolo po! Lagpas tao na ang baha dito sa San Jose Pasig, may 12 katao po kami dito!',
      fb_sender_id: null,
      reporter_name: 'Maria Santos',
      reporter_contact: '09171234567',
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    pushToast(sampleIncident)
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
            {/* Demo AI Alert Trigger Button */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => triggerDemoAlert('critical')}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-red-700 hover:bg-red-800 rounded transition-colors shadow-xs"
                title="Test Critical Toast Alert"
              >
                <Zap size={11} /> Critical Alert
              </button>
              <button
                type="button"
                onClick={() => triggerDemoAlert('high')}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors shadow-xs"
                title="Test High Toast Alert"
              >
                High Alert
              </button>
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
