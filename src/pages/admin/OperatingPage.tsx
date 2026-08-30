import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client";
import { useOrg } from "../../hooks/useOrg";
import Collapsible from "../../components/Collapsible";
import type {
  BookingRules, CommonHoliday, Facility, HolidayType, OperatingHour, OrgHolidaysView,
  RecurringBlock, RecurringKind,
} from "../../api/types";
import ClubPicker from "../../components/ClubPicker";
import { BLOCK_STATUS_LABELS, RECURRING_KINDS } from "../../lib/recurringKinds";

/** 오늘 / 이번 달 — 정기활동 적용 기간 입력의 기본값. */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function thisMonth() {
  return todayStr().slice(0, 7);
}
function nextMonth() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;                       // 0-based → 1-based
  // Date.setMonth(+1) 은 말일에서 넘쳐(1/31 → 3/3) 달을 건너뛰므로 직접 계산한다.
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

const EMPTY_BLOCK = {
  facility_id: "", weekday: "0", start_hour: "10", end_hour: "12",
  title: "", kind: "club" as RecurringKind,
  // 적용 기간 — 동아리는 month, 프로그램·기타는 start_date~end_date 를 쓴다.
  month: thisMonth(), start_date: todayStr(), end_date: "",
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
  // 동아리 일정 달 복제 — 매달 같은 표를 다시 등록하는 부담을 던다.
  const [copy, setCopy] = useState({ from: thisMonth(), to: nextMonth() });
  const [copyMsg, setCopyMsg] = useState("");
  const [copying, setCopying] = useState(false);

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
      // 동아리는 서버가 되돌려준 month 로, 아니면 기간 그대로 복원한다.
      month: b.month || thisMonth(),
      start_date: b.effective_from,
      end_date: b.effective_to,
    });
  }

  async function submitBlock() {
    setBlkErr("");
    if (!blk.facility_id) return setBlkErr("시설을 선택해주세요.");
    if (!blk.title.trim()) return setBlkErr(`${kindDef.nameLabel}을(를) 입력해주세요.`);
    // 적용 기간 — 서버도 같은 규칙을 강제하지만, 여기서 걸러야 이유가 바로 보인다.
    if (kindDef.period === "month" && !blk.month) {
      return setBlkErr("적용할 달을 선택해주세요.");
    }
    if (kindDef.period === "range" && !(blk.start_date && blk.end_date)) {
      return setBlkErr("프로그램은 시작일과 종료일을 모두 지정해주세요.");
    }
    if (blk.start_date && blk.end_date && blk.start_date > blk.end_date) {
      return setBlkErr("종료일은 시작일과 같거나 뒤여야 합니다.");
    }
    const body = {
      facility_id: Number(blk.facility_id),
      weekday: Number(blk.weekday),
      start_hour: Number(blk.start_hour),
      end_hour: Number(blk.end_hour),
      title: blk.title,
      kind: blk.kind,
      // 서버는 kind 에 맞는 키만 읽는다(club → month, 그 외 → start/end).
      month: blk.month,
      start_date: blk.start_date,
      end_date: blk.end_date,
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

  async function copyMonth() {
    setCopyMsg("");
    setBlkErr("");
    if (!copy.from || !copy.to) return setBlkErr("복제할 달과 붙여넣을 달을 모두 선택해주세요.");
    setCopying(true);
    try {
      const r = await api.post<{ message: string }>("/admin/recurring-blocks/copy-month", {
        from_month: copy.from,
        to_month: copy.to,
      });
      setCopyMsg(r.message);
      reloadBlocks();
    } catch (err) {
      setBlkErr(err instanceof ApiError ? err.message : "복제에 실패했습니다.");
    } finally {
      setCopying(false);
    }
  }

  async function delBlock(id: number) {
    if (!window.confirm("이 정기활동을 삭제할까요?")) return;
    await api.del(`/admin/recurring-blocks/${id}`);
    if (editingBlockId === id) cancelBlockEdit();
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  const kindDef = RECURRING_KINDS.find((k) => k.value === blk.kind) ?? RECURRING_KINDS[2];

  // 적용 기간 내(현재·예정) / 종료 로 가른다.
  // '예정'을 현재와 같은 묶음에 두는 이유: 기간 판정은 오늘이 아니라 '예약하려는
  // 날짜' 기준이라, 다음 달 일정은 다음 달 예약을 지금도 이미 막고 있다.
  // 서버가 상태별로 정렬해 보내므로 그룹 안의 순서(요일·시작시각)는 그대로다.
  const liveBlocks = blocks.filter((b) => b.status !== "ended");
  const endedBlocks = blocks.filter((b) => b.status === "ended");

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
            <strong>정해진 기간 안에서 매주 같은 시간에 반복되는 일정</strong>을 등록합니다.
            등록한 시간대는 그 기간 동안 공개 대관 신청에서 선택할 수 없고, 기간이 지나면
            자동으로 풀립니다. 동아리는 매달 회의 결과에 맞춰 달 단위로, 프로그램은
            기수의 시작일~종료일로 등록하세요. 한 번뿐인 동아리 대관은 대신
            “예약 직접 추가”의 동아리 단기대관을 쓰세요.
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
                    /* 유형을 바꾸면 앞 유형에서 넣은 이름과 기간은 의미가 없다.
                       (동아리의 '9월'을 프로그램의 시작·종료일로 옮길 수 없다.) */
                    onChange={() => setBlk({
                      ...blk, kind: k.value, title: "",
                      month: thisMonth(), start_date: todayStr(), end_date: "",
                    })}
                  />
                  {k.label}
                </label>
              ))}
            </div>
            <p className="timeline-note">{kindDef.hint}</p>
          </div>

          {/* 적용 기간 — 동아리는 매달 회의로 정해져 '월' 하나, 프로그램은 기수라
              시작·종료일, 기타는 비워두면 무기한. */}
          {kindDef.period === "month" ? (
            <div className="field">
              <label>적용 월<span className="required">*</span></label>
              <input
                type="month"
                value={blk.month}
                onChange={(e) => setBlk({ ...blk, month: e.target.value })}
              />
              <p className="timeline-note">{kindDef.periodHint}</p>
            </div>
          ) : (
            <div className="field">
              <label>
                적용 기간
                {kindDef.period === "range" && <span className="required">*</span>}
              </label>
              <div className="field-row" style={{ marginBottom: 0 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <input
                    type="date"
                    aria-label="시작일"
                    value={blk.start_date}
                    onChange={(e) => setBlk({ ...blk, start_date: e.target.value })}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <input
                    type="date"
                    aria-label="종료일"
                    value={blk.end_date}
                    min={blk.start_date || undefined}
                    onChange={(e) => setBlk({ ...blk, end_date: e.target.value })}
                  />
                </div>
              </div>
              <p className="timeline-note">{kindDef.periodHint}</p>
            </div>
          )}

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
            <>
              {/* 아직 유효한 일정과 기간이 끝난 일정을 갈라 놓는다. 매달 갱신하는
                  동아리 일정이 쌓이면 한 표에 섞여 있을 때 "이게 아직 사는 건가"를
                  행마다 날짜로 따져봐야 한다. */}
              {/* 동아리 일정은 매달 회의로 다시 정해져 달마다 같은 표를 새로 등록해야
                  한다. 지난달치를 통째로 옮겨두고 바뀐 것만 고치도록 한다. */}
              <div className="month-copy">
                <div className="month-copy-head">
                  <strong>동아리 일정 달 복제</strong>
                  <span>한 달치 동아리 정기활동을 다른 달로 그대로 옮깁니다.</span>
                </div>
                <div className="month-copy-controls">
                  <input
                    type="month"
                    aria-label="복제할 달"
                    value={copy.from}
                    onChange={(e) => setCopy({ ...copy, from: e.target.value })}
                  />
                  <span aria-hidden="true">→</span>
                  <input
                    type="month"
                    aria-label="붙여넣을 달"
                    value={copy.to}
                    onChange={(e) => setCopy({ ...copy, to: e.target.value })}
                  />
                  <button className="btn btn-check" onClick={copyMonth} disabled={copying}>
                    {copying ? "복제 중…" : "복제"}
                  </button>
                </div>
                <p className="timeline-note" style={{ margin: 0 }}>
                  동아리 유형만 복제됩니다(프로그램은 기수마다 기간이 달라 대상이 아닙니다).
                  이미 같은 일정이 있으면 건너뛰므로 여러 번 눌러도 중복되지 않습니다.
                </p>
                {copyMsg && <p className="month-copy-result">{copyMsg}</p>}
              </div>

              <h5 style={{ margin: "18px 0 8px" }}>
                적용 기간 내 (현재 · 예정){" "}
                <span style={{ color: "var(--text-sub)", fontWeight: 400, fontSize: "0.85rem" }}>
                  대관 신청에서 막고 있는 시간
                </span>
              </h5>
              {liveBlocks.length === 0 ? (
                <p style={{ color: "var(--text-sub)" }}>
                  적용 기간이 남아 있는 정기활동이 없습니다.
                </p>
              ) : (
                <>
                  <p className="timeline-note" style={{ marginTop: 0 }}>
                    “예정”도 이미 적용됩니다 — 기간 판정은 오늘이 아니라 신청하려는
                    날짜를 기준으로 하므로, 다음 달 일정은 다음 달 예약을 지금도 막습니다.
                  </p>
                  <BlockTable
                    blocks={liveBlocks}
                    editingBlockId={editingBlockId}
                    onEdit={startBlockEdit}
                    onDelete={delBlock}
                  />
                </>
              )}

              {endedBlocks.length > 0 && (
                <Collapsible title="적용 기간 종료" count={endedBlocks.length}>
                  <p className="timeline-note" style={{ marginTop: 0 }}>
                    기간이 끝나 더 이상 대관 신청을 막지 않습니다. 동아리 일정은
                    수정에서 적용 월만 바꾸면 다시 살릴 수 있습니다.
                  </p>
                  <BlockTable
                    blocks={endedBlocks}
                    editingBlockId={editingBlockId}
                    onEdit={startBlockEdit}
                    onDelete={delBlock}
                  />
                </Collapsible>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** 정기활동 목록 표 — 적용 기간 내/외 그룹이 같은 표를 쓴다. */
function BlockTable({
  blocks,
  editingBlockId,
  onEdit,
  onDelete,
}: {
  blocks: RecurringBlock[];
  editingBlockId: number | null;
  onEdit: (b: RecurringBlock) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>요일</th><th>시설</th><th>시간</th><th>유형</th><th>활동명</th>
          <th>적용 기간</th><th>관리</th>
        </tr>
      </thead>
      <tbody>
        {blocks.map((b) => (
          <tr
            key={b.id}
            className={`${editingBlockId === b.id ? "row-editing" : ""}${
              b.status === "ended" ? " row-ended" : ""
            }`}
          >
            <td style={{ fontWeight: 700 }}>{WEEKDAYS[b.weekday]}</td>
            <td>{b.facility_name || "-"}</td>
            <td style={{ whiteSpace: "nowrap" }}>{hh(b.start_hour)}~{hh(b.end_hour)}</td>
            <td><span className={`kind-pill ${b.kind}`}>{b.kind_label}</span></td>
            <td>{b.title || "-"}</td>
            <td style={{ whiteSpace: "nowrap" }}>
              <span className={`period-pill ${b.status}`}>{BLOCK_STATUS_LABELS[b.status]}</span>{" "}
              {b.period_label}
            </td>
            <td>
              <div className="inline-actions">
                <button className="btn btn-check" onClick={() => onEdit(b)}>수정</button>
                <button className="btn btn-danger" onClick={() => onDelete(b.id)}>삭제</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
