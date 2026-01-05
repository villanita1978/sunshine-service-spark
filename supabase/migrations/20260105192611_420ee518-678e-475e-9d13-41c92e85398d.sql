-- Add price, duration, available columns to products table to match original project
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration text,
ADD COLUMN IF NOT EXISTS available integer DEFAULT 0;