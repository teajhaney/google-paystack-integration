export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface GoogleUserInfo {
  id: string; // Google's unique user ID
  email: string;
  verified_email: boolean;
  name: string;
  picture: string;
  given_name?: string;
  family_name?: string;
}

export interface PaystackInitializeResponse {
  amount: number;
  email: string;
  reference?: string;
}

export interface PaystackInitialiseRequestBody {
  amount: number;
  email: string;
  currency?: string;
  reference?: string;
}

export interface PaystackWebhookTransactionData {
  id: number;
  domain: string;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PaystackWebhookEvent {
  event: string;
  data: PaystackWebhookTransactionData;
}
