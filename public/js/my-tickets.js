// My tickets: the signed-in user's tickets with their QR codes.
(function () {
  "use strict";
  const { $, escape } = EH;

  const STATUS = {
    active: '<span class="badge-status badge-status--ok">Ready for entry</span>',
    used: '<span class="badge-status badge-status--muted"><i class="bi bi-check2-all"></i>Used</span>',
    cancelled: '<span class="badge-status badge-status--bad"><i class="bi bi-x-lg"></i>Cancelled</span>',
  };

  const slug = (text) =>
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  function ticketHtml(t, i) {
    const code = t.ticket_id.slice(0, 8).toUpperCase();
    const used = t.status !== "active";
    return `
      <article class="ticket ${used ? "is-used" : ""}" style="--delay:${Math.min(i * 90, 900)}ms">
        <div class="ticket-media"><img src="${escape(t.image_url || "/images/placeholder.png")}" alt="" loading="lazy" /></div>
        <div class="ticket-main">
          ${STATUS[t.status] || STATUS.active}
          <h2>${escape(t.event)}</h2>
          <div class="ticket-facts">
            <span><i class="bi bi-calendar3"></i>${escape(EH.date(t.date_time, { weekday: "short", day: "numeric", month: "short", year: "numeric" }))}</span>
            <span><i class="bi bi-clock"></i>${escape(EH.time(t.date_time))}</span>
            ${t.venue ? `<span><i class="bi bi-geo-alt"></i>${escape(t.venue)}</span>` : ""}
          </div>
          <div class="ticket-code">#${escape(code)} · issued ${escape(EH.date(t.issued_at))}${
            t.used_at ? ` · scanned ${escape(EH.dateTime(t.used_at))}` : ""
          }</div>
        </div>
        <div class="ticket-stub">
          <img src="${t.qr}" alt="QR code for ticket ${escape(code)}" />
          <button type="button" class="button button--soft button--sm" data-download="${i}"><i class="bi bi-download"></i>Save</button>
        </div>
      </article>`;
  }

  function emptyState() {
    return `
      <div class="state panel">
        <div class="state-icon"><i class="bi bi-ticket-perforated"></i></div>
        <h3>No tickets yet</h3>
        <p>Once you book something, your QR tickets show up here.</p>
        <a href="/" class="button button--primary mt-2">Find an event <i class="bi bi-arrow-right"></i></a>
      </div>`;
  }

  async function load() {
    const list = $("#ticketsList");
    const res = await EH.api("/api/bookings/tickets/my");
    if (res.status === 401) return EH.requireLogin();
    if (!res.ok) {
      list.innerHTML = emptyState();
      return EH.toast(res.data.message || "Couldn't load your tickets", "error");
    }

    const tickets = res.data;
    if (!tickets.length) {
      list.innerHTML = emptyState();
      return;
    }

    const ready = tickets.filter((t) => t.status === "active").length;
    $("#ticketSummary").textContent = `${tickets.length} ticket${tickets.length === 1 ? "" : "s"} · ${ready} ready for entry`;
    list.innerHTML = tickets.map(ticketHtml).join("");

    list.addEventListener("click", (e) => {
      const button = e.target.closest("[data-download]");
      if (!button) return;
      const t = tickets[Number(button.dataset.download)];
      const link = document.createElement("a");
      link.href = t.qr;
      link.download = `ticket-${slug(t.event)}-${t.ticket_id.slice(0, 8)}.png`;
      link.click();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const user = EH.requireLogin();
    if (!user) return;
    if (user.role === "admin") return location.replace("/admin.html");
    $("#userChip").innerHTML = `<span class="avatar">${escape(EH.initials(user.name))}</span>${escape(user.name.split(" ")[0])}`;
    load();
  });
})();
