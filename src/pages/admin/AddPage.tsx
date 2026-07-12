import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { useOrg } from "../../hooks/useOrg";
import type { Facility } from "../../api/types";
import TimeSlotPicker from "../../components/TimeSlotPicker";
import ReservationFields, { ApplicantState } from "../../components/ReservationFields";

const EMPTY: ApplicantState = {
  name: "",
  contact: "",
  school: "",
  club: "",
  participants: {},
  equipment: [],
};

export default function AddPage() {
  const { base, api } = useOrg();
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState("");
  const [date, setDate] = useState("");
  const [bookedHours, setBookedHours] = useState<number[]>([]);
  const [hours, setHours] = useState<number[]>([]);
  const [fields, setFields] = useState<ApplicantState>(EMPTY);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Facility[]>("/facilities").then(setFacilities);
  }, []);

  useEffect(() => {
    if (!facilityId || !date) {
      setBookedHours([]);
      return;
    }
    api
      .get<number[]>(`/admin/booked-times?facility_id=${facilityId}&date=${date}`)
      .then((b) => {
        setBookedHours(b);
        setHours((prev) => prev.filter((h) => !b.includes(h)));
      });
  }, [facilityId, date]);

  const slotsDisabled = !facilityId || !date;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (slotsDisabled) return setError("시설과 날짜를 먼저 선택해주세요.");
    if (hours.length === 0) return setError("이용 시간을 하나 이상 선택해주세요.");

    setSubmitting(true);
    try {
      await api.post("/admin/reservations", {
        facility_id: Number(facilityId),
        date,
        hours,
        ...fields,
      });
      navigate(`${base}/manage`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "예약 추가에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="page-title">예약 직접 추가</h2>
      {error && (
        <ul className="flash-messages">
          <li>{error}</li>
        </ul>
      )}

      <div className="form-card">
        <div className="form-section">
          <h4>시설 / 일시</h4>
          <div className="field-row">
            <div className="field">
              <label>시설</label>
              <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} required>
                <option value="">시설 선택</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>날짜</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <TimeSlotPicker
            bookedHours={bookedHours}
            value={hours}
            onChange={setHours}
            autoFillRange
            disabled={slotsDisabled}
          />
        </div>

        <ReservationFields value={fields} onChange={setFields} />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-check" onClick={() => navigate(`${base}/manage`)}>
          취소
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
          {submitting ? "저장 중..." : "즉시 예약 확정하기"}
        </button>
      </div>
    </form>
  );
}
