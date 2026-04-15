
-- Tighten the insert policy: only allow inserting your own usage
DROP POLICY "Service can insert usage" ON public.promo_code_usages;
CREATE POLICY "Users can record their own usage"
  ON public.promo_code_usages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
