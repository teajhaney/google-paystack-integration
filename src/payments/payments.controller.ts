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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { verifyPaystackWebhook } from './paystack-webhook.util';
import type { PaystackWebhookEvent } from '../interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import type { UserPayload } from '../auth/user.decorator';

//Payments Controller
// This controller handles HTTP requests related to payments.

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

  //Initiate a Paystack payment transaction
  // Requires JWT authentication - user must be authenticated to make payments

  @Post('paystack/initiate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @User() user: UserPayload,
  ) {
    try {
      // Get userId from authenticated JWT token
      const userId = user.userId;

      // The service will get the user's email from the database
      // If reference is provided and transaction exists, it will return the existing transaction
      const reference = dto.reference as string | undefined;
      const result = await this.paymentsService.initiatePayment(
        userId,
        dto.amount,
        reference,
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
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        typeof (error as { status: unknown }).status === 'number' &&
        (error as { status: number }).status === 402
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to initiate payment');
    }
  }

  //Receive transaction updates from Paystack

  @Post('paystack/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    const payload = JSON.stringify(req.body);

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
      const event = req.body as PaystackWebhookEvent;

      console.log('Received Paystack webhook event:', event.event);

      // Paystack sends different event types
      if (event.event === 'charge.success' || event.event === 'charge.failed') {
        const transactionData = event.data;

        // Map Paystack status to our status format
        let status: 'pending' | 'success' | 'failed' = 'pending';
        if (event.event === 'charge.success') {
          status = 'success';
        } else if (event.event === 'charge.failed') {
          status = 'failed';
        }

        console.log(
          `Updating transaction ${transactionData.reference} to status: ${status}`,
        );

        // Update transaction in database
        await this.paymentsService.updateTransactionFromWebhook(
          transactionData.reference,
          status,
          transactionData.paid_at
            ? new Date(transactionData.paid_at)
            : undefined,
          transactionData.metadata,
        );

        console.log(
          `Successfully updated transaction ${transactionData.reference}`,
        );
      } else {
        console.log(`Unhandled webhook event type: ${event.event}`);
      }

      return { status: true };
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw new InternalServerErrorException('Failed to process webhook');
    }
  }

  //  Get transaction status
  // Requires JWT authentication - users can only check their own transactions

  @Get(':reference/status')
  @UseGuards(JwtAuthGuard)
  async getTransactionStatus(
    @Param('reference') reference: string,
    @User() user: UserPayload,
    @Query('refresh') refresh?: string,
  ) {
    try {
      // Check if refresh is requested
      const shouldRefresh = refresh === 'true';

      // Get transaction status (service will verify ownership)
      const status = await this.paymentsService.getTransactionStatus(
        reference,
        shouldRefresh,
        user.userId,
      );

      return status;
    } catch (error) {
      // Handle not found errors
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Handle unauthorized errors
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to get transaction status',
      );
    }
  }
}
