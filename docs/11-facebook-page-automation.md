# 11 — Facebook Page Auto-Post (Advisories)

When a verified incident reaches a confidence threshold or is approved by an LGU officer, the system automatically publishes a public advisory to the official Facebook Page.

---

## Step 1: Facebook Page Setup

1. Your Facebook App must have the **Pages API** permission: `pages_manage_posts`
2. Generate a **Page Access Token** with that permission
3. Save as `FB_PAGE_ACCESS_TOKEN` and `FB_PAGE_ID` in Supabase secrets

---

## Step 2: post-advisory Edge Function

```
supabase/functions/post-advisory/index.ts
```

```ts
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FB_PAGE_ACCESS_TOKEN = Deno.env.get('FB_PAGE_ACCESS_TOKEN')!
const FB_PAGE_ID = Deno.env.get('FB_PAGE_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const ADVISORY_EMOJI: Record<string, string> = {
  flood_warning: '🚨',
  road_closure: '⚠️',
  evacuation_open: '🏫',
  donation_drive: '❤️',
  relief_update: '📦',
}

serve(async (req) => {
  const { advisoryId } = await req.json()

  const { data: advisory } = await supabase
    .from('public_advisories')
    .select('*')
    .eq('id', advisoryId)
    .single()

  if (!advisory) return new Response('Not found', { status: 404 })

  const emoji = ADVISORY_EMOJI[advisory.type] ?? '📢'
  const post = `${emoji} ${advisory.title}\n\n${advisory.body}\n\n— RescueLink AI`

  const res = await fetch(`https://graph.facebook.com/v19.0/${FB_PAGE_ID}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: post,
      access_token: FB_PAGE_ACCESS_TOKEN,
    }),
  })

  const result = await res.json()

  // Save FB post ID back to advisory
  await supabase
    .from('public_advisories')
    .update({ fb_post_id: result.id, published_at: new Date().toISOString() })
    .eq('id', advisoryId)

  return new Response(JSON.stringify({ fbPostId: result.id }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

```bash
supabase functions deploy post-advisory
```

---

## Step 3: Trigger from Dashboard

LGU officers approve and publish advisories from the React dashboard:

```ts
// src/services/advisories.service.ts
import { supabase } from './supabase'

export const publishAdvisory = async (advisoryId: string) => {
  const { data, error } = await supabase.functions.invoke('post-advisory', {
    body: { advisoryId },
  })
  if (error) throw error
  return data
}

export const createAdvisory = async (advisory: {
  ticketId: string
  title: string
  body: string
  type: string
}) => {
  const { error } = await supabase.from('public_advisories').insert({
    ticket_id: advisory.ticketId,
    title: advisory.title,
    body: advisory.body,
    type: advisory.type,
  })
  if (error) throw error
}
```

---

## Step 4: Auto-Publish on High Confidence

When multiple reports confirm the same event, auto-publish without LGU approval.

Inside `ai-extract`, after inserting the ticket, check for duplicates:

```ts
const { count } = await supabase
  .from('rescue_tickets')
  .select('*', { count: 'exact', head: true })
  .eq('disaster_type', extraction.disaster_type)
  .eq('location_text', extraction.location)
  .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // last 30 min

if (count >= 3) {
  // Auto-create and publish advisory
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

  await fetch(`${SUPABASE_URL}/functions/v1/post-advisory`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ advisoryId: advisory.id }),
  })
}
```

---

## Advisory Types

| Type | Emoji | Example |
|------|-------|---------|
| `flood_warning` | 🚨 | Flood Warning in Barangay Mabolo |
| `road_closure` | ⚠️ | Road Closure along Osmena Blvd |
| `evacuation_open` | 🏫 | Evacuation Center Open at Cebu City Sports Center |
| `donation_drive` | ❤️ | Donation Drive for Typhoon Victims |
| `relief_update` | 📦 | Relief Distribution at Barangay Hall |
