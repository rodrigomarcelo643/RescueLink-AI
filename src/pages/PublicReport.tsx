import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import {
  AlertTriangle, MapPin, Users, FileText, Phone, User,
  LocateFixed, X, CloudUpload, CheckCircle, Camera,
} from 'lucide-react'
import mainLogo from '@/assets/logo/main_logo.jpg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FadeUp, FadeIn } from '@/components/shared/MotionWrappers'
import { DISASTER_TYPES } from '@/constants/disasterTypes'
import { checkRateLimit, uploadProofImages, submitPublicReport } from '@/services/incidents.service'

const ease = [0.22, 1, 0.36, 1] as const
const MAX_IMAGES = 5

const DISASTER_ICONS: Record<string, string> = {
  flood: '🌊', fire: '🔥', earthquake: '🌍', landslide: '⛰️', typhoon: '🌀', other: '⚠️',
}

async function getClientIp(): Promise<string> {
  try {
    const r = await fetch('https://api.ipify.org?format=json')
    const j = await r.json()
    return j.ip as string
  } catch {
    return 'unknown'
  }
}

interface ImageEntry {
  file: File
  preview: string
  progress: number   // 0–100, -1 = done/idle before upload
  uploaded: boolean
}

export default function PublicReport() {
  const navigate = useNavigate()

  const [disasterType, setDisasterType] = useState('')
  const [otherType, setOtherType] = useState('')
  const [locationText, setLocationText] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [peopleAffected, setPeopleAffected] = useState('')
  const [description, setDescription] = useState('')
  const [reporterName, setReporterName] = useState('')
  const [reporterContact, setReporterContact] = useState('')
  const [entries, setEntries] = useState<ImageEntry[]>([])
  const [dragging, setDragging] = useState(false)

  const [loading, setLoading] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [ticketId, setTicketId] = useState('')

  const browseRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Cleanup object URLs on unmount
  useEffect(() => () => entries.forEach((e) => URL.revokeObjectURL(e.preview)), [])

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files)
    const remaining = MAX_IMAGES - entries.length
    if (remaining <= 0) return
    const next: ImageEntry[] = arr.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      progress: -1,
      uploaded: false,
    }))
    setEntries((p) => [...p, ...next])
  }

  const removeEntry = (i: number) => {
    URL.revokeObjectURL(entries[i].preview)
    setEntries((p) => p.filter((_, idx) => idx !== i))
  }

  // Drag handlers
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false) },
      () => setLocating(false),
    )
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!disasterType) { setError('Please select a disaster type.'); return }
    if (disasterType === 'other' && !otherType.trim()) { setError('Please specify the disaster type.'); return }
    if (!locationText.trim()) { setError('Please enter a location.'); return }
    if (!description.trim()) { setError('Please describe the incident.'); return }

    setLoading(true)
    setError('')

    try {
      const ip = await getClientIp()
      const allowed = await checkRateLimit(ip)
      if (!allowed) {
        setError('Too many reports submitted recently. Please wait before trying again.')
        setLoading(false)
        return
      }

      let mediaUrls: string[] = []
      if (entries.length > 0) {
        // Animate progress per file
        mediaUrls = await uploadProofImages(
          entries.map((e) => e.file),
          (fileIndex, pct) => {
            setUploadingIndex(fileIndex)
            setEntries((prev) =>
              prev.map((e, i) => i === fileIndex ? { ...e, progress: pct, uploaded: pct === 100 } : e),
            )
          },
        )
      }

      const id = await submitPublicReport({
        disaster_type: (disasterType === 'other' ? otherType.trim() : disasterType) as typeof DISASTER_TYPES[number],
        location_text: locationText,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        people_affected: peopleAffected ? parseInt(peopleAffected) : null,
        raw_message: description,
        reporter_name: reporterName,
        reporter_contact: reporterContact,
        media_urls: mediaUrls,
        ip_address: ip,
      })

      setTicketId(id)
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
      setUploadingIndex(null)
    }
  }

  const resetForm = () => {
    entries.forEach((e) => URL.revokeObjectURL(e.preview))
    setSubmitted(false); setEntries([]); setDescription(''); setLocationText('')
    setCoords(null); setDisasterType(''); setOtherType(''); setPeopleAffected(''); setReporterName(''); setReporterContact('')
    setError('')
  }

  // ── Success screen ──────────────────────────────────────────
  if (submitted) {
    const trackUrl = `${window.location.origin}/track/${ticketId}`
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 py-12 font-sans">
        <motion.div
          className="flex w-full max-w-md flex-col items-center gap-5 p-8 text-center"
          style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          >
            <CheckCircle size={48} className="text-green-500" strokeWidth={1.5} />
          </motion.div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Report Submitted!</h2>
            <p className="mt-1.5 text-sm text-gray-400">
              Your incident has been logged. LGU responders have been notified.
            </p>
          </div>

          {/* Ticket ID */}
          <div className="w-full" style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 14px' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ticket ID</p>
            <p className="mt-1 break-all font-mono text-xs font-bold text-gray-900">{ticketId}</p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Scan to track your report</p>
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25, ease }}
              style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}
            >
              <QRCodeSVG value={trackUrl} size={148} fgColor="#111827" bgColor="#ffffff" level="M" />
            </motion.div>
            <p className="max-w-xs break-all text-[10px] text-gray-300">{trackUrl}</p>
          </div>

          <div className="flex w-full gap-2">
            <Button variant="outline" size="sm" fullWidth onClick={() => navigate(`/track/${ticketId}`)}>View Details</Button>
            <Button variant="primary" size="sm" fullWidth onClick={resetForm}>Report Another</Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Main form ───────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-white font-sans">

      {/* Left panel — fixed */}
      <motion.div
        className="relative hidden w-[38%] flex-col items-center justify-center gap-8 bg-white p-16 lg:flex"
        style={{ borderRight: '1px solid #f0f0f0', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <motion.img
          src={mainLogo} alt="RescueLink AI"
          className="w-56 object-contain"
          style={{ borderRadius: 12 }}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease }}
        />
        <FadeUp delay={0.25} className="text-center">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">RescueLink AI</h1>
          <p className="mt-1 text-sm font-medium text-gray-400">Emergency Incident Reporting</p>
        </FadeUp>
        <FadeUp delay={0.35} className="w-full max-w-xs space-y-3">
          {[
            { icon: '📡', text: 'Reports go directly to LGU responders' },
            { icon: '📸', text: 'Attach photos as proof of the incident' },
            { icon: '📍', text: 'Share GPS location for faster response' },
            { icon: '🔒', text: 'No account required — report anonymously' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-xs text-gray-500">
              <span className="text-base">{icon}</span>
              {text}
            </div>
          ))}
        </FadeUp>
        <FadeIn delay={0.6} className="absolute bottom-8">
          <p className="text-[11px] text-gray-300">© {new Date().getFullYear()} RescueLink AI · Philippines</p>
        </FadeIn>
      </motion.div>

      {/* Right panel — scrollable */}
      <div className="flex flex-1 items-start justify-center overflow-y-auto px-6 py-12" style={{ height: '100vh' }}>
        <div className="w-full max-w-[520px]">

          {/* Mobile logo */}
          <motion.div
            className="mb-8 flex flex-col items-center gap-2 lg:hidden"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            <img src={mainLogo} alt="RescueLink AI" className="w-20 object-contain" style={{ borderRadius: 8 }} />
          </motion.div>

          <FadeUp delay={0.1} className="mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Report an Incident</h2>
            <p className="mt-1.5 text-sm text-gray-400">Fill in the details below. All reports are reviewed by LGU responders.</p>
          </FadeUp>

          <motion.form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 bg-white p-6"
            style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease }}
          >

            {/* Disaster type */}
            <FadeUp delay={0.22}>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Disaster Type <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DISASTER_TYPES.map((t) => (
                    <motion.button
                      key={t}
                      type="button"
                      onClick={() => setDisasterType(t)}
                      whileTap={{ scale: 0.96 }}
                      className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold capitalize transition-all"
                      style={{
                        borderRadius: 6,
                        border: '1.5px solid',
                        borderColor: disasterType === t ? '#b91c1c' : '#e5e7eb',
                        background: disasterType === t ? '#fef2f2' : '#fafafa',
                        color: disasterType === t ? '#b91c1c' : '#6b7280',
                        boxShadow: disasterType === t ? '0 0 0 3px rgba(185,28,28,0.08)' : 'none',
                      }}
                    >
                      <span className="text-lg">{DISASTER_ICONS[t]}</span>
                      {t}
                    </motion.button>
                  ))}
                </div>

                {/* Other — specify input */}
                <AnimatePresence>
                  {disasterType === 'other' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -4 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -4 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                      <Input
                        placeholder="e.g. volcanic eruption, tsunami, chemical spill…"
                        value={otherType}
                        onChange={(e) => setOtherType(e.target.value)}
                        autoFocus
                        error={!otherType.trim() && !!error}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeUp>

            {/* Location */}
            <FadeUp delay={0.26}>
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Location *"
                  placeholder="e.g. Brgy. San Jose, Leyte"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  icon={<MapPin size={14} />}
                  required
                />
                <motion.button
                  type="button"
                  onClick={handleLocate}
                  disabled={locating}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 self-start px-2.5 py-1 text-[11px] font-semibold transition-all"
                  style={{
                    borderRadius: 5,
                    border: '1px solid',
                    borderColor: coords ? '#15803d' : '#e5e7eb',
                    background: coords ? '#f0fdf4' : '#fff',
                    color: coords ? '#15803d' : '#6b7280',
                  }}
                >
                  <LocateFixed size={11} className={locating ? 'animate-spin' : ''} />
                  {locating ? 'Getting location…' : coords
                    ? `✓ GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                    : 'Attach GPS location'}
                </motion.button>
              </div>
            </FadeUp>

            {/* Description */}
            <FadeUp delay={0.30}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe what happened, how many people are affected, and any immediate dangers…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full resize-none bg-white px-3.5 py-3 text-sm font-medium text-gray-800 outline-none placeholder:text-gray-300 transition-all"
                  style={{ border: '1.5px solid #e5e7eb', borderRadius: 6 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#b91c1c')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                />
              </div>
            </FadeUp>

            {/* People affected */}
            <FadeUp delay={0.33}>
              <Input
                label="People Affected (approx.)"
                type="number"
                min="1"
                placeholder="e.g. 12"
                value={peopleAffected}
                onChange={(e) => setPeopleAffected(e.target.value)}
                icon={<Users size={14} />}
              />
            </FadeUp>

            {/* ── Photo upload zone ── */}
            <FadeUp delay={0.36}>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Proof Photos <span className="font-normal normal-case text-gray-300">(up to {MAX_IMAGES})</span>
                </label>

                {/* Hidden inputs */}
                <input ref={browseRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => addFiles(e.target.files!)} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => addFiles(e.target.files!)} />

                {/* Drop zone */}
                {entries.length < MAX_IMAGES && (
                  <motion.div
                    ref={dropRef}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    animate={{ borderColor: dragging ? '#b91c1c' : '#e5e7eb', background: dragging ? '#fef2f2' : '#fafafa' }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center gap-3 py-7 cursor-pointer select-none"
                    style={{ border: '2px dashed #e5e7eb', borderRadius: 8 }}
                    onClick={() => browseRef.current?.click()}
                  >
                    <motion.div
                      animate={{ y: dragging ? -4 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CloudUpload size={32} className={dragging ? 'text-red-600' : 'text-gray-300'} strokeWidth={1.5} />
                    </motion.div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-600">
                        {dragging ? 'Drop to add photos' : 'Drag & drop photos here'}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">or choose an option below</p>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => browseRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-white"
                        style={{ border: '1px solid #e5e7eb', borderRadius: 5, background: '#fff' }}
                      >
                        <CloudUpload size={12} /> Browse Files
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => cameraRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-white"
                        style={{ border: '1px solid #e5e7eb', borderRadius: 5, background: '#fff' }}
                      >
                        <Camera size={12} /> Take Photo
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Preview grid with progress */}
                <AnimatePresence>
                  {entries.length > 0 && (
                    <motion.div
                      className="grid grid-cols-5 gap-2"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {entries.map((entry, i) => (
                        <motion.div
                          key={entry.preview}
                          className="relative overflow-hidden"
                          style={{ borderRadius: 6, border: '1px solid #e5e7eb', aspectRatio: '1' }}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2 }}
                        >
                          <img src={entry.preview} alt="" className="size-full object-cover" />

                          {/* Upload progress overlay */}
                          <AnimatePresence>
                            {loading && uploadingIndex === i && entry.progress >= 0 && entry.progress < 100 && (
                              <motion.div
                                className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                                style={{ background: 'rgba(0,0,0,0.55)' }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                <CloudUpload size={16} className="text-white" />
                                <span className="text-[10px] font-bold text-white">{entry.progress}%</span>
                                {/* Progress bar */}
                                <div className="w-10 overflow-hidden rounded-full" style={{ height: 3, background: 'rgba(255,255,255,0.3)' }}>
                                  <motion.div
                                    className="h-full rounded-full bg-white"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${entry.progress}%` }}
                                    transition={{ duration: 0.1 }}
                                  />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Uploaded checkmark */}
                          <AnimatePresence>
                            {entry.uploaded && (
                              <motion.div
                                className="absolute bottom-1 right-1 flex size-4 items-center justify-center rounded-full bg-green-500"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                              >
                                <CheckCircle size={10} className="text-white" />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Remove button */}
                          {!loading && (
                            <button
                              type="button"
                              onClick={() => removeEntry(i)}
                              className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-white transition-opacity hover:opacity-80"
                            >
                              <X size={8} />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {entries.length > 0 && entries.length < MAX_IMAGES && (
                  <p className="text-[11px] text-gray-400">{entries.length}/{MAX_IMAGES} photos added</p>
                )}
              </div>
            </FadeUp>

            {/* Reporter info */}
            <FadeUp delay={0.39}>
              <div className="flex flex-col gap-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Your Info <span className="font-normal normal-case text-gray-300">(optional)</span>
                </p>
                <Input placeholder="Full name" value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)} icon={<User size={14} />} />
                <Input placeholder="Phone or email" value={reporterContact}
                  onChange={(e) => setReporterContact(e.target.value)} icon={<Phone size={14} />} />
              </div>
            </FadeUp>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="flex items-start gap-2 px-3 py-2.5"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <AlertTriangle size={13} className="mt-px shrink-0 text-red-600" />
                  <p className="text-[12px] font-semibold text-red-600">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <FadeUp delay={0.42}>
              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                <FileText size={14} />
                {loading
                  ? uploadingIndex !== null
                    ? `Uploading photo ${uploadingIndex + 1} of ${entries.length}…`
                    : 'Submitting…'
                  : 'Submit Report'}
              </Button>
            </FadeUp>

            <FadeUp delay={0.44} className="text-center">
              <Link to="/public"
                className="text-[12px] font-semibold text-gray-400 underline underline-offset-4 transition-colors hover:text-red-700">
                View public dashboard instead
              </Link>
            </FadeUp>

          </motion.form>
        </div>
      </div>
    </div>
  )
}
