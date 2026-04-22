'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let googleToken = null;
let tokenClient = null;
let pendingGoogleCall = null;
let weatherCache = null;
let quoteCache = null;

// ─── Panel Management ─────────────────────────────────────────────────────────
const overlay = document.getElementById('overlay');

function openPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  overlay.classList.add('active');
  document.getElementById('panel-' + name).classList.add('active');
  loadPanel(name);
}

function closeAll() {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  overlay.classList.remove('active');
}

document.querySelectorAll('.hotspot').forEach(function(hs) {
  hs.addEventListener('click', function() { openPanel(hs.dataset.panel); });
});
overlay.addEventListener('click', closeAll);
document.querySelectorAll('.close-btn').forEach(function(btn) {
  btn.addEventListener('click', closeAll);
});
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeAll(); });

// ─── Panel Router ─────────────────────────────────────────────────────────────
function loadPanel(name) {
  var loaders = {
    weather:   loadWeather,
    calendar:  loadCalendar,
    todo:      loadTodo,
    portfolio: loadPortfolio,
    quotes:    loadQuotes,
  };
  if (loaders[name]) loaders[name]();
}

// ─── DOM Helpers ──────────────────────────────────────────────────────────────
function setBody(name, html) {
  document.getElementById('body-' + name).innerHTML = html;
}

function skeleton() {
  return '<div class="skeleton-block"></div>';
}

function errorMsg(msg) {
  return '<p class="msg-error">' + msg + '</p>';
}

function setupNotice(msg) {
  return '<div class="setup-notice">' + msg + '</div>';
}

// ─── Google OAuth (Google Identity Services) ──────────────────────────────────
function initGoogleAuth() {
  if (!CONFIG.GOOGLE_CLIENT_ID) return;
  var check = setInterval(function() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      clearInterval(check);
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        scope: [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/spreadsheets.readonly',
        ].join(' '),
        callback: function(resp) {
          if (resp.error) { console.error('Google auth error:', resp); return; }
          googleToken = resp.access_token;
          if (pendingGoogleCall) { pendingGoogleCall(); pendingGoogleCall = null; }
        },
      });
    }
  }, 100);
}

function withGoogleAuth(callback) {
  if (googleToken) { callback(); return; }
  if (!tokenClient) {
    setBody('calendar', setupNotice('Set <code>GOOGLE_CLIENT_ID</code> in <code>config.js</code>.'));
    return;
  }
  pendingGoogleCall = callback;
  tokenClient.requestAccessToken({ prompt: '' });
}

async function gFetch(url) {
  if (!googleToken) throw new Error('Not authenticated with Google');
  var r = await fetch(url, { headers: { Authorization: 'Bearer ' + googleToken } });
  if (!r.ok) {
    if (r.status === 401) googleToken = null;
    throw new Error('Google API error ' + r.status);
  }
  return r.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// WEATHER, MARKETS & NEWS
// ─────────────────────────────────────────────────────────────────────────────
async function loadWeather() {
  if (weatherCache) { setBody('weather', weatherCache); return; }
  setBody('weather', skeleton());

  if (!CONFIG.OPENWEATHER_KEY) {
    setBody('weather', setupNotice(
      'Add your <code>OPENWEATHER_KEY</code> in <code>config.js</code>.<br>' +
      'Free key at <a href="https://openweathermap.org/api" target="_blank">openweathermap.org</a>.'
    ));
    return;
  }

  var results = await Promise.allSettled([fetchWeather(), fetchNews()]);
  var weatherResult = results[0];
  var newsResult    = results[1];
  var html = '';

  if (weatherResult.status === 'fulfilled') {
    var w = weatherResult.value;
    var icon = 'https://openweathermap.org/img/wn/' + w.weather[0].icon + '@2x.png';
    html += [
      '<div class="weather-card">',
        '<img class="weather-icon" src="' + icon + '" alt="' + w.weather[0].description + '">',
        '<div>',
          '<div class="weather-temp">' + Math.round(w.main.temp) + '&deg;</div>',
          '<div class="weather-desc">' + w.weather[0].description + '</div>',
          '<div class="weather-meta">Feels like ' + Math.round(w.main.feels_like) + '&deg;</div>',
        '</div>',
      '</div>',
      '<div class="weather-stats">',
        '<span>H:' + Math.round(w.main.temp_max) + '&deg; L:' + Math.round(w.main.temp_min) + '&deg;</span>',
        '<span>Humidity ' + w.main.humidity + '%</span>',
        '<span>Wind ' + Math.round(w.wind.speed) + ' mph</span>',
      '</div>',
    ].join('');
  } else {
    html += errorMsg('Could not load weather.');
  }

  html += '<div class="section-label">Markets</div>';
  html += '<div id="market-rows"><div class="market-row"><span class="market-name" style="color:rgba(255,255,255,0.3)">Loading&hellip;</span></div></div>';

  html += '<div class="section-label">Headlines</div>';
  if (newsResult.status === 'fulfilled' && newsResult.value && newsResult.value.results && newsResult.value.results.length) {
    newsResult.value.results.slice(0, 6).forEach(function(a) {
      html += [
        '<a href="' + a.url + '" target="_blank" class="news-item">',
          '<div class="news-source">' + (a.section || 'NYTimes') + '</div>',
          '<div class="news-title">' + a.title + '</div>',
        '</a>',
      ].join('');
    });
  } else {
    html += setupNotice(
      'Add your <code>NYTIMES_KEY</code> in <code>config.js</code>.<br>' +
      'Free key at <a href="https://developer.nytimes.com" target="_blank">developer.nytimes.com</a>.'
    );
  }

  setBody('weather', html);
  weatherCache = html;
  loadMarkets();
}

async function fetchWeather() {
  var r = await fetch(
    'https://api.openweathermap.org/data/2.5/weather' +
    '?lat=' + CONFIG.LAT + '&lon=' + CONFIG.LON +
    '&units=imperial&appid=' + CONFIG.OPENWEATHER_KEY
  );
  if (!r.ok) throw new Error('Weather API ' + r.status);
  return r.json();
}

async function fetchNews() {
  if (!CONFIG.NYTIMES_KEY) return null;
  var r = await fetch(
    'https://api.nytimes.com/svc/topstories/v2/home.json?api-key=' + CONFIG.NYTIMES_KEY
  );
  if (!r.ok) throw new Error('NYTimes API ' + r.status);
  return r.json();
}

async function loadMarkets() {
  var el = document.getElementById('market-rows');
  if (!el) return;

  if (!CONFIG.ALPHA_VANTAGE_KEY) {
    el.innerHTML = setupNotice('Add <code>ALPHA_VANTAGE_KEY</code> in <code>config.js</code> for live market data.');
    return;
  }

  var tickers = [
    { symbol: 'DIA', name: 'DOW Jones' },
    { symbol: 'SPY', name: 'S&amp;P 500' },
    { symbol: 'QQQ', name: 'NASDAQ' },
  ];

  var results = await Promise.allSettled(tickers.map(function(t) {
    return fetchStockQuote(t.symbol);
  }));

  el.innerHTML = results.map(function(r, i) {
    if (r.status !== 'fulfilled') return '';
    var q = r.value && r.value['Global Quote'];
    if (!q || !q['05. price']) return '';
    var price = parseFloat(q['05. price']).toFixed(2);
    var changePct = parseFloat(q['10. change percent']);
    var cls = changePct >= 0 ? 'up' : 'down';
    var arrow = changePct >= 0 ? '&#9650;' : '&#9660;';
    return [
      '<div class="market-row">',
        '<span class="market-name">' + tickers[i].name + '</span>',
        '<span class="market-val ' + cls + '">$' + price + ' ' + arrow + ' ' + Math.abs(changePct).toFixed(2) + '%</span>',
      '</div>',
    ].join('');
  }).join('') || '<p class="msg-empty">Market data unavailable.</p>';
}

async function fetchStockQuote(symbol) {
  var r = await fetch(
    'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=' + symbol +
    '&apikey=' + CONFIG.ALPHA_VANTAGE_KEY
  );
  return r.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────────────────────────────────────────
function loadCalendar() {
  setBody('calendar', [
    '<iframe',
      ' src="https://calendar.google.com/calendar/embed?src=mitchygib%40gmail.com&src=2a5a4ab7a29a7703bb81e45b9cd1eaaa29e4727e04d0a441dc6fece8f7511c57%40group.calendar.google.com&ctz=America%2FLos_Angeles"',
      ' style="border:0; border-radius:8px; width:100%; height:480px; display:block;"',
      ' frameborder="0" scrolling="no">',
    '</iframe>',
  ].join(''));
}

// ─────────────────────────────────────────────────────────────────────────────
// TO-DO (Google Apps Script backend)
// ─────────────────────────────────────────────────────────────────────────────
var TODO_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxP7VQIrWgc7OwxKgToU8-WYadOWtGP023lohySzYbGW-fM4tobnQ9DOjm1g-BfCwvc/exec';
var todoCache = null;

async function todoFetch() {
  var r = await fetch(TODO_SCRIPT_URL + '?action=get');
  todoCache = await r.json();
  return todoCache;
}

async function todoSync(todos) {
  todoCache = todos;
  await fetch(TODO_SCRIPT_URL + '?action=save&todos=' + encodeURIComponent(JSON.stringify(todos)));
}

async function loadTodo() {
  setBody('todo', skeleton());
  try {
    var todos = await todoFetch();
    renderTodo(todos);
  } catch(e) {
    setBody('todo', errorMsg('Could not load todos: ' + e.message));
  }
}

function renderTodo(todos) {
  var active    = todos.filter(function(t) { return !t.done; });
  var completed = todos.filter(function(t) { return t.done; });

  var html = [
    '<div class="todo-add-row">',
      '<input class="todo-input" id="todo-input" type="text" placeholder="Add a task&hellip;" maxlength="200">',
      '<button class="todo-add-btn" id="todo-add-btn">Add</button>',
    '</div>',
  ].join('');

  if (active.length) {
    html += active.map(function(t) { return todoItemHTML(t, false); }).join('');
  } else {
    html += '<p class="msg-empty" style="margin:16px 0 8px">No tasks. Add one above.</p>';
  }

  if (completed.length) {
    html += '<div class="section-label" style="margin-top:24px">Completed</div>';
    html += completed.map(function(t) { return todoItemHTML(t, true); }).join('');
  }

  setBody('todo', html);

  var input  = document.getElementById('todo-input');
  var addBtn = document.getElementById('todo-add-btn');

  async function addTask() {
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    var todos = (todoCache || []).slice();
    todos.unshift({ id: Date.now(), text: text, done: false, doneAt: null });
    renderTodo(todos);
    await todoSync(todos);
  }

  addBtn.addEventListener('click', addTask);
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') addTask(); });

  document.querySelectorAll('.todo-check-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var id = parseInt(btn.dataset.id);
      var todos = (todoCache || []).slice();
      var t = todos.find(function(x) { return x.id === id; });
      if (!t) return;
      t.done = !t.done;
      t.doneAt = t.done ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
      renderTodo(todos);
      await todoSync(todos);
    });
  });

  document.querySelectorAll('.todo-del-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var id = parseInt(btn.dataset.id);
      var todos = (todoCache || []).filter(function(x) { return x.id !== id; });
      renderTodo(todos);
      await todoSync(todos);
    });
  });
}

function todoItemHTML(t, done) {
  return [
    '<div class="todo-item">',
      '<button class="todo-check-btn' + (done ? ' done' : '') + '" data-id="' + t.id + '">',
        done ? '&#x2713;' : '',
      '</button>',
      '<div class="todo-item-body">',
        '<div class="todo-text' + (done ? ' done' : '') + '">' + t.text + '</div>',
        done && t.doneAt ? '<div class="todo-date">Completed ' + t.doneAt + '</div>' : '',
      '</div>',
      '<button class="todo-del-btn" data-id="' + t.id + '" title="Delete">&times;</button>',
    '</div>',
  ].join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO (public Google Sheet CSV)
// ─────────────────────────────────────────────────────────────────────────────
var PORTFOLIO_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTzOlhVe3_xGSzIucFpzT5XFN8Y8KDp-5Z0G0_8-0iN5pUf2F32GbKLQxO6Rhas1aYN7ti1GcFbGK2F/pub?gid=0&single=true&output=csv';

function parseCSV(text) {
  return text.split('\n').map(function(line) {
    var result = [], cur = '', inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
  });
}

async function loadPortfolio() {
  setBody('portfolio', skeleton());
  try {
    var r = await fetch(PORTFOLIO_CSV);
    if (!r.ok) throw new Error('Could not load sheet');
    var rows = parseCSV(await r.text());

    var costBasisRow  = rows.find(function(r) { return r.indexOf('Total Cost Basis') !== -1; });
    var headerRow     = rows.find(function(r) { return r.indexOf('TICKER') !== -1; });
    var currentValRow = rows.find(function(r) { return r.indexOf('Current Value') !== -1; });
    var totalNetRow   = rows.find(function(r) { return r.indexOf('Total Net') !== -1; });
    var dayNetRow     = rows.find(function(r) { return r.indexOf('Day Net') !== -1; });

    var totalCost   = costBasisRow  ? parseFloat(costBasisRow[costBasisRow.indexOf('Total Cost Basis') + 1]) : null;
    var currentVal  = currentValRow ? parseFloat(currentValRow[currentValRow.indexOf('Current Value') + 1]) : null;
    var totalNetPct = totalNetRow   ? totalNetRow[totalNetRow.indexOf('Total Net') + 1] : null;
    var dayNetVal   = dayNetRow     ? parseFloat(dayNetRow[dayNetRow.indexOf('Day Net') + 1]) : null;

    // Positions: from header row up to the Lot details marker.
    // Use continue (not break) on blank rows so we don't stop at the blank row after the header.
    // Skip rows with unparseable prices (e.g. crypto #N/A entries).
    var lotIdx = rows.findIndex(function(r) { return r[1] === 'Lot details'; });
    var headerIdx = rows.indexOf(headerRow);
    var endIdx = lotIdx !== -1 ? lotIdx : rows.length;
    var positions = [];
    for (var i = headerIdx + 1; i < endIdx; i++) {
      var row = rows[i];
      var ticker = row[2];
      if (!ticker) continue;
      if (ticker === 'Cash') {
        positions.push({ cash: true, price: parseFloat(row[4]) });
        continue;
      }
      var price = parseFloat(row[4]);
      if (isNaN(price)) continue; // skip #N/A crypto rows
      positions.push({
        size:      row[1],
        ticker:    ticker,
        company:   row[3],
        price:     price,
        costBasis: parseFloat(row[5]),
        dayDelta:  parseFloat(row[6]),
        shares:    parseInt(row[7]),
        netDelta:  row[9],
        totalProf: parseFloat(row[10]),
      });
    }
    var lots = {};
    if (lotIdx !== -1) {
      var curTicker = null;
      for (var j = lotIdx + 1; j < rows.length; j++) {
        var lr = rows[j];
        if (lr[0] && lr[0] !== '' && !lr[0].startsWith(',')) curTicker = lr[0];
        var ticker2 = lr[0] || curTicker;
        if (!ticker2 || !lr[1]) continue;
        if (!lots[ticker2]) lots[ticker2] = [];
        lots[ticker2].push({ date: lr[1], shares: lr[2], price: lr[3], cost: lr[4], value: lr[5], basis: lr[6], prof: lr[7], days: lr[8] });
      }
    }

    var totalNetNum = totalNetPct ? parseFloat(totalNetPct) : null;
    var totalCls = totalNetNum !== null ? (totalNetNum >= 0 ? 'up' : 'down') : '';
    var dayCls   = dayNetVal !== null ? (dayNetVal >= 0 ? 'up' : 'down') : '';
    var plDollar = (currentVal && totalCost) ? (currentVal - totalCost) : null;

    var cashRow = positions.find(function(p) { return p.cash; });
    var cashVal = cashRow ? cashRow.price : 0;
    var totalWithCash = currentVal ? currentVal + cashVal : null;

    var html = '<div class="port-summary">';
    if (currentVal) {
      var valStr = '$' + currentVal.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
      var totalStr = totalWithCash ? ' ($' + totalWithCash.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}) + ')' : '';
      html += '<div class="port-stat port-stat-wide"><div class="port-stat-val">' + valStr + '<span class="port-cash-total">' + totalStr + '</span></div><div class="port-stat-lbl">Value</div></div>';
    }
    if (totalCost)   html += '<div class="port-stat"><div class="port-stat-val">$' + totalCost.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</div><div class="port-stat-lbl">Cost Basis</div></div>';
    if (plDollar !== null) html += '<div class="port-stat"><div class="port-stat-val ' + totalCls + '">' + (plDollar >= 0 ? '+' : '') + '$' + Math.abs(plDollar).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</div><div class="port-stat-lbl">Total P/L</div></div>';
    if (totalNetPct) html += '<div class="port-stat"><div class="port-stat-val ' + totalCls + '">' + totalNetPct + '</div><div class="port-stat-lbl">Total %</div></div>';
    if (dayNetVal !== null) html += '<div class="port-stat"><div class="port-stat-val ' + dayCls + '">' + (dayNetVal >= 0 ? '+' : '') + dayNetVal + '%</div><div class="port-stat-lbl">Today</div></div>';
    html += '</div>';

    html += '<div class="section-label">Positions</div>';
    html += '<div class="port-table">';
    html += '<div class="port-row port-header"><span>Ticker</span><span>Price</span><span>Shares</span><span>Day</span><span>Net P/L</span><span>$P/L</span></div>';

    positions.forEach(function(p) {
      if (p.cash) {
        html += '<div class="port-row"><span class="port-ticker">Cash</span><span>$' + p.price.toFixed(2) + '</span><span></span><span></span><span></span><span></span></div>';
        return;
      }
      var dayCls2  = p.dayDelta  >= 0 ? 'up' : 'down';
      var netCls   = parseFloat(p.netDelta) >= 0 ? 'up' : 'down';
      var profCls  = p.totalProf >= 0 ? 'up' : 'down';
      var profStr  = (p.totalProf >= 0 ? '+$' : '-$') + Math.abs(p.totalProf).toLocaleString();
      html += [
        '<div class="port-row" data-ticker="' + p.ticker + '">',
          '<span>',
            '<div class="port-ticker">' + p.ticker + '</div>',
            '<div class="port-co">' + p.company + '</div>',
          '</span>',
          '<span>$' + p.price.toFixed(2) + '</span>',
          '<span>' + (p.shares || '\u2013') + '</span>',
          '<span class="' + dayCls2 + '">' + (p.dayDelta >= 0 ? '+' : '') + p.dayDelta + '%</span>',
          '<span class="' + netCls + '">' + p.netDelta + '</span>',
          '<span class="' + profCls + '">' + profStr + '</span>',
        '</div>',
      ].join('');

      if (lots[p.ticker] && lots[p.ticker].length) {
        html += '<div class="lot-block" id="lots-' + p.ticker + '" style="display:none">';
        html += '<div class="lot-header"><span>Date</span><span>Shares</span><span>Cost</span><span>P/L</span><span>Days</span></div>';
        lots[p.ticker].forEach(function(l) {
          if (!l.date || l.date === 'Av') return;
          var lp = parseFloat((l.prof || '').replace(/[$,]/g,''));
          var lc = lp >= 0 ? 'up' : 'down';
          html += '<div class="lot-row"><span>' + l.date + '</span><span>' + l.shares + '</span><span>' + l.cost + '</span><span class="' + lc + '">' + l.prof + '</span><span>' + l.days + 'd</span></div>';
        });
        html += '</div>';
      }
    });

    html += '</div>';
    setBody('portfolio', html);

    document.querySelectorAll('.port-row[data-ticker]').forEach(function(row) {
      var ticker = row.dataset.ticker;
      var lotBlock = document.getElementById('lots-' + ticker);
      if (!lotBlock) return;
      row.style.cursor = 'pointer';
      row.addEventListener('click', function() {
        lotBlock.style.display = lotBlock.style.display === 'none' ? 'block' : 'none';
      });
    });

  } catch(e) {
    setBody('portfolio', errorMsg('Portfolio error: ' + e.message));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUOTES & BOOKS
// ─────────────────────────────────────────────────────────────────────────────
async function loadQuotes() {
  var html = '';

  try {
    var q = quoteCache || await fetchRandomQuote();
    quoteCache = q;
    html += [
      '<div class="quote-block">',
        '<div class="quote-text">&ldquo;' + q.content + '&rdquo;</div>',
        '<div class="quote-author">&mdash; ' + q.author + '</div>',
      '</div>',
      '<button class="new-quote-btn" id="new-quote-btn">New quote</button>',
    ].join('');
  } catch (e) {
    html += [
      '<div class="quote-block">',
        '<div class="quote-text">&ldquo;The unexamined life is not worth living.&rdquo;</div>',
        '<div class="quote-author">&mdash; Socrates</div>',
      '</div>',
    ].join('');
  }

  html += '<div class="section-label">Reading</div>';

  if (CONFIG.BOOKS_SHEET_ID && CONFIG.GOOGLE_CLIENT_ID) {
    html += '<div id="books-content">' + skeleton() + '</div>';
    setBody('quotes', html);
    wireNewQuoteBtn();
    loadBooks();
  } else if (CONFIG.BOOKS && CONFIG.BOOKS.length) {
    html += '<div id="books-content"></div>';
    setBody('quotes', html);
    wireNewQuoteBtn();
    renderBooks();
  } else {
    html += '<p class="msg-empty">Add books to <code>config.js</code> or a Google Sheet.</p>';
    setBody('quotes', html);
    wireNewQuoteBtn();
  }
}

function bookPagesKey(title) { return 'book_page_' + title.replace(/\s+/g, '_'); }

function renderBooks() {
  var el = document.getElementById('books-content');
  if (!el) return;

  el.innerHTML = CONFIG.BOOKS.map(function(b) {
    var savedPage = parseInt(localStorage.getItem(bookPagesKey(b.title)) || '0');
    var pct = b.pages ? Math.min(100, Math.round((savedPage / b.pages) * 100)) : null;
    var isDone = pct === 100;

    return [
      '<div class="book-item" data-title="' + b.title + '">',
        '<div class="book-cover">' + (b.cover ? '<img src="' + b.cover + '" alt="">' : '') + '</div>',
        '<div class="book-info">',
          '<div class="book-title">' + b.title + '</div>',
          '<div class="book-author">' + (b.author || '') + '</div>',
          b.pages ? [
            '<div class="book-progress-row">',
              '<div class="book-progress-bar"><div class="book-progress-fill" style="width:' + pct + '%"></div></div>',
              '<button class="book-page-btn" data-title="' + b.title + '" data-pages="' + b.pages + '">',
                isDone ? '100%' : (savedPage ? savedPage + ' / ' + b.pages + ' p (' + pct + '%)' : 'Add page'),
              '</button>',
            '</div>',
          ].join('') : '',
        '</div>',
      '</div>',
    ].join('');
  }).join('');

  el.querySelectorAll('.book-page-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var title = btn.dataset.title;
      var pages = parseInt(btn.dataset.pages);
      var current = parseInt(localStorage.getItem(bookPagesKey(title)) || '0');
      var input = prompt('Page you\'re on for "' + title + '" (out of ' + pages + '):', current || '');
      if (input === null) return;
      var page = Math.max(0, Math.min(pages, parseInt(input) || 0));
      localStorage.setItem(bookPagesKey(title), page);
      renderBooks();
    });
  });
}

function wireNewQuoteBtn() {
  var btn = document.getElementById('new-quote-btn');
  if (btn) btn.addEventListener('click', function() {
    quoteCache = null;
    loadQuotes();
  });
}

async function fetchRandomQuote() {
  var custom = (CONFIG.CUSTOM_QUOTES && CONFIG.CUSTOM_QUOTES.length) ? CONFIG.CUSTOM_QUOTES : [];
  if (custom.length && Math.random() < 0.5) {
    return custom[Math.floor(Math.random() * custom.length)];
  }
  try {
    var r = await fetch('https://api.quotable.io/quotes/random?limit=1');
    if (!r.ok) throw new Error('Quote API unavailable');
    var data = await r.json();
    return data[0];
  } catch(e) {
    if (custom.length) return custom[Math.floor(Math.random() * custom.length)];
    throw e;
  }
}

async function loadBooks() {
  var el = document.getElementById('books-content');
  if (!el) return;

  withGoogleAuth(async function() {
    try {
      var range = CONFIG.BOOKS_RANGE || 'Sheet1!A:D';
      var data = await gFetch(
        'https://sheets.googleapis.com/v4/spreadsheets/' + CONFIG.BOOKS_SHEET_ID +
        '/values/' + encodeURIComponent(range)
      );
      var rows = (data.values || []).slice(1).filter(function(r) { return r[0]; });
      if (!rows.length) { el.innerHTML = '<p class="msg-empty">No books found.</p>'; return; }

      el.innerHTML = rows.map(function(row) {
        var status = (row[2] || '').toLowerCase();
        return [
          '<div class="book-item">',
            '<div class="book-cover">' + (row[3] ? '<img src="' + row[3] + '" alt="">' : '') + '</div>',
            '<div>',
              '<div class="book-title">' + row[0] + '</div>',
              '<div class="book-author">' + (row[1] || '') + '</div>',
              '<span class="book-status' + (status === 'read' ? ' read' : '') + '">' + (status || 'reading') + '</span>',
            '</div>',
          '</div>',
        ].join('');
      }).join('');
    } catch (e) {
      el.innerHTML = errorMsg('Books error: ' + e.message);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECRET MODE · click dead space, type "mitchell" / "gibson" to toggle
// ─────────────────────────────────────────────────────────────────────────────
var secretMode = false;
var secretListening = false;
var secretTyped = '';
var secretTimer = null;

document.addEventListener('click', function(e) {
  var tag = e.target;
  if (tag.closest('.idx-item') || tag.closest('.hotspot') || tag.closest('.panel') || tag.id === 'overlay') return;
  if (tag.closest('.padres-card') || tag.closest('.assignments-card')) return;

  secretListening = true;
  secretTyped = '';
  clearTimeout(secretTimer);
  secretTimer = setTimeout(function() {
    secretListening = false;
    secretTyped = '';
  }, 3000);
});

document.addEventListener('keydown', function(e) {
  if (!secretListening) return;
  if (e.key.length !== 1) return;

  secretTyped += e.key.toLowerCase();
  var maxLen = Math.max('mitchell'.length, 'gibson'.length);
  if (secretTyped.length > maxLen) secretTyped = secretTyped.slice(-maxLen);

  if (!secretMode && secretTyped.endsWith('mitchell')) {
    secretListening = false;
    clearTimeout(secretTimer);
    activateSecretMode();
  } else if (secretMode && secretTyped.endsWith('gibson')) {
    secretListening = false;
    clearTimeout(secretTimer);
    deactivateSecretMode();
  }
});

function activateSecretMode() {
  secretMode = true;
  var bg = document.querySelector('.bg');
  var rainier = document.getElementById('rainier');
  var mast = document.querySelector('.masthead');
  var idx  = document.querySelector('.index');
  var stat = document.querySelector('.status');

  if (bg) { bg.style.transition = 'opacity 0.8s ease'; bg.style.opacity = '0'; }
  [mast, idx, stat].forEach(function(el) {
    if (!el) return;
    el.style.transition = 'opacity 0.5s ease';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
  });

  if (typeof buildRainier === 'function') buildRainier('rainier');
  setTimeout(function() { if (rainier) rainier.classList.add('visible'); }, 350);
}

function deactivateSecretMode() {
  secretMode = false;
  var bg = document.querySelector('.bg');
  var rainier = document.getElementById('rainier');
  var mast = document.querySelector('.masthead');
  var idx  = document.querySelector('.index');
  var stat = document.querySelector('.status');

  if (typeof hideElevCard === 'function') hideElevCard();
  hidePadresCard();
  if (rainier) rainier.classList.remove('visible');

  setTimeout(function() {
    if (bg) bg.style.opacity = '1';
    [mast, idx, stat].forEach(function(el) {
      if (!el) return;
      el.style.opacity = '';
      el.style.pointerEvents = '';
    });
  }, 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// PADRES · last 3 game results (MLB Stats API, teamId=135)
// ─────────────────────────────────────────────────────────────────────────────
async function showPadresCard() {
  var card = document.getElementById('padres-card');
  if (!card) return;
  card.classList.add('visible');
  document.getElementById('padres-games').innerHTML = '<div class="padres-loading">Loading&hellip;</div>';

  try {
    var now = new Date();
    var end = now.toISOString().slice(0, 10);
    var start = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    var url = 'https://statsapi.mlb.com/api/v1/schedule?teamId=135&gameType=R,S&startDate=' + start + '&endDate=' + end + '&sportId=1&hydrate=team';
    var r = await fetch(url);
    var data = await r.json();

    var games = [];
    (data.dates || []).forEach(function(d) {
      (d.games || []).forEach(function(g) {
        if (g.status && g.status.abstractGameState === 'Final') {
          games.push({ date: d.date, game: g });
        }
      });
    });
    var last3 = games.slice(-3).reverse();

    if (!last3.length) {
      document.getElementById('padres-games').innerHTML = '<div class="padres-loading">No recent games found.</div>';
      return;
    }

    document.getElementById('padres-games').innerHTML = last3.map(function(item) {
      var g = item.game;
      var home = g.teams.home;
      var away = g.teams.away;
      var isPadresHome = home.team.id === 135;
      var padres = isPadresHome ? home : away;
      var opp    = isPadresHome ? away : home;
      var won    = padres.score > opp.score;
      var dateStr = new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
      var venue  = isPadresHome ? 'HOME' : 'AWAY';

      return [
        '<div class="padres-game">',
          '<div class="padres-result ' + (won ? 'padres-w' : 'padres-l') + '">' + (won ? 'W' : 'L') + '</div>',
          '<div class="padres-info">',
            '<div class="padres-opponent">' + opp.team.name + ' &middot; ' + venue + '</div>',
            '<div class="padres-date">' + dateStr + '</div>',
          '</div>',
          '<div class="padres-score">' + padres.score + ' &ndash; ' + opp.score + '</div>',
        '</div>',
      ].join('');
    }).join('');

  } catch(e) {
    document.getElementById('padres-games').innerHTML = '<div class="padres-loading">Could not load scores.</div>';
  }
}

function hidePadresCard() {
  var card = document.getElementById('padres-card');
  if (card) card.classList.remove('visible');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
initGoogleAuth();
