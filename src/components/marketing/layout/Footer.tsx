'use client'

import Link from 'next/link'
import {
  Mail, Phone, MapPin, Instagram, Facebook, Linkedin, Twitter,
  Youtube, ArrowRight,
} from 'lucide-react'
import Logo from '../shared/Logo'

const footerLinks: Record<string, { label: string; href: string }[]> = {
  Services: [
    { label: 'Social Media Marketing', href: '/services#social-media'   },
    { label: 'Performance Ads',         href: '/services#performance-ads' },
    { label: 'Lead Generation',         href: '/services#lead-generation' },
    { label: 'Website Development',     href: '/services#web-development' },
    { label: 'CRM & Automation',        href: '/services#automation'      },
    { label: 'Analytics & Reporting',   href: '/services#analytics'       },
  ],
  Company: [
    { label: 'About Us',      href: '/about'        },
    { label: 'Case Studies',  href: '/case-studies' },
    { label: 'Portfolio',     href: '/portfolio'    },
    { label: 'Blog',          href: '/blog'         },
    { label: 'Pricing',       href: '/pricing'      },
    { label: 'Contact',       href: '/contact'      },
  ],
  Legal: [
    { label: 'Privacy Policy',  href: '#' },
    { label: 'Terms of Service',href: '#' },
    { label: 'Cookie Policy',   href: '#' },
    { label: 'Refund Policy',   href: '#' },
  ],
}

const socials = [
  { Icon: Instagram, href: '#', label: 'Instagram' },
  { Icon: Facebook,  href: '#', label: 'Facebook'  },
  { Icon: Linkedin,  href: '#', label: 'LinkedIn'  },
  { Icon: Twitter,   href: '#', label: 'Twitter'   },
  { Icon: Youtube,   href: '#', label: 'YouTube'   },
]

export default function MarketingFooter() {
  return (
    <footer className="relative bg-dark-800 border-t border-white/5 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      <div className="absolute -top-32 left-1/4 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />

      {/* Newsletter strip */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-display font-bold text-white mb-1">
                Get marketing insights in your inbox
              </h3>
              <p className="text-gray-400 text-sm">Weekly strategies, case studies & growth tips — no fluff.</p>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 md:w-64 px-4 py-2.5 rounded-xl bg-dark-700 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button type="submit" className="btn-primary py-2.5 px-5 text-sm whitespace-nowrap">
                Subscribe <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Logo className="mb-5" />
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
              We help startups, SMEs, and enterprises grow their digital presence with
              data-driven marketing strategies that deliver measurable ROI.
            </p>
            <div className="space-y-3">
              <a href="tel:+919876543210" className="flex items-center gap-3 text-sm text-gray-400 hover:text-blue-400 transition-colors">
                <Phone className="w-4 h-4 text-blue-500 shrink-0" />
                +91 98765 43210
              </a>
              <a href="mailto:info@digicampaign.ai" className="flex items-center gap-3 text-sm text-gray-400 hover:text-blue-400 transition-colors">
                <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                info@digicampaign.ai
              </a>
              <div className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Chennai, Tamil Nadu, India 600001</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              {socials.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-gray-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold text-sm mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-sm">© 2025 DigiCampaign. All rights reserved.</p>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>Trusted by</span>
            <span className="text-blue-400 font-semibold">500+</span>
            <span>businesses across India</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
