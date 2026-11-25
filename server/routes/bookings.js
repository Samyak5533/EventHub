const express = require("express");
const { db } = require("../db");
const { requireAuth, blockAdmin } = require("../middleware/auth");
const { createPaidBooking } = require("../services/booking");

const router = express.Router();

// Demo ("mock") payment: books straight away and issues the tickets.
router.post("/create", requireAuth, blockAdmin, async (req, res) => {
  const { bookingId, tickets } = await createPaidBooking({
    userId: req.user.id,
    eventId: req.body?.eventId,
    quantity: req.body?.quantity,
    method: "mock",
  });
  res.status(201).json({ message: "Booking confirmed.", bookingId, tickets });
});

router.get("/tickets/my", requireAuth, (req, res) => {
  const tickets = db
    .prepare(
      `SELECT t.ticket_id, t.qr, t.status, t.issued_at, t.used_at, t.booking_id,
              e.id AS event_id, e.title AS event, e.date_time, e.venue, e.image_url, e.category
       FROM tickets t JOIN events e ON e.id = t.event_id
       WHERE t.user_id = ?
       ORDER BY t.id DESC`
    )
    .all(req.user.id);
  res.json(tickets);
});

module.exports = router;
