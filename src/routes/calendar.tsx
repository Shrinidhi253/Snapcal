import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ArrowLeft, Camera, StickyNote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PhotoUpload } from "@/components/PhotoUpload";
import {
  addDays,
  colorForSubject,
  formatTime,
  formatWeekRange,
  startOfWeek,
  toDateKey,
} from "@/lib/weekCalendar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Calendar — Snapcal" }] }),
});

type EventRow = {
  id: string;
  subject: string;
  course_code: string | null;
  course_name: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  event_date: string;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_START = 7;
const HOUR_END = 21; // exclusive end
const HOUR_HEIGHT = 56; // px per hour

function CalendarPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));

  const rangeStart = weekStart;
  const rangeEnd = addDays(weekStart, 7);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events-week", toDateKey(weekStart)],
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("id, subject, course_code, course_name, location, start_time, end_time, event_date")
        .gte("start_time", rangeStart.toISOString())
        .lt("start_time", rangeEnd.toISOString())
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const eventIds = useMemo(() => events.map((e) => e.id), [events]);

  const { data: photoCounts = {} } = useQuery({
    queryKey: ["event-photo-counts", eventIds],
    enabled: eventIds.length > 0,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("images")
        .select("event_id")
        .in("event_id", eventIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        if (row.event_id) counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
      }
      return counts;
    },
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (let i = 0; i < 7; i++) map.set(toDateKey(addDays(weekStart, i)), []);
    for (const e of events) {
      const key = toDateKey(new Date(e.start_time));
      const arr = map.get(key);
      if (arr) arr.push(e);
    }
    return map;
  }, [events, weekStart]);

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = HOUR_START; h < HOUR_END; h++) arr.push(h);
    return arr;
  }, []);

  const today = toDateKey(new Date());

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-semibold">Calendar</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/unmatched"
              className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground transition"
            >
              Unmatched
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekStart((w) => addDays(w, -7))}
                className="flex h-9 w-9 items-center justify-center rounded-full border hover:bg-accent"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setWeekStart(startOfWeek(new Date()))}
                className="rounded-full border px-3 h-9 text-sm hover:bg-accent"
              >
                Today
              </button>
              <button
                onClick={() => setWeekStart((w) => addDays(w, 7))}
                className="flex h-9 w-9 items-center justify-center rounded-full border hover:bg-accent"
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3 text-sm text-muted-foreground">
          {formatWeekRange(weekStart)}
          {isLoading && <span className="ml-2">· Loading…</span>}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-2 sm:px-4 py-4 space-y-5">
        <PhotoUpload />
        <div className="rounded-2xl border bg-card overflow-x-auto">

          {/* Day header row */}
          <div className="grid min-w-[760px]" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            <div />
            {DAY_LABELS.map((label, i) => {
              const d = addDays(weekStart, i);
              const isToday = toDateKey(d) === today;
              return (
                <div
                  key={label}
                  className={cn(
                    "px-2 py-3 text-center border-l border-b",
                    isToday && "bg-accent/40",
                  )}
                >
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className={cn("text-base font-semibold", isToday && "text-primary")}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid body */}
          <div
            className="relative grid min-w-[760px]"
            style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}
          >
            {/* Hour labels */}
            <div>
              {hours.map((h) => (
                <div
                  key={h}
                  className="text-[10px] text-muted-foreground text-right pr-2 border-b"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {Array.from({ length: 7 }).map((_, di) => {
              const d = addDays(weekStart, di);
              const key = toDateKey(d);
              const dayEvents = eventsByDay.get(key) ?? [];
              return (
                <div key={key} className="relative border-l">
                  {hours.map((h) => (
                    <div key={h} className="border-b" style={{ height: HOUR_HEIGHT }} />
                  ))}
                  {dayEvents.map((ev) => (
                    <EventBlock key={ev.id} event={ev} pictureCount={photoCounts[ev.id] ?? 0} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {events.length === 0 && !isLoading && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            No events this week.{" "}
            <Link to="/" className="text-primary underline">
              Import a calendar
            </Link>
            .
          </p>
        )}
      </main>
    </div>
  );
}

function EventBlock({ event, pictureCount }: { event: EventRow; pictureCount: number }) {
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  const top = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(24, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);

  const colorKey = event.course_code || event.course_name || event.subject;
  const colorClasses = colorForSubject(colorKey);
  const title = event.course_name || event.subject;

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className={cn(
        "absolute left-1 right-1 rounded-md border px-1.5 py-1 text-[11px] leading-tight overflow-hidden shadow-sm hover:shadow-md transition-shadow",
        colorClasses,
      )}
      style={{ top, height }}
    >
      <div className="font-semibold">
        {formatTime(start)}–{formatTime(end)}
      </div>
      <div className="truncate font-medium">{title}</div>
      <div className="mt-0.5 flex items-center gap-1 opacity-80">
        <Camera className="h-3 w-3" />
        <span>{pictureCount}</span>
      </div>
    </Link>
  );
}
