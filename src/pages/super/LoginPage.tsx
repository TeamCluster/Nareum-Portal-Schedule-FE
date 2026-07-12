import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { superApi } from "../../api/super";

export default function SuperLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await superApi.login(password);
      navigate("/super");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0 }}>슈퍼 관리자 로그인</h2>
        <p style={{ color: "var(--text-sub)", fontSize: "0.9rem" }}>
          전체 기관 관리 콘솔
        </p>
        {error && (
          <ul className="flash-messages">
            <li>{error}</li>
          </ul>
        )}
        <div className="field">
          <input
            type="password"
            placeholder="슈퍼 비밀번호"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
          {loading ? "확인 중..." : "접속하기"}
        </button>
      </form>
    </div>
  );
}
