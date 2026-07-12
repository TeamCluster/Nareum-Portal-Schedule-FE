import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useOrg } from "../../hooks/useOrg";
import type { Reservation } from "../../api/types";
import { dateOf, formatTime } from "../../lib/datetime";

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "확정", cls: "confirmed" },
  pending: { label: "대기", cls: "pending" },
  cancelled: { label: "취소됨", cls: "cancelled" },
  rejected: { label: "거절됨", cls: "rejected" },
};

export default function ListPage() {
  const { base, api } = useOrg();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Reservation[]>("/admin/reservations")
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h2 className="page-title">전체 예약 목록</h2>
      {loading ? (
        <div className="spinner" />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>상태</th>
              <th>시설명</th>
              <th>이용 일시</th>
              <th>신청인</th>
              <th>연락처</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const s = STATUS[r.status];
              return (
                <tr key={r.id} className={r.is_deleted ? "deleted" : ""}>
                  <td>{r.id}</td>
                  <td>
                    <span className={`status-pill ${s.cls}`}>{s.label}</span>
                  </td>
                  <td>{r.facility?.name}</td>
                  <td>
                    {dateOf(r.start_time)} {formatTime(r.start_time)}~{formatTime(r.end_time)}
                  </td>
                  <td>{r.applicant_name}</td>
                  <td>{r.applicant_contact}</td>
                  <td>
                    <Link to={`${base}/manage/edit/${r.id}`} style={{ color: "var(--primary-color)" }}>
                      수정
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
