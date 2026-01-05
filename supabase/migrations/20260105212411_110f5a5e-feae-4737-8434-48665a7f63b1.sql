
-- Create stock_items table for instant delivery products
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_sold BOOLEAN NOT NULL DEFAULT false,
  sold_to_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sold_at TIMESTAMP WITH TIME ZONE
);

-- Add instant_delivery flag to products table
ALTER TABLE public.products ADD COLUMN instant_delivery BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view available stock count"
ON public.stock_items
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage stock items"
ON public.stock_items
FOR ALL
USING (auth.role() = 'authenticated');
