-- schema.sql
-- This defines the shape of our data. Run this once against a fresh database
-- to create the tables our app needs.

-- SERIAL / BIGSERIAL = auto-incrementing integer, commonly used for IDs
-- NOT NULL = this column can never be empty
-- UNIQUE = no two rows can have the same value here
-- REFERENCES = a foreign key — links a row in one table to a row in another

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  -- balance stored in pesewas (integer), same reasoning as before: avoid
  -- floating point rounding errors with money.
  -- CHECK (balance >= 0) is a database-level rule: it PHYSICALLY REFUSES
  -- to let a balance go negative, no matter what the application code does.
  -- This is a safety net beneath our own validation logic.
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER NOT NULL REFERENCES users(id),
  to_user_id INTEGER NOT NULL REFERENCES users(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  idempotency_key VARCHAR(100) UNIQUE NOT NULL,
  -- UNIQUE here means the database itself will reject a duplicate
  -- idempotency key — a second layer of protection beyond our app code.
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed data so we have something to test with
INSERT INTO users (name, phone, balance) VALUES
  ('Ama Boateng', '0241234567', 50000),
  ('Kwame Mensah', '0207654321', 20000)
ON CONFLICT (phone) DO NOTHING;
