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
  pendingMeetings: number;
  documents: string[];
  hypotheses: string[];
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
  timeLabel: string;
  title: string;
}

export interface WeekdayTokenEntry {
  index: number;
  tokens: string[];
}

export interface CompanyWorkspacePanelProps {
  language: Language;
  onOpenProfile: () => void;
}
