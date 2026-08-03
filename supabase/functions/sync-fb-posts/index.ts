import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const FB_PAGE_ACCESS_TOKEN = Deno.env.get('FB_PAGE_ACCESS_TOKEN')!
const FB_PAGE_ID = Deno.env.get('FB_PAGE_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  // Fetch latest 25 posts from the page
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/posts?fields=id,message,story,created_time,permalink_url,from&limit=25&access_token=${FB_PAGE_ACCESS_TOKEN}`
  )
  const data = await res.json()

  if (data.error) {
    return new Response(JSON.stringify({ error: data.error }), { status: 400, headers: CORS })
  }

  const posts = data.data ?? []
  let synced = 0

  for (const post of posts) {
    if (!post.message && !post.story) continue

    const { error } = await supabase
      .from('fb_posts')
      .upsert({
        post_id: post.id,
        fb_sender_id: post.from?.id ?? null,
        page_name: 'RescueLink AI',
        message: post.message ?? post.story ?? '',
        permalink: post.permalink_url ?? `https://www.facebook.com/${post.id}`,
        posted_at: post.created_time,
        ai_flagged: false,
        converted_to_ticket: false,
      }, { onConflict: 'post_id', ignoreDuplicates: true })

    if (!error) synced++
  }

  return new Response(JSON.stringify({ synced, total: posts.length }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
