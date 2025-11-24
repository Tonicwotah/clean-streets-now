-- Remove the view to resolve security linter warning
-- We'll handle aggregation in application code instead
DROP VIEW IF EXISTS public.report_counts;