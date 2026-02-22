'use client'

import { motion } from 'framer-motion'
import { useCounter } from '@/hooks/use-counter'
import { fadeInUp, staggerContainer } from '@/utils/marketing-animations'

const stats = [
  { end: 500,   suffix: '+', label: 'Clients Served',      description: 'Across India & globally'         },
  { end: 50000, suffix: '+', label: 'Leads Generated',     description: 'Qualified, sales-ready leads'    },
  { end: 342,   suffix: '%', label: 'Avg. ROI Delivered',  description: 'Across all campaigns'            },
  { end: 1200,  suffix: '+', label: 'Campaigns Run',       description: 'Meta, Google, and more'         },
]

function StatItem({ end, suffix, label, description, index }: {
  end: number; suffix: string; label: string; description: string; index: number
}) {
  const { count, ref } = useCounter(end, 2000 + index * 200)
  const formatted = end >= 10000 ? count.toLocaleString('en-IN') : count.toString()

  return (
    <motion.div ref={ref} variants={fadeInUp} className="text-center group">
      <div className="text-4xl md:text-5xl font-display font-bold mb-2 gradient-text">
        {formatted}{suffix}
      </div>
      <div className="text-white font-semibold text-lg mb-1">{label}</div>
      <div className="text-gray-500 text-sm">{description}</div>
    </motion.div>
  )
}

export default function StatsCounter() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-dark-800 via-dark-700 to-dark-800" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-10 md:gap-16"
        >
          {stats.map((stat, i) => (
            <StatItem key={stat.label} {...stat} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
