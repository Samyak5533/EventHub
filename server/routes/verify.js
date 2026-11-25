const express = require("express");
const { requireAdmin } = require("../middleware/auth");
const { verifyAndUseTicket } = require("../services/booking");

const router = express.Router();

// POST /api/verify { token, signature }: the two values inside a ticket's QR code.
// Door staff (admins) only; a valid ticket is marked used, so it gets in once.
router.post("/", requireAdmin, (req, res) => {
  const token = String(req.body?.token || "").trim();
  const signature = String(req.body?.signature || "").trim();
  if (!token || !signature) return res.status(400).json({ message: "Token and signature are required." });
  res.json(verifyAndUseTicket(token, signature));
});

module.exports = router;
