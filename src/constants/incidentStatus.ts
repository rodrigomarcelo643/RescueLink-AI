export const INCIDENT_STATUS = {
  PENDING: 'pending',
  RESPONDING: 'responding',
  RESCUED: 'rescued',
  CLOSED: 'closed',
} as const

export const SEVERITY_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const SEVERITY_COLOR: Record<string, string> = {
  low: 'text-green-600',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-red-600',
}

export const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  responding: 'bg-blue-100 text-blue-800',
  rescued: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
}
