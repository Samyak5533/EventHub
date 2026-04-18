const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const detail = document.getElementById('eventDetail');

async function loadEvent() {
  try {
    const res = await fetch('/api/events/' + id);
    if (!res.ok) return detail.innerHTML = '<div class="alert alert-danger">Event not found</div>';
    const e = await res.json();
    detail.innerHTML = `
      <div class="col-md-8">
        <div class="card mb-3">
          <img src="${e.image_url || '/images/placeholder.png'}" class="card-img-top" />
          <div class="card-body">
            <h3>${e.title}</h3>
            <p class="text-muted">${e.category} • ${new Date(e.date_time).toLocaleString()}</p>
            <p>${e.description}</p>
            <p>Venue: ${e.venue}</p>
            <p>Price: ₹${Math.min(parseFloat(e.price) * 84, 10000).toLocaleString('en-IN', {maximumFractionDigits:0})}</p>
            <p>Seats Available: ${Math.max(0, (e.total_seats || 0) - (parseInt(e.tickets_sold) || 0))} / ${e.total_seats || 'N/A'}</p>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card p-3">
          <h5>Book Tickets</h5>
          <div class="mb-2">
            <label>Quantity</label>
            <select id="qty" class="form-select">
              <option>1</option>
              <option>2</option>
            </select>
          </div>
          <div class="mb-2">
            <label>Payment Method</label>
            <select id="payMethod" class="form-select">
              <option value="stripe">Card (Stripe)</option>
              <option value="mock">Mock Payment</option>
            </select>
          </div>
          <button id="btnBook" class="btn btn-success">Pay & Book</button>
          <div id="bookResult" class="mt-3"></div>
        </div>
      </div>
    `;
    document.getElementById('btnBook').addEventListener('click', book);
  } catch (err) {
    console.error(err);
    detail.innerHTML = '<div class="alert alert-danger">Error loading event</div>';
  }
}

async function book() {
  const token = sessionStorage.getItem('token');
  if (!token) return window.location = '/login.html';

  // Block admin from buying tickets
  try {
    const p = JSON.parse(atob(token.split('.')[1]));
    if (p.role === 'admin') {
      document.getElementById('bookResult').innerHTML = '<div class="alert alert-danger">Admin accounts cannot purchase tickets.</div>';
      return;
    }
  } catch {}

  const qty = document.getElementById('qty').value;
  const payMethod = document.getElementById('payMethod').value;
  const br = document.getElementById('bookResult');
  br.innerHTML = '';
  if (payMethod === 'stripe') {
    // create checkout session
    const res = await fetch('/api/payments/create-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ eventId: id, quantity: qty })
    });
    const data = await res.json();
    if (data.url) { window.location = data.url; return; }
    br.innerHTML = `<div class="alert alert-danger">${data.message || 'Failed to create payment session'}</div>`;
    return;
  }
  // fallback: mock booking
  const res = await fetch('/api/bookings/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ eventId: id, quantity: qty })
  });
  const data = await res.json();
  if (!res.ok) {
    br.innerHTML = `<div class="alert alert-danger">${data.message || 'Booking failed'}</div>`;
    return;
  }
  br.innerHTML = '<div class="alert alert-success">Booking successful. Your tickets appear below.</div>';
  data.tickets.forEach(t => {
    const div = document.createElement('div');
    div.className = 'ticket-card my-2';
    div.innerHTML = `<p>Ticket ID: ${t.ticketId}</p><img class="qr-img" src="${t.qr}" />`;
    br.appendChild(div);
  });
}

loadEvent();
