import {
  weekdayTokenMap,
} from "./companyWorkspace.data";
import type {
  CompanyRecord,
  CompanyTeamMemberEntry,
  DisplayRole,
  ParsedAppointmentItem,
} from "./companyWorkspace.types";

export const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes <= 0) {
    return "0 KB";
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const inferMimeTypeFromName = (documentName: string): string => {
  const normalized = documentName.trim().toLowerCase();

  if (normalized.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (normalized.endsWith(".png")) {
    return "image/png";
  }

  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (normalized.endsWith(".csv")) {
    return "text/csv";
  }

  if (normalized.endsWith(".json")) {
    return "application/json";
  }

  if (normalized.endsWith(".md")) {
    return "text/markdown";
  }

  if (normalized.endsWith(".txt")) {
    return "text/plain";
  }

  return "application/octet-stream";
};

export const getCompanyInitials = (companyName: string): string => {
  const parts = companyName
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return "--";
  }

  const first = parts[0]?.charAt(0) ?? "";
  const second = parts[1]?.charAt(0) ?? "";
  return `${first}${second}`.toUpperCase();
};

export const parseAppointmentItem = (
  rawValue: string,
  fallbackDayIndex: number,
  companyId: string,
  index: number,
): ParsedAppointmentItem => {
  const [mainPart, attendeesPart] = rawValue.split("|").map((s) => s.trim());
  const normalized = mainPart ?? rawValue.trim();
  const attendees = attendeesPart
    ? attendeesPart.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // Extract optional week prefix: "W+1 ", "W-2 ", "W0 " etc.
  const weekPrefixMatch = normalized.match(/^W([+-]?\d+)\s+/);
  const weekIndex = weekPrefixMatch !== null ? parseInt(weekPrefixMatch[1], 10) : 0;
  const restOfString = weekPrefixMatch !== null ? normalized.slice(weekPrefixMatch[0].length) : normalized;

  // Pattern: DayToken HH:MM[-HH:MM] Title
  const matched = restOfString.match(/^([A-Za-z]{2,3})\s+(\d{1,2}:\d{2})(?:-(\d{1,2}:\d{2}))?\s*(.*)$/);

  if (matched === null) {
    return {
      id: `${companyId}-appointment-${index}`,
      dayIndex: fallbackDayIndex,
      weekIndex,
      timeLabel: "--:--",
      title: restOfString,
      attendees,
    };
  }

  const dayToken = matched[1].trim().toLowerCase();
  const resolvedDayIndex =
    weekdayTokenMap.find((entry) => entry.tokens.includes(dayToken))?.index ?? fallbackDayIndex;
  const timeLabel = matched[2].trim();
  const endTimeLabel = matched[3]?.trim() || undefined;
  const title = matched[4].trim();

  return {
    id: `${companyId}-appointment-${index}`,
    dayIndex: resolvedDayIndex,
    weekIndex,
    timeLabel,
    endTimeLabel,
    title: title.length > 0 ? title : restOfString,
    attendees,
  };
};

export const parseTeamMember = (
  rawMember: string,
  companyId: string,
  index: number,
): CompanyTeamMemberEntry => {
  const [functionPart, ...nameParts] = rawMember.split(":");
  const functionName = (functionPart ?? "Team").trim();
  const fullName = nameParts.join(":").trim();

  return {
    id: `${companyId}-team-${index}`,
    functionName: functionName.length > 0 ? functionName : "Team",
    fullName: fullName.length > 0 ? fullName : functionName,
  };
};

export const buildCompanyTeamMembers = (company: CompanyRecord): CompanyTeamMemberEntry[] => {
  return company.teamMembers.map((member, index) => parseTeamMember(member, company.id, index));
};

export const readDbAssignedRole = (): DisplayRole => {
  try {
    const rawRole = globalThis.localStorage.getItem("aura.workspace.role");

    if (rawRole === "admin" || rawRole === "customer" || rawRole === "salesConsultant" || rawRole === "analyst") {
      return rawRole;
    }

    if (rawRole === null) {
      return "salesConsultant";
    }

    return "guest";
  } catch {
    return "salesConsultant";
  }
};
