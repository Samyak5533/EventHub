async function createCheckout(eventId, qty) {
  const token = sessionStorage.getItem("token");
  if (!token) return (window.location = "/login.html");
  const res = await fetch("/api/payments/create-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ eventId, quantity: qty }),
  });
  const data = await res.json();
  if (data.url) window.location = data.url;
  else alert(data.message || "Error creating session");
}

// expose globally
window.createCheckout = createCheckout;
