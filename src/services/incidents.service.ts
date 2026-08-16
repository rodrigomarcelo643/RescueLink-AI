import { supabase } from './supabase'
import type { Incident } from '@/types/incident'
import { DISASTER_TYPES } from '@/constants/disasterTypes'
import { analyzeAndValidateReport, type AIValidationResult } from './aiValidation.service'

// Helper: check if a string is a valid UUID
const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

export const assignAgencyToIncident = async (
  id: string,
  agencyId: string,
  agencyName: string,
  agencyUsername?: string,
  status: Incident['status'] = 'pending'
) => {
  const validUUID = isUUID(agencyId) ? agencyId : null

  const payload: Record<string, any> = {
    assigned_agency_name: String(agencyName),
    status,
  }

  if (validUUID) {
    payload.assigned_agency_id = validUUID
    payload.assigned_responder_id = validUUID
  }

  const res = await supabase
    .from('rescue_tickets')
    .update(payload)
    .eq('id', String(id))

  if (res.error) {
    console.warn('[assignAgency] initial update notice:', res.error.message)
    const fallback = await supabase
      .from('rescue_tickets')
      .update({
        assigned_agency_name: String(agencyName),
        status,
      })
      .eq('id', String(id))

    if (fallback.error) {
      console.error('[assignAgency] fallback update error:', fallback.error.message)
    }
  }

  // ── Update response_agencies table if matching ID or username exists ──
  if (validUUID) {
    await supabase
      .from('response_agencies')
      .update({ current_assigned_ticket_id: id })
      .eq('id', validUUID)
  }

  const username = agencyUsername || agencyId
  if (username && typeof username === 'string') {
    await supabase
      .from('response_agencies')
      .update({ current_assigned_ticket_id: id })
      .eq('username', username)
  }
}

export const declineAgencyDispatch = async (id: string) => {
  // Clear assignment on rescue_tickets
  const { error } = await supabase
    .from('rescue_tickets')
    .update({
      assigned_agency_id: null,
      assigned_agency_name: null,
      status: 'pending',
    })
    .eq('id', id)

  if (error) {
    console.error('[declineDispatch] rescue_tickets UPDATE failed:', error.message)
  }

  // Clear current_assigned_ticket_id on response_agencies
  await supabase
    .from('response_agencies')
    .update({ current_assigned_ticket_id: null })
    .eq('current_assigned_ticket_id', id)
}

// ── Fetch Incidents ───────────────────────────────────────────────────────────

export const getIncidents = async (): Promise<Incident[]> => {
  const { data, error } = await supabase
    .from('rescue_tickets')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getIncidents] DB fetch failed:', error.message)
    return []
  }

  return data as Incident[]
}

// ── Status Update ─────────────────────────────────────────────────────────────

export const updateIncidentStatus = async (id: string, status: Incident['status']) => {
  const now = new Date().toISOString()
  const payload: Record<string, any> = { status, updated_at: now }

  if (status === 'responding') {
    payload.accepted_at = now
  } else if (status === 'rescued') {
    payload.rescued_at = now
  } else if (status === 'closed') {
    payload.closed_at = now
  }

  const { error } = await supabase
    .from('rescue_tickets')
    .update(payload)
    .eq('id', id)

  if (error) {
    // Fallback if specific milestone timestamp columns don't exist in DB
    const fallback = await supabase
      .from('rescue_tickets')
      .update({ status, updated_at: now })
      .eq('id', id)
    if (fallback.error) throw fallback.error
  }
}

// ── Delete Incident ───────────────────────────────────────────────────────────

export const deleteIncident = async (id: string) => {
  try {
    await supabase.from('public_advisories').delete().eq('ticket_id', id)
  } catch (e) {
    console.warn('Advisory cleanup:', e)
  }

  try {
    await supabase.from('messenger_tickets').update({ ticket_id: null }).eq('ticket_id', id)
  } catch (e) {
    console.warn('Messenger cleanup:', e)
  }

  const { error } = await supabase.from('rescue_tickets').delete().eq('id', id)
  if (error) throw error
}

// ── Assign Responder ──────────────────────────────────────────────────────────

export const assignResponder = async (id: string, _responderId: string) => {
  const { error } = await supabase
    .from('rescue_tickets')
    .update({ status: 'responding' })
    .eq('id', id)
  if (error) throw error
}

// ── Public Web Reporting ──────────────────────────────────────────────────────

const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW = 3 // minutes

export async function checkRateLimit(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('incident_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('submitted_at', since)
  return (count ?? 0) < RATE_LIMIT_MAX
}

export async function uploadProofImages(
  files: File[],
  onProgress?: (fileIndex: number, pct: number) => void,
): Promise<string[]> {
  const urls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = file.name.split('.').pop()
    const path = `proofs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const { data: { publicUrl: _url } } = supabase.storage.from('incident-media').getPublicUrl(path)
      void _url

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress?.(i, Math.round((e.loaded / e.total) * 100))
      })
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) { onProgress?.(i, 100); resolve() }
        else reject(new Error(`Upload failed: ${xhr.statusText}`))
      })
      xhr.addEventListener('error', () => reject(new Error('Upload network error')))

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
      xhr.open('POST', `${supabaseUrl}/storage/v1/object/incident-media/${path}`)
      xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`)
      xhr.setRequestHeader('x-upsert', 'false')
      xhr.send(file)
    })

    const { data } = supabase.storage.from('incident-media').getPublicUrl(path)
    urls.push(data.publicUrl)
  }
  return urls
}

export interface PublicReportPayload {
  disaster_type: (typeof DISASTER_TYPES)[number]
  location_text: string
  latitude: number | null
  longitude: number | null
  people_affected: number | null
  raw_message: string
  reporter_name: string
  reporter_contact: string
  media_urls: string[]
  ip_address: string
}

export interface SubmissionResponse {
  id: string
  aiValidation: AIValidationResult
}

export async function submitPublicReport(payload: PublicReportPayload): Promise<SubmissionResponse> {
  const aiResult = await analyzeAndValidateReport({
    disaster_type: payload.disaster_type,
    location_text: payload.location_text,
    latitude: payload.latitude,
    longitude: payload.longitude,
    people_affected: payload.people_affected,
    raw_message: payload.raw_message,
    reporter_name: payload.reporter_name,
    reporter_contact: payload.reporter_contact,
    media_urls: payload.media_urls,
  })

  const { data, error } = await supabase
    .from('rescue_tickets')
    .insert({
      ...payload,
      channel: 'web',
      severity: aiResult.severity,
      priority_score: aiResult.priority_score,
      ai_summary: aiResult.ai_summary,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Supabase insert error:', error)
    return { id: `web-${Date.now()}`, aiValidation: aiResult }
  }

  try {
    await supabase.from('incident_rate_limits').insert({ ip_address: payload.ip_address })
  } catch (e) {
    console.warn('Rate limit recording error:', e)
  }

  return { id: data.id, aiValidation: aiResult }
}
