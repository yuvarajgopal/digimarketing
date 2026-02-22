'use client'

import { useId } from 'react'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md'
  withTagline?: boolean
  className?: string
}

export default function Logo({ size = 'md', withTagline = true, className = '' }: LogoProps) {
  const gradId = useId()
  const isSm = size === 'sm'

  return (
    <Link href="/" className={`flex items-center gap-2.5 group ${className}`}>
      <div className={`${isSm ? 'w-8 h-8' : 'w-9 h-9'} rounded-xl overflow-hidden shadow-glow group-hover:shadow-glow-lg transition-all duration-300 shrink-0`}>
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect width="36" height="36" fill={`url(#${gradId})`} />
          <rect x="5"  y="24" width="5" height="8"  rx="1.5" fill="white" fillOpacity="0.45" />
          <rect x="13" y="18" width="5" height="14" rx="1.5" fill="white" fillOpacity="0.7"  />
          <rect x="21" y="11" width="5" height="21" rx="1.5" fill="white" />
          <path
            d="M25 6 L30 3 M30 3 L27 3 M30 3 L30 6"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2563EB" />
              <stop offset="1" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-display font-bold ${isSm ? 'text-lg' : 'text-xl'} leading-tight`}>
          <span className="gradient-text">Digi</span>
          <span className="text-white">Campaign</span>
        </span>
        {withTagline && (
          <span className="text-[9.5px] font-medium text-gray-500 tracking-wide mt-[3px] whitespace-nowrap">
            An Infra Delta Solutions Company
          </span>
        )}
      </div>
    </Link>
  )
}
