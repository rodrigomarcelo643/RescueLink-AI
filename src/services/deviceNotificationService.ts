import type { Incident } from '@/types/incident'

const NOTIFIED_INCIDENTS_KEY = 'rescuelink_notified_incidents'

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
 * Evaluates live incoming incident and sends native device push notification if near user's GPS position
 */
export async function checkAndSendProximityNotification(
  incident: Incident,
  userCoords: { lat: number; lng: number } | null,
  maxRadiusKm: number = 10
): Promise<boolean> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  if (!userCoords || !incident.latitude || !incident.longitude) return false

  const distKm = haversineDistKm(userCoords.lat, userCoords.lng, incident.latitude, incident.longitude)
  if (distKm > maxRadiusKm) return false

  // Avoid spamming duplicate notifications for the same incident ID
  const notifiedRaw = localStorage.getItem(NOTIFIED_INCIDENTS_KEY) || '[]'
  const notifiedList: string[] = JSON.parse(notifiedRaw)
  if (notifiedList.includes(incident.id)) return false

  // Save to notified list
  notifiedList.push(incident.id)
  if (notifiedList.length > 50) notifiedList.shift()
  localStorage.setItem(NOTIFIED_INCIDENTS_KEY, JSON.stringify(notifiedList))

  const title = `🚨 EMERGENCY ALERT (${incident.severity.toUpperCase()}): ${incident.disaster_type.toUpperCase()}`
  const body = `📍 ${distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`} from your location: ${incident.location_text}. Tap to view route & evacuation shelter.`

  // Send native OS notification via Service Worker if available, or fallback to Web Notification
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_PROXIMITY_ALERT',
      title,
      body,
      incidentId: incident.id,
      url: '/happenings',
    })
  } else {
    try {
      new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `incident-${incident.id}`,
      })
    } catch (e) {
      console.warn('Notification construction error:', e)
    }
  }

  return true
}

/**
 * Triggers a sample device push notification to verify phone background alert capabilities
 */
export async function sendSampleDeviceNotification(): Promise<boolean> {
  const granted = await requestDeviceNotificationPermission()
  if (!granted) return false

  const title = '🚨 TEST PROXIMITY ALERT — RESCUELINK AI'
  const body = '📍 Fire Emergency reported 0.64 km from your GPS location. High-Ground Evacuation Center ready.'

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_PROXIMITY_ALERT',
      title,
      body,
      incidentId: 'test-sample-001',
      url: '/happenings',
    })
  } else {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'test-sample-001',
    })
  }

  return true
}
