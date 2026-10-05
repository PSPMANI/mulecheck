/** All "day" math is done in India Standard Time (UTC+5:30) so the daily board flips at midnight IST. */
export const TZ = "Asia/Kolkata";
const OFFSET_MS = 330 * 60 * 1000;

export const inr = (n: number) =>
  n >= 1e7
    ? `₹${(n / 1e7).toFixed(2)} Cr`
    : n >= 1e5
      ? `₹${(n / 1e5).toFixed(1)} L`
      : `₹${n.toLocaleString("en-IN")}`;

/** YYYY-MM-DD of the given instant, in IST. */
export const dateKey = (d: Date) => new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);

/** Instant of IST midnight for the day containing d. */
export const startOfDay = (d: Date) => {
  const shifted = d.getTime() + OFFSET_MS;
  return new Date(Math.floor(shifted / 86400000) * 86400000 - OFFSET_MS);
};

/** Parse YYYY-MM-DD as IST midnight. Returns null if invalid. */
export const parseDay = (s: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00+05:30");
  return isNaN(d.getTime()) ? null : d;
};

export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });

export const fmtDateTime = (d: Date | string) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });
