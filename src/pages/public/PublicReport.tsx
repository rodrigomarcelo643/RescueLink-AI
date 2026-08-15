import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import {
  AlertTriangle, MapPin, Users, FileText, Phone, User,
  LocateFixed, CloudUpload, CheckCircle, Camera, Sparkles, Video,
  Mic, Play, Pause, Square, Volume2, Music
} from 'lucide-react'
import mainLogo from '@/assets/logo/main_logo.jpg'
import { Input } from '@/components/ui/input'
import { DISASTER_TYPES } from '@/constants/disasterTypes'
import { checkRateLimit, uploadProofImages, submitPublicReport } from '@/services/incidents.service'
import type { AIValidationResult } from '@/services/aiValidation.service'

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

async function fetchAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    if (res.ok) {
      const data = await res.json()
      const addr = data.address
      if (addr) {
        const road = addr.road || addr.street || addr.suburb || ''
        const village = addr.village || addr.neighbourhood || addr.quarter || addr.suburb || addr.city_district || ''
        const city = addr.city || addr.town || addr.municipality || 'Cebu City'
        const parts = [road, village, city].filter(Boolean)
        if (parts.length > 0) {
          return parts.join(', ')
        }
      }
      if (data.display_name) {
        return data.display_name.split(',').slice(0, 3).join(',')
      }
    }
  } catch (e) {
    console.warn('Reverse geocoding error:', e)
  }
  return `Cebu City (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`
}

interface ImageEntry {
  file: File
  preview: string
  progress: number
  uploaded: boolean
}

export default function PublicReport() {
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

  // Voice SOS State & AI Extraction Status
  const [recordingVoice, setRecordingVoice] = useState(false)
  const [voiceSeconds, setVoiceSeconds] = useState(0)
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [aiVoiceExtracted, setAiVoiceExtracted] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)
  const recognitionRef = useRef<any>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  const [loading, setLoading] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [ticketId, setTicketId] = useState('')
  const [aiResult, setAiResult] = useState<AIValidationResult | null>(null)

  const cameraRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => {
    entries.forEach((e) => { if (e.preview) URL.revokeObjectURL(e.preview) })
    if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl)
  }, [entries, voiceAudioUrl])

  // Speech Recognition & AI NLU Auto-Extractor
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-PH'

      rec.onresult = (event: any) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        if (transcript.trim()) {
          processTranscriptWithAI(transcript)
        }
      }

      rec.onerror = (e: any) => console.warn('Speech recognition error:', e)
      recognitionRef.current = rec
    }
  }, [])

  // Process Voice/Audio Transcript with AI and Auto-Fill Fields
  const processTranscriptWithAI = (speechText: string) => {
    const lower = speechText.toLowerCase()

    // 1. Description Auto-Fill
    setDescription((prev) => (prev ? `${prev} ${speechText}` : speechText))

    // 2. Disaster Category Auto-Fill
    let detectedCategory = ''
    if (lower.includes('flood') || lower.includes('baha') || lower.includes('tubig') || lower.includes('overflow') || lower.includes('river')) {
      detectedCategory = 'flood'
      setDisasterType('flood')
    } else if (lower.includes('fire') || lower.includes('sunog') || lower.includes('smoke') || lower.includes('flame')) {
      detectedCategory = 'fire'
      setDisasterType('fire')
    } else if (lower.includes('typhoon') || lower.includes('bagyo') || lower.includes('wind') || lower.includes('storm')) {
      detectedCategory = 'typhoon'
      setDisasterType('typhoon')
    } else if (lower.includes('earthquake') || lower.includes('lindol') || lower.includes('aftershock')) {
      detectedCategory = 'earthquake'
      setDisasterType('earthquake')
    } else if (lower.includes('landslide') || lower.includes('mudslide') || lower.includes('guba')) {
      detectedCategory = 'landslide'
      setDisasterType('landslide')
    }

    // 3. People Affected Count Auto-Fill
    const numMatch = lower.match(/(\d+)\s*(people|persons|trapped|stranded|residents|family|members|individuals|victims)/i) ||
                     lower.match(/(group of|about|around)\s*(\d+)/i)
    let countFound = ''
    if (numMatch) {
      countFound = numMatch[1] && !isNaN(parseInt(numMatch[1])) ? numMatch[1] : numMatch[2]
      if (countFound && !isNaN(parseInt(countFound))) {
        setPeopleAffected(countFound)
      }
    }

    // 4. Location Hints Auto-Fill
    const locMatch = lower.match(/(in|near|at|around)\s+(barangay\s+[\w\s]+|brgy\s+[\w\s]+|street\s+[\w\s]+|[\w\s]+city|[\w\s]+town)/i)
    let locFound = ''
    if (locMatch && locMatch[0]) {
      locFound = locMatch[0].replace(/^(in|near|at|around)\s+/i, '').trim()
      if (locFound.length > 3) {
        setLocationText((currentLoc) => (!currentLoc || currentLoc.includes('GPS') ? locFound : currentLoc))
      }
    }

    setAiVoiceExtracted(
      `AI extracted speech audio: Auto-filled Description, Category (${detectedCategory || 'Detected'}), Headcount (${countFound || 'Auto'}), & Location!`
    )
  }

  // Start Voice SOS Recording
  const startVoiceSOS = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setVoiceAudioUrl(url)

        const file = new File([blob], `voice_sos_${Date.now()}.webm`, { type: 'audio/webm' })
        addFiles([file])
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.start()
      setRecordingVoice(true)
      setVoiceSeconds(0)

      timerRef.current = setInterval(() => {
        setVoiceSeconds((s) => s + 1)
      }, 1000)

      if (recognitionRef.current) {
        try { recognitionRef.current.start() } catch (e) { console.warn(e) }
      }
    } catch (err) {
      console.error('Error starting audio recording:', err)
      setError('Microphone access denied. Please allow microphone permissions to record Voice SOS.')
    }
  }

  // Stop Voice SOS Recording
  const stopVoiceSOS = () => {
    if (mediaRecorderRef.current && recordingVoice) {
      mediaRecorderRef.current.stop()
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (e) { console.warn(e) }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setRecordingVoice(false)
  }

  const toggleAudioPlay = () => {
    if (!voiceAudioUrl) return
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(voiceAudioUrl)
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false)
    }
    if (isPlayingAudio) {
      audioPlayerRef.current.pause()
      setIsPlayingAudio(false)
    } else {
      audioPlayerRef.current.play()
      setIsPlayingAudio(true)
    }
  }

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        const address = await fetchAddressFromCoords(lat, lng)
        setLocationText((prev) => (!prev.trim() || prev.includes('GPS') ? address : prev))
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  useEffect(() => {
    handleLocate()
  }, [handleLocate])

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files)
    const remaining = MAX_IMAGES - entries.length
    if (remaining <= 0) return
    const next: ImageEntry[] = arr.slice(0, remaining).map((file) => {
      // If audio file is attached, update proof notification cleanly without cluttering description box
      if (file.type.startsWith('audio/')) {
        setAiVoiceExtracted(`🎙️ Audio file attached (${file.name}). Proof ready for AI emergency validation.`)
      }
      return {
        file,
        preview: file.type.startsWith('audio/') ? '' : URL.createObjectURL(file),
        progress: -1,
        uploaded: false,
      }
    })
    setEntries((p) => [...p, ...next])
  }

  const removeEntry = (i: number) => {
    if (entries[i].preview) URL.revokeObjectURL(entries[i].preview)
    setEntries((p) => p.filter((_, idx) => idx !== i))
  }

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!disasterType) { setError('Please select a disaster type.'); return }
    if (disasterType === 'other' && !otherType.trim()) { setError('Please specify the disaster type.'); return }
    if (!locationText.trim()) { setError('Please enter a location.'); return }
    if (!description.trim()) { setError('Please describe the incident or record a Voice SOS.'); return }

    setLoading(true)
    setError('')

    try {
      const ip = await getClientIp()
      const allowed = await checkRateLimit(ip)
      if (!allowed) {
        setError('Rate limit reached (maximum 3 incident reports per 3 minutes per IP address). Please wait 3 minutes before submitting another report, or contact emergency hotline 911.')
        setLoading(false)
        return
      }

      let mediaUrls: string[] = []
      if (entries.length > 0) {
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

      const response = await submitPublicReport({
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

      setTicketId(response.id)
      setAiResult(response.aiValidation)
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
      setUploadingIndex(null)
    }
  }

  const resetForm = () => {
    entries.forEach((e) => { if (e.preview) URL.revokeObjectURL(e.preview) })
    if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl)
    setSubmitted(false); setEntries([]); setDescription(''); setLocationText('')
    setCoords(null); setDisasterType(''); setOtherType(''); setPeopleAffected(''); setReporterName(''); setReporterContact('')
    setVoiceAudioUrl(null); setVoiceSeconds(0); setRecordingVoice(false); setAiVoiceExtracted(null)
    setAiResult(null)
    setError('')
  }

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
              Your incident has been logged. LGU responders have been notified via real-time alerts.
            </p>
          </div>

          {aiResult && (
            <div className="w-full text-left p-3.5 rounded-lg border border-red-100 bg-red-50/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase text-red-800 tracking-wide">
                  <Sparkles size={13} className="text-red-600" /> AI Validated & Scored
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${
                  aiResult.severity === 'critical' ? 'bg-red-600 text-white' :
                  aiResult.severity === 'high' ? 'bg-orange-500 text-white' :
                  aiResult.severity === 'medium' ? 'bg-amber-500 text-black' : 'bg-emerald-600 text-white'
                }`}>
                  {aiResult.severity} severity
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-800 leading-relaxed">
                {aiResult.ai_summary}
              </p>
              <p className="text-[10px] text-gray-400">
                Priority Score: <strong className="text-gray-900">{aiResult.priority_score} / 100</strong>
              </p>
            </div>
          )}

          <div className="w-full rounded-lg bg-gray-50 p-4" style={{ border: '1px solid #f3f4f6' }}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Ticket Reference ID</span>
            <p className="mt-1 font-mono text-xs font-bold text-red-700 select-all">{ticketId}</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="rounded-lg p-2 bg-white border border-gray-200 shadow-2xs">
              <QRCodeSVG value={trackUrl} size={110} />
            </div>
            <p className="text-[11px] text-gray-400">Scan QR code or click link below to track live status</p>
          </div>

          <div className="flex flex-col w-full gap-2 pt-2">
            <Link
              to={`/track/${ticketId}`}
              className="w-full py-2.5 text-center text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-md transition-all shadow-xs"
            >
              Track Live Incident Status →
            </Link>
            <button
              onClick={resetForm}
              className="w-full py-2 text-center text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Submit Another Emergency Report
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-16">
      
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-3 sm:px-6 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={mainLogo} alt="RescueLink AI" className="h-8 w-8 rounded-lg object-cover shadow-xs" />
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-gray-900">RescueLink AI</span>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/public"
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">Public Dashboard</span>
              <span className="sm:hidden font-black">Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="mx-auto max-w-2xl px-4 pt-8">
        
        {/* Banner */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-red-900 via-red-950 to-gray-900 p-6 text-white shadow-md border border-red-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-600 text-white rounded">
                CITIZEN SOS INTAKE
              </span>
              <span className="text-xs text-red-200 font-semibold">24/7 AI Processing</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Report an Emergency Incident</h1>
            <p className="mt-1 text-xs text-gray-200 font-medium max-w-xl">
              Record a Voice SOS, attach photo or video proof, or describe the situation for instant emergency station dispatch.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDisasterType('flood')
              setLocationText('Barangay Labangon, Cebu City (Near SWU Aznar Road)')
              setPeopleAffected('5')
              setDescription('Flash flood waters rising up to 1.5 meters along M.H. Aznar Road near SWU campus. 5 residents trapped on upper porch. Power transformer sparking. Medical assistance and rescue boat requested immediately.')
              setReporterName('Ramon Santos')
              setReporterContact('09175558912')
              setAiVoiceExtracted('✨ Real Disaster Scenario Auto-Filled: Flash Flood with 5 Trapped Residents & Transformer Risk!')
            }}
            className="px-3.5 py-2 text-xs font-black text-yellow-300 bg-red-800/80 hover:bg-red-700 border border-yellow-400/40 rounded-xl transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} className="text-yellow-400 animate-pulse" /> Fill Real Scenario Demo ⚡
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* AI Voice Auto-Fill Success Toast */}
        {aiVoiceExtracted && (
          <div className="mb-4 p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs font-bold text-purple-900 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-600 shrink-0 animate-pulse" />
              <span>{aiVoiceExtracted}</span>
            </div>
            <button type="button" onClick={() => setAiVoiceExtracted(null)} className="text-purple-400 hover:text-purple-700 font-black">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          
          {/* Voice SOS Emergency Assistant Card */}
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg text-white ${recordingVoice ? 'bg-red-600 animate-pulse' : 'bg-red-700'}`}>
                  <Mic size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-red-700 tracking-wider flex items-center gap-1">
                    VOICE SOS ASSISTANT
                  </span>
                  <h3 className="text-xs font-extrabold text-gray-900">
                    {recordingVoice ? 'Recording Voice SOS…' : 'Record Emergency Voice SOS'}
                  </h3>
                </div>
              </div>

              {recordingVoice && (
                <span className="px-2.5 py-1 text-xs font-mono font-black bg-red-600 text-white rounded-full animate-pulse">
                  00:0{voiceSeconds}s
                </span>
              )}
            </div>

            <p className="text-xs text-gray-600 font-medium">
              Tap below and speak your situation. Your voice recording will be attached as proof to notify emergency responders.
            </p>

            <div className="flex items-center gap-2 pt-1">
              {!recordingVoice ? (
                <button
                  type="button"
                  onClick={startVoiceSOS}
                  className="flex-1 py-2.5 px-4 text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mic size={16} /> Record Voice SOS
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopVoiceSOS}
                  className="flex-1 py-2.5 px-4 text-xs font-extrabold text-white bg-gray-900 hover:bg-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Square size={14} className="fill-white" /> Stop Voice SOS Recording
                </button>
              )}
            </div>

            {voiceAudioUrl && !recordingVoice && (
              <div className="mt-1 p-2.5 bg-white border border-red-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAudioPlay}
                    className="size-7 rounded-full bg-red-700 text-white flex items-center justify-center cursor-pointer"
                  >
                    {isPlayingAudio ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
                  </button>
                  <span className="font-extrabold text-gray-900">Voice SOS Recording Attached</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                  <Volume2 size={12} /> Audio Proof Attached
                </span>
              </div>
            )}
          </div>

          {/* Disaster Category */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Disaster Category <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DISASTER_TYPES.map((t) => (
                <motion.button
                  key={t}
                  type="button"
                  onClick={() => setDisasterType(t)}
                  whileTap={{ scale: 0.96 }}
                  className="flex flex-col items-center gap-1 py-2.5 text-xs font-extrabold capitalize transition-all"
                  style={{
                    borderRadius: 8,
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

            {disasterType === 'other' && (
              <Input
                placeholder="e.g. volcanic eruption, chemical hazard…"
                value={otherType}
                onChange={(e) => setOtherType(e.target.value)}
                autoFocus
                error={!otherType.trim() && !!error}
              />
            )}
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <Input
              label="Location *"
              placeholder="e.g. Brgy. Labangon, Cebu City"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              icon={<MapPin size={14} />}
              required
            />
            <button
              type="button"
              onClick={handleLocate}
              disabled={locating}
              className="flex items-center gap-1.5 self-start px-2.5 py-1 text-[11px] font-bold transition-all border rounded-lg cursor-pointer"
              style={{
                borderColor: coords ? '#15803d' : '#e5e7eb',
                background: coords ? '#f0fdf4' : '#fff',
                color: coords ? '#15803d' : '#6b7280',
              }}
            >
              <LocateFixed size={12} className={locating ? 'animate-spin' : ''} />
              {locating ? 'Acquiring GPS location…' : coords
                ? `✓ GPS Attached: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                : 'Attach Current GPS Location'}
            </button>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                Emergency Situation Description <span className="text-red-600">*</span>
              </label>
              {description && (
                <button
                  type="button"
                  onClick={() => setDescription('')}
                  className="text-[10px] text-gray-400 font-bold hover:text-red-600"
                >
                  Clear Text
                </button>
              )}
            </div>
            <textarea
              rows={4}
              placeholder="Describe what happened, how many people are affected, and any immediate dangers (or use Voice SOS above)…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full resize-none bg-white px-3.5 py-3 text-sm font-medium text-gray-800 outline-none placeholder:text-gray-300 transition-all border border-gray-200 rounded-xl focus:border-red-600"
            />
          </div>

          {/* People affected */}
          <Input
            label="People Affected (approximate headcount)"
            type="number"
            min="1"
            placeholder="e.g. 8"
            value={peopleAffected}
            onChange={(e) => setPeopleAffected(e.target.value)}
            icon={<Users size={14} />}
          />

          {/* Media Upload (Photos, Videos, & Audio Files) */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Proof Attachments <span className="font-normal normal-case text-gray-400">(photos, videos, voice & audio files)</span>
            </label>

            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => addFiles(e.target.files!)} />
            <input ref={videoRef} type="file" accept="video/*" capture="environment" className="hidden"
              onChange={(e) => addFiles(e.target.files!)} />
            <input ref={audioRef} type="file" accept="audio/*" className="hidden"
              onChange={(e) => addFiles(e.target.files!)} />

            {entries.length < MAX_IMAGES && (
              <div
                ref={dropRef}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`flex flex-col items-center gap-3 py-6 cursor-pointer select-none border-2 border-dashed rounded-xl transition-all ${dragging ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50/50 hover:bg-red-50/30'}`}
                onClick={() => cameraRef.current?.click()}
              >
                <CloudUpload size={32} className="text-gray-400" />
                <div className="text-center">
                  <p className="text-xs font-extrabold text-gray-700">Tap to upload proof media or audio file</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Photos, videos, or voice recordings (AI Auto-Fills Form)</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-800 bg-white border border-gray-200 rounded-lg shadow-2xs cursor-pointer"
                  >
                    <Camera size={13} className="text-blue-600" /> Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => videoRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-800 bg-white border border-gray-200 rounded-lg shadow-2xs cursor-pointer"
                  >
                    <Video size={13} className="text-red-600" /> Video
                  </button>
                  <button
                    type="button"
                    onClick={() => audioRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-800 bg-white border border-gray-200 rounded-lg shadow-2xs cursor-pointer"
                  >
                    <Music size={13} className="text-purple-600" /> Audio SOS File
                  </button>
                </div>
              </div>
            )}

            {entries.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {entries.map((entry, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-900 aspect-square flex items-center justify-center text-white">
                    {uploadingIndex === i && (
                      <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center text-[9px] font-bold text-amber-300">
                        Uploading…
                      </div>
                    )}
                    {entry.preview ? (
                      <img src={entry.preview} alt="Proof" className="size-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-center p-1">
                        <Mic size={18} className="text-red-400" />
                        <span className="text-[9px] font-bold text-gray-200 truncate w-16">Audio SOS</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeEntry(i)}
                      className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reporter Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <Input
              label="Your Name (Optional)"
              placeholder="e.g. Juan Cruz"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              icon={<User size={14} />}
            />
            <Input
              label="Contact Hotline / Mobile (Optional)"
              placeholder="e.g. 09171234567"
              value={reporterContact}
              onChange={(e) => setReporterContact(e.target.value)}
              icon={<Phone size={14} />}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 text-sm font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>AI Validating & Dispatching SOS…</span>
              </>
            ) : (
              <>
                <FileText size={16} /> Submit Emergency SOS Report 🚨
              </>
            )}
          </button>
        </form>
      </main>

    </div>
  )
}
