import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, ImageOff, RefreshCw, CalendarDays, Trash2, Loader2, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { assignUnmatchedImages } from "@/lib/eventMatcher";
import { deleteImage } from "@/lib/imageDelete";
import { EventAssignDialog } from "@/components/EventAssignDialog";

export const Route = createFileRoute("/unmatched")({
  component: UnmatchedPage,
  head: () => ({ meta: [{ title: "Unmatched Images — Snapcal" }] }),
});

type UnmatchedImage = {
  id: string;
  filename: string;
  original_filename: string;
  taken_at: string | null;
  created_at: string;
  unmatched_reason: string | null;
};

const REASON_COLORS: Record<string, string> = {
  "No EXIF metadata": "bg-amber-100 text-amber-800",
  "Could not determine image timestamp": "bg-amber-100 text-amber-800",
  "No matched events found": "bg-slate-100 text-slate-700",
  "Multiple matched events": "bg-rose-100 text-rose-700",
  "Event matching failed": "bg-orange-100 text-orange-800",
};

function getReasonLabel(reason: string | null): string {
  if (!reason) return "Unknown reason";
  return reason;
}

function getReasonClass(reason: string | null): string {
  if (!reason) return "bg-muted text-muted-foreground";
  return REASON_COLORS[reason] || "bg-muted text-muted-foreground";
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UnmatchedPage() {
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);

  const { data: images = [], isLoading } = useQuery<UnmatchedImage[]>({
    queryKey: ["unmatched-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("images")
        .select("id,filename,original_filename,taken_at,created_at,unmatched_reason")
        .is("event_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UnmatchedImage[];
    },
  });

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const result = await assignUnmatchedImages();
      queryClient.invalidateQueries({ queryKey: ["unmatched-images"] });
      if (result.assigned > 0) {
        toast.success(`${result.assigned} image${result.assigned === 1 ? "" : "s"} matched to events.`);
      } else {
        toast.info("No new matches found.");
      }
    } catch (err) {
      toast.error("Retry failed. Please try again.");
    } finally {
      setRetrying(false);
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    setDeletingId(id);
    try {
      await deleteImage(id, filename);
      queryClient.invalidateQueries({ queryKey: ["unmatched-images"] });
      queryClient.invalidateQueries({ queryKey: ["event-photo-counts"] });
      toast.success("Image deleted.");
    } catch (err) {
      toast.error("Failed to delete image.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F6F8]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#F6F6F8]/85 backdrop-blur-md border-b border-border/40">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link
            to="/"
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:bg-white/80 transition"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <h1 className="text-base font-semibold tracking-tight">Unmatched Images</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6 pb-24">
        {/* Title section */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Unmatched Images</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Images that could not be automatically assigned to a lecture.
          </p>
        </div>

        {/* Stats bar */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-card)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[oklch(0.96_0.03_290)] text-primary">
            <ImageOff className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {images.length} unmatched {images.length === 1 ? "image" : "images"}
            </p>
            <p className="text-xs text-muted-foreground">
              {images.length === 0
                ? "All images have been matched"
                : "Review and manage unmatched uploads"}
            </p>
          </div>
          {images.length > 0 && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="ml-auto flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition disabled:opacity-60"
            >
              {retrying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Retry Matching
            </button>
          )}
        </div>

        {/* Empty state */}
        {images.length === 0 && !isLoading && (
          <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center shadow-[var(--shadow-card)] animate-fade-in">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-3xl text-white"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Camera className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">
              All uploaded images have been successfully matched.
            </h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Every photo has been linked to its lecture. Upload more photos and they will be matched automatically.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                to="/calendar"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition"
              >
                <CalendarDays className="h-4 w-4" />
                View Calendar
              </Link>
            </div>
          </div>
        )}

        {/* Image grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            {images.map((img) => {
              const { data: pub } = supabase.storage
                .from("lecture-photos")
                .getPublicUrl(img.filename);
              const reason = getReasonLabel(img.unmatched_reason);
              const reasonClass = getReasonClass(img.unmatched_reason);

              return (
                <div
                  key={img.id}
                  className="group overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)] transition hover:shadow-[0_8px_30px_-12px_oklch(0.58_0.22_285/0.25)]"
                >
                  {/* Thumbnail */}
                  <Link to="/images/$imageId" params={{ imageId: img.id }} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                      <img
                        src={pub.publicUrl}
                        alt={img.original_filename}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {img.original_filename}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Uploaded {formatDateTime(img.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(img.id, img.filename)}
                        disabled={deletingId === img.id}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        aria-label="Delete image"
                      >
                        {deletingId === img.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${reasonClass}`}
                      >
                        {reason}
                      </span>
                      {img.taken_at && (
                        <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
                          {new Date(img.taken_at).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      <button
                        onClick={() => setAssignId(img.id)}
                        className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition"
                      >
                        <CalendarPlus className="h-3 w-3" />
                        Assign event
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <EventAssignDialog
        open={assignId !== null}
        onClose={() => setAssignId(null)}
        imageId={assignId ?? ""}
      />
    </div>
  );
}
