import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MoreHorizontal, Calendar, Clock, MapPin, Upload, Camera, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatTime } from "@/lib/weekCalendar";

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetailPage,
  head: () => ({ meta: [{ title: "Lecture — Snapcal" }] }),
});

// Photos feature is not wired to a backend yet — empty by default.
type LecturePhoto = { id: string; url: string; takenAt: string };

function EventDetailPage() {
  const { eventId } = useParams({ from: "/events/$eventId" });
  const [lightbox, setLightbox] = useState<LecturePhoto | null>(null);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: photos = [] } = useQuery<LecturePhoto[]>({
    queryKey: ["event-photos", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("images")
        .select("id,filename,taken_at")
        .eq("event_id", eventId)
        .order("taken_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((img) => {
        const { data: pub } = supabase.storage
          .from("lecture-photos")
          .getPublicUrl(img.filename);
        return {
          id: img.id,
          url: pub.publicUrl,
          takenAt: img.taken_at
            ? formatTime(new Date(img.taken_at))
            : "",
        };
      });
    },
  });

  const title = event?.course_name || event?.subject || "Lecture";

  const start = event ? new Date(event.start_time) : null;
  const end = event ? new Date(event.end_time) : null;
  const durationMin = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;
  const durationLabel =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? ` ${durationMin % 60}m` : ""}`
      : `${durationMin}m`;

  return (
    <div className="min-h-screen bg-[#F6F6F8] pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#F6F6F8]/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link
            to="/calendar"
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:bg-white/80 transition"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <h1 className="truncate px-3 text-base font-semibold tracking-tight">
            {isLoading ? "Loading…" : title}
          </h1>
          <button
            aria-label="More options"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:bg-white/80 transition"
          >
            <MoreHorizontal className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-2">
        {/* Lecture info card */}
        <section
          className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_-12px_oklch(0.58_0.22_285/0.18)]"
        >
          <div
            className="px-6 pt-6 pb-8 text-white"
            style={{ background: "var(--gradient-primary)" }}
          >
            <div className="flex items-center gap-2 text-white/85">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider">
                {event?.course_code || "Lecture"}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold leading-tight">{title}</h2>
            {start && (
              <p className="mt-1 text-sm text-white/85">
                {start.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-px bg-[#EFEEF3]">
            <InfoCell
              icon={<Clock className="h-4 w-4" />}
              label="Time"
              value={start && end ? `${formatTime(start)} – ${formatTime(end)}` : "—"}
            />
            <InfoCell
              icon={<Clock className="h-4 w-4" />}
              label="Duration"
              value={start && end ? durationLabel : "—"}
            />
            <InfoCell
              icon={<MapPin className="h-4 w-4" />}
              label="Location"
              value={event?.location || "—"}
              className="col-span-2"
            />
          </dl>
        </section>

        {/* Photos */}
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between px-1">
            <h3 className="text-lg font-semibold tracking-tight">Lecture Photos</h3>
            <span className="text-sm text-muted-foreground">
              {photos.length} {photos.length === 1 ? "Photo" : "Photos"}
            </span>
          </div>

          {photos.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p) => (
                <Link
                  key={p.id}
                  to="/images/$imageId"
                  params={{ imageId: p.id }}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_-8px_oklch(0.18_0.03_280/0.18)] transition active:scale-[0.98]"
                >
                  <img
                    src={p.url}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                    {p.takenAt}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Sticky upload button */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div
          className="h-16 w-full"
          style={{
            background:
              "linear-gradient(to top, #F6F6F8 35%, color-mix(in oklab, #F6F6F8 70%, transparent) 80%, transparent)",
          }}
        />
        <div className="bg-[#F6F6F8] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
          <div className="mx-auto max-w-2xl">
            <button
              className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-semibold text-white shadow-[var(--shadow-button)] transition active:scale-[0.99]"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Upload className="h-5 w-5" />
              {photos.length === 0 ? "Upload First Photo" : "Upload Images for Lecture"}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            aria-label="Close"
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox.url}
            alt=""
            className="max-h-full max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 bg-white px-6 py-4 ${className}`}>
      <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-[oklch(0.96_0.03_290)] text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</dd>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-[0_4px_20px_-12px_oklch(0.18_0.03_280/0.15)]">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-3xl text-white"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Camera className="h-7 w-7" />
      </div>
      <p className="mt-5 text-base font-semibold text-foreground">
        No photos uploaded for this lecture yet.
      </p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Capture your notes, slides, or whiteboard to keep them organized with this class.
      </p>
    </div>
  );
}
