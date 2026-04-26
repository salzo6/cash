// FanDuel Ontario moneyline reader.
//
// Multi-sport (build v2): NHL, NBA, NFL, MLB. Each per-event link includes the sport+league
// in its path: /hockey/nhl/<slug>-<id>, /basketball/nba/<slug>-<id>,
// /football/nfl/<slug>-<id>, /baseball/mlb/<slug>-<id>. We extract the league directly from
// each match, so a single tab on a multi-sport page (homepage, search results) would still
// label every event correctly.
//
// FanDuel CSS class names are obfuscated (e.g. "v z x as cd cn s t co hh cq h cb iy bd n kh ki bg gv")
// and change between deploys. The aria-label attributes ARE stable — they're the accessibility
// contract — so we anchor on those.
//
// FanDuel displays American odds. We convert to decimal so the data shape matches BetMGM.

(() => {
  const BOOK_KEY = 'fanduel';
  const POLL_MS = 5000;

  // /hockey/nhl/buffalo-sabres-@-boston-bruins-35513827, /basketball/nba/..., etc.
  const EVENT_HREF = /^\/(?:hockey|basketball|football|baseball)\/(nhl|nba|nfl|mlb)\/([a-z0-9@-]+?)-(\d+)$/i;
  // For the DOM scan; narrows the querySelectorAll cost.
  const HREF_SELECTOR = 'a[href*="/nhl/"], a[href*="/nba/"], a[href*="/nfl/"], a[href*="/mlb/"]';

  function readEvents() {
    const links = document.querySelectorAll(HREF_SELECTOR);
    const seen = new Set();
    const out = [];
    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href || seen.has(href)) continue;
      const m = EVENT_HREF.exec(href);
      if (!m) continue;
      seen.add(href);

      const league = m[1].toUpperCase();
      const slug = m[2];
      const eventId = m[3];

      let container = link;
      while (container && container !== document.body) {
        if (container.querySelector('[aria-label^="Moneyline,"]')) break;
        container = container.parentElement;
      }
      if (!container || container === document.body) continue;

      const event = readGame(container, league, slug, eventId);
      if (event) out.push(event);
    }
    return out;
  }

  function readGame(gameEl, league, slug, eventId) {
    const mls = gameEl.querySelectorAll('[aria-label^="Moneyline,"]');
    if (mls.length < 2) return null;
    const away = parseMoneylineLabel(mls[0]);
    const home = parseMoneylineLabel(mls[1]);
    if (!away || !home) return null;

    const awayOdds = americanToDecimal(away.odds);
    const homeOdds = americanToDecimal(home.odds);
    if (!awayOdds || !homeOdds) return null;

    const is_live = !!gameEl.querySelector('svg[aria-label="live event"]');
    const timeEl = gameEl.querySelector('time[datetime]');
    const start_time_iso = timeEl?.getAttribute('datetime') || null;

    return {
      league,
      market: 'moneyline',
      away: away.team,
      home: home.team,
      away_odds: awayOdds,
      home_odds: homeOdds,
      event_key: canonicalEventKey(slug),
      event_id_book: eventId,
      start_time_iso,
      is_live,
      captured_at: new Date().toISOString()
    };
  }

  function parseMoneylineLabel(el) {
    const label = el.getAttribute('aria-label') || '';
    // "Moneyline, Buffalo Sabres, -6000 Odds"
    const m = /^Moneyline,\s*(.+?),\s*([+-]?\d+)\s*Odds/i.exec(label);
    if (!m) return null;
    return { team: m[1].trim(), odds: parseInt(m[2], 10) };
  }

  function americanToDecimal(american) {
    if (!Number.isFinite(american) || american === 0) return null;
    if (american > 0) return 1 + american / 100;
    return 1 + 100 / Math.abs(american);
  }

  // Mirror BetMGM's canonicalization (-neutral suffix stripped) so neutral-site games key
  // identically across books even when only one book tags them.
  function canonicalEventKey(slug) {
    return slug
      .replace(/-@-/g, '__')
      .replace(/-at-/g, '__')
      .replace(/-neutral$/i, '')
      .toLowerCase();
  }

  // True when we're on a games-list / multi-event page (so a 0-event read is suspicious).
  function looksLikeGamesListUrl() {
    return /\/navigation\/(nhl|nba|nfl|mlb)|\/(hockey|basketball|football|baseball)\/(nhl|nba|nfl|mlb)/i.test(
      location.pathname
    );
  }

  let lastSentSig = '';
  function poll() {
    const events = readEvents();
    if (events.length === 0 && looksLikeGamesListUrl()) {
      console.warn(`[SELECTOR-HEALTH] ${BOOK_KEY} returned 0 events on a games-list URL (${location.pathname})`);
    }
    const sig = JSON.stringify(events);
    if (sig === lastSentSig) return;
    lastSentSig = sig;
    if (events.length > 0) {
      const byLeague = events.reduce((acc, e) => {
        acc[e.league] = (acc[e.league] || 0) + 1;
        return acc;
      }, {});
      const summary = Object.entries(byLeague)
        .map(([l, n]) => `${n} ${l}`)
        .join(', ');
      console.log(`[arb-scanner] ${BOOK_KEY} read ${events.length} moneylines (${summary})`);
      for (const ev of events) {
        const liveTag = ev.is_live ? ' LIVE' : '';
        console.log(`[arb-scanner] ${BOOK_KEY} ${ev.league} ${ev.away}@${ev.home} ${ev.away_odds.toFixed(3)}/${ev.home_odds.toFixed(3)} key=${ev.event_key}${liveTag}`);
      }
    }
    chrome.runtime.sendMessage({ type: 'ODDS_UPDATE', book: BOOK_KEY, events });
  }

  poll();
  setInterval(poll, POLL_MS);

  let lastHref = location.href;
  new MutationObserver(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      lastSentSig = '';
      poll();
    }
  }).observe(document.body || document.documentElement, { childList: true, subtree: true });

  console.log(`[arb-scanner] fanduel content script live on ${location.hostname} (build v2 — multi-sport NHL/NBA/NFL/MLB)`);
})();
