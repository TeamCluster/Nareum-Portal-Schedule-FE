import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { useOrg } from "../../hooks/useOrg";
import type {
  DayConfig,
  EquipmentGroup,
  Facility,
  Reservation,
  ReservationStatus,
} from "../../api/types";
import { dateOf, hourOf } from "../../lib/datetime";
import { normalizeParticipants } from "../../lib/reservationForm";
import TimeSlotPicker from "../../components/TimeSlotPicker";
import ReservationFields, {
  ApplicantState,
  EMPTY_APPLICANT,
} from "../../components/ReservationFields";
import { useFormConfig } from "../../hooks/useFormConfig";
import AttendanceControls, { attendanceLabel } from "../../components/AttendanceControls";

const STATUS_OPTIONS: { value: ReservationStatus; label: string }[] = [
  { value: "pending", label: "승인 대기" },
  { value: "confirmed", label: "예약 확정" },
  { value: "cancelled", label: "취소 (soft delete)" },
  { value: "rejected", label: "거절 (soft delete)" },
];

export default function EditPage() {
  const { api } = useOrg();
  const { resId } = useParams();
  const navigate = useNavigate();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [facilityId, setFacilityId] = useState("");
  const [date, setDate] = useState("");
  const [bookedHours, setBookedHours] = useState<number[]>([]);
  const [blockedHours, setBlockedHours] = useState<number[]>([]);
  const [hours, setHours] = useState<number[]>([]);
  const [dayCfg, setDayCfg] = useState<DayConfig | null>(null);
  const [fields, setFields] = useState<ApplicantState>(EMPTY_APPLICANT);
  const formCfg = useFormConfig();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [status, setStatus] = useState<ReservationStatus>("pending");
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Facility[]>("/facilities").then(setFacilities);
    api.get<Reservation>(`/admin/reservations/${resId}`).then((r) => {
      setReservation(r);
      setFacilityId(String(r.facility_id));
      setDate(dateOf(r.start_time));
      const hrs: number[] = [];
      for (let h = hourOf(r.start_time); h < hourOf(r.end_time); h++) hrs.push(h);
      setHours(hrs);
      setFields({
        name: r.applicant_name,
        age: r.applicant_age == null ? "" : String(r.applicant_age),
        contact: r.applicant_contact,
        address: r.applicant_address || "",
        school: r.applicant_school || "",
        club: r.applicant_club || "",
        activity: r.activity || "",
        participants: normalizeParticipants(r.participant_info),
        equipment: r.requested_equipment || [],
      });
      setStatus(r.status);
      setRejectReason(r.reject_reason || "");
      setLoaded(true);
    });
  }, [resId]);

  // Refresh booked slots when facility/date change (excluding this reservation).
  useEffect(() => {
    if (!facilityId || !date) return;
    api
      .get<{ reserved: number[]; blocked: number[] }>(
        `/admin/booked-times?facility_id=${facilityId}&date=${date}&exclude_res_id=${resId}`,
      )
      .then((d) => {
        setBookedHours(d.reserved);
        setBlockedHours(d.blocked);
      });
    api.get<DayConfig>(`/day-config?date=${date}`).then(setDayCfg);
  }, [facilityId, date, resId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (hours.length === 0) return setError("이용 시간을 하나 이상 선택해주세요.");

    setSubmitting(true);
    try {
      const res = await api.put<{ message: string; warnings?: string[] }>(`/admin/reservations/${resId}`, {
        facility_id: Number(facilityId),
        date,
        hours,
        status,
        reject_reason: rejectReason,
        ...fields,
      });
      setMessage(res.message + (res.warnings?.length ? ` (경고: ${res.warnings.join(" / ")})` : ""));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "수정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) return <div className="spinner" />;

  return (
    <form onSubmit={onSubmit}>
      <h2 className="page-title">예약 수정 (#{resId})</h2>
      {error && (
        <ul className="flash-messages">
          <li>{error}</li>
        </ul>
      )}
      {message && (
        <ul className="flash-messages">
          <li style={{ background: "#dcfce7", color: "#166534", borderColor: "#86efac" }}>
            {message}
          </li>
        </ul>
      )}

      <div className="form-card">
        <div className="form-section">
          <h4>시설 / 일시</h4>
          <div className="field-row">
            <div className="field">
              <label>시설</label>
              <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>날짜</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <TimeSlotPicker
            bookedHours={bookedHours}
            blockedHours={blockedHours}
            value={hours}
            onChange={setHours}
            autoFillRange
            openHour={dayCfg?.open_hour ?? 9}
            closeHour={dayCfg?.close_hour ?? 18}
          />
          {dayCfg && !dayCfg.is_open && (
            <p className="timeline-note" style={{ color: "var(--danger)" }}>
              ⚠ 휴무일{dayCfg.closed_reason ? ` (${dayCfg.closed_reason})` : ""}로 지정된 날짜입니다. 저장은 가능하나 경고가 표시됩니다.
            </p>
          )}
          {hours.some((h) => blockedHours.includes(h)) && (
            <p className="timeline-note" style={{ color: "#6366f1" }}>
              ⚠ 정기 고정활동과 겹치는 시간입니다. 저장은 가능하나 경고가 표시됩니다.
            </p>
          )}
        </div>

        <ReservationFields
          value={fields}
          onChange={setFields}
          catalog={formCfg.equipment_catalog as EquipmentGroup[]}
        />

        <div className="form-section" style={{ marginBottom: 0 }}>
          <h4>관리자 상태 제어</h4>
          <div className="field">
            <label>상태</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ReservationStatus)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {status === "rejected" && (
            <div className="field">
              <label>거절 사유</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="거절 사유를 입력하세요"
              />
            </div>
          )}

          {reservation && (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>
                이용 결과 — 현재 <strong>{attendanceLabel(reservation.attendance)}</strong>
              </label>
              <p className="timeline-note">
                '노쇼' 또는 '확인 미실시'로 기록하면 같은 신청인(이름+연락처)의 재대관이 규정
                기간 동안 제한됩니다. '현장 연장'은 뒤이은 대관예약이 없을 때만 적용됩니다.
                (아래 버튼은 즉시 저장됩니다.)
              </p>
              <AttendanceControls
                reservation={reservation}
                onDone={(msg) => {
                  setMessage(msg);
                  api.get<Reservation>(`/admin/reservations/${resId}`).then((r) => {
                    setReservation(r);
                    const hrs: number[] = [];
                    for (let h = hourOf(r.start_time); h < hourOf(r.end_time); h++) hrs.push(h);
                    setHours(hrs);
                  });
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-check" onClick={() => navigate(-1)}>
          목록으로
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
          {submitting ? "저장 중..." : "저장 / 수정 완료"}
        </button>
      </div>
    </form>
  );
}
