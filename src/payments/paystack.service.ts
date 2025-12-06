import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PaystackInitialiseRequestBody } from 'src/interface';

/**
 * Paystack Service
 *
 * This service handles all interactions with Paystack's API.
 *
 * Paystack Payment Flow:
 * 1. User wants to make a payment
 * 2. We call Paystack to initialize a transaction
 * 3. Paystack returns an authorization URL
 * 4. User completes payment on Paystack
 * 5. Paystack sends a webhook or we verify the transaction
 * 6. We update the transaction status in our database
 */

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string; // URL where user can complete payment
    access_code: string;
    reference: string; // Unique transaction reference (we use this as idempotency key)
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string; // "success", "failed", "pending", etc.
    reference: string;
    amount: number; // Amount in Kobo
    currency: string;
    paid_at: string | null; // ISO date string when payment was completed
    created_at: string;
    metadata: any;
    // ... other fields
  };
}

@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  private readonly publicKey: string;
  private readonly baseUrl: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(private configService: ConfigService) {
    // Load configuration
    const secretKey = this.configService.get<string>('paystack.secretKey');
    const publicKey = this.configService.get<string>('paystack.publicKey');
    this.baseUrl =
      this.configService.get<string>('paystack.baseUrl') ||
      'https://api.paystack.co';

    // Validate configuration
    if (!secretKey || !publicKey) {
      throw new Error(
        'Paystack configuration is missing. Please check your .env file.',
      );
    }

    this.secretKey = secretKey;
    this.publicKey = publicKey;

    // Create an axios instance with default headers for Paystack API
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.secretKey}`, // Paystack uses Bearer token authentication
        'Content-Type': 'application/json',
      },
    });
  }

  // Initialize a Paystack transaction
  // This creates a new payment transaction on Paystack's side.

  async initializeTransaction(
    amount: number,
    email: string,
    reference?: string,
  ): Promise<{ reference: string; authorizationUrl: string }> {
    try {
      // Prepare the request body for Paystack
      const requestBody: PaystackInitialiseRequestBody = {
        amount,
        email,
        currency: 'NGN',
      };

      // If a reference is provided, use it (for idempotency)
      if (reference) {
        requestBody.reference = reference;
      }

      // Make POST request to Paystack's initialize transaction endpoint
      const response =
        await this.axiosInstance.post<PaystackInitializeResponse>(
          '/transaction/initialize',
          requestBody,
        );

      // Check if Paystack returned an error
      if (!response.data.status) {
        throw new HttpException(
          `Paystack error: ${response.data.message}`,
          HttpStatus.PAYMENT_REQUIRED, // 402
        );
      }

      return {
        reference: response.data.data.reference,
        authorizationUrl: response.data.data.authorization_url,
      };
    } catch (error) {
      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as
          | { message?: string }
          | undefined;
        const message =
          errorData?.message || 'Failed to initialize Paystack transaction';
        throw new HttpException(
          `Paystack API error: ${message}`,
          HttpStatus.PAYMENT_REQUIRED, // 402
        );
      }

      // Re-throw if it's already an HttpException with 402 status
      if (error instanceof HttpException && error.getStatus() === 402) {
        throw error;
      }

      throw new BadRequestException('Failed to initialize payment transaction');
    }
  }

  // Verify a Paystack transaction
  // This checks the current status of a transaction on Paystack's side.

  async verifyTransaction(
    reference: string,
  ): Promise<PaystackVerifyResponse['data']> {
    try {
      // Make GET request to Paystack's verify endpoint
      const response = await this.axiosInstance.get<PaystackVerifyResponse>(
        `/transaction/verify/${reference}`,
      );

      // Check if Paystack returned an error
      if (!response.data.status) {
        throw new BadRequestException(
          `Paystack error: ${response.data.message}`,
        );
      }

      return response.data.data;
    } catch (error) {
      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as
          | { message?: string }
          | undefined;
        const message =
          errorData?.message || 'Failed to verify Paystack transaction';
        throw new BadRequestException(`Paystack API error: ${message}`);
      }

      // Re-throw if it's already a BadRequestException
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to verify transaction');
    }
  }
}
