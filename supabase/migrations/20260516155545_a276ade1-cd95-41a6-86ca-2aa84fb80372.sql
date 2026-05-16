-- Add unmatched_reason column to images table
ALTER TABLE public.images ADD COLUMN unmatched_reason TEXT;
