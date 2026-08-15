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
  // Default to Metro Cebu central coordinates if not located yet
  return { lat: 10.3157, lng: 123.8854 }
}

export async function requestDeviceNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true

  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch (e) {
    console.warn('Error requesting notification permission:', e)
    return false
  }
}

export function isNotificationPermissionGranted(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

/**
 * Triggers native Android/Desktop Notification via Service Worker Registration (Required on Android)
 */
async function dispatchNativeOSNotification(title: string, options: NotificationOptions & { url?: string }): Promise<boolean> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false

  try {
    // 1. Android Chrome & PWA: Requires serviceWorker.ready showNotification
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [300, 100, 300, 100, 400],
          data: { url: options.url || '/happenings' },
          ...options,
        } as any)
        return true
      }
    }

    // 2. Desktop Fallback
    new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options,
    })
    return true
  } catch (err) {
    console.warn('Native notification dispatch error:', err)
    return false
  }
}

/**
 * Evaluates live incoming incident and sends native device push notification if near user's GPS position
 */
export async function checkAndSendProximityNotification(
  incident: Incident,
  userCoords: { lat: number; lng: number } | null = null,
  maxRadiusKm: number = 25
): Promise<boolean> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  if (!incident || !incident.latitude || !incident.longitude) return false

  const coords = userCoords || getSavedUserGPSCoordinates()
  const distKm = haversineDistKm(coords.lat, coords.lng, incident.latitude, incident.longitude)

  if (distKm > maxRadiusKm) return false

  // Avoid duplicate notifications for the same incident ID
  const notifiedRaw = localStorage.getItem(NOTIFIED_INCIDENTS_KEY) || '[]'
  const notifiedList: string[] = JSON.parse(notifiedRaw)
  if (notifiedList.includes(incident.id)) return false

  notifiedList.push(incident.id)
  if (notifiedList.length > 50) notifiedList.shift()
  localStorage.setItem(NOTIFIED_INCIDENTS_KEY, JSON.stringify(notifiedList))

  const title = `🚨 EMERGENCY NEAR YOU: ${incident.disaster_type.toUpperCase()} (${incident.severity.toUpperCase()})`
  const body = `📍 ${distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`} away: ${incident.location_text || 'Nearby Sector'}. Tap to view evacuation shelter & safety map.`

  return dispatchNativeOSNotification(title, {
    body,
    tag: `incident-${incident.id}`,
    url: '/happenings',
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
    tag: 'test-sample-001',
    url: '/happenings',
  })
}

let liveSubscriptionChannel: any = null

/**
 * Initializes persistent Supabase Realtime subscription for live incoming incidents on deployed production apps
 */
export function initLiveProximityPushListener() {
  if (liveSubscriptionChannel) return

  liveSubscriptionChannel = supabase
    .channel('public_live_proximity_alerts')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'rescue_tickets' },
      (payload) => {
        const newIncident = payload.new as Incident
        if (newIncident && (newIncident.status === 'pending' || newIncident.status === 'responding')) {
          checkAndSendProximityNotification(newIncident, null, 30)
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('📡 Live Proximity Alert Push Engine subscribed to Supabase Realtime!')
      }
    })
}
