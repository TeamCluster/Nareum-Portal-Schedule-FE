import { Link, Outlet } from "react-router-dom";
import { assetUrl } from "../api/client";

export default function PublicLayout() {
  return (
    <>
      <header className="header-top">
        <div className="container header-container">
          <Link to="/">
            <img className="logo-img" src={assetUrl("/static/img/logo_nareum.png")} alt="나름센터" />
          </Link>
          <div className="header-actions">
            <Link className="btn btn-check" to="/check">
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
              <h3>나름청소년활동센터</h3>
              <p>주소: 경기도 나름시 청소년로 123</p>
              <p>운영시간: 평일 09:00 ~ 18:00</p>
            </div>
            <div className="footer-info footer-contact">
              <p>전화: 031-000-0000</p>
              <p>이메일: nareum@example.com</p>
            </div>
          </div>
          <div className="footer-copyright">© 2026 Cluster. All rights reserved.</div>
        </div>
      </footer>
    </>
  );
}
