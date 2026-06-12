import Link from 'next/link';
import { ArrowRight, Sparkles, Shield, TrendingUp, Bot, Wallet, PieChart, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-finance-hero text-white relative overflow-hidden">
      {/* Animated background layers */}
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div className="aurora absolute -top-32 -right-24 w-[32rem] h-[32rem] rounded-full bg-emerald-500/30" />
      <div className="aurora absolute top-1/3 -left-32 w-[28rem] h-[28rem] rounded-full bg-sky-500/20" style={{ animationDelay: '3s' }} />

      <div className="relative z-10 container mx-auto px-4 py-10 lg:py-16">
        {/* Header */}
        <header className="flex justify-between items-center mb-16 lg:mb-24 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">RFin</span>
          </div>
          <Link
            href="/auth/login"
            className="press px-5 py-2.5 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Sign In
          </Link>
        </header>

        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-white/70">AI-Powered Financial Intelligence</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-[1.1] tracking-tight">
              Master your money,
              <br />
              <span className="text-money">split it smarter.</span>
            </h1>

            <p className="text-lg text-white/70 mb-9 max-w-xl leading-relaxed">
              Track expenses, split bills with friends, and get AI-powered insights.
              Just type "Paid ₹1,200 for dinner, split with Ravi and Krisha" and RFin does the math.
            </p>

            <div className="flex gap-4 flex-wrap">
              <Link
                href="/signup"
                className="press sheen inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-shadow"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/auth/login"
                className="press inline-flex items-center px-7 py-3.5 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm font-semibold hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
            </div>

            {/* Trust stats */}
            <div className="flex gap-8 mt-12">
              <div>
                <p className="text-2xl font-bold text-money">256-bit</p>
                <p className="text-sm text-white/50">Encrypted & secure</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-money">₹0</p>
                <p className="text-sm text-white/50">Free to start</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-money">AI</p>
                <p className="text-sm text-white/50">Smart splitting</p>
              </div>
            </div>
          </div>

          {/* Floating dashboard preview card */}
          <div className="relative animate-scale-in hidden lg:block">
            <div className="float p-6 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-white/50">Total Balance</p>
                  <p className="text-3xl font-bold text-money">₹48,250</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              {/* Mini bar chart */}
              <div className="flex items-end gap-2 h-28 mb-6">
                {[40, 65, 45, 80, 55, 95, 70].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-emerald-600/40 to-emerald-400" style={{ height: `${h}%` }} />
                ))}
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Goa Trip', amt: '+ ₹3,400', good: true },
                  { label: 'Flatmates', amt: '- ₹1,250', good: false },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white/70" />
                      </div>
                      <span className="text-sm text-white/80">{row.label}</span>
                    </div>
                    <span className={`text-sm font-semibold ${row.good ? 'text-emerald-400' : 'text-rose-400'}`}>{row.amt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-24 stagger">
          {[
            { icon: Bot, title: 'AI Assistant', desc: 'Chat naturally: "Spent ₹500 on petrol" or "Split ₹2,000 with the group equally."' },
            { icon: TrendingUp, title: 'Smart Insights', desc: 'Spending analysis, trend detection, and savings recommendations powered by AI.' },
            { icon: Shield, title: 'Bank-Grade Security', desc: 'Encrypted storage and row-level security keep your financial data private.' },
          ].map((f) => (
            <div key={f.title} className="p-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 hover-lift">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-white/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 text-center max-w-3xl mx-auto border border-white/15 animate-fade-in-up">
          <PieChart className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Ready to master your finances?</h2>
          <p className="text-white/60 mb-7">
            Join people who manage money smarter with RFin — track, split, and settle with zero math headaches.
          </p>
          <Link
            href="/signup"
            className="press sheen inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/30"
          >
            Start Your Journey
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-sm text-white/40">
          <p>© 2026 RFin. Built with Next.js and Groq AI.</p>
        </footer>
      </div>
    </div>
  );
}
