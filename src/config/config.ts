export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET,

  // Google OAuth 2.0 Configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID, // Your Google OAuth Client ID
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Your Google OAuth Client Secret
    redirectUri: process.env.GOOGLE_REDIRECT_URI, // Your callback URL (e.g., http://localhost:3000/auth/google/callback)
  },

  // Paystack Configuration
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY, // Your Paystack Secret Key (starts with sk_)
    publicKey: process.env.PAYSTACK_PUBLIC_KEY, // Your Paystack Public Key (starts with pk_)
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET, // Secret for verifying webhook signatures
    baseUrl: 'https://api.paystack.co', // Paystack API base URL
  },
});
