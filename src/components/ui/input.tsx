import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  icon?: ReactNode
  endAdornment?: ReactNode
  error?: boolean
}

export function Input({ label, icon, endAdornment, error, className, ...props }: InputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
          {label}
        </label>
      )}
      <div
        className="flex h-11 items-center bg-white transition-all"
        style={{
          border: error
            ? '1.5px solid #b91c1c'
            : focused
            ? '1.5px solid #b91c1c'
            : '1.5px solid #e5e7eb',
          borderRadius: 5,
          boxShadow: focused ? '0 0 0 3px rgba(185,28,28,0.07)' : 'none',
        }}
      >
        {icon && (
          <span className="flex items-center gap-2.5 pl-3.5 text-gray-300">
            {icon}
            <span className="h-4 w-px bg-gray-200" />
          </span>
        )}
        <input
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            'h-full flex-1 bg-transparent px-3 text-sm font-medium text-gray-800 outline-none placeholder:text-gray-300',
            !icon && 'pl-3.5',
            className
          )}
          {...props}
        />
        {endAdornment && (
          <span className="pr-3.5 text-gray-300">{endAdornment}</span>
        )}
      </div>
    </div>
  )
}

export default Input
