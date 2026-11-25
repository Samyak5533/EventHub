// Stripe sends people back here with ?session_id=… — confirm it so the tickets get issued.
(function () {
  "use strict";
  const { $ } = EH;

  const CHECK = `
    <svg class="check-svg" viewBox="0 0 84 84" aria-hidden="true">
      <circle cx="42" cy="42" r="40" fill="none" stroke="#2dd4bf" stroke-width="4" />
      <path d="M25 43 l11 11 l23 -24" fill="none" stroke="#2dd4bf" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
  const icon = (name, color) => `<i class="bi ${name}" style="font-size:64px;color:${color}"></i>`;

  function show(iconHtml, title, message) {
    $("#statusIcon").innerHTML = iconHtml;
    $("#statusTitle").textContent = title;
    $("#statusMsg").textContent = message;
    $("#progress").classList.add("d-none");
    $("#actions").classList.remove("d-none");
  }

  async function confirmPayment() {
    const sessionId = new URLSearchParams(location.search).get("session_id");
    if (!sessionId) {
      return show(icon("bi-x-circle", "var(--danger)"), "That link doesn't look right", "There's no payment session in it. Please try booking again.");
    }

    const res = await EH.api("/api/payments/confirm?session_id=" + encodeURIComponent(sessionId));
    if (res.ok) {
      show(CHECK, "You're all set!", "Payment received and your QR tickets are ready. Taking you there now…");
      setTimeout(() => EH.confetti(innerWidth / 2, innerHeight / 3, 100), 500);
      setTimeout(() => EH.go("/my-tickets.html"), 3500);
    } else if (res.status === 0) {
      show(icon("bi-wifi-off", "var(--warning)"), "Connection problem", "We couldn't confirm it just now. Check My tickets in a minute.");
    } else {
      show(icon("bi-exclamation-circle", "var(--warning)"), "Heads up", res.data.message || "Payment received. Please check My tickets.");
    }
  }

  document.addEventListener("DOMContentLoaded", confirmPayment);
})();
