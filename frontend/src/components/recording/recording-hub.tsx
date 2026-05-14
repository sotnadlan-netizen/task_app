"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRecording } from "@/hooks/useRecording";
import { useOrganization } from "@/providers/organization-provider";
import { useSupabase } from "@/providers/supabase-provider";
import { Button } from "@/components/ui/button";
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

  const shouldReduceMotion = useReducedMotion();

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    if (!currentOrg || !authSession?.access_token) return;
    const token = authSession.access_token;
    setLoadingMeta(true);
    Promise.all([
      api.getProjects(currentOrg.id, token),
      api.getOrgMembers(currentOrg.id, token).catch(() => []),
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

  const remaining = capacity?.remaining_minutes ?? 0;
  const used = capacity?.used_minutes ?? 0;
  const capacityPct = (remaining + used) > 0
    ? Math.min(100, (remaining / (remaining + used)) * 100)
    : 0;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.07)] overflow-hidden">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-sm">
              <Mic className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <h2 className="text-lg font-bold text-gray-800">מרכז הקלטה</h2>
          </div>
          {capacity && (
            <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 rounded-full px-3 py-1 text-xs font-semibold border border-violet-100">
              <Clock className="w-3.5 h-3.5" />
              {capacity.remaining_minutes} דק׳ נותרות
            </span>
          )}
        </div>

        {/* Capacity Bar */}
        {capacity && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
                initial={{ width: shouldReduceMotion ? `${capacityPct}%` : "0%" }}
                animate={{ width: `${capacityPct}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.4 }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400" dir="rtl">
              <span>{remaining} דק׳ נותרות</span>
              <span>{used} דק׳ נוצלו</span>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {(capacity?.is_low_balance || capacity?.is_blocked || error) && (
        <div className="px-6 pt-4 space-y-3">
          {capacity?.is_low_balance && !capacity.is_blocked && (
            <Alert variant="warning" title="קיבולת נמוכה">
              נותרו לך {capacity.remaining_minutes} דקות. פנה למנהל להגדלת ההקצאה בקרוב.
            </Alert>
          )}
          {capacity?.is_blocked && (
            <Alert variant="error" title="הקלטה חסומה">
              נגמרה הקיבולת. פנה למנהל להגדלת ההקצאה.
            </Alert>
          )}
          {error && <Alert variant="error">{error}</Alert>}
        </div>
      )}

      {/* Pre-recording Controls */}
      {!isRecording && !processing && (
        <div className="px-6 py-5 space-y-5" dir="rtl">
          {/* Project selection */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
              <FolderOpen className="w-3.5 h-3.5 text-violet-400" />
              פרויקט
            </label>
            {!showNewProjectInput ? (
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
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"
                disabled={loadingMeta}
              >
                <option value="">ללא פרויקט</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value="__new__">+ צור פרויקט חדש</option>
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowNewProjectInput(false); setNewProjectName(""); }}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="שם פרויקט חדש"
                  className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                  autoFocus
                />
                <Button size="sm" onClick={handleCreateProject} loading={creatingProject} disabled={!newProjectName.trim()}>
                  <Plus className="w-4 h-4 ml-1" />
                  צור
                </Button>
              </div>
            )}
          </div>

          {/* Participants */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-violet-400" />
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        isSelected
                          ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                          : "bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-600"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] flex-shrink-0 ${
                        isSelected ? "bg-white/20 text-white" : "bg-violet-100 text-violet-600"
                      }`}>
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
      <div className="flex flex-col items-center py-10 px-6 gap-5">
        {/* Timer */}
        {isRecording && (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-5xl font-mono font-bold text-gray-800 tabular-nums"
          >
            {formatDuration(duration)}
          </motion.div>
        )}

        {/* REC badge */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-500 tracking-widest">REC</span>
          </div>
        )}

        {/* Record / Stop Button */}
        <div className="relative flex items-center justify-center">
          {/* Animated pulse ring while recording */}
          {isRecording && !shouldReduceMotion && (
            <motion.div
              className="absolute rounded-full bg-red-400/20"
              style={{ width: 100, height: 100 }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            />
          )}

          {!isRecording ? (
            <motion.button
              onClick={startRecording}
              disabled={capacity?.is_blocked || processing}
              whileHover={shouldReduceMotion ? {} : { scale: 1.06 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.93 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className={`w-20 h-20 rounded-full flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-violet-300 ${
                capacity?.is_blocked
                  ? "bg-gray-200 cursor-not-allowed"
                  : "bg-gradient-to-br from-violet-500 to-pink-500 shadow-[0_4px_24px_rgba(139,92,246,0.45)]"
              }`}
              aria-label="התחל הקלטה"
            >
              <Mic className="w-9 h-9 text-white" />
            </motion.button>
          ) : (
            <motion.button
              onClick={handleStopRecording}
              whileHover={shouldReduceMotion ? {} : { scale: 1.06 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.93 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-[0_4px_24px_rgba(239,68,68,0.35)] focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-red-300"
              aria-label="עצור הקלטה"
            >
              <Square className="w-8 h-8 text-white" />
            </motion.button>
          )}
        </div>

        <p className="text-sm text-gray-400 text-center">
          {capacity?.is_blocked
            ? "ההקלטה מושבתת — אין קיבולת"
            : isRecording
              ? "מקליט... לחץ לעצירה"
              : "לחץ להתחלת הקלטה"}
        </p>

        {/* Context summary while recording */}
        {isRecording && (selectedProjectId || selectedParticipantIds.length > 0) && (
          <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap justify-center" dir="rtl">
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
        <div className="flex items-center justify-center gap-3 py-5 border-t border-gray-100">
          <svg className="animate-spin h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-violet-600 font-semibold">מעבד אודיו עם בינה מלאכותית...</span>
        </div>
      )}
    </div>
  );
}
