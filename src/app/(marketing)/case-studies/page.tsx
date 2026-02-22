'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Quote } from 'lucide-react'
import { caseStudies } from '@/data/marketing/caseStudies'
import { fadeInUp, staggerContainer, viewportConfig } from '@/utils/marketing-animations'

const categories = ['All', 'E-Commerce', 'Fashion', 'EdTech', 'Real Estate', 'Healthcare']

function MetricBar({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-600 line-through">{before}</span>
        <ArrowRight className="w-3 h-3 text-gray-600" />
        <span className="text-green-400 font-bold">{after}</span>
      </div>
    </div>
  )
}

export default function CaseStudiesPage() {
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = activeCategory === 'All'
    ? caseStudies
    : caseStudies.filter(s => s.tag === activeCategory)

  return (
    <>
      {/* Hero */}
      <section className="py-24 bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <motion.div variants={fadeInUp} className="section-badge mx-auto inline-flex mb-6">
              <span className="glow-dot" /> Proven Results
            </motion.div>
            <motion.h1 variants={fadeInUp} className="font-display font-bold text-white leading-tight mb-5" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
              Real Campaigns. <span className="gradient-text">Real Results.</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-gray-400 text-lg max-w-2xl mx-auto">
              Every case study is a testament to what strategic, data-driven marketing can achieve. Browse the before-and-after results from our client campaigns.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Filter */}
      <section className="py-6 bg-dark-800 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${activeCategory === cat ? 'bg-blue-600 text-white shadow-glow' : 'glass-card text-gray-400 hover:text-white border border-white/10'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-20 bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div key={activeCategory} variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">
            {filtered.map((study) => (
              <motion.div key={study.id} variants={fadeInUp} className="glass-card rounded-3xl overflow-hidden">
                <div className={`h-1.5 bg-gradient-to-r ${study.color}`} />
                <div className="p-8">
                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* Context */}
                    <div className="lg:col-span-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${study.color} text-white`}>{study.tag}</span>
                        <span className="text-gray-500 text-xs">{study.duration}</span>
                      </div>
                      <h2 className="text-white font-display font-bold text-2xl mb-1">{study.client}</h2>
                      <p className="text-blue-400 text-sm font-medium mb-4">{study.service}</p>
                      <p className="text-gray-400 text-sm leading-relaxed mb-4">
                        <span className="text-gray-300 font-medium">Challenge: </span>{study.challenge}
                      </p>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        <span className="text-gray-300 font-medium">Solution: </span>{study.solution}
                      </p>
                    </div>

                    {/* Before/After */}
                    <div className="lg:col-span-1">
                      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Before vs After</h3>
                      <div className="glass-card rounded-2xl p-5">
                        {Object.entries(study.metrics.before).map(([key, val]) => (
                          <MetricBar
                            key={key}
                            label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                            before={val}
                            after={study.metrics.after[key as keyof typeof study.metrics.after] ?? ''}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Results */}
                    <div className="lg:col-span-1">
                      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Key Results</h3>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        {study.results.map((r) => (
                          <div key={r.label} className="bg-dark-700/60 rounded-xl p-4">
                            <p className={`font-bold text-xl bg-gradient-to-r ${study.color} bg-clip-text text-transparent`}>{r.value}</p>
                            <p className="text-gray-500 text-xs mt-1">{r.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="glass-card rounded-xl p-4 border-l-2" style={{ borderLeftColor: '#2563eb' }}>
                        <Quote className="w-5 h-5 text-blue-500/50 mb-2" />
                        <p className="text-gray-300 text-sm italic mb-2">&ldquo;{study.quote}&rdquo;</p>
                        <p className="text-gray-600 text-xs">— {study.author}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-dark-800">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={viewportConfig}>
            <h2 className="font-display font-bold text-white text-2xl md:text-3xl mb-4">Want Results Like These?</h2>
            <p className="text-gray-400 mb-8">Book a free strategy call and let&apos;s discuss how we can replicate these results for your business.</p>
            <Link href="/contact" className="btn-primary inline-flex text-base">
              Get Your Free Strategy Session <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  )
}
