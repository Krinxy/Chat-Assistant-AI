import type { Language } from "../../features/chat/types/chat";

export type AccessRole = "admin" | "customer" | "salesConsultant" | "analyst";
export type DisplayRole = AccessRole | "guest";

export type CompanyTab =
  | "overview"
  | "portfolio"
  | "performance"
  | "documents"
  | "hypotheses"
  | "appointments"
  | "notes"
  | "team"
  | "newsfeed";

export interface CompanyRecord {
  id: string;
  name: string;
  segment: string;
  lastVisited: string;
  isFavorite: boolean;
  assignedRoles: AccessRole[];
  owner: string;
  openQuestions: number;
  completedQuestions: number;
  pendingMeetings: number;
  completedMeetings: number;
  documents: string[];
  hypotheses: HypothesisEntry[];
  appointments: string[];
  notes: string[];
  teamMembers: string[];
  personas: string[];
  newsfeed: string[];
  recentEvents: string[];
  portfolioSummary: string;
  performanceSummary: string;
}

export type WorkspaceDocumentSource = "base" | "upload";

export interface UploadedCompanyDocument {
  id: string;
  name: string;
  mimeType: string;
  sizeLabel: string;
  objectUrl: string;
  uploadedAt: string;
}

export interface WorkspaceDocumentItem {
  id: string;
  name: string;
  source: WorkspaceDocumentSource;
  mimeType: string;
  sizeLabel: string;
  objectUrl: string | null;
  uploadedAt: string;
}

export type CompanyNoteSource = "base" | "manual" | "file";

export interface CompanyNoteEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  source: CompanyNoteSource;
  labels: string[];
  linkedEvent: string | null;
}

export interface CompanyTeamMemberEntry {
  id: string;
  functionName: string;
  fullName: string;
}

export interface ParsedAppointmentItem {
  id: string;
  dayIndex: number;
  /** Relative week offset: 0 = current week, 1 = next, -1 = last, etc. */
  weekIndex: number;
  timeLabel: string;
  /** Optional end time, e.g. "10:30". If absent the card uses a minimum height. */
  endTimeLabel?: string;
  title: string;
  attendees: string[];
  description?: string;
  /** When true the appointment appears in every week, not just the week it was created in. */
  recurring?: boolean;
  /**
   * When set, the appointment was sent as an invite by this person (display name).
   * The current user has not yet confirmed it.
   */
  invitedBy?: string;
  /** RSVP status for invite appointments. Defaults to "pending" when invitedBy is set. */
  rsvp?: "pending" | "accepted" | "declined";
}

export type HypothesisStatus = "pending" | "confirmed" | "unconfirmed";

export interface HypothesisEntry {
  text: string;
  status: HypothesisStatus;
}

export interface WeekdayTokenEntry {
  index: number;
  tokens: string[];
}

export interface CompanyWorkspacePanelProps {
  language: Language;
  onOpenProfile: () => void;
  isSidebarOpen: boolean;
  onOpenSidebar: () => void;
}
