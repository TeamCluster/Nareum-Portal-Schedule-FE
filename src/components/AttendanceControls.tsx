// 이용 결과 기록(이용확인/노쇼/이용확인 미실시)과 현장 연장 버튼.
// 대시보드의 '오늘 이용 처리'와 예약 수정 화면이 함께 쓴다.
import { useState } from "react";
import { ApiError } from "../api/client";
import { useOrg } from "../hooks/useOrg";
import type { Attendance, Reservation } from "../api/types";

export const ATTENDANCE_OPTIONS: { value: Attendance; label: string; hint: string }[] = [
  { value: "", label: "미처리", hint: "아직 처리하지 않음" },
  { value: "attended", label: "이용확인", hint: "이용 후 확인 완료 (정상)" },
  { value: "no_show", label: "노쇼", hint: "취소 신청 없이 미사용 — 재대관 제한" },
  { value: "unverified", label: "확인 미실시", hint: "이용했으나 이용확인 미실시 — 재대관 제한" },
];

export function attendanceLabel(value: Attendance): string {
  return ATTENDANCE_OPTIONS.find((o) => o.value === value)?.label ?? "미처리";
}

interface Props {
  reservation: Reservation;
  /** 처리 후 목록을 다시 불러오기 위한 콜백. */
  onDone: (message: string) => void;
  /** 연장 버튼 노출 여부 (확정 예약에서만 의미가 있다). */
  showExtend?: boolean;
}

export default function AttendanceControls({ reservation, onDone, showExtend = true }: Props) {
  const { api } = useOrg();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<{ message: string }>) {
    setBusy(true);
    setError("");
    try {
      const r = await fn();
      onDone(r.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const setAttendance = (attendance: Attendance) =>
    run(() =>
      api.post<{ message: string }>(`/admin/reservations/${reservation.id}/attendance`, {
        attendance,
      }),
    );

  const extend = () =>
    run(() => api.post<{ message: string }>(`/admin/reservations/${reservation.id}/extend`));

  return (
    <div className="attendance-controls">
      <div className="inline-actions">
        {ATTENDANCE_OPTIONS.map((o) => (
          <button
            key={o.value || "none"}
            type="button"
            title={o.hint}
            disabled={busy}
            className={`btn btn-check${reservation.attendance === o.value ? " active" : ""}`}
            onClick={() => setAttendance(o.value)}
          >
            {o.label}
          </button>
        ))}
        {showExtend && reservation.status === "confirmed" && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            title="뒤이은 대관예약이 없을 때만 연장됩니다"
            onClick={extend}
          >
            현장 연장
          </button>
        )}
      </div>
      {error && <p className="attendance-error">{error}</p>}
    </div>
  );
}
