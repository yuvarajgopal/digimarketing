'use client'

import { motion } from 'framer-motion'
import {
  Target, Eye, Lightbulb, CheckCircle,
  BarChart3, Globe, Zap, TrendingUp, Shield,
} from 'lucide-react'
import SectionTitle from '@/components/marketing/shared/SectionTitle'
import { fadeInUp, staggerContainer, viewportConfig } from '@/utils/marketing-animations'
import ContactCTA from '@/components/marketing/home/ContactCTA'

const processList = [
  {
    step: '01', title: 'Discovery & Strategy',
    description: 'We dive deep into your business, audience, and competitors to build a data-backed growth strategy.',
    icon: Lightbulb, color: 'from-blue-600 to-violet-500',
  },
  {
    step: '02', title: 'Campaign Execution',
    description: 'Our certified team launches precision campaigns across the right channels with compelling creatives.',
    icon: Target, color: 'from-pink-500 to-rose-500',
  },
  {
    step: '03', title: 'Continuous Optimization',
    description: 'We monitor, test, and optimize every element weekly to maximize performance and reduce wasted spend.',
    icon: BarChart3, color: 'from-cyan-500 to-blue-500',
  },
  {
    step: '04', title: 'Scale & Grow',
    description: 'Once we identify winning campaigns, we scale aggressively while maintaining or improving ROI.',
    icon: Globe, color: 'from-emerald-500 to-teal-500',
  },
]

const team = [
  { name: 'Vikram Sharma', role: 'Founder & CEO', expertise: 'Growth Strategy, Meta Ads', initials: 'VS', color: 'from-blue-600 to-violet-500', bio: '10+ years in digital marketing. Ex-Google, helped 200+ brands scale profitably.' },
  { name: 'Neha Kapoor', role: 'Head of Performance', expertise: 'Google Ads, Analytics', initials: 'NK', color: 'from-pink-500 to-rose-500', bio: 'Google Ads certified. Managed ₹10Cr+ in ad spend across 150+ campaigns.' },
  { name: 'Rahul Verma', role: 'Creative Director', expertise: 'Content, UGC, Design', initials: 'RV', color: 'from-orange-500 to-amber-500', bio: 'Award-winning creative. Crafted viral campaigns reaching 50M+ impressions.' },
  { name: 'Priya Mehra', role: 'Automation Lead', expertise: 'CRM & Automation', initials: 'PM', color: 'from-emerald-500 to-teal-500', bio: 'Built 80+ CRM automation systems. Expert in HubSpot, Zoho, and custom CRMs.' },
]

const expertise = [
  'Meta Blueprint Certified', 'Google Ads Certified', 'HubSpot Certified', 'Shopify Partners',
  '10+ Years Experience', '500+ Clients Served', '₹50Cr+ Ad Spend Managed', 'Pan-India & Global Reach',
]

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-24 bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="text-center max-w-3xl mx-auto">
            <motion.div variants={fadeInUp} className="section-badge mx-auto inline-flex mb-6">
              <span className="glow-dot" /> Our Story
            </motion.div>
            <motion.h1 variants={fadeInUp} className="font-display font-bold text-white leading-tight mb-6" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
              We&apos;re Not Just an Agency.{' '}
              <span className="gradient-text">We&apos;re Your Growth Partners.</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-gray-400 text-lg leading-relaxed">
              Founded in 2015, DigiCampaign was built on one belief: businesses deserve transparent, results-driven marketing that actually moves the needle. Today, we&apos;ve helped 500+ businesses across India and beyond achieve sustainable digital growth.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-20 bg-dark-800 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { Icon: Eye, label: 'Our Vision', color: 'from-blue-600 to-violet-500', title: 'A world where every business has access to enterprise-grade marketing.', body: "We believe that powerful, data-driven marketing should not be exclusive to large corporations. Our vision is to democratize access to world-class digital marketing for businesses of every size." },
              { Icon: Target, label: 'Our Mission', color: 'from-pink-500 to-rose-500', title: 'Deliver measurable growth through honest, strategic marketing.', body: 'We commit to transparency, clear communication, and results-first execution. Every strategy we build is designed to generate real, measurable impact — not just vanity metrics.' },
            ].map(({ Icon, label, color, title, body }) => (
              <motion.div key={label} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={viewportConfig} transition={{ duration: 0.6 }} className="glass-card rounded-2xl p-8">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-5`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className={`text-xs font-bold uppercase tracking-widest bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{label}</span>
                <h3 className="text-white font-display font-bold text-xl mt-2 mb-3">{title}</h3>
                <p className="text-gray-400 leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Message */}
      <section className="py-20 bg-dark-900 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 w-80 h-80 bg-violet-600/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={viewportConfig} transition={{ duration: 0.6 }}>
              <div className="section-badge inline-flex mb-6"><span className="glow-dot" /> Why DigiCampaign</div>
              <h2 className="font-display font-bold text-white text-3xl mb-4 leading-tight">
                We Don&apos;t Run Ads.{' '}<span className="gradient-text">We Build Revenue Engines.</span>
              </h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                Most agencies optimise for impressions. We optimise for <span className="text-white font-medium">revenue</span>. Every campaign, every rupee, every decision is tied to a single metric — your bottom line.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Zap, color: 'from-blue-600 to-cyan-500', title: 'Performance-First Mindset', desc: 'Zero fluff. Every campaign is engineered to drive leads, sales, and measurable ROI — not just likes.' },
                  { icon: BarChart3, color: 'from-cyan-500 to-teal-400', title: 'Full-Funnel Transparency', desc: 'Real-time dashboards, no black-box reporting. You see exactly where every rupee goes and what it returns.' },
                  { icon: Shield, color: 'from-orange-500 to-pink-500', title: 'Specialists, Not Generalists', desc: 'Dedicated experts in paid media, SEO, content, and automation — not one person juggling everything.' },
                  { icon: TrendingUp, color: 'from-green-500 to-cyan-500', title: 'We Win When You Win', desc: "Our growth is tied to yours. Results-first approach — we obsess over your KPIs like they're our own." },
                ].map(({ icon: Icon, color, title, desc }) => (
                  <div key={title} className="flex gap-4 items-start">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm mb-0.5">{title}</p>
                      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={viewportConfig} transition={{ duration: 0.6 }} className="glass-card rounded-2xl p-8">
              <h3 className="text-white font-display font-bold text-xl mb-6">Our Expertise</h3>
              <div className="grid grid-cols-2 gap-3">
                {expertise.map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 bg-dark-800 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle badge="How We Work" title="Our Proven" highlight="4-Step Process" subtitle="From discovery to scale — a systematic approach that consistently delivers results." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processList.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div key={step.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={viewportConfig} transition={{ delay: i * 0.1, duration: 0.5 }} className="glass-card rounded-2xl p-6 relative group">
                  <div className="text-5xl font-display font-bold text-white/5 absolute top-4 right-4">{step.step}</div>
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-5`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-white font-display font-bold mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-dark-900 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle badge="Our Team" title="The People Behind" highlight="Your Growth" subtitle="A passionate team of certified marketers, creatives, and data analysts." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, i) => (
              <motion.div key={member.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={viewportConfig} transition={{ delay: i * 0.1, duration: 0.5 }} className="glass-card rounded-2xl p-6 text-center group hover:border-blue-500/30 transition-all">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center text-white text-xl font-bold mx-auto mb-4`}>{member.initials}</div>
                <h4 className="text-white font-display font-bold text-base mb-0.5">{member.name}</h4>
                <p className="text-blue-400 text-sm font-medium mb-3">{member.role}</p>
                <p className="text-gray-500 text-xs mb-3">{member.expertise}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ContactCTA />
    </>
  )
}
