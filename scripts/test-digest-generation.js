/**
 * Test script for Weekly Digest Engine
 * 
 * Usage:
 *   node scripts/test-digest-generation.js
 * 
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - DIGEST_CRON_SECRET
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const digestSecret = process.env.DIGEST_CRON_SECRET;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDigestGeneration() {
  console.log('🧪 Testing Weekly Digest Engine...\n');

  try {
    // 1. Get a test user (or create one)
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email, timezone')
      .limit(1);

    if (!users || users.length === 0) {
      console.error('❌ No users found. Please create a user first.');
      return;
    }

    const testUser = users[0];
    console.log(`✅ Using test user: ${testUser.email} (${testUser.id})`);

    // 2. Setup digest preferences
    console.log('\n📋 Setting up digest preferences...');
    const { error: prefError } = await supabase
      .from('user_digest_preferences')
      .upsert({
        user_id: testUser.id,
        weekly_digest_enabled: true,
        digest_day: 1, // Monday
        digest_time: '08:00:00',
        digest_channel: 'email',
        digest_detail_level: 'standard',
        only_when_active: false,
      }, {
        onConflict: 'user_id',
      });

    if (prefError) {
      console.error('❌ Failed to setup preferences:', prefError);
      return;
    }
    console.log('✅ Preferences set');

    // 3. Create test events for this week
    console.log('\n📊 Creating test events...');
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const testEvents = [
      {
        user_id: testUser.id,
        event_type: 'reminder_created',
        event_data: { reminder_id: 'test-1', message: 'Test reminder 1' },
        created_at: new Date(weekStart.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: testUser.id,
        event_type: 'reminder_triggered',
        event_data: { reminder_id: 'test-1' },
        created_at: new Date(weekStart.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: testUser.id,
        event_type: 'reminder_completed',
        event_data: { reminder_id: 'test-1' },
        created_at: new Date(weekStart.getTime() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: testUser.id,
        event_type: 'reminder_created',
        event_data: { reminder_id: 'test-2', message: 'Test reminder 2' },
        created_at: new Date(weekStart.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: testUser.id,
        event_type: 'reminder_snoozed',
        event_data: { reminder_id: 'test-2' },
        created_at: new Date(weekStart.getTime() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      },
    ];

    const { error: eventsError } = await supabase
      .from('events')
      .insert(testEvents);

    if (eventsError) {
      console.error('❌ Failed to create test events:', eventsError);
      return;
    }
    console.log(`✅ Created ${testEvents.length} test events`);

    // 4. Check if digest was already sent this week
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const { data: existingDigest } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('week_start_date', weekStartStr)
      .single();

    if (existingDigest) {
      console.log('\n⚠️  Digest already sent for this week');
      console.log('Digest details:', {
        variant: existingDigest.digest_variant,
        status: existingDigest.status,
        sent_at: existingDigest.sent_at,
      });
      return;
    }

    // 5. Call digest generation API
    console.log('\n📧 Generating digest...');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${appUrl}/api/digests/generate`, {
      method: 'POST',
      headers: {
        'Authorization': digestSecret ? `Bearer ${digestSecret}` : '',
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    console.log('Response:', result);

    if (!response.ok) {
      console.error('❌ Digest generation failed:', result);
      return;
    }

    // 6. Verify digest was created
    console.log('\n✅ Verifying digest was created...');
    const { data: digest, error: digestError } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (digestError) {
      console.error('❌ Failed to fetch digest:', digestError);
      return;
    }

    console.log('\n📊 Digest Details:');
    console.log({
      variant: digest.digest_variant,
      status: digest.status,
      sent_at: digest.sent_at,
      retry_count: digest.retry_count,
      dedupe_key: digest.dedupe_key,
      stats: digest.stats_data,
    });

    // 7. Verify stats
    if (digest.stats_data) {
      const stats = digest.stats_data;
      console.log('\n📈 Stats Summary:');
      console.log({
        created: stats.overall?.total_reminders_created,
        completed: stats.overall?.reminders_completed,
        completion_rate: stats.overall?.completion_rate,
        variant: digest.digest_variant,
      });
    }

    console.log('\n✅ Test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Check email inbox for digest');
    console.log('2. Check in-app notifications');
    console.log('3. Verify stats accuracy');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
testDigestGeneration();




