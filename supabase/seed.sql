-- Create admin user for local development
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'admin@admin.com',
    crypt('admin', gen_salt('bf')),
    NOW(),
    '{"full_name": "Admin User"}'::jsonb,
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    ''
)
ON CONFLICT (id) DO NOTHING;

-- Mirror admin in public.users
INSERT INTO public.users (id, email, full_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@admin.com',
    'Admin User',
    'admin'
)
ON CONFLICT (id) DO NOTHING;

SELECT 'Admin user created' AS status;
