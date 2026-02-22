'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogIn } from 'lucide-react'
import Logo from '../shared/Logo'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Home',         href: '/'            },
  { label: 'About',        href: '/about'        },
  { label: 'Services',     href: '/services'     },
  { label: 'Case Studies', href: '/case-studies' },
  { label: 'Portfolio',    href: '/portfolio'    },
  { label: 'Pricing',      href: '/pricing'      },
  { label: 'Contact',      href: '/contact'      },
]

function isActiveLink(href: string, pathname: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export default function MarketingNavbar() {
  const [isOpen, setIsOpen]   = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setIsOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background:     scrolled ? 'rgba(13,24,41,0.97)' : 'rgba(13,24,41,0.80)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderBottom:   scrolled
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(255,255,255,0.04)',
          boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.45)' : 'none',
        }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">

            {/* ── Logo ─────────────────────────────────────────── */}
            <Logo />

            {/* ── Desktop Nav — app-style rounded items ────────── */}
            <div className="hidden lg:flex items-center gap-0.5">
              {navLinks.map((link) => {
                const active = isActiveLink(link.href, pathname)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'relative flex items-center px-4 py-2 rounded-lg text-[15px] font-semibold transition-all duration-150 border',
                      active
                        ? 'text-white border-blue-500/25 bg-blue-600/[0.18]'
                        : 'text-white/55 border-transparent hover:text-white hover:bg-white/[0.07]'
                    )}
                  >
                    {/* Blue gradient underline — same indicator as app topbar */}
                    {active && (
                      <span className="absolute bottom-[3px] left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />
                    )}
                    {link.label}
                  </Link>
                )
              })}
            </div>

            {/* ── CTA Buttons ──────────────────────────────────── */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border:     '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <LogIn className="w-4 h-4" />
                Login
              </Link>
              <Link href="/contact" className="btn-primary text-sm py-2.5 px-5 whitespace-nowrap">
                Free Consultation
              </Link>
            </div>

            {/* ── Mobile Toggle ─────────────────────────────────── */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-xl text-white/60 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </motion.header>

      {/* ── Mobile Menu ──────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 flex flex-col lg:hidden"
              style={{ background: '#0D1829', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Drawer header */}
              <div
                className="flex items-center justify-between p-5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Logo size="sm" />
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg text-white/50 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer nav */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {navLinks.map((link, i) => {
                  const active = isActiveLink(link.href, pathname)
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        href={link.href}
                        className={cn(
                          'relative flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all duration-150 border',
                          active
                            ? 'text-white bg-blue-600/[0.18] border-blue-500/30'
                            : 'text-white/55 hover:text-white hover:bg-white/[0.06] border-transparent'
                        )}
                      >
                        {/* Left-side gradient bar for mobile active */}
                        {active && (
                          <span
                            className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-500"
                          />
                        )}
                        {link.label}
                      </Link>
                    </motion.div>
                  )
                })}
              </div>

              {/* Drawer footer */}
              <div
                className="p-4 space-y-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border:     '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <LogIn className="w-4 h-4" />
                  Login to Dashboard
                </Link>
                <Link href="/contact" className="btn-primary w-full justify-center text-sm">
                  Free Consultation
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
