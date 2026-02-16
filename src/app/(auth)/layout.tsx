export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - Modern AI branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-hero">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[100px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/8 blur-[80px] animate-float" style={{ animationDelay: "3s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-emerald-500/5 blur-[60px] animate-float" style={{ animationDelay: "1.5s" }} />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-blue shadow-xl shadow-blue-500/25">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-heading font-semibold tracking-tight">DigiMarketing</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1 w-1 rounded-full bg-[#00FF87] animate-pulse" />
                <span className="text-[10px] font-medium text-blue-300/60 tracking-widest uppercase">AI Creative Platform</span>
              </div>
            </div>
          </div>

          {/* Hero text */}
          <h1 className="text-5xl font-heading font-bold leading-[1.1] mb-5">
            <span className="text-white">Create ads that</span>
            <br />
            <span className="gradient-text">convert instantly.</span>
          </h1>
          <p className="text-base text-white/50 max-w-md leading-relaxed">
            AI-powered creative platform for agencies. Generate, optimize, and publish high-performing ad creatives across all channels.
          </p>

          {/* Stats */}
          <div className="mt-16 flex gap-10">
            <div className="group">
              <div className="text-3xl font-heading font-bold text-white group-hover:gradient-text transition-all">5+</div>
              <div className="text-xs text-white/30 mt-1 tracking-wide uppercase">Platforms</div>
            </div>
            <div className="w-px bg-white/10" />
            <div className="group">
              <div className="text-3xl font-heading font-bold text-white group-hover:gradient-text transition-all">AI</div>
              <div className="text-xs text-white/30 mt-1 tracking-wide uppercase">Powered</div>
            </div>
            <div className="w-px bg-white/10" />
            <div className="group">
              <div className="text-3xl font-heading font-bold text-white group-hover:gradient-text transition-all">Real-time</div>
              <div className="text-xs text-white/30 mt-1 tracking-wide uppercase">Analytics</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-background px-6">
        {children}
      </div>
    </div>
  );
}
