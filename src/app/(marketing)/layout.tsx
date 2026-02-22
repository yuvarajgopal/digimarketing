import MarketingNavbar from '@/components/marketing/layout/Navbar'
import MarketingFooter from '@/components/marketing/layout/Footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-root min-h-screen flex flex-col">
      <MarketingNavbar />
      <main className="flex-1 pt-[72px]">
        {children}
      </main>
      <MarketingFooter />
    </div>
  )
}
