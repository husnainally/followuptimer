/**
 * Cron Jobs Testing Script
 * Run with: node scripts/test-cron.js
 * 
 * This script tests all cron job endpoints locally
 * 
 * Environment variables needed (optional):
 * - CRON_SECRET (for Vercel-style auth)
 * - MISSED_REMINDERS_CRON_SECRET (for custom auth)
 * - INACTIVITY_CRON_SECRET (for custom auth)
 * - DIGEST_CRON_SECRET (for custom auth)
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  log(title, 'bright');
  log('='.repeat(60), 'cyan');
}

function logTest(name) {
  log(`\n📋 Testing: ${name}`, 'blue');
  log('─'.repeat(60), 'cyan');
}

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer || '');
    });
  });
}

async function testEndpoint(name, url, options = {}) {
  const {
    method = 'POST',
    headers = {},
    body = null,
    description = '',
  } = options;

  try {
    logTest(name);
    if (description) {
      log(`Description: ${description}`, 'cyan');
    }

    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    log(`\nRequest: ${method} ${url}`, 'yellow');
    if (Object.keys(headers).length > 0) {
      log(`Headers: ${JSON.stringify(headers, null, 2)}`, 'yellow');
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    log(`\nStatus: ${response.status}`, response.ok ? 'green' : 'red');
    log(`Response: ${JSON.stringify(data, null, 2)}`, 'cyan');

    if (response.ok) {
      log(`✅ ${name} - SUCCESS`, 'green');
      return { success: true, data };
    } else {
      log(`❌ ${name} - FAILED`, 'red');
      return { success: false, error: data };
    }
  } catch (error) {
    log(`❌ ${name} - ERROR: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function main() {
  logSection('🚀 Cron Jobs Testing Script');
  
  log('\nThis script will test all cron job endpoints.');
  log('Make sure your development server is running (npm run dev)\n');

  const baseUrl = await askQuestion('Enter your app URL (default: http://localhost:3000): ') || 'http://localhost:3000';
  
  log('\n📝 Authentication Options:', 'bright');
  log('1. Vercel Cron (x-vercel-cron header)');
  log('2. CRON_SECRET (Authorization header)');
  log('3. Custom secrets (per endpoint)');
  log('4. No authentication (development mode)');
  
  const authMethod = await askQuestion('\nSelect auth method (1-4, default: 1): ') || '1';

  // Load environment variables
  const cronSecret = process.env.CRON_SECRET;
  const missedRemindersSecret = process.env.MISSED_REMINDERS_CRON_SECRET;
  const inactivitySecret = process.env.INACTIVITY_CRON_SECRET;
  const digestSecret = process.env.DIGEST_CRON_SECRET;

  log('\n🔐 Environment Variables:', 'bright');
  log(`CRON_SECRET: ${cronSecret ? '✅ Set' : '❌ Not set'}`, cronSecret ? 'green' : 'yellow');
  log(`MISSED_REMINDERS_CRON_SECRET: ${missedRemindersSecret ? '✅ Set' : '❌ Not set'}`, missedRemindersSecret ? 'green' : 'yellow');
  log(`INACTIVITY_CRON_SECRET: ${inactivitySecret ? '✅ Set' : '❌ Not set'}`, inactivitySecret ? 'green' : 'yellow');
  log(`DIGEST_CRON_SECRET: ${digestSecret ? '✅ Set' : '❌ Not set'}`, digestSecret ? 'green' : 'yellow');

  // Prepare headers based on auth method
  let defaultHeaders = {};
  let missedRemindersHeaders = {};
  let inactivityHeaders = {};
  let digestHeaders = {};

  switch (authMethod) {
    case '1':
      // Vercel cron header
      defaultHeaders = { 'x-vercel-cron': '1' };
      missedRemindersHeaders = { 'x-vercel-cron': '1' };
      inactivityHeaders = { 'x-vercel-cron': '1' };
      digestHeaders = { 'x-vercel-cron': '1' };
      log('\n🔑 Using: Vercel Cron Header (x-vercel-cron: 1)', 'green');
      break;
    case '2':
      // CRON_SECRET
      if (!cronSecret) {
        log('\n⚠️  CRON_SECRET not set. Using no authentication.', 'yellow');
      } else {
        defaultHeaders = { 'Authorization': `Bearer ${cronSecret}` };
        missedRemindersHeaders = { 'Authorization': `Bearer ${cronSecret}` };
        inactivityHeaders = { 'Authorization': `Bearer ${cronSecret}` };
        digestHeaders = { 'Authorization': `Bearer ${cronSecret}` };
        log(`\n🔑 Using: CRON_SECRET (Authorization: Bearer ${cronSecret.substring(0, 10)}...)`, 'green');
      }
      break;
    case '3':
      // Custom secrets
      if (missedRemindersSecret) {
        missedRemindersHeaders = { 'Authorization': `Bearer ${missedRemindersSecret}` };
      }
      if (inactivitySecret) {
        inactivityHeaders = { 'Authorization': `Bearer ${inactivitySecret}` };
      }
      if (digestSecret) {
        digestHeaders = { 'Authorization': `Bearer ${digestSecret}` };
      }
      log('\n🔑 Using: Custom Secrets (per endpoint)', 'green');
      break;
    case '4':
      // No auth
      log('\n🔑 Using: No Authentication (development mode)', 'yellow');
      break;
  }

  const results = [];

  // Test 1: Check Missed Reminders
  logSection('Test 1: Check Missed Reminders');
  const missedResult = await testEndpoint(
    'Check Missed Reminders',
    `${baseUrl}/api/reminders/check-missed`,
    {
      headers: missedRemindersHeaders,
      description: 'Finds reminders where remind_at < now() and status = pending, logs reminder_missed events',
    }
  );
  results.push({ name: 'Check Missed Reminders', ...missedResult });

  // Test 2: Daily Cron (Combined: Inactivity + Expire Trials)
  logSection('Test 3: Daily Cron (Combined)');
  const dailyResult = await testEndpoint(
    'Daily Cron Job',
    `${baseUrl}/api/cron/daily`,
    {
      headers: defaultHeaders,
      description: 'Combined daily job: checks inactivity and expires trials',
    }
  );
  results.push({ name: 'Daily Cron Job', ...dailyResult });

  // Test 4: Generate Digests
  logSection('Test 4: Generate Digests');
  const digestResult = await testEndpoint(
    'Generate Digests',
    `${baseUrl}/api/digests/generate`,
    {
      headers: digestHeaders,
      description: 'Generates and sends weekly digests to users due for digest',
    }
  );
  results.push({ name: 'Generate Digests', ...digestResult });

  // Summary
  logSection('📊 Test Summary');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${icon} ${result.name}`, color);
  });

  log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`, 'bright');

  if (failed === 0) {
    log('\n🎉 All cron jobs are working correctly!', 'green');
  } else {
    log('\n⚠️  Some cron jobs failed. Check the errors above.', 'yellow');
  }

  log('\n💡 Tips:', 'bright');
  log('1. Make sure your development server is running');
  log('2. Check that database migrations are applied');
  log('3. Verify environment variables are set correctly');
  log('4. In production, Vercel will automatically add CRON_SECRET to Authorization header');
  log('5. You can test individual endpoints by calling them directly with curl or Postman\n');

  rl.close();
}

// Run the script
main().catch(error => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  rl.close();
  process.exit(1);
});

