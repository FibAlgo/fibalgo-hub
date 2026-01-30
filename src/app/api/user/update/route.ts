import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOwnershipOrAdmin, getErrorStatus, sanitizeDbError } from '@/lib/api/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PATCH - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, fullName, tradingviewUsername, tradingViewId, phone } = body;

    console.log('[User Update] Request body:', { userId, fullName, tradingviewUsername, tradingViewId, phone });

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // 🔒 SECURITY: Verify user can only update their own profile (or admin can update any)
    const { user: authUser, error: authError } = await requireOwnershipOrAdmin(userId);
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Check if full name is being changed
    if (fullName !== undefined) {
      // Get current user data to check name change cooldown
      const { data: currentUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('full_name, full_name_last_changed')
        .eq('id', userId)
        .single();
      
      console.log('[User Update] Current user data:', currentUser, 'Fetch error:', fetchError);
      
      const currentName = currentUser?.full_name || '';
      const newName = fullName || '';
      
      console.log('[User Update] Comparing names:', { currentName, newName, areEqual: currentName === newName });
      
      // Only apply cooldown if name is actually changing
      if (currentName !== newName) {
        const lastChanged = currentUser?.full_name_last_changed 
          ? new Date(currentUser.full_name_last_changed) 
          : null;
        
        console.log('[User Update] Last changed:', lastChanged);
        
        if (lastChanged) {
          const daysSinceChange = Math.floor((Date.now() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceChange < 7) {
            const daysRemaining = 7 - daysSinceChange;
            return NextResponse.json({ 
              error: `You can change your name again in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}` 
            }, { status: 400 });
          }
        }
        
        // Update name and record change time
        updateData.full_name = fullName;
        updateData.full_name_last_changed = new Date().toISOString();
        console.log(`[User Update] Name will be changed from "${currentName}" to "${newName}" for user ${userId}`);
      } else {
        console.log('[User Update] Names are same, skipping name update');
      }
    } else {
      console.log('[User Update] fullName is undefined, skipping name check');
    }

    // Support both old and new field names
    const tvId = tradingViewId || tradingviewUsername;
    if (tvId !== undefined) {
      updateData.trading_view_id = tvId;
    }

    if (phone !== undefined) {
      updateData.phone = phone;
    }

    console.log('[User Update] Final updateData:', updateData);

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[User Update] Error updating user:', error);
      return NextResponse.json({ error: sanitizeDbError(error, 'user-update') }, { status: 500 });
    }

    console.log('[User Update] Success, updated user:', data);
    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
