async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Login/register handling
const btnLogin = document.getElementById("btnLogin");
const btnRegister = document.getElementById("btnRegister");

if (btnLogin)
  btnLogin.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const res = await postJSON("/api/auth/login", { email, password });
    if (res.token) {
      sessionStorage.setItem("token", res.token);
      window.location = "/events.html";
    } else {
      const a = document.getElementById("alert");
      a.className = "alert alert-danger";
      a.innerText = res.message || "Login failed";
      a.classList.remove("d-none");
    }
  });

if (btnRegister)
  btnRegister.addEventListener("click", async () => {
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const res = await postJSON("/api/auth/register", { name, email, password });
    if (res.token) {
      sessionStorage.setItem("token", res.token);
      window.location = "/events.html";
    } else {
      const a = document.getElementById("alert");
      a.className = "alert alert-danger";
      a.innerText = res.message || "Registration failed";
      a.classList.remove("d-none");
    }
  });
