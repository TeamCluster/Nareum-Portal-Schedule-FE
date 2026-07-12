import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { useOrg } from "../hooks/useOrg";
import type { Facility } from "../api/types";
import { formatPhoneNumber } from "../lib/phone";
import TimeSlotPicker from "../components/TimeSlotPicker";

const EQUIPMENT = ["앰프", "스피커", "마이크", "키보드"];
const PARTICIPANT_FIELDS: { key: string; label: string }[] = [
  { key: "elementary", label: "초등" },
  { key: "middle", label: "중등" },
  { key: "high", label: "고등" },
  { key: "teen", label: "후기청소년" },
  { key: "adult", label: "성인" },
];

export default function ReservePage() {
  const { base, api } = useOrg();
  const { facilityId } = useParams();
  const [params] = useSearchParams();
  const date = params.get("date") || "";
  const navigate = useNavigate();

  const [facility, setFacility] = useState<Facility | null>(null);
  const [bookedHours, setBookedHours] = useState<number[]>([]);
  const [hours, setHours] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [school, setSchool] = useState("");
  const [club, setClub] = useState("");
  const [participants, setParticipants] = useState<Record<string, number>>({});
  const [equipment, setEquipment] = useState<string[]>([]);
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
    });
    api
      .get<number[]>(`/facilities/${facilityId}/booked-times?date=${date}`)
      .then(setBookedHours);
  }, [facilityId, date, navigate]);

  const isPractice = facility?.type.includes("연습") ?? false;
  const totalParticipants = Object.values(participants).reduce((a, b) => a + (b || 0), 0);
  const canSubmit = hours.length > 0 && agree;

  function toggleEquipment(item: string) {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (hours.length === 0) return setError("이용 시간을 최소 1시간 이상 선택해주세요.");
    if (totalParticipants < 1) return setError("이용 인원은 총합 최소 1명 이상이어야 합니다.");

    setSubmitting(true);
    try {
      const res = await api.post<{ access_id: string }>("/reservations", {
        facility_id: Number(facilityId),
        date,
        name,
        contact,
        school,
        club,
        hours,
        participants,
        equipment: isPractice ? equipment : [],
      });
      navigate(`${base}/complete/${res.access_id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "예약에 실패했습니다.");
      setSubmitting(false);
    }
  }

  if (!facility) return <div className="spinner" />;

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
        <div className="form-section">
          <h4>신청인 정보</h4>
          <div className="field-row">
            <div className="field">
              <label>이름<span className="required">*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>연락처<span className="required">*</span></label>
              <input
                type="text"
                value={contact}
                maxLength={13}
                onChange={(e) => setContact(formatPhoneNumber(e.target.value))}
                required
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>소속(학교)<span className="required">*</span></label>
              <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} required />
            </div>
            <div className="field">
              <label>동아리/단체명</label>
              <input type="text" value={club} onChange={(e) => setClub(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>이용 시간 (최대 2시간, 연속 선택)</h4>
          <TimeSlotPicker
            bookedHours={bookedHours}
            value={hours}
            onChange={setHours}
            maxHours={2}
          />
        </div>

        <div className="form-section">
          <h4>참가 인원 (총 {totalParticipants}명)</h4>
          <div className="participant-grid">
            {PARTICIPANT_FIELDS.map((p) => (
              <div className="field" key={p.key}>
                <label>{p.label}</label>
                <input
                  type="number"
                  min={0}
                  value={participants[p.key] ?? 0}
                  onChange={(e) =>
                    setParticipants((prev) => ({ ...prev, [p.key]: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {isPractice && (
          <div className="form-section">
            <h4>필요 장비</h4>
            <div className="equipment-grid">
              {EQUIPMENT.map((item) => (
                <label
                  key={item}
                  className={`checkbox-chip${equipment.includes(item) ? " checked" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={equipment.includes(item)}
                    onChange={() => toggleEquipment(item)}
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="form-section" style={{ marginBottom: 0 }}>
          <label className="agree-box">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            시설 이용 수칙 및 개인정보 수집·이용에 동의합니다.
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
          title={canSubmit ? "" : "시간 선택과 약관 동의가 필요합니다"}
        >
          {submitting ? "신청 중..." : "예약 신청하기"}
        </button>
      </div>
    </form>
  );
}
