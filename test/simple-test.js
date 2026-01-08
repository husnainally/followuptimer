#!/usr/bin/env node
/**
 * Simple webhook test - tests the notification sending directly
 * Usage: node simple-test.js <reminder-id>
 */

const reminderId = process.argv[2] || 'beaa24da-b801-4468-b322-1ef0f186f495';

console.log('🧪 Testing notification webhook\n');
console.log('Reminder ID:', reminderId);
console.log('Webhook URL: http://localhost:3000/api/reminders/send\n');
console.log('Sending request...\n');

fetch('http://localhost:3000/api/reminders/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ reminderId }),
})
  .then(async (response) => {
    console.log('Status:', response.status, response.statusText);

    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
      console.log('\nResponse:');
      console.log(JSON.stringify(result, null, 2));
    } catch {
      console.log('\nRaw response:');
      console.log(text);
    }

    console.log('\n' + '='.repeat(60));

    if (response.ok && result?.success) {
      console.log('✅ SUCCESS! Notification was sent.');
      console.log('\nWhat to check:');
      console.log('1. Check your email inbox (if method is email)');
      console.log('2. Click the bell icon in dashboard (if method is in_app)');
      console.log('3. Check the reminders table - status should be "sent"');
      console.log('4. Check sent_logs table for the delivery record');
    } else {
      console.log('❌ FAILED! Notification was not sent.');
      console.log('\nError:', result?.error || 'Unknown error');
      console.log('\nPossible issues:');
      console.log('1. Reminder ID not found in database');
      console.log('2. User profile missing (check profiles table)');
      console.log('3. Email service error (check Resend API key)');
      console.log('4. In-app notification table not created');
    }
  })
  .catch((error) => {
    console.error('❌ Request failed:', error.message);
    console.log('\nIs your Next.js dev server running?');
    console.log('Run: npm run dev');
  });
