import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { assetUrl } from "../api/client";
import { useOrg } from "../hooks/useOrg";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { summarizeOperatingHours } from "../lib/operatingHours";
import type { PlaceInfo } from "../api/types";

export default function PublicLayout() {
  const { slug, base, api } = useOrg();
  const [info, setInfo] = useState<PlaceInfo | null>(null);
  const [imgError, setImgError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useDocumentTitle(
    notFound ? "기관을 찾을 수 없습니다" : info ? `${info.full_name} 대관 예약` : null,
  );

  useEffect(() => {
    setNotFound(false);
    setImgError(false);
    api
      .get<PlaceInfo>("/info")
      .then(setInfo)
      .catch(() => setNotFound(true));
  }, [slug]);

  const showImage = !!info?.header_image && !imgError;

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
          <Link to={base} className="brand-link">
            {showImage ? (
              <img
                className="logo-img"
                src={assetUrl(info!.header_image!)}
                alt={info?.short_name || "센터"}
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="logo-text" style={{ margin: "0% 15%" }}>
                {info?.full_name || info?.short_name || ""}
              </span>
            )}
          </Link>
          <div className="header-actions">
            <Link className="btn btn-check" to={`${base}/check`}>
              내 예약 확인
            </Link>
          </div>
        </div>
      </header>

      <main className="container">
        {/* 하위 페이지가 기관 정보를 재조회하지 않도록 컨텍스트로 전달. */}
        <Outlet context={{ info }} />
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
