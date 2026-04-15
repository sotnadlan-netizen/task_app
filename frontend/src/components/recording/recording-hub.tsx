"use client";

import { useRecording } from "@/hooks/useRecording";
import { useOrganization } from "@/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { CrashRecoveryModal } from "./crash-recovery-modal";
import { Mic, Square, Clock } from "lucide-react";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function RecordingHub() {
  const { capacity } = useOrganization();
  const {
    isRecording,
    duration,
    error,
    processing,
    crashRecovery,
    startRecording,
    stopRecording,
    recoverCrashedSession,
    discardCrashedSession,
  } = useRecording();

  return (
    <>
      <CrashRecoveryModal
        open={!!crashRecovery?.exists}
        onRecover={recoverCrashedSession}
        onDiscard={discardCrashedSession}
        loading={processing}
      />

      <Card>
        <CardHeader>
          <CardTitle>מרכז הקלטה</CardTitle>
          {capacity && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{capacity.remaining_minutes} דקות נותרות</span>
            </div>
          )}
        </CardHeader>

        {/* Low Balance Warning */}
        {capacity?.is_low_balance && !capacity.is_blocked && (
          <Alert variant="warning" title="קיבולת נמוכה" className="mb-4">
            נותרו לך {capacity.remaining_minutes} דקות. נהל את זמן ההקלטה בזהירות.
          </Alert>
        )}

        {/* Hard Block */}
        {capacity?.is_blocked && (
          <Alert variant="error" title="הקלטה חסומה" className="mb-4">
            הקיבולת נמוכה מדי ({capacity.remaining_minutes} דק׳). פנה למנהל להגדלת ההקצאה.
          </Alert>
        )}

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Recording Interface */}
        <div className="flex flex-col items-center py-8 gap-6">
          {/* Timer */}
          {isRecording && (
            <div className="text-4xl font-mono font-bold text-gray-900 tabular-nums">
              {formatDuration(duration)}
            </div>
          )}

          {/* Big Record Button */}
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={capacity?.is_blocked || processing}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200
                shadow-lg focus:outline-none focus:ring-4 focus:ring-red-300
                ${
                  capacity?.is_blocked
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-red-500 hover:bg-red-600 hover:scale-105 active:scale-95"
                }`}
              aria-label="התחל הקלטה"
            >
              <Mic className="w-10 h-10 text-white" />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-24 h-24 rounded-full bg-gray-800 hover:bg-gray-900 flex items-center justify-center
                transition-all duration-200 shadow-lg focus:outline-none focus:ring-4 focus:ring-gray-400
                hover:scale-105 active:scale-95 animate-pulse"
              aria-label="עצור הקלטה"
            >
              <Square className="w-8 h-8 text-white" />
            </button>
          )}

          <p className="text-sm text-gray-500">
            {capacity?.is_blocked
              ? "ההקלטה מושבתת עקב קיבולת נמוכה"
              : isRecording
                ? "מקליט... לחץ לעצירה"
                : "לחץ להתחלת הקלטה"}
          </p>
        </div>

        {/* Processing Indicator */}
        {processing && (
          <div className="flex items-center justify-center gap-3 py-4 border-t border-gray-100">
            <svg
              className="animate-spin h-5 w-5 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm text-indigo-600 font-medium">
              מעבד אודיו עם בינה מלאכותית...
            </span>
          </div>
        )}
      </Card>
    </>
  );
}
