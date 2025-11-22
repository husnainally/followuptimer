#!/usr/bin/env node

/**
 * Production Testing Script
 * Tests the deployed FollowUpTimer application
 *
 * Usage: node scripts/test-production.js
 */

const BASE_URL = "https://followuptimer.vercel.app";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(endpoint, options = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    return {
      success: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function runTests() {
  log("\n🧪 Testing FollowUpTimer Production Deployment\n", "blue");
  log("=".repeat(60), "blue");

  // Test 1: Homepage
  log("\n1️⃣ Testing Homepage...", "yellow");
  const homeTest = await testEndpoint("/");
  if (homeTest.success) {
    log("✅ Homepage is accessible", "green");
  } else {
    log(`❌ Homepage failed: ${homeTest.error || homeTest.status}`, "red");
  }

  // Test 2: Waitlist Count API
  log("\n2️⃣ Testing Waitlist Count API...", "yellow");
  const waitlistCountTest = await testEndpoint("/api/waitlist/count");
  if (waitlistCountTest.success) {
    log(
      `✅ Waitlist count API works: ${JSON.stringify(waitlistCountTest.data)}`,
      "green"
    );
  } else {
    log(
      `❌ Waitlist count API failed: ${
        waitlistCountTest.error || waitlistCountTest.status
      }`,
      "red"
    );
  }

  // Test 3: Debug Endpoint (will fail without reminderId, but tests route exists)
  log("\n3️⃣ Testing Debug Endpoint...", "yellow");
  const debugTest = await testEndpoint("/api/reminders/debug");
  if (debugTest.status === 400 || debugTest.success) {
    log("✅ Debug endpoint exists (requires reminderId parameter)", "green");
    log(`   Response: ${JSON.stringify(debugTest.data)}`, "blue");
  } else {
    log(
      `❌ Debug endpoint failed: ${debugTest.error || debugTest.status}`,
      "red"
    );
  }

  // Test 4: Check if QStash endpoint is accessible
  log("\n4️⃣ Testing QStash Webhook Endpoint...", "yellow");
  const webhookTest = await testEndpoint("/api/reminders/send", {
    method: "POST",
    body: JSON.stringify({ reminderId: "test" }),
  });
  // Should return 404 (reminder not found) or 400 (missing reminderId)
  // This means the endpoint exists and is accessible
  if (webhookTest.status === 400 || webhookTest.status === 404) {
    log("✅ Webhook endpoint is accessible", "green");
  } else if (webhookTest.status === 401) {
    log(
      "⚠️  Webhook endpoint requires authentication (may need QStash signature)",
      "yellow"
    );
  } else {
    log(`❌ Webhook endpoint test failed: ${webhookTest.status}`, "red");
  }

  // Test 5: Push Subscriptions VAPID Key
  log("\n5️⃣ Testing Push Notifications VAPID Key Endpoint...", "yellow");
  const vapidTest = await testEndpoint(
    "/api/push-subscriptions/vapid-public-key"
  );
  if (vapidTest.success) {
    log("✅ VAPID public key endpoint works", "green");
    if (vapidTest.data?.publicKey) {
      log("   VAPID keys are configured!", "green");
    } else {
      log("   ⚠️  VAPID keys may not be configured", "yellow");
    }
  } else {
    log(
      `❌ VAPID endpoint failed: ${vapidTest.error || vapidTest.status}`,
      "red"
    );
    log("   ⚠️  Push notifications will not work without VAPID keys", "yellow");
  }

  // Test 6: Auth Routes
  log("\n6️⃣ Testing Authentication Routes...", "yellow");
  const loginTest = await testEndpoint("/login");
  if (loginTest.success) {
    log("✅ Login page is accessible", "green");
  } else {
    log(`❌ Login page failed: ${loginTest.error || loginTest.status}`, "red");
  }

  const signupTest = await testEndpoint("/signup");
  if (signupTest.success) {
    log("✅ Signup page is accessible", "green");
  } else {
    log(
      `❌ Signup page failed: ${signupTest.error || signupTest.status}`,
      "red"
    );
  }

  log("\n" + "=".repeat(60), "blue");
  log("\n📋 Manual Testing Required:\n", "yellow");
  log("1. Sign up / Login to test authentication", "blue");
  log("2. Create a reminder scheduled for 2-3 minutes in the future", "blue");
  log("3. Check Vercel logs for QStash scheduling messages", "blue");
  log("4. Check QStash dashboard: https://console.upstash.com/qstash", "blue");
  log("5. Wait for scheduled time and verify notifications are sent", "blue");
  log("6. Test all three notification types (email, push, in-app)", "blue");
  log("\n💡 Use the debug endpoint to check configuration:", "yellow");
  log(
    `   GET ${BASE_URL}/api/reminders/debug?reminderId=YOUR_REMINDER_ID`,
    "blue"
  );
  log("\n💡 Test notifications manually:", "yellow");
  log(`   POST ${BASE_URL}/api/reminders/test-send`, "blue");
  log('   Body: { "reminderId": "YOUR_REMINDER_ID" }', "blue");
  log("\n");
}

// Run tests
runTests().catch(console.error);
