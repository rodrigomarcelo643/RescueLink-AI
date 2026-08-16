import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useIncidents } from '@/hooks/useIncidents'
import { useDonations } from '@/hooks/useDonations'
import { useVolunteers } from '@/hooks/useVolunteers'
import { useResponseAgencies } from '@/hooks/useResponseAgencies'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import IncidentCard from '@/components/incidents/IncidentCard'
import IncidentMap from '@/components/incidents/IncidentMap'
import type { Incident } from '@/types/incident'
import type { AgencyCategory } from '@/types/responseAgency'
import {
  AlertTriangle, Heart, Users, CheckCircle, Clock,
  TrendingUp, Activity, MapPin, ShieldAlert, ShieldCheck, ChevronRight,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

import { calculateOverallResponseStats } from '@/utils/responseTime'

const SEVERITY_COLOR: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b', responding: '#3b82f6', rescued: '#22c55e', closed: '#9ca3af',
}
const CHANNEL_COLOR: Record<string, string> = {
  messenger: '#1877f2', telegram: '#0ea5e9', whatsapp: '#22c55e', web: '#8b5cf6', facebook: '#1877f2',
}

function timeAgo(dateStr: string) {
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }}
      />
    </div>
  )
}

const AGENCY_CATEGORY_COLOR: Record<AgencyCategory, string> = {
  fire: '#ef4444', police: '#3b82f6', medical: '#22c55e',
  rescue: '#f97316', military: '#6b7280', ngo: '#8b5cf6', other: '#9ca3af',
}

export default function Dashboard() {
  const { items: incidents, loading } = useIncidents()
  const { items: donations } = useDonations()
  const { items: volunteers } = useVolunteers()
  const { items: agencies } = useResponseAgencies()
  const [selected, setSelected] = useState<Incident | null>(null)
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week')

  const filtered = useMemo(() => {
    const now = new Date()
    const cutoff = new Date(now)
    if (period === 'day')   cutoff.setDate(now.getDate() - 1)
    if (period === 'week')  cutoff.setDate(now.getDate() - 7)
    if (period === 'month') cutoff.setMonth(now.getMonth() - 1)
    if (period === 'year')  cutoff.setFullYear(now.getFullYear() - 1)
    return incidents.filter((i) => new Date(i.created_at) >= cutoff)
  }, [incidents, period])

  const responseStats = useMemo(() => calculateOverallResponseStats(filtered), [filtered])

  // ── KPI calculations ──────────────────────────────────────────────────
  const pending    = filtered.filter((i) => i.status === 'pending').length
  const responding = filtered.filter((i) => i.status === 'responding').length
  const rescued    = filtered.filter((i) => i.status === 'rescued').length
  const closed     = filtered.filter((i) => i.status === 'closed').length
  const critical   = filtered.filter((i) => i.severity === 'critical').length
  const high       = filtered.filter((i) => i.severity === 'high').length

  const confirmedDonations = donations.filter((d) => d.status === 'confirmed')
  const totalDonations = confirmedDonations.reduce((s, d) => s + (d.amount ?? 0), 0)
  const pendingDonations = donations.filter((d) => d.status === 'pending').length

  const availableVols = volunteers.filter((v) => v.is_available).length
  const deployedVols  = volunteers.filter((v) => !v.is_available).length

  const resolutionRate = filtered.length
    ? Math.round(((rescued + closed) / filtered.length) * 100)
    : 0

  const avgPriority = filtered.length
    ? Math.round(filtered.reduce((s, i) => s + (i.priority_score ?? 0), 0) / filtered.length)
    : 0

  // ── Breakdowns ────────────────────────────────────────────────────────
  const severityCounts = ['critical', 'high', 'medium', 'low'].map((s) => ({
    label: s,
    count: filtered.filter((i) => i.severity === s).length,
    color: SEVERITY_COLOR[s],
  }))

  const channelCounts = ['messenger', 'facebook', 'telegram', 'whatsapp', 'web'].map((c) => ({
    label: c,
    count: filtered.filter((i) => i.channel === c).length,
    color: CHANNEL_COLOR[c],
  })).filter((c) => c.count > 0)

  // ── Trend data keyed by period ────────────────────────────────────────
  const trendData = useMemo(() => {
    if (period === 'day') {
      return Array.from({ length: 24 }, (_, i) => {
        const h = new Date(); h.setMinutes(0, 0, 0); h.setHours(h.getHours() - (23 - i))
        const label = h.toLocaleTimeString('en-PH', { hour: '2-digit', hour12: true })
        return {
          date: label,
          count: filtered.filter((inc) => {
            const d = new Date(inc.created_at)
            return d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth()
              && d.getDate() === h.getDate() && d.getHours() === h.getHours()
          }).length,
        }
      })
    }
    if (period === 'week') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        const dateStr = d.toISOString().slice(0, 10)
        return {
          date: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
          count: filtered.filter((inc) => inc.created_at.slice(0, 10) === dateStr).length,
        }
      })
    }
    if (period === 'month') {
      return Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i))
        const dateStr = d.toISOString().slice(0, 10)
        return {
          date: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
          count: filtered.filter((inc) => inc.created_at.slice(0, 10) === dateStr).length,
        }
      })
    }
    // year — group by month
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (11 - i))
      const y = d.getFullYear(); const m = d.getMonth()
      return {
        date: d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }),
        count: filtered.filter((inc) => {
          const id = new Date(inc.created_at)
          return id.getFullYear() === y && id.getMonth() === m
        }).length,
      }
    })
  }, [filtered, period])

  // ── Pie data for status ───────────────────────────────────────────────
  const pieData = (['pending', 'responding', 'rescued', 'closed'] as const)
    .map((s) => ({ name: s, value: filtered.filter((i) => i.status === s).length }))
    .filter((d) => d.value > 0)

  // ── Bar data for severity ─────────────────────────────────────────────
  const barData = ['critical', 'high', 'medium', 'low'].map((s) => ({
    name: s,
    count: filtered.filter((i) => i.severity === s).length,
    color: SEVERITY_COLOR[s],
  }))

  // ── Dynamic Response Speed Line Graph Breakdown based on Selected Period ─
  const responseProgressTrend = useMemo(() => {
    const now = new Date()

    if (period === 'day') {
      // 4 Time Blocks Today (12 AM - 6 AM, 6 AM - 12 PM, 12 PM - 6 PM, 6 PM - Now)
      const blocks = [
        { label: '12AM-6AM', hStart: 0, hEnd: 6 },
        { label: '6AM-12PM', hStart: 6, hEnd: 12 },
        { label: '12PM-6PM', hStart: 12, hEnd: 18 },
        { label: '6PM-Now',  hStart: 18, hEnd: 24 },
      ]

      return blocks.map(({ label, hStart, hEnd }) => {
        const blockIncidents = filtered.filter((i) => {
          const d = new Date(i.created_at)
          return d.getHours() >= hStart && d.getHours() < hEnd
        })
        const stats = calculateOverallResponseStats(blockIncidents)
        return {
          interval: label,
          dispatchMins: stats.avgDispatchMinutes,
          rescueMins: stats.avgResolutionMinutes,
        }
      })
    }

    if (period === 'month') {
      // 3 Ten-day blocks (Days 1-10, 11-20, 21-30)
      const blocks = [
        { label: 'Day 1-10', offsetStart: 30, offsetEnd: 20 },
        { label: 'Day 11-20', offsetStart: 20, offsetEnd: 10 },
        { label: 'Day 21-30', offsetStart: 10, offsetEnd: 0 },
      ]

      return blocks.map(({ label, offsetStart, offsetEnd }) => {
        const start = new Date(now); start.setDate(start.getDate() - offsetStart)
        const end = new Date(now); end.setDate(end.getDate() - offsetEnd)

        const blockIncidents = filtered.filter((i) => {
          const d = new Date(i.created_at)
          return d >= start && d <= end
        })
        const stats = calculateOverallResponseStats(blockIncidents)
        return {
          interval: label,
          dispatchMins: stats.avgDispatchMinutes,
          rescueMins: stats.avgResolutionMinutes,
        }
      })
    }

    if (period === 'year') {
      // 4 Quarters
      const quarters = [
        { label: 'Q1', mStart: 0, mEnd: 3 },
        { label: 'Q2', mStart: 3, mEnd: 6 },
        { label: 'Q3', mStart: 6, mEnd: 9 },
        { label: 'Q4', mStart: 9, mEnd: 12 },
      ]

      return quarters.map(({ label, mStart, mEnd }) => {
        const blockIncidents = filtered.filter((i) => {
          const m = new Date(i.created_at).getMonth()
          return m >= mStart && m < mEnd
        })
        const stats = calculateOverallResponseStats(blockIncidents)
        return {
          interval: label,
          dispatchMins: stats.avgDispatchMinutes,
          rescueMins: stats.avgResolutionMinutes,
        }
      })
    }

    // Default 'week' -> 4 weeks
    const weeks = [
      { label: '3 Wks Ago', offsetStart: 28, offsetEnd: 21 },
      { label: '2 Wks Ago', offsetStart: 21, offsetEnd: 14 },
      { label: 'Last Wk', offsetStart: 14, offsetEnd: 7 },
      { label: 'This Wk', offsetStart: 7, offsetEnd: 0 },
    ]

    return weeks.map(({ label, offsetStart, offsetEnd }) => {
      const start = new Date(now); start.setDate(start.getDate() - offsetStart)
      const end = new Date(now); end.setDate(end.getDate() - offsetEnd)

      const blockIncidents = incidents.filter((i) => {
        const d = new Date(i.created_at)
        return d >= start && d <= end
      })
      const stats = calculateOverallResponseStats(blockIncidents)
      return {
        interval: label,
        dispatchMins: stats.avgDispatchMinutes,
        rescueMins: stats.avgResolutionMinutes,
      }
    })
  }, [filtered, incidents, period])

  // ── Doughnut Data for Elapsed Response Status ──────────────────────────
  const doughnutData = useMemo(() => {
    let pendingCount = 0
    let activeSLAOK = 0
    let activeSLADelayed = 0
    let resolvedCount = 0

    const now = Date.now()

    filtered.forEach((i) => {
      if (i.status === 'pending') {
        pendingCount++
      } else if (i.status === 'responding') {
        const createdMs = new Date(i.created_at).getTime()
        const elapsedMins = (now - createdMs) / 60000
        if (elapsedMins <= 10) {
          activeSLAOK++
        } else {
          activeSLADelayed++
        }
      } else if (i.status === 'rescued' || i.status === 'closed') {
        resolvedCount++
      }
    })

    const items = [
      { name: 'Pending Dispatch', value: pendingCount, color: '#f59e0b' },
      { name: 'En Route (<10m SLA)', value: activeSLAOK, color: '#22c55e' },
      { name: 'En Route (>10m Delayed)', value: activeSLADelayed, color: '#ef4444' },
      { name: 'Rescued / Closed', value: resolvedCount, color: '#3b82f6' },
    ]

    const total = items.reduce((s, x) => s + x.value, 0)
    if (total === 0) {
      return [{ name: 'No Active Dispatches', value: 1, color: '#9ca3af' }]
    }

    return items.filter((x) => x.value > 0)
  }, [filtered])

  // ── Recent activity ───────────────────────────────────────────────────
  const recent = [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 8)

  const PERIOD_LABEL: Record<string, string> = {
    day: 'Last 24 Hours', week: 'Last 7 Days', month: 'Last 30 Days', year: 'Last 12 Months',
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-400">Real-time rescue operations overview</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 outline-none"
            style={{ border: '1px solid #e5e7eb', borderRadius: 5, background: '#fff' }}
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-gray-400">Live</span>
          </div>
        </div>
      </div>

      {/* ── Row 1: Primary KPIs ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total Incidents', value: filtered.length, icon: AlertTriangle, color: '#b91c1c', sub: `${pending} pending` },
          { label: 'Responding',      value: responding,       icon: Activity,      color: '#3b82f6', sub: `${critical} critical` },
          { label: 'Rescued',         value: rescued,          icon: CheckCircle,   color: '#22c55e', sub: `${resolutionRate}% resolution` },
          { label: 'Donations',       value: `₱${totalDonations.toLocaleString()}`, icon: Heart, color: '#ec4899', sub: `${pendingDonations} pending` },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="flex flex-col gap-2 bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
              <Icon size={14} style={{ color }} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{value}</p>
            <p className="text-[11px] text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Row 2: Secondary KPIs ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Volunteers Available', value: availableVols, icon: Users,      color: '#8b5cf6', sub: `${deployedVols} deployed` },
          { label: 'Critical Incidents',   value: critical,      icon: ShieldAlert, color: '#ef4444', sub: `${high} high severity` },
          { label: 'Avg Priority Score',   value: avgPriority,   icon: TrendingUp,  color: '#f97316', sub: 'across all tickets' },
          { label: 'Pending Rescue',        value: pending,       icon: Clock,       color: '#f59e0b', sub: `${closed} closed today` },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="flex flex-col gap-2 bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
              <Icon size={14} style={{ color }} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{value}</p>
            <p className="text-[11px] text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── SLA & Response Time Analytics Card ── */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded-lg text-purple-700">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                Agency Response Time & SLA Performance Telemetry
              </h3>
              <p className="text-[11px] font-semibold text-gray-500">
                Live dispatch duration, rescue completion metrics & SLA fulfillment tracking
              </p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-purple-900 bg-purple-100 px-2.5 py-1 rounded-full border border-purple-200">
            SLA Target: &lt;10 mins
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">Avg Time to Dispatch</span>
            <p className="text-xl font-extrabold text-purple-950 mt-1">{responseStats.avgDispatchFormatted}</p>
            <span className="text-[10px] font-medium text-purple-600">Report to Agency Acceptance</span>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Avg Rescue Duration</span>
            <p className="text-xl font-extrabold text-emerald-950 mt-1">{responseStats.avgResolutionFormatted}</p>
            <span className="text-[10px] font-medium text-emerald-600">Report to Rescue Completion</span>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">SLA Fulfillment (&lt;10m)</span>
            <p className="text-xl font-extrabold text-amber-950 mt-1">{responseStats.slaPerformancePercentage}%</p>
            <span className="text-[10px] font-medium text-amber-700">{responseStats.totalRespondedTickets} Tickets Dispatched</span>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">Fastest Response</span>
            <p className="text-xl font-extrabold text-blue-950 mt-1">
              {responseStats.fastestDispatchMinutes > 0 ? `${responseStats.fastestDispatchMinutes}m` : 'N/A'}
            </p>
            <span className="text-[10px] font-medium text-blue-600">Best Agency Acceptance Record</span>
          </div>
        </div>

        {/* ── Donut & Line Graphs: Response Speed Progress Telemetry ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
          {/* Doughnut Chart: Elapsed Response SLA Breakdown */}
          <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                  <Activity size={13} className="text-purple-600" /> Elapsed Response SLA (Doughnut)
                </h4>
                <p className="text-[10px] text-gray-500 font-medium">Real-time status breakdown & SLA delay telemetry</p>
              </div>
              <span className="text-[10px] font-mono font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                {doughnutData.reduce((s, x) => s + x.value, 0)} Total
              </span>
            </div>

            <div className="relative h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={doughnutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {doughnutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', fontWeight: 'bold', border: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black text-gray-900">{responseStats.slaPerformancePercentage}%</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">SLA Met</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-gray-200/60 text-[10px] font-bold">
              {doughnutData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-gray-600 truncate">{d.name}:</span>
                  <span className="text-gray-900 font-extrabold ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Line Chart: Response Speed Progress Trend */}
          <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-emerald-600" /> Response Speed Progress ({PERIOD_LABEL[period]})
                </h4>
                <p className="text-[10px] text-gray-500 font-medium">Monitoring acceleration in agency dispatch & rescue speed</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Faster Response ⚡
              </span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={responseProgressTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="interval" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} stroke="#cbd5e1" />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} stroke="#cbd5e1" unit="m" />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', fontWeight: 'bold', border: 'none' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px', fontWeight: 'bold' }} />
                  <Line
                    type="monotone"
                    dataKey="dispatchMins"
                    name="Avg Dispatch (mins)"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#8b5cf6' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rescueMins"
                    name="Avg Total Rescue (mins)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="text-[10px] font-semibold text-gray-500 flex items-center justify-between pt-2 border-t border-gray-200/60">
              <span>📉 Lower numbers indicate faster response time</span>
              <span className="text-purple-700 font-bold">Goal: Continual reduction</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Map + Breakdowns ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Map */}
        <div
          className="relative overflow-hidden bg-white lg:col-span-2"
          style={{ height: 320, border: '1px solid #e5e7eb', borderRadius: 5 }}
        >
          <IncidentMap incidents={incidents} onMarkerClick={setSelected} />

          {/* Map header overlay */}
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded bg-white/90 px-2.5 py-1.5"
            style={{ border: '1px solid #e5e7eb', backdropFilter: 'blur(4px)' }}>
            <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
            <span className="text-[11px] font-semibold text-gray-600">{filtered.filter(i => i.latitude && i.longitude).length} mapped</span>
          </div>

          {/* Severity legend */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-1 rounded bg-white/90 px-2.5 py-2"
            style={{ border: '1px solid #e5e7eb', backdropFilter: 'blur(4px)' }}>
            {(['critical', 'high', 'medium', 'low'] as const).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <MapPin size={12} style={{ color: SEVERITY_COLOR[s] }} />
                <span className="text-[10px] font-medium capitalize text-gray-600">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdowns */}
        <div className="flex flex-col gap-3">

          {/* Severity breakdown */}
          <div className="bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-gray-400">By Severity</p>
            <div className="flex flex-col gap-2.5">
              {severityCounts.map(({ label, count, color }) => (
                <div key={label} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold capitalize text-gray-600">{label}</span>
                    <span className="text-xs font-extrabold text-gray-900">{count}</span>
                  </div>
                  <MiniBar value={count} max={incidents.length} color={color} />
                </div>
              ))}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-gray-400">By Status</p>
            <div className="grid grid-cols-2 gap-2">
              {(['pending', 'responding', 'rescued', 'closed'] as const).map((s) => {
                const count = incidents.filter((i) => i.status === s).length
                return (
                  <div key={s} className="flex flex-col gap-0.5 rounded p-2" style={{ background: '#f9fafb' }}>
                    <span className="text-[10px] font-semibold capitalize" style={{ color: STATUS_COLOR[s] }}>{s}</span>
                    <span className="text-lg font-extrabold text-gray-900">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Charts + Activity ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Area chart — incident trend */}
        <div className="bg-white p-4 lg:col-span-2" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
          <p className="mb-4 text-[11px] font-extrabold uppercase tracking-wide text-gray-400">Incident Trend — {PERIOD_LABEL[period]}</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b91c1c" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#b91c1c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 5, border: '1px solid #e5e7eb' }}
                labelStyle={{ fontWeight: 700 }}
              />
              <Area type="monotone" dataKey="count" stroke="#b91c1c" strokeWidth={2} fill="url(#incGrad)" dot={{ r: 3, fill: '#b91c1c' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart — status */}
        <div className="bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-gray-400">Status Breakdown</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLOR[entry.name]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 5, border: '1px solid #e5e7eb' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[d.name] }} />
                <span className="text-[10px] capitalize text-gray-500">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 5: Severity bar + Channels + Activity ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Bar chart — severity */}
        <div className="bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
          <p className="mb-4 text-[11px] font-extrabold uppercase tracking-wide text-gray-400">Incidents by Severity</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 5, border: '1px solid #e5e7eb' }} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {barData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel breakdown */}
        <div className="bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-gray-400">Report Channels</p>
          {channelCounts.length === 0 ? (
            <p className="text-xs text-gray-400">No data</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {channelCounts.map(({ label, count, color }) => (
                <div key={label} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold capitalize text-gray-600">{label}</span>
                    <span className="text-xs font-extrabold text-gray-900">{count}</span>
                  </div>
                  <MiniBar value={count} max={incidents.length} color={color} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live activity feed */}
        <div className="bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
          <div className="mb-3 flex items-center gap-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-gray-400">Live Activity</p>
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 220 }}>
            {recent.length === 0 ? (
              <p className="text-xs text-gray-400">No recent activity</p>
            ) : recent.map((i) => (
              <div key={i.id} className="flex items-start gap-2.5">
                <span className="mt-1 size-2 shrink-0 rounded-full" style={{ background: SEVERITY_COLOR[i.severity] }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold capitalize text-gray-800">
                    {i.disaster_type} — {i.location_text}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span className="flex items-center gap-0.5"><MapPin size={9} />{i.location_text}</span>
                    <span>{timeAgo(i.created_at)}</span>
                  </div>
                </div>
                <span
                  className="shrink-0 px-1.5 py-0.5 text-[9px] font-extrabold capitalize"
                  style={{ borderRadius: 3, background: `${STATUS_COLOR[i.status]}18`, color: STATUS_COLOR[i.status] }}
                >
                  {i.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected incident detail */}
      {selected && (
        <div className="bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold capitalize text-gray-900">
              {selected.disaster_type} — {selected.location_text}
            </p>
            <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
          </div>
          {selected.ai_summary && <p className="mt-1 text-sm text-gray-400">{selected.ai_summary}</p>}
        </div>
      )}

      {/* ── Response Agencies ── */}
      <div className="bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} style={{ color: '#b91c1c' }} />
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-gray-400">Response Agencies</p>
            <span className="text-[11px] text-gray-400">{agencies.filter(a => a.is_active).length} active</span>
          </div>
          <Link
            to="/response-agencies"
            className="flex items-center gap-0.5 text-[11px] font-semibold text-gray-400 hover:text-gray-700"
          >
            Manage <ChevronRight size={11} />
          </Link>
        </div>

        {agencies.length === 0 ? (
          <p className="text-xs text-gray-400">No agencies added yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(['fire', 'police', 'medical', 'rescue', 'military', 'ngo', 'other'] as AgencyCategory[]).map((cat) => {
              const count = agencies.filter((a) => a.category === cat && a.is_active).length
              if (count === 0) return null
              return (
                <div key={cat} className="flex items-center gap-2.5 rounded p-2.5" style={{ background: '#f9fafb', border: '1px solid #f0f0f0' }}>
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
                    style={{ background: AGENCY_CATEGORY_COLOR[cat] }}
                  >
                    {count}
                  </span>
                  <span className="text-xs font-semibold capitalize text-gray-700">{cat}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Agency list preview */}
        {agencies.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {agencies.filter(a => a.is_active).slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: AGENCY_CATEGORY_COLOR[a.category] }}
                  />
                  <span className="text-xs font-semibold text-gray-800">{a.name}</span>
                  <span
                    className="px-1.5 py-0.5 text-[9px] font-extrabold capitalize"
                    style={{
                      borderRadius: 3,
                      background: `${AGENCY_CATEGORY_COLOR[a.category]}18`,
                      color: AGENCY_CATEGORY_COLOR[a.category],
                    }}
                  >
                    {a.category}
                  </span>
                </div>
                {(a.contacts ?? []).length > 0 && (
                  <span className="text-[11px] text-gray-400">{a.contacts[0].value}</span>
                )}
              </div>
            ))}
            {agencies.filter(a => a.is_active).length > 5 && (
              <Link to="/response-agencies" className="text-[11px] font-semibold text-gray-400 hover:text-gray-700">
                +{agencies.filter(a => a.is_active).length - 5} more agencies →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Recent incidents list */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <p className="text-sm font-extrabold text-gray-900">Recent Incidents</p>
          <span className="text-[11px] text-gray-400">{filtered.length} in period · {incidents.length} total</span>
        </div>
        <div className="flex flex-col gap-2">
          {filtered.slice(0, 5).map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      </div>

    </div>
  )
}
