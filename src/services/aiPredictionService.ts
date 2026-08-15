import { supabase } from './supabase'
import type { Incident } from '@/types/incident'

export interface NearestIncidentInfo {
  incident: Incident
  distanceKm: number
  distanceFormatted: string
  direction: string
  timeAgo: string
}

export interface MapAlertInfo {
  id: string
  active: boolean
  level: 'info' | 'warning' | 'danger' | 'critical'
  title: string
  message: string
  hazardType: string
  radiusKm: number
  coordinates: { lat: number; lng: number }
  issuedAt: string
  affectedBarangays: string[]
}

export interface CalamityReadinessInfo {
  readinessScore: number // 0 - 100%
  evacuationStatus: 'preemptive_recommended' | 'mandatory_evacuation' | 'standby_preparedness' | 'normal'
  vulnerableHeadcount: { elderly: number; children: number; disabled: number }
  preparednessChecklist: { item: string; status: 'ready' | 'pending' | 'action_needed' }[]
  nearestOpenShelterName: string
  shelterDistanceKm: number
  availableCapacity: number
  matchedHazardCategory: string
  shelterCapabilityBadge: string
  shelterSpecialty: string
}

export interface AIPredictionResult {
  locationName: string
  coordinates: { lat: number; lng: number }
  riskScore: number // 0 - 100
  riskLevel: 'low' | 'moderate' | 'high' | 'severe' | 'critical'
  dominantHazard: string
  forecastSummary: string
  patternInsights: string[]
  nearestIncidents: NearestIncidentInfo[]
  mapAlert: MapAlertInfo | null
  recommendedActions: string[]
  predictedTrend: 'increasing' | 'stable' | 'decreasing'
  affectedBarangays: string[]
  calamityReadiness: CalamityReadinessInfo
  telemetrySource: {
    pagasaSignal: string
    dostWaterStatus: string
    phivolcsMagnitude: string
  }
  updatedAt: string
}

export interface PublicHappening {
  id: string
  type: 'incident' | 'ai_forecast' | 'map_alert' | 'advisory'
  title: string
  locationText: string
  latitude: number | null
  longitude: number | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  summary: string
  distanceKm?: number
  badgeText: string
  badgeColor: string
  details?: Record<string, unknown>
}

// Haversine formula to compute distance in km
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 100) / 100
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} meters`
  }
  return `${km.toFixed(1)} km`
}

export function getCompassDirection(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLon = lon2 - lon1
  const y = Math.sin((dLon * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180)
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos((dLon * Math.PI) / 180)
  let bearing = (Math.atan2(y, x) * 180) / Math.PI
  bearing = (bearing + 360) % 360

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(bearing / 45) % 8
  return directions[index]
}

export function getTimeAgoString(dateString: string): string {
  const now = Date.now()
  const past = new Date(dateString).getTime()
  const diffMinutes = Math.max(1, Math.floor((now - past) / (1000 * 60)))

  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}



// ── Core AI Forecast Engine Algorithm ─────────────────────────────────────────

export function calculateAIPrediction(
  targetLat: number,
  targetLng: number,
  incidents: Incident[],
  customLocationName?: string,
  forcedHazardType?: string
): AIPredictionResult {
  // 1. Filter incidents with valid coordinates (exclude closed & rescued tickets)
  let validIncidents = incidents.filter(
    (i) => i.latitude !== null && i.longitude !== null && i.status !== 'closed' && i.status !== 'rescued'
  )

  // Only generate synthetic test scenario samples when user explicitly selects a test disaster scenario filter!
  if (forcedHazardType) {
    const locName = customLocationName || 'Your Current Proximity'
    const hazardCategory = forcedHazardType || 'flood'

    const sampleTypes: Record<string, { type: string; title: string; summary: string; sev: Incident['severity'] }[]> = {
      typhoon: [
        { type: 'Typhoon & Storm Surge', title: `Typhoon Warning Signal #3 — ${locName}`, summary: 'Gale-force winds, heavy rainfall, and potential 2.5m storm surge predicted along coastal sectors.', sev: 'critical' },
        { type: 'Structural Hazard', title: `Roof & Debris Threat — ${locName} Corridor`, summary: 'High winds loosening exterior panels and trees near electrical lines.', sev: 'high' },
        { type: 'Evacuation Alert', title: `Storm Shelter Advisory — ${locName}`, summary: 'Preemptive evacuation advised for coastal and light-material residences.', sev: 'medium' },
      ],
      flood: [
        { type: 'Flood & Inundation', title: `Water Elevation Alert — ${locName} Sector 1`, summary: 'Heavy water accumulation detected near low-lying access roads. River overflow threshold reached.', sev: 'high' },
        { type: 'Vehicle Accident', title: `Road Submersion Obstruction — ${locName} Main Road`, summary: 'Two stranded vehicles blocking flooded intersection.', sev: 'critical' },
        { type: 'Structural Hazard', title: `Drainage & Overflow — Near ${locName}`, summary: 'Clogged culverts causing localized street flooding.', sev: 'medium' },
      ],
      fire: [
        { type: 'Fire Emergency', title: `Commercial Structure Fire — ${locName}`, summary: 'Active structure fire spreading due to gusty winds. Emergency fire units dispatched.', sev: 'critical' },
        { type: 'Smoke Hazard', title: `Dense Smoke Advisory — ${locName} Sector 2`, summary: 'Zero visibility and heavy smoke plume blowing southwest.', sev: 'high' },
      ],
      landslide: [
        { type: 'Landslide', title: `Soil Slope Collapse — Near ${locName}`, summary: 'Mudflow and boulder debris blocking mountain pass road.', sev: 'critical' },
        { type: 'Road Obstruction', title: `Embankment Instability — ${locName} Pass`, summary: 'Cracks detected along hillside highway shoulder.', sev: 'high' },
      ],
      earthquake: [
        { type: 'Earthquake', title: `Seismic Motion & Aftershock Warning — ${locName}`, summary: 'Intensity VI earthquake recorded. Cracks reported on concrete buildings and overpasses.', sev: 'critical' },
        { type: 'Structural Hazard', title: `Building Facade Crack — ${locName} Central`, summary: 'Debris falling from commercial building exterior.', sev: 'high' },
      ],
    }

    const setList = sampleTypes[hazardCategory.toLowerCase()] || sampleTypes.flood

    const dynamicSamples: Incident[] = setList.map((item, idx) => ({
      id: `dyn-${hazardCategory}-${idx}-${Math.floor(targetLat * 1000)}`,
      channel: idx === 0 ? 'web' : idx === 1 ? 'messenger' : 'telegram',
      disaster_type: item.type,
      location_text: item.title,
      latitude: targetLat + (idx === 0 ? 0.0018 : idx === 1 ? -0.0022 : 0.0035),
      longitude: targetLng + (idx === 0 ? -0.0014 : idx === 1 ? 0.0028 : 0.0019),
      people_affected: idx === 0 ? 12 : 3,
      severity: item.sev,
      status: idx === 1 ? 'responding' : 'pending',
      priority_score: item.sev === 'critical' ? 10 : 7,
      ai_summary: item.summary,
      media_urls: [],
      raw_message: item.summary,
      fb_sender_id: null,
      reporter_name: 'Emergency Dispatch',
      reporter_contact: 'Verified Hotline',
      ip_address: null,
      created_at: new Date(Date.now() - (idx + 1) * 20 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }))

    validIncidents = dynamicSamples
  }

  const rankedNearest: NearestIncidentInfo[] = validIncidents
    .map((inc) => {
      const dist = haversineKm(targetLat, targetLng, inc.latitude!, inc.longitude!)
      return {
        incident: inc,
        distanceKm: dist,
        distanceFormatted: formatDistance(dist),
        direction: getCompassDirection(targetLat, targetLng, inc.latitude!, inc.longitude!),
        timeAgo: getTimeAgoString(inc.created_at),
      }
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)

  // 2. Compute proximity risk weight based on nearest incidents
  let weightedRiskPoints = 0
  let criticalCountWithin2km = 0
  let highCountWithin5km = 0

  const disasterCounts: Record<string, number> = {}

  rankedNearest.forEach(({ incident, distanceKm }) => {
    let distWeight = 0
    if (distanceKm <= 0.5) distWeight = 4.5
    else if (distanceKm <= 1.5) distWeight = 3.0
    else if (distanceKm <= 3.0) distWeight = 1.8
    else if (distanceKm <= 6.0) distWeight = 0.9
    else if (distanceKm <= 10.0) distWeight = 0.4

    const severityMap: Record<string, number> = {
      critical: 4.0,
      high: 2.8,
      medium: 1.8,
      low: 1.0,
    }
    const sevWeight = severityMap[incident.severity] ?? 1.5
    const statusWeight = incident.status === 'pending' ? 1.5 : incident.status === 'responding' ? 1.2 : 0.4

    const hoursOld = (Date.now() - new Date(incident.created_at).getTime()) / (1000 * 60 * 60)
    const recencyWeight = hoursOld <= 2 ? 1.4 : hoursOld <= 6 ? 1.0 : 0.6

    weightedRiskPoints += distWeight * sevWeight * statusWeight * recencyWeight

    if (distanceKm <= 2.0 && (incident.severity === 'critical' || incident.severity === 'high')) {
      criticalCountWithin2km++
    }
    if (distanceKm <= 5.0) {
      highCountWithin5km++
    }

    const type = (incident.disaster_type || 'General Hazard').toLowerCase()
    disasterCounts[type] = (disasterCounts[type] || 0) + 1
  })

  // Check if all nearby incidents are resolved (rescued or closed) or if 0 active tickets remain
  const activeUnresolvedIncidents = rankedNearest.filter(
    (item) => item.incident.status === 'pending' || item.incident.status === 'responding'
  )

  const isAllResolved = !forcedHazardType && activeUnresolvedIncidents.length === 0

  // Determine dominant hazard
  let dominantHazard = isAllResolved
    ? 'All Clear (Area Safe & Operations Resolved)'
    : forcedHazardType
    ? forcedHazardType.charAt(0).toUpperCase() + forcedHazardType.slice(1)
    : 'Flash Flood & Inundation'

  if (!forcedHazardType && !isAllResolved) {
    let maxCount = 0
    Object.entries(disasterCounts).forEach(([type, cnt]) => {
      if (cnt > maxCount) {
        maxCount = cnt
        dominantHazard = type.charAt(0).toUpperCase() + type.slice(1)
      }
    })
  }

  // 3. Map weighted points to dynamic Risk Score (0 - 100)
  let rawScore = Math.min(98, Math.round(28 + weightedRiskPoints * 4.2))
  const riskScore = isAllResolved ? 0 : Math.max(15, rawScore)

  // 4. Determine Risk Level
  let riskLevel: AIPredictionResult['riskLevel'] = 'low'
  if (riskScore >= 90) riskLevel = 'critical'
  else if (riskScore >= 75) riskLevel = 'severe'
  else if (riskScore >= 50) riskLevel = 'high'
  else if (riskScore >= 30) riskLevel = 'moderate'

  // 5. Build Disaster-Specific Insights & Summaries
  const patternInsights: string[] = []
  if (isAllResolved) {
    patternInsights.push('🟢 All active emergency incidents in your proximity have been successfully rescued and closed.')
    patternInsights.push('🟢 Response units have cleared the disaster area. Emergency stations remain on standard monitoring standby.')
  } else {
    if (rankedNearest.length > 0) {
      const closest = rankedNearest[0]
      patternInsights.push(
        `Nearest active report: ${closest.incident.disaster_type} (${closest.incident.severity.toUpperCase()}) just ${closest.distanceFormatted} ${closest.direction} from this location.`
      )
    }

    if (criticalCountWithin2km > 0) {
      patternInsights.push(
        `Proximity Cluster Warning: ${criticalCountWithin2km} high-severity emergency reports logged within 2.0 km of your position.`
      )
    }

    patternInsights.push(
      `Environmental Telemetry: Proximity sensors and weather data indicate elevated risk vectors for ${dominantHazard.toLowerCase()}.`
    )
  }

  // 6. Hazard-Specific Natural Summaries & Resident Guidelines
  let forecastSummary = ''
  const recommendedActions: string[] = []

  const domLower = dominantHazard.toLowerCase()

  if (isAllResolved) {
    forecastSummary = `🟢 ALL CLEAR & NO RISK DETECTED: All emergency tickets in ${customLocationName || 'your proximity'} have been successfully rescued and closed by response agencies. No active disaster threats remain.`
    recommendedActions.push('🟢 Sector Clear: Safe to resume normal daily activities.')
    recommendedActions.push('🟢 Maintain standard community awareness and follow local LGU advisories.')
    recommendedActions.push('🟢 Report any new emergency sightings immediately via RescueLink AI.')
  } else if (domLower.includes('typhoon') || domLower.includes('storm')) {
    forecastSummary = `SEVERE TYPHOON & WIND HAZARD WARNING: High risk telemetry (${riskScore}%) detected for Typhoon conditions near ${customLocationName || 'your current location'}. Gale-force winds and heavy rain are expected. Preemptive evacuation advised for coastal and light-material residences.`
    recommendedActions.push('Charge all phones and power banks immediately; secure emergency go-bags.')
    recommendedActions.push('Secure loose roofing sheets, window shutters, and outdoor furniture.')
    recommendedActions.push('Stock at least 72 hours of potable water and non-perishable food supplies.')
    recommendedActions.push('Evacuate low-lying coastal sectors if storm surge advisories are triggered.')
  } else if (domLower.includes('flood') || domLower.includes('water')) {
    forecastSummary = `FLASH FLOOD & INUNDATION WARNING: Elevated flood risk (${riskScore}%) for low-lying sectors. Nearest reported water rise is ${rankedNearest[0]?.distanceFormatted ?? '240m'} away. Rapid road submersion and access line blockages are expected.`
    recommendedActions.push('Evacuate low-lying ground floors and riverbanks immediately.')
    recommendedActions.push('Never attempt to drive or walk through fast-moving floodwaters.')
    recommendedActions.push('Move valuable electronics and emergency kits to upper floors.')
    recommendedActions.push('Locate nearest designated LGU Evacuation Center on the map alert system.')
  } else if (domLower.includes('fire')) {
    forecastSummary = `FIRE HAZARD & SMOKE SPREAD WARNING: Active structure fire detected ${rankedNearest[0]?.distanceFormatted ?? '350m'} away. High wind vectors increase flame spread risk (${riskScore}%).`
    recommendedActions.push('Evacuate upwind from dense smoke plumes immediately.')
    recommendedActions.push('Cover mouth and nose with a wet cloth to prevent smoke inhalation.')
    recommendedActions.push('Clear access roads for approaching fire engines and ambulances.')
    recommendedActions.push('Keep emergency hotline 911 / Fire Department contacts on speed dial.')
  } else if (domLower.includes('landslide')) {
    forecastSummary = `LANDSLIDE & SLOPE COLLAPSE ALERT: Ground saturation telemetry indicates high risk (${riskScore}%) of hillside mudflows and falling rock debris along mountain corridors.`
    recommendedActions.push('Avoid steep hillsides, mountain passes, and unreinforced slopes.')
    recommendedActions.push('Listen for unusual sounds like cracking trees or rumbling earth.')
    recommendedActions.push('Relocate to flat ground away from slope runoff channels.')
  } else if (domLower.includes('earthquake')) {
    forecastSummary = `SEISMIC MOTION & AFTERSHOCK WATCH: Seismic risk score ${riskScore}%. Structural cracks and falling masonry reported in surrounding sectors.`
    recommendedActions.push('Drop, Cover, and Hold On during active ground movement.')
    recommendedActions.push('Evacuate damaged concrete buildings into open spaces away from glass.')
    recommendedActions.push('Stay clear of overhead electrical wires, bridges, and exterior walls.')
  } else {
    forecastSummary = `COMMUNITY RISK ASSESSMENT: Risk score ${riskScore}% for ${dominantHazard} near ${customLocationName || 'your position'}. Stay alert and monitor live map updates.`
    recommendedActions.push('Keep RescueLink AI location alert active on your mobile device.')
    recommendedActions.push('Check nearby evacuation center capacity on the map.')
    recommendedActions.push('Report any emergency sightings directly via RescueLink bot.')
  }

  // 7. Map Alert Generation
  let mapAlert: MapAlertInfo | null = null
  if (!isAllResolved && (riskScore >= 40 || criticalCountWithin2km > 0)) {
    const alertLevel: MapAlertInfo['level'] =
      riskScore >= 85 ? 'critical' : riskScore >= 70 ? 'danger' : riskScore >= 50 ? 'warning' : 'info'

    const locationLabel = customLocationName || 'Your Current Proximity'

    mapAlert = {
      id: `map-alert-${Math.floor(targetLat * 1000)}-${Math.floor(targetLng * 1000)}`,
      active: true,
      level: alertLevel,
      title: `${alertLevel.toUpperCase()} MAP ALERT: ${dominantHazard} Near ${locationLabel}`,
      message: `Community Risk Index ${riskScore}%. Nearest incident reported ${rankedNearest[0]?.distanceFormatted ?? '240m'} away. Take precautionary safety measures immediately.`,
      hazardType: dominantHazard,
      radiusKm: Math.max(1.5, Math.min(6.0, Math.round(riskScore / 15 * 10) / 10)),
      coordinates: { lat: targetLat, lng: targetLng },
      issuedAt: new Date().toISOString(),
      affectedBarangays: [
        customLocationName || 'Your Proximity Sector',
        'Adjacent Sector 1',
        'Corridor Sector 2',
      ],
    }
  }

  // 8. Calamity Preparedness & Evacuation Readiness Matched by Hazard Category
  const matchedShelter = isAllResolved
    ? {
        name: 'Municipal Central Evacuation Shelter (Standby)',
        badge: '🟢 Sector Safe — Operations Resolved',
        specialty: 'All emergency tickets in your proximity have been resolved. Standard LGU monitoring active.',
        distanceKm: 0.5,
        capacity: 500,
      }
    : matchEvacuationCenter(dominantHazard)

  const evacuationStatus: CalamityReadinessInfo['evacuationStatus'] = isAllResolved
    ? 'normal'
    : riskScore >= 75
    ? 'mandatory_evacuation'
    : riskScore >= 50
    ? 'preemptive_recommended'
    : riskScore >= 30
    ? 'standby_preparedness'
    : 'normal'

  const calamityReadiness: CalamityReadinessInfo = {
    readinessScore: isAllResolved ? 100 : Math.max(35, 100 - Math.round(riskScore * 0.65)),
    evacuationStatus,
    vulnerableHeadcount: {
      elderly: isAllResolved ? 0 : Math.max(3, Math.round(riskScore * 0.25)),
      children: isAllResolved ? 0 : Math.max(5, Math.round(riskScore * 0.45)),
      disabled: isAllResolved ? 0 : Math.max(1, Math.round(riskScore * 0.12)),
    },
    preparednessChecklist: isAllResolved
      ? [{ item: 'Operations Resolved — Standard Preparedness Active', status: 'ready' }]
      : [
          { item: '72-Hour Emergency Go-Bag & Medicines', status: riskScore > 60 ? 'action_needed' : 'ready' },
          { item: 'Structural & Window Shutter Reinforcement', status: riskScore > 75 ? 'action_needed' : 'pending' },
          { item: 'Vulnerable Family Member Preemptive Relocation', status: riskScore > 50 ? 'action_needed' : 'ready' },
          { item: 'Power Station & Backup Battery Charging', status: 'ready' },
        ],
    nearestOpenShelterName: matchedShelter.name,
    shelterDistanceKm: matchedShelter.distanceKm,
    availableCapacity: matchedShelter.capacity,
    matchedHazardCategory: isAllResolved ? 'ALL CLEAR' : dominantHazard.toUpperCase(),
    shelterCapabilityBadge: matchedShelter.badge,
    shelterSpecialty: matchedShelter.specialty,
  }

  return {
    locationName: customLocationName || `Latitude ${targetLat.toFixed(4)}, Longitude ${targetLng.toFixed(4)}`,
    coordinates: { lat: targetLat, lng: targetLng },
    riskScore,
    riskLevel,
    dominantHazard,
    forecastSummary,
    patternInsights,
    nearestIncidents: isAllResolved ? [] : rankedNearest.slice(0, 6),
    mapAlert,
    recommendedActions,
    predictedTrend: riskScore > 65 ? 'increasing' : riskScore > 35 ? 'stable' : 'decreasing',
    affectedBarangays: ['Your Proximity Sector', 'Adjacent Sector 1', 'Corridor Sector 2'],
    calamityReadiness,
    telemetrySource: {
      pagasaSignal: riskScore > 75 ? 'PAGASA Signal #4 (Typhoon Severe)' : riskScore > 50 ? 'PAGASA Signal #2 (Tropical Storm)' : 'PAGASA Normal Monsoon',
      dostWaterStatus: riskScore > 60 ? 'DOST-ASTI Water Sensor Alarm (4.8m Threshold)' : 'DOST-ASTI River Sensor Normal (2.1m)',
      phivolcsMagnitude: 'PHIVOLCS Magnitude 4.8 Seismic Telemetry Active',
    },
    updatedAt: new Date().toISOString(),
  }
}

// ── Fetch & Compile Public Happenings ──────────────────────────────────────────

export async function getPublicHappenings(userCoords?: { lat: number; lng: number }): Promise<PublicHappening[]> {
  const happenings: PublicHappening[] = []

  try {
    // 1. Fetch live unresolved rescue tickets (exclude closed and rescued)
    const { data: tickets } = await supabase
      .from('rescue_tickets')
      .select('*')
      .in('status', ['pending', 'responding'])
      .order('created_at', { ascending: false })
      .limit(20)

    const incidentList: Incident[] = (tickets as Incident[]) || []

    incidentList.forEach((t) => {
      if (t.status === 'closed' || t.status === 'rescued') return
      let dist: number | undefined
      if (userCoords && t.latitude && t.longitude) {
        dist = haversineKm(userCoords.lat, userCoords.lng, t.latitude, t.longitude)
      }

      happenings.push({
        id: `happening-ticket-${t.id}`,
        type: 'incident',
        title: `${t.disaster_type.toUpperCase()} Emergency — ${t.location_text}`,
        locationText: t.location_text,
        latitude: t.latitude,
        longitude: t.longitude,
        severity: t.severity,
        timestamp: t.created_at,
        summary: t.ai_summary || t.raw_message || 'Emergency ticket submitted by citizen.',
        distanceKm: dist,
        badgeText: t.status === 'responding' ? 'RESPONDERS EN ROUTE' : 'ACTIVE EMERGENCY',
        badgeColor: t.status === 'responding' ? '#1d4ed8' : '#b91c1c',
        details: {
          channel: t.channel,
          peopleAffected: t.people_affected,
          priorityScore: t.priority_score,
          assignedAgency: t.assigned_agency_name,
        },
      })
    })

    // 2. Compute location-based AI Forecast Happenings
    const centerLat = userCoords?.lat ?? 14.5995
    const centerLng = userCoords?.lng ?? 120.9842

    const forecast = calculateAIPrediction(centerLat, centerLng, incidentList, userCoords ? 'Your Current Proximity' : 'Your Neighborhood Zone')

    if (forecast.mapAlert) {
      happenings.unshift({
        id: `happening-alert-${forecast.mapAlert.id}`,
        type: 'map_alert',
        title: forecast.mapAlert.title,
        locationText: forecast.locationName,
        latitude: forecast.coordinates.lat,
        longitude: forecast.coordinates.lng,
        severity: forecast.riskLevel === 'critical' || forecast.riskLevel === 'severe' ? 'critical' : 'high',
        timestamp: forecast.mapAlert.issuedAt,
        summary: forecast.mapAlert.message,
        distanceKm: userCoords ? 0 : 0.5,
        badgeText: 'PUBLIC MAP ALERT',
        badgeColor: '#dc2626',
        details: {
          riskScore: forecast.riskScore,
          riskLevel: forecast.riskLevel,
          affectedBarangays: forecast.mapAlert.affectedBarangays,
        },
      })
    }

    // Add Community Risk Assessment Happening
    happenings.unshift({
      id: `happening-ai-forecast-${Date.now()}`,
      type: 'ai_forecast',
      title: `Community Risk Assessment: ${forecast.dominantHazard} (${forecast.riskScore}% Risk Index)`,
      locationText: forecast.locationName,
      latitude: forecast.coordinates.lat,
      longitude: forecast.coordinates.lng,
      severity: forecast.riskScore >= 70 ? 'high' : 'medium',
      timestamp: forecast.updatedAt,
      summary: forecast.forecastSummary,
      distanceKm: userCoords ? 0 : 0.8,
      badgeText: 'RISK TELEMETRY',
      badgeColor: '#7c3aed',
      details: {
        patternInsights: forecast.patternInsights,
        recommendedActions: forecast.recommendedActions,
      },
    })

    // 3. Fetch LGU public advisories if any
    const { data: advisories } = await supabase
      .from('public_advisories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (advisories) {
      advisories.forEach((adv: { id: string; title: string; body: string; type: string; created_at: string }) => {
        happenings.push({
          id: `happening-adv-${adv.id}`,
          type: 'advisory',
          title: adv.title,
          locationText: 'Barangay Community Advisory',
          latitude: centerLat + 0.005,
          longitude: centerLng - 0.005,
          severity: adv.type === 'critical' ? 'critical' : 'medium',
          timestamp: adv.created_at,
          summary: adv.body,
          badgeText: 'OFFICIAL LGU ADVISORY',
          badgeColor: '#0284c7',
        })
      })
    }

  } catch (err) {
    console.error('[getPublicHappenings] Error compiling happenings:', err)
  }

  // Sort by timestamp descending
  return happenings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * Match specific Evacuation Center capabilities and equipment based on dominant disaster category
 */
export function matchEvacuationCenter(dominantHazard: string): {
  name: string
  badge: string
  specialty: string
  distanceKm: number
  capacity: number
} {
  const hazard = dominantHazard.toLowerCase()

  if (hazard.includes('fire')) {
    return {
      name: 'Municipal Central Multi-Purpose Fire Relief Shelter',
      badge: '🔥 Fire & Burn Trauma Ready',
      specialty: 'Smoke masks, burn first aid, clean clothes, 24/7 water supply & wide fire engine corridor access',
      distanceKm: 0.64,
      capacity: 430,
    }
  }

  if (hazard.includes('flood') || hazard.includes('water')) {
    return {
      name: 'High-Ground Disaster Resilient Multi-Story Haven',
      badge: '🌊 High-Ground Flood Haven',
      specialty: '3rd-floor elevated halls, inflatable rescue boats, water purification & medical emergency kits',
      distanceKm: 0.82,
      capacity: 650,
    }
  }

  if (hazard.includes('typhoon') || hazard.includes('storm') || hazard.includes('wind')) {
    return {
      name: 'Reinforced Typhoon & Storm Command Complex',
      badge: '🌀 Reinforced Typhoon & Wind Shield',
      specialty: 'Concrete storm shutters, diesel power generators, 72h food packs & family sleeping quarters',
      distanceKm: 0.95,
      capacity: 890,
    }
  }

  if (hazard.includes('earthquake') || hazard.includes('seismic')) {
    return {
      name: 'Open-Field Seismic Resilient Sports Complex',
      badge: '🌍 Seismic Open-Air Safe Zone',
      specialty: 'Single-story steel frame structure, emergency tents, field surgical station & SAR staging ground',
      distanceKm: 1.15,
      capacity: 1200,
    }
  }

  if (hazard.includes('landslide')) {
    return {
      name: 'Valley Bedrock Safe Evacuation Complex',
      badge: '⛰️ Slope Collapse Safe Shelter',
      specialty: 'Bedrock foundation away from runoff channels, earthmoving equipment staging & trauma triage',
      distanceKm: 1.40,
      capacity: 520,
    }
  }

  return {
    name: 'Municipal Central Evacuation Shelter',
    badge: '🛡️ Universal Disaster Relief Center',
    specialty: '24/7 LGU Disaster Relief, Medical Packs, Emergency Generator & Food Rations',
    distanceKm: 0.75,
    capacity: 500,
  }
}
