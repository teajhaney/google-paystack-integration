import { IsInt, IsPositive, Min } from 'class-validator';

export class InitiatePaymentDto {
  @IsInt({ message: 'Amount must be an integer' })
  @IsPositive({ message: 'Amount must be positive' })
  @Min(100, { message: 'Amount must be at least 100 Kobo (1 Naira)' })
  amount: number; // Amount in Kobo (lowest currency unit)
}
