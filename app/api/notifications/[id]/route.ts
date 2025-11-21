import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// DELETE a specific notification (sent log)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify the sent log belongs to the user before deleting
    const { data: sentLog, error: fetchError } = await supabase
      .from('sent_logs')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !sentLog) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (sentLog.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the sent log
    const { error: deleteError } = await supabase
      .from('sent_logs')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      message: 'Notification deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Failed to delete notification:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to delete notification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
