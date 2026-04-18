const api = {
  events: "/api/events",
  login: "/api/auth/login",
  register: "/api/auth/register",
  createBooking: "/api/bookings/create",
  createSession: "/api/payments/create-session",
  myTickets: "/api/bookings/tickets/my",
};

// ── Dark / Light Mode ─────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = next === "dark" ? "☀️" : "🌙";
}
window.toggleTheme = toggleTheme;

// ── Toast notifications ────────────────────────────────
function showToast(message, type = "info") {
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${
    icons[type] || "ℹ️"
  }</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Auth helpers ───────────────────────────────────────
function getToken() {
  return sessionStorage.getItem("token");
}
function authHeader() {
  const t = getToken();
  return t ? { Authorization: "Bearer " + t } : {};
}
function getPayload() {
  const t = getToken();
  if (!t) return null;
  try {
    return JSON.parse(atob(t.split(".")[1]));
  } catch {
    return null;
  }
}
function isLoggedIn() {
  return !!getToken();
}

// ── DOM helper ─────────────────────────────────────────
function qs(sel) {
  return document.querySelector(sel);
}

// ── Currency helpers (INR, max ₹10,000) ───────────────
function capPrice(usdPrice) {
  // prices in DB are stored in USD-equivalent; cap converted INR at 10000
  const inr = parseFloat(usdPrice) * 84;
  return Math.min(inr, 10000);
}
function inrPrice(usdPrice) {
  const n = parseFloat(usdPrice) || 0;
  if (n === 0) return '<span class="badge-free">FREE</span>';
  const inr = Math.min(n * 84, 10000);
  return "₹" + inr.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function inrNum(usdPrice) {
  const n = parseFloat(usdPrice) || 0;
  return Math.min(n * 84, 10000).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
}

// ── Category color map ─────────────────────────────────
const catClass = {
  Sports: "cat-sports",
  Concerts: "cat-concerts",
  "Stand-up comedy": "cat-comedy",
  "Dating events": "cat-dating",
  Webinars: "cat-webinars",
  Music: "cat-music",
  Dance: "cat-dance",
  Other: "cat-other",
};

// ── Sample fallback events ─────────────────────────────
const SAMPLE_EVENTS = [
  {
    id: "s1",
    title: "Lollapalooza 2026",
    description:
      "Four-day music festival featuring Charli XCX, Lorde, and Tate McRae as headliners with 100+ artists across 8 stages in Grant Park.",
    category: "Music",
    venue: "Grant Park, Chicago, IL",
    date_time: new Date(Date.now() + 60 * 864e5).toISOString(),
    total_seats: 5000,
    price: 99.0,
    image_url:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80",
  },
  {
    id: "s2",
    title: "Coachella Valley Music & Arts Festival",
    description:
      "The legendary desert music festival headlined by Sabrina Carpenter and Justin Bieber. World-class art installations and 100+ performers.",
    category: "Concerts",
    venue: "Empire Polo Club, Indio, CA",
    date_time: new Date(Date.now() + 20 * 864e5).toISOString(),
    total_seats: 3000,
    price: 119.0,
    image_url:
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80",
  },
  {
    id: "s3",
    title: "Netflix Is a Joke Fest 2026",
    description:
      "Week-long comedy extravaganza with 350+ live events across 35+ venues in Hollywood. Features the biggest names in comedy.",
    category: "Stand-up comedy",
    venue: "Hollywood Bowl, Los Angeles, CA",
    date_time: new Date(Date.now() + 35 * 864e5).toISOString(),
    total_seats: 1500,
    price: 65.0,
    image_url:
      "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=600&q=80",
  },
  {
    id: "s4",
    title: "NVIDIA GTC AI Conference 2026",
    description:
      "Premier AI and GPU technology conference with hundreds of sessions on generative AI, robotics, and deep learning. Keynote by Jensen Huang.",
    category: "Webinars",
    venue: "San Jose Convention Center, CA",
    date_time: new Date(Date.now() + 15 * 864e5).toISOString(),
    total_seats: 2000,
    price: 99.0,
    image_url:
      "https://images.pexels.com/photos/8849295/pexels-photo-8849295.jpeg",
  },
  {
    id: "s5",
    title: "Salsa Night",
    description:
      "Dance the night away with expert salsa instructors. Beginners welcome — come solo or bring a partner!",
    category: "Dance",
    venue: "Dance Studio Arena, Downtown",
    date_time: new Date(Date.now() + 7 * 864e5).toISOString(),
    total_seats: 150,
    price: 8.0,
    image_url:
      "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=600&q=80",
  },
  {
    id: "s7",
    title: "City Marathon 2026",
    description:
      "Annual city marathon open to all fitness levels. 5K, 10K and full marathon categories available for runners of all abilities.",
    category: "Sports",
    venue: "Central Park, New York",
    date_time: new Date(Date.now() + 45 * 864e5).toISOString(),
    total_seats: 500,
    price: 15.0,
    image_url:
      "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80",
  },
  {
    id: "s8",
    title: "TEDx Mumbai 2026",
    description:
      'A day of TED-style talks by local innovators, entrepreneurs, and thinkers. Theme: "Futures Reimagined." Networking lunch included.',
    category: "Other",
    venue: "NSCI Dome, Mumbai, India",
    date_time: new Date(Date.now() + 25 * 864e5).toISOString(),
    total_seats: 400,
    price: 18.0,
    image_url:
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&q=80",
  },
  {
    id: "s9",
    title: "Newport Jazz Festival 2026",
    description:
      "Three-day outdoor jazz showcase at historic Fort Adams State Park featuring jazz legends and rising stars on the Newport Harbor.",
    category: "Music",
    venue: "Fort Adams State Park, Newport, RI",
    date_time: new Date(Date.now() + 90 * 864e5).toISOString(),
    total_seats: 800,
    price: 89.0,
    image_url:
      "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&q=80",
  },
  {
    id: "s10",
    title: "Rolling Loud Hip Hop Festival",
    description:
      "Three-day hip-hop mega-festival featuring Chief Keef, Destroy Lonely, Sexyy Red and more. The world's largest hip-hop festival.",
    category: "Concerts",
    venue: "Hard Rock Stadium, Miami, FL",
    date_time: new Date(Date.now() + 80 * 864e5).toISOString(),
    total_seats: 4000,
    price: 119.0,
    image_url:
      "https://images.unsplash.com/photo-1665993546564-835ebe981745?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "s11",
    title: "AI Developer Summit 2026",
    description:
      "Two-day AI developer conference with hands-on workshops on LLMs, RAG, agents, and production AI systems. Led by top industry experts.",
    category: "Webinars",
    venue: "San Francisco Marriott Marquis, CA",
    date_time: new Date(Date.now() + 70 * 864e5).toISOString(),
    total_seats: 1500,
    price: 79.0,
    image_url:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  },
  {
    id: "s12",
    title: "NYC Ballet Spring Gala 2026",
    description:
      "Classical ballet featuring Firebird and Coppelia with world premiere performances by NYCB principal dancers at the prestigious Lincoln Center.",
    category: "Dance",
    venue: "David H. Koch Theater, New York, NY",
    date_time: new Date(Date.now() + 40 * 864e5).toISOString(),
    total_seats: 900,
    price: 79.0,
    image_url:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80",
  },
  {
    id: "s13",
    title: "Welcome to Rockville 2026",
    description:
      "Four-day rock festival featuring Foo Fighters, The Offspring, and My Chemical Romance at Daytona International Speedway.",
    category: "Concerts",
    venue: "Daytona International Speedway, FL",
    date_time: new Date(Date.now() + 42 * 864e5).toISOString(),
    total_seats: 4000,
    price: 119.0,
    image_url:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80",
  },
  {
    id: "s14",
    title: "The Riot Comedy Festival 2026",
    description:
      "Four-day comedy festival with stand-up, improv, and sketch comedy from acclaimed comedians across multiple stages.",
    category: "Stand-up comedy",
    venue: "Revention Music Center, Houston, TX",
    date_time: new Date(Date.now() + 150 * 864e5).toISOString(),
    total_seats: 600,
    price: 45.0,
    image_url:
      "https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=600&q=80",
  },
  {
    id: "s15",
    title: "Mumbai Marathon 2026",
    description:
      "Annual mass participation marathon with 5K, 10K, half and full marathon categories. India's largest running event with international elite athletes.",
    category: "Sports",
    venue: "Marine Drive, Mumbai, India",
    date_time: new Date(Date.now() + 30 * 864e5).toISOString(),
    total_seats: 3000,
    price: 12.0,
    image_url:
      "https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee?w=600&q=80",
  },
  {
    id: "s16",
    title: "Anime & Gaming Convention 2026",
    description:
      "Two-day fan convention celebrating anime, manga, cosplay, and gaming. Celebrity voice actors, cosplay contests, and exclusive screenings.",
    category: "Other",
    venue: "Bombay Exhibition Centre, Mumbai",
    date_time: new Date(Date.now() + 120 * 864e5).toISOString(),
    total_seats: 1500,
    price: 15.0,
    image_url:
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&q=80",
  },
  {
    id: "s17",
    title: "Diwali Cultural Night & Mela",
    description:
      "Grand Festival of Lights celebration with folk performances, fireworks, traditional food stalls, art exhibitions and live Bollywood music.",
    category: "Other",
    venue: "Exhibition Ground, Ahmedabad, India",
    date_time: new Date(Date.now() + 200 * 864e5).toISOString(),
    total_seats: 2000,
    price: 5.0,
    image_url:
      "https://images.unsplash.com/photo-1672107501496-156fe85ec6c5?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "s18",
    title: "Electric Daisy Carnival Vegas",
    description:
      "One of the world's largest EDM festivals with massive stages, art cars, carnival rides and fireworks. 3 nights of non-stop electronic music.",
    category: "Concerts",
    venue: "Las Vegas Motor Speedway, NV",
    date_time: new Date(Date.now() + 50 * 864e5).toISOString(),
    total_seats: 6000,
    price: 119.0,
    image_url:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80",
  },
  {
    id: "s19",
    title: "LA Singles Speed Dating — Santa Monica",
    description:
      "Popular singles event in Santa Monica with beautiful ocean views. Pre-event mingling, structured speed dates, and optional post-event dinner.",
    category: "Dating events",
    venue: "The Georgian Hotel, Santa Monica, CA",
    date_time: new Date(Date.now() + 17 * 864e5).toISOString(),
    total_seats: 70,
    price: 40.0,
    image_url:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80",
  },
  {
    id: "s20",
    title: "Berkshire Yoga & Wellness Festival",
    description:
      "Weekend yoga festival with 80+ teachers for 1000+ attendees. Morning flows, evening meditations, sound baths, and wellness workshops.",
    category: "Dance",
    venue: "Berkshire School of Music, Lenox, MA",
    date_time: new Date(Date.now() + 85 * 864e5).toISOString(),
    total_seats: 500,
    price: 99.0,
    image_url:
      "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80",
  },
  {
    id: "s21",
    title: "RockFest Live",
    description:
      "Top rock bands performing live on three stages. An unforgettable night of classic rock and modern alternative music.",
    category: "Concerts",
    venue: "Arena Stadium, City Center",
    date_time: new Date(Date.now() + 55 * 864e5).toISOString(),
    total_seats: 800,
    price: 30.0,
    image_url:
      "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&q=80",
  },
  {
    id: "s22",
    title: "Classical Evening",
    description:
      "Symphony orchestra performs classical masterpieces by Beethoven, Mozart, and Chopin in a grand concert hall.",
    category: "Music",
    venue: "Grand Concert Hall, Downtown",
    date_time: new Date(Date.now() + 33 * 864e5).toISOString(),
    total_seats: 400,
    price: 25.0,
    image_url:
      "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&q=80",
  },
  {
    id: "s23",
    title: "Basketball Finals",
    description:
      "Regional basketball championship finals. Watch the best teams battle it out for the title in this electrifying atmosphere.",
    category: "Sports",
    venue: "Sports Complex Hall",
    date_time: new Date(Date.now() + 22 * 864e5).toISOString(),
    total_seats: 1000,
    price: 20.0,
    image_url:
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80",
  },
  {
    id: "s24",
    title: "K-Pop Dance Workshop",
    description:
      "Learn iconic K-pop choreography from certified instructors. All skill levels welcome — from BTS to BLACKPINK moves!",
    category: "Dance",
    venue: "Studio 5 Dance Academy",
    date_time: new Date(Date.now() + 12 * 864e5).toISOString(),
    total_seats: 100,
    price: 12.0,
    image_url:
      "https://images.unsplash.com/photo-1502904550040-7534597429ae?w=600&q=80",
  },
  {
    id: "s25",
    title: "Digital Marketing Masterclass",
    description:
      "Improve your online presence with expert-led sessions on SEO, social media, paid ads, and content marketing strategies.",
    category: "Webinars",
    venue: "Online (Google Meet)",
    date_time: new Date(Date.now() + 5 * 864e5).toISOString(),
    total_seats: 1000,
    price: 5.0,
    image_url:
      "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=600&q=80",
  },
];

// ── State ──────────────────────────────────────────────
let allEvents = [];
let currentEvent = null;
let activeCategory = "";

// ── Load Events ────────────────────────────────────────
async function loadEvents(cat = activeCategory, q = "") {
  const grid = document.getElementById("eventsList");
  if (!grid) {
    console.warn("eventsList not found");
    return;
  }

  grid.innerHTML = Array.from(
    { length: 6 },
    () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-line w-90" style="margin-top:1rem"></div>
      <div class="skeleton skeleton-line w-75"></div>
      <div class="skeleton skeleton-line w-50" style="margin-bottom:1rem"></div>
    </div>
  `
  ).join("");

  const params = new URLSearchParams();
  if (cat) params.append("category", cat);
  if (q) params.append("q", q);

  let fromDB = false;
  try {
    const res = await fetch(
      api.events + (params.toString() ? "?" + params : "")
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        allEvents = data;
        fromDB = true;
      }
    }
  } catch (err) {
    console.warn("Events fetch failed:", err);
  }

  if (!fromDB) {
    let filtered = [...SAMPLE_EVENTS];
    if (cat) filtered = filtered.filter((e) => e.category === cat);
    if (q) {
      const ql = q.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(ql) ||
          e.description.toLowerCase().includes(ql)
      );
    }
    allEvents = filtered;
  }

  try {
    renderEvents(allEvents);
  } catch (err) {
    console.error("renderEvents failed:", err);
    // Emergency fallback — show basic list
    grid.innerHTML = allEvents
      .map(
        (e) => `
      <div class="event-card" style="cursor:pointer" onclick="openEventModal('${
        e.id
      }')">
        <div class="event-card-img">
          <img src="${e.image_url || ""}" alt="${
          e.title
        }" loading="lazy" style="width:100%;height:200px;object-fit:cover"
               onerror="this.src='https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80'" />
        </div>
        <div class="event-card-body">
          <div class="event-card-title">${e.title}</div>
          <div class="event-card-meta">📍 ${e.venue}</div>
          <div class="event-card-meta">💰 ${inrPrice(e.price)}</div>
        </div>
      </div>`
      )
      .join("");
  }
}

function renderEvents(events) {
  const grid = document.getElementById("eventsList");
  const countEl = document.getElementById("eventCount");
  if (!grid) return;

  if (countEl)
    countEl.textContent = `${events.length} event${
      events.length !== 1 ? "s" : ""
    } found`;

  if (!events.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🎭</div>
        <h3>No Events Found</h3>
        <p>Try changing the category or search term.</p>
      </div>`;
    return;
  }

  grid.innerHTML = events
    .map((e) => {
      const seatsTotal = e.total_seats || 100;
      const ticketsSold = parseInt(e.tickets_sold) || 0;
      const seatsAvail = Math.max(0, seatsTotal - ticketsSold);
      const seatsFill = Math.max(
        0,
        Math.min(100, (seatsAvail / seatsTotal) * 100)
      );
      const fillClass =
        seatsFill < 20 ? "danger" : seatsFill < 50 ? "warning" : "";
      const priceLabel = inrPrice(e.price);
      const dateStr = e.date_time
        ? new Date(e.date_time).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "TBA";
      const timeStr = e.date_time
        ? new Date(e.date_time).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      // Use data-id attribute instead of inline onclick with dynamic id
      return `
      <div class="event-card" data-id="${e.id}" role="button" tabindex="0">
        <div class="event-card-img">
          <img src="${e.image_url || "/images/placeholder.png"}" alt="${
        e.title
      }" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80'" />
          <span class="event-card-category">${e.category}</span>
          <span class="event-card-price">${priceLabel}</span>
        </div>
        <div class="event-card-body">
          <div class="event-card-title">${e.title}</div>
          <div class="event-card-meta"><span class="icon">📍</span>${
            e.venue
          }</div>
          <div class="event-card-meta"><span class="icon">📅</span>${dateStr}${
        timeStr ? " &bull; " + timeStr : ""
      }</div>
          <div class="mt-2 mb-1">
            <div class="d-flex justify-content-between" style="font-size:0.75rem;color:var(--text-muted)">
              <span>Seats Available</span><span>${seatsAvail} / ${seatsTotal}</span>
            </div>
            <div class="seats-progress">
              <div class="seats-fill ${fillClass}" style="width:${seatsFill}%"></div>
            </div>
          </div>
          <div class="event-card-footer">
            <button class="btn-view-detail" data-id="${e.id}">Details</button>
            <button class="btn-book-now" data-id="${e.id}">🎟 Book</button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  // Attach click listeners via event delegation — no inline onclick needed
  grid.querySelectorAll("[data-id]").forEach((el) => {
    el.addEventListener("click", function (ev) {
      ev.stopPropagation();
      openEventModal(this.dataset.id);
    });
  });
}

// ── Open Event Modal ───────────────────────────────────
async function openEventModal(id) {
  let e = allEvents.find((x) => String(x.id) === String(id));
  if (!e) {
    try {
      const res = await fetch("/api/events/" + id);
      if (res.ok) e = await res.json();
    } catch {}
  }
  if (!e) {
    showToast("Event not found", "error");
    return;
  }

  currentEvent = e;
  qs("#modalTitle").textContent = e.title;
  qs("#modalImage").src =
    e.image_url ||
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80";
  qs("#modalDesc").textContent = e.description || "";
  qs("#modalVenue").textContent = e.venue;
  qs("#modalDate").textContent = e.date_time
    ? new Date(e.date_time).toLocaleString("en-IN")
    : "TBA";
  qs("#modalPrice").textContent = inrNum(e.price);
  const modalSold = parseInt(e.tickets_sold) || 0;
  const modalAvail = Math.max(0, (e.total_seats || 0) - modalSold);
  qs("#modalSeats").textContent = `${modalAvail} / ${e.total_seats ?? "N/A"}`;
  const catBadge = qs("#modalCategoryBadge");
  if (catBadge) {
    catBadge.textContent = e.category;
    catBadge.className =
      "status-badge " + (catClass[e.category] || "cat-other");
  }
  qs("#modalResult").innerHTML = "";
  qs("#modalQty").value = "1";

  const modal = new bootstrap.Modal(document.getElementById("eventModal"));
  modal.show();
}
window.openEventModal = openEventModal;

// ── Book from modal ────────────────────────────────────
async function bookFromModal() {
  if (!isLoggedIn()) {
    bootstrap.Modal.getInstance(document.getElementById("eventModal"))?.hide();
    setTimeout(
      () => new bootstrap.Modal(document.getElementById("loginModal")).show(),
      300
    );
    return;
  }

  // Block admin from buying tickets
  const payload = getPayload();
  if (payload && payload.role === "admin") {
    showToast("Admin accounts cannot purchase tickets.", "error");
    return;
  }

  const qty = parseInt(qs("#modalQty").value, 10) || 1;
  const pay = qs("#modalPay").value;
  const btn = qs("#modalBook");
  const resultEl = qs("#modalResult");
  btn.disabled = true;
  btn.textContent = "⏳ Processing...";
  resultEl.innerHTML = "";

  if (pay === "stripe") {
    try {
      const res = await fetch(api.createSession, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ eventId: currentEvent.id, quantity: qty }),
      });
      const d = await res.json();
      if (d.url) {
        window.location = d.url;
        return;
      }
    } catch {}
    resultEl.innerHTML = `<div class="alert alert-warning py-2 small mt-2">Stripe not configured — using demo payment.</div>`;
  }

  try {
    const res = await fetch(api.createBooking, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ eventId: currentEvent.id, quantity: qty }),
    });
    const d = await res.json();
    if (res.ok) {
      showToast(
        `🎟 Booked ${qty} ticket${qty > 1 ? "s" : ""}! Check My Tickets.`,
        "success"
      );
      resultEl.innerHTML = `<div class="alert alert-success py-2 small mt-2">✅ Booking confirmed! <a href="/my-tickets.html" style="font-weight:700">View My Tickets →</a></div>`;
      loadEvents(activeCategory, qs("#searchInput")?.value || "");
    } else {
      showToast(d.message || "Booking failed", "error");
      resultEl.innerHTML = `<div class="alert alert-danger py-2 small mt-2">❌ ${
        d.message || "Booking failed"
      }</div>`;
    }
  } catch {
    showToast("Server error. Try again.", "error");
    resultEl.innerHTML = `<div class="alert alert-danger py-2 small mt-2">❌ Server error. Please try again.</div>`;
  }

  btn.disabled = false;
  btn.textContent = "🎟 Book Now";
}

// ── Auth: Login ────────────────────────────────────────
async function doLogin() {
  const email = qs("#loginEmail").value.trim();
  const pass = qs("#loginPassword").value;
  const alertEl = qs("#loginAlert");
  const btn = qs("#loginSubmit");
  alertEl.classList.add("d-none");

  if (!email || !pass) {
    alertEl.textContent = "Please fill all fields.";
    alertEl.classList.remove("d-none");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Signing in...";

  try {
    const res = await fetch(api.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass }),
    });
    const j = await res.json();
    if (j.token) {
      sessionStorage.setItem("token", j.token);
      bootstrap.Modal.getInstance(
        document.getElementById("loginModal")
      )?.hide();
      updateUserArea();
      showToast(
        `Welcome back, ${j.user?.name || email.split("@")[0]}! 🎉`,
        "success"
      );
    } else {
      alertEl.textContent = j.message || "Invalid email or password";
      alertEl.classList.remove("d-none");
    }
  } catch {
    alertEl.textContent = "Server error. Try again.";
    alertEl.classList.remove("d-none");
  }

  btn.disabled = false;
  btn.textContent = "Login to EventHub";
}

// ── Auth: Register ─────────────────────────────────────
async function doRegister() {
  const name = qs("#regName").value.trim();
  const email = qs("#regEmail").value.trim();
  const pass = qs("#regPassword").value;
  const alertEl = qs("#regAlert");
  const btn = qs("#regSubmit");
  alertEl.classList.add("d-none");

  if (!name || !email || !pass) {
    alertEl.textContent = "Please fill all fields.";
    alertEl.classList.remove("d-none");
    return;
  }
  if (pass.length < 6) {
    alertEl.textContent = "Password must be at least 6 characters.";
    alertEl.classList.remove("d-none");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Creating account...";

  try {
    const res = await fetch(api.register, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password: pass }),
    });
    const j = await res.json();
    if (j.token) {
      sessionStorage.setItem("token", j.token);
      bootstrap.Modal.getInstance(
        document.getElementById("registerModal")
      )?.hide();
      updateUserArea();
      showToast(`Welcome to EventHub, ${name}! 🎟`, "success");
    } else {
      alertEl.textContent = j.message || "Registration failed";
      alertEl.classList.remove("d-none");
    }
  } catch {
    alertEl.textContent = "Server error. Try again.";
    alertEl.classList.remove("d-none");
  }

  btn.disabled = false;
  btn.textContent = "Create My Account";
}

// ── Navbar user area ───────────────────────────────────
function updateUserArea() {
  const token = getToken();
  const userArea = document.getElementById("userArea");
  const btnLogin = document.getElementById("btnLogin");
  const btnRegister = document.getElementById("btnRegister");
  const btnMyTickets = document.getElementById("btnMyTickets");

  if (!token) {
    if (userArea) userArea.innerHTML = "";
    btnLogin?.classList.remove("d-none");
    btnRegister?.classList.remove("d-none");
    btnMyTickets?.classList.add("d-none");
    return;
  }

  const payload = getPayload();
  const name = payload?.name || payload?.email?.split("@")[0] || "User";
  const isAdmin = payload?.role === "admin";

  if (userArea) {
    userArea.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <span class="user-badge">👤 ${name}</span>
        ${
          isAdmin
            ? `<a href="/admin.html" class="btn-nav-admin">⚙️ Admin</a>`
            : ""
        }
        <button id="logoutBtn" class="btn-nav-logout">Logout</button>
      </div>`;
    // Attach logout listener via JS (not inline onclick) — reliable in all browsers
    document.getElementById("logoutBtn").addEventListener("click", doLogout);
  }

  btnLogin?.classList.add("d-none");
  btnRegister?.classList.add("d-none");
  btnMyTickets?.classList.remove("d-none");
}

function doLogout() {
  sessionStorage.removeItem("token");
  updateUserArea();
  showToast("Logged out successfully", "info");
}

// ── Category pills ─────────────────────────────────────
function initCategoryPills() {
  document.querySelectorAll(".category-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      document
        .querySelectorAll(".category-pill")
        .forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      activeCategory = pill.dataset.cat || "";
      loadEvents(activeCategory, qs("#searchInput")?.value || "");
    });
  });
}

// ── Search ─────────────────────────────────────────────
function initSearch() {
  let debounce;
  const inp = qs("#searchInput");
  if (inp) {
    inp.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(
        () => loadEvents(activeCategory, inp.value.trim()),
        350
      );
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loadEvents(activeCategory, inp.value.trim());
    });
  }
  qs("#btnRefresh")?.addEventListener("click", () => {
    loadEvents(activeCategory, qs("#searchInput")?.value || "");
  });
}

// ── Init on DOM ready ─────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  try {
    // Set theme toggle button icon
    const themeBtn = document.getElementById("themeToggle");
    if (themeBtn) {
      const cur = document.documentElement.getAttribute("data-theme") || "dark";
      themeBtn.textContent = cur === "dark" ? "☀️" : "🌙";
      themeBtn.addEventListener("click", toggleTheme);
    }

    updateUserArea();
    initCategoryPills();
    initSearch();
    loadEvents();

    // Login button → open login modal or redirect
    document.getElementById("btnLogin")?.addEventListener("click", () => {
      if (
        typeof bootstrap !== "undefined" &&
        document.getElementById("loginModal")
      ) {
        new bootstrap.Modal(document.getElementById("loginModal")).show();
      } else {
        window.location = "/login.html";
      }
    });

    // Register button → open register modal or redirect
    document.getElementById("btnRegister")?.addEventListener("click", () => {
      if (
        typeof bootstrap !== "undefined" &&
        document.getElementById("registerModal")
      ) {
        new bootstrap.Modal(document.getElementById("registerModal")).show();
      } else {
        window.location = "/register.html";
      }
    });

    // Hero sign-up button
    document.getElementById("heroSignUp")?.addEventListener("click", () => {
      if (isLoggedIn()) window.location = "/my-tickets.html";
      else if (
        typeof bootstrap !== "undefined" &&
        document.getElementById("registerModal")
      ) {
        new bootstrap.Modal(document.getElementById("registerModal")).show();
      } else {
        window.location = "/register.html";
      }
    });

    // Login form submit
    document.getElementById("loginSubmit")?.addEventListener("click", doLogin);
    document
      .getElementById("loginPassword")
      ?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doLogin();
      });

    // Register form submit
    document.getElementById("regSubmit")?.addEventListener("click", doRegister);
    document.getElementById("regPassword")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doRegister();
    });

    // Book button in modal
    document
      .getElementById("modalBook")
      ?.addEventListener("click", bookFromModal);

    // Switch modals
    document
      .getElementById("switchToRegister")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        bootstrap.Modal.getInstance(
          document.getElementById("loginModal")
        )?.hide();
        setTimeout(
          () =>
            new bootstrap.Modal(
              document.getElementById("registerModal")
            ).show(),
          250
        );
      });
    document.getElementById("switchToLogin")?.addEventListener("click", (e) => {
      e.preventDefault();
      bootstrap.Modal.getInstance(
        document.getElementById("registerModal")
      )?.hide();
      setTimeout(
        () => new bootstrap.Modal(document.getElementById("loginModal")).show(),
        250
      );
    });
  } catch (initErr) {
    console.error("Init error:", initErr);
    // Make sure events still load even if other init code fails
    loadEvents();
  }
});
