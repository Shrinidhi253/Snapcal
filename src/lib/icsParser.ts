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
  /** Combined subject — "COURSE_CODE Course Name". */
  subject: string;
  /** Extracted course code (e.g. TDDD12). */
  courseCode: string;
  /** Extracted course name. */
  courseName: string;
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
      } else if (key === "SUMMARY" || key === "DESCRIPTION") {
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

    // 1️⃣  Try explicit markers in DESCRIPTION (TimeEdit Swedish / English)
    //    "Kurskod: TDDD12" or "Course code: TDDD12"
    const codeLabelRe = /(?:Kurskod|Course code)[:\s]+([A-Z]{1,6}\d{2,4}[A-Z]?)/i;
    const descCodeMatch = description.match(codeLabelRe);
    if (descCodeMatch) {
      courseCode = descCodeMatch[1].toUpperCase();
    }

    // 2️⃣  Try explicit course name markers in DESCRIPTION
    //    "Kursnamn: Software Engineering" or "Course name: Software Engineering"
    const nameLabelRe = /(?:Kursnamn|Course name)[:\s]+([^\r\n]+)/i;
    const descNameMatch = description.match(nameLabelRe);
    if (descNameMatch) {
      courseName = descNameMatch[1].trim();
    }

    // 3️⃣  Fallback: look for a course code pattern at the start of SUMMARY
    if (!courseCode) {
      // Common Swedish university patterns: TDDD12, TATA31, 1DV501, TNM079
      const summaryCodeRe = /^([A-Z]{1,6}\d{2,4}[A-Z]?|\d[A-Z]{1,5}\d{2,4})\b/i;
      const summaryCodeMatch = summary.match(summaryCodeRe);
      if (summaryCodeMatch) {
        courseCode = summaryCodeMatch[1].toUpperCase();
      }
    }

    // 4️⃣  Build course name from SUMMARY if we still don't have one
    if (!courseName) {
      // Strip the leading course code if present so we don't duplicate it
      courseName = summary.replace(new RegExp(`^${courseCode}\s*[\-:]?\s*`, "i"), "").trim();
    }

    // 5️⃣  Final fallback: if everything failed, treat the whole summary as the course name
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
      subject,
      courseCode,
      courseName,
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
