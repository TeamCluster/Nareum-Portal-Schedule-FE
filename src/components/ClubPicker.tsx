// 동아리 선택 — 목록에서 고르거나 직접 입력.
// 외부 ClubLog 서비스에서 받아오며, 조회에 실패해도 직접 입력으로 계속 진행한다.
import { useEffect, useState } from "react";
import { useOrg } from "../hooks/useOrg";
import type { Club, ClubList } from "../api/types";

const CUSTOM = "__custom__";

interface Props {
  value: string;
  onChange: (name: string) => void;
  /** 선택된 동아리의 분류(밴드/댄스 등)를 알려준다 — 활동내용 기본값 등에 활용. */
  onPick?: (club: Club | null) => void;
}

export default function ClubPicker({ value, onChange, onPick }: Props) {
  const { slug, api } = useOrg();
  const [list, setList] = useState<ClubList | null>(null);
  const [reloading, setReloading] = useState(false);

  function load(refresh = false) {
    setReloading(refresh);
    api
      .get<ClubList>(`/admin/clubs${refresh ? "?refresh=1" : ""}`)
      .then(setList)
      .catch(() =>
        setList({ clubs: [], available: false, cached: false, error: "동아리 목록을 불러오지 못했습니다." }),
      )
      .finally(() => setReloading(false));
  }
  useEffect(() => load(), [slug]);

  const clubs = list?.clubs ?? [];
  const matched = clubs.find((c) => c.name === value) || null;
  // 목록에 없는 값을 입력했으면 '직접 입력' 상태로 본다.
  const selectValue = matched ? matched.name : CUSTOM;

  // 분류별 그룹 (서버가 이미 분류→이름 순으로 정렬해 내려준다).
  const groups: [string, Club[]][] = [];
  for (const c of clubs) {
    const key = c.category || "기타";
    const last = groups[groups.length - 1];
    if (last && last[0] === key) last[1].push(c);
    else groups.push([key, [c]]);
  }

  function pickFromList(next: string) {
    if (next === CUSTOM) {
      onChange("");
      onPick?.(null);
      return;
    }
    onChange(next);
    onPick?.(clubs.find((c) => c.name === next) || null);
  }

  return (
    <div className="club-picker">
      <div className="field-row">
        <div className="field">
          <label>동아리 선택</label>
          <select
            value={selectValue}
            disabled={clubs.length === 0}
            onChange={(e) => pickFromList(e.target.value)}
          >
            <option value={CUSTOM}>직접 입력</option>
            {groups.map(([category, items]) => (
              <optgroup key={category} label={category}>
                {items.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="field">
          <label>
            동아리명<span className="required">*</span>
          </label>
          <input
            type="text"
            value={value}
            placeholder="목록에서 고르거나 직접 입력"
            onChange={(e) => {
              onChange(e.target.value);
              onPick?.(clubs.find((c) => c.name === e.target.value) || null);
            }}
          />
        </div>
      </div>

      <p className="timeline-note club-picker-status">
        {list === null ? (
          "동아리 목록을 불러오는 중…"
        ) : list.available ? (
          <>
            동아리 {clubs.length}개를 불러왔습니다{list.cached ? " (캐시)" : ""}.{" "}
            <button type="button" className="linklike" disabled={reloading} onClick={() => load(true)}>
              {reloading ? "새로고침 중…" : "새로고침"}
            </button>
          </>
        ) : (
          <>
            ⚠ {list.error} 동아리명을 직접 입력해 진행하실 수 있습니다.{" "}
            <button type="button" className="linklike" disabled={reloading} onClick={() => load(true)}>
              {reloading ? "다시 시도 중…" : "다시 시도"}
            </button>
          </>
        )}
      </p>
    </div>
  );
}
