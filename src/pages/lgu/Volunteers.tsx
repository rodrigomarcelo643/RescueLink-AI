import { useState, useEffect } from 'react'
import { useVolunteers } from '@/hooks/useVolunteers'
import VolunteersTable from '@/components/volunteers/VolunteersTable'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import Pagination from '@/components/shared/Pagination'
import { addVolunteerDirect, toggleAvailability, updateVolunteer, deleteVolunteer, toggleAccountStatus } from '@/services/volunteers.service'
import { getIncidents } from '@/services/incidents.service'
import type { Incident } from '@/types/incident'
import type { Volunteer } from '@/types/volunteer'
import { Users, UserCheck, Plus, X, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react'

const SKILL_OPTIONS = ['First Aid', 'Search & Rescue', 'Driving', 'Medical', 'Communication', 'Logistics', 'Swimming', 'Firefighting', 'Boat Operations', 'Chainsaw & Clearing']
const PER_PAGE = 15

export default function Volunteers() {
  const { items, loading, refresh } = useVolunteers()
  const available = items.filter((v) => v.is_available).length

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [open, setOpen] = useState(false)
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; volunteer: Volunteer | null }>({ isOpen: false, volunteer: null })

  const [page, setPage] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    barangay: '',
    skills: [] as string[],
    equipment: [] as string[],
    is_available: false,
  })

  useEffect(() => {
    getIncidents()
      .then((data) => setIncidents(data))
      .catch((err) => console.warn('Failed to load incidents for volunteer AI matching:', err))
  }, [])

  const stats = [
    { label: 'Total Volunteers', value: items.length, icon: Users, color: '#b91c1c' },
    { label: 'Available Now', value: available, icon: UserCheck, color: '#22c55e' },
  ]

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleAvailability(id, !current)
      refresh()
    } catch (err) {
      console.error('Failed to toggle volunteer availability:', err)
    }
  }

  const handleToggleAccountStatus = async (vol: Volunteer) => {
    const isDeactivated = vol.account_status === 'deactivated' || vol.profiles?.status === 'deactivated'
    const newStatus = isDeactivated ? 'active' : 'deactivated'
    const volName = vol.profiles?.full_name || 'Volunteer'
    try {
      await toggleAccountStatus(vol.id, vol.profile_id, newStatus)
      setNotice(`Updated account status for "${volName}" to ${newStatus.toUpperCase()}!`)
      setTimeout(() => setNotice(null), 4000)
      refresh()
    } catch (err: any) {
      alert(`Account status notice: ${err?.message || 'Updated status'}`)
    }
  }

  const handleOpenAdd = () => {
    setEditingVolunteer(null)
    setForm({ full_name: '', phone: '', barangay: '', skills: [], equipment: [], is_available: false })
    setError('')
    setOpen(true)
  }

  const handleOpenEdit = (vol: Volunteer) => {
    setEditingVolunteer(vol)
    setForm({
      full_name: vol.profiles?.full_name || '',
      phone: vol.profiles?.phone || '',
      barangay: vol.profiles?.barangay || '',
      skills: vol.skills || [],
      equipment: vol.equipment || [],
      is_available: vol.is_available ?? false,
    })
    setError('')
    setOpen(true)
  }

  const handleConfirmDelete = async () => {
    const vol = deleteModal.volunteer
    if (!vol) return
    const volName = vol.profiles?.full_name || 'this volunteer'

    try {
      await deleteVolunteer(vol.id, vol.profile_id)
      setNotice(`Successfully deleted volunteer record for "${volName}".`)
      setDeleteModal({ isOpen: false, volunteer: null })
      setTimeout(() => setNotice(null), 4000)
      refresh()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete volunteer.')
    }
  }

  const toggleSkill = (s: string) =>
    setForm((f) => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s] }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim()) return setError('Full name is required.')
    setSaving(true)
    setError('')

    try {
      if (editingVolunteer) {
        await updateVolunteer(editingVolunteer.id, editingVolunteer.profile_id, form)
        setNotice(`Updated volunteer details for ${form.full_name}!`)
      } else {
        await addVolunteerDirect(form)
        setNotice(`Added volunteer ${form.full_name}! Account is active, deployment status is Inactive by default.`)
      }
      setOpen(false)
      setTimeout(() => setNotice(null), 4000)
      refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save volunteer.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => { setPage(1) }, [items.length])
  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE))
  const paginated = items.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Volunteers Management</h1>
          <p className="mt-0.5 text-sm text-gray-400">Manage volunteer profiles, skills, equipment, and view AI skill/GPS proximity match advisories</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <Plus size={14} /> Add Volunteer
        </button>
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <Icon size={14} style={{ color }} />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Table View */}
      {items.length === 0 ? (
        <EmptyState title="No volunteers registered" description="Add volunteers manually or wait for volunteer sign-ups." />
      ) : (
        <>
          <VolunteersTable
            volunteers={paginated}
            incidents={incidents}
            onToggleAvailability={handleToggle}
            onToggleAccountStatus={handleToggleAccountStatus}
            onEdit={handleOpenEdit}
            onDelete={(vol) => setDeleteModal({ isOpen: true, volunteer: vol })}
          />
          <Pagination page={page} totalPages={totalPages} total={items.length} onPage={setPage} />
        </>
      )}

      {/* Add / Edit Volunteer Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">

            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-red-950 to-slate-900 text-white">
              <p className="text-sm font-extrabold">{editingVolunteer ? 'Edit Volunteer Details' : 'Add Volunteer'}</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Full Name *</label>
                <input
                  className="w-full px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none bg-gray-50 border border-gray-200 rounded-xl focus:border-red-600"
                  placeholder="Juan dela Cruz"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Phone</label>
                  <input
                    className="w-full px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none bg-gray-50 border border-gray-200 rounded-xl focus:border-red-600"
                    placeholder="09171234567"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Barangay</label>
                  <input
                    className="w-full px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none bg-gray-50 border border-gray-200 rounded-xl focus:border-red-600"
                    placeholder="Poblacion"
                    value={form.barangay}
                    onChange={(e) => setForm((f) => ({ ...f, barangay: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Skills</label>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_OPTIONS.map((s) => {
                    const active = form.skills.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                          active ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-xl disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingVolunteer ? 'Update Volunteer' : 'Add Volunteer'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Sleek Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.volunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-gray-200 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600 border-b border-gray-100 pb-3">
              <div className="p-2.5 bg-red-100 rounded-2xl text-red-700">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-gray-900 tracking-wider">
                  Delete Volunteer Record 🚨
                </h3>
                <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  Irreversible Action
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/70 rounded-xl border border-red-100 text-xs text-gray-800 leading-relaxed flex flex-col gap-2">
              <p className="font-bold text-red-950">
                Are you sure you want to delete volunteer "{deleteModal.volunteer.profiles?.full_name || 'this volunteer'}"?
              </p>
              <p className="text-[11px] text-gray-600 font-medium">
                This will delete their profile and volunteer registration from the system database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, volunteer: null })}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 text-xs font-black text-white bg-red-700 hover:bg-red-800 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Delete Volunteer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
