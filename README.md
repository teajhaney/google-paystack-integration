# Google Sign-In & Paystack Payment Backend

A NestJS backend application that implements Google OAuth 2.0 authentication and Paystack payment processing. This project demonstrates how to integrate third-party services (Google and Paystack) into a secure, production-ready backend system.

## 🚀 Features

- **Google OAuth 2.0 Authentication**: Secure user authentication using Google Sign-In
- **Paystack Payment Integration**: Complete payment processing with transaction management
- **Webhook Support**: Secure webhook handling for real-time payment status updates
- **Database Integration**: PostgreSQL database with Prisma ORM (Neon PostgreSQL compatible)
- **Input Validation**: Request validation using class-validator
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes
- **Idempotency**: Prevents duplicate transactions
- **Security**: Webhook signature verification and secure credential management

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- A **Neon PostgreSQL** database account ([Get one here](https://console.neon.tech))
- A **Google Cloud Platform** account with OAuth credentials
- A **Paystack** account with API keys

## 🛠️ Installation

1. **Clone the repository** (or navigate to the project directory)

```bash
cd google-paystack
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000

# Database Configuration (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/auth/google/callback"

# Paystack Configuration
PAYSTACK_SECRET_KEY="sk_test_xxxxxxxxxxxxx"
PAYSTACK_PUBLIC_KEY="pk_test_xxxxxxxxxxxxx"
PAYSTACK_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxx"
```

> 📖 **Need help setting up credentials?** See [SETUP.md](./SETUP.md) for detailed step-by-step instructions.

4. **Set up the database**

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init
```

5. **Start the development server**

```bash
npm run start:dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📚 Documentation

This project includes comprehensive documentation:

- **[SETUP.md](./SETUP.md)**: Step-by-step setup guide for all services
- **[WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md)**: Detailed guide for setting up Paystack webhooks (local & production)
- **[TESTING_WEBHOOKS.md](./TESTING_WEBHOOKS.md)**: Guide for testing webhooks in Paystack Test Mode (no secret required)
- **[CONCEPTS_AND_FLOW.md](./CONCEPTS_AND_FLOW.md)**: Detailed explanation of concepts, flows, and code
- **[API_REFERENCE.md](./API_REFERENCE.md)**: Quick API endpoint reference

## 🔌 API Endpoints

### Authentication

- `GET /auth/google` - Initiate Google sign-in flow
- `GET /auth/google/callback` - Handle Google OAuth callback

### Payments

- `POST /payments/paystack/initiate` - Initialize a Paystack payment
- `POST /payments/paystack/webhook` - Receive Paystack webhook notifications
- `GET /payments/:reference/status` - Get transaction status

> 📖 **Full API documentation**: See [API_REFERENCE.md](./API_REFERENCE.md)

## 🧪 Testing

### Test Google Sign-In

```bash
# Get Google auth URL (JSON response)
curl http://localhost:3000/auth/google

# Or redirect mode (browser)
# Visit: http://localhost:3000/auth/google?redirect=true
```

### Test Payment Initiation

```bash
# Replace USER_ID with actual user ID from Google sign-in
curl -X POST http://localhost:3000/payments/paystack/initiate?userId=USER_ID \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'
```

### Test Transaction Status

```bash
# Replace REFERENCE with actual transaction reference
curl http://localhost:3000/payments/REFERENCE/status

# Refresh from Paystack
curl http://localhost:3000/payments/REFERENCE/status?refresh=true
```

## 🏗️ Project Structure

```
src/
├── auth/                    # Google OAuth authentication
│   ├── auth.controller.ts   # HTTP endpoints
│   ├── auth.service.ts      # Business logic
│   ├── auth.module.ts       # Module definition
│   └── google-oauth.service.ts  # Google API integration
├── payments/                # Paystack payments
│   ├── payments.controller.ts  # HTTP endpoints
│   ├── payments.service.ts     # Business logic
│   ├── payments.module.ts      # Module definition
│   ├── paystack.service.ts     # Paystack API integration
│   ├── paystack-webhook.util.ts  # Webhook verification
│   └── dto/                    # Request validation
├── prisma/                 # Database
│   └── prisma.service.ts   # Prisma client service
├── config/                 # Configuration
│   └── config.ts          # Environment config
└── main.ts                 # Application entry point
```

## 🔒 Security Features

- **Webhook Signature Verification**: HMAC SHA512 verification for Paystack webhooks
- **Input Validation**: DTOs with class-validator for request validation
- **Environment Variables**: Secrets stored in `.env` (never committed)
- **Idempotency**: Prevents duplicate transactions
- **Error Handling**: Proper HTTP status codes and error messages

## 🚧 Production Considerations

Before deploying to production:

1. **Implement JWT Authentication**: Replace query parameter `userId` with JWT token
2. **Configure CORS**: Update CORS settings for your frontend domain
3. **Webhook Body Parsing**: Configure raw body parsing for webhook signature verification
4. **Rate Limiting**: Add rate limiting to protect endpoints
5. **Logging**: Implement proper logging (Winston, Pino, etc.)
6. **Monitoring**: Set up error tracking and monitoring
7. **HTTPS**: Ensure all endpoints use HTTPS in production

## 📦 Scripts

```bash
# Development
npm run start:dev          # Start in watch mode

# Production
npm run build             # Build the application
npm run start:prod        # Start in production mode

# Database
npx prisma generate       # Generate Prisma Client
npx prisma migrate dev    # Run migrations
npx prisma studio         # Open Prisma Studio (database GUI)

# Code Quality
npm run format            # Format code with Prettier
npm run lint              # Lint code with ESLint

# Testing
npm run test              # Run unit tests
npm run test:e2e          # Run end-to-end tests
npm run test:cov          # Run tests with coverage
```

## 🐛 Troubleshooting

### "Google OAuth configuration is missing"

- Check that all `GOOGLE_*` environment variables are set in `.env`
- Restart the server after changing `.env`

### "Paystack configuration is missing"

- Check that all `PAYSTACK_*` environment variables are set in `.env`
- Restart the server after changing `.env`

### "Database connection failed"

- Verify your `DATABASE_URL` is correct
- Check that your Neon database is running
- Ensure the connection string includes `?sslmode=require`

### "Transaction not found"

- Verify you're using the correct transaction reference
- Check that the transaction was created in the database

### "Paystack webhook URL not accepted"

- Paystack requires HTTPS URLs, not HTTP localhost
- Use [ngrok](https://ngrok.com) for local development: `ngrok http 3000`
- See [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md) for detailed instructions

## 📖 Learning Resources

- **[CONCEPTS_AND_FLOW.md](./CONCEPTS_AND_FLOW.md)**: Learn about OAuth 2.0, payment flows, and code explanations
- **[SETUP.md](./SETUP.md)**: Detailed setup instructions for all services
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Paystack API Documentation](https://paystack.com/docs/api)

## 🤝 Contributing

This is a learning project. Feel free to:

- Report issues
- Suggest improvements
- Submit pull requests

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com) - Progressive Node.js framework
- [Prisma](https://www.prisma.io) - Next-generation ORM
- [Google](https://developers.google.com) - OAuth 2.0 provider
- [Paystack](https://paystack.com) - Payment gateway

---

**Built with ❤️ using NestJS, Prisma, and TypeScript**
