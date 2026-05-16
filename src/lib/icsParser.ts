/**
 * IcsParser
 *
 * Pure, dependency-free utility for parsing an iCalendar (.ics) file string
 * into a list of event objects. Designed to be testable in isolation.
 *
 * TimeEdit-specific: extracts course code + course name from SUMMARY / DESCRIPTION
 * and builds the subject as "CODE Name".
 */

export interface IcsEvent {
  /** Unique identifier from the ICS UID field. */
  uid: string;
  /** Combined subject — "COURSE_CODE Course Name". */
  subject: string;
  /** Extracted course code (e.g. TDDD12). */
  courseCode: string;
  /** Extracted course name. */
  courseName: string;
  /** Location / room (from LOCATION field), empty string if not present. */
  location: string;
  /** Full start Date object (date + time). */
  startTime: Date;
  /** Full end Date object (date + time). */
  endTime: Date;
  /** Calendar date of the event (midnight local of the start day). */
  date: Date;
}

export class InvalidIcsFileError extends Error {
  constructor(message = "Invalid .ics file. Please import a valid .ics file.") {
    super(message);
    this.name = "InvalidIcsFileError";
  }
}

export class IcsParser {
  /**
   * Parse the raw text content of an .ics file.
   * Throws InvalidIcsFileError if the content is not a valid iCalendar file.
   */
  static parse(content: string): IcsEvent[] {
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new InvalidIcsFileError();
    }

    const normalized = IcsParser.unfoldLines(content);

    if (
      !/BEGIN:VCALENDAR/i.test(normalized) ||
      !/END:VCALENDAR/i.test(normalized)
    ) {
      throw new InvalidIcsFileError();
    }

    const lines = normalized.split(/\r?\n/);
    const events: IcsEvent[] = [];

    let current: Partial<Record<string, string>> | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (/^BEGIN:VEVENT$/i.test(line)) {
        current = {};
        continue;
      }

      if (/^END:VEVENT$/i.test(line)) {
        if (current) {
          const evt = IcsParser.buildEvent(current);
          if (evt) events.push(evt);
        }
        current = null;
        continue;
      }

      if (!current) continue;

      // Split on the first ":" that is not inside parameters.
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;

      const keyPart = line.slice(0, colonIdx);
      const value = line.slice(colonIdx + 1);
      // Key may contain parameters (e.g. DTSTART;TZID=...). Take the name only.
      const key = keyPart.split(";")[0].toUpperCase();

      // Keep the raw key+params for date fields so we can detect VALUE=DATE.
      if (key === "DTSTART" || key === "DTEND") {
        current[key] = value;
        current[`${key}_PARAMS`] = keyPart;
      } else if (key === "SUMMARY" || key === "DESCRIPTION" || key === "LOCATION") {
        current[key] = IcsParser.unescapeText(value);
      } else {
        current[key] = value;
      }
    }

    return events;
  }

  /** Unfold lines per RFC 5545 (continuation lines start with space or tab). */
  private static unfoldLines(content: string): string {
    return content.replace(/\r?\n[ \t]/g, "");
  }

  /** Unescape iCal TEXT values (\\n, \\, \;, \\). */
  private static unescapeText(value: string): string {
    return value
      .replace(/\\n/gi, "\n")
      .replace(/\\,/g, ",")
      .replace(/\\;/g, ";")
      .replace(/\\\\/g, "\\");
  }

  /** Extract course code + name from SUMMARY and DESCRIPTION fields. */
  private static extractCourseInfo(fields: Partial<Record<string, string>>): {
    courseCode: string;
    courseName: string;
  } {
    const summary = (fields.SUMMARY ?? "").trim();
    const description = (fields.DESCRIPTION ?? "").trim();

    let courseCode = "";
    let courseName = "";

    // Labels appear in both SUMMARY and DESCRIPTION depending on TimeEdit export.
    // Stop the captured value at the next known label or end of line.
    const codeLabelRe =
      /(?:Kurskod|Course code)[:\s]+([A-Z]{1,6}\d{2,4}[A-Z0-9_]*)/i;
    const nameLabelRe =
      /(?:Kursnamn|Course name)[:\s]+(.+?)(?=\s*[.,;]?\s*(?:Kurskod|Course code|Sign|Lokal|Room|Lärare|Teacher|Program|ID)\s*[:.]|[\r\n]|$)/i;

    for (const source of [summary, description]) {
      if (!source) continue;
      if (!courseCode) {
        const m = source.match(codeLabelRe);
        if (m) courseCode = m[1].toUpperCase();
      }
      if (!courseName) {
        const m = source.match(nameLabelRe);
        if (m) courseName = m[1].trim().replace(/[.,;]\s*$/, "");
      }
      if (courseCode && courseName) break;
    }

    // Normalize course code: keep only the leading alpha+digit token (DAT495 from DAT495_50_VT26_62113)
    if (courseCode) {
      const trim = /^([A-Z]{1,6}\d{2,4}[A-Z]?)/.exec(courseCode);
      if (trim) courseCode = trim[1];
    }

    // Fallback: course code at the start of SUMMARY (no label)
    if (!courseCode) {
      const summaryCodeRe = /^([A-Z]{1,6}\d{2,4}[A-Z]?|\d[A-Z]{1,5}\d{2,4})\b/i;
      const m = summary.match(summaryCodeRe);
      if (m) courseCode = m[1].toUpperCase();
    }

    // Fallback: derive course name from SUMMARY (strip leading code if any)
    if (!courseName) {
      courseName = summary
        .replace(new RegExp(`^${courseCode}\\s*[-:]?\\s*`, "i"), "")
        .trim();
    }

    if (!courseName) {
      courseName = summary || "(No title)";
    }

    return { courseCode, courseName };
  }

  private static buildEvent(
    fields: Partial<Record<string, string>>,
  ): IcsEvent | null {
    const dtStart = fields.DTSTART;
    const dtEnd = fields.DTEND;

    if (!dtStart || !dtEnd) return null;

    const startTime = IcsParser.parseIcsDate(dtStart);
    const endTime = IcsParser.parseIcsDate(dtEnd);

    if (!startTime || !endTime) return null;

    const date = new Date(
      startTime.getFullYear(),
      startTime.getMonth(),
      startTime.getDate(),
    );

    const { courseCode, courseName } = IcsParser.extractCourseInfo(fields);
    const subject = courseCode ? `${courseCode} ${courseName}` : courseName;

    return {
      uid: (fields.UID ?? `${dtStart}-${dtEnd}-${subject}`).trim(),
      subject,
      courseCode,
      courseName,
      location: (fields.LOCATION ?? "").trim(),
      startTime,
      endTime,
      date,
    };
  }

  /**
   * Parse an iCal date-time value into a Date.
   * Supports:
   *   - YYYYMMDD                       (date-only)
   *   - YYYYMMDDTHHMMSS               (floating local time)
   *   - YYYYMMDDTHHMMSSZ              (UTC)
   */
  static parseIcsDate(value: string): Date | null {
    const v = value.trim();

    // Date-only: 20250115
    const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
    if (dateOnly) {
      const [, y, m, d] = dateOnly;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }

    // Date-time, possibly UTC
    const dt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v);
    if (dt) {
      const [, y, mo, d, h, mi, s, z] = dt;
      if (z === "Z") {
        return new Date(
          Date.UTC(
            Number(y),
            Number(mo) - 1,
            Number(d),
            Number(h),
            Number(mi),
            Number(s),
          ),
        );
      }
      return new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(s),
      );
    }

    return null;
  }
}
