const express = require("express");
const { db, EVENTS_WITH_SALES } = require("../db");
const { localDateTime } = require("../util");

const router = express.Router();

// Revenue is admin-only information.
const publicEvent = ({ revenue, ...e }) => e;

// GET /api/events?category=Music&q=jazz: upcoming events only, soonest first.
router.get("/", (req, res) => {
  const where = ["e.date_time >= @now"];
  const params = { now: localDateTime() };
  if (req.query.category) {
    where.push("e.category = @category");
    params.category = String(req.query.category);
  }
  if (req.query.q) {
    where.push("(e.title LIKE @q OR e.description LIKE @q OR e.venue LIKE @q)");
    params.q = `%${String(req.query.q).trim()}%`;
  }
  const sql = `${EVENTS_WITH_SALES} WHERE ${where.join(" AND ")} ORDER BY e.date_time ASC`;
  res.json(db.prepare(sql).all(params).map(publicEvent));
});

router.get("/:id", (req, res) => {
  const event = db.prepare(`${EVENTS_WITH_SALES} WHERE e.id = ?`).get(Number(req.params.id));
  if (!event) return res.status(404).json({ message: "Event not found." });
  res.json(publicEvent(event));
});

module.exports = router;
