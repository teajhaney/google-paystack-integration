import { IsInt, IsPositive, Min, IsOptional, IsString } from 'class-validator';

export class InitiatePaymentDto {
  @IsInt({ message: 'Amount must be an integer' })
  @IsPositive({ message: 'Amount must be positive' })
  @Min(100, { message: 'Amount must be at least 100 Kobo (1 Naira)' })
  amount: number; // Amount in Kobo (lowest currency unit)

  @IsOptional()
  @IsString({ message: 'Reference must be a string' })
  reference?: string; // Optional transaction reference for idempotency
}
