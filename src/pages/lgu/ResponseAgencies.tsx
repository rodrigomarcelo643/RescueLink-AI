import { useState, useEffect } from 'react'
import { useResponseAgencies } from '@/hooks/useResponseAgencies'
import {
  addResponseAgency, updateResponseAgency, deleteResponseAgency,
} from '@/services/responseAgencies.service'
import { supabase } from '@/services/supabase'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import Pagination from '@/components/shared/Pagination'
import type { ResponseAgency, AgencyCategory, AgencyContact } from '@/types/responseAgency'
import { ShieldCheck, Plus, X, Pencil, Trash2, CheckCircle, XCircle, Phone, Share2, ExternalLink, User, Lock, Radio, LocateFixed } from 'lucide-react'

type OperationalStatus = 'available' | 'busy' | 'offline'

const OP_STATUS_CONFIG: Record<OperationalStatus, { label: string; bg: string; color: string; border: string; dot: string }> = {
  available: { label: 'Available', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', dot: '#22c55e' },
  busy:      { label: 'On Scene',  bg: '#fffbeb', color: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  offline:   { label: 'Offline',   bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb', dot: '#9ca3af' },
}

function OpStatusBadge({ status }: { status?: string | null }) {
  const s = (status && status in OP_STATUS_CONFIG ? status : 'available') as OperationalStatus
  const cfg = OP_STATUS_CONFIG[s] ?? OP_STATUS_CONFIG.offline
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-extrabold capitalize"
      style={{ borderRadius: 4, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <span className="size-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

const CATEGORIES: AgencyCategory[] = ['fire', 'police', 'medical', 'rescue', 'military', 'ngo', 'other']
const CONTACT_LABELS = ['hotline', 'mobile', 'landline', 'fax', 'viber', 'other']

const CATEGORY_COLOR: Record<AgencyCategory, string> = {
  fire: '#ef4444', police: '#3b82f6', medical: '#22c55e',
  rescue: '#f97316', military: '#6b7280', ngo: '#8b5cf6', other: '#9ca3af',
}

const PER_PAGE = 10

const empty = (): Omit<ResponseAgency, 'id' | 'created_at'> => ({
  name: '', category: 'rescue', category_other_specify: '', contacts: [], email: null, address: null, is_active: true, username: '', password: '', latitude: null, longitude: null,
})

export default function ResponseAgencies() {
  const { items, loading, refresh } = useResponseAgencies()
  const [liveStatuses, setLiveStatuses] = useState<Record<string, OperationalStatus>>({})
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ResponseAgency | null>(null)
  const [form, setForm] = useState(empty())
  const [locatingStation, setLocatingStation] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [filterCat, setFilterCat] = useState<AgencyCategory | 'all'>('all')
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState<number>(30)
  const [generatedUrl, setGeneratedUrl] = useState<string>('')
  const [copiedShareLink, setCopiedShareLink] = useState(false)

  const handleLocateStation = () => {
    if (!navigator.geolocation) return
    setLocatingStation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6)),
        }))
        setLocatingStation(false)
      },
      () => setLocatingStation(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleOpenShareModal = () => {
    const expiry = Date.now() + 30 * 60 * 1000 // default 30 mins
    setDurationMinutes(30)
    setGeneratedUrl(`${window.location.origin}/register-agency?exp=${expiry}`)
    setCopiedShareLink(false)
    setShareModalOpen(true)
  }

  const handleSelectDuration = (mins: number) => {
    setDurationMinutes(mins)
    const expiry = Date.now() + mins * 60 * 1000
    setGeneratedUrl(`${window.location.origin}/register-agency?exp=${expiry}`)
  }

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(generatedUrl)
    setCopiedShareLink(true)
    setTimeout(() => setCopiedShareLink(false), 2500)
  }

  useEffect(() => { setPage(1) }, [items.length, filterCat])

  // Seed liveStatuses from loaded items — always overwrite so fresh DB data wins
  useEffect(() => {
    if (!items.length) return
    setLiveStatuses((prev) => {
      const next = { ...prev }
      items.forEach((a) => {
        // Only overwrite if DB has a real value; keep live realtime value otherwise
        if (!(a.id in next)) {
          next[a.id] = (a.operational_status as OperationalStatus | undefined)
            && (a.operational_status as string) in OP_STATUS_CONFIG
            ? a.operational_status as OperationalStatus
            : 'available'
        }
      })
      return next
    })
  }, [items])

  // Realtime listener — update operational_status live when agency switches status
  useEffect(() => {
    const channel = supabase
      .channel('lgu_response_agencies_status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'response_agencies' },
        (payload) => {
          const updated = payload.new as ResponseAgency
          if (!updated?.id) return
          setLiveStatuses((prev) => ({
            ...prev,
            [updated.id]: (updated.operational_status as OperationalStatus) ?? 'available',
          }))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = filterCat === 'all' ? items : items.filter((a) => a.category === filterCat)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const active = items.filter((a) => a.is_active)
  const availableCount = items.filter((a) => (liveStatuses[a.id] ?? a.operational_status) === 'available').length
  const busyCount = items.filter((a) => (liveStatuses[a.id] ?? a.operational_status) === 'busy').length

  const stats = [
    { label: 'Total Agencies', value: items.length,    color: '#b91c1c', icon: ShieldCheck },
    { label: 'Available',      value: availableCount,  color: '#22c55e', icon: CheckCircle },
    { label: 'On Scene',       value: busyCount,        color: '#f59e0b', icon: Radio       },
    { label: 'Inactive',       value: items.length - active.length, color: '#9ca3af', icon: XCircle },
  ]

  const openAdd = () => { setEditing(null); setForm(empty()); setError(''); setOpen(true) }
  const openEdit = (a: ResponseAgency) => {
    setEditing(a)
    setForm({ name: a.name, category: a.category, category_other_specify: a.category_other_specify || '', contacts: a.contacts ?? [],
      email: a.email, address: a.address, is_active: a.is_active, username: a.username || '', password: a.password || '', latitude: a.latitude ?? null, longitude: a.longitude ?? null })
    setError(''); setOpen(true)
  }

  // contacts helpers
  const addContact = () =>
    setForm((f) => ({ ...f, contacts: [...f.contacts, { label: 'hotline', value: '' }] }))
  const removeContact = (i: number) =>
    setForm((f) => ({ ...f, contacts: f.contacts.filter((_, idx) => idx !== i) }))
  const updateContact = (i: number, patch: Partial<AgencyContact>) =>
    setForm((f) => ({
      ...f,
      contacts: f.contacts.map((c, idx) => idx === i ? { ...c, ...patch } : c),
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Name is required.')
    if (form.contacts.some((c) => !c.value.trim())) return setError('All contact numbers must have a value.')
    setSaving(true); setError('')
    try {
      editing ? await updateResponseAgency(editing.id, form) : await addResponseAgency(form)
      setOpen(false); refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this agency?')) return
    await deleteResponseAgency(id)
    refresh()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Response Agencies</h1>
          <p className="mt-0.5 text-sm text-gray-400">Manage agencies linked to disaster response operations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenShareModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-all shadow-xs"
          >
            <Share2 size={13} className="text-blue-600" />
            Share Registration Link
          </button>

          <button
            type="button"
            onClick={() => {
              const previewExpiry = Date.now() + 30 * 60 * 1000
              window.open(`/register-agency?exp=${previewExpiry}`, '_blank')
            }}
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-extrabold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            title="Preview registration form"
          >
            <ExternalLink size={13} />
          </button>

          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-white"
            style={{ background: '#b91c1c', borderRadius: 5 }}
          >
            <Plus size={13} /> Add Agency
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="flex flex-col gap-3 bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
            <div className="flex items-center gap-2">
              <Icon size={14} style={{ color }} />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {(['all', ...CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className="px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors"
            style={{
              borderRadius: 5, border: '1px solid',
              borderColor: filterCat === cat ? (cat === 'all' ? '#b91c1c' : CATEGORY_COLOR[cat]) : '#e5e7eb',
              background:   filterCat === cat ? (cat === 'all' ? '#fef2f2' : `${CATEGORY_COLOR[cat]}18`) : '#fff',
              color:        filterCat === cat ? (cat === 'all' ? '#b91c1c' : CATEGORY_COLOR[cat]) : '#6b7280',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState title="No agencies found" description="Add a response agency to get started." />
      ) : (
        <>
          <div className="overflow-x-auto bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  {['Name', 'Category', 'Contacts', 'Address', 'Portal Credentials', 'Operational Status', 'Active', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f9f9f9' }} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-900">{a.name}</p>
                      {a.email && <p className="text-[11px] text-gray-400">{a.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 items-start">
                        <span
                          className="px-2 py-0.5 text-[10px] font-extrabold capitalize"
                          style={{
                            borderRadius: 4,
                            background: `${CATEGORY_COLOR[a.category]}18`,
                            color: CATEGORY_COLOR[a.category],
                            border: `1px solid ${CATEGORY_COLOR[a.category]}40`,
                          }}
                        >
                          {a.category}
                        </span>
                        {a.category === 'other' && a.category_other_specify && (
                          <span className="text-[10px] font-bold text-gray-500 italic">
                            "{a.category_other_specify}"
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(a.contacts ?? []).length === 0 ? (
                        <span className="text-[11px] text-gray-300">—</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {(a.contacts ?? []).map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <Phone size={9} className="text-gray-300 shrink-0" />
                              <span className="text-[10px] font-semibold capitalize text-gray-400">{c.label}</span>
                              <span className="text-xs text-gray-700">{c.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-700 font-medium max-w-[180px] truncate">{a.address ?? '—'}</p>
                      {a.latitude != null && a.longitude != null && (
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1 w-fit mt-0.5 font-bold">
                          📍 {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a.username ? (
                        <div className="flex flex-col gap-0.5 font-mono text-[11px]">
                          <span className="font-bold text-gray-900 flex items-center gap-1">
                            <User size={11} className="text-gray-400 shrink-0" />
                            {a.username}
                          </span>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Lock size={10} className="text-gray-400 shrink-0" />
                            {a.password ?? '••••••••'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-300 italic">Unregistered</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <OpStatusBadge status={liveStatuses[a.id] ?? a.operational_status} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 text-[10px] font-extrabold capitalize"
                        style={{
                          borderRadius: 4,
                          background: a.is_active ? '#f0fdf4' : '#f9fafb',
                          color: a.is_active ? '#16a34a' : '#9ca3af',
                          border: `1px solid ${a.is_active ? '#bbf7d0' : '#e5e7eb'}`,
                        }}
                      >
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(a)} className="text-gray-400 hover:text-gray-700">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-600">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={filtered.length} onPage={setPage} />
        </>
      )}

      {/* Add / Edit Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>

            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0f0f0' }}>
              <p className="text-sm font-extrabold text-gray-900">{editing ? 'Edit Agency' : 'Add Response Agency'}</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-5" style={{ maxHeight: '80vh' }}>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Agency Name *</label>
                <input
                  className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                  placeholder="e.g. BFP Legazpi City"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Category *</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat} type="button"
                      onClick={() => setForm((f) => ({ ...f, category: cat }))}
                      className="px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors"
                      style={{
                        borderRadius: 5, border: '1px solid',
                        borderColor: form.category === cat ? CATEGORY_COLOR[cat] : '#e5e7eb',
                        background:  form.category === cat ? `${CATEGORY_COLOR[cat]}18` : '#fff',
                        color:       form.category === cat ? CATEGORY_COLOR[cat] : '#6b7280',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {form.category === 'other' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Specify Category / Unit Type *</label>
                  <input
                    className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                    style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                    placeholder="e.g. K9 Unit, Drone Ops"
                    value={form.category_other_specify ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, category_other_specify: e.target.value }))}
                  />
                </div>
              )}

              {/* Contacts */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Contact Numbers</label>
                  <button
                    type="button" onClick={addContact}
                    className="flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:text-red-900"
                  >
                    <Plus size={11} /> Add
                  </button>
                </div>
                {form.contacts.length === 0 && (
                  <p className="text-[11px] text-gray-400">No contacts yet — click Add.</p>
                )}
                {form.contacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={c.label}
                      onChange={(e) => updateContact(i, { label: e.target.value })}
                      className="px-2 py-2 text-[11px] font-semibold text-gray-700 outline-none capitalize"
                      style={{ border: '1px solid #e5e7eb', borderRadius: 5, minWidth: 90 }}
                    >
                      {CONTACT_LABELS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <input
                      className="flex-1 px-3 py-2 text-sm text-gray-900 outline-none"
                      style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                      placeholder="+63 912 345 6789"
                      value={c.value}
                      onChange={(e) => updateContact(i, { value: e.target.value })}
                    />
                    <button type="button" onClick={() => removeContact(i)} className="text-gray-300 hover:text-red-500">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Portal Credentials */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Agency Portal Credentials</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">Username</label>
                    <input
                      className="w-full px-3 py-2 text-xs font-mono text-gray-900 outline-none"
                      style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                      placeholder="bfp_unit1"
                      value={form.username ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">Password</label>
                    <input
                      className="w-full px-3 py-2 text-xs font-mono text-gray-900 outline-none"
                      style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                      placeholder="Password@2026"
                      value={form.password ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                  placeholder="agency@example.com"
                  value={form.email ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value || null }))}
                />
              </div>

              {/* Station Location & GPS Coordinates */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Station Location & GPS Coordinates</p>
                  <button
                    type="button"
                    onClick={handleLocateStation}
                    disabled={locatingStation}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                  >
                    <LocateFixed size={11} className={locatingStation ? 'animate-spin' : ''} />
                    {locatingStation ? 'Locating…' : '📍 Auto GPS'}
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Station Address</label>
                  <input
                    className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                    style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                    placeholder="Katipunan St, Barangay Labangon, Cebu City"
                    value={form.address ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value || null }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">Latitude (GPS)</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full px-3 py-2 text-xs font-mono text-gray-900 outline-none"
                      style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                      placeholder="10.3015"
                      value={form.latitude ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value ? parseFloat(e.target.value) : null }))}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">Longitude (GPS)</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full px-3 py-2 text-xs font-mono text-gray-900 outline-none"
                      style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                      placeholder="123.8821"
                      value={form.longitude ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value ? parseFloat(e.target.value) : null }))}
                    />
                  </div>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox" checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="accent-red-700"
                />
                <span className="text-xs font-semibold text-gray-600">Active</span>
              </label>

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
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Agency'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Share Registration Form Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-6" style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Share2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Share Agency Registration Link</h3>
                  <p className="text-[11px] text-gray-400">Set temporary link validity duration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Duration selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Link Validity Duration (Max 1 Hour)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { m: 1, label: '1 Min (Test ⚡)' },
                    { m: 15, label: '15 Mins' },
                    { m: 30, label: '30 Mins (Default)' },
                    { m: 45, label: '45 Mins' },
                    { m: 60, label: '60 Mins (1h Max)' },
                  ].map(({ m, label }) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectDuration(m)}
                      className="px-2 py-2 text-center text-xs font-bold transition-all"
                      style={{
                        borderRadius: 5,
                        border: durationMinutes === m ? '1.5px solid #2563eb' : '1px solid #e5e7eb',
                        background: durationMinutes === m ? '#eff6ff' : '#fff',
                        color: durationMinutes === m ? '#1d4ed8' : '#4b5563',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generated URL Box */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Generated Registration Link
                </label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                  <input
                    type="text"
                    readOnly
                    value={generatedUrl}
                    className="flex-1 bg-transparent text-xs font-mono text-gray-800 outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareUrl}
                    className="px-3 py-1.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shrink-0"
                  >
                    {copiedShareLink ? '✓ Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800 flex items-start gap-2">
                <span className="shrink-0 text-sm">⏱️</span>
                <span>
                  This link will expire exactly <strong>{durationMinutes} minutes</strong> from now. Once expired, external users will be blocked from accessing the registration form.
                </span>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShareModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
