const bcrypt = require("bcryptjs");
const { db } = require("./db");
const config = require("./config");
const { localDateTime } = require("./util");
const sampleEvents = require("./seed-events.json");

function addUser(name, email, password, role, log) {
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) return;
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)").run(
    name,
    email,
    bcrypt.hashSync(password, 10),
    role
  );
  log(`Created ${role} account ${email}.`);
}

// Creates the admin account, the demo user and sample events on a fresh
// database. Safe to run on every start: it only fills in what is missing.
function ensureSeed({ log = console.log } = {}) {
  if (!db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get()) {
    addUser(config.ADMIN_NAME, config.ADMIN_EMAIL, config.ADMIN_PASSWORD, "admin", log);
  }
  if (config.DEMO_EMAIL) addUser(config.DEMO_NAME, config.DEMO_EMAIL, config.DEMO_PASSWORD, "user", log);

  const { count } = db.prepare("SELECT COUNT(*) AS count FROM events").get();
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO events (title, description, category, venue, date_time, price, total_seats, image_url)
      VALUES (@title, @description, @category, @venue, @date_time, @price, @total_seats, @image_url)
    `);
    db.transaction(() => {
      for (const { days_from_now, ...e } of sampleEvents) {
        const when = new Date();
        when.setDate(when.getDate() + days_from_now);
        when.setHours(19, 0, 0, 0);
        insert.run({ ...e, date_time: localDateTime(when) });
      }
    })();
    log(`Added ${sampleEvents.length} sample events.`);
  }
}

if (require.main === module) ensureSeed();

module.exports = { ensureSeed };
