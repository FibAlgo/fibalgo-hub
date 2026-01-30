-- =====================================================
-- FIX: Add super_admin role support
-- =====================================================

-- Drop the old constraint and add new one with super_admin
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role::text = ANY (ARRAY['user'::character varying, 'admin'::character varying, 'super_admin'::character varying]::text[]));

-- Verification
-- SELECT DISTINCT role FROM public.users;
