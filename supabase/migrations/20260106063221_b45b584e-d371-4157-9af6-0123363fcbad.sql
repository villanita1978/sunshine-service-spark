-- Add is_active column to product_options table
ALTER TABLE public.product_options 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;