import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, CheckCircle, XCircle, Loader, AlertTriangle, Zap } from 'lucide-react'
import mainLogo from '@/assets/logo/main_logo.jpg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FadeUp, FadeIn } from '@/components/shared/MotionWrappers'
import { supabase } from '@/services/supabase'

const ease = [0.22, 1, 0.36, 1] as const
const FB_BLUE = '#1877f2'

const STATS = [
  { n: 'Webhook', d: 'Verified' },
  { n: 'AI',      d: 'Extraction' },
  { n: 'Live',    d: 'Replies' },
]

type TestStatus = 'idle' | 'running' | 'pass' | 'fail'

interface TestResult {
  label: string
  status: TestStatus
  detail?: string
}

export default function MessengerTest() {
  const [psid, setPsid] = useState('')
  const [message, setMessage] = useState('Sunog sa Barangay 5, may naiipit na tao!')
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const updateResult = (index: number, patch: Partial<TestResult>) =>
    setResults((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  const runTests = async () => {
    if (!psid.trim()) { setError('Enter a Facebook Sender PSID to test.'); return }
    setError('')
    setRunning(true)

    const tests: TestResult[] = [
      { label: 'Webhook reachable (GET verify)', status: 'running' },
      { label: 'Simulate incoming message (POST)', status: 'idle' },
      { label: 'AI extraction creates ticket', status: 'idle' },
      { label: 'messenger_threads row inserted', status: 'idle' },
    ]
    setResults([...tests])

    // ── Test 1: Webhook GET verify ──
    try {
      const res = await fetch(
        `https://bgcstqafexuhhtfmjvnp.supabase.co/functions/v1/messenger-webhook?hub.mode=subscribe&hub.verify_token=rescuelinkai2026&hub.challenge=ping123`
      )
      const text = await res.text()
      if (text === 'ping123') updateResult(0, { status: 'pass', detail: 'Challenge echoed correctly' })
      else updateResult(0, { status: 'fail', detail: `Unexpected response: ${text}` })
    } catch (e) {
      updateResult(0, { status: 'fail', detail: String(e) })
    }

    // ── Test 2: Simulate POST message ──
    updateResult(1, { status: 'running' })
    try {
      const payload = {
        object: 'page',
        entry: [{
          messaging: [{
            sender: { id: psid.trim() },
            recipient: { id: '1232412116623460' },
            timestamp: Date.now(),
            message: { mid: `test_${Date.now()}`, text: message },
          }],
        }],
      }
      const res = await fetch(
        'https://bgcstqafexuhhtfmjvnp.supabase.co/functions/v1/messenger-webhook',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      )
      if (res.ok) updateResult(1, { status: 'pass', detail: `HTTP ${res.status} OK` })
      else updateResult(1, { status: 'fail', detail: `HTTP ${res.status}` })
    } catch (e) {
      updateResult(1, { status: 'fail', detail: String(e) })
    }

    // ── Test 3: Check rescue_tickets ──
    updateResult(2, { status: 'running' })
    await new Promise((r) => setTimeout(r, 2500)) // wait for edge fn to process
    try {
      const { data, error: dbErr } = await supabase
        .from('rescue_tickets')
        .select('id, created_at, channel')
        .eq('channel', 'messenger')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (dbErr) throw dbErr
      updateResult(2, { status: 'pass', detail: `Ticket #${data.id} created at ${new Date(data.created_at).toLocaleTimeString()}` })
    } catch (e) {
      updateResult(2, { status: 'fail', detail: 'No messenger ticket found — check ai-extract function' })
    }

    // ── Test 4: Check messenger_threads ──
    updateResult(3, { status: 'running' })
    try {
      const { data, error: dbErr } = await supabase
        .from('messenger_threads')
        .select('id, text, created_at')
        .eq('sender_id', psid.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (dbErr) throw dbErr
      updateResult(3, { status: 'pass', detail: `"${data.text?.slice(0, 40)}…"` })
    } catch {
      updateResult(3, { status: 'fail', detail: 'No thread row found — check messenger_threads table' })
    }

    setRunning(false)
  }

  const passed = results.filter((r) => r.status === 'pass').length
  const failed = results.filter((r) => r.status === 'fail').length
  const done = results.length > 0 && !running

  return (
    <div className="flex min-h-screen bg-white font-sans">

      {/* ── Left panel ── */}
      <motion.div
        className="relative hidden w-[48%] flex-col items-center justify-center gap-8 bg-white p-16 lg:flex"
        style={{ borderRight: '1px solid #f0f0f0' }}
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <motion.img
          src={mainLogo}
          alt="RescueLink AI"
          className="w-64 object-contain"
          style={{ borderRadius: 12 }}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease }}
        />

        <FadeUp delay={0.25} className="text-center">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Messenger Integration</h1>
          <p className="mt-1 text-sm font-medium text-gray-400">Test your Facebook connection end-to-end</p>
        </FadeUp>

        <FadeUp
          delay={0.35}
          className="flex w-full max-w-xs divide-x divide-gray-100 overflow-hidden"
          style={{ border: '1px solid #f0f0f0', borderRadius: 5 }}
        >
          {STATS.map(({ n, d }, i) => (
            <motion.div
              key={d}
              className="flex flex-1 flex-col items-center py-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.08, ease: 'easeOut' }}
            >
              <span className="text-base font-extrabold text-gray-900">{n}</span>
              <span className="text-[11px] font-medium text-gray-400">{d}</span>
            </motion.div>
          ))}
        </FadeUp>

        {/* FB badge */}
        <FadeIn delay={0.5}>
          <div
            className="flex items-center gap-2 px-4 py-2"
            style={{ border: `1px solid ${FB_BLUE}33`, borderRadius: 5, background: '#eff6ff' }}
          >
            <div className="flex size-5 items-center justify-center rounded-full" style={{ background: FB_BLUE }}>
              <svg viewBox="0 0 24 24" fill="white" width="10" height="10">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold" style={{ color: FB_BLUE }}>
              Page ID: 1232412116623460
            </span>
          </div>
        </FadeIn>

        <FadeIn delay={0.6} className="absolute bottom-8">
          <p className="text-[11px] text-gray-300">© {new Date().getFullYear()} RescueLink AI · Philippines</p>
        </FadeIn>
      </motion.div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center bg-white px-8 py-16">
        <div className="w-full max-w-[500px]">

          {/* Mobile logo */}
          <motion.div
            className="mb-8 flex flex-col items-center gap-3 lg:hidden"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            <img src={mainLogo} alt="RescueLink AI" className="w-28 object-contain" style={{ borderRadius: 8 }} />
          </motion.div>

          <FadeUp delay={0.1} className="mb-7 text-center lg:text-left">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Connection Test</h2>
            <p className="mt-1.5 text-sm text-gray-400">Simulate a citizen message and verify the full pipeline</p>
          </FadeUp>

          <motion.div
            className="bg-white p-6"
            style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease }}
          >
            <div className="flex flex-col gap-4">

              <FadeUp delay={0.26}>
                <Input
                  label="Facebook Sender PSID"
                  type="text"
                  placeholder="e.g. 7891234567890123"
                  value={psid}
                  onChange={(e) => setPsid(e.target.value)}
                  icon={<MessageCircle size={14} />}
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Find this in Messenger webhook logs or use your own PSID from the FB developer console.
                </p>
              </FadeUp>

              <FadeUp delay={0.32}>
                <Input
                  label="Test Message"
                  type="text"
                  placeholder="Disaster report message…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  icon={<Send size={14} />}
                />
              </FadeUp>

              <AnimatePresence>
                {error && (
                  <motion.div
                    className="flex items-start gap-2 px-3 py-2.5"
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5 }}
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

              <FadeUp delay={0.38}>
                <Button type="button" variant="primary" size="lg" fullWidth loading={running} onClick={runTests}>
                  {running ? 'Running tests…' : (
                    <span className="flex items-center justify-center gap-2">
                      <Zap size={14} /> Run Connection Tests
                    </span>
                  )}
                </Button>
              </FadeUp>
            </div>
          </motion.div>

          {/* Results */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div
                className="mt-4 flex flex-col gap-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease }}
              >
                {results.map((r, i) => (
                  <motion.div
                    key={r.label}
                    className="flex items-start gap-3 px-4 py-3"
                    style={{
                      border: `1px solid ${r.status === 'pass' ? '#bbf7d0' : r.status === 'fail' ? '#fecaca' : '#e5e7eb'}`,
                      borderRadius: 5,
                      background: r.status === 'pass' ? '#f0fdf4' : r.status === 'fail' ? '#fef2f2' : '#fafafa',
                    }}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                  >
                    <div className="mt-px shrink-0">
                      {r.status === 'running' && <Loader size={14} className="animate-spin text-gray-400" />}
                      {r.status === 'pass'    && <CheckCircle size={14} className="text-green-600" />}
                      {r.status === 'fail'    && <XCircle size={14} className="text-red-500" />}
                      {r.status === 'idle'    && <div className="size-3.5 rounded-full border-2 border-gray-200" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800">{r.label}</p>
                      {r.detail && <p className="mt-0.5 text-[11px] text-gray-500 truncate">{r.detail}</p>}
                    </div>
                  </motion.div>
                ))}

                {/* Summary */}
                {done && (
                  <motion.div
                    className="mt-1 flex items-center justify-between px-4 py-3"
                    style={{
                      border: `1px solid ${failed === 0 ? '#bbf7d0' : '#fecaca'}`,
                      borderRadius: 5,
                      background: failed === 0 ? '#f0fdf4' : '#fef2f2',
                    }}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    <span className="text-[12px] font-extrabold" style={{ color: failed === 0 ? '#15803d' : '#b91c1c' }}>
                      {failed === 0 ? '✅ All tests passed — Messenger is connected!' : `⚠️ ${passed} passed · ${failed} failed`}
                    </span>
                    <button
                      onClick={() => setResults([])}
                      className="text-[11px] font-semibold text-gray-400 underline underline-offset-2 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <FadeIn delay={0.55} className="mt-5 text-center">
            <p className="text-[11px] text-gray-400">Development use only · RescueLink AI</p>
          </FadeIn>

        </div>
      </div>
    </div>
  )
}
