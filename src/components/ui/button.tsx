import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-bold tracking-wide cursor-pointer transition-opacity select-none active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none'

  const variants = {
    primary: 'bg-red-700 text-white hover:bg-red-800',
    outline: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
    ghost:   'bg-transparent text-gray-500 hover:bg-gray-100',
    danger:  'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  }

  const sizes = {
    sm: 'h-8 px-3.5 text-xs gap-1.5',
    md: 'h-10 px-4 text-[13px] gap-2',
    lg: 'h-11 px-5 text-[13px] gap-2',
  }

  return (
    <button
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      style={{ borderRadius: 5 }}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="size-3.5 rounded-full border-2 border-current/30 border-t-current"
            style={{ animation: 'spin 0.7s linear infinite' }}
          />
          {children}
        </>
      ) : children}
    </button>
  )
}

export default Button
