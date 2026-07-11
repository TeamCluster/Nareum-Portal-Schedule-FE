import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../../api/client";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/admin/login", { password });
      navigate("/manage");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0 }}>관리자 로그인</h2>
        <p style={{ color: "var(--text-sub)", fontSize: "0.9rem" }}>
          나름센터 대관 관리 페이지
        </p>
        {error && (
          <ul className="flash-messages">
            <li>{error}</li>
          </ul>
        )}
        <div className="field">
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
          {loading ? "확인 중..." : "접속하기"}
        </button>
        <p style={{ marginTop: 16 }}>
          <a href="/" style={{ color: "var(--primary-color)", fontSize: "0.85rem" }}>
            ← 센터 홈페이지로
          </a>
        </p>
      </form>
    </div>
  );
}
