import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { useOrg } from "../../hooks/useOrg";
import type { Reservation } from "../../api/types";
import { dateOf, formatTime } from "../../lib/datetime";

const PRESET_REASONS = [
  "신청 자격 미달",
  "시설 점검/행사 예정",
  "중복/허위 신청 확인",
  "직접 입력",
];

export default function RequestsPage() {
  const { base, api } = useOrg();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<Reservation | null>(null);
  const [preset, setPreset] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  function load() {
    setLoading(true);
    api
      .get<Reservation[]>("/admin/requests")
      .then(setItems)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function approve(res: Reservation) {
    await api.post(`/admin/reservations/${res.id}/approve`);
    load();
  }

  async function submitReject() {
    if (!rejectTarget) return;
    const reason = preset === "직접 입력" ? customReason.trim() : preset;
    if (preset === "직접 입력" && !reason) {
      alert("거절 사유를 입력해주세요.");
      return;
    }
    try {
      await api.post(`/admin/reservations/${rejectTarget.id}/reject`, { reject_reason: reason });
      setRejectTarget(null);
      setPreset(PRESET_REASONS[0]);
      setCustomReason("");
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "거절 처리에 실패했습니다.");
    }
  }

  return (
    <>
      <h2 className="page-title">승인 요청</h2>

      {loading ? (
        <div className="spinner" />
      ) : items.length === 0 ? (
        <div className="empty-state">대기 중인 승인 요청이 없습니다.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>시설명</th>
              <th>날짜 / 시간</th>
              <th>신청인</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.facility?.name}</td>
                <td>
                  {dateOf(r.start_time)} {formatTime(r.start_time)}~{formatTime(r.end_time)}
                </td>
                <td>
                  <Link to={`${base}/manage/edit/${r.id}`} style={{ color: "var(--primary-color)" }}>
                    {r.applicant_name}
                  </Link>
                  <br />
                  <span style={{ color: "var(--text-sub)", fontSize: "0.82rem" }}>
                    {r.applicant_contact}
                  </span>
                </td>
                <td>
                  <div className="inline-actions">
                    <button className="btn btn-primary" onClick={() => approve(r)}>
                      승인
                    </button>
                    <button className="btn btn-danger" onClick={() => setRejectTarget(r)}>
                      거절
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {rejectTarget && (
        <div className="modal-overlay" onClick={() => setRejectTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>예약 거절 — {rejectTarget.applicant_name}</h3>
            <div className="field">
              <label>거절 사유</label>
              <select value={preset} onChange={(e) => setPreset(e.target.value)}>
                {PRESET_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {preset === "직접 입력" && (
              <div className="field">
                <input
                  type="text"
                  placeholder="사유를 입력하세요"
                  value={customReason}
                  autoFocus
                  onChange={(e) => setCustomReason(e.target.value)}
                />
              </div>
            )}
            <div className="form-actions" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-check" onClick={() => setRejectTarget(null)}>
                닫기
              </button>
              <button className="btn btn-danger" onClick={submitReject}>
                거절 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
