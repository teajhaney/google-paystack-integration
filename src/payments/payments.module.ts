import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule], // Import AuthModule to use JWT guard
  controllers: [PaymentsController], // Register the controller
  providers: [PaymentsService, PaystackService], // Register the services
  exports: [PaymentsService], // Export PaymentsService in case other modules need it
})
export class PaymentsModule {}
