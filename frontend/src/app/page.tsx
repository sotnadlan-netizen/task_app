"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SupabaseProvider, useSupabase } from "@/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { Mic, Shield, Zap, Users } from "lucide-react";

function LandingContent() {
  const { user, loading, signInWithGoogle } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-violet-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-400 via-fuchsia-400 to-pink-400" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.2),_transparent)]" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 sm:py-32 text-center text-white">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            AI-Powered Meeting Intelligence
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            AI Task Orchestrator
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Transform live audio into actionable tasks with AI.
            Privacy-first. Multi-tenant. Real-time collaboration.
          </p>
          <Button
            size="lg"
            onClick={signInWithGoogle}
            className="bg-white text-violet-600 hover:bg-violet-50 focus-visible:ring-white
              text-base px-8 py-3 shadow-xl rounded-2xl font-semibold hover:scale-105"
          >
            Sign in with Google
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Mic,
              title: "Audio to Tasks",
              description:
                "Record meetings, get AI-generated summaries, sentiment analysis, and task lists.",
              gradient: "from-violet-400 to-fuchsia-400",
              bg: "from-violet-50 to-fuchsia-50",
            },
            {
              icon: Shield,
              title: "Privacy First",
              description:
                "Audio processed in-memory. Zero disk footprint. Your data stays yours.",
              gradient: "from-sky-400 to-blue-400",
              bg: "from-sky-50 to-blue-50",
            },
            {
              icon: Zap,
              title: "Real-Time Sync",
              description:
                "Instant task updates across your organization via Supabase Realtime.",
              gradient: "from-amber-400 to-orange-400",
              bg: "from-amber-50 to-orange-50",
            },
            {
              icon: Users,
              title: "Multi-Tenant",
              description:
                "One account, multiple organizations. Role-based access across all of them.",
              gradient: "from-rose-400 to-pink-400",
              bg: "from-rose-50 to-pink-50",
            },
          ].map(({ icon: Icon, title, description, gradient, bg }) => (
            <div
              key={title}
              className={`bg-gradient-to-br ${bg} rounded-3xl p-6 border border-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-center`}
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-violet-100/60 py-8 text-center text-sm text-gray-400">
        AI Task Orchestrator &mdash; IS 5568 / WCAG 2.1 AA Compliant
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <SupabaseProvider>
      <LandingContent />
    </SupabaseProvider>
  );
}
