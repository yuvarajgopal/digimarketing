'use client'

import { motion } from 'framer-motion'
import { Phone, Mail, MapPin, Clock, Instagram, Facebook, Linkedin, Calendar, MessageCircle } from 'lucide-react'
import ContactForm from '@/components/marketing/shared/ContactForm'
import { fadeInUp, staggerContainer, viewportConfig } from '@/utils/marketing-animations'

const contactInfo = [
  { Icon: Phone,         label: 'Call Us',     value: '+91 98765 43210',      sub: 'Mon–Sat, 9am–7pm IST',  href: 'tel:+919876543210',             color: 'from-blue-600 to-violet-500'  },
  { Icon: Mail,          label: 'Email Us',    value: 'info@digicampaign.ai', sub: 'Reply within 2 hours',  href: 'mailto:info@digicampaign.ai',   color: 'from-pink-500 to-rose-500'    },
  { Icon: MapPin,        label: 'Visit Us',    value: 'Chennai, Tamil Nadu',  sub: 'India 600001',          href: '#map',                          color: 'from-orange-500 to-amber-500' },
  { Icon: MessageCircle, label: 'Chat With Us',value: 'WhatsApp Us',          sub: 'Instant reply on chat', href: 'https://wa.me/919876543210',     color: 'from-green-500 to-emerald-500'},
]

const officeHours = [
  { day: 'Monday – Friday', hours: '9:00 AM – 7:00 PM IST' },
  { day: 'Saturday', hours: '10:00 AM – 4:00 PM IST' },
  { day: 'Sunday', hours: 'Emergency support only' },
]

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-24 bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <motion.div variants={fadeInUp} className="section-badge mx-auto inline-flex mb-6">
              <span className="glow-dot" /> Let&apos;s Talk Growth
            </motion.div>
            <motion.h1 variants={fadeInUp} className="font-display font-bold text-white leading-tight mb-5" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
              Start Your <span className="gradient-text">Growth Journey</span> Today
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-gray-400 text-lg max-w-xl mx-auto">
              Book a free 30-minute strategy call. We&apos;ll audit your current marketing and hand you a custom roadmap — no strings attached.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Contact cards */}
      <section className="py-6 bg-dark-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-4">
            {contactInfo.map(({ Icon, label, value, sub, href, color }, i) => (
              <motion.a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={viewportConfig} transition={{ delay: i * 0.08 }}
                className="glass-card rounded-2xl p-5 flex flex-col items-center text-center hover:border-blue-500/30 transition-all group w-[calc(50%-8px)] md:w-56">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-gray-500 text-xs mb-1">{label}</p>
                <p className="text-white font-semibold text-sm">{value}</p>
                <p className="text-gray-600 text-xs mt-0.5">{sub}</p>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Form + Sidebar */}
      <section className="py-20 bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={viewportConfig} transition={{ duration: 0.6 }} className="lg:col-span-2">
              <div className="glass-card rounded-3xl p-8">
                <h2 className="font-display font-bold text-white text-2xl mb-2">Send Us a Message</h2>
                <p className="text-gray-400 text-sm mb-8">Fill in the form below and we&apos;ll get back to you within 2 hours.</p>
                <ContactForm />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={viewportConfig} transition={{ duration: 0.6, delay: 0.1 }} className="space-y-6">
              <div className="glass-card rounded-2xl p-6 border border-blue-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Book a Strategy Call</p>
                    <p className="text-gray-500 text-xs">Free 30-min session</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4">Pick a time that works for you. We&apos;ll do a deep-dive on your business and marketing goals.</p>
                <button className="btn-primary w-full justify-center text-sm py-3">
                  <Calendar className="w-4 h-4" /> Schedule Free Call
                </button>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <h3 className="text-white font-semibold text-sm">Office Hours</h3>
                </div>
                <div className="space-y-3">
                  {officeHours.map(({ day, hours }) => (
                    <div key={day} className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">{day}</span>
                      <span className="text-white text-xs font-medium">{hours}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-white font-semibold text-sm mb-4">Follow Us</h3>
                <div className="flex gap-3">
                  {[
                    { Icon: Instagram, href: '#', color: 'from-pink-500 to-rose-500' },
                    { Icon: Facebook, href: '#', color: 'from-blue-600 to-blue-500' },
                    { Icon: Linkedin, href: '#', color: 'from-blue-700 to-blue-600' },
                  ].map(({ Icon, href, color }, i) => (
                    <a key={i} href={href} className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center hover:scale-110 transition-transform`}>
                      <Icon className="w-4 h-4 text-white" />
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  )
}
