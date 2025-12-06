import { createHmac } from 'crypto';

// Paystack Webhook Utility
// This utility verifies that webhook requests are actually from Paystack.

export function verifyPaystackWebhook(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    // Create HMAC SHA512 hash of the payload using the secret
    const hash = createHmac('sha512', secret)
      .update(payload) // Hash the raw request body
      .digest('hex'); // Convert to hexadecimal string

    // Compare our hash with Paystack's signature
    // Use timing-safe comparison to prevent timing attacks
    return hash === signature;
  } catch (error) {
    // If anything goes wrong, reject the webhook
    console.log(error);
    return false;
  }
}
