import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useOrg } from "../../hooks/useOrg";
import type { CalendarEvent, DashboardData, DayGrid } from "../../api/types";
import { formatTime } from "../../lib/datetime";

export default function DashboardPage() {
  const { base, api } = useOrg();
  const [params, setParams] = useSearchParams();
  const date = params.get("date") || "";
  const [data, setData] = useState<DashboardData | null>(null);
  const [grid, setGrid] = useState<DayGrid | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = date ? `?date=${date}` : "";
    api.get<DashboardData>(`/admin/dashboard${q}`).then(setData);
    api.get<DayGrid>(`/admin/day-grid${q}`).then(setGrid);
  }, [date]);

  useEffect(() => {
    api.get<CalendarEvent[]>("/admin/calendar-events").then(setEvents);
  }, []);

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
          <h3>
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
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="timeGridWeek"
          initialDate={data.selected_date}
          locale="ko"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" }}
          buttonText={{ today: "오늘", month: "월간", week: "주간" }}
          allDaySlot={false}
          slotMinTime="09:00:00"
          slotMaxTime="18:00:00"
          slotDuration="01:00:00"
          expandRows
          dayMaxEvents={3}
          nowIndicator
          height="auto"
          events={events.map((e) => ({ ...e, id: String(e.id) }))}
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            navigate(`${base}/manage/edit/${info.event.id}`);
          }}
        />
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
