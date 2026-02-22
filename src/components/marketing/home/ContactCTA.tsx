'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Phone, Calendar } from 'lucide-react'
import { fadeInUp, staggerContainer, viewportConfig } from '@/utils/marketing-animations'

export default function ContactCTA() {
  return (
    <section className="py-24 relative overflow-hidden bg-dark-900">
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.15) 0%, transparent 70%)'
      }} />
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          <motion.div variants={fadeInUp} className="section-badge mx-auto inline-flex mb-6">
            <span className="glow-dot" />
            Limited Spots Available
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="font-display font-bold text-white leading-tight mb-5"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)' }}
          >
            Ready to{' '}
            <span className="gradient-text">10x Your Growth?</span>
          </motion.h2>

          <motion.p variants={fadeInUp} className="text-gray-400 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            Book your free 30-minute strategy call. We&apos;ll audit your current marketing,
            identify the biggest opportunities, and give you a custom growth roadmap —
            <strong className="text-white"> completely free, no strings attached.</strong>
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          >
            <Link href="/contact" className="btn-primary text-base py-4 px-8 w-full sm:w-auto justify-center">
              <Calendar className="w-5 h-5" />
              Book Free Strategy Call
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-2 py-4 px-8 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors text-base w-full sm:w-auto justify-center border border-white/20"
            >
              <Phone className="w-5 h-5" />
              Call Us Now
            </Link>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500"
          >
            {['✅ Free 30-min strategy call', '🚀 No long-term contracts', '💯 Results or we work free'].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
