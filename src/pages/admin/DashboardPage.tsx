import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useOrg } from "../../hooks/useOrg";
import type { CalendarEvent, DashboardData, DayGrid, WeekGrid } from "../../api/types";
import { formatTime } from "../../lib/datetime";
import WeekGridView from "../../components/WeekGrid";
import AttendanceControls, { attendanceLabel } from "../../components/AttendanceControls";
import { recurringKindLabel } from "../../lib/recurringKinds";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekRangeLabel(wg: WeekGrid) {
  const first = wg.days[0]?.date;
  const last = wg.days[6]?.date;
  if (!first || !last) return "";
  const [y, m, d] = first.split("-");
  const [, m2, d2] = last.split("-");
  return `${y}. ${Number(m)}. ${Number(d)} ~ ${Number(m2)}. ${Number(d2)}`;
}

export default function DashboardPage() {
  const { base, api } = useOrg();
  const [params, setParams] = useSearchParams();
  const date = params.get("date") || "";
  const [data, setData] = useState<DashboardData | null>(null);
  const [grid, setGrid] = useState<DayGrid | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calView, setCalView] = useState<"week" | "month">("week");
  const [weekAnchor, setWeekAnchor] = useState<string>("");
  const [weekGrid, setWeekGrid] = useState<WeekGrid | null>(null);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();
  const calRef = useRef<FullCalendar | null>(null);
  const calBoxRef = useRef<HTMLDivElement | null>(null);

  function loadDay() {
    const q = date ? `?date=${date}` : "";
    api.get<DashboardData>(`/admin/dashboard${q}`).then(setData);
    api.get<DayGrid>(`/admin/day-grid${q}`).then(setGrid);
  }
  useEffect(loadDay, [date]);

  function afterAction(message: string) {
    setNotice(message);
    loadDay();
  }

  useEffect(() => {
    api.get<CalendarEvent[]>("/admin/calendar-events").then(setEvents);
  }, []);

  // 주간 그리드: 대시보드 선택 날짜를 기준으로 시작, 이후 주 단위 이동.
  useEffect(() => {
    if (!weekAnchor && data) setWeekAnchor(data.selected_date);
  }, [data, weekAnchor]);
  useEffect(() => {
    if (weekAnchor) api.get<WeekGrid>(`/admin/week-grid?date=${weekAnchor}`).then(setWeekGrid);
  }, [weekAnchor]);

  // 사이드바 접기/펼치기는 window resize 를 일으키지 않는다. FullCalendar 는
  // 그 이벤트로만 폭을 다시 재므로, 그대로 두면 접었을 때 좁은 채로 남고
  // 펼쳤을 때는 넘쳐서 잘린다. 컨테이너 폭을 직접 관찰해 updateSize() 를 부른다.
  useEffect(() => {
    const el = calBoxRef.current;
    if (calView !== "month" || !el || typeof ResizeObserver === "undefined") return;
    let lastWidth = el.clientWidth;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      // 폭이 바뀔 때만 (updateSize 가 높이를 바꾸므로 높이까지 보면 무한 루프).
      const width = el.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      // 사이드바 폭에 0.2s 트랜지션이 걸려 있어 프레임마다 콜백이 온다.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => calRef.current?.getApi().updateSize());
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [calView]);

  if (!data) return <div className="spinner" />;

  return (
    <>
      <h2 className="page-title">대시보드</h2>

      <div className="dashboard-grid">
        <div className="box">
          <h3>
            승인 대기
            <Link to={`${base}/manage/requests`} style={{ fontSize: "0.8rem", color: "var(--primary-color)" }}>
              전체 보기
            </Link>
          </h3>
          {data.pending_preview.length === 0 ? (
            <p style={{ color: "var(--text-sub)" }}>대기 중인 요청이 없습니다.</p>
          ) : (
            <ul className="pending-list">
              {data.pending_preview.map((r) => (
                <li key={r.id}>
                  <span className="pending-user">{r.applicant_name}</span>
                  <span className="pending-meta">
                    {r.facility?.name} · {r.start_time.slice(5, 10).replace("-", "/")}{" "}
                    {formatTime(r.start_time)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {data.pending_count > 3 && (
            <p style={{ color: "var(--text-sub)", fontSize: "0.85rem" }}>
              외 {data.pending_count - 3}건 더 있습니다.
            </p>
          )}
        </div>

        <div className="box">
          <h3 style={{ wordBreak: "keep-all" }}>
            일자별 시설 현황표
            <span className="date-nav">
              <Link className="btn btn-check" to={`${base}/manage?date=${data.prev_date}`}>
                ‹
              </Link>
              <input
                type="date"
                value={data.selected_date}
                onChange={(e) => setParams({ date: e.target.value })}
              />
              <Link className="btn btn-check" to={`${base}/manage?date=${data.next_date}`}>
                ›
              </Link>
            </span>
          </h3>

          {grid && !grid.is_open ? (
            <div className="empty-state" style={{ padding: "30px 10px" }}>
              휴무일입니다{grid.closed_reason ? ` (${grid.closed_reason})` : ""}.
            </div>
          ) : (
            grid && <DayGridMatrix grid={grid} onPick={(id) => navigate(`${base}/manage/edit/${id}`)} />
          )}

          <div className="dg-legend">
            <span><i className="dg-swatch confirmed" /> 확정</span>
            <span><i className="dg-swatch pending" /> 대기</span>
            <span><i className="dg-swatch block" /> 정기활동</span>
            <span><i className="dg-swatch free" /> 비어 있음</span>
            <span style={{ color: "var(--text-sub)" }}>· 예약 칸을 클릭하면 상세로 이동</span>
          </div>
        </div>
      </div>

      {/* 이용 결과 기록 + 현장 연장 — 당일 창구 업무. */}
      <div className="box" style={{ marginBottom: 20 }}>
        <h3>{data.selected_date} 이용 처리</h3>
        {notice && (
          <ul className="flash-messages">
            <li style={{ background: "#dcfce7", color: "#166534", borderColor: "#86efac" }}>
              {notice}
            </li>
          </ul>
        )}
        {data.todays_groups.length === 0 ? (
          <p style={{ color: "var(--text-sub)" }}>해당 날짜에 예약이 없습니다.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>시설</th>
                <th>시간</th>
                <th>신청인</th>
                <th>이용 결과</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {data.todays_groups.flatMap((g) =>
                g.reservations.map((r) => (
                  <tr key={r.id}>
                    <td>{g.facility_name}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {formatTime(r.start_time)}~{formatTime(r.end_time)}
                    </td>
                    <td>
                      <Link to={`${base}/manage/edit/${r.id}`} style={{ color: "var(--primary-color)" }}>
                        {r.applicant_name}
                      </Link>
                    </td>
                    <td>
                      <span className={`attendance-pill ${r.attendance || "none"}`}>
                        {attendanceLabel(r.attendance)}
                      </span>
                    </td>
                    <td>
                      <AttendanceControls reservation={r} onDone={afterAction} />
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="calendar-box">
        <div className="cal-toolbar">
          {calView === "week" ? (
            <div className="cal-toolbar-nav">
              <button className="btn btn-check" disabled={!weekGrid}
                      onClick={() => weekGrid && setWeekAnchor(weekGrid.prev_week)}>‹</button>
              <button className="btn btn-check" onClick={() => setWeekAnchor(todayStr())}>이번 주</button>
              <button className="btn btn-check" disabled={!weekGrid}
                      onClick={() => weekGrid && setWeekAnchor(weekGrid.next_week)}>›</button>
              {weekGrid && <strong className="cal-title">{weekRangeLabel(weekGrid)}</strong>}
            </div>
          ) : (
            <div />
          )}
          <div className="cal-toggle">
            <button className={calView === "week" ? "active" : ""} onClick={() => setCalView("week")}>
              주간 (시설별)
            </button>
            <button className={calView === "month" ? "active" : ""} onClick={() => setCalView("month")}>
              월간
            </button>
          </div>
        </div>

        {calView === "week" ? (
          weekGrid ? (
            weekGrid.facilities.length === 0 ? (
              <div className="empty-state">등록된 시설이 없습니다.</div>
            ) : (
              <WeekGridView grid={weekGrid} onPick={(id) => navigate(`${base}/manage/edit/${id}`)} />
            )
          ) : (
            <div className="spinner" />
          )
        ) : (
          <div ref={calBoxRef}>
            <FullCalendar
              ref={calRef}
              plugins={[dayGridPlugin, timeGridPlugin]}
              initialView="dayGridMonth"
              initialDate={weekAnchor || data.selected_date}
              locale="ko"
              headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
              buttonText={{ today: "오늘" }}
              dayMaxEvents={3}
              height="auto"
              // 기본값은 '오후 3시'(meridiem + 정각이면 분 생략). 09:00 / 15:00 처럼
              // 0 을 채운 24시간 두 자리로 맞춘다.
              eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
              events={events.map((e) => ({ ...e, id: String(e.id) }))}
              // 기본 렌더는 '점 시각 [시설] 이름' 한 줄이라 칸 폭을 넘긴다.
              // 시설명(작게) / 신청자명 두 줄로 직접 그린다.
              // 커스텀 content 는 기본 점까지 대체하므로 점도 함께 그린다.
              eventContent={(arg) => {
                const { facility_name, applicant_name } = arg.event.extendedProps as {
                  facility_name?: string;
                  applicant_name?: string;
                };
                return (
                  <>
                    <span
                      className="ev-dot"
                      style={{ borderColor: arg.borderColor || arg.backgroundColor }}
                    />
                    <span className="ev-body">
                      <span className="ev-sub">
                        {arg.timeText}
                        {facility_name ? ` [${facility_name}]` : ""}
                      </span>
                      <span className="ev-name">{applicant_name || arg.event.title}</span>
                    </span>
                  </>
                );
              }}
              eventClick={(info) => {
                info.jsEvent.preventDefault();
                navigate(`${base}/manage/edit/${info.event.id}`);
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}

function DayGridMatrix({ grid, onPick }: { grid: DayGrid; onPick: (resId: number) => void }) {
  return (
    <div className="day-grid-scroll">
      <table className="day-grid">
        <thead>
          <tr>
            <th className="dg-fac">시설</th>
            {grid.hours.map((h) => (
              <th key={h}>{String(h).padStart(2, "0")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.facilities.map((f) => (
            <tr key={f.id}>
              <td className="dg-fac">{f.name}</td>
              {f.segments.map((s, i) => {
                const span = s.to_hour - s.from_hour;
                if (s.type === "free") {
                  return <td key={i} className="dg-cell free" colSpan={span} />;
                }
                if (s.type === "block") {
                  return (
                    <td key={i} className="dg-cell block" colSpan={span}
                        title={`${s.title} · ${s.from_hour}:00~${s.to_hour}:00 · 정기활동(${recurringKindLabel(s.kind)})`}>
                      <span className="dg-name">{s.title}</span>
                      <span className="dg-time">{recurringKindLabel(s.kind)}</span>
                    </td>
                  );
                }
                return (
                  <td
                    key={i}
                    className={`dg-cell res ${s.status}`}
                    colSpan={span}
                    title={`${s.name} (${s.contact}) · ${s.from_hour}:00~${s.to_hour}:00 · ${
                      s.status === "confirmed" ? "확정" : "대기"
                    }`}
                    onClick={() => onPick(s.res_id)}
                  >
                    <span className="dg-name">{s.name}</span>
                    <span className="dg-time">
                      {s.from_hour}~{s.to_hour}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
