// Unit tests for state.js — derive per-book state from synthetic event lists, plus parseRules
// against a snippet of rules.md syntax. Run with `node state.test.js`.

import { parseEvents, parseRules, deriveState } from './state.js';

let failed = 0;
function check(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed++; } else { console.log('  ok:', msg); }
}
function near(a, b, msg, eps = 0.01) {
  check(Math.abs(a - b) < eps, `${msg} (got ${a}, expected ${b})`);
}

const NOW = Date.parse('2026-04-26T15:00:00-04:00');
const DAY = 24 * 60 * 60 * 1000;

console.log('test: parseEvents tolerates blank lines and trailing newline');
{
  const raw = '\n{"timestamp":"2026-04-25T14:00:00-04:00","type":"deposit","book":"FanDuel","amount":100,"method":"Interac e-Transfer"}\n\n{"timestamp":"2026-04-26T14:00:00-04:00","type":"deposit","book":"BetMGM","amount":100,"method":"Interac e-Transfer"}\n';
  const events = parseEvents(raw);
  check(events.length === 2, 'parsed 2 events');
  check(events[0].book === 'FanDuel', 'first event is FanDuel');
}

console.log('test: parseRules pulls thresholds from rules.md syntax');
{
  const md = `
| Constant | Value | Meaning |
|---|---|---|
| \`MIN_FLOAT_PER_BOOK_CAD\` | \`200\` | Minimum |
| \`MAX_STAKE_PCT_OF_FLOAT\` | \`0.20\` | Cap |
| \`MIN_ACCOUNT_AGE_DAYS\` | \`30\` | Aging |
| \`STAKE_ROUNDING_CAD\` | \`5\` | Round |

| Book | Multiplier |
|---|---|
| \`Bet365\` | \`1.10\` |
| \`FanDuel\` | \`0.95\` |
| \`BetMGM\` | \`1.00\` |
`;
  const { thresholds, multipliers } = parseRules(md);
  check(thresholds.MAX_STAKE_PCT_OF_FLOAT === 0.20, 'MAX_STAKE_PCT_OF_FLOAT parsed');
  check(thresholds.MIN_ACCOUNT_AGE_DAYS === 30, 'MIN_ACCOUNT_AGE_DAYS parsed');
  check(multipliers.Bet365 === 1.10, 'Bet365 multiplier');
  check(multipliers.FanDuel === 0.95, 'FanDuel multiplier');
  check(multipliers.BetMGM === 1.00, 'BetMGM multiplier');
}

console.log('test: deposit-only book derives float, age, and zero bet history');
{
  const events = parseEvents(
    '{"timestamp":"2026-04-25T14:00:00-04:00","type":"deposit","book":"FanDuel","amount":100,"method":"Interac e-Transfer"}'
  );
  const state = deriveState(events, NOW);
  near(state.books.FanDuel.current_balance, 100, 'balance is just the deposit');
  near(state.books.FanDuel.total_pnl, 0, 'pnl zero with no bets');
  check(state.books.FanDuel.account_age_days === 1, 'one-day account');
  check(state.books.FanDuel.non_arb_bets_count === 0, 'no recreational bets');
  check(state.books.FanDuel.recent_clv_avg === null, 'CLV null with no settled bets');
  check(state.books.FanDuel.status === 'active', 'default status active');
}

console.log('test: account_open anchors age before any deposit');
{
  const events = parseEvents(
    [
      '{"timestamp":"2026-01-01T10:00:00-05:00","type":"account_open","book":"BetMGM"}',
      '{"timestamp":"2026-04-20T10:00:00-04:00","type":"deposit","book":"BetMGM","amount":200,"method":"Interac e-Transfer"}'
    ].join('\n')
  );
  const state = deriveState(events, NOW);
  // Roughly 115 days from Jan 1 to Apr 26.
  check(state.books.BetMGM.account_age_days >= 110, 'age picks up the open event');
  near(state.books.BetMGM.current_balance, 200, 'balance from deposit');
}

console.log('test: bet placed reduces balance, settled win restores + adds');
{
  const events = parseEvents(
    [
      '{"timestamp":"2026-01-01T10:00:00-05:00","type":"deposit","book":"FanDuel","amount":300,"method":"Interac"}',
      '{"timestamp":"2026-04-20T18:00:00-04:00","type":"bet_placed","bet_id":"bet-2026-04-20-001","book":"FanDuel","sport":"NHL","event":"X vs Y","market":"moneyline","side":"X","odds":2.0,"stake":50,"is_arb":false}',
      '{"timestamp":"2026-04-21T01:00:00-04:00","type":"bet_settled","bet_id":"bet-2026-04-20-001","result":"win","payout":100,"closing_odds":1.95}'
    ].join('\n')
  );
  const state = deriveState(events, NOW);
  // 300 - 50 + 100 = 350
  near(state.books.FanDuel.current_balance, 350, 'balance after win');
  near(state.books.FanDuel.total_pnl, 50, 'pnl reflects net win');
  check(state.books.FanDuel.non_arb_bets_count === 1, 'non-arb counter increments');
  check(state.books.FanDuel.bets_total === 1, 'bets_total tracks placements');
  check(state.books.FanDuel.recent_clv_avg !== null, 'CLV computed');
  // CLV: (1.95 - 2.0) / 2.0 = -0.025 → -2.5%
  near(state.books.FanDuel.recent_clv_avg, -0.025, 'CLV is negative');
}

console.log('test: arb pairing across two books increments pairings_last_30d');
{
  const events = parseEvents(
    [
      '{"timestamp":"2026-04-20T18:00:00-04:00","type":"bet_placed","bet_id":"bet-2026-04-20-001","book":"FanDuel","sport":"NHL","event":"X vs Y","market":"moneyline","side":"X","odds":2.10,"stake":50,"is_arb":true,"arb_id":"arb-2026-04-20-001"}',
      '{"timestamp":"2026-04-20T18:01:00-04:00","type":"bet_placed","bet_id":"bet-2026-04-20-002","book":"BetMGM","sport":"NHL","event":"X vs Y","market":"moneyline","side":"Y","odds":2.10,"stake":50,"is_arb":true,"arb_id":"arb-2026-04-20-001"}'
    ].join('\n')
  );
  const state = deriveState(events, NOW);
  check(state.pairings_last_30d['BetMGM__FanDuel'] === 1, 'pairing counted');
}

console.log('test: cashout treated as payout against current_balance and counted in 30d');
{
  const events = parseEvents(
    [
      '{"timestamp":"2026-04-01T10:00:00-04:00","type":"deposit","book":"FanDuel","amount":200,"method":"Interac"}',
      '{"timestamp":"2026-04-22T18:00:00-04:00","type":"bet_placed","bet_id":"bet-2026-04-22-001","book":"FanDuel","sport":"NHL","event":"X vs Y","market":"moneyline","side":"X","odds":2.0,"stake":50,"is_arb":false}',
      '{"timestamp":"2026-04-22T19:00:00-04:00","type":"bet_cashed_out","bet_id":"bet-2026-04-22-001","cashout_amount":80}'
    ].join('\n')
  );
  const state = deriveState(events, NOW);
  // 200 - 50 + 80 = 230
  near(state.books.FanDuel.current_balance, 230, 'balance after cashout');
  check(state.books.FanDuel.recent_cashouts_count === 1, 'cashout counted in 30d window');
}

console.log('test: status reflects most recent account_status_change');
{
  const events = parseEvents(
    [
      '{"timestamp":"2026-04-01T10:00:00-04:00","type":"deposit","book":"FanDuel","amount":200,"method":"Interac"}',
      '{"timestamp":"2026-04-15T10:00:00-04:00","type":"account_status_change","book":"FanDuel","status":"limited","evidence":"max bet $20"}'
    ].join('\n')
  );
  const state = deriveState(events, NOW);
  check(state.books.FanDuel.status === 'limited', 'status carries through');
}

console.log('test: bets_last_7d window correctness');
{
  const events = parseEvents(
    [
      '{"timestamp":"2026-04-01T10:00:00-04:00","type":"deposit","book":"FanDuel","amount":200,"method":"Interac"}',
      '{"timestamp":"2026-04-10T18:00:00-04:00","type":"bet_placed","bet_id":"bet-2026-04-10-001","book":"FanDuel","sport":"NHL","event":"X vs Y","market":"moneyline","side":"X","odds":2.0,"stake":20,"is_arb":false}',
      '{"timestamp":"2026-04-22T18:00:00-04:00","type":"bet_placed","bet_id":"bet-2026-04-22-001","book":"FanDuel","sport":"NHL","event":"X vs Y","market":"moneyline","side":"X","odds":2.0,"stake":20,"is_arb":false}',
      '{"timestamp":"2026-04-25T18:00:00-04:00","type":"bet_placed","bet_id":"bet-2026-04-25-001","book":"FanDuel","sport":"NHL","event":"X vs Y","market":"moneyline","side":"X","odds":2.0,"stake":20,"is_arb":false}'
    ].join('\n')
  );
  const state = deriveState(events, NOW);
  // 7-day window from 2026-04-26T15:00 → counts the 04-22 and 04-25 bets only
  check(state.books.FanDuel.bets_last_7d === 2, '7d window excludes 04-10 bet');
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nall tests pass');
