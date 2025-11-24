-- Add category field to reports table
ALTER TABLE public.reports 
ADD COLUMN category text NOT NULL DEFAULT 'garbage';

-- Add check constraint for valid categories
ALTER TABLE public.reports
ADD CONSTRAINT reports_category_check 
CHECK (category IN ('garbage', 'bird_feed', 'dog_poop', 'busted_sewage', 'other'));

-- Create index on category for better query performance
CREATE INDEX idx_reports_category ON public.reports(category);