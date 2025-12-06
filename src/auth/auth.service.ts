import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleOAuthService } from './google-oauth.service';

// Auth Service
// It uses the GoogleOAuthService to interact with Google, then saves/updates user data.

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService, // Database service
    private googleOAuth: GoogleOAuthService, // Google OAuth service
  ) {}

  // Get the Google OAuth authorization URL

  getGoogleAuthUrl(): string {
    return this.googleOAuth.getAuthUrl();
  }

  //Handle Google OAuth callback

  async handleGoogleCallback(code: string) {
    // Exchange code for access token
    const tokenResponse = await this.googleOAuth.exchangeCodeForToken(code);

    // Get user info from Google using the access token
    const googleUser = await this.googleOAuth.getUserInfo(
      tokenResponse.access_token,
    );

    //Create or update user in database using upsert method
    const user = await this.prisma.user.upsert({
      where: {
        googleId: googleUser.id,
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
