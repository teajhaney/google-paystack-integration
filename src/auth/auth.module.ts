import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Auth Module
 *
 * This module encapsulates all authentication-related functionality.
 * It provides:
 * - Google OAuth service
 * - Auth service (user management)
 * - Auth controller (HTTP endpoints)
 */
@Module({
  imports: [PrismaModule], // Import PrismaModule to use PrismaService
  controllers: [AuthController], // Register the controller
  providers: [AuthService, GoogleOAuthService], // Register the services
  exports: [AuthService], // Export AuthService in case other modules need it
})
export class AuthModule {}
