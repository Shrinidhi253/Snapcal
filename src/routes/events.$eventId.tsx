import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Clock, MapPin, Camera, MoreHorizontal, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatTime } from "@/lib/weekCalendar";

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetailPage,
  head: () => ({ meta: [{ title: "Event — Snapcal" }] }),
});

function EventDetailPage() {
  const { eventId } = useParams({ from: "/events/$eventId" });

  const { data: event, isLoading, error } = useQuery({
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

  const start = event ? new Date(event.start_time) : null;
  const end = event ? new Date(event.end_time) : null;
  const durationH =
    start && end ? Math.round(((end.getTime() - start.getTime()) / 3600000) * 10) / 10 : 0;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link
            to="/calendar"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-muted transition"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <h1 className="text-base font-semibold text-foreground truncate px-3">
            {event?.course_name || event?.subject || "Event"}
          </h1>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-muted transition">
            <MoreHorizontal className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-5">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {error && <p className="text-destructive">Failed to load event.</p>}
        {!isLoading && !event && <p className="text-muted-foreground">Event not found.</p>}

        {event && start && end && (
          <>
            {/* Purple hero card */}
            <div
              className="rounded-3xl p-6 text-white shadow-[var(--shadow-card)]"
              style={{ background: "var(--gradient-primary)" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold tracking-wide">
                  {event.course_code || "EVENT"}
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-bold leading-tight">
                {event.course_name || event.subject}
              </h2>
              <p className="mt-2 text-sm text-white/85">
                {start.toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {/* Info grid card */}
            <div className="rounded-3xl bg-card shadow-[var(--shadow-card)] overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-border">
                <InfoCell
                  icon={<Clock className="h-4 w-4 text-primary" />}
                  label="TIME"
                  value={`${formatTime(start)} – ${formatTime(end)}`}
                />
                <InfoCell
                  icon={<Clock className="h-4 w-4 text-primary" />}
                  label="DURATION"
                  value={`${durationH}h`}
                />
              </div>
              <div className="border-t border-border">
                <InfoCell
                  icon={<MapPin className="h-4 w-4 text-primary" />}
                  label="LOCATION"
                  value={event.location || "—"}
                />
              </div>
            </div>

            {/* Lecture photos */}
            <div className="flex items-center justify-between pt-2">
              <h3 className="text-lg font-semibold text-foreground">Lecture Photos</h3>
              <span className="text-sm text-muted-foreground">0 Photos</span>
            </div>

            <div className="rounded-3xl bg-card shadow-[var(--shadow-card)] p-10 flex flex-col items-center justify-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[var(--shadow-button)]"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Camera className="h-7 w-7" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">No photos yet</p>
            </div>
          </>
        )}
      </main>

      {event && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 bg-gradient-to-t from-background via-background to-transparent">
          <button
            className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2 rounded-full py-4 text-white font-semibold shadow-[var(--shadow-button)] hover:opacity-95 transition"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Upload className="h-5 w-5" />
            Upload First Photo
          </button>
        </div>
      )}
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
