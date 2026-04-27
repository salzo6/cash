// Unit tests for lib/risk.js — exercise every factor in RISK_SCORING.md plus per-book
// multipliers, hard-block forcing, the bridge-offline path, and the verdict thresholds.
// Run with `node lib/risk.test.js` from extension/.

import {
  scorePairing,
  scorePairingOffline,
  VERDICT_GO,
  VERDICT_WAIT,
  VERDICT_SKIP
} from './risk.js';

let failed = 0;
function check(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed++; } else { console.log('  ok:', msg); }
}

// Helpers ---------------------------------------------------------------------

const NOW = Date.parse('2026-04-26T15:00:00-04:00');
const DAY = 24 * 60 * 60 * 1000;
const ISO = (msAgo) => new Date(NOW - msAgo).toISOString();

// Build a "healthy" book state: aged account, plenty of recreational history, decent float,
// no recent withdrawals, no CLV, no cashouts. Override per test by spreading.
function healthyBook(overrides = {}) {
  return {
    current_balance: 500,
    deposits_total: 500,
    withdrawals_total: 0,
    total_pnl: 0,
    recent_avg_stake: 50,
    recent_max_stake: 50,
    bets_last_7d: 2,
    last_bet_at: ISO(2 * DAY),
    last_deposit_at: ISO(120 * DAY),
    last_withdrawal_at: null,
    account_age_days: 200,
    non_arb_bets_count: 20,
    recent_clv_avg: null,
    recent_cashouts_count: 0,
    status: 'active',
    bets_total: 30,
    settled_with_clv: 0,
    ...overrides
  };
}

// Build a candidate arb across two books; defaults are NHL moneyline (approved), $50/$50.
function candidate({
  bookA = 'BetMGM',
  bookB = 'FanDuel',
  league = 'NHL',
  market = 'moneyline',
  oddsA = 2.10,
  oddsB = 2.10,
  stakeA = 50,
  stakeB = 50
} = {}) {
  return {
    event_key: 'test__game',
    league,
    market,
    arb: {
      away: { book: bookA, odds: oddsA, team: 'X' },
      home: { book: bookB, odds: oddsB, team: 'Y' },
      margin_pct: 4.76,
      implied_total: 0.952
    },
    stakes: {
      stake_away: stakeA,
      stake_home: stakeB,
      total_stake: stakeA + stakeB,
      payout_if_away: stakeA * oddsA,
      payout_if_home: stakeB * oddsB,
      realized_profit: 5,
      realized_roi_pct: 5
    }
  };
}

function baseState(overrides = {}) {
  return {
    thresholds: {
      MIN_FLOAT_PER_BOOK_CAD: 200,
      MAX_STAKE_PCT_OF_FLOAT: 0.20,
      STAKE_ROUNDING_CAD: 5,
      MIN_DAYS_BETWEEN_DEPOSIT_AND_WITHDRAWAL: 14,
      MIN_ACCOUNT_AGE_DAYS: 30,
      MIN_NON_ARB_BETS_BEFORE_ARBING: 5,
      POST_WITHDRAWAL_HEAT_DAYS: 10,
      MAX_BETS_PER_BOOK_PER_WEEK: 12
    },
    multipliers: {
      Bet365: 1.10,
      FanDuel: 0.95,
      BetMGM: 1.00
    },
    books: {
      BetMGM: healthyBook(),
      FanDuel: healthyBook()
    },
    pairings_last_30d: {},
    vpn_check: 'unverified',
    ...overrides
  };
}

function hasFactor(legs, code) {
  return legs.some((l) => l.factors.some((f) => f.code === code));
}

function getFactor(legs, code) {
  for (const l of legs) for (const f of l.factors) if (f.code === code) return { leg: l, factor: f };
  return null;
}

// Tests -----------------------------------------------------------------------

console.log('test: healthy two-aged-accounts arb returns GO with no factors');
{
  const r = scorePairing(candidate(), baseState(), NOW);
  check(r.verdict === VERDICT_GO, `verdict GO (got ${r.verdict})`);
  check(r.legs[0].factors.length === 0, 'leg A has no factors');
  check(r.legs[1].factors.length === 0, 'leg B has no factors');
}

console.log('test: hard block — account not active forces SKIP');
{
  const state = baseState({ books: { BetMGM: healthyBook({ status: 'limited' }), FanDuel: healthyBook() } });
  const r = scorePairing(candidate(), state, NOW);
  check(r.verdict === VERDICT_SKIP, 'SKIP on limited');
  check(hasFactor(r.legs, 'status_not_active'), 'status_not_active fired');
}

console.log('test: hard block — account too new forces SKIP');
{
  const state = baseState({ books: { BetMGM: healthyBook({ account_age_days: 12 }), FanDuel: healthyBook() } });
  const r = scorePairing(candidate(), state, NOW);
  check(r.verdict === VERDICT_SKIP, 'SKIP on age 12d');
  check(hasFactor(r.legs, 'account_too_new'), 'account_too_new fired');
}

console.log('test: hard block — insufficient recreational history forces SKIP');
{
  const state = baseState({ books: { BetMGM: healthyBook({ non_arb_bets_count: 2 }), FanDuel: healthyBook() } });
  const r = scorePairing(candidate(), state, NOW);
  check(r.verdict === VERDICT_SKIP, 'SKIP on 2 recreational bets');
  check(hasFactor(r.legs, 'insufficient_recreational_history'), 'insufficient_recreational_history fired');
}

console.log('test: hard block — stake exceeds float cap forces SKIP');
{
  const state = baseState({ books: { BetMGM: healthyBook({ current_balance: 200 }), FanDuel: healthyBook() } });
  const c = candidate({ stakeA: 80 });   // $80 / $200 = 40% > 20% cap
  const r = scorePairing(c, state, NOW);
  check(r.verdict === VERDICT_SKIP, 'SKIP on float-cap breach');
  check(hasFactor(r.legs, 'stake_exceeds_float_cap'), 'stake_exceeds_float_cap fired');
}

console.log('test: hard block — non-major market forces SKIP');
{
  // ESPORTS isn't on the approved list at all
  const c = candidate({ league: 'ESPORTS', market: 'moneyline' });
  const r = scorePairing(c, baseState(), NOW);
  check(r.verdict === VERDICT_SKIP, 'SKIP on non-approved league');
  check(hasFactor(r.legs, 'non_major_market'), 'non_major_market fired');
}

console.log('test: hard block — book unknown to bridge (no_history) forces SKIP');
{
  const state = baseState({ books: { FanDuel: healthyBook() } }); // no BetMGM entry
  const r = scorePairing(candidate(), state, NOW);
  check(r.verdict === VERDICT_SKIP, 'SKIP when bridge has no history for book');
  check(hasFactor(r.legs, 'no_history'), 'no_history fired');
}

console.log('test: behavioural — high CLV adds 0.30');
{
  const state = baseState({
    books: { BetMGM: healthyBook({ recent_clv_avg: 0.020 }), FanDuel: healthyBook() }
  });
  const r = scorePairing(candidate(), state, NOW);
  check(hasFactor(r.legs, 'clv_high'), 'clv_high fired');
  // 0.30 × 1.00 = 0.30 → boundary; verdictFromScore says < 0.30 = GO, so 0.30 → WAIT
  check(r.verdict === VERDICT_WAIT, `verdict WAIT (got ${r.verdict}, score ${r.pairing_score})`);
}

console.log('test: behavioural — moderate CLV adds 0.15');
{
  const state = baseState({
    books: { BetMGM: healthyBook({ recent_clv_avg: 0.008 }), FanDuel: healthyBook() }
  });
  const r = scorePairing(candidate(), state, NOW);
  check(hasFactor(r.legs, 'clv_moderate'), 'clv_moderate fired');
  check(r.verdict === VERDICT_GO, 'still GO with only 0.15');
}

console.log('test: behavioural — stake spike severe (2.5×)');
{
  const state = baseState({
    books: { BetMGM: healthyBook({ recent_avg_stake: 20 }), FanDuel: healthyBook() }
  });
  const c = candidate({ stakeA: 50 });   // 50 / 20 = 2.5×
  const r = scorePairing(c, state, NOW);
  check(hasFactor(r.legs, 'stake_spike_severe'), 'stake_spike_severe fired');
}

console.log('test: behavioural — stake spike mild (1.7×)');
{
  const state = baseState({
    books: { BetMGM: healthyBook({ recent_avg_stake: 30 }), FanDuel: healthyBook() }
  });
  const c = candidate({ stakeA: 50 });   // 50 / 30 = 1.67×
  const r = scorePairing(c, state, NOW);
  check(hasFactor(r.legs, 'stake_spike_mild'), 'stake_spike_mild fired');
  check(!hasFactor(r.legs, 'stake_spike_severe'), 'severe did NOT fire');
}

console.log('test: behavioural — stake not rounded to $5 grid');
{
  const c = candidate({ stakeA: 73 });   // arb-calculator-ugly number
  const r = scorePairing(c, baseState(), NOW);
  check(hasFactor(r.legs, 'stake_not_rounded'), 'stake_not_rounded fired');
}

console.log('test: behavioural — deposit/withdraw cycle within 14d');
{
  const state = baseState({
    books: {
      BetMGM: healthyBook({
        last_deposit_at: ISO(3 * DAY),
        last_withdrawal_at: ISO(1 * DAY)
      }),
      FanDuel: healthyBook()
    }
  });
  const r = scorePairing(candidate(), state, NOW);
  check(hasFactor(r.legs, 'deposit_withdraw_cycle'), 'deposit_withdraw_cycle fired');
}

console.log('test: behavioural — post-withdrawal heat window');
{
  const state = baseState({
    books: {
      BetMGM: healthyBook({ last_withdrawal_at: ISO(3 * DAY) }),
      FanDuel: healthyBook()
    }
  });
  const r = scorePairing(candidate(), state, NOW);
  check(hasFactor(r.legs, 'post_withdrawal_heat'), 'post_withdrawal_heat fired');
}

console.log('test: behavioural — repeated pairing >30%');
{
  const state = baseState({
    pairings_last_30d: { 'BetMGM__FanDuel': 5, 'BetMGM__Bet365': 1 }   // 5/6 = 83%
  });
  const r = scorePairing(candidate(), state, NOW);
  check(hasFactor(r.legs, 'repeated_pairing'), 'repeated_pairing fired');
}

console.log('test: behavioural — outcome winning (>30%)');
{
  const state = baseState({
    books: {
      BetMGM: healthyBook({ deposits_total: 200, total_pnl: 100 }),  // +50%
      FanDuel: healthyBook()
    }
  });
  const r = scorePairing(candidate(), state, NOW);
  check(hasFactor(r.legs, 'outcome_winning'), 'outcome_winning fired');
  check(!hasFactor(r.legs, 'outcome_winning_a_lot'), 'a_lot did NOT fire at +50%');
}

console.log('test: behavioural — outcome winning a lot (>70%)');
{
  const state = baseState({
    books: {
      BetMGM: healthyBook({ deposits_total: 200, total_pnl: 200 }),  // +100%
      FanDuel: healthyBook()
    }
  });
  const r = scorePairing(candidate(), state, NOW);
  check(hasFactor(r.legs, 'outcome_winning_a_lot'), 'outcome_winning_a_lot fired');
}

console.log('test: behavioural — high frequency (>12 bets/week)');
{
  const state = baseState({
    books: { BetMGM: healthyBook({ bets_last_7d: 15 }), FanDuel: healthyBook() }
  });
  const r = scorePairing(candidate(), state, NOW);
  check(hasFactor(r.legs, 'high_frequency'), 'high_frequency fired');
}

console.log('test: behavioural — frequent cashouts (>2 in 30d)');
{
  const state = baseState({
    books: { BetMGM: healthyBook({ recent_cashouts_count: 4 }), FanDuel: healthyBook() }
  });
  const r = scorePairing(candidate(), state, NOW);
  check(hasFactor(r.legs, 'frequent_cashouts'), 'frequent_cashouts fired');
}

console.log('test: per-book multiplier — FanDuel 0.95 reduces leg score');
{
  const state = baseState({
    books: {
      BetMGM: healthyBook(),
      FanDuel: healthyBook({ recent_clv_avg: 0.020 })   // +0.30 raw on FanDuel
    }
  });
  const r = scorePairing(candidate({ bookA: 'BetMGM', bookB: 'FanDuel' }), state, NOW);
  const fanduelLeg = r.legs.find((l) => l.book === 'FanDuel');
  // 0.30 × 0.95 = 0.285
  check(Math.abs(fanduelLeg.score - 0.285) < 1e-3, `FanDuel leg score 0.285 (got ${fanduelLeg.score})`);
  check(r.verdict === VERDICT_GO, 'GO since 0.285 < 0.30 floor');
}

console.log('test: per-book multiplier — Bet365 1.10 amplifies leg score');
{
  const state = baseState({
    multipliers: { ...baseState().multipliers, Bet365: 1.10 },
    books: {
      Bet365: healthyBook({ recent_clv_avg: 0.020 }),
      FanDuel: healthyBook()
    }
  });
  const r = scorePairing(candidate({ bookA: 'Bet365', bookB: 'FanDuel' }), state, NOW);
  const bet365Leg = r.legs.find((l) => l.book === 'Bet365');
  // 0.30 × 1.10 = 0.33
  check(Math.abs(bet365Leg.score - 0.33) < 1e-3, `Bet365 leg score 0.33 (got ${bet365Leg.score})`);
  check(r.verdict === VERDICT_WAIT, 'WAIT since 0.33 ≥ 0.30');
}

console.log('test: pairing score = max(legA, legB) — worse leg drives verdict');
{
  const state = baseState({
    books: {
      BetMGM: healthyBook(),               // clean
      FanDuel: healthyBook({ recent_clv_avg: 0.020 })  // dirty
    }
  });
  const r = scorePairing(candidate(), state, NOW);
  // FanDuel leg ≈ 0.285, BetMGM leg = 0
  check(Math.abs(r.pairing_score - 0.285) < 1e-3, `pairing_score = max(0, 0.285) = 0.285 (got ${r.pairing_score})`);
}

console.log('test: hard-SKIP factor forces SKIP regardless of low score');
{
  // Account too new but otherwise pristine — sum of weights is 1.00 from one factor, but the
  // verdict comes from the hard_skip flag, not the score.
  const state = baseState({
    books: { BetMGM: healthyBook({ account_age_days: 5 }), FanDuel: healthyBook() }
  });
  const r = scorePairing(candidate(), state, NOW);
  check(r.verdict === VERDICT_SKIP, 'hard-skip overrides score');
}

console.log('test: verdict thresholds — score 0.30 = WAIT, score 0.60 = SKIP boundary');
{
  // Stake-not-rounded (0.20) + post-withdrawal heat (0.20) + clv_moderate (0.15) = 0.55
  const state = baseState({
    books: {
      BetMGM: healthyBook({
        last_withdrawal_at: ISO(3 * DAY),
        recent_clv_avg: 0.008
      }),
      FanDuel: healthyBook()
    }
  });
  const r = scorePairing(candidate({ stakeA: 73 }), state, NOW);
  check(r.verdict === VERDICT_WAIT, `WAIT for combined 0.55 (got ${r.verdict}, score ${r.pairing_score})`);
}

console.log('test: bridge offline path — every pairing returns WAIT with offline reason');
{
  const r = scorePairingOffline(candidate());
  check(r.verdict === VERDICT_WAIT, 'WAIT when bridge offline');
  check(r.bridge_status === 'offline', 'bridge_status = offline');
  check(typeof r.bridge_offline_reason === 'string' && r.bridge_offline_reason.length > 20, 'has offline reason copy');
}

console.log('test: bridge offline still runs market filter');
{
  const r = scorePairingOffline(candidate({ league: 'ESPORTS', market: 'moneyline' }));
  check(hasFactor(r.legs, 'non_major_market'), 'market filter still fires offline');
  check(r.verdict === VERDICT_WAIT, 'still WAIT (not SKIP) — surface that history checks did not run');
}

console.log('test: bridge offline still flags ugly stakes');
{
  const r = scorePairingOffline(candidate({ stakeA: 73 }));
  check(hasFactor(r.legs, 'stake_not_rounded'), 'rounding check still fires offline');
}

console.log('test: bridge offline flags stake over default cap');
{
  const r = scorePairingOffline(candidate({ stakeA: 80 }));   // 80 > 0.20 × 200 = 40
  check(hasFactor(r.legs, 'stake_over_default_cap'), 'default-cap check fires offline');
}

console.log('test: scorePairing(null state) routes to offline path');
{
  const r = scorePairing(candidate(), null);
  check(r.verdict === VERDICT_WAIT, 'null state → WAIT');
  check(r.bridge_status === 'offline', 'bridge_status = offline');
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nall tests pass');
