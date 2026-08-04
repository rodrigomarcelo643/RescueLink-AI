import { ChevronLeft, ChevronRight } from 'lucide-react'

function getPages(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

interface Props {
  page: number
  totalPages: number
  total: number
  onPage: (p: number) => void
}

export default function Pagination({ page, totalPages, total, onPage }: Props) {
  if (totalPages <= 1) return null
  const pages = getPages(page, totalPages)

  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-400">
        Page {page} of {totalPages} · {total} result{total !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex size-8 items-center justify-center transition-colors hover:bg-gray-50 disabled:opacity-30"
          style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
        >
          <ChevronLeft size={13} className="text-gray-500" />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="flex size-8 items-center justify-center select-none text-xs text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
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

        <button
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="flex size-8 items-center justify-center transition-colors hover:bg-gray-50 disabled:opacity-30"
          style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
        >
          <ChevronRight size={13} className="text-gray-500" />
        </button>
      </div>
    </div>
  )
}
