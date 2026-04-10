interface DayPulseOverlayProps {
  isVisible: boolean;
  fromDayNumber: string;
  fromDayName: string;
  toDayNumber: string;
  toDayName: string;
  monthLabel: string;
}

export function DayPulseOverlay({
  isVisible,
  fromDayNumber,
  fromDayName,
  toDayNumber,
  toDayName,
  monthLabel,
}: DayPulseOverlayProps) {
  return (
    <div className={`day-pulse-overlay${isVisible ? " is-visible" : ""}`} aria-hidden={!isVisible}>
      <div className="day-pulse-ribbon">
        <p className="day-pulse-month">{monthLabel}</p>
        <p className="day-pulse-from">
          <span>{fromDayNumber}</span>
          <small>{fromDayName}</small>
        </p>
        <p className="day-pulse-arrow" aria-hidden="true">
          {"->"}
        </p>
        <p className="day-pulse-to">
          <span>{toDayNumber}</span>
          <small>{toDayName}</small>
        </p>
      </div>
    </div>
  );
}
