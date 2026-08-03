import { useState } from 'react'
import { useIncidents } from '@/hooks/useIncidents'
import IncidentCard from '@/components/incidents/IncidentCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import type { Incident } from '@/types/incident'

const STATUSES: Incident['status'][] = ['pending', 'responding', 'rescued', 'closed']

const STATUS_STYLE: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  responding: 'bg-blue-50 text-blue-700 border-blue-200',
  rescued:    'bg-green-50 text-green-700 border-green-200',
  closed:     'bg-gray-50 text-gray-500 border-gray-200',
}

export default function Incidents() {
  const { items, loading } = useIncidents()
  const [filter, setFilter] = useState<Incident['status'] | 'all'>('all')

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter)

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6">

      <div>
        <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Incidents</h1>
        <p className="mt-0.5 text-sm text-gray-400">Monitor and manage active rescue operations</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className="px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{
            borderRadius: 5,
            border: '1px solid',
            borderColor: filter === 'all' ? '#b91c1c' : '#e5e7eb',
            background: filter === 'all' ? '#fef2f2' : '#fff',
            color: filter === 'all' ? '#b91c1c' : '#6b7280',
          }}
        >
          All ({items.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${filter === s ? STATUS_STYLE[s] : 'text-gray-500'}`}
            style={{
              borderRadius: 5,
              border: '1px solid',
              borderColor: filter === s ? undefined : '#e5e7eb',
            }}
          >
            {s} ({items.filter((i) => i.status === s).length})
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0
          ? <EmptyState title="No incidents found" description="Reports will appear here in real-time." />
          : filtered.map((incident) => <IncidentCard key={incident.id} incident={incident} />)
        }
      </div>
    </div>
  )
}
