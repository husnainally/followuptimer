import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


// Public endpoint to get waitlist count (no authentication required)
export async function GET() {
  try {
    const supabase = await createClient();

    // Count waitlist entries
    const { count, error } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return NextResponse.json({
      count: count || 0,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch waitlist count:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch waitlist count';
    return NextResponse.json({ error: message, count: 0 }, { status: 500 });
  }
}
