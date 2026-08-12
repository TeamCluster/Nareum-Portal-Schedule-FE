import { useEffect, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { assetUrl } from "../api/client";
import { useOrg } from "../hooks/useOrg";
import BookingCalendar from "../components/BookingCalendar";
import type { Availability, PlaceInfo } from "../api/types";
import { FacilityTypeIcon } from "../lib/facilityTypes";

function hoursRange(open: number, close: number) {
  return Array.from({ length: Math.max(0, close - open) }, (_, i) => open + i);
}

function hhmm(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

const WD_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

/** "YYYY-MM-DD" → "8월 15일 (금)". 로컬 파싱(Date(str) 은 UTC 로 해석되므로 분해해서 생성). */
function formatDateLabel(ds: string) {
  const [y, m, d] = ds.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${m}월 ${d}일 (${WD_LABEL[dt.getDay()]})`;
}

/** Local (no external network) placeholder image for facilities without one. */
function placeholderImage(label: string): string {
  const text = (label || "나름센터").slice(0, 12);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="#eef1f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="20" fill="#9aa3b2">${text}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function HomePage() {
  const { slug, base, api } = useOrg();
  // PublicLayout 이 이미 조회한 기관 정보를 재사용 (중복 요청 방지).
  const { info } = useOutletContext<{ info: PlaceInfo | null }>();
  const [params, setParams] = useSearchParams();
  const selectedDate = params.get("date") || "";
  const [data, setData] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<Availability>(`/availability${selectedDate ? `?date=${selectedDate}` : ""}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [selectedDate, slug]);

  function onDateChange(value: string) {
    if (value) setParams({ date: value });
    else setParams({});
  }

  // operating_hours 의 weekday 는 0=월 … 6=일. 달력은 JS 요일(0=일)을 쓰므로 변환.
  const closedWeekdays = (info?.operating_hours || [])
    .filter((h) => !h.is_open)
    .map((h) => (h.weekday + 1) % 7);

  const closedToday = !!selectedDate && data?.is_open === false;
  const outOfWindow = !!selectedDate && !!data && data.is_reservable === false && !closedToday;

  return (
    <>
      <div className="page-head">
        <div className="page-head-text">
          <h1>
            대관신청
            {/* 구분 기호(–)는 CSS 로 붙인다. 좁은 화면에서 기관명을 아랫줄로
                내릴 때 '– ' 가 줄 첫머리에 남지 않게 하기 위함. */}
            {info?.full_name && <span className="page-head-org">{info.full_name}</span>}
          </h1>
          <p>이용할 날짜를 선택하면 시설별 시간대 예약 현황을 확인할 수 있습니다.</p>
        </div>
        <nav className="breadcrumb" aria-label="현재 위치">
          <Link to={base}>홈</Link>
          <span aria-hidden="true">›</span>
          <em>대관신청</em>
        </nav>
      </div>

      <div className="booking-layout">
        {/* ── 좌: 시설 목록 ─────────────────────────────────────── */}
        <section className="booking-main">
          <div className="section-bar">
            <h2>
              시설 목록
              {data?.facilities?.length ? <span className="count">{data.facilities.length}</span> : null}
            </h2>
            <div className="slot-legend">
              <span>
                <i className="sw available" />
                예약가능
              </span>
              <span>
                <i className="sw booked" />
                예약불가
              </span>
            </div>
          </div>

          {!selectedDate && (
            <p className="inline-hint">
              오른쪽 달력에서 날짜를 먼저 선택해 주세요.
            </p>
          )}

          {closedToday && (
            <p className="inline-hint warn">
              해당 날짜는 휴무일입니다{data?.closed_reason ? ` (${data.closed_reason})` : ""}.
            </p>
          )}

          {outOfWindow && (
            <p className="inline-hint warn">
              예약은 {data?.min_date} 부터 {data?.max_date} 까지만 가능합니다.
            </p>
          )}

          {selectedDate && data?.is_reservable && data?.note && (
            <p className="inline-hint info">{data.note}</p>
          )}

          {loading ? (
            <div className="spinner" />
          ) : (
            <div className="facility-list">
              {data?.facilities.map((f) => {
                const showStatus = !!selectedDate && Object.keys(f.hours).length > 0;
                return (
                  <article key={f.id} className="facility-card">
                    <div className="card-image">
                      <img
                        src={assetUrl(f.image_url) || placeholderImage(f.name)}
                        alt={f.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = placeholderImage(f.name);
                        }}
                      />
                    </div>

                    <div className="card-body">
                      <div className="card-title-area">
                        <FacilityTypeIcon type={f.type} />
                        <h3>{f.name}</h3>
                        <span className="facility-type-badge">{f.type}</span>
                        {f.capacity ? <span className="facility-meta">정원 {f.capacity}명</span> : null}
                      </div>

                      <p className="description">{f.description || "활동을 위한 쾌적한 공간입니다."}</p>

                      {showStatus ? (
                        <div className="status-bar" role="list" aria-label={`${f.name} 시간대별 예약 현황`}>
                          {hoursRange(data!.open_hour, data!.close_hour).map((h) => (
                            <div
                              key={h}
                              role="listitem"
                              className={`status-slot ${f.hours[String(h)]}`}
                              title={`${hhmm(h)} ~ ${hhmm(h + 1)} · ${
                                f.hours[String(h)] === "booked" ? "예약불가" : "예약가능"
                              }`}
                            >
                              {String(h).padStart(2, "0")}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="status-bar placeholder" aria-hidden="true" />
                      )}

                      <div className="card-actions">
                        {!selectedDate ? (
                          <button className="btn btn-check btn-full" disabled>
                            날짜 선택 필요
                          </button>
                        ) : !data!.is_reservable ? (
                          <button className="btn btn-check btn-full" disabled>
                            예약 불가
                          </button>
                        ) : f.sold_out ? (
                          <button className="btn btn-check btn-full" disabled>
                            예약 마감
                          </button>
                        ) : (
                          <Link
                            className="btn btn-primary btn-full"
                            to={`${base}/reserve/${f.id}?date=${selectedDate}`}
                          >
                            대관 신청하기
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 우: 날짜 선택 패널 ─────────────────────────────────── */}
        <aside className="booking-side">
          <div className="side-panel">
            <BookingCalendar
              value={selectedDate}
              minDate={data?.min_date}
              maxDate={data?.max_date}
              closedWeekdays={closedWeekdays}
              onChange={onDateChange}
            />

            <table className="side-table">
              <tbody>
                <tr>
                  <th>선택한 날짜</th>
                  <td>
                    {selectedDate ? (
                      <strong>{formatDateLabel(selectedDate)}</strong>
                    ) : (
                      <span className="muted">달력에서 선택</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <th>신청 가능 기간</th>
                  <td>
                    {data ? `${data.min_date} ~ ${data.max_date}` : <span className="muted">불러오는 중</span>}
                  </td>
                </tr>
                <tr>
                  <th>이용 시간</th>
                  <td>
                    {data ? `${hhmm(data.open_hour)} ~ ${hhmm(data.close_hour)}` : <span className="muted">-</span>}
                  </td>
                </tr>
                <tr>
                  <th>승인 방식</th>
                  <td>관리자 심사 후 승인</td>
                </tr>
              </tbody>
            </table>

            {selectedDate && (
              <button type="button" className="btn btn-check btn-full" onClick={() => onDateChange("")}>
                날짜 선택 초기화
              </button>
            )}

            <p className="side-note">
              1회 최대 2시간 · 하루 1회 · 주간(월~일) 2회까지 신청할 수 있습니다.
            </p>

            <Link className="side-link" to={`${base}/check`}>
              신청한 예약 조회 · 취소 →
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
