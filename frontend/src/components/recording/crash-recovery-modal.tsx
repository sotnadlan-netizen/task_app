"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface CrashRecoveryModalProps {
  open: boolean;
  onRecover: () => void;
  onDiscard: () => void;
  loading: boolean;
}

export function CrashRecoveryModal({
  open,
  onRecover,
  onDiscard,
  loading,
}: CrashRecoveryModalProps) {
  return (
    <Modal open={open} onClose={onDiscard} title="Recover Audio">
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-yellow-600" />
        </div>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unfinished Recording Found
          </h3>
          <p className="text-sm text-gray-600">
            It looks like your browser closed during a recording session.
            We saved the audio locally. Would you like to recover and
            process it, or discard it?
          </p>
        </div>

        <div className="flex gap-3 w-full">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onDiscard}
            disabled={loading}
          >
            Discard
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={onRecover}
            loading={loading}
          >
            Recover & Process
          </Button>
        </div>
      </div>
    </Modal>
  );
}
