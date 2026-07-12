import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client";
import { superApi } from "../../api/super";
import type { CommonHoliday, HolidayType } from "../../api/types";

const TYPE_LABEL: Record<HolidayType, string> = { closure: "휴무일", holiday: "공휴일" };

function yearOf(date: string) {
  return date.slice(0, 4);
}

export default function SuperHolidaysPage() {
  const [items, setItems] = useState<CommonHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ date: string; name: string; type: HolidayType }>({
    date: "", name: "", type: "holiday",
  });
  const [error, setError] = useState("");
  const [year, setYear] = useState<string>("all");

  function load() {
    setLoading(true);
    superApi.listHolidays().then((d) => setItems(d.holidays)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  const years = useMemo(
    () => Array.from(new Set(items.map((h) => yearOf(h.date)))).sort(),
    [items],
  );
  const shown = year === "all" ? items : items.filter((h) => yearOf(h.date) === year);
  const grouped = useMemo(() => {
    const m = new Map<string, CommonHoliday[]>();
    for (const h of shown) {
      const y = yearOf(h.date);
      if (!m.has(y)) m.set(y, []);
      m.get(y)!.push(h);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [shown]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.date) return setError("날짜를 선택해주세요.");
    try {
      await superApi.addHoliday(form);
      setForm({ date: "", name: "", type: form.type });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "추가에 실패했습니다.");
    }
  }

  async function remove(h: CommonHoliday) {
    if (!window.confirm(`'${h.date} ${h.name}' 을(를) 삭제하시겠습니까?`)) return;
    await superApi.deleteHoliday(h.id);
    setItems((prev) => prev.filter((x) => x.id !== h.id));
  }

  return (
    <>
      <h2 className="page-title">공통 휴무일 / 공휴일</h2>
      <p style={{ color: "var(--text-sub)", marginTop: -8 }}>
        여기서 등록한 날짜는 <strong>모든 기관에 공통 적용</strong>됩니다. 기관은 자기 설정에서
        특정 날짜를 제외할 수 있습니다. (휴무일=완전 휴무, 공휴일=기관이 운영 설정 시 주말 시간 적용)
      </p>

      {error && <ul className="flash-messages"><li>{error}</li></ul>}

      <form className="form-card" onSubmit={add}>
        <div className="form-section" style={{ marginBottom: 0 }}>
          <h4>공통 휴무일 추가</h4>
          <div className="field-row">
            <div className="field">
              <label>날짜<span className="required">*</span></label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field">
              <label>유형</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as HolidayType })}>
                <option value="holiday">공휴일 (기관 설정 시 주말 운영)</option>
                <option value="closure">휴무일 (완전 휴무)</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>이름</label>
            <input value={form.name} placeholder="예: 삼일절, 설날"
                   onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit">추가</button>
        </div>
      </form>

      <div className="cal-toolbar" style={{ marginBottom: 12 }}>
        <strong>등록 목록</strong>
        <div className="field" style={{ marginBottom: 0 }}>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="all">전체 연도</option>
            {years.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : grouped.length === 0 ? (
        <div className="empty-state">등록된 공통 휴무일이 없습니다.</div>
      ) : (
        grouped.map(([y, list]) => (
          <div key={y} style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 8px" }}>{y}년 <span style={{ color: "var(--text-sub)", fontWeight: 400 }}>({list.length}건)</span></h4>
            <table className="admin-table">
              <thead><tr><th>날짜</th><th>유형</th><th>이름</th><th>관리</th></tr></thead>
              <tbody>
                {list.map((h) => (
                  <tr key={h.id}>
                    <td>{h.date}</td>
                    <td>
                      <span className={`status-pill ${h.type === "closure" ? "rejected" : "pending"}`}>
                        {TYPE_LABEL[h.type]}
                      </span>
                    </td>
                    <td>{h.name || "-"}</td>
                    <td><button className="btn btn-danger" onClick={() => remove(h)}>삭제</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </>
  );
}
