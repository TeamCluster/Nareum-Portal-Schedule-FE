// Date/time helpers. Booking-window bounds mirror the backend rule and are
// computed in KST (matching the original static/js/index.js behaviour).

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function kstToday(): Date {
  const nowUtc = Date.now();
  const kst = new Date(nowUtc + KST_OFFSET_MS);
  // Zero the time so date math is clean; keep the KST calendar day.
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function bookingBounds(minDays = 3, maxDays = 14) {
  const today = kstToday();
  const min = new Date(today);
  min.setUTCDate(min.getUTCDate() + minDays);
  const max = new Date(today);
  max.setUTCDate(max.getUTCDate() + maxDays);
  return { min: toIsoDate(min), max: toIsoDate(max) };
}

/** "2026-07-14T09:00:00" -> "2026년 07월 14일" */
export function formatKoreanDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${y}년 ${m}월 ${d}일`;
}

/** ISO datetime -> "HH:MM" */
export function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

/** ISO datetime -> "YYYY-MM-DD" */
export function dateOf(iso: string): string {
  return iso.slice(0, 10);
}

/** ISO datetime -> hour integer */
export function hourOf(iso: string): number {
  return parseInt(iso.slice(11, 13), 10);
}
