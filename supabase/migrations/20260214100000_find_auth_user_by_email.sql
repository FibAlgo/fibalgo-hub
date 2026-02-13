-- Function to find a user in auth.users by email
-- Used by CopeCart webhook as a fallback when user exists in auth but not yet in public.users
CREATE OR REPLACE FUNCTION public.find_auth_user_by_email(lookup_email text)
RETURNS TABLE(id uuid) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT au.id 
  FROM auth.users au 
  WHERE lower(au.email) = lower(lookup_email) 
  LIMIT 1;
$$;

-- Only service_role can call this
REVOKE ALL ON FUNCTION public.find_auth_user_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_auth_user_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.find_auth_user_by_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.find_auth_user_by_email(text) TO service_role;
