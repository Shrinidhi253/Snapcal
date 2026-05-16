ALTER TABLE public.events
  ADD COLUMN course_code TEXT,
  ADD COLUMN course_name TEXT;

CREATE INDEX idx_events_course_code ON public.events(course_code);