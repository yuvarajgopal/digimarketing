export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">

      {/* ── Left panel — dark navy branding panel ───────────── */}
      <div className="hidden lg:flex lg:w-[50%] relative overflow-hidden gradient-hero">

        {/* Subtle geometric background elements */}
        <div className="absolute inset-0">
          {/* Large decorative circles — geometric */}
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full border border-white/[0.04]" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full border border-white/[0.05]" />
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full border border-white/[0.03]" />
          <div className="absolute top-1/3 right-1/4 w-[200px] h-[200px] rounded-full border border-blue-500/10" />
          {/* Subtle blue glow */}
          <div className="absolute bottom-1/3 -left-20 w-[400px] h-[300px] rounded-full bg-blue-600/[0.08] blur-[80px]" />
          <div className="absolute top-1/4 right-0 w-[300px] h-[300px] rounded-full bg-indigo-500/[0.08] blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col justify-between px-12 xl:px-16 py-12 text-white w-full">

          {/* Top: Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-blue shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 10l5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-[18px] leading-tight tracking-tight text-white">
                DigiCampaign
              </span>
              <span className="text-[10px] text-white/45 leading-tight">An Infra Delta Solutions Company</span>
            </div>
          </div>

          {/* Center: Hero copy */}
          <div className="my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25 mb-8">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-blue-300 tracking-[0.15em] uppercase">
                AI Creative Platform
              </span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-heading font-bold leading-[1.1] mb-5 tracking-tight text-white">
              Create campaigns<br />
              that <span className="gradient-text-neon">actually convert.</span>
            </h1>

            <p className="text-[15px] text-white/50 max-w-sm leading-relaxed mb-10">
              The AI-powered creative platform for marketing agencies. Generate,
              schedule, and publish high-performing content across every channel.
            </p>

            {/* Feature list */}
            <div className="flex flex-col gap-3.5">
              {[
                "AI-generated ad creatives in seconds",
                "Publish to 8+ platforms simultaneously",
                "Real-time analytics and reporting",
                "Client collaboration and approvals",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 shrink-0">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[14px] text-white/65 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Stats row */}
          <div className="flex items-center gap-8 pt-8 border-t border-white/[0.08]">
            {[
              { value: "8+",   label: "Platforms" },
              { value: "AI",   label: "Powered"   },
              { value: "∞",    label: "Creatives"  },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-8">
                {i > 0 && <div className="w-px h-8 bg-white/[0.08]" />}
                <div>
                  <div className="text-2xl font-heading font-bold gradient-text-neon">{stat.value}</div>
                  <div className="text-[11px] text-white/35 mt-0.5 tracking-widest uppercase">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — clean white login form ──────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-blue-500/[0.02]" />
        <div className="relative z-10 w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  );
}
