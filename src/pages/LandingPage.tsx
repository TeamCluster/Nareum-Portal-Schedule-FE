import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

/**
 * 루트("/") 안내 페이지. 이 서비스는 기관별(slug) URL 로 접속한다.
 * 기관 예약 페이지는 /<slug>, 슈퍼 콘솔은 /super.
 */
export default function LandingPage() {
  useDocumentTitle("대관 예약 시스템");
  return (
    <div className="empty-state" style={{ margin: "80px auto", maxWidth: 560 }}>
      <h1 style={{ marginBottom: 12 }}>대관 예약 시스템</h1>
      <p style={{ color: "var(--text-sub)", lineHeight: 1.7 }}>
        기관별로 운영되는 예약 서비스입니다. 안내받은 기관 주소로 접속해 주세요.
        <br />
        예시: <code>/nareum</code> (기관 예약 홈)
      </p>
      <div className="form-actions" style={{ justifyContent: "center", marginTop: 24 }}>
        <Link className="btn btn-check" to="/super">
          슈퍼 관리자 콘솔
        </Link>
      </div>
    </div>
  );
}
