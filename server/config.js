const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
require("dotenv").config({ path: path.join(ROOT, ".env"), quiet: true });

const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

// Secrets come from .env when set. Otherwise a random one is generated on the
// first run and kept in data/secrets.json, so logins and ticket QR codes stay
// valid across restarts without anyone having to invent a secret.
function secret(name) {
  if (process.env[name]) return process.env[name];
  const file = path.join(DATA_DIR, "secrets.json");
  let saved = {};
  try {
    saved = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {}
  if (!saved[name]) {
    saved[name] = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(file, JSON.stringify(saved, null, 2), { mode: 0o600 });
  }
  return saved[name];
}

module.exports = {
  PUBLIC_DIR: path.join(ROOT, "public"),
  DB_FILE: process.env.DB_FILE || path.join(DATA_DIR, "eventhub.db"),
  PORT: Number(process.env.PORT) || 3000,
  BASE_URL: (process.env.BASE_URL || "").replace(/\/$/, ""),
  JWT_SECRET: secret("JWT_SECRET"),
  TICKET_SECRET: secret("TICKET_SECRET"),
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  ADMIN_NAME: process.env.ADMIN_NAME || "Admin",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@eventhub.com",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",
  // A ready-made user account for demos (shown as a hint in the login box).
  // Set DEMO_EMAIL to an empty value in .env to skip creating it.
  DEMO_NAME: process.env.DEMO_NAME || "Demo User",
  DEMO_EMAIL: process.env.DEMO_EMAIL ?? "demo@eventhub.com",
  DEMO_PASSWORD: process.env.DEMO_PASSWORD || "demo123",

  // The frontend stores prices in USD-equivalent and shows them as INR
  // (x84, capped at ₹10,000). Card payments are charged in that same INR amount.
  USD_TO_INR: 84,
  MAX_INR: 10000,
  MAX_TICKETS_PER_BOOKING: 2,
  CATEGORIES: [
    "Sports",
    "Concerts",
    "Stand-up comedy",
    "Dating events",
    "Webinars",
    "Music",
    "Dance",
    "Other",
  ],
};
