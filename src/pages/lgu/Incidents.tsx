import { useState, useEffect } from 'react'
import { useIncidents } from '@/hooks/useIncidents'
import IncidentCard from '@/components/incidents/IncidentCard'
import IncidentTable from '@/components/incidents/IncidentTable'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import { updateIncidentStatus, deleteIncident } from '@/services/incidents.service'
import { updateIncident, removeIncident } from '@/redux/slices/incidentSlice'
import { useDispatch } from 'react-redux'
import { ChevronDown, ChevronLeft, ChevronRight, Table as TableIcon, LayoutGrid } from 'lucide-react'
import type { Incident } from '@/types/incident'

const STATUSES: Array<Incident['status'] | 'all'> = ['all', 'pending', 'responding', 'rescued', 'closed']
const CHANNELS: Array<Incident['channel'] | 'all'> = ['all', 'web', 'messenger', 'telegram', 'whatsapp', 'facebook']
const PER_PAGE = 10

const STATUS_LABEL: Record<string, string> = {
  all: 'All Statuses', pending: 'Pending', responding: 'Responding', rescued: 'Rescued', closed: 'Closed',
}
const CHANNEL_LABEL: Record<string, string> = {
  all: 'All Sources', web: 'Web', messenger: 'Messenger', telegram: 'Telegram', whatsapp: 'WhatsApp', facebook: 'Facebook',
}

function Select({
  value, onChange, options, labelMap,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  labelMap: Record<string, string>
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none bg-white pl-3 pr-8 text-xs font-semibold text-gray-700 outline-none transition-all"
        style={{ border: '1px solid #e5e7eb', borderRadius: 5, cursor: 'pointer' }}
      >
        {options.map((o) => (
          <option key={o} value={o}>{labelMap[o]}</option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

function getPages(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

export default function Incidents() {
  const dispatch = useDispatch()
  const { items, loading } = useIncidents()
  const [filter, setFilter] = useState<Incident['status'] | 'all'>('all')
  const [channelFilter, setChannelFilter] = useState<Incident['channel'] | 'all'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [page, setPage] = useState(1)

  const handleStatusChange = async (id: string, status: Incident['status']) => {
    try {
      await updateIncidentStatus(id, status)
      const target = items.find((i) => i.id === id)
      if (target) {
        dispatch(updateIncident({ ...target, status }))
      }
    } catch (e) {
      console.error('Failed to update status:', e)
    }
  }

  const handleDeleteIncident = async (id: string) => {
    try {
      await deleteIncident(id)
      dispatch(removeIncident(id))
    } catch (e) {
      console.error('Failed to delete incident:', e)
    }
  }

  const filtered = items
    .filter((i) => filter === 'all' || i.status === filter)
    .filter((i) => channelFilter === 'all' || i.channel === channelFilter)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [filter, channelFilter])

  if (loading) return <LoadingSpinner />

  const pages = getPages(page, totalPages)

  return (
    <div className="flex flex-col gap-6">

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Incidents</h1>
          <p className="mt-0.5 text-sm text-gray-400">Monitor and manage active rescue operations</p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-md bg-gray-100 p-1" style={{ border: '1px solid #e5e7eb' }}>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-all rounded ${
              viewMode === 'table' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <TableIcon size={13} /> Table View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-all rounded ${
              viewMode === 'card' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <LayoutGrid size={13} /> Card View
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filter}
          onChange={(v) => setFilter(v as Incident['status'] | 'all')}
          options={STATUSES}
          labelMap={Object.fromEntries(
            STATUSES.map((s) => [s, `${STATUS_LABEL[s]} (${s === 'all' ? items.length : items.filter((i) => i.status === s).length})`])
          )}
        />
        <Select
          value={channelFilter}
          onChange={(v) => setChannelFilter(v as Incident['channel'] | 'all')}
          options={CHANNELS}
          labelMap={Object.fromEntries(
            CHANNELS.map((c) => [c, `${CHANNEL_LABEL[c]} (${c === 'all' ? items.length : items.filter((i) => i.channel === c).length})`])
          )}
        />
        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content — Table or Card Grid */}
      {paginated.length === 0 ? (
        <EmptyState title="No incidents found" description="Reports will appear here in real-time." />
      ) : viewMode === 'table' ? (
        <IncidentTable incidents={paginated} onStatusChange={handleStatusChange} onDelete={handleDeleteIncident} />
      ) : (
        <div className="flex flex-col gap-3">
          {paginated.map((incident) => <IncidentCard key={incident.id} incident={incident} onDelete={handleDeleteIncident} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">

            {/* Prev */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex size-8 items-center justify-center transition-colors hover:bg-gray-50 disabled:opacity-30"
              style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
            >
              <ChevronLeft size={13} className="text-gray-500" />
            </button>

            {/* Page numbers + ellipses */}
            {pages.map((p, i) =>
              p === '…' ? (
                <span
                  key={`ellipsis-${i}`}
                  className="flex size-8 items-center justify-center text-xs text-gray-400 select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className="flex size-8 items-center justify-center text-xs font-semibold transition-colors"
                  style={{
                    borderRadius: 5,
                    border: '1px solid',
                    borderColor: page === p ? '#b91c1c' : '#e5e7eb',
                    background: page === p ? '#fef2f2' : '#fff',
                    color: page === p ? '#b91c1c' : '#6b7280',
                  }}
                >
                  {p}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex size-8 items-center justify-center transition-colors hover:bg-gray-50 disabled:opacity-30"
              style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
            >
              <ChevronRight size={13} className="text-gray-500" />
            </button>

          </div>
        </div>
      )}

    </div>
  )
}
