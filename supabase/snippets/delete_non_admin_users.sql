-- =====================================================
-- Admin hariç tüm kullanıcıları siler
-- role IN ('admin', 'super_admin') olanlar KORUNUR
-- =====================================================
-- Önce kaç kullanıcı silinecek kontrol edin:
-- SELECT id, email, full_name, role FROM public.users WHERE role NOT IN ('admin', 'super_admin');
-- =====================================================

BEGIN;

-- 1) public schema: Admin olmayan kullanıcıları sil (CASCADE ile ilgili tablolar da temizlenir)
DELETE FROM public.users
WHERE role NOT IN ('admin', 'super_admin');

-- 2) auth.users: Artık public.users'da kaydı kalmayan (silinen) kullanıcıları auth'dan da sil
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);

COMMIT;

-- Silindikten sonra kalan kullanıcıları kontrol:
-- SELECT id, email, full_name, role FROM public.users ORDER BY role, email;
