import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useOrg } from "../hooks/useOrg";
import type { Reservation } from "../api/types";
import { formatKoreanDate, formatTime } from "../lib/datetime";
import { equipmentSummary, participantSummary } from "../lib/reservationForm";

export default function CompletePage() {
  const { base, api } = useOrg();
  const { accessId } = useParams();
  const [res, setRes] = useState<Reservation | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get<Reservation>(`/reservations/${accessId}`)
      .then(setRes)
      .catch(() => setNotFound(true));
  }, [accessId]);

  if (notFound) return <div className="empty-state">예약 정보를 찾을 수 없습니다.</div>;
  if (!res) return <div className="spinner" />;

  return (
    <div className="complete-card">
      <svg className="check-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <h2>예약 신청 완료</h2>
      <p style={{ color: "var(--text-sub)" }}>
        <strong>{res.applicant_name}</strong>님의 예약 신청이 접수되었습니다.
      </p>

      <div className="summary-box">
        <div className="row">
          <span>시설</span>
          <strong>{res.facility?.name}</strong>
        </div>
        <div className="row">
          <span>날짜</span>
          <strong>{formatKoreanDate(res.start_time)}</strong>
        </div>
        <div className="row">
          <span>시간</span>
          <strong>
            {formatTime(res.start_time)} ~ {formatTime(res.end_time)}
          </strong>
        </div>
        {res.activity && (
          <div className="row">
            <span>활동내용</span>
            <strong>{res.activity}</strong>
          </div>
        )}
        <div className="row">
          <span>이용 인원</span>
          <strong>{participantSummary(res.participant_info) || "-"}</strong>
        </div>
        {res.requested_equipment.length > 0 && (
          <div className="row">
            <span>필요 물품</span>
            <strong>{equipmentSummary(res.requested_equipment)}</strong>
          </div>
        )}
      </div>

      <div className="notice">
        신청하신 예약은 관리자 승인 후 확정됩니다. 현재 상태는 <strong>승인 대기</strong>입니다.
      </div>

      <div className="form-actions" style={{ justifyContent: "center" }}>
        <Link className="btn btn-check" to={base}>
          메인으로 이동
        </Link>
        <Link className="btn btn-primary" to={`${base}/check`}>
          예약 확인하기
        </Link>
      </div>
    </div>
  );
}
