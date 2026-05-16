import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarImport } from "@/components/CalendarImport";
import { CalendarList } from "@/components/CalendarList";

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
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold">Snapcal</h1>
          <Link to="/calendar" className="text-sm text-primary hover:underline">
            View calendar
          </Link>
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
      </main>
    </div>
  );
}
