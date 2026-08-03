import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import FloatingBubble from './components/FloatingBubble'
import ChatPanel from './components/ChatPanel'
import { initSupabase } from './services/widgetSupabase'
import type { WidgetConfig } from './types'

interface Props {
  config: WidgetConfig
}

export default function Widget({ config }: Props) {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [unread, setUnread] = useState(0)
  const primary = config.primaryColor ?? '#1877f2'

  useEffect(() => {
    initSupabase(config.supabaseUrl, config.supabaseAnonKey)
  }, [config.supabaseUrl, config.supabaseAnonKey])

  // Increment unread when minimized and a bot reply comes in
  useEffect(() => {
    if (!open || minimized) return
    setUnread(0)
  }, [open, minimized])

  const handleBubbleClick = () => {
    if (open && !minimized) {
      setOpen(false)
    } else {
      setOpen(true)
      setMinimized(false)
      setUnread(0)
    }
  }

  return (
    <motion.div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 12,
        fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {open && (
        <ChatPanel
          config={config}
          minimized={minimized}
          onClose={() => setOpen(false)}
          onMinimize={() => setMinimized(true)}
        />
      )}

      <FloatingBubble
        open={open}
        minimized={minimized}
        unread={unread}
        primaryColor={primary}
        onClick={handleBubbleClick}
      />
    </motion.div>
  )
}
