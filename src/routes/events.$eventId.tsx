import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Clock, MapPin, Tag, Camera } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Link to="/calendar" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold">Event details</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {error && <p className="text-destructive">Failed to load event.</p>}
        {!isLoading && !event && <p className="text-muted-foreground">Event not found.</p>}
        {event && (
          <div className="rounded-2xl border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-2xl font-semibold">{event.course_name || event.subject}</h2>
              {event.course_code && (
                <p className="text-sm text-muted-foreground mt-1">{event.course_code}</p>
              )}
            </div>
            <Row icon={<Calendar className="h-4 w-4" />}>
              {new Date(event.start_time).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Row>
            <Row icon={<Clock className="h-4 w-4" />}>
              {formatTime(new Date(event.start_time))} – {formatTime(new Date(event.end_time))}
            </Row>
            {event.location && (
              <Row icon={<MapPin className="h-4 w-4" />}>{event.location}</Row>
            )}
            {event.course_code && (
              <Row icon={<Tag className="h-4 w-4" />}>{event.course_code}</Row>
            )}
            <Row icon={<Camera className="h-4 w-4" />}>0 pictures uploaded</Row>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}
