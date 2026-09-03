const express = require("express");
const walletRoutes = require("./routes/wallet");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: runs on every request BEFORE it reaches a route.
// express.json() reads the raw request body and turns it into req.body
// so our routes can use it as a normal JavaScript object.
app.use(express.json());

// Mount all wallet routes under /wallet
// e.g. router's "/:userId/balance" becomes "/wallet/:userId/balance"
app.use("/wallet", walletRoutes);

// A simple health check endpoint — very common in real deployments.
// Simple: "is the server alive?" Technical: used by load balancers, Docker,
// and Kubernetes to check if a service is healthy and should keep receiving traffic.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Mock mobile money API running on http://localhost:${PORT}`);
});
