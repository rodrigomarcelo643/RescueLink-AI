import { supabase } from './supabase'
import type { Incident } from '@/types/incident'

export interface PublicAdvisoryItem {
  id?: string
  ticket_id?: string | null
  title: string
  body: string
  type: string
  severity?: string
  synced_to_facebook?: boolean
  fb_post_id?: string | null
  created_at?: string
}

export const getAdvisories = async (): Promise<PublicAdvisoryItem[]> => {
  const { data, error } = await supabase
    .from('public_advisories')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('public_advisories fetch notice:', error.message)
    return []
  }
  return data ?? []
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
}): Promise<{ advisoryId?: string; syncedToFacebook: boolean; fbPostId?: string }> => {
  let syncedToFacebook = false
  let fbPostId: string | undefined = undefined

  // 1. Check if Facebook Page credentials exist in env / settings
  const fbPageId = import.meta.env.FB_PAGE_ID || import.meta.env.VITE_FB_PAGE_ID
  const fbAccessToken = import.meta.env.FB_PAGE_ACCESS_TOKEN || import.meta.env.VITE_FB_PAGE_ACCESS_TOKEN

  if (fbPageId && fbAccessToken) {
    try {
      const fbMessage = `🚨 [RESCUELINK EMERGENCY ADVISORY]\n\n📌 ${advisory.title.toUpperCase()}\n\n${advisory.body}\n\n📍 Category: ${advisory.type.toUpperCase()}\n⚡ Status: OFFICIAL LGU ADVISORY\n\nStay safe and monitor live alerts: https://rescue-link-ai.vercel.app/`
      
      const res = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fbMessage,
          access_token: fbAccessToken,
        }),
      })

      const fbData = await res.json()
      if (fbData && fbData.id) {
        syncedToFacebook = true
        fbPostId = fbData.id
      }
    } catch (fbErr) {
      console.warn('Facebook Page posting notice:', fbErr)
    }
  }

  // 2. Insert into Supabase public_advisories table
  const { data, error } = await supabase
    .from('public_advisories')
    .insert({
      ticket_id: advisory.ticketId ?? null,
      title: advisory.title,
      body: advisory.body,
      type: advisory.type,
      synced_to_facebook: syncedToFacebook,
      fb_post_id: fbPostId ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.warn('public_advisories insert error:', error.message)
  }

  return {
    advisoryId: data?.id,
    syncedToFacebook,
    fbPostId,
  }
}

/**
 * AI Generator: Scans live incident reports, calculates high-frequency repeat categories & top locations,
 * and auto-fills a structured public disaster announcement.
 */
export const generateAIAdvisoryFromIncidents = (incidents: Incident[]) => {
  const activeUnresolved = incidents.filter((i) => i.status === 'pending' || i.status === 'responding')
  const pool = activeUnresolved.length > 0 ? activeUnresolved : incidents

  if (pool.length === 0) {
    return {
      title: 'PUBLIC DISASTER ADVISORY: Sector Normal & All Clear',
      type: 'General Public Safety',
      severity: 'low',
      body: 'LGU Emergency Command Center Notice: All reported sector incidents are resolved. No active calamity alerts detected. Stay safe and report emergencies via RescueLink AI.',
    }
  }

  // 1. Calculate frequency of disaster categories
  const categoryFreq: Record<string, number> = {}
  const locationFreq: Record<string, number> = {}

  pool.forEach((inc) => {
    const cat = inc.disaster_type ? inc.disaster_type.trim() : 'Emergency Incident'
    categoryFreq[cat] = (categoryFreq[cat] || 0) + 1

    if (inc.location_text) {
      const loc = inc.location_text.split(',')[0].trim()
      if (loc) {
        locationFreq[loc] = (locationFreq[loc] || 0) + 1
      }
    }
  })

  // 2. Find most frequent category & location
  const topCategory = Object.entries(categoryFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Emergency Incident'
  const topCategoryCount = categoryFreq[topCategory] || 1
  const topLocation = Object.entries(locationFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Cebu City Sector'

  const hasCritical = pool.some((i) => i.severity === 'critical')
  const severity = hasCritical ? 'critical' : topCategoryCount >= 3 ? 'high' : 'medium'

  const formattedCat = topCategory.toUpperCase()

  return {
    title: `PUBLIC DISASTER ADVISORY: ${formattedCat} WARNING IN ${topLocation.toUpperCase()}`,
    type: topCategory,
    severity,
    body: `AI Incident Telemetry Warning: High frequency of ${topCategoryCount} emergency report(s) received for ${topCategory} in ${topLocation}. LGU Command Center urges residents in low-lying and exposed sectors to stay alert and execute preemptive safety measures. Emergency response units have been dispatched. Contact LGU Hotline 911 for immediate assistance.`,
  }
}
