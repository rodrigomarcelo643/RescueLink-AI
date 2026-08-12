import { useState, useEffect } from 'react'
import { useResponseAgencies } from '@/hooks/useResponseAgencies'
import {
  addResponseAgency, updateResponseAgency, deleteResponseAgency,
} from '@/services/responseAgencies.service'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import Pagination from '@/components/shared/Pagination'
import type { ResponseAgency, AgencyCategory, AgencyContact } from '@/types/responseAgency'
import { ShieldCheck, Plus, X, Pencil, Trash2, CheckCircle, XCircle, Phone } from 'lucide-react'

const CATEGORIES: AgencyCategory[] = ['fire', 'police', 'medical', 'rescue', 'military', 'ngo', 'other']
const CONTACT_LABELS = ['hotline', 'mobile', 'landline', 'fax', 'viber', 'other']

const CATEGORY_COLOR: Record<AgencyCategory, string> = {
  fire: '#ef4444', police: '#3b82f6', medical: '#22c55e',
  rescue: '#f97316', military: '#6b7280', ngo: '#8b5cf6', other: '#9ca3af',
}

const PER_PAGE = 10

const empty = (): Omit<ResponseAgency, 'id' | 'created_at'> => ({
  name: '', category: 'rescue', contacts: [], email: null, address: null, is_active: true,
})

export default function ResponseAgencies() {
  const { items, loading, refresh } = useResponseAgencies()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ResponseAgency | null>(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [filterCat, setFilterCat] = useState<AgencyCategory | 'all'>('all')

  useEffect(() => { setPage(1) }, [items.length, filterCat])

  const filtered = filterCat === 'all' ? items : items.filter((a) => a.category === filterCat)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const active = items.filter((a) => a.is_active)

  const stats = [
    { label: 'Total Agencies', value: items.length,                       color: '#b91c1c', icon: ShieldCheck },
    { label: 'Active',         value: active.length,                      color: '#22c55e', icon: CheckCircle },
    { label: 'Inactive',       value: items.length - active.length,       color: '#9ca3af', icon: XCircle    },
    { label: 'Categories',     value: new Set(items.map(a => a.category)).size, color: '#8b5cf6', icon: ShieldCheck },
  ]

  const openAdd = () => { setEditing(null); setForm(empty()); setError(''); setOpen(true) }
  const openEdit = (a: ResponseAgency) => {
    setEditing(a)
    setForm({ name: a.name, category: a.category, contacts: a.contacts ?? [],
      email: a.email, address: a.address, is_active: a.is_active })
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Response Agencies</h1>
          <p className="mt-0.5 text-sm text-gray-400">Manage agencies linked to disaster response operations</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-white"
          style={{ background: '#b91c1c', borderRadius: 5 }}
        >
          <Plus size={13} /> Add Agency
        </button>
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
                  {['Name', 'Category', 'Contacts', 'Address', 'Status', ''].map((h) => (
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
                      <p className="text-xs text-gray-600 max-w-[180px] truncate">{a.address ?? '—'}</p>
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

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Address</label>
                <input
                  className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                  placeholder="Station address"
                  value={form.address ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value || null }))}
                />
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

    </div>
  )
}
