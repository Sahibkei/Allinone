# All In One

All In One is a Next.js app with utility tools and account auth.

## Auth Stack
- Database: MongoDB Atlas
- Email: Nodemailer (SMTP)
- Password storage: `bcrypt` hash (not plaintext)
- Session: database-backed session token in HTTP-only cookie

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create env file:
- Copy `.env.example` to `.env.local`
- Fill MongoDB Atlas + SMTP values

3. Run dev server:

```bash
npm run dev
```

4. Open:
- `http://localhost:3000/signup` to create an account
- Check your inbox for verification email
- Click verification link
- `http://localhost:3000/login` to sign in

## Required Environment Variables

```bash
NEXT_PUBLIC_APP_URL=

MONGODB_URI=
MONGODB_DB=
USAGE_HASH_SALT=

SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_DAY=
STRIPE_PRICE_MONTHLY=
STRIPE_PRICE_YEARLY=
```

## Production Note
Set the same env values in your hosting provider (for example Vercel project environment variables).

## Stripe Webhook (Test Mode)
Use Stripe CLI locally to forward events to your app:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Then copy the generated webhook signing secret to `STRIPE_WEBHOOK_SECRET`.
