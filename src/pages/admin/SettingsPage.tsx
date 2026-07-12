import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { useOrg } from "../../hooks/useOrg";
import type { PlaceInfo } from "../../api/types";

const EMPTY = { full_name: "", short_name: "", address: "", phone: "", email: "" };
type FormState = typeof EMPTY;

export default function SettingsPage() {
  const { slug, api } = useOrg();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<PlaceInfo>("/info").then((p) => {
      setForm({
        full_name: p.full_name,
        short_name: p.short_name,
        address: p.address || "",
        phone: p.phone || "",
        email: p.email || "",
      });
      setLoaded(true);
    });
  }, [slug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    setSaving(true);
    try {
      const r = await api.put<{ message: string }>("/admin/info", form);
      setOk(r.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <div className="spinner" />;

  return (
    <form onSubmit={onSubmit}>
      <h2 className="page-title">기관 정보</h2>
      <p style={{ color: "var(--text-sub)", marginTop: -8 }}>
        여기서 수정한 이름·연락처는 공개 예약 페이지의 헤더·푸터에 표시됩니다.
        (식별자 <code>{slug}</code> 와 비밀번호는 슈퍼 관리자만 변경할 수 있습니다.)
      </p>

      {error && <ul className="flash-messages"><li>{error}</li></ul>}
      {ok && (
        <ul className="flash-messages">
          <li style={{ background: "#dcfce7", color: "#166534", borderColor: "#86efac" }}>{ok}</li>
        </ul>
      )}

      <div className="form-card">
        <div className="form-section">
          <h4>표시 이름</h4>
          <div className="field-row">
            <div className="field">
              <label>풀네임<span className="required">*</span> (예약 페이지 상단/푸터)</label>
              <input value={form.full_name}
                     onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="field">
              <label>축약별칭<span className="required">*</span> (관리자 헤더)</label>
              <input value={form.short_name}
                     onChange={(e) => setForm({ ...form, short_name: e.target.value })} required />
            </div>
          </div>
        </div>

        <div className="form-section" style={{ marginBottom: 0 }}>
          <h4>연락처 (공개 푸터)</h4>
          <div className="field">
            <label>주소</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>전화</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>이메일</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
          {saving ? "저장 중..." : "저장하기"}
        </button>
      </div>
    </form>
  );
}
