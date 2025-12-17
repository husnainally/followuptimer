/**
 * Phase 2 Testing Script
 * Run with: node scripts/test-phase2.js
 * 
 * This script helps test Phase 2 features programmatically
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Phase 2 Testing Helper\n');
console.log('This script will help you test Phase 2 features.\n');
console.log('Make sure:');
console.log('1. Database migrations are applied');
console.log('2. Development server is running (npm run dev)');
console.log('3. You are logged in to the app\n');

const questions = [
  {
    name: 'baseUrl',
    question: 'Enter your app URL (default: http://localhost:3000): ',
    default: 'http://localhost:3000'
  },
  {
    name: 'userId',
    question: 'Enter your user ID (from Supabase auth.users): ',
    required: true
  }
];

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question.question, (answer) => {
      resolve(answer || question.default || '');
    });
  });
}

async function testFeature(featureName, testFn) {
  console.log(`\n📋 Testing: ${featureName}`);
  console.log('─'.repeat(50));
  try {
    await testFn();
    console.log(`✅ ${featureName} - PASSED\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${featureName} - FAILED`);
    console.error(`   Error: ${error.message}\n`);
    return false;
  }
}

async function testEvents(baseUrl) {
  console.log('Testing event logging...');
  
  const response = await fetch(`${baseUrl}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'streak_achieved',
      event_data: {
        streak_count: 5,
        test: true
      }
    }),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  console.log(`   Event logged: ${data.eventId || 'success'}`);
  
  // Test GET
  const getResponse = await fetch(`${baseUrl}/api/events?event_type=streak_achieved&limit=5`, {
    credentials: 'include'
  });
  
  if (getResponse.ok) {
    const events = await getResponse.json();
    console.log(`   Retrieved ${events.events?.length || 0} events`);
  }
}

async function testPopups(baseUrl) {
  console.log('Testing popup creation...');
  
  const response = await fetch(`${baseUrl}/api/popups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_type: 'success',
      title: 'Test Popup',
      message: 'This is a test popup from the testing script',
      affirmation: 'Testing is important!',
      priority: 7
    }),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  console.log(`   Popup created: ${data.popupId || 'success'}`);
  
  // Test GET
  const getResponse = await fetch(`${baseUrl}/api/popups`, {
    credentials: 'include'
  });
  
  if (getResponse.ok) {
    const popup = await getResponse.json();
    console.log(`   Next popup: ${popup.popup ? popup.popup.title : 'none'}`);
  }
}

async function testSmartSnooze(baseUrl) {
  console.log('Testing smart snooze suggestions...');
  
  const response = await fetch(`${baseUrl}/api/snooze/suggestions`, {
    credentials: 'include'
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  if (data.suggestion) {
    console.log(`   Suggestion: ${data.suggestion.durationMinutes} minutes`);
    console.log(`   Confidence: ${(data.suggestion.confidence * 100).toFixed(0)}%`);
    console.log(`   Reason: ${data.suggestion.reason}`);
  } else {
    console.log(`   No suggestion available (smart snooze may be disabled or no history)`);
  }
}

async function testDigest(baseUrl) {
  console.log('Testing weekly digest generation...');
  
  const response = await fetch(`${baseUrl}/api/digests/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DIGEST_CRON_SECRET || 'test'}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      console.log('   ⚠️  Unauthorized (set DIGEST_CRON_SECRET or remove auth check)');
      return;
    }
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const data = await response.json();
  console.log(`   Digests sent: ${data.sent || 0}`);
  console.log(`   Total users: ${data.total || 0}`);
  console.log(`   Errors: ${data.errors || 0}`);
}

async function checkDatabase(userId) {
  console.log('\n📊 Database Verification');
  console.log('─'.repeat(50));
  console.log('\nRun these queries in Supabase SQL Editor:\n');
  
  console.log(`-- Check events for user`);
  console.log(`SELECT event_type, COUNT(*) as count`);
  console.log(`FROM events`);
  console.log(`WHERE user_id = '${userId}'`);
  console.log(`GROUP BY event_type;\n`);
  
  console.log(`-- Check popups for user`);
  console.log(`SELECT template_type, status, COUNT(*) as count`);
  console.log(`FROM popups`);
  console.log(`WHERE user_id = '${userId}'`);
  console.log(`GROUP BY template_type, status;\n`);
  
  console.log(`-- Check snooze history`);
  console.log(`SELECT snooze_duration_minutes, snooze_reason, created_at`);
  console.log(`FROM snooze_history`);
  console.log(`WHERE user_id = '${userId}'`);
  console.log(`ORDER BY created_at DESC LIMIT 10;\n`);
  
  console.log(`-- Check user preferences`);
  console.log(`SELECT`);
  console.log(`  affirmation_frequency,`);
  console.log(`  smart_snooze_enabled,`);
  console.log(`  digest_preferences`);
  console.log(`FROM profiles`);
  console.log(`WHERE id = '${userId}';\n`);
}

async function main() {
  try {
    const baseUrl = await askQuestion(questions[0]);
    const userId = await askQuestion(questions[1]);
    
    if (!userId) {
      console.log('\n❌ User ID is required. Exiting.');
      rl.close();
      return;
    }

    const finalBaseUrl = baseUrl || questions[0].default;
    
    console.log('\n🔍 Starting tests...\n');
    console.log(`Base URL: ${finalBaseUrl}`);
    console.log(`User ID: ${userId}\n`);

    const results = [];

    // Note: These tests require authentication cookies
    // You may need to manually test in browser with DevTools
    console.log('⚠️  Note: API tests require authentication.');
    console.log('   For full testing, use browser DevTools or the manual testing guide.\n');

    results.push(await testFeature('Event System', () => testEvents(finalBaseUrl)));
    results.push(await testFeature('Popup System', () => testPopups(finalBaseUrl)));
    results.push(await testFeature('Smart Snooze', () => testSmartSnooze(finalBaseUrl)));
    results.push(await testFeature('Weekly Digest', () => testDigest(finalBaseUrl)));

    checkDatabase(userId);

    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Results: ${passed}/${total} passed`);
    console.log('='.repeat(50));

    if (passed === total) {
      console.log('✅ All tests passed!');
    } else {
      console.log('⚠️  Some tests failed. Check errors above.');
      console.log('   Some failures may be expected if features are not fully configured.');
    }

    console.log('\n💡 For comprehensive testing, see PHASE2_TESTING.md');
    console.log('💡 Use browser DevTools to test authenticated endpoints\n');

  } catch (error) {
    console.error('\n❌ Script error:', error);
  } finally {
    rl.close();
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ (for native fetch)');
  console.error('   Or install node-fetch: npm install node-fetch');
  process.exit(1);
}

main();

