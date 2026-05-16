import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { CalendarImport } from "@/components/CalendarImport";
import snapcalLogo from "@/assets/snapcal-logo.png";
import { CalendarList } from "@/components/CalendarList";
import { deleteAllImages } from "@/lib/imageDelete";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Snapcal" },
      { name: "description", content: "Snapcal — organize your photos around your school schedule." },
    ],
  }),
});

function Index() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deletingAll, setDeletingAll] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const { deleted } = await deleteAllImages();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["unmatched-images"] }),
        queryClient.invalidateQueries({ queryKey: ["event-photo-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["events-week"] }),
      ]);
      if (deleted === 0) toast.info("No images to delete.");
      else toast.success(`Deleted ${deleted} image${deleted === 1 ? "" : "s"}.`);
    } catch {
      toast.error("Failed to delete images.");
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <img src={snapcalLogo} alt="SnapCal" className="h-20 sm:h-24 w-auto -my-3" />
          <div className="flex items-center gap-4">
            <Link to="/unmatched" className="text-sm text-muted-foreground hover:text-foreground transition">
              Unmatched
            </Link>
            <Link to="/calendar" className="text-sm text-primary hover:underline">
              View calendar
            </Link>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-16">
        <div className="text-center space-y-3 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">Your schedule, your snapshots</h2>
          <p className="text-muted-foreground">
            Import your TimeEdit class schedule to automatically group photos by lesson and time.
          </p>
        </div>
        <CalendarImport />
        <CalendarList />

        <div className="mt-4 w-full max-w-2xl rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Delete all uploaded images</p>
            <p className="text-xs text-muted-foreground">
              Removes every photo from storage. Your calendars and events are kept — you can re-upload anytime.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                disabled={deletingAll}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-sm transition hover:bg-destructive/90 disabled:opacity-60"
              >
                {deletingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete all images
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all uploaded images?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes every uploaded photo from storage and the database.
                  Your imported calendars and events are not affected — you can upload new images anytime.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll}>
                  Delete all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
}
