import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { useOrg } from "../hooks/useOrg";
import type { DayConfig, Facility, FormConfig } from "../api/types";
import { participantTotal } from "../lib/reservationForm";
import TimeSlotPicker from "../components/TimeSlotPicker";
import ReservationFields, {
  ApplicantState,
  EMPTY_APPLICANT,
} from "../components/ReservationFields";

const EMPTY_FORM_CONFIG: FormConfig = { equipment_catalog: [], notice: [], rules: [] };

export default function ReservePage() {
  const { base, api } = useOrg();
  const { facilityId } = useParams();
  const [params] = useSearchParams();
  const date = params.get("date") || "";
  const navigate = useNavigate();

  const [facility, setFacility] = useState<Facility | null>(null);
  const [dayCfg, setDayCfg] = useState<DayConfig | null>(null);
  const [formCfg, setFormCfg] = useState<FormConfig>(EMPTY_FORM_CONFIG);
  const [bookedHours, setBookedHours] = useState<number[]>([]);
  const [hours, setHours] = useState<number[]>([]);
  const [fields, setFields] = useState<ApplicantState>(EMPTY_APPLICANT);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!date) {
      navigate(base);
      return;
    }
    api.get<Facility[]>("/facilities").then((list) => {
      const f = list.find((x) => x.id === Number(facilityId)) || null;
      setFacility(f);
      // 필요 물품 목록은 시설 유형에 따라 달라지므로 유형을 알아낸 뒤 조회한다.
      api
        .get<FormConfig>(
          `/form-config${f ? `?facility_type=${encodeURIComponent(f.type)}` : ""}`,
        )
        .then(setFormCfg);
    });
    api
      .get<number[]>(`/facilities/${facilityId}/booked-times?date=${date}`)
      .then(setBookedHours);
    api.get<DayConfig>(`/day-config?date=${date}`).then(setDayCfg);
  }, [facilityId, date, navigate]);

  const totalParticipants = participantTotal(fields.participants);
  const canSubmit = hours.length > 0 && agree;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (hours.length === 0) return setError("이용 시간을 최소 1시간 이상 선택해주세요.");
    if (!fields.activity.trim())
      return setError("활동내용을 입력해주세요. (예: 춤연습, 밴드합주, 보드게임)");
    if (totalParticipants < 1) return setError("이용 인원은 총합 최소 1명 이상이어야 합니다.");

    setSubmitting(true);
    try {
      const res = await api.post<{ access_id: string }>("/reservations", {
        facility_id: Number(facilityId),
        date,
        hours,
        ...fields,
      });
      navigate(`${base}/complete/${res.access_id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "예약에 실패했습니다.");
      setSubmitting(false);
    }
  }

  if (!facility) return <div className="spinner" />;

  const timeSection = (
    <div className="form-section">
      <h4>
        이용 시간 (최대 2시간, 연속 선택)
        {dayCfg && (
          <span style={{ color: "var(--text-sub)", fontWeight: 400, fontSize: "0.85rem", marginLeft: 8 }}>
            운영 {String(dayCfg.open_hour).padStart(2, "0")}:00~{String(dayCfg.close_hour).padStart(2, "0")}:00
          </span>
        )}
      </h4>
      {dayCfg?.note && dayCfg.is_open && (
        <ul className="flash-messages">
          <li style={{ background: "#eff6ff", color: "#1e40af", borderColor: "#bfdbfe" }}>{dayCfg.note}</li>
        </ul>
      )}
      {dayCfg && !dayCfg.is_open ? (
        <ul className="flash-messages">
          <li>해당 날짜는 휴무일입니다{dayCfg.closed_reason ? ` (${dayCfg.closed_reason})` : ""}.</li>
        </ul>
      ) : (
        <TimeSlotPicker
          bookedHours={bookedHours}
          value={hours}
          onChange={setHours}
          maxHours={2}
          openHour={dayCfg?.open_hour ?? 9}
          closeHour={dayCfg?.close_hour ?? 18}
        />
      )}
    </div>
  );

  return (
    <form id="reservationForm" onSubmit={onSubmit}>
      <h2 className="page-title">
        {facility.name} <span style={{ color: "var(--text-sub)", fontSize: "1rem" }}>{date}</span>
      </h2>

      {error && (
        <ul className="flash-messages">
          <li>{error}</li>
        </ul>
      )}

      <div className="form-card">
        <ReservationFields
          value={fields}
          onChange={setFields}
          catalog={formCfg.equipment_catalog}
          requireFields
          middleSlot={timeSection}
        />

        {(formCfg.notice.length > 0 || formCfg.rules.length > 0) && (
          <div className="form-section">
            <h4>공지 및 준수사항</h4>
            {formCfg.notice.length > 0 && (
              <ul className="terms-list">
                {formCfg.notice.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
            {formCfg.rules.length > 0 && (
              <details className="terms-details">
                <summary>대관 규정 및 유의사항 전문 보기 ({formCfg.rules.length}개 항목)</summary>
                <ol className="terms-list numbered">
                  {formCfg.rules.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        )}

        <div className="form-section" style={{ marginBottom: 0 }}>
          <label className="agree-box">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            위 공지 및 준수사항·대관 규정을 확인했으며, 이를 준수할 것을 약속합니다. (개인정보
            수집·이용 동의 포함)
          </label>
        </div>
      </div>

      <div className="form-actions">
        <Link className="btn btn-check" to={`${base}?date=${date}`}>
          돌아가기
        </Link>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!canSubmit || submitting}
          style={{ opacity: canSubmit ? 1 : 0.6, flex: 1 }}
          title={canSubmit ? "" : "시간 선택과 준수사항 동의가 필요합니다"}
        >
          {submitting ? "신청 중..." : "예약 신청하기"}
        </button>
      </div>
    </form>
  );
}
