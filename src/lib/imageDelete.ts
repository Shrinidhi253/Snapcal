import { supabase } from "@/integrations/supabase/client";

/**
 * Delete a single image: removes it from the `lecture-photos` storage
 * bucket and the `images` table. Calendars and events are untouched.
 */
export async function deleteImage(id: string, filename: string) {
  const { error: storageErr } = await supabase.storage
    .from("lecture-photos")
    .remove([filename]);
  if (storageErr) console.error("Storage delete error:", storageErr);

  const { error: dbErr } = await supabase.from("images").delete().eq("id", id);
  if (dbErr) throw dbErr;
}

/**
 * Delete every uploaded image (both matched and unmatched) from storage
 * and the database. Does NOT touch calendars or events.
 */
export async function deleteAllImages(): Promise<{ deleted: number }> {
  const { data: rows, error: selErr } = await supabase
    .from("images")
    .select("id,filename");
  if (selErr) throw selErr;
  const all = rows ?? [];
  if (all.length === 0) return { deleted: 0 };

  // Storage: remove in batches to stay safe.
  const filenames = all.map((r) => r.filename);
  const BATCH = 100;
  for (let i = 0; i < filenames.length; i += BATCH) {
    const chunk = filenames.slice(i, i + BATCH);
    const { error } = await supabase.storage.from("lecture-photos").remove(chunk);
    if (error) console.error("Storage batch delete error:", error);
  }

  const { error: dbErr } = await supabase
    .from("images")
    .delete()
    .not("id", "is", null);
  if (dbErr) throw dbErr;

  return { deleted: all.length };
}
