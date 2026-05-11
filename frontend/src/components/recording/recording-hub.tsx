"use client";

import { useEffect, useState } from "react";
import { useRecording } from "@/hooks/useRecording";
import { useOrganization } from "@/providers/organization-provider";
import { useSupabase } from "@/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Mic, Square, Clock, FolderOpen, Users, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import type { OrgMembership, Profile } from "@/types";

interface MemberWithProfile extends OrgMembership {
  profile: Profile | undefined;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function RecordingHub() {
  const { session: authSession } = useSupabase();
  const { capacity, currentOrg } = useOrganization();
  const {
    isRecording,
    duration,
    error,
    processing,
    startRecording,
    stopRecording,
  } = useRecording();

  // Pre-recording selection state
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Load projects and members when org changes
  useEffect(() => {
    if (!currentOrg || !authSession?.access_token) return;
    const token = authSession.access_token;
    setLoadingMeta(true);
    Promise.all([
      api.getProjects(currentOrg.id, token),
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/organizations/${currentOrg.id}/members`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then((r) => r.json()).catch(() => []),
    ])
      .then(([proj, mem]) => {
        setProjects(proj || []);
        setMembers((mem as MemberWithProfile[]) || []);
      })
      .catch(() => {})
      .finally(() => setLoadingMeta(false));
  }, [currentOrg, authSession?.access_token]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !currentOrg || !authSession?.access_token) return;
    setCreatingProject(true);
    try {
      const proj = await api.createProject(
        { org_id: currentOrg.id, name: newProjectName.trim() },
        authSession.access_token
      );
      setProjects((prev) => [...prev, proj]);
      setSelectedProjectId(proj.id);
      setNewProjectName("");
      setShowNewProjectInput(false);
    } catch {
      // silent
    }
    setCreatingProject(false);
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleStopRecording = async () => {
    await stopRecording({
      projectId: selectedProjectId || undefined,
      participantIds: selectedParticipantIds,
    });
  };

  return (
    <>
      <Card gradient="from-pink-50 to-rose-50">
        <CardHeader>
          <CardTitle>מרכז הקלטה</CardTitle>
          {capacity && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4 text-violet-400" />
              <span>{capacity.remaining_minutes} דקות נותרות</span>
            </div>
          )}
        </CardHeader>

        {/* Capacity bar */}
        {capacity && (
          <div className="mb-4 space-y-1">
            <div className="h-2 rounded-full overflow-hidden bg-white/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-pink-400 transition-all"
                style={{
                  width: `${Math.min(100, (capacity.remaining_minutes / (capacity.remaining_minutes + (capacity.used_minutes ?? 0))) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Low Balance Warning */}
        {capacity?.is_low_balance && !capacity.is_blocked && (
          <Alert variant="warning" title="קיבולת נמוכה" className="mb-4">
            נותרו לך {capacity.remaining_minutes} דקות. פנה למנהל להגדלת ההקצאה בקרוב.
          </Alert>
        )}

        {/* Hard Block */}
        {capacity?.is_blocked && (
          <Alert variant="error" title="הקלטה חסומה" className="mb-4">
            נגמרה הקיבולת. פנה למנהל להגדלת ההקצאה.
          </Alert>
        )}

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Pre-recording: project + participants selection (only before recording starts) */}
        {!isRecording && !processing && (
          <div className="space-y-4 mb-4 px-1" dir="rtl">
            {/* Project selection */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mb-1.5">
                <FolderOpen className="w-4 h-4 text-violet-400" />
                פרויקט
              </label>
              {!showNewProjectInput ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setShowNewProjectInput(true);
                        setSelectedProjectId("");
                      } else {
                        setSelectedProjectId(e.target.value);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-violet-100 rounded-2xl text-sm focus:ring-2 focus:ring-violet-200 focus:border-transparent bg-white/80"
                    disabled={loadingMeta}
                  >
                    <option value="">ללא פרויקט</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    <option value="__new__">+ צור פרויקט חדש</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowNewProjectInput(false); setNewProjectName(""); }}
                    className="p-1.5 rounded-xl hover:bg-white/60 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="שם פרויקט חדש"
                    className="flex-1 px-3 py-2 border border-violet-100 rounded-2xl text-sm focus:ring-2 focus:ring-violet-200 focus:border-transparent bg-white/80"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateProject}
                    loading={creatingProject}
                    disabled={!newProjectName.trim()}
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    צור
                  </Button>
                </div>
              )}
            </div>

            {/* Participants selection */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mb-1.5">
                <Users className="w-4 h-4 text-violet-400" />
                משתתפים
              </label>
              {loadingMeta ? (
                <p className="text-xs text-gray-400 animate-pulse">טוען...</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    if (!m.user_id) return null;
                    const name = m.profile?.full_name || m.profile?.email || m.invited_email || "לא ידוע";
                    const isSelected = selectedParticipantIds.includes(m.user_id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleParticipant(m.user_id!)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          isSelected
                            ? "bg-gradient-to-br from-violet-400 to-pink-400 text-white border-transparent shadow-sm"
                            : "bg-white/60 text-gray-600 border-violet-100 hover:bg-white/80"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center font-semibold text-[9px] ${isSelected ? "bg-white/30" : "bg-violet-100 text-violet-600"}`}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        {name}
                      </button>
                    );
                  })}
                  {members.length === 0 && (
                    <p className="text-xs text-gray-400">אין חברים בארגון עדיין.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recording Interface */}
        <div className="flex flex-col items-center py-8 gap-6">
          {/* Timer */}
          {isRecording && (
            <div className="text-4xl font-mono font-bold text-gray-800 tabular-nums">
              {formatDuration(duration)}
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-xs font-medium text-red-500 font-mono">REC</span>
            </div>
          )}

          {/* Big Record Button */}
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={capacity?.is_blocked || processing}
              className={`w-24 h-24 rounded-[28px] flex items-center justify-center transition-all duration-300
                shadow-[0_8px_24px_rgba(0,0,0,0.12)] focus:outline-none focus:ring-4 focus:ring-violet-200
                ${
                  capacity?.is_blocked
                    ? "bg-gray-200 cursor-not-allowed"
                    : "bg-gradient-to-br from-violet-400 to-pink-400 hover:scale-105 active:scale-95"
                }`}
              aria-label="התחל הקלטה"
            >
              <Mic className="w-10 h-10 text-white" />
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center
                transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.12)] focus:outline-none focus:ring-4 focus:ring-red-200
                hover:scale-105 active:scale-95"
              aria-label="עצור הקלטה"
            >
              <Square className="w-8 h-8 text-white" />
            </button>
          )}

          <p className="text-sm text-gray-400">
            {capacity?.is_blocked
              ? "ההקלטה מושבתת — אין קיבולת"
              : isRecording
                ? "מקליט... לחץ לעצירה"
                : "לחץ להתחלת הקלטה"}
          </p>

          {/* Selected context summary while recording */}
          {isRecording && (selectedProjectId || selectedParticipantIds.length > 0) && (
            <div className="flex items-center gap-3 text-xs text-gray-400" dir="rtl">
              {selectedProjectId && (
                <span className="flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5 text-violet-400" />
                  {projects.find((p) => p.id === selectedProjectId)?.name}
                </span>
              )}
              {selectedParticipantIds.length > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-violet-400" />
                  {selectedParticipantIds.length} משתתפים
                </span>
              )}
            </div>
          )}
        </div>

        {/* Processing Indicator */}
        {processing && (
          <div className="flex items-center justify-center gap-3 py-4 border-t border-pink-100/60">
            <svg
              className="animate-spin h-5 w-5 text-violet-400"
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
            <span className="text-sm text-violet-500 font-medium">
              מעבד אודיו עם בינה מלאכותית...
            </span>
          </div>
        )}
      </Card>
    </>
  );
}
