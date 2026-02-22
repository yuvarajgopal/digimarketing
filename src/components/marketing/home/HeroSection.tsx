'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Sparkles, TrendingUp, Users, Zap, BarChart2 } from 'lucide-react'
import { fadeInUp, staggerContainer } from '@/utils/marketing-animations'

const metrics = [
  { label: 'Total Revenue', value: '₹42.6L', change: '+127%', color: 'from-blue-600 to-cyan-500' },
  { label: 'Active Campaigns', value: '24', change: '+8', color: 'from-violet-600 to-blue-500' },
  { label: 'Leads This Month', value: '1,840', change: '+340%', color: 'from-cyan-500 to-teal-400' },
  { label: 'Avg. ROAS', value: '6.2x', change: '+2.1x', color: 'from-orange-500 to-amber-400' },
]

const bars = [40, 65, 45, 80, 60, 90, 75, 95, 70, 88, 78, 100]

function AnimatedDashboard() {
  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10,14,26,0.95)',
          border: '1px solid rgba(37,99,235,0.3)',
          boxShadow: '0 0 0 1px rgba(37,99,235,0.15), 0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">DC</span>
            </div>
            <span className="text-white text-xs font-semibold">DigiCampaign Dashboard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[10px] font-medium">Live</span>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-2.5 p-4">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-gray-500 text-[10px] mb-1">{m.label}</p>
              <p className="text-white font-bold text-base font-display">{m.value}</p>
              <span className="text-emerald-400 text-[10px] font-semibold">{m.change}</span>
            </motion.div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="px-4 pb-4">
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-[10px] font-medium">Revenue Growth</span>
              <span className="text-cyan-400 text-[10px] font-semibold">Last 12 months</span>
            </div>
            <div className="flex items-end gap-1 h-16">
              {bars.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: 0.6 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
                  className="flex-1 rounded-t-sm"
                  style={{ background: i === bars.length - 1 ? 'linear-gradient(to top, #2563eb, #06b6d4)' : 'rgba(37,99,235,0.35)' }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom stats row */}
        <div className="grid grid-cols-3 px-4 pb-4 gap-2">
          {[
            { icon: Users, label: '500+ Clients', color: 'text-blue-400' },
            { icon: TrendingUp, label: '4.8x ROAS', color: 'text-cyan-400' },
            { icon: Zap, label: 'AI Powered', color: 'text-amber-400' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-1.5 rounded-lg px-2 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Icon className={`w-3 h-3 ${color} shrink-0`} />
              <span className="text-gray-400 text-[10px] font-medium">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute -right-4 top-16 rounded-xl px-3 py-2 shadow-lg"
        style={{ background: 'rgba(10,14,26,0.95)', border: '1px solid rgba(37,99,235,0.4)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <BarChart2 className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="text-white text-[10px] font-bold">+340% Leads</p>
            <p className="text-gray-500 text-[9px]">this month</p>
          </div>
        </div>
      </motion.div>

      <div className="absolute -z-10 -inset-8 bg-blue-600/8 rounded-3xl blur-3xl" />
    </div>
  )
}

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-dark-900">
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-0 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-800/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <motion.div variants={fadeInUp}>
              <div className="section-badge inline-flex mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Growth-Focused Digital Marketing
              </div>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="font-display font-bold text-white leading-[1.1] mb-6"
              style={{ fontSize: 'clamp(2.25rem, 5.5vw, 4rem)' }}
            >
              Grow Your Business with{' '}
              <span className="gradient-text">Data-Driven</span>{' '}
              Digital Marketing
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-gray-400 text-lg md:text-xl leading-relaxed mb-8 max-w-xl">
              We transform businesses through strategic social media advertising,
              performance campaigns, and AI-powered automation — delivering
              measurable ROI that speaks for itself.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap gap-4 mb-8">
              {['✅ 500+ Clients Served', '📈 4.8x Average ROAS', '🏆 5-Star Rated Agency'].map((item) => (
                <span key={item} className="text-sm text-gray-300 font-medium">{item}</span>
              ))}
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
              <Link href="/contact" className="btn-primary text-base py-4 px-8">
                Book Free Consultation
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/services" className="btn-secondary text-base py-4 px-8">
                View Services
              </Link>
            </motion.div>
          </motion.div>

          <div className="relative mt-12 lg:mt-0 px-6 md:px-0">
            <AnimatedDashboard />
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block">
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-2 text-gray-500"
        >
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-gray-500 to-transparent" />
        </motion.div>
      </div>
    </section>
  )
}
