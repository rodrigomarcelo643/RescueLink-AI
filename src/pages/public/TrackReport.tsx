import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import {
  MapPin, Users, Clock, AlertTriangle, CheckCircle,
  Loader2, ChevronLeft, Image as ImageIcon, X,
  Radio, Phone, Navigation, Sparkles, Zap, CheckCircle2, Play, Building2
} from 'lucide-react'
import { supabase } from '@/services/supabase'
import type { Incident } from '@/types/incident'
import LiveTrackingMap from '@/components/incidents/LiveTrackingMap'
import { isVideoUrl } from '@/components/incidents/ProofCarousel'
import { getResponseAgencies } from '@/services/responseAgencies.service'
import type { ResponseAgency } from '@/types/responseAgency'
import mainLogo from '@/assets/logo/main_logo.jpg'

const ease = [0.22, 1, 0.36, 1] as const

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#b91c1c', high: '#d97706', medium: '#2563eb', low: '#15803d',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#d97706', responding: '#2563eb', rescued: '#15803d', closed: '#6b7280',
}
const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={13} />,
  responding: <Loader2 size={13} className="animate-spin" />,
  rescued: <CheckCircle size={13} />,
  closed: <CheckCircle size={13} />,
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest"
      style={{ borderRadius: 4, background: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  )
}

export default function TrackReport() {
  const { id } = useParams<{ id: string }>()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [unitArrived, setUnitArrived] = useState(false)

  // Live ETA & Distance states
  const [_calcDistance, setCalcDistance] = useState<number | null>(null)
  const [calcEta, setCalcEta] = useState<number | null>(null)

  const trackUrl = `${window.location.origin}/track/${id}`

  // Fetch initial ticket data & subscribe to realtime status changes
  const fetchTicketData = useCallback(() => {
    if (!id) { setNotFound(true); setLoading(false); return }

    supabase
      .from('rescue_tickets')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setIncident(data as Incident)
          setNotFound(false)
        } else {
          // Check local cached incidents as fallback for demo/mock IDs
          const localCached: Incident[] = JSON.parse(localStorage.getItem('cached_incidents') || '[]')
          const foundLocal = localCached.find((item) => item.id === id)
          if (foundLocal) {
            setIncident(foundLocal)
            setNotFound(false)
          } else if (id.startsWith('mock-') || id.startsWith('web-') || id.startsWith('demo-')) {
            setIncident((prev) => prev || {
              id,
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
              ],
              raw_message: 'Kailangan po namin ng saklolo, lagpas tao na po ang baha dito sa Sto. Domingo!',
              fb_sender_id: null,
              reporter_name: 'Maria Santos',
              reporter_contact: '09171234567',
              ip_address: '127.0.0.1',
              created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
              updated_at: new Date().toISOString(),
            })
          } else {
            setNotFound(true)
          }
        }
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    fetchTicketData()

    // Realtime channel for rescue_tickets table changes
    const channelName = `ticket_track_${id}_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_tickets' },
        (payload) => {
          const newRec = payload.new as Incident | undefined
          if (newRec && newRec.id === id) {
            setIncident(newRec)
          } else {
            fetchTicketData()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, fetchTicketData])

  // Keyboard nav for lightbox
  useEffect(() => {
    if (lightbox === null || !incident?.media_urls?.length) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setLightbox((p) => Math.min((p ?? 0) + 1, incident.media_urls.length - 1))
      if (e.key === 'ArrowLeft') setLightbox((p) => Math.max((p ?? 0) - 1, 0))
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, incident])
  // Fetch agency station details for map starting point
  const [assignedAgencyObj, setAssignedAgencyObj] = useState<ResponseAgency | null>(null)

  useEffect(() => {
    if (!incident) return
    const fetchAgencyInfo = async () => {
      const list = await getResponseAgencies()
      // Only set assigned agency if the ticket has an explicit assigned agency or active responding status
      if (incident.assigned_agency_id || incident.assigned_agency_name) {
        const found = list.find(
          (a) =>
            (incident.assigned_agency_id && (a.id === incident.assigned_agency_id || a.username === incident.assigned_agency_id)) ||
            (incident.assigned_agency_name && (a.name?.toLowerCase().includes(incident.assigned_agency_name.toLowerCase()) || incident.assigned_agency_name.toLowerCase().includes(a.name?.toLowerCase() || '')))
        )
        if (found) {
          setAssignedAgencyObj(found)
          return
        }
      }
      // If pending and unassigned, do not force a fallback agency!
      setAssignedAgencyObj(null)
    }
    fetchAgencyInfo()
  }, [incident?.id, incident?.assigned_agency_id, incident?.assigned_agency_name, incident?.status])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 size={28} className="animate-spin text-red-700" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <AlertTriangle size={40} className="text-red-600" strokeWidth={1.5} />
        <h2 className="text-lg font-extrabold text-gray-900">Report Not Found</h2>
        <p className="text-sm text-gray-400">The ticket ID is invalid or has been removed.</p>
        <Link to="/report" className="text-sm font-semibold text-red-700 underline underline-offset-4">
          Submit a new report
        </Link>
      </div>
    )
  }

  const inc = incident!
  const photos = inc.media_urls ?? []

  const incLat = inc.latitude ?? 14.5772
  const incLng = inc.longitude ?? 123.8854

  // Responder station origin coordinates (derived directly from assigned station GPS)
  const assignedAgency = assignedAgencyObj?.name || inc.assigned_agency_name || null

  const responderInfo = (assignedAgencyObj && assignedAgencyObj.latitude != null && assignedAgencyObj.longitude != null)
    ? {
        lat: assignedAgencyObj.latitude,
        lng: assignedAgencyObj.longitude,
        unitName: assignedAgencyObj.name,
        contact: assignedAgencyObj.contacts?.[0]?.value || 'Emergency Hotlines 911',
      }
    : {
        lat: inc.latitude ?? 10.3157,
        lng: inc.longitude ?? 123.8854,
        unitName: assignedAgency || 'Assigned Response Unit',
        contact: 'Emergency Hotlines 911',
      }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-gray-100 bg-white/95 px-3.5 sm:px-6 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2 shrink-0">
          <img src={mainLogo} alt="RescueLink AI" className="h-7 w-7 rounded-md object-cover" />
          <span className="text-sm font-extrabold tracking-tight text-gray-900">RescueLink AI</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/public"
            className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <ChevronLeft size={13} />
            <span className="hidden sm:inline">Public Dashboard</span>
            <span className="sm:hidden font-black">Dashboard</span>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-3.5 sm:px-5 py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          className="flex flex-col gap-5"
        >

          {/* 🚨 LIVE RESCUE INCOMING / ONGOING STATUS BANNER */}
          <AnimatePresence mode="wait">
            {inc.status === 'responding' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                className={`overflow-hidden rounded-xl p-5 text-white shadow-2xl border relative ${
                  unitArrived
                    ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-950 border-emerald-500/50'
                    : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-red-950 border-blue-500/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex size-10 items-center justify-center rounded-full ring-4 shrink-0 ${
                      unitArrived
                        ? 'bg-emerald-600/40 text-emerald-300 ring-emerald-500/30'
                        : 'bg-blue-600/40 text-blue-300 ring-blue-500/20 animate-pulse'
                    }`}>
                      {unitArrived ? <CheckCircle2 size={22} /> : <Radio size={20} />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded ${
                          unitArrived ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white animate-pulse'
                        }`}>
                          {unitArrived ? 'ONGOING RESCUE OPERATION' : 'LIVE ROAD ROUTE TRACKING'}
                        </span>
                        <span className="text-[11px] font-mono text-blue-200 font-bold">
                          {responderInfo.unitName}
                        </span>
                      </div>
                      <h2 className="mt-1 text-lg font-black text-white tracking-tight">
                        {unitArrived
                          ? '🚨 RESCUE UNIT ARRIVED AT SCENE — OPERATION ONGOING!'
                          : '🚨 RESCUE INCOMING TO YOUR LOCATION!'}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Road Navigation Telemetry */}
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-blue-200 bg-black/40 p-2.5 rounded-lg border border-white/10">
                  <span className="flex items-center gap-2 text-emerald-400">
                    <Navigation size={14} className={unitArrived ? '' : 'animate-spin'} />
                    {unitArrived
                      ? 'Unit at Scene: Active Emergency Evacuation & Assistance'
                      : 'Live Road Polyline Route Active on Map Below'}
                  </span>
                  <span className="text-white font-extrabold font-mono">
                    {unitArrived ? 'STATUS: AT SCENE' : calcEta ? `ETA: ~${calcEta} min` : 'ETA: ~3 min'}
                  </span>
                </div>

                {/* Responder Unit Contact for Citizens */}
                <div className="mt-3.5 flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-300 uppercase font-bold">Assigned Unit Hotline:</span>
                    <span className="font-extrabold text-emerald-300 flex items-center gap-1">
                      <Phone size={12} /> {responderInfo.contact}
                    </span>
                  </div>

                  <a
                    href={`tel:${responderInfo.contact}`}
                    className="px-3 py-1 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                  >
                    Call Hotline
                  </a>
                </div>
              </motion.div>
            )}

            {inc.status === 'pending' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl bg-amber-50 p-4 border border-amber-200 text-amber-900 flex items-center gap-3 shadow-xs"
              >
                <Clock size={24} className="text-amber-600 shrink-0 animate-spin" />
                <div>
                  <h3 className="text-sm font-extrabold">
                    {assignedAgency
                      ? `⏳ AI Recommended Station (${assignedAgency}) — Pending Station Review`
                      : '⏳ Report Logged — AI Matching Nearest Emergency Station'}
                  </h3>
                  <p className="text-xs text-amber-800 mt-0.5 font-medium">
                    {assignedAgency
                      ? `AI identified ${assignedAgency} as the nearest specialized station. Alert sent to station officer — awaiting station officer to accept dispatch.`
                      : 'AI has validated your report and notified local emergency command units. Waiting for a station officer to accept and deploy responders.'}
                  </p>
                </div>
              </motion.div>
            )}

            {inc.status === 'responding' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl bg-blue-50 p-4 border border-blue-200 text-blue-900 flex items-center gap-3 shadow-xs"
              >
                <Zap size={24} className="text-blue-600 shrink-0 animate-pulse" />
                <div>
                  <h3 className="text-sm font-extrabold text-blue-950">
                    🟢 Station Officer Accepted — Responders En Route ({assignedAgency || 'Response Unit'})
                  </h3>
                  <p className="text-xs text-blue-800 mt-0.5 font-medium">
                    Station officer accepted dispatch. Responder team is actively navigating to your location.
                  </p>
                </div>
              </motion.div>
            )}

            {inc.status === 'rescued' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl bg-emerald-50 p-4.5 border border-emerald-300 text-emerald-950 flex items-center gap-3 shadow-sm"
              >
                <CheckCircle size={28} className="text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-sm font-black text-emerald-950">✅ Rescue Operation Successfully Completed & Resolved</h3>
                  <p className="text-xs text-emerald-800 mt-0.5 font-medium">
                    Response agency personnel have safely reached the location, completed the operation, and marked the incident resolved.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 🗺️ LIVE ROAD ROUTE TRACKING MAP */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Navigation size={13} className="text-blue-600" />
                Real-Time Road Route Navigation Map
              </span>
              {inc.status === 'responding' && (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Road Tracking Active
                </span>
              )}
            </div>

            <LiveTrackingMap
              incidentLat={incLat}
              incidentLng={incLng}
              disasterType={inc.disaster_type}
              locationText={inc.location_text}
              severity={inc.severity}
              status={inc.status}
              responder={inc.status === 'responding' ? responderInfo : null}
              onCalculated={(d, e) => {
                setCalcDistance(d)
                setCalcEta(e)
              }}
              onUnitArrived={() => setUnitArrived(true)}
            />
          </div>

          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-3 pt-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Incident Report</p>
              <h1 className="mt-0.5 text-xl font-extrabold capitalize tracking-tight text-gray-900">
                {inc.disaster_type} Incident
              </h1>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge label={inc.severity} color={SEVERITY_COLOR[inc.severity] ?? '#6b7280'} />
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest"
                style={{
                  borderRadius: 4,
                  background: `${STATUS_COLOR[inc.status] ?? '#6b7280'}18`,
                  color: STATUS_COLOR[inc.status] ?? '#6b7280',
                  border: `1px solid ${STATUS_COLOR[inc.status] ?? '#6b7280'}40`,
                }}
              >
                {STATUS_ICON[inc.status]}
                {inc.status}
              </span>
            </div>
          </div>

          {/* Details card */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8 }} className="overflow-hidden bg-white shadow-xs">
            <Row label="Ticket ID">
              <span className="break-all font-mono text-xs font-extrabold text-gray-900 bg-gray-100 px-2.5 py-1 rounded border border-gray-200 inline-block max-w-full">
                {inc.id}
              </span>
            </Row>
            <Row label="Location">
              <span className="flex items-start gap-1.5 text-sm text-gray-800 font-semibold break-words">
                <MapPin size={14} className="shrink-0 text-red-600 mt-0.5" />
                <span>{inc.location_text}</span>
              </span>
            </Row>
            {(inc.latitude && inc.longitude) && (
              <Row label="GPS Coordinates">
                <a
                  href={`https://maps.google.com/?q=${inc.latitude},${inc.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-blue-600 underline underline-offset-2"
                >
                  {inc.latitude.toFixed(5)}, {inc.longitude.toFixed(5)}
                </a>
              </Row>
            )}
            {inc.people_affected && (
              <Row label="People Affected">
                <span className="flex items-center gap-1.5 text-sm text-gray-700 font-semibold">
                  <Users size={13} className="text-gray-400" />
                  {inc.people_affected.toLocaleString()} individuals
                </span>
              </Row>
            )}
            <Row label="Reported">
              <span className="text-sm text-gray-700">
                {new Date(inc.created_at).toLocaleString('en-PH', {
                  dateStyle: 'medium', timeStyle: 'short',
                })}
              </span>
            </Row>
            <Row label="Channel">
              <span className="text-sm capitalize text-gray-700">{inc.channel}</span>
            </Row>
            <Row label="Assigned Unit">
              <span className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded border ${
                assignedAgency ? 'text-blue-800 bg-blue-50 border-blue-200' : 'text-amber-800 bg-amber-50 border-amber-200'
              }`}>
                <Building2 size={13} className={assignedAgency ? 'text-blue-600 shrink-0' : 'text-amber-600 shrink-0'} />
                {assignedAgency ? assignedAgency : 'Awaiting Station Acceptance (None)'}
              </span>
            </Row>
            {inc.reporter_name && (
              <Row label="Reported By">
                <span className="text-sm text-gray-700">{inc.reporter_name}</span>
              </Row>
            )}
          </div>

          {/* Description */}
          {inc.raw_message && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px' }} className="bg-white">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">Description</p>
              <p className="text-sm leading-relaxed text-gray-700">{inc.raw_message}</p>
            </div>
          )}

          {/* AI Summary */}
          {inc.ai_summary && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '14px 16px' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={13} className="text-red-600" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-red-600">AI Validation & Summary</p>
              </div>
              <p className="text-sm leading-relaxed text-red-900 font-medium">{inc.ai_summary}</p>
            </div>
          )}

          {/* Photos */}
          {/* Photos & Videos */}
          {photos.length > 0 && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px' }} className="bg-white">
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                <ImageIcon size={12} /> Proof Media ({photos.length})
              </p>
              <div className="grid grid-cols-4 gap-2">
                {photos.map((url, i) => {
                  const isVid = isVideoUrl(url)
                  return (
                    <motion.button
                      key={url}
                      type="button"
                      onClick={() => setLightbox(i)}
                      whileTap={{ scale: 0.96 }}
                      className="overflow-hidden relative bg-black"
                      style={{ borderRadius: 6, border: '1px solid #e5e7eb', aspectRatio: '1' }}
                    >
                      {isVid ? (
                        <div className="relative size-full flex items-center justify-center">
                          <video src={url} className="size-full object-cover" muted playsInline />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play size={14} className="text-white fill-white" />
                          </div>
                        </div>
                      ) : (
                        <img src={url} alt="" className="size-full object-cover" />
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )}

          {/* QR Code */}
          <div
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px 16px' }}
            className="flex flex-col items-center gap-3 bg-white"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Share / Track This Report</p>
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
              <QRCodeSVG value={trackUrl} size={140} fgColor="#111827" bgColor="#ffffff" level="M" />
            </div>
            <p className="max-w-xs break-all text-center text-[11px] text-gray-400">{trackUrl}</p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/report"
              className="flex-1 py-2.5 text-center text-sm font-semibold text-gray-500 transition-colors hover:text-red-700"
              style={{ border: '1px solid #e5e7eb', borderRadius: 6 }}
            >
              Report Another
            </Link>
            <Link
              to="/public"
              className="flex-1 py-2.5 text-center text-sm font-semibold text-white"
              style={{ background: '#b91c1c', borderRadius: 6 }}
            >
              Public Dashboard
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.88)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            {isVideoUrl(photos[lightbox]) ? (
              <motion.video
                key={lightbox}
                src={photos[lightbox]}
                controls
                autoPlay
                className="max-h-[85vh] max-w-[90vw] rounded-lg bg-black"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <motion.img
                key={lightbox}
                src={photos[lightbox]}
                alt=""
                className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <button
              onClick={() => setLightbox(null)}
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X size={16} />
            </button>
            {lightbox > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((p) => (p ?? 1) - 1) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                ‹
              </button>
            )}
            {lightbox < photos.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((p) => (p ?? 0) + 1) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                ›
              </button>
            )}
            <p className="absolute bottom-4 text-xs text-white/50">{lightbox + 1} / {photos.length}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 border-b border-gray-100 px-4 py-3 last:border-0">
      <span className="w-full sm:w-32 shrink-0 text-[11px] font-bold uppercase tracking-widest text-gray-400 sm:pt-0.5">{label}</span>
      <div className="flex-1 min-w-0 break-words font-medium text-gray-800">{children}</div>
    </div>
  )
}
