'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { testimonials } from '@/data/marketing/testimonials'
import { viewportConfig } from '@/utils/marketing-animations'
import SectionTitle from '../shared/SectionTitle'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-600'}>★</span>
      ))}
    </div>
  )
}

export default function Testimonials() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)

  const goNext = () => {
    setDirection(1)
    setCurrent((c) => (c + 1) % testimonials.length)
  }

  const goPrev = () => {
    setDirection(-1)
    setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length)
  }

  const t = testimonials[current]

  return (
    <section className="py-24 bg-dark-900 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Client Stories"
          title="Real Results from"
          highlight="Real Businesses"
          subtitle="Don't take our word for it. Here's what our clients say about working with DigiCampaign."
        />

        {/* Desktop grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="hidden lg:grid grid-cols-3 gap-6"
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glass-card rounded-2xl p-6 flex flex-col group hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <StarRating rating={t.rating} />
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${t.color} text-white`}>
                  {t.metric}
                </span>
              </div>
              <Quote className="w-8 h-8 text-blue-500/40 mb-3" />
              <p className="text-gray-300 text-sm leading-relaxed flex-1 mb-5">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.role}, {t.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile carousel */}
        <div className="lg:hidden">
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                initial={{ opacity: 0, x: direction * 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -80 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <StarRating rating={t.rating} />
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${t.color} text-white`}>
                    {t.metric}
                  </span>
                </div>
                <Quote className="w-8 h-8 text-blue-500/40 mb-3" />
                <p className="text-gray-300 text-sm leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}, {t.company}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={goPrev}
              className="w-10 h-10 rounded-full glass-card border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500/40 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i) }}
                  className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-2 bg-blue-500' : 'w-2 h-2 bg-gray-600'}`}
                />
              ))}
            </div>
            <button
              onClick={goNext}
              className="w-10 h-10 rounded-full glass-card border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500/40 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
