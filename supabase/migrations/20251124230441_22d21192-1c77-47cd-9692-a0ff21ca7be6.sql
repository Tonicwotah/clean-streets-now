-- Create reports table for garbage reporting
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  street_name TEXT,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for location-based queries
CREATE INDEX idx_reports_location ON public.reports(latitude, longitude);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view reports (public data)
CREATE POLICY "Anyone can view reports"
  ON public.reports
  FOR SELECT
  USING (true);

-- Allow anyone to insert reports (anonymous reporting supported)
CREATE POLICY "Anyone can create reports"
  ON public.reports
  FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for report images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-images',
  'report-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
);

-- Storage policies for report images
CREATE POLICY "Anyone can view report images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'report-images');

CREATE POLICY "Anyone can upload report images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'report-images');

-- Create a view for aggregated report counts by area
CREATE OR REPLACE VIEW public.report_counts AS
SELECT 
  street_name,
  ROUND(latitude::numeric, 4) as lat_rounded,
  ROUND(longitude::numeric, 4) as lng_rounded,
  COUNT(*) as report_count,
  MAX(created_at) as latest_report,
  ARRAY_AGG(image_url ORDER BY created_at DESC) FILTER (WHERE image_url IS NOT NULL) as images
FROM public.reports
WHERE street_name IS NOT NULL
GROUP BY street_name, lat_rounded, lng_rounded;