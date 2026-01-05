-- Add response_message column for admin responses
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS response_message text;

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;