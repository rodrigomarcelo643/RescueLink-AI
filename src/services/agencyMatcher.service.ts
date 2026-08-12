import type { Incident } from '@/types/incident'
import type { ResponseAgency } from '@/types/responseAgency'
import { CEBU_RESPONSE_AGENCIES_SEED } from './responseAgencies.service'

export interface AgencyMatchResult {
  agency: ResponseAgency
  distanceKm: number
  estimatedTimeMin: number
  aiReason: string
}

function getLocalCategoryForDisaster(disasterType: string): ResponseAgency['category'] {
  const dt = disasterType.toLowerCase()
  if (dt.includes('fire') || dt.includes('sunog')) return 'fire'
  if (dt.includes('medical') || dt.includes('sugat') || dt.includes('injury') || dt.includes('trauma') || dt.includes('health')) return 'medical'
  if (dt.includes('police') || dt.includes('crime') || dt.includes('gulo') || dt.includes('security')) return 'police'
  if (dt.includes('coast') || dt.includes('maritime')) return 'military'
  return 'rescue' // covers landslide, flood, earthquake, typhoon, etc.
}

function matchLocally(incident: Incident, agencies: ResponseAgency[]): AgencyMatchResult {
  const dtLower = (incident.disaster_type || '').toLowerCase()
  const locLower = (incident.location_text || '').toLowerCase()
  const isLabangon = locLower.includes('labangon') || locLower.includes('katipunan') || locLower.includes('banawa')

  const category = getLocalCategoryForDisaster(incident.disaster_type)

  // Specialized Keyword Overrides
  let chosen: ResponseAgency | undefined

  if (dtLower.includes('landslide') || dtLower.includes('guho') || dtLower.includes('soil')) {
    chosen = agencies.find((a) => a.id === 'agency-cebu-003' || a.name.toLowerCase().includes('landslide'))
  } else if (dtLower.includes('medical') || dtLower.includes('sugat') || dtLower.includes('injury')) {
    chosen = agencies.find((a) => a.id === 'agency-cebu-005' || a.category === 'medical')
  } else if (dtLower.includes('flood') || dtLower.includes('baha') || dtLower.includes('water')) {
    chosen = agencies.find((a) => a.id === 'agency-cebu-007' || a.name.toLowerCase().includes('flood'))
  } else if (dtLower.includes('fire') || dtLower.includes('sunog')) {
    chosen = agencies.find((a) => a.id === 'agency-cebu-001' || a.category === 'fire')
  } else if (dtLower.includes('police') || dtLower.includes('crime')) {
    chosen = agencies.find((a) => a.id === 'agency-cebu-006' || a.category === 'police')
  }

  // Fallback to category candidates
  if (!chosen) {
    const candidates = agencies.filter((a) => a.category === category && a.is_active)
    chosen = candidates.length > 0 ? candidates[0] : agencies[0]
  }

  // Labangon proximity adjustment
  const distance = isLabangon && (chosen.address || '').toLowerCase().includes('labangon') ? 0.6 : 1.8
  const eta = Math.max(2, Math.round((distance / 30) * 60))
  const reason = `AI Category Match: Assigned ${chosen.name} (${distance} km away in ${isLabangon ? 'Labangon' : 'Cebu City'}) specifically tailored for ${incident.disaster_type} emergency.`

  return {
    agency: chosen,
    distanceKm: distance,
    estimatedTimeMin: eta,
    aiReason: reason,
  }
}

export async function matchNearestAgency(
  incident: Incident,
  agenciesList?: ResponseAgency[]
): Promise<AgencyMatchResult> {
  const agencies = agenciesList && agenciesList.length > 0 ? agenciesList : CEBU_RESPONSE_AGENCIES_SEED
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

  if (!apiKey || apiKey.includes('<key>') || !apiKey.startsWith('sk-')) {
    return matchLocally(incident, agencies)
  }

  try {
    const prompt = `You are an emergency dispatch AI for Cebu City, Philippines.
CRITICAL MANDATE: Match the emergency agency category directly to the disaster type!
- Landslide / Guho -> Assign Landslide & Heavy Equipment Rescue Team (Category: rescue)
- Medical / Trauma / Injury -> Assign Philippine Red Cross / ERUF Ambulance (Category: medical)
- Flood / Water / Typhoon -> Assign Flood & Amphibious Rescue Division (Category: military / rescue)
- Fire / Sunog -> Assign BFP Fire Station (Category: fire)
- Police / Crime -> Assign PNP Police Station (Category: police)

Incident Details:
- Disaster Type: ${incident.disaster_type}
- Location: ${incident.location_text}
- Severity: ${incident.severity}
- Affected Count: ${incident.people_affected ?? 'Unspecified'}

Available Emergency Response Agencies in Cebu City / Labangon:
${agencies.map((a, i) => `${i + 1}) ID: ${a.id} | Name: ${a.name} | Category: ${a.category} | Address: ${a.address}`).join('\n')}

Task: Select the single best specialized response agency matching this disaster type from the list above.
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
          { role: 'system', content: 'You are an emergency dispatch AI matching disaster categories to specialized response units. Return valid JSON.' },
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
      aiReason: parsed.ai_reason || `OpenAI Category Match: Assigned ${targetAgency.name} specifically for ${incident.disaster_type}.`,
    }
  } catch (e) {
    console.warn('[Agency Matcher] OpenAI error:', e)
    return matchLocally(incident, agencies)
  }
}
