// 슈퍼 관리자 API (/api/super/...).
import { api } from "./client";
import type { CommonHoliday, HolidayType, Place } from "./types";

export interface PlaceInput {
  slug: string;
  full_name: string;
  short_name: string;
  password: string;
  address?: string;
  phone?: string;
  email?: string;
}

export const superApi = {
  getSession: () => api.get<{ logged_in: boolean }>("/super/session"),
  login: (password: string) => api.post<{ ok: boolean }>("/super/login", { password }),
  logout: () => api.post("/super/logout"),
  changePassword: (new_password: string) =>
    api.post<{ ok: boolean; message: string }>("/super/password", { new_password }),

  listPlaces: () => api.get<{ places: Place[] }>("/super/places"),
  addPlace: (body: PlaceInput) =>
    api.post<{ ok: boolean; message: string; result: Place | null }>("/super/places", body),
  updatePlace: (slug: string, body: Partial<Omit<PlaceInput, "slug" | "password">>) =>
    api.put<{ ok: boolean; message: string }>(`/super/places/${slug}`, body),
  deletePlace: (slug: string) =>
    api.del<{ ok: boolean; message: string }>(`/super/places/${slug}`),
  changePlacePassword: (slug: string, new_password: string) =>
    api.post<{ ok: boolean; message: string }>(`/super/places/${slug}/password`, { new_password }),
  uploadHeader: (slug: string, form: FormData) =>
    api.upload<{ ok: boolean; header_image: string }>(`/super/places/${slug}/header`, form),
  deleteHeader: (slug: string) => api.del<{ ok: boolean }>(`/super/places/${slug}/header`),

  // 공통 휴무일/공휴일
  listHolidays: () => api.get<{ holidays: CommonHoliday[] }>("/super/holidays"),
  addHoliday: (body: { date: string; name: string; type: HolidayType }) =>
    api.post<{ ok: boolean }>("/super/holidays", body),
  deleteHoliday: (id: number) => api.del<{ ok: boolean }>(`/super/holidays/${id}`),
  syncHolidays: (year: number) =>
    api.post<{ ok: boolean; year: number; count: number; added: number }>(
      "/super/holidays/sync", { year }),
};
