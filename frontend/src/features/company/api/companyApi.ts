import { API_BASE } from "../../../shared/api/auth_api";
import type {
  AccessRole,
  CompanyRecord,
  CompanyTeamMemberEntry,
  HypothesisEntry,
  ParsedAppointmentItem,
} from "../../../pages/CompanyWorkspacePage/companyWorkspace.types";

interface HypothesisEntryWire {
  text: string;
  status: HypothesisEntry["status"];
  title: string | null;
  description: string | null;
  source_document: string | null;
  source_meeting_id: string | null;
}

interface CompanyRecordWire {
  id: string;
  name: string;
  segment: string;
  last_visited: string;
  is_favorite: boolean;
  assigned_roles: AccessRole[];
  owner: string;
  open_questions: number;
  completed_questions: number;
  pending_meetings: number;
  completed_meetings: number;
  documents: string[];
  hypotheses: HypothesisEntryWire[];
  appointments: string[];
  notes: string[];
  team_members: string[];
  personas: string[];
  newsfeed: string[];
  recent_events: string[];
  portfolio_summary: string;
  performance_summary: string;
}

interface PersonalColleagueWire {
  id: string;
  function_name: string;
  full_name: string;
}

interface PersonalAppointmentWire {
  id: string;
  day_index: number;
  week_index: number;
  time_label: string;
  end_time_label: string | null;
  title: string;
  attendees: string[];
  description: string | null;
  recurring: boolean;
  invited_by: string | null;
  rsvp: ParsedAppointmentItem["rsvp"] | null;
}

/** Error carrying the HTTP status so callers can map it to friendly copy. */
export class CompanyApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "CompanyApiError";
  }
}

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { detail?: string };
  return body.detail ?? response.statusText;
}

async function getJson<T>(path: string, token: string | null): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new CompanyApiError(response.status, await readError(response));
  }
  return (await response.json()) as T;
}

function mapHypothesis(wire: HypothesisEntryWire): HypothesisEntry {
  return {
    text: wire.text,
    status: wire.status,
    title: wire.title ?? undefined,
    description: wire.description ?? undefined,
    sourceDocument: wire.source_document,
    sourceMeetingId: wire.source_meeting_id,
  };
}

function mapCompany(wire: CompanyRecordWire): CompanyRecord {
  return {
    id: wire.id,
    name: wire.name,
    segment: wire.segment,
    lastVisited: wire.last_visited,
    isFavorite: wire.is_favorite,
    assignedRoles: wire.assigned_roles,
    owner: wire.owner,
    openQuestions: wire.open_questions,
    completedQuestions: wire.completed_questions,
    pendingMeetings: wire.pending_meetings,
    completedMeetings: wire.completed_meetings,
    documents: wire.documents,
    hypotheses: wire.hypotheses.map(mapHypothesis),
    appointments: wire.appointments,
    notes: wire.notes,
    teamMembers: wire.team_members,
    personas: wire.personas,
    newsfeed: wire.newsfeed,
    recentEvents: wire.recent_events,
    portfolioSummary: wire.portfolio_summary,
    performanceSummary: wire.performance_summary,
  };
}

function mapPersonalColleague(wire: PersonalColleagueWire): CompanyTeamMemberEntry {
  return {
    id: wire.id,
    functionName: wire.function_name,
    fullName: wire.full_name,
  };
}

function mapPersonalAppointment(wire: PersonalAppointmentWire): ParsedAppointmentItem {
  return {
    id: wire.id,
    dayIndex: wire.day_index,
    weekIndex: wire.week_index,
    timeLabel: wire.time_label,
    endTimeLabel: wire.end_time_label ?? undefined,
    title: wire.title,
    attendees: wire.attendees,
    description: wire.description ?? undefined,
    recurring: wire.recurring || undefined,
    invitedBy: wire.invited_by ?? undefined,
    rsvp: wire.rsvp ?? undefined,
  };
}

export async function fetchCompanies(token: string | null): Promise<CompanyRecord[]> {
  const wire = await getJson<CompanyRecordWire[]>("/api/company/companies", token);
  return wire.map(mapCompany);
}

export async function fetchPersonalColleagues(token: string | null): Promise<CompanyTeamMemberEntry[]> {
  const wire = await getJson<PersonalColleagueWire[]>("/api/company/personal-colleagues", token);
  return wire.map(mapPersonalColleague);
}

export async function fetchPersonalAppointments(token: string | null): Promise<ParsedAppointmentItem[]> {
  const wire = await getJson<PersonalAppointmentWire[]>("/api/company/personal-appointments", token);
  return wire.map(mapPersonalAppointment);
}
