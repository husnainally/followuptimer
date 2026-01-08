#!/usr/bin/env node
/**
 * Complete notification testing script
 * Tests all three notification methods
 */

async function testNotification(method, reminderId) {
  const url = 'http://localhost:3000/api/reminders/send';

  console.log(`\n🧪 Testing ${method} notification...`);
  console.log(`Reminder ID: ${reminderId}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reminderId }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`✅ ${method} notification sent successfully!`);
      return true;
    } else {
      console.log(`❌ ${method} notification failed`);
      console.log('Response:', data);
      return false;
    }
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    return false;
  }
}

async function fetchReminders() {
  try {
    const response = await fetch('http://localhost:3000/api/reminders');
    const data = await response.json();
    return data.reminders || [];
  } catch (error) {
    console.error('Failed to fetch reminders:', error.message);
    return [];
  }
}

async function checkInAppNotifications() {
  try {
    const response = await fetch(
      'http://localhost:3000/api/in-app-notifications'
    );
    const data = await response.json();
    console.log('\n📬 In-App Notifications:');
    console.log(`Total: ${data.notifications?.length || 0}`);
    console.log(`Unread: ${data.unreadCount || 0}`);
    return data;
  } catch (error) {
    console.error('Failed to fetch in-app notifications:', error.message);
    return null;
  }
}

// Main execution
(async () => {
  const command = process.argv[2];
  const reminderId = process.argv[3];

  if (command === 'test' && reminderId) {
    await testNotification('email/push/in_app', reminderId);
  } else if (command === 'list') {
    console.log('📋 Fetching reminders...');
    const reminders = await fetchReminders();
    console.log(`\nFound ${reminders.length} reminders:`);
    reminders.slice(0, 5).forEach((r) => {
      console.log(`- ID: ${r.id}`);
      console.log(`  Message: ${r.message}`);
      console.log(`  Method: ${r.notification_method}`);
      console.log(`  Status: ${r.status}`);
      console.log(`  Time: ${new Date(r.remind_at).toLocaleString()}`);
    });
  } else if (command === 'check') {
    await checkInAppNotifications();
  } else {
    console.log(`
📝 Usage:
  node test-helper.js test <reminder-id>  - Test sending notification
  node test-helper.js list                 - List recent reminders
  node test-helper.js check                - Check in-app notifications

Examples:
  node test-helper.js list
  node test-helper.js test abc-123-def-456
  node test-helper.js check
    `);
  }
})();
