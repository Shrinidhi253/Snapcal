import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Snapcal" },
      { name: "description", content: "Snapcal web app" },
    ],
  }),
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-4xl font-semibold text-foreground">Snapcal</h1>
    </div>
  );
}
