import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { useOrg } from "../../hooks/useOrg";
import type { Closure, Facility, OperatingHour, RecurringBlock } from "../../api/types";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
const HOUR_OPTIONS = Array.from({ length: 24 - 6 + 1 }, (_, i) => 6 + i); // 6..24

function hh(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

export default function OperatingPage() {
  const { api } = useOrg();

  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [hoursMsg, setHoursMsg] = useState("");
  const [hoursErr, setHoursErr] = useState("");

  const [closures, setClosures] = useState<Closure[]>([]);
  const [closureDate, setClosureDate] = useState("");
  const [closureReason, setClosureReason] = useState("");

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [blocks, setBlocks] = useState<RecurringBlock[]>([]);
  const [blk, setBlk] = useState({ facility_id: "", weekday: "0", start_hour: "10", end_hour: "12", title: "" });
  const [blkErr, setBlkErr] = useState("");

  function loadAll() {
    api.get<{ operating_hours: OperatingHour[] }>("/admin/operating-hours").then((d) => setHours(d.operating_hours));
    api.get<{ closures: Closure[] }>("/admin/closures").then((d) => setClosures(d.closures));
    api.get<{ blocks: RecurringBlock[] }>("/admin/recurring-blocks").then((d) => setBlocks(d.blocks));
    api.get<Facility[]>("/admin/facilities").then(setFacilities);
  }
  useEffect(loadAll, []);

  function setDay(wd: number, patch: Partial<OperatingHour>) {
    setHours((prev) => prev.map((d) => (d.weekday === wd ? { ...d, ...patch } : d)));
  }

  async function saveHours() {
    setHoursMsg("");
    setHoursErr("");
    try {
      await api.put("/admin/operating-hours", { operating_hours: hours });
      setHoursMsg("운영시간이 저장되었습니다.");
    } catch (err) {
      setHoursErr(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    }
  }

  async function addClosure() {
    if (!closureDate) return;
    try {
      await api.post("/admin/closures", { date: closureDate, reason: closureReason });
      setClosureDate("");
      setClosureReason("");
      api.get<{ closures: Closure[] }>("/admin/closures").then((d) => setClosures(d.closures));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "휴무일 추가에 실패했습니다.");
    }
  }

  async function delClosure(id: number) {
    await api.del(`/admin/closures/${id}`);
    setClosures((prev) => prev.filter((c) => c.id !== id));
  }

  async function addBlock() {
    setBlkErr("");
    if (!blk.facility_id) return setBlkErr("시설을 선택해주세요.");
    try {
      await api.post("/admin/recurring-blocks", {
        facility_id: Number(blk.facility_id),
        weekday: Number(blk.weekday),
        start_hour: Number(blk.start_hour),
        end_hour: Number(blk.end_hour),
        title: blk.title,
      });
      setBlk({ ...blk, title: "" });
      api.get<{ blocks: RecurringBlock[] }>("/admin/recurring-blocks").then((d) => setBlocks(d.blocks));
    } catch (err) {
      setBlkErr(err instanceof ApiError ? err.message : "정기활동 추가에 실패했습니다.");
    }
  }

  async function delBlock(id: number) {
    await api.del(`/admin/recurring-blocks/${id}`);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <>
      <h2 className="page-title">운영 설정</h2>

      {/* 요일별 운영시간 */}
      <div className="form-card">
        <div className="form-section" style={{ marginBottom: 0 }}>
          <h4>요일별 운영시간</h4>
          {hoursErr && <ul className="flash-messages"><li>{hoursErr}</li></ul>}
          {hoursMsg && (
            <ul className="flash-messages">
              <li style={{ background: "#dcfce7", color: "#166534", borderColor: "#86efac" }}>{hoursMsg}</li>
            </ul>
          )}
          <table className="admin-table" style={{ marginBottom: 16 }}>
            <thead>
              <tr><th>요일</th><th>운영</th><th>시작</th><th>종료</th></tr>
            </thead>
            <tbody>
              {hours.map((d) => (
                <tr key={d.weekday}>
                  <td style={{ fontWeight: 700 }}>{WEEKDAYS[d.weekday]}</td>
                  <td>
                    <label className="checkbox-chip" style={{ border: "none", padding: 0 }}>
                      <input type="checkbox" checked={d.is_open}
                             onChange={(e) => setDay(d.weekday, { is_open: e.target.checked })} />
                      {d.is_open ? "운영" : "휴무"}
                    </label>
                  </td>
                  <td>
                    <select value={d.open_hour} disabled={!d.is_open}
                            onChange={(e) => setDay(d.weekday, { open_hour: Number(e.target.value) })}>
                      {HOUR_OPTIONS.filter((h) => h < 24).map((h) => <option key={h} value={h}>{hh(h)}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={d.close_hour} disabled={!d.is_open}
                            onChange={(e) => setDay(d.weekday, { close_hour: Number(e.target.value) })}>
                      {HOUR_OPTIONS.filter((h) => h > d.open_hour).map((h) => <option key={h} value={h}>{hh(h)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn btn-primary" onClick={saveHours}>운영시간 저장</button>
        </div>
      </div>

      {/* 휴무일 */}
      <div className="form-card">
        <div className="form-section" style={{ marginBottom: 0 }}>
          <h4>휴무일 (행사·공휴일 등 특정 날짜 차단)</h4>
          <div className="field-row" style={{ alignItems: "end" }}>
            <div className="field">
              <label>날짜</label>
              <input type="date" value={closureDate} onChange={(e) => setClosureDate(e.target.value)} />
            </div>
            <div className="field">
              <label>사유(선택)</label>
              <input value={closureReason} placeholder="예: 개관기념일"
                     onChange={(e) => setClosureReason(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={addClosure} style={{ marginBottom: 16 }}>휴무일 추가</button>
          {closures.length === 0 ? (
            <p style={{ color: "var(--text-sub)" }}>등록된 휴무일이 없습니다.</p>
          ) : (
            <table className="admin-table">
              <thead><tr><th>날짜</th><th>사유</th><th>관리</th></tr></thead>
              <tbody>
                {closures.map((c) => (
                  <tr key={c.id}>
                    <td>{c.date}</td>
                    <td>{c.reason || "-"}</td>
                    <td><button className="btn btn-danger" onClick={() => delClosure(c.id)}>삭제</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 정기 고정활동 */}
      <div className="form-card">
        <div className="form-section" style={{ marginBottom: 0 }}>
          <h4>정기 고정활동 (매주 반복 — 대관 겹침 방지)</h4>
          {blkErr && <ul className="flash-messages"><li>{blkErr}</li></ul>}
          <div className="field-row">
            <div className="field">
              <label>시설</label>
              <select value={blk.facility_id} onChange={(e) => setBlk({ ...blk, facility_id: e.target.value })}>
                <option value="">시설 선택</option>
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>요일</label>
              <select value={blk.weekday} onChange={(e) => setBlk({ ...blk, weekday: e.target.value })}>
                {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>시작</label>
              <select value={blk.start_hour} onChange={(e) => setBlk({ ...blk, start_hour: e.target.value })}>
                {HOUR_OPTIONS.filter((h) => h < 24).map((h) => <option key={h} value={h}>{hh(h)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>종료</label>
              <select value={blk.end_hour} onChange={(e) => setBlk({ ...blk, end_hour: e.target.value })}>
                {HOUR_OPTIONS.filter((h) => h > Number(blk.start_hour)).map((h) => <option key={h} value={h}>{hh(h)}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>활동명(선택)</label>
            <input value={blk.title} placeholder="예: 방송댄스 정기수업"
                   onChange={(e) => setBlk({ ...blk, title: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={addBlock} style={{ marginBottom: 16 }}>정기활동 추가</button>

          {blocks.length === 0 ? (
            <p style={{ color: "var(--text-sub)" }}>등록된 정기활동이 없습니다.</p>
          ) : (
            <table className="admin-table">
              <thead><tr><th>요일</th><th>시설</th><th>시간</th><th>활동명</th><th>관리</th></tr></thead>
              <tbody>
                {blocks.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700 }}>{WEEKDAYS[b.weekday]}</td>
                    <td>{b.facility_name || "-"}</td>
                    <td>{hh(b.start_hour)}~{hh(b.end_hour)}</td>
                    <td>{b.title || "-"}</td>
                    <td><button className="btn btn-danger" onClick={() => delBlock(b.id)}>삭제</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
