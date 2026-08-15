import { useState, useEffect } from 'react'
import { useEvacuationCenters } from '@/hooks/useEvacuationCenters'
import { addEvacuationCenter, toggleCenterActive, updateEvacuationCenter } from '@/services/evacuationCenters.service'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import Pagination from '@/components/shared/Pagination'
import type { EvacuationCenter } from '@/types/evacuationCenter'
import { Building2, Users, CheckCircle, XCircle, Plus, X, Pencil, ToggleLeft, ToggleRight, MapPin, LocateFixed, Radio } from 'lucide-react'

const NEEDS_KEYS = ['food', 'water', 'medicine', 'blankets', 'clothes']
const PER_PAGE = 10

const PRESET_CEBU_LOCATIONS = [
  { label: 'Labangon Gym', barangay: 'Labangon', lat: 10.3018, lng: 123.8825 },
  { label: 'Guadalupe Complex', barangay: 'Guadalupe', lat: 10.3125, lng: 123.8785 },
  { label: 'Sambag II Gym', barangay: 'Sambag II', lat: 10.2985, lng: 123.8890 },
  { label: 'Banawa Sector', barangay: 'Banawa', lat: 10.3090, lng: 123.8795 },
  { label: 'Lahug Complex', barangay: 'Lahug', lat: 10.3312, lng: 123.8920 },
]

const empty = (): Omit<EvacuationCenter, 'id' | 'created_at'> => ({
  name: '', barangay: '', municipality: 'Cebu City', latitude: 10.3157, longitude: 123.8854,
  capacity: 100, current_occupancy: 0, needs: { food: true, water: true }, is_active: true,
})

export default function EvacuationCenters() {
  const { items, loading, refresh } = useEvacuationCenters()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<EvacuationCenter | null>(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [items.length])
  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE))
  const paginated = items.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const active = items.filter((c) => c.is_active)
  const totalCapacity = active.reduce((s, c) => s + c.capacity, 0)
  const totalOccupancy = active.reduce((s, c) => s + c.current_occupancy, 0)

  const stats = [
    { label: 'Active Centers', value: active.length, icon: Building2, color: '#b91c1c' },
    { label: 'Total Capacity', value: totalCapacity, icon: Users, color: '#3b82f6' },
    { label: 'Current Occupancy', value: totalOccupancy, icon: CheckCircle, color: '#22c55e' },
    { label: 'Inactive', value: items.length - active.length, icon: XCircle, color: '#9ca3af' },
  ]

  const openAdd = () => { setEditing(null); setForm(empty()); setError(''); setOpen(true) }
  const openEdit = (c: EvacuationCenter) => {
    setEditing(c)
    setForm({ name: c.name, barangay: c.barangay, municipality: c.municipality || 'Cebu City',
      latitude: c.latitude ?? 10.3157, longitude: c.longitude ?? 123.8854, capacity: c.capacity,
      current_occupancy: c.current_occupancy, needs: c.needs ?? {}, is_active: c.is_active })
    setError('')
    setOpen(true)
  }

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      return setError('Geolocation not supported by browser.')
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: parseFloat(pos.coords.latitude.toFixed(5)),
          longitude: parseFloat(pos.coords.longitude.toFixed(5)),
        }))
        setLocating(false)
      },
      (err) => {
        console.warn('Geolocation error:', err)
        setForm((f) => ({ ...f, latitude: 10.3157, longitude: 123.8854 }))
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Evacuation Center Name is required.')
    if (!form.barangay.trim()) return setError('Barangay is required.')
    if (form.capacity <= 0) return setError('Capacity must be greater than 0.')

    setSaving(true)
    setError('')

    try {
      if (editing) {
        await updateEvacuationCenter(editing.id, form)
      } else {
        await addEvacuationCenter(form)
      }
      setOpen(false)
      await refresh()
    } catch (err: unknown) {
      console.error('Evacuation center save notice:', err)
      setOpen(false)
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (c: EvacuationCenter) => {
    await toggleCenterActive(c.id, !c.is_active)
    refresh()
  }

  const toggleNeed = (key: string) =>
    setForm((f) => ({ ...f, needs: { ...f.needs, [key]: !f.needs?.[key] } }))

  const occupancyPct = (c: EvacuationCenter) =>
    c.capacity > 0 ? Math.min(100, Math.round((c.current_occupancy / c.capacity) * 100)) : 0

  const barColor = (pct: number) =>
    pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : pct >= 40 ? '#f59e0b' : '#22c55e'

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Evacuation Centers</h1>
          <p className="mt-0.5 text-sm text-gray-400">Monitor capacity, occupancy, and needs</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-white"
          style={{ background: '#b91c1c', borderRadius: 5 }}
        >
          <Plus size={13} /> Add Center
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex flex-col gap-3 bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
            <div className="flex items-center gap-2">
              <Icon size={14} style={{ color }} />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <EmptyState title="No evacuation centers" description="Add centers to start tracking capacity and needs." />
      ) : (
        <>
          <div className="overflow-x-auto bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  {['Name', 'Location', 'Occupancy', 'Needs', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => {
                  const pct = occupancyPct(c)
                  const needs = Object.entries(c.needs ?? {}).filter(([, v]) => v).map(([k]) => k)
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f9f9f9' }} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-gray-900">{c.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600">{c.barangay}</p>
                        <p className="text-[11px] text-gray-400">{c.municipality}</p>
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div style={{ width: `${pct}%`, background: barColor(pct), height: '100%', borderRadius: 9999 }} />
                          </div>
                          <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                            {c.current_occupancy}/{c.capacity}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-gray-400">{pct}% full</p>
                      </td>
                      <td className="px-4 py-3">
                        {needs.length === 0 ? (
                          <span className="text-[11px] text-gray-300">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {needs.map((n) => (
                              <span key={n} className="px-1.5 py-0.5 text-[10px] font-semibold capitalize text-orange-700 bg-orange-50 rounded"
                                style={{ border: '1px solid #fed7aa' }}>
                                {n}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 text-[10px] font-extrabold capitalize"
                          style={{
                            borderRadius: 4,
                            background: c.is_active ? '#f0fdf4' : '#f9fafb',
                            color: c.is_active ? '#16a34a' : '#9ca3af',
                            border: `1px solid ${c.is_active ? '#bbf7d0' : '#e5e7eb'}`,
                          }}
                        >
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-gray-700">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleToggle(c)} className="text-gray-400 hover:text-gray-700">
                            {c.is_active ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={items.length} onPage={setPage} />
        </>
      )}

      {/* Add / Edit Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>

            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0f0f0' }}>
              <p className="text-sm font-extrabold text-gray-900">{editing ? 'Edit Center' : 'Add Evacuation Center'}</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Center Name *</label>
                <input
                  className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                  placeholder="e.g. Legazpi City Gym"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Barangay *</label>
                  <input
                    className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                    style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                    placeholder="Brgy. Poblacion"
                    value={form.barangay}
                    onChange={(e) => setForm((f) => ({ ...f, barangay: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Municipality</label>
                  <input
                    className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                    style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                    placeholder="Legazpi City"
                    value={form.municipality}
                    onChange={(e) => setForm((f) => ({ ...f, municipality: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Capacity *</label>
                  <input
                    type="number" min="1"
                    className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                    style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                    value={form.capacity || ''}
                    onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Current Occupancy</label>
                  <input
                    type="number" min="0"
                    className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                    style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                    value={form.current_occupancy || ''}
                    onChange={(e) => setForm((f) => ({ ...f, current_occupancy: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* GPS Location Selector & Coordinates */}
              <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1">
                    <MapPin size={13} className="text-red-600" /> Center GPS Coordinates & Location
                  </span>
                  <button
                    type="button"
                    onClick={handleUseCurrentGps}
                    disabled={locating}
                    className="px-2.5 py-1 text-[11px] font-extrabold bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <LocateFixed size={12} className={locating ? 'animate-spin' : ''} />
                    {locating ? 'Locating...' : 'Use My Current GPS'}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-gray-400 font-extrabold mr-1">Preset Sectors:</span>
                  {PRESET_CEBU_LOCATIONS.map((loc) => (
                    <button
                      key={loc.label}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, barangay: loc.barangay, latitude: loc.lat, longitude: loc.lng }))}
                      className="px-2 py-0.5 text-[10px] font-bold bg-white text-gray-700 hover:bg-red-50 hover:text-red-700 border border-gray-200 rounded transition-colors cursor-pointer"
                    >
                      📍 {loc.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-gray-500">Latitude</label>
                    <input
                      type="number" step="any"
                      className="w-full px-3 py-1.5 text-xs text-gray-900 bg-white border border-gray-300 rounded outline-none font-mono"
                      placeholder="10.3157"
                      value={form.latitude ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, latitude: parseFloat(e.target.value) || null }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-gray-500">Longitude</label>
                    <input
                      type="number" step="any"
                      className="w-full px-3 py-1.5 text-xs text-gray-900 bg-white border border-gray-300 rounded outline-none font-mono"
                      placeholder="123.8854"
                      value={form.longitude ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, longitude: parseFloat(e.target.value) || null }))}
                    />
                  </div>
                </div>

                {form.latitude && form.longitude && (
                  <div className="text-[10px] font-mono text-emerald-700 font-bold flex items-center gap-1 mt-1">
                    <Radio size={10} className="animate-pulse text-emerald-600" />
                    <span>Selected GPS Position: {form.latitude}° N, {form.longitude}° E</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Current Needs</label>
                <div className="flex flex-wrap gap-1.5">
                  {NEEDS_KEYS.map((key) => {
                    const active = !!form.needs?.[key]
                    return (
                      <button
                        key={key} type="button" onClick={() => toggleNeed(key)}
                        className="px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors"
                        style={{
                          borderRadius: 5, border: '1px solid',
                          borderColor: active ? '#ea580c' : '#e5e7eb',
                          background: active ? '#fff7ed' : '#fff',
                          color: active ? '#ea580c' : '#6b7280',
                        }}
                      >
                        {key}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                  style={{ background: '#b91c1c', borderRadius: 5 }}
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Center'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
