import { FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, assetUrl, validateImageFile } from "../../api/client";
import { useOrg } from "../../hooks/useOrg";
import type { Facility } from "../../api/types";
import { FACILITY_TYPES } from "../../lib/facilityTypes";

const EMPTY = { name: "", type: "", capacity: "", description: "" };
type FormState = typeof EMPTY;

/** 예약 페이지 픽토그램이 유형에 매핑되므로 유형은 사전 정의 목록에서 선택.
 *  기존(레거시) 커스텀 유형이 있으면 그 값도 옵션에 포함해 유지. */
function typeOptions(current: string): string[] {
  const vals = FACILITY_TYPES.map((t) => t.value);
  return current && !vals.includes(current) ? [current, ...vals] : vals;
}

export default function FacilitiesPage() {
  const { api } = useOrg();
  const [items, setItems] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [addFile, setAddFile] = useState<File | null>(null);
  const addFileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api.get<Facility[]>("/admin/facilities").then(setItems).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function bodyOf(f: FormState) {
    return {
      name: f.name,
      type: f.type,
      capacity: f.capacity === "" ? null : Number(f.capacity),
      description: f.description,
    };
  }

  async function uploadImage(facilityId: number, file: File) {
    const invalid = validateImageFile(file);
    if (invalid) throw new ApiError(invalid, 400);
    const fd = new FormData();
    fd.append("image", file);
    await api.upload(`/admin/facilities/${facilityId}/image`, fd);
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post<{ facility: Facility }>("/admin/facilities", bodyOf(form));
      if (addFile) await uploadImage(res.facility.id, addFile);
      setForm(EMPTY);
      setAddFile(null);
      if (addFileRef.current) addFileRef.current.value = "";
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "시설 추가에 실패했습니다.");
    }
  }

  function openEdit(f: Facility) {
    setEditing(f);
    setEditForm({
      name: f.name,
      type: f.type,
      capacity: f.capacity == null ? "" : String(f.capacity),
      description: f.description || "",
    });
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await api.put(`/admin/facilities/${editing.id}`, bodyOf(editForm));
      setEditing(null);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "수정에 실패했습니다.");
    }
  }

  async function onEditImage(file: File) {
    if (!editing) return;
    try {
      const r = await uploadImageReturn(editing.id, file);
      // 반영: 목록 + 편집 대상 갱신
      setItems((prev) => prev.map((x) => (x.id === editing.id ? { ...x, image_url: r } : x)));
      setEditing((prev) => (prev ? { ...prev, image_url: r } : prev));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "이미지 업로드에 실패했습니다.");
    }
  }

  async function uploadImageReturn(facilityId: number, file: File) {
    const invalid = validateImageFile(file);
    if (invalid) throw new ApiError(invalid, 400);
    const fd = new FormData();
    fd.append("image", file);
    const r = await api.upload<{ image_url: string }>(`/admin/facilities/${facilityId}/image`, fd);
    return r.image_url;
  }

  async function removeImage() {
    if (!editing) return;
    if (!window.confirm("현재 이미지를 삭제하시겠습니까?")) return;
    await api.del(`/admin/facilities/${editing.id}/image`);
    setItems((prev) => prev.map((x) => (x.id === editing.id ? { ...x, image_url: null } : x)));
    setEditing((prev) => (prev ? { ...prev, image_url: null } : prev));
  }

  async function remove(f: Facility) {
    if (!window.confirm(`'${f.name}' 시설을 삭제하시겠습니까?\n해당 시설의 예약 내역·이미지도 함께 삭제됩니다.`)) return;
    try {
      await api.del(`/admin/facilities/${f.id}`);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
    }
  }

  return (
    <>
      <h2 className="page-title">시설 관리</h2>

      {error && <ul className="flash-messages"><li>{error}</li></ul>}

      <form className="form-card" onSubmit={add}>
        <div className="form-section" style={{ marginBottom: 0 }}>
          <h4>시설 추가</h4>
          <div className="field-row">
            <div className="field">
              <label>시설 이름<span className="required">*</span></label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>유형<span className="required">*</span> (예약 페이지 아이콘이 유형에 맞게 표시됨)</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                <option value="">유형 선택</option>
                {FACILITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.value}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>수용 인원</label>
              <input type="number" min={0} value={form.capacity}
                     onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div className="field">
              <label>예시 사진 (선택, 5MB 이하)</label>
              <input ref={addFileRef} type="file" accept="image/*"
                     onChange={(e) => setAddFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div className="field">
            <label>설명</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit">시설 추가</button>
        </div>
      </form>

      {loading ? (
        <div className="spinner" />
      ) : items.length === 0 ? (
        <div className="empty-state">등록된 시설이 없습니다.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>사진</th>
              <th>이름</th>
              <th>유형</th>
              <th>수용</th>
              <th>설명</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((f) => (
              <tr key={f.id}>
                <td>
                  {f.image_url ? (
                    <img src={assetUrl(f.image_url)} alt={f.name} className="fac-thumb" />
                  ) : (
                    <span className="fac-thumb fac-thumb-empty">없음</span>
                  )}
                </td>
                <td>{f.name}</td>
                <td>{f.type}</td>
                <td>{f.capacity ?? "-"}</td>
                <td>{f.description || "-"}</td>
                <td>
                  <div className="inline-actions">
                    <button className="btn btn-check" onClick={() => openEdit(f)}>수정</button>
                    <button className="btn btn-danger" onClick={() => remove(f)}>삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>시설 수정 — {editing.name}</h3>

            <div className="field">
              <label>예시 사진</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 6 }}>
                {editing.image_url ? (
                  <img src={assetUrl(editing.image_url)} alt={editing.name} className="fac-thumb-lg" />
                ) : (
                  <span className="fac-thumb-lg fac-thumb-empty">사진 없음</span>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input type="file" accept="image/*"
                         onChange={(e) => { const f = e.target.files?.[0]; if (f) onEditImage(f); }} />
                  {editing.image_url && (
                    <button type="button" className="btn btn-danger" onClick={removeImage}>사진 삭제</button>
                  )}
                </div>
              </div>
              <p style={{ color: "var(--text-sub)", fontSize: "0.78rem", marginTop: 6 }}>
                새 사진을 올리면 기존 사진은 자동으로 삭제됩니다.
              </p>
            </div>

            <div className="field">
              <label>이름</label>
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="field">
              <label>유형</label>
              <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                {typeOptions(editForm.type).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>수용 인원</label>
              <input type="number" min={0} value={editForm.capacity}
                     onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })} />
            </div>
            <div className="field">
              <label>설명</label>
              <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="form-actions" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-check" onClick={() => setEditing(null)}>닫기</button>
              <button className="btn btn-primary" onClick={saveEdit}>저장</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
