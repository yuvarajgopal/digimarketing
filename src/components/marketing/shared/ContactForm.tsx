'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const businessTypes = [
  'Startup', 'Small Business', 'SME', 'Enterprise',
  'E-commerce', 'Healthcare', 'Real Estate', 'Education',
  'Fashion & Retail', 'Food & Beverage', 'Technology', 'Other',
]

const serviceOptions = [
  'Social Media Marketing', 'Performance Ads (Meta/Google)',
  'Lead Generation', 'Website Development',
  'Product Promotion', 'CRM & Email Automation',
  'Analytics & Reporting', 'Full Marketing Package',
]

interface FormState {
  name: string
  email: string
  phone: string
  businessType: string
  service: string
  message: string
}

function validate(form: FormState) {
  const errors: Partial<Record<keyof FormState, string>> = {}
  if (!form.name.trim()) errors.name = 'Name is required'
  if (!form.email.trim()) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email'
  if (!form.phone.trim()) errors.phone = 'Phone is required'
  else if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, ''))) errors.phone = 'Enter a valid Indian mobile number'
  if (!form.businessType) errors.businessType = 'Please select business type'
  if (!form.message.trim()) errors.message = 'Message is required'
  else if (form.message.trim().length < 20) errors.message = 'Please tell us more (min 20 chars)'
  return errors
}

export default function ContactForm({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const [form, setForm] = useState<FormState>({
    name: '', email: '', phone: '', businessType: '', service: '', message: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})

  const isDark = variant === 'dark'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (touched[name as keyof FormState]) {
      const newErrors = validate({ ...form, [name]: value })
      setErrors(e => ({ ...e, [name]: newErrors[name as keyof FormState] }))
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target
    setTouched(t => ({ ...t, [name]: true }))
    const newErrors = validate(form)
    setErrors(e => ({ ...e, [name]: newErrors[name as keyof FormState] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const allTouched = Object.keys(form).reduce((acc, k) => ({ ...acc, [k]: true }), {} as Record<string, boolean>)
    setTouched(allTouched)
    const validationErrors = validate(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setStatus('loading')
    await new Promise(r => setTimeout(r, 1500))
    setStatus('success')
  }

  const inputBase = `w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none ${
    isDark
      ? 'bg-dark-700 border text-white placeholder-gray-500 focus:border-blue-500 focus:bg-dark-600'
      : 'bg-white border text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
  }`

  const getInputClass = (field: keyof FormState) =>
    `${inputBase} ${
      errors[field] && touched[field]
        ? 'border-red-500/70'
        : isDark ? 'border-white/10' : 'border-gray-200'
    }`

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h3 className="text-2xl font-display font-bold text-white mb-3">
          You&apos;re on our radar! 🚀
        </h3>
        <p className="text-gray-400 max-w-sm mx-auto">
          Thanks for reaching out. Our team will get back to you within 2 business hours.
        </p>
        <button
          onClick={() => {
            setStatus('idle')
            setForm({ name: '', email: '', phone: '', businessType: '', service: '', message: '' })
            setTouched({})
          }}
          className="mt-6 btn-secondary text-sm"
        >
          Send Another Message
        </button>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Full Name *
          </label>
          <input name="name" value={form.name} onChange={handleChange} onBlur={handleBlur}
            placeholder="John Doe" className={getInputClass('name')} />
          {errors.name && touched.name && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.name}
            </p>
          )}
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Email Address *
          </label>
          <input type="email" name="email" value={form.email} onChange={handleChange} onBlur={handleBlur}
            placeholder="john@company.com" className={getInputClass('email')} />
          {errors.email && touched.email && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Phone Number *
          </label>
          <input name="phone" value={form.phone} onChange={handleChange} onBlur={handleBlur}
            placeholder="98765 43210" className={getInputClass('phone')} />
          {errors.phone && touched.phone && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.phone}
            </p>
          )}
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Business Type *
          </label>
          <select name="businessType" value={form.businessType} onChange={handleChange} onBlur={handleBlur}
            className={`${getInputClass('businessType')} ${isDark ? 'bg-dark-700' : 'bg-white'}`}>
            <option value="">Select type...</option>
            {businessTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.businessType && touched.businessType && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.businessType}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Service You&apos;re Interested In
        </label>
        <select name="service" value={form.service} onChange={handleChange}
          className={`${getInputClass('service')} ${isDark ? 'bg-dark-700' : 'bg-white'}`}>
          <option value="">Select a service...</option>
          {serviceOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Tell Us About Your Goals *
        </label>
        <textarea name="message" value={form.message} onChange={handleChange} onBlur={handleBlur}
          rows={4}
          placeholder="Describe your business, current challenges, and what you want to achieve..."
          className={`${getInputClass('message')} resize-none`}
        />
        {errors.message && touched.message && (
          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.message}
          </p>
        )}
      </div>

      <button type="submit" disabled={status === 'loading'} className="btn-primary w-full justify-center py-3.5 text-base">
        {status === 'loading' ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
        ) : (
          <><Send className="w-5 h-5" /> Send Message & Book Consultation</>
        )}
      </button>

      <p className={`text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        🔒 Your information is safe. We never share your data.
      </p>
    </form>
  )
}
