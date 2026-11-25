# EventHub

College project: discover events, book tickets, get a QR ticket, and verify it at the door.

- **Frontend:** plain HTML, CSS and JavaScript in `public/` (Bootstrap for the grid and modals, Bootstrap Icons)
- **Backend:** Node.js + Express in `server/`, with a SQLite database (a single file, nothing to install)

## Run it

Needs [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000. The first start creates the database in `data/`, an admin account, a demo user and 24 sample events.

| Command | What it does |
|---|---|
| `npm start` | Run the site |
| `npm run dev` | Run and restart automatically when server code changes |
| `npm test` | Run the automated API tests (uses a throwaway database) |

If port 3000 is busy, use another one: `PORT=3001 npm start`.

### Logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@eventhub.com` | `admin123` |
| Demo user | `demo@eventhub.com` | `demo123` |
| You | sign up on the site | |

The login screens have a "Demo" hint you can click to fill these in. To use different details, copy `.env.example` to `.env` and change them **before the first start** (they only create accounts that don't exist yet).

### Start over with a fresh database

Stop the server, delete `data/eventhub.db`, and start it again.

## How it works

| Page | What it does |
|---|---|
| `/` | Browse, filter and search upcoming events; book with Demo Payment or Stripe |
| `/register.html`, `/login.html` | Create an account / sign in (admins land on the dashboard) |
| `/my-tickets.html` | Your tickets with QR codes (download as PNG) |
| `/admin.html` | Admin: live stats, add/edit/delete events, all bookings |
| `/scanner.html` | Admin: scan a ticket QR with the camera, or paste its token and signature |

**Tickets.** Every ticket gets a random ID and an HMAC-SHA256 signature made with a server secret. The QR code holds `{"t": ticketId, "s": signature}`, so a ticket can't be forged without the secret. Each ticket also stores a hash of its own data plus the previous ticket's hash (a simple blockchain-style ledger), so editing an issued ticket in the database is detected when it's scanned. Only admins can scan, and each ticket gets in once.

**Seats.** The seat check and the booking happen in one database transaction, so an event can never be oversold. Each booking is 1 or 2 tickets. Past events are hidden from the list and can't be booked.

**Prices.** Prices are stored in a USD-equivalent unit and shown as INR (×84, max ₹10,000 per ticket), as the original frontend expected. The admin form works in ₹.

**Payments.**
- **Demo Payment** books instantly.
- **Card (Stripe)** needs a Stripe test key: put `STRIPE_SECRET_KEY=sk_test_...` in `.env`. Pay with the test card `4242 4242 4242 4242`. Without a key, the site falls back to Demo Payment.

**Security.**
- Passwords are hashed with bcrypt, and logins use signed JWTs that expire after 7 days.
- Security headers come from Helmet, including a Content Security Policy that only allows this site's own scripts plus the Bootstrap and QR-scanner CDNs.
- Failed logins are rate-limited (10 per 15 minutes per IP).
- All event text is HTML-escaped before it's shown, so an event title can't inject code.

**Design.** Dark-first "ocean" theme (teal → cyan → blue) with a light mode, Sora + Inter type, glass panels and Bootstrap Icons. Styles are in `public/css/styles.css`; motion is in `public/css/animations.css`, with helpers in `public/js/common.js`:
- **Background:** drifting aurora glow and a faint grid behind every page, plus a scroll progress bar.
- **Hero:** the headline slides in word by word, and a 3D featured ticket follows the cursor with a holographic sheen. Floating badges and count-up stats sit around it.
- **Event cards:** staggered entrance, 3D tilt, a cursor spotlight, a spinning gradient border on hover, and animated seat bars.
- **Buttons:** magnetic buttons that lean toward the cursor, with a shine sweep and ripple.
- **Navigation:** pages fade between each other, and the navbar shrinks as you scroll.
- **Feedback:** spring-in modals, toasts with a countdown bar, and confetti after booking or signing up.
- **Admin and scanner:** count-up stat tiles, animated table rows, and a scan line on the camera scanner.

Everything turns off automatically for visitors whose system is set to "reduce motion".

## API

All responses are JSON. Errors look like `{ "message": "..." }`. Routes marked 🔒 need `Authorization: Bearer <token>` from login.

| Method | Route | |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` → `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/api/events?category=&q=` | Upcoming events (with `tickets_sold`) |
| GET | `/api/events/:id` | One event |
| POST | `/api/bookings/create` 🔒 | `{ eventId, quantity }`: demo payment, returns tickets |
| GET | `/api/bookings/tickets/my` 🔒 | Your tickets |
| POST | `/api/payments/create-session` 🔒 | Start Stripe Checkout → `{ url }` |
| GET | `/api/payments/confirm?session_id=` | Issue tickets after Stripe payment |
| POST | `/api/verify` 🔒 admin | `{ token, signature }`: check a ticket and mark it used |
| GET | `/api/admin/stats` 🔒 admin | Dashboard numbers |
| GET | `/api/admin/bookings` 🔒 admin | All bookings |
| GET/POST | `/api/admin/events` 🔒 admin | List / create events |
| PUT/DELETE | `/api/admin/events/:id` 🔒 admin | Edit / delete an event (events with bookings can't be deleted) |

## Project layout

```
public/              frontend
  *.html             pages (no inline scripts)
  css/styles.css     design system
  css/animations.css motion layer
  css/admin.css      admin dashboard layout
  js/common.js       shared helpers: theme, toasts, auth, API, escaping, animations
  js/*.js            one script per page
  images/            favicon and placeholder image
server/
  index.js           starts the server
  app.js             Express app: security headers, API routes, static files
  config.js          settings from .env, auto-generated secrets
  db.js              SQLite tables
  seed.js            admin + demo accounts and sample events
  seed-events.json   sample event data
  middleware/        login checks
  routes/            auth, events, bookings, payments, admin, verify
  services/          booking, tickets and QR verification
test/                automated API tests (npm test)
data/                database and secrets (created on first run, not committed)
```
