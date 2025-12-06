import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Google OAuth Service
 *
 * This service handles all interactions with Google's OAuth 2.0 API.
 *
 * OAuth 2.0 Flow Explanation:
 * 1. User clicks "Sign in with Google" → Redirect to Google
 * 2. User authorizes → Google redirects back with a "code"
 * 3. We exchange the "code" for an "access_token"
 * 4. We use the "access_token" to get user information
 */

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string; // Google's unique user ID
  email: string;
  verified_email: boolean;
  name: string;
  picture: string;
  given_name?: string;
  family_name?: string;
}

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

  /**
   * Generate the Google OAuth authorization URL
   *
   * This URL is where users will be redirected to sign in with Google.
   *
   * @returns The full Google OAuth URL with all required parameters
   */
  getAuthUrl(): string {
    // Build the authorization URL with required OAuth 2.0 parameters
    const params = new URLSearchParams({
      client_id: this.clientId, // Your app's client ID
      redirect_uri: this.redirectUri, // Where Google should send the user after authorization
      response_type: 'code', // We want an authorization code (not a token directly)
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

  /**
   * Exchange authorization code for access token
   *
   * After Google redirects back with a "code", we exchange it for an access token.
   * This is a server-to-server call (never expose the client secret to the browser).
   *
   * @param code - The authorization code from Google's redirect
   * @returns Access token and related information
   */
  async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    try {
      // Log the request details for debugging (without exposing secrets)
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
          client_secret: this.clientSecret, // Secret key (never expose this!)
          redirect_uri: this.redirectUri, // Must match the redirect_uri used in getAuthUrl()
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

  /**
   * Fetch user information from Google using access token
   *
   * Once we have an access token, we can use it to get the user's profile information.
   *
   * @param accessToken - The access token obtained from exchangeCodeForToken
   * @returns User information (email, name, picture, etc.)
   */
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
