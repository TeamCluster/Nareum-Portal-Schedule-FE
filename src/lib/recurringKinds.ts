// 정기 고정활동 유형 — 동아리 정기활동뿐 아니라 센터 프로그램·점검 등도 담는다.
import type { RecurringBlock, RecurringKind } from "../api/types";

export const RECURRING_KINDS: {
  value: RecurringKind;
  label: string;
  nameLabel: string;
  placeholder: string;
  hint: string;
  /** 적용 기간을 어떤 형태로 입력받는지 — 유형마다 기간이 정해지는 방식이 다르다. */
  period: "month" | "range" | "optional-range";
  periodHint: string;
}[] = [
  {
    value: "club",
    label: "동아리",
    nameLabel: "동아리명",
    placeholder: "동아리명",
    hint: "동아리 정기활동 — 목록에서 고르거나 직접 입력",
    period: "month",
    periodHint: "매달 회의로 정해지므로 적용할 달을 고릅니다. 그 달 1일~말일에만 적용됩니다.",
  },
  {
    value: "program",
    label: "프로그램",
    nameLabel: "프로그램명",
    placeholder: "예: 방송댄스 정기수업",
    hint: "센터 프로그램 — 프로그램명을 입력",
    period: "range",
    periodHint: "기수 단위로 운영되므로 시작일과 종료일을 모두 지정합니다.",
  },
  {
    value: "etc",
    label: "기타",
    nameLabel: "활동명",
    placeholder: "예: 시설 점검, 외부 정기대관",
    hint: "그 밖의 고정 일정 — 점검·외부 정기대관 등",
    period: "optional-range",
    periodHint: "기간이 정해져 있으면 지정하고, 비워두면 기한 없이 계속 적용됩니다.",
  },
];

export function recurringKindLabel(kind: RecurringKind | undefined): string {
  return RECURRING_KINDS.find((k) => k.value === kind)?.label ?? "기타";
}

/** 적용 기간 상태 배지 문구. */
export const BLOCK_STATUS_LABELS: Record<RecurringBlock["status"], string> = {
  active: "진행 중",
  upcoming: "예정",
  ended: "종료",
};
