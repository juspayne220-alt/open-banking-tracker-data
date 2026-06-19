'use strict'

const http = require('http')
const fs = require('fs')
const path = require('path')

const AGGREGATORS_DIR = path.join(__dirname, 'data/api-aggregators')

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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #07090f;
  --surface: #0e1117;
  --surface2: #141720;
  --border: rgba(255,255,255,0.07);
  --border-hover: rgba(99,102,241,0.6);
  --accent: #6366f1;
  --accent2: #8b5cf6;
  --accent3: #06b6d4;
  --text: #f1f5f9;
  --text2: #94a3b8;
  --text3: #475569;
  --green: #10b981;
  --radius: 14px;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* ── HERO ── */
.hero {
  position: relative;
  overflow: hidden;
  padding: 52px 40px 44px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, #0e0f1a 0%, #0d1024 60%, #0a0e1c 100%);
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 80% at 10% 50%, rgba(99,102,241,0.12) 0%, transparent 70%),
    radial-gradient(ellipse 40% 60% at 90% 20%, rgba(139,92,246,0.10) 0%, transparent 70%);
  pointer-events: none;
}
.hero-inner { position: relative; max-width: 1200px; margin: 0 auto; }
.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--accent);
  background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25);
  padding: 4px 12px; border-radius: 999px; margin-bottom: 18px;
}
.hero-eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
.hero h1 {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 800; letter-spacing: -0.03em;
  background: linear-gradient(135deg, #fff 30%, #a5b4fc 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  line-height: 1.15; margin-bottom: 12px;
}
.hero p { font-size: 0.95rem; color: var(--text2); max-width: 480px; line-height: 1.65; }

/* ── STATS BAR ── */
.stats-bar {
  display: flex; gap: 0;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  overflow-x: auto;
}
.stat {
  flex: 1; min-width: 120px;
  padding: 18px 24px;
  border-right: 1px solid var(--border);
  text-align: center;
}
.stat:last-child { border-right: none; }
.stat-num {
  font-size: 1.55rem; font-weight: 800; letter-spacing: -0.03em;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.stat-label { font-size: 0.72rem; color: var(--text3); font-weight: 500; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }

/* ── TOOLBAR ── */
.toolbar {
  padding: 20px 40px;
  display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
  max-width: 1280px; margin: 0 auto;
}
.search-wrap { position: relative; flex: 1; min-width: 220px; max-width: 400px; }
.search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: var(--text3); pointer-events: none;
}
.search {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px 10px 38px;
  color: var(--text); font-size: 0.88rem; font-family: inherit;
  outline: none; transition: border-color .2s, box-shadow .2s;
}
.search::placeholder { color: var(--text3); }
.search:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }

.filters { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-btn {
  font-family: inherit; font-size: 0.78rem; font-weight: 500;
  padding: 7px 14px; border-radius: 999px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text2);
  cursor: pointer; transition: all .18s; white-space: nowrap;
}
.filter-btn:hover { border-color: var(--accent); color: var(--text); }
.filter-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }

.result-count { margin-left: auto; font-size: 0.78rem; color: var(--text3); white-space: nowrap; }

/* ── GRID ── */
.grid-wrap { max-width: 1280px; margin: 0 auto; padding: 0 40px 60px; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 14px;
}

/* ── CARD ── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  cursor: pointer;
  transition: border-color .2s, transform .2s, box-shadow .2s;
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: 12px;
}
.card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
  opacity: 0; transition: opacity .2s;
}
.card:hover { border-color: var(--border-hover); transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.15); }
.card:hover::before { opacity: 1; }

.card-head { display: flex; align-items: center; gap: 12px; }
.icon-wrap { position: relative; flex-shrink: 0; }
.icon {
  width: 42px; height: 42px; border-radius: 10px;
  object-fit: contain; background: var(--surface2);
  border: 1px solid var(--border); display: block;
}
.icon-fallback {
  width: 42px; height: 42px; border-radius: 10px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; font-weight: 700; color: #fff; flex-shrink: 0;
}
.card-meta { flex: 1; min-width: 0; }
.card-title { font-weight: 700; font-size: 0.95rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-hq { font-size: 0.73rem; color: var(--text3); margin-top: 3px; display: flex; align-items: center; gap: 4px; }

.card-desc { font-size: 0.79rem; color: var(--text2); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; flex: 1; }

.tags { display: flex; flex-wrap: wrap; gap: 5px; }
.tag { font-size: 0.68rem; padding: 3px 9px; border-radius: 999px; font-weight: 600; letter-spacing: 0.02em; }
.tag-mcp { background: rgba(99,102,241,0.12); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.25); }
.tag-verified { background: rgba(16,185,129,0.1); color: #34d399; border: 1px solid rgba(16,185,129,0.25); }
.tag-region { background: rgba(6,182,212,0.1); color: #67e8f9; border: 1px solid rgba(6,182,212,0.2); }
.tag-coverage { background: rgba(245,158,11,0.1); color: #fbbf24; border: 1px solid rgba(245,158,11,0.2); }

.card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--border); }
.card-id { font-size: 0.68rem; font-family: 'SF Mono', 'Fira Code', monospace; color: var(--text3); }
.card-arrow { color: var(--text3); font-size: 0.8rem; transition: transform .2s, color .2s; }
.card:hover .card-arrow { color: var(--accent); transform: translateX(3px); }

/* ── MODAL ── */
.modal-bg {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 24px;
  opacity: 0; pointer-events: none; transition: opacity .2s;
}
.modal-bg.open { opacity: 1; pointer-events: all; }

.modal {
  background: var(--surface);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  max-width: 580px; width: 100%; max-height: 88vh;
  overflow-y: auto; position: relative;
  transform: scale(.96) translateY(12px);
  transition: transform .25s cubic-bezier(.34,1.56,.64,1);
  box-shadow: 0 32px 80px rgba(0,0,0,0.6);
}
.modal-bg.open .modal { transform: scale(1) translateY(0); }

.modal-banner {
  height: 6px;
  background: linear-gradient(90deg, var(--accent), var(--accent2), var(--accent3));
  border-radius: 20px 20px 0 0;
}
.modal-inner { padding: 28px 32px 32px; }

.modal-header { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 20px; }
.modal-icon { width: 52px; height: 52px; border-radius: 12px; object-fit: contain; background: var(--surface2); border: 1px solid var(--border); flex-shrink: 0; }
.modal-icon-fallback { width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, var(--accent), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 700; color: #fff; flex-shrink: 0; }
.modal-title-wrap { flex: 1; }
.modal-title { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.02em; color: var(--text); }
.modal-id { font-size: 0.72rem; font-family: 'SF Mono', 'Fira Code', monospace; color: var(--text3); margin-top: 4px; }
.close-btn {
  margin-left: auto; background: var(--surface2); border: 1px solid var(--border);
  color: var(--text2); width: 32px; height: 32px; border-radius: 8px;
  font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: background .15s, color .15s; line-height: 1;
}
.close-btn:hover { background: #1e2030; color: var(--text); }

.modal-desc { font-size: 0.85rem; color: var(--text2); line-height: 1.7; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }

.section-title { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text3); margin-bottom: 12px; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
.info-item { background: var(--surface2); border-radius: 10px; padding: 12px 14px; }
.info-label { font-size: 0.68rem; color: var(--text3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }
.info-val { font-size: 0.85rem; color: var(--text); font-weight: 500; word-break: break-all; }
.info-val a { color: #a5b4fc; text-decoration: none; }
.info-val a:hover { text-decoration: underline; }
.info-val.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.78rem; color: var(--accent); }

.mcp-box {
  background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.2);
  border-radius: 12px; padding: 16px; margin-bottom: 20px;
}
.mcp-box .section-title { color: #a5b4fc; }
.mcp-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; padding: 4px 0; }
.mcp-key { color: var(--text3); }
.mcp-val { color: var(--text); font-weight: 500; text-align: right; }
.mcp-tools { margin-top: 10px; }
.mcp-tool-tag { display: inline-block; font-size: 0.68rem; background: rgba(99,102,241,0.1); color: #c7d2fe; border: 1px solid rgba(99,102,241,0.2); border-radius: 6px; padding: 2px 8px; margin: 3px 3px 0 0; }

.coverage-pills { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 20px; }
.cc-pill { font-size: 0.72rem; padding: 3px 9px; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; color: var(--text2); font-weight: 500; }

.modal-note { background: var(--surface2); border-left: 3px solid var(--accent); border-radius: 0 10px 10px 0; padding: 14px 16px; font-size: 0.79rem; color: var(--text2); line-height: 1.7; margin-top: 4px; }

/* ── MISC ── */
.no-results { grid-column: 1/-1; text-align: center; padding: 80px 0; color: var(--text3); }
.no-results .icon-big { font-size: 2.5rem; margin-bottom: 12px; }
.no-results p { font-size: 0.9rem; }

@media (max-width: 600px) {
  .hero { padding: 36px 20px 32px; }
  .toolbar { padding: 16px 20px; }
  .grid-wrap { padding: 0 20px 40px; }
  .info-grid { grid-template-columns: 1fr; }
  .modal-inner { padding: 20px; }
  .stats-bar { display: none; }
}
</style>
</head>
<body>

<div class="hero">
  <div class="hero-inner">
    <div class="hero-eyebrow"><span class="dot"></span>Live Data</div>
    <h1>Open Banking<br>Tracker</h1>
    <p>Browse API aggregators, MCP servers, and fintech infrastructure providers powering open banking worldwide.</p>
  </div>
</div>

<div class="stats-bar" id="stats-bar">
  <div class="stat"><div class="stat-num" id="s-total">—</div><div class="stat-label">Aggregators</div></div>
  <div class="stat"><div class="stat-num" id="s-mcp">—</div><div class="stat-label">MCP Servers</div></div>
  <div class="stat"><div class="stat-num" id="s-verified">—</div><div class="stat-label">Verified</div></div>
  <div class="stat"><div class="stat-num" id="s-countries">—</div><div class="stat-label">Countries</div></div>
</div>

<div class="toolbar">
  <div class="search-wrap">
    <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    <input class="search" id="search" type="text" placeholder="Search by name, region, ID…" autocomplete="off">
  </div>
  <div class="filters">
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="mcp">MCP</button>
    <button class="filter-btn" data-filter="verified">Verified</button>
  </div>
  <span class="result-count" id="result-count"></span>
</div>

<div class="grid-wrap">
  <div class="grid" id="grid"></div>
</div>

<div class="modal-bg" id="modal-bg">
  <div class="modal" id="modal">
    <div class="modal-banner"></div>
    <div class="modal-inner" id="modal-inner"></div>
  </div>
</div>

<script>
let allData = [];
let activeFilter = 'all';

fetch('/api/aggregators').then(r => r.json()).then(d => {
  allData = d;
  const countries = new Set();
  d.forEach(a => { if (a.marketCoverage && a.marketCoverage.live) a.marketCoverage.live.forEach(c => countries.add(c)); if (a.countryHQ) countries.add(a.countryHQ); });
  document.getElementById('s-total').textContent = d.length;
  document.getElementById('s-mcp').textContent = d.filter(a => a.mcpServer).length;
  document.getElementById('s-verified').textContent = d.filter(a => a.verified).length;
  document.getElementById('s-countries').textContent = countries.size;
  applyFilters();
});

function flag(cc) {
  if (!cc) return '';
  try { return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))); } catch(e) { return cc; }
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function iconHtml(a, size) {
  const s = size || 42;
  if (a.iconUrl) return '<img class="icon" width="'+s+'" height="'+s+'" src="'+esc(a.iconUrl)+'" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'" alt="'+esc(a.label)+'" loading="lazy"><div class="icon-fallback" style="width:'+s+'px;height:'+s+'px;display:none">'+esc(a.label[0]||'?')+'</div>';
  return '<div class="icon-fallback" style="width:'+s+'px;height:'+s+'px">'+esc(a.label[0]||'?')+'</div>';
}

function cardHtml(a) {
  const tags = [];
  if (a.mcpServer) tags.push('<span class="tag tag-mcp">⚡ MCP</span>');
  if (a.verified) tags.push('<span class="tag tag-verified">✓ Verified</span>');
  if (a.marketFocus) tags.push('<span class="tag tag-region">'+esc(a.marketFocus)+'</span>');
  const liveCount = a.marketCoverage && a.marketCoverage.live && a.marketCoverage.live.length;
  if (liveCount) tags.push('<span class="tag tag-coverage">'+liveCount+' markets</span>');

  return '<div class="card" onclick="showModal(\''+esc(a.id)+'\')">'
    + '<div class="card-head"><div class="icon-wrap">'+iconHtml(a, 42)+'</div>'
    + '<div class="card-meta"><div class="card-title">'+esc(a.label)+'</div>'
    + '<div class="card-hq">'+flag(a.countryHQ)+' <span>'+esc(a.countryHQ||'')+'</span></div></div></div>'
    + (a.description ? '<div class="card-desc">'+esc(a.description)+'</div>' : '<div class="card-desc" style="color:var(--text3);font-style:italic">No description</div>')
    + (tags.length ? '<div class="tags">'+tags.join('')+'</div>' : '')
    + '<div class="card-footer"><span class="card-id">'+esc(a.id)+'</span><span class="card-arrow">→</span></div>'
    + '</div>';
}

function applyFilters() {
  const q = document.getElementById('search').value.toLowerCase();
  let list = allData;
  if (activeFilter === 'mcp') list = list.filter(a => a.mcpServer);
  if (activeFilter === 'verified') list = list.filter(a => a.verified);
  if (q) list = list.filter(a =>
    (a.label||'').toLowerCase().includes(q) ||
    (a.description||'').toLowerCase().includes(q) ||
    (a.marketFocus||'').toLowerCase().includes(q) ||
    (a.countryHQ||'').toLowerCase().includes(q) ||
    (a.id||'').toLowerCase().includes(q)
  );
  render(list);
}

function render(list) {
  const grid = document.getElementById('grid');
  document.getElementById('result-count').textContent = list.length + ' of ' + allData.length;
  if (!list.length) {
    grid.innerHTML = '<div class="no-results"><div class="icon-big">🔍</div><p>No aggregators found</p></div>';
    return;
  }
  grid.innerHTML = list.map(cardHtml).join('');
}

document.getElementById('search').addEventListener('input', applyFilters);

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    activeFilter = this.dataset.filter;
    applyFilters();
  });
});

const cache = {};
function showModal(id) {
  const a = cache[id] || allData.find(x => x.id === id);
  if (!a) return;
  cache[id] = a;

  const infoItems = [
    ['HQ', flag(a.countryHQ) + ' ' + esc(a.countryHQ||'—')],
    ['ID', '<span class="mono">'+esc(a.id)+'</span>'],
    ['Website', a.website ? '<a href="'+esc(a.website)+'" target="_blank" rel="noopener">Visit →</a>' : '—'],
    ['Dev Portal', a.developerPortalUrl ? '<a href="'+esc(a.developerPortalUrl)+'" target="_blank" rel="noopener">Docs →</a>' : '—'],
    ['Status', a.statusUrl ? '<a href="'+esc(a.statusUrl)+'" target="_blank" rel="noopener">Status →</a>' : '—'],
    ['Twitter', a.twitter ? '<a href="https://twitter.com/'+esc(a.twitter)+'" target="_blank" rel="noopener">@'+esc(a.twitter)+'</a>' : '—'],
    ['Verified', a.verified ? '<span style="color:var(--green)">✓ Yes</span>' : '<span style="color:var(--text3)">—</span>'],
    ['Market Focus', esc(a.marketFocus||'—')],
  ];

  let mcpBlock = '';
  if (a.mcpServer) {
    const m = a.mcpServer;
    const rows = [
      ['Type', m.type], ['Transport', m.transport], ['Auth', m.authType],
      ['Package', m.npmPackage], ['Command', m.command],
    ].filter(([,v]) => v).map(([k,v]) => '<div class="mcp-row"><span class="mcp-key">'+esc(k)+'</span><span class="mcp-val">'+esc(v)+'</span></div>').join('');

    const tools = m.tools && m.tools.length ? '<div class="mcp-tools">'+m.tools.map(t=>'<span class="mcp-tool-tag">'+esc(t)+'</span>').join('')+'</div>' : '';

    const repoLink = m.repositoryUrl ? '<div class="mcp-row"><span class="mcp-key">Repo</span><span class="mcp-val"><a href="'+esc(m.repositoryUrl)+'" target="_blank" rel="noopener" style="color:#a5b4fc">View →</a></span></div>' : '';
    const docLink = m.documentationUrl ? '<div class="mcp-row"><span class="mcp-key">Docs</span><span class="mcp-val"><a href="'+esc(m.documentationUrl)+'" target="_blank" rel="noopener" style="color:#a5b4fc">View →</a></span></div>' : '';

    mcpBlock = '<div class="mcp-box"><div class="section-title">⚡ MCP Server</div>'+rows+repoLink+docLink+tools+'</div>';
  }

  let coverageBlock = '';
  if (a.marketCoverage && a.marketCoverage.live && a.marketCoverage.live.length) {
    coverageBlock = '<div class="section-title">Market Coverage ('+(a.marketCoverage.live.length)+' live)</div>'
      + '<div class="coverage-pills">'+a.marketCoverage.live.map(c=>'<span class="cc-pill">'+flag(c)+' '+esc(c)+'</span>').join('')+'</div>';
  }

  const html = '<div class="modal-header">'
    + iconHtml(a, 52)
    + '<div class="modal-title-wrap"><div class="modal-title">'+esc(a.label)+'</div><div class="modal-id">'+esc(a.id)+'</div></div>'
    + '<button class="close-btn" onclick="closeModal()" aria-label="Close">✕</button>'
    + '</div>'
    + (a.description ? '<div class="modal-desc">'+esc(a.description)+'</div>' : '')
    + '<div class="section-title">Details</div>'
    + '<div class="info-grid">'+infoItems.map(([l,v])=>'<div class="info-item"><div class="info-label">'+esc(l)+'</div><div class="info-val">'+v+'</div></div>').join('')+'</div>'
    + mcpBlock
    + coverageBlock
    + (a.note ? '<div class="section-title">Note</div><div class="modal-note">'+esc(a.note)+'</div>' : '');

  document.getElementById('modal-inner').innerHTML = html;
  document.getElementById('modal-bg').classList.add('open');
  document.getElementById('modal').scrollTop = 0;
}

function closeModal() { document.getElementById('modal-bg').classList.remove('open'); }
document.getElementById('modal-bg').addEventListener('click', e => { if (e.target === document.getElementById('modal-bg')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
</script>
</body>
</html>`

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0]

  if (url === '/api/aggregators') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(loadAggregators()))
    return
  }
  if (url.startsWith('/api/aggregators/')) {
    const id = url.slice('/api/aggregators/'.length)
    const file = path.join(AGGREGATORS_DIR, id + '.json')
    if (id && fs.existsSync(file)) {
      res.setHeader('Content-Type', 'application/json')
      res.end(fs.readFileSync(file, 'utf8'))
    } else {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'not found' }))
    }
    return
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(HTML)
})

const PORT = 3000
server.listen(PORT, () => {
  console.log(`Open Banking Tracker → http://localhost:${PORT}`)
})
