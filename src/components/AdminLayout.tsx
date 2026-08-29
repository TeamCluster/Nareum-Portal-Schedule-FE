import { ReactNode, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useOrg } from "../hooks/useOrg";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import type { PlaceInfo } from "../api/types";

const ICONS: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></>,
  requests: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  list: <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>,
  add: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
  facilities: <><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-6h6v6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>,
  form: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

export default function AdminLayout() {
  const { slug, base, api } = useOrg();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [info, setInfo] = useState<PlaceInfo | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem("admin_sidebar_collapsed") === "1",
  );

  useDocumentTitle(`${info?.short_name || slug} 관리자`);

  const links = [
    { to: base + "/manage", label: "대시보드", end: true, icon: "dashboard" },
    { to: base + "/manage/requests", label: "승인 요청", end: false, icon: "requests" },
    { to: base + "/manage/list", label: "전체 예약 목록", end: false, icon: "list" },
    { to: base + "/manage/add", label: "예약 직접 추가", end: false, icon: "add" },
    { to: base + "/manage/facilities", label: "시설 관리", end: false, icon: "facilities" },
    { to: base + "/manage/operating", label: "운영 설정", end: false, icon: "clock" },
    { to: base + "/manage/form-settings", label: "신청서 설정", end: false, icon: "form" },
    { to: base + "/manage/settings", label: "기관 정보", end: false, icon: "settings" },
  ];

  useEffect(() => {
    api.get<{ pending_count: number }>("/admin/dashboard").then((d) => setPendingCount(d.pending_count)).catch(() => {});
    api.get<PlaceInfo>("/info").then(setInfo).catch(() => {});
  }, [slug]);

  function toggleSidebar() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("admin_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }

  async function logout() {
    await api.post("/admin/logout");
    navigate(`${base}/manage/login`);
  }

  return (
    <div className={`admin-layout${collapsed ? " collapsed" : ""}`}>
      <aside className="admin-sidebar">
        <div className="brand">
          <span className="brand-text">{info?.short_name || slug} 관리자</span>
          <span className="brand-mark" aria-hidden>{(info?.short_name || slug).slice(0, 1)}</span>
        </div>
        <nav className="admin-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} title={l.label}>
              <NavIcon name={l.icon} />
              <span className="nav-label">{l.label}</span>
              {l.label === "승인 요청" && pendingCount > 0 && (
                <span className="badge badge-warning nav-badge">{pendingCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <button className="hamburger" onClick={toggleSidebar}
                    aria-label="사이드바 접기/펼치기" title="사이드바 접기/펼치기">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <strong>{info?.full_name || slug} · 관리자 페이지</strong>
          </div>
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
