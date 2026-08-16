export interface Incident {
  id: string
  channel: 'messenger' | 'telegram' | 'whatsapp' | 'web' | 'facebook'
  disaster_type: string
  location_text: string
  latitude: number | null
  longitude: number | null
  people_affected: number | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'responding' | 'rescued' | 'closed'
  priority_score: number
  ai_summary: string | null
  media_urls: string[]
  raw_message: string | null
  fb_sender_id: string | null
  reporter_name: string | null
  reporter_contact: string | null
  ip_address: string | null
  assigned_agency_id?: string | null
  assigned_agency_name?: string | null
  assigned_responder_id?: string | null
  accepted_at?: string | null
  rescued_at?: string | null
  closed_at?: string | null
  created_at: string
  updated_at: string
}
