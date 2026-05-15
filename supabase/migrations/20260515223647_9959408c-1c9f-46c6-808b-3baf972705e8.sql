CREATE TABLE public.calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  csv_content TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view calendars"
  ON public.calendars FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert calendars"
  ON public.calendars FOR INSERT
  WITH CHECK (true);