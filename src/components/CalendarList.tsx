import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CalendarRow = {
  id: string;
  name: string;
  event_count: number;
  created_at: string;
};

export function CalendarList() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<CalendarRow | null>(null);

  const { data: calendars, isLoading } = useQuery({
    queryKey: ["calendars"],
    queryFn: async (): Promise<CalendarRow[]> => {
      const { data, error } = await supabase
        .from("calendars")
        .select("id, name, event_count, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (cal: CalendarRow) => {
      const { error } = await supabase.from("calendars").delete().eq("id", cal.id);
      if (error) throw error;
      return cal;
    },
    onSuccess: (cal) => {
      toast.success(
        `File "${cal.name}" deleted. All corresponding images and events removed.`,
      );
      queryClient.invalidateQueries({ queryKey: ["calendars"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: () => {
      toast.error("Failed to delete the calendar. Please try again.");
    },
    onSettled: () => setPending(null),
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto mt-6 text-center text-sm text-muted-foreground">
        Loading uploaded files…
      </div>
    );
  }

  if (!calendars || calendars.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-6 animate-fade-in">
      <div className="rounded-3xl bg-card border border-border/60 p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-semibold tracking-tight text-foreground mb-4">
          Uploaded calendars
        </h3>
        <ul className="space-y-2">
          {calendars.map((cal) => (
            <li
              key={cal.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card border border-border">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {cal.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cal.event_count} event{cal.event_count === 1 ? "" : "s"} ·{" "}
                  {new Date(cal.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPending(cal)}
                disabled={deleteMutation.isPending}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                aria-label={`Delete ${cal.name}`}
              >
                {deleteMutation.isPending && pending?.id === cal.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this calendar file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium">{pending?.name}</span>,
              along with all {pending?.event_count} calendar event
              {pending?.event_count === 1 ? "" : "s"} imported from it and any
              images uploaded for those lectures. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pending && deleteMutation.mutate(pending)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
