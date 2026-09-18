require("dotenv").config();
const express = require("express");
const walletRoutes = require("./routes/wallet");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/wallet", walletRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Mock mobile money API running on http://localhost:${PORT}`);
});
