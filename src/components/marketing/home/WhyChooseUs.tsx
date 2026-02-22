'use client'

import { motion } from 'framer-motion'
import { Shield, Zap, BarChart3, HeadphonesIcon, Award, Globe } from 'lucide-react'
import { fadeInUp, staggerContainer, viewportConfig } from '@/utils/marketing-animations'
import SectionTitle from '../shared/SectionTitle'

const reasons = [
  {
    icon: BarChart3,
    title: 'Data-Driven Decisions',
    description: 'Every strategy is backed by deep analytics and real data — not guesswork. We track every rupee spent.',
    color: 'from-blue-600 to-violet-500',
  },
  {
    icon: Zap,
    title: 'Fast Execution',
    description: 'Campaigns go live within 72 hours. We move fast so you can start seeing results while your competitors sleep.',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Shield,
    title: 'ROI Guarantee',
    description: "If we don't deliver the agreed results in 90 days, we work for free until we do. That's our commitment.",
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: HeadphonesIcon,
    title: 'Dedicated Support',
    description: 'A dedicated account manager is always reachable via email, phone, or video call — not just Monday to Friday.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Award,
    title: 'Certified Experts',
    description: 'Meta Blueprint, Google Ads, and HubSpot certified professionals manage your campaigns end-to-end.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Globe,
    title: 'Full-Funnel Approach',
    description: "We don't just run ads. We build complete marketing systems — from awareness to conversion to retention.",
    color: 'from-violet-500 to-purple-600',
  },
]

export default function WhyChooseUs() {
  return (
    <section className="py-24 bg-dark-800 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-600/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Why DigiCampaign"
          title="The Agency That Puts Your"
          highlight="Results First"
          subtitle="We're not just another agency. We're growth partners obsessed with your success — and our track record proves it."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {reasons.map((reason) => {
            const Icon = reason.icon
            return (
              <motion.div key={reason.title} variants={fadeInUp} className="group relative">
                <div className="glass-card rounded-2xl p-6 h-full transition-all duration-300 group-hover:border-blue-500/30 group-hover:bg-blue-500/5">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${reason.color} flex items-center justify-center mb-5 shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-white font-display font-bold text-base mb-2">{reason.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{reason.description}</p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportConfig}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-14 rounded-3xl p-px overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #ec4899)' }}
        >
          <div className="rounded-3xl bg-dark-800 px-8 py-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 bg-cta-gradient" />
            <div className="relative">
              <div className="text-4xl mb-3">🏆</div>
              <h3 className="text-white font-display font-bold text-xl md:text-2xl mb-2">
                90-Day ROI Guarantee
              </h3>
              <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto">
                If we don&apos;t deliver measurable results within 90 days, we&apos;ll continue working at
                <strong className="text-white"> zero additional cost</strong> until we do.
                Zero risk. Maximum reward.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
