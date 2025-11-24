-- Fix security definer view by recreating without security modifier
-- Views inherit the permissions of the calling user through RLS on the underlying table
DROP VIEW IF EXISTS public.report_counts;

CREATE VIEW public.report_counts AS
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