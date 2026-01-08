#!/usr/bin/env node
/**
 * Test webhook endpoint directly
 */

const url =
  process.argv[2] || 'https://followuptimer-rpvd.vercel.app/api/reminders/send';
const reminderId = process.argv[3] || '40900ae0-7b05-4cbe-b7da-f6f1a0f6653f';

console.log(`🧪 Testing webhook endpoint: ${url}`);
console.log(`📝 Reminder ID: ${reminderId}\n`);

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    reminderId: reminderId,
  }),
})
  .then(async (response) => {
    console.log(`Status: ${response.status} ${response.statusText}`);
    const text = await response.text();

    try {
      const json = JSON.parse(text);
      console.log('\n✅ Response:');
      console.log(JSON.stringify(json, null, 2));

      if (json.success) {
        console.log('\n🎉 Notification sent successfully!');
        console.log('Check your email or in-app notifications.');
      } else {
        console.log('\n❌ Notification failed');
        console.log('Error:', json.error || 'Unknown error');
      }
    } catch (e) {
      console.log('\nRaw response:', text);
    }
  })
  .catch((error) => {
    console.error('❌ Request failed:', error.message);
  });
