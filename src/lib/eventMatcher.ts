import { supabase } from "@/integrations/supabase/client";

/**
 * Convert a `taken_at` timestamp string (stored as if UTC but representing
 * the local wall-clock time from EXIF) into an ISO string that matches the
 * UTC start/end_time of events.
 *
 * Events in the DB are stored as real UTC, while EXIF datetimes have no
 * timezone — `extractImageTakenAt` returns a Date whose UTC components
 * equal the wall-clock time. We reinterpret those components as local time
 * before converting back to UTC.
 */
function takenAtToQueryIso(takenAtRaw: string): string {
  const d = new Date(takenAtRaw);
  const local = new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
  );
  return local.toISOString();
}

/**
 * Find the event whose [start_time, end_time] window contains `takenAtIso`.
 * Returns the event id or null if no match exists.
 */
export async function findMatchingEventId(
  takenAtIso: string,
): Promise<string | null> {
  const { data: events, error } = await supabase
    .from("events")
    .select("id,start_time,end_time")
    .lte("start_time", takenAtIso)
    .gte("end_time", takenAtIso)
    .order("start_time", { ascending: true })
    .limit(1);

  if (error) {
    console.error("Event lookup failed:", error);
    return null;
  }
  return events && events.length > 0 ? events[0].id : null;
}

export type AssignmentResult = {
  assigned: number;
  unmatched: number;
  skippedNullTakenAt: number;
};

/**
 * Sweep all images with event_id IS NULL and try to assign them to an
 * event based on their taken_at value. Images with null taken_at are left
 * alone. Returns counts for user feedback.
 */
export async function assignUnmatchedImages(): Promise<AssignmentResult> {
  const { data: images, error } = await supabase
    .from("images")
    .select("id,filename,taken_at")
    .is("event_id", null);

  if (error) {
    console.error("Failed to load unmatched images:", error);
    return { assigned: 0, unmatched: 0, skippedNullTakenAt: 0 };
  }

  let assigned = 0;
  let unmatched = 0;
  let skippedNullTakenAt = 0;

  for (const img of images ?? []) {
    if (!img.taken_at) {
      skippedNullTakenAt++;
      console.log(
        `${img.filename} could not be matched because of null taken_at`,
      );
      continue;
    }

    const queryIso = takenAtToQueryIso(img.taken_at);
    const eventId = await findMatchingEventId(queryIso);

    if (!eventId) {
      unmatched++;
      continue;
    }

    const { error: updErr } = await supabase
      .from("images")
      .update({ event_id: eventId })
      .eq("id", img.id)
      .is("event_id", null); // safety: never overwrite an existing assignment

    if (updErr) {
      console.error(`Failed to assign event for ${img.filename}:`, updErr);
      unmatched++;
    } else {
      assigned++;
      console.log(`Assigned ${img.filename} -> event ${eventId}`);
    }
  }

  console.log(
    `Event assignment complete: ${assigned} assigned, ${unmatched} unmatched, ${skippedNullTakenAt} skipped (null taken_at)`,
  );

  return { assigned, unmatched, skippedNullTakenAt };
}
