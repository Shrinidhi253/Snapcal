import { useRef, useState } from "react";
import { Upload, X, Loader2, CheckCircle2, AlertCircle, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractImageTakenAt } from "@/lib/exifExtractor";
import { assignUnmatchedImages } from "@/lib/eventMatcher";
import { cn } from "@/lib/utils";

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"];
const ACCEPT_ATTR = ".jpg,.jpeg,.png,.heic,.heif,image/*";

type Selected = {
  id: string;
  file: File;
  previewUrl: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; done: number; total: number }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function isAccepted(file: File) {
  if (ACCEPTED.includes(file.type.toLowerCase())) return true;
  // HEIC files sometimes report empty mime
  const name = file.name.toLowerCase();
  return /\.(jpe?g|png|heic|heif)$/.test(name);
}

export function PhotoUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Selected[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);

  const isUploading = status.kind === "uploading";

  const addFiles = (files: FileList | File[]) => {
    const next: Selected[] = [];
    const rejected: string[] = [];
    for (const f of Array.from(files)) {
      if (!isAccepted(f)) {
        rejected.push(f.name);
        continue;
      }
      next.push({
        id: `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
      });
    }
    if (rejected.length) {
      setStatus({ kind: "error", message: "Unsupported image format." });
      toast.error(`Unsupported: ${rejected.slice(0, 2).join(", ")}${rejected.length > 2 ? "…" : ""}`);
    } else {
      setStatus({ kind: "idle" });
    }
    if (next.length) setSelected((prev) => [...prev, ...next]);
  };

  const removeAt = (id: string) => {
    setSelected((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearAll = () => {
    selected.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setSelected([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!selected.length) return;
    setStatus({ kind: "uploading", done: 0, total: selected.length });

    let done = 0;
    let failed = 0;

    for (const item of selected) {
      try {
        const ext = (item.file.name.split(".").pop() || "jpg").toLowerCase();
        const filename = `${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("lecture-photos")
          .upload(filename, item.file, {
            contentType: item.file.type || "image/jpeg",
            upsert: false,
          });
        if (upErr) throw upErr;

        let takenAt: Date | null = null;
        try {
          takenAt = await extractImageTakenAt(item.file);
        } catch {
          takenAt = null;
        }

        // EXIF datetimes have no timezone. exifr returns a Date whose UTC
        // components equal the wall-clock time. Reinterpret those components
        // as local time so the comparison against UTC start/end_time is correct.
        const takenAtLocal = takenAt
          ? new Date(
              takenAt.getUTCFullYear(),
              takenAt.getUTCMonth(),
              takenAt.getUTCDate(),
              takenAt.getUTCHours(),
              takenAt.getUTCMinutes(),
              takenAt.getUTCSeconds(),
            )
          : null;
        const takenAtIso = takenAtLocal ? takenAtLocal.toISOString() : null;

        let matchedEventId: string | null = null;
        if (takenAtLocal && takenAtIso) {
          const { data: events, error: evErr } = await supabase
            .from("events")
            .select("id,start_time,end_time")
            .lte("start_time", takenAtIso)
            .gte("end_time", takenAtIso)
            .order("start_time", { ascending: true })
            .limit(1);
          if (evErr) {
            console.error("Event lookup failed:", evErr);
          } else if (events && events.length > 0) {
            matchedEventId = events[0].id;
          }
        } else {
          console.log(`${filename} could not be matched because of null taken_at`);
        }

        const { error: dbErr } = await supabase.from("images").insert({
          filename,
          original_filename: item.file.name,
          taken_at: takenAtIso,
          event_id: matchedEventId,
        });
        if (dbErr) throw dbErr;

        console.log("Image saved:", { filename, taken_at: takenAtIso, event_id: matchedEventId });
      } catch (err) {
        console.error("Upload failed for", item.file.name, err);
        failed++;
      } finally {
        done++;
        setStatus({ kind: "uploading", done, total: selected.length });
      }
    }

    if (failed === selected.length) {
      setStatus({ kind: "error", message: "Upload failed. Please try again." });
      toast.error("Upload failed. Please try again.");
      return;
    }

    const successCount = selected.length - failed;
    const message =
      failed === 0
        ? "Images uploaded successfully."
        : `${successCount} uploaded, ${failed} failed.`;
    setStatus({ kind: failed === 0 ? "success" : "error", message });
    if (failed === 0) toast.success(message);
    else toast.error(message);
    clearAll();
  };

  const progressPct =
    status.kind === "uploading" ? Math.round((status.done / status.total) * 100) : 0;

  return (
    <div className="w-full animate-fade-in">
      <div className="rounded-3xl bg-card border border-border/60 p-5 sm:p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent">
            <ImagePlus className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              Upload lecture photos
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Pick photos from your gallery — JPG, PNG, or HEIC.
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
          }}
        />

        {/* Upload trigger */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
          }}
          disabled={isUploading}
          className={cn(
            "group relative mx-auto flex w-auto items-center justify-center gap-2 rounded-2xl py-4 px-8 text-sm font-semibold text-primary-foreground transition-all duration-300 active:scale-[0.98] text-slate-800",
            "bg-[var(--gradient-primary)] shadow-[var(--shadow-button)] hover:shadow-[0_14px_30px_-10px_oklch(0.58_0.22_285/0.7)] hover:-translate-y-0.5",
            dragOver && "ring-4 ring-primary/30 -translate-y-0.5",
            isUploading && "opacity-60 cursor-not-allowed",
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Uploading {status.kind === "uploading" ? `${status.done}/${status.total}` : ""}…
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 shrink-0 text-slate-800" />
              Select photos
            </>
          )}
        </button>

        {selected.length > 0 && !isUploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-2 w-full text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            + Add more photos
          </button>
        )}

        {/* Preview grid */}
        {selected.length > 0 && (
          <div className="mt-5 animate-fade-in">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {selected.length} image{selected.length === 1 ? "" : "s"} selected
              </p>
              {!isUploading && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {selected.map((s) => (
                <div
                  key={s.id}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary animate-scale-in"
                >
                  <img
                    src={s.previewUrl}
                    alt={s.file.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => removeAt(s.id)}
                      className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                      aria-label={`Remove ${s.file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Confirm upload */}
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className={cn(
                "mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 px-5 text-sm font-semibold transition-all duration-300 active:scale-[0.98] disabled:active:scale-100",
                !isUploading
                  ? "bg-[var(--gradient-primary)] text-slate-800 shadow-[var(--shadow-button)] hover:-translate-y-0.5"
                  : "bg-secondary text-muted-foreground cursor-not-allowed",
              )}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading {status.done}/{status.total}…
                </>
              ) : (
              <>
                  <Upload className="h-4 w-4 text-slate-800" />
                  Upload {selected.length} image{selected.length === 1 ? "" : "s"}
                </>
              )}
            </button>

            {isUploading && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-[var(--gradient-primary)] transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Status messages */}
        {status.kind === "success" && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[color:var(--success)]/20 bg-[var(--success-soft)] px-4 py-3 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[color:var(--success)]" />
            <p className="text-sm font-medium text-[color:var(--success-foreground)]">
              {status.message}
            </p>
          </div>
        )}
        {status.kind === "error" && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/20 bg-[var(--destructive-soft)] px-4 py-3 animate-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm font-medium text-destructive">{status.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
