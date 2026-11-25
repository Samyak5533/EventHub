// Home page: hero ticket, event grid + filters, booking modal, login/sign-up modals.
(function () {
  "use strict";
  const { $, $$, escape } = EH;

  const CATEGORIES = [
    { name: "", label: "All events", icon: "bi-grid" },
    { name: "Concerts", label: "Concerts", icon: "bi-mic" },
    { name: "Music", label: "Music", icon: "bi-music-note-beamed" },
    { name: "Stand-up comedy", label: "Comedy", icon: "bi-emoji-laughing" },
    { name: "Sports", label: "Sports", icon: "bi-trophy" },
    { name: "Dance", label: "Dance", icon: "bi-stars" },
    { name: "Webinars", label: "Webinars", icon: "bi-laptop" },
    { name: "Dating events", label: "Dating", icon: "bi-heart" },
    { name: "Other", label: "Other", icon: "bi-balloon" },
  ];
  const FALLBACK_IMG = "/images/placeholder.png";

  let events = [];
  let current = null;
  let category = "";
  let requestId = 0;
  let statsShown = false;

  const modal = (id) => bootstrap.Modal.getOrCreateInstance(document.getElementById(id));
  const seatsLeft = (e) => Math.max(0, e.total_seats - (parseInt(e.tickets_sold, 10) || 0));

  // --- chips + marquee ---

  function renderChips() {
    $("#categoryChips").innerHTML = CATEGORIES.map(
      (c) => `<button type="button" class="chip ${c.name === category ? "is-active" : ""}" data-cat="${escape(c.name)}"
        aria-pressed="${c.name === category}"><i class="bi ${c.icon}"></i>${c.label}</button>`
    ).join("");
  }

  function renderMarquee() {
    const items = CATEGORIES.slice(1)
      .map((c) => `<span class="marquee-item"><i class="bi ${c.icon}"></i>${c.label}</span>`)
      .join("");
    $("#marquee").innerHTML = items + items; // twice, so the loop is seamless
  }

  // --- events grid ---

  function skeletons(count = 6) {
    return Array.from(
      { length: count },
      () => `<div class="skeleton-card" aria-hidden="true">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-line" style="width:70%"></div>
        <div class="skeleton skeleton-line" style="width:45%"></div>
        <div class="skeleton skeleton-line" style="width:85%;margin-bottom:24px"></div>
      </div>`
    ).join("");
  }

  function eventCard(e) {
    const left = seatsLeft(e);
    const pct = e.total_seats ? (left / e.total_seats) * 100 : 0;
    const barClass = pct < 20 ? "is-critical" : pct < 50 ? "is-low" : "";
    const when = new Date(e.date_time);
    const day = when.getDate();
    const month = when.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();

    let badge = "";
    if (left === 0) badge = '<span class="event-hot is-sold">Sold out</span>';
    else if (pct < 20) badge = `<span class="event-hot"><i class="bi bi-fire"></i> ${left} left</span>`;

    return `
      <article class="event-card card-in" data-id="${e.id}" data-spotlight role="button" tabindex="0"
               aria-label="${escape(e.title)}, ${escape(EH.price(e.price))}">
        <div class="event-media">
          <img src="${escape(e.image_url || FALLBACK_IMG)}" alt="" loading="lazy" />
          <span class="event-tag">${escape(e.category)}</span>
          ${badge}
          <span class="event-price">${EH.priceHtml(e.price)}</span>
        </div>
        <div class="event-body">
          <div class="event-date"><b>${day}</b><small>${month}</small></div>
          <h3 class="event-title">${escape(e.title)}</h3>
          <p class="event-meta"><i class="bi bi-geo-alt"></i>${escape(e.venue)}</p>
          <p class="event-meta"><i class="bi bi-clock"></i>${escape(EH.date(e.date_time, { weekday: "short" }))} · ${escape(EH.time(e.date_time))}</p>
          <div class="seats">
            <div class="seats-top"><span>Seats left</span><span>${left.toLocaleString("en-IN")} / ${e.total_seats.toLocaleString("en-IN")}</span></div>
            <div class="seats-bar"><i class="${barClass}" style="--w:${pct}%"></i></div>
          </div>
          <div class="event-actions">
            <button type="button" class="button button--soft button--sm">Details</button>
            <button type="button" class="button button--primary button--sm" ${left === 0 ? "disabled" : ""}>
              <i class="bi bi-ticket-perforated"></i>${left === 0 ? "Sold out" : "Book"}
            </button>
          </div>
        </div>
      </article>`;
  }

  function renderEvents({ animate = true } = {}) {
    const grid = $("#eventsList");
    $("#eventCount").textContent = `${events.length} event${events.length === 1 ? "" : "s"}`;

    if (!events.length) {
      grid.innerHTML = `
        <div class="state">
          <div class="state-icon"><i class="bi bi-calendar-x"></i></div>
          <h3>Nothing matches that</h3>
          <p>Try a different category or search term.</p>
        </div>`;
      return;
    }

    grid.innerHTML = events.map(eventCard).join("");
    const cards = $$(".event-card", grid);
    if (animate) EH.stagger(cards, 70);
    else cards.forEach((card) => card.classList.remove("card-in"));

    for (const card of cards) {
      EH.tilt(card, 6);
      card.querySelector("img").addEventListener("error", function () {
        if (!this.src.endsWith(FALLBACK_IMG)) this.src = FALLBACK_IMG;
      });
    }
  }

  // quiet = refresh in the background (after a booking) without skeletons or entrance animation
  async function loadEvents({ quiet = false } = {}) {
    const grid = $("#eventsList");
    const id = ++requestId;
    if (!quiet) grid.innerHTML = skeletons();

    const params = new URLSearchParams();
    if (category) params.set("category", category);
    const q = $("#searchInput").value.trim();
    if (q) params.set("q", q);

    const res = await EH.api("/api/events" + (params.size ? "?" + params : ""), { auth: false });
    if (id !== requestId) return; // a newer search already started

    if (!res.ok || !Array.isArray(res.data)) {
      $("#eventCount").textContent = "";
      grid.innerHTML = `
        <div class="state">
          <div class="state-icon"><i class="bi bi-wifi-off"></i></div>
          <h3>Couldn't load events</h3>
          <p>${escape(res.data.message || "The server didn't answer.")}</p>
          <button type="button" class="button button--primary mt-2" id="retryEvents">Try again</button>
        </div>`;
      $("#retryEvents").addEventListener("click", () => loadEvents());
      return;
    }

    events = res.data;
    if (!statsShown && !category && !q) {
      statsShown = true;
      showStats(events);
      showFeatured(events);
    }
    renderEvents({ animate: !quiet });
  }

  // --- hero ---

  function showStats(list) {
    const seats = list.reduce((sum, e) => sum + seatsLeft(e), 0);
    EH.countUp($("#statEvents"), list.length);
    EH.countUp($("#statCategories"), new Set(list.map((e) => e.category)).size);
    EH.countUp($("#statSeats"), seats, {
      duration: 1800,
      format: (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : Math.round(n)),
    });
  }

  // The hero ticket shows whichever upcoming event is selling best.
  function showFeatured(list) {
    if (!list.length) return;
    const soldShare = (e) => (parseInt(e.tickets_sold, 10) || 0) / e.total_seats;
    const pick = [...list].sort((a, b) => soldShare(b) - soldShare(a) || a.date_time.localeCompare(b.date_time))[0];

    $("#heroImg").src = pick.image_url || FALLBACK_IMG;
    $("#heroTag").textContent = pick.category;
    $("#heroTitle").textContent = pick.title;
    $("#heroDate").textContent = EH.date(pick.date_time, { day: "numeric", month: "short" }) + " · " + EH.time(pick.date_time);
    $("#heroVenue").textContent = pick.venue.split(",")[0];
    $("#heroPrice").textContent = EH.price(pick.price);
    $("#heroQr").innerHTML = EH.fakeQr(pick.id);
    const sold = parseInt(pick.tickets_sold, 10) || 0;
    $("#heroSold").textContent = sold ? `${sold} booked already` : "Just announced";

    const ticket = $("#heroTicket");
    ticket.dataset.id = pick.id;
    ticket.setAttribute("aria-label", `Featured: ${pick.title}`);
  }

  function initHeroTicket() {
    const ticket = $("#heroTicket");
    EH.tilt(ticket, 18, { x: 8, y: -14 });
    const open = () => ticket.dataset.id && openEvent(ticket.dataset.id);
    ticket.addEventListener("click", open);
    ticket.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open()));
  }

  // --- event modal + booking ---

  async function openEvent(id) {
    let e = events.find((x) => String(x.id) === String(id));
    if (!e) {
      const res = await EH.api("/api/events/" + encodeURIComponent(id), { auth: false });
      if (!res.ok) return EH.toast("That event isn't available anymore", "error");
      e = res.data;
    }
    current = e;
    const left = seatsLeft(e);

    $("#modalImage").src = e.image_url || FALLBACK_IMG;
    $("#modalCategory").textContent = e.category;
    $("#modalTitle").textContent = e.title;
    $("#modalDesc").textContent = e.description || "";
    $("#modalVenue").textContent = e.venue;
    $("#modalDate").textContent = EH.date(e.date_time, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " · " + EH.time(e.date_time);
    $("#modalSeats").textContent = `${left.toLocaleString("en-IN")} / ${e.total_seats.toLocaleString("en-IN")}`;
    $("#modalPrice").textContent = EH.price(e.price);
    $("#modalResult").innerHTML = "";
    $("#modalQty").value = "1";
    $("#modalQty").options[1].disabled = left < 2;

    const book = $("#modalBook");
    book.disabled = left === 0;
    book.innerHTML = left === 0 ? "Sold out" : '<i class="bi bi-ticket-perforated"></i>Book now';
    modal("eventModal").show();
  }

  function showResult(html, type) {
    $("#modalResult").innerHTML = `<div class="alert alert-${type} py-2 mb-0 pop">${html}</div>`;
  }

  function askToLogIn() {
    modal("eventModal").hide();
    setTimeout(() => modal("loginModal").show(), 300);
  }

  async function book() {
    const user = EH.user();
    if (!user) return askToLogIn();
    if (user.role === "admin") {
      return showResult("Admin accounts can't buy tickets. Log in as a regular user to book.", "warning");
    }

    const button = $("#modalBook");
    const quantity = parseInt($("#modalQty").value, 10) || 1;
    const body = { eventId: current.id, quantity };
    EH.setBusy(button, true, "Booking…");
    $("#modalResult").innerHTML = "";

    if ($("#modalPay").value === "stripe") {
      const pay = await EH.api("/api/payments/create-session", { method: "POST", body });
      if (pay.ok && pay.data.url) return (location.href = pay.data.url);
      if (pay.status !== 503) {
        EH.setBusy(button, false);
        return showResult(escape(pay.data.message || "Couldn't start the card payment."), "danger");
      }
      EH.toast("Card payments aren't set up yet, so we used demo payment.", "warning");
    }

    const res = await EH.api("/api/bookings/create", { method: "POST", body });
    EH.setBusy(button, false);
    if (res.status === 401) return askToLogIn();
    if (!res.ok) {
      showResult(escape(res.data.message || "Booking failed."), "danger");
      EH.shake($("#eventModal .booking-box"));
      return;
    }

    const r = button.getBoundingClientRect();
    EH.confetti(r.left + r.width / 2, r.top);
    EH.toast(`You're in! ${quantity} ticket${quantity > 1 ? "s" : ""} booked.`, "success");
    showResult('<i class="bi bi-check-circle-fill"></i> Booked! <a href="/my-tickets.html">See your tickets →</a>', "success");

    await loadEvents({ quiet: true });
    const fresh = events.find((x) => x.id === current.id);
    if (fresh) {
      current = fresh;
      const left = seatsLeft(fresh);
      $("#modalSeats").textContent = `${left.toLocaleString("en-IN")} / ${fresh.total_seats.toLocaleString("en-IN")}`;
      $("#modalQty").options[1].disabled = left < 2;
      if (!left) {
        button.disabled = true;
        button.textContent = "Sold out";
      }
    }
  }

  // --- navbar account area ---

  function renderUser() {
    const user = EH.user();
    $("#btnLogin").classList.toggle("d-none", !!user);
    $("#btnRegister").classList.toggle("d-none", !!user);
    $("#btnMyTickets").classList.toggle("d-none", !user || user.role === "admin");

    const area = $("#userArea");
    if (!user) {
      area.innerHTML = "";
      return;
    }
    area.innerHTML = `
      ${user.role === "admin" ? '<a href="/admin.html" class="button button--soft button--sm hide-sm"><i class="bi bi-speedometer2"></i>Dashboard</a>' : ""}
      <span class="user-chip hide-sm"><span class="avatar">${escape(EH.initials(user.name))}</span>${escape(user.name.split(" ")[0])}</span>
      <button type="button" class="theme-toggle" id="logoutBtn" aria-label="Log out" title="Log out"><i class="bi bi-box-arrow-right"></i></button>`;
    $("#logoutBtn").addEventListener("click", () => {
      EH.logout(null);
      renderUser();
      EH.toast("You're logged out", "info");
    });
  }

  // --- login / sign up modals ---

  async function submitAuth(e, isLogin) {
    e.preventDefault();
    const alert = $(isLogin ? "#loginAlert" : "#regAlert");
    const button = $(isLogin ? "#loginSubmit" : "#regSubmit");
    alert.classList.add("d-none");

    const body = isLogin
      ? { email: $("#loginEmail").value.trim(), password: $("#loginPassword").value }
      : { name: $("#regName").value.trim(), email: $("#regEmail").value.trim(), password: $("#regPassword").value };

    if (Object.values(body).some((v) => !v)) return EH.showAlert(alert, "Please fill in every field.");
    if (!isLogin && body.password.length < 6) return EH.showAlert(alert, "Password needs at least 6 characters.");

    EH.setBusy(button, true, isLogin ? "Logging in…" : "Creating account…");
    const res = await EH.api(isLogin ? "/api/auth/login" : "/api/auth/register", { method: "POST", body, auth: false });
    EH.setBusy(button, false);
    if (!res.ok || !res.data.token) return EH.showAlert(alert, res.data.message || "Something went wrong.");

    EH.setToken(res.data.token);
    modal(isLogin ? "loginModal" : "registerModal").hide();
    renderUser();
    const name = res.data.user.name.split(" ")[0];
    EH.toast(isLogin ? `Welcome back, ${name}!` : `Welcome aboard, ${name}!`, "success");
    if (!isLogin) EH.confetti(innerWidth / 2, innerHeight / 3);
    if (res.data.user.role === "admin") setTimeout(() => EH.go("/admin.html"), 700);
  }

  function initAuthModals() {
    $("#btnLogin").addEventListener("click", () => modal("loginModal").show());
    $("#btnRegister").addEventListener("click", () => modal("registerModal").show());

    const signUpOrContinue = () => {
      if (EH.isLoggedIn()) EH.go(EH.isAdmin() ? "/admin.html" : "/my-tickets.html");
      else modal("registerModal").show();
    };
    $("#heroSignUp").addEventListener("click", signUpOrContinue);
    $("#ctaSignUp").addEventListener("click", signUpOrContinue);

    $("#loginForm").addEventListener("submit", (e) => submitAuth(e, true));
    $("#registerForm").addEventListener("submit", (e) => submitAuth(e, false));

    const swap = (from, to) => (e) => {
      e.preventDefault();
      modal(from).hide();
      setTimeout(() => modal(to).show(), 250);
    };
    $("#switchToRegister").addEventListener("click", swap("loginModal", "registerModal"));
    $("#switchToLogin").addEventListener("click", swap("registerModal", "loginModal"));

    for (const button of $$("[data-fill-login]")) {
      button.addEventListener("click", () => {
        const [email, password] = button.dataset.fillLogin.split("|");
        $("#loginEmail").value = email;
        $("#loginPassword").value = password;
        $("#loginSubmit").focus();
      });
    }

    for (const id of ["loginModal", "registerModal"]) {
      document.getElementById(id).addEventListener("shown.bs.modal", () => $(`#${id} input`).focus());
    }
  }

  // --- wiring ---

  function initFilters() {
    $("#categoryChips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      category = chip.dataset.cat;
      for (const c of $$(".chip", $("#categoryChips"))) {
        const active = c === chip;
        c.classList.toggle("is-active", active);
        c.setAttribute("aria-pressed", active);
      }
      loadEvents();
    });

    let timer;
    $("#searchInput").addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadEvents(), 300);
    });
  }

  function initGrid() {
    const grid = $("#eventsList");
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".event-card");
      if (card) openEvent(card.dataset.id);
    });
    grid.addEventListener("keydown", (e) => {
      const card = e.target.closest(".event-card");
      if (card && e.target === card && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        openEvent(card.dataset.id);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderChips();
    renderMarquee();
    renderUser();
    initFilters();
    initGrid();
    initHeroTicket();
    initAuthModals();
    $("#modalBook").addEventListener("click", book);
    $("#modalImage").addEventListener("error", function () {
      if (!this.src.endsWith(FALLBACK_IMG)) this.src = FALLBACK_IMG;
    });
    loadEvents();
  });
})();
