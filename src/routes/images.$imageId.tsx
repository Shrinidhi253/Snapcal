import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { supabase } from "@/integrations/supabase/client";
import { EventAssignDialog } from "@/components/EventAssignDialog";

export const Route = createFileRoute("/images/$imageId")({
  component: ImageDetailPage,
  head: () => ({ meta: [{ title: "Photo — Snapcal" }] }),
});

function ImageDetailPage() {
  const { imageId } = useParams({ from: "/images/$imageId" });
  const [assignOpen, setAssignOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["image", imageId],
    queryFn: async () => {
      const { data: img, error } = await supabase
        .from("images")
        .select("id,filename,original_filename,taken_at,event_id")
        .eq("id", imageId)
        .maybeSingle();
      if (error) throw error;
      if (!img) return null;

      const { data: pub } = supabase.storage
        .from("lecture-photos")
        .getPublicUrl(img.filename);

      let event: {
        id: string;
        course_name: string | null;
        course_code: string | null;
        subject: string;
      } | null = null;
      if (img.event_id) {
        const { data: ev } = await supabase
          .from("events")
          .select("id,course_name,course_code,subject")
          .eq("id", img.event_id)
          .maybeSingle();
        event = ev ?? null;
      }

      return { img, url: pub.publicUrl, event };
    },
  });

  const takenAt = data?.img.taken_at ? new Date(data.img.taken_at) : null;
  const className =
    data?.event?.course_name || data?.event?.subject || "Unassigned";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-20 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <button
            onClick={() => window.history.back()}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="ml-3 truncate text-base font-semibold tracking-tight">
            {isLoading ? "Loading…" : data?.img.original_filename || "Photo"}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-12 pt-2">
        {data ? (
          <>
            <div className="flex w-full items-center justify-center overflow-hidden rounded-2xl bg-black touch-none select-none">
              <TransformWrapper
                doubleClick={{ mode: "toggle", step: 2 }}
                pinch={{ step: 5 }}
                wheel={{ step: 0.2 }}
                minScale={1}
                maxScale={6}
              >
                <TransformComponent
                  wrapperStyle={{ width: "100%", maxHeight: "80vh" }}
                  contentStyle={{ width: "100%" }}
                >
                  <img
                    src={data.url}
                    alt={data.img.original_filename}
                    loading="eager"
                    decoding="async"
                    draggable={false}
                    className="max-h-[80vh] w-full object-contain"
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>

            <div className="mx-auto mt-5 max-w-xl space-y-1 text-center text-xs text-white/70">
              <p>
                Taken at{" "}
                <span className="text-white/90">
                  {takenAt
                    ? takenAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })
                    : "Unknown time"}
                </span>
              </p>
              <p>
                Class:{" "}
                {data.event ? (
                  <Link
                    to="/events/$eventId"
                    params={{ eventId: data.event.id }}
                    className="text-white/90 underline-offset-2 hover:underline"
                  >
                    {className}
                  </Link>
                ) : (
                  <span className="text-white/90">{className}</span>
                )}
              </p>
              <p>
                Date:{" "}
                <span className="text-white/90">
                  {takenAt
                    ? takenAt.toLocaleDateString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Unknown date"}
                </span>
              </p>
            </div>

            <div className="mt-5 flex justify-center">
              <button
                onClick={() => setAssignOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 transition"
              >
                <CalendarPlus className="h-4 w-4" />
                {data.event ? "Change event" : "Assign event"}
              </button>
            </div>
          </>
        ) : (
          !isLoading && (
            <p className="mt-20 text-center text-sm text-white/60">
              Photo not found.
            </p>
          )
        )}
      </main>

      <EventAssignDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        imageId={imageId}
        currentEventId={data?.event?.id ?? null}
      />
    </div>
  );
}
