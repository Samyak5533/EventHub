const express = require("express");
const { db, EVENTS_WITH_SALES } = require("../db");
const { requireAdmin } = require("../middleware/auth");
const { CATEGORIES } = require("../config");

const router = express.Router();
router.use(requireAdmin);

router.get("/stats", (req, res) => {
  const one = (sql) => db.prepare(sql).get();
  res.json({
    totalEvents: one("SELECT COUNT(*) AS n FROM events").n,
    totalUsers: one("SELECT COUNT(*) AS n FROM users WHERE role = 'user'").n,
    totalBookings: one("SELECT COUNT(*) AS n FROM bookings").n,
    totalRevenue: one("SELECT COALESCE(SUM(total_amount), 0) AS n FROM bookings WHERE payment_status = 'paid'").n,
    totalTicketsSold: one("SELECT COUNT(*) AS n FROM tickets WHERE status != 'cancelled'").n,
    activeTickets: one("SELECT COUNT(*) AS n FROM tickets WHERE status = 'active'").n,
  });
});

router.get("/bookings", (req, res) => {
  res.json(
    db
      .prepare(
        `SELECT b.id, b.quantity, b.total_amount, b.payment_method, b.payment_status, b.created_at,
                u.name AS user_name, u.email AS user_email, e.id AS event_id, e.title AS event_title
         FROM bookings b
         JOIN users u ON u.id = b.user_id
         JOIN events e ON e.id = b.event_id
         ORDER BY b.id DESC`
      )
      .all()
  );
});

router.get("/events", (req, res) => {
  res.json(db.prepare(`${EVENTS_WITH_SALES} ORDER BY e.date_time ASC`).all());
});

// Validates the admin form body; returns [error, cleanEvent].
function readEvent(body = {}) {
  const e = {
    title: String(body.title || "").trim(),
    description: String(body.description || "").trim(),
    category: String(body.category || "Other"),
    venue: String(body.venue || "").trim(),
    date_time: String(body.date_time || "").slice(0, 16),
    price: Number(body.price ?? 0),
    total_seats: Number(body.total_seats),
    image_url: String(body.image_url || "").trim() || null,
  };
  if (!e.title || !e.venue || !e.date_time) return ["Title, Venue and Date & Time are required."];
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(e.date_time) || isNaN(new Date(e.date_time))) {
    return ["Please enter a valid date and time."];
  }
  if (!CATEGORIES.includes(e.category)) return ["Please choose a valid category."];
  if (!Number.isFinite(e.price) || e.price < 0) return ["Price must be 0 or more."];
  if (!Number.isInteger(e.total_seats) || e.total_seats < 1) return ["Total seats must be at least 1."];
  if (e.image_url && !/^https?:\/\//i.test(e.image_url)) return ["Image URL must start with http:// or https://"];
  return [null, e];
}

router.post("/events", (req, res) => {
  const [error, e] = readEvent(req.body);
  if (error) return res.status(400).json({ message: error });
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO events (title, description, category, venue, date_time, price, total_seats, image_url)
       VALUES (@title, @description, @category, @venue, @date_time, @price, @total_seats, @image_url)`
    )
    .run(e);
  res.status(201).json(db.prepare(`${EVENTS_WITH_SALES} WHERE e.id = ?`).get(lastInsertRowid));
});

router.put("/events/:id", (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare(`${EVENTS_WITH_SALES} WHERE e.id = ?`).get(id);
  if (!current) return res.status(404).json({ message: "Event not found." });

  const [error, e] = readEvent(req.body);
  if (error) return res.status(400).json({ message: error });
  if (e.total_seats < current.tickets_sold) {
    return res.status(400).json({ message: `${current.tickets_sold} tickets are already sold, so seats can't go below that.` });
  }
  db.prepare(
    `UPDATE events SET title = @title, description = @description, category = @category, venue = @venue,
       date_time = @date_time, price = @price, total_seats = @total_seats, image_url = @image_url
     WHERE id = @id`
  ).run({ ...e, id });
  res.json(db.prepare(`${EVENTS_WITH_SALES} WHERE e.id = ?`).get(id));
});

router.delete("/events/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare("SELECT 1 FROM events WHERE id = ?").get(id)) {
    return res.status(404).json({ message: "Event not found." });
  }
  // Keep sales history intact: events that already sold tickets can't be deleted.
  if (db.prepare("SELECT 1 FROM bookings WHERE event_id = ? LIMIT 1").get(id)) {
    return res.status(409).json({ message: "This event already has bookings, so it can't be deleted." });
  }
  db.prepare("DELETE FROM events WHERE id = ?").run(id);
  res.json({ message: "Event deleted." });
});

module.exports = router;
