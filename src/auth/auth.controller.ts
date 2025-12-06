import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * GET /auth/google
   *
   * Purpose: Trigger Google sign-in flow
   *
   * This endpoint can work in two ways:
   * 1. Redirect mode: Returns a 302 redirect to Google (for browser-based flows)
   * 2. JSON mode: Returns the Google auth URL in JSON (for API clients)
   *
   * Query parameters:
   * - redirect: If "true", performs a 302 redirect. Otherwise, returns JSON.
   *
   * Response options:
   * - 302 Redirect → Google OAuth URL
   * - 200 JSON → { "google_auth_url": "https://accounts.google.com/...." }
   */
  @Get('google')
  initiateGoogleAuth(
    @Query('redirect') redirect?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    try {
      // Get the Google OAuth URL
      const googleAuthUrl = this.authService.getGoogleAuthUrl();

      // If redirect=true, perform a 302 redirect
      if (redirect === 'true') {
        if (!res) {
          throw new InternalServerErrorException(
            'Response object is required for redirect',
          );
        }
        return res.redirect(302, googleAuthUrl);
      }

      // Otherwise, return JSON with the URL

      return {
        google_auth_url: googleAuthUrl,
      };
    } catch (error) {
      // Handle configuration errors
      if (error instanceof Error && error.message.includes('configuration')) {
        throw new BadRequestException(
          'Google OAuth is not properly configured',
        );
      }
      throw new InternalServerErrorException(
        'Failed to initiate Google sign-in',
      );
    }
  }

  //Purpose: Show current Google OAuth configuration (for debugging)

  @Get('google/config')
  getGoogleConfig() {
    const authUrl = this.authService.getGoogleAuthUrl();
    const urlObj = new URL(authUrl);
    const redirectUri = urlObj.searchParams.get('redirect_uri');

    return {
      message: 'Google OAuth Configuration',
      redirect_uri: redirectUri,
      note: 'This redirect_uri MUST match EXACTLY in Google Cloud Console',
      instructions: [
        '1. Go to https://console.cloud.google.com/',
        '2. Select your project',
        '3. APIs & Services → Credentials',
        '4. Click your OAuth 2.0 Client ID',
        '5. Check "Authorized redirect URIs"',
        `6. Ensure it includes: ${redirectUri}`,
      ],
    };
  }

  // Handle Google OAuth callback

  @Get('google/callback')
  async handleGoogleCallback(
    @Query('code') code?: string,
    @Query('error') error?: string,
  ) {
    // Check if user denied authorization
    if (error) {
      throw new BadRequestException(`Google authorization denied: ${error}`);
    }

    // Check if authorization code is missing
    if (!code) {
      throw new BadRequestException('Authorization code is missing');
    }

    try {
      // Handle the callback and get user information
      const user = await this.authService.handleGoogleCallback(code);

      // Return user info with a success message
      return {
        success: true,
        message: 'Google sign-in successful',
        ...user,
      };
    } catch (error) {
      // Handle different types of errors
      if (error instanceof BadRequestException) {
        throw error; // Re-throw validation errors
      }

      if (error instanceof HttpException) {
        const status = error.getStatus();
        if (status === 400 || status === 401) {
          throw error; // Re-throw validation/authentication errors
        }
      }

      // Handle unexpected errors
      throw new InternalServerErrorException(
        'Failed to complete Google sign-in',
      );
    }
  }
}
