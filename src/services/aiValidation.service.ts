import type { Incident } from '@/types/incident'

export interface AIValidationResult {
  severity: Incident['severity']
  priority_score: number
  ai_summary: string
  is_validated: boolean
  validation_notes: string
}

export interface PublicReportInput {
  disaster_type: string
  location_text: string
  latitude: number | null
  longitude: number | null
  people_affected: number | null
  raw_message: string
  reporter_name?: string
  reporter_contact?: string
  media_urls?: string[]
}

// ── Smart Local Heuristic Fallback ─────────────────────────────────────────

function analyzeLocally(input: PublicReportInput): AIValidationResult {
  const text = (input.raw_message + ' ' + input.disaster_type + ' ' + input.location_text).toLowerCase()
  const affected = input.people_affected ?? 1
  const hasImages = (input.media_urls?.length ?? 0) > 0
  const hasGps = input.latitude !== null && input.longitude !== null

  let severity: Incident['severity'] = 'medium'
  let score = 50

  const criticalKeywords = ['sunog', 'fire', 'trapped', 'naiipit', 'chest deep', 'lagpas tao', 'casualty', 'dead', 'patay', 'collapse', 'guho', 'landslide', 'drowning', 'lunod']
  const highKeywords = ['baha', 'flood', 'nasusunog', 'evacuate', 'evacuation', 'injury', 'sugat', 'rescue', 'saklolo', 'tulong']

  const isCriticalText = criticalKeywords.some((k) => text.includes(k))
  const isHighText = highKeywords.some((k) => text.includes(k))

  if (isCriticalText || affected >= 8) {
    severity = 'critical'
    score = Math.min(100, 85 + (affected > 10 ? 10 : 5) + (hasGps ? 5 : 0))
  } else if (isHighText || affected >= 4) {
    severity = 'high'
    score = Math.min(85, 65 + (affected > 5 ? 10 : 5) + (hasImages ? 5 : 0))
  } else if (text.includes('inquiry') || text.includes('tanong') || text.includes('minor')) {
    severity = 'low'
    score = 30
  }

  const summary = `Local AI: ${input.disaster_type} reported at ${input.location_text}. Approx ${affected} people affected. Severity evaluated as ${severity.toUpperCase()}.`
  const validationNotes = `Validated via Heuristic Rules: GPS Attached=${hasGps}, Proof Photos=${hasImages ? input.media_urls?.length : 0}.`

  return {
    severity,
    priority_score: score,
    ai_summary: summary,
    is_validated: true,
    validation_notes: validationNotes,
  }
}

// ── OpenAI GPT API Validation ──────────────────────────────────────────────

export async function analyzeAndValidateReport(input: PublicReportInput): Promise<AIValidationResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

  if (!apiKey || apiKey.includes('<key>') || !apiKey.startsWith('sk-')) {
    console.log('[AI Validation] OpenAI API key not found or invalid format. Using smart local fallback.')
    return analyzeLocally(input)
  }

  try {
    const prompt = `Analyze this emergency incident report submitted by a citizen in the Philippines:
- Disaster Type: ${input.disaster_type}
- Location: ${input.location_text}
- GPS Coordinates: ${input.latitude !== null ? `${input.latitude}, ${input.longitude}` : 'None'}
- People Affected: ${input.people_affected ?? 'Unspecified'}
- Report Description: "${input.raw_message}"
- Media Proof Attachments: ${input.media_urls?.length ?? 0} photos attached.

Tasks:
1) Assign severity ('critical' | 'high' | 'medium' | 'low'). Critical = immediate threat to human life, active structural fire, trapped citizens, chest-deep flood, casualties. High = rapid spreading fire, rising floodwaters, injuries. Medium = property damage, blocked access. Low = minor issue.
2) Assign priority_score (0 to 100 integer).
3) Generate a concise 1-2 sentence ai_summary for LGU responders.
4) Determine is_validated (boolean, true if details are coherent and plausible).
5) Provide validation_notes (explanation of rating).

Return ONLY valid JSON in this exact structure:
{
  "severity": "critical" | "high" | "medium" | "low",
  "priority_score": number,
  "ai_summary": string,
  "is_validated": boolean,
  "validation_notes": string
}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 9000)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an emergency disaster response AI classifier for RescueLink AI Philippines. Return valid JSON strictly matching requested schema.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[AI Validation] OpenAI API returned HTTP ${response.status}. Using local fallback.`)
      return analyzeLocally(input)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty response from OpenAI')

    const parsed = JSON.parse(content) as AIValidationResult

    // Validate fields
    const validSeverities: Incident['severity'][] = ['critical', 'high', 'medium', 'low']
    const finalSeverity = validSeverities.includes(parsed.severity) ? parsed.severity : 'medium'

    return {
      severity: finalSeverity,
      priority_score: typeof parsed.priority_score === 'number' ? parsed.priority_score : 60,
      ai_summary: parsed.ai_summary || `${input.disaster_type} at ${input.location_text}`,
      is_validated: typeof parsed.is_validated === 'boolean' ? parsed.is_validated : true,
      validation_notes: parsed.validation_notes || 'AI Validated via OpenAI GPT',
    }
  } catch (err) {
    console.warn('[AI Validation] OpenAI validation error:', err)
    return analyzeLocally(input)
  }
}
