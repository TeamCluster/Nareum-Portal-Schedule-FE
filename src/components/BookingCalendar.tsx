import { useMemo, useState } from "react";

const WD = ["일", "월", "화", "수", "목", "금", "토"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** 로컬 시간대 기준 YYYY-MM-DD (Date.toISOString 은 UTC 로 밀리므로 쓰지 않는다). */
function iso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

type DayState = "selected" | "open" | "off";

interface Props {
  /** 선택된 날짜 (YYYY-MM-DD). 빈 문자열이면 미선택. */
  value: string;
  /** 예약 가능 창 (availability 응답의 min_date/max_date). */
  minDate?: string;
  maxDate?: string;
  /** 정기 휴무 요일 (0=일 … 6=토) — 달력에서 예약불가로 표시. */
  closedWeekdays?: number[];
  onChange(date: string): void;
}

/**
 * 월 단위 예약 달력. 예약 가능 창(min~max)과 정기 휴무 요일만으로 선택 가능
 * 여부를 판단한다. 특정일 휴무(공휴일/기관 지정)는 날짜 선택 후 서버 응답
 * (availability.is_open)으로 안내된다.
 */
export default function BookingCalendar({
  value,
  minDate,
  maxDate,
  closedWeekdays = [],
  onChange,
}: Props) {
  // 사용자가 달을 넘기기 전에는 선택값(없으면 예약 시작일)이 있는 달을 따라간다.
  // → availability 가 늦게 도착해도 자동으로 해당 월로 맞춰진다.
  const [moved, setMoved] = useState<{ y: number; m: number } | null>(null);

  const cur = useMemo(() => {
    if (moved) return moved;
    const anchor = value || minDate;
    if (anchor) {
      const [y, m] = anchor.split("-").map(Number);
      return { y, m: m - 1 };
    }
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  }, [moved, value, minDate]);

  const cells = useMemo(() => {
    const lead = new Date(cur.y, cur.m, 1).getDay();
    const total = new Date(cur.y, cur.m + 1, 0).getDate();
    const out: (number | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= total; d += 1) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cur.y, cur.m]);

  function stateOf(day: number): DayState {
    const ds = iso(cur.y, cur.m, day);
    if (ds === value) return "selected";
    const closed = closedWeekdays.includes(new Date(cur.y, cur.m, day).getDay());
    const inRange = (!minDate || ds >= minDate) && (!maxDate || ds <= maxDate);
    return inRange && !closed ? "open" : "off";
  }

  const monthKey = `${cur.y}-${pad(cur.m + 1)}`;
  const canPrev = !minDate || monthKey > minDate.slice(0, 7);
  const canNext = !maxDate || monthKey < maxDate.slice(0, 7);

  function move(step: number) {
    const next = new Date(cur.y, cur.m + step, 1);
    setMoved({ y: next.getFullYear(), m: next.getMonth() });
  }

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="cal-nav" disabled={!canPrev} onClick={() => move(-1)} aria-label="이전 달">
          ‹
        </button>
        <strong>
          {cur.y}년 {cur.m + 1}월
        </strong>
        <button type="button" className="cal-nav" disabled={!canNext} onClick={() => move(1)} aria-label="다음 달">
          ›
        </button>
      </div>

      <div className="cal-grid" role="grid">
        {WD.map((w, i) => (
          <div key={w} className={`cal-wd${i === 0 ? " sun" : i === 6 ? " sat" : ""}`}>
            {w}
          </div>
        ))}

        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="cal-cell empty" />;
          const st = stateOf(d);
          const dow = i % 7;
          return (
            <button
              key={d}
              type="button"
              className={`cal-cell ${st}${dow === 0 ? " sun" : dow === 6 ? " sat" : ""}`}
              disabled={st === "off"}
              aria-current={st === "selected" ? "date" : undefined}
              onClick={() => onChange(iso(cur.y, cur.m, d))}
            >
              {d}
            </button>
          );
        })}
      </div>

      <div className="cal-legend">
        <span>
          <i className="sw off" />
          예약불가
        </span>
        <span>
          <i className="sw open" />
          예약가능
        </span>
        <span>
          <i className="sw selected" />
          선택
        </span>
      </div>
    </div>
  );
}
