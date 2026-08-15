import { useState } from 'react'
import type { AIPredictionResult } from '@/services/aiPredictionService'
import type { Incident } from '@/types/incident'
import {
  ShieldAlert, AlertTriangle, ShieldCheck, LocateFixed, MapPin,
  Clock, Share2, CheckCircle2, ChevronRight, Activity, Info, Radio
} from 'lucide-react'

interface Props {
  prediction: AIPredictionResult | null
  loading: boolean
  onLocateUser: () => void
  locating: boolean
  onSelectBarangay: (lat: number, lng: number, name: string) => void
  onSelectIncident?: (incident: Incident) => void
  onSimulateDisaster?: (disasterType: string) => void
  activeDisasterFilter?: string
}

export default function AIPredictionInspector({
  prediction,
  loading,
  onLocateUser,
  locating,
  onSelectBarangay,
  onSelectIncident,
  onSimulateDisaster,
  activeDisasterFilter = 'all',
}: Props) {
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    if (!prediction) return
    const text = `Community Risk Assessment for ${prediction.locationName}: Risk Index ${prediction.riskScore}% (${prediction.riskLevel.toUpperCase()}). Dominant Hazard: ${prediction.dominantHazard}. Check live map alerts!`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading || !prediction) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
        <div className="size-8 animate-spin rounded-full border-3 border-gray-200 border-t-red-600 mb-3" />
        <p className="text-xs font-bold text-gray-500">Evaluating Community Risk Telemetry…</p>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-red-500', text: 'text-red-700', badgeBg: 'bg-red-100', border: 'border-red-200' }
    if (score >= 50) return { bg: 'bg-orange-500', text: 'text-orange-700', badgeBg: 'bg-orange-100', border: 'border-orange-200' }
    if (score >= 30) return { bg: 'bg-amber-500', text: 'text-amber-700', badgeBg: 'bg-amber-100', border: 'border-amber-200' }
    return { bg: 'bg-green-500', text: 'text-green-700', badgeBg: 'bg-green-100', border: 'border-green-200' }
  }

  const colorCfg = getScoreColor(prediction.riskScore)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col gap-5 p-5">
      {/* Location Picker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-black text-purple-700 uppercase tracking-wide">
            <ShieldAlert size={14} className="text-purple-600 animate-pulse" />
            Community Risk Assessment & Telemetry
          </div>
          <h2 className="text-base font-extrabold text-gray-900 mt-0.5 flex items-center gap-2">
            <MapPin size={16} className="text-red-600 shrink-0" />
            {prediction.locationName}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onLocateUser}
            disabled={locating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
          >
            <LocateFixed size={13} className={locating ? 'animate-spin' : ''} />
            {locating ? 'Locating…' : 'Near Me'}
          </button>

          <select
            onChange={(e) => {
              const val = e.target.value
              if (!val) return
              const baseLat = prediction.coordinates.lat
              const baseLng = prediction.coordinates.lng
              if (val === 'north') onSelectBarangay(baseLat + 0.005, baseLng, 'North Proximity Sector (500m)')
              else if (val === 'east') onSelectBarangay(baseLat, baseLng + 0.010, 'East Proximity Corridor (1.2 km)')
              else if (val === 'south') onSelectBarangay(baseLat - 0.020, baseLng, 'South Proximity Sector (2.5 km)')
              else if (val === 'west') onSelectBarangay(baseLat, baseLng - 0.035, 'West Proximity Corridor (4.0 km)')
              else if (val === 'current') onLocateUser()
            }}
            className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:border-red-500"
          >
            <option value="">Inspect Nearby Sector</option>
            <option value="current">📍 Current Position</option>
            <option value="north">⬆️ North Sector (~500m)</option>
            <option value="east">➡️ East Corridor (~1.2 km)</option>
            <option value="south">⬇️ South Sector (~2.5 km)</option>
            <option value="west">⬅️ West Corridor (~4.0 km)</option>
          </select>
        </div>
      </div>

      {/* Disaster Type Scenario Filter Bar */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-extrabold uppercase text-gray-400">Test Disaster Scenario Type:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: '📍 Live Proximity' },
            { id: 'flood', label: '🌊 Flash Flood' },
            { id: 'typhoon', label: '🌀 Typhoon & Winds' },
            { id: 'fire', label: '🔥 Fire Emergency' },
            { id: 'landslide', label: '⛰️ Landslide Risk' },
            { id: 'earthquake', label: '🌋 Seismic Motion' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onSimulateDisaster?.(item.id)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer"
              style={{
                border: '1px solid',
                borderColor: activeDisasterFilter === item.id ? '#b91c1c' : '#e5e7eb',
                background: activeDisasterFilter === item.id ? '#fef2f2' : '#f9fafb',
                color: activeDisasterFilter === item.id ? '#b91c1c' : '#4b5563',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Score Gauge Banner */}
      <div className={`p-4 rounded-xl border ${colorCfg.border} bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          {/* Circular Score Display */}
          <div className="relative flex items-center justify-center size-16 shrink-0 rounded-full bg-white border border-gray-200 shadow-xs">
            <span className="text-xl font-black text-gray-900">{prediction.riskScore}%</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${colorCfg.badgeBg} ${colorCfg.text}`}>
                {prediction.riskLevel} RISK LEVEL
              </span>
              <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                <Activity size={12} /> Trend: {prediction.predictedTrend}
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-gray-900 mt-1">
              Primary Hazard: <span className="text-red-700">{prediction.dominantHazard}</span>
            </h3>
          </div>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition-colors shadow-2xs self-start md:self-auto cursor-pointer"
        >
          {copied ? <CheckCircle2 size={14} className="text-green-600" /> : <Share2 size={14} />}
          {copied ? 'Copied Advisory!' : 'Share Hazard Advisory'}
        </button>
      </div>

      {/* Community Risk Assessment Summary */}
      <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
            <Info size={14} className="text-purple-600" />
            Community Risk Summary & Proximity Analysis
          </div>
          <span className="text-[10px] font-black uppercase text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
            {prediction.riskLevel.toUpperCase()} ALERT
          </span>
        </div>
        <p className="text-xs text-purple-950 font-medium leading-relaxed">
          {prediction.forecastSummary}
        </p>
      </div>

      {/* Calamities Preparedness & Reactive Dispatch Control Banner */}
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-black">
              <ShieldCheck size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider">
                CALAMITY READINESS TELEMETRY
              </span>
              <h4 className="text-xs font-extrabold text-gray-900">
                Pre-Disaster Preparedness: <span className="text-blue-700">{prediction.calamityReadiness.readinessScore}% Score</span>
              </h4>
            </div>
          </div>

          <span className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded text-white bg-blue-700 w-fit">
            {prediction.calamityReadiness.evacuationStatus.replace('_', ' ')}
          </span>
        </div>

        {/* Vulnerable Group Tracking & Shelter Telemetry */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
          <div className="bg-white p-2 rounded-lg border border-blue-100">
            <span className="text-[10px] text-gray-400 font-bold block">Elderly at Risk</span>
            <span className="text-sm font-black text-gray-900">{prediction.calamityReadiness.vulnerableHeadcount.elderly}</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-blue-100">
            <span className="text-[10px] text-gray-400 font-bold block">Children Sector</span>
            <span className="text-sm font-black text-gray-900">{prediction.calamityReadiness.vulnerableHeadcount.children}</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-blue-100">
            <span className="text-[10px] text-gray-400 font-bold block">PWD / Disabled</span>
            <span className="text-sm font-black text-gray-900">{prediction.calamityReadiness.vulnerableHeadcount.disabled}</span>
          </div>
        </div>

        {/* Hazard Category Matched Shelter Box */}
        <div className="p-3 bg-white border border-blue-200 rounded-xl flex flex-col gap-1 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-extrabold text-gray-900">
              Matched Shelter: <span className="text-blue-900">{prediction.calamityReadiness.nearestOpenShelterName}</span>
            </span>
            {prediction.calamityReadiness.shelterCapabilityBadge && (
              <span className="px-2 py-0.5 text-[10px] font-black bg-blue-100 text-blue-900 rounded">
                {prediction.calamityReadiness.shelterCapabilityBadge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-600 font-medium">
            📍 {prediction.calamityReadiness.shelterDistanceKm} km away • Matched for <strong>{prediction.dominantHazard.toUpperCase()}</strong> victims ({prediction.calamityReadiness.availableCapacity} spots available).
          </p>
          {prediction.calamityReadiness.shelterSpecialty && (
            <p className="text-[10px] text-blue-800 font-bold mt-0.5">
              ✨ Equipment Readiness: {prediction.calamityReadiness.shelterSpecialty}
            </p>
          )}
        </div>

        {/* Live Government Telemetry Feeds Badge Bar */}
        {prediction.telemetrySource && (
          <div className="flex flex-col gap-1.5 pt-2 border-t border-blue-100">
            <span className="text-[10px] font-black uppercase text-blue-900 tracking-wider flex items-center gap-1">
              <Radio size={12} className="text-blue-600 animate-pulse" /> Official Telemetry Live Feeds:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px] font-bold">
              <div className="bg-white p-1.5 rounded border border-blue-200 text-blue-900 truncate">
                📡 {prediction.telemetrySource.pagasaSignal}
              </div>
              <div className="bg-white p-1.5 rounded border border-blue-200 text-blue-900 truncate">
                🌊 {prediction.telemetrySource.dostWaterStatus}
              </div>
              <div className="bg-white p-1.5 rounded border border-blue-200 text-blue-900 truncate">
                🌋 {prediction.telemetrySource.phivolcsMagnitude}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Nearest Accidents + Pattern Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nearest Accidents & Incidents */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-red-600" />
              Nearest Incidents & Accidents ({prediction.nearestIncidents.length})
            </h4>
            <span className="text-[10px] text-gray-400 font-semibold">Click to view details</span>
          </div>

          {prediction.nearestIncidents.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No reported accidents in close proximity.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {prediction.nearestIncidents.map((n) => (
                <div
                  key={n.incident.id}
                  onClick={() => onSelectIncident?.(n.incident)}
                  className="p-2.5 bg-gray-50 hover:bg-red-50/60 rounded-lg border border-gray-150 hover:border-red-300 flex items-center justify-between text-xs transition-all cursor-pointer group"
                >
                  <div className="flex flex-col gap-0.5 pr-2">
                    <span className="font-extrabold text-gray-900 capitalize flex items-center gap-1 group-hover:text-red-700">
                      {n.incident.disaster_type} Incident
                      <span className="text-[10px] font-bold text-gray-400">({n.incident.severity})</span>
                    </span>
                    <span className="text-[11px] text-gray-500 truncate max-w-[180px]">
                      {n.incident.location_text}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-red-100 text-red-700 rounded-full block group-hover:bg-red-600 group-hover:text-white transition-colors">
                      {n.distanceFormatted} {n.direction}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold flex items-center justify-end gap-1 mt-0.5">
                      <Clock size={10} /> {n.timeAgo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hazard Risk Telemetry Insights */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col gap-3">
          <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
            <Radio size={14} className="text-purple-600" />
            Detected Area Telemetry & Risk Signals
          </h4>

          <div className="flex flex-col gap-2">
            {prediction.patternInsights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-150">
                <ChevronRight size={14} className="text-purple-600 shrink-0 mt-0.5" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actionable Resident Safety Checklist */}
      <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
        <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-emerald-600" />
          Recommended Safety Guidelines for Residents
        </h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-950 font-medium">
          {prediction.recommendedActions.map((action, idx) => (
            <li key={idx} className="flex items-center gap-2 bg-white p-2 rounded-md border border-emerald-100 shadow-2xs">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
