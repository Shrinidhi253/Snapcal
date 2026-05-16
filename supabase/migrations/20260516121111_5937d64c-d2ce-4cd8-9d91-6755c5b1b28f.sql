CREATE TABLE public.images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  taken_at TIMESTAMP WITH TIME ZONE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_images_event_id ON public.images(event_id);

ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view images" ON public.images FOR SELECT USING (true);
CREATE POLICY "Anyone can insert images" ON public.images FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete images" ON public.images FOR DELETE USING (true);
CREATE POLICY "Anyone can update images" ON public.images FOR UPDATE USING (true);