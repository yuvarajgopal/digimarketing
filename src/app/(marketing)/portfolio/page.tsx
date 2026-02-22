'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye } from 'lucide-react'
import { staggerContainer, viewportConfig } from '@/utils/marketing-animations'
import ContactCTA from '@/components/marketing/home/ContactCTA'

const categories = ['All', 'Websites', 'Social Media', 'Ad Creatives', 'Campaigns']

const portfolioItems = [
  { id: 1, category: 'Websites', tag: 'E-Commerce', title: 'LuxeStyle Fashion Store', client: 'LuxeStyle', description: 'High-converting Shopify store with 4.2s → 1.1s load time, custom UX, and 3x checkout rate.', metrics: ['Page Speed: 98/100', 'Conversion: +340%', 'Bounce Rate: -45%'], color: 'from-pink-500 to-violet-500', mockup: '🛍️' },
  { id: 2, category: 'Websites', tag: 'SaaS', title: 'NovaTech SaaS Platform', client: 'NovaTech', description: 'Modern SaaS landing page with demo booking flow, resulting in 68% more demo requests.', metrics: ['Demo Bookings: +68%', 'Time on Page: +3.2m', 'Signups: +127%'], color: 'from-blue-600 to-cyan-500', mockup: '💻' },
  { id: 3, category: 'Websites', tag: 'Healthcare', title: 'HealthFirst Clinic Portal', client: 'HealthFirst', description: 'Patient-facing website with appointment booking, telehealth integration, and live chat.', metrics: ['Appointments: +89%', 'Online Leads: 200/mo', 'Patient Satisfaction: 94%'], color: 'from-emerald-500 to-teal-500', mockup: '🏥' },
  { id: 4, category: 'Social Media', tag: 'Fashion', title: 'LuxeStyle Instagram Growth', client: 'LuxeStyle', description: '6-month Instagram strategy taking account from 10K to 85K with 4.7% engagement rate.', metrics: ['Followers: +750%', 'Engagement: 4.7%', 'DMs: 200+/week'], color: 'from-pink-500 to-rose-500', mockup: '📸' },
  { id: 5, category: 'Social Media', tag: 'Food', title: 'UrbanEats Social Strategy', client: 'UrbanEats', description: 'Reels-first content strategy with UGC campaigns, driving 500%+ organic reach growth.', metrics: ['Reach: +500%', 'UGC Content: 50+ pieces', 'Orders from social: +230%'], color: 'from-orange-500 to-amber-500', mockup: '🍕' },
  { id: 6, category: 'Ad Creatives', tag: 'Lead Gen', title: 'EduGrowth Ad Creatives', client: 'EduGrowth', description: '30+ high-performing ad creatives for Meta campaigns — video, carousel, and static formats.', metrics: ['CTR: 4.2% (avg)', 'CPC: ₹12 (avg)', 'Conversion: 8.4%'], color: 'from-blue-500 to-indigo-500', mockup: '🎓' },
  { id: 7, category: 'Ad Creatives', tag: 'Real Estate', title: 'RealtyCo Property Ads', client: 'RealtyCo', description: 'Hyper-targeted Facebook lead ads with professional property showcases and virtual tours.', metrics: ['Leads: 180/month', 'CPL: ₹750', 'Lead Quality: 82%'], color: 'from-emerald-500 to-green-500', mockup: '🏠' },
  { id: 8, category: 'Campaigns', tag: 'Product Launch', title: 'FitLife Supplement Launch', client: 'FitLife', description: 'Full 360° product launch campaign: pre-launch buzz, launch day sales, and post-launch scale.', metrics: ['Launch Revenue: ₹18.5L', 'ROAS: 6.2x', 'Units Sold: 3,200'], color: 'from-violet-500 to-purple-600', mockup: '💪' },
  { id: 9, category: 'Campaigns', tag: 'Seasonal', title: 'QuickMart Festive Campaign', client: 'QuickMart', description: 'Diwali sale campaign across Meta, Google, and email — highest revenue month ever.', metrics: ['Revenue: ₹42L', 'ROAS: 8.1x', 'New Customers: 2,800'], color: 'from-yellow-500 to-orange-500', mockup: '🎉' },
]

export default function PortfolioPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const filtered = activeCategory === 'All' ? portfolioItems : portfolioItems.filter(i => i.category === activeCategory)

  return (
    <>
      {/* Hero */}
      <section className="py-24 bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <motion.div className="section-badge mx-auto inline-flex mb-6">
              <span className="glow-dot" /> Our Work
            </motion.div>
            <motion.h1 className="font-display font-bold text-white leading-tight mb-5" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
              Work That <span className="gradient-text">Speaks for Itself</span>
            </motion.h1>
            <motion.p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A curated selection of websites, campaigns, and creatives that have delivered measurable results for our clients.
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

      {/* Grid */}
      <section className="py-20 bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filtered.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="glass-card rounded-2xl overflow-hidden group hover:border-white/15 transition-all duration-300"
                >
                  <div className={`h-40 bg-gradient-to-br ${item.color} relative overflow-hidden flex items-center justify-center`}>
                    <span className="text-6xl">{item.mockup}</span>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/40 text-white backdrop-blur-sm">{item.tag}</span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500 font-medium">{item.category}</span>
                      <span className="text-gray-700">·</span>
                      <span className="text-xs text-gray-500">{item.client}</span>
                    </div>
                    <h3 className="text-white font-display font-bold text-base mb-2 group-hover:text-blue-300 transition-colors">{item.title}</h3>
                    <p className="text-gray-400 text-xs leading-relaxed mb-4">{item.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.metrics.map((m) => (
                        <span key={m} className="px-2 py-1 rounded-lg bg-dark-700 text-gray-400 text-xs">{m}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <ContactCTA />
    </>
  )
}
