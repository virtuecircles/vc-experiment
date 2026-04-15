
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  stripe_coupon_id TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'amount')),
  discount_value NUMERIC NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  applicable_prices TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active promo codes"
  ON public.promo_codes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'vc_manager']::public.app_role[]));

CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.promo_code_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id),
  user_id UUID NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checkout_session_id TEXT,
  UNIQUE(promo_code_id, user_id)
);

ALTER TABLE public.promo_code_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own usage"
  ON public.promo_code_usages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage"
  ON public.promo_code_usages FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'vc_manager']::public.app_role[]));

CREATE POLICY "Service can insert usage"
  ON public.promo_code_usages FOR INSERT
  WITH CHECK (true);
