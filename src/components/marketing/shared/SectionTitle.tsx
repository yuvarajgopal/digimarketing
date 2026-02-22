'use client'

import { motion } from 'framer-motion'
import { fadeInUp, viewportConfig } from '@/utils/marketing-animations'

interface SectionTitleProps {
  badge?: string
  title: string
  highlight?: string
  subtitle?: string
  center?: boolean
  light?: boolean
}

export default function SectionTitle({
  badge,
  title,
  highlight,
  subtitle,
  center = true,
  light = false,
}: SectionTitleProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportConfig}
      variants={fadeInUp}
      className={`mb-12 ${center ? 'text-center' : ''}`}
    >
      {badge && (
        <div className={`section-badge ${center ? 'mx-auto' : ''} inline-flex`}>
          <span className="glow-dot" />
          {badge}
        </div>
      )}
      <h2
        className={`font-display font-bold leading-tight ${light ? 'text-dark-900' : 'text-white'}`}
        style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
      >
        {title}{' '}
        {highlight && <span className="gradient-text">{highlight}</span>}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-lg leading-relaxed max-w-2xl ${center ? 'mx-auto' : ''} ${
            light ? 'text-gray-600' : 'text-gray-400'
          }`}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  )
}
