// Pure functions that turn a raw events.jsonl + parsed thresholds into the per-book derived
// state described in ../extension/RISK_SCORING.md. No I/O — the server reads files; this
// module only operates on already-loaded strings/objects, so it's testable in isolation.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseEvents(jsonl) {
  if (!jsonl) return [];
  const out = [];
  const lines = jsonl.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch (err) {
      throw new Error(`events.jsonl line ${i + 1}: ${err.message}`);
    }
  }
  return out;
}

// Parse the "Quantitative thresholds" + "Per-book risk multipliers" tables out of rules.md.
// Format: `| ConstantName | \`value\` | description |`. Multipliers: `| BookName | \`value\` |`.
// Re-read on every request — no caching — so threshold edits in rules.md take effect
// immediately (per the Phase 6 contract).
export function parseRules(rulesMd) {
  const thresholds = {};
  const multipliers = {};
  if (!rulesMd) return { thresholds, multipliers };

  const constantRow = /\|\s*`?([A-Z_][A-Z0-9_]*)`?\s*\|\s*`([\-+0-9.]+)`\s*\|/g;
  let m;
  while ((m = constantRow.exec(rulesMd)) !== null) {
    const name = m[1];
    const value = Number(m[2]);
    if (Number.isFinite(value)) thresholds[name] = value;
  }

  // Per-book multipliers come from a separate table. Match `| \`BookName\` | \`number\` |` rows
  // where the left column is a backticked book label (the multipliers table is the only place
  // rules.md uses that exact shape).
  const bookRow = /\|\s*`([A-Za-z][A-Za-z0-9 +.]*)`\s*\|\s*`([\-+0-9.]+)`\s*\|/g;
  while ((m = bookRow.exec(rulesMd)) !== null) {
    const name = m[1];
    const value = Number(m[2]);
    if (Number.isFinite(value)) multipliers[name] = value;
  }

  return { thresholds, multipliers };
}

// Given the full event list, compute the per-book derived state described in RISK_SCORING.md.
// Returns { [bookName]: { ...fields }, _generated_at_iso }.
export function deriveState(events, nowMs = Date.now()) {
  const byBook = new Map();

  function bookSlot(book) {
    let slot = byBook.get(book);
    if (!slot) {
      slot = {
        first_event_at_ms: null,
        last_event_at_ms: null,
        deposits_total: 0,
        withdrawals_total: 0,
        last_deposit_at: null,
        last_withdrawal_at: null,
        last_deposit_at_ms: null,
        last_withdrawal_at_ms: null,
        bets_placed: [],         // { bet_id, ts_ms, ts_iso, stake, odds, is_arb, arb_id }
        bets_settled: [],        // { bet_id, ts_ms, payout, closing_odds }
        cashouts: [],            // { bet_id, ts_ms, amount }
        bet_index: new Map(),    // bet_id -> bets_placed entry
        last_bet_at: null,
        last_bet_at_ms: null,
        status: 'active',
        non_arb_bets_count: 0
      };
      byBook.set(book, slot);
    }
    return slot;
  }

  // Pairing tracking is global (across both books in an arb), keyed by sorted (a,b).
  const arbIdToBooks = new Map();   // arb_id -> Set<book>
  const pairingTimestamps = [];     // { pair: 'A__B', ts_ms }

  for (const ev of events) {
    if (!ev || !ev.type) continue;
    const ts = parseTs(ev.timestamp);
    if (ts == null) continue;

    const book = ev.book;
    if (book) {
      const slot = bookSlot(book);
      if (slot.first_event_at_ms == null || ts < slot.first_event_at_ms) {
        slot.first_event_at_ms = ts;
      }
      if (slot.last_event_at_ms == null || ts > slot.last_event_at_ms) {
        slot.last_event_at_ms = ts;
      }
    }

    switch (ev.type) {
      case 'account_open':
        // bookSlot already created; nothing else to do — first_event_at_ms anchors age.
        break;

      case 'deposit': {
        const slot = bookSlot(book);
        slot.deposits_total += num(ev.amount);
        if (slot.last_deposit_at_ms == null || ts > slot.last_deposit_at_ms) {
          slot.last_deposit_at_ms = ts;
          slot.last_deposit_at = ev.timestamp;
        }
        break;
      }

      case 'withdrawal': {
        const slot = bookSlot(book);
        slot.withdrawals_total += num(ev.amount);
        if (slot.last_withdrawal_at_ms == null || ts > slot.last_withdrawal_at_ms) {
          slot.last_withdrawal_at_ms = ts;
          slot.last_withdrawal_at = ev.timestamp;
        }
        break;
      }

      case 'bet_placed': {
        const slot = bookSlot(book);
        const entry = {
          bet_id: ev.bet_id,
          ts_ms: ts,
          ts_iso: ev.timestamp,
          stake: num(ev.stake),
          odds: num(ev.odds),
          is_arb: !!ev.is_arb,
          arb_id: ev.arb_id || null,
          settled: false,
          payout: 0,
          _book: book
        };
        slot.bets_placed.push(entry);
        if (entry.bet_id) slot.bet_index.set(entry.bet_id, entry);
        if (slot.last_bet_at_ms == null || ts > slot.last_bet_at_ms) {
          slot.last_bet_at_ms = ts;
          slot.last_bet_at = ev.timestamp;
        }
        if (!entry.is_arb) slot.non_arb_bets_count++;

        if (entry.arb_id) {
          if (!arbIdToBooks.has(entry.arb_id)) arbIdToBooks.set(entry.arb_id, new Set());
          arbIdToBooks.get(entry.arb_id).add(book);
        }
        break;
      }

      case 'bet_settled': {
        // bet_settled doesn't carry `book` in the schema — look up the placed bet to learn
        // which book this settles on.
        const placed = findPlaced(byBook, ev.bet_id);
        if (!placed) break;
        const slot = bookSlot(placed._book);
        const closingOdds = ev.closing_odds != null ? num(ev.closing_odds) : null;
        slot.bets_settled.push({
          bet_id: ev.bet_id,
          ts_ms: ts,
          payout: num(ev.payout),
          placed_odds: placed.odds,
          closing_odds: closingOdds
        });
        placed.settled = true;
        placed.payout = num(ev.payout);
        break;
      }

      case 'bet_cashed_out': {
        const placed = findPlaced(byBook, ev.bet_id);
        if (!placed) break;
        const slot = bookSlot(placed._book);
        const amount = num(ev.cashout_amount);
        slot.cashouts.push({ bet_id: ev.bet_id, ts_ms: ts, amount });
        placed.settled = true;
        placed.payout = amount;
        break;
      }

      case 'account_status_change': {
        const slot = bookSlot(book);
        if (ev.status) slot.status = ev.status;
        break;
      }

      case 'balance_audit':
      case 'note':
        // Recorded for human review; no effect on derived state.
        break;

      default:
        // Unknown event type: ignore (forward-compatible).
        break;
    }
  }

  // Finalize per-book derived metrics.
  const out = {};
  for (const [book, slot] of byBook.entries()) {
    const placedSorted = [...slot.bets_placed].sort((a, b) => b.ts_ms - a.ts_ms);
    const settledSorted = [...slot.bets_settled].sort((a, b) => b.ts_ms - a.ts_ms);

    const last20 = placedSorted.slice(0, 20);
    const recent_avg_stake = last20.length
      ? last20.reduce((s, b) => s + b.stake, 0) / last20.length
      : 0;
    const recent_max_stake = last20.length
      ? Math.max(...last20.map((b) => b.stake))
      : 0;

    const sevenDaysAgo = nowMs - 7 * MS_PER_DAY;
    const thirtyDaysAgo = nowMs - 30 * MS_PER_DAY;
    const bets_last_7d = slot.bets_placed.filter((b) => b.ts_ms >= sevenDaysAgo).length;

    // CLV: mean of (closing_odds - placed_odds) / placed_odds over the last 20 settled bets
    // that have closing_odds populated. Reported as a fraction (0.012 = +1.2%).
    const clvSettled = settledSorted
      .filter((s) => s.closing_odds != null && s.placed_odds > 0)
      .slice(0, 20);
    const recent_clv_avg = clvSettled.length
      ? clvSettled.reduce((s, x) => s + (x.closing_odds - x.placed_odds) / x.placed_odds, 0) / clvSettled.length
      : null;

    const recent_cashouts_count = slot.cashouts.filter((c) => c.ts_ms >= thirtyDaysAgo).length;

    // current_balance: deposits + payouts - stakes - withdrawals.
    // Includes ALL bets the book has accepted (open + settled), since stake leaves the float
    // immediately at placement and only returns via payout/cashout.
    const stakesTotal = slot.bets_placed.reduce((s, b) => s + b.stake, 0);
    const payoutsTotal = slot.bets_settled.reduce((s, b) => s + b.payout, 0)
      + slot.cashouts.reduce((s, c) => s + c.amount, 0);
    const current_balance = round2(slot.deposits_total + payoutsTotal - stakesTotal - slot.withdrawals_total);
    const total_pnl = round2(current_balance - slot.deposits_total + slot.withdrawals_total);

    const account_age_days = slot.first_event_at_ms != null
      ? Math.floor((nowMs - slot.first_event_at_ms) / MS_PER_DAY)
      : 0;

    out[book] = {
      current_balance,
      deposits_total: round2(slot.deposits_total),
      withdrawals_total: round2(slot.withdrawals_total),
      total_pnl,
      recent_avg_stake: round2(recent_avg_stake),
      recent_max_stake: round2(recent_max_stake),
      bets_last_7d,
      last_bet_at: slot.last_bet_at,
      last_deposit_at: slot.last_deposit_at,
      last_withdrawal_at: slot.last_withdrawal_at,
      account_age_days,
      non_arb_bets_count: slot.non_arb_bets_count,
      recent_clv_avg,
      recent_cashouts_count,
      status: slot.status,
      bets_total: slot.bets_placed.length,
      settled_with_clv: clvSettled.length
    };
  }

  // Pairings in the last 30d: walk every arb_id whose set of books has exactly two members
  // and whose latest leg was placed within the last 30 days. Count each pair once per arb_id.
  const pairings_last_30d = {};
  const arbIdLatestTs = new Map();
  for (const slot of byBook.values()) {
    for (const p of slot.bets_placed) {
      if (!p.arb_id) continue;
      const cur = arbIdLatestTs.get(p.arb_id);
      if (cur == null || p.ts_ms > cur) arbIdLatestTs.set(p.arb_id, p.ts_ms);
    }
  }
  for (const [arbId, books] of arbIdToBooks.entries()) {
    if (books.size !== 2) continue;
    const ts = arbIdLatestTs.get(arbId);
    if (ts == null || ts < nowMs - 30 * MS_PER_DAY) continue;
    const sorted = [...books].sort();
    const key = `${sorted[0]}__${sorted[1]}`;
    pairings_last_30d[key] = (pairings_last_30d[key] || 0) + 1;
  }

  return {
    books: out,
    pairings_last_30d,
    generated_at_ms: nowMs,
    generated_at_iso: new Date(nowMs).toISOString()
  };
}

function findPlaced(byBook, betId) {
  if (!betId) return null;
  for (const slot of byBook.values()) {
    const hit = slot.bet_index.get(betId);
    if (hit) return hit;
  }
  return null;
}

function parseTs(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
