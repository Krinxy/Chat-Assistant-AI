import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { CompanyTeamTab } from './CompanyTeamTab';
import { getCompanyWorkspaceText } from './companyWorkspace.text';
import type { CompanyRecord, CompanyTeamMemberEntry } from './companyWorkspace.types';

const text = getCompanyWorkspaceText('en');

const mockCompany: CompanyRecord = {
  id: 'test-co',
  name: 'Test Company',
  segment: 'Tech',
  lastVisited: '2024-01-01',
  isFavorite: false,
  assignedRoles: ['admin'],
  owner: 'Jane',
  openQuestions: 0,
  completedQuestions: 0,
  pendingMeetings: 0,
  completedMeetings: 0,
  documents: [],
  hypotheses: [],
  appointments: [],
  notes: [],
  teamMembers: [],
  personas: ['Buyer'],
  newsfeed: [],
  recentEvents: ['Q1 Review'],
  portfolioSummary: '',
  performanceSummary: '',
};

const mockMember: CompanyTeamMemberEntry = {
  id: 'member-1',
  functionName: 'CEO',
  fullName: 'Alice Smith',
};

describe('CompanyTeamTab', () => {
  it('renders team member rows', () => {
    render(
      <CompanyTeamTab
        text={text}
        selectedCompany={mockCompany}
        activeTeamMembers={[mockMember]}
        editingTeamMemberId=""
        teamEditFunction=""
        teamEditName=""
        onTeamEditFunctionChange={() => {}}
        onTeamEditNameChange={() => {}}
        onStartTeamEdit={() => {}}
        onSaveTeamEdit={() => {}}
        onCancelTeamEdit={() => {}}
      />,
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('CEO')).toBeInTheDocument();
  });

  it('shows a select dropdown for team function when editing', () => {
    render(
      <CompanyTeamTab
        text={text}
        selectedCompany={mockCompany}
        activeTeamMembers={[mockMember]}
        editingTeamMemberId="member-1"
        teamEditFunction="CEO"
        teamEditName="Alice Smith"
        onTeamEditFunctionChange={() => {}}
        onTeamEditNameChange={() => {}}
        onStartTeamEdit={() => {}}
        onSaveTeamEdit={() => {}}
        onCancelTeamEdit={() => {}}
      />,
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
  });

  it('calls onStartTeamEdit when edit button is clicked', () => {
    const onStartTeamEdit = vi.fn();
    render(
      <CompanyTeamTab
        text={text}
        selectedCompany={mockCompany}
        activeTeamMembers={[mockMember]}
        editingTeamMemberId=""
        teamEditFunction=""
        teamEditName=""
        onTeamEditFunctionChange={() => {}}
        onTeamEditNameChange={() => {}}
        onStartTeamEdit={onStartTeamEdit}
        onSaveTeamEdit={() => {}}
        onCancelTeamEdit={() => {}}
      />,
    );

    const editButtons = screen.getAllByRole('button', { name: text.teamEditCol });
    fireEvent.click(editButtons[0]);
    expect(onStartTeamEdit).toHaveBeenCalledWith(mockMember);
  });
});
