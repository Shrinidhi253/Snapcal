import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatTime } from "@/lib/weekCalendar";

type EventRow = {
  id: string;
  subject: string;
  course_name: string | null;
  course_code: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
};

interface EventAssignDialogProps {
  open: boolean;
  onClose: () => void;
  imageId: string;
  currentEventId?: string | null;
  onAssigned?: (eventId: string) => void;
}

export function EventAssignDialog({
  open,
  onClose,
  imageId,
  currentEventId,
  onAssigned,
}: EventAssignDialogProps) {
  const [search, setSearch] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const { data: events = [], isLoading } = useQuery<EventRow[]>({
    queryKey: ["all-events-for-assign"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,subject,course_name,course_code,event_date,start_time,end_time")
        .order("start_time", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
    enabled: open,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events.slice(0, 100);
    return events
      .filter((e) => {
        const start = new Date(e.start_time);
        const haystack = [
          e.subject,
          e.course_name ?? "",
          e.course_code ?? "",
          e.event_date,
          formatTime(start),
          start.toLocaleDateString(),
          start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 100);
  }, [events, search]);

  const handleAssign = async (eventId: string) => {
    setAssigningId(eventId);
    try {
      const { error } = await supabase
        .from("images")
        .update({ event_id: eventId, unmatched_reason: null })
        .eq("id", imageId);
      if (error) throw error;
      toast.success("Image assigned to event.");
      queryClient.invalidateQueries({ queryKey: ["unmatched-images"] });
      queryClient.invalidateQueries({ queryKey: ["image", imageId] });
      queryClient.invalidateQueries({ queryKey: ["event-photos"] });
      onAssigned?.(eventId);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign event.");
    } finally {
      setAssigningId(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {currentEventId ? "Change event" : "Assign event"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Search by subject, date, or start time
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Physics, 2026-05-12, 09:00"
              className="w-full rounded-full border border-input bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <CalendarIcon className="h-6 w-6" />
              <p className="text-sm">No matching events</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((e) => {
                const start = new Date(e.start_time);
                const end = new Date(e.end_time);
                const title = e.course_name || e.subject;
                const isCurrent = e.id === currentEventId;
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => handleAssign(e.id)}
                      disabled={assigningId !== null || isCurrent}
                      className={`w-full text-left px-3 py-3 rounded-xl transition flex items-start gap-3 ${
                        isCurrent
                          ? "bg-primary/10 cursor-default"
                          : "hover:bg-muted disabled:opacity-60"
                      }`}
                    >
                      <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[oklch(0.96_0.03_290)] text-primary">
                        <CalendarIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {title}
                          {isCurrent && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-primary">
                              current
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {start.toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {" · "}
                          {formatTime(start)} – {formatTime(end)}
                        </p>
                      </div>
                      {assigningId === e.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
