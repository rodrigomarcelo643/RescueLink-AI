import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'

interface Props {
  open: boolean
  minimized: boolean
  unread: number
  primaryColor: string
  onClick: () => void
}

export default function FloatingBubble({ open, minimized, unread, primaryColor, onClick }: Props) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: primaryColor,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <AnimatePresence mode="wait">
        {open && !minimized ? (
          <motion.span
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <X size={22} color="#fff" />
          </motion.span>
        ) : (
          <motion.span
            key="open"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MessageCircle size={22} color="#fff" />
          </motion.span>
        )}
      </AnimatePresence>

      {/* Unread badge */}
      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#ef4444',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #fff',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Pulse ring when minimized with unread */}
      {minimized && unread > 0 && (
        <motion.span
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: `2px solid ${primaryColor}`,
            opacity: 0,
          }}
          animate={{ opacity: [0, 0.6, 0], scale: [1, 1.3, 1.3] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      )}
    </motion.button>
  )
}
