const crypto = require("crypto");
const QRCode = require("qrcode");
const { db, EVENTS_WITH_SALES } = require("../db");
const { localDateTime } = require("../util");
const { TICKET_SECRET, MAX_TICKETS_PER_BOOKING, USD_TO_INR, MAX_INR } = require("../config");

const GENESIS_HASH = "0".repeat(64);

class BookingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const signTicket = (ticketId) =>
  crypto.createHmac("sha256", TICKET_SECRET).update(ticketId).digest("hex");

function blockHash(t) {
  return sha256(
    [t.prev_hash, t.ticket_id, t.booking_id, t.user_id, t.event_id, t.signature, t.issued_at].join("|")
  );
}

function parseQuantity(value) {
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_TICKETS_PER_BOOKING) {
    throw new BookingError(400, `You can book 1 to ${MAX_TICKETS_PER_BOOKING} tickets at a time.`);
  }
  return qty;
}

function getEventForSale(eventId, quantity) {
  const event = db.prepare(`${EVENTS_WITH_SALES} WHERE e.id = ?`).get(Number(eventId));
  if (!event) throw new BookingError(404, "Event not found.");
  if (event.date_time < localDateTime()) throw new BookingError(400, "This event has already taken place.");
  const left = event.total_seats - event.tickets_sold;
  if (left < quantity) {
    throw new BookingError(409, left > 0 ? `Only ${left} seat(s) left.` : "This event is sold out.");
  }
  return event;
}

const insertBooking = db.prepare(`
  INSERT INTO bookings (user_id, event_id, quantity, total_amount, payment_method, payment_status, stripe_session_id)
  VALUES (@user_id, @event_id, @quantity, @total_amount, @payment_method, 'paid', @stripe_session_id)
`);
const insertTicket = db.prepare(`
  INSERT INTO tickets (ticket_id, booking_id, user_id, event_id, signature, prev_hash, block_hash, qr, issued_at)
  VALUES (@ticket_id, @booking_id, @user_id, @event_id, @signature, @prev_hash, @block_hash, @qr, @issued_at)
`);
const lastBlock = db.prepare("SELECT block_hash FROM tickets ORDER BY id DESC LIMIT 1");

// Seat check, booking and tickets all happen in one synchronous transaction,
// so two buyers can never take the same last seat.
const saveBooking = db.transaction(({ userId, eventId, quantity, method, stripeSessionId, prepared }) => {
  const event = getEventForSale(eventId, quantity);
  const { lastInsertRowid: bookingId } = insertBooking.run({
    user_id: userId,
    event_id: event.id,
    quantity,
    // Same per-ticket ₹10,000 cap the site shows, kept in the stored USD-equivalent unit.
    total_amount: (Math.min(event.price * USD_TO_INR, MAX_INR) / USD_TO_INR) * quantity,
    payment_method: method,
    stripe_session_id: stripeSessionId || null,
  });

  let prev = lastBlock.get()?.block_hash || GENESIS_HASH;
  for (const p of prepared) {
    const t = {
      ticket_id: p.ticket_id,
      booking_id: Number(bookingId),
      user_id: userId,
      event_id: event.id,
      signature: p.signature,
      prev_hash: prev,
      qr: p.qr,
      issued_at: new Date().toISOString(),
    };
    t.block_hash = blockHash(t);
    insertTicket.run(t);
    prev = t.block_hash;
  }
  return { bookingId: Number(bookingId), event };
});

async function createPaidBooking({ userId, eventId, quantity, method, stripeSessionId }) {
  quantity = parseQuantity(quantity);
  getEventForSale(eventId, quantity); // fail fast before generating QR images

  // QR images are generated asynchronously, so make them before the transaction.
  const prepared = await Promise.all(
    Array.from({ length: quantity }, async () => {
      const ticket_id = crypto.randomUUID();
      const signature = signTicket(ticket_id);
      const qr = await QRCode.toDataURL(JSON.stringify({ t: ticket_id, s: signature }), {
        width: 300,
        margin: 1,
      });
      return { ticket_id, signature, qr };
    })
  );

  const { bookingId, event } = saveBooking({ userId, eventId, quantity, method, stripeSessionId, prepared });
  return {
    bookingId,
    event,
    tickets: prepared.map((p) => ({ ticketId: p.ticket_id, qr: p.qr })),
  };
}

// Checks a scanned ticket and, if it is valid, marks it used (one entry per ticket).
function verifyAndUseTicket(ticketId, signature) {
  const expected = Buffer.from(signTicket(String(ticketId)), "hex");
  const given = Buffer.from(String(signature), "hex");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    throw new BookingError(401, "Invalid signature: this ticket is not genuine.");
  }

  const ticket = db
    .prepare(
      `SELECT t.*, e.title AS event_title, u.name AS holder
       FROM tickets t JOIN events e ON e.id = t.event_id JOIN users u ON u.id = t.user_id
       WHERE t.ticket_id = ?`
    )
    .get(String(ticketId));
  if (!ticket) throw new BookingError(404, "Ticket not found.");
  if (blockHash(ticket) !== ticket.block_hash) {
    throw new BookingError(409, "Ticket record failed the integrity check.");
  }
  if (ticket.status === "cancelled") throw new BookingError(410, "This ticket was cancelled.");

  const usedAt = new Date().toISOString();
  const { changes } = db
    .prepare("UPDATE tickets SET status = 'used', used_at = ? WHERE ticket_id = ? AND status = 'active'")
    .run(usedAt, ticket.ticket_id);
  if (changes === 0) {
    const when = db.prepare("SELECT used_at FROM tickets WHERE ticket_id = ?").get(ticket.ticket_id).used_at;
    throw new BookingError(409, `Already used${when ? " at " + new Date(when).toLocaleString("en-IN") : ""}.`);
  }

  return {
    message: `Entry granted: ${ticket.event_title} (${ticket.holder}, #${ticket.ticket_id.slice(0, 8).toUpperCase()})`,
    ticket: {
      ticketId: ticket.ticket_id,
      event: ticket.event_title,
      holder: ticket.holder,
      usedAt,
    },
  };
}

module.exports = { BookingError, parseQuantity, getEventForSale, createPaidBooking, verifyAndUseTicket };
