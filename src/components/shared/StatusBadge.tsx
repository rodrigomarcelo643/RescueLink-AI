import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800 ring-yellow-200',
  responding: 'bg-blue-100 text-blue-800 ring-blue-200',
  rescued:    'bg-green-100 text-green-800 ring-green-200',
  closed:     'bg-gray-100 text-gray-600 ring-gray-200',
  confirmed:  'bg-green-100 text-green-800 ring-green-200',
  distributed:'bg-purple-100 text-purple-800 ring-purple-200',
  in_kind:    'bg-orange-100 text-orange-800 ring-orange-200',
}

interface Props {
  status: string
}

export default function StatusBadge({ status }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1',
      STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600 ring-gray-200'
    )}>
      {status.replace('_', ' ')}
    </span>
  )
}
