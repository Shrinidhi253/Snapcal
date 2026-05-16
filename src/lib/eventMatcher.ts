import { supabase } from "@/integrations/supabase/client";

/**
 * The `taken_at` column already stores the correct UTC instant
 * (exifr parses EXIF datetimes in the browser's local timezone, so the
 * resulting Date — and its toISOString() — is already the right UTC moment).
 * No reinterpretation needed; just normalize through Date for safety.
 */
function takenAtToQueryIso(takenAtRaw: string): string {
  return new Date(takenAtRaw).toISOString();
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
