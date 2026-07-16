"use client";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col font-body-md bg-background bg-grid-pattern">
      {/* Top Navigation */}
      <header className="bg-background/80 backdrop-blur-md text-primary font-body-md text-body-md sticky top-0 w-full z-40 border-b border-outline-variant shadow-sm flex justify-between items-center px-margin-desktop h-16">
        <div className="flex items-center gap-md">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
            <span className="material-symbols-outlined text-primary" data-icon="hub">hub</span>
          </div>
          <span className="font-headline-md text-headline-md font-bold text-on-surface">JOAT Intelligence</span>
        </div>
        <div className="hidden md:flex items-center gap-lg">
          <nav className="flex gap-md">
            <a className="text-on-surface-variant hover:text-primary transition-colors py-xs" href="#">Features</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors py-xs" href="#">Pricing</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors py-xs" href="#">Resources</a>
          </nav>
        </div>
        <div className="flex items-center gap-md">
          <Link href="/login"
            className="hidden md:flex text-on-surface-variant hover:text-primary transition-colors px-md py-xs rounded-lg border border-transparent hover:border-outline-variant">
            Sign In
          </Link>
          <Link href="/signup"
            className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-sm hover:bg-primary-fixed transition-colors active:scale-95 duration-150">
            Start Free
          </Link>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-2xl overflow-hidden relative">
        {/* Ambient Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

        {/* Hero Section */}
        <section className="w-full flex flex-col items-center text-center mt-2xl relative z-10">
          <div className="inline-flex items-center gap-sm px-md py-xs rounded-full border border-primary/30 bg-primary/10 mb-lg">
            <span className="material-symbols-outlined text-primary text-[16px]">temp_preferences_custom</span>
            <span className="font-mono-sm text-mono-sm text-primary">v2.0: Introducing Autonomous Workflows</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface max-w-4xl mb-lg">
            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary">AI Business Analyst.</span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-xl">
            Understand your business with AI instead of spreadsheets. Connect data, get insights, and automate reports instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-md">
            <Link href="/signup"
              className="bg-primary text-on-primary px-2xl py-md rounded-lg font-label-sm text-label-sm hover:bg-primary-fixed transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              Start Free
            </Link>
            <button className="border border-outline-variant text-on-surface px-2xl py-md rounded-lg font-label-sm text-label-sm hover:bg-surface-container-high transition-colors">
              Book Demo
            </button>
          </div>
        </section>

        {/* Visual Preview Section */}
        <section className="w-full mt-2xl max-w-6xl relative z-10 group perspective-1000">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-20 pointer-events-none"></div>
          <div className="glass-panel rounded-xl overflow-hidden shadow-2xl ai-glow border border-outline-variant transform transition-transform duration-700 hover:scale-[1.01]">
            {/* Dashboard Mockup Header */}
            <div className="bg-surface-container border-b border-outline-variant px-md py-sm flex items-center gap-sm">
              <div className="flex gap-xs">
                <div className="w-3 h-3 rounded-full bg-error"></div>
                <div className="w-3 h-3 rounded-full bg-surface-variant"></div>
                <div className="w-3 h-3 rounded-full bg-surface-variant"></div>
              </div>
              <div className="flex-grow flex justify-center">
                <div className="bg-surface px-md py-xs rounded-md text-on-surface-variant font-mono-sm text-[10px] border border-outline-variant flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[12px]">lock</span>
                  app.joatintelligence.com/dashboard
                </div>
              </div>
            </div>
            {/* Dashboard Content area */}
            <div className="p-lg grid grid-cols-1 md:grid-cols-12 gap-md relative bg-[#09090b]">
              {/* Sidebar Mockup */}
              <div className="hidden md:flex flex-col col-span-3 gap-md border-r border-outline-variant pr-md">
                <div className="flex flex-col gap-sm">
                  <div className="h-8 bg-surface-container-high rounded-md w-full animate-pulse opacity-50"></div>
                  <div className="h-8 bg-surface-container rounded-md w-3/4"></div>
                  <div className="h-8 bg-surface-container rounded-md w-4/5"></div>
                  <div className="h-8 bg-surface-container rounded-md w-2/3"></div>
                </div>
              </div>
              {/* Main Chart Area Mockup */}
              <div className="col-span-1 md:col-span-9 flex flex-col gap-md">
                <div className="h-64 bg-surface-container rounded-lg border border-outline-variant relative overflow-hidden flex items-end p-md gap-xs">
                  <div className="w-full h-1/4 bg-primary/20 rounded-t-sm"></div>
                  <div className="w-full h-2/4 bg-primary/40 rounded-t-sm"></div>
                  <div className="w-full h-1/3 bg-primary/30 rounded-t-sm"></div>
                  <div className="w-full h-3/4 bg-primary/60 rounded-t-sm relative">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-tertiary shadow-[0_0_10px_#d0bcff]"></div>
                  </div>
                  <div className="w-full h-1/2 bg-primary/40 rounded-t-sm"></div>
                  <div className="w-full h-full bg-primary/80 rounded-t-sm"></div>
                  <div className="w-full h-2/3 bg-primary/50 rounded-t-sm"></div>
                </div>
                <div className="grid grid-cols-3 gap-md">
                  <div className="h-24 bg-surface-container rounded-lg border border-outline-variant p-sm flex flex-col justify-between">
                    <span className="font-mono-sm text-on-surface-variant text-[10px]">REVENUE PREDICTION</span>
                    <span className="font-headline-md text-on-surface">$1.2M <span className="text-primary text-sm">↑ 14%</span></span>
                  </div>
                  <div className="h-24 bg-surface-container rounded-lg border border-outline-variant p-sm flex flex-col justify-between">
                    <span className="font-mono-sm text-on-surface-variant text-[10px]">RISK FACTOR</span>
                    <span className="font-headline-md text-on-surface">Low <span className="text-tertiary text-sm">Optimal</span></span>
                  </div>
                  <div className="h-24 bg-surface-container rounded-lg border border-outline-variant p-sm flex flex-col justify-between">
                    <span className="font-mono-sm text-on-surface-variant text-[10px]">DATA SOURCES</span>
                    <span className="font-headline-md text-on-surface">14 <span className="text-on-surface-variant text-sm">Active</span></span>
                  </div>
                </div>
              </div>
              {/* Overlaying AI Chat Mockup */}
              <div className="absolute bottom-lg right-lg w-80 glass-panel rounded-xl shadow-2xl flex flex-col z-30">
                <div className="p-sm border-b border-outline-variant bg-surface/50 rounded-t-xl flex justify-between items-center">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    <span className="font-label-sm text-on-surface">JOAT Copilot</span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-sm cursor-pointer">close</span>
                </div>
                <div className="p-md flex flex-col gap-sm">
                  <div className="bg-surface-container p-sm rounded-lg rounded-tr-none self-end text-on-surface text-sm max-w-[85%]">
                    Why did Q3 revenue spike?
                  </div>
                  <div className="bg-primary/10 border border-primary/20 p-sm rounded-lg rounded-tl-none self-start text-on-surface text-sm max-w-[90%]">
                    Based on your Salesforce data, the spike correlates with the Enterprise launch. I&apos;ve generated a detailed breakdown chart for you.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid Section */}
        <section className="w-full mt-2xl pt-2xl flex flex-col items-center">
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xl text-center">Intelligence at every layer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg w-full max-w-5xl">
            <div className="glass-panel p-lg rounded-xl flex flex-col gap-md hover:border-primary/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center border border-outline-variant group-hover:border-primary/50 transition-colors">
                <span className="material-symbols-outlined text-primary text-[24px]">chat_bubble</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">AI Copilot</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Natural language SQL and insights. Ask questions about your data as if you were talking to an expert analyst.</p>
              </div>
            </div>
            <div className="glass-panel p-lg rounded-xl flex flex-col gap-md hover:border-tertiary/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center border border-outline-variant group-hover:border-tertiary/50 transition-colors">
                <span className="material-symbols-outlined text-tertiary text-[24px]">trending_up</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Predictive Analytics</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Forecasting and risk detection. Anticipate market shifts and identify potential operational bottlenecks before they occur.</p>
              </div>
            </div>
            <div className="glass-panel p-lg rounded-xl flex flex-col gap-md hover:border-primary/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center border border-outline-variant group-hover:border-primary/50 transition-colors">
                <span className="material-symbols-outlined text-primary text-[24px]">summarize</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Automated Reports</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Set it and forget it. Generate comprehensive, board-ready presentations and dashboards on a scheduled cadence.</p>
              </div>
            </div>
            <div className="glass-panel p-lg rounded-xl flex flex-col gap-md hover:border-tertiary/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center border border-outline-variant group-hover:border-tertiary/50 transition-colors">
                <span className="material-symbols-outlined text-tertiary text-[24px]">cable</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Unified Data</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Connect any source. Seamlessly integrate with Snowflake, Postgres, Salesforce, and 50+ other critical business tools.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background text-primary font-label-sm text-label-sm w-full py-xl mt-auto border-t border-outline-variant flex flex-col md:flex-row justify-between items-center px-margin-desktop">
        <div className="flex items-center gap-sm mb-md md:mb-0">
          <span className="font-headline-md text-headline-md text-on-surface">JOAT Intelligence</span>
          <span className="text-on-surface-variant ml-md">© 2024 JOAT Intelligence. All rights reserved.</span>
        </div>
        <nav className="flex gap-lg">
          <a className="text-on-surface-variant hover:text-primary opacity-80 hover:opacity-100 transition-colors" href="#">Privacy Policy</a>
          <a className="text-on-surface-variant hover:text-primary opacity-80 hover:opacity-100 transition-colors" href="#">Terms of Service</a>
          <a className="text-on-surface-variant hover:text-primary opacity-80 hover:opacity-100 transition-colors" href="#">Security</a>
          <a className="text-on-surface-variant hover:text-primary opacity-80 hover:opacity-100 transition-colors" href="#">Status</a>
        </nav>
      </footer>
    </div>
  );
}
