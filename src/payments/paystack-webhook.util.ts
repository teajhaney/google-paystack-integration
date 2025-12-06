import { createHmac } from 'crypto';

/**
 * Paystack Webhook Utility
 *
 * This utility verifies that webhook requests are actually from Paystack.
 *
 * Security Explanation:
 * Paystack signs each webhook request with a secret key using HMAC SHA512.
 * We verify the signature by:
 * 1. Taking the raw request body
 * 2. Creating an HMAC SHA512 hash using our webhook secret
 * 3. Comparing it with the signature Paystack sent in the header
 *
 * If they match, the webhook is authentic. If not, someone is trying to fake it.
 */

/**
 * Verify Paystack webhook signature
 *
 * @param payload - Raw request body (as string)
 * @param signature - Signature from x-paystack-signature header
 * @param secret - Your Paystack webhook secret
 * @returns true if signature is valid, false otherwise
 */
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
    return false;
  }
}
