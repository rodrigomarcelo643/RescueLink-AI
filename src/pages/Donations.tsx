import { useState } from 'react'
import { useDonations } from '@/hooks/useDonations'
import { useIncidents } from '@/hooks/useIncidents'
import DonationRow from '@/components/donations/DonationRow'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import { addDonation } from '@/services/donations.service'
import { Heart, Banknote, Package, Plus, X } from 'lucide-react'

const PAYMENT_METHODS = ['GCash', 'Maya', 'Bank Transfer', 'Cash', 'Other']

export default function Donations() {
  const { items, loading, refresh } = useDonations()
  const { items: incidents } = useIncidents()

  const confirmed = items.filter((d) => d.status === 'confirmed')
  const total = confirmed.reduce((sum, d) => sum + (d.amount ?? 0), 0)
  const inKind = items.filter((d) => d.type === 'in_kind').length

  const stats = [
    { label: 'Total Confirmed', value: `₱${total.toLocaleString()}`, icon: Heart, color: '#b91c1c' },
    { label: 'Monetary', value: confirmed.length, icon: Banknote, color: '#3b82f6' },
    { label: 'In-Kind', value: inKind, icon: Package, color: '#8b5cf6' },
  ]

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    type: 'monetary' as 'monetary' | 'in_kind',
    amount: '',
    donor_name: '',
    payment_method: '',
    items: '',
    ticket_id: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.type === 'monetary' && !form.amount) return setError('Amount is required.')
    if (form.type === 'in_kind' && !form.items.trim()) return setError('Item description is required.')
    setSaving(true)
    setError('')
    try {
      await addDonation({
        type: form.type,
        amount: form.type === 'monetary' ? parseFloat(form.amount) : undefined,
        donor_name: form.donor_name,
        payment_method: form.payment_method || undefined,
        items: form.type === 'in_kind' ? form.items : undefined,
        ticket_id: form.ticket_id || undefined,
      })
      setOpen(false)
      setForm({ type: 'monetary', amount: '', donor_name: '', payment_method: '', items: '', ticket_id: '' })
      refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record donation.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Donations</h1>
          <p className="mt-0.5 text-sm text-gray-400">Track and manage incoming relief contributions</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-white"
          style={{ background: '#b91c1c', borderRadius: 5 }}
        >
          <Plus size={13} /> Record Donation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        <EmptyState title="No donations yet" description="Record a donation manually or wait for online submissions." />
      ) : (
        <div className="overflow-hidden bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                {['Type', 'Amount', 'Method', 'Status', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((d) => <DonationRow key={d.id} donation={d} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Donation Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>

            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0f0f0' }}>
              <p className="text-sm font-extrabold text-gray-900">Record Donation</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">

              {/* Type toggle */}
              <div className="flex gap-2">
                {(['monetary', 'in_kind'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className="flex-1 py-2 text-xs font-extrabold capitalize transition-colors"
                    style={{
                      borderRadius: 5,
                      border: '1px solid',
                      borderColor: form.type === t ? '#b91c1c' : '#e5e7eb',
                      background: form.type === t ? '#fef2f2' : '#fff',
                      color: form.type === t ? '#b91c1c' : '#6b7280',
                    }}
                  >
                    {t === 'in_kind' ? 'In-Kind' : 'Monetary'}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Donor Name</label>
                <input
                  className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                  placeholder="Optional"
                  value={form.donor_name}
                  onChange={(e) => setForm((f) => ({ ...f, donor_name: e.target.value }))}
                />
              </div>

              {form.type === 'monetary' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Amount (₱) *</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                      style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Payment Method</label>
                    <select
                      className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                      style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                      value={form.payment_method}
                      onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Items Description *</label>
                  <textarea
                    rows={3}
                    className="w-full resize-none px-3 py-2 text-sm text-gray-900 outline-none"
                    style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                    placeholder="e.g. 10 sacks of rice, 20 canned goods…"
                    value={form.items}
                    onChange={(e) => setForm((f) => ({ ...f, items: e.target.value }))}
                  />
                </div>
              )}

              {/* Link to incident ticket */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Link to Incident (optional)</label>
                <select
                  className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                  value={form.ticket_id}
                  onChange={(e) => setForm((f) => ({ ...f, ticket_id: e.target.value }))}
                >
                  <option value="">None</option>
                  {incidents.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.disaster_type} — {i.location_text}
                    </option>
                  ))}
                </select>
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
                  {saving ? 'Saving…' : 'Record Donation'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
