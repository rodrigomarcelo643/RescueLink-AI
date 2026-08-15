import { supabase } from './supabase'

const START_POS_KEY_PREFIX = 'rescuelink_agency_start_'
const activeWatchers: Record<string, number> = {}

/**
 * Saves the exact starting GPS position of the responding agency unit when a ticket is accepted.
 */
export function recordAgencyStartLocation(incidentId: string, lat: number, lng: number): { lat: number; lng: number } {
  const startPos = { lat, lng }
  try {
    const key = `${START_POS_KEY_PREFIX}${incidentId}`
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(startPos))
    }
  } catch (err) {
    console.warn('Failed to save agency start position to localStorage:', err)
  }
  return startPos
}

/**
 * Retrieves the recorded start position of the agency for a specific incident route.
 */
export function getAgencyStartLocation(
  incidentId: string,
  fallbackLat: number,
  fallbackLng: number
): { lat: number; lng: number } {
  try {
    const key = `${START_POS_KEY_PREFIX}${incidentId}`
    const saved = localStorage.getItem(key)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        return parsed
      }
    }
  } catch (err) {
    console.warn('Error reading agency start position:', err)
  }

  // Record fallback as initial start if none exists yet
  return recordAgencyStartLocation(incidentId, fallbackLat, fallbackLng)
}

/**
 * Starts continuous high-accuracy live GPS tracking on the responding agency's device.
 * Streams real-time position updates to Supabase DB and local state.
 */
export function startLiveAgencyGPSTracking(
  incidentId: string,
  agencyId: string,
  onPositionUpdate?: (lat: number, lng: number) => void
): () => void {
  if (!('geolocation' in navigator)) {
    console.warn('Geolocation API not supported on this device.')
    return () => {}
  }

  // Clear existing watcher for this incident if any
  if (activeWatchers[incidentId]) {
    navigator.geolocation.clearWatch(activeWatchers[incidentId])
    delete activeWatchers[incidentId]
  }

  const watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords
      console.log(`📡 [Live GPSTracker] Unit Location Updated for incident ${incidentId}:`, latitude, longitude)

      if (onPositionUpdate) {
        onPositionUpdate(latitude, longitude)
      }

      // Persist live responder position to Supabase DB
      try {
        await supabase
          .from('rescue_tickets')
          .update({
            assigned_responder_id: String(agencyId),
            responder_lat: latitude,
            responder_lng: longitude,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', String(incidentId))
      } catch (err) {
        console.warn('Live GPS update notice:', err)
      }
    },
    (err) => {
      console.warn('Live GPSTracker error:', err.message)
    },
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 15000,
    }
  )

  activeWatchers[incidentId] = watchId

  return () => {
    if (activeWatchers[incidentId]) {
      navigator.geolocation.clearWatch(activeWatchers[incidentId])
      delete activeWatchers[incidentId]
    }
  }
}
