import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Payments Module
 *
 * This module encapsulates all payment-related functionality.
 * It provides:
 * - Paystack service (API integration)
 * - Payments service (business logic)
 * - Payments controller (HTTP endpoints)
 */
@Module({
  imports: [PrismaModule], // Import PrismaModule to use PrismaService
  controllers: [PaymentsController], // Register the controller
  providers: [PaymentsService, PaystackService], // Register the services
  exports: [PaymentsService], // Export PaymentsService in case other modules need it
})
export class PaymentsModule {}
