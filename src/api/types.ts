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

export interface RecurringBlock {
  id: number;
  facility_id: number;
  facility_name: string | null;
  weekday: number;
  start_hour: number;
  end_hour: number;
  title: string;
}

export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "rejected";

export interface ParticipantInfo {
  elementary?: number;
  middle?: number;
  high?: number;
  teen?: number;
  adult?: number;
}

export interface Reservation {
  id: number;
  access_id: string | null;
  facility_id: number;
  applicant_name: string;
  applicant_contact: string;
  applicant_school: string | null;
  applicant_club: string | null;
  status: ReservationStatus;
  start_time: string;
  end_time: string;
  participant_info: ParticipantInfo;
  requested_equipment: string[];
  is_deleted: boolean;
  reject_reason: string | null;
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
  | { type: "block"; from_hour: number; to_hour: number; title: string };

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
