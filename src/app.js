/*
  1) Get an API key from https://openweathermap.org/ (free tier)
  2) Replace the string below with your key.
  3) Serve the site with Live Server in VS Code (file:// will block fetch).
*/
const OPENWEATHER_API_KEY = 'AIzaSyD5IPE4Lr4S85lJLtiiAUmjgvfO7Q8Mclo';

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const locBtn = document.getElementById('locBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const favBtn = document.getElementById('favBtn');
  const clearFavBtn = document.getElementById('clearFavBtn');
  const unitToggle = document.getElementById('unitToggle');
  const viewHourly = document.getElementById('viewHourly');
  const viewDaily = document.getElementById('viewDaily');

  const locationLabel = document.getElementById('locationLabel');
  const tempEl = document.getElementById('temp');
  const descEl = document.getElementById('desc');
  const humidityEl = document.getElementById('humidity');
  const windEl = document.getElementById('wind');
  const feelsEl = document.getElementById('feels');
  const forecastEl = document.getElementById('forecast');
  const favoritesList = document.getElementById('favoritesList');

  let unit = 'metric'; // metric | imperial
  let view = 'hourly'; // hourly | daily
  let currentPlace = null; // string or {lat,lon,name}
  let favorites = JSON.parse(localStorage.getItem('wf_favs') || '[]');

  function ensureServingOverHttp() {
    if (location.protocol === 'file:') {
      alert('Please use Live Server (or any local server). Fetch requests are blocked when opening the file directly.');
      return false;
    }
    return true;
  }

  function setLoading(on) {
    if (on) {
      forecastEl.innerHTML = `<div class="forecast-card">Loading…</div>`;
      descEl.textContent = 'Loading…';
    }
  }

  function showError(msg) {
    locationLabel.textContent = '—';
    tempEl.textContent = '--°';
    descEl.textContent = msg;
    humidityEl.textContent = 'Humidity: —';
    windEl.textContent = 'Wind: —';
    feelsEl.textContent = 'Feels: —';
    forecastEl.innerHTML = `<div class="forecast-card">${msg}</div>`;
  }

  function renderFavorites() {
    favoritesList.innerHTML = '';
    favorites.forEach((f, idx) => {
      const li = document.createElement('li');
      li.className = 'fav-item';
      li.innerHTML = `<span>${f}</span><div>
        <button data-idx="${idx}" class="btn use-fav">Use</button>
        <button data-idx="${idx}" class="btn danger remove-fav">X</button>
      </div>`;
      favoritesList.appendChild(li);
    });
  }

  function iconUrl(code) {
    return `https://openweathermap.org/img/wn/${code}@2x.png`;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(()=>res.statusText);
      const err = new Error(`HTTP ${res.status}: ${text}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async function fetchCurrentByCoords(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${OPENWEATHER_API_KEY}`;
    return fetchJson(url);
  }

  async function fetchCurrentByQuery(q) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&units=${unit}&appid=${OPENWEATHER_API_KEY}`;
    return fetchJson(url);
  }

  async function fetchForecastByCoords(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${unit}&appid=${OPENWEATHER_API_KEY}`;
    return fetchJson(url);
  }

  async function fetchForecastByQuery(q) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(q)}&units=${unit}&appid=${OPENWEATHER_API_KEY}`;
    return fetchJson(url);
  }

  function renderForecastCardsFromList(list, count = 8) {
    forecastEl.innerHTML = '';
    const slice = list.slice(0, count);
    if (slice.length === 0) {
      forecastEl.innerHTML = `<div class="forecast-card">No forecast available</div>`;
      return;
    }
    slice.forEach(item => {
      const dtTxt = item.dt_txt || '';
      const temp = Math.round(item.main.temp);
      const desc = item.weather[0].description;
      const icon = item.weather[0].icon;
      const card = document.createElement('div');
      card.className = 'forecast-card';
      const timeLabel = dtTxt ? dtTxt.replace(' ', ' • ') : '';
      card.innerHTML = `<div class="fc-time">${timeLabel}</div>
        <img src="${iconUrl(icon)}" alt="${desc}" style="width:56px;height:56px"/>
        <div class="fc-temp">${temp}°${unit==='metric'?'C':'F'}</div>
        <div class="fc-desc">${desc}</div>`;
      forecastEl.appendChild(card);
    });
  }

  function groupForecastByDay(list) {
    const days = {};
    list.forEach(item => {
      const d = item.dt_txt.split(' ')[0];
      if (!days[d]) days[d] = [];
      days[d].push(item);
    });
    // return representative item per day (midday if possible)
    return Object.values(days).map(arr => {
      const middayIndex = Math.floor(arr.length / 2);
      return arr[middayIndex];
    });
  }

  async function fetchByQuery(qOrCoords) {
    if (OPENWEATHER_API_KEY === '<YOUR_API_KEY_HERE>') {
      alert('Set your OpenWeatherMap API key in src/app.js (OPENWEATHER_API_KEY).');
      return;
    }
    if (!ensureServingOverHttp()) return;

    try {
      setLoading(true);
      let currentData, forecastData, nameLabel;

      if (typeof qOrCoords === 'string') {
        currentData = await fetchCurrentByQuery(qOrCoords);
        forecastData = await fetchForecastByQuery(qOrCoords);
        nameLabel = `${currentData.name}, ${currentData.sys?.country || ''}`;
        currentPlace = qOrCoords;
      } else if (qOrCoords && qOrCoords.lat && qOrCoords.lon) {
        currentData = await fetchCurrentByCoords(qOrCoords.lat, qOrCoords.lon);
        forecastData = await fetchForecastByCoords(qOrCoords.lat, qOrCoords.lon);
        nameLabel = `${currentData.name || ''}, ${currentData.sys?.country || ''}`;
        currentPlace = { lat: qOrCoords.lat, lon: qOrCoords.lon, name: nameLabel };
      } else {
        throw new Error('Invalid query');
      }

      // Update current weather UI
      const tempVal = Math.round(currentData.main.temp);
      locationLabel.textContent = nameLabel || qOrCoords;
      tempEl.textContent = `${tempVal}°${unit==='metric'?'C':'F'}`;
      descEl.textContent = (currentData.weather?.[0]?.description || '—');
      humidityEl.textContent = `Humidity: ${currentData.main.humidity}%`;
      const speed = currentData.wind?.speed ?? 0;
      const windUnit = unit === 'metric' ? 'm/s' : 'mph';
      windEl.textContent = `Wind: ${speed} ${windUnit}`;
      feelsEl.textContent = `Feels: ${Math.round(currentData.main.feels_like)}°`;

      // Render forecast (3-hourly)
      if (view === 'hourly') {
        renderForecastCardsFromList(forecastData.list, 8);
      } else {
        const days = groupForecastByDay(forecastData.list);
        renderForecastCardsFromList(days, 5);
      }
    } catch (err) {
      console.error(err);
      if (err.status === 404) {
        showError('Location not found');
      } else {
        showError('Unable to fetch weather');
      }
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const {latitude, longitude} = pos.coords;
      fetchByQuery({lat: latitude, lon: longitude});
    }, err => {
      alert('Unable to get location');
    });
  }

  // Event bindings
  searchBtn.addEventListener('click', () => {
    const q = searchInput.value.trim();
    if (!q) { alert('Enter a city or ZIP'); return; }
    fetchByQuery(q);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchBtn.click();
  });

  locBtn.addEventListener('click', useCurrentLocation);

  refreshBtn.addEventListener('click', () => {
    if (!currentPlace) { alert('No place selected'); return; }
    fetchByQuery(currentPlace);
  });

  favBtn.addEventListener('click', () => {
    const key = typeof currentPlace === 'string' ? currentPlace : (currentPlace?.name || null);
    if (!key) { alert('No place to favorite'); return; }
    if (!favorites.includes(key)) {
      favorites.push(key);
      localStorage.setItem('wf_favs', JSON.stringify(favorites));
      renderFavorites();
    }
  });

  clearFavBtn.addEventListener('click', () => {
    if (!confirm('Clear all favorites?')) return;
    favorites = [];
    localStorage.removeItem('wf_favs');
    renderFavorites();
  });

  unitToggle.addEventListener('click', () => {
    unit = unit === 'metric' ? 'imperial' : 'metric';
    unitToggle.innerHTML = `Units: <strong>${unit === 'metric' ? '°C' : '°F'}</strong>`;
    if (currentPlace) fetchByQuery(currentPlace);
  });

  viewHourly.addEventListener('click', () => {
    view = 'hourly';
    viewHourly.classList.add('active');
    viewDaily.classList.remove('active');
    if (currentPlace) fetchByQuery(currentPlace);
  });

  viewDaily.addEventListener('click', () => {
    view = 'daily';
    viewDaily.classList.add('active');
    viewHourly.classList.remove('active');
    if (currentPlace) fetchByQuery(currentPlace);
  });

  favoritesList.addEventListener('click', (ev) => {
    const btn = ev.target;
    if (btn.matches('.use-fav')) {
      const idx = Number(btn.dataset.idx);
      const place = favorites[idx];
      if (place) fetchByQuery(place);
    }
    if (btn.matches('.remove-fav')) {
      const idx = Number(btn.dataset.idx);
      favorites.splice(idx, 1);
      localStorage.setItem('wf_favs', JSON.stringify(favorites));
      renderFavorites();
    }






});  // preserve placeholder text from HTML; no extra call here  renderFavorites();  // init  });  });

  // init
  renderFavorites();
  // preserve placeholder text from HTML; no extra call here
});