import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { superApi } from "../api/super";

export default function SuperLayout() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [newPw, setNewPw] = useState("");

  async function logout() {
    await superApi.logout();
    navigate("/super/login");
  }

  async function changePw() {
    try {
      const r = await superApi.changePassword(newPw);
      alert(r.message);
      setShowPw(false);
      setNewPw("");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "변경에 실패했습니다.");
    }
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="brand">슈퍼 관리자</div>
        <nav className="admin-nav">
          <a className="active" style={{ pointerEvents: "none" }}>
            <span>기관 관리</span>
          </a>
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <strong>전체 기관 관리 콘솔</strong>
          <div className="header-actions">
            <button className="btn btn-check" onClick={() => setShowPw(true)}>
              슈퍼 비밀번호 변경
            </button>
            <button className="btn btn-admin" onClick={logout}>
              로그아웃
            </button>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>

      {showPw && (
        <div className="modal-overlay" onClick={() => setShowPw(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>슈퍼 비밀번호 변경</h3>
            <div className="field">
              <label>새 비밀번호 (6자 이상)</label>
              <input type="password" value={newPw} autoFocus
                     onChange={(e) => setNewPw(e.target.value)} />
            </div>
            <div className="form-actions" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-check" onClick={() => setShowPw(false)}>닫기</button>
              <button className="btn btn-primary" onClick={changePw}>변경</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
