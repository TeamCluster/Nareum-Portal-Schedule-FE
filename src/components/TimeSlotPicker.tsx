// Timeline slot picker shared by the public reserve form and admin add/edit.
// Public mode: toggle up to `maxHours` contiguous slots.
// Admin mode (autoFillRange): clicking fills the contiguous range to the click.

interface Props {
  bookedHours: number[];
  value: number[];
  onChange: (hours: number[]) => void;
  maxHours?: number;
  autoFillRange?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  openHour?: number;
  closeHour?: number;
  /** 정기 고정활동 시각(소프트): 선택은 가능하되 경고 표시(관리자 직접 추가용). */
  blockedHours?: number[];
}

export default function TimeSlotPicker({
  bookedHours,
  value,
  onChange,
  maxHours,
  autoFillRange = false,
  disabled = false,
  disabledMessage = "시설과 날짜를 먼저 선택해주세요.",
  openHour = 9,
  closeHour = 18,
  blockedHours = [],
}: Props) {
  const OPEN_HOUR = openHour;
  const CLOSE_HOUR = closeHour;
  const HOURS = Array.from({ length: Math.max(0, CLOSE_HOUR - OPEN_HOUR) }, (_, i) => OPEN_HOUR + i);
  const booked = new Set(bookedHours);
  const blocked = new Set(blockedHours);
  const selected = new Set(value);

  function handleClick(hour: number) {
    if (disabled || booked.has(hour)) return;

    if (autoFillRange) {
      // Toggle then expand to the contiguous range between min and max.
      const next = new Set(selected);
      if (next.has(hour)) next.delete(hour);
      else next.add(hour);

      if (next.size === 0) {
        onChange([]);
        return;
      }
      const arr = [...next].sort((a, b) => a - b);
      const min = arr[0];
      const max = arr[arr.length - 1];
      for (let h = min; h <= max; h++) {
        if (booked.has(h)) {
          alert("선택 구간 사이에 마감된 시간이 있어 연속 예약이 불가능합니다.");
          return;
        }
      }
      const filled: number[] = [];
      for (let h = min; h <= max; h++) filled.push(h);
      onChange(filled);
      return;
    }

    // Public toggle mode.
    const next = new Set(selected);
    if (next.has(hour)) next.delete(hour);
    else next.add(hour);

    const arr = [...next].sort((a, b) => a - b);
    if (maxHours != null && arr.length > maxHours) {
      alert(`예약은 하루 최대 ${maxHours}시간까지만 가능합니다.`);
      return;
    }
    if (arr.length === 2 && arr[1] - arr[0] !== 1) {
      alert("이용 시간은 반드시 연속된 시간으로만 선택 가능합니다.");
      return;
    }
    onChange(arr);
  }

  return (
    <div className="timeline-container">
      <div className="timeline-scale">
        {Array.from({ length: CLOSE_HOUR - OPEN_HOUR + 1 }, (_, i) => OPEN_HOUR + i).map((h) => (
          <span key={h} className="timeline-label">
            {String(h).padStart(2, "0")}
          </span>
        ))}
      </div>
      <div className="timeline-bar">
        {HOURS.map((h) => {
          const isBooked = booked.has(h);
          const isBlocked = !isBooked && blocked.has(h);
          const isSelected = selected.has(h);
          const cls = `time-slot-block${isBooked ? " booked" : ""}${
            isBlocked ? " blocked" : ""
          }${isSelected ? " selected" : ""}`;
          return (
            <div
              key={h}
              className={cls}
              title={isBlocked ? `${h}:00 ~ ${h + 1}:00 · 정기 고정활동(선택 시 경고)` : `${h}:00 ~ ${h + 1}:00`}
              onClick={() => handleClick(h)}
              style={disabled && !isBooked ? { cursor: "not-allowed", opacity: 0.5 } : undefined}
            >
              {isBooked ? (
                <span className="status-label">마감</span>
              ) : isBlocked ? (
                <span className="status-label">정기</span>
              ) : (
                <span className="status-label">{String(h).padStart(2, "0")}</span>
              )}
            </div>
          );
        })}
      </div>
      {disabled && <p className="timeline-note">{disabledMessage}</p>}
    </div>
  );
}
