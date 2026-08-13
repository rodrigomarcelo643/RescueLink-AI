import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import mainLogo from '@/assets/logo/main_logo.jpg'
import {
  FileText, Globe, Lock, Sparkles, Navigation, Zap, 
  CheckCircle2, Cpu, Radio, Eye, Heart, MessageSquare, Phone, ShieldAlert,
  Menu, X, Building2, 
} from 'lucide-react'

const ease = [0.22, 1, 0.36, 1] as const

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const keyFeatures = [
    {
      icon: Cpu,
      title: 'AI Vision & Category',
      desc: 'OpenAI GPT extracts disaster types, GPS location, and severity from photos and videos.',
      color: '#dc2626',
      bg: '#fef2f2',
    },
    {
      icon: Navigation,
      title: 'Haversine Proximity',
      desc: 'Instant GPS math alerts the single closest fire, police, or medical station.',
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      icon: Radio,
      title: 'Multi-Channel Bot',
      desc: 'Intake emergencies directly via Facebook Messenger, Telegram, and WhatsApp.',
      color: '#059669',
      bg: '#ecfdf5',
    },
    {
      icon: Eye,
      title: 'Realtime Telemetry',
      desc: 'Live road polyline map tracking synced instantaneously for citizens and LGUs.',
      color: '#d97706',
      bg: '#fffbeb',
    },
    {
      icon: Heart,
      title: 'Relief & PayMongo',
      desc: 'Track verified monetary relief and in-kind donation supplies for affected areas.',
      color: '#db2777',
      bg: '#fdf2f8',
    },
    {
      icon: MessageSquare,
      title: 'SMS & Email Alerts',
      desc: 'Automated Semaphore SMS and Resend notifications sent directly to citizens.',
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
  ]

  const portals = [
    {
      title: 'Citizen Portal',
      subtitle: 'Public Intake',
      desc: 'Instant photo & video reporting, auto GPS detection, and live tracking.',
      icon: FileText,
      color: 'from-red-600 to-rose-700',
      link: '/report',
      linkText: 'Report Incident 🚨',
    },
    {
      title: 'LGU Command Center',
      subtitle: 'Disaster Ops',
      desc: 'Map clusters, FB social monitoring, volunteer matching, and station dispatch.',
      icon: Building2,
      color: 'from-blue-600 to-indigo-700',
      link: '/login',
      linkText: 'LGU Login 🔐',
    },
    {
      title: 'Agency Portal',
      subtitle: 'First Responders',
      desc: 'AI Nearest Station alert notifications with 1-click immediate response.',
      icon: Navigation,
      color: 'from-amber-600 to-orange-700',
      link: '/login',
      linkText: 'Agency Login 🚒',
    },
    {
      title: 'Public Dashboard',
      subtitle: 'Transparency',
      desc: 'Geo-filtered open reports, public statistics, and community relief status.',
      icon: Globe,
      color: 'from-emerald-600 to-teal-700',
      link: '/public',
      linkText: 'Public Dashboard 📍',
    },
  ]

  const hotlines = [
    { name: 'National Emergency', number: '911' },
    { name: 'BFP Fire Central', number: '160' },
    { name: 'ERUF Ambulance', number: '161' },
    { name: 'Red Cross PH', number: '143' },
  ]

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-red-100 selection:text-red-900">
      
      {/* ── Restructured Top Navbar ── */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          
          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={mainLogo} alt="RescueLink AI" className="h-8 w-8 rounded-lg object-cover shadow-xs group-hover:scale-105 transition-transform" />
            <span className="text-base font-extrabold tracking-tight text-gray-900">RescueLink AI</span>
          </Link>

          {/* Centered Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-gray-600">
            <a href="#features" className="hover:text-red-700 transition-colors">Features</a>
            <a href="#portals" className="hover:text-red-700 transition-colors">Portals</a>
            <a href="#workflow" className="hover:text-red-700 transition-colors">How It Works</a>
            <a href="#hotlines" className="hover:text-red-700 transition-colors">Hotlines</a>
          </nav>

          {/* Right Action CTAs */}
          <div className="hidden sm:flex items-center gap-2">
            <Link
              to="/public"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Globe size={13} className="text-gray-500" /> Public View
            </Link>
            <Link
              to="/report"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <FileText size={13} /> Report Incident 🚨
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-2xs transition-all"
            >
              <Lock size={12} className="text-red-600" /> Sign In
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg md:hidden transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-gray-200 bg-white px-4 py-4 md:hidden shadow-lg overflow-hidden flex flex-col gap-3"
            >
              <nav className="flex flex-col gap-2.5 text-sm font-bold text-gray-700 pb-3 border-b border-gray-100">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 px-2 rounded hover:bg-gray-50 transition-colors"
                >
                  Features
                </a>
                <a
                  href="#portals"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 px-2 rounded hover:bg-gray-50 transition-colors"
                >
                  Portals Ecosystem
                </a>
                <a
                  href="#workflow"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 px-2 rounded hover:bg-gray-50 transition-colors"
                >
                  How It Works
                </a>
                <a
                  href="#hotlines"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 px-2 rounded hover:bg-gray-50 transition-colors"
                >
                  Emergency Hotlines
                </a>
              </nav>

              <div className="flex flex-col gap-2 pt-1">
                <Link
                  to="/report"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-extrabold text-white bg-red-700 rounded-md shadow-xs"
                >
                  <FileText size={14} /> Report Incident Now 🚨
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/public"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1 py-2 text-xs font-bold text-gray-700 bg-gray-100 rounded-md text-center"
                  >
                    <Globe size={12} /> Public View
                  </Link>
                  
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Split-Screen Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-red-50/40 via-white to-gray-50/50 py-12 sm:py-20 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Side: Big Headline, Subtitle, CTAs & Stats */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease }}
              className="lg:col-span-6 flex flex-col gap-5 text-left"
            >
              {/* Network Status Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-xs font-extrabold text-red-700 w-fit shadow-2xs">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-red-600"></span>
                </span>
                <span>RescueLink AI · Philippines Emergency Response</span>
              </div>

              {/* Headline - fit to screen typography */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">
                AI Emergency Intake & <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-700 via-red-600 to-amber-600">
                  Live Station Telemetry.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed max-w-md">
                Connecting citizens, LGU command centers, and response agencies with instant AI report extraction, Haversine GPS proximity alerts, and real-time road route tracking.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/report"
                  className="flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <FileText size={16} /> Report Emergency Now 🚨
                </Link>
                <Link
                  to="/public"
                  className="flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <Globe size={16} className="text-red-600" /> Public Transparency 📍
                </Link>
        
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-gray-200 max-w-md">
                <div>
                  <p className="text-xl sm:text-2xl font-black text-gray-900">24/7</p>
                  <p className="text-[10px] font-semibold text-gray-400">Live AI Telemetry</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-gray-900">&lt;1 ms</p>
                  <p className="text-[10px] font-semibold text-gray-400">Proximity Dispatch</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-gray-900">100%</p>
                  <p className="text-[10px] font-semibold text-gray-400">Open Public Data</p>
                </div>
              </div>
            </motion.div>

            {/* Right Side: Clean Interactive Emergency Map Visual */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease }}
              className="lg:col-span-6"
            >
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl flex flex-col">
                
                {/* Map Header Bar */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/90 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <img src={mainLogo} alt="RescueLink AI" className="h-7 w-7 rounded-md object-cover" />
                    <span className="text-xs font-extrabold text-gray-900">Live Road Tracking Map — Cebu Sector</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
                  </span>
                </div>

                {/* Simulated Map Visual Frame */}
                <div className="relative h-56 sm:h-64 w-full bg-slate-900 overflow-hidden flex flex-col justify-between p-3.5">
                  {/* Grid Lines Pattern */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />

                  {/* Simulated Polyline Route */}
                  <svg className="absolute inset-0 size-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M 60 180 Q 140 100 240 140 T 360 80"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="4"
                      strokeDasharray="6 6"
                      className="animate-pulse"
                    />
                  </svg>

                  {/* Responder Station Pin (Origin) */}
                  <div className="relative z-10 flex items-center gap-2 bg-blue-900/90 text-white px-3 py-1.5 rounded-lg border border-blue-500/40 shadow-md w-fit">
                    <Building2 size={14} className="text-blue-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-blue-300">Station Origin</p>
                      <p className="text-xs font-extrabold">BFP Labangon Fire Station</p>
                    </div>
                  </div>

                  {/* Incident Destination Pin (Target) */}
                  <div className="relative z-10 self-end flex items-center gap-2 bg-red-950/95 text-white px-3 py-2 rounded-xl border border-red-500/60 shadow-lg w-fit">
                    <span className="size-2 rounded-full bg-red-500 animate-ping" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase text-red-400">Emergency Incident</span>
                        <span className="text-[9px] font-extrabold bg-amber-500 text-black px-1.5 py-0.2 rounded font-mono">
                          ETA ~3 mins
                        </span>
                      </div>
                      <p className="text-xs font-extrabold text-white">Southwestern University PHINMA</p>
                      <p className="text-[10px] text-gray-300 font-mono">📍 10.2994, 123.8891</p>
                    </div>
                  </div>

                  {/* Road Route Telemetry Overlay */}
                  <div className="relative z-10 flex items-center justify-between text-[11px] font-bold text-gray-200 bg-black/80 p-2.5 rounded-lg border border-white/10 backdrop-blur-xs">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Navigation size={12} className="animate-spin" /> Live Polyline Route Active
                    </span>
                    <span className="text-white font-mono font-extrabold">Distance: 0.5 km</span>
                  </div>
                </div>

                {/* Bottom Action Footer inside Map Frame */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 border-t border-gray-200 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-gray-700">
                    <Sparkles size={13} className="text-amber-600" />
                    <span>Station Action:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="px-3 py-1.5 text-[11px] font-black text-white bg-emerald-600 rounded-md shadow-2xs flex items-center gap-1 cursor-default">
                      <Zap size={11} className="fill-yellow-300 text-yellow-300" /> Respond Immediately 🟢
                    </button>
                    <button type="button" className="px-2.5 py-1.5 text-[11px] font-bold text-red-700 bg-red-50 rounded-md border border-red-200 cursor-default">
                      Decline 🔴
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Key Visual Features Grid ── */}
      <section id="features" className="py-12 sm:py-16 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-2xl mx-auto mb-10"
          >
            <span className="text-[11px] font-black uppercase tracking-widest text-red-700 bg-red-50 px-2.5 py-1 rounded border border-red-200">
              Core Capabilities
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Simple, Powerful, and Visually Driven
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {keyFeatures.map((f, idx) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3, delay: idx * 0.05, ease }}
                  className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-red-400 hover:shadow-md transition-shadow cursor-default"
                >
                  <div
                    className="size-10 rounded-lg flex items-center justify-center font-bold shrink-0 shadow-2xs"
                    style={{ background: f.bg, color: f.color }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-gray-900">{f.title}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>

        </div>
      </section>

      {/* ── Visual Portals Grid ── */}
      <section id="portals" className="py-12 sm:py-16 bg-gray-50/60 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-2xl mx-auto mb-10"
          >
            <span className="text-[11px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
              Platform Ecosystem
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Tailored Portals for Every Role
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {portals.map((p, idx) => {
              const Icon = p.icon
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5, scale: 1.015 }}
                  transition={{ duration: 0.35, delay: idx * 0.08, ease }}
                  className="flex flex-col justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:border-red-500 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className={`size-9 rounded-lg bg-gradient-to-r ${p.color} text-white flex items-center justify-center shadow-xs`}>
                        <Icon size={18} />
                      </div>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {p.subtitle}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-gray-900">{p.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
                  </div>

                  <Link
                    to={p.link}
                    className="w-full py-2 text-center text-xs font-extrabold text-white bg-gray-900 hover:bg-red-700 rounded-md transition-colors"
                  >
                    {p.linkText}
                  </Link>
                </motion.div>
              )
            })}
          </div>

        </div>
      </section>

      {/* ── 4-Step Visual Workflow ── */}
      <section id="workflow" className="py-12 sm:py-16 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-2xl mx-auto mb-10"
          >
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
              End-to-End Flow
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              How RescueLink AI Works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Citizen Intake', desc: 'Photos & GPS via Web, FB Messenger, Telegram, or WhatsApp.', icon: FileText },
              { step: '02', title: 'AI Validation', desc: 'GPT extracts disaster type, severity, and photo proof.', icon: Cpu },
              { step: '03', title: 'Nearest Dispatch', desc: 'Haversine distance alerts closest response station.', icon: Navigation },
              { step: '04', title: 'Live Telemetry', desc: 'Live road route map updates until rescue completion.', icon: CheckCircle2 },
            ].map((s, idx) => {
              const Icon = s.icon
              return (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3, delay: idx * 0.1, ease }}
                  className="p-4 bg-gray-50/80 rounded-xl border border-gray-200 flex flex-col gap-2 hover:bg-white hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-red-700 font-mono">{s.step}</span>
                    <Icon size={16} className="text-gray-400" />
                  </div>
                  <h4 className="text-xs font-extrabold text-gray-900">{s.title}</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{s.desc}</p>
                </motion.div>
              )
            })}
          </div>

        </div>
      </section>

      {/* ── Emergency Hotlines ── */}
      <section id="hotlines" className="py-12 bg-gray-950 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-1.5 text-red-400 text-xs font-black uppercase">
                <ShieldAlert size={14} /> Emergency Directory
              </div>
              <h2 className="text-xl font-black text-white mt-0.5">National Hotlines 24/7</h2>
            </div>
            <Link
              to="/report"
              className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors w-fit shadow-xs"
            >
              Report Emergency Online 🚨
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {hotlines.map((h) => (
              <motion.div
                key={h.name}
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.2 }}
                className="p-3 bg-gray-900 rounded-lg border border-gray-800 flex flex-col gap-1 hover:border-red-700/60 transition-colors"
              >
                <span className="text-[11px] text-gray-400 font-bold">{h.name}</span>
                <a href={`tel:${h.number}`} className="text-xl font-black text-emerald-400 font-mono hover:underline flex items-center gap-1">
                  <Phone size={14} /> {h.number}
                </a>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white py-8 text-xs text-gray-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <img src={mainLogo} alt="RescueLink AI" className="h-7 w-7 rounded-md object-cover" />
            <span className="font-extrabold text-gray-900">RescueLink AI</span>
          </div>

          <div className="flex flex-wrap gap-4 font-bold text-gray-600">
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
