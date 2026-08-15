import { useState, useEffect, useCallback } from 'react'
import {
  fetchIntegratedGovernmentTelemetry,
  type IntegratedTelemetryFeed,
} from '@/services/phGovernmentTelemetry.service'

export interface SectorLocation {
  id: string
  name: string
  lat: number
  lng: number
  region: string
  zoom?: number
}

export const PHILIPPINES_MONITORING_SECTORS: SectorLocation[] = [
  { id: 'entire_ph', name: '🇵🇭 Entire Philippines Archipelago', lat: 12.8797, lng: 121.774, region: 'Nationwide', zoom: 6 },
  { id: 'current_gps', name: '🎯 My Current Location', lat: 10.3157, lng: 123.8854, region: 'Detected GPS', zoom: 12 },
  { id: 'cebu', name: 'Metro Cebu (Central Visayas)', lat: 10.3157, lng: 123.8854, region: 'Region VII', zoom: 11 },
  { id: 'manila', name: 'Metro Manila & NCR', lat: 14.5995, lng: 120.9842, region: 'NCR', zoom: 11 },
  { id: 'davao', name: 'Metro Davao (Southern Mindanao)', lat: 7.1907, lng: 125.4553, region: 'Region XI', zoom: 11 },
  { id: 'baguio', name: 'Baguio & Cordillera (CAR)', lat: 16.4023, lng: 120.596, region: 'CAR', zoom: 11 },
  { id: 'cagayan', name: 'Tuguegarao (Cagayan Valley)', lat: 17.6132, lng: 121.7269, region: 'Region II', zoom: 11 },
  { id: 'bicol', name: 'Legazpi & Albay (Bicol Region)', lat: 13.1391, lng: 123.7438, region: 'Region V', zoom: 11 },
  { id: 'iloilo', name: 'Iloilo & Bacolod (Western Visayas)', lat: 10.7202, lng: 122.5621, region: 'Region VI', zoom: 11 },
  { id: 'tacloban', name: 'Tacloban & Samar (Eastern Visayas)', lat: 11.2444, lng: 125.0039, region: 'Region VIII', zoom: 11 },
  { id: 'cdo', name: 'Cagayan de Oro (Northern Mindanao)', lat: 8.4542, lng: 124.6319, region: 'Region X', zoom: 11 },
  { id: 'zamboanga', name: 'Zamboanga City Peninsula', lat: 6.9214, lng: 122.079, region: 'Region IX', zoom: 11 },
  { id: 'gensan', name: 'General Santos (SOCCSKSARGEN)', lat: 6.1164, lng: 125.1716, region: 'Region XII', zoom: 11 },
  { id: 'palawan', name: 'Puerto Princesa & Palawan', lat: 9.7392, lng: 118.7353, region: 'MIMAROPA', zoom: 10 },
]

export function useWeatherTelemetry(
  defaultSectorId: string = 'current_gps',
  autoRefreshIntervalMs: number = 30000
) {
  const [selectedSector, setSelectedSector] = useState<SectorLocation>(() => {
    return PHILIPPINES_MONITORING_SECTORS.find((s) => s.id === defaultSectorId) || PHILIPPINES_MONITORING_SECTORS[1]
  })
  const [data, setData] = useState<IntegratedTelemetryFeed | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())

  // Auto-detect GPS location on mount if available
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude
          const userLng = pos.coords.longitude
          setSelectedSector({
            id: 'current_gps',
            name: '🎯 My Current GPS Location',
            lat: userLat,
            lng: userLng,
            region: 'Local Sector',
            zoom: 12,
          })
        },
        (err) => {
          console.log('Geolocation permission not granted, using fallback location:', err)
        },
        { timeout: 5000 }
      )
    }
  }, [])

  const refreshData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const feed = await fetchIntegratedGovernmentTelemetry(
        selectedSector.lat,
        selectedSector.lng,
        selectedSector.name
      )
      setData(feed)
      setLastRefreshedAt(new Date())
    } catch (err) {
      console.error('Failed to load real-time weather telemetry:', err)
      setError('Unable to fetch live telemetry stream.')
    } finally {
      setLoading(false)
    }
  }, [selectedSector])

  useEffect(() => {
    refreshData()
    if (autoRefreshIntervalMs > 0) {
      const timer = setInterval(() => {
        refreshData()
      }, autoRefreshIntervalMs)
      return () => clearInterval(timer)
    }
  }, [refreshData, autoRefreshIntervalMs])

  return {
    telemetry: data,
    loading,
    error,
    selectedSector,
    setSelectedSector,
    availableSectors: PHILIPPINES_MONITORING_SECTORS,
    lastRefreshedAt,
    refresh: refreshData,
  }
}
