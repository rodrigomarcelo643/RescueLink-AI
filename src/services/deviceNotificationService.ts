import { supabase } from '@/services/supabase'
import type { Incident } from '@/types/incident'

const NOTIFIED_INCIDENTS_KEY = 'rescuelink_notified_incidents'
const USER_GPS_KEY = 'rescuelink_user_gps'

function haversineDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function saveUserGPSCoordinates(lat: number, lng: number) {
  try {
    localStorage.setItem(USER_GPS_KEY, JSON.stringify({ lat, lng, time: Date.now() }))
  } catch (e) {
    console.warn('Error saving user GPS:', e)
  }
}

export function getSavedUserGPSCoordinates(): { lat: number; lng: number } {
  try {
    const raw = localStorage.getItem(USER_GPS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.lat && parsed.lng) return { lat: parsed.lat, lng: parsed.lng }
    }
  } catch (e) {
    console.warn('Error reading saved user GPS:', e)
  }
  return { lat: 10.3157, lng: 123.8854 }
}

export async function requestDeviceNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') {
    subscribeDeviceToWebPush()
    return true
  }
  if (Notification.permission === 'denied') {
    // Silently return false if already denied/blocked to prevent Chrome warnings
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      subscribeDeviceToWebPush()
      return true
    }
    return false
  } catch (e) {
    return false
  }
}

export async function subscribeDeviceToWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    const coords = getSavedUserGPSCoordinates()

    if (sub) {
      const subJson = sub.toJSON()
      if (subJson.endpoint) {
        try {
          await supabase.from('push_subscriptions').upsert(
            {
              endpoint: subJson.endpoint,
              p256dh: subJson.keys?.p256dh || '',
              auth: subJson.keys?.auth || '',
              user_lat: coords.lat,
              user_lng: coords.lng,
            },
            { onConflict: 'endpoint' }
          )
        } catch (dbErr) {
          console.warn('Push subscription upsert warning:', dbErr)
        }
        console.log('📡 Saved device Push Endpoint to Supabase for closed-app alerts!')
      }
    }
  } catch (err) {
    console.warn('Web Push Subscription error:', err)
  }
}

export function isNotificationPermissionGranted(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

/**
 * Triggers native Android/Desktop Notification via Window Notification & Service Worker Registration simultaneously
 */
async function dispatchNativeOSNotification(title: string, options: NotificationOptions & { url?: string }): Promise<boolean> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false

  let dispatched = false

  // 1. Direct Window Notification (Instant banner popup on Desktop & Active Chrome Tabs)
  try {
    const n = new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options,
    })
    if (options.url) {
      n.onclick = (e) => {
        e.preventDefault()
        window.focus()
        window.location.href = options.url!
      }
    }
    dispatched = true
  } catch (winErr) {
    console.warn('Window notification dispatch notice:', winErr)
  }

  // 2. Service Worker showNotification (Android Status Bar & PWA background alerts)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [300, 100, 300, 100, 400],
          data: { url: options.url || '/near-incident-live-monitoring' },
          ...options,
        } as any)
        dispatched = true
      }
    } catch (swErr) {
      console.warn('Service Worker showNotification notice:', swErr)
    }
  }

  return dispatched
}

/**
 * Evaluates live incoming incident and sends native device push notification if near user's GPS position
 */
export async function checkAndSendProximityNotification(
  incident: any,
  userCoords: { lat: number; lng: number } | null = null,
  maxRadiusKm: number = 10000,
  forceShow: boolean = false
): Promise<boolean> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  if (!incident) return false

  const incLat = incident.latitude ?? incident.lat ?? 10.3157
  const incLng = incident.longitude ?? incident.lng ?? 123.8854

  const coords = userCoords || getSavedUserGPSCoordinates()
  const distKm = haversineDistKm(coords.lat, coords.lng, incLat, incLng)

  if (distKm > maxRadiusKm && !forceShow) return false

  const incidentId = incident.id || ''
  if (!forceShow && incidentId) {
    const notifiedRaw = localStorage.getItem(NOTIFIED_INCIDENTS_KEY) || '[]'
    const notifiedList: string[] = JSON.parse(notifiedRaw)
    if (notifiedList.includes(incidentId)) return false

    notifiedList.push(incidentId)
    if (notifiedList.length > 50) notifiedList.shift()
    localStorage.setItem(NOTIFIED_INCIDENTS_KEY, JSON.stringify(notifiedList))
  }

  const disasterType = (incident.disaster_type || incident.type || 'Emergency').toUpperCase()
  const severity = (incident.severity || 'high').toUpperCase()
  const locationText = incident.location_text || incident.address || 'Nearby Sector'
  const trackingUrl = incidentId ? `/track/${incidentId}` : '/near-incident-live-monitoring'

  const title = `🚨 EMERGENCY ALERT (${severity}): ${disasterType}`
  const body = `📍 ${distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`} away: ${locationText}. Tap to track live response & evacuation route.`

  return dispatchNativeOSNotification(title, {
    body,
    tag: `incident-${incidentId || Date.now()}`,
    url: trackingUrl,
  })
}

/**
 * Triggers a sample device push notification to verify Android & Desktop background alert capabilities
 */
export async function sendSampleDeviceNotification(): Promise<boolean> {
  const granted = await requestDeviceNotificationPermission()
  if (!granted) return false

  const title = '🚨 TEST PROXIMITY ALERT — RESCUELINK AI'
  const body = '📍 Fire Emergency reported 0.64 km from your GPS location. High-Ground Evacuation Center ready.'

  return dispatchNativeOSNotification(title, {
    body,
    tag: `test-sample-${Date.now()}`,
    url: '/near-incident-live-monitoring',
  })
}

let liveSubscriptionChannel: any = null
let pollingIntervalRef: any = null

/**
 * High-frequency polling backup engine (runs every 6s) for newly inserted emergency reports
 */
function startLivePollingFallback() {
  if (pollingIntervalRef) return

  pollingIntervalRef = setInterval(async () => {
    try {
      if (!isNotificationPermissionGranted()) return

      const ninetySecsAgo = new Date(Date.now() - 90000).toISOString()
      const { data } = await supabase
        .from('rescue_tickets')
        .select('*')
        .eq('status', 'pending')
        .gte('created_at', ninetySecsAgo)
        .order('created_at', { ascending: false })
        .limit(3)

      if (data && data.length > 0) {
        const userCoords = getSavedUserGPSCoordinates()
        for (const inc of data as Incident[]) {
          await checkAndSendProximityNotification(inc, userCoords, 10000)
        }
      }
    } catch (e) {
      console.warn('Polling notification check error:', e)
    }
  }, 6000)
}

/**
 * Initializes persistent Supabase Realtime subscription ONLY for newly submitted (INSERT) reports
 */
export function initLiveProximityPushListener() {
  startLivePollingFallback()

  if (liveSubscriptionChannel) return

  liveSubscriptionChannel = supabase
    .channel('public_live_proximity_alerts_v4')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'rescue_tickets' },
      (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const newIncident = payload.new as Incident
          if (newIncident && newIncident.status === 'pending') {
            checkAndSendProximityNotification(newIncident, null, 10000, true)
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('📡 Live Proximity Alert Push Engine subscribed to NEW incident report inserts!')
      }
    })
}
