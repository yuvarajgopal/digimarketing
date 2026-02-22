'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Search, Tag } from 'lucide-react'
import { blogPosts } from '@/data/marketing/blog'
import { viewportConfig } from '@/utils/marketing-animations'

const categories = ['All', 'Performance Marketing', 'Lead Generation', 'Social Media', 'Automation', 'SEO']

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [query, setQuery] = useState('')

  const filtered = blogPosts.filter((post) => {
    const matchCat = activeCategory === 'All' || post.category === activeCategory
    const matchQ = !query || post.title.toLowerCase().includes(query.toLowerCase()) || post.excerpt.toLowerCase().includes(query.toLowerCase())
    return matchCat && matchQ
  })

  const featured = blogPosts.filter(p => p.featured)

  return (
    <>
      {/* Hero */}
      <section className="py-24 bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div className="section-badge mx-auto inline-flex mb-6"><span className="glow-dot" /> Marketing Intelligence</motion.div>
          <motion.h1 className="font-display font-bold text-white leading-tight mb-5" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            Insights That <span className="gradient-text">Drive Growth</span>
          </motion.h1>
          <motion.p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            No-fluff strategies, case studies, and expert guides from our team of certified digital marketing professionals.
          </motion.p>
          <motion.div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-dark-700 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </motion.div>
        </div>
      </section>

      {/* Featured */}
      {!query && activeCategory === 'All' && (
        <section className="py-12 bg-dark-800 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-6">Featured Articles</p>
            <div className="grid md:grid-cols-2 gap-6">
              {featured.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={viewportConfig} transition={{ delay: i * 0.1 }} className="glass-card rounded-2xl overflow-hidden group hover:border-blue-500/30 transition-all">
                  <div className={`h-2 bg-gradient-to-r ${post.color}`} />
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${post.color} text-white`}>{post.tag}</span>
                      <span className="text-gray-500 text-xs">{post.category}</span>
                    </div>
                    <h2 className="text-white font-display font-bold text-xl mb-2 group-hover:text-blue-300 transition-colors">{post.title}</h2>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${post.color} flex items-center justify-center text-white text-xs font-bold`}>{post.author.initials}</div>
                        <div>
                          <p className="text-white text-xs font-medium">{post.author.name}</p>
                          <p className="text-gray-500 text-xs">{post.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <Clock className="w-3.5 h-3.5" /> {post.readTime}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category filter */}
      <section className="py-6 bg-dark-900 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${activeCategory === cat ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white glass-card border border-white/10'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Posts grid */}
      <section className="py-16 bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            {filtered.length > 0 ? (
              <motion.div key={`${activeCategory}-${query}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((post, i) => (
                  <motion.article key={post.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="glass-card rounded-2xl overflow-hidden group hover:border-white/15 transition-all duration-300 flex flex-col">
                    <div className={`h-1.5 bg-gradient-to-r ${post.color}`} />
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-dark-700 text-gray-400">
                          <Tag className="w-3 h-3" /> {post.tag}
                        </span>
                      </div>
                      <h3 className="text-white font-display font-bold text-base mb-2 group-hover:text-blue-300 transition-colors flex-1">{post.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">{post.excerpt}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${post.color} flex items-center justify-center text-white text-xs font-bold`}>{post.author.initials}</div>
                          <div>
                            <p className="text-white text-xs font-medium">{post.author.name}</p>
                            <p className="text-gray-500 text-xs">{post.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                          <Clock className="w-3 h-3" /> {post.readTime}
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <p className="text-gray-500 text-lg mb-4">No articles found</p>
                <button onClick={() => { setQuery(''); setActiveCategory('All') }} className="btn-secondary text-sm">Clear filters</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-dark-800">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={viewportConfig}>
            <h2 className="font-display font-bold text-white text-2xl mb-3">Never Miss an Insight</h2>
            <p className="text-gray-400 text-sm mb-6">Get our best marketing strategies delivered to your inbox every week. Join 5,000+ business owners who read DigiCampaign every Tuesday.</p>
            <form onSubmit={(e) => e.preventDefault()} className="flex gap-3 max-w-md mx-auto">
              <input type="email" placeholder="your@email.com" className="flex-1 px-4 py-3 rounded-xl bg-dark-700 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              <button type="submit" className="btn-primary py-3 px-5 text-sm whitespace-nowrap">Subscribe</button>
            </form>
          </motion.div>
        </div>
      </section>
    </>
  )
}
