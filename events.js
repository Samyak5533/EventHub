const eventsList = document.getElementById('eventsList');
const categoryFilter = document.getElementById('categoryFilter');
const searchInput = document.getElementById('search');

async function loadEvents() {
  const category = categoryFilter.value;
  const q = searchInput.value;
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (q) params.append('q', q);
  try {
    const res = await fetch('/api/events?' + params.toString());
    const events = await res.json();
    eventsList.innerHTML = '';
    events.forEach(e => {
      const div = document.createElement('div');
      div.className = 'col-md-4';
      div.innerHTML = `
        <div class="card mb-3">
          <img src="${e.image_url || '/images/placeholder.png'}" class="card-img-top" />
          <div class="card-body">
            <h5 class="card-title">${e.title}</h5>
            <p class="card-text">${e.category} • ${new Date(e.date_time).toLocaleString()}</p>
            <p class="mb-1">Price: $${e.price}</p>
            <a href="/event.html?id=${e.id}" class="btn btn-sm btn-primary">View</a>
          </div>
        </div>
      `;
      eventsList.appendChild(div);
    });
  } catch (err) {
    console.error(err);
  }
}

categoryFilter.addEventListener('change', loadEvents);
searchInput.addEventListener('input', () => { setTimeout(loadEvents, 200); });

loadEvents();
