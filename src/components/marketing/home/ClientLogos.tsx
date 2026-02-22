'use client'

import { motion } from 'framer-motion'
import { viewportConfig } from '@/utils/marketing-animations'

const industries = [
  'NovaTech SaaS', 'UrbanEats', 'LuxeStyle', 'HealthFirst',
  'EduGrowth', 'RealtyCo', 'QuickMart', 'FitLife',
  'AutoPrime', 'WealthEdge',
]

export default function ClientLogos() {
  return (
    <section className="py-14 bg-dark-800 border-y border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportConfig}
          className="text-center text-gray-500 text-sm uppercase tracking-widest mb-8"
        >
          Trusted by leading businesses
        </motion.p>

        <div className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-dark-800 to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-dark-800 to-transparent" />

          <motion.div
            animate={{ x: [0, -50 * industries.length] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="flex gap-12 whitespace-nowrap w-max"
          >
            {[...industries, ...industries].map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex items-center gap-3 px-6 py-3 glass-card rounded-xl border border-white/6"
              >
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-violet-600 opacity-60" />
                <span className="text-gray-400 font-medium text-sm">{name}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
