const express = require("express");
const { db } = require("../db");
const { requireAuth, blockAdmin } = require("../middleware/auth");
const { parseQuantity, getEventForSale, createPaidBooking } = require("../services/booking");
const { STRIPE_SECRET_KEY, BASE_URL, USD_TO_INR, MAX_INR } = require("../config");

const router = express.Router();
const stripe = STRIPE_SECRET_KEY ? require("stripe")(STRIPE_SECRET_KEY) : null;

const NOT_CONFIGURED = {
  message: "Card payments are not set up on this server. Please choose Demo Payment.",
};

// Stripe Checkout: charge the same INR price the site shows.
router.post("/create-session", requireAuth, blockAdmin, async (req, res) => {
  if (!stripe) return res.status(503).json(NOT_CONFIGURED);

  const quantity = parseQuantity(req.body?.quantity);
  const event = getEventForSale(req.body?.eventId, quantity);
  const unitInr = Math.min(event.price * USD_TO_INR, MAX_INR);
  if (unitInr <= 0) {
    return res.status(400).json({ message: "This event is free. Please choose Demo Payment." });
  }

  const base = BASE_URL || `${req.protocol}://${req.get("host")}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: req.user.email,
    line_items: [
      {
        quantity,
        price_data: {
          currency: "inr",
          unit_amount: Math.round(unitInr * 100),
          product_data: { name: event.title, description: `${event.venue} • ${event.date_time.replace("T", " ")}` },
        },
      },
    ],
    metadata: { userId: String(req.user.id), eventId: String(event.id), quantity: String(quantity) },
    success_url: `${base}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/`,
  });
  res.json({ url: session.url });
});

// Called by payment-success.html after Stripe redirects back. Safe to call
// more than once: a session only ever creates one booking.
router.get("/confirm", async (req, res) => {
  if (!stripe) return res.status(503).json(NOT_CONFIGURED);
  const sessionId = String(req.query.session_id || "");
  if (!sessionId.startsWith("cs_")) return res.status(400).json({ message: "Invalid payment session." });

  const existing = db.prepare("SELECT id FROM bookings WHERE stripe_session_id = ?").get(sessionId);
  if (existing) return res.json({ message: "Booking already confirmed.", bookingId: existing.id });

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return res.status(404).json({ message: "Payment session not found." });
  }
  if (session.payment_status !== "paid") {
    return res.status(402).json({ message: "Payment has not been completed yet." });
  }

  const { userId, eventId, quantity } = session.metadata || {};
  try {
    const { bookingId } = await createPaidBooking({
      userId: Number(userId),
      eventId,
      quantity,
      method: "stripe",
      stripeSessionId: sessionId,
    });
    res.status(201).json({ message: "Payment confirmed. Tickets issued.", bookingId });
  } catch (err) {
    // Another request confirmed the same session a moment earlier.
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.json({ message: "Booking already confirmed." });
    }
    throw err;
  }
});

module.exports = router;
