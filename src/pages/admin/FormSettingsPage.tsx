// 신청서 설정 — 종이 서식의 '필요 물품' 목록과 앞·뒷면 안내문을 기관별로 관리.
import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { useOrg } from "../../hooks/useOrg";
import type { EquipmentGroup, FormConfig } from "../../api/types";
import { FACILITY_TYPES } from "../../lib/facilityTypes";

/** 항목 목록 ↔ 텍스트. 이름 뒤 '*' 는 수량 입력칸(예: 마이크 ( )대). */
function itemsToText(group: EquipmentGroup): string {
  return group.items.map((i) => (i.qty ? `${i.name}*` : i.name)).join("\n");
}

function textToItems(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line.endsWith("*")
        ? { name: line.slice(0, -1).trim(), qty: true }
        : { name: line, qty: false },
    )
    .filter((i) => i.name);
}

const NEW_GROUP: EquipmentGroup = {
  title: "",
  facility_types: [],
  allow_other: true,
  items: [],
};

export default function FormSettingsPage() {
  const { slug, api } = useOrg();
  const [groups, setGroups] = useState<EquipmentGroup[]>([]);
  const [itemText, setItemText] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [rules, setRules] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  function apply(cfg: FormConfig) {
    setGroups(cfg.equipment_catalog);
    setItemText(cfg.equipment_catalog.map(itemsToText));
    setNotice(cfg.notice.join("\n"));
    setRules(cfg.rules.join("\n"));
  }

  useEffect(() => {
    api.get<FormConfig>("/admin/form-config").then((cfg) => {
      apply(cfg);
      setLoaded(true);
    });
  }, [slug]);

  function updateGroup(idx: number, patch: Partial<EquipmentGroup>) {
    setGroups((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  }

  function toggleType(idx: number, type: string) {
    const cur = groups[idx].facility_types;
    updateGroup(idx, {
      facility_types: cur.includes(type) ? cur.filter((t) => t !== type) : [...cur, type],
    });
  }

  function addGroup() {
    setGroups((prev) => [...prev, { ...NEW_GROUP }]);
    setItemText((prev) => [...prev, ""]);
  }

  function removeGroup(idx: number) {
    setGroups((prev) => prev.filter((_, i) => i !== idx));
    setItemText((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    setSaving(true);
    try {
      const r = await api.put<FormConfig & { message: string }>("/admin/form-config", {
        equipment_catalog: groups.map((g, i) => ({ ...g, items: textToItems(itemText[i] || "") })),
        notice,
        rules,
      });
      apply(r); // 서버가 정규화한 결과로 화면을 되맞춘다.
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
      <h2 className="page-title">신청서 설정</h2>
      <p style={{ color: "var(--text-sub)", marginTop: -8 }}>
        대관 신청 화면에 표시되는 <strong>필요 물품 목록</strong>과{" "}
        <strong>공지·대관 규정</strong>을 기관에 맞게 수정합니다. (종이
        「시설대관이용신청서」 항목 기준)
      </p>

      {error && <ul className="flash-messages"><li>{error}</li></ul>}
      {ok && (
        <ul className="flash-messages">
          <li style={{ background: "#dcfce7", color: "#166534", borderColor: "#86efac" }}>{ok}</li>
        </ul>
      )}

      <div className="form-card">
        <div className="form-section">
          <h4>필요 물품 목록</h4>
          <p className="timeline-note">
            항목은 한 줄에 하나씩 입력합니다. 이름 뒤에 <code>*</code> 를 붙이면 신청 화면에
            수량 입력칸이 함께 표시됩니다 (예: <code>마이크*</code> → 마이크 3대).
          </p>

          {groups.map((g, idx) => (
            <div className="settings-group" key={idx}>
              <div className="field-row">
                <div className="field">
                  <label>분류명<span className="required">*</span></label>
                  <input
                    value={g.title}
                    onChange={(e) => updateGroup(idx, { title: e.target.value })}
                    placeholder="예) 음악"
                  />
                </div>
                <div className="field">
                  <label>적용 시설 유형 (선택 안 하면 모든 시설)</label>
                  <div className="equipment-grid">
                    {FACILITY_TYPES.map((t) => (
                      <label
                        key={t.value}
                        className={`checkbox-chip${
                          g.facility_types.includes(t.value) ? " checked" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={g.facility_types.includes(t.value)}
                          onChange={() => toggleType(idx, t.value)}
                        />
                        {t.value}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="field">
                <label>물품 항목 (한 줄에 하나)</label>
                <textarea
                  rows={Math.min(16, Math.max(4, (itemText[idx] || "").split("\n").length + 1))}
                  value={itemText[idx] || ""}
                  onChange={(e) =>
                    setItemText((prev) => prev.map((t, i) => (i === idx ? e.target.value : t)))
                  }
                  placeholder={"앰프(스탠다드)\n키보드\n마이크*"}
                />
              </div>
              <div className="settings-group-foot">
                <label className="checkbox-chip">
                  <input
                    type="checkbox"
                    checked={g.allow_other}
                    onChange={(e) => updateGroup(idx, { allow_other: e.target.checked })}
                  />
                  '기타(직접 입력)' 칸 표시
                </label>
                <button type="button" className="btn btn-danger" onClick={() => removeGroup(idx)}>
                  분류 삭제
                </button>
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-check" onClick={addGroup}>
            + 물품 분류 추가
          </button>
        </div>

        <div className="form-section">
          <h4>공지 및 준수사항</h4>
          <p className="timeline-note">
            신청 화면에 펼쳐진 목록으로 바로 보입니다. 한 줄에 한 항목씩 입력하세요.
          </p>
          <textarea
            rows={10}
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            placeholder="당일 대관 불가, 최소 이용 3일 전까지 신청 필수"
          />
        </div>

        <div className="form-section" style={{ marginBottom: 0 }}>
          <h4>대관 규정 및 유의사항</h4>
          <p className="timeline-note">
            신청 화면에서 '전문 보기'를 눌러 펼치는 번호 목록입니다. 한 줄에 한 항목씩
            입력하세요.
          </p>
          <textarea
            rows={14}
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="매주 월요일은 휴관일로 대관이 불가합니다."
          />
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
