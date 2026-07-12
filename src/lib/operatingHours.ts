import type { OperatingHour } from "../api/types";

const WD = ["월", "화", "수", "목", "금", "토", "일"];

function hh(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

/**
 * 요일별 운영시간을 요약 문자열로.
 * 연속된 요일 중 (운영여부·시작·종료)이 같은 구간을 묶어 표기.
 * 예) "월 휴무 · 화~금 09:00~20:00 · 토~일 09:00~18:00"
 */
export function summarizeOperatingHours(hours?: OperatingHour[]): string {
  if (!hours || hours.length === 0) return "";
  const sorted = [...hours].sort((a, b) => a.weekday - b.weekday);
  const sig = (d: OperatingHour) => (d.is_open ? `${d.open_hour}-${d.close_hour}` : "closed");

  const groups: { days: number[]; d: OperatingHour }[] = [];
  for (const d of sorted) {
    const last = groups[groups.length - 1];
    if (last && sig(last.d) === sig(d) && last.days[last.days.length - 1] === d.weekday - 1) {
      last.days.push(d.weekday);
    } else {
      groups.push({ days: [d.weekday], d });
    }
  }

  return groups
    .map((g) => {
      const label =
        g.days.length === 1
          ? WD[g.days[0]]
          : `${WD[g.days[0]]}~${WD[g.days[g.days.length - 1]]}`;
      const time = g.d.is_open ? `${hh(g.d.open_hour)}~${hh(g.d.close_hour)}` : "휴무";
      return `${label} ${time}`;
    })
    .join(" · ");
}
