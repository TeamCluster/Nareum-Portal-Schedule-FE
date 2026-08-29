// 종이 「시설대관이용신청서」 항목을 다루는 공용 헬퍼.
// 이용인원(연령×성별)과 필요 물품(수량 포함)의 형태를 프론트 전역에서 통일한다.
import type {
  EquipmentGroup,
  EquipmentItem,
  GenderCount,
  ParticipantBand,
  ParticipantInfo,
} from "../api/types";

export const PARTICIPANT_BANDS: { key: ParticipantBand; label: string }[] = [
  { key: "elementary", label: "초등" },
  { key: "middle", label: "중등" },
  { key: "high", label: "고등" },
  { key: "teen", label: "후기청소년" },
  { key: "adult", label: "성인" },
];

/** 입력 가능한 성별. unspecified 는 레거시 표시 전용이라 제외. */
export type InputGender = "male" | "female";

export const GENDERS: { key: InputGender; label: string }[] = [
  { key: "male", label: "남" },
  { key: "female", label: "여" },
];

const EMPTY_COUNT: GenderCount = { male: 0, female: 0, unspecified: 0 };

/** 비어 있는 인원표. */
export function emptyParticipants(): ParticipantInfo {
  return PARTICIPANT_BANDS.reduce((acc, b) => {
    acc[b.key] = { ...EMPTY_COUNT };
    return acc;
  }, {} as ParticipantInfo);
}

/** 서버 응답(레거시 포함)을 항상 5구분 × 남/여/미구분 형태로 채워 반환. */
export function normalizeParticipants(raw: unknown): ParticipantInfo {
  const src = (raw || {}) as Record<string, unknown>;
  return PARTICIPANT_BANDS.reduce((acc, b) => {
    const v = src[b.key];
    acc[b.key] =
      typeof v === "number"
        ? { ...EMPTY_COUNT, unspecified: v } // 성별 구분 이전 데이터
        : { ...EMPTY_COUNT, ...((v as Partial<GenderCount>) || {}) };
    return acc;
  }, {} as ParticipantInfo);
}

export function bandTotal(c: GenderCount): number {
  return (c.male || 0) + (c.female || 0) + (c.unspecified || 0);
}

export function participantTotal(p: ParticipantInfo): number {
  return PARTICIPANT_BANDS.reduce((sum, b) => sum + bandTotal(p[b.key] ?? EMPTY_COUNT), 0);
}

/** "초등 남2·여1, 성인 여3" 같은 한 줄 요약. 0명이면 빈 문자열. */
export function participantSummary(p: ParticipantInfo): string {
  return PARTICIPANT_BANDS.flatMap((b) => {
    const c = p[b.key] ?? EMPTY_COUNT;
    const parts = [
      c.male ? `남${c.male}` : "",
      c.female ? `여${c.female}` : "",
      c.unspecified ? `${c.unspecified}` : "",
    ].filter(Boolean);
    return parts.length ? [`${b.label} ${parts.join("·")}`] : [];
  }).join(", ");
}

/** 필요 물품 표기 — 수량이 2 이상이면 "마이크 3대". */
export function equipmentLabel(item: EquipmentItem): string {
  return item.qty > 1 ? `${item.name} ${item.qty}대` : item.name;
}

export function equipmentSummary(items: EquipmentItem[]): string {
  return (items || []).map(equipmentLabel).join(", ");
}

/** 목록에서 해당 물품의 수량(미선택이면 0). */
export function qtyOf(items: EquipmentItem[], name: string): number {
  return items.find((e) => e.name === name)?.qty ?? 0;
}

/** 물품 추가/삭제/수량변경을 한 함수로. qty<=0 이면 목록에서 제거. */
export function setEquipment(
  items: EquipmentItem[],
  name: string,
  qty: number,
): EquipmentItem[] {
  const rest = items.filter((e) => e.name !== name);
  return qty > 0 ? [...rest, { name, qty }] : rest;
}

/** 카탈로그에 없는 항목( '기타' 직접 입력분 )만 추출. */
export function otherItems(
  items: EquipmentItem[],
  catalog: EquipmentGroup[],
): EquipmentItem[] {
  const known = new Set(catalog.flatMap((g) => g.items.map((i) => i.name)));
  return items.filter((e) => !known.has(e.name));
}
