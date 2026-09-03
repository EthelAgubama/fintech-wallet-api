const express = require("express");
const router = express.Router();
const { users, transactions } = require("../data/store");

// --- GET /wallet/:userId/balance ---
// Simple: "show me how much money this person has"
// Technical: a GET request reads data and should never change anything (no side effects)
router.get("/:userId/balance", (req, res) => {
  const user = users[req.params.userId];

  // req.params.userId comes from the ":userId" part of the URL, e.g. /wallet/u1/balance
  if (!user) {
    // 404 = "Not Found" — a standard HTTP status code meaning the resource doesn't exist
    return res.status(404).json({ error: "User not found" });
  }

  res.status(200).json({
    userId: user.id,
    name: user.name,
    balance: user.balance / 100, // convert pesewas back to cedis for display
    currency: "GHS",
  });
});

// --- POST /wallet/transfer ---
// Simple: "move money from one person to another, safely"
// Technical: a POST request creates/changes state — here, it changes two balances
router.post("/transfer", (req, res) => {
  const { fromUserId, toUserId, amount, idempotencyKey } = req.body;
  // req.body is the JSON data sent by whoever called this API.
  // Express needs "express.json()" middleware (added in index.js) to parse it.

  // --- Basic validation ---
  // Simple: check the request actually makes sense before doing anything
  // Technical: this is "input validation" — never trust incoming data
  if (!fromUserId || !toUserId || !amount) {
    return res.status(400).json({ error: "fromUserId, toUserId and amount are required" });
  }
  if (amount <= 0) {
    return res.status(400).json({ error: "amount must be greater than zero" });
  }
  if (!idempotencyKey) {
    return res.status(400).json({ error: "idempotencyKey is required" });
  }

  // --- Idempotency check ---
  // Simple: if the app sends the same "send money" request twice (e.g. because
  // the network was slow and it retried), we must NOT send the money twice.
  // Technical: idempotency means calling an operation multiple times with the
  // same key produces the same result as calling it once. Payment systems rely
  // on this constantly — every real payment API (Stripe, Paystack, mobile money
  // switches) requires an idempotency key for this exact reason.
  const existing = transactions.find((t) => t.idempotencyKey === idempotencyKey);
  if (existing) {
    return res.status(200).json({ message: "Duplicate request — original result returned", transaction: existing });
  }

  const sender = users[fromUserId];
  const receiver = users[toUserId];
  if (!sender || !receiver) {
    return res.status(404).json({ error: "fromUserId or toUserId does not exist" });
  }

  const amountInPesewas = Math.round(amount * 100);

  if (sender.balance < amountInPesewas) {
    // 409 = "Conflict" — the request is valid, but current state prevents it
    return res.status(409).json({ error: "Insufficient balance" });
  }

  // --- The actual transfer ---
  // Technical: in a real database this would be wrapped in a transaction
  // (BEGIN / COMMIT / ROLLBACK) so that if anything fails halfway, NOTHING
  // changes — both balances update, or neither does. We'll implement that
  // for real once we move this to Postgres in the next project stage.
  sender.balance -= amountInPesewas;
  receiver.balance += amountInPesewas;

  const transaction = {
    id: `tx_${Date.now()}`,
    fromUserId,
    toUserId,
    amount: amountInPesewas,
    status: "completed",
    idempotencyKey,
    timestamp: new Date().toISOString(),
  };
  transactions.push(transaction);

  res.status(201).json({ message: "Transfer successful", transaction });
});

// --- GET /wallet/:userId/transactions ---
router.get("/:userId/transactions", (req, res) => {
  const userId = req.params.userId;
  const history = transactions.filter(
    (t) => t.fromUserId === userId || t.toUserId === userId
  );
  res.status(200).json({ userId, count: history.length, transactions: history });
});

module.exports = router;
