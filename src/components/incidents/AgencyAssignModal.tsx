import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Incident } from '@/types/incident'
import type { ResponseAgency } from '@/types/responseAgency'
import { matchNearestAgency, type AgencyMatchResult } from '@/services/agencyMatcher.service'
import { getResponseAgencies, CEBU_RESPONSE_AGENCIES_SEED } from '@/services/responseAgencies.service'
import { getOrganizationSettings, type OrganizationSettings } from '@/services/settings.service'
import { useAuth } from '@/context/AuthContext'
import {
  X, Sparkles, Building2, Phone, MapPin,
  Navigation, Check, AlertCircle
} from 'lucide-react'

interface AgencyAssignModalProps {
  incident: Incident | null
  onClose: () => void
  onAssign: (incidentId: string, agency: ResponseAgency) => void
}

export default function AgencyAssignModal({
  incident,
  onClose,
  onAssign,
}: AgencyAssignModalProps) {
  const { user, profile } = useAuth()
  const [lguOrg, setLguOrg] = useState<OrganizationSettings | null>(null)
  const [aiMatch, setAiMatch] = useState<AgencyMatchResult | null>(null)
  const [agenciesList, setAgenciesList] = useState<ResponseAgency[]>(CEBU_RESPONSE_AGENCIES_SEED)
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('')
  const [loadingAi, setLoadingAi] = useState(true)

  useEffect(() => {
    getOrganizationSettings(user?.id).then((org) => {
      setLguOrg(org)
    })
  }, [user?.id])

  useEffect(() => {
    if (!incident) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    // Load registered agencies dynamically from DB / service
    getResponseAgencies().then((list) => {
      if (list && list.length > 0) setAgenciesList(list)
    })

    setLoadingAi(true)
    matchNearestAgency(incident)
      .then((res) => {
        setAiMatch(res)
        if (res?.agency?.id) {
          setSelectedAgencyId(res.agency.id)
        }
      })
      .catch((err) => {
        console.warn('AI matching skipped:', err)
      })
      .finally(() => {
        setLoadingAi(false)
      })

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [incident, onClose])

  if (!incident) return null

  const lguDisplayName = lguOrg?.lgu_name || (profile?.municipality ? `LGU ${profile.municipality} Command Center` : 'LGU Emergency Command Center')
  const lguAddress = lguOrg?.office_address || profile?.municipality || 'LGU Headquarters'
  const lguHotline = lguOrg?.emergency_hotline || profile?.phone || 'Hotline 911'

  const allAgencies = agenciesList.length > 0 ? agenciesList : CEBU_RESPONSE_AGENCIES_SEED
  const selectedAgency =
    allAgencies.find((a) => a.id === selectedAgencyId) ||
    aiMatch?.agency ||
    allAgencies[0]

  const handleConfirm = async () => {
    if (selectedAgency) {
      const { assignAgencyToIncident } = await import('@/services/incidents.service')
      await assignAgencyToIncident(incident.id, selectedAgency.id, selectedAgency.name, selectedAgency.username || undefined)
      onAssign(incident.id, selectedAgency)
      onClose()
    }
  }

  const isAiSelected = aiMatch && selectedAgencyId === aiMatch.agency.id

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-6 py-4 backdrop-blur-sm">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Navigation size={18} className="text-blue-600" />
                {incident.assigned_agency_name ? 'Change Assigned Response Agency' : 'Assign Response Agency'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {incident.disaster_type} Incident at {incident.location_text}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-5 p-6">

            {/* Requesting LGU Command Center Info Badge */}
            <div className="p-3.5 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 rounded-xl border border-purple-700/60 text-white shadow-sm flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="size-8 rounded-lg bg-purple-700/60 border border-purple-500 flex items-center justify-center text-purple-200 font-extrabold shrink-0 mt-0.5">
                  <Building2 size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block">
                    Requesting LGU Office
                  </span>
                  <h4 className="text-xs font-black text-white mt-0.5">
                    {lguDisplayName}
                  </h4>
                  <p className="text-[11px] text-purple-200 font-medium mt-0.5 flex items-center gap-1">
                    <MapPin size={11} className="text-red-400 shrink-0" />
                    <span>Office Address: {lguAddress}</span>
                  </p>
                  <p className="text-[11px] text-purple-200 font-medium flex items-center gap-1">
                    <Phone size={11} className="text-emerald-400 shrink-0" />
                    <span>Hotline: {lguHotline}</span>
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-purple-600/80 text-white rounded shrink-0">
                Verified LGU
              </span>
            </div>

            {/* 🤖 AI Best Route Suggestion Box (Hidden if agency is already assigned) */}
            {!incident.assigned_agency_name && !incident.assigned_agency_id && (
              loadingAi ? (
                <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center justify-center gap-2 text-xs text-blue-700 font-semibold">
                  <span className="size-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  Calculating AI Best Route & Nearest Agency...
                </div>
              ) : aiMatch ? (
                <div className="rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4.5 text-white shadow-xl border border-blue-500/40 relative">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-black uppercase text-blue-300 tracking-wider">
                      <Sparkles size={13} className="text-blue-400" /> AI Suggested Best Route
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-600 text-white rounded">
                      ~{aiMatch.estimatedTimeMin} min ETA ({aiMatch.distanceKm} km)
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shrink-0">
                      <Building2 size={18} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-extrabold text-white">
                        {aiMatch.agency.name}
                      </h3>
                      <p className="text-xs text-blue-200/80 mt-0.5">
                        {aiMatch.agency.address}
                      </p>
                      <p className="text-[11px] text-blue-300 mt-1 italic font-medium">
                        "{aiMatch.aiReason}"
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                    <span className="text-[11px] text-blue-200 flex items-center gap-1">
                      <Phone size={11} /> {aiMatch.agency.contacts?.[0]?.value || 'Hotline 911'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedAgencyId(aiMatch.agency.id)}
                      className={`px-3 py-1 text-xs font-extrabold rounded transition-all flex items-center gap-1 ${
                        isAiSelected
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-blue-500 hover:bg-blue-400 text-white'
                      }`}
                    >
                      {isAiSelected ? <Check size={12} /> : null}
                      {isAiSelected ? 'AI Recommendation Selected' : 'Accept AI Route'}
                    </button>
                  </div>
                </div>
              ) : null
            )}

            {/* Manual Selection Header */}
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                <span>Select Registered Response Agency</span>
                <span className="text-[10px] text-gray-400 font-normal">
                  {allAgencies.length} registered agencies available
                </span>
              </label>

              {!loadingAi && !aiMatch && (
                <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800 font-medium">
                  <AlertCircle size={15} className="text-amber-600 shrink-0" />
                  <span>No automated AI route suggestion available. Please select a registered agency manually from the list below.</span>
                </div>
              )}

              {/* Agencies List */}
              <div className="mt-2.5 flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {allAgencies.map((agency) => {
                  const isSelected = agency.id === selectedAgencyId
                  const isAiTarget = aiMatch?.agency.id === agency.id

                  return (
                    <div
                      key={agency.id || agency.username || agency.name}
                      onClick={() => setSelectedAgencyId(agency.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-8 items-center justify-center rounded-md font-bold text-xs ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {agency.category === 'fire' ? '🚒' : agency.category === 'medical' ? '🚑' : agency.category === 'police' ? '🚔' : '🌊'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-extrabold text-gray-900">
                              {agency.name}
                            </h4>
                            {isAiTarget && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-indigo-100 text-indigo-700">
                                AI Choice
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate max-w-[280px]">
                            {agency.address}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-semibold text-gray-600">
                          {agency.contacts?.[0]?.value}
                        </span>
                        <div
                          className={`size-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={10} />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Confirm Dispatch Actions */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
              <span className="text-xs text-gray-500">
                Selected: <strong className="text-gray-900 font-extrabold">{selectedAgency?.name}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Building2 size={13} /> {incident.assigned_agency_name ? 'Update Assigned Agency' : 'Assign Response Agency'}
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
