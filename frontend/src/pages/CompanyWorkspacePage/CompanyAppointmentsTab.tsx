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

const PLANNER_START = 8;
const PLANNER_END = 18;
const CARD_MIN_HEIGHT = 44;
const HOURS = Array.from({ length: PLANNER_END - PLANNER_START + 1 }, (_, i) => PLANNER_START + i);

function getPxPerHour(): number {
  if (typeof window === "undefined") return 60;
  return Math.max(54, Math.floor(window.innerHeight * 0.072));
}

function timeToTopPx(timeLabel: string, pxPerHour: number): number {
  const [hhStr, mmStr] = timeLabel.split(":");
  const hh = parseInt(hhStr ?? "0", 10);
  const mm = parseInt(mmStr ?? "0", 10);
  if (isNaN(hh) || isNaN(mm)) return 0;
  return ((hh - PLANNER_START) * 60 + mm) / 60 * pxPerHour;
}

function getInitials(name: string): string {
  return name
    .split(/[\s.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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
  const todayDayIndex = (new Date().getDay() + 6) % 7;
  const colClass = visibleDayIndices.length >= 6 ? "planner-grid--7col" : "";
  const pxPerHour = getPxPerHour();
  const totalHeight = (PLANNER_END - PLANNER_START) * pxPerHour;

  return (
    <div className="planner-root">
      <div className="planner-timeline-wrap">

        {/* Time axis */}
        <div className="planner-time-col" aria-hidden="true" style={{ height: totalHeight }}>
          {HOURS.map((h) => (
            <div
              key={h}
              className="planner-time-label"
              style={{ top: (h - PLANNER_START) * pxPerHour }}
            >
              {`${String(h).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className={`planner-grid ${colClass}`}>
          {visibleDayIndices.map((dayIndex) => {
            const dayItems = appointmentItems
              .filter((a) => a.dayIndex === dayIndex)
              .sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
            const isToday = dayIndex === todayDayIndex;

            return (
              <div key={dayIndex} className={`planner-col${isToday ? " is-today" : ""}`}>
                <div className="planner-col-head">
                  <span className="planner-col-name">{weekDays[dayIndex]}</span>
                  {dayItems.length > 0 && (
                    <span className="planner-col-count">{dayItems.length}</span>
                  )}
                </div>

                <div className="planner-col-body" style={{ height: totalHeight }}>
                  {/* Hour grid lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="planner-hour-line"
                      style={{ top: (h - PLANNER_START) * pxPerHour }}
                    />
                  ))}

                  {/* Appointment cards */}
                  {dayItems.map((entry, rowIndex) => {
                    const fallbackAssigneeId =
                      activeTeamMembers[rowIndex % Math.max(1, activeTeamMembers.length)]?.id ?? "";
                    const selectedAssigneeId = companyAssignees[entry.id] ?? fallbackAssigneeId;
                    const visibleAttendees = entry.attendees.slice(0, 3);
                    const extraCount = entry.attendees.length - visibleAttendees.length;
                    const top = timeToTopPx(entry.timeLabel, pxPerHour);

                    return (
                      <div
                        key={entry.id}
                        className="planner-card"
                        style={{ top, minHeight: CARD_MIN_HEIGHT }}
                      >
                        <time className="planner-card-time">{entry.timeLabel}</time>
                        <span className="planner-card-title">{entry.title}</span>

                        {entry.attendees.length > 0 && (
                          <div className="planner-card-attendees">
                            {visibleAttendees.map((name) => (
                              <div key={name} className="planner-avatar" title={name}>
                                {getInitials(name)}
                              </div>
                            ))}
                            {extraCount > 0 && (
                              <div className="planner-avatar planner-avatar--more">
                                +{extraCount}
                              </div>
                            )}
                          </div>
                        )}

                        <select
                          className="planner-assignee-select company-meeting-assignee-select"
                          value={selectedAssigneeId}
                          onChange={(e) => onAssigneeChange(entry.id, e.target.value)}
                          aria-label={text.appointmentUnassigned}
                        >
                          <option value="">{text.appointmentUnassigned}</option>
                          {activeTeamMembers.map((member) => (
                            <option key={member.id} value={member.id}>{member.fullName}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
