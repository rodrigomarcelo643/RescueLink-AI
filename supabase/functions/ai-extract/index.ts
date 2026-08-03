import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  const { text, attachments, channel, senderId } = await req.json()

  const extraction = await extractWithGPT(text)

  // Geocode location text to coordinates
  const coords = await geocode(extraction.location)

  let visionSummary = null
  if (attachments?.length > 0) {
    visionSummary = await analyzeImage(attachments[0].url ?? attachments[0])
  }

  const { data: ticket, error } = await supabase
    .from('rescue_tickets')
    .insert({
      channel,
      disaster_type: extraction.disaster_type,
      location_text: extraction.location,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      people_affected: extraction.people_affected,
      severity: extraction.severity,
      priority_score: computePriority(extraction),
      raw_message: text,
      ai_summary: visionSummary ?? extraction.summary,
      media_urls: attachments?.map((a: { url: string }) => a.url) ?? [],
    })
    .select()
    .single()

  if (error) return new Response(JSON.stringify({ error }), { status: 500 })

  // Auto-publish advisory if 3+ reports in last 30 min
  const { count } = await supabase
    .from('rescue_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('disaster_type', extraction.disaster_type)
    .eq('location_text', extraction.location)
    .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())

  if ((count ?? 0) >= 3) {
    const { data: advisory } = await supabase
      .from('public_advisories')
      .insert({
        ticket_id: ticket.id,
        title: `${extraction.disaster_type.toUpperCase()} in ${extraction.location}`,
        body: `Multiple reports confirm a ${extraction.disaster_type} in ${extraction.location}. Please avoid the area and follow LGU instructions.`,
        type: 'flood_warning',
        confidence_score: 0.9,
      })
      .select()
      .single()

    if (advisory) {
      await fetch(`${SUPABASE_URL}/functions/v1/post-advisory`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ advisoryId: advisory.id }),
      })
    }
  }

  return new Response(JSON.stringify(ticket), {
    headers: { 'Content-Type': 'application/json' },
  })
})

async function extractWithGPT(text: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a disaster report extraction AI. Extract from the user message:
            - disaster_type (flood, fire, earthquake, landslide, typhoon, other)
            - location (barangay, street, landmark)
            - people_affected (number or null)
            - severity (low, medium, high, critical)
            - summary (one sentence)
            Return valid JSON only.`,
        },
        { role: 'user', content: text },
      ],
    }),
  })
  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}

async function analyzeImage(imageUrl: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Describe the disaster visible in this image. Identify type, severity, and any people in danger.' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }],
    }),
  })
  const data = await res.json()
  return data.choices[0].message.content
}

async function geocode(locationText: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationText + ', Philippines')}&key=${GOOGLE_MAPS_API_KEY}`
  )
  const data = await res.json()
  return data.results?.[0]?.geometry?.location ?? null
}

function computePriority(extraction: { severity: string; people_affected: number }) {
  const severityScore: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 }
  const base = severityScore[extraction.severity] ?? 1
  const peopleBonus = Math.min(Math.floor((extraction.people_affected ?? 0) / 5), 3)
  return base + peopleBonus
}
