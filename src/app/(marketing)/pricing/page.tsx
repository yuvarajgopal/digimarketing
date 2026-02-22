'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Check, X, ArrowRight, Zap } from 'lucide-react'
import { pricingPlans } from '@/data/marketing/pricing'
import SectionTitle from '@/components/marketing/shared/SectionTitle'
import { fadeInUp, staggerContainer, viewportConfig } from '@/utils/marketing-animations'

const faqs = [
  { q: 'Is there a minimum contract period?', a: "Our standard engagement is month-to-month with no lock-in. For best results and pricing, most clients choose 3 or 6-month packages." },
  { q: 'Does the monthly fee include ad spend?', a: "No. Our service fees cover strategy, management, and execution. Ad spend is separate and goes directly to Meta/Google — we never mark it up." },
  { q: 'Can I upgrade or downgrade my plan?', a: "Absolutely. You can change your plan at the start of any new billing month. We'll prorate any adjustments." },
  { q: 'What is the onboarding process like?', a: "After signing up, we schedule a kickoff call, complete a brand audit, set up tracking, and launch your first campaigns within 7 business days." },
  { q: 'Do you offer custom plans?', a: "Yes! If your needs don't fit the standard tiers, we build fully custom packages. Book a call and we'll design a solution around your goals and budget." },
]

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.07 }} className="glass-card rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left">
        <span className="text-white font-medium text-sm pr-4">{q}</span>
        <span className={`text-blue-400 text-xl transition-transform duration-300 shrink-0 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </motion.div>
  )
}

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'quarterly'>('monthly')

  return (
    <>
      {/* Hero */}
      <section className="py-24 bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <motion.div variants={fadeInUp} className="section-badge mx-auto inline-flex mb-6">
              <span className="glow-dot" /> Transparent Pricing
            </motion.div>
            <motion.h1 variants={fadeInUp} className="font-display font-bold text-white leading-tight mb-5" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
              Invest in Growth. <span className="gradient-text">See Real Returns.</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-gray-400 text-lg max-w-xl mx-auto mb-8">
              Flexible plans for every stage of business. No hidden fees, no surprises — just results-driven marketing at a price that makes sense.
            </motion.p>
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-3 glass-card rounded-xl p-1">
              <button onClick={() => setBilling('monthly')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Monthly</button>
              <button onClick={() => setBilling('quarterly')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${billing === 'quarterly' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
                Quarterly
                <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-xs font-bold">-15%</span>
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 bg-dark-800 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`relative rounded-2xl overflow-hidden ${plan.popular ? 'ring-2 ring-blue-500 shadow-glow-lg' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 py-1.5 text-center text-xs font-bold text-white bg-gradient-to-r from-blue-700 to-violet-600 uppercase tracking-widest z-10">
                    Most Popular
                  </div>
                )}
                <div className={`glass-card h-full p-8 flex flex-col ${plan.popular ? 'pt-12' : ''}`}>
                  <div className="mb-6">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-white font-display font-bold text-xl mb-1">{plan.name}</h3>
                    <p className="text-gray-500 text-sm">{plan.tagline}</p>
                  </div>
                  <div className="mb-6 pb-6 border-b border-white/5">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-display font-bold text-white">
                        {billing === 'quarterly'
                          ? `₹${Math.round(parseInt(plan.price.replace(/[₹,]/g, '')) * 0.85).toLocaleString('en-IN')}`
                          : plan.price}
                      </span>
                      <span className="text-gray-400 mb-1">{plan.period}</span>
                    </div>
                    {billing === 'quarterly' && <p className="text-green-400 text-sm mt-1 font-medium">Save 15% with quarterly billing</p>}
                  </div>
                  <div className="space-y-3 flex-1 mb-8">
                    {plan.features.map((feature) => (
                      <div key={feature.text} className="flex items-center gap-3">
                        {feature.included ? <Check className="w-4 h-4 text-blue-400 shrink-0" /> : <X className="w-4 h-4 text-gray-700 shrink-0" />}
                        <span className={`text-sm ${feature.included ? 'text-gray-300' : 'text-gray-600'}`}>{feature.text}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/contact" className={`w-full py-3.5 rounded-xl font-semibold text-center text-sm transition-all duration-300 ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}>
                    {plan.cta}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={viewportConfig} transition={{ delay: 0.3 }} className="mt-8 glass-card rounded-2xl p-8 text-center border border-dashed border-white/15">
            <h3 className="text-white font-display font-bold text-xl mb-2">Need a Custom Plan?</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-lg mx-auto">Enterprise clients, agencies, and businesses with unique needs get fully custom packages tailored to their goals, team size, and budget.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact" className="btn-primary inline-flex">
                Let&apos;s Build Your Custom Plan <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle badge="Common Questions" title="Everything You Need to" highlight="Know" subtitle="Answers to the questions we get asked most often about our plans and process." />
          <div className="space-y-3">
            {faqs.map((faq, i) => <FAQItem key={faq.q} {...faq} index={i} />)}
          </div>
        </div>
      </section>
    </>
  )
}
