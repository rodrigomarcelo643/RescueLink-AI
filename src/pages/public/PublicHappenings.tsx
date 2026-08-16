import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import {
  getPublicHappenings,
  calculateAIPrediction,
  type PublicHappening,
  type AIPredictionResult
} from '@/services/aiPredictionService'
import { getEvacuationCenters } from '@/services/evacuationCenters.service'
import type { EvacuationCenter } from '@/types/evacuationCenter'
import type { Incident } from '@/types/incident'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import HappeningsMapAlert from '@/components/incidents/HappeningsMapAlert'
import AIPredictionInspector from '@/components/incidents/AIPredictionInspector'
import HappeningDetailModal from '@/components/incidents/HappeningDetailModal'
import EvacuationCenterDetailsModal, { type EvacuationCenterInfo } from '@/components/evacuation/EvacuationCenterDetailsModal'
import EvacuationSelectionModal from '@/components/evacuation/EvacuationSelectionModal'
import PWAInstallWidgetModal from '@/components/shared/PWAInstallWidgetModal'
import mainLogo from '@/assets/logo/main_logo.jpg'
import {
  requestDeviceNotificationPermission,
  saveUserGPSCoordinates,
  initLiveProximityPushListener,
} from '@/services/deviceNotificationService'
import {
  AlertTriangle, Radio, MapPin, ArrowLeft, FileText,
  Filter, Activity, Search, ChevronRight,
  ShieldCheck, ShieldAlert, CloudLightning, Building2, Layers
} from 'lucide-react'

function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

export default function PublicHappenings() {
  const navigate = useNavigate()
  const isWidgetMode = new URLSearchParams(window.location.search).get('mode') === 'widget'
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [happenings, setHappenings] = useState<PublicHappening[]>([])
  const [evacList, setEvacList] = useState<EvacuationCenter[]>([])
  const [loading, setLoading] = useState(true)

  // Typhoon Simulation State
  const [typhoonSimulated, setTyphoonSimulated] = useState(false)

  // Selected Location Coordinates (Default: Fixed User Location)
  const [selectedCoords, setSelectedCoords] = useState({ lat: 10.3157, lng: 123.8854 })
  const [locationName, setLocationName] = useState('Your Current Proximity')
  const [prediction, setPrediction] = useState<AIPredictionResult | null>(null)
  const [locating, setLocating] = useState(false)
  const [disasterFilter, setDisasterFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'map_alert' | 'ai_forecast' | 'incident' | 'advisory'>('all')

  // Selected Evacuation Center ID
  const [selectedEvacId, setSelectedEvacId] = useState<string | null>(null)

  // Full Details Modal state
  const [selectedDetailItem, setSelectedDetailItem] = useState<Incident | PublicHappening | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Evacuation Center Selection & Details Modals state
  const [evacSelectionModalOpen, setEvacSelectionModalOpen] = useState(false)
  const [evacModalOpen, setEvacModalOpen] = useState(false)
  const [selectedEvacCenterModal, setSelectedEvacCenterModal] = useState<EvacuationCenterInfo | null>(null)

  const handleOpenDetail = (item: Incident | PublicHappening) => {
    setSelectedDetailItem(item)
    setModalOpen(true)
  }

  const fetchAllData = useCallback(async (coords?: { lat: number; lng: number }, forcedType?: string) => {
    try {
      const { data } = await supabase
        .from('rescue_tickets')
        .select('*')
        .in('status', ['pending', 'responding'])
        .order('created_at', { ascending: false })

      const incData: Incident[] = (data as Incident[]) || []
      setIncidents(incData)

      const targetLat = coords?.lat ?? selectedCoords.lat
      const targetLng = coords?.lng ?? selectedCoords.lng
      const typeFilter = forcedType ?? (disasterFilter === 'all' ? undefined : disasterFilter)

      // Calculate AI prediction based on nearest accidents & disaster patterns
      const pred = calculateAIPrediction(targetLat, targetLng, incData, locationName, typeFilter)
      setPrediction(pred)

      // Fetch public happenings stream
      const hList = await getPublicHappenings(coords)
      setHappenings(hList)

      // Fetch evacuation centers list
      const centers = await getEvacuationCenters()
      setEvacList(centers)
      if (centers.length > 0 && !selectedEvacId) {
        setSelectedEvacId(centers[0].id)
      }
    } catch (e) {
      console.error('Error fetching public happenings:', e)
    } finally {
      setLoading(false)
    }
  }, [selectedCoords, locationName, disasterFilter, selectedEvacId])

  const handleSimulateDisaster = (type: string) => {
    setDisasterFilter(type)
    fetchAllData(selectedCoords, type === 'all' ? undefined : type)
  }

  // Toggle Typhoon Category 4 Simulation
  const handleToggleTyphoonSimulation = () => {
    setTyphoonSimulated((prev) => !prev)
  }

  // Open Evacuation Center Details Modal
  const handleOpenEvacuationModal = (center?: EvacuationCenter) => {
    const target = center || sortedEvacuationCenters[0]
    if (!target) return

    const dist = calculateHaversineDistance(
      selectedCoords.lat,
      selectedCoords.lng,
      target.latitude || 10.3157,
      target.longitude || 123.8854
    )

    const centerInfo: EvacuationCenterInfo = {
      name: target.name,
      address: `${target.barangay || 'Barangay'}, ${target.municipality || 'Cebu City'}`,
      distanceKm: dist,
      capacity: target.capacity || 500,
      occupied: target.current_occupancy || 0,
      status: 'open',
      contact: '(032) 261-2222',
      facilities: ['Backup Power Generators', 'Potable Water Station', 'Red Cross Medical Clinic', 'DSWD Relief Packs'],
      lat: target.latitude || selectedCoords.lat + 0.008,
      lng: target.longitude || selectedCoords.lng - 0.008,
    }

    setSelectedEvacCenterModal(centerInfo)
    setEvacModalOpen(true)
  }

  // Auto-detect user's current location on mount & auto-request push notifications
  useEffect(() => {
    initLiveProximityPushListener()
    requestDeviceNotificationPermission()

    if (navigator.geolocation) {
      setLocating(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          saveUserGPSCoordinates(pos.coords.latitude, pos.coords.longitude)
          setSelectedCoords(coords)
          setLocationName('Your Current Proximity')
          fetchAllData(coords)
          setLocating(false)
        },
        (err) => {
          console.warn('Geolocation unavailable or permission denied, using default center:', err)
          setLocating(false)
          fetchAllData()
        },
        { enableHighAccuracy: true, timeout: 7000 }
      )
    } else {
      fetchAllData()
    }

    const channelName = `happenings_channel_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_tickets' },
        () => fetchAllData()
      )
      .subscribe()

    return () => {
      setTimeout(() => {
        supabase.removeChannel(channel)
      }, 100)
    }
  }, [])

  const handleLocateUser = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        saveUserGPSCoordinates(pos.coords.latitude, pos.coords.longitude)
        setSelectedCoords(coords)
        setLocationName('Your Current Proximity')
        fetchAllData(coords)
        setLocating(false)
      },
      () => setLocating(false)
    )
  }

  // Sort evacuation centers by distance to user GPS location
  const sortedEvacuationCenters = evacList
    .map((center) => ({
      ...center,
      distKm: calculateHaversineDistance(
        selectedCoords.lat,
        selectedCoords.lng,
        center.latitude || 10.3157,
        center.longitude || 123.8854
      ),
    }))
    .sort((a, b) => a.distKm - b.distKm)

  const activeEvacCenter = sortedEvacuationCenters.find((c) => c.id === selectedEvacId) || sortedEvacuationCenters[0]

  const filteredHappenings = activeTab === 'all'
    ? happenings
    : happenings.filter((h) => h.type === activeTab)

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans pb-16">
      {/* Sticky Navigation Header */}
      {isWidgetMode ? (
        <div className="sticky top-0 z-30 border-b border-purple-900 bg-purple-950 px-2.5 sm:px-4 py-2 text-white flex items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2 min-w-0">
            <img src={mainLogo} alt="RescueLink AI" className="h-6 w-6 sm:h-7 sm:w-7 rounded-md object-cover shrink-0" />
            <span className="text-xs font-black tracking-tight text-white truncate">
              RescueLink AI <span className="hidden sm:inline">— Live Incident Feed</span>
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <Link
              to="/report"
              className="px-1.5 sm:px-2 py-1 text-[10px] font-black bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-1 shadow-xs whitespace-nowrap"
            >
              <FileText size={11} /> Report 🚨
            </Link>
            <Link
              to="/public"
              className="px-1.5 sm:px-2 py-1 text-[10px] font-black bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1 shadow-xs whitespace-nowrap"
            >
              <Activity size={11} /> Dashboard 📊
            </Link>
          </div>
        </div>
      ) : (
        <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-2.5 sm:px-6 py-2 sm:py-2.5 backdrop-blur-md shadow-xs">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-1.5 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-3 shrink">
              <img src={mainLogo} alt="RescueLink AI" className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg object-cover shadow-xs shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xs sm:text-base font-extrabold tracking-tight text-gray-900 leading-tight truncate">
                  RescueLink AI
                </h1>
                <p className="text-[11px] font-semibold text-gray-500 hidden md:block">Live Incident Feed & Community Risk Telemetry</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <PWAInstallWidgetModal />
              <Link
                to="/report"
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-all shadow-xs"
              >
                <FileText size={13} className="shrink-0" />
                <span className="hidden xs:inline font-extrabold">Report 🚨</span>
                <span className="xs:hidden font-black">SOS</span>
              </Link>
              <button
                onClick={() => navigate('/public')}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft size={13} className="shrink-0" />
                <span className="hidden xs:inline">Dashboard</span>
                <span className="xs:hidden font-black">Back</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-2.5 sm:px-6 pt-3 sm:pt-6 flex flex-col gap-4 sm:gap-6">

        {/* Header Hero Banner with Typhoon Simulator */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950 via-purple-950 to-slate-900 p-5 sm:p-6 text-white shadow-2xl border border-purple-900/50">
          <div className="absolute -right-10 -bottom-10 opacity-10 text-white pointer-events-none">
            <Radio size={160} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-600 text-white rounded-full flex items-center gap-1">
                  <Activity size={12} /> Live Telemetry Feed
                </span>
                {typhoonSimulated && (
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-purple-700 text-white rounded-full animate-pulse border border-purple-400">
                    🌀 Category 4 Typhoon Track Active
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white leading-tight">
                Live Incident Feed & Typhoon Warning Simulator
              </h2>
              <p className="mt-1 text-xs text-gray-200 max-w-2xl font-medium leading-relaxed">
                Real-time neighborhood incident tracking, typhoon distance route telemetry, and mandatory evacuation center directives.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Expand Evacuation Options Button */}
              <button
                type="button"
                onClick={() => setEvacSelectionModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-black bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-lg border border-purple-400/60 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Building2 size={15} /> Expand Evacuation Options 🏫
              </button>

              {/* Simulate Typhoon Warning Button */}
              <button
                onClick={handleToggleTyphoonSimulation}
                className={`w-full sm:w-auto px-4 py-2.5 text-xs font-black rounded-xl shadow-lg border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  typhoonSimulated
                    ? 'bg-purple-700 hover:bg-purple-800 text-white border-purple-400 animate-pulse'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white border-purple-400/50'
                }`}
              >
                <CloudLightning size={16} className="text-amber-300 animate-spin" />
                {typhoonSimulated ? 'Reset Typhoon Simulation 🔄' : 'Simulate Typhoon Warning 🌀'}
              </button>
            </div>
          </div>
        </div>

        {/* Typhoon Warning & Mandatory Evacuation Recommendation Banner */}
        {typhoonSimulated && activeEvacCenter && (
          <div className="bg-gradient-to-r from-red-950 via-purple-950 to-slate-900 text-white p-5 rounded-3xl border-2 border-red-500 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-start gap-3.5">
              <div className="size-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black shrink-0 mt-0.5 shadow-lg border border-red-400">
                <CloudLightning size={26} className="animate-spin text-amber-300" />
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-600 text-white rounded">
                    🚨 MANDATORY EVACUATION DIRECTIVE (SUPER TYPHOON)
                  </span>
                  <span className="text-xs font-bold text-amber-300 font-mono bg-purple-900/80 px-2 py-0.5 rounded border border-purple-700">
                    Track Distance: 4.8 km | Impact Time: ~24 min
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                  AI Directive: All Residents in Low-Lying Sectors Must Migrate to {activeEvacCenter.name} Immediately!
                </h3>

                <p className="text-xs text-purple-200 font-medium">
                  📍 Target Shelter: <button onClick={() => handleOpenEvacuationModal(activeEvacCenter)} className="font-extrabold text-amber-300 underline hover:text-white cursor-pointer">{activeEvacCenter.name}</button> ({activeEvacCenter.distKm} km from your GPS location).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEvacSelectionModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-black text-white bg-purple-800 hover:bg-purple-700 rounded-xl border border-purple-400 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Layers size={14} /> Expand Options 🏫
              </button>
              <button
                type="button"
                onClick={() => handleOpenEvacuationModal(activeEvacCenter)}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-600 hover:to-purple-700 rounded-xl shadow-lg border border-purple-400 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Building2 size={16} /> View Details ↗
              </button>
            </div>
          </div>
        )}

        {/* AI Forecast Inspector & Happenings Map Alert */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Column: AI Prediction Inspector */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <AIPredictionInspector
              prediction={prediction}
              loading={loading}
              onLocateUser={handleLocateUser}
              locating={locating}
              onSelectBarangay={() => {}}
              onSelectIncident={handleOpenDetail}
              onSimulateDisaster={handleSimulateDisaster}
              activeDisasterFilter={disasterFilter}
            />
          </div>

          {/* Right Column: Happenings Interactive Map Alert */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-3.5 sm:p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-1.5 sm:gap-2">
                    <Radio size={15} className="text-red-600 shrink-0" />
                    Public Map Alert & Incident Heatmap
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium">
                    Map is locked to your fixed live GPS position. Driving route lines show distance to nearest incidents.
                  </p>
                </div>
              </div>

              <HappeningsMapAlert
                incidents={incidents}
                prediction={prediction}
                selectedLocation={selectedCoords}
                typhoonSimulated={typhoonSimulated}
                onSelectIncident={handleOpenDetail}
              />
            </div>
          </div>
        </div>

        {/* Live Public Happenings Stream */}
        <div className="bg-white rounded-2xl border border-gray-200 p-3.5 sm:p-6 shadow-sm flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 sm:pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Radio size={17} className="text-purple-600 shrink-0" />
                Live Public Happenings & Community Feed
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">
                Aggregated public stream of verified emergency reports, map alerts, and neighborhood risk assessments.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
              <span className="text-[11px] text-gray-400 font-extrabold flex items-center gap-1 mr-1 shrink-0">
                <Filter size={12} /> Filter:
              </span>
              {[
                { id: 'all', label: 'All', icon: ShieldCheck },
                { id: 'map_alert', label: 'Map Alerts', icon: AlertTriangle },
                { id: 'ai_forecast', label: 'Risk Assessments', icon: ShieldAlert },
                { id: 'incident', label: 'Emergency Reports', icon: MapPin },
                { id: 'advisory', label: 'LGU Notices', icon: Radio },
              ].map((tab) => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
                    style={{
                      border: '1px solid',
                      borderColor: activeTab === tab.id ? '#b91c1c' : '#e5e7eb',
                      background: activeTab === tab.id ? '#fef2f2' : '#fff',
                      color: activeTab === tab.id ? '#b91c1c' : '#4b5563',
                    }}
                  >
                    <IconComponent size={13} className="shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Feed List */}
          {filteredHappenings.length === 0 ? (
            <EmptyState
              title="No Happenings Found"
              description="No public items logged for this category."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredHappenings.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item)}
                  className="group flex flex-col justify-between gap-3.5 sm:gap-4 bg-white p-4 sm:p-5 rounded-xl border border-gray-200 hover:border-red-500 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase rounded text-white"
                        style={{ backgroundColor: item.badgeColor }}
                      >
                        {item.badgeText}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-gray-400">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 group-hover:text-red-700 transition-colors leading-snug">
                        {item.title}
                      </h4>
                      <p className="mt-1 text-[11px] sm:text-xs text-gray-600 font-medium flex items-center gap-1">
                        <MapPin size={12} className="shrink-0 text-red-600" />
                        <span className="truncate">{item.locationText}</span>
                      </p>
                    </div>

                    <p className="text-[11px] sm:text-xs text-gray-600 line-clamp-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-medium leading-relaxed">
                      {item.summary}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-semibold text-[10px] sm:text-[11px]">Click for details</span>
                    <span className="font-extrabold text-red-700 group-hover:translate-x-1 transition-transform flex items-center gap-1 text-[11px] sm:text-xs">
                      <Search size={12} /> Full Details <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incident / Happening Detail Modal */}
        <HappeningDetailModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          item={selectedDetailItem}
          userCoords={selectedCoords}
        />

        {/* Evacuation Centers Selection Modal */}
        <EvacuationSelectionModal
          open={evacSelectionModalOpen}
          onClose={() => setEvacSelectionModalOpen(false)}
          centers={sortedEvacuationCenters}
          selectedId={selectedEvacId}
          onSelectCenter={(id) => {
            setSelectedEvacId(id)
          }}
          onOpenDetails={(center) => handleOpenEvacuationModal(center)}
          userCoords={selectedCoords}
        />

        {/* Evacuation Center Details Modal */}
        <EvacuationCenterDetailsModal
          open={evacModalOpen}
          onClose={() => setEvacModalOpen(false)}
          center={selectedEvacCenterModal}
          userCoords={selectedCoords}
        />

      </div>
    </div>
  )
}
