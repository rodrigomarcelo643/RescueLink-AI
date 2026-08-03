export interface FbPost {
  id: string
  post_id: string
  fb_sender_id: string
  page_name: string
  message: string
  permalink: string
  posted_at: string
  created_at: string
  ai_flagged: boolean
  ai_summary: string | null
  severity: 'low' | 'medium' | 'high' | 'critical' | null
  converted_to_ticket: boolean
  ticket_id: string | null
}
