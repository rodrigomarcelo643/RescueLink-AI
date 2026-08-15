import React, { useState } from 'react'
import { useWeatherTelemetry } from '@/hooks/useWeatherTelemetry'
import LiveWeatherMap from '@/components/weather/LiveWeatherMap'
import {
  CloudRain, AlertTriangle, RefreshCw, ShieldAlert, Waves,
  ChevronDown, CheckCircle2, Zap, Map as MapIcon, BarChart2
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

export const WeatherForecastWidget: React.FC = () => {
  const {
    telemetry,
    loading,
    selectedSector,
    setSelectedSector,
    availableSectors,
    lastRefreshedAt,
    refresh
  } = useWeatherTelemetry('cebu', 30000)

  const [activeTab, setActiveTab] = useState<'map' | 'stats'>('map')

  const getSignalBadgeColor = (signal: number) => {
    switch (signal) {
      case 5: return 'bg-purple-950 text-purple-200 border-purple-600 shadow-purple-900/50'
      case 4: return 'bg-red-950 text-red-200 border-red-600 shadow-red-900/50'
      case 3: return 'bg-orange-950 text-orange-200 border-orange-600 shadow-orange-900/50'
      case 2: return 'bg-yellow-950 text-yellow-200 border-yellow-600 shadow-yellow-900/50'
      case 1: return 'bg-blue-950 text-blue-200 border-blue-600 shadow-blue-900/50'
      default: return 'bg-slate-900 text-slate-300 border-slate-700'
    }
  }

  const getRainfallBadge = (advisory: string) => {
    switch (advisory) {
      case 'RED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse"><AlertTriangle className="w-3.5 h-3.5" /> 🔴 RED HEAVY RAIN ALERT (&gt;30 mm/h)</span>
      case 'ORANGE':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-600 text-white"><AlertTriangle className="w-3.5 h-3.5" /> 🟠 ORANGE RAIN WARNING (15-30 mm/h)</span>
      case 'YELLOW':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-slate-950"><AlertTriangle className="w-3.5 h-3.5" /> 🟡 YELLOW RAIN ADVISORY (7.5-15 mm/h)</span>
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> Normal Rainfall (&lt;7.5 mm/h)</span>
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl text-slate-100 backdrop-blur-md">
      {/* ── Header Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <CloudRain className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Live Weather Radar & Telemetry</h2>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Realtime
              </span>
            </div>
            <p className="text-xs text-slate-400">PAGASA Bulletins • RainViewer Doppler Radar • DOST Sensor Telemetry</p>
          </div>
        </div>

        {/* View Switcher Tabs & Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Live Radar Map
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Hourly Statistics
            </button>
          </div>

          {/* Location Selector */}
          <div className="relative">
            <select
              value={selectedSector.id}
              onChange={(e) => {
                const sec = availableSectors.find((s) => s.id === e.target.value)
                if (sec) setSelectedSector(sec)
              }}
              className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {availableSectors.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  📍 {sec.name} ({sec.region})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh weather telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Active System Reactions Banner ─────────────────────────────────── */}
      {telemetry && telemetry.systemReactions.length > 0 && (
        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Zap className="w-4 h-4" /> System Automated Reactivity Engine ({telemetry.systemReactions.length} Triggered)
          </div>
          <div className="grid gap-2">
            {telemetry.systemReactions.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  alert.severity === 'critical'
                    ? 'bg-red-950/80 border-red-600/80 text-red-200'
                    : 'bg-amber-950/80 border-amber-600/80 text-amber-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <h4 className="text-sm font-bold">{alert.title}</h4>
                  </div>
                  <p className="text-xs opacity-90">{alert.description}</p>
                  <p className="text-[11px] font-semibold opacity-80">👉 Action: {alert.recommendedAction}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-black/40 border border-white/10 font-mono font-bold">
                    Auto-Dispatched
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 1: Real Live Map View ───────────────────────────────────────── */}
      {activeTab === 'map' ? (
        <LiveWeatherMap />
      ) : (
        /* ── TAB 2: Hourly Statistics View ──────────────────────────────────── */
        loading && !telemetry ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm">Connecting to Open-Meteo & PAGASA Telemetry stream...</p>
          </div>
        ) : telemetry ? (
          <div className="space-y-5">
            {/* Key Metrics Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* PAGASA TCWS Signal Card */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between ${getSignalBadgeColor(telemetry.pagasa.signalLevel)} shadow-lg`}>
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">PAGASA Warning Tier</span>
                    <span className="text-2xl">🌀</span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">
                    {telemetry.pagasa.signalLevel > 0 ? `TCWS SIGNAL #${telemetry.pagasa.signalLevel}` : 'NO SIGNAL (NORMAL)'}
                  </h3>
                  <p className="text-xs mt-1 opacity-90 font-medium">{telemetry.pagasa.cycloneName}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <span>Peak Gusts: <strong>{telemetry.pagasa.windGustKph} km/h</strong></span>
                  <span>Surge Warning: <strong>{telemetry.pagasa.stormSurgeWarning ? 'YES ⚠️' : 'NO'}</strong></span>
                </div>
              </div>

              {/* Live Weather & Rain Status Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Conditions</span>
                    <span className="text-xl">🌡️</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">{telemetry.forecast.currentTempC}°C</span>
                    <span className="text-xs text-slate-400 font-medium">{telemetry.forecast.weatherDescription}</span>
                  </div>
                  <div className="mt-3">
                    {getRainfallBadge(telemetry.pagasa.rainfallAdvisory)}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs text-slate-400 font-mono">
                  <div>Rain Rate: <span className="text-slate-200 font-bold">{telemetry.forecast.currentPrecipitationMmHr} mm/h</span></div>
                  <div>Humidity: <span className="text-slate-200 font-bold">{telemetry.forecast.humidityPct}%</span></div>
                </div>
              </div>

              {/* 24h Peak Forecast Outlook Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">24-Hour Peak Forecast</span>
                    <span className="text-xl">⚡</span>
                  </div>
                  <div className="space-y-2 mt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Max Rain Next 24h:</span>
                      <span className="font-bold text-blue-400 font-mono">{telemetry.forecast.maxRainNext24hMmHr} mm/h</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (telemetry.forecast.maxRainNext24hMmHr / 40) * 100)}%` }} />
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-slate-400">Max Wind Gusts:</span>
                      <span className="font-bold text-amber-400 font-mono">{telemetry.forecast.maxWindGustNext24hKph} km/h</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (telemetry.forecast.maxWindGustNext24hKph / 150) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>DOST Water Sensors: <strong className="text-slate-200">{telemetry.waterSensors.length} Active</strong></span>
                  <span className="text-slate-500 font-mono">{new Date(lastRefreshedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* 24-Hour Interactive Forecast Chart */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-blue-400" /> 24-Hour Hourly Precipitation (mm/h) & Wind Gust (km/h) Forecast
                </h4>
                <div className="flex items-center gap-4 text-[11px] font-medium">
                  <span className="flex items-center gap-1 text-blue-400"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" /> Rain (mm/h)</span>
                  <span className="flex items-center gap-1 text-amber-400"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Gusts (km/h)</span>
                </div>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetry.forecast.hourly24h} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="formattedTime" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#3b82f6" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px', color: '#f8fafc' }}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="precipitationMm" name="Rain (mm/h)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#rainGrad)" />
                    <Area yAxisId="right" type="monotone" dataKey="windGustKph" name="Wind Gust (km/h)" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={1} fill="url(#windGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DOST Water Level River Sensors Monitor */}
            <div className="border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-cyan-400" /> DOST-ASTI River Level & Ultrasonic Flood Gauges
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {telemetry.waterSensors.map((sensor) => {
                  const ratio = Math.min(100, Math.round((sensor.waterLevelMeters / sensor.floodThresholdMeters) * 100))
                  return (
                    <div key={sensor.stationId} className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-200 truncate">{sensor.riverBasinName}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            sensor.status === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                            sensor.status === 'alarm' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {sensor.status}
                          </span>
                        </div>
                        <div className="text-lg font-mono font-black text-white mt-1">
                          {sensor.waterLevelMeters}m <span className="text-xs text-slate-400 font-normal">/ {sensor.floodThresholdMeters}m max</span>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              ratio >= 90 ? 'bg-red-500' : ratio >= 70 ? 'bg-amber-500' : 'bg-cyan-500'
                            }`}
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null
      )}
    </div>
  )
}

export default WeatherForecastWidget
