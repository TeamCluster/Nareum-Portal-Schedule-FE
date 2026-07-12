import { ReactNode } from "react";

/**
 * 시설 유형 사전 정의 — 각 유형마다 고유 픽토그램과 장비선택 UI 노출 여부.
 * 관리자는 이 목록에서 유형을 선택하고, 공개 예약 페이지는 유형에 맞는
 * 아이콘을 표시한다. (기존엔 유형 문자열에 "연습" 포함 여부만으로 아이콘 2종을
 * 구분했으나, 유형을 정형화하여 다양한 픽토그램을 안정적으로 매핑.)
 */
export interface FacilityTypeDef {
  value: string;      // 저장·표시되는 유형명
  equipment: boolean; // 장비(앰프/스피커/마이크/키보드) 선택 UI 노출 여부
  icon: ReactNode;    // <svg> 내부 요소
}

const ICON: Record<string, ReactNode> = {
  연습실: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  활동실: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  회의실: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  강의실: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1" />
      <line x1="12" y1="16" x2="12" y2="20" />
      <line x1="8" y1="20" x2="16" y2="20" />
    </>
  ),
  체육관: (
    <>
      <rect x="1.5" y="9" width="3" height="6" rx="1" />
      <rect x="19.5" y="9" width="3" height="6" rx="1" />
      <line x1="4.5" y1="12" x2="19.5" y2="12" />
    </>
  ),
  공연장: (
    <>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </>
  ),
  스튜디오: (
    <>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </>
  ),
};

const DEFAULT_ICON: ReactNode = (
  <>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="9" y1="7" x2="15" y2="7" />
    <line x1="9" y1="11" x2="15" y2="11" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </>
);

export const FACILITY_TYPES: FacilityTypeDef[] = [
  { value: "연습실", equipment: true, icon: ICON["연습실"] },
  { value: "활동실", equipment: false, icon: ICON["활동실"] },
  { value: "회의실", equipment: false, icon: ICON["회의실"] },
  { value: "강의실", equipment: false, icon: ICON["강의실"] },
  { value: "체육관", equipment: false, icon: ICON["체육관"] },
  { value: "공연장", equipment: true, icon: ICON["공연장"] },
  { value: "스튜디오", equipment: true, icon: ICON["스튜디오"] },
];

/** 유형 문자열 → 정의. 목록에 없으면(레거시/커스텀) 기본값으로 폴백. */
export function facilityTypeMeta(type: string | null | undefined): FacilityTypeDef {
  const t = (type || "").trim();
  const found = FACILITY_TYPES.find((d) => d.value === t);
  if (found) return found;
  // 레거시 호환: "연습" 이 들어가면 연습실로 취급
  if (t.includes("연습")) return FACILITY_TYPES[0];
  return { value: t || "기타", equipment: false, icon: DEFAULT_ICON };
}

/** 유형에 맞는 픽토그램 SVG. */
export function FacilityTypeIcon({ type }: { type: string | null | undefined }) {
  return (
    <svg className="type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {facilityTypeMeta(type).icon}
    </svg>
  );
}
