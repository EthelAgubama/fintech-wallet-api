const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// This function runs BEFORE the actual route handler for any route that
// uses it. Express calls this "middleware" — a checkpoint in the request
// pipeline. next() means "checks passed, continue to the real route".
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  // Clients are expected to send: Authorization: Bearer <token>

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // jwt.verify checks the token's signature against our secret. If
    // someone tampered with the token (e.g. changed the userId inside it),
    // this throws — because the signature won't match anymore.
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    // We attach the verified userId to the request object so the route
    // handler downstream can use it — e.g. to check "is this person only
    // accessing THEIR OWN wallet?"
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = requireAuth;