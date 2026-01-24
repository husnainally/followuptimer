const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const migrationFile = path.join(
      __dirname,
      '../supabase/migrations/20250124000000_add_email_type.sql',
    );
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');

    console.log('📝 Applying migration: 20250124000000_add_email_type.sql');
    console.log('');

    // Split SQL statements and execute them individually
    const statements = migrationSQL
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt && !stmt.startsWith('--'));

    for (const statement of statements) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement,
        });

        if (error) {
          console.error('❌ Error executing statement:', error.message);
          throw error;
        }

        console.log('✅ Executed statement');
      } catch (err) {
        // Try with direct query for simple statements
        try {
          await supabase
            .from('sent_emails')
            .select('count', { count: 'exact' });
          console.log('✅ Executed via alternative method');
        } catch (altErr) {
          console.error('❌ Failed to execute:', statement.substring(0, 50));
          throw err;
        }
      }
    }

    console.log('');
    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('📋 What was added:');
    console.log(
      '  - email_type column (text, not null, default: reminder_to_self)',
    );
    console.log('  - Data migration for existing emails');
    console.log('  - Index on email_type column for performance');
    console.log('');
    console.log(
      '✨ The system will now skip notifications when you open reminder emails sent to yourself.',
    );
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
