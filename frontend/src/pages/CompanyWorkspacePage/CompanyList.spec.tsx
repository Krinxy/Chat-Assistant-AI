import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CompanyList } from "./CompanyList";
import type { CompanyRecord } from "./companyWorkspace.types";

describe("CompanyList", () => {
  const mockCompanies: CompanyRecord[] = [
    {
      id: "1",
      name: "TechCorp",
      segment: "Technology",
      owner: "John Doe",
      isFavorite: true,
      lastVisited: "Today",
      assignedRoles: ["admin"],
      openQuestions: 5,
      completedQuestions: 10,
      pendingMeetings: 2,
      completedMeetings: 8,
      hypotheses: [],
      notes: [],
      documents: [],
      appointments: [],
      recentEvents: [],
      performanceSummary: "Strong performance",
      teamMembers: [],
      personas: [],
      newsfeed: [],
      portfolioSummary: "Portfolio summary",
    },
    {
      id: "2",
      name: "FinanceHub",
      segment: "Finance",
      owner: "Jane Smith",
      isFavorite: false,
      lastVisited: "Yesterday",
      assignedRoles: ["analyst"],
      openQuestions: 3,
      completedQuestions: 15,
      pendingMeetings: 1,
      completedMeetings: 12,
      hypotheses: [],
      notes: [],
      documents: [],
      appointments: [],
      recentEvents: [],
      performanceSummary: "Excellent performance",
      teamMembers: [],
      personas: [],
      newsfeed: [],
      portfolioSummary: "Portfolio summary",
    },
  ];

  it("renders company list", () => {
    const handleSelect = vi.fn();
    render(
      <CompanyList
        companies={mockCompanies}
        selectedCompanyId="1"
        onSelectCompany={handleSelect}
        language="en"
        searchPlaceholder="Search companies..."
        searchLabel="Companies"
        noResult="No companies found"
      />,
    );

    expect(screen.getByText("TechCorp")).toBeInTheDocument();
    expect(screen.getByText("FinanceHub")).toBeInTheDocument();
  });

  it("filters companies by search term", () => {
    const handleSelect = vi.fn();
    render(
      <CompanyList
        companies={mockCompanies}
        selectedCompanyId=""
        onSelectCompany={handleSelect}
        language="en"
        searchPlaceholder="Search companies..."
        searchLabel="Companies"
        noResult="No companies found"
      />,
    );

    const input = screen.getByPlaceholderText("Search companies...");
    fireEvent.change(input, { target: { value: "Tech" } });

    expect(screen.getByText("TechCorp")).toBeInTheDocument();
    expect(screen.queryByText("FinanceHub")).not.toBeInTheDocument();
  });

  it("calls onSelectCompany when a company is clicked", () => {
    const handleSelect = vi.fn();
    render(
      <CompanyList
        companies={mockCompanies}
        selectedCompanyId=""
        onSelectCompany={handleSelect}
        language="en"
        searchPlaceholder="Search companies..."
        searchLabel="Companies"
        noResult="No companies found"
      />,
    );

    const techCorpButton = screen.getByText("TechCorp").closest("button");
    fireEvent.click(techCorpButton!);

    expect(handleSelect).toHaveBeenCalledWith("1");
  });

  it("shows selected company as active", () => {
    const handleSelect = vi.fn();
    render(
      <CompanyList
        companies={mockCompanies}
        selectedCompanyId="1"
        onSelectCompany={handleSelect}
        language="en"
        searchPlaceholder="Search companies..."
        searchLabel="Companies"
        noResult="No companies found"
      />,
    );

    const techCorpButton = screen.getByText("TechCorp").closest("button");
    expect(techCorpButton).toHaveClass("is-active");

    const financeButton = screen.getByText("FinanceHub").closest("button");
    expect(financeButton).not.toHaveClass("is-active");
  });

  it("shows no result message when there are no companies", () => {
    const handleSelect = vi.fn();
    render(
      <CompanyList
        companies={[]}
        selectedCompanyId=""
        onSelectCompany={handleSelect}
        language="en"
        searchPlaceholder="Search companies..."
        searchLabel="Companies"
        noResult="No companies found"
      />,
    );

    expect(screen.getByText("No companies found")).toBeInTheDocument();
  });

  it("displays favorite indicator for favorite companies", () => {
    const handleSelect = vi.fn();
    render(
      <CompanyList
        companies={mockCompanies}
        selectedCompanyId=""
        onSelectCompany={handleSelect}
        language="en"
        searchPlaceholder="Search companies..."
        searchLabel="Companies"
        noResult="No companies found"
      />,
    );

    const techCorpItem = screen.getByText("TechCorp").closest("li");
    expect(techCorpItem).toHaveTextContent("*");

    const financeItem = screen.getByText("FinanceHub").closest("li");
    expect(financeItem).not.toHaveTextContent("*");
  });
});
