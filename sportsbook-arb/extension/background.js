// Phase 2 + 4 + 5 wiring.
//
// Aggregates ODDS_UPDATE messages from per-book content scripts into a per-event-key map,
// runs findArb() across each event, and broadcasts ARBS_UPDATE to the side panel.
//
// MV3 service workers shut down after ~30s idle; module-scope state would vanish. Source of
// truth is chrome.storage.session (cleared on browser close, persists across SW restarts in
// the same browser session).
//
// Stale-data TTL: 60s without a refresh from a book → drop that book's leg for the event.
// A periodic alarm flushes stale entries even when no tabs are open to trigger updates.

import { findArb, computeStakes, DEFAULT_TOTAL_STAKE } from './lib/arb.js';
import { BOOKS, scanWindowUrls } from './lib/books.js';
import { scorePairing, scorePairingOffline } from './lib/risk.js';

const STORAGE_KEY = 'arb_state_v1';
const STAKE_KEY = 'stake_cad';
// 20s TTL — was 60s, but a 60s window let phantom arbs survive for a full minute when one
// book's data went stale (e.g. content script briefly stopped polling that game). Content
// scripts poll every 5s, so 20s = 4 missed polls before the entry is considered dead. Short
// enough to clear phantoms quickly; long enough to absorb one or two missed polls during a
// page transition without flapping.
const TTL_MS = 20_000;
const PURGE_ALARM = 'purge-stale';

// Phase 6 bridge — read-only HTTP server in ../local-bridge/server.js. Default port matches
// local-bridge/server.js. Fetched on every computeAndBroadcast pass; if it's down we fall
// back to scorePairingOffline and surface a banner in the panel.
const BRIDGE_URL = 'http://127.0.0.1:5731/state';
const BRIDGE_TIMEOUT_MS = 1500;

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[arb-scanner] extension loaded', details.reason);
  chrome.alarms.create(PURGE_ALARM, { periodInMinutes: 0.5 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(PURGE_ALARM, { periodInMinutes: 0.5 });
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[arb-scanner] sidePanel.setPanelBehavior failed', err));

// All operations that touch chrome.storage.session run through this serial queue. With 6+
// tabs polling every 5s, message handlers fire concurrently — without serialization, the
// read-modify-write cycles in handleOddsUpdate race and silently drop entire books' data.
let _queue = Promise.resolve();
function serialize(fn) {
  const next = _queue.then(fn);
  _queue = next.catch((err) => {
    console.error('[arb-scanner] serial op failed', err);
  });
  return next;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;

  if (msg.type === 'GET_BOOKS') {
    sendResponse({ books: BOOKS });
    return false;
  }

  if (msg.type === 'ODDS_UPDATE') {
    serialize(() => handleOddsUpdate(msg));
    return false;
  }

  if (msg.type === 'GET_STATE') {
    serialize(() => computeAndBroadcast(false)).then(
      (payload) => sendResponse(payload),
      () => sendResponse({
        type: 'ARBS_UPDATE',
        arbs: [],
        matches: [],
        stake: DEFAULT_TOTAL_STAKE,
        generated_at: Date.now(),
        bridge: { online: false, url: BRIDGE_URL, vpn_check: 'unverified', event_count: null }
      })
    );
    return true;
  }

  if (msg.type === 'SET_STAKE') {
    serialize(async () => {
      const stake = sanitizeStake(msg.stake);
      await chrome.storage.session.set({ [STAKE_KEY]: stake });
      await computeAndBroadcast(true);
      return stake;
    }).then(
      (stake) => sendResponse({ ok: true, stake }),
      () => sendResponse({ ok: false })
    );
    return true;
  }

  if (msg.type === 'OPEN_SCAN_TABS') {
    openScanTabs().then(
      (result) => sendResponse(result),
      (err) => {
        console.error('[arb-scanner] openScanTabs failed', err);
        sendResponse({ ok: false, error: String(err) });
      }
    );
    return true;
  }

  return false;
});

async function openScanTabs() {
  const targets = scanWindowUrls();
  if (targets.length === 0) {
    return { ok: false, error: 'no scan URLs configured in lib/books.js' };
  }

  // Open in the user's currently focused normal window — the one the side panel is docked to.
  const win = await chrome.windows.getLastFocused({ populate: true, windowTypes: ['normal'] });
  if (!win) return { ok: false, error: 'no normal window to open into' };

  const existingUrls = new Set((win.tabs || []).map((t) => t.url));
  let opened = 0;
  for (const target of targets) {
    if (existingUrls.has(target.url)) continue;
    await chrome.tabs.create({ windowId: win.id, url: target.url, active: false });
    opened++;
  }
  return { ok: true, windowId: win.id, opened, total: targets.length };
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PURGE_ALARM) {
    serialize(() => computeAndBroadcast(true));
  }
});

async function handleOddsUpdate(msg) {
  const bookKey = msg.book;
  if (!bookKey || !BOOKS[bookKey]) return;
  const events = Array.isArray(msg.events) ? msg.events : [];
  const now = Date.now();

  const stored = await chrome.storage.session.get(STORAGE_KEY);
  const state = stored[STORAGE_KEY] || { byEventKey: {} };

  // For every league represented in this batch, this book's previous entries for that league
  // are now stale — replace them with what the page currently shows. (If a tab is on a non-NHL
  // page it sends an empty batch; we leave existing data alone and let TTL handle it.)
  const leaguesInBatch = new Set(events.map((e) => e && e.league).filter(Boolean));
  if (leaguesInBatch.size > 0) {
    for (const key of Object.keys(state.byEventKey)) {
      const entry = state.byEventKey[key][bookKey];
      if (entry && leaguesInBatch.has(entry.league)) {
        delete state.byEventKey[key][bookKey];
        if (Object.keys(state.byEventKey[key]).length === 0) {
          delete state.byEventKey[key];
        }
      }
    }
  }

  for (const ev of events) {
    if (!ev || !ev.event_key) continue;
    if (!state.byEventKey[ev.event_key]) state.byEventKey[ev.event_key] = {};
    state.byEventKey[ev.event_key][bookKey] = { ...ev, received_at_ms: now };
  }

  await chrome.storage.session.set({ [STORAGE_KEY]: state });
  await computeAndBroadcast(true);
}

async function fetchBridgeState() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), BRIDGE_TIMEOUT_MS);
    const resp = await fetch(BRIDGE_URL, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (err) {
    // Bridge offline / not started / port mismatch — risk.js falls back to WAIT with reason.
    return null;
  }
}

async function computeAndBroadcast(broadcast) {
  const stored = await chrome.storage.session.get([STORAGE_KEY, STAKE_KEY]);
  const state = stored[STORAGE_KEY] || { byEventKey: {} };
  const stake = sanitizeStake(stored[STAKE_KEY]);
  const now = Date.now();
  const bridgeState = await fetchBridgeState();
  const bridgeOnline = bridgeState != null;

  let mutated = false;
  for (const key of Object.keys(state.byEventKey)) {
    for (const bookKey of Object.keys(state.byEventKey[key])) {
      const entry = state.byEventKey[key][bookKey];
      if (!entry || now - (entry.received_at_ms || 0) > TTL_MS) {
        delete state.byEventKey[key][bookKey];
        mutated = true;
      }
    }
    if (Object.keys(state.byEventKey[key]).length === 0) {
      delete state.byEventKey[key];
      mutated = true;
    }
  }
  if (mutated) await chrome.storage.session.set({ [STORAGE_KEY]: state });

  const arbs = [];
  const matches = [];
  for (const [eventKey, byBook] of Object.entries(state.byEventKey)) {
    const bookKeys = Object.keys(byBook).sort();
    if (bookKeys.length < 2) continue;

    const display = pickDisplayNames(byBook);
    const isLive = Object.values(byBook).some((b) => b.is_live);
    const startTime = pickStartTime(byBook);
    const league = pickLeague(byBook);
    const baseRow = {
      event_key: eventKey,
      league,
      away: display.away,
      home: display.home,
      books: bookKeys,
      is_live: isLive,
      start_time_iso: startTime,
      by_book: byBook
    };

    const arb = findArb(byBook);
    if (arb) {
      const stakes = computeStakes(arb, stake);
      // findArb returns leg.book as the BOOKS-registry key ('betmgm'); the bridge keys its
      // per-book state by display name ('BetMGM') because that's what events.jsonl uses.
      // Translate before scoring so risk.js works entirely in display-name space.
      const arbForRisk = {
        ...arb,
        away: { ...arb.away, book: bookDisplayName(arb.away.book) },
        home: { ...arb.home, book: bookDisplayName(arb.home.book) }
      };
      const candidate = { ...baseRow, market: 'moneyline', arb: arbForRisk, stakes };
      const risk = bridgeOnline
        ? scorePairing(candidate, bridgeState, now)
        : scorePairingOffline(candidate);
      arbs.push({ ...baseRow, arb, stakes, total_stake: stake, risk, market: 'moneyline' });
    } else {
      matches.push({ ...baseRow, best_margin_pct: computeBestMargin(byBook) });
    }
  }

  arbs.sort((a, b) => b.arb.margin_pct - a.arb.margin_pct);
  matches.sort(
    (a, b) => (b.best_margin_pct ?? -Infinity) - (a.best_margin_pct ?? -Infinity)
  );

  const payload = {
    type: 'ARBS_UPDATE',
    arbs,
    matches,
    stake,
    generated_at: now,
    bridge: {
      online: bridgeOnline,
      url: BRIDGE_URL,
      generated_at_iso: bridgeState && bridgeState.generated_at_iso,
      vpn_check: bridgeState ? bridgeState.vpn_check || 'unverified' : 'unverified',
      event_count: bridgeState ? bridgeState.event_count : null
    }
  };

  if (broadcast) {
    chrome.runtime.sendMessage(payload).catch(() => {
      // Side panel may not be open — ignore.
    });
  }
  return payload;
}

function pickDisplayNames(byBook) {
  let away = '';
  let home = '';
  for (const ev of Object.values(byBook)) {
    if ((ev.away || '').length > away.length) away = ev.away || '';
    if ((ev.home || '').length > home.length) home = ev.home || '';
  }
  return { away, home };
}

function pickStartTime(byBook) {
  for (const ev of Object.values(byBook)) {
    if (ev.start_time_iso) return ev.start_time_iso;
  }
  return null;
}

function pickLeague(byBook) {
  for (const ev of Object.values(byBook)) {
    if (ev.league) return ev.league;
  }
  return null;
}

// Best 2-way margin assuming the cross-book pairing — matches what findArb would return if
// it cleared the floor. Negative when the books overlap heavily (book vig consumes the spread).
function computeBestMargin(byBook) {
  let bestAway = -Infinity;
  let bestHome = -Infinity;
  for (const d of Object.values(byBook)) {
    if (d.away_odds > bestAway) bestAway = d.away_odds;
    if (d.home_odds > bestHome) bestHome = d.home_odds;
  }
  if (!Number.isFinite(bestAway) || !Number.isFinite(bestHome)) return null;
  if (bestAway <= 1 || bestHome <= 1) return null;
  return (1 - (1 / bestAway + 1 / bestHome)) * 100;
}

function bookDisplayName(bookKey) {
  const b = BOOKS[bookKey];
  return (b && b.name) || bookKey;
}

function sanitizeStake(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 5) return DEFAULT_TOTAL_STAKE;
  return Math.round(n);
}
