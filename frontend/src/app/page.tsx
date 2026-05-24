"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SupabaseProvider, useSupabase } from "@/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useLanguage } from "@/providers/language-provider";
import { Mic, Shield, Zap, Users } from "lucide-react";

function LandingContent() {
  const { user, loading, signInWithGoogle } = useSupabase();
  const { t } = useLanguage();
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
        {/* Top bar with language toggle */}
        <div className="relative max-w-5xl mx-auto px-6 pt-6 flex justify-end">
          <LanguageToggle variant="dark" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 pb-24 pt-16 sm:pb-32 text-center text-white">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white/15 border border-white/25 text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#1ab9ff] animate-pulse" />
            {t("landing.badge")}
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            {t("landing.title")}
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            {t("landing.subtitle")}
          </p>
          <Button
            size="lg"
            onClick={signInWithGoogle}
            className="bg-white text-[#0070d2] hover:bg-[#ecf5fe] focus-visible:ring-white
              text-base px-8 py-3 shadow-xl font-semibold"
          >
            {t("landing.signIn")}
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Mic,
              title: t("landing.featureAudioTitle"),
              description: t("landing.featureAudioDesc"),
            },
            {
              icon: Shield,
              title: t("landing.featurePrivacyTitle"),
              description: t("landing.featurePrivacyDesc"),
            },
            {
              icon: Zap,
              title: t("landing.featureRealtimeTitle"),
              description: t("landing.featureRealtimeDesc"),
            },
            {
              icon: Users,
              title: t("landing.featureMultiTenantTitle"),
              description: t("landing.featureMultiTenantDesc"),
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
        {t("landing.footer")}
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
