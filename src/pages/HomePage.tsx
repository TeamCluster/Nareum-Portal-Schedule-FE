import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { assetUrl } from "../api/client";
import { useOrg } from "../hooks/useOrg";
import type { Availability } from "../api/types";

function hoursRange(open: number, close: number) {
  return Array.from({ length: Math.max(0, close - open) }, (_, i) => open + i);
}

/** Local (no external network) placeholder image for facilities without one. */
function placeholderImage(label: string): string {
  const text = (label || "나름센터").slice(0, 12);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="#eef1f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="20" fill="#9aa3b2">${text}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function PracticeIcon() {
  return (
    <svg className="type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
function GroupIcon() {
  return (
    <svg className="type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function HomePage() {
  const { slug, base, api } = useOrg();
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

  return (
    <>
      <section className="search-box">
        <h3>어떤 공간을 예약할까요?</h3>
        <p>
          원하는 날짜를 선택하면 예약 현황이 갱신됩니다.
          <br />
          예약은 <strong style={{ color: "#ffb" }}>3일 후부터 2주 뒤까지</strong>만 가능합니다.
        </p>
        <input
          type="date"
          value={selectedDate}
          min={data?.min_date}
          max={data?.max_date}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </section>

      {selectedDate && data && !data.is_reservable && (
        <ul className="flash-messages">
          <li>
            {data.is_open === false
              ? `해당 날짜는 휴무일입니다${data.closed_reason ? ` (${data.closed_reason})` : ""}.`
              : `예약은 ${data.min_date} 부터 ${data.max_date} 까지만 가능합니다.`}
          </li>
        </ul>
      )}

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="facility-grid">
          {data?.facilities.map((f) => {
            const showStatus = !!selectedDate && Object.keys(f.hours).length > 0;
            const isPractice = f.type.includes("연습");
            const reservable = !!selectedDate && data.is_reservable && !f.sold_out;
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
                  <span className="facility-type-badge">{f.type}</span>
                </div>
                <div className="card-body">
                  <div className="card-title-area">
                    {isPractice ? <PracticeIcon /> : <GroupIcon />}
                    <h3>{f.name}</h3>
                  </div>
                  <p className="description">
                    {f.description || "활동을 위한 쾌적한 공간입니다."}
                  </p>

                  {showStatus && (
                    <div className="status-bar">
                      {hoursRange(data.open_hour, data.close_hour).map((h) => (
                        <div
                          key={h}
                          className={`status-slot ${f.hours[String(h)]}`}
                          title={`${h}:00 ~ ${h + 1}:00`}
                        >
                          {String(h).padStart(2, "0")}
                        </div>
                      ))}
                    </div>
                  )}

                  {!selectedDate ? (
                    <button className="btn btn-check btn-full" disabled>
                      날짜 선택 필요
                    </button>
                  ) : !data.is_reservable ? (
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
                      style={{ pointerEvents: reservable ? "auto" : "none" }}
                    >
                      대관 신청하기
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
