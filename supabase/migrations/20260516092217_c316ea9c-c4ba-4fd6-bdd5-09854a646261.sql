CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  event_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert events"
  ON public.events FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_events_event_date ON public.events(event_date);
CREATE INDEX idx_events_start_time ON public.events(start_time);