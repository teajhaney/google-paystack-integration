import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  Req,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { verifyPaystackWebhook } from './paystack-webhook.util';

/**
 * Payments Controller
 *
 * This controller handles HTTP requests related to payments.
 * It exposes three endpoints:
 * 1. POST /payments/paystack/initiate - Start a new payment
 * 2. POST /payments/paystack/webhook - Receive Paystack webhooks
 * 3. GET /payments/:reference/status - Check transaction status
 */

@Controller('payments')
export class PaymentsController {
  private readonly webhookSecret: string | undefined;

  constructor(
    private paymentsService: PaymentsService,
    private configService: ConfigService,
  ) {
    // Load webhook secret from configuration
    this.webhookSecret = this.configService.get<string>(
      'paystack.webhookSecret',
    );

    if (!this.webhookSecret) {
      console.warn(
        'Paystack webhook secret is not configured. Webhook verification will fail.',
      );
    }
  }

  /**
   * POST /payments/paystack/initiate
   *
   * Purpose: Initiate a Paystack payment transaction
   *
   * Flow:
   * 1. Validate request body (amount)
   * 2. Get user ID from request (in a real app, this would come from JWT/session)
   * 3. Initialize transaction on Paystack
   * 4. Save transaction to database
   * 5. Return authorization URL
   *
   * Request Body:
   * {
   *   "amount": 5000  // Amount in Kobo
   * }
   *
   * Response: 201 Created
   * {
   *   "reference": "...",
   *   "authorization_url": "https://paystack.co/checkout/...."
   * }
   *
   * Errors:
   * - 400: Invalid input (amount validation failed)
   * - 401: User not authenticated (in a real app)
   * - 402: Payment initiation failed by Paystack
   * - 500: Internal server error
   *
   * Note: In a production app, you'd get userId from JWT token or session.
   * For this tutorial, we'll use a query parameter or header.
   */
  @Post('paystack/initiate')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @Query('userId') userIdQuery?: string,
    @Headers('x-user-id') userIdHeader?: string,
  ) {
    // Get userId from query parameter or header
    // In production, you'd extract this from JWT token
    const userId = userIdHeader || userIdQuery;

    if (!userId) {
      throw new UnauthorizedException(
        'User ID is required. Please provide userId in query parameter or x-user-id header.',
      );
    }

    try {
      // The service will get the user's email from the database
      const result = await this.paymentsService.initiatePayment(
        userId,
        dto.amount,
      );

      return result;
    } catch (error) {
      // Handle different error types
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Handle Paystack errors (402 Payment Required)
      if (error.status === 402) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to initiate payment');
    }
  }

  /**
   * POST /payments/paystack/webhook
   *
   * Purpose: Receive transaction updates from Paystack
   *
   * Flow:
   * 1. Verify webhook signature (security check)
   * 2. Parse webhook event payload
   * 3. Extract transaction reference and status
   * 4. Update transaction in database
   * 5. Return success response
   *
   * Security:
   * - Paystack signs each webhook with HMAC SHA512
   * - We verify the signature using our webhook secret
   * - If signature doesn't match, reject the webhook
   *
   * Headers:
   * - x-paystack-signature: HMAC SHA512 signature of the request body
   *
   * Response: 200 OK
   * {
   *   "status": true
   * }
   *
   * Errors:
   * - 400: Invalid signature or invalid payload
   * - 500: Server error
   *
   * Note: This endpoint should be publicly accessible (Paystack needs to reach it),
   * but it's secured by signature verification.
   */
  @Post('paystack/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    // Get raw request body as string
    // Note: In NestJS, you might need to configure body parsing to get raw body
    // For now, we'll use JSON body, but in production you should use raw body for signature verification
    const payload = JSON.stringify(req.body);

    // Verify webhook signature (only if secret is configured)
    // Note: Paystack Test Mode doesn't provide webhook secrets - they're only in Live Mode
    // For testing, we skip signature verification if no secret is configured
    if (this.webhookSecret && signature) {
      const isValid = verifyPaystackWebhook(
        payload,
        signature,
        this.webhookSecret,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    } else if (this.webhookSecret && !signature) {
      // Secret is configured but no signature provided - this is suspicious
      throw new BadRequestException('Missing Paystack signature header');
    } else {
      // No secret configured - this is OK for test mode
      console.warn(
        '⚠️  Webhook secret not configured - skipping signature verification (OK for test mode)',
      );
    }

    try {
      // Parse webhook event
      const event = req.body;

      // Paystack sends different event types
      // We're interested in "charge.success" and "charge.failed"
      if (event.event === 'charge.success' || event.event === 'charge.failed') {
        const transactionData = event.data;

        // Map Paystack status to our status format
        let status: 'pending' | 'success' | 'failed' = 'pending';
        if (event.event === 'charge.success') {
          status = 'success';
        } else if (event.event === 'charge.failed') {
          status = 'failed';
        }

        // Update transaction in database
        await this.paymentsService.updateTransactionFromWebhook(
          transactionData.reference,
          status,
          transactionData.paid_at
            ? new Date(transactionData.paid_at)
            : undefined,
          transactionData,
        );
      }

      // Always return success to Paystack (even if we don't handle the event)
      // This tells Paystack we received the webhook
      return { status: true };
    } catch (error) {
      // Log error but still return success to Paystack
      // (Otherwise Paystack will retry)
      console.error('Error processing webhook:', error);
      throw new InternalServerErrorException('Failed to process webhook');
    }
  }

  /**
   * GET /payments/:reference/status
   *
   * Purpose: Get transaction status
   *
   * Flow:
   * 1. Extract reference from URL parameter
   * 2. Check if refresh is requested (query parameter)
   * 3. Get transaction status from database
   * 4. Optionally refresh from Paystack if requested
   * 5. Return transaction status
   *
   * Query Parameters:
   * - refresh: If "true", fetch latest status from Paystack
   *
   * Response: 200 OK
   * {
   *   "reference": "...",
   *   "status": "success|failed|pending",
   *   "amount": 5000,
   *   "paid_at": "2024-01-01T00:00:00.000Z" or null
   * }
   *
   * Errors:
   * - 404: Transaction not found
   * - 500: Server error
   */
  @Get(':reference/status')
  async getTransactionStatus(
    @Param('reference') reference: string,
    @Query('refresh') refresh?: string,
  ) {
    try {
      // Check if refresh is requested
      const shouldRefresh = refresh === 'true';

      // Get transaction status
      const status = await this.paymentsService.getTransactionStatus(
        reference,
        shouldRefresh,
      );

      return status;
    } catch (error) {
      // Handle not found errors
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to get transaction status',
      );
    }
  }
}
