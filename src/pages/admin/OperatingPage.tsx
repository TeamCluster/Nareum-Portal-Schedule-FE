import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client";
import { useOrg } from "../../hooks/useOrg";
import Collapsible from "../../components/Collapsible";
import type {
  CommonHoliday, Facility, HolidayType, OperatingHour, OrgHolidaysView, RecurringBlock,
} from "../../api/types";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
const HOUR_OPTIONS = Array.from({ length: 24 - 6 + 1 }, (_, i) => 6 + i); // 6..24
const TYPE_LABEL: Record<HolidayType, string> = { closure: "휴무일", holiday: "공휴일" };

function hh(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function groupByYear<T extends { date: string }>(items: T[]): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const y = it.date.slice(0, 4);
    if (!m.has(y)) m.set(y, []);
    m.get(y)!.push(it);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export default function OperatingPage() {
  const { api } = useOrg();

  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [hoursMsg, setHoursMsg] = useState("");
  const [hoursErr, setHoursErr] = useState("");

  const [hol, setHol] = useState<OrgHolidaysView | null>(null);
  const [closureForm, setClosureForm] = useState<{ date: string; name: string; type: HolidayType }>({
    date: "", name: "", type: "closure",
  });
  const [holYear, setHolYear] = useState<string>(""); // "" → 최초 로드 시 최근 연도로
  const [holErr, setHolErr] = useState("");

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [blocks, setBlocks] = useState<RecurringBlock[]>([]);
  const [blk, setBlk] = useState({ facility_id: "", weekday: "0", start_hour: "10", end_hour: "12", title: "" });
  const [blkErr, setBlkErr] = useState("");

  function loadHolidays() {
    api.get<OrgHolidaysView>("/admin/holidays").then(setHol);
  }
  useEffect(() => {
    api.get<{ operating_hours: OperatingHour[] }>("/admin/operating-hours").then((d) => setHours(d.operating_hours));
    api.get<{ blocks: RecurringBlock[] }>("/admin/recurring-blocks").then((d) => setBlocks(d.blocks));
    api.get<Facility[]>("/admin/facilities").then(setFacilities);
    loadHolidays();
  }, []);

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

  async function toggleOperates(v: boolean) {
    await api.put("/admin/holiday-setting", { holiday_operates: v });
    loadHolidays();
  }

  async function addClosure() {
    setHolErr("");
    if (!closureForm.date) return setHolErr("날짜를 선택해주세요.");
    try {
      await api.post("/admin/closures", closureForm);
      setClosureForm({ date: "", name: "", type: closureForm.type });
      loadHolidays();
    } catch (err) {
      setHolErr(err instanceof ApiError ? err.message : "추가에 실패했습니다.");
    }
  }

  async function delClosure(id: number) {
    await api.del(`/admin/closures/${id}`);
    loadHolidays();
  }

  async function toggleExclude(h: CommonHoliday) {
    if (h.excluded) await api.del(`/admin/holiday-excludes/${h.date}`);
    else await api.post("/admin/holiday-excludes", { date: h.date });
    loadHolidays();
  }

  const commonByYear = useMemo(() => groupByYear(hol?.common || []), [hol]);
  const placeByYear = useMemo(() => groupByYear(hol?.place || []), [hol]);
  const holYears = useMemo(() => {
    const s = new Set<string>();
    hol?.common.forEach((h) => s.add(h.date.slice(0, 4)));
    hol?.place.forEach((p) => s.add(p.date.slice(0, 4)));
    return [...s].sort();
  }, [hol]);
  // 기본 선택값 = 가장 최근 연도 (최초 1회)
  useEffect(() => {
    if (holYear === "" && holYears.length) setHolYear(holYears[holYears.length - 1]);
  }, [holYears, holYear]);
  const yearSel = holYear || "all";
  const shownCommon = yearSel === "all" ? commonByYear : commonByYear.filter(([y]) => y === yearSel);
  const shownPlace = yearSel === "all" ? placeByYear : placeByYear.filter(([y]) => y === yearSel);

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
            <thead><tr><th>요일</th><th>운영</th><th>시작</th><th>종료</th></tr></thead>
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

      {/* 휴무일 / 공휴일 */}
      <div className="form-card">
        <div className="form-section" style={{ marginBottom: 0 }}>
          <h4>휴무일 / 공휴일</h4>

          <label className="agree-box" style={{ marginBottom: 16 }}>
            <input type="checkbox" checked={!!hol?.holiday_operates}
                   onChange={(e) => toggleOperates(e.target.checked)} />
            공휴일에도 운영합니다 (공휴일은 <strong>주말(일요일) 운영시간</strong>으로 적용). 끄면 공휴일은 휴무.
          </label>

          {holErr && <ul className="flash-messages"><li>{holErr}</li></ul>}

          <div className="field-row" style={{ alignItems: "end" }}>
            <div className="field">
              <label>날짜</label>
              <input type="date" value={closureForm.date}
                     onChange={(e) => setClosureForm({ ...closureForm, date: e.target.value })} />
            </div>
            <div className="field">
              <label>유형</label>
              <select value={closureForm.type}
                      onChange={(e) => setClosureForm({ ...closureForm, type: e.target.value as HolidayType })}>
                <option value="closure">휴무일 (완전 휴무)</option>
                <option value="holiday">공휴일 (운영 설정 시 주말 시간)</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>사유/이름 (선택)</label>
            <input value={closureForm.name} placeholder="예: 개관기념일"
                   onChange={(e) => setClosureForm({ ...closureForm, name: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={addClosure} style={{ marginBottom: 18 }}>
            기관 휴무일 추가
          </button>

          <div className="cal-toolbar" style={{ marginTop: 16, marginBottom: 4 }}>
            <strong>등록 현황 (연도별)</strong>
            <div className="field" style={{ marginBottom: 0 }}>
              <select value={yearSel} onChange={(e) => setHolYear(e.target.value)}>
                <option value="all">전체 연도</option>
                {holYears.map((y) => <option key={y} value={y}>{y}년</option>)}
              </select>
            </div>
          </div>

          <h5 style={{ margin: "12px 0 8px" }}>공통 휴무일 (슈퍼 관리자 지정)</h5>
          {shownCommon.length === 0 ? (
            <p style={{ color: "var(--text-sub)" }}>해당 연도의 공통 휴무일이 없습니다.</p>
          ) : (
            shownCommon.map(([y, list]) => (
              <Collapsible key={y} title={`${y}년`} count={list.length}>
                <table className="admin-table">
                  <thead><tr><th>날짜</th><th>유형</th><th>이름</th><th>이 기관 적용</th></tr></thead>
                  <tbody>
                    {list.map((h) => (
                      <tr key={h.id} className={h.excluded ? "deleted" : ""}>
                        <td>{h.date}</td>
                        <td>
                          <span className={`status-pill ${h.type === "closure" ? "rejected" : "pending"}`}>
                            {TYPE_LABEL[h.type]}
                          </span>
                        </td>
                        <td>{h.name || "-"}</td>
                        <td>
                          {h.excluded ? (
                            <button className="btn btn-check" onClick={() => toggleExclude(h)}>제외됨 · 다시 적용</button>
                          ) : (
                            <button className="btn btn-danger" onClick={() => toggleExclude(h)}>이 기관에서 제외</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Collapsible>
            ))
          )}

          <h5 style={{ margin: "18px 0 8px" }}>기관 지정 휴무일</h5>
          {shownPlace.length === 0 ? (
            <p style={{ color: "var(--text-sub)" }}>해당 연도의 기관 지정 휴무일이 없습니다.</p>
          ) : (
            shownPlace.map(([y, list]) => (
              <Collapsible key={y} title={`${y}년`} count={list.length}>
                <table className="admin-table">
                  <thead><tr><th>날짜</th><th>유형</th><th>사유</th><th>관리</th></tr></thead>
                  <tbody>
                    {list.map((c) => (
                      <tr key={c.id}>
                        <td>{c.date}</td>
                        <td>
                          <span className={`status-pill ${c.type === "closure" ? "rejected" : "pending"}`}>
                            {TYPE_LABEL[c.type]}
                          </span>
                        </td>
                        <td>{c.reason || "-"}</td>
                        <td><button className="btn btn-danger" onClick={() => delClosure(c.id)}>삭제</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Collapsible>
            ))
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
