import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Shield, TrendingUp, Bot } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="flex justify-between items-center mb-20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-gradient">RFin</span>
          </div>
          <Link href="/auth/login">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </Link>
        </header>

        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-block mb-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-card">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                AI-Powered Financial Intelligence
              </span>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Your Premium
            <br />
            <span className="text-gradient">Financial Companion</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Track expenses effortlessly with AI-powered insights. 
            Chat with your finances, get smart recommendations, 
            and achieve your financial goals.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8">
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
          <div className="glass-card rounded-2xl p-8 hover:scale-105 transition-transform">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Assistant</h3>
            <p className="text-muted-foreground">
              Chat naturally: "Spent ₹500 on petrol" or "How much did I save this month?"
            </p>
          </div>

          <div className="glass-card rounded-2xl p-8 hover:scale-105 transition-transform">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Insights</h3>
            <p className="text-muted-foreground">
              AI-powered spending analysis, trend detection, and savings recommendations.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-8 hover:scale-105 transition-transform">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
            <p className="text-muted-foreground">
              Bank-grade security with encrypted data storage and row-level security.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="glass-strong rounded-3xl p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            Ready to master your finances?
          </h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of users who are already managing their money smarter with RFin.
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">
              Start Your Journey
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-sm text-muted-foreground">
          <p>© 2026 RFin. Built with Next.js 15 and Groq AI.</p>
        </footer>
      </div>
    </div>
  );
}
