import { Inbox } from 'lucide-react'

interface Props {
  title: string
  description?: string
}

export default function EmptyState({ title, description }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
      style={{ border: '1px dashed #e5e7eb', borderRadius: 5 }}
    >
      <div
        className="flex size-10 items-center justify-center"
        style={{ background: '#fef2f2', borderRadius: 5 }}
      >
        <Inbox size={18} className="text-red-400" />
      </div>
      <div>
        <p className="text-sm font-extrabold text-gray-900">{title}</p>
        {description && <p className="mt-0.5 text-xs text-gray-400">{description}</p>}
      </div>
    </div>
  )
}
