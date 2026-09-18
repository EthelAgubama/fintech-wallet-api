const express = require("express");
const router = express.Router();
const pool = require("../data/db");
const requireAuth = require("../middleware/auth");

router.use(requireAuth);

// --- GET /wallet/:userId/balance ---
router.get("/:userId/balance", async (req, res) => {
  if (Number(req.params.userId) !== req.userId) {
    return res.status(403).json({ error: "You can only view your own balance" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    res.status(200).json({
      userId: user.id,
      name: user.name,
      balance: user.balance / 100,
      currency: "GHS",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- POST /wallet/transfer ---
router.post("/transfer", async (req, res) => {
  const { fromUserId, toUserId, amount, idempotencyKey } = req.body;

  if (!fromUserId || !toUserId || !amount || !idempotencyKey) {
    return res.status(400).json({ error: "fromUserId, toUserId, amount and idempotencyKey are required" });
  }
  if (Number(fromUserId) !== req.userId) {
    return res.status(403).json({ error: "You can only transfer from your own account" });
  }
  if (amount <= 0) {
    return res.status(400).json({ error: "amount must be greater than zero" });
  }

  const amountInPesewas = Math.round(amount * 100);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT * FROM transactions WHERE idempotency_key = $1",
      [idempotencyKey]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(200).json({
        message: "Duplicate request -- original result returned",
        transaction: existing.rows[0],
      });
    }

    const senderResult = await client.query(
      "SELECT * FROM users WHERE id = $1 FOR UPDATE",
      [fromUserId]
    );
    const receiverResult = await client.query(
      "SELECT * FROM users WHERE id = $1 FOR UPDATE",
      [toUserId]
    );

    if (senderResult.rows.length === 0 || receiverResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "fromUserId or toUserId does not exist" });
    }

    const sender = senderResult.rows[0];
    if (sender.balance < amountInPesewas) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Insufficient balance" });
    }

    await client.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [amountInPesewas, fromUserId]);
    await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [amountInPesewas, toUserId]);

    const txResult = await client.query(
      `INSERT INTO transactions (from_user_id, to_user_id, amount, idempotency_key)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [fromUserId, toUserId, amountInPesewas, idempotencyKey]
    );

    await client.query("COMMIT");

    res.status(201).json({ message: "Transfer successful", transaction: txResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// --- GET /wallet/:userId/transactions ---
router.get("/:userId/transactions", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM transactions WHERE from_user_id = $1 OR to_user_id = $1 ORDER BY created_at DESC",
      [req.params.userId]
    );
    res.status(200).json({ userId: req.params.userId, count: result.rows.length, transactions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
