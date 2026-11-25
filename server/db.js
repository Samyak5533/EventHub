const Database = require("better-sqlite3");
const { DB_FILE } = require("./config");

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))";

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at    TEXT NOT NULL DEFAULT ${NOW}
  );

  -- date_time is stored as local "YYYY-MM-DDTHH:MM", the same format the
  -- admin form's datetime-local input sends and reads back.
  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category    TEXT NOT NULL DEFAULT 'Other',
    venue       TEXT NOT NULL,
    date_time   TEXT NOT NULL,
    price       REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
    total_seats INTEGER NOT NULL CHECK (total_seats > 0),
    image_url   TEXT,
    created_at  TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER NOT NULL REFERENCES users(id),
    event_id          INTEGER NOT NULL REFERENCES events(id),
    quantity          INTEGER NOT NULL CHECK (quantity > 0),
    total_amount      REAL NOT NULL,
    payment_method    TEXT NOT NULL CHECK (payment_method IN ('mock', 'stripe')),
    payment_status    TEXT NOT NULL DEFAULT 'paid',
    stripe_session_id TEXT UNIQUE,
    created_at        TEXT NOT NULL DEFAULT ${NOW}
  );

  -- Each ticket is a "block": block_hash covers the ticket's data plus the
  -- previous ticket's hash, so editing any issued ticket breaks the chain.
  CREATE TABLE IF NOT EXISTS tickets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id  TEXT NOT NULL UNIQUE,
    booking_id INTEGER NOT NULL REFERENCES bookings(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    event_id   INTEGER NOT NULL REFERENCES events(id),
    signature  TEXT NOT NULL,
    prev_hash  TEXT NOT NULL,
    block_hash TEXT NOT NULL UNIQUE,
    qr         TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
    issued_at  TEXT NOT NULL,
    used_at    TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_user  ON bookings(user_id);
  CREATE INDEX IF NOT EXISTS idx_tickets_user   ON tickets(user_id);
`);

// Events with how many tickets are sold and the revenue they brought in.
const EVENTS_WITH_SALES = `
  SELECT e.*,
         COALESCE(s.sold, 0)    AS tickets_sold,
         COALESCE(s.revenue, 0) AS revenue
  FROM events e
  LEFT JOIN (
    SELECT event_id, SUM(quantity) AS sold, SUM(total_amount) AS revenue
    FROM bookings WHERE payment_status = 'paid'
    GROUP BY event_id
  ) s ON s.event_id = e.id
`;

module.exports = { db, EVENTS_WITH_SALES };
