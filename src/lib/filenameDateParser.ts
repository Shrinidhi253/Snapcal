/**
 * Parse a date/time from an image filename.
 *
 * Supported patterns (date AND time required to return a Date):
 *   - IMG_20260516_130045.jpg            (Android camera)
 *   - 2026-05-16 13.00.45.jpg            (WhatsApp)
 *   - 2026-05-16_13-00-45.jpg
 *   - 20260516_130045.jpg
 *
 * Returns a Date built from the parsed components interpreted in the
 * local timezone — matching how exifr returns EXIF datetimes — so that
 * downstream code can treat filename-derived `taken_at` identically to
 * EXIF-derived `taken_at`.
 *
 * Returns null when:
 *   - No recognisable pattern is found
 *   - Only a date is found (no time) — not precise enough for matching
 *   - The parsed components do not form a valid Date
 *
 * Pure utility: no DB, no network, no side effects.
 */
export function parseDateFromFilename(filename: string): Date | null {
  if (!filename) return null;

  // Strip directory and extension to simplify matching.
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const name = base.replace(/\.[^.]+$/, "");

  // Single regex covers all four supported patterns:
  //   YYYY <sep?> MM <sep?> DD <sep> HH <sep?> MM <sep?> SS
  // where separators between date parts and between time parts are any of
  // -, _, ., space, or nothing, and the date/time separator is _, space, T, or -.
  const re =
    /(\d{4})[-_.]?(\d{2})[-_.]?(\d{2})[ _T\-](\d{2})[-_.]?(\d{2})[-_.]?(\d{2})/;
  const m = name.match(re);
  if (!m) return null;

  const [, yStr, moStr, dStr, hStr, miStr, sStr] = m;
  const year = Number(yStr);
  const month = Number(moStr);
  const day = Number(dStr);
  const hour = Number(hStr);
  const minute = Number(miStr);
  const second = Number(sStr);

  if (
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour > 23 || minute > 59 || second > 59
  ) {
    return null;
  }

  const d = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(d.getTime())) return null;
  // Sanity-check the components round-trip (catches e.g. Feb 30).
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}
