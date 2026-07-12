import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useOrg } from "../../hooks/useOrg";
import type { CalendarEvent, DashboardData, DayGrid, WeekGrid } from "../../api/types";
import { formatTime } from "../../lib/datetime";
import WeekGridView from "../../components/WeekGrid";

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
  const navigate = useNavigate();

  useEffect(() => {
    const q = date ? `?date=${date}` : "";
    api.get<DashboardData>(`/admin/dashboard${q}`).then(setData);
    api.get<DayGrid>(`/admin/day-grid${q}`).then(setGrid);
  }, [date]);

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

      <div className="calendar-box">
        <div className="cal-toolbar">
          {calView === "week" ? (
            <div className="cal-nav">
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
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            initialDate={weekAnchor || data.selected_date}
            locale="ko"
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            buttonText={{ today: "오늘" }}
            dayMaxEvents={3}
            height="auto"
            events={events.map((e) => ({ ...e, id: String(e.id) }))}
            eventClick={(info) => {
              info.jsEvent.preventDefault();
              navigate(`${base}/manage/edit/${info.event.id}`);
            }}
          />
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
                        title={`${s.title} · ${s.from_hour}:00~${s.to_hour}:00 · 정기활동`}>
                      <span className="dg-name">{s.title}</span>
                      <span className="dg-time">정기</span>
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
