import { cn } from '@/lib/utils'
import mainLogo from '@/assets/logo/main_logo.jpg'

export default function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-full min-h-screen items-center justify-center bg-white', className)}>
      <div className="flex flex-col items-center gap-5">

        {/* Rings + logo */}
        <div className="relative flex items-center justify-center">
          {/* Outer ring */}
          <div
            className="absolute size-20 animate-spin rounded-full"
            style={{ border: '2px solid transparent', borderTopColor: '#b91c1c', borderRightColor: '#b91c1c22' }}
          />
          {/* Middle ring */}
          <div
            className="absolute size-14 animate-spin rounded-full"
            style={{
              border: '2px solid transparent',
              borderTopColor: '#b91c1c66',
              animationDirection: 'reverse',
              animationDuration: '0.9s',
            }}
          />
          {/* Logo */}
          <img
            src={mainLogo}
            alt="RescueLink AI"
            className="size-9 rounded-full object-cover"
            style={{ boxShadow: '0 0 0 2px #f0f0f0' }}
          />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-extrabold tracking-tight text-gray-900">RescueLink AI</p>
          <p
            className="text-[11px] font-medium text-gray-400"
            style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
          >
            Loading…
          </p>
        </div>

      </div>
    </div>
  )
}
