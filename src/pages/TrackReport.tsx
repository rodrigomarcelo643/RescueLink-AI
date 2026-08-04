import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import {
  MapPin, Users, Clock, AlertTriangle, CheckCircle,
  Loader2, ChevronLeft, Image as ImageIcon, X,
} from 'lucide-react'
import { supabase } from '@/services/supabase'
import type { Incident } from '@/types/incident'
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

  const trackUrl = `${window.location.origin}/track/${id}`

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }
    supabase
      .from('rescue_tickets')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else setIncident(data as Incident)
        setLoading(false)
      })
  }, [id])

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

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-5 py-3 backdrop-blur-sm">
        <img src={mainLogo} alt="RescueLink AI" className="h-7 w-7 rounded-md object-cover" />
        <span className="text-sm font-extrabold tracking-tight text-gray-900">RescueLink AI</span>
        <span className="ml-auto">
          <Link
            to="/public"
            className="flex items-center gap-1 text-[12px] font-semibold text-gray-400 transition-colors hover:text-red-700"
          >
            <ChevronLeft size={13} /> Public Dashboard
          </Link>
        </span>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          className="flex flex-col gap-5"
        >
          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-3">
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
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8 }} className="overflow-hidden">
            <Row label="Ticket ID">
              <span className="break-all font-mono text-xs font-bold text-gray-700">{inc.id}</span>
            </Row>
            <Row label="Location">
              <span className="flex items-center gap-1.5 text-sm text-gray-700">
                <MapPin size={13} className="shrink-0 text-red-600" />
                {inc.location_text}
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
                <span className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Users size={13} className="text-gray-400" />
                  {inc.people_affected.toLocaleString()}
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
            {inc.reporter_name && (
              <Row label="Reported By">
                <span className="text-sm text-gray-700">{inc.reporter_name}</span>
              </Row>
            )}
          </div>

          {/* Description */}
          {inc.raw_message && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px' }}>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">Description</p>
              <p className="text-sm leading-relaxed text-gray-700">{inc.raw_message}</p>
            </div>
          )}

          {/* AI Summary */}
          {inc.ai_summary && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '14px 16px' }}>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-red-400">AI Summary</p>
              <p className="text-sm leading-relaxed text-red-800">{inc.ai_summary}</p>
            </div>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px' }}>
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                <ImageIcon size={12} /> Proof Photos ({photos.length})
              </p>
              <div className="grid grid-cols-4 gap-2">
                {photos.map((url, i) => (
                  <motion.button
                    key={url}
                    type="button"
                    onClick={() => setLightbox(i)}
                    whileTap={{ scale: 0.96 }}
                    className="overflow-hidden"
                    style={{ borderRadius: 6, border: '1px solid #e5e7eb', aspectRatio: '1' }}
                  >
                    <img src={url} alt="" className="size-full object-cover" />
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* QR Code */}
          <div
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px 16px' }}
            className="flex flex-col items-center gap-3"
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
    <div className="flex items-start gap-4 border-b border-gray-50 px-4 py-3 last:border-0">
      <span className="w-32 shrink-0 text-[11px] font-bold uppercase tracking-widest text-gray-400 pt-0.5">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}
