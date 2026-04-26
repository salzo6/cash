const statusEl = document.getElementById('status');
const stakeInput = document.getElementById('stake-input');
const arbListEl = document.getElementById('arb-list');
const arbsEmptyEl = document.getElementById('arbs-empty');
const arbsCountEl = document.getElementById('arbs-count');
const matchListEl = document.getElementById('match-list');
const matchesEmptyEl = document.getElementById('matches-empty');
const matchesCountEl = document.getElementById('matches-count');

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
  renderArbs(payload.arbs || []);
  renderMatches(payload.matches || []);
  tickStatus();
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

  const header = document.createElement('div');
  header.className = 'card-header';

  const title = document.createElement('div');
  title.className = 'event-name';
  if (item.league) title.append(leagueTag(item.league), ' ');
  title.append(`${item.away} @ ${item.home}`);
  if (item.is_live) title.append(' ', badge('LIVE'));

  const margin = document.createElement('div');
  margin.className = 'margin';
  margin.textContent = `${item.arb.margin_pct.toFixed(2)}%`;

  header.append(title, margin);
  li.append(header);

  const summary = document.createElement('div');
  summary.className = 'summary';
  summary.textContent = `Profit $${item.stakes.realized_profit.toFixed(2)} · ROI ${item.stakes.realized_roi_pct.toFixed(2)}% on $${item.stakes.total_stake}`;
  li.append(summary);

  li.append(legRow('away', item.arb.away, item.stakes.stake_away));
  li.append(legRow('home', item.arb.home, item.stakes.stake_home));
  return li;
}

function legRow(side, leg, stake) {
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

  const stakeBtn = document.createElement('button');
  stakeBtn.className = 'leg-stake';
  stakeBtn.type = 'button';
  stakeBtn.textContent = `$${stake}`;
  stakeBtn.title = 'Click to copy stake';
  stakeBtn.addEventListener('click', () => copyStake(stakeBtn, stake));

  row.append(book, team, odds, stakeBtn);
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
