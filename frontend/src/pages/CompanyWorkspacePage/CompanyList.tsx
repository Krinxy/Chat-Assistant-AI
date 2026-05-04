import { useMemo, useState } from "react";
import type { CompanyRecord } from "./companyWorkspace.types";
import { getCompanyInitials } from "./companyWorkspace.utils";

interface CompanyListProps {
  companies: CompanyRecord[];
  selectedCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  searchPlaceholder: string;
  searchLabel: string;
  noResult: string;
}

export function CompanyList({
  companies,
  selectedCompanyId,
  onSelectCompany,
  searchPlaceholder,
  searchLabel,
  noResult,
}: CompanyListProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return companies;

    const lowerSearch = searchTerm.toLowerCase();
    return companies.filter(
      (company) =>
        company.name.toLowerCase().includes(lowerSearch) ||
        company.segment.toLowerCase().includes(lowerSearch) ||
        company.owner.toLowerCase().includes(lowerSearch),
    );
  }, [searchTerm, companies]);

  return (
    <div className="company-list-container">
      <label className="company-search-field">
        <span>{searchLabel}</span>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={searchPlaceholder}
        />
      </label>

      <ul className="company-list-scroll" aria-label={searchLabel}>
        {filteredCompanies.map((company) => {
          const isActive = company.id === selectedCompanyId;

          return (
            <li key={company.id}>
              <button
                type="button"
                className={`company-item-btn${isActive ? " is-active" : ""}`}
                onClick={() => onSelectCompany(company.id)}
              >
                <div className="company-item-main">
                  <span className="company-list-avatar" aria-hidden="true">
                    {getCompanyInitials(company.name)}
                  </span>
                  <div>
                    <strong>{company.name}</strong>
                    <small>{company.segment}</small>
                  </div>
                </div>
                <div className="company-item-meta">
                  <span>{company.lastVisited}</span>
                  {company.isFavorite ? <em>*</em> : null}
                </div>
              </button>
            </li>
          );
        })}

        {filteredCompanies.length === 0 ? (
          <li className="company-empty-item">{noResult}</li>
        ) : null}
      </ul>
    </div>
  );
}
