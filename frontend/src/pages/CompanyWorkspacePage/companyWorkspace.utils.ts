import {
  weekdayTokenMap,
} from "./companyWorkspace.data";
import type {
  CompanyRecord,
  CompanyTeamMemberEntry,
  DisplayRole,
  HypothesisEntry,
  ParsedAppointmentItem,
} from "./companyWorkspace.types";
import type { Language } from "../../features/chat/types/chat";

export const trendFor = (isUp: boolean, isDown: boolean): "up" | "down" | "neutral" => {
  if (isUp) return "up";
  if (isDown) return "down";
  return "neutral";
};

export const genSpark = (end: number, trend: "up" | "down" | "neutral", seed: number): number[] => {
  const pts: number[] = [];
  let v = trend === "up" ? end * 0.55 : trend === "down" ? end * 1.45 : end * 0.85;
  for (let i = 0; i < 8; i++) {
    const noise = ((((seed * (i + 1) * 7919) % 100) / 100) - 0.5) * end * 0.22;
    v += (end - v) * 0.28 + noise;
    pts.push(Math.max(0, Math.min(end * 1.6, v)));
  }
  pts.push(end);
  return pts;
};

export const sparkPolyline = (pts: readonly number[]): string => {
  const W = 80;
  const H = 32;
  const max = Math.max(...pts) || 1;
  const min = Math.min(...pts);
  const range = max - min || 1;
  return pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

export const buildPerformanceRows = (company: CompanyRecord, activeHypotheses: HypothesisEntry[], language: Language) => {
  const totalOpen = company.openQuestions + company.pendingMeetings;
  const totalCompleted = company.completedQuestions + company.completedMeetings;
  const confirmedHypo = activeHypotheses.filter((h) => h.status === "confirmed").length;
  const churnRisk = Math.min(82, Math.max(5, totalOpen * 4 + company.pendingMeetings * 5));
  const nrr = Math.round(Math.min(138, Math.max(80, 108 + company.completedMeetings * 2 - company.pendingMeetings * 3)));
  const arrGrowth = Math.round(Math.min(44, Math.max(3, 13 + confirmedHypo * 5 - totalOpen * 0.6)));
  const upsellRate = Math.round(Math.min(86, Math.max(12, 36 + activeHypotheses.length * 8)));
  const dealVelocity = Math.round(Math.min(58, Math.max(9, 40 - totalCompleted * 0.5 + totalOpen * 1.1)));
  const healthScore = Math.round(Math.min(97, Math.max(38, 84 - totalOpen * 2.4 + totalCompleted * 0.4)));

  return [
    {
      id: "churn",
      label: language === "de" ? "Churn-Risiko" : "Churn Risk",
      value: churnRisk,
      unit: "%",
      note: language === "de" ? "↓ Ziel <20%" : "↓ Target <20%",
      trend: trendFor(churnRisk < 20, churnRisk > 45),
      barPct: churnRisk,
      spark: genSpark(churnRisk, trendFor(churnRisk < 20, churnRisk > 45), 3),
    },
    {
      id: "nrr",
      label: "NRR",
      value: nrr,
      unit: "%",
      note: language === "de" ? "Ziel >100%" : "Target >100%",
      trend: trendFor(nrr >= 105, nrr < 95),
      barPct: Math.min(100, nrr - 50),
      spark: genSpark(nrr, trendFor(nrr >= 105, nrr < 95), 7),
    },
    {
      id: "arr",
      label: language === "de" ? "ARR-Wachstum" : "ARR Growth",
      value: arrGrowth,
      unit: "%",
      note: "YoY",
      trend: trendFor(arrGrowth >= 15, arrGrowth < 7),
      barPct: arrGrowth,
      spark: genSpark(arrGrowth, trendFor(arrGrowth >= 15, arrGrowth < 7), 11),
    },
    {
      id: "upsell",
      label: language === "de" ? "Upsell-Rate" : "Upsell Rate",
      value: upsellRate,
      unit: "%",
      note: language === "de" ? "Potenzial identifiziert" : "Potential identified",
      trend: trendFor(upsellRate >= 50, upsellRate < 28),
      barPct: upsellRate,
      spark: genSpark(upsellRate, trendFor(upsellRate >= 50, upsellRate < 28), 13),
    },
    {
      id: "velocity",
      label: language === "de" ? "Deal-Velocity" : "Deal Velocity",
      value: dealVelocity,
      unit: language === "de" ? " Tage" : " days",
      note: language === "de" ? "↓ Ziel <25 Tage" : "↓ Target <25 days",
      trend: trendFor(dealVelocity < 25, dealVelocity > 42),
      barPct: Math.max(0, 100 - dealVelocity * 2),
      spark: genSpark(dealVelocity, trendFor(dealVelocity < 25, dealVelocity > 42), 17),
    },
    {
      id: "health",
      label: "Health Score",
      value: healthScore,
      unit: "/100",
      note: language === "de" ? "Account-Gesundheit" : "Account health",
      trend: trendFor(healthScore >= 72, healthScore < 52),
      barPct: healthScore,
      spark: genSpark(healthScore, trendFor(healthScore >= 72, healthScore < 52), 19),
    },
  ];
};

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
