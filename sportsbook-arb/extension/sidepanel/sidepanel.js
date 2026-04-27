const statusEl = document.getElementById('status');
const stakeInput = document.getElementById('stake-input');
const arbListEl = document.getElementById('arb-list');
const arbsEmptyEl = document.getElementById('arbs-empty');
const arbsCountEl = document.getElementById('arbs-count');
const matchListEl = document.getElementById('match-list');
const matchesEmptyEl = document.getElementById('matches-empty');
const matchesCountEl = document.getElementById('matches-count');
const bridgeBannerEl = document.getElementById('bridge-banner');
const vpnBannerEl = document.getElementById('vpn-banner');

let lastUpdateMs = null;

function tickStatus() {
  if (lastUpdateMs == null) return;
  const secs = Math.max(0, Math.round((Date.now() - lastUpdateMs) / 1000));
  statusEl.textContent = `updated ${secs}s ago`;
}
setInterval(tickStatus, 1000);

chrome.runtime.sendMessage({ type: 'GET_STATE' }, (resp) => {
  if (chrome.runtime.lastError || !resp) {
    statusEl.textContent = 'background not reachable';
    return;
  }
  apply(resp);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'ARBS_UPDATE') apply(msg);
});

stakeInput.addEventListener('change', () => {
  const s = parseInt(stakeInput.value, 10);
  if (!Number.isFinite(s) || s < 5) return;
  chrome.runtime.sendMessage({ type: 'SET_STAKE', stake: s });
});

const openScanBtn = document.getElementById('open-scan-btn');
openScanBtn.addEventListener('click', () => {
  openScanBtn.disabled = true;
  const orig = openScanBtn.textContent;
  openScanBtn.textContent = 'opening…';
  chrome.runtime.sendMessage({ type: 'OPEN_SCAN_TABS' }, (resp) => {
    openScanBtn.disabled = false;
    if (chrome.runtime.lastError || !resp || !resp.ok) {
      openScanBtn.textContent = 'failed';
      setTimeout(() => (openScanBtn.textContent = orig), 1500);
      return;
    }
    openScanBtn.textContent = resp.opened === 0 ? 'all open' : `opened ${resp.opened}`;
    setTimeout(() => (openScanBtn.textContent = orig), 1500);
  });
});

function apply(payload) {
  lastUpdateMs = payload.generated_at || Date.now();
  if (payload.stake && document.activeElement !== stakeInput) {
    stakeInput.value = payload.stake;
  }
  applyBridgeBanner(payload.bridge);
  renderArbs(payload.arbs || []);
  renderMatches(payload.matches || []);
  tickStatus();
}

function applyBridgeBanner(bridge) {
  const online = !!(bridge && bridge.online);
  bridgeBannerEl.hidden = online;
  // VPN unverified is structural per RISK_SCORING.md — show whenever the bridge has *any*
  // status (online or offline). Hide only when there's no payload yet.
  vpnBannerEl.hidden = !bridge;
}

function renderArbs(arbs) {
  arbsCountEl.textContent = arbs.length;
  arbListEl.replaceChildren(...arbs.map(arbCard));
  arbsEmptyEl.hidden = arbs.length > 0;
}

function renderMatches(matches) {
  matchesCountEl.textContent = matches.length;
  matchListEl.replaceChildren(...matches.map(matchRow));
  matchesEmptyEl.hidden = matches.length > 0;
}

function arbCard(item) {
  const li = document.createElement('li');
  li.className = 'arb-card';
  const verdict = (item.risk && item.risk.verdict) || 'WAIT';
  li.classList.add(`verdict-${verdict.toLowerCase()}`);

  const header = document.createElement('div');
  header.className = 'card-header';

  const title = document.createElement('div');
  title.className = 'event-name';
  if (item.league) title.append(leagueTag(item.league), ' ');
  title.append(`${item.away} @ ${item.home}`);
  if (item.is_live) title.append(' ', badge('LIVE'));

  const right = document.createElement('div');
  right.className = 'card-header-right';

  const verdictTag = document.createElement('span');
  verdictTag.className = `verdict-tag verdict-tag-${verdict.toLowerCase()}`;
  verdictTag.textContent = `[${verdict}]`;
  if (item.risk && item.risk.bridge_status === 'offline') {
    verdictTag.title = 'Bridge offline — limited evaluation';
  }

  const margin = document.createElement('div');
  margin.className = 'margin';
  margin.textContent = `${item.arb.margin_pct.toFixed(2)}%`;

  right.append(verdictTag, margin);
  header.append(title, right);
  li.append(header);

  const summary = document.createElement('div');
  summary.className = 'summary';
  summary.textContent = `Profit $${item.stakes.realized_profit.toFixed(2)} · ROI ${item.stakes.realized_roi_pct.toFixed(2)}% on $${item.stakes.total_stake}`;
  li.append(summary);

  li.append(legRow('away', item.arb.away, item.stakes.stake_away, verdict));
  li.append(legRow('home', item.arb.home, item.stakes.stake_home, verdict));

  if (item.risk) li.append(reasoningTrace(item.risk));
  return li;
}

function reasoningTrace(risk) {
  const wrap = document.createElement('details');
  wrap.className = 'reasoning';

  const summary = document.createElement('summary');
  const factorCount = (risk.legs || []).reduce((s, l) => s + (l.factors || []).length, 0);
  summary.textContent = factorCount === 0
    ? `Reasoning · score ${risk.pairing_score.toFixed(2)} · no factors triggered`
    : `Reasoning · score ${risk.pairing_score.toFixed(2)} · ${factorCount} factor${factorCount === 1 ? '' : 's'}`;
  wrap.append(summary);

  if (risk.bridge_offline_reason) {
    const offline = document.createElement('div');
    offline.className = 'reasoning-offline';
    offline.textContent = risk.bridge_offline_reason;
    wrap.append(offline);
  }

  for (const leg of risk.legs || []) {
    const legBox = document.createElement('div');
    legBox.className = 'reasoning-leg';
    const head = document.createElement('div');
    head.className = 'reasoning-leg-head';
    const mult = leg.multiplier && leg.multiplier !== 1.0
      ? ` × ${leg.multiplier.toFixed(2)}`
      : '';
    head.textContent = `${leg.book}: score ${leg.score.toFixed(2)} (raw ${leg.raw_sum.toFixed(2)}${mult})${leg.hard_skip ? ' — HARD SKIP' : ''}`;
    legBox.append(head);

    if (!leg.factors || leg.factors.length === 0) {
      const none = document.createElement('div');
      none.className = 'reasoning-factor reasoning-none';
      none.textContent = 'no factors triggered';
      legBox.append(none);
    } else {
      for (const f of leg.factors) {
        const row = document.createElement('div');
        row.className = `reasoning-factor${f.hard_skip ? ' reasoning-hard' : ''}`;
        const w = document.createElement('span');
        w.className = 'reasoning-weight';
        w.textContent = `+${f.weight.toFixed(2)}`;
        const t = document.createElement('span');
        t.className = 'reasoning-text';
        t.textContent = f.label;
        const src = document.createElement('span');
        src.className = 'reasoning-src';
        src.textContent = f.source;
        row.append(w, t, src);
        legBox.append(row);
      }
    }
    wrap.append(legBox);
  }
  return wrap;
}

function legRow(side, leg, stake, verdict) {
  const row = document.createElement('div');
  row.className = `leg leg-${side}`;

  const book = document.createElement('span');
  book.className = 'leg-book';
  book.textContent = leg.book;

  const team = document.createElement('span');
  team.className = 'leg-team';
  team.textContent = leg.team;

  const odds = document.createElement('span');
  odds.className = 'leg-odds';
  odds.textContent = leg.odds.toFixed(3);

  // SKIP: no copy button (don't tempt the user). WAIT: behind a "show anyway" gate so the
  // user has to opt into copying despite the warning. GO: normal copy button.
  let cell;
  if (verdict === 'SKIP') {
    cell = document.createElement('span');
    cell.className = 'leg-stake leg-stake-blocked';
    cell.textContent = `$${stake}`;
    cell.title = 'SKIP: stake hidden — see reasoning trace';
  } else if (verdict === 'WAIT') {
    cell = document.createElement('button');
    cell.className = 'leg-stake leg-stake-gated';
    cell.type = 'button';
    cell.textContent = 'show $';
    cell.title = 'WAIT: click once to reveal stake, click again to copy';
    let revealed = false;
    cell.addEventListener('click', () => {
      if (!revealed) {
        cell.textContent = `$${stake}`;
        cell.classList.remove('leg-stake-gated');
        revealed = true;
      } else {
        copyStake(cell, stake);
      }
    });
  } else {
    cell = document.createElement('button');
    cell.className = 'leg-stake';
    cell.type = 'button';
    cell.textContent = `$${stake}`;
    cell.title = 'Click to copy stake';
    cell.addEventListener('click', () => copyStake(cell, stake));
  }

  row.append(book, team, odds, cell);
  return row;
}

function copyStake(btn, stake) {
  navigator.clipboard
    .writeText(String(stake))
    .then(() => {
      const orig = btn.textContent;
      btn.textContent = 'copied';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('copied');
      }, 900);
    })
    .catch((err) => console.error('[arb-scanner] copy failed', err));
}

function matchRow(item) {
  const li = document.createElement('li');
  li.className = 'match-row';

  const name = document.createElement('span');
  name.className = 'match-name';
  if (item.league) name.append(leagueTag(item.league), ' ');
  name.append(`${item.away} @ ${item.home}`);
  if (item.is_live) name.append(' ', badge('LIVE', 'small'));

  const books = document.createElement('span');
  books.className = 'match-books';
  books.textContent = item.books.join(' + ');

  const margin = document.createElement('span');
  margin.className = 'match-margin';
  if (item.best_margin_pct == null) {
    margin.textContent = '–';
  } else {
    const pct = item.best_margin_pct;
    margin.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
    if (pct < 0) margin.classList.add('neg');
  }

  li.append(name, books, margin);
  return li;
}

function badge(text, mod) {
  const el = document.createElement('span');
  el.className = `live-badge${mod ? ' ' + mod : ''}`;
  el.textContent = text;
  return el;
}

function leagueTag(league) {
  const el = document.createElement('span');
  el.className = `league-tag league-${league.toLowerCase()}`;
  el.textContent = league;
  return el;
}
