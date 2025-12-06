import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import config from './config/config';

/**
 * App Module (Root Module)
 *
 * This is the root module of the application.
 * It imports all feature modules and configuration.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make ConfigModule available globally
      load: [config], // Load custom configuration
    }),
    PrismaModule, // Database module
    AuthModule, // Authentication module (Google OAuth)
    PaymentsModule, // Payments module (Paystack)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
