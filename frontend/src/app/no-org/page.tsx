"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";
import { SupabaseProvider } from "@/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useLanguage } from "@/providers/language-provider";
import { api } from "@/lib/api";
import { Building2, Mail, LogOut, Zap } from "lucide-react";

function NoOrgContent() {
  const { user, signOut, supabase } = useSupabase();
  const { t } = useLanguage();
  const router = useRouter();
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState("");

  const startTrial = async () => {
    setTrialLoading(true);
    setTrialError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await api.startTrial(session?.access_token || "");
      // Land in the recording view so the trial user can start immediately.
      router.push("/dashboard/member");
    } catch {
      setTrialError(t("noOrg.startTrialError"));
      setTrialLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center px-4">
      <div className="absolute top-6 end-6">
        <LanguageToggle variant="light" />
      </div>
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-[#ecf5fe] rounded-lg flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-10 h-10 text-[#0070d2]" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {t("noOrg.title")}
        </h1>

        {/* Message */}
        <p className="text-gray-500 mb-2">
          {t("noOrg.message1", { email: user?.email ?? "" })}
        </p>
        <p className="text-gray-500 mb-8">
          {t("noOrg.message2")}
        </p>

        {/* Steps */}
        <div className="bg-white rounded-lg border border-[#dddbda] p-5 text-start mb-8 space-y-4">
          <p className="text-sm font-semibold text-gray-700">{t("noOrg.nextTitle")}</p>
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#0070d2] text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
            <p className="text-sm text-gray-600 pt-0.5">{t("noOrg.step1")}</p>
          </div>
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#0070d2] text-white text-xs font-bold flex items-center justify-center shrink-0">2</div>
            <p className="text-sm text-gray-600 pt-0.5">{t("noOrg.step2")}</p>
          </div>
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#0070d2] text-white text-xs font-bold flex items-center justify-center shrink-0">3</div>
            <p className="text-sm text-gray-600 pt-0.5">{t("noOrg.step3")}</p>
          </div>
        </div>

        {/* Self-serve free trial */}
        <div className="mb-8">
          <Button
            onClick={startTrial}
            disabled={trialLoading}
            className="w-full gap-2"
          >
            <Zap className="w-4 h-4" />
            {trialLoading ? t("noOrg.startingTrial") : t("noOrg.startTrial")}
          </Button>
          {trialError && (
            <p className="text-sm text-red-600 mt-2">{trialError}</p>
          )}
          <p className="text-xs text-gray-400 mt-4 mb-2">{t("noOrg.trialDivider")}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={`mailto:?subject=${encodeURIComponent(t("noOrg.mailSubject"))}&body=${encodeURIComponent(t("noOrg.mailBody", { email: user?.email ?? "" }))}`}>
            <Button variant="secondary" className="w-full sm:w-auto gap-2">
              <Mail className="w-4 h-4" />
              {t("noOrg.emailAdmin")}
            </Button>
          </a>
          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full sm:w-auto gap-2 text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            {t("nav.signOut")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NoOrgPage() {
  return (
    <SupabaseProvider>
      <NoOrgContent />
    </SupabaseProvider>
  );
}
