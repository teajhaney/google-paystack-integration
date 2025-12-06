import { IsInt, IsPositive, Min } from 'class-validator';

/**
 * DTO (Data Transfer Object) for initiating a Paystack payment
 *
 * This class validates the incoming request body to ensure:
 * - amount is provided
 * - amount is a number (integer)
 * - amount is positive (greater than 0)
 * - amount is at least 100 Kobo (minimum transaction amount)
 */
export class InitiatePaymentDto {
  @IsInt({ message: 'Amount must be an integer' })
  @IsPositive({ message: 'Amount must be positive' })
  @Min(100, { message: 'Amount must be at least 100 Kobo (1 Naira)' })
  amount: number; // Amount in Kobo (lowest currency unit)
}
