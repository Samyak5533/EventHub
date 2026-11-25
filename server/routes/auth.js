const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../db");
const { signToken } = require("../middleware/auth");

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

router.post("/register", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!name || !email || !password) return res.status(400).json({ message: "Please fill all fields." });
  if (name.length > 100) return res.status(400).json({ message: "Name is too long." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Please enter a valid email address." });
  if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });

  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    return res.status(409).json({ message: "An account with this email already exists. Please log in." });
  }

  const { lastInsertRowid } = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run(name, email, bcrypt.hashSync(password, 10));
  const user = { id: Number(lastInsertRowid), name, email, role: "user" };
  res.status(201).json({ token: signToken(user), user });
});

router.post("/login", (req, res) => {
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  if (!email || !password) return res.status(400).json({ message: "Please enter your email and password." });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: "Invalid email or password." });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

module.exports = router;
