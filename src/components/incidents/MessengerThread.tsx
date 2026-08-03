import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, CheckCheck, AlertTriangle, Loader } from 'lucide-react'
import {
  getThreadMessages,
  replyToFbSender,
  subscribeToThread,
  type ThreadMessage,
} from '@/services/messengerThread.service'

const FB_BLUE = '#1877f2'

function timeStr(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

interface OptimisticMsg extends ThreadMessage {
  status: 'sending' | 'sent' | 'error'
}

interface Props {
  fbSenderId: string
  senderName: string
}

export default function MessengerThread({ fbSenderId, senderName }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<OptimisticMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const openRef = useRef(open)
  useEffect(() => { openRef.current = open }, [open])

  // Load thread history when opened
  useEffect(() => {
    if (!open) return
    setLoading(true)
    setUnread(0)
    getThreadMessages(fbSenderId).then((data) => {
      setMessages(data.map((m) => ({ ...m, status: 'sent' })))
      setLoading(false)
    })
    setTimeout(() => inputRef.current?.focus(), 200)
  }, [open, fbSenderId])

  // Only subscribe while mounted and after first open
  const hasOpenedRef = useRef(false)
  if (open) hasOpenedRef.current = true

  const onNewMessage = useCallback((msg: ThreadMessage) => {
    setMessages((prev) => {
      if (prev.find((m) => m.id === msg.id)) return prev
      return [...prev, { ...msg, status: 'sent' }]
    })
    if (!openRef.current) setUnread((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!hasOpenedRef.current) return
    const channel = subscribeToThread(fbSenderId, onNewMessage)
    return () => { channel.unsubscribe() }
  }, [fbSenderId, onNewMessage, open])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)

    const tempId = generateId()
    const optimistic: OptimisticMsg = {
      id: tempId,
      sender_id: fbSenderId,
      sender_type: 'lgu',
      text,
      created_at: new Date().toISOString(),
      status: 'sending',
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      await replyToFbSender(fbSenderId, text)
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...m, status: 'sent' } : m)
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...m, status: 'error' } : m)
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
        style={{
          borderRadius: 5,
          border: `1px solid ${open ? FB_BLUE : '#e5e7eb'}`,
          background: open ? '#eff6ff' : '#fff',
          color: open ? FB_BLUE : '#6b7280',
        }}
      >
        <MessageCircle size={12} />
        Reply on Messenger
        {unread > 0 && (
          <span
            className="flex size-4 items-center justify-center text-[9px] font-extrabold text-white"
            style={{ background: '#ef4444', borderRadius: '50%' }}
          >
            {unread}
          </span>
        )}
      </button>

      {/* Thread panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="mt-2 flex flex-col"
              style={{ border: `1px solid ${FB_BLUE}22`, borderRadius: 8, overflow: 'hidden' }}
            >
              {/* Thread header */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ background: FB_BLUE, borderBottom: `1px solid ${FB_BLUE}` }}
              >
                <div
                  className="flex size-6 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
                  style={{ background: 'rgba(255,255,255,0.25)' }}
                >
                  {senderName[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-extrabold text-white truncate">{senderName}</p>
                  <p className="text-[9px] text-blue-200">via Facebook Messenger</p>
                </div>
                <div className="flex size-5 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <svg viewBox="0 0 24 24" fill="white" width="10" height="10">
                    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                  </svg>
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex flex-col gap-2 overflow-y-auto p-3"
                style={{ maxHeight: 240, background: '#f9fafb' }}
              >
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="size-4 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: FB_BLUE }} />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-gray-400">No messages yet. Start the conversation.</p>
                ) : (
                  messages.map((msg) => {
                    const isLgu = msg.sender_type === 'lgu'
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        className="flex flex-col"
                        style={{ alignItems: isLgu ? 'flex-end' : 'flex-start' }}
                      >
                        {!isLgu && (
                          <span className="mb-0.5 px-1 text-[9px] font-semibold text-gray-400">{senderName}</span>
                        )}
                        <div
                          className="max-w-[80%] px-3 py-2 text-xs leading-relaxed"
                          style={{
                            borderRadius: isLgu ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                            background: isLgu ? FB_BLUE : '#fff',
                            color: isLgu ? '#fff' : '#111827',
                            border: isLgu ? 'none' : '1px solid #e5e7eb',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                          }}
                        >
                          {msg.text}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 px-1">
                          <span className="text-[9px] text-gray-400">{timeStr(msg.created_at)}</span>
                          {isLgu && (
                            msg.status === 'sending' ? <Loader size={9} className="animate-spin text-gray-400" /> :
                            msg.status === 'error'   ? <AlertTriangle size={9} className="text-red-400" /> :
                            <CheckCheck size={9} style={{ color: FB_BLUE }} />
                          )}
                        </div>
                      </motion.div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ background: '#fff', borderTop: '1px solid #f0f0f0' }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder={`Reply to ${senderName}…`}
                  className="flex-1 bg-gray-50 px-3 py-1.5 text-xs outline-none"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 20, fontFamily: 'inherit' }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  className="flex size-7 shrink-0 items-center justify-center transition-colors disabled:opacity-40"
                  style={{ background: input.trim() ? FB_BLUE : '#e5e7eb', borderRadius: '50%', border: 'none' }}
                >
                  <Send size={12} color={input.trim() ? '#fff' : '#9ca3af'} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
