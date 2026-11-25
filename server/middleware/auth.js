const jwt = require("jsonwebtoken");
const { db } = require("../db");
const { JWT_SECRET } = require("../config");

function signToken(user) {
  // The frontend reads name, email and role straight out of this payload.
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function userFromRequest(req) {
  const match = (req.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const { id } = jwt.verify(match[1], JWT_SECRET);
    return db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(id) || null;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ message: "Please log in again." });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only." });
    next();
  });
}

function blockAdmin(req, res, next) {
  if (req.user.role === "admin") {
    return res.status(403).json({ message: "Admin accounts cannot purchase tickets." });
  }
  next();
}

module.exports = { signToken, requireAuth, requireAdmin, blockAdmin };
