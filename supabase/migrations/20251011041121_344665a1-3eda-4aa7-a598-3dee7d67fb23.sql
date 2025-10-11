-- Create function to add credits to user
CREATE OR REPLACE FUNCTION public.add_user_credits(p_user_id UUID, p_amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET credits_remaining = credits_remaining + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Create function to deduct credits from user
CREATE OR REPLACE FUNCTION public.deduct_user_credits(p_user_id UUID, p_amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET credits_remaining = GREATEST(0, credits_remaining - p_amount),
      credits_used = credits_used + LEAST(p_amount, credits_remaining),
      updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;