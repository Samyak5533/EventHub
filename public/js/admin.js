// Admin dashboard: overview stats, events (add / edit / delete) and bookings.
(function () {
  "use strict";
  const { $, $$, escape } = EH;
  const USD_TO_INR = 84;
  const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80";

  const PAGES = {
    dashboard: ["Overview", "Here's how ticket sales are going."],
    events: ["Events", "Create, edit and keep an eye on every event."],
    bookings: ["Bookings", "Every ticket order, newest first."],
  };

  let events = [];

  const rupees = (usd) => EH.rupees((parseFloat(usd) || 0) * USD_TO_INR);
  const emptyRow = (cols, text) => `<tr class="empty-row"><td colspan="${cols}">${escape(text)}</td></tr>`;

  function animateRows(tbody) {
    const rows = $$("tr:not(.empty-row)", tbody);
    rows.forEach((row) => row.classList.add("row-in"));
    EH.stagger(rows, 35, 500);
  }

  function bookingRow(b, withId) {
    return `<tr>
      ${withId ? `<td class="text-muted">#${b.id}</td>` : ""}
      <td><div class="d-flex align-items-center gap-2"><span class="avatar" style="width:28px;height:28px;font-size:11px">${escape(EH.initials(b.user_name))}</span>${escape(b.user_email)}</div></td>
      <td>${escape(b.event_title)}</td>
      <td>${b.quantity}</td>
      <td><b>${rupees(b.total_amount)}</b></td>
      <td><span class="badge-status badge-status--ok">${escape(b.payment_status)}</span>${withId ? ` <small class="text-muted">${escape(b.payment_method)}</small>` : ""}</td>
      <td class="text-muted text-nowrap">${escape(EH.date(b.created_at))}</td>
    </tr>`;
  }

  // --- sections ---

  function show(name) {
    for (const s of $$(".admin-section")) s.classList.toggle("is-active", s.id === "section-" + name);
    for (const link of $$("[data-section]")) link.classList.toggle("is-active", link.dataset.section === name);
    $("#pageTitle").textContent = PAGES[name][0];
    $("#pageSub").textContent = PAGES[name][1];
    if (name === "dashboard") loadOverview();
    if (name === "events") loadEvents();
    if (name === "bookings") loadBookings();
  }

  // --- overview ---

  async function loadOverview() {
    const [stats, bookings] = await Promise.all([EH.api("/api/admin/stats"), EH.api("/api/admin/bookings")]);
    if (stats.status === 401 || stats.status === 403) return EH.requireLogin({ admin: true });

    if (stats.ok) {
      const d = stats.data;
      EH.countUp($("#statEvents"), d.totalEvents);
      EH.countUp($("#statBookings"), d.totalBookings);
      EH.countUp($("#statRevenue"), d.totalRevenue * USD_TO_INR, { format: EH.rupees, duration: 1600 });
      EH.countUp($("#statTicketsSold"), d.totalTicketsSold);
      EH.countUp($("#statTickets"), d.activeTickets);
      EH.countUp($("#statUsers"), d.totalUsers);
    } else {
      EH.toast(stats.data.message || "Couldn't load the numbers", "error");
    }

    const tbody = $("#recentBookingsBody");
    if (!bookings.ok) {
      tbody.innerHTML = emptyRow(6, bookings.data.message || "Couldn't load bookings");
      return;
    }
    const latest = bookings.data.slice(0, 8);
    tbody.innerHTML = latest.length ? latest.map((b) => bookingRow(b, false)).join("") : emptyRow(6, "No bookings yet — they'll show up here.");
    animateRows(tbody);
  }

  // --- events ---

  async function loadEvents() {
    const tbody = $("#eventsTableBody");
    tbody.innerHTML = emptyRow(7, "Loading…");
    const res = await EH.api("/api/admin/events");
    if (!res.ok) {
      tbody.innerHTML = emptyRow(7, res.data.message || "Couldn't load events");
      return;
    }
    events = res.data;
    renderEvents();
  }

  function renderEvents() {
    const tbody = $("#eventsTableBody");
    const q = $("#eventFilter").value.trim().toLowerCase();
    const list = q ? events.filter((e) => `${e.title} ${e.category} ${e.venue}`.toLowerCase().includes(q)) : events;

    if (!list.length) {
      tbody.innerHTML = emptyRow(7, events.length ? "No events match that filter." : "No events yet. Hit “New event” to add one.");
      return;
    }

    tbody.innerHTML = list
      .map((e) => {
        const sold = parseInt(e.tickets_sold, 10) || 0;
        const pct = Math.round((sold / e.total_seats) * 100);
        return `<tr>
          <td style="min-width:260px">
            <div class="d-flex align-items-center gap-3">
              <img src="${escape(e.image_url || "/images/placeholder.png")}" alt="" width="44" height="44" style="border-radius:10px;object-fit:cover" />
              <div><b>${escape(e.title)}</b><div class="text-muted small">${escape(e.venue)}</div></div>
            </div>
          </td>
          <td><span class="badge-status badge-status--muted">${escape(e.category)}</span></td>
          <td class="text-muted text-nowrap">${escape(EH.date(e.date_time))}</td>
          <td class="text-nowrap">${EH.priceHtml(e.price)}</td>
          <td style="min-width:130px">
            <div class="d-flex justify-content-between small"><span>${sold} / ${e.total_seats}</span><span class="text-muted">${pct}%</span></div>
            <div class="seats-bar mt-1"><i class="${pct >= 80 ? "is-critical" : pct >= 50 ? "is-low" : ""}" style="--w:${Math.max(pct, 2)}%"></i></div>
          </td>
          <td><b>${rupees(e.revenue)}</b></td>
          <td class="text-nowrap text-end">
            <button type="button" class="button button--soft button--sm" data-edit="${e.id}"><i class="bi bi-pencil"></i>Edit</button>
            <button type="button" class="button button--danger button--sm" data-delete="${e.id}" ${sold ? 'disabled title="Events with bookings can\'t be deleted"' : ""} aria-label="Delete"><i class="bi bi-trash3"></i></button>
          </td>
        </tr>`;
      })
      .join("");
    animateRows(tbody);
  }

  function openForm(e) {
    $("#formEventId").value = e ? e.id : "";
    $("#formTitle").value = e ? e.title : "";
    $("#formDesc").value = e ? e.description || "" : "";
    $("#formCategory").value = e ? e.category : "Concerts";
    $("#formVenue").value = e ? e.venue : "";
    $("#formDateTime").value = e ? e.date_time.slice(0, 16) : "";
    // The form works in rupees; prices are stored as USD-equivalent.
    $("#formPrice").value = e ? Math.round((parseFloat(e.price) || 0) * USD_TO_INR) : "";
    $("#formSeats").value = e ? e.total_seats : "100";
    $("#formImage").value = e ? e.image_url || "" : "";
    $("#formAlert").classList.add("d-none");
    $("#eventFormTitle").textContent = e ? "Edit event" : "New event";
    bootstrap.Modal.getOrCreateInstance($("#eventFormModal")).show();
  }

  async function saveEvent(e) {
    e.preventDefault();
    const id = $("#formEventId").value;
    const alert = $("#formAlert");
    alert.classList.add("d-none");

    const rupeePrice = parseFloat($("#formPrice").value) || 0;
    if (rupeePrice < 0 || rupeePrice > 10000) return EH.showAlert(alert, "Price has to be between ₹0 and ₹10,000.");

    const body = {
      title: $("#formTitle").value.trim(),
      description: $("#formDesc").value.trim(),
      category: $("#formCategory").value,
      venue: $("#formVenue").value.trim(),
      date_time: $("#formDateTime").value,
      price: Math.round((rupeePrice / USD_TO_INR) * 100) / 100,
      total_seats: parseInt($("#formSeats").value, 10) || 0,
      image_url: $("#formImage").value.trim() || DEFAULT_IMAGE,
    };
    if (!body.title || !body.venue || !body.date_time) return EH.showAlert(alert, "Title, venue and date are required.");

    const button = $("#btnSaveEvent");
    EH.setBusy(button, true, "Saving…");
    const res = await EH.api(id ? `/api/admin/events/${id}` : "/api/admin/events", { method: id ? "PUT" : "POST", body });
    EH.setBusy(button, false);
    if (!res.ok) return EH.showAlert(alert, res.data.message || "Couldn't save the event.");

    bootstrap.Modal.getInstance($("#eventFormModal")).hide();
    EH.toast(id ? "Event updated" : "Event created", "success");
    if (!$("#section-events").classList.contains("is-active")) show("events");
    else loadEvents();
  }

  async function deleteEvent(id) {
    const event = events.find((x) => String(x.id) === String(id));
    if (!event || !confirm(`Delete "${event.title}"? This can't be undone.`)) return;
    const res = await EH.api(`/api/admin/events/${id}`, { method: "DELETE" });
    if (!res.ok) return EH.toast(res.data.message || "Couldn't delete that event", "error");
    EH.toast(`Deleted "${event.title}"`, "info");
    loadEvents();
  }

  // --- bookings ---

  async function loadBookings() {
    const tbody = $("#bookingsTableBody");
    tbody.innerHTML = emptyRow(7, "Loading…");
    const res = await EH.api("/api/admin/bookings");
    if (!res.ok) {
      tbody.innerHTML = emptyRow(7, res.data.message || "Couldn't load bookings");
      return;
    }
    tbody.innerHTML = res.data.length ? res.data.map((b) => bookingRow(b, true)).join("") : emptyRow(7, "No bookings yet.");
    animateRows(tbody);
  }

  // --- wiring ---

  document.addEventListener("DOMContentLoaded", () => {
    const user = EH.requireLogin({ admin: true });
    if (!user) return;

    $("#adminName").textContent = user.name;
    $("#adminEmail").textContent = user.email;
    $("#adminAvatar").textContent = EH.initials(user.name);
    $("#logoutBtn").addEventListener("click", () => EH.logout("/login.html"));

    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-section]");
      if (target) show(target.dataset.section);
    });

    const cards = $$(".stat-card");
    EH.stagger(cards, 80);
    for (const card of cards) {
      card.addEventListener("click", () => show(card.dataset.goto));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          show(card.dataset.goto);
        }
      });
    }

    $("#btnAddEvent").addEventListener("click", () => openForm(null));
    $("#eventForm").addEventListener("submit", saveEvent);
    $("#eventFilter").addEventListener("input", renderEvents);
    $("#eventsTableBody").addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit]");
      const del = e.target.closest("[data-delete]");
      if (edit) openForm(events.find((x) => String(x.id) === edit.dataset.edit));
      if (del) deleteEvent(del.dataset.delete);
    });

    loadOverview();
  });
})();
