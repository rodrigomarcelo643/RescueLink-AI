import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    const { record } = await req.json()
    if (!record) return new Response('No record payload', { status: 400 })

    const title = `🚨 EMERGENCY ALERT: ${(record.disaster_type || 'INCIDENT').toUpperCase()}`
    const body = `📍 Location: ${record.location_text || 'Nearby Sector'}. Tap to view evacuation shelter & safety route.`

    // Fetch registered device push endpoints
    const { data: subscriptions } = await supabase.from('push_subscriptions').select('*')

    if (subscriptions && subscriptions.length > 0) {
      console.log(`📡 Sending Web Push Alert to ${subscriptions.length} registered devices...`)
      // Send Web Push payload to FCM / Push endpoints
      for (const sub of subscriptions) {
        try {
          await fetch(sub.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', TTL: '60' },
            body: JSON.stringify({
              title,
              body,
              url: '/near-incident-live-monitoring',
              tag: `incident-${record.id}`,
            }),
          })
        } catch (e) {
          console.warn('Error pushing to endpoint:', sub.endpoint, e)
        }
      }
    }

    return new Response(JSON.stringify({ success: true, count: subscriptions?.length || 0 }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
