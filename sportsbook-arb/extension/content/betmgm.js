// BetMGM Ontario moneyline reader.
//
// Multi-sport (build v9): NHL, NBA, NFL, MLB. Sport is detected from the page URL — every
// league-specific list page on BetMGM contains the league slug somewhere in the path
// (e.g. /en/sports/hockey-12/betting/usa-9/nhl-34, /en/sports/basketball-7/.../nba-N, etc.).
//
// Structure (verified 2026-04-26 against on.betmgm.ca via outerHTML capture, NHL):
//   <ms-six-pack-event>                          ← per-game container
//     ... .participants-pair-game
//           .participant-wrapper > .participant-container > <div class="participant"> Sabres </div>
//           .participant-wrapper > .participant-container > <div class="participant"> Bruins </div>
//     <div class="grid-six-pack-wrapper">
//       <ms-option-group>          ← Spread (picks have .option-attribute = "-3.5" / "+3.5")
//       <ms-option-group>          ← Total  (picks have .option-attribute = "O 7.5" / "U 7.5")
//       <ms-option-group>          ← Money  (picks have NO .option-attribute) ← target
//
// Each pick: <ms-event-pick> > .option-indicator > .option-value > .custom-odds-value-style ("1.02")
//
// We anchor on `ms-six-pack-event` and `.participant`, both of which the BetMGM Angular
// platform uses across every sport. If a sport's list page renders a different component
// (possible for tournament-style sports), the SELECTOR-HEALTH warning fires and we capture a
// fresh outerHTML for that sport.

(() => {
  const BOOK_KEY = 'betmgm';
  const POLL_MS = 5000;

  // BetMGM event-detail href: /en/sports/events/buffalo-sabres-at-boston-bruins-19407755.
  // Same shape regardless of sport.
  const EVENT_HREF = /\/sports\/events\/([a-z0-9-]+?)-(\d+)$/i;

  // First league slug found in the page URL = sport for this tab.
  const LEAGUE_URL_RE = /\/(nhl|nba|nfl|mlb)[-_/]/i;

  function detectLeague() {
    const m = LEAGUE_URL_RE.exec(location.pathname);
    return m ? m[1].toUpperCase() : null;
  }

  function readEvents(league) {
    const games = document.querySelectorAll('ms-six-pack-event');
    const out = [];
    for (const game of games) {
      const event = readGame(game, league);
      if (event) out.push(event);
    }
    return out;
  }

  function readGame(gameEl, league) {
    const teamEls = gameEl.querySelectorAll('.participant');
    if (teamEls.length < 2) return null;
    const away = cleanTeamName(teamEls[0]);
    const home = cleanTeamName(teamEls[1]);
    if (!away || !home) return null;

    const wrapper = gameEl.querySelector('.grid-six-pack-wrapper');
    if (!wrapper) return null;
    const groups = wrapper.querySelectorAll('ms-option-group');
    if (groups.length === 0) return null;

    let moneyGroup = null;
    for (const g of groups) {
      const picks = g.querySelectorAll('ms-event-pick');
      if (picks.length < 2) continue;
      if (!picks[0].querySelector('.option-attribute')) {
        moneyGroup = g;
        break;
      }
    }
    if (!moneyGroup) moneyGroup = groups[groups.length - 1];

    const picks = moneyGroup.querySelectorAll('ms-event-pick');
    if (picks.length < 2) return null;
    const awayOdds = parseDecimal(picks[0].querySelector('.custom-odds-value-style')?.textContent);
    const homeOdds = parseDecimal(picks[1].querySelector('.custom-odds-value-style')?.textContent);
    if (!awayOdds || !homeOdds) return null;

    const link = gameEl.querySelector('a[href*="/sports/events/"]');
    const href = link?.getAttribute('href') || '';
    const m = EVENT_HREF.exec(href);
    const event_key = m ? canonicalEventKey(m[1]) : null;
    const event_id_book = m ? m[2] : null;

    const is_live = !!gameEl.querySelector('ms-live-timer');

    return {
      league,
      market: 'moneyline',
      away,
      home,
      away_odds: awayOdds,
      home_odds: homeOdds,
      event_key,
      event_id_book,
      start_time_iso: null,
      is_live,
      captured_at: new Date().toISOString()
    };
  }

  // BetMGM appends qualifiers like "-neutral" for neutral-site games (e.g. MLB Mexico City
   // series). Strip so the same game keys identically across books.
  function canonicalEventKey(slug) {
    return slug
      .replace(/-@-/g, '__')
      .replace(/-at-/g, '__')
      .replace(/-neutral$/i, '')
      .toLowerCase();
  }

  function parseDecimal(raw) {
    if (!raw) return null;
    const n = parseFloat(raw.trim());
    return Number.isFinite(n) && n > 1 ? n : null;
  }

  function cleanTeamName(el) {
    let text = '';
    for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) text += n.textContent;
    }
    return text.trim() || null;
  }

  let lastSentSig = '';
  function poll() {
    const league = detectLeague();
    if (!league) {
      // Not on a league list page (homepage, account, settings, etc.) — send empty so the
      // background can let the previous data age out via TTL.
      if (lastSentSig !== 'EMPTY') {
        lastSentSig = 'EMPTY';
        chrome.runtime.sendMessage({ type: 'ODDS_UPDATE', book: BOOK_KEY, events: [] });
      }
      return;
    }

    const events = readEvents(league);
    if (events.length === 0) {
      console.warn(`[SELECTOR-HEALTH] ${BOOK_KEY} returned 0 events on ${league} list page (${location.pathname})`);
    }
    const sig = JSON.stringify(events);
    if (sig === lastSentSig) return;
    lastSentSig = sig;
    if (events.length > 0) {
      console.log(`[arb-scanner] ${BOOK_KEY} read ${events.length} ${league} moneylines`);
      for (const ev of events) {
        const liveTag = ev.is_live ? ' LIVE' : '';
        console.log(`[arb-scanner] ${BOOK_KEY} ${league} ${ev.away}@${ev.home} ${ev.away_odds.toFixed(3)}/${ev.home_odds.toFixed(3)} key=${ev.event_key}${liveTag}`);
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

  console.log(`[arb-scanner] betmgm content script live on ${location.hostname} (build v9 — multi-sport NHL/NBA/NFL/MLB)`);
})();
