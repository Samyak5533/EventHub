const { PORT, STRIPE_SECRET_KEY } = require("./config");
const { db } = require("./db");
const { ensureSeed } = require("./seed");
const { createApp } = require("./app");

ensureSeed();

const server = createApp().listen(PORT, () => {
  console.log(`EventHub running at http://localhost:${PORT}`);
  if (!STRIPE_SECRET_KEY) console.log("Stripe not configured: card payments are off, Demo Payment works.");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Set another one, e.g. PORT=3001 npm start`);
    process.exit(1);
  }
  throw err;
});

// Close the database cleanly on Ctrl+C or when a host stops the process.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
