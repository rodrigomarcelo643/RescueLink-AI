import { motion } from 'framer-motion'
import type { ReactNode, CSSProperties } from 'react'

interface Props {
  children: ReactNode
  delay?: number
  className?: string
  style?: CSSProperties
}

const ease = [0.22, 1, 0.36, 1] as const

export function FadeUp({ children, delay = 0, className, style }: Props) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay }}
    >
      {children}
    </motion.div>
  )
}

export function FadeIn({ children, delay = 0, className, style }: Props) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  )
}
