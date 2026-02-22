'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { caseStudies } from '@/data/marketing/caseStudies'
import { fadeInUp, staggerContainer, viewportConfig } from '@/utils/marketing-animations'
import SectionTitle from '../shared/SectionTitle'

export default function CaseStudiesPreview() {
  const preview = caseStudies.slice(0, 3)

  return (
    <section className="py-24 bg-dark-800 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-pink-600/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Case Studies"
          title="Campaigns That"
          highlight="Delivered Results"
          subtitle="Real campaigns. Real results. See how we've transformed businesses across industries."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {preview.map((study) => (
            <motion.div
              key={study.id}
              variants={fadeInUp}
              className="glass-card rounded-2xl overflow-hidden group hover:border-white/15 transition-all duration-300"
            >
              <div className={`h-3 bg-gradient-to-r ${study.color}`} />
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${study.color} text-white`}>
                    {study.tag}
                  </span>
                  <span className="text-gray-500 text-xs">{study.duration}</span>
                </div>
                <h3 className="text-white font-display font-bold text-lg mb-1">{study.client}</h3>
                <p className="text-gray-500 text-sm mb-4">{study.service}</p>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {study.results.slice(0, 4).map((r) => (
                    <div key={r.label} className="bg-dark-700/60 rounded-xl p-3">
                      <p className="text-blue-400 font-bold text-lg leading-none">{r.value}</p>
                      <p className="text-gray-500 text-xs mt-1">{r.label}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/5 pt-4">
                  <p className="text-gray-400 text-sm italic mb-2">&ldquo;{study.quote}&rdquo;</p>
                  <p className="text-gray-600 text-xs">— {study.author}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportConfig}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <Link href="/case-studies" className="btn-secondary inline-flex items-center gap-2">
            View All Case Studies <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
