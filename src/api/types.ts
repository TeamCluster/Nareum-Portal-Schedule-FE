// 백엔드 응답 타입 = API 계약. 백엔드 to_dict/서비스가 바뀌면 여기부터 동기화.

export interface Facility {
  id: number;
  name: string;
  type: string;
  capacity: number | null;
  description: string | null;
  image_url: string | null;
}

export type SlotStatus = "available" | "booked";

export interface AvailabilityFacility extends Facility {
  hours: Record<string, SlotStatus>;
  sold_out: boolean;
}

export interface Availability {
  min_date: string;
  max_date: string;
  selected_date: string | null;
  is_reservable: boolean;
  is_open: boolean;
  closed_reason: string;
  note?: string;
  open_hour: number;
  close_hour: number;
  facilities: AvailabilityFacility[];
}

export interface DayConfig {
  weekday?: number;
  is_open: boolean;
  open_hour: number;
  close_hour: number;
  closed_reason: string;
  note?: string;
}

export type HolidayType = "closure" | "holiday";

/** 슈퍼 공통 휴무일/공휴일 (기관 view 에서는 excluded 포함). */
export interface CommonHoliday {
  id: number;
  date: string;
  name: string;
  type: HolidayType;
  source?: string; // 'manual' | 'auto'(한국 공휴일 동기화)
  excluded?: boolean;
}

/** 기관 지정 휴무일/공휴일. */
export interface OrgClosure {
  id: number;
  date: string;
  reason: string;
  type: HolidayType;
}

export interface OrgHolidaysView {
  holiday_operates: boolean;
  common: CommonHoliday[];
  place: OrgClosure[];
}

export interface OperatingHour {
  weekday: number; // 0=Mon .. 6=Sun
  is_open: boolean;
  open_hour: number;
  close_hour: number;
}

export interface Closure {
  id: number;
  date: string;
  reason: string;
}

/** 정기 고정활동 유형 — 동아리 정기활동 / 센터 프로그램 / 그 밖(점검·외부 정기대관 등). */
export type RecurringKind = "club" | "program" | "etc";

export interface RecurringBlock {
  id: number;
  facility_id: number;
  facility_name: string | null;
  weekday: number;
  start_hour: number;
  end_hour: number;
  title: string;
  kind: RecurringKind;
  kind_label: string;
  /** 적용 기간(양끝 포함). 빈 문자열이면 그쪽 경계가 없다(무기한). */
  effective_from: string;
  effective_to: string;
  /** 기간이 어느 한 달과 정확히 같으면 'YYYY-MM' — 동아리 월 선택 복원용. */
  month: string;
  status: "active" | "upcoming" | "ended";
  /** 화면 표시용 기간 문구 (예: "2026년 9월", "2026-03-02 ~ 2026-06-30"). */
  period_label: string;
}

export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "rejected";

/** 연령대별 인원 — 종이 서식과 동일하게 남/여를 따로 받는다.
 *  unspecified 는 성별 구분 도입 전 예약을 표시하기 위한 레거시 값. */
export interface GenderCount {
  male: number;
  female: number;
  unspecified: number;
}

export type ParticipantBand = "elementary" | "middle" | "high" | "teen" | "adult";

export type ParticipantInfo = Record<ParticipantBand, GenderCount>;

/** 필요 물품 1건. 종이 서식의 '마이크 ( )대' 때문에 수량을 함께 저장. */
export interface EquipmentItem {
  name: string;
  qty: number;
}

/** 신청서 설정(기관별). GET /api/<slug>/form-config */
export interface EquipmentCatalogItem {
  name: string;
  qty: boolean; // true 면 수량 입력칸 표시
}

export interface EquipmentGroup {
  title: string;
  facility_types: string[]; // 비어 있으면 모든 시설에 노출
  allow_other: boolean;     // '기타(직접 입력)' 칸 노출 여부
  items: EquipmentCatalogItem[];
}

export interface FormConfig {
  equipment_catalog: EquipmentGroup[];
  notice: string[]; // 공지 및 준수사항 (종이 앞면)
  rules: string[];  // 대관 규정 및 유의사항 (종이 뒷면)
  booking_rules?: BookingRules;
}

/** 기관별 대관 규칙. GET·PUT /api/<slug>/admin/booking-rules */
export interface BookingRules {
  booking_min_days: number;     // 최소 N일 전 신청
  booking_max_days: number;     // 예약일 기준 최대 N일 뒤까지
  cancel_deadline_days: number; // 이용 N일 전까지 신청자 직접 취소 가능
  penalty_months: number;       // 노쇼·이용확인 미실시 시 재대관 제한(개월)
  extension_hours: number;      // 현장 연장 가능 시간
}

/** 동아리 (외부 ClubLog 서비스). GET /api/<slug>/admin/clubs */
export interface Club {
  name: string;
  category: string;
}

export interface ClubList {
  clubs: Club[];
  /** false 면 외부 조회 실패 — 화면은 '직접 입력'으로 계속 진행한다. */
  available: boolean;
  cached: boolean;
  error: string | null;
}

/** 이용 결과 — 노쇼/이용확인 미실시는 재대관 제한(규정 15·16)으로 이어진다. */
export type Attendance = "" | "attended" | "no_show" | "unverified";

export interface Reservation {
  id: number;
  access_id: string | null;
  facility_id: number;
  applicant_name: string;
  applicant_contact: string;
  applicant_school: string | null;
  applicant_club: string | null;
  applicant_age: number | null;
  applicant_address: string | null;
  activity: string;
  status: ReservationStatus;
  start_time: string;
  end_time: string;
  participant_info: ParticipantInfo;
  requested_equipment: EquipmentItem[];
  is_deleted: boolean;
  reject_reason: string | null;
  attendance: Attendance;
  attendance_at: string | null;
  /** 신청자가 지금 스스로 취소할 수 있는지(서버가 규칙으로 판정). */
  can_cancel: boolean;
  cancel_deadline: string; // YYYY-MM-DD
  created_at: string | null;
  facility?: Facility;
}

export interface DashboardData {
  selected_date: string;
  prev_date: string;
  next_date: string;
  pending_count: number;
  pending_preview: Reservation[];
  todays_groups: { facility_name: string; reservations: Reservation[] }[];
}

export type DaySegment =
  | { type: "free"; from_hour: number; to_hour: number }
  | {
      type: "res";
      from_hour: number;
      to_hour: number;
      res_id: number;
      status: ReservationStatus;
      name: string;
      contact: string;
    }
  | { type: "block"; from_hour: number; to_hour: number; title: string; kind: RecurringKind };

export interface DayGrid {
  date: string;
  is_open: boolean;
  closed_reason: string;
  open_hour: number;
  close_hour: number;
  hours: number[];
  facilities: { id: number; name: string; type: string; segments: DaySegment[] }[];
}

export interface WeekGrid {
  week_start: string;
  prev_week: string;
  next_week: string;
  hour_min: number;
  hour_max: number;
  facilities: { id: number; name: string }[];
  days: DayGrid[];
}

export interface CalendarEvent {
  id: number;
  title: string;
  /** 달력 칸에서 두 줄로 나눠 그리기 위한 조각 (title 은 툴팁·폴백용). */
  facility_name: string;
  applicant_name: string;
  start: string;
  end: string;
  color: string;
}

export interface AppConfig {
  service_name: string;
  booking_min_days: number;
  booking_max_days: number;
}

// --- 멀티테넌트 ---------------------------------------------------------

/** 기관 공개 정보 (헤더/푸터 표기용). GET /api/<slug>/info */
export interface PlaceInfo {
  slug: string;
  full_name: string;
  short_name: string;
  address: string;
  phone: string;
  email: string;
  header_image?: string;
  operating_hours?: OperatingHour[];
}

/** 슈퍼 관리자 기관 목록 항목. GET /api/super/places */
export interface Place {
  id: number;
  slug: string;
  full_name: string;
  short_name: string;
  address: string;
  phone: string;
  email: string;
  header_image?: string;
  created_at: string;
}
