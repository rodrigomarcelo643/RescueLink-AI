import { supabase } from './supabase'
import type { Incident } from '@/types/incident'
import { DISASTER_TYPES } from '@/constants/disasterTypes'

export const getIncidents = async (): Promise<Incident[]> => {
  const { data, error } = await supabase
    .from('rescue_tickets')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const updateIncidentStatus = async (id: string, status: Incident['status']) => {
  const { error } = await supabase
    .from('rescue_tickets')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export const assignResponder = async (id: string, responderId: string) => {
  const { error } = await supabase
    .from('rescue_tickets')
    .update({ assigned_responder_id: responderId, status: 'responding' })
    .eq('id', id)
  if (error) throw error
}

// ── Public web reporting ──────────────────────────────────────

const RATE_LIMIT_MAX = 3      // max submissions
const RATE_LIMIT_WINDOW = 60  // minutes

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

    // Simulate granular progress via XHR so we can report percentage
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const { data: { publicUrl: _url }, } = supabase.storage.from('incident-media').getPublicUrl(path)
      void _url // computed after upload; we just need the path

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress?.(i, Math.round((e.loaded / e.total) * 100))
      })
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) { onProgress?.(i, 100); resolve() }
        else reject(new Error(`Upload failed: ${xhr.statusText}`))
      })
      xhr.addEventListener('error', () => reject(new Error('Upload network error')))

      // Use Supabase storage REST endpoint directly for XHR progress
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

export async function submitPublicReport(payload: PublicReportPayload): Promise<string> {
  const { data, error } = await supabase
    .from('rescue_tickets')
    .insert({
      ...payload,
      channel: 'web',
      severity: 'medium',   // AI will re-score; default to medium
      status: 'pending',
      priority_score: 0,
    })
    .select('id')
    .single()
  if (error) throw error

  // Record rate limit entry
  await supabase.from('incident_rate_limits').insert({ ip_address: payload.ip_address })

  return data.id
}
