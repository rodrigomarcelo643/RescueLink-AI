import type { Incident } from '@/types/incident'
import type { ResponseAgency } from '@/types/responseAgency'
import { CEBU_RESPONSE_AGENCIES_SEED, getResponseAgencies } from './responseAgencies.service'

export interface AgencyMatchResult {
  agency: ResponseAgency
  distanceKm: number
  estimatedTimeMin: number
  aiReason: string
}

const DEFAULT_AGENCY_COORDS: Record<string, { lat: number; lng: number }> = {
  'agency-cebu-001': { lat: 10.3015, lng: 123.8821 }, // BFP Labangon Sub-Station
  'agency-cebu-002': { lat: 10.2985, lng: 123.8965 }, // BFP Cebu Central Fire Station
  'agency-cebu-003': { lat: 10.3102, lng: 123.8790 }, // CCDRRMO Landslide
  'agency-cebu-004': { lat: 10.3125, lng: 123.8785 }, // ERUF Banawa
  'agency-cebu-005': { lat: 10.3090, lng: 123.8912 }, // Red Cross Cebu
  'agency-cebu-006': { lat: 10.3018, lng: 123.8825 }, // PNP Station 10 Labangon
  'agency-cebu-007': { lat: 10.2940, lng: 123.9080 }, // Coast Guard Pier 3
}

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  return parseFloat((R * c).toFixed(1))
}

function getLocalCategoryForDisaster(disasterType?: string): ResponseAgency['category'] {
  const dt = (disasterType || '').toLowerCase()
  if (dt.includes('fire') || dt.includes('sunog')) return 'fire'
  if (dt.includes('medical') || dt.includes('sugat') || dt.includes('injury') || dt.includes('trauma') || dt.includes('health')) return 'medical'
  if (dt.includes('police') || dt.includes('crime') || dt.includes('gulo') || dt.includes('security')) return 'police'
  if (dt.includes('coast') || dt.includes('maritime')) return 'military'
  return 'rescue' // covers landslide, flood, earthquake, typhoon, etc.
}

function matchLocally(incident: Incident, agencies: ResponseAgency[]): AgencyMatchResult {
  const category = getLocalCategoryForDisaster(incident?.disaster_type)

  // Find candidates matching the category, or fall back to all active agencies
  let candidates = agencies.filter((a) => a.category === category && a.is_active !== false)
  if (candidates.length === 0) {
    candidates = agencies.filter((a) => a.is_active !== false)
  }
  if (candidates.length === 0) {
    candidates = agencies
  }

  const hasIncCoords = incident?.latitude != null && incident?.longitude != null
  const incLat = incident?.latitude ?? 10.3157
  const incLng = incident?.longitude ?? 123.8854
  const locLower = (incident?.location_text || '').toLowerCase()

  // Calculate real distance for every candidate agency
  const scored = candidates.map((agency) => {
    const agLat = agency.latitude ?? DEFAULT_AGENCY_COORDS[agency.id]?.lat ?? null
    const agLng = agency.longitude ?? DEFAULT_AGENCY_COORDS[agency.id]?.lng ?? null

    let distance = 2.0

    if (hasIncCoords && agLat != null && agLng != null) {
      distance = calculateHaversineKm(incLat, incLng, agLat, agLng)
    } else {
      // Address / Barangay text keyword proximity bonus if coords are missing
      const addrLower = (agency.address || '').toLowerCase()
      const nameLower = (agency.name || '').toLowerCase()
      const keywords = ['labangon', 'banawa', 'bacalso', 'guadalupe', 'lahug', 'mandaue', 'pardo', 'mabolo', 'tisa', 'katipunan', 'osmeña', 'calamba', 'sambag', 'swu', 'aznar']
      for (const kw of keywords) {
        if (locLower.includes(kw) && (addrLower.includes(kw) || nameLower.includes(kw))) {
          distance = Math.max(0.2, distance * 0.3) // Location match bonus
        }
      }
    }

    return { agency, distance: parseFloat(distance.toFixed(1)) }
  })

  // Sort by shortest distance
  scored.sort((a, b) => a.distance - b.distance)

  const best = scored[0]
  const distance = Math.max(0.1, best.distance)
  const eta = Math.max(1, Math.round((distance / 30) * 60))
  const reason = `AI Proximity Match: Selected ${best.agency.name} (${distance} km away) as the closest specialized ${category} station for ${incident?.location_text || 'this location'}.`

  return {
    agency: best.agency,
    distanceKm: distance,
    estimatedTimeMin: eta,
    aiReason: reason,
  }
}

export async function matchNearestAgency(
  incident: Incident,
  agenciesList?: ResponseAgency[]
): Promise<AgencyMatchResult> {
  // Always fetch full list of registered DB agencies if agenciesList is not provided or empty
  let agencies = agenciesList && agenciesList.length > 0 ? agenciesList : []
  if (agencies.length === 0) {
    agencies = await getResponseAgencies()
  }
  if (agencies.length === 0) {
    agencies = CEBU_RESPONSE_AGENCIES_SEED
  }

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

  if (!incident) {
    return matchLocally(incident, agencies)
  }

  if (!apiKey || apiKey.includes('<key>') || !apiKey.startsWith('sk-')) {
    return matchLocally(incident, agencies)
  }

  try {
    const prompt = `You are an emergency dispatch AI for Cebu City, Philippines.
CRITICAL MANDATE: Select the SINGLE CLOSEST and most appropriate specialized response agency for this incident location.

Incident Details:
- Disaster Type: ${incident.disaster_type || 'General Emergency'}
- Location: ${incident.location_text || 'Cebu City'}
- Latitude: ${incident.latitude ?? 'N/A'}, Longitude: ${incident.longitude ?? 'N/A'}
- Severity: ${incident.severity || 'high'}

Available Emergency Response Agencies:
${agencies.map((a, i) => `${i + 1}) ID: ${a.id} | Name: ${a.name} | Category: ${a.category} | Address: ${a.address} | Lat: ${a.latitude ?? 'N/A'}, Lng: ${a.longitude ?? 'N/A'}`).join('\n')}

Task: Carefully analyze the incident location and coordinates to select the single closest matching agency from the list above.
Return ONLY JSON format strictly matching schema:
{
  "selected_agency_id": string,
  "distance_km": number,
  "estimated_time_min": number,
  "ai_reason": string
}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 7000)

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an emergency dispatch AI matching disaster categories to the single closest specialized response unit. Return valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    })

    clearTimeout(timeoutId)

    if (!res.ok) return matchLocally(incident, agencies)

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return matchLocally(incident, agencies)

    const parsed = JSON.parse(content)
    const targetAgency = agencies.find((a) => a.id === parsed.selected_agency_id) || matchLocally(incident, agencies).agency

    return {
      agency: targetAgency,
      distanceKm: typeof parsed.distance_km === 'number' ? parsed.distance_km : 0.8,
      estimatedTimeMin: typeof parsed.estimated_time_min === 'number' ? parsed.estimated_time_min : 5,
      aiReason: parsed.ai_reason || `AI Proximity Match: Selected ${targetAgency.name} for ${incident.disaster_type || 'emergency'}.`,
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      // Quietly fall back to instant Haversine math matcher on timeout
      return matchLocally(incident, agencies)
    }
    console.warn('[Agency Matcher] Fallback to local matcher:', e)
    return matchLocally(incident, agencies)
  }
}
