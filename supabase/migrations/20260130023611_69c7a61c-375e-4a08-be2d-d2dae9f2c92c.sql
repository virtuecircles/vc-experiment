-- Block anonymous access to quiz_progress table
CREATE POLICY "Block anonymous access" 
ON public.quiz_progress 
FOR SELECT 
TO anon 
USING (false);