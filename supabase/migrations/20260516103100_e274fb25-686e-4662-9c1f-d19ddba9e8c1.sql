-- Link events to the calendar (ics file) they were imported from, with cascade delete
ALTER TABLE public.events
  ADD COLUMN calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE;

CREATE INDEX idx_events_calendar_id ON public.events(calendar_id);

-- Allow deletes on both tables (public access matches existing policies)
CREATE POLICY "Anyone can delete calendars"
ON public.calendars FOR DELETE
USING (true);

CREATE POLICY "Anyone can delete events"
ON public.events FOR DELETE
USING (true);