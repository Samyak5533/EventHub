// End-to-end API tests. Run with: npm test
// Each run uses a brand-new database in a temporary folder.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "eventhub-test-"));
process.env.DATA_DIR = tmp;
process.env.DB_FILE = path.join(tmp, "test.db");
process.env.STRIPE_SECRET_KEY = "";

const config = require("../server/config");
const { db } = require("../server/db");
const { ensureSeed } = require("../server/seed");
const { createApp } = require("../server/app");

let server;
let base;

async function call(method, url, { body, token, raw } = {}) {
  const headers = {};
  if (body !== undefined || raw !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(base + url, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

const login = async (email, password) =>
  (await call("POST", "/api/auth/login", { body: { email, password } })).data.token;

const futureEvent = (over = {}) => ({
  title: "Test Event",
  description: "d",
  category: "Dance",
  venue: "Hall",
  date_time: "2099-01-10T18:30",
  price: 2,
  total_seats: 3,
  image_url: "",
  ...over,
});

let userToken;
let adminToken;

before(async () => {
  ensureSeed({ log: () => {} });
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://localhost:${server.address().port}`;

  const r = await call("POST", "/api/auth/register", {
    body: { name: "Test Student", email: "student@example.test", password: "secret12" },
  });
  userToken = r.data.token;
  adminToken = await login(config.ADMIN_EMAIL, config.ADMIN_PASSWORD);
});

after(() => {
  server.close();
  db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("events: list, filter, search, single, 404", async () => {
  let r = await call("GET", "/api/events");
  assert.equal(r.status, 200);
  assert.equal(r.data.length, 24);
  assert.ok(r.data.every((e) => !("revenue" in e)), "revenue is admin-only");

  r = await call("GET", "/api/events?category=Music");
  assert.ok(r.data.length > 0 && r.data.every((e) => e.category === "Music"));

  r = await call("GET", "/api/events?q=comedy");
  assert.ok(r.data.length > 0);

  assert.equal((await call("GET", "/api/events/1")).status, 200);
  assert.equal((await call("GET", "/api/events/9999")).status, 404);
  assert.equal((await call("GET", "/api/nope")).status, 404);
});

test("auth: register and login rules", async () => {
  const r = await call("POST", "/api/auth/register", {
    body: { name: "Someone", email: "someone@example.test", password: "secret12" },
  });
  assert.equal(r.status, 201);
  const payload = JSON.parse(Buffer.from(r.data.token.split(".")[1], "base64url"));
  assert.deepEqual([payload.name, payload.email, payload.role], ["Someone", "someone@example.test", "user"]);

  const dup = { name: "X", email: "SOMEONE@example.test", password: "secret12" };
  assert.equal((await call("POST", "/api/auth/register", { body: dup })).status, 409);
  const short = { name: "X", email: "a@b.co", password: "123" };
  assert.equal((await call("POST", "/api/auth/register", { body: short })).status, 400);

  const wrong = { email: "someone@example.test", password: "nope12" };
  assert.equal((await call("POST", "/api/auth/login", { body: wrong })).status, 401);
  assert.ok(await login("Someone@Example.test", "secret12"), "email is case-insensitive");
  assert.ok(await login(config.DEMO_EMAIL, config.DEMO_PASSWORD), "demo account works");
  assert.equal((await call("POST", "/api/auth/login", { raw: "{bad" })).status, 400);
});

test("bookings: demo payment issues signed QR tickets", async () => {
  const book = (body, token = userToken) => call("POST", "/api/bookings/create", { body, token });

  assert.equal((await book({ eventId: 1, quantity: 1 }, null)).status, 401);
  assert.equal((await book({ eventId: 1, quantity: 1 }, "x.y.z")).status, 401);
  assert.equal((await book({ eventId: 1, quantity: 3 })).status, 400);
  assert.equal((await book({ eventId: 9999, quantity: 1 })).status, 404);
  assert.equal((await book({ eventId: 1, quantity: 1 }, adminToken)).status, 403, "admins can't buy");

  const r = await book({ eventId: "1", quantity: "2" });
  assert.equal(r.status, 201);
  assert.equal(r.data.tickets.length, 2);
  assert.match(r.data.tickets[0].qr, /^data:image\/png;base64,/);
  assert.equal((await call("GET", "/api/events/1")).data.tickets_sold, 2);

  const mine = await call("GET", "/api/bookings/tickets/my", { token: userToken });
  assert.equal(mine.data.length, 2);
  for (const key of ["ticket_id", "qr", "status", "issued_at", "event", "date_time"]) assert.ok(key in mine.data[0]);
});

test("verify: genuine ticket enters once, forged ones are rejected", async () => {
  const t = db.prepare("SELECT ticket_id, signature FROM tickets ORDER BY id LIMIT 1").get();
  const verify = (token, signature, as = adminToken) => call("POST", "/api/verify", { body: { token, signature }, token: as });
  const forged = t.signature.slice(0, -1) + (t.signature.endsWith("0") ? "1" : "0");

  assert.equal((await verify(t.ticket_id, t.signature, null)).status, 401, "door staff must log in");
  assert.equal((await verify(t.ticket_id, t.signature, userToken)).status, 403, "only admins can scan");
  assert.equal((await verify(t.ticket_id, forged)).status, 401);
  assert.equal((await verify(t.ticket_id, "zz")).status, 401);
  assert.equal((await call("POST", "/api/verify", { body: {}, token: adminToken })).status, 400);

  const ok = await verify(t.ticket_id, t.signature);
  assert.equal(ok.status, 200);
  assert.match(ok.data.message, /^Entry granted/);
  assert.equal((await verify(t.ticket_id, t.signature)).status, 409, "second scan is refused");

  // Editing a stored ticket breaks its hash chain and is detected.
  const t2 = db.prepare("SELECT ticket_id, signature FROM tickets WHERE status = 'active' LIMIT 1").get();
  db.prepare("UPDATE tickets SET user_id = 1 WHERE ticket_id = ?").run(t2.ticket_id);
  assert.equal((await verify(t2.ticket_id, t2.signature)).status, 409);
});

test("payments: card payments report not configured without a Stripe key", async () => {
  const r = await call("POST", "/api/payments/create-session", { body: { eventId: 1, quantity: 1 }, token: userToken });
  assert.equal(r.status, 503);
  assert.equal((await call("GET", "/api/payments/confirm?session_id=cs_x")).status, 503);
});

test("admin: access control, stats and bookings", async () => {
  assert.equal((await call("GET", "/api/admin/stats", { token: userToken })).status, 403);
  const stats = await call("GET", "/api/admin/stats", { token: adminToken });
  assert.equal(stats.status, 200);
  assert.equal(stats.data.totalBookings, 1);
  assert.equal(stats.data.totalTicketsSold, 2);

  const bookings = await call("GET", "/api/admin/bookings", { token: adminToken });
  assert.equal(bookings.data[0].user_email, "student@example.test");
  const events = await call("GET", "/api/admin/events", { token: adminToken });
  assert.ok("revenue" in events.data[0]);
});

test("admin: event create, edit, seat limits and delete rules", async () => {
  const post = (body) => call("POST", "/api/admin/events", { body, token: adminToken });
  assert.equal((await post({ title: "X" })).status, 400);
  assert.equal((await post(futureEvent({ category: "Nope" }))).status, 400);

  const created = await post(futureEvent());
  assert.equal(created.status, 201);
  const id = created.data.id;
  const put = (body) => call("PUT", `/api/admin/events/${id}`, { body, token: adminToken });
  assert.equal((await put(futureEvent({ title: "Renamed" }))).status, 200);

  const book = (quantity) => call("POST", "/api/bookings/create", { body: { eventId: id, quantity }, token: userToken });
  assert.equal((await book(2)).status, 201);
  assert.equal((await book(2)).status, 409, "only one seat left");

  const race = await Promise.all([book(1), book(1), book(1)]);
  assert.equal(race.filter((r) => r.status === 201).length, 1, "exactly one buyer gets the last seat");
  assert.equal((await call("GET", `/api/events/${id}`)).data.tickets_sold, 3);

  assert.equal((await put(futureEvent({ total_seats: 1 }))).status, 400, "seats can't drop below sold");
  assert.equal((await call("DELETE", `/api/admin/events/${id}`, { token: adminToken })).status, 409);

  const unsold = await post(futureEvent({ title: "Tmp", price: 0 }));
  assert.equal((await call("DELETE", `/api/admin/events/${unsold.data.id}`, { token: adminToken })).status, 200);
});

test("past events are hidden and can't be booked", async () => {
  const past = await call("POST", "/api/admin/events", {
    body: futureEvent({ title: "Last Year", date_time: "2020-01-01T10:00" }),
    token: adminToken,
  });
  const list = await call("GET", "/api/events");
  assert.ok(!list.data.some((e) => e.id === past.data.id));
  const r = await call("POST", "/api/bookings/create", { body: { eventId: past.data.id, quantity: 1 }, token: userToken });
  assert.equal(r.status, 400);
});

test("site: pages, assets, security headers and 404 page", async () => {
  for (const url of ["/", "/login", "/css/styles.css", "/js/common.js", "/images/placeholder.png"]) {
    assert.equal((await fetch(base + url)).status, 200, url);
  }
  const home = await fetch(base + "/");
  assert.match(home.headers.get("content-security-policy"), /script-src 'self'/);
  assert.equal(home.headers.get("x-powered-by"), null);

  const missing = await fetch(base + "/no-such-page");
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /<html/i);
});

test("auth: repeated failed logins are rate limited", async () => {
  let last;
  for (let i = 0; i < 12; i++) {
    last = await call("POST", "/api/auth/login", { body: { email: "nobody@example.test", password: "wrong1" } });
  }
  assert.equal(last.status, 429);
});
