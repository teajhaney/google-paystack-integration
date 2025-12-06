import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoogleTokenResponse, GoogleUserInfo } from 'src/interface';

// Google OAuth Service

@Injectable()
export class GoogleOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly googleAuthUrl =
    'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly googleTokenUrl = 'https://oauth2.googleapis.com/token';
  private readonly googleUserInfoUrl =
    'https://www.googleapis.com/oauth2/v2/userinfo';

  constructor(private configService: ConfigService) {
    // Load configuration from environment variables
    const clientId = this.configService.get<string>('google.clientId');
    const clientSecret = this.configService.get<string>('google.clientSecret');
    const redirectUri = this.configService.get<string>('google.redirectUri');

    // Validate that all required config is present
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'Google OAuth configuration is missing. Please check your .env file.',
      );
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  //Generate the Google OAuth authorization URL with all required parameters
  // This URL is where users will be redirected to sign in with Google.

  getAuthUrl(): string {
    // Build the authorization URL with required OAuth 2.0 parameters
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile', // What information we're requesting
      // openid: Required for OpenID Connect
      // email: User's email address
      // profile: User's basic profile info (name, picture)
      access_type: 'offline', // Request a refresh token (for long-lived access)
      prompt: 'consent', // Force Google to show consent screen (ensures refresh token)
    });

    const authUrl = `${this.googleAuthUrl}?${params.toString()}`;

    // Log the redirect URI being used (for debugging)
    console.log(
      'Generated Google Auth URL with redirect_uri:',
      this.redirectUri,
    );

    return authUrl;
  }

  // Exchange authorization code for access token

  async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    try {
      console.log('Exchanging code for token:', {
        code_length: code.length,
        redirect_uri: this.redirectUri,
        client_id: this.clientId.substring(0, 20) + '...',
      });

      // Make a POST request to Google's token endpoint
      const response = await axios.post<GoogleTokenResponse>(
        this.googleTokenUrl,
        {
          code, // The authorization code from the redirect
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code', // OAuth 2.0 grant type
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data;
    } catch (error) {
      // Handle errors from Google's API
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as
          | { error?: string; error_description?: string }
          | undefined;

        // Log detailed error for debugging
        console.error('Google OAuth Token Exchange Error:', {
          status: error.response?.status,
          error: errorData?.error,
          error_description: errorData?.error_description,
          redirect_uri: this.redirectUri,
        });

        const errorType = errorData?.error || 'unknown_error';
        const errorDescription =
          errorData?.error_description || 'Failed to exchange code for token';

        // Provide more helpful error messages
        let userMessage = errorDescription;
        if (errorType === 'invalid_grant') {
          userMessage =
            'Authorization code expired or already used. Please start the OAuth flow again.';
        } else if (errorType === 'redirect_uri_mismatch') {
          userMessage = `Redirect URI mismatch. Expected: ${this.redirectUri}. Please check your Google Cloud Console configuration.`;
        }

        throw new UnauthorizedException(`Google OAuth error: ${userMessage}`);
      }
      throw new BadRequestException('Failed to exchange authorization code');
    }
  }

  // Fetch user information from Google using access token

  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      // Make a GET request to Google's userinfo endpoint
      const response = await axios.get<GoogleUserInfo>(this.googleUserInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Include token in Authorization header
        },
      });

      return response.data;
    } catch (error) {
      // Handle errors
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as
          | { error?: { message?: string } }
          | undefined;
        const message =
          errorData?.error?.message || 'Failed to fetch user info';
        throw new UnauthorizedException(`Google API error: ${message}`);
      }
      throw new BadRequestException('Failed to fetch user information');
    }
  }
}
