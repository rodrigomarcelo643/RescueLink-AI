import { useState } from 'react'
import { useIncidents } from '@/hooks/useIncidents'
import { useDonations } from '@/hooks/useDonations'
import { useVolunteers } from '@/hooks/useVolunteers'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import IncidentCard from '@/components/incidents/IncidentCard'
import IncidentMap from '@/components/incidents/IncidentMap'
import type { Incident } from '@/types/incident'
import {
  AlertTriangle, Heart, Users, CheckCircle, Clock,
  TrendingUp, Activity, MapPin, ShieldAlert,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

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

export default function Dashboard() {
  const { items: incidents, loading } = useIncidents()
  const { items: donations } = useDonations()
  const { items: volunteers } = useVolunteers()
  const [selected, setSelected] = useState<Incident | null>(null)

  // ── KPI calculations ──────────────────────────────────────────────────
  const pending    = incidents.filter((i) => i.status === 'pending').length
  const responding = incidents.filter((i) => i.status === 'responding').length
  const rescued    = incidents.filter((i) => i.status === 'rescued').length
  const closed     = incidents.filter((i) => i.status === 'closed').length
  const critical   = incidents.filter((i) => i.severity === 'critical').length
  const high       = incidents.filter((i) => i.severity === 'high').length

  const confirmedDonations = donations.filter((d) => d.status === 'confirmed')
  const totalDonations = confirmedDonations.reduce((s, d) => s + (d.amount ?? 0), 0)
  const pendingDonations = donations.filter((d) => d.status === 'pending').length

  const availableVols = volunteers.filter((v) => v.is_available).length
  const deployedVols  = volunteers.filter((v) => !v.is_available).length

  const resolutionRate = incidents.length
    ? Math.round(((rescued + closed) / incidents.length) * 100)
    : 0

  const avgPriority = incidents.length
    ? Math.round(incidents.reduce((s, i) => s + (i.priority_score ?? 0), 0) / incidents.length)
    : 0

  // ── Breakdowns ────────────────────────────────────────────────────────
  const severityCounts = ['critical', 'high', 'medium', 'low'].map((s) => ({
    label: s,
    count: incidents.filter((i) => i.severity === s).length,
    color: SEVERITY_COLOR[s],
  }))

  const channelCounts = ['messenger', 'facebook', 'telegram', 'whatsapp', 'web'].map((c) => ({
    label: c,
    count: incidents.filter((i) => i.channel === c).length,
    color: CHANNEL_COLOR[c],
  })).filter((c) => c.count > 0)

  // ── Trend: incidents per day (last 7 days) ───────────────────────────
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    const dateStr = d.toISOString().slice(0, 10)
    return {
      date: label,
      count: incidents.filter((inc) => inc.created_at.slice(0, 10) === dateStr).length,
    }
  })

  // ── Pie data for status ───────────────────────────────────────────────
  const pieData = (['pending', 'responding', 'rescued', 'closed'] as const)
    .map((s) => ({ name: s, value: incidents.filter((i) => i.status === s).length }))
    .filter((d) => d.value > 0)

  // ── Bar data for severity ─────────────────────────────────────────────
  const barData = ['critical', 'high', 'medium', 'low'].map((s) => ({
    name: s,
    count: incidents.filter((i) => i.severity === s).length,
    color: SEVERITY_COLOR[s],
  }))

  // ── Recent activity (last 10 incidents sorted by created_at) ─────────
  const recent = [...incidents].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 8)

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-400">Real-time rescue operations overview</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] font-semibold text-gray-400">Live</span>
        </div>
      </div>

      {/* ── Row 1: Primary KPIs ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total Incidents', value: incidents.length, icon: AlertTriangle, color: '#b91c1c', sub: `${pending} pending` },
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
            <span className="text-[11px] font-semibold text-gray-600">{incidents.filter(i => i.latitude && i.longitude).length} mapped</span>
          </div>

          {/* Severity legend */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-1 rounded bg-white/90 px-2.5 py-2"
            style={{ border: '1px solid #e5e7eb', backdropFilter: 'blur(4px)' }}>
            {(['critical', 'high', 'medium', 'low'] as const).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <svg width="8" height="11" viewBox="0 0 28 36" fill="none">
                  <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
                    fill={SEVERITY_COLOR[s]} />
                </svg>
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
          <p className="mb-4 text-[11px] font-extrabold uppercase tracking-wide text-gray-400">Incident Trend (Last 7 Days)</p>
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

      {/* Recent incidents list */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <p className="text-sm font-extrabold text-gray-900">Recent Incidents</p>
          <span className="text-[11px] text-gray-400">{incidents.length} total</span>
        </div>
        <div className="flex flex-col gap-2">
          {incidents.slice(0, 5).map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      </div>

    </div>
  )
}
