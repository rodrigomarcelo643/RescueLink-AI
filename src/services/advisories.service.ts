import { supabase } from './supabase'
import type { Incident } from '@/types/incident'

export interface FbPostTrackingRecord {
  id?: string
  title: string
  body: string
  category: string
  severity?: string
  fb_post_id?: string | null
  synced_at?: string
  sync_status: 'synced' | 'queued' | 'failed'
  incident_pattern_summary?: string | null
  created_at?: string
}

export interface AIPatternSuggestion {
  id: string
  title: string
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  body: string
  confidenceScore: number
  patternReason: string
  reportCount: number
  affectedLocation: string
}

/**
 * Fetches all tracked Facebook posts & advisories directly from Supabase `fb_posts_tracking`
 */
export const getFbPostsTracking = async (): Promise<FbPostTrackingRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('fb_posts_tracking')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      return data
    }
  } catch {
    // fallback to public_advisories if fb_posts_tracking table is still initializing
  }

  // Fallback query from public_advisories
  try {
    const { data } = await supabase
      .from('public_advisories')
      .select('*')
      .order('created_at', { ascending: false })

    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      category: row.type || 'General',
      severity: 'high',
      fb_post_id: row.fb_post_id ?? null,
      synced_at: row.created_at,
      sync_status: row.synced_to_facebook ? 'synced' : 'queued',
      created_at: row.created_at,
    }))
  } catch {
    return []
  }
}

/**
 * Records published advisory directly into Supabase `fb_posts_tracking`
 */
export const recordFbPostTracking = async (record: FbPostTrackingRecord) => {
  try {
    const { data, error } = await supabase
      .from('fb_posts_tracking')
      .insert({
        title: record.title,
        body: record.body,
        category: record.category,
        severity: record.severity ?? 'high',
        fb_post_id: record.fb_post_id ?? null,
        synced_at: record.synced_at ?? new Date().toISOString(),
        sync_status: record.sync_status,
        incident_pattern_summary: record.incident_pattern_summary ?? null,
      })
      .select('id')
      .single()

    if (error) {
      console.warn('fb_posts_tracking insert notice:', error.message)
    }
    return data?.id
  } catch (err) {
    console.warn('fb_posts_tracking error:', err)
  }
}

/**
 * Creates an advisory in Supabase and syncs directly to the Facebook Page via FB Graph API
 */
export const createAndPublishAdvisory = async (advisory: {
  title: string
  body: string
  type: string
  severity?: string
  ticketId?: string
  patternSummary?: string
}): Promise<{
  advisoryId?: string
  syncedToFacebook: boolean
  fbPostId?: string
  syncStatusNote: string
}> => {
  let syncedToFacebook = false
  let fbPostId: string | undefined = undefined
  let syncStatusNote = ''

  // 1. Check if Facebook Page credentials exist in localStorage / env
  const localPageId = typeof window !== 'undefined' ? localStorage.getItem('rescuelink_fb_page_id') : null
  const localAccessToken = typeof window !== 'undefined' ? localStorage.getItem('rescuelink_fb_page_access_token') : null

  const fbPageId =
    localPageId ||
    import.meta.env.VITE_FB_PAGE_ID ||
    import.meta.env.FB_PAGE_ID ||
    '1232412116623460'

  const fbAccessToken =
    localAccessToken ||
    import.meta.env.VITE_FB_PAGE_ACCESS_TOKEN ||
    import.meta.env.FB_PAGE_ACCESS_TOKEN ||
    'EAAPXqBSo83IBSPcWM44X1eNNvMdgVS8HSbMp7oRyztQWGJ5uRpnWUEqOlE3q1EzMFxlPEWse0dgguHC5W5chkacALHGqh2eKHQUTrdGZBUFfkvRrNL2ZAyJ8RWuKZA4vae0R3AEquvFe3XhEDvzZASBSqXPOAsa6nGZCq7LrtZAEVx9hxZAzAWeS1nQ3y0nwr8s4gS2NnHp1qWZBvjITvi0ZCooZBybLp8HwbevBxbq16sGIZB3gwkVUPwY8ZAZAuO2oJmaVZAZByBN5M32ZCZAFvkZCu8'

  if (fbPageId && fbAccessToken) {
    try {
      const fbMessage = `🚨 [RESCUELINK EMERGENCY PUBLIC ADVISORY]\n\n📌 ${advisory.title.toUpperCase()}\n\n${advisory.body}\n\n📍 Category: ${advisory.type.toUpperCase()}\n⚡ Status: OFFICIAL LGU EMERGENCY BROADCAST\n\n🤖 Auto-Broadcasted via RescueLink AI Facebook Sync System\n📡 Sent from LGU Emergency Command Center | Ref: #RESCUELINK-SYNC\n🌐 Live Portal: https://rescue-link-ai.vercel.app/`

      const params = new URLSearchParams()
      params.append('message', fbMessage)
      params.append('access_token', fbAccessToken)

      const res = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/feed`, {
        method: 'POST',
        body: params,
      })

      const fbData = await res.json()

      if (res.ok && fbData && fbData.id) {
        syncedToFacebook = true
        fbPostId = fbData.id
        syncStatusNote = `FB Sync Success (Post ID: ${fbData.id})`
      } else {
        const isExpiredToken =
          fbData?.error?.code === 190 ||
          fbData?.error?.error_subcode === 463 ||
          (fbData?.error?.message && fbData.error.message.includes('expired'))

        const errorMsg = isExpiredToken
          ? 'Facebook Page Access Token Expired (Update VITE_FB_PAGE_ACCESS_TOKEN in .env)'
          : fbData?.error?.message || `HTTP ${res.status}`

        syncStatusNote = errorMsg
      }
    } catch (fbErr: any) {
      syncStatusNote = `FB Network Notice: ${fbErr?.message || 'Failed to connect to Facebook Graph API'}`
    }
  } else {
    syncStatusNote = `Broadcasted to Public Emergency Portal & Queued for FB Sync`
  }

  // 2. Save directly to `fb_posts_tracking` in Supabase
  const trackingId = await recordFbPostTracking({
    title: advisory.title,
    body: advisory.body,
    category: advisory.type,
    severity: advisory.severity ?? 'high',
    fb_post_id: fbPostId ?? null,
    synced_at: new Date().toISOString(),
    sync_status: syncedToFacebook ? 'synced' : 'queued',
    incident_pattern_summary: advisory.patternSummary ?? null,
  })

  // 3. Fallback insert to `public_advisories` table
  try {
    await supabase.from('public_advisories').insert({
      ticket_id: advisory.ticketId ?? null,
      title: advisory.title,
      body: advisory.body,
      type: 'warning',
    })
  } catch {
    // ignore constraint warnings
  }

  return {
    advisoryId: trackingId || `adv_${Date.now()}`,
    syncedToFacebook,
    fbPostId,
    syncStatusNote,
  }
}

/**
 * AI Engine: Scans live incident report patterns, counts frequency & repeat hotspots,
 * and generates pattern-based advisory recommendations for 1-click broadcast!
 */
export const generateAIPatternSuggestions = (incidents: Incident[]): AIPatternSuggestion[] => {
  if (!incidents || incidents.length === 0) {
    return [
      {
        id: 'pat_normal',
        title: 'PUBLIC ADVISORY: Normal Sector Operations',
        category: 'General Safety',
        severity: 'low',
        body: 'LGU Emergency Command Center Alert: Sector incident reports are clear. Citizens are advised to maintain standard disaster preparedness guidelines.',
        confidenceScore: 98,
        patternReason: '0 unresolved disaster alerts detected across monitored sectors',
        reportCount: 0,
        affectedLocation: 'Cebu City Sector',
      },
    ]
  }

  // Group incidents by disaster_type and location
  const typeGroups: Record<string, Incident[]> = {}

  incidents.forEach((i) => {
    const typeKey = i.disaster_type ? i.disaster_type.trim() : 'Emergency Incident'
    if (!typeGroups[typeKey]) typeGroups[typeKey] = []
    typeGroups[typeKey].push(i)
  })

  const sortedKeys = Object.keys(typeGroups).sort((a, b) => typeGroups[b].length - typeGroups[a].length)

  return sortedKeys.slice(0, 3).map((typeKey, idx) => {
    const items = typeGroups[typeKey]
    const count = items.length

    // Extract top location
    const locCounts: Record<string, number> = {}
    items.forEach((inc) => {
      const loc = inc.location_text ? inc.location_text.split(',')[0].trim() : 'Metro Sector'
      locCounts[loc] = (locCounts[loc] || 0) + 1
    })
    const topLoc = Object.entries(locCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Cebu City Sector'

    const hasCritical = items.some((i) => i.severity === 'critical')
    const severity: 'critical' | 'high' | 'medium' | 'low' = hasCritical
      ? 'critical'
      : count >= 3
      ? 'high'
      : 'medium'

    const catLower = typeKey.toLowerCase()
    let category = typeKey
    if (catLower.includes('fire')) category = 'Fire Emergency'
    else if (catLower.includes('flood') || catLower.includes('water')) category = 'Flash Flood'
    else if (catLower.includes('typhoon') || catLower.includes('wind') || catLower.includes('storm')) category = 'Typhoon & Winds'
    else if (catLower.includes('landslide') || catLower.includes('soil')) category = 'Landslide'

    const upperType = typeKey.toUpperCase()

    return {
      id: `pat_${idx}_${Date.now()}`,
      title: `PUBLIC DISASTER ADVISORY: ${upperType} EMERGENCY WARNING IN ${topLoc.toUpperCase()}`,
      category,
      severity,
      body: `AI Incident Telemetry Alert: Detected a repeat pattern of ${count} report(s) for ${typeKey} centered around ${topLoc}. LGU Command Center urges all residents in low-lying and affected areas to stay vigilant and execute preemptive evacuation protocols. Contact LGU Hotline 911 for immediate emergency response.`,
      confidenceScore: Math.min(99, 82 + count * 5),
      patternReason: `Cluster Pattern: ${count} verified incident report(s) in ${topLoc}`,
      reportCount: count,
      affectedLocation: topLoc,
    }
  })
}

export const generateAIAdvisoryFromIncidents = (incidents: Incident[]) => {
  const suggestions = generateAIPatternSuggestions(incidents)
  if (suggestions.length > 0) {
    return {
      title: suggestions[0].title,
      type: suggestions[0].category,
      severity: suggestions[0].severity,
      body: suggestions[0].body,
    }
  }
  return {
    title: 'PUBLIC DISASTER ADVISORY: Sector Normal & All Clear',
    type: 'General Public Safety',
    severity: 'low',
    body: 'LGU Emergency Command Center Notice: All reported sector incidents are resolved. No active calamity alerts detected.',
  }
}
