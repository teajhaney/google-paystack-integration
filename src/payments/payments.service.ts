import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from './paystack.service';

// Payments Service
// This service handles payment-related business logic and database operations.
// It coordinates between Paystack API and our database.

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService, // Database service
    private paystackService: PaystackService, // Paystack API service
  ) {}

  // Initiate a payment transaction

  async initiatePayment(userId: string, amount: number, reference?: string) {
    // Check if user exists and get their email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Use the user's email from database
    const userEmail = user.email;

    // If reference is provided, check for existing transaction (idempotency)

    if (reference) {
      const existingTransaction = await this.prisma.transaction.findUnique({
        where: { reference },
      });

      if (existingTransaction) {
        // Transaction already exists - return it (idempotency)
        // But only if it belongs to the same user (security check)
        if (existingTransaction.userId !== userId) {
          throw new UnauthorizedException(
            'This transaction reference belongs to another user',
          );
        }

        return {
          reference: existingTransaction.reference,
          authorization_url: existingTransaction.authorizationUrl,
        };
      }
    }

    // Initialize transaction on Paystack
    const paystackResponse = await this.paystackService.initializeTransaction(
      amount,
      userEmail,
      reference,
    );

    // Step 4: Save transaction to database
    const transaction = await this.prisma.transaction.create({
      data: {
        reference: paystackResponse.reference,
        amount,
        status: 'pending', // Initial status
        authorizationUrl: paystackResponse.authorizationUrl,
        userId,
      },
    });

    return {
      reference: transaction.reference,
      authorization_url: transaction.authorizationUrl,
    };
  }

  // Get transaction status

  async getTransactionStatus(reference: string, refresh: boolean = false) {
    // Step 1: Find transaction in database
    let transaction = await this.prisma.transaction.findUnique({
      where: { reference },
      include: { user: true }, // Include user information
    });

    if (!transaction) {
      // If transaction doesn't exist in DB and refresh is requested, try Paystack
      if (refresh) {
        try {
          // Verify if transaction exists on Paystack
          await this.paystackService.verifyTransaction(reference);

          throw new NotFoundException(
            'Transaction not found in database. Please initiate the transaction first.',
          );
        } catch (error) {
          if (error instanceof NotFoundException) {
            throw error;
          }
          throw new NotFoundException('Transaction not found');
        }
      } else {
        throw new NotFoundException('Transaction not found');
      }
    }

    // If refresh is requested, get latest status from Paystack
    if (refresh) {
      try {
        const paystackData =
          await this.paystackService.verifyTransaction(reference);

        // Map Paystack status to our status format
        let status: 'pending' | 'success' | 'failed' = 'pending';
        if (paystackData.status === 'success') {
          status = 'success';
        } else if (paystackData.status === 'failed') {
          status = 'failed';
        }

        // Update transaction in database
        transaction = await this.prisma.transaction.update({
          where: { reference },
          data: {
            status,
            paidAt: paystackData.paid_at
              ? new Date(paystackData.paid_at)
              : null,
            metadata: (paystackData.metadata as Prisma.InputJsonValue) || {},
            updatedAt: new Date(),
          },
          include: { user: true },
        });
      } catch (error) {
        // If Paystack verification fails, return DB status
        // Log the error in production
        console.error(
          'Failed to refresh transaction status from Paystack:',
          error,
        );
      }
    }

    // Step 3: Return transaction status
    // Transaction is guaranteed to be non-null here because we throw if it's null earlier
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      reference: transaction.reference,
      status: transaction.status as 'pending' | 'success' | 'failed',
      amount: transaction.amount,
      paid_at: transaction.paidAt?.toISOString() || null,
    };
  }

  // Update transaction status from webhook
  // This method is called when Paystack sends a webhook notification.
  // It updates the transaction status in our database.

  async updateTransactionFromWebhook(
    reference: string,
    status: 'pending' | 'success' | 'failed',
    paidAt?: Date,
    metadata?: Record<string, unknown>,
  ) {
    // Update transaction in database
    await this.prisma.transaction.update({
      where: { reference },
      data: {
        status,
        paidAt: paidAt || null,
        metadata: (metadata as Prisma.InputJsonValue) || {},
        updatedAt: new Date(),
      },
    });
  }
}
