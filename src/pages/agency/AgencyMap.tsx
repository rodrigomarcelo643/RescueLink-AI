import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getIncidents } from '@/services/incidents.service'
import { supabase } from '@/services/supabase'
import type { Incident } from '@/types/incident'
import { APIProvider, Map as GoogleMap, AdvancedMarker } from '@vis.gl/react-google-maps'
import IncidentDetailsModal from '@/components/incidents/IncidentDetailsModal'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

const API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || ''

export default function AgencyMap() {
  const { agency } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  const fetchIncidents = () => {
    getIncidents().then((list) => {
      setIncidents(list)
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchIncidents()

    const channelName = `agency_map_${agency?.id || 'all'}_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_tickets' },
        () => { fetchIncidents() }
      )
      .subscribe()

    return () => {
      setTimeout(() => {
        supabase.removeChannel(channel)
      }, 100)
    }
  }, [agency?.id])

  const activeAssignedIncidents = incidents.filter((inc) => {
    if (!agency) return false
    if (inc.status === 'closed') return false

    const targetId = inc.assigned_agency_id || inc.assigned_responder_id
    if (targetId) {
      const idA = String(targetId).toLowerCase().trim()
      const idB = String(agency.id).toLowerCase().trim()
      const userB = String(agency.username || '').toLowerCase().trim()
      if (idA === idB || (userB && idA === userB)) return true
    }

    if (!inc.assigned_agency_name) return false

    const targetName = inc.assigned_agency_name.toLowerCase().trim()
    const currentName = (agency.name || '').toLowerCase().trim()
    const currentUsername = (agency.username || '').toLowerCase().trim()
    const currentCategory = (agency.category || '').toLowerCase().trim()

    if (targetName === currentName || currentName.includes(targetName) || targetName.includes(currentName)) return true
    if (currentUsername && (targetName.includes(currentUsername) || currentUsername.includes(targetName))) return true

    const targetWords = targetName.split(/[\s\-_,]+/).filter(w => w.length >= 3)
    const agencyWords = currentName.split(/[\s\-_,]+/).filter(w => w.length >= 3)
    if (targetWords.some(w => agencyWords.includes(w))) return true

    if (currentCategory && currentCategory !== 'other' && targetName.includes(currentCategory)) return true

    return false
  })

  const defaultCenter = {
    lat: agency?.latitude ?? 10.3157,
    lng: agency?.longitude ?? 123.8854,
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-4">

      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
        <div>
          <h2 className="text-base font-extrabold text-gray-900">Live Incident Operations Map</h2>
          <p className="text-xs text-gray-500">Real-time geographical tracking for {agency?.name || 'Response Agency'}</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="flex items-center gap-1.5 text-red-600">
            <span className="size-2.5 rounded-full bg-red-600 animate-ping" /> Station Location
          </span>
          <span className="flex items-center gap-1.5 text-blue-600">
            <span className="size-2.5 rounded-full bg-blue-600" /> Active Assigned Incidents ({activeAssignedIncidents.length})
          </span>
        </div>
      </div>

      <div className="relative w-full h-[620px] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <APIProvider apiKey={API_KEY}>
          <GoogleMap
            defaultCenter={defaultCenter}
            defaultZoom={13}
            mapId="agency-ops-map"
            style={{ width: '100%', height: '100%' }}
            gestureHandling="greedy"
          >
            {agency?.latitude && agency?.longitude && (
              <AdvancedMarker position={{ lat: agency.latitude, lng: agency.longitude }}>
                <div className="flex flex-col items-center select-none cursor-pointer">
                  <div className="px-2 py-1 bg-red-700 text-white text-[10px] font-black rounded shadow-md border border-white mb-1">
                    {agency.name} 📍
                  </div>
                  <div className="size-8 rounded-full bg-red-600 text-white border-2 border-white ring-4 ring-red-500/30 flex items-center justify-center font-bold text-xs shadow-xl animate-pulse">
                    🏢
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {activeAssignedIncidents.map((inc) => {
              if (!inc.latitude || !inc.longitude) return null
              return (
                <AdvancedMarker key={inc.id} position={{ lat: inc.latitude, lng: inc.longitude }}>
                  <div
                    onClick={() => setSelectedIncident(inc)}
                    className="flex flex-col items-center select-none cursor-pointer group"
                  >
                    <div className="px-2 py-0.5 bg-gray-900/90 text-white text-[9px] font-bold rounded shadow-md border border-white mb-0.5 opacity-90 group-hover:opacity-100">
                      {inc.disaster_type} ({inc.severity})
                    </div>
                    <div
                      className={`size-7 rounded-full text-white border-2 border-white flex items-center justify-center text-xs font-bold shadow-lg transition-transform group-hover:scale-110 ${
                        inc.severity === 'critical' ? 'bg-red-600 animate-bounce' : 'bg-blue-600'
                      }`}
                    >
                      🆘
                    </div>
                  </div>
                </AdvancedMarker>
              )
            })}
          </GoogleMap>
        </APIProvider>
      </div>

      {selectedIncident && (
        <IncidentDetailsModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}

    </div>
  )
}
