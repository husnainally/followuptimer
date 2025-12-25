import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


// DELETE user account
export async function DELETE() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete user's reminders first (due to foreign key constraints)
    await supabase.from('reminders').delete().eq('user_id', user.id);

    // Delete user's sent logs
    await supabase.from('sent_logs').delete().eq('user_id', user.id);

    // Delete user's profile
    await supabase.from('profiles').delete().eq('id', user.id);

    // Delete the auth user (this will cascade delete related data)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      // If we can't delete via admin API (requires service role key),
      // we can still sign out the user
      console.error('Failed to delete auth user:', deleteError);
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          message:
            'Account data deleted, please contact support to complete account deletion',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      message: 'Account deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Failed to delete account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
