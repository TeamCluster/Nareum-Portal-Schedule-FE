import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client";
import { useOrg } from "../../hooks/useOrg";
import Collapsible from "../../components/Collapsible";
import type {
  BookingRules, CommonHoliday, Facility, HolidayType, OperatingHour, OrgHolidaysView,
  RecurringBlock, RecurringKind,
} from "../../api/types";
import ClubPicker from "../../components/ClubPicker";
import { RECURRING_KINDS } from "../../lib/recurringKinds";

const EMPTY_BLOCK = {
  facility_id: "", weekday: "0", start_hour: "10", end_hour: "12",
  title: "", kind: "club" as RecurringKind,
};

/** 대관 규칙 입력 항목 — 종이 규정의 숫자값을 기관별로 조정한다. */
const RULE_FIELDS: { key: keyof BookingRules; label: string; unit: string; hint: string }[] = [
  { key: "booking_min_days", label: "최소 신청 기한", unit: "일 전",
    hint: "당일·임박 신청을 막는다. 예) 3 → 이용 3일 전까지 신청" },
  { key: "booking_max_days", label: "예약 가능 범위", unit: "일 뒤까지",
    hint: "예약일 기준 얼마나 앞까지 열어둘지. 예) 14 → 2주" },
  { key: "cancel_deadline_days", label: "취소 마감", unit: "일 전",
    hint: "신청자가 직접 취소할 수 있는 기한. 이후에는 담당자만 처리 가능. 0 이면 당일까지 허용" },
  { key: "penalty_months", label: "재대관 제한 기간", unit: "개월",
    hint: "노쇼·이용확인 미실시로 기록된 신청인의 재대관을 막는 기간. 0 이면 제한 없음" },
  { key: "extension_hours", label: "현장 연장 가능 시간", unit: "시간",
    hint: "뒤이은 대관예약이 없을 때 현장에서 늘려줄 수 있는 시간. 0 이면 연장 미운영" },
];

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

  const [rules, setRules] = useState<BookingRules | null>(null);
  const [rulesMsg, setRulesMsg] = useState("");
  const [rulesErr, setRulesErr] = useState("");

  const [hol, setHol] = useState<OrgHolidaysView | null>(null);
  const [closureForm, setClosureForm] = useState<{ date: string; name: string; type: HolidayType }>({
    date: "", name: "", type: "closure",
  });
  const [holYear, setHolYear] = useState<string>(""); // "" → 최초 로드 시 최근 연도로
  const [holErr, setHolErr] = useState("");

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [blocks, setBlocks] = useState<RecurringBlock[]>([]);
  const [blk, setBlk] = useState(EMPTY_BLOCK);
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);
  const [blkErr, setBlkErr] = useState("");

  function loadHolidays() {
    api.get<OrgHolidaysView>("/admin/holidays").then(setHol);
  }
  useEffect(() => {
    api.get<{ operating_hours: OperatingHour[] }>("/admin/operating-hours").then((d) => setHours(d.operating_hours));
    api.get<{ booking_rules: BookingRules }>("/admin/booking-rules").then((d) => setRules(d.booking_rules));
    api.get<{ blocks: RecurringBlock[] }>("/admin/recurring-blocks").then((d) => setBlocks(d.blocks));
    api.get<Facility[]>("/admin/facilities").then(setFacilities);
    loadHolidays();
  }, []);

  function setDay(wd: number, patch: Partial<OperatingHour>) {
    setHours((prev) => prev.map((d) => (d.weekday === wd ? { ...d, ...patch } : d)));
  }

  async function saveRules() {
    if (!rules) return;
    setRulesMsg("");
    setRulesErr("");
    try {
      const d = await api.put<{ booking_rules: BookingRules; message: string }>(
        "/admin/booking-rules", rules);
      setRules(d.booking_rules);
      setRulesMsg(d.message);
    } catch (err) {
      setRulesErr(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    }
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

  function reloadBlocks() {
    api.get<{ blocks: RecurringBlock[] }>("/admin/recurring-blocks").then((d) => setBlocks(d.blocks));
  }

  function cancelBlockEdit() {
    setEditingBlockId(null);
    setBlk(EMPTY_BLOCK);
    setBlkErr("");
  }

  function startBlockEdit(b: RecurringBlock) {
    setEditingBlockId(b.id);
    setBlkErr("");
    setBlk({
      facility_id: String(b.facility_id),
      weekday: String(b.weekday),
      start_hour: String(b.start_hour),
      end_hour: String(b.end_hour),
      title: b.title,
      kind: b.kind,
    });
  }

  async function submitBlock() {
    setBlkErr("");
    if (!blk.facility_id) return setBlkErr("시설을 선택해주세요.");
    if (!blk.title.trim()) return setBlkErr(`${kindDef.nameLabel}을(를) 입력해주세요.`);
    const body = {
      facility_id: Number(blk.facility_id),
      weekday: Number(blk.weekday),
      start_hour: Number(blk.start_hour),
      end_hour: Number(blk.end_hour),
      title: blk.title,
      kind: blk.kind,
    };
    try {
      if (editingBlockId === null) await api.post("/admin/recurring-blocks", body);
      else await api.put(`/admin/recurring-blocks/${editingBlockId}`, body);
      cancelBlockEdit();
      reloadBlocks();
    } catch (err) {
      setBlkErr(err instanceof ApiError ? err.message : "정기활동 저장에 실패했습니다.");
    }
  }

  async function delBlock(id: number) {
    if (!window.confirm("이 정기활동을 삭제할까요?")) return;
    await api.del(`/admin/recurring-blocks/${id}`);
    if (editingBlockId === id) cancelBlockEdit();
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  const kindDef = RECURRING_KINDS.find((k) => k.value === blk.kind) ?? RECURRING_KINDS[2];

  return (
    <>
      <h2 className="page-title">운영 설정</h2>

      {/* 대관 규칙 (숫자값) */}
      <div className="form-card">
        <div className="form-section" style={{ marginBottom: 0 }}>
          <h4>대관 규칙</h4>
          <p className="timeline-note">
            신청 화면의 안내 문구는 <strong>신청서 설정</strong>에서 따로 수정합니다. 여기 값이
            실제로 신청·취소·제재를 판정하므로, 안내 문구와 어긋나지 않게 맞춰주세요.
          </p>
          {rulesErr && <ul className="flash-messages"><li>{rulesErr}</li></ul>}
          {rulesMsg && (
            <ul className="flash-messages">
              <li style={{ background: "#dcfce7", color: "#166534", borderColor: "#86efac" }}>{rulesMsg}</li>
            </ul>
          )}
          {rules && (
            <>
              <table className="admin-table" style={{ marginBottom: 16 }}>
                <thead><tr><th>항목</th><th>값</th><th>설명</th></tr></thead>
                <tbody>
                  {RULE_FIELDS.map((f) => (
                    <tr key={f.key}>
                      <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{f.label}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <input
                          type="number"
                          min={0}
                          style={{ width: 72, textAlign: "center" }}
                          value={rules[f.key]}
                          onChange={(e) =>
                            setRules({ ...rules, [f.key]: Number(e.target.value) || 0 })
                          }
                        />{" "}
                        {f.unit}
                      </td>
                      <td style={{ color: "var(--text-sub)", fontSize: "0.85rem" }}>{f.hint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-primary" onClick={saveRules}>대관 규칙 저장</button>
            </>
          )}
        </div>
      </div>

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
          <p className="timeline-note" style={{ marginTop: -6 }}>
            동아리 정기활동, 센터 프로그램, 시설 점검이나 외부 정기대관처럼{" "}
            <strong>매주 같은 시간에 고정으로 잡히는 일정</strong>을 등록합니다. 등록한
            시간대는 공개 대관 신청에서 선택할 수 없습니다. 한 번뿐인 동아리 대관은
            대신 “예약 직접 추가”의 동아리 단기대관을 쓰세요.
          </p>
          {blkErr && <ul className="flash-messages"><li>{blkErr}</li></ul>}
          {editingBlockId !== null && (
            <ul className="flash-messages">
              <li style={{ background: "#eff6ff", color: "#1e40af", borderColor: "#bfdbfe" }}>
                등록된 정기활동을 수정하고 있습니다.
              </li>
            </ul>
          )}
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
            <label>활동 유형</label>
            <div className="equipment-grid">
              {RECURRING_KINDS.map((k) => (
                <label key={k.value} className={`checkbox-chip${blk.kind === k.value ? " checked" : ""}`}>
                  <input
                    type="radio"
                    name="block-kind"
                    checked={blk.kind === k.value}
                    /* 유형을 바꾸면 앞 유형에서 넣은 이름은 의미가 없으므로 비운다. */
                    onChange={() => setBlk({ ...blk, kind: k.value, title: "" })}
                  />
                  {k.label}
                </label>
              ))}
            </div>
            <p className="timeline-note">{kindDef.hint}</p>
          </div>

          {blk.kind === "club" ? (
            <ClubPicker value={blk.title} onChange={(name) => setBlk({ ...blk, title: name })} />
          ) : (
            <div className="field">
              <label>
                {kindDef.nameLabel}
                <span className="required">*</span>
              </label>
              <input value={blk.title} placeholder={kindDef.placeholder} maxLength={100}
                     onChange={(e) => setBlk({ ...blk, title: e.target.value })} />
            </div>
          )}

          <div className="inline-actions" style={{ marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={submitBlock}>
              {editingBlockId === null ? "정기활동 추가" : "수정 저장"}
            </button>
            {editingBlockId !== null && (
              <button className="btn btn-check" onClick={cancelBlockEdit}>수정 취소</button>
            )}
          </div>

          {blocks.length === 0 ? (
            <p style={{ color: "var(--text-sub)" }}>등록된 정기활동이 없습니다.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>요일</th><th>시설</th><th>시간</th><th>유형</th><th>활동명</th><th>관리</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((b) => (
                  <tr key={b.id} className={editingBlockId === b.id ? "row-editing" : ""}>
                    <td style={{ fontWeight: 700 }}>{WEEKDAYS[b.weekday]}</td>
                    <td>{b.facility_name || "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{hh(b.start_hour)}~{hh(b.end_hour)}</td>
                    <td><span className={`kind-pill ${b.kind}`}>{b.kind_label}</span></td>
                    <td>{b.title || "-"}</td>
                    <td>
                      <div className="inline-actions">
                        <button className="btn btn-check" onClick={() => startBlockEdit(b)}>수정</button>
                        <button className="btn btn-danger" onClick={() => delBlock(b.id)}>삭제</button>
                      </div>
                    </td>
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
