import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
  /** Optional: called when the user accepts or declines an RSVP invite. */
  onRsvp?: (appointmentId: string, decision: "accepted" | "declined") => void;
  /** Optional: copy strings for the RSVP UI (omit to hide RSVP controls). */
  rsvpCopy?: { accept: string; decline: string; pendingLabel: string; from: string };
}

const TOTAL_HOURS = 24;
const WORK_MID = 12.5;           // 12:30 — default centre
const CARD_MIN_HEIGHT = 44;
/** Below this height only time + title (1 line) are shown; card is clickable to expand */
const COMPACT_THRESHOLD = 58;
/** Below this height attendees are shown but description and assignee select are hidden */
const MEDIUM_THRESHOLD  = 90;
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

/** Compute pixel height of a card from start → end time. Falls back to CARD_MIN_HEIGHT. */
function durationToPx(start: string, end: string | undefined, pxPerHour: number): number {
  if (!end) return CARD_MIN_HEIGHT;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return CARD_MIN_HEIGHT;
  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60; // overnight crossing
  return Math.max(CARD_MIN_HEIGHT, ((endMin - startMin) / 60) * pxPerHour);
}

/** Return end-time string that is `minutes` after the given HH:MM start. */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return "";
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// ── Overlap column layout (Google Calendar style) ─────────────────────────────
interface ColLayout { col: number; totalCols: number; }

/**
 * Assigns each appointment to a horizontal sub-column so that overlapping
 * appointments are shown side-by-side rather than stacked on top of each other.
 * Uses a greedy interval-scheduling algorithm + union-find for cluster sizing.
 */
function computeColumnLayout(
  items: ParsedAppointmentItem[],
  pxPerHour: number,
): Map<string, ColLayout> {
  if (items.length === 0) return new Map();

  const cardDurMin = Math.round((CARD_MIN_HEIGHT / pxPerHour) * 60);

  const startOf = (item: ParsedAppointmentItem): number => {
    const [h, m] = item.timeLabel.split(":").map(Number);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  };
  const endOf = (item: ParsedAppointmentItem): number => {
    const s = startOf(item);
    if (!item.endTimeLabel) return s + cardDurMin;
    const [h, m] = item.endTimeLabel.split(":").map(Number);
    if (isNaN(h)) return s + cardDurMin;
    const e = h * 60 + (isNaN(m) ? 0 : m);
    return e > s ? e : e + 24 * 60; // overnight crossing
  };

  // Sort by start time so the greedy pass is O(n log n)
  const sorted = [...items].sort((a, b) => startOf(a) - startOf(b));

  // Greedy: assign each item to the earliest free column
  const itemCol = new Map<string, number>();
  const colEnd: number[] = []; // end-time of the last item placed in each column
  for (const item of sorted) {
    const s = startOf(item);
    const e = endOf(item);
    let col = colEnd.findIndex((end) => end <= s);
    if (col === -1) { col = colEnd.length; colEnd.push(e); }
    else colEnd[col] = e;
    itemCol.set(item.id, col);
  }

  // Union-find: group transitively overlapping items into clusters
  const parent = sorted.map((_, i) => i);
  const find = (i: number): number => {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  };
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (startOf(sorted[j]) < endOf(sorted[i])) {
        const pi = find(i), pj = find(j);
        if (pi !== pj) parent[pi] = pj;
      } else break; // sorted by start → no further j can overlap i
    }
  }

  // Per cluster: totalCols = highest column index used + 1
  const clusterMax = new Map<number, number>();
  for (let i = 0; i < sorted.length; i++) {
    const root = find(i);
    const col  = itemCol.get(sorted[i].id) ?? 0;
    clusterMax.set(root, Math.max(clusterMax.get(root) ?? 0, col));
  }

  const result = new Map<string, ColLayout>();
  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    result.set(item.id, {
      col:       itemCol.get(item.id) ?? 0,
      totalCols: (clusterMax.get(find(i)) ?? 0) + 1,
    });
  }
  return result;
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
  const [endTimeValue, setEndTimeValue] = useState("09:30");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [recurring, setRecurring] = useState(false);

  const handleStartChange = (val: string) => {
    setTimeValue(val);
    // auto-push end time if it's no longer after start
    setEndTimeValue((prev) => {
      const [sh, sm] = val.split(":").map(Number);
      const [eh, em] = prev.split(":").map(Number);
      if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return prev;
      if (eh * 60 + em <= sh * 60 + sm) return addMinutes(val, 30);
      return prev;
    });
  };

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
      weekIndex: 0,
      timeLabel: timeValue,
      endTimeLabel: endTimeValue || undefined,
      title: title.trim(),
      attendees,
      description: description.trim() || undefined,
      recurring: recurring || undefined,
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
            <label className="appt-form-label appt-form-label--third">
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

            <label className="appt-form-label appt-form-label--third">
              {text.appointmentFormTime}
              <input
                className="appt-form-input"
                type="time"
                value={timeValue}
                onChange={(e) => handleStartChange(e.target.value)}
              />
            </label>

            <label className="appt-form-label appt-form-label--third">
              {text.appointmentFormEnd}
              <input
                className="appt-form-input"
                type="time"
                value={endTimeValue}
                onChange={(e) => setEndTimeValue(e.target.value)}
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
            <button
              type="button"
              className={`appt-recurring-toggle${recurring ? " appt-recurring-toggle--on" : ""}`}
              onClick={() => setRecurring((v) => !v)}
              aria-pressed={recurring}
            >
              &#x21BB; {text.appointmentFormRecurring}
            </button>
            <div className="appt-form-actions-right">
              <button type="button" className="appt-form-btn appt-form-btn--ghost" onClick={onClose}>
                {text.appointmentFormCancel}
              </button>
              <button type="submit" className="appt-form-btn appt-form-btn--primary">
                {text.appointmentFormSave}
              </button>
            </div>
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
  onRsvp,
  rsvpCopy,
}: CompanyAppointmentsTabProps) {
  const weekDays = weekdayLabelsByLanguage[language];
  const todayDayIndex = (new Date().getDay() + 6) % 7;
  const colClass = visibleDayIndices.length >= 6 ? "planner-grid--7col" : "";
  const pxPerHour = getPxPerHour();

  const [newItems, setNewItems] = useState<ParsedAppointmentItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const weekLabel = useMemo(() => {
    const today = new Date();
    const dow = today.getDay(); // 0 = Sun, 1 = Mon … 6 = Sat
    const daysToMonday = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday + weekOffset * 7);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    if (language === "de") {
      const d = (dt: Date) => `${dt.getDate()}.${dt.getMonth() + 1}.`;
      return `${d(monday)} – ${d(friday)} ${monday.getFullYear()}`;
    }
    const d = (dt: Date) =>
      dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return `${d(monday)} – ${d(friday)} ${monday.getFullYear()}`;
  }, [weekOffset, language]);

  // Always offer Mon–Fri in the Add-Appointment form regardless of which days
  // happen to have existing appointments.
  const modalDayIndices = useMemo(
    () => [...new Set([0, 1, 2, 3, 4, ...visibleDayIndices])].sort((a, b) => a - b),
    [visibleDayIndices],
  );

  // Only show appointments that belong to the currently viewed week,
  // OR that are marked as recurring (they appear in every week).
  const allAppointmentItems = useMemo(
    () => [...appointmentItems, ...newItems].filter(
      (item) => item.recurring === true || item.weekIndex === weekOffset
    ),
    [appointmentItems, newItems, weekOffset],
  );

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

        <div className="appt-week-nav">
          <button
            className="appt-week-nav-btn"
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label={language === "de" ? "Vorherige Woche" : "Previous week"}
          >
            ‹
          </button>
          <span className="appt-week-label">{weekLabel}</span>
          <button
            className="appt-week-nav-btn"
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label={language === "de" ? "Nächste Woche" : "Next week"}
          >
            ›
          </button>
        </div>
      </div>

      {showAddForm && (
        <AddAppointmentModal
          text={text}
          weekDays={weekDays}
          visibleDayIndices={modalDayIndices}
          activeTeamMembers={activeTeamMembers}
          onSave={(item) => { setNewItems((prev) => [...prev, { ...item, weekIndex: weekOffset }]); setShowAddForm(false); }}
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
                  const colLayoutMap = computeColumnLayout(dayItems, pxPerHour);
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
                            const cardKey = `${entry.id}-c${cycle}`;
                            const cycleOffsetPx = cycle * TOTAL_HOURS * pxPerHour;
                            const top = timeToTopPx(entry.timeLabel, pxPerHour) + cycleOffsetPx;
                            const cardHeight = durationToPx(entry.timeLabel, entry.endTimeLabel, pxPerHour);
                            // Cull cards outside the visible viewport + small buffer
                            if (
                              top + cardHeight < clampedScrollOffset - 60 ||
                              top > clampedScrollOffset + viewportHeightPx + 60
                            ) return null;

                            const isExpanded = expandedCardId === cardKey;

                            // Horizontal column layout for overlapping appointments
                            const { col, totalCols } = colLayoutMap.get(entry.id) ?? { col: 0, totalCols: 1 };
                            const leftPct  = (col / totalCols) * 100;
                            const rightPct = ((totalCols - col - 1) / totalCols) * 100;
                            // 2 px inner padding on each exposed edge; expanded cards stay in their lane
                            const cardLeft  = leftPct  > 0 ? `calc(${leftPct.toFixed(4)}% + 1px)` : "2px";
                            const cardRight = rightPct > 0 ? `calc(${rightPct.toFixed(4)}% + 1px)` : "2px";

                            const fallbackAssigneeId =
                              activeTeamMembers[rowIndex % Math.max(1, activeTeamMembers.length)]?.id ?? "";
                            const selectedAssigneeId = companyAssignees[entry.id] ?? fallbackAssigneeId;
                            const visibleAttendees = entry.attendees.slice(0, 3);
                            const extraCount = entry.attendees.length - visibleAttendees.length;
                            const isPending  = entry.rsvp === "pending";
                            const isDeclined = entry.rsvp === "declined";

                            // compact  = only time + title (1 line)
                            // medium   = time + title + attendees (no description, no select)
                            // full     = everything (no click needed)
                            const compact = !isExpanded && cardHeight < COMPACT_THRESHOLD;
                            const medium  = !isExpanded && !compact && cardHeight < MEDIUM_THRESHOLD;
                            // Pending invites are always clickable so the RSVP panel can be revealed
                            const canClick = compact || medium || isExpanded || isPending;

                            // In collapsed pending state only the invite badge is shown below the title;
                            // all other details (attendees, description, select) stay hidden until expanded.
                            const showAttendees   = isExpanded || (!compact && !isPending);
                            const showDescription = isExpanded || (!compact && !medium && !isPending);
                            const showSelect      = isExpanded && !isPending;
                            const showInviteBadge = isPending && !isExpanded;
                            const cardClassName = [
                              "planner-card",
                              compact ? "planner-card--compact" : "",
                              isExpanded ? "planner-card--expanded" : "",
                              totalCols > 1 ? "planner-card--overlap" : "",
                              isPending ? "planner-card--invite" : "",
                              isDeclined ? "planner-card--declined" : "",
                            ].filter(Boolean).join(" ");

                            return (
                              <div
                                key={cardKey}
                                className={cardClassName}
                                style={{
                                  top,
                                  left: cardLeft,
                                  right: cardRight,
                                  height: isExpanded ? "auto" : cardHeight,
                                  minHeight: isExpanded ? cardHeight : undefined,
                                  cursor: canClick ? "pointer" : "default",
                                }}
                                onClick={canClick ? () => setExpandedCardId(isExpanded ? null : cardKey) : undefined}
                              >
                                <div className={showInviteBadge ? "planner-card-time-row" : undefined}>
                                  <time className="planner-card-time">
                                    {entry.recurring && (
                                      <span className="planner-card-recurring" title={text.appointmentFormRecurring}>&#x21BB;</span>
                                    )}
                                    {entry.endTimeLabel ? `${entry.timeLabel} – ${entry.endTimeLabel}` : entry.timeLabel}
                                  </time>
                                  {showInviteBadge && (
                                    <span className="planner-card-invite-badge">
                                      {rsvpCopy?.pendingLabel ?? "Einladung"}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="planner-card-title"
                                  style={compact ? { WebkitLineClamp: 1, lineClamp: 1 } as React.CSSProperties : undefined}
                                >
                                  {entry.title}
                                </span>

                                {/* Collapsed invite badge moved inline to time row — nothing extra here */}

                                {showDescription && entry.description && (
                                  <p className="planner-card-desc">{entry.description}</p>
                                )}

                                {showAttendees && entry.attendees.length > 0 && (
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

                                {/* RSVP invite UI — only when expanded */}
                                {isPending && isExpanded && rsvpCopy !== undefined && onRsvp !== undefined && (
                                  <div
                                    className="planner-card-rsvp"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {entry.invitedBy !== undefined && (
                                      <span className="planner-card-rsvp-from">
                                        {rsvpCopy.from}: {entry.invitedBy}
                                      </span>
                                    )}
                                    <div className="planner-card-rsvp-actions">
                                      <button
                                        type="button"
                                        className="planner-rsvp-btn planner-rsvp-btn--accept"
                                        onClick={() => onRsvp(entry.id, "accepted")}
                                      >
                                        {rsvpCopy.accept}
                                      </button>
                                      <button
                                        type="button"
                                        className="planner-rsvp-btn planner-rsvp-btn--decline"
                                        onClick={() => onRsvp(entry.id, "declined")}
                                      >
                                        {rsvpCopy.decline}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {showSelect && !isPending && (
                                  <select
                                    className="planner-assignee-select company-meeting-assignee-select"
                                    value={selectedAssigneeId}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => onAssigneeChange(entry.id, e.target.value)}
                                    aria-label={text.appointmentUnassigned}
                                  >
                                    <option value="">{text.appointmentUnassigned}</option>
                                    {activeTeamMembers.map((member) => (
                                      <option key={member.id} value={member.id}>{member.fullName}</option>
                                    ))}
                                  </select>
                                )}
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

