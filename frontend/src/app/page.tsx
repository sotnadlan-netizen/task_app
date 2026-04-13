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
      router.push("/dashboard/member");
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 sm:py-32 text-center text-white">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            AI Task Orchestrator
          </h1>
          <p className="text-lg sm:text-xl text-indigo-100 max-w-2xl mx-auto mb-10">
            Transform live audio into actionable tasks with AI.
            Privacy-first. Multi-tenant. Real-time collaboration.
          </p>
          <Button
            size="lg"
            onClick={signInWithGoogle}
            className="bg-white text-indigo-700 hover:bg-indigo-50 focus-visible:ring-white
              text-base px-8 py-3 shadow-xl"
          >
            Sign in with Google
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
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
            <div key={title} className="text-center">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500">
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
