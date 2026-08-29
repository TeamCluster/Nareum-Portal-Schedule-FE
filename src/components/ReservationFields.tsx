// 종이 「시설대관이용신청서」의 신청인 / 활동내용 / 이용인원 / 필요 물품 블록.
// 공개 신청(ReservePage)과 관리자 추가·수정(AddPage/EditPage)이 함께 쓴다.
import { ReactNode } from "react";
import type {
  EquipmentGroup,
  EquipmentItem,
  ParticipantBand,
  ParticipantInfo,
} from "../api/types";
import { formatPhoneNumber } from "../lib/phone";
import {
  GENDERS,
  InputGender,
  PARTICIPANT_BANDS,
  emptyParticipants,
  otherItems,
  participantTotal,
  qtyOf,
  setEquipment,
} from "../lib/reservationForm";

export interface ApplicantState {
  name: string;
  age: string;      // 종이 서식의 '이름 (나이)'
  contact: string;
  address: string;  // 종이 서식의 '주소 또는 E-Mail'
  school: string;
  club: string;
  activity: string; // 활동내용 (예: 춤연습, 밴드합주, 보드게임)
  participants: ParticipantInfo;
  equipment: EquipmentItem[];
}

export const EMPTY_APPLICANT: ApplicantState = {
  name: "",
  age: "",
  contact: "",
  address: "",
  school: "",
  club: "",
  activity: "",
  participants: emptyParticipants(),
  equipment: [],
};

interface Props {
  value: ApplicantState;
  onChange: (next: ApplicantState) => void;
  /** 신청 화면에서 노출할 필요 물품 목록 (기관 설정). 비면 물품 섹션을 숨긴다. */
  catalog: EquipmentGroup[];
  /** true 면 공개 신청 기준으로 필수 표시(이름·연락처·소속·활동내용). */
  requireFields?: boolean;
  /** 신청인 정보와 활동내용 사이에 끼워 넣을 블록 (공개 화면의 이용 시간 선택). */
  middleSlot?: ReactNode;
}

export default function ReservationFields({
  value,
  onChange,
  catalog,
  requireFields = false,
  middleSlot,
}: Props) {
  const req = requireFields ? <span className="required">*</span> : null;
  const others = otherItems(value.equipment, catalog);
  const allowOther = catalog.some((g) => g.allow_other);
  // 성별 구분 이전에 저장된 인원은 수정할 수 없으므로 안내만 한다.
  const legacyCounts = PARTICIPANT_BANDS
    .filter((b) => value.participants[b.key]?.unspecified)
    .map((b) => `${b.label} ${value.participants[b.key].unspecified}명`)
    .join(", ");

  function set<K extends keyof ApplicantState>(key: K, v: ApplicantState[K]) {
    onChange({ ...value, [key]: v });
  }

  function setCount(band: ParticipantBand, gender: InputGender, raw: string) {
    const n = Math.max(0, Number(raw) || 0);
    onChange({
      ...value,
      participants: {
        ...value.participants,
        [band]: { ...value.participants[band], [gender]: n },
      },
    });
  }

  function toggleItem(name: string, checked: boolean) {
    set("equipment", setEquipment(value.equipment, name, checked ? 1 : 0));
  }

  function setQty(name: string, raw: string) {
    set("equipment", setEquipment(value.equipment, name, Math.max(0, Number(raw) || 0)));
  }

  /** '기타' 자유입력 — 쉼표로 구분된 목록으로 카탈로그 밖 항목을 통째로 교체. */
  function setOthers(text: string) {
    const known = value.equipment.filter((e) => !others.some((o) => o.name === e.name));
    const added = text
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((name) => ({ name, qty: 1 }));
    set("equipment", [...known, ...added]);
  }

  return (
    <>
      <div className="form-section">
        <h4>신청인 정보</h4>
        <div className="field-row">
          <div className="field">
            <label>이름{req}</label>
            <input
              type="text"
              value={value.name}
              onChange={(e) => set("name", e.target.value)}
              required={requireFields}
            />
          </div>
          <div className="field">
            <label>나이</label>
            <input
              type="number"
              min={0}
              max={120}
              value={value.age}
              onChange={(e) => set("age", e.target.value)}
              placeholder="선택 입력"
            />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>연락처{req}</label>
            <input
              type="text"
              maxLength={13}
              value={value.contact}
              onChange={(e) => set("contact", formatPhoneNumber(e.target.value))}
              required={requireFields}
            />
          </div>
          <div className="field">
            <label>주소 또는 E-Mail</label>
            <input
              type="text"
              value={value.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="선택 입력"
            />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>학교/소속{req}</label>
            <input
              type="text"
              value={value.school}
              onChange={(e) => set("school", e.target.value)}
              required={requireFields}
            />
          </div>
          <div className="field">
            <label>동아리 (해당 경우)</label>
            <input type="text" value={value.club} onChange={(e) => set("club", e.target.value)} />
          </div>
        </div>
      </div>

      {middleSlot}

      <div className="form-section">
        <h4>활동내용{req}</h4>
        <div className="field" style={{ marginBottom: 0 }}>
          <input
            type="text"
            value={value.activity}
            onChange={(e) => set("activity", e.target.value)}
            placeholder="예) 춤연습, 밴드합주, 보드게임"
            maxLength={200}
            required={requireFields}
          />
        </div>
      </div>

      <div className="form-section">
        <h4>이용 인원 (총 {participantTotal(value.participants)}명)</h4>
        <div className="participant-table-wrap">
          <table className="participant-table">
            <thead>
              <tr>
                <th />
                {PARTICIPANT_BANDS.map((b) => (
                  <th key={b.key} colSpan={2}>
                    {b.label}
                  </th>
                ))}
                <th>계</th>
              </tr>
              <tr>
                <th />
                {PARTICIPANT_BANDS.map((b) =>
                  GENDERS.map((g) => (
                    <th key={`${b.key}-${g.key}`} className="sub">
                      {g.label}
                    </th>
                  )),
                )}
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="row-head">인원 수</th>
                {PARTICIPANT_BANDS.map((b) =>
                  GENDERS.map((g) => (
                    <td key={`${b.key}-${g.key}`}>
                      <input
                        type="number"
                        min={0}
                        aria-label={`${b.label} ${g.label}`}
                        value={value.participants[b.key]?.[g.key] ?? 0}
                        onChange={(e) => setCount(b.key, g.key, e.target.value)}
                      />
                    </td>
                  )),
                )}
                <td className="total">{participantTotal(value.participants)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {legacyCounts && (
          <p className="timeline-note">
            성별 구분 도입 전에 접수되어 성별이 없는 인원({legacyCounts})이 총원에 함께
            집계되어 있습니다.
          </p>
        )}
      </div>

      {catalog.length > 0 && (
        <div className="form-section">
          <h4>필요 물품</h4>
          {catalog.map((group) => (
            <div className="equipment-group" key={group.title}>
              <p className="equipment-group-title">{group.title}</p>
              <div className="equipment-grid">
                {group.items.map((item) => {
                  const qty = qtyOf(value.equipment, item.name);
                  const on = qty > 0;
                  return (
                    <span
                      key={`${group.title}-${item.name}`}
                      className={`checkbox-chip${on ? " checked" : ""}`}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => toggleItem(item.name, e.target.checked)}
                        />
                        {item.name}
                      </label>
                      {item.qty && on && (
                        <span className="qty-box">
                          <input
                            type="number"
                            className="qty-input"
                            min={1}
                            value={qty}
                            aria-label={`${item.name} 수량`}
                            onChange={(e) => setQty(item.name, e.target.value)}
                          />
                          대
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          {allowOther && (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>기타 (쉼표로 구분해 직접 입력)</label>
              <input
                type="text"
                value={others.map((o) => o.name).join(", ")}
                onChange={(e) => setOthers(e.target.value)}
                placeholder="예) 보면대, 연장 케이블"
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
