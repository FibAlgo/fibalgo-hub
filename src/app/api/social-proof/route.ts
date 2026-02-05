import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role for queue management
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Public client for reading
const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface QueueEntry {
  id: number;
  name: string;
  flag_emoji: string;
  plan: string;
  minutes_ago: number;
  display_order: number;
}

// Cache for the queue (short-lived, 10 seconds)
let cachedQueue: QueueEntry[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 1000; // 10 seconds cache

// Get the active queue from database
async function getQueue(): Promise<QueueEntry[]> {
  const now = Date.now();
  
  // Return cached queue if still valid
  if (cachedQueue && cachedQueue.length > 0 && now - cacheTimestamp < CACHE_DURATION) {
    // Update minutes_ago based on cache age
    const cacheAgeMinutes = Math.floor((now - cacheTimestamp) / 60000);
    return cachedQueue.map(entry => ({
      ...entry,
      minutes_ago: entry.minutes_ago + cacheAgeMinutes
    }));
  }
  
  // Try to call the database function that refreshes and returns the queue
  const { data, error } = await supabase.rpc('get_social_proof_queue');
  
  if (error) {
    console.error('Error calling get_social_proof_queue:', error);
    
    // Fallback: just read from the table directly
    const { data: fallbackData, error: fallbackError } = await supabasePublic
      .from('social_proof_queue')
      .select('id, name, flag_emoji, plan, purchased_at, display_order')
      .order('display_order');
    
    if (fallbackError || !fallbackData) {
      console.error('Fallback query also failed:', fallbackError);
      return cachedQueue || [];
    }
    
    // Calculate minutes_ago from purchased_at
    const nowDate = new Date();
    cachedQueue = fallbackData.map(entry => ({
      id: entry.id,
      name: entry.name,
      flag_emoji: entry.flag_emoji,
      plan: entry.plan,
      minutes_ago: Math.floor((nowDate.getTime() - new Date(entry.purchased_at).getTime()) / 60000),
      display_order: entry.display_order
    }));
    cacheTimestamp = now;
    return cachedQueue;
  }
  
  cachedQueue = data as QueueEntry[];
  cacheTimestamp = now;
  return cachedQueue || [];
}

export async function GET(request: Request) {
  try {
    const queue = await getQueue();
    
    if (!queue || queue.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No social proof data available' },
        { status: 404 }
      );
    }
    
    // Get index from query param - this cycles through the 100 entries
    const url = new URL(request.url);
    const index = parseInt(url.searchParams.get('index') || '0', 10);
    
    // Get the entry at this index (mod 100)
    const entryIndex = index % queue.length;
    const entry = queue[entryIndex];
    
    if (!entry) {
      return NextResponse.json(
        { success: false, message: 'Could not get queue entry' },
        { status: 500 }
      );
    }
    
    // Format minutes_ago
    const minutesAgo = Math.min(entry.minutes_ago, 59); // Cap at 59 minutes
    const timeAgo = `${minutesAgo} minute${minutesAgo === 1 ? '' : 's'} ago`;
    
    // Extract country code from flag emoji (e.g., 🇺🇸 -> us)
    const flagEmoji = entry.flag_emoji;
    let countryCode = 'us'; // default
    if (flagEmoji && flagEmoji.length >= 2) {
      // Flag emojis are made of regional indicator symbols
      // 🇺🇸 = U+1F1FA U+1F1F8 -> US
      const codePoints = [...flagEmoji].map(char => char.codePointAt(0) || 0);
      if (codePoints.length >= 2 && codePoints[0] >= 0x1F1E6 && codePoints[0] <= 0x1F1FF) {
        const first = String.fromCharCode(codePoints[0] - 0x1F1E6 + 65);
        const second = String.fromCharCode(codePoints[1] - 0x1F1E6 + 65);
        countryCode = (first + second).toLowerCase();
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        name: entry.name,
        countryCode,
        flagEmoji: entry.flag_emoji,
        plan: entry.plan,
        timeAgo,
        minutesAgo,
        displayOrder: entry.display_order,
        queueSize: queue.length
      }
    });
  } catch (error) {
    console.error('Social proof API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
