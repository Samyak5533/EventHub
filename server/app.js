const express = require("express");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { PUBLIC_DIR, TRUST_PROXY } = require("./config");
const { BookingError } = require("./services/booking");

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (TRUST_PROXY) app.set("trust proxy", TRUST_PROXY);

  // Security headers. The CSP allows only this site plus the CDNs the pages
  // use (Bootstrap, the QR scanner library, Google Fonts) and https images.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          mediaSrc: ["'self'", "blob:"],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: null, // the dev server runs on plain http
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(express.json({ limit: "100kb" }));

  // Slow down password guessing: 10 failed login/sign-up attempts per 15 min per IP.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many attempts. Please wait a few minutes and try again." },
  });

  app.use("/api/auth", authLimiter, require("./routes/auth"));
  app.use("/api/events", require("./routes/events"));
  app.use("/api/bookings", require("./routes/bookings"));
  app.use("/api/payments", require("./routes/payments"));
  app.use("/api/admin", require("./routes/admin"));
  app.use("/api/verify", require("./routes/verify"));
  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.use("/api", (req, res) => res.status(404).json({ message: "API route not found." }));

  app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));
  app.use((req, res) => res.status(404).sendFile("404.html", { root: PUBLIC_DIR }));

  // Every API error reaches the browser as { message }, which the pages display.
  app.use((err, req, res, next) => {
    if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
    if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON body." });
    if (typeof err.type === "string" && err.type.startsWith("Stripe")) {
      console.error("Stripe error:", err.message);
      return res.status(502).json({ message: "Payment provider error. Please try Demo Payment." });
    }
    console.error(err);
    res.status(500).json({ message: "Something went wrong on the server." });
  });

  return app;
}

module.exports = { createApp };
