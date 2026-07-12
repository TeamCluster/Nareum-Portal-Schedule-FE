import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { useOrg } from "../../hooks/useOrg";
import type { Facility } from "../../api/types";

const EMPTY = { name: "", type: "", capacity: "", description: "", image_url: "" };
type FormState = typeof EMPTY;

export default function FacilitiesPage() {
  const { api } = useOrg();
  const [items, setItems] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY);
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
      image_url: f.image_url,
    };
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/admin/facilities", bodyOf(form));
      setForm(EMPTY);
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
      image_url: f.image_url || "",
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

  async function remove(f: Facility) {
    if (!window.confirm(`'${f.name}' 시설을 삭제하시겠습니까?\n해당 시설의 예약 내역도 함께 삭제됩니다.`)) return;
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

      {error && (
        <ul className="flash-messages">
          <li>{error}</li>
        </ul>
      )}

      <form className="form-card" onSubmit={add}>
        <div className="form-section" style={{ marginBottom: 0 }}>
          <h4>시설 추가</h4>
          <div className="field-row">
            <div className="field">
              <label>시설 이름<span className="required">*</span></label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>유형<span className="required">*</span> (연습실/활동실/회의실 등)</label>
              <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>수용 인원</label>
              <input type="number" min={0} value={form.capacity}
                     onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div className="field">
              <label>이미지 경로 (예: /static/img/room001.jpg)</label>
              <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
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
              <th>No.</th>
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
                <td>{f.id}</td>
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
              <label>이름</label>
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="field">
              <label>유형</label>
              <input value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} />
            </div>
            <div className="field">
              <label>수용 인원</label>
              <input type="number" min={0} value={editForm.capacity}
                     onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })} />
            </div>
            <div className="field">
              <label>이미지 경로</label>
              <input value={editForm.image_url} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} />
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
