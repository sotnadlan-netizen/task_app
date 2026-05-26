"use client";

import { SupportTicketForm } from "@/components/support/support-ticket-form";
import { PageHeader } from "@/components/ui/lightning";
import { useLanguage } from "@/providers/language-provider";
import { LifeBuoy } from "lucide-react";

export default function SupportPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        icon={<LifeBuoy className="w-5 h-5 text-white" />}
        eyebrow={t("tickets.supportEyebrow")}
        title={t("tickets.supportTitle")}
        breadcrumb={[t("nav.support")]}
      />
      <p className="text-sm text-[#706e6b]">{t("tickets.supportIntro")}</p>
      <SupportTicketForm />
    </div>
  );
}
