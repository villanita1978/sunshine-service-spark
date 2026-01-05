-- Allow anyone to update token balance (for order deductions)
CREATE POLICY "Anyone can update token balance" 
ON public.tokens 
FOR UPDATE 
USING (true)
WITH CHECK (true);