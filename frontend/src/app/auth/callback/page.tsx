"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useLanguage } from "@/providers/language-provider";

export default function AuthCallback() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    // Handle error from Supabase redirect (e.g. trigger failure)
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get("error_description") || searchParams.get("error");
    if (error) {
      console.error("Auth error:", error);
      router.push("/?auth_error=" + encodeURIComponent(error));
      return;
    }

    const supabase = createClient();

    // Handle the auth code exchange
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");

    if (accessToken) {
      supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") {
          router.push("/dashboard");
        }
      });
    } else {
      // Code flow — Supabase SSR handles it automatically
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.push("/dashboard");
        } else {
          router.push("/");
        }
      });
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#0070d2] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm text-gray-500">{t("auth.completing")}</p>
      </div>
    </div>
  );
}
