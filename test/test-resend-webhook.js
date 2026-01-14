#!/usr/bin/env node
/**
 * Test script for email open tracking via Resend webhooks
 * Tests the webhook endpoint with mock data
 */

const crypto = require('crypto');

const WEBHOOK_URL =
  process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/resend';
const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || 'test_secret_key';

/**
 * Generate Resend-style webhook signature
 */
function generateSignature(body, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${body}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedPayload);
  const signature = hmac.digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Send webhook to test endpoint
 */
async function testWebhook(emailId) {
  const payload = {
    type: 'email.opened',
    data: {
      email_id: emailId,
      created_at: new Date().toISOString(),
    },
  };

  const body = JSON.stringify(payload);
  const signature = generateSignature(body, WEBHOOK_SECRET);

  console.log('🧪 Testing Resend webhook endpoint\n');
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('Email ID:', emailId);
  console.log('Signature:', signature.substring(0, 50) + '...\n');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'resend-signature': signature,
      },
      body,
    });

    console.log('Response status:', response.status);
    console.log('Response:', await response.json());

    if (response.status === 200) {
      console.log('\n✅ Webhook test successful!');
      console.log('\nNext steps:');
      console.log('1. Check Vercel logs for "[Resend Webhook]" messages');
      console.log('2. Query sent_emails table:');
      console.log(
        `   SELECT * FROM sent_emails WHERE resend_email_id = '${emailId}';`
      );
      console.log('3. Check events table for email_opened event');
      console.log('4. Check popups table for new popup');
    } else {
      console.log('\n❌ Webhook test failed');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Is the app running? (npm run dev)');
    console.log('2. Is RESEND_WEBHOOK_SECRET set?');
    console.log('3. Does the email ID exist in sent_emails table?');
  }
}

// Get email ID from command line or use test ID
const emailId = process.argv[2] || 're_test_12345';

testWebhook(emailId);
