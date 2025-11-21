#!/usr/bin/env node
/**
 * Complete flow diagnostic
 * Checks reminder status, QStash message, and simulates webhook
 */

const reminderId = process.argv[2];

if (!reminderId) {
  console.error('❌ Please provide a reminder ID');
  console.log('Usage: node diagnose-flow.js <reminder-id>');
  process.exit(1);
}

async function checkReminder() {
  console.log('📋 Step 1: Checking reminder in database...\n');

  const response = await fetch('http://localhost:3000/api/reminders');
  const data = await response.json();

  console.log(`Total reminders in DB: ${JSON.stringify(data) || 0}\n`);

  const reminder = data.reminders?.find((r) => r.id === reminderId);

  if (!reminder) {
    console.log('❌ Reminder not found');
    return null;
  }

  console.log('✅ Reminder found:');
  console.log('   Message:', reminder.message);
  console.log(
    '   Scheduled for:',
    new Date(reminder.remind_at).toLocaleString()
  );
  console.log('   Status:', reminder.status);
  console.log('   Method:', reminder.notification_method);
  console.log('   QStash ID:', reminder.qstash_message_id || 'NOT SET ❌');
  console.log('');

  return reminder;
}

async function checkQStashMessage(qstashMessageId) {
  if (!qstashMessageId) {
    console.log(
      '⚠️  Step 2: QStash message ID not set - reminder was not scheduled\n'
    );
    return null;
  }

  console.log('📊 Step 2: Checking QStash message status...\n');

  const token =
    process.env.QSTASH_TOKEN ||
    'eyJVc2VySUQiOiJkZWZhdWx0VXNlciIsIlBhc3N3b3JkIjoiZGVmYXVsdFBhc3N3b3JkIn0=';
  const baseUrl = process.env.QSTASH_URL || 'http://127.0.0.1:8080';

  try {
    const response = await fetch(`${baseUrl}/v2/messages/${qstashMessageId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.log('❌ Could not fetch QStash message');
      console.log('   Status:', response.status);
      return null;
    }

    const message = await response.json();
    console.log('✅ QStash message found:');
    console.log(
      '   Scheduled for:',
      new Date(message.notBefore).toLocaleString()
    );
    console.log('   Webhook URL:', message.url);
    console.log('   State:', message.state || 'pending');
    console.log('');

    // Check if scheduled time has passed
    const scheduledTime = new Date(message.notBefore);
    const now = new Date();

    if (now < scheduledTime) {
      console.log(
        `⏰ Scheduled time is in the future (${Math.round(
          (scheduledTime - now) / 1000
        )}s from now)`
      );
      console.log(
        '   Notification will be sent at:',
        scheduledTime.toLocaleString()
      );
    } else {
      console.log(
        `✅ Scheduled time has passed (${Math.round(
          (now - scheduledTime) / 1000
        )}s ago)`
      );
      console.log('   QStash should have triggered the webhook');
    }
    console.log('');

    return message;
  } catch (error) {
    console.error('❌ Failed to check QStash:', error.message);
    return null;
  }
}

async function testWebhook(reminderId) {
  console.log('🧪 Step 3: Testing webhook endpoint manually...\n');

  try {
    const response = await fetch('http://localhost:3000/api/reminders/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reminderId }),
    });

    const result = await response.json();

    console.log('   Status:', response.status);
    console.log('   Response:', result);

    if (result.success) {
      console.log('   ✅ Notification sent successfully!');
    } else {
      console.log('   ❌ Notification failed:', result.error);
    }
    console.log('');

    return result;
  } catch (error) {
    console.error('❌ Webhook test failed:', error.message);
    return null;
  }
}

async function checkLogs() {
  console.log('📝 Step 4: Checking sent logs...\n');

  try {
    const response = await fetch('http://localhost:3000/api/notifications');
    const data = await response.json();

    if (data.notifications && data.notifications.length > 0) {
      console.log(`Found ${data.notifications.length} notification logs:\n`);
      data.notifications.slice(0, 3).forEach((log, i) => {
        console.log(`${i + 1}. Reminder: ${log.reminders?.message || 'N/A'}`);
        console.log(`   Status: ${log.status}`);
        console.log(`   Method: ${log.delivery_method}`);
        console.log(`   Time: ${new Date(log.created_at).toLocaleString()}`);
        if (log.error_message) {
          console.log(`   Error: ${log.error_message}`);
        }
        console.log('');
      });
    } else {
      console.log('⚠️  No notification logs found');
    }
  } catch (error) {
    console.error('Failed to check logs:', error.message);
  }
}

// Run diagnostics
(async () => {
  console.log('🔍 COMPLETE FLOW DIAGNOSTIC\n');
  console.log('='.repeat(60));
  console.log('');

  const reminder = await checkReminder();
  if (!reminder) return;

  await checkQStashMessage(reminder.qstash_message_id);

  console.log('='.repeat(60));
  console.log('');
  console.log('Would you like to manually trigger the webhook now?');
  console.log('This will send the notification immediately.\n');
  console.log('Run: node test-webhook.js ' + reminderId);
  console.log('');

  await checkLogs();
})();
