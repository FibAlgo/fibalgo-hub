-- burakbagdatli07@gmail.com kullanıcısının subscription hariç tüm verilerini sil

-- Önce user_id'yi bul
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM public.users WHERE email = 'burakbagdatli07@gmail.com';
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User not found';
    RETURN;
  END IF;
  
  -- billing_history sil
  DELETE FROM public.billing_history WHERE user_id = target_user_id;
  
  -- purchase_tokens sil (used_by_user_id)
  DELETE FROM public.purchase_tokens WHERE used_by_user_id = target_user_id;
  
  -- cancellation_requests sil
  DELETE FROM public.cancellation_requests WHERE user_id = target_user_id;
  
  -- notification_history sil
  DELETE FROM public.notification_history WHERE user_id = target_user_id;
  
  -- push_subscriptions sil
  DELETE FROM public.push_subscriptions WHERE user_id = target_user_id;
  
  -- crypto_payments sil
  DELETE FROM public.crypto_payments WHERE user_id = target_user_id;
  
  -- support_tickets sil
  DELETE FROM public.support_tickets WHERE user_id = target_user_id;
  
  RAISE NOTICE 'All data except subscription deleted for user %', target_user_id;
END;
$$;
