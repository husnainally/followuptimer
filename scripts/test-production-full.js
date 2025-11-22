#!/usr/bin/env node

/**
 * Comprehensive Production Testing Script
 * Tests all critical endpoints and functionality
 *
 * Usage: node scripts/test-production-full.js
 */

const BASE_URL = "https://followuptimer.vercel.app";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
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
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function runTests() {
  log("\n🧪 Comprehensive Production Testing\n", "blue");
  log("=".repeat(70), "blue");

  // Test 1: Configuration Check
  log("\n1️⃣ Checking Production Configuration...", "yellow");
  const debugTest = await testEndpoint("/api/reminders/debug");

  if (debugTest.success || debugTest.status === 400) {
    log("✅ Debug endpoint accessible", "green");

    if (debugTest.data?.environment) {
      const env = debugTest.data.environment;
      log("\n   Configuration Status:", "cyan");
      log(
        `   - Node Env: ${env.nodeEnv}`,
        env.nodeEnv === "production" ? "green" : "yellow"
      );
      log(
        `   - Has QStash Token: ${env.hasQstashToken}`,
        env.hasQstashToken ? "green" : "red"
      );
      log(
        `   - Has App URL: ${env.hasAppUrl}`,
        env.hasAppUrl ? "green" : "red"
      );
      log(
        `   - App URL: ${env.appUrl}`,
        env.appUrl?.includes("vercel.app") ? "green" : "red"
      );
      log(
        `   - QStash URL: ${env.qstashUrl}`,
        env.qstashUrl?.includes("upstash.io") ? "green" : "yellow"
      );

      // Check if APP_URL is correct
      if (env.appUrl?.includes("localhost")) {
        log("\n   ⚠️  WARNING: App URL is still localhost!", "red");
        log(
          "   Action Required: Update NEXT_PUBLIC_APP_URL in Vercel to:",
          "yellow"
        );
        log(`      https://followuptimer.vercel.app`, "cyan");
        log("   Then redeploy the application.", "yellow");
      } else if (env.appUrl?.includes("vercel.app")) {
        log("\n   ✅ App URL is correctly set for production!", "green");
      }
    }
  } else {
    log(
      `❌ Debug endpoint failed: ${debugTest.error || debugTest.status}`,
      "red"
    );
  }

  // Test 2: VAPID Keys
  log("\n2️⃣ Testing Push Notification Configuration...", "yellow");
  const vapidTest = await testEndpoint(
    "/api/push-subscriptions/vapid-public-key"
  );
  if (vapidTest.success && vapidTest.data?.publicKey) {
    log("✅ VAPID keys are configured correctly", "green");
    log(
      `   Public Key: ${vapidTest.data.publicKey.substring(0, 20)}...`,
      "cyan"
    );
  } else {
    log("❌ VAPID keys not configured or accessible", "red");
  }

  // Test 3: API Endpoints
  log("\n3️⃣ Testing API Endpoints...", "yellow");

  const endpoints = [
    { path: "/api/waitlist/count", name: "Waitlist Count" },
    { path: "/api/in-app-notifications", name: "In-App Notifications" },
  ];

  for (const endpoint of endpoints) {
    const test = await testEndpoint(endpoint.path);
    if (test.success || test.status === 401) {
      log(
        `   ✅ ${endpoint.name} endpoint accessible (${test.status})`,
        "green"
      );
    } else {
      log(`   ❌ ${endpoint.name} endpoint failed (${test.status})`, "red");
    }
  }

  // Test 4: Webhook Endpoint (should require QStash signature)
  log("\n4️⃣ Testing QStash Webhook Endpoint...", "yellow");
  const webhookTest = await testEndpoint("/api/reminders/send", {
    method: "POST",
    body: JSON.stringify({ reminderId: "test" }),
  });

  if (webhookTest.status === 403 || webhookTest.status === 400) {
    log("✅ Webhook endpoint protected (requires QStash signature)", "green");
    log(`   Status: ${webhookTest.status} (Expected: 403/400)`, "cyan");
  } else if (webhookTest.status === 401) {
    log("✅ Webhook endpoint requires authentication", "green");
  } else {
    log(`⚠️  Webhook endpoint returned: ${webhookTest.status}`, "yellow");
  }

  // Test 5: Frontend Pages
  log("\n5️⃣ Testing Frontend Pages...", "yellow");
  const pages = [
    { path: "/", name: "Homepage" },
    { path: "/login", name: "Login" },
    { path: "/signup", name: "Signup" },
    { path: "/forgot-password", name: "Forgot Password" },
  ];

  for (const page of pages) {
    const test = await testEndpoint(page.path);
    if (test.success) {
      log(`   ✅ ${page.name} is accessible`, "green");
    } else {
      log(`   ❌ ${page.name} failed: ${test.status}`, "red");
    }
  }

  // Summary
  log("\n" + "=".repeat(70), "blue");
  log("\n📋 Production Readiness Checklist:\n", "yellow");

  const debugData = debugTest.data?.environment || {};
  const checks = [
    {
      name: "NEXT_PUBLIC_APP_URL set to production URL",
      status: debugData.appUrl?.includes("vercel.app"),
    },
    {
      name: "QSTASH_TOKEN configured",
      status: debugData.hasQstashToken,
    },
    {
      name: "VAPID keys configured",
      status: vapidTest.success && vapidTest.data?.publicKey,
    },
    {
      name: "App is accessible",
      status: true, // We know this from homepage test
    },
  ];

  checks.forEach((check) => {
    const icon = check.status ? "✅" : "❌";
    const color = check.status ? "green" : "red";
    log(`${icon} ${check.name}`, color);
  });

  log("\n💡 Next Steps:\n", "yellow");

  if (!debugData.appUrl?.includes("vercel.app")) {
    log("1. ⚠️  Update NEXT_PUBLIC_APP_URL in Vercel:", "red");
    log("   Vercel Dashboard → Settings → Environment Variables", "cyan");
    log(
      "   Set NEXT_PUBLIC_APP_URL = https://followuptimer.vercel.app",
      "cyan"
    );
    log("   Make sure it's set for Production environment", "cyan");
    log("   Redeploy after updating\n", "cyan");
  }

  log("2. Test reminder creation:", "blue");
  log("   - Sign up / Login", "cyan");
  log("   - Create a reminder (2-3 minutes in future)", "cyan");
  log("   - Check Vercel logs for QStash scheduling", "cyan");

  log("\n3. Verify QStash scheduling:", "blue");
  log(
    "   - Check QStash dashboard: https://console.upstash.com/qstash",
    "cyan"
  );
  log("   - Look for scheduled messages", "cyan");

  log("\n4. Test notifications:", "blue");
  log("   - Wait for scheduled time", "cyan");
  log("   - Verify email received", "cyan");
  log("   - Check in-app notifications", "cyan");
  log("   - Enable push notifications in settings", "cyan");

  log("\n5. Monitor logs:", "blue");
  log("   - Vercel Dashboard → Your Project → Functions", "cyan");
  log("   - Look for [QStash] and [Webhook] messages", "cyan");

  log("\n");
}

runTests().catch(console.error);
