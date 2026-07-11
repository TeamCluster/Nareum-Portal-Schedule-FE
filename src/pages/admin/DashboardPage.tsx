import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { api } from "../../api/client";
import type { CalendarEvent, DashboardData } from "../../api/types";
import { formatTime } from "../../lib/datetime";

export default function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const date = params.get("date") || "";
  const [data, setData] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<DashboardData>(`/admin/dashboard${date ? `?date=${date}` : ""}`)
      .then(setData);
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
            <Link to="/manage/requests" style={{ fontSize: "0.8rem", color: "var(--primary-color)" }}>
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
            일자별 예약 현황
            <span className="date-nav">
              <Link className="btn btn-check" to={`/manage?date=${data.prev_date}`}>
                ‹
              </Link>
              <input
                type="date"
                value={data.selected_date}
                onChange={(e) => setParams({ date: e.target.value })}
              />
              <Link className="btn btn-check" to={`/manage?date=${data.next_date}`}>
                ›
              </Link>
            </span>
          </h3>

          {data.todays_groups.length === 0 ? (
            <p style={{ color: "var(--text-sub)" }}>해당 날짜의 예약이 없습니다.</p>
          ) : (
            <table className="today-table">
              <thead>
                <tr>
                  <th>시간</th>
                  <th>시설 / 신청인</th>
                  <th>상태</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.todays_groups.flatMap((g) =>
                  g.reservations.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {formatTime(r.start_time)}~{formatTime(r.end_time)}
                      </td>
                      <td>
                        <strong>{g.facility_name}</strong>
                        <br />
                        <span style={{ color: "var(--text-sub)", fontSize: "0.82rem" }}>
                          {r.applicant_name} ({r.applicant_contact})
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${r.status === "confirmed" ? "badge-success" : "badge-warning"}`}>
                          {r.status === "confirmed" ? "확정" : "대기"}
                        </span>
                      </td>
                      <td>
                        <Link to={`/manage/edit/${r.id}`} style={{ color: "var(--primary-color)" }}>
                          관리
                        </Link>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="calendar-box">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="timeGridWeek"
          initialDate={data.selected_date}
          locale="ko"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" }}
          allDaySlot={false}
          slotMinTime="09:00:00"
          slotMaxTime="18:00:00"
          slotDuration="01:00:00"
          nowIndicator
          height="auto"
          events={events.map((e) => ({ ...e, id: String(e.id) }))}
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            navigate(`/manage/edit/${info.event.id}`);
          }}
        />
      </div>
    </>
  );
}
