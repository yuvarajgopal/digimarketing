'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { services } from '@/data/marketing/services'
import { fadeInUp, staggerContainer, viewportConfig } from '@/utils/marketing-animations'
import SectionTitle from '../shared/SectionTitle'

export default function ServicesPreview() {
  const preview = services.slice(0, 6)

  return (
    <section id="services" className="py-24 bg-dark-900 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Our Expertise"
          title="Everything You Need to"
          highlight="Dominate Your Market"
          subtitle="From social media to performance ads to full automation — we build and run your entire digital marketing engine."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4"
        >
          {preview.map((service) => {
            const Icon = service.icon
            return (
              <motion.div
                key={service.id}
                variants={fadeInUp}
                className="glass-card-hover rounded-2xl p-6 group relative overflow-hidden"
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                  style={{ background: `radial-gradient(ellipse at 30% 30%, ${service.bgGlow}, transparent 70%)` }}
                />
                <div className="relative z-10">
                  {service.tag && (
                    <span className="inline-flex mb-4 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/20">
                      {service.tag}
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-display font-bold text-lg mb-2 group-hover:text-blue-300 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-5">{service.shortDesc}</p>
                  <Link
                    href={`/services#${service.id}`}
                    className="inline-flex items-center gap-1.5 text-blue-400 text-sm font-medium hover:gap-2.5 transition-all duration-200"
                  >
                    Learn More <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportConfig}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <Link href="/services" className="btn-secondary inline-flex items-center gap-2">
            View All Services <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
