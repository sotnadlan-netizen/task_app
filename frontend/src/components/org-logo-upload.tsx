"use client";

import { useRef, useState } from "react";
import { Building2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { useSupabase } from "@/providers/supabase-provider";
import { useLanguage } from "@/providers/language-provider";
import type { Organization } from "@/types";

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB — must match the backend limit.

interface OrgLogoUploadProps {
  org: Organization;
  onUploaded: (updated: Organization) => void;
}

/**
 * Reusable org-logo control: previews the current logo (or a placeholder) and
 * uploads a new one through the FastAPI backend, which stores it in the
 * public `org-logos` bucket and returns the updated organization.
 */
export function OrgLogoUpload({ org, onUploaded }: OrgLogoUploadProps) {
  const { session } = useSupabase();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Local override so the preview updates immediately after a successful upload.
  const [logoUrl, setLogoUrl] = useState<string | null>(org.logo_url);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = "";
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError(t("orgLogo.errType"));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError(t("orgLogo.errSize"));
      return;
    }

    const token = session?.access_token;
    if (!token) {
      setError(t("orgLogo.errUpload"));
      return;
    }

    setUploading(true);
    try {
      const updated = (await api.uploadOrgLogo(org.id, file, token)) as Organization;
      setLogoUrl(updated.logo_url ?? null);
      onUploaded(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orgLogo.errUpload"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg border border-[#dddbda] bg-[#fafaf9] flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={org.name} className="w-full h-full object-contain" />
          ) : (
            <Building2 className="w-7 h-7 text-[#706e6b]" />
          )}
        </div>

        <div className="space-y-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-4 h-4 me-1" />
            {uploading
              ? t("orgLogo.uploading")
              : logoUrl
                ? t("orgLogo.change")
                : t("orgLogo.upload")}
          </Button>
          <p className="text-xs text-gray-400">{t("orgLogo.hint")}</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
