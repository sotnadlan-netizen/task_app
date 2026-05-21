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
        <div className="animate-spin w-8 h-8 border-4 border-[#0070d2] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f3f3]">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#16325c] via-[#0b3a6b] to-[#0070d2]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(26,185,255,0.25),_transparent)]" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 sm:py-32 text-center text-white">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white/15 border border-white/25 text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#1ab9ff] animate-pulse" />
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
            className="bg-white text-[#0070d2] hover:bg-[#ecf5fe] focus-visible:ring-white
              text-base px-8 py-3 shadow-xl font-semibold"
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
            },
            {
              icon: Shield,
              title: "Privacy First",
              description:
                "Audio processed in-memory. Zero disk footprint. Your data stays yours.",
            },
            {
              icon: Zap,
              title: "Real-Time Sync",
              description:
                "Instant task updates across your organization via Supabase Realtime.",
            },
            {
              icon: Users,
              title: "Multi-Tenant",
              description:
                "One account, multiple organizations. Role-based access across all of them.",
            },
          ].map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-white rounded-lg p-6 border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] text-center"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#1ab9ff] to-[#0070d2] rounded-lg flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-[#080707] mb-2">{title}</h3>
              <p className="text-sm text-[#706e6b]">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#dddbda] py-8 text-center text-sm text-gray-400">
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
