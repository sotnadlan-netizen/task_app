"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SupabaseProvider, useSupabase } from "@/providers/supabase-provider";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useLanguage } from "@/providers/language-provider";
import { Mic, Shield, Zap, Users } from "lucide-react";

/** Official multi-color Google "G" mark for the OAuth button. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

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
          <button
            type="button"
            onClick={signInWithGoogle}
            className="inline-flex items-center justify-center gap-3 rounded-md border border-gray-300
              bg-white px-6 py-3 text-base font-medium text-gray-700 shadow-xl
              hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2
              focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <GoogleIcon className="w-5 h-5 shrink-0" />
            {t("landing.signIn")}
          </button>
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
