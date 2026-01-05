-- Add option_id column to stock_items to link stock to specific product options
ALTER TABLE public.stock_items 
ADD COLUMN option_id uuid REFERENCES public.product_options(id) ON DELETE CASCADE;

-- Make product_id nullable since stock can be linked to option instead
ALTER TABLE public.stock_items 
ALTER COLUMN product_id DROP NOT NULL;

-- Create index for better performance
CREATE INDEX idx_stock_items_option_id ON public.stock_items(option_id);