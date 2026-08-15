import React, { useEffect, useState, useRef } from 'react'
import { APIProvider, Map, useMap, AdvancedMarker } from '@vis.gl/react-google-maps'
import { useWeatherTelemetry, type SectorLocation } from '@/hooks/useWeatherTelemetry'
import { useIncidents } from '@/hooks/useIncidents'
import {
  CloudRain, Play, Pause, Waves, Home,
  Layers, Search, Navigation, AlertTriangle, Wind
} from 'lucide-react'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

interface RainViewerTimestamp {
  time: number
  path: string
}

interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  admin1?: string
  country?: string
}

/** Inner component to handle Google Maps Tile Overlays for Weather Radar */
const RadarOverlayController: React.FC<{
  radarTimestamp: number | null
  opacity: number
  showRadar: boolean
}> = ({ radarTimestamp, opacity, showRadar }) => {
  const map = useMap()
  const overlayRef = useRef<any>(null)

  useEffect(() => {
    const winGoogle = (window as any).google
    if (!map || !winGoogle) return

    if (overlayRef.current) {
      const idx = map.overlayMapTypes.getArray().indexOf(overlayRef.current)
      if (idx !== -1) map.overlayMapTypes.removeAt(idx)
      overlayRef.current = null
    }

    if (!showRadar || !radarTimestamp) return

    const tileType = new winGoogle.maps.ImageMapType({
      getTileUrl: (coord: any, zoom: any) => {
        if (!radarTimestamp || zoom < 2 || zoom > 18) return ''
        return `https://tilecache.rainviewer.com/v2/radar/${radarTimestamp}/256/${zoom}/${coord.x}/${coord.y}/2/1_1.png`
      },
      tileSize: new winGoogle.maps.Size(256, 256),
      opacity: opacity,
      name: 'RainViewer Radar',
    })

    overlayRef.current = tileType
    map.overlayMapTypes.push(tileType)

    return () => {
      if (overlayRef.current && map) {
        const idx = map.overlayMapTypes.getArray().indexOf(overlayRef.current)
        if (idx !== -1) map.overlayMapTypes.removeAt(idx)
        overlayRef.current = null
      }
    }
  }, [map, radarTimestamp, opacity, showRadar])

  return null
}

export const LiveWeatherMap: React.FC = () => {
  const { telemetry, selectedSector, setSelectedSector, availableSectors } = useWeatherTelemetry()
  const { items: incidents } = useIncidents()

  // Map view state
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: selectedSector.lat, lng: selectedSector.lng })
  const [zoom, setZoom] = useState<number>(selectedSector.zoom || 11)

  // Layer Visibility Controls
  const [showRadar, setShowRadar] = useState<boolean>(true)
  const [showWaterSensors, setShowWaterSensors] = useState<boolean>(true)
  const [showShelters, setShowShelters] = useState<boolean>(true)
  const [showIncidents] = useState<boolean>(true)
  const [showTyphoonTrack, setShowTyphoonTrack] = useState<boolean>(true)

  // Radar Animation state
  const [timestamps, setTimestamps] = useState<number[]>([])
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [radarOpacity, setRadarOpacity] = useState<number>(0.75)
  const [selectedSensor, setSelectedSensor] = useState<any | null>(null)

  // Geocoding Search State
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([])
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false)

  // Sync map center when selectedSector changes
  useEffect(() => {
    setMapCenter({ lat: selectedSector.lat, lng: selectedSector.lng })
    if (selectedSector.zoom) setZoom(selectedSector.zoom)
  }, [selectedSector])

  // Fetch RainViewer Live Timestamps
  useEffect(() => {
    async function fetchRainViewerData() {
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json')
        if (res.ok) {
          const data = await res.json()
          const pastFrames: RainViewerTimestamp[] = data.radar?.past || []
          const nowcastFrames: RainViewerTimestamp[] = data.radar?.nowcast || []
          const all = [...pastFrames, ...nowcastFrames].map((f) => f.time)
          if (all.length > 0) {
            setTimestamps(all)
            setCurrentFrameIdx(all.length - 1)
          }
        }
      } catch (err) {
        console.warn('RainViewer satellite feed offline:', err)
      }
    }
    fetchRainViewerData()
  }, [])

  // Handle Play / Pause Animation Loop
  useEffect(() => {
    if (!isPlaying || timestamps.length === 0) return
    const interval = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % timestamps.length)
    }, 800)
    return () => clearInterval(interval)
  }, [isPlaying, timestamps])

  // Open-Meteo Geocoding Search Handler for any Barangay or City in the Philippines
  const handleSearchInputChange = async (val: string) => {
    setSearchQuery(val)
    if (val.trim().length < 2) {
      setSearchResults([])
      setShowSearchDropdown(false)
      return
    }

    setIsSearching(true)
    setShowSearchDropdown(true)
    try {
      const endpoint = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=6&language=en&format=json`
      const res = await fetch(endpoint)
      if (res.ok) {
        const data = await res.json()
        const results: GeocodingResult[] = data.results || []
        // Prioritize Philippines locations
        const phFiltered = results.filter((r) => !r.country || r.country === 'Philippines' || r.country === 'PH')
        setSearchResults(phFiltered.length > 0 ? phFiltered : results)
      }
    } catch (e) {
      console.warn('Geocoding search failed:', e)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectSearchResult = (item: GeocodingResult) => {
    const newSec: SectorLocation = {
      id: `search-${item.id}`,
      name: `📍 ${item.name} (${item.admin1 || 'Philippines'})`,
      lat: item.latitude,
      lng: item.longitude,
      region: item.admin1 || 'PH Sector',
      zoom: 12,
    }
    setSelectedSector(newSec)
    setMapCenter({ lat: item.latitude, lng: item.longitude })
    setZoom(12)
    setSearchQuery('')
    setShowSearchDropdown(false)
  }

  // Handle GPS Auto Locate Button
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newSec: SectorLocation = {
          id: 'current_gps',
          name: '🎯 My Current GPS Location',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          region: 'Local Sector',
          zoom: 13,
        }
        setSelectedSector(newSec)
        setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setZoom(13)
      })
    }
  }

  const activeTimestamp = timestamps[currentFrameIdx] ?? null
  const formattedFrameTime = activeTimestamp
    ? new Date(activeTimestamp * 1000).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
    : 'LIVE'

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden">
      {/* ── Header Control Bar with Search & GPS Location ──────────────────── */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <CloudRain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white tracking-wide">Nationwide Live Doppler Radar & Hazard Map</h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                Archipelago Coverage
              </span>
            </div>
            <p className="text-xs text-slate-400">Search any Barangay/City • Live GPS Positioning • RainViewer Doppler Overlay</p>
          </div>
        </div>

        {/* Search Bar & GPS Locate */}
        <div className="flex items-center gap-2 w-full md:w-auto relative">
          {/* Barangay/City Search Input */}
          <div className="relative flex-1 md:w-64">
            <div className="relative">
              <input
                type="text"
                placeholder="Search Barangay or City (e.g., Mandaue, Siargao)..."
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Geocoding Dropdown Results */}
            {showSearchDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto text-xs">
                {isSearching ? (
                  <div className="p-3 text-center text-slate-400">Searching Philippine locations...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between border-b border-slate-800/50 cursor-pointer"
                    >
                      <div className="truncate">
                        <span className="font-bold text-white">{item.name}</span>
                        <span className="text-[11px] text-slate-400 ml-1.5">({item.admin1 || 'PH'})</span>
                      </div>
                      <span className="text-[10px] text-blue-400 font-mono font-semibold">Jump 📍</span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-slate-400">No Philippine locations found</div>
                )}
              </div>
            )}
          </div>

          {/* GPS Auto Locate Button */}
          <button
            onClick={handleLocateMe}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shrink-0"
            title="Focus map on my current GPS location"
          >
            <Navigation className="w-3.5 h-3.5 animate-spin-slow" /> My GPS Location
          </button>
        </div>
      </div>

      {/* ── Nationwide Sector Selector Pills ────────────────────────────────── */}
      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none">
        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider shrink-0 mr-1">Regions:</span>
        {availableSectors.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setSelectedSector(sec)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all shrink-0 cursor-pointer ${
              selectedSector.id === sec.id
                ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            {sec.name}
          </button>
        ))}
      </div>

      {/* ── Interactive Map Container ───────────────────────────────────────── */}
      <div className="relative w-full h-[540px]">
        <APIProvider apiKey={API_KEY}>
          <Map
            center={mapCenter}
            defaultCenter={{ lat: 10.3157, lng: 123.8854 }}
            defaultZoom={11}
            zoom={zoom}
            onCameraChanged={(e) => {
              setMapCenter(e.detail.center)
              setZoom(e.detail.zoom)
            }}
            mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'rescuelink-map'}
            style={{ width: '100%', height: '100%' }}
            gestureHandling="greedy"
            disableDefaultUI
          >
            {/* Live Weather Radar Overlay Controller */}
            <RadarOverlayController
              radarTimestamp={activeTimestamp}
              opacity={radarOpacity}
              showRadar={showRadar}
            />

            {/* 1. DOST River Level Sensor Pins */}
            {showWaterSensors && telemetry?.waterSensors.map((sensor) => {
              const isCritical = sensor.status === 'critical' || sensor.status === 'alarm'
              const sensorLat = selectedSector.lat + (sensor.stationId === 'dost-wl-001' ? -0.015 : sensor.stationId === 'dost-wl-002' ? 0.012 : 0.025)
              const sensorLng = selectedSector.lng + (sensor.stationId === 'dost-wl-001' ? 0.005 : sensor.stationId === 'dost-wl-002' ? 0.018 : -0.012)

              return (
                <AdvancedMarker
                  key={sensor.stationId}
                  position={{ lat: sensorLat, lng: sensorLng }}
                  onClick={() => setSelectedSensor(sensor)}
                >
                  <div className="relative group cursor-pointer">
                    <div
                      className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 shadow-lg text-xs font-mono font-bold text-white transition-transform group-hover:scale-110 ${
                        isCritical ? 'bg-red-600 border-red-400 animate-bounce' : 'bg-cyan-700 border-cyan-400'
                      }`}
                    >
                      <Waves className="w-3.5 h-3.5" />
                      <span>{sensor.waterLevelMeters}m</span>
                    </div>
                  </div>
                </AdvancedMarker>
              )
            })}

            {/* 2. Evacuation Shelter Pins */}
            {showShelters && telemetry?.shelters.map((shelter) => {
              const shelterLat = selectedSector.lat + (shelter.shelterId === 'shelter-01' ? -0.02 : shelter.shelterId === 'shelter-02' ? 0.02 : 0.005)
              const shelterLng = selectedSector.lng + (shelter.shelterId === 'shelter-01' ? -0.01 : shelter.shelterId === 'shelter-02' ? 0.01 : 0.03)

              return (
                <AdvancedMarker
                  key={shelter.shelterId}
                  position={{ lat: shelterLat, lng: shelterLng }}
                >
                  <div className="relative group cursor-pointer">
                    <div className="p-1.5 rounded-full bg-emerald-600 border-2 border-white text-white shadow-md transition-transform group-hover:scale-125">
                      <Home className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </AdvancedMarker>
              )
            })}

            {/* 3. Live Incident Pins */}
            {showIncidents && incidents.filter((i) => i.latitude && i.longitude).map((inc) => (
              <AdvancedMarker
                key={inc.id}
                position={{ lat: inc.latitude!, lng: inc.longitude! }}
              >
                <div className="relative group cursor-pointer">
                  <div className="p-1.5 rounded-full bg-amber-500 border-2 border-white text-slate-950 shadow-md">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                </div>
              </AdvancedMarker>
            ))}

            {/* 4. Typhoon Track Vector */}
            {showTyphoonTrack && telemetry?.pagasa && telemetry.pagasa.signalLevel > 0 && (
              <AdvancedMarker position={{ lat: selectedSector.lat + 0.08, lng: selectedSector.lng + 0.08 }}>
                <div className="relative flex items-center justify-center">
                  <div className="size-16 rounded-full border-2 border-red-500/60 bg-red-500/10 animate-ping absolute" />
                  <div className="size-10 rounded-full border-2 border-red-500 bg-red-950/90 text-red-400 flex items-center justify-center font-black text-xs shadow-xl">
                    🌀 TCWS #{telemetry.pagasa.signalLevel}
                  </div>
                </div>
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>

        {/* ── Floating Map Overlay Controls ─────────────────────────────────── */}
        <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl backdrop-blur-md shadow-xl text-xs space-y-1.5 z-10 w-44">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-blue-400" /> Map Layers
          </div>

          <label className="flex items-center justify-between text-slate-200 cursor-pointer">
            <span className="flex items-center gap-1.5"><CloudRain className="w-3.5 h-3.5 text-blue-400" /> Radar Overlay</span>
            <input type="checkbox" checked={showRadar} onChange={(e) => setShowRadar(e.target.checked)} className="rounded accent-blue-500" />
          </label>

          <label className="flex items-center justify-between text-slate-200 cursor-pointer">
            <span className="flex items-center gap-1.5"><Waves className="w-3.5 h-3.5 text-cyan-400" /> River Sensors</span>
            <input type="checkbox" checked={showWaterSensors} onChange={(e) => setShowWaterSensors(e.target.checked)} className="rounded accent-cyan-500" />
          </label>

          <label className="flex items-center justify-between text-slate-200 cursor-pointer">
            <span className="flex items-center gap-1.5"><Home className="w-3.5 h-3.5 text-emerald-400" /> Shelters</span>
            <input type="checkbox" checked={showShelters} onChange={(e) => setShowShelters(e.target.checked)} className="rounded accent-emerald-500" />
          </label>

          <label className="flex items-center justify-between text-slate-200 cursor-pointer">
            <span className="flex items-center gap-1.5"><Wind className="w-3.5 h-3.5 text-red-400" /> Typhoon Eye</span>
            <input type="checkbox" checked={showTyphoonTrack} onChange={(e) => setShowTyphoonTrack(e.target.checked)} className="rounded accent-red-500" />
          </label>
        </div>

        {/* Doppler Intensity Legend */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl backdrop-blur-md shadow-xl text-xs z-10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Doppler Radar Rain Intensity (dBZ)
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Light</span>
            <div className="h-3 w-32 rounded bg-gradient-to-r from-blue-500 via-green-400 via-yellow-400 via-orange-500 to-red-600" />
            <span className="text-[10px] text-slate-400">Torrential</span>
          </div>
        </div>

        {/* Sensor Detail Popover */}
        {selectedSensor && (
          <div className="absolute bottom-16 left-3 bg-slate-900 border border-slate-700 p-3.5 rounded-xl backdrop-blur-md shadow-2xl z-20 text-xs w-64">
            <div className="flex justify-between items-start mb-1">
              <h5 className="font-bold text-white text-sm">{selectedSensor.riverBasinName}</h5>
              <button onClick={() => setSelectedSensor(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <p className="text-slate-400 font-mono">Station ID: {selectedSensor.stationId}</p>
            <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center">
              <span>Water Elevation:</span>
              <strong className="text-sm font-mono text-cyan-400">{selectedSensor.waterLevelMeters} m</strong>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span>Flood Threshold:</span>
              <strong className="font-mono text-slate-300">{selectedSensor.floodThresholdMeters} m</strong>
            </div>
          </div>
        )}
      </div>

      {/* ── Radar Playback Controls Bar ──────────────────────────────────────── */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={timestamps.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {isPlaying ? 'Pause Radar' : 'Play Loop'}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono">Radar Frame:</span>
            <span className="font-mono font-bold text-blue-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {formattedFrameTime}
            </span>
          </div>
        </div>

        {/* Timeline Slider */}
        {timestamps.length > 0 && (
          <div className="flex-1 max-w-xs flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono">-1h</span>
            <input
              type="range"
              min={0}
              max={timestamps.length - 1}
              value={currentFrameIdx}
              onChange={(e) => {
                setIsPlaying(false)
                setCurrentFrameIdx(Number(e.target.value))
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-[10px] text-slate-500 font-mono">NOW</span>
          </div>
        )}

        {/* Radar Opacity Slider */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Opacity:</span>
          <input
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={radarOpacity}
            onChange={(e) => setRadarOpacity(Number(e.target.value))}
            className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  )
}

class WeatherMapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: any) {
    console.warn('LiveWeatherMap error handled cleanly:', error)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-300">
          <CloudRain className="w-8 h-8 text-blue-400 mx-auto mb-2 animate-bounce" />
          <h4 className="text-sm font-bold text-white">Meteorological Map Stream</h4>
          <p className="text-xs text-slate-400 mt-1">Satellite radar layer re-syncing. Please use Statistics view or refresh.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Retry Radar Map
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function LiveWeatherMapSafe(props: any) {
  return (
    <WeatherMapErrorBoundary>
      <LiveWeatherMap {...props} />
    </WeatherMapErrorBoundary>
  )
}

export default LiveWeatherMapSafe
