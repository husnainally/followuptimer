#!/usr/bin/env node
/**
 * Test script to manually trigger notification webhook
 * Usage: node test-notification.js <reminder-id>
 */

const reminderId = process.argv[2];

if (!reminderId) {
  console.error('❌ Please provide a reminder ID');
  console.log('Usage: node test-notification.js <reminder-id>');
  process.exit(1);
}

const url = 'http://localhost:3000/api/reminders/send';

console.log(`🚀 Triggering notification for reminder: ${reminderId}`);

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ reminderId }),
})
  .then(async (response) => {
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Notification sent successfully!');
      console.log('Response:', data);
    } else {
      console.log('❌ Notification failed');
      console.log('Status:', response.status);
      console.log('Error:', data);
    }
  })
  .catch((error) => {
    console.error('❌ Request failed:', error.message);
  });
