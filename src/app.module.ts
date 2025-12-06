import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import config from './config/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    PrismaModule, // Database module
    AuthModule, // Authentication module (Google OAuth)
    PaymentsModule, // Payments module (Paystack)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
