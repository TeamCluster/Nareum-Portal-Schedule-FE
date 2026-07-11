// Shared applicant + participants + equipment fields for admin add/edit forms.
import { formatPhoneNumber } from "../lib/phone";

const EQUIPMENT = ["앰프", "스피커", "마이크", "키보드"];
export const PARTICIPANT_FIELDS: { key: string; label: string }[] = [
  { key: "elementary", label: "초등" },
  { key: "middle", label: "중등" },
  { key: "high", label: "고등" },
  { key: "teen", label: "후기청소년" },
  { key: "adult", label: "성인" },
];

export interface ApplicantState {
  name: string;
  contact: string;
  school: string;
  club: string;
  participants: Record<string, number>;
  equipment: string[];
}

interface Props {
  value: ApplicantState;
  onChange: (next: ApplicantState) => void;
}

export default function ReservationFields({ value, onChange }: Props) {
  function set<K extends keyof ApplicantState>(key: K, v: ApplicantState[K]) {
    onChange({ ...value, [key]: v });
  }

  function toggleEquipment(item: string) {
    const next = value.equipment.includes(item)
      ? value.equipment.filter((e) => e !== item)
      : [...value.equipment, item];
    set("equipment", next);
  }

  return (
    <>
      <div className="form-section">
        <h4>신청인 정보</h4>
        <div className="field-row">
          <div className="field">
            <label>이름</label>
            <input type="text" value={value.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="field">
            <label>연락처</label>
            <input
              type="text"
              maxLength={13}
              value={value.contact}
              onChange={(e) => set("contact", formatPhoneNumber(e.target.value))}
            />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>소속(학교)</label>
            <input type="text" value={value.school} onChange={(e) => set("school", e.target.value)} />
          </div>
          <div className="field">
            <label>동아리/단체명</label>
            <input type="text" value={value.club} onChange={(e) => set("club", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4>참가 인원</h4>
        <div className="participant-grid">
          {PARTICIPANT_FIELDS.map((p) => (
            <div className="field" key={p.key}>
              <label>{p.label}</label>
              <input
                type="number"
                min={0}
                value={value.participants[p.key] ?? 0}
                onChange={(e) =>
                  set("participants", {
                    ...value.participants,
                    [p.key]: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h4>필요 장비</h4>
        <div className="equipment-grid">
          {EQUIPMENT.map((item) => (
            <label
              key={item}
              className={`checkbox-chip${value.equipment.includes(item) ? " checked" : ""}`}
            >
              <input
                type="checkbox"
                checked={value.equipment.includes(item)}
                onChange={() => toggleEquipment(item)}
              />
              {item}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
