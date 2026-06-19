'use strict'

const http = require('http')
const fs = require('fs')
const path = require('path')

const AGGREGATORS_DIR = path.join(__dirname, 'data/api-aggregators')
const PROVIDERS_DIR = path.join(__dirname, 'data/account-providers')

function loadAggregators () {
  return fs.readdirSync(AGGREGATORS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(AGGREGATORS_DIR, f), 'utf8')) }
      catch (e) { return null }
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label))
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Open Banking Tracker</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; color: #e2e8f0; min-height: 100vh; }
  header { background: #1a1d27; border-bottom: 1px solid #2d3148; padding: 20px 32px; display: flex; align-items: center; gap: 16px; }
  header h1 { font-size: 1.4rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
  header .badge { background: #6366f1; color: #fff; font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
  .toolbar { padding: 20px 32px; display: flex; gap: 12px; align-items: center; }
  .search { flex: 1; max-width: 420px; background: #1a1d27; border: 1px solid #2d3148; border-radius: 8px; padding: 10px 14px; color: #e2e8f0; font-size: 0.9rem; outline: none; transition: border-color .15s; }
  .search:focus { border-color: #6366f1; }
  .count { font-size: 0.82rem; color: #64748b; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; padding: 0 32px 40px; }
  .card { background: #1a1d27; border: 1px solid #2d3148; border-radius: 12px; padding: 20px; cursor: pointer; transition: border-color .15s, transform .1s; }
  .card:hover { border-color: #6366f1; transform: translateY(-2px); }
  .card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .icon { width: 36px; height: 36px; border-radius: 8px; object-fit: contain; background: #0f1117; flex-shrink: 0; }
  .icon-fallback { width: 36px; height: 36px; border-radius: 8px; background: #6366f1; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700; color: #fff; flex-shrink: 0; }
  .card-title { font-weight: 600; font-size: 0.95rem; color: #fff; }
  .card-hq { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
  .card-desc { font-size: 0.8rem; color: #94a3b8; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .tag { font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; font-weight: 500; }
  .tag-mcp { background: #1e293b; color: #818cf8; border: 1px solid #3730a3; }
  .tag-verified { background: #14532d; color: #4ade80; border: 1px solid #166534; }
  .tag-focus { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }
  .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 24px; }
  .modal { background: #1a1d27; border: 1px solid #2d3148; border-radius: 16px; max-width: 560px; width: 100%; max-height: 80vh; overflow-y: auto; padding: 28px; }
  .modal h2 { font-size: 1.2rem; font-weight: 700; color: #fff; margin-bottom: 4px; }
  .modal-sub { font-size: 0.8rem; color: #64748b; margin-bottom: 20px; }
  .modal-row { display: flex; gap: 8px; margin-bottom: 10px; font-size: 0.85rem; }
  .modal-label { color: #64748b; min-width: 110px; flex-shrink: 0; }
  .modal-val { color: #e2e8f0; word-break: break-all; }
  .modal-val a { color: #818cf8; text-decoration: none; }
  .modal-val a:hover { text-decoration: underline; }
  .modal-note { background: #0f1117; border-radius: 8px; padding: 14px; font-size: 0.8rem; color: #94a3b8; line-height: 1.6; margin-top: 16px; }
  .close-btn { float: right; background: none; border: none; color: #64748b; font-size: 1.4rem; cursor: pointer; line-height: 1; }
  .close-btn:hover { color: #fff; }
  .hidden { display: none; }
  .no-results { text-align: center; color: #475569; padding: 60px 0; font-size: 0.95rem; grid-column: 1/-1; }
</style>
</head>
<body>
<header>
  <h1>Open Banking Tracker</h1>
  <span class="badge" id="total-badge">...</span>
</header>
<div class="toolbar">
  <input class="search" id="search" type="text" placeholder="Search aggregators..." autocomplete="off">
  <span class="count" id="showing"></span>
</div>
<div class="grid" id="grid"></div>

<div class="modal-bg hidden" id="modal-bg">
  <div class="modal" id="modal-body"></div>
</div>

<script>
let data = [];

fetch('/api/aggregators')
  .then(r => r.json())
  .then(d => {
    data = d;
    document.getElementById('total-badge').textContent = d.length + ' aggregators';
    render(d);
  });

function flag(cc) {
  if (!cc) return '';
  return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0)));
}

function icon(agg) {
  if (agg.iconUrl) {
    return '<img class="icon" src="' + agg.iconUrl + '" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'" alt="">'
      + '<div class="icon-fallback" style="display:none">' + (agg.label[0] || '?') + '</div>';
  }
  return '<div class="icon-fallback">' + (agg.label[0] || '?') + '</div>';
}

function card(agg) {
  const tags = [];
  if (agg.mcpServer) tags.push('<span class="tag tag-mcp">MCP</span>');
  if (agg.verified) tags.push('<span class="tag tag-verified">Verified</span>');
  if (agg.marketFocus) tags.push('<span class="tag tag-focus">' + agg.marketFocus + '</span>');

  return '<div class="card" onclick="showModal(' + JSON.stringify(JSON.stringify(agg)) + ')">'
    + '<div class="card-head">'
    + icon(agg)
    + '<div><div class="card-title">' + agg.label + '</div>'
    + '<div class="card-hq">' + flag(agg.countryHQ) + ' ' + (agg.countryHQ || '') + '</div></div>'
    + '</div>'
    + (agg.description ? '<div class="card-desc">' + agg.description + '</div>' : '')
    + (tags.length ? '<div class="tags">' + tags.join('') + '</div>' : '')
    + '</div>';
}

function render(list) {
  const grid = document.getElementById('grid');
  document.getElementById('showing').textContent = list.length + ' shown';
  if (!list.length) { grid.innerHTML = '<div class="no-results">No results found</div>'; return; }
  grid.innerHTML = list.map(card).join('');
}

document.getElementById('search').addEventListener('input', function() {
  const q = this.value.toLowerCase();
  render(q ? data.filter(a =>
    (a.label||'').toLowerCase().includes(q) ||
    (a.description||'').toLowerCase().includes(q) ||
    (a.marketFocus||'').toLowerCase().includes(q) ||
    (a.countryHQ||'').toLowerCase().includes(q) ||
    (a.id||'').toLowerCase().includes(q)
  ) : data);
});

function showModal(raw) {
  const a = JSON.parse(raw);
  const rows = [
    ['ID', '<code>' + a.id + '</code>'],
    ['HQ', flag(a.countryHQ) + ' ' + (a.countryHQ || '—')],
    ['Website', a.website ? '<a href="' + a.website + '" target="_blank">' + a.website + '</a>' : '—'],
    ['Dev Portal', a.developerPortalUrl ? '<a href="' + a.developerPortalUrl + '" target="_blank">' + a.developerPortalUrl + '</a>' : '—'],
    ['Market Focus', a.marketFocus || '—'],
    ['Markets Live', a.marketCoverage && a.marketCoverage.live ? a.marketCoverage.live.join(', ') : '—'],
    ['MCP Server', a.mcpServer ? (a.mcpServer.type + ' / ' + (a.mcpServer.transport||'') ) : '—'],
    ['Verified', a.verified ? '✅ Yes' : '—'],
    ['Twitter', a.twitter ? '@' + a.twitter : '—'],
  ];

  const html = '<button class="close-btn" onclick="closeModal()">×</button>'
    + '<h2>' + a.label + '</h2>'
    + '<div class="modal-sub">' + (a.description || '') + '</div>'
    + rows.map(([l,v]) => '<div class="modal-row"><span class="modal-label">' + l + '</span><span class="modal-val">' + v + '</span></div>').join('')
    + (a.note ? '<div class="modal-note">' + a.note + '</div>' : '');

  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-bg').classList.remove('hidden');
}

function closeModal() { document.getElementById('modal-bg').classList.add('hidden'); }
document.getElementById('modal-bg').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
</script>
</body>
</html>`

const server = http.createServer((req, res) => {
  if (req.url === '/api/aggregators') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(loadAggregators()))
    return
  }
  if (req.url === '/api/aggregators/' || req.url.startsWith('/api/aggregators/')) {
    const id = req.url.slice('/api/aggregators/'.length)
    const file = path.join(AGGREGATORS_DIR, id + '.json')
    if (fs.existsSync(file)) {
      res.setHeader('Content-Type', 'application/json')
      res.end(fs.readFileSync(file, 'utf8'))
    } else {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'not found' }))
    }
    return
  }
  res.setHeader('Content-Type', 'text/html')
  res.end(HTML)
})

const PORT = 3000
server.listen(PORT, () => {
  console.log(`Open Banking Tracker running at http://localhost:${PORT}`)
})
