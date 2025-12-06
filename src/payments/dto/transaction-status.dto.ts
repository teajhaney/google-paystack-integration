/**
 * DTO for transaction status response
 *
 * This defines the structure of the response when checking transaction status
 */
export class TransactionStatusDto {
  reference: string; // Paystack transaction reference
  status: 'pending' | 'success' | 'failed'; // Transaction status
  amount: number; // Amount in Kobo
  paidAt: string | null; // ISO date string when payment was completed, or null
}
