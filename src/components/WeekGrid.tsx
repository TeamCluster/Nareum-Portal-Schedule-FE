import type { DaySegment, WeekGrid as WeekGridData } from "../api/types";
import { recurringKindLabel } from "../lib/recurringKinds";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

function buildColumn(segments: DaySegment[]) {
  const startMap = new Map<number, DaySegment>();
  const covered = new Set<number>();
  for (const s of segments) {
    if (s.type === "free") continue;
    startMap.set(s.from_hour, s);
    for (let h = s.from_hour + 1; h < s.to_hour; h++) covered.add(h);
  }
  return { startMap, covered };
}

function dayLabel(dateStr: string, weekdayIdx: number) {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)} (${WEEKDAYS[weekdayIdx]})`;
}

/**
 * 주간 시설별 리소스 그리드.
 * 행 = 시간, 열 = [요일 × 시설]. 각 요일을 시설 수만큼 세로로 나눠 예약이
 * 겹쳐 보이지 않게 한다. 예약 칸 클릭 → 상세 이동.
 */
export default function WeekGrid({
  grid,
  onPick,
}: {
  grid: WeekGridData;
  onPick: (resId: number) => void;
}) {
  const { facilities, days, hour_min, hour_max } = grid;
  const hours = Array.from({ length: Math.max(0, hour_max - hour_min) }, (_, i) => hour_min + i);
  const nFac = facilities.length;

  // days[di] 의 facilityId -> 컬럼(startMap/covered)
  const cols = days.map((day) => {
    const map = new Map<number, ReturnType<typeof buildColumn>>();
    for (const f of day.facilities) map.set(f.id, buildColumn(f.segments));
    return map;
  });

  return (
    <div className="week-grid-scroll">
      <table className="week-grid">
        <thead>
          <tr>
            <th className="wg-hour" rowSpan={2}>시간</th>
            {days.map((day, di) => (
              <th key={di} colSpan={nFac || 1}
                  className={`wg-day${day.is_open ? "" : " closed"}`}>
                {dayLabel(day.date, di)}
                {!day.is_open && <span className="wg-day-badge">휴무</span>}
              </th>
            ))}
          </tr>
          <tr>
            {days.map((_, di) =>
              facilities.map((f) => (
                <th key={`${di}-${f.id}`} className="wg-fac" title={f.name}>
                  <span>{f.name}</span>
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h}>
              <td className="wg-hour">{String(h).padStart(2, "0")}</td>
              {days.map((day, di) => {
                if (!day.is_open) {
                  // 휴무일: 시설 컬럼 전체를 한 칸으로 병합(colSpan×rowSpan)해 "휴무" 1회 표기.
                  if (h !== hour_min) return null;
                  return (
                    <td key={`closed-${di}`} colSpan={nFac} rowSpan={hours.length}
                        className="wg-cell wg-closed"
                        title={day.closed_reason ? `휴무 (${day.closed_reason})` : "휴무"}>
                      휴무{day.closed_reason ? ` (${day.closed_reason})` : ""}
                    </td>
                  );
                }
                return facilities.map((f) => {
                  const col = cols[di].get(f.id);
                  const seg = col?.startMap.get(h);
                  if (seg && seg.type !== "free") {
                    const span = seg.to_hour - seg.from_hour;
                    if (seg.type === "block") {
                      return (
                        <td key={`${di}-${f.id}`} rowSpan={span} className="wg-cell block"
                            title={`${f.name} · ${seg.title} · ${seg.from_hour}:00~${seg.to_hour}:00 · 정기활동(${recurringKindLabel(seg.kind)})`}>
                          <span className="wg-txt">{seg.title || "정기"}</span>
                        </td>
                      );
                    }
                    return (
                      <td key={`${di}-${f.id}`} rowSpan={span}
                          className={`wg-cell res ${seg.status}`}
                          onClick={() => onPick(seg.res_id)}
                          title={`${f.name} · ${seg.name} · ${seg.from_hour}:00~${seg.to_hour}:00 · ${seg.status === "confirmed" ? "확정" : "대기"}`}>
                        <span className="wg-txt">{seg.name}</span>
                      </td>
                    );
                  }
                  if (col?.covered.has(h)) return null; // 위 rowSpan 이 덮음
                  const off = h < day.open_hour || h >= day.close_hour;
                  return <td key={`${di}-${f.id}`} className={`wg-cell ${off ? "off" : "free"}`} />;
                });
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
