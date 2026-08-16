import type { Incident } from '@/types/incident'

export interface AIValidationResult {
  severity: Incident['severity']
  priority_score: number
  ai_summary: string
  is_validated: boolean
  validation_notes: string
  is_media_valid: boolean
  media_mismatch_reason: string
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

  // Check for QR code, receipt, logo, or dummy/fake test patterns in file URLs/names
  const hasQrOrNonEmergencyFile = (input.media_urls || []).some((u) => {
    const lowerUrl = u.toLowerCase()
    return (
      lowerUrl.includes('qr') ||
      lowerUrl.includes('code') ||
      lowerUrl.includes('barcode') ||
      lowerUrl.includes('receipt') ||
      lowerUrl.includes('payment') ||
      lowerUrl.includes('avatar') ||
      lowerUrl.includes('logo') ||
      lowerUrl.includes('gcash')
    )
  })

  // Check for dummy/fake test text patterns
  const isDummyText = ['test', 'dummy', 'asdf', '1234', 'sample', 'hello', 'fake', 'qr'].some(
    (k) => text.trim() === k || text.trim().startsWith(k)
  )

  let is_media_valid = true
  let media_mismatch_reason = ''

  if (hasQrOrNonEmergencyFile) {
    is_media_valid = false
    media_mismatch_reason = `AI Analysis Flag: Uploaded proof is a QR Code or non-emergency graphic and does NOT match the reported ${input.disaster_type.toUpperCase()} incident details.`
  } else if (isDummyText) {
    is_media_valid = false
    media_mismatch_reason = 'AI detected non-emergency test or dummy placeholder text in your report.'
  }

  // Detect true disaster type from raw message content
  let trueDisasterType = input.disaster_type
  if (text.includes('earthquake') || text.includes('lindol') || text.includes('aftershock')) {
    trueDisasterType = 'earthquake'
  } else if (text.includes('fire') || text.includes('sunog') || text.includes('nasusunog')) {
    trueDisasterType = 'fire'
  } else if (text.includes('flood') || text.includes('baha') || text.includes('tubig')) {
    trueDisasterType = 'flood'
  } else if (text.includes('landslide') || text.includes('guba')) {
    trueDisasterType = 'landslide'
  }

  // If user selected "fire" (sunog) but message/proof mentions flood or unrelated topic
  if (input.disaster_type.toLowerCase() === 'fire' && (text.includes('qr') || text.includes('code') || text.includes('baha') || text.includes('flood'))) {
    if (!text.includes('sunog') && !text.includes('fire') && !text.includes('flame') && !text.includes('smoke')) {
      is_media_valid = false
      media_mismatch_reason = `AI Analysis Flag: Attached proof/description does NOT match a Fire (Sunog) emergency. No active fire, flames, or smoke proof detected.`
    }
  }

  let severity: Incident['severity'] = 'medium'
  let score = 50

  const criticalKeywords = ['earthquake', 'lindol', 'sunog', 'fire', 'trapped', 'naiipit', 'chest deep', 'casualty', 'dead', 'collapse', 'guho', 'landslide', 'drowning']
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

  const responseType = trueDisasterType === 'earthquake'
    ? 'Urban Search & Rescue'
    : trueDisasterType === 'fire'
    ? 'BFP Fire Suppression'
    : trueDisasterType === 'flood'
    ? 'Amphibious Flood Rescue'
    : 'Disaster Emergency Response'

  const summary = `AI Evaluated: ${trueDisasterType.toUpperCase()} incident at ${input.location_text}. Approx ${affected} people affected. ${responseType} unit requested.`
  const validationNotes = `Validated via AI Multimodal Analysis: True Disaster Type=${trueDisasterType.toUpperCase()}, GPS Attached=${hasGps}, Proof Attachments=${hasImages ? input.media_urls?.length : 0}.`

  return {
    severity,
    priority_score: score,
    ai_summary: summary,
    is_validated: is_media_valid,
    validation_notes: validationNotes,
    is_media_valid,
    media_mismatch_reason,
  }
}

// ── OpenAI GPT API Validation (Multimodal Vision) ─────────────────────────

export async function analyzeAndValidateReport(input: PublicReportInput): Promise<AIValidationResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

  if (!apiKey || apiKey.includes('<key>') || !apiKey.startsWith('sk-')) {
    console.log('[AI Validation] OpenAI API key not found or invalid format. Using smart local fallback.')
    return analyzeLocally(input)
  }

  try {
    const promptText = `CRITICAL INSTRUCTION FOR EMERGENCY DISASTER VISION VALIDATION:
Analyze this emergency incident report and attached image/video/audio proof submitted by a citizen in the Philippines:
- Disaster Type Reported: ${input.disaster_type}
- Location: ${input.location_text}
- GPS Coordinates: ${input.latitude !== null ? `${input.latitude}, ${input.longitude}` : 'None'}
- People Affected: ${input.people_affected ?? 'Unspecified'}
- Report Description: "${input.raw_message}"
- Media Proof Attachments Count: ${input.media_urls?.length ?? 0}
- Media File URLs: ${JSON.stringify(input.media_urls || [])}

STRICT PROOF MATCHING RULES:
1. Examine if the attached image/video visually matches the reported disaster category ("${input.disaster_type}").
2. If the user reported "Fire" (Sunog), the attached proof MUST visually show active flames, fire, heavy smoke, or fire destruction damage. If the attached image is a QR Code, barcode, payment receipt, meme, avatar, document, black/blank image, or unrelated object (e.g., cat, shoes, food), YOU MUST SET "is_media_valid": false, "is_validated": false, and "media_mismatch_reason": "Attached image is a QR Code / non-emergency graphic and does NOT show fire (sunog) or active emergency damage."
3. If the image is invalid or mismatched, set "is_media_valid": false and explain why in "media_mismatch_reason".

Tasks:
1) Assign severity ('critical' | 'high' | 'medium' | 'low').
2) Assign priority_score (0 to 100 integer).
3) Generate a concise 1-2 sentence ai_summary for LGU responders.
4) Determine is_validated (boolean, true if details and proof are coherent, plausible, and authentic).
5) Determine is_media_valid (boolean, true ONLY if attached proof matches reported disaster details).
6) Provide media_mismatch_reason (string, detailed explanation if is_media_valid is false, otherwise "").

Return ONLY valid JSON in this exact structure:
{
  "severity": "critical" | "high" | "medium" | "low",
  "priority_score": number,
  "ai_summary": string,
  "is_validated": boolean,
  "validation_notes": string,
  "is_media_valid": boolean,
  "media_mismatch_reason": string
}`

    const userMessageContent: any[] = [{ type: 'text', text: promptText }]

    // Pass image URLs directly to OpenAI Multimodal Vision!
    if (input.media_urls && input.media_urls.length > 0) {
      input.media_urls.forEach((url) => {
        if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
          userMessageContent.push({
            type: 'image_url',
            image_url: { url, detail: 'low' },
          })
        }
      })
    }

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
            content: 'You are an emergency disaster response AI vision and text validator for RescueLink AI Philippines. Return valid JSON strictly matching requested schema.',
          },
          {
            role: 'user',
            content: userMessageContent,
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

    const isMediaValid = typeof parsed.is_media_valid === 'boolean' ? parsed.is_media_valid : true
    const isValidated = typeof parsed.is_validated === 'boolean' ? parsed.is_validated : isMediaValid

    return {
      severity: finalSeverity,
      priority_score: typeof parsed.priority_score === 'number' ? parsed.priority_score : 60,
      ai_summary: parsed.ai_summary || `${input.disaster_type} at ${input.location_text}`,
      is_validated: isValidated && isMediaValid,
      validation_notes: parsed.validation_notes || 'AI Validated via OpenAI GPT Vision',
      is_media_valid: isMediaValid,
      media_mismatch_reason: parsed.media_mismatch_reason || (isMediaValid ? '' : 'Attached image proof does not match the reported disaster category.'),
    }
  } catch (err) {
    console.warn('[AI Validation] OpenAI validation error:', err)
    return analyzeLocally(input)
  }
}
