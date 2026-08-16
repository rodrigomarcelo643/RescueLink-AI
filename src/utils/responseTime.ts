import type { Incident } from '@/types/incident'

export interface TicketResponseMetrics {
  dispatchDurationMinutes: number
  totalResolutionDurationMinutes: number
  liveElapsedMinutes: number
  formattedDispatchTime: string
  formattedResolutionTime: string
  formattedLiveTime: string
  statusLabel: string
}

export interface OverallResponseStats {
  avgDispatchMinutes: number
  avgResolutionMinutes: number
  fastestDispatchMinutes: number
  slaPerformancePercentage: number
  totalRespondedTickets: number
  totalResolvedTickets: number
  avgDispatchFormatted: string
  avgResolutionFormatted: string
}

/**
 * Calculates response duration metrics for a single incident ticket.
 */
export function calculateTicketResponseMetrics(incident: Incident): TicketResponseMetrics {
  const createdTime = new Date(incident.created_at).getTime()
  const now = Date.now()

  // 1. Dispatch acceptance time (created_at -> accepted_at or updated_at if responding)
  let acceptedTime = incident.accepted_at ? new Date(incident.accepted_at).getTime() : null
  if (!acceptedTime && (incident.status === 'responding' || incident.status === 'rescued' || incident.status === 'closed')) {
    acceptedTime = new Date(incident.updated_at).getTime()
  }

  const dispatchMs = acceptedTime && acceptedTime >= createdTime ? acceptedTime - createdTime : 0
  const dispatchDurationMinutes = Math.max(0.2, Math.round((dispatchMs / (1000 * 60)) * 10) / 10)

  // 2. Total resolution time (created_at -> rescued_at or closed_at or updated_at if rescued/closed)
  let resolvedTime = incident.rescued_at || incident.closed_at ? new Date(incident.rescued_at || incident.closed_at!).getTime() : null
  if (!resolvedTime && (incident.status === 'rescued' || incident.status === 'closed')) {
    resolvedTime = new Date(incident.updated_at).getTime()
  }

  const resolutionMs = resolvedTime && resolvedTime >= createdTime ? resolvedTime - createdTime : 0
  const totalResolutionDurationMinutes = Math.max(0.5, Math.round((resolutionMs / (1000 * 60)) * 10) / 10)

  // 3. Live active elapsed time
  const liveMs = Math.max(0, now - createdTime)
  const liveElapsedMinutes = Math.round((liveMs / (1000 * 60)) * 10) / 10

  return {
    dispatchDurationMinutes: incident.status === 'pending' ? 0 : dispatchDurationMinutes,
    totalResolutionDurationMinutes: incident.status === 'rescued' || incident.status === 'closed' ? totalResolutionDurationMinutes : 0,
    liveElapsedMinutes,
    formattedDispatchTime: formatDurationMinutes(dispatchDurationMinutes),
    formattedResolutionTime: formatDurationMinutes(totalResolutionDurationMinutes),
    formattedLiveTime: formatDurationMinutes(liveElapsedMinutes),
    statusLabel:
      incident.status === 'pending'
        ? 'Awaiting Dispatch'
        : incident.status === 'responding'
        ? 'En Route / Active'
        : incident.status === 'rescued'
        ? 'Rescue Completed'
        : 'Closed',
  }
}

/**
 * Calculates aggregate response SLA statistics across an array of incidents.
 */
export function calculateOverallResponseStats(incidents: Incident[]): OverallResponseStats {
  const respondedTickets = incidents.filter(
    (i) => i.status === 'responding' || i.status === 'rescued' || i.status === 'closed'
  )
  const resolvedTickets = incidents.filter((i) => i.status === 'rescued' || i.status === 'closed')

  let totalDispatchMin = 0
  let totalResolutionMin = 0
  let fastestDispatchMin = Infinity
  let under10MinCount = 0

  respondedTickets.forEach((inc) => {
    const metrics = calculateTicketResponseMetrics(inc)
    totalDispatchMin += metrics.dispatchDurationMinutes
    if (metrics.dispatchDurationMinutes > 0 && metrics.dispatchDurationMinutes < fastestDispatchMin) {
      fastestDispatchMin = metrics.dispatchDurationMinutes
    }
    if (metrics.dispatchDurationMinutes <= 10) {
      under10MinCount++
    }
  })

  resolvedTickets.forEach((inc) => {
    const metrics = calculateTicketResponseMetrics(inc)
    totalResolutionMin += metrics.totalResolutionDurationMinutes
  })

  const avgDispatchMinutes = respondedTickets.length > 0 ? Math.round((totalDispatchMin / respondedTickets.length) * 10) / 10 : 0
  const avgResolutionMinutes = resolvedTickets.length > 0 ? Math.round((totalResolutionMin / resolvedTickets.length) * 10) / 10 : 0
  const slaPerformancePercentage = respondedTickets.length > 0 ? Math.round((under10MinCount / respondedTickets.length) * 100) : 100

  return {
    avgDispatchMinutes,
    avgResolutionMinutes,
    fastestDispatchMinutes: fastestDispatchMin === Infinity ? 0 : fastestDispatchMin,
    slaPerformancePercentage,
    totalRespondedTickets: respondedTickets.length,
    totalResolvedTickets: resolvedTickets.length,
    avgDispatchFormatted: formatDurationMinutes(avgDispatchMinutes),
    avgResolutionFormatted: formatDurationMinutes(avgResolutionMinutes),
  }
}

/**
 * Formats minutes into human-readable duration strings (e.g. "2m 30s", "1h 15m")
 */
export function formatDurationMinutes(mins: number): string {
  if (mins <= 0) return '0m'
  if (mins < 1) {
    const secs = Math.round(mins * 60)
    return `${secs}s`
  }
  if (mins < 60) {
    const wholeMins = Math.floor(mins)
    const secs = Math.round((mins - wholeMins) * 60)
    return secs > 0 ? `${wholeMins}m ${secs}s` : `${wholeMins}m`
  }
  const hours = Math.floor(mins / 60)
  const remainingMins = Math.round(mins % 60)
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}
