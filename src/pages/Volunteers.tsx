import { useState } from 'react'
import { useVolunteers } from '@/hooks/useVolunteers'
import VolunteerCard from '@/components/volunteers/VolunteerCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import { addVolunteerDirect } from '@/services/volunteers.service'
import { Users, UserCheck, Plus, X } from 'lucide-react'

const SKILL_OPTIONS = ['First Aid', 'Search & Rescue', 'Driving', 'Medical', 'Communication', 'Logistics', 'Swimming', 'Firefighting']

export default function Volunteers() {
  const { items, loading, refresh } = useVolunteers()
  const available = items.filter((v) => v.is_available).length

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ full_name: '', phone: '', barangay: '', skills: [] as string[] })

  const stats = [
    { label: 'Total Volunteers', value: items.length, icon: Users, color: '#b91c1c' },
    { label: 'Available Now', value: available, icon: UserCheck, color: '#22c55e' },
  ]

  const toggleSkill = (s: string) =>
    setForm((f) => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s] }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim()) return setError('Full name is required.')
    setSaving(true)
    setError('')
    try {
      await addVolunteerDirect(form)
      setOpen(false)
      setForm({ full_name: '', phone: '', barangay: '', skills: [] })
      refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add volunteer.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Volunteers</h1>
          <p className="mt-0.5 text-sm text-gray-400">Manage volunteer availability and deployment</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-white"
          style={{ background: '#b91c1c', borderRadius: 5 }}
        >
          <Plus size={13} /> Add Volunteer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
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

      {/* Grid */}
      {items.length === 0 ? (
        <EmptyState title="No volunteers registered" description="Add volunteers manually or wait for sign-ups." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((v) => <VolunteerCard key={v.id} volunteer={v} />)}
        </div>
      )}

      {/* Add Volunteer Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>

            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0f0f0' }}>
              <p className="text-sm font-extrabold text-gray-900">Add Volunteer</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Full Name *</label>
                <input
                  className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                  placeholder="Juan dela Cruz"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Phone</label>
                  <input
                    className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                    style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                    placeholder="09xx-xxx-xxxx"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Barangay</label>
                  <input
                    className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                    style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                    placeholder="Poblacion"
                    value={form.barangay}
                    onChange={(e) => setForm((f) => ({ ...f, barangay: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Skills</label>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_OPTIONS.map((s) => {
                    const active = form.skills.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className="px-2.5 py-1 text-[11px] font-semibold transition-colors"
                        style={{
                          borderRadius: 5,
                          border: '1px solid',
                          borderColor: active ? '#b91c1c' : '#e5e7eb',
                          background: active ? '#fef2f2' : '#fff',
                          color: active ? '#b91c1c' : '#6b7280',
                        }}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                  style={{ background: '#b91c1c', borderRadius: 5 }}
                >
                  {saving ? 'Saving…' : 'Add Volunteer'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
