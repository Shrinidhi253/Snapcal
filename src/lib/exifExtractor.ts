import exifr from "exifr";

/**
 * Input accepted by the EXIF extractor.
 * - Browser: File / Blob / ArrayBuffer / Uint8Array
 * - Node/tests: Buffer / Uint8Array / ArrayBuffer
 */
export type ExifInput = File | Blob | ArrayBuffer | Uint8Array;

/**
 * Extract the original capture date-time from a JPEG or HEIC image.
 *
 * Reads EXIF tags in priority order:
 *   1. DateTimeOriginal  (when the photo was taken)
 *   2. CreateDate        (a.k.a. DateTimeDigitized)
 *   3. ModifyDate        (a.k.a. DateTime)
 *
 * Returns a JavaScript `Date` for the capture moment, or `null` if no
 * date-time tag could be read.
 *
 * This utility is intentionally independent from the database and any
 * network layer so it can be unit-tested in isolation.
 */
export async function extractImageTakenAt(
  input: ExifInput,
): Promise<Date | null> {
  try {
    const tags = (await exifr.parse(input as Parameters<typeof exifr.parse>[0], {
      pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
      // exifr auto-detects JPEG and HEIC containers.
    })) as
      | {
          DateTimeOriginal?: Date | string;
          CreateDate?: Date | string;
          ModifyDate?: Date | string;
        }
      | undefined;

    if (!tags) return null;

    const candidate =
      tags.DateTimeOriginal ?? tags.CreateDate ?? tags.ModifyDate;
    if (!candidate) return null;

    const date = candidate instanceof Date ? candidate : new Date(candidate);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}
