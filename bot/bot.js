require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express     = require('express');
const cors        = require('cors');
const fs          = require('fs');
const path        = require('path');

const TOKEN   = process.env.BOT_TOKEN;
const PORT    = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

if (!TOKEN) {
  console.error('❌  BOT_TOKEN is missing. Add it to your .env file.');
  process.exit(1);
}

/* ── data ── */
const DATA = path.join(__dirname, 'data.json');
function load() {
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
  catch { return { entries: [], likes: 412 }; }
}
function save(d) { fs.writeFileSync(DATA, JSON.stringify(d, null, 2)); }

/* ── Express API (called by the website) ── */
const app = express();
app.use(cors());
app.use(express.json());

app.post('/entry', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'email required' });
  const d = load();
  if (!d.entries.includes(email)) { d.entries.push(email); save(d); }
  res.json({ ok: true, total: d.entries.length });
});

app.post('/like', (req, res) => {
  const d = load();
  d.likes = Math.max(0, (d.likes || 412) + (req.body.liked ? 1 : -1));
  save(d);
  res.json({ ok: true, likes: d.likes });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Serve the Mini App
app.use(express.static(path.join(__dirname, 'miniapp')));

app.listen(PORT, () => console.log(`✅  API + Mini App running on port ${PORT}`));

/* ── Telegram bot ── */
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('✅  @DannoToken_bot is live and polling...');

const keyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '📊 Stats' },      { text: '🎁 Giveaway'   }],
      [{ text: '📈 Tokenomics' }, { text: '🗺 Roadmap'    }],
      [{ text: '🔗 Contract' },   { text: '❓ Help'        }],
    ],
    resize_keyboard: true,
  }
};

const WELCOME = (name) =>
`👋 Hey ${name || 'there'}!

🪙 *Danno Coin (DNO)*
_Community-driven ERC-20 token on Ethereum_

I'll keep you up to date with live stats, tokenomics, and the giveaway. Pick a command below 👇`;

bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id, WELCOME(msg.from.first_name), {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '🚀 Open DNO App', web_app: { url: APP_URL } }
      ]]
    }
  });
});

bot.onText(/\/stats|📊 Stats/, msg => {
  const d = load();
  bot.sendMessage(msg.chat.id,
    `📊 *DNO Live Stats*\n\n` +
    `🎁 Giveaway entries : *${d.entries.length}*\n` +
    `❤️ Page likes        : *${d.likes}*\n` +
    `💰 Giveaway pool    : *50,000,000 DNO*\n` +
    `📦 Total supply      : *1,000,000,000 DNO*\n` +
    `📅 Status              : *Pre-launch*`,
    { parse_mode: 'Markdown', ...keyboard }
  );
});

bot.onText(/\/giveaway|🎁 Giveaway/, msg => {
  const d = load();
  bot.sendMessage(msg.chat.id,
    `🎁 *DNO Giveaway*\n\n` +
    `Pool     : *50,000,000 DNO* (5% of supply)\n` +
    `Entries : *${d.entries.length}* and counting\n` +
    `Network : Ethereum ERC-20\n\n` +
    `Enter your email on the official page to get in before the drop.`,
    { parse_mode: 'Markdown', ...keyboard }
  );
});

bot.onText(/\/tokenomics|📈 Tokenomics/, msg => {
  bot.sendMessage(msg.chat.id,
    `📈 *DNO Tokenomics*\n\n` +
    `Total Supply: *1,000,000,000 DNO*\n\n` +
    `🟠 Public Sale  — *40%*  (400,000,000)\n` +
    `🟢 Liquidity    — *25%*  (250,000,000)\n` +
    `🟤 Treasury     — *20%*  (200,000,000)\n` +
    `⚫ Team           — *15%*  (150,000,000)\n\n` +
    `_Team locked 12 months, vests over 12 months.\nLiquidity locked at launch. No further minting._`,
    { parse_mode: 'Markdown', ...keyboard }
  );
});

bot.onText(/\/roadmap|🗺 Roadmap/, msg => {
  bot.sendMessage(msg.chat.id,
    `🗺 *DNO Roadmap*\n\n` +
    `*01 · Foundation*\nFinalize ERC-20 contract, third-party audit, publish on Etherscan.\n\n` +
    `*02 · Liquidity*\nDeploy contract, lock liquidity, list on a DEX.\n\n` +
    `*03 · Growth*\nExpand community, ship utility, open governance.\n\n` +
    `*04 · Expansion*\nCentralised exchange listings and partnerships.`,
    { parse_mode: 'Markdown', ...keyboard }
  );
});

bot.onText(/\/contract|🔗 Contract/, msg => {
  bot.sendMessage(msg.chat.id,
    `🔗 *Contract & Audit*\n\n` +
    `Contract address : _Pending deployment_\n` +
    `Etherscan           : _Pending verification_\n` +
    `Third-party audit  : _Pending_\n\n` +
    `Will be updated the moment DNO goes live.`,
    { parse_mode: 'Markdown', ...keyboard }
  );
});

bot.onText(/\/help|❓ Help/, msg => {
  bot.sendMessage(msg.chat.id, WELCOME(msg.from.first_name), {
    parse_mode: 'Markdown', ...keyboard
  });
});

bot.on('polling_error', err => console.error('Polling error:', err.message));
