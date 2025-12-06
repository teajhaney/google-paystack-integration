# Google Sign-In & Paystack Payment Backend

A production-ready NestJS backend application that implements Google OAuth 2.0 authentication and Paystack payment processing. This project demonstrates secure integration of third-party services (Google and Paystack) with proper error handling, validation, and webhook security.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Codebase Structure](#-codebase-structure)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Development](#-development)
- [Testing](#-testing)
- [Production Deployment](#-production-deployment)
- [Troubleshooting](#-troubleshooting)

## 🚀 Features

- **Google OAuth 2.0 Authentication**: Secure user authentication using Google Sign-In with automatic user creation/update
- **Paystack Payment Integration**: Complete payment processing with transaction management
- **Webhook Support**: Secure webhook handling with HMAC SHA512 signature verification for real-time payment status updates
- **Database Integration**: PostgreSQL database with Prisma ORM (Neon PostgreSQL compatible)
- **Input Validation**: Request validation using class-validator DTOs
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes
- **Idempotency**: Prevents duplicate transactions using reference-based idempotency
- **Type Safety**: Full TypeScript support with strict type checking
- **Security**: Webhook signature verification, secure credential management, and CORS support

## 🛠 Tech Stack

- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL (via Prisma ORM)
- **ORM**: Prisma 6.19
- **HTTP Client**: Axios
- **Validation**: class-validator, class-transformer
- **Configuration**: @nestjs/config

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- A **PostgreSQL database** (Neon PostgreSQL recommended)
- A **Google Cloud Platform** account with OAuth credentials
- A **Paystack** account with API keys

## 🛠 Installation

1. **Clone the repository** (or navigate to the project directory)

```bash
cd google-paystack
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory (see [Configuration](#-configuration) section).

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

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000

# Database Configuration (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/auth/google/callback"

# Paystack Configuration
PAYSTACK_SECRET_KEY="sk_test_xxxxxxxxxxxxx"
PAYSTACK_PUBLIC_KEY="pk_test_xxxxxxxxxxxxx"
PAYSTACK_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxx"  # Optional for test mode
```

### Configuration Details

- **PORT**: Server port (default: 3000)
- **DATABASE_URL**: PostgreSQL connection string (Neon PostgreSQL compatible)
- **GOOGLE_CLIENT_ID**: Google OAuth 2.0 Client ID from Google Cloud Console
- **GOOGLE_CLIENT_SECRET**: Google OAuth 2.0 Client Secret
- **GOOGLE_REDIRECT_URI**: Must match exactly with the redirect URI in Google Cloud Console
- **PAYSTACK_SECRET_KEY**: Paystack Secret Key (starts with `sk_`)
- **PAYSTACK_PUBLIC_KEY**: Paystack Public Key (starts with `pk_`)
- **PAYSTACK_WEBHOOK_SECRET**: Webhook secret for signature verification (optional in test mode)

## 📁 Codebase Structure

```
src/
├── auth/                          # Authentication module
│   ├── auth.controller.ts         # HTTP endpoints for authentication
│   ├── auth.service.ts            # Business logic for authentication
│   ├── auth.module.ts             # Module definition and dependencies
│   └── google-oauth.service.ts    # Google OAuth API integration
│
├── payments/                      # Payments module
│   ├── payments.controller.ts     # HTTP endpoints for payments
│   ├── payments.service.ts        # Business logic for payments
│   ├── payments.module.ts         # Module definition and dependencies
│   ├── paystack.service.ts        # Paystack API integration
│   ├── paystack-webhook.util.ts   # Webhook signature verification utility
│   └── dto/                       # Data Transfer Objects (validation)
│       ├── initiate-payment.dto.ts
│       └── transaction-status.dto.ts
│
├── prisma/                        # Database module
│   ├── prisma.service.ts          # Prisma client service
│   └── prisma.module.ts           # Prisma module definition
│
├── config/                        # Configuration module
│   └── config.ts                  # Environment configuration loader
│
├── interface.ts                   # TypeScript interfaces and types
├── app.module.ts                  # Root application module
└── main.ts                        # Application entry point

prisma/
├── schema.prisma                  # Prisma schema definition
└── migrations/                    # Database migrations
```

### Module Responsibilities

#### Auth Module (`src/auth/`)

- **auth.controller.ts**: Handles HTTP requests for Google OAuth flow
- **auth.service.ts**: Orchestrates authentication flow and user management
- **google-oauth.service.ts**: Low-level Google OAuth API interactions

#### Payments Module (`src/payments/`)

- **payments.controller.ts**: Handles HTTP requests for payment operations
- **payments.service.ts**: Business logic for payment transactions
- **paystack.service.ts**: Low-level Paystack API interactions
- **paystack-webhook.util.ts**: Webhook signature verification

#### Prisma Module (`src/prisma/`)

- **prisma.service.ts**: Provides Prisma Client instance to the application
- Handles database connection lifecycle

## 📚 API Reference

### Base URL

```
http://localhost:3000
```

### Authentication Endpoints

#### 1. Initiate Google Sign-In

Get the Google OAuth authorization URL.

**Endpoint**: `GET /auth/google`

**Query Parameters**:

- `redirect` (optional): If `"true"`, performs a 302 redirect to Google. Otherwise, returns JSON.

**Response (JSON mode)**:

```json
{
  "google_auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**Response (Redirect mode)**:

- Status: `302 Found`
- Redirects to Google OAuth URL

**Example Request**:

```bash
# JSON mode
curl http://localhost:3000/auth/google

# Redirect mode (browser)
curl -L http://localhost:3000/auth/google?redirect=true
```

**Example Response**:

```json
{
  "google_auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

---

#### 2. Google OAuth Callback

Handle the callback from Google after user authorization.

**Endpoint**: `GET /auth/google/callback`

**Query Parameters**:

- `code` (required): Authorization code from Google
- `error` (optional): Error code if user denied authorization

**Response**:

```json
{
  "success": true,
  "message": "Google sign-in successful",
  "user_id": "uuid-here",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://..."
}
```

**Error Responses**:

- `400 Bad Request`: Missing authorization code or user denied authorization
- `500 Internal Server Error`: Failed to complete sign-in

**Example Request**:

```
GET /auth/google/callback?code=4/0AeanS...
```

**Example Response**:

```json
{
  "success": true,
  "message": "Google sign-in successful",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/..."
}
```

---

#### 3. Get Google OAuth Configuration

Get the current Google OAuth configuration (for debugging).

**Endpoint**: `GET /auth/google/config`

**Response**:

```json
{
  "message": "Google OAuth Configuration",
  "redirect_uri": "http://localhost:3000/auth/google/callback",
  "note": "This redirect_uri MUST match EXACTLY in Google Cloud Console",
  "instructions": [
    "1. Go to https://console.cloud.google.com/",
    "2. Select your project",
    "3. APIs & Services → Credentials",
    "4. Click your OAuth 2.0 Client ID",
    "5. Check \"Authorized redirect URIs\"",
    "6. Ensure it includes: http://localhost:3000/auth/google/callback"
  ]
}
```

---

### Payment Endpoints

#### 1. Initiate Payment

Initialize a new Paystack payment transaction.

**Endpoint**: `POST /payments/paystack/initiate`

**Headers**:

- `Content-Type: application/json`
- `x-user-id` (optional): User ID (alternative to query parameter)

**Query Parameters**:

- `userId` (optional): User ID (alternative to header)

**Request Body**:

```json
{
  "amount": 5000
}
```

**Request Body Schema**:

- `amount` (integer, required): Amount in Kobo (lowest currency unit). Minimum: 100 Kobo (1 Naira)

**Response**:

```json
{
  "reference": "T1234567890",
  "authorization_url": "https://checkout.paystack.com/..."
}
```

**Error Responses**:

- `401 Unauthorized`: User ID is missing
- `404 Not Found`: User not found
- `402 Payment Required`: Paystack API error
- `500 Internal Server Error`: Failed to initiate payment

**Example Request**:

```bash
curl -X POST http://localhost:3000/payments/paystack/initiate?userId=USER_ID \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'
```

**Example Response**:

```json
{
  "reference": "T1234567890",
  "authorization_url": "https://checkout.paystack.com/0peioxfhpn"
}
```

**Notes**:

- The `userId` can be provided either as a query parameter or in the `x-user-id` header
- In production, replace this with JWT token authentication
- The amount is in Kobo (1 Naira = 100 Kobo)
- The transaction reference can be used for idempotency

---

#### 2. Get Transaction Status

Get the status of a payment transaction.

**Endpoint**: `GET /payments/:reference/status`

**Path Parameters**:

- `reference` (required): Transaction reference

**Query Parameters**:

- `refresh` (optional): If `"true"`, fetches the latest status from Paystack

**Response**:

```json
{
  "reference": "T1234567890",
  "status": "success",
  "amount": 5000,
  "paid_at": "2024-01-01T12:00:00.000Z"
}
```

**Response Schema**:

- `reference` (string): Transaction reference
- `status` (string): Transaction status (`"pending"`, `"success"`, or `"failed"`)
- `amount` (integer): Amount in Kobo
- `paid_at` (string | null): ISO 8601 timestamp when payment was completed, or `null` if not paid

**Error Responses**:

- `404 Not Found`: Transaction not found
- `500 Internal Server Error`: Failed to get transaction status

**Example Request**:

```bash
# Get status from database
curl http://localhost:3000/payments/T1234567890/status

# Refresh status from Paystack
curl http://localhost:3000/payments/T1234567890/status?refresh=true
```

**Example Response**:

```json
{
  "reference": "T1234567890",
  "status": "success",
  "amount": 5000,
  "paid_at": "2024-01-01T12:00:00.000Z"
}
```

---

#### 3. Paystack Webhook

Receive webhook notifications from Paystack.

**Endpoint**: `POST /payments/paystack/webhook`

**Headers**:

- `Content-Type: application/json`
- `x-paystack-signature` (required if webhook secret is configured): HMAC SHA512 signature

**Request Body**:

```json
{
  "event": "charge.success",
  "data": {
    "id": 1234567890,
    "domain": "test",
    "status": "success",
    "reference": "T1234567890",
    "amount": 5000,
    "currency": "NGN",
    "paid_at": "2024-01-01T12:00:00.000Z",
    "created_at": "2024-01-01T11:00:00.000Z",
    "metadata": {}
  }
}
```

**Response**:

```json
{
  "status": true
}
```

**Error Responses**:

- `400 Bad Request`: Missing Paystack signature header (when secret is configured)
- `401 Unauthorized`: Invalid webhook signature
- `500 Internal Server Error`: Failed to process webhook

**Supported Events**:

- `charge.success`: Payment was successful
- `charge.failed`: Payment failed

**Example Request**:

```bash
curl -X POST http://localhost:3000/payments/paystack/webhook \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: SIGNATURE_HERE" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "T1234567890",
      "status": "success",
      "paid_at": "2024-01-01T12:00:00.000Z"
    }
  }'
```

**Example Response**:

```json
{
  "status": true
}
```

**Notes**:

- Webhook signature verification is optional in test mode (when `PAYSTACK_WEBHOOK_SECRET` is not configured)
- In production, webhook signature verification is required
- The endpoint always returns `200 OK` to prevent Paystack from retrying
- Errors are logged but don't cause the webhook to fail

---

## 🗄️ Database Schema

### User Model

Stores information about users who sign in with Google.

```prisma
model User {
  id        String   @id @default(uuid())
  googleId  String   @unique
  email     String   @unique
  name      String?
  picture   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions Transaction[]

  @@map("users")
}
```

**Fields**:

- `id`: Unique identifier (UUID)
- `googleId`: Google's unique user ID (unique constraint)
- `email`: User's email address (unique constraint)
- `name`: User's display name (optional)
- `picture`: User's profile picture URL (optional)
- `createdAt`: Timestamp when user was created
- `updatedAt`: Timestamp when user was last updated
- `transactions`: One-to-many relationship with Transaction model

---

### Transaction Model

Stores payment transaction information from Paystack.

```prisma
model Transaction {
  id              String   @id @default(uuid())
  reference       String   @unique
  amount          Int
  status          String   @default("pending")
  authorizationUrl String?
  paidAt          DateTime?
  metadata        Json?

  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("transactions")
}
```

**Fields**:

- `id`: Unique identifier (UUID)
- `reference`: Paystack transaction reference (unique constraint, used for idempotency)
- `amount`: Amount in Kobo (lowest currency unit)
- `status`: Transaction status (`"pending"`, `"success"`, or `"failed"`)
- `authorizationUrl`: URL where user can complete payment (optional)
- `paidAt`: Timestamp when payment was completed (optional)
- `metadata`: Additional transaction data from Paystack (JSON, optional)
- `userId`: Foreign key to User model
- `user`: Many-to-one relationship with User model
- `createdAt`: Timestamp when transaction was created
- `updatedAt`: Timestamp when transaction was last updated

**Relationships**:

- Each transaction belongs to one user
- Each user can have many transactions
- Cascade delete: When a user is deleted, all their transactions are deleted

---

## 💻 Development

### Available Scripts

```bash
# Development
npm run start:dev          # Start in watch mode (auto-reload on changes)
npm run start:debug        # Start in debug mode

# Production
npm run build              # Build the application
npm run start:prod         # Start in production mode

# Database
npx prisma generate        # Generate Prisma Client
npx prisma migrate dev     # Run migrations in development
npx prisma migrate deploy  # Run migrations in production
npx prisma studio          # Open Prisma Studio (database GUI)

# Code Quality
npm run format             # Format code with Prettier
npm run lint               # Lint code with ESLint

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run end-to-end tests
```

### Development Workflow

1. **Make changes** to the code
2. **Run linter**: `npm run lint`
3. **Format code**: `npm run format`
4. **Test changes**: `npm run test`
5. **Update database schema** (if needed): Edit `prisma/schema.prisma`, then run `npx prisma migrate dev`
6. **Restart server**: The dev server auto-reloads on changes

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured with TypeScript rules
- **Prettier**: Code formatting
- **Naming**: camelCase for variables/functions, PascalCase for classes

---

## 🧪 Testing

### Manual Testing

#### Test Google Sign-In

```bash
# Get Google auth URL (JSON response)
curl http://localhost:3000/auth/google

# Or redirect mode (browser)
# Visit: http://localhost:3000/auth/google?redirect=true
```

#### Test Payment Initiation

```bash
# Replace USER_ID with actual user ID from Google sign-in
curl -X POST http://localhost:3000/payments/paystack/initiate?userId=USER_ID \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'
```

#### Test Transaction Status

```bash
# Replace REFERENCE with actual transaction reference
curl http://localhost:3000/payments/REFERENCE/status

# Refresh from Paystack
curl http://localhost:3000/payments/REFERENCE/status?refresh=true
```

### Automated Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run end-to-end tests
npm run test:e2e
```

---

## 🚀 Production Deployment

### Pre-Deployment Checklist

1. **Environment Variables**: Ensure all production environment variables are set
2. **Database**: Set up production database and run migrations
3. **HTTPS**: Ensure all endpoints use HTTPS
4. **CORS**: Configure CORS for your frontend domain
5. **Webhook URL**: Update Paystack webhook URL to production URL
6. **Webhook Secret**: Configure `PAYSTACK_WEBHOOK_SECRET` in production
7. **Logging**: Set up proper logging (Winston, Pino, etc.)
8. **Monitoring**: Set up error tracking and monitoring
9. **Rate Limiting**: Add rate limiting to protect endpoints
10. **JWT Authentication**: Replace query parameter `userId` with JWT token

### Production Considerations

#### 1. Authentication

**Current Implementation**: User ID passed as query parameter or header

**Production Recommendation**: Implement JWT authentication

```typescript
// Example: Extract user from JWT token
@UseGuards(JwtAuthGuard)
async initiatePayment(@Request() req) {
  const userId = req.user.id; // From JWT token
  // ...
}
```

#### 2. Webhook Body Parsing

**Current Implementation**: Uses JSON body parsing

**Production Recommendation**: Configure raw body parsing for webhook signature verification

```typescript
// In main.ts
app.use(
  '/payments/paystack/webhook',
  express.raw({ type: 'application/json' }),
);
```

#### 3. CORS Configuration

**Current Implementation**: CORS enabled for all origins

**Production Recommendation**: Configure CORS for specific domains

```typescript
// In main.ts
app.enableCors({
  origin: ['https://yourdomain.com'],
  credentials: true,
});
```

#### 4. Rate Limiting

Add rate limiting to protect endpoints:

```bash
npm install @nestjs/throttler
```

#### 5. Logging

Set up proper logging:

```bash
npm install nestjs-pino
```

#### 6. Error Tracking

Set up error tracking (e.g., Sentry):

```bash
npm install @sentry/node @sentry/nestjs
```

### Deployment Steps

1. **Build the application**:

   ```bash
   npm run build
   ```

2. **Run database migrations**:

   ```bash
   npx prisma migrate deploy
   ```

3. **Start the application**:
   ```bash
   npm run start:prod
   ```

---

## 🐛 Troubleshooting

### "Google OAuth configuration is missing"

**Solution**:

- Check that all `GOOGLE_*` environment variables are set in `.env`
- Restart the server after changing `.env`
- Verify the redirect URI matches exactly in Google Cloud Console

### "Paystack configuration is missing"

**Solution**:

- Check that all `PAYSTACK_*` environment variables are set in `.env`
- Restart the server after changing `.env`
- Verify API keys are correct (test keys start with `sk_test_` and `pk_test_`)

### "Database connection failed"

**Solution**:

- Verify your `DATABASE_URL` is correct
- Check that your database is running
- Ensure the connection string includes `?sslmode=require` for SSL connections
- Test the connection: `npx prisma db pull`

### "Transaction not found"

**Solution**:

- Verify you're using the correct transaction reference
- Check that the transaction was created in the database
- Use `npx prisma studio` to inspect the database

### "Paystack webhook URL not accepted"

**Solution**:

- Paystack requires HTTPS URLs, not HTTP localhost
- Use [ngrok](https://ngrok.com) for local development: `ngrok http 3000`
- Update the webhook URL in Paystack dashboard to the ngrok URL

### "Invalid webhook signature"

**Solution**:

- Verify `PAYSTACK_WEBHOOK_SECRET` is correct
- Ensure the webhook body is not modified before signature verification
- In test mode, webhook secret is optional

### "User not found" when initiating payment

**Solution**:

- Ensure the user has completed Google sign-in first
- Verify the `userId` is correct
- Check the database for the user record

---

## 📖 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Paystack API Documentation](https://paystack.com/docs/api)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com) - Progressive Node.js framework
- [Prisma](https://www.prisma.io) - Next-generation ORM
- [Google](https://developers.google.com) - OAuth 2.0 provider
- [Paystack](https://paystack.com) - Payment gateway

---

**Built with ❤️ using NestJS, Prisma, and TypeScript**
