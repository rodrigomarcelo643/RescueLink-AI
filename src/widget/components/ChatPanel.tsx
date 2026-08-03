import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Minus, MessageCircle, AlertTriangle, CheckCheck, Loader } from 'lucide-react'
import { sendWidgetMessage, subscribeToReplies } from '../services/widgetSupabase'
import type { WidgetMessage, WidgetConfig } from '../types'

const ease = [0.22, 1, 0.36, 1] as const

const QUICK_REPLIES = [
  '🚨 Report an emergency',
  '🌊 Flood in my area',
  '🔥 Fire incident',
  '🏠 Need evacuation help',
  '📦 Request relief goods',
]

const BOT_GREETING = `Hi! I'm the RescueLink AI assistant. I can help you report emergencies and connect you with local rescue teams.\n\nHow can I help you today?`

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function generateSessionId() {
  const stored = sessionStorage.getItem('rl_widget_session')
  if (stored) return stored
  const id = `widget_${Date.now()}_${generateId()}`
  sessionStorage.setItem('rl_widget_session', id)
  return id
}

interface Props {
  config: WidgetConfig
  onClose: () => void
  minimized: boolean
  onMinimize: () => void
}

export default function ChatPanel({ config, onClose, minimized, onMinimize }: Props) {
  const primary = config.primaryColor ?? '#1877f2'
  const sessionId = useRef(generateSessionId())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<WidgetMessage[]>([
    { id: 'greeting', sender: 'bot', text: BOT_GREETING, timestamp: new Date(), status: 'sent' },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showQuick, setShowQuick] = useState(true)

  const addMessage = useCallback((msg: WidgetMessage) => {
    setMessages((prev) => [...prev, msg])
  }, [])

  // Subscribe to bot replies
  useEffect(() => {
    const channel = subscribeToReplies(sessionId.current, (text) => {
      addMessage({ id: generateId(), sender: 'bot', text, timestamp: new Date(), status: 'sent' })
    })
    return () => { channel.unsubscribe() }
  }, [addMessage])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (!minimized) setTimeout(() => inputRef.current?.focus(), 300)
  }, [minimized])

  const send = async (text: string) => {
    if (!text.trim() || sending) return
    setShowQuick(false)
    setInput('')
    setSending(true)

    const userMsg: WidgetMessage = {
      id: generateId(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date(),
      status: 'sending',
    }
    addMessage(userMsg)

    try {
      await sendWidgetMessage({ sessionId: sessionId.current, text: text.trim(), channel: 'messenger' })
      setMessages((prev) =>
        prev.map((m) => m.id === userMsg.id ? { ...m, status: 'sent' } : m)
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) => m.id === userMsg.id ? { ...m, status: 'error' } : m)
      )
      addMessage({
        id: generateId(),
        sender: 'bot',
        text: '⚠️ Could not send your message. Please try again or call your local emergency hotline.',
        timestamp: new Date(),
        status: 'sent',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <AnimatePresence>
      {!minimized && (
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.3, ease }}
          style={{
            width: 360,
            height: 560,
            borderRadius: 16,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
            fontSize: 13,
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              background: primary,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
            }}
          >
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="logo" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={18} color="#fff" />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 13, margin: 0, letterSpacing: '-0.01em' }}>
                {config.title ?? 'RescueLink AI'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: 0, fontWeight: 500 }}>
                {config.subtitle ?? 'Emergency Reporting · Usually replies instantly'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={onMinimize}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
              >
                <Minus size={14} />
              </button>
              <button
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: '#f9fafb' }}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}
              >
                <div
                  style={{
                    maxWidth: '82%',
                    padding: '9px 12px',
                    borderRadius: msg.sender === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.sender === 'user' ? primary : '#fff',
                    color: msg.sender === 'user' ? '#fff' : '#111827',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    border: msg.sender === 'bot' ? '1px solid #e5e7eb' : 'none',
                  }}
                >
                  {msg.text}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3, paddingLeft: 2, paddingRight: 2 }}>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.sender === 'user' && (
                    msg.status === 'sending' ? <Loader size={10} color="#9ca3af" style={{ animation: 'spin 1s linear infinite' }} /> :
                    msg.status === 'error' ? <AlertTriangle size={10} color="#ef4444" /> :
                    <CheckCheck size={10} color={primary} />
                  )}
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'flex-start' }}
              >
                <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: '#fff', border: '1px solid #e5e7eb', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af', display: 'block' }}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Quick replies ── */}
          <AnimatePresence>
            {showQuick && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ padding: '8px 12px', background: '#f9fafb', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}
              >
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 20,
                      border: `1px solid ${primary}`,
                      background: '#fff',
                      color: primary,
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Input ── */}
          <div style={{ padding: '10px 12px', background: '#fff', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Type your message…"
              style={{
                flex: 1,
                border: '1px solid #e5e7eb',
                borderRadius: 20,
                padding: '8px 14px',
                fontSize: 13,
                outline: 'none',
                background: '#f9fafb',
                color: '#111827',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || sending}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: input.trim() ? primary : '#e5e7eb',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <Send size={15} color={input.trim() ? '#fff' : '#9ca3af'} />
            </button>
          </div>

          {/* ── Footer ── */}
          <div style={{ padding: '6px 12px', background: '#fff', textAlign: 'center', borderTop: '1px solid #f9fafb' }}>
            <span style={{ fontSize: 10, color: '#d1d5db', fontWeight: 500 }}>Powered by RescueLink AI · Philippines</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
