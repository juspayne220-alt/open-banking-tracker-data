require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express     = require('express');
const cors        = require('cors');
const fs          = require('fs');
const path        = require('path');

const TOKEN = process.env.BOT_TOKEN;
const PORT  = process.env.PORT || 3000;

if (!TOKEN) { console.error('Missing BOT_TOKEN in .env'); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();
app.use(cors());
app.use(express.json());

/* ── data store ── */
const DATA_FILE = path.join(__dirname, 'data.json');

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { entries: [], likes: 412 }; }
}

function save(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

/* ── REST API (called by the website) ── */

// POST /entry  { email }
app.post('/entry', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'email required' });
  const d = load();
  if (!d.entries.includes(email)) {
    d.entries.push(email);
    save(d);
  }
  res.json({ ok: true, total: d.entries.length });
});

// POST /like  { liked: true|false }
app.post('/like', (req, res) => {
  const d = load();
  d.likes = Math.max(0, (d.likes || 412) + (req.body.liked ? 1 : -1));
  save(d);
  res.json({ ok: true, likes: d.likes });
});

// GET /stats  (optional health check)
app.get('/stats', (req, res) => {
  const d = load();
  res.json({ entries: d.entries.length, likes: d.likes });
});

app.listen(PORT, () => console.log(`DNO API running on port ${PORT}`));

/* ── bot commands ── */

const MENU = `
🪙 *Danno Coin (DNO)*
_Community-driven ERC-20 on Ethereum_

Pick a command:
/stats        — live giveaway & like count
/giveaway     — giveaway details
/tokenomics   — token distribution
/roadmap      — launch phases
/contract     — contract status
/help         — show this menu
`;

bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id, MENU, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [
        [{ text: '📊 Stats' },     { text: '🎁 Giveaway' }],
        [{ text: '📈 Tokenomics' },{ text: '🗺 Roadmap'  }],
        [{ text: '🔗 Contract' },  { text: '❓ Help'      }],
      ],
      resize_keyboard: true
    }
  });
});

bot.onText(/\/stats|📊 Stats/, msg => {
  const d = load();
  const text =
    `📊 *DNO Live Stats*\n\n` +
    `🎁 Giveaway entries: *${d.entries.length}*\n` +
    `❤️ Page likes:       *${d.likes}*\n` +
    `💰 Giveaway pool:    *50,000,000 DNO*\n` +
    `📦 Total supply:     *1,000,000,000 DNO*\n` +
    `📅 Status:           *Pre-launch*`;
  bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

bot.onText(/\/giveaway|🎁 Giveaway/, msg => {
  const d = load();
  const text =
    `🎁 *DNO Giveaway*\n\n` +
    `Pool:    *50,000,000 DNO* (5% of supply)\n` +
    `Entries: *${d.entries.length}* and counting\n` +
    `Network: Ethereum ERC-20\n\n` +
    `Enter your email on the official page to secure your spot before the drop.`;
  bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

bot.onText(/\/tokenomics|📈 Tokenomics/, msg => {
  const text =
    `📈 *DNO Tokenomics*\n\n` +
    `Total Supply: *1,000,000,000 DNO*\n\n` +
    `🟠 Public Sale  — *40%*  (400,000,000)\n` +
    `🟢 Liquidity    — *25%*  (250,000,000)\n` +
    `🟤 Treasury     — *20%*  (200,000,000)\n` +
    `⚫ Team          — *15%*  (150,000,000)\n\n` +
    `_Team locked 12 months, vests over next 12._\n` +
    `_Liquidity locked at launch._`;
  bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

bot.onText(/\/roadmap|🗺 Roadmap/, msg => {
  const text =
    `🗺 *DNO Roadmap*\n\n` +
    `*01 · Foundation*\n` +
    `Finalize ERC-20 contract, third-party audit, publish on Etherscan.\n\n` +
    `*02 · Liquidity*\n` +
    `Deploy contract, lock liquidity, list on a DEX.\n\n` +
    `*03 · Growth*\n` +
    `Expand community, ship utility, open governance.\n\n` +
    `*04 · Expansion*\n` +
    `Centralised exchange listings and partnerships.`;
  bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

bot.onText(/\/contract|🔗 Contract/, msg => {
  const text =
    `🔗 *Contract & Audit*\n\n` +
    `Contract address: _Pending deployment_\n` +
    `Etherscan: _Pending verification_\n` +
    `Third-party audit: _Pending_\n\n` +
    `This will be updated as soon as DNO goes live.`;
  bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

bot.onText(/\/help|❓ Help/, msg => {
  bot.sendMessage(msg.chat.id, MENU, { parse_mode: 'Markdown' });
});

console.log('DNO Telegram bot started ✓');
