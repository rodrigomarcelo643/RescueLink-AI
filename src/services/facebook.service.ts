import { supabase } from './supabase'
import type { FbPost } from '@/types/fbPost'

export const convertFbPostToTicket = async (post: FbPost) => {
  const { data, error } = await supabase
    .from('rescue_tickets')
    .insert({
      channel: 'facebook',
      raw_message: post.message,
      ai_summary: post.ai_summary,
      severity: post.severity ?? 'medium',
      status: 'pending',
      location_text: 'From Facebook — verify location',
      disaster_type: 'unclassified',
      priority_score: 50,
      media_urls: [],
    })
    .select('id')
    .single()

  if (error) throw error

  await supabase
    .from('fb_posts')
    .update({ converted_to_ticket: true, ticket_id: data.id })
    .eq('id', post.id)

  return data.id
}
