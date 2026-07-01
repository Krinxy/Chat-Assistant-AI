import { useCallback, useEffect, useState } from "react";

import type {
  CompanyRecord,
  CompanyTeamMemberEntry,
  ParsedAppointmentItem,
} from "../../../pages/CompanyWorkspacePage/companyWorkspace.types";
import { fetchCompanies, fetchPersonalAppointments, fetchPersonalColleagues } from "../api/companyApi";

export interface UseCompanyDataResult {
  companies: CompanyRecord[];
  personalColleagues: CompanyTeamMemberEntry[];
  personalAppointments: ParsedAppointmentItem[];
  isLoading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
}

/**
 * Loads the Company Workspace's base data (companies + personal desk) from the backend
 * once on mount (and whenever the token changes). Interactive edits (notes, hypotheses,
 * uploaded documents, ...) stay in component-local state layered on top of this base data —
 * this hook only replaces what used to be the static `companyWorkspace.data.ts` import.
 */
export function useCompanyData(token: string | null): UseCompanyDataResult {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [personalColleagues, setPersonalColleagues] = useState<CompanyTeamMemberEntry[]>([]);
  const [personalAppointments, setPersonalAppointments] = useState<ParsedAppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [companiesResult, colleaguesResult, appointmentsResult] = await Promise.all([
        fetchCompanies(token),
        fetchPersonalColleagues(token),
        fetchPersonalAppointments(token),
      ]);
      setCompanies(companiesResult);
      setPersonalColleagues(colleaguesResult);
      setPersonalAppointments(appointmentsResult);
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "unknown_error");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { companies, personalColleagues, personalAppointments, isLoading, loadError, reload };
}
