/**
 * Features Registry — Functional source of truth for all user-facing features.
 *
 * AUTOMATION RULE: After EVERY code change that adds, modifies, or removes a feature,
 * update this file to reflect the change and state in your completion message that
 * the registry has been synchronized.
 */

export type FeatureStatus = 'active' | 'new' | 'beta' | 'coming-soon';
export type FeatureCategory = 'ai' | 'recording' | 'clients' | 'analytics' | 'platform';
export type BentoSize = 'sm' | 'md' | 'lg';

export interface FeatureEntry {
  id: string;
  /** Lucide-react icon name */
  icon: string;
  /** i18n translation key for the title */
  titleKey: string;
  /** i18n translation key for the description */
  descKey: string;
  status: FeatureStatus;
  category: FeatureCategory;
  /** Visual size hint for the Bento Grid layout */
  size: BentoSize;
}

export const FEATURES_REGISTRY: FeatureEntry[] = [
  // ── AI Core ────────────────────────────────────────────────────────────────
  {
    id: 'ai-session-summary',
    icon: 'Sparkles',
    titleKey: 'features.aiSummary.title',
    descKey: 'features.aiSummary.desc',
    status: 'active',
    category: 'ai',
    size: 'lg',
  },
  {
    id: 'ai-action-items',
    icon: 'ListChecks',
    titleKey: 'features.aiActionItems.title',
    descKey: 'features.aiActionItems.desc',
    status: 'active',
    category: 'ai',
    size: 'md',
  },
  {
    id: 'ai-chat-history',
    icon: 'MessageSquare',
    titleKey: 'features.chatHistory.title',
    descKey: 'features.chatHistory.desc',
    status: 'active',
    category: 'ai',
    size: 'md',
  },
  {
    id: 'ai-agent-config',
    icon: 'Bot',
    titleKey: 'features.agentConfig.title',
    descKey: 'features.agentConfig.desc',
    status: 'active',
    category: 'ai',
    size: 'md',
  },
  {
    id: 'ai-follow-up-questions',
    icon: 'HelpCircle',
    titleKey: 'features.followUp.title',
    descKey: 'features.followUp.desc',
    status: 'active',
    category: 'ai',
    size: 'sm',
  },
  // ── Recording ──────────────────────────────────────────────────────────────
  {
    id: 'voice-recording',
    icon: 'Mic',
    titleKey: 'features.voiceRecording.title',
    descKey: 'features.voiceRecording.desc',
    status: 'active',
    category: 'recording',
    size: 'lg',
  },
  {
    id: 'privacy-first-audio',
    icon: 'ShieldCheck',
    titleKey: 'features.privacyAudio.title',
    descKey: 'features.privacyAudio.desc',
    status: 'active',
    category: 'recording',
    size: 'md',
  },
  {
    id: 'audio-player',
    icon: 'Play',
    titleKey: 'features.audioPlayer.title',
    descKey: 'features.audioPlayer.desc',
    status: 'active',
    category: 'recording',
    size: 'sm',
  },
  // ── Clients ────────────────────────────────────────────────────────────────
  {
    id: 'client-management',
    icon: 'Users',
    titleKey: 'features.clientManagement.title',
    descKey: 'features.clientManagement.desc',
    status: 'active',
    category: 'clients',
    size: 'md',
  },
  {
    id: 'client-health-pulse',
    icon: 'Activity',
    titleKey: 'features.clientHealth.title',
    descKey: 'features.clientHealth.desc',
    status: 'active',
    category: 'clients',
    size: 'md',
  },
  {
    id: 'client-profile',
    icon: 'UserCircle',
    titleKey: 'features.clientProfile.title',
    descKey: 'features.clientProfile.desc',
    status: 'active',
    category: 'clients',
    size: 'sm',
  },
  {
    id: 'task-reminders',
    icon: 'Bell',
    titleKey: 'features.taskReminders.title',
    descKey: 'features.taskReminders.desc',
    status: 'active',
    category: 'clients',
    size: 'sm',
  },
  {
    id: 'session-board',
    icon: 'Layers',
    titleKey: 'features.sessionBoard.title',
    descKey: 'features.sessionBoard.desc',
    status: 'active',
    category: 'clients',
    size: 'md',
  },
  {
    id: 'calendar-integration',
    icon: 'CalendarDays',
    titleKey: 'features.calendar.title',
    descKey: 'features.calendar.desc',
    status: 'active',
    category: 'clients',
    size: 'sm',
  },
  // ── Analytics ──────────────────────────────────────────────────────────────
  {
    id: 'analytics-dashboard',
    icon: 'BarChart2',
    titleKey: 'features.analytics.title',
    descKey: 'features.analytics.desc',
    status: 'active',
    category: 'analytics',
    size: 'md',
  },
  {
    id: 'task-center',
    icon: 'ListTodo',
    titleKey: 'features.taskCenter.title',
    descKey: 'features.taskCenter.desc',
    status: 'active',
    category: 'analytics',
    size: 'md',
  },
  {
    id: 'csv-export',
    icon: 'Download',
    titleKey: 'features.csvExport.title',
    descKey: 'features.csvExport.desc',
    status: 'active',
    category: 'analytics',
    size: 'sm',
  },
  // ── Platform ───────────────────────────────────────────────────────────────
  {
    id: 'multi-language',
    icon: 'Globe',
    titleKey: 'features.multiLanguage.title',
    descKey: 'features.multiLanguage.desc',
    status: 'active',
    category: 'platform',
    size: 'md',
  },
  {
    id: 'realtime-sync',
    icon: 'Zap',
    titleKey: 'features.realtimeSync.title',
    descKey: 'features.realtimeSync.desc',
    status: 'active',
    category: 'platform',
    size: 'sm',
  },
  {
    id: 'accessibility-widget',
    icon: 'Accessibility',
    titleKey: 'features.accessibility.title',
    descKey: 'features.accessibility.desc',
    status: 'active',
    category: 'platform',
    size: 'sm',
  },
  {
    id: 'dark-mode',
    icon: 'Moon',
    titleKey: 'features.darkMode.title',
    descKey: 'features.darkMode.desc',
    status: 'active',
    category: 'platform',
    size: 'sm',
  },
  {
    id: 'command-palette',
    icon: 'Command',
    titleKey: 'features.commandPalette.title',
    descKey: 'features.commandPalette.desc',
    status: 'active',
    category: 'platform',
    size: 'sm',
  },
];

export const FEATURE_STATUS_ORDER: FeatureStatus[] = ['new', 'beta', 'active', 'coming-soon'];
