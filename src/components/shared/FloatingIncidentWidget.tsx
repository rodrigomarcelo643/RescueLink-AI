import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import {
  Radio, X, Maximize2, Minimize2, AlertTriangle, MapPin,
  ExternalLink, FileText, ChevronRight, ShieldAlert, Sparkles, Move
} from 'lucide-react'
import { getIncidents } from '@/services/incidents.service'
import type { Incident } from '@/types/incident'
import mainLogo from '/main_logo.jpg'

export default function FloatingIncidentWidget() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  // Do not render widget if on widget mode window to prevent duplication
  const isWidgetModeWindow = new URLSearchParams(location.search).get('mode') === 'widget'

  useEffect(() => {
    let active = true
    const loadTelemetry = async () => {
      try {
        const list = await getIncidents()
        if (active) {
          const unresolved = list.filter((i) => i.status === 'pending' || i.status === 'responding')
          setIncidents(unresolved)
          setLoading(false)
        }
      } catch (err) {
        console.warn('Floating widget telemetry fetch notice:', err)
      }
    }

    loadTelemetry()
    const interval = setInterval(loadTelemetry, 8000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const handlePopDesktopWindow = (e: React.MouseEvent) => {
    e.stopPropagation()
    const appUrl = `${window.location.origin}/happenings?mode=widget`
    const windowFeatures = 'width=440,height=750,left=150,top=80,resizable=yes,scrollbars=yes,status=no,location=no'
    const popWin = window.open(appUrl, 'RescueLinkDesktopWidget', windowFeatures)
    if (popWin) popWin.focus()
  }

  if (isWidgetModeWindow) return null

  const activeCount = incidents.length

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none font-sans">
      <AnimatePresence>
        {!isOpen ? (
          /* Minimized Floating Widget Launcher Pill */
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="pointer-events-auto"
          >
            <button
              onClick={() => {
                setIsOpen(true)
                setIsMinimized(false)
              }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 bg-gradient-to-r from-slate-950 via-purple-950 to-red-950 text-white rounded-full shadow-2xl border border-purple-500/50 hover:border-purple-400 hover:scale-105 transition-all cursor-pointer group"
              title="Click to launch Floating Incident Telemetry Widget"
            >
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex size-3.5 rounded-full bg-red-400 opacity-75" />
                <img src={mainLogo} alt="RescueLink AI" className="h-6 w-6 rounded-full object-cover shrink-0 relative z-10" />
              </div>
              
              <div className="flex flex-col items-start text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1">
                  <Radio size={10} className="text-red-400 animate-pulse" /> Live Telemetry Widget
                </span>
                <span className="text-xs font-extrabold text-white group-hover:text-amber-300 transition-colors">
                  {activeCount > 0 ? `${activeCount} Active Emergency Alerts 🚨` : 'RescueLink AI Widget 🛡️'}
                </span>
              </div>

              <Maximize2 size={13} className="text-purple-300 ml-1 group-hover:text-white transition-colors shrink-0" />
            </button>
          </motion.div>
        ) : (
          /* Draggable Floating Mini-Widget Window */
          <motion.div
            drag
            dragMomentum={false}
            dragConstraints={{ left: -window.innerWidth + 360, right: 0, top: -window.innerHeight + 480, bottom: 0 }}
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            className={`pointer-events-auto w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-purple-900/40 overflow-hidden flex flex-col transition-all ${
              isMinimized ? 'h-14' : 'max-h-[520px]'
            }`}
          >
            {/* Header Bar (Draggable handle) */}
            <div className="bg-gradient-to-r from-purple-950 via-slate-950 to-red-950 px-3.5 py-2.5 text-white flex items-center justify-between cursor-move select-none shrink-0 border-b border-purple-800/40">
              <div className="flex items-center gap-2 min-w-0">
                <Move size={13} className="text-purple-400 shrink-0 opacity-70" />
                <img src={mainLogo} alt="RescueLink AI" className="h-5 w-5 rounded object-cover shrink-0" />
                <span className="text-xs font-black tracking-tight text-white truncate">
                  RescueLink AI Widget
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-red-600/90 text-white rounded shrink-0">
                  {activeCount} Live
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handlePopDesktopWindow}
                  className="p-1 text-amber-300 hover:text-white rounded hover:bg-purple-900/50 transition-colors"
                  title="Pop Standalone Desktop Widget Window 💻"
                >
                  <ExternalLink size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMinimized((prev) => !prev)}
                  className="p-1 text-purple-300 hover:text-white rounded hover:bg-purple-900/50 transition-colors"
                  title={isMinimized ? 'Expand Widget' : 'Minimize Widget'}
                >
                  {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-purple-300 hover:text-red-400 rounded hover:bg-purple-900/50 transition-colors"
                  title="Close Widget"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Widget Body Content */}
            {!isMinimized && (
              <div className="flex flex-col flex-1 overflow-y-auto bg-slate-50/50 p-3 gap-3">
                {/* Live Banner Notice */}
                <div className="p-2.5 bg-gradient-to-r from-purple-900 to-indigo-950 rounded-xl text-white border border-purple-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400 shrink-0" />
                    <div>
                      <span className="font-extrabold text-white block text-[11px]">Real-Time Disaster Telemetry</span>
                      <span className="text-[10px] text-purple-200">Updating live every 8 seconds</span>
                    </div>
                  </div>
                  <Link
                    to="/happenings"
                    className="px-2 py-1 text-[10px] font-black bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-md transition-all shrink-0 flex items-center gap-1"
                  >
                    Feed <ExternalLink size={10} />
                  </Link>
                </div>

                {/* Live Incidents Feed List */}
                <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-64">
                  {loading ? (
                    <div className="p-6 text-center text-xs text-gray-400 font-semibold animate-pulse">
                      Loading live telemetry feeds…
                    </div>
                  ) : incidents.length === 0 ? (
                    <div className="p-5 text-center bg-white rounded-xl border border-gray-200 text-xs text-gray-500 font-medium">
                      <ShieldAlert size={20} className="mx-auto text-emerald-600 mb-1" />
                      No active emergency alerts reported nearby.
                    </div>
                  ) : (
                    incidents.slice(0, 4).map((inc) => (
                      <div
                        key={inc.id}
                        className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-2xs hover:border-purple-300 transition-all flex items-start justify-between gap-2"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-red-100 text-red-700 border border-red-200">
                              {inc.severity}
                            </span>
                            <span className="text-xs font-extrabold text-gray-900 truncate">
                              {inc.disaster_type} Emergency
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 truncate flex items-center gap-1">
                            <MapPin size={10} className="text-red-500 shrink-0" />
                            {inc.location_text}
                          </p>
                        </div>

                        <Link
                          to={`/track/${inc.id}`}
                          className="p-1.5 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors shrink-0"
                          title="Track incident"
                        >
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/80">
                  <Link
                    to="/report"
                    className="px-3 py-2 text-center text-xs font-black text-white bg-red-700 hover:bg-red-800 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1"
                  >
                    <FileText size={12} /> Report SOS 🚨
                  </Link>
                  <Link
                    to="/happenings"
                    className="px-3 py-2 text-center text-xs font-extrabold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <Radio size={12} className="text-purple-700" /> Open Feed 📡
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
