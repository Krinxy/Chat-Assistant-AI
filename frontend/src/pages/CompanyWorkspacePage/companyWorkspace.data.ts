import type { Language } from "../../features/chat/types/chat";
import type { CompanyTab, DisplayRole, WeekdayTokenEntry } from "./companyWorkspace.types";

export const weekdayLabelsByLanguage: Record<Language, string[]> = {
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

export const weekdayTokenMap: WeekdayTokenEntry[] = [
  { index: 0, tokens: ["mo", "mon"] },
  { index: 1, tokens: ["di", "tu", "tue"] },
  { index: 2, tokens: ["mi", "we", "wed"] },
  { index: 3, tokens: ["do", "th", "thu"] },
  { index: 4, tokens: ["fr", "fri"] },
  { index: 5, tokens: ["sa", "sat"] },
  { index: 6, tokens: ["so", "su", "sun"] },
];

export const tabVisibilityByRole: Record<DisplayRole, CompanyTab[]> = {
  admin: [
    "overview",
    "portfolio",
    "performance",
    "documents",
    "hypotheses",
    "appointments",
    "notes",
    "team",
    "newsfeed",
  ],
  salesConsultant: [
    "overview",
    "portfolio",
    "performance",
    "documents",
    "hypotheses",
    "appointments",
    "notes",
    "team",
    "newsfeed",
  ],
  analyst: ["overview", "portfolio", "performance", "documents", "hypotheses", "newsfeed"],
  customer: ["overview", "portfolio", "performance", "documents", "appointments", "newsfeed"],
  guest: ["overview", "documents"],
};
