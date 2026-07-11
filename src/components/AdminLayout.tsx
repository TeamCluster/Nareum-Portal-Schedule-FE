import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../api/client";

const links = [
  { to: "/manage", label: "대시보드", end: true },
  { to: "/manage/requests", label: "승인 요청", end: false },
  { to: "/manage/list", label: "전체 예약 목록", end: false },
  { to: "/manage/add", label: "예약 직접 추가", end: false },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    api
      .get<{ pending_count: number }>("/admin/dashboard")
      .then((d) => setPendingCount(d.pending_count))
      .catch(() => {});
  }, []);

  async function logout() {
    await api.post("/admin/logout");
    navigate("/manage/login");
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="brand">나름센터 관리자</div>
        <nav className="admin-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              <span>{l.label}</span>
              {l.to === "/manage/requests" && pendingCount > 0 && (
                <span className="badge badge-warning" style={{ marginLeft: "auto" }}>
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <strong>관리자 페이지</strong>
          <div className="header-actions">
            <a className="btn btn-check" href="/" target="_blank" rel="noreferrer">
              센터 홈페이지
            </a>
            <button className="btn btn-admin" onClick={logout}>
              로그아웃
            </button>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
