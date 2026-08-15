import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import mainLogo from '@/assets/logo/main_logo.jpg'
import {
  FileText, Globe, Lock, Navigation, Zap,
  CheckCircle2, Cpu, Radio, Eye, Heart, MessageSquare, Phone, ShieldAlert,
  Menu, X, Building2, Search, MapPin, ShieldCheck, Waves,
  Wind, Flame, Mountain, Activity, ExternalLink, Compass
} from 'lucide-react'

const SIMULATED_EVACUATION_CENTERS = [
  {
    id: 'shelter-1',
    name: 'Labangon Evacuation Center',
    address: 'Barangay Labangon, Cebu City',
    distance: '640m SW',
    capacity: 850,
    occupied: 420,
    status: 'Open 24/7',
    amenities: ['Medical', 'Food', 'Generator', 'Water'],
    lat: 10.3012,
    lng: 123.8864,
  },
  {
    id: 'shelter-2',
    name: 'Rawis Municipal Shelter',
    address: 'Rawis Coastal Road, Legazpi',
    distance: '1.2 km NE',
    capacity: 1200,
    occupied: 890,
    status: 'Open 24/7',
    amenities: ['Medical', 'Kitchen', 'Solar Power'],
    lat: 13.1585,
    lng: 123.7542,
  },
  {
    id: 'shelter-3',
    name: 'Cebu Sports Center Shelter',
    address: 'Osmeña Blvd, Cebu City',
    distance: '2.1 km North',
    capacity: 2500,
    occupied: 1100,
    status: 'Open 24/7',
    amenities: ['Medical Command', 'Charging', 'Sanitation'],
    lat: 10.3125,
    lng: 123.8912,
  },
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeScenario, setActiveScenario] = useState<'typhoon' | 'flood' | 'landslide' | 'fire'>('typhoon')
  const [searchShelter, setSearchShelter] = useState('')
  const [selectedShelter, setSelectedShelter] = useState(SIMULATED_EVACUATION_CENTERS[0])

  const keyFeatures = [
    {
      icon: Cpu,
      title: 'AI Vision & Category',
      desc: 'GPT extracts disaster type & GPS from media proof.',
      color: '#dc2626',
      bg: '#fef2f2',
    },
    {
      icon: Navigation,
      title: 'Haversine Proximity',
      desc: 'Instant GPS distance to nearest response station.',
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      icon: Radio,
      title: 'Multi-Channel Bot',
      desc: 'Intake via Messenger, Telegram, WhatsApp, & Web.',
      color: '#059669',
      bg: '#ecfdf5',
    },
    {
      icon: Eye,
      title: 'Realtime Telemetry',
      desc: 'Live road polyline route tracking for responders.',
      color: '#d97706',
      bg: '#fffbeb',
    },
    {
      icon: Heart,
      title: 'Relief Tracking',
      desc: 'Track monetary & in-kind relief supplies.',
      color: '#db2777',
      bg: '#fdf2f8',
    },
    {
      icon: MessageSquare,
      title: 'Automated SMS Alerts',
      desc: 'Instant Semaphore SMS broadcast to residents.',
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
  ]

  const portals = [
    {
      title: 'Citizen Portal',
      subtitle: 'Public Intake',
      desc: 'Report emergencies with photo proof & live GPS tracking.',
      icon: FileText,
      color: 'from-red-600 to-rose-700',
      link: '/report',
      linkText: 'Report Incident',
    },
    {
      title: 'Live Incident Feed',
      subtitle: 'Predictive Telemetry',
      desc: 'Inspect disaster risk scores, map alerts, & nearest accidents.',
      icon: ShieldAlert,
      color: 'from-purple-600 to-indigo-700',
      link: '/happenings',
      linkText: 'Live Incidents',
    },
    {
      title: 'LGU Command Center',
      subtitle: 'Disaster Ops',
      desc: 'Map clusters, social monitor, & responder dispatch.',
      icon: Building2,
      color: 'from-blue-600 to-indigo-700',
      link: '/login',
      linkText: 'LGU Login',
    },
    {
      title: 'Public Dashboard',
      subtitle: 'Transparency',
      desc: 'Open public reports & community relief status.',
      icon: Globe,
      color: 'from-emerald-600 to-teal-700',
      link: '/public',
      linkText: 'Public View',
    },
  ]

  const hotlines = [
    { name: 'National Emergency', number: '911' },
    { name: 'BFP Fire Central', number: '160' },
    { name: 'ERUF Ambulance', number: '161' },
    { name: 'Red Cross PH', number: '143' },
  ]

  const filteredShelters = SIMULATED_EVACUATION_CENTERS.filter(
    (s) =>
      s.name.toLowerCase().includes(searchShelter.toLowerCase()) ||
      s.address.toLowerCase().includes(searchShelter.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-red-100 selection:text-red-900">
      
      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={mainLogo} alt="RescueLink AI" className="h-8 w-8 rounded-lg object-cover shadow-xs group-hover:scale-105 transition-transform" />
            <span className="text-base font-extrabold tracking-tight text-gray-900">RescueLink AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-gray-600">
            <a href="#predictive-reactive" className="hover:text-red-700 transition-colors">Engine Modes</a>
            <a href="#typhoon-simulator" className="hover:text-red-700 transition-colors">Evacuation Finder</a>
            <a href="#features" className="hover:text-red-700 transition-colors">Capabilities</a>
            <a href="#portals" className="hover:text-red-700 transition-colors">Portals</a>
            <a href="#hotlines" className="hover:text-red-700 transition-colors">Hotlines</a>
          </nav>

          <div className="hidden sm:flex items-center gap-2">
            <Link
              to="/happenings"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-200 rounded-lg transition-all"
            >
              <Radio size={13} className="text-purple-700 animate-pulse" /> Live Incidents
            </Link>
            <Link
              to="/report"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <FileText size={13} /> Report Incident
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-2xs transition-all"
            >
              <Lock size={12} className="text-red-600" /> Sign In
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg md:hidden transition-colors"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-gray-200 bg-white px-4 py-4 md:hidden shadow-lg overflow-hidden flex flex-col gap-3"
            >
              <nav className="flex flex-col gap-2 text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">
                <a href="#predictive-reactive" onClick={() => setMobileMenuOpen(false)}>Predictive & Reactive AI</a>
                <a href="#typhoon-simulator" onClick={() => setMobileMenuOpen(false)}>Evacuation Finder</a>
                <a href="#features" onClick={() => setMobileMenuOpen(false)}>Capabilities</a>
                <a href="#portals" onClick={() => setMobileMenuOpen(false)}>Portals</a>
              </nav>

              <Link
                to="/report"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-extrabold text-white bg-red-700 rounded-md shadow-xs"
              >
                <FileText size={14} /> Report Incident Now
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Split-Screen Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-red-50/30 via-white to-gray-50/40 py-10 sm:py-16 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Side */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-6 flex flex-col gap-4 text-left"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700 w-fit">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-red-600"></span>
                </span>
                <span>RescueLink AI · Philippines Emergency Platform</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-gray-900 leading-tight">
                AI Disaster Intelligence & <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-700 via-purple-700 to-amber-600">
                  Unified Emergency Response Platform.
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-gray-600 font-medium max-w-md">
                AI-driven hazard risk forecasting, multi-channel citizen SOS intake, and real-time station dispatch across all emergency disaster scenarios.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/happenings"
                  className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-purple-900 hover:bg-purple-950 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Radio size={15} className="text-purple-300 animate-pulse" /> Live Incident Feed
                </Link>
                <Link
                  to="/report"
                  className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <FileText size={15} /> Report Emergency
                </Link>
              </div>

              {/* Visual Metrics Chips */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200 max-w-md">
                <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-100 text-center">
                  <p className="text-base sm:text-lg font-black text-purple-900">Predictive</p>
                  <p className="text-[10px] font-bold text-purple-700">Hazard Gauge</p>
                </div>
                <div className="bg-red-50 p-2.5 rounded-xl border border-red-100 text-center">
                  <p className="text-base sm:text-lg font-black text-red-700">&lt;1 ms</p>
                  <p className="text-[10px] font-bold text-red-600">SOS Dispatch</p>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100 text-center">
                  <p className="text-base sm:text-lg font-black text-blue-900">Shelters</p>
                  <p className="text-[10px] font-bold text-blue-700">Nearest Open</p>
                </div>
              </div>
            </motion.div>

            {/* Right Side: Improvised Interactive Live Radar & Dispatch Console */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="lg:col-span-6"
            >
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-slate-950 text-white shadow-2xl flex flex-col">
                
                {/* Header Toolbar */}
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-black tracking-wide text-white uppercase">
                      Live Telemetry Radar & Dispatch Console
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-extrabold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800/60">
                    <Activity size={11} className="inline mr-1 animate-pulse" /> 100% ONLINE
                  </span>
                </div>

                {/* Main Interactive Telemetry Radar Screen */}
                <div className="relative h-72 sm:h-80 w-full bg-slate-950 overflow-hidden flex flex-col justify-between p-4">
                  
                  {/* Subtle Grid Lines & Pulsing Radar Wave */}
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{
                      backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                    }}
                  />

                  {/* Rotating Radar Sweep Spinner & Loader */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-56 sm:size-64 rounded-full border border-dashed border-red-500/30 animate-spin pointer-events-none" style={{ animationDuration: '12s' }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-40 sm:size-44 rounded-full border-2 border-dashed border-purple-500/40 animate-spin pointer-events-none" style={{ animationDuration: '8s', animationDirection: 'reverse' }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-24 sm:size-28 rounded-full border border-emerald-500/30 animate-spin pointer-events-none" style={{ animationDuration: '4s' }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-4 rounded-full bg-red-500 animate-ping pointer-events-none" />

                  {/* Top Floating Card: Citizen SOS Intake */}
                  <div className="relative z-10 flex items-center justify-between gap-3 bg-red-950/90 backdrop-blur-md p-3 rounded-2xl border border-red-700/60 shadow-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-red-600 flex items-center justify-center text-white font-black shrink-0">
                        <Zap size={16} className="animate-bounce" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider text-red-300">
                            Citizen SOS Intake
                          </span>
                          <span className="px-1.5 py-0.2 text-[9px] font-black bg-red-600 text-white rounded">
                            CRITICAL
                          </span>
                        </div>
                        <p className="text-xs font-extrabold text-white">Flash Flood SOS Report</p>
                        <p className="text-[10px] text-gray-300 font-mono">📍 GPS: 10.3157° N, 123.8854° E</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-amber-300 bg-amber-950/80 px-2 py-1 rounded-lg border border-amber-700/60">
                      Score: 94/100
                    </span>
                  </div>

                  {/* Middle Floating Card: Haversine Station Routing */}
                  <div className="relative z-10 self-end flex items-center justify-between gap-3 bg-gradient-to-r from-blue-950/95 via-indigo-950/95 to-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-blue-500/60 shadow-xl max-w-xs transition-all hover:border-blue-400">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0 shadow-md">
                        <Building2 size={18} className="animate-pulse text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider text-blue-300">
                            Haversine Station Dispatch
                          </span>
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                        </div>
                        <p className="text-xs font-extrabold text-white">BFP Central Station #10</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-emerald-400 font-mono font-black">
                          <MapPin size={12} className="text-emerald-400 shrink-0" />
                          <span>0.42 km away • 1.2 min ETA</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Telemetry Status Bar */}
                  <div className="relative z-10 flex items-center justify-between text-[11px] font-extrabold bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 shadow-md">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      <span className="text-gray-200">Nearest Evacuation Shelter:</span>
                    </div>
                    <span className="text-purple-300 font-mono">Labangon Center (430 Open)</span>
                  </div>

                </div>

                {/* Footer Metrics Row */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900 border-t border-slate-800 text-center text-xs">
                  <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-gray-400 font-bold block">Haversine</span>
                    <span className="font-mono font-black text-emerald-400">&lt;1 ms Dispatch</span>
                  </div>
                  <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-gray-400 font-bold block">AI Vision</span>
                    <span className="font-mono font-black text-purple-300">99.4% Accuracy</span>
                  </div>
                  <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-gray-400 font-bold block">SMS Alerts</span>
                    <span className="font-mono font-black text-amber-400">Broadcast Ready</span>
                  </div>
                </div>

              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── PREDICTIVE vs REACTIVE DUAL ENGINE ── */}
      <section id="predictive-reactive" className="py-12 sm:py-16 bg-gray-50/70 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-800 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
              Dual Engine Platform
            </span>
            <h2 className="mt-2 text-2xl font-black text-gray-900 tracking-tight">
              Predictive Telemetry & Reactive Dispatch
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            
            {/* 1. PREDICTIVE ENGINE */}
            <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black">
                    <ShieldAlert size={22} />
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase bg-purple-900 text-white rounded-full">
                    PREDICTIVE MODE
                  </span>
                </div>

                <h3 className="text-base font-black text-gray-900">Pre-Disaster Spatial Risk Telemetry</h3>

                <div className="grid grid-cols-1 gap-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-lg border border-purple-100 font-bold">
                    <CheckCircle2 size={14} className="text-purple-700 shrink-0" />
                    <span>0-100% Risk Index per sector</span>
                  </div>
                  <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-lg border border-purple-100 font-bold">
                    <CheckCircle2 size={14} className="text-purple-700 shrink-0" />
                    <span>Automated public map alerts</span>
                  </div>
                  <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-lg border border-purple-100 font-bold">
                    <CheckCircle2 size={14} className="text-purple-700 shrink-0" />
                    <span>Nearest accident proximity density</span>
                  </div>
                </div>
              </div>

              <Link
                to="/happenings"
                className="w-full py-2 text-center text-xs font-extrabold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-xl transition-all"
              >
                Inspect Community Risk Hub →
              </Link>
            </div>

            {/* 2. REACTIVE ENGINE */}
            <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-xl bg-red-100 text-red-800 flex items-center justify-center font-black">
                    <Zap size={22} />
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase bg-red-700 text-white rounded-full">
                    REACTIVE MODE
                  </span>
                </div>

                <h3 className="text-base font-black text-gray-900">Post-SOS Intake & Haversine Dispatch</h3>

                <div className="grid grid-cols-1 gap-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-100 font-bold">
                    <CheckCircle2 size={14} className="text-red-700 shrink-0" />
                    <span>Messenger, Telegram, WhatsApp & Web intake</span>
                  </div>
                  <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-100 font-bold">
                    <CheckCircle2 size={14} className="text-red-700 shrink-0" />
                    <span>OpenAI GPT photo & severity extraction</span>
                  </div>
                  <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-100 font-bold">
                    <CheckCircle2 size={14} className="text-red-700 shrink-0" />
                    <span>&lt;1 ms nearest station Haversine dispatch</span>
                  </div>
                </div>
              </div>

              <Link
                to="/report"
                className="w-full py-2 text-center text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-all shadow-xs"
              >
                Report Emergency Incident →
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── VISUAL TYPHOON EVACUATION FINDER ── */}
      <section id="typhoon-simulator" className="py-12 sm:py-16 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase text-purple-700 mb-1">
                <Wind size={15} className="text-purple-600 animate-pulse" />
                Interactive Disaster & Evacuation Finder
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Typhoon Evacuation & Shelter Copilot
              </h2>
            </div>

            {/* Scenario Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'typhoon', label: '🌀 Typhoon Signal #3', icon: Wind },
                { id: 'flood', label: '🌊 Flash Flood', icon: Waves },
                { id: 'landslide', label: '⛰️ Landslide', icon: Mountain },
                { id: 'fire', label: '🔥 Fire Emergency', icon: Flame },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveScenario(s.id as typeof activeScenario)}
                  className="px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer"
                  style={{
                    border: '1px solid',
                    borderColor: activeScenario === s.id ? '#7c3aed' : '#e5e7eb',
                    background: activeScenario === s.id ? '#f3e8ff' : '#f9fafb',
                    color: activeScenario === s.id ? '#6b21a8' : '#4b5563',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Evacuation Shelters List */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchShelter}
                    onChange={(e) => setSearchShelter(e.target.value)}
                    placeholder="Search evacuation shelter name..."
                    className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <span className="text-xs font-extrabold text-purple-900 bg-purple-100 px-2.5 py-2 rounded-xl shrink-0">
                  {filteredShelters.length} Shelters Open
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {filteredShelters.map((shelter) => {
                  const isSelected = selectedShelter.id === shelter.id
                  const occPercent = Math.round((shelter.occupied / shelter.capacity) * 100)

                  return (
                    <div
                      key={shelter.id}
                      onClick={() => setSelectedShelter(shelter)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/40 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-black uppercase text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                            {shelter.status}
                          </span>
                          <h4 className="text-xs font-extrabold text-gray-900 mt-0.5">{shelter.name}</h4>
                          <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                            <MapPin size={12} className="text-red-600 shrink-0" />
                            <span>{shelter.address}</span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 text-xs font-black bg-purple-900 text-white rounded">
                            {shelter.distance}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold block mt-0.5">
                            {shelter.occupied} / {shelter.capacity} spots ({occPercent}% full)
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            occPercent >= 80 ? 'bg-red-600' : occPercent >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${occPercent}%` }}
                        />
                      </div>

                      {/* Amenities Pills */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {shelter.amenities.map((a) => (
                          <span key={a} className="text-[9px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                            ✓ {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Column: AI Safety Copilot Card */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="bg-gradient-to-br from-purple-900 via-purple-950 to-gray-900 text-white p-5 rounded-2xl border border-purple-800 shadow-md flex flex-col gap-4">
                
                <div className="flex items-center justify-between border-b border-purple-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Radio size={16} className="text-purple-300 animate-pulse" />
                    <div>
                      <span className="text-[9px] font-black uppercase text-purple-300">AI COPILOT</span>
                      <h3 className="text-xs font-extrabold text-white">Emergency Guidance</h3>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-red-600 text-white rounded-full">
                    SIGNAL #3 ACTIVE
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 text-xs text-purple-100 font-medium">
                  <div className="p-2.5 bg-purple-900/60 border border-purple-700/50 rounded-lg flex items-start gap-2">
                    <Compass size={14} className="text-purple-300 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-white block">Step 1: Check Nearest Shelter</span>
                      <span>Targeting <strong>{selectedShelter.name}</strong> ({selectedShelter.distance}). {selectedShelter.capacity - selectedShelter.occupied} spots available.</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-purple-900/60 border border-purple-700/50 rounded-lg flex items-start gap-2">
                    <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-white block">Step 2: Emergency Go-Bag</span>
                      <span>Pack 72-hr rations, flashlight, birth certificates in waterproof bag.</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1 border-t border-purple-800">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedShelter.lat},${selectedShelter.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 text-center text-xs font-black text-purple-950 bg-white hover:bg-purple-50 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1"
                  >
                    <Navigation size={13} /> Evacuation Route Maps <ExternalLink size={11} />
                  </a>

                  <Link
                    to="/report"
                    className="w-full py-2 text-center text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1"
                  >
                    <FileText size={13} /> Send Instant SOS to LGU
                  </Link>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── KEY CAPABILITIES GRID ── */}
      <section id="features" className="py-10 sm:py-14 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-700 bg-red-50 px-2.5 py-1 rounded border border-red-200">
              Core Capabilities
            </span>
            <h2 className="mt-1.5 text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Powerful, Visual Emergency Platform
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {keyFeatures.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-gray-200 hover:border-red-400 hover:shadow-xs transition-all cursor-default"
                >
                  <div
                    className="size-9 rounded-lg flex items-center justify-center font-bold shrink-0"
                    style={{ background: f.bg, color: f.color }}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-gray-900">{f.title}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </section>

      {/* ── PORTALS ECOSYSTEM GRID ── */}
      <section id="portals" className="py-10 sm:py-14 bg-gray-50/60 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
              Platform Ecosystem
            </span>
            <h2 className="mt-1.5 text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Tailored Portals for Every Role
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {portals.map((p) => {
              const Icon = p.icon
              return (
                <div
                  key={p.title}
                  className="flex flex-col justify-between gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-red-500 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className={`size-8 rounded-lg bg-gradient-to-r ${p.color} text-white flex items-center justify-center`}>
                        <Icon size={16} />
                      </div>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {p.subtitle}
                      </span>
                    </div>
                    <h3 className="text-xs font-extrabold text-gray-900">{p.title}</h3>
                    <p className="text-[11px] text-gray-500 leading-snug">{p.desc}</p>
                  </div>

                  <Link
                    to={p.link}
                    className="w-full py-1.5 text-center text-xs font-extrabold text-white bg-gray-900 hover:bg-red-700 rounded-md transition-colors"
                  >
                    {p.linkText}
                  </Link>
                </div>
              )
            })}
          </div>

        </div>
      </section>

      {/* ── EMERGENCY HOTLINES ── */}
      <section id="hotlines" className="py-10 bg-gray-950 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-1.5 text-red-400 text-xs font-black uppercase">
                <ShieldAlert size={14} /> Emergency Directory
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">National Hotlines 24/7</h2>
            </div>
            <Link
              to="/report"
              className="px-3.5 py-1.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors w-fit"
            >
              Report Online 🚨
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {hotlines.map((h) => (
              <div
                key={h.name}
                className="p-3 bg-gray-900 rounded-lg border border-gray-800 flex flex-col gap-1 hover:border-red-700/60 transition-colors"
              >
                <span className="text-[10px] text-gray-400 font-bold">{h.name}</span>
                <a href={`tel:${h.number}`} className="text-lg font-black text-emerald-400 font-mono hover:underline flex items-center gap-1">
                  <Phone size={13} /> {h.number}
                </a>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-200 bg-white py-6 text-xs text-gray-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <img src={mainLogo} alt="RescueLink AI" className="h-6 w-6 rounded object-cover" />
            <span className="font-extrabold text-gray-900">RescueLink AI</span>
          </div>

          <div className="flex flex-wrap gap-4 font-bold text-gray-600">
            <Link to="/happenings" className="hover:text-purple-700">Community Risk</Link>
            <Link to="/public" className="hover:text-red-700">Public View</Link>
            <Link to="/report" className="hover:text-red-700">Report</Link>
            <Link to="/login" className="hover:text-red-700">Login</Link>
          </div>

          <p className="text-[11px] text-gray-400">© {new Date().getFullYear()} RescueLink AI</p>
        </div>
      </footer>

    </div>
  )
}
