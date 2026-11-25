// Door scanner for admins: check a ticket by camera or by pasting its token + signature.
(function () {
  "use strict";
  const { $, escape } = EH;

  let scanner = null;
  let busy = false;
  const history = [];

  function showResult(el, ok, message) {
    el.className = "scan-result";
    void el.offsetWidth; // restart the pop-in animation
    el.className = "scan-result " + (ok ? "success" : "error");
    el.innerHTML = `<i class="bi ${ok ? "bi-check-circle-fill" : "bi-x-octagon-fill"}"></i><span>${escape(message)}</span>`;
  }

  function remember(ok, message) {
    history.unshift({ time: new Date().toLocaleTimeString("en-IN"), ok, message });
    $("#historyWrap").classList.remove("d-none");
    $("#historyBody").innerHTML = history
      .slice(0, 25)
      .map(
        (h, i) => `<tr class="${i === 0 ? "row-in" : ""}">
          <td class="text-muted">${escape(h.time)}</td>
          <td><span class="badge-status ${h.ok ? "badge-status--ok" : "badge-status--bad"}">${h.ok ? "Let in" : "Refused"}</span></td>
          <td>${escape(h.message)}</td>
        </tr>`
      )
      .join("");
  }

  async function verify(token, signature, resultEl) {
    const res = await EH.api("/api/verify", { method: "POST", body: { token, signature } });
    if (res.status === 401 || res.status === 403) return EH.requireLogin({ admin: true });

    const message = res.data.message || (res.ok ? "Valid ticket" : "Couldn't verify this ticket");
    showResult(resultEl, res.ok, message);
    remember(res.ok, message);
    EH.toast(message, res.ok ? "success" : "error");
    if (res.ok) {
      navigator.vibrate?.(80);
      const r = resultEl.getBoundingClientRect();
      EH.confetti(r.left + r.width / 2, r.top, 40);
    }
  }

  // --- camera ---

  function startCamera() {
    if (scanner) return;
    if (typeof Html5QrcodeScanner === "undefined") {
      return EH.toast("The scanner library didn't load. Check your internet connection.", "error");
    }
    const resultEl = $("#scanResult");
    resultEl.className = "scan-result";

    scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 240, height: 240 },
      rememberLastUsedCamera: true,
      showTorchButtonIfSupported: true,
    });
    $("#reader").classList.add("is-scanning");
    $("#btnStartScan").classList.add("d-none");
    $("#btnStopScan").classList.remove("d-none");

    scanner.render(
      async (text) => {
        if (busy) return;
        let payload = null;
        try {
          payload = JSON.parse(text);
        } catch {}
        if (!payload?.t || !payload?.s) {
          showResult(resultEl, false, "That QR code isn't an EventHub ticket");
          return remember(false, "Unknown QR code");
        }

        busy = true;
        try {
          scanner.pause(true);
        } catch {}
        await verify(payload.t, payload.s, resultEl);

        // Give the door person a moment to read the result, then keep scanning.
        setTimeout(() => {
          busy = false;
          try {
            scanner?.resume();
          } catch {}
        }, 2500);
      },
      () => {} // "no QR in view" fires constantly while scanning; ignore it
    );
  }

  function stopCamera() {
    scanner?.clear().catch(() => {});
    scanner = null;
    busy = false;
    $("#reader").classList.remove("is-scanning");
    $("#reader").innerHTML = "";
    $("#btnStartScan").classList.remove("d-none");
    $("#btnStopScan").classList.add("d-none");
  }

  // --- manual entry ---

  async function verifyManually(e) {
    e.preventDefault();
    const token = $("#manualToken").value.trim();
    const signature = $("#manualSig").value.trim();
    const resultEl = $("#manualResult");
    if (!token || !signature) return showResult(resultEl, false, "Enter both the token and the signature");

    const button = $("#btnVerify");
    EH.setBusy(button, true, "Checking…");
    await verify(token, signature, resultEl);
    EH.setBusy(button, false);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!EH.requireLogin({ admin: true })) return;
    $("#btnStartScan").addEventListener("click", startCamera);
    $("#btnStopScan").addEventListener("click", stopCamera);
    $("#manualForm").addEventListener("submit", verifyManually);
    $("#btnClearHistory").addEventListener("click", () => {
      history.length = 0;
      $("#historyBody").innerHTML = "";
      $("#historyWrap").classList.add("d-none");
    });
  });
})();
