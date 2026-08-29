import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { useOrg } from "../../hooks/useOrg";
import type { DayConfig, EquipmentGroup, Facility } from "../../api/types";
import TimeSlotPicker from "../../components/TimeSlotPicker";
import ReservationFields, {
  ApplicantState,
  EMPTY_APPLICANT,
} from "../../components/ReservationFields";
import { formatPhoneNumber } from "../../lib/phone";
import { useFormConfig } from "../../hooks/useFormConfig";
import ClubPicker from "../../components/ClubPicker";
import type { Club } from "../../api/types";

/** 추가 방식 — 신청서 전체 입력 vs 동아리 단기대관(간편). */
type Mode = "full" | "club";

const DEFAULT_CLUB_ACTIVITY = "동아리 단기대관";

export default function AddPage() {
  const { base, api } = useOrg();
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState("");
  const [date, setDate] = useState("");
  const [bookedHours, setBookedHours] = useState<number[]>([]);
  const [blockedHours, setBlockedHours] = useState<number[]>([]);
  const [hours, setHours] = useState<number[]>([]);
  const [dayCfg, setDayCfg] = useState<DayConfig | null>(null);
  const [fields, setFields] = useState<ApplicantState>(EMPTY_APPLICANT);
  const formCfg = useFormConfig();

  const [mode, setMode] = useState<Mode>("full");
  const [club, setClub] = useState("");
  const [clubActivity, setClubActivity] = useState(DEFAULT_CLUB_ACTIVITY);
  const [clubContact, setClubContact] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Facility[]>("/facilities").then(setFacilities);
  }, []);

  useEffect(() => {
    if (!date) {
      setDayCfg(null);
      return;
    }
    api.get<DayConfig>(`/day-config?date=${date}`).then(setDayCfg);
  }, [date]);

  useEffect(() => {
    if (!facilityId || !date) {
      setBookedHours([]);
      return;
    }
    api
      .get<{ reserved: number[]; blocked: number[] }>(
        `/admin/booked-times?facility_id=${facilityId}&date=${date}`)
      .then((d) => {
        setBookedHours(d.reserved);
        setBlockedHours(d.blocked);
        setHours((prev) => prev.filter((h) => !d.reserved.includes(h)));
      });
  }, [facilityId, date]);

  const slotsDisabled = !facilityId || !date;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (slotsDisabled) return setError("시설과 날짜를 먼저 선택해주세요.");
    if (hours.length === 0) return setError("이용 시간을 하나 이상 선택해주세요.");

    if (mode === "club" && !club.trim()) return setError("동아리를 선택하거나 직접 입력해주세요.");

    // 동아리 단기대관은 신청인 정보를 받지 않는다 — 동아리명이 곧 표시명.
    // (인원·물품 등 세부 정보가 필요하면 나중에 '예약 수정'에서 채운다.)
    const applicant =
      mode === "club"
        ? {
            name: club.trim(),
            club: club.trim(),
            contact: clubContact,
            activity: clubActivity.trim() || DEFAULT_CLUB_ACTIVITY,
          }
        : fields;

    setSubmitting(true);
    try {
      const res = await api.post<{ warnings?: string[] }>("/admin/reservations", {
        facility_id: Number(facilityId),
        date,
        hours,
        ...applicant,
      });
      if (res.warnings?.length) {
        alert("아래 경고가 있으나 예약이 추가되었습니다:\n\n- " + res.warnings.join("\n- "));
      }
      navigate(`${base}/manage`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "예약 추가에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="page-title">예약 직접 추가</h2>

      <div className="mode-tabs">
        <button
          type="button"
          className={mode === "full" ? "active" : ""}
          onClick={() => setMode("full")}
        >
          신청서 전체 입력
        </button>
        <button
          type="button"
          className={mode === "club" ? "active" : ""}
          onClick={() => setMode("club")}
        >
          동아리 단기대관
        </button>
      </div>
      <p className="timeline-note" style={{ marginTop: 0 }}>
        {mode === "full"
          ? "종이 신청서와 같은 항목을 모두 입력합니다."
          : "정기활동 외에 동아리가 추가로 쓰는 일정을 동아리명만으로 빠르게 확정합니다. 매주 반복되는 정기활동은 '운영 설정 › 정기 고정활동'에 등록하세요."}
      </p>

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
            blockedHours={blockedHours}
            value={hours}
            onChange={setHours}
            autoFillRange
            disabled={slotsDisabled}
            openHour={dayCfg?.open_hour ?? 9}
            closeHour={dayCfg?.close_hour ?? 18}
          />
          {dayCfg && !dayCfg.is_open && (
            <p className="timeline-note" style={{ color: "var(--danger)" }}>
              ⚠ 선택한 날짜는 휴무일입니다{dayCfg.closed_reason ? ` (${dayCfg.closed_reason})` : ""}. 직접 추가는 가능하나 경고가 표시됩니다.
            </p>
          )}
          {hours.some((h) => blockedHours.includes(h)) && (
            <p className="timeline-note" style={{ color: "#6366f1" }}>
              ⚠ 정기 고정활동과 겹치는 시간을 선택했습니다. 직접 추가는 가능하나 경고가 표시됩니다.
            </p>
          )}
        </div>

        {mode === "full" ? (
          <ReservationFields
            value={fields}
            onChange={setFields}
            catalog={formCfg.equipment_catalog as EquipmentGroup[]}
          />
        ) : (
          <div className="form-section" style={{ marginBottom: 0 }}>
            <h4>동아리 단기대관</h4>
            <ClubPicker
              value={club}
              onChange={setClub}
              onPick={(c: Club | null) =>
                setClubActivity(c?.category ? `${DEFAULT_CLUB_ACTIVITY} (${c.category})` : DEFAULT_CLUB_ACTIVITY)
              }
            />
            <div className="field-row">
              <div className="field">
                <label>활동내용</label>
                <input
                  type="text"
                  value={clubActivity}
                  maxLength={200}
                  onChange={(e) => setClubActivity(e.target.value)}
                  placeholder={DEFAULT_CLUB_ACTIVITY}
                />
              </div>
              <div className="field">
                <label>담당자 연락처 (선택)</label>
                <input
                  type="text"
                  maxLength={13}
                  value={clubContact}
                  onChange={(e) => setClubContact(formatPhoneNumber(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-check" onClick={() => navigate(`${base}/manage`)}>
          취소
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
          {submitting
            ? "저장 중..."
            : mode === "club"
              ? "동아리 단기대관 확정하기"
              : "즉시 예약 확정하기"}
        </button>
      </div>
    </form>
  );
}
