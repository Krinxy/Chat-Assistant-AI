import type { Language } from "../../features/chat/types/chat";
import { weekdayLabelsByLanguage } from "./companyWorkspace.data";
import type { CompanyWorkspaceText } from "./companyWorkspace.text";
import type { CompanyTeamMemberEntry, ParsedAppointmentItem } from "./companyWorkspace.types";

interface CompanyAppointmentsTabProps {
  language: Language;
  text: CompanyWorkspaceText;
  appointmentItems: ParsedAppointmentItem[];
  visibleDayIndices: number[];
  activeTeamMembers: CompanyTeamMemberEntry[];
  companyAssignees: Record<string, string>;
  onAssigneeChange: (appointmentId: string, teamMemberId: string) => void;
}

export function CompanyAppointmentsTab({
  language,
  text,
  appointmentItems,
  visibleDayIndices,
  activeTeamMembers,
  companyAssignees,
  onAssigneeChange,
}: CompanyAppointmentsTabProps) {
  const weekDays = weekdayLabelsByLanguage[language];

  return (
    <div className="company-appointments-panel">
      <h4>{text.appointmentsTitle}</h4>
      <p>{text.appointmentsHint}</p>

      <div className="company-week-grid">
        {visibleDayIndices.map((dayIndex) => {
          const dayLabel = weekDays[dayIndex] ?? "";
          const dayItems = appointmentItems.filter((entry) => entry.dayIndex === dayIndex);

          return (
            <article key={dayLabel} className="company-week-day-card">
              <header>
                <strong>{dayLabel}</strong>
                <small>{dayItems.length}</small>
              </header>

              <ul>
                {dayItems.length === 0 ? <li className="is-empty">{text.appointmentEmpty}</li> : null}
                {dayItems.map((entry, rowIndex) => {
                  const fallbackAssigneeId =
                    activeTeamMembers[rowIndex % Math.max(1, activeTeamMembers.length)]?.id ?? "";
                  const selectedAssigneeId = companyAssignees[entry.id] ?? fallbackAssigneeId;

                  return (
                    <li key={entry.id}>
                      <div className="company-meeting-entry-head">
                        <time>{entry.timeLabel}</time>
                        <span>{entry.title}</span>
                      </div>
                      <label className="company-meeting-assignee-row">
                        <small>{text.appointmentAssignee}</small>
                        <select
                          className="company-meeting-assignee-select"
                          value={selectedAssigneeId}
                          onChange={(event) => {
                            onAssigneeChange(entry.id, event.target.value);
                          }}
                        >
                          <option value="">{text.appointmentUnassigned}</option>
                          {activeTeamMembers.map((member) => (
                            <option key={member.id} value={member.id}>{member.fullName}</option>
                          ))}
                        </select>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
