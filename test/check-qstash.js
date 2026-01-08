#!/usr/bin/env node
/**
 * Check QStash message status
 * Usage: node check-qstash.js <message-id>
 */

const messageId =
  process.argv[2] ||
  'msg_7YoJxFpwkEy5zBp3fKaTU6bHGgAkaGoH2C72pRG3rGAmtDMgPazVD';
const token =
  process.env.QSTASH_TOKEN ||
  'eyJVc2VySUQiOiIzZDk0NjYyNS1kNDFhLTQ3YTYtOGFhZC0xYTYwNzdlZGFiNDMiLCJQYXNzd29yZCI6ImMyNjY5YTA4NjgxODQ5YWViNjgzMWQwMmE5Y2Y0YzkwIn0=';

console.log(`🔍 Checking QStash message: ${messageId}\n`);

// Get message details
fetch(`https://qstash.upstash.io/v2/messages/${messageId}`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
  .then(async (response) => {
    if (!response.ok) {
      console.log('❌ Failed to get message details');
      console.log('Status:', response.status);
      const text = await response.text();
      console.log('Response:', text);
      return;
    }

    const data = await response.json();
    console.log('✅ Message found!\n');
    console.log('Status:', data.state || 'unknown');
    console.log('Created:', new Date(data.createdAt * 1000).toLocaleString());
    console.log('Schedule:', new Date(data.notBefore * 1000).toLocaleString());
    console.log('URL:', data.url);
    console.log('Method:', data.method);
    console.log('\nFull details:', JSON.stringify(data, null, 2));
  })
  .catch((error) => {
    console.error('❌ Request failed:', error.message);
  });

// Check delivery logs/events for this message
console.log('\n📊 Checking delivery logs...\n');
fetch(`https://qstash.upstash.io/v2/events?messageId=${messageId}`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
  .then(async (response) => {
    if (!response.ok) {
      console.log('❌ Could not fetch events');
      return;
    }
    const data = await response.json();
    if (data.events && data.events.length > 0) {
      console.log(`Found ${data.events.length} events:\n`);
      data.events.forEach((event, i) => {
        console.log(
          `${i + 1}. ${event.state} at ${new Date(event.time).toLocaleString()}`
        );
        if (event.error) {
          console.log(`   ❌ Error: ${event.error}`);
        }
        if (event.responseStatus) {
          console.log(`   Response: ${event.responseStatus}`);
        }
        if (event.responseBody) {
          console.log(`   Body: ${event.responseBody}`);
        }
        console.log('');
      });
    } else {
      console.log(
        '⏳ No delivery events yet - message may not have been delivered'
      );
      console.log(
        "   This means QStash hasn't attempted delivery yet or the scheduled time hasn't arrived."
      );
    }
  })
  .catch((error) => {
    console.error('Failed to fetch events:', error.message);
  });
