ALTER TABLE public.events ADD COLUMN IF NOT EXISTS note text;

CREATE POLICY "Anyone can update events"
ON public.events
FOR UPDATE
USING (true)
WITH CHECK (true);