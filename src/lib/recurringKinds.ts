// 정기 고정활동 유형 — 동아리 정기활동뿐 아니라 센터 프로그램·점검 등도 담는다.
import type { RecurringKind } from "../api/types";

export const RECURRING_KINDS: {
  value: RecurringKind;
  label: string;
  nameLabel: string;
  placeholder: string;
  hint: string;
}[] = [
  {
    value: "club",
    label: "동아리",
    nameLabel: "동아리명",
    placeholder: "동아리명",
    hint: "동아리 정기활동 — 목록에서 고르거나 직접 입력",
  },
  {
    value: "program",
    label: "프로그램",
    nameLabel: "프로그램명",
    placeholder: "예: 방송댄스 정기수업",
    hint: "센터 프로그램 — 프로그램명을 입력",
  },
  {
    value: "etc",
    label: "기타",
    nameLabel: "활동명",
    placeholder: "예: 시설 점검, 외부 정기대관",
    hint: "그 밖의 고정 일정 — 점검·외부 정기대관 등",
  },
];

export function recurringKindLabel(kind: RecurringKind | undefined): string {
  return RECURRING_KINDS.find((k) => k.value === kind)?.label ?? "기타";
}
