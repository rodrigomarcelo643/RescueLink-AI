# 06 — AI Integration

All AI logic runs inside Supabase Edge Functions. No AI calls are made from the frontend.

---

## Step 1: ai-extract Edge Function

This is the core function called by all chatbot webhooks. It takes raw citizen input and returns a structured rescue ticket.

```
supabase/functions/ai-extract/index.ts
```

```ts
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  const { text, attachments, channel, senderId } = await req.json()

  // 1. Extract structured data from text using GPT
  const extraction = await extractWithGPT(text)

  // 2. If image attached, run vision analysis
  let visionSummary = null
  if (attachments?.length > 0) {
    visionSummary = await analyzeImage(attachments[0].url ?? attachments[0])
  }

  // 3. Insert rescue ticket
  const { data: ticket, error } = await supabase
    .from('rescue_tickets')
    .insert({
      channel,
      disaster_type: extraction.disaster_type,
      location_text: extraction.location,
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

  return new Response(JSON.stringify(ticket), {
    headers: { 'Content-Type': 'application/json' },
  })
})

async function extractWithGPT(text: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe the disaster visible in this image. Identify type, severity, and any people in danger.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  })
  const data = await res.json()
  return data.choices[0].message.content
}

function computePriority(extraction: { severity: string; people_affected: number }) {
  const severityScore: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 }
  const base = severityScore[extraction.severity] ?? 1
  const peopleBonus = Math.min(Math.floor((extraction.people_affected ?? 0) / 5), 3)
  return base + peopleBonus
}
```

### Deploy

```bash
supabase functions deploy ai-extract
```

---

## Step 2: match-volunteer Edge Function

Called when a rescue ticket is created. Finds the nearest available volunteer with matching skills.

```
supabase/functions/match-volunteer/index.ts
```

```ts
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  const { ticketId } = await req.json()

  const { data: ticket } = await supabase
    .from('rescue_tickets')
    .select('*')
    .eq('id', ticketId)
    .single()

  const { data: volunteers } = await supabase
    .from('volunteers')
    .select('*, profiles(*)')
    .eq('is_available', true)

  // Sort by distance using Haversine formula
  const ranked = volunteers
    ?.map((v) => ({ ...v, distance: haversine(ticket.latitude, ticket.longitude, v.latitude, v.longitude) }))
    .sort((a, b) => a.distance - b.distance)

  const best = ranked?.[0]

  return new Response(JSON.stringify(best ?? null), {
    headers: { 'Content-Type': 'application/json' },
  })
})

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
```

### Deploy

```bash
supabase functions deploy match-volunteer
```

---

## Step 3: AI Knowledge Assistant

Citizens can ask questions. Handled inside the chatbot webhooks by calling GPT with a system prompt grounded in LGU data.

```ts
async function answerQuestion(question: string, context: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are RescueLink AI, a disaster response assistant for the Philippines.
            Answer only using the provided context. If unsure, say so.
            Context: ${context}`,
        },
        { role: 'user', content: question },
      ],
    }),
  })
  const data = await res.json()
  return data.choices[0].message.content
}
```

---

## AI Pipeline Summary

```
Raw citizen message
        │
        ▼
  ai-extract function
        ├── GPT-4o-mini  → structured JSON (type, location, severity)
        └── GPT-4o Vision → image description (if media attached)
        │
        ▼
  rescue_tickets INSERT
        │
        ▼
  match-volunteer function
        └── Haversine distance sort → nearest available volunteer
```
