// Log in (login.html) and sign up (register.html).
(function () {
  "use strict";
  const { $, $$ } = EH;

  // Only follow ?next= if it points back into this site.
  function nextPage(user) {
    const next = new URLSearchParams(location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    return user.role === "admin" ? "/admin.html" : "/";
  }

  const STRENGTH = [
    { width: "20%", color: "#f43f5e", label: "Very weak" },
    { width: "40%", color: "#f97316", label: "Weak" },
    { width: "60%", color: "#eab308", label: "Okay" },
    { width: "80%", color: "#22c55e", label: "Strong" },
    { width: "100%", color: "#2dd4bf", label: "Very strong" },
  ];

  function showStrength(password) {
    const bar = $("#strengthBar");
    const text = $("#strengthText");
    if (!password) {
      bar.style.width = "0";
      text.textContent = "";
      return;
    }
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const level = STRENGTH[Math.max(0, score - 1)];
    bar.style.width = level.width;
    bar.style.background = level.color;
    text.textContent = level.label;
    text.style.color = level.color;
  }

  async function submit(e) {
    e.preventDefault();
    const isLogin = e.target.id === "loginForm";
    const alert = $("#alert");
    const button = $("#submitBtn");
    alert.classList.add("d-none");

    const body = { email: $("#email").value.trim(), password: $("#password").value };
    if (!isLogin) body.name = $("#name").value.trim();
    if (Object.values(body).some((v) => !v)) return EH.showAlert(alert, "Please fill in every field.");
    if (!isLogin && body.password.length < 6) return EH.showAlert(alert, "Password needs at least 6 characters.");

    EH.setBusy(button, true, isLogin ? "Logging in…" : "Creating account…");
    const res = await EH.api(isLogin ? "/api/auth/login" : "/api/auth/register", { method: "POST", body, auth: false });
    if (!res.ok || !res.data.token) {
      EH.setBusy(button, false);
      return EH.showAlert(alert, res.data.message || "Something went wrong.");
    }

    EH.setToken(res.data.token);
    const user = res.data.user;
    const first = user.name.split(" ")[0];
    EH.toast(isLogin ? `Welcome back, ${first}!` : `Welcome aboard, ${first}!`, "success");
    if (!isLogin) {
      const r = button.getBoundingClientRect();
      EH.confetti(r.left + r.width / 2, r.top);
    }
    button.innerHTML = '<i class="bi bi-check-lg"></i> Done';
    setTimeout(() => EH.go(nextPage(user)), 700);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const user = EH.user();
    if (user) return location.replace(nextPage(user));

    const qr = $("#artQr");
    if (qr) qr.innerHTML = EH.fakeQr(42);

    const form = $("#loginForm") || $("#registerForm");
    form.addEventListener("submit", submit);

    for (const button of $$("[data-fill-login]")) {
      button.addEventListener("click", () => {
        const [email, password] = button.dataset.fillLogin.split("|");
        $("#email").value = email;
        $("#password").value = password;
        $("#submitBtn").focus();
      });
    }

    $("#registerForm") && $("#password").addEventListener("input", (e) => showStrength(e.target.value));
    ($("#name") || $("#email")).focus();
  });
})();
