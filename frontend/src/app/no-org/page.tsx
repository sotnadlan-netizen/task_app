"use client";

import { useSupabase } from "@/providers/supabase-provider";
import { SupabaseProvider } from "@/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { Building2, Mail, LogOut } from "lucide-react";

function NoOrgContent() {
  const { user, signOut } = useSupabase();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-10 h-10 text-indigo-600" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          You&apos;re not part of any organization
        </h1>

        {/* Message */}
        <p className="text-gray-500 mb-2">
          Your account <span className="font-medium text-gray-700">{user?.email}</span> is not linked to any organization yet.
        </p>
        <p className="text-gray-500 mb-8">
          Ask your organization admin to invite you, then sign in again.
        </p>

        {/* Steps */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-left mb-8 space-y-4">
          <p className="text-sm font-semibold text-gray-700">What to do next:</p>
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
            <p className="text-sm text-gray-600 pt-0.5">Contact your organization admin and share your email address.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</div>
            <p className="text-sm text-gray-600 pt-0.5">Wait for them to add you to the organization with the appropriate role.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</div>
            <p className="text-sm text-gray-600 pt-0.5">Sign in again and you&apos;ll be taken to your dashboard.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={`mailto:?subject=Please add me to the organization&body=Hi, please add ${user?.email} to the organization on AI Task Orchestrator.`}>
            <Button variant="secondary" className="w-full sm:w-auto gap-2">
              <Mail className="w-4 h-4" />
              Email my admin
            </Button>
          </a>
          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full sm:w-auto gap-2 text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            Sign out
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
