import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PanelLeftOpen, PanelLeftClose, Navigation, Radio } from 'lucide-react'
import VolunteerSidebar from './VolunteerSidebar'
import mainLogo from '@/assets/logo/main_logo.jpg'
import { updateVolunteerLocation } from '@/services/volunteers.service'
import { useAuth } from '@/context/AuthContext'

const PAGE_TITLES: Record<string, string> = {
  '/volunteer-dashboard': 'Volunteer Overview',
  '/volunteer/dashboard': 'Volunteer Overview',
  '/volunteer/map': 'Live Operations Map',
  '/volunteer/matches': 'AI Matches & Endorsements',
  '/volunteer/profile': 'My Skills & Response Gear',
}

export default function VolunteerShell() {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const location = useLocation()

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Volunteer Portal'

  // Continuous GPS Location Tracking & Sync to Supabase DB when walking/moving
  useEffect(() => {
    if (!('geolocation' in navigator)) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })

        if (user?.id) {
          updateVolunteerLocation(user.id, lat, lng)
        }
      },
      (err) => console.warn('Volunteer GPS telemetry notice:', err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [user?.id])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white text-gray-900 font-sans">
      
      {/* ── 1. Full-Width Top Header Bar (At the Very Top Across 100% Width) ── */}
      <header
        className="flex h-14 shrink-0 items-center justify-between bg-white px-4 z-30"
        style={{ borderBottom: '1px solid #f0f0f0' }}
      >
        <div className="flex items-center gap-3">
          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex size-8 items-center justify-center text-gray-500 transition-colors hover:text-gray-900 lg:hidden cursor-pointer"
            style={{ borderRadius: 5 }}
          >
            <PanelLeftOpen size={18} />
          </button>

          {/* Desktop Collapse Sidebar Toggle */}
          <button
            type="button"
            onClick={() => setCollapsed(c => !c)}
            className="hidden size-8 items-center justify-center text-gray-500 transition-colors hover:text-gray-900 lg:flex cursor-pointer"
            style={{ borderRadius: 5 }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {/* Logo & Platform Name */}
          <div className="flex items-center gap-2.5">
            <img src={mainLogo} alt="RescueLink AI" className="size-8 object-contain rounded-lg border border-gray-200" />
            <span className="text-xs font-black tracking-tight text-gray-900 hidden sm:inline">
              RescueLink AI
            </span>
            <span className="text-xs text-gray-300 font-bold hidden sm:inline">•</span>
            <span className="text-xs font-bold text-red-700">Volunteer Corps</span>
          </div>

          <span className="text-xs text-gray-300 font-bold hidden md:inline">|</span>
          <span className="text-xs font-extrabold text-gray-800 hidden md:inline">{pageTitle}</span>
        </div>

        {/* Right Telemetry Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-gray-700 bg-gray-100 rounded border border-gray-200">
            <Navigation size={11} className="text-red-700" />
            <span>{coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'GPS Position Active'}</span>
          </div>

          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-red-700 rounded shadow-xs select-none">
            <Radio size={11} className="animate-pulse" /> Telemetry Connected
          </span>
        </div>
      </header>

      {/* ── 2. Body Container (Sidebar Left + Page Content Right below Header) ── */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Volunteer Sidebar beneath Top Header */}
        <VolunteerSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapse={() => setCollapsed(c => !c)}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main Page Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

      </div>

    </div>
  )
}
