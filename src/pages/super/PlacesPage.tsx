import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, assetUrl, validateImageFile } from "../../api/client";
import { superApi, PlaceInput } from "../../api/super";
import type { Place } from "../../api/types";

const EMPTY: PlaceInput = {
  slug: "", full_name: "", short_name: "", password: "",
  address: "", phone: "", email: "",
};

export default function SuperPlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<PlaceInput>(EMPTY);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [pwTarget, setPwTarget] = useState<Place | null>(null);
  const [newPw, setNewPw] = useState("");

  function load() {
    setLoading(true);
    superApi.listPlaces().then((d) => setPlaces(d.places)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(""); setOk("");
    try {
      const r = await superApi.addPlace(form);
      setOk(r.message);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "기관 추가에 실패했습니다.");
    }
  }

  async function remove(p: Place) {
    if (!window.confirm(`기관 '${p.full_name}' 을(를) 삭제하시겠습니까?\n(데이터 파일은 보존되어 같은 슬러그로 재추가 시 복구됩니다.)`)) return;
    try {
      const r = await superApi.deletePlace(p.slug);
      setOk(r.message);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
    }
  }

  async function uploadHeader(slug: string, file: File) {
    setOk(""); setError("");
    const invalid = validateImageFile(file);
    if (invalid) { setError(invalid); return; }
    try {
      const fd = new FormData();
      fd.append("image", file);
      const r = await superApi.uploadHeader(slug, fd);
      setPlaces((prev) => prev.map((p) => (p.slug === slug ? { ...p, header_image: r.header_image } : p)));
      setOk("헤더 로고가 업로드되었습니다.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로고 업로드에 실패했습니다.");
    }
  }

  async function deleteHeader(slug: string) {
    if (!window.confirm("헤더 로고를 삭제하시겠습니까?")) return;
    await superApi.deleteHeader(slug);
    setPlaces((prev) => prev.map((p) => (p.slug === slug ? { ...p, header_image: "" } : p)));
  }

  async function changePw() {
    if (!pwTarget) return;
    try {
      const r = await superApi.changePlacePassword(pwTarget.slug, newPw);
      alert(r.message);
      setPwTarget(null); setNewPw("");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "변경에 실패했습니다.");
    }
  }

  return (
    <>
      <h2 className="page-title">기관 관리</h2>

      {error && <ul className="flash-messages"><li>{error}</li></ul>}
      {ok && (
        <ul className="flash-messages">
          <li style={{ background: "#dcfce7", color: "#166534", borderColor: "#86efac" }}>{ok}</li>
        </ul>
      )}

      <form className="form-card" onSubmit={add}>
        <div className="form-section" style={{ marginBottom: 0 }}>
          <h4>기관 추가</h4>
          <div className="field-row">
            <div className="field">
              <label>슬러그(영문 식별자)<span className="required">*</span></label>
              <input value={form.slug} placeholder="예: didim"
                     onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            </div>
            <div className="field">
              <label>관리자 비밀번호<span className="required">*</span> (6자 이상)</label>
              <input type="text" value={form.password}
                     onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>풀네임<span className="required">*</span></label>
              <input value={form.full_name} placeholder="예: 디딤청소년센터"
                     onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="field">
              <label>축약별칭<span className="required">*</span></label>
              <input value={form.short_name} placeholder="예: 디딤"
                     onChange={(e) => setForm({ ...form, short_name: e.target.value })} required />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>주소</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="field">
              <label>전화</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>이메일</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit">기관 추가</button>
        </div>
      </form>

      {loading ? (
        <div className="spinner" />
      ) : places.length === 0 ? (
        <div className="empty-state">등록된 기관이 없습니다.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>슬러그</th>
              <th>기관명</th>
              <th>헤더 로고</th>
              <th>연락처</th>
              <th>공개 주소</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {places.map((p) => (
              <tr key={p.id}>
                <td><code>{p.slug}</code></td>
                <td>
                  {p.full_name}
                  <br />
                  <span style={{ color: "var(--text-sub)", fontSize: "0.82rem" }}>{p.short_name}</span>
                </td>
                <td>
                  {p.header_image ? (
                    <img src={assetUrl(p.header_image)} alt="헤더 로고" className="fac-thumb" />
                  ) : (
                    <span className="fac-thumb fac-thumb-empty">없음</span>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                    <label className="btn btn-check" style={{ cursor: "pointer" }}>
                      업로드
                      <input type="file" accept="image/*" style={{ display: "none" }}
                             onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHeader(p.slug, f); e.currentTarget.value = ""; }} />
                    </label>
                    {p.header_image && (
                      <button className="btn btn-danger" onClick={() => deleteHeader(p.slug)}>삭제</button>
                    )}
                  </div>
                </td>
                <td style={{ fontSize: "0.82rem" }}>
                  {p.phone || "-"}
                  <br />
                  {p.email || ""}
                </td>
                <td>
                  <Link to={`/${p.slug}`} target="_blank" style={{ color: "var(--primary-color)" }}>
                    /{p.slug}
                  </Link>
                  {" · "}
                  <Link to={`/${p.slug}/manage`} target="_blank" style={{ color: "var(--text-sub)" }}>
                    관리자
                  </Link>
                </td>
                <td>
                  <div className="inline-actions">
                    <button className="btn btn-check" onClick={() => setPwTarget(p)}>비번 변경</button>
                    <button className="btn btn-danger" onClick={() => remove(p)}>삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pwTarget && (
        <div className="modal-overlay" onClick={() => setPwTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>기관 비밀번호 변경 — {pwTarget.full_name}</h3>
            <div className="field">
              <label>새 관리자 비밀번호 (6자 이상)</label>
              <input type="text" value={newPw} autoFocus
                     onChange={(e) => setNewPw(e.target.value)} />
            </div>
            <div className="form-actions" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-check" onClick={() => setPwTarget(null)}>닫기</button>
              <button className="btn btn-primary" onClick={changePw}>변경</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
