const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../data/db");

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;
// SALT_ROUNDS controls how much computational work bcrypt does per hash.
// Higher = slower to compute = harder to brute-force, but slower for real
// users too. 10 is a standard, sensible default in 2026.

// --- POST /auth/register ---
// Simple: create an account with a phone number and a password.
// Technical: never store the raw password -- only its bcrypt hash.
router.post("/register", async (req, res) => {
  const { name, phone, password } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: "name, phone and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      "INSERT INTO users (name, phone, password_hash, balance) VALUES ($1, $2, $3, 0) RETURNING id, name, phone",
      [name, phone, passwordHash]
    );

    res.status(201).json({ message: "Registered successfully", user: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Phone number already registered" });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- POST /auth/login ---
router.post("/login", async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: "phone and password are required" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid phone or password" });
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid phone or password" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      "INSERT INTO otps (user_id, code, expires_at) VALUES ($1, $2, $3)",
      [user.id, otp, expiresAt]
    );

    res.status(200).json({
      message: "Password correct. OTP sent (returned here for local testing only).",
      userId: user.id,
      otp_for_testing_only: otp,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- POST /auth/verify-otp ---
router.post("/verify-otp", async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return res.status(400).json({ error: "userId and otp are required" });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM otps
       WHERE user_id = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, otp]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired OTP" });
    }

    await pool.query("UPDATE otps SET used = TRUE WHERE id = $1", [result.rows[0].id]);

    const token = jwt.sign({ userId: Number(userId) }, JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
