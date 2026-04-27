// Local bridge for the arb-scanner Chrome extension.
//
// Single endpoint: GET /state — returns per-book derived state computed by replaying
// ../tracker/events.jsonl, plus the parsed thresholds + per-book multipliers from
// ../tracker/rules.md. Both files are re-read on every request (no caching) so threshold
// edits take effect immediately, per the Phase 6 contract in
// ../extension/RISK_SCORING.md.
//
// Read-only by design — the extension never writes to events.jsonl. Events are still logged
// by the user via Claude in chat per ../tracker/README.md.
//
// Stack: Node http stdlib, no framework, no deps. Run with `node server.js` or
// `bun run server.js` (preferred when bun is installed). Default port 5731 — override with
// `BRIDGE_PORT=NNNN`.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { parseEvents, parseRules, deriveState } from './state.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const EVENTS_PATH = resolve(HERE, '../tracker/events.jsonl');
const RULES_PATH = resolve(HERE, '../tracker/rules.md');

const PORT = Number(process.env.BRIDGE_PORT || 5731);

const server = http.createServer(async (req, res) => {
  // CORS for chrome-extension://… origins. Manifest already lists localhost in
  // host_permissions so fetch works, but the extension still benefits from open CORS in case
  // we later move calls into a content script.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && req.url && req.url.startsWith('/state')) {
      const payload = await buildState();
      respondJson(res, 200, payload);
      return;
    }
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
      respondJson(res, 200, { ok: true, endpoints: ['/state'], port: PORT });
      return;
    }
    respondJson(res, 404, { error: 'not_found' });
  } catch (err) {
    console.error('[bridge]', err);
    respondJson(res, 500, { error: 'internal', message: err && err.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[bridge] listening on http://127.0.0.1:${PORT}`);
  console.log(`[bridge] events: ${EVENTS_PATH}`);
  console.log(`[bridge] rules:  ${RULES_PATH}`);
});

async function buildState() {
  // No caching: re-read on every request so edits to rules.md or events.jsonl take effect
  // immediately. Files are small (kilobytes). If volume ever blows past that, swap in a
  // mtime-keyed cache here — but until then the simplicity is worth more than the I/O.
  const [eventsRaw, rulesRaw] = await Promise.all([
    safeRead(EVENTS_PATH),
    safeRead(RULES_PATH)
  ]);

  const events = parseEvents(eventsRaw);
  const { thresholds, multipliers } = parseRules(rulesRaw);
  const derived = deriveState(events, Date.now());

  return {
    ok: true,
    bridge_version: 1,
    thresholds,
    multipliers,
    books: derived.books,
    pairings_last_30d: derived.pairings_last_30d,
    event_count: events.length,
    generated_at_iso: derived.generated_at_iso,
    // VPN factor 6 stays UNVERIFIED — the bridge doesn't have a reliable way to detect
    // VPN/proxy from localhost. Documented in RISK_SCORING.md.
    vpn_check: 'unverified'
  };
}

async function safeRead(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return '';
    throw err;
  }
}

function respondJson(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body), 'utf8');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(buf.length)
  });
  res.end(buf);
}
