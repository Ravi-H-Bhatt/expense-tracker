'use client'

import { cn } from '@/lib/utils'

interface RFinLogoProps {
  className?: string
  iconOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function RFinLogo({ className, iconOnly = false, size = 'md' }: RFinLogoProps) {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8', 
    lg: 'h-12'
  }

  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 48
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl'
  }

  const SparkleIcon = ({ fill = "#059669" }: { fill?: string }) => (
    <svg 
      width={iconSizes[size]} 
      height={iconSizes[size]} 
      viewBox="0 0 32 32" 
      fill="none" 
      className="flex-shrink-0"
    >
      <circle cx="16" cy="16" r="16" fill={fill}/>
      <path 
        d="M16 6l2.5 6.5L25 14.5l-6.5 2.5L16 23.5l-2.5-6.5L7 14.5l6.5-2.5L16 6z" 
        fill="white"
        fillOpacity="0.95"
      />
      <circle cx="21" cy="10" r="1.5" fill="white" fillOpacity="0.8"/>
      <circle cx="11" cy="21" r="1" fill="white" fillOpacity="0.6"/>
    </svg>
  )

  if (iconOnly) {
    return (
      <div className={cn('inline-flex items-center', className)}>
        <SparkleIcon fill={className?.includes('text-white') ? 'white' : '#059669'} />
      </div>
    )
  }

  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <SparkleIcon fill={className?.includes('text-white') ? 'white' : '#059669'} />
      <span className={cn(
        'font-semibold tracking-tight',
        textSizes[size],
        className?.includes('text-white') ? 'text-white' : 'text-slate-900'
      )}>
        RFin
      </span>
    </div>
  )
}