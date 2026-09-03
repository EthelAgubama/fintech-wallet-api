# Mock Mobile Money API

A small REST API that simulates how a mobile money / payment platform (like
FlexiPAY, MTN MoMo, etc.) handles balances and transfers. Built as a learning
project to practice backend API design used in banking and fintech systems.

## What it does

- Check a user's wallet balance
- Transfer money between two users
- View transaction history for a user
- Protects against duplicate transfers using an **idempotency key**
- Prevents overdrawing a wallet
- Stores money as integers (pesewas) instead of decimals, to avoid
  floating-point rounding errors — a real practice in payment systems

## Tech stack

- Node.js
- Express.js
- PostgreSQL (via the `pg` driver)

## Running it locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Postgres database and apply the schema:
   ```bash
   createdb momo_db
   psql -d momo_db -f schema.sql
   ```
3. Copy `.env.example` to `.env` and fill in your real database credentials:
   ```bash
   cp .env.example .env
   ```
4. Start the server:
   ```bash
   npm start
   ```

Server runs on `http://localhost:3000`.

## Database design notes

- Money is stored as **integers (pesewas)**, not decimals, to avoid floating-point rounding errors.
- The `balance >= 0` and `idempotency_key UNIQUE` rules are enforced **at the database level**, not just in application code — a defense-in-depth approach common in financial systems.
- Transfers run inside a real database **transaction** (`BEGIN` / `COMMIT` / `ROLLBACK`), using `SELECT ... FOR UPDATE` to lock the relevant rows and prevent race conditions from concurrent requests.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/wallet/:userId/balance` | Get a user's balance |
| POST | `/wallet/transfer` | Transfer money between two users |
| GET | `/wallet/:userId/transactions` | Get a user's transaction history |

### Example: transfer request

```bash
curl -X POST http://localhost:3000/wallet/transfer \
  -H "Content-Type: application/json" \
  -d '{"fromUserId":"u1","toUserId":"u2","amount":50,"idempotencyKey":"unique-key-123"}'
```

The `idempotencyKey` must be unique per transaction attempt. Sending the same
key twice returns the original result instead of transferring money again —
this protects against duplicate transfers caused by network retries, which is
how real payment APIs (Stripe, Paystack, mobile money switches) behave.

## Roadmap (this project will grow)

- [x] Replace in-memory store with PostgreSQL
- [ ] Add OTP-based login and password hashing
- [ ] Containerize with Docker
- [ ] Add CI pipeline with GitHub Actions
- [ ] Deploy to AWS via Terraform
- [ ] Add a simple USSD-style menu simulation

## Why this project

Built to understand the backend patterns behind mobile money platforms in
Ghana (e.g. FlexiPAY by First Atlantic Bank) — REST API design, safe money
handling, and idempotent transaction processing.
