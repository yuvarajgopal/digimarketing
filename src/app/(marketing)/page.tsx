import HeroSection from '@/components/marketing/home/HeroSection'
import ClientLogos from '@/components/marketing/home/ClientLogos'
import StatsCounter from '@/components/marketing/home/StatsCounter'
import ServicesPreview from '@/components/marketing/home/ServicesPreview'
import WhyChooseUs from '@/components/marketing/home/WhyChooseUs'
import CaseStudiesPreview from '@/components/marketing/home/CaseStudiesPreview'
import Testimonials from '@/components/marketing/home/Testimonials'
import ContactCTA from '@/components/marketing/home/ContactCTA'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ClientLogos />
      <StatsCounter />
      <ServicesPreview />
      <WhyChooseUs />
      <CaseStudiesPreview />
      <Testimonials />
      <ContactCTA />
    </>
  )
}
