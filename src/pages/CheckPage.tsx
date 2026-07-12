import { FormEvent, useState } from "react";
import { ApiError } from "../api/client";
import { useOrg } from "../hooks/useOrg";
import type { Reservation } from "../api/types";
import { formatPhoneNumber } from "../lib/phone";
import { dateOf, formatTime } from "../lib/datetime";

const STATUS_LABEL: Record<string, string> = {
  pending: "승인 대기 중",
  confirmed: "예약 확정",
  cancelled: "취소됨",
  rejected: "거절됨",
};

export default function CheckPage() {
  const { api } = useOrg();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post<Reservation[]>("/reservations/lookup", { name, contact });
      setReservations(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function cancel(res: Reservation) {
    if (!window.confirm("정말로 예약을 취소하시겠습니까?")) return;
    try {
      await api.post(`/reservations/${res.id}/cancel`);
      // Refresh the list.
      const data = await api.post<Reservation[]>("/reservations/lookup", { name, contact });
      setReservations(data);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "취소에 실패했습니다.");
    }
  }

  return (
    <>
      <h2 className="page-title">내 예약 확인</h2>

      <form className="form-card" onSubmit={onSearch}>
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
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "조회 중..." : "조회하기"}
        </button>
      </form>

      {error && (
        <ul className="flash-messages">
          <li>{error}</li>
        </ul>
      )}

      {reservations !== null &&
        (reservations.length === 0 ? (
          <div className="empty-state">해당 정보로 조회된 예약 내역이 없습니다.</div>
        ) : (
          <>
            <p style={{ color: "var(--text-sub)" }}>총 {reservations.length}건의 예약 내역</p>
            <div className="res-grid">
              {reservations.map((res) => {
                const cancellable = !res.is_deleted && ["pending", "confirmed"].includes(res.status);
                return (
                  <div className="res-ticket" key={res.id}>
                    <div className="res-header">
                      <h3 className="res-title">{res.facility?.name}</h3>
                      <span className={`status-pill ${res.status}`}>
                        {STATUS_LABEL[res.status]}
                      </span>
                    </div>
                    <div className="res-info-box">
                      <div>📅 {dateOf(res.start_time)}</div>
                      <div>
                        ⏰ {formatTime(res.start_time)} ~ {formatTime(res.end_time)}
                      </div>
                      <div>🏷️ {res.facility?.type}</div>
                    </div>
                    {cancellable && (
                      <button className="btn btn-danger" onClick={() => cancel(res)}>
                        예약 취소하기
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ))}
    </>
  );
}
