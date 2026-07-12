import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { assetUrl } from "../api/client";
import { useOrg } from "../hooks/useOrg";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { summarizeOperatingHours } from "../lib/operatingHours";
import type { PlaceInfo } from "../api/types";

const DEFAULT_LOGO = "/static/img/logo_nareum.png";

export default function PublicLayout() {
  const { slug, base, api } = useOrg();
  const [info, setInfo] = useState<PlaceInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  useDocumentTitle(
    notFound ? "기관을 찾을 수 없습니다" : info ? `${info.full_name} 대관 예약` : null,
  );

  useEffect(() => {
    setNotFound(false);
    api
      .get<PlaceInfo>("/info")
      .then(setInfo)
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="empty-state" style={{ margin: "80px auto", maxWidth: 520 }}>
        <h2>기관을 찾을 수 없습니다.</h2>
        <p style={{ color: "var(--text-sub)" }}>
          안내받은 기관 주소(예: <code>/nareum</code>)로 접속해 주세요.
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="header-top">
        <div className="container header-container">
          <Link to={base}>
            <img
              className="logo-img"
              src={assetUrl(info?.header_image || DEFAULT_LOGO)}
              alt={info?.short_name || "센터"}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = assetUrl(DEFAULT_LOGO); }}
            />
          </Link>
          <div className="header-actions">
            <Link className="btn btn-check" to={`${base}/check`}>
              내 예약 확인
            </Link>
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>

      <footer>
        <div className="container">
          <div className="footer-content">
            <div className="footer-info">
              <h3>{info?.full_name || " "}</h3>
              {info?.address && <p>주소: {info.address}</p>}
              {summarizeOperatingHours(info?.operating_hours) && (
                <p>운영시간: {summarizeOperatingHours(info?.operating_hours)}</p>
              )}
            </div>
            <div className="footer-info footer-contact">
              {info?.phone && <p>전화: {info.phone}</p>}
              {info?.email && <p>이메일: {info.email}</p>}
            </div>
          </div>
          <div className="footer-copyright">© 2026 Cluster. All rights reserved.</div>
        </div>
      </footer>
    </>
  );
}
