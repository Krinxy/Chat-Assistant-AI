import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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

const TOTAL_HOURS = 24;
const WORK_MID = 12.5;           // 12:30 — default centre
const CARD_MIN_HEIGHT = 44;
const VISIBLE_HOURS = 9;
const REPEAT_CYCLES = 3;         // render 3×24h so wrapping is seamless
const COL_HEAD_HEIGHT = 38;

// Virtual hour indices across all 3 cycles  0 … 72
const HOURS_VIRTUAL = Array.from({ length: TOTAL_HOURS * REPEAT_CYCLES + 1 }, (_, i) => i);

// centreHour lives in [TOTAL_HOURS, TOTAL_HOURS*2) = [24, 48)
// Instant normalization: content repeats so there is no visible jump
function normalizeCentre(v: number): number {
  let n = v;
  while (n < TOTAL_HOURS) n += TOTAL_HOURS;
  while (n >= TOTAL_HOURS * 2) n -= TOTAL_HOURS;
  return n;
}

function getPxPerHour(): number {
  if (typeof window === "undefined") return 60;
  return Math.max(54, Math.floor(window.innerHeight * 0.072));
}

// Returns position in a SINGLE cycle (0 … TOTAL_HOURS * pxPerHour)
function timeToTopPx(timeLabel: string, pxPerHour: number): number {
  const [hhStr, mmStr] = timeLabel.split(":");
  const hh = parseInt(hhStr ?? "0", 10);
  const mm = parseInt(mmStr ?? "0", 10);
  if (isNaN(hh) || isNaN(mm)) return 0;
  return (hh * 60 + mm) / 60 * pxPerHour;
}

function getInitials(name: string): string {
  return name
    .split(/[\s.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// ── Drum wheel ────────────────────────────────────────────────────────────────
const DRUM_HALF_SPAN = 5;

interface DrumWheelProps {
  centreHour: number;              // virtual, in [24, 48)
  onCentreHourChange: (h: number) => void;
  pxPerHour: number;
  viewportHeightPx: number;
  scrollOffsetPx: number;          // clamped grid offset, for aligning flat labels
}

function DrumWheel({ centreHour, onCentreHourChange, pxPerHour, viewportHeightPx, scrollOffsetPx }: DrumWheelProps) {
  const [isHovered, setIsHovered] = useState(false);
  const dragRef = useRef<{ startY: number; startCentre: number } | null>(null);
  const isMouseOverRef = useRef(false);

  const drumHeight = viewportHeightPx;
  const pxPerDrumHour = drumHeight / (DRUM_HALF_SPAN * 2);

  const update = useCallback((v: number) => {
    onCentreHourChange(normalizeCentre(v));
  }, [onCentreHourChange]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startCentre: centreHour };
  }, [centreHour]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current === null) return;
    const deltaHours = (e.clientY - dragRef.current.startY) / pxPerDrumHour;
    update(dragRef.current.startCentre - deltaHours);
  }, [pxPerDrumHour, update]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    if (!isMouseOverRef.current) setIsHovered(false);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    update(centreHour + e.deltaY / pxPerHour);
  }, [centreHour, pxPerHour, update]);

  // Display hour at centre (0..23)
  const centreDisplay = ((centreHour % TOTAL_HOURS) + TOTAL_HOURS) % TOTAL_HOURS;

  // ── Hover mode: 3D drum labels ──
  // Iterate d=0..23 only — d=24 is identical to d=0 (both midnight) and
  // would produce a duplicate "00:00" label at the same offset.
  const drumItems: Array<{ displayHour: number; offset: number }> = [];
  for (let d = 0; d < TOTAL_HOURS; d++) {
    const candidates = [d, d + TOTAL_HOURS, d + TOTAL_HOURS * 2];
    const vHour = candidates.reduce((best, c) =>
      Math.abs(c - centreHour) < Math.abs(best - centreHour) ? c : best
    );
    const offset = vHour - centreHour;
    if (Math.abs(offset) <= DRUM_HALF_SPAN + 1) {
      drumItems.push({ displayHour: d, offset });
    }
  }

  // ── Static mode: flat labels aligned with grid ──
  const viewStart = centreHour - VISIBLE_HOURS / 2 - 1;
  const viewEnd   = centreHour + VISIBLE_HOURS / 2 + 1;
  const staticLabels: Array<{ key: number; displayHour: number; top: number; isCentre: boolean }> = [];
  for (let vh = Math.floor(viewStart); vh <= Math.ceil(viewEnd); vh++) {
    const top = vh * pxPerHour - scrollOffsetPx;
    if (top < -14 || top > viewportHeightPx + 14) continue;
    const displayHour = ((vh % TOTAL_HOURS) + TOTAL_HOURS) % TOTAL_HOURS;
    staticLabels.push({ key: vh, displayHour, top, isCentre: Math.abs(vh - centreHour) < 0.7 });
  }

  return (
    <div
      className={`drum-wheel${isHovered ? " drum-wheel--active" : ""}`}
      style={{ height: drumHeight }}
      onMouseEnter={() => { isMouseOverRef.current = true; setIsHovered(true); }}
      onMouseLeave={() => { isMouseOverRef.current = false; if (dragRef.current === null) setIsHovered(false); }}
      onPointerDown={isHovered ? onPointerDown : undefined}
      onPointerMove={isHovered ? onPointerMove : undefined}
      onPointerUp={onPointerUp}
      onWheel={isHovered ? onWheel : undefined}
      role="slider"
      aria-label="Uhr – ziehen zum Blättern"
      aria-valuenow={Math.round(centreDisplay)}
      aria-valuemin={0}
      aria-valuemax={23}
    >
      {isHovered ? (
        <>
          <div className="drum-centre-line" />
          {drumItems.map(({ displayHour, offset }) => {
            const absOffset = Math.abs(offset);
            const normalised = absOffset / DRUM_HALF_SPAN;
            const yFraction = Math.sin((offset / DRUM_HALF_SPAN) * (Math.PI / 2));
            const topPx = drumHeight / 2 + yFraction * (drumHeight / 2) * 0.92;
            const scale = Math.cos((normalised * Math.PI) / 2);
            const opacity = Math.max(0, 1 - normalised * 1.1);
            const isCentre = Math.abs(offset) < 0.7;
            return (
              <div
                key={displayHour}
                className={`drum-label${isCentre ? " drum-label--centre" : ""}`}
                style={{
                  top: topPx,
                  transform: `translateY(-50%) scaleY(${scale.toFixed(3)})`,
                  opacity: opacity.toFixed(3),
                }}
              >
                {`${String(displayHour).padStart(2, "0")}:00`}
              </div>
            );
          })}
          <div className="drum-handle" aria-hidden="true">
            <svg width="10" height="28" viewBox="0 0 10 28" fill="none">
              <line x1="5" y1="2" x2="5" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
            </svg>
          </div>
        </>
      ) : (
        staticLabels.map(({ key, displayHour, top, isCentre }) => (
          <div
            key={key}
            className={`planner-time-label${isCentre ? " planner-time-label--active" : ""}`}
            style={{ top }}
          >
            {`${String(displayHour).padStart(2, "0")}:00`}
          </div>
        ))
      )}
    </div>
  );
}

// ── Add-appointment modal ──────────────────────────────────────────────────────
interface AddAppointmentModalProps {
  text: CompanyWorkspaceText;
  weekDays: string[];
  visibleDayIndices: number[];
  activeTeamMembers: CompanyTeamMemberEntry[];
  onSave: (item: ParsedAppointmentItem) => void;
  onClose: () => void;
}

function AddAppointmentModal({ text, weekDays, visibleDayIndices, activeTeamMembers, onSave, onClose }: AddAppointmentModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dayIndex, setDayIndex] = useState<number>(visibleDayIndices[0] ?? 0);
  const [timeValue, setTimeValue] = useState("09:00");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const attendees = activeTeamMembers
      .filter((m) => selectedMemberIds.includes(m.id))
      .map((m) => m.fullName);
    const newItem: ParsedAppointmentItem = {
      id: `new-${Date.now()}`,
      dayIndex,
      timeLabel: timeValue,
      title: title.trim(),
      attendees,
      description: description.trim() || undefined,
    };
    onSave(newItem);
  };

  return (
    <div className="appt-modal-overlay" role="dialog" aria-modal="true" aria-label={text.appointmentFormTitle} onClick={onClose}>
      <div className="appt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="appt-modal-header">
          <span className="appt-modal-heading">{text.appointmentFormTitle}</span>
          <button className="appt-modal-close" onClick={onClose} aria-label={text.appointmentFormCancel} type="button">✕</button>
        </div>

        <form className="appt-modal-form" onSubmit={handleSubmit}>
          <label className="appt-form-label">
            {text.appointmentFormName}
            <input
              className="appt-form-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={text.appointmentFormName}
              required
              autoFocus
            />
          </label>

          <label className="appt-form-label">
            {text.appointmentFormDesc}
            <textarea
              className="appt-form-input appt-form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={text.appointmentFormDesc}
              rows={3}
            />
          </label>

          <div className="appt-form-row">
            <label className="appt-form-label appt-form-label--half">
              {text.appointmentFormDay}
              <select
                className="appt-form-input"
                value={dayIndex}
                onChange={(e) => setDayIndex(Number(e.target.value))}
              >
                {visibleDayIndices.map((di) => (
                  <option key={di} value={di}>{weekDays[di]}</option>
                ))}
              </select>
            </label>

            <label className="appt-form-label appt-form-label--half">
              {text.appointmentFormTime}
              <input
                className="appt-form-input"
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
              />
            </label>
          </div>

          {activeTeamMembers.length > 0 && (
            <div className="appt-form-label">
              <span>{text.appointmentFormPeople}</span>
              <div className="appt-form-people">
                {activeTeamMembers.map((member) => {
                  const checked = selectedMemberIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      className={`appt-people-chip${checked ? " appt-people-chip--selected" : ""}`}
                      onClick={() => toggleMember(member.id)}
                    >
                      {getInitials(member.fullName)}
                      <span className="appt-people-chip-name">{member.fullName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="appt-form-actions">
            <button type="button" className="appt-form-btn appt-form-btn--ghost" onClick={onClose}>
              {text.appointmentFormCancel}
            </button>
            <button type="submit" className="appt-form-btn appt-form-btn--primary">
              {text.appointmentFormSave}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
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

  const [newItems, setNewItems] = useState<ParsedAppointmentItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const allAppointmentItems = [...appointmentItems, ...newItems];

  // centreHour is a virtual float in [24, 48) — middle of the 3-cycle grid
  const [centreHour, setCentreHour] = useState<number>(TOTAL_HOURS + WORK_MID);

  const updateCentreHour = useCallback((v: number) => {
    setCentreHour(normalizeCentre(v));
  }, []);

  // Total virtual grid height = 3 × 24h
  const totalGridHeight = TOTAL_HOURS * REPEAT_CYCLES * pxPerHour;
  const viewportHeightPx = VISIBLE_HOURS * pxPerHour;

  // centreHour sits in [24,48) → plenty of buffer on both sides, no hard clamp needed
  const scrollOffsetPx = centreHour * pxPerHour - viewportHeightPx / 2;
  const clampedScrollOffset = Math.max(0, Math.min(totalGridHeight - viewportHeightPx, scrollOffsetPx));

  const onGridWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    updateCentreHour(centreHour + e.deltaY / pxPerHour);
  }, [centreHour, pxPerHour, updateCentreHour]);

  // Reset to middle-cycle 12:30 when appointments change
  useEffect(() => {
    setCentreHour(TOTAL_HOURS + WORK_MID);
  }, [appointmentItems]);

  const rootHeight = 8 + COL_HEAD_HEIGHT + viewportHeightPx;

  return (
    <>
      <div className="appt-add-bar">
        <button
          className="appt-add-btn"
          type="button"
          onClick={() => setShowAddForm(true)}
        >
          {text.addAppointment}
        </button>
      </div>

      {showAddForm && (
        <AddAppointmentModal
          text={text}
          weekDays={weekDays}
          visibleDayIndices={visibleDayIndices}
          activeTeamMembers={activeTeamMembers}
          onSave={(item) => { setNewItems((prev) => [...prev, item]); setShowAddForm(false); }}
          onClose={() => setShowAddForm(false)}
        />
      )}

    <div className="planner-root" style={{ height: rootHeight }}>
      <div className="planner-timeline-wrap">

        {/* ── Left column: spacer + drum wheel ── */}
        <div className="planner-drum-col">
          <div className="planner-drum-spacer" style={{ height: COL_HEAD_HEIGHT }} />
          <DrumWheel
            centreHour={centreHour}
            onCentreHourChange={updateCentreHour}
            pxPerHour={pxPerHour}
            viewportHeightPx={viewportHeightPx}
            scrollOffsetPx={clampedScrollOffset}
          />
        </div>

        {/* ── Right column: fixed headers + scrollable grid ── */}
        <div className="planner-right">

          <div className="planner-header-row" style={{ height: COL_HEAD_HEIGHT }}>
            <div className={`planner-grid ${colClass}`}>
              {visibleDayIndices.map((dayIndex) => {
                const count = allAppointmentItems.filter((a) => a.dayIndex === dayIndex).length;
                const isToday = dayIndex === todayDayIndex;
                return (
                  <div key={dayIndex} className={`planner-col-head${isToday ? " is-today" : ""}`}>
                    <span className="planner-col-name">{weekDays[dayIndex]}</span>
                    {count > 0 && <span className="planner-col-count">{count}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="planner-viewport"
            style={{ height: viewportHeightPx }}
            onWheel={onGridWheel}
          >
            <div
              className="planner-inner"
              style={{ transform: `translateY(-${clampedScrollOffset}px)`, height: totalGridHeight }}
            >
              <div className={`planner-grid ${colClass}`}>
                {visibleDayIndices.map((dayIndex) => {
                  const dayItems = allAppointmentItems
                    .filter((a) => a.dayIndex === dayIndex)
                    .sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
                  const isToday = dayIndex === todayDayIndex;

                  return (
                    <div key={dayIndex} className={`planner-col${isToday ? " is-today" : ""}`}>
                      <div className="planner-col-body">

                        {/* Hour grid lines across all 3 cycles */}
                        {HOURS_VIRTUAL.map((h) => (
                          <div
                            key={h}
                            className="planner-hour-line"
                            style={{ top: h * pxPerHour }}
                          />
                        ))}

                        {/* Appointment cards — repeated across all 3 cycles */}
                        {Array.from({ length: REPEAT_CYCLES }, (_, cycle) =>
                          dayItems.map((entry, rowIndex) => {
                            const cycleOffsetPx = cycle * TOTAL_HOURS * pxPerHour;
                            const top = timeToTopPx(entry.timeLabel, pxPerHour) + cycleOffsetPx;
                            // Cull cards outside the visible viewport + small buffer
                            if (
                              top + CARD_MIN_HEIGHT < clampedScrollOffset - 60 ||
                              top > clampedScrollOffset + viewportHeightPx + 60
                            ) return null;

                            const fallbackAssigneeId =
                              activeTeamMembers[rowIndex % Math.max(1, activeTeamMembers.length)]?.id ?? "";
                            const selectedAssigneeId = companyAssignees[entry.id] ?? fallbackAssigneeId;
                            const visibleAttendees = entry.attendees.slice(0, 3);
                            const extraCount = entry.attendees.length - visibleAttendees.length;

                            return (
                              <div
                                key={`${entry.id}-c${cycle}`}
                                className="planner-card"
                                style={{ top, minHeight: CARD_MIN_HEIGHT }}
                              >
                                <time className="planner-card-time">{entry.timeLabel}</time>
                                <span className="planner-card-title">{entry.title}</span>
                                {entry.description && (
                                  <p className="planner-card-desc">{entry.description}</p>
                                )}

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
                          })
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

