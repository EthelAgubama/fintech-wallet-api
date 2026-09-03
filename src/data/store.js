// store.js
// A fake "database" living in memory. Real databases (Postgres, MySQL) persist
// data to disk. This one resets every time the server restarts — that's fine
// for learning, but we will swap this out for Postgres in the next project stage.

const users = {
  // userId: { name, phone, balance (in pesewas, i.e. smallest currency unit) }
  "u1": { id: "u1", name: "Ama Boateng", phone: "0241234567", balance: 50000 }, // GHS 500.00
  "u2": { id: "u2", name: "Kwame Mensah", phone: "0207654321", balance: 20000 }, // GHS 200.00
};

// Why store money as pesewas (integers) instead of cedis (decimals)?
// Floating point numbers (0.1 + 0.2 in JavaScript) can produce rounding errors.
// Banks and payment systems always store money as the smallest whole unit
// to avoid losing or gaining fractions of a currency. This is a real, common
// interview topic: "how do you handle money in code?"

const transactions = [];
// Each transaction: { id, from, to, amount, status, idempotencyKey, timestamp }

module.exports = { users, transactions };
