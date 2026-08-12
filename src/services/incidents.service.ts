import { supabase } from './supabase'
import type { Incident } from '@/types/incident'
import { DISASTER_TYPES } from '@/constants/disasterTypes'
import { analyzeAndValidateReport, type AIValidationResult } from './aiValidation.service'

const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'mock-101',
    channel: 'web',
    disaster_type: 'Flood',
    location_text: 'Barangay Sto. Domingo, Cainta, Rizal',
    latitude: 14.5772,
    longitude: 121.1234,
    people_affected: 8,
    severity: 'critical',
    status: 'pending',
    priority_score: 95,
    ai_summary: 'Severe chest-deep flood waters trapped family of 8 on roof of 2-story house.',
    media_urls: [
      'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1569163139599-0f4517e36f31?w=600&auto=format&fit=crop',
    ],
    raw_message: 'Kailangan po namin ng saklolo, lagpas tao na po ang baha dito sa Sto. Domingo!',
    fb_sender_id: null,
    reporter_name: 'Maria Santos',
    reporter_contact: '09171234567',
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 'mock-102',
    channel: 'messenger',
    disaster_type: 'Fire',
    location_text: 'Barangay San Jose, Pasig City',
    latitude: 14.56,
    longitude: 121.08,
    people_affected: 3,
    severity: 'high',
    status: 'responding',
    priority_score: 82,
    ai_summary: 'Residential fire spreading rapidly across wooden houses.',
    media_urls: [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1574786198875-49f5d09fe2d2?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1616863072044-885e33d0c476?w=600&auto=format&fit=crop',
    ],
    raw_message: 'Nasusunog po bahay ng kapitbahay namin sa San Jose Pasig',
    fb_sender_id: '1000123456',
    reporter_name: 'Juan Dela Cruz',
    reporter_contact: '09189876543',
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'mock-103',
    channel: 'telegram',
    disaster_type: 'Landslide',
    location_text: 'Sitio Upper, Antipolo, Rizal',
    latitude: 14.58,
    longitude: 121.18,
    people_affected: 5,
    severity: 'medium',
    status: 'rescued',
    priority_score: 60,
    ai_summary: 'Soil erosion blocked main access road.',
    media_urls: [
      'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop',
    ],
    raw_message: 'May guho po sa kalsada sa Antipolo',
    fb_sender_id: null,
    reporter_name: 'Elena Reyes',
    reporter_contact: '09223334455',
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
  },
]

export const getIncidents = async (): Promise<Incident[]> => {
  try {
    const { data, error } = await supabase
      .from('rescue_tickets')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    if (data && data.length > 0) return data
    return MOCK_INCIDENTS
  } catch (err) {
    console.warn('Using fallback mock incidents:', err)
    return MOCK_INCIDENTS
  }
}

export const updateIncidentStatus = async (id: string, status: Incident['status']) => {
  if (id.startsWith('mock-')) return
  const { error } = await supabase
    .from('rescue_tickets')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export const assignResponder = async (id: string, responderId: string) => {
  if (id.startsWith('mock-')) return
  const { error } = await supabase
    .from('rescue_tickets')
    .update({ assigned_responder_id: responderId, status: 'responding' })
    .eq('id', id)
  if (error) throw error
}

// ── Public web reporting ──────────────────────────────────────

const RATE_LIMIT_MAX = 3      // max submissions
const RATE_LIMIT_WINDOW = 3   // minutes

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
  // 1) Execute AI Report Validation & Severity Extraction via OpenAI / Fallback
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

  // 2) Insert rescue ticket with AI extracted attributes into Supabase
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
    // Return mock ID if local DB fails
    const mockId = `web-${Date.now()}`
    return { id: mockId, aiValidation: aiResult }
  }

  // 3) Record rate limit entry
  try {
    await supabase.from('incident_rate_limits').insert({ ip_address: payload.ip_address })
  } catch (e) {
    console.warn('Rate limit recording error:', e)
  }

  return {
    id: data.id,
    aiValidation: aiResult,
  }
}
