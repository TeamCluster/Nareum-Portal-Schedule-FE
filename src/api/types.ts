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
  facilities: AvailabilityFacility[];
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
