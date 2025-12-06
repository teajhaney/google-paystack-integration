import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleOAuthService } from './google-oauth.service';

/**
 * Auth Service
 *
 * This service handles user authentication and database operations.
 * It uses the GoogleOAuthService to interact with Google, then saves/updates user data.
 */

// interface GoogleUserInfo {
//   id: string;
//   email: string;
//   verified_email: boolean;
//   name: string;
//   picture: string;
// }

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService, // Database service
    private googleOAuth: GoogleOAuthService, // Google OAuth service
  ) {}

  /**
   * Get the Google OAuth authorization URL
   *
   * This is a simple pass-through to the GoogleOAuthService.
   */
  getGoogleAuthUrl(): string {
    return this.googleOAuth.getAuthUrl();
  }

  /**
   * Handle Google OAuth callback
   *
   * This method:
   * 1. Exchanges the authorization code for an access token
   * 2. Fetches user information from Google
   * 3. Creates or updates the user in our database
   *
   * @param code - Authorization code from Google's redirect
   * @returns User information from our database
   */
  async handleGoogleCallback(code: string) {
    // Step 1: Exchange code for access token
    const tokenResponse = await this.googleOAuth.exchangeCodeForToken(code);

    // Step 2: Get user info from Google using the access token
    const googleUser = await this.googleOAuth.getUserInfo(
      tokenResponse.access_token,
    );

    // Step 3: Create or update user in database
    // We use "upsert" which means:
    // - If user exists (by googleId), update their information
    // - If user doesn't exist, create a new user
    const user = await this.prisma.user.upsert({
      where: {
        googleId: googleUser.id, // Find by Google ID
      },
      update: {
        // If user exists, update these fields
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        updatedAt: new Date(),
      },
      create: {
        // If user doesn't exist, create with these fields
        googleId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      },
    });

    return {
      user_id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    };
  }
}
