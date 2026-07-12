import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useOrg } from "../hooks/useOrg";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import type { PlaceInfo } from "../api/types";

export default function AdminLayout() {
  const { slug, base, api } = useOrg();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [info, setInfo] = useState<PlaceInfo | null>(null);

  useDocumentTitle(`${info?.short_name || slug} 관리자`);

  const links = [
    { to: base + "/manage", label: "대시보드", end: true },
    { to: base + "/manage/requests", label: "승인 요청", end: false },
    { to: base + "/manage/list", label: "전체 예약 목록", end: false },
    { to: base + "/manage/add", label: "예약 직접 추가", end: false },
    { to: base + "/manage/facilities", label: "시설 관리", end: false },
    { to: base + "/manage/settings", label: "기관 정보", end: false },
  ];

  useEffect(() => {
    api.get<{ pending_count: number }>("/admin/dashboard").then((d) => setPendingCount(d.pending_count)).catch(() => {});
    api.get<PlaceInfo>("/info").then(setInfo).catch(() => {});
  }, [slug]);

  async function logout() {
    await api.post("/admin/logout");
    navigate(`${base}/manage/login`);
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="brand">{info?.short_name || slug} 관리자</div>
        <nav className="admin-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              <span>{l.label}</span>
              {l.label === "승인 요청" && pendingCount > 0 && (
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
          <strong>{info?.full_name || slug} · 관리자 페이지</strong>
          <div className="header-actions">
            <a className="btn btn-check" href={base} target="_blank" rel="noreferrer">
              기관 홈페이지
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
