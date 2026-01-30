import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';
import { sanitizeRedirectUrl } from '@/lib/api/auth';

// Admin client for sending emails (server-side only)
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirectTo');
  
  // 🔒 SECURITY: Sanitize redirect URL to prevent open redirect attacks
  const rawNext = redirectTo || searchParams.get('next') || '/dashboard';
  const next = sanitizeRedirectUrl(rawNext);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Check if this is OAuth (Google) or email verification
      const isOAuth = data.user.app_metadata?.provider === 'google' || 
                      data.user.app_metadata?.providers?.includes('google');
      const isEmailVerified = !!data.user.email_confirmed_at;
      
      // Only create subscription for OAuth users OR verified email users
      const shouldCreateSubscription = isOAuth || isEmailVerified;

      // Get user metadata from Google (user_metadata and identities)
      let adminIdentityData: Record<string, unknown> = {};
      let adminUserMetadata: Record<string, unknown> = {};
      try {
        const { data: adminUserData } = await supabaseAdmin.auth.admin.getUserById(data.user.id);
        const adminUser = adminUserData?.user;
        const adminIdentity = adminUser?.identities?.find((identity) => identity.provider === 'google') ||
          adminUser?.identities?.[0];
        adminIdentityData = (adminIdentity?.identity_data || {}) as Record<string, unknown>;
        adminUserMetadata = (adminUser?.user_metadata || {}) as Record<string, unknown>;
      } catch (adminUserError) {
        console.log('Failed to fetch admin user data for identity fallback');
      }

      const googleIdentity = data.user.identities?.find((identity) => identity.provider === 'google') ||
        data.user.identities?.[0];
      const identityData = (googleIdentity?.identity_data || {}) as Record<string, unknown>;

      const userName =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        (typeof adminUserMetadata.full_name === 'string' ? adminUserMetadata.full_name : null) ||
        (typeof adminUserMetadata.name === 'string' ? adminUserMetadata.name : null) ||
        (typeof identityData.full_name === 'string' ? identityData.full_name : null) ||
        (typeof identityData.name === 'string' ? identityData.name : null) ||
        (typeof adminIdentityData.full_name === 'string' ? adminIdentityData.full_name : null) ||
        (typeof adminIdentityData.name === 'string' ? adminIdentityData.name : null) ||
        (typeof identityData.given_name === 'string' && typeof identityData.family_name === 'string'
          ? `${identityData.given_name} ${identityData.family_name}`
          : null) ||
        data.user.email?.split('@')[0] ||
        'User';
      
      const avatarUrl =
        (typeof data.user.user_metadata?.avatar_url === 'string' ? data.user.user_metadata?.avatar_url : null) ||
        (typeof data.user.user_metadata?.picture === 'string' ? data.user.user_metadata?.picture : null) ||
        (typeof adminUserMetadata.avatar_url === 'string' ? adminUserMetadata.avatar_url : null) ||
        (typeof adminUserMetadata.picture === 'string' ? adminUserMetadata.picture : null) ||
        (typeof identityData.avatar_url === 'string' ? identityData.avatar_url : null) ||
        (typeof identityData.picture === 'string' ? identityData.picture : null) ||
        (typeof adminIdentityData.avatar_url === 'string' ? adminIdentityData.avatar_url : null) ||
        (typeof adminIdentityData.picture === 'string' ? adminIdentityData.picture : null) ||
        null;

      const isFirstOAuthSignIn =
        isOAuth &&
        !!data.user.created_at &&
        !!data.user.last_sign_in_at &&
        Math.abs(new Date(data.user.created_at).getTime() - new Date(data.user.last_sign_in_at).getTime()) < 2000;

      // 🔒 SECURITY: Log without exposing PII (mask email and user ID)
      console.log('=== OAuth Callback ===');
      console.log('Auth user ID:', data.user.id?.substring(0, 8) + '...');
      console.log('Is OAuth:', isOAuth);
      console.log('Is first sign-in:', isFirstOAuthSignIn);

      // Check if user exists in our users table by ID first, then email
      let existingUser = null as {
        id: string;
        role: string | null;
        email: string;
        avatar_url: string | null;
        full_name: string | null;
      } | null;
      let existingUserError: { code?: string } | null = null;

      const { data: userById, error: userByIdError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userById) {
        existingUser = userById;
      } else {
        existingUserError = userByIdError;
        if (data.user.email) {
          const { data: userByEmail, error: userByEmailError } = await supabaseAdmin
            .from('users')
            .select('*')
            .ilike('email', data.user.email)
            .single();
          existingUser = userByEmail ?? null;
          existingUserError = userByEmailError;
        }
      }

      console.log('Existing user found:', existingUser ? 'YES' : 'NO');
      if (existingUserError) console.log('Lookup error code:', existingUserError.code);

      // CHECK IF USER IS BANNED (for existing users via OAuth)
      if (existingUser && (existingUser as any).is_banned === true) {
        console.log('User is banned, signing out and redirecting to login');
        // Sign out the banned user
        await supabaseAdmin.auth.admin.signOut(data.user.id, 'global');
        // Redirect to login with banned message
        return NextResponse.redirect(`${origin}/login?banned=true`);
      }

      if (existingUser) {
        // =============================================
        // USER EXISTS - UPDATE INFO, NO WELCOME EMAIL
        // =============================================
        console.log('User already exists in database:', existingUser.email);
        console.log('User role:', existingUser.role);
        
        const updates: Record<string, unknown> = {};
        
        // Update avatar if missing or changed and Google provides one
        if (avatarUrl && avatarUrl !== (existingUser as any).avatar_url) {
          updates.avatar_url = avatarUrl;
          console.log('Will update avatar_url');
        }
        
        // Update name if not set (support full_name or name)
        if (userName && !(existingUser as any).full_name && !(existingUser as any).name) {
          updates.full_name = userName;
          console.log('Will update full_name');
        }
        
        // Log ID mismatch (don't try to update primary key)
        if (existingUser.id !== data.user.id) {
          console.log('⚠️ User ID mismatch - DB:', existingUser.id, 'Auth:', data.user.id);

          const oldUserId = existingUser.id;
          const newUserId = data.user.id;

          // Safety: reset old subscriptions to basic before re-linking to avoid inheriting stale premium perms
          await supabaseAdmin
            .from('subscriptions')
            .update({
              plan: 'basic',
              status: 'cancelled',
              is_active: false,
              days_remaining: 0,
              end_date: new Date().toISOString().split('T')[0],
              polar_subscription_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', oldUserId);

          // Align primary key and re-link related records to auth user id
          await supabaseAdmin
            .from('users')
            .update({ id: newUserId })
            .eq('email', existingUser.email);

          await Promise.allSettled([
            supabaseAdmin.from('subscriptions').update({ user_id: newUserId }).eq('user_id', oldUserId),
            supabaseAdmin.from('billing_history').update({ user_id: newUserId }).eq('user_id', oldUserId),
            supabaseAdmin.from('refund_requests').update({ user_id: newUserId }).eq('user_id', oldUserId),
            supabaseAdmin.from('cancellation_requests').update({ user_id: newUserId }).eq('user_id', oldUserId),
            supabaseAdmin.from('tradingview_downgrades').update({ user_id: newUserId }).eq('user_id', oldUserId),
            supabaseAdmin.from('polar_payments').update({ user_id: newUserId }).eq('user_id', oldUserId),
          ]);

          existingUser.id = newUserId;
        }
        
        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update(updates)
            .eq('email', existingUser.email);
          
          if (updateError) {
            console.error('Failed to update user:', updateError);
            // Fallback for schemas using `name` / `trading_view_id`
            const altUpdates: Record<string, unknown> = {};
            if (userName && !(existingUser as any).name) altUpdates.name = userName;
            if (data.user.user_metadata?.tradingview_id && !(existingUser as any).trading_view_id) {
              altUpdates.trading_view_id = data.user.user_metadata.tradingview_id;
            }
            if (Object.keys(altUpdates).length > 0) {
              const { error: altUpdateError } = await supabaseAdmin
                .from('users')
                .update(altUpdates)
                .eq('email', existingUser.email);
              if (altUpdateError) console.error('Failed to update user (alt schema):', altUpdateError);
            }
          } else {
            console.log('User info updated successfully');
          }
        }

        // Ensure notification preferences exist
        try {
          await supabaseAdmin
            .from('notification_preferences')
            .upsert({
              user_id: existingUser.id,
              notifications_enabled: false,
              email_notifications: false,
              push_notifications: false,
              sound_enabled: false
            }, { onConflict: 'user_id' });
        } catch (prefsError) {
          console.error('Notification preferences ensure error:', prefsError);
        }
        
        // Check/create subscription if needed
        if (shouldCreateSubscription) {
          const { data: existingSub } = await supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('user_id', existingUser.id)
            .single();

          if (!existingSub) {
            console.log('Creating subscription for existing user...');
            const { error: subError } = await supabaseAdmin.from('subscriptions').insert({
              user_id: existingUser.id,
              plan: 'basic',
              status: 'active',
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              days_remaining: 365,
              is_active: true,
            });
            if (subError) console.error('Subscription error:', subError);
          }
        }
        
        // Send welcome email ONLY on first-time OAuth sign-in
        if (isFirstOAuthSignIn && data.user.email) {
          try {
            console.log('📧 Sending welcome email to first-time OAuth user:', data.user.email);
            await sendWelcomeEmail(data.user.email, userName);
            console.log('✅ Welcome email sent successfully');
          } catch (emailError) {
            console.error('❌ Failed to send welcome email:', emailError);
          }
        } else {
          console.log('✅ Skipping welcome email - user already exists');
        }
        
        // Redirect based on role
        if (existingUser.role === 'admin') {
          console.log('Redirecting admin to /admin');
          return NextResponse.redirect(`${origin}/admin`);
        }
        
        // For OAuth users, redirect to login page with oauth_complete flag for cache loading
        if (isOAuth) {
          const oauthRedirect = redirectTo || next || '/dashboard';
          return NextResponse.redirect(`${origin}/login?oauth_complete=true&userId=${data.user.id}&email=${encodeURIComponent(data.user.email || '')}&redirectTo=${encodeURIComponent(oauthRedirect)}`);
        }
        
        return NextResponse.redirect(`${origin}${next}`);
        
      } else {
        // =============================================
        // NEW USER - CREATE PROFILE & SEND WELCOME EMAIL
        // =============================================
        console.log('🆕 Creating new user profile for:', data.user.email);
        console.log('userName:', userName);
        console.log('avatarUrl:', avatarUrl);

        // Create user profile with all required fields
        // Note: 'name' column is NOT NULL in database, so we must include it
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            name: userName, // Required NOT NULL field
            avatar_url: avatarUrl,
            role: 'user',
          });

        if (insertError) {
          console.error('User insert error:', insertError);
          // Critical: Don't proceed with subscription if user creation failed
          return NextResponse.redirect(`${origin}/login?error=user_creation_failed`);
        }
        
        console.log('✅ User profile created successfully with name:', userName);

        // Create default notification preferences (non-blocking)
        try {
          await supabaseAdmin
            .from('notification_preferences')
            .upsert({
              user_id: data.user.id,
              notifications_enabled: false,
              email_notifications: false,
              push_notifications: false,
              sound_enabled: false
            }, { onConflict: 'user_id' });
        } catch (prefsError) {
          console.error('Notification preferences create error:', prefsError);
        }

        // Create subscription for verified users
        if (shouldCreateSubscription) {
          const { error: subError } = await supabaseAdmin.from('subscriptions').insert({
            user_id: data.user.id,
            plan: 'basic',
            status: 'active',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            days_remaining: 365,
            is_active: true,
          });

          if (subError) {
            console.error('Subscription insert error:', subError);
          } else {
            console.log('✅ Subscription created successfully');
          }

          // Send welcome email ONLY to first-time OAuth users
          if (isFirstOAuthSignIn && data.user.email) {
            try {
              console.log('📧 Sending welcome email to new user:', data.user.email);
              await sendWelcomeEmail(data.user.email, userName);
              console.log('✅ Welcome email sent successfully');
            } catch (emailError) {
              console.error('❌ Failed to send welcome email:', emailError);
            }
          }
        }
        
        // For OAuth users, redirect to login page with oauth_complete flag for cache loading
        if (isOAuth) {
          const oauthRedirect = redirectTo || next || '/dashboard';
          return NextResponse.redirect(`${origin}/login?oauth_complete=true&userId=${data.user.id}&email=${encodeURIComponent(data.user.email || '')}&redirectTo=${encodeURIComponent(oauthRedirect)}`);
        }
        
        // New users go to dashboard
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
