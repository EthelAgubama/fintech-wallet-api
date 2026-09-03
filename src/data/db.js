// db.js
require("dotenv").config();
const { Pool } = require("pg");

// A connection pool: instead of opening/closing a new database connection
// for every request (slow), we keep a small set of connections open and
// reused. This is standard practice in any production backend.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
