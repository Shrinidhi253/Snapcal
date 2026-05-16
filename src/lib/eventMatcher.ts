import { supabase } from "@/integrations/supabase/client";

type UnmatchedReason =
  | "No EXIF metadata"
  | "Could not determine image timestamp"
  | "No matched events found"
  | "Multiple matched events"
  | "Event matching failed";

/**
 * The `taken_at` column already stores the correct UTC instant
 * (exifr parses EXIF datetimes in the browser's local timezone, so the
 * resulting Date — and its toISOString() — is already the right UTC moment).
 * No reinterpretation needed; just normalize through Date for safety.
 */
function takenAtToQueryIso(takenAtRaw: string): string {
  return new Date(takenAtRaw).toISOString();
}

async function resolveMatch(
  takenAtIso: string,
): Promise<{ eventId: string | null; reason: UnmatchedReason | null }> {
  // Check for matching events
  const { data: events, error } = await supabase
    .from("events")
    .select("id,start_time,end_time")
    .lte("start_time", takenAtIso)
    .gte("end_time", takenAtIso)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Event lookup failed:", error);
    return { eventId: null, reason: "Event matching failed" };
  }

  const count = events?.length ?? 0;
  if (count === 0) return { eventId: null, reason: "No matched events found" };
  if (count > 1) return { eventId: null, reason: "Multiple matched events" };
  return { eventId: events![0].id, reason: null };
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
    .select("id,filename,taken_at,unmatched_reason")
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
      if (!img.unmatched_reason) {
        await supabase
          .from("images")
          .update({ unmatched_reason: "Could not determine image timestamp" })
          .eq("id", img.id);
      }
      console.log(
        `${img.filename} could not be matched because of null taken_at`,
      );
      continue;
    }

    const queryIso = takenAtToQueryIso(img.taken_at);
    const { eventId, reason } = await resolveMatch(queryIso);

    if (!eventId) {
      await supabase
        .from("images")
        .update({ unmatched_reason: reason })
        .eq("id", img.id)
        .is("event_id", null);
      unmatched++;
      continue;
    }

    const { error: updErr } = await supabase
      .from("images")
      .update({ event_id: eventId, unmatched_reason: null })
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
