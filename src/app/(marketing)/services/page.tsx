'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { services } from '@/data/marketing/services'
import SectionTitle from '@/components/marketing/shared/SectionTitle'
import { fadeInUp, staggerContainer, viewportConfig } from '@/utils/marketing-animations'
import ContactCTA from '@/components/marketing/home/ContactCTA'

export default function ServicesPage() {
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const el = document.querySelector(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <>
      {/* Hero */}
      <section className="py-24 bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <motion.div variants={fadeInUp} className="section-badge mx-auto inline-flex mb-6">
              <span className="glow-dot" /> Full-Stack Digital Marketing
            </motion.div>
            <motion.h1 variants={fadeInUp} className="font-display font-bold text-white leading-tight mb-5" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
              Services Built to <span className="gradient-text">Drive Revenue</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
              Every service is designed around one goal: getting you more customers, more revenue, and a stronger market position.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-2">
              {services.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="px-3.5 py-1.5 rounded-full text-xs font-medium glass-card border border-white/10 text-gray-400 hover:text-white hover:border-blue-500/40 transition-all">
                  {s.title}
                </a>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Service Sections */}
      {services.map((service, i) => {
        const Icon = service.icon
        const isEven = i % 2 === 0
        return (
          <section key={service.id} id={service.id} className={`py-20 relative overflow-hidden ${isEven ? 'bg-dark-900' : 'bg-dark-800'}`} style={{ scrollMarginTop: '80px' }}>
            <div className="absolute inset-0 grid-bg opacity-20" />
            <div className="absolute top-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl" style={{ [isEven ? 'left' : 'right']: '-8rem', background: service.bgGlow }} />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className={`grid lg:grid-cols-2 gap-16 items-center ${!isEven ? 'lg:grid-flow-dense' : ''}`}>
                <motion.div initial={{ opacity: 0, x: isEven ? -40 : 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={viewportConfig} transition={{ duration: 0.6 }} className={!isEven ? 'lg:col-start-2' : ''}>
                  {service.tag && (
                    <span className="inline-flex mb-3 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 to-violet-500 text-white">{service.tag}</span>
                  )}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-5 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="font-display font-bold text-white text-3xl mb-4">{service.title}</h2>
                  <p className="text-gray-400 text-base leading-relaxed mb-8">{service.description}</p>
                  <div className="space-y-3 mb-8">
                    {service.benefits.map((benefit) => (
                      <div key={benefit} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                        <span className="text-gray-300 text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/contact" className="btn-primary inline-flex">
                    Get Started with {service.title.split(' ')[0]} <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: isEven ? 40 : -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={viewportConfig} transition={{ duration: 0.6, delay: 0.1 }} className={!isEven ? 'lg:col-start-1 lg:row-start-1' : ''}>
                  <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(ellipse at 70% 30%, ${service.bgGlow}, transparent)` }} />
                    <div className="relative z-10">
                      <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${service.color} flex items-center justify-center mx-auto mb-6 shadow-glow`}>
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-white font-display font-bold text-xl text-center mb-6">{service.shortDesc}</h3>
                      <div className="space-y-3">
                        {service.benefits.map((b, idx) => (
                          <motion.div key={b} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.07 }} className="flex items-center gap-3 bg-white/3 rounded-xl px-4 py-2.5">
                            <span className={`w-6 h-6 rounded-md bg-gradient-to-br ${service.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{idx + 1}</span>
                            <span className="text-gray-300 text-sm">{b}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        )
      })}

      <ContactCTA />
    </>
  )
}
