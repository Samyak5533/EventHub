// Shared helpers for every page (loaded in <head>, exposed as window.EH).
(function () {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Set theme + "js" class before first paint so nothing flashes.
  let savedTheme = "dark";
  try {
    savedTheme = localStorage.getItem("theme") || "dark";
  } catch {}
  root.dataset.theme = savedTheme;
  root.classList.add("js");

  const EH = (window.EH = { reduceMotion });

  EH.$ = (sel, scope = document) => scope.querySelector(sel);
  EH.$$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];

  const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  EH.escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

  // --- auth ---

  EH.token = () => sessionStorage.getItem("token");
  EH.setToken = (token) => sessionStorage.setItem("token", token);

  EH.user = function () {
    const token = EH.token();
    if (!token) return null;
    try {
      const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes));
      if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error("expired");
      return payload;
    } catch {
      sessionStorage.removeItem("token");
      return null;
    }
  };

  EH.isLoggedIn = () => !!EH.user();
  EH.isAdmin = () => EH.user()?.role === "admin";

  EH.logout = function (redirectTo = "/login.html") {
    sessionStorage.removeItem("token");
    if (redirectTo) go(redirectTo);
  };

  // Bounce to login (or home, for non-admins on admin pages). Returns the user or null.
  EH.requireLogin = function ({ admin = false } = {}) {
    const user = EH.user();
    if (!user) {
      location.replace("/login.html?next=" + encodeURIComponent(location.pathname));
      return null;
    }
    if (admin && user.role !== "admin") {
      location.replace("/");
      return null;
    }
    return user;
  };

  // fetch wrapper: always resolves to { ok, status, data }.
  EH.api = async function (url, { method = "GET", body, auth = true } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const token = EH.token();
    if (auth && token) headers.Authorization = "Bearer " + token;

    try {
      const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && token) sessionStorage.removeItem("token");
      return { ok: res.ok, status: res.status, data: data || {} };
    } catch {
      return { ok: false, status: 0, data: { message: "Can't reach the server. Check your connection." } };
    }
  };

  // --- formatting ---
  // Prices are stored as USD-equivalent and shown in rupees (x84, capped at ₹10,000 a ticket).

  EH.inr = (usd) => Math.min((parseFloat(usd) || 0) * 84, 10000);
  EH.rupees = (amount) => "₹" + Math.round(amount).toLocaleString("en-IN");
  EH.price = (usd) => (EH.inr(usd) === 0 ? "Free" : EH.rupees(EH.inr(usd)));
  EH.priceHtml = (usd) => (EH.inr(usd) === 0 ? '<span class="badge-free">Free</span>' : EH.rupees(EH.inr(usd)));

  EH.date = (value, opts = { day: "numeric", month: "short", year: "numeric" }) =>
    value ? new Date(value).toLocaleDateString("en-IN", opts) : "TBA";
  EH.time = (value) => (value ? new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "");
  EH.dateTime = (value) => (value ? `${EH.date(value)} · ${EH.time(value)}` : "TBA");

  // --- toasts ---

  const TOAST_ICONS = {
    success: "bi-check-circle-fill",
    error: "bi-x-circle-fill",
    warning: "bi-exclamation-triangle-fill",
    info: "bi-info-circle-fill",
  };

  EH.toast = function (message, type = "info", ms = 3800) {
    let box = document.getElementById("toastContainer");
    if (!box) {
      box = document.createElement("div");
      box.id = "toastContainer";
      box.className = "toast-container";
      box.setAttribute("aria-live", "polite");
      document.body.append(box);
    }
    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.style.setProperty("--toast-ms", ms + "ms");
    toast.innerHTML = `<i class="bi ${TOAST_ICONS[type] || TOAST_ICONS.info} toast-icon"></i>
      <span>${EH.escape(message)}</span><span class="toast-progress"></span>`;
    box.append(toast);

    const close = () => {
      toast.classList.add("is-leaving");
      setTimeout(() => toast.remove(), 300);
    };
    toast.addEventListener("click", close);
    setTimeout(close, ms);
  };

  // --- small UI helpers ---

  EH.shake = function (el) {
    if (!el || reduceMotion) return;
    el.classList.remove("shake");
    void el.offsetWidth; // restart the animation
    el.classList.add("shake");
  };

  EH.showAlert = function (el, message) {
    el.textContent = message;
    el.classList.remove("d-none");
    EH.shake(el.closest("form, .modal-content") || el);
  };

  EH.setBusy = function (button, busy, label = "Please wait…") {
    if (!button) return;
    if (busy) {
      button.dataset.html = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="btn-spinner"></span>${EH.escape(label)}`;
    } else {
      button.disabled = false;
      if (button.dataset.html) button.innerHTML = button.dataset.html;
    }
  };

  EH.initials = (name = "") =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?";

  // A decorative QR-looking SVG (the real QR codes come from the server).
  EH.fakeQr = function (seed = 7) {
    let n = seed * 9301 + 49297;
    const rand = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
    const size = 21;
    const finder = (x, y) => x < 7 && y < 7;
    const isFinder = (x, y) => finder(x, y) || finder(size - 1 - x, y) || finder(x, size - 1 - y);
    let cells = "";
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isFinder(x, y) || rand() > 0.52) continue;
        cells += `<rect class="q" style="--d:${(rand() * 3).toFixed(2)}s" x="${x}" y="${y}" width="1" height="1"/>`;
      }
    }
    const eye = (x, y) =>
      `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.2" fill="none" stroke="#05080f" />` +
      `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx=".6" />`;
    return `<svg viewBox="0 0 ${size} ${size}" fill="#05080f" aria-hidden="true">${eye(0, 0)}${eye(14, 0)}${eye(0, 14)}${cells}</svg>`;
  };

  // --- animation helpers ---

  EH.countUp = function (el, target, { format = (n) => Math.round(n).toLocaleString("en-IN"), duration = 1400 } = {}) {
    if (!el) return;
    target = Number(target) || 0;
    if (reduceMotion || !target) {
      el.textContent = format(target);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = format(target * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  EH.stagger = function (elements, step = 60, max = 700) {
    elements.forEach((el, i) => el.style.setProperty("--delay", Math.min(i * step, max) + "ms"));
  };

  let revealObserver;
  EH.reveal = function (scope = document) {
    const items = EH.$$("[data-reveal]:not(.is-visible)", scope);
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    revealObserver ||= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach((el) => revealObserver.observe(el));
  };

  // Wrap each word of a heading so the words can slide up one by one.
  EH.splitWords = function (el) {
    let i = 0;
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const part of child.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) {
              frag.append(" ");
              continue;
            }
            const word = document.createElement("span");
            word.className = "word";
            word.innerHTML = `<span style="--i:${i++}">${EH.escape(part)}</span>`;
            frag.append(word);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      }
    };
    walk(el);
  };

  // 3D tilt that follows the pointer. Writes --rx/--ry (and --mx/--my for spotlights).
  EH.tilt = function (el, strength = 8, rest = { x: 0, y: 0 }) {
    if (reduceMotion || !finePointer) return;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--rx", ((0.5 - y) * strength).toFixed(2) + "deg");
      el.style.setProperty("--ry", ((x - 0.5) * strength).toFixed(2) + "deg");
      el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
      el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      el.classList.add("is-tilting");
    });
    el.addEventListener("pointerleave", () => {
      el.classList.remove("is-tilting");
      el.style.setProperty("--rx", rest.x + "deg");
      el.style.setProperty("--ry", rest.y + "deg");
    });
  };

  // Buttons marked data-magnetic lean toward the cursor.
  function magnetic(el) {
    if (reduceMotion || !finePointer) return;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--tx", ((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1) + "px");
      el.style.setProperty("--ty", ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + "px");
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--tx", "0px");
      el.style.setProperty("--ty", "0px");
    });
  }

  EH.confetti = function (x = innerWidth / 2, y = innerHeight / 2, count = 80) {
    if (reduceMotion) return;
    const colors = ["#2dd4bf", "#22d3ee", "#3b82f6", "#a7f3d0", "#ffffff", "#facc15"];
    const layer = document.createElement("div");
    layer.className = "confetti-layer";
    layer.setAttribute("aria-hidden", "true");
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("i");
      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 280;
      piece.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};animation-delay:${Math.random() * 120}ms`;
      piece.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      piece.style.setProperty("--dy", Math.sin(angle) * dist - 150 + "px");
      piece.style.setProperty("--rot", Math.random() * 720 - 360 + "deg");
      layer.append(piece);
    }
    document.body.append(layer);
    setTimeout(() => layer.remove(), 1900);
  };

  function ripple(e) {
    const target = e.target.closest(".button, .chip");
    if (!target || target.disabled || reduceMotion) return;
    const r = target.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 1.5;
    const wave = document.createElement("span");
    wave.className = "ripple";
    wave.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    target.append(wave);
    setTimeout(() => wave.remove(), 650);
  }

  // Fade the page out before following internal links.
  function go(url) {
    if (reduceMotion) {
      location.href = url;
      return;
    }
    root.classList.add("is-leaving");
    setTimeout(() => (location.href = url), 200);
  }
  EH.go = go;

  function pageTransitions() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
      e.preventDefault();
      go(url.href);
    });
    // Coming back with the back button restores the page from cache; un-fade it.
    addEventListener("pageshow", () => root.classList.remove("is-leaving"));
  }

  function themeToggle() {
    const button = document.getElementById("themeToggle");
    if (!button) return;
    const paint = () => {
      const dark = root.dataset.theme !== "light";
      button.innerHTML = `<i class="bi ${dark ? "bi-sun" : "bi-moon-stars"}"></i>`;
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    };
    paint();
    button.addEventListener("click", () => {
      const next = root.dataset.theme === "light" ? "dark" : "light";
      root.classList.add("theme-switching");
      root.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch {}
      paint();
      button.classList.remove("is-spinning");
      void button.offsetWidth;
      button.classList.add("is-spinning");
      setTimeout(() => root.classList.remove("theme-switching"), 450);
    });
  }

  function navbar() {
    const nav = document.querySelector(".nav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 20);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });

    document.getElementById("navBurger")?.addEventListener("click", () => nav.classList.toggle("is-open"));

    document.addEventListener("click", (e) => {
      const logout = e.target.closest("[data-logout]");
      if (!logout) return;
      e.preventDefault();
      EH.logout(logout.dataset.logout || "/login.html");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    themeToggle();
    navbar();
    pageTransitions();
    document.addEventListener("pointerdown", ripple);
    EH.$$("[data-split]").forEach(EH.splitWords);
    EH.$$("[data-magnetic]").forEach(magnetic);
    EH.reveal();
  });
})();
