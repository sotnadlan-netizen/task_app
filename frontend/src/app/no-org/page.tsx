"use client";

import { useSupabase } from "@/providers/supabase-provider";
import { SupabaseProvider } from "@/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useLanguage } from "@/providers/language-provider";
import { Building2, Mail, LogOut } from "lucide-react";

function NoOrgContent() {
  const { user, signOut } = useSupabase();
  const { t } = useLanguage();

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
