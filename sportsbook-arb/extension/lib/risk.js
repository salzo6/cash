// Phase 6 risk scoring per ../RISK_SCORING.md.
//
// Pure JS — no I/O, no DOM. Inputs:
//   - candidate: shape returned by background.js per arb (event_key, league, market, arb {away, home}, stakes)
//   - state:     shape returned by GET /state on the local bridge (thresholds, multipliers, books, pairings_last_30d)
//
// Output: { verdict, score, pairing_score, legs: [{ book, score, factors: [...] }] }
// where each factor is { code, label, weight, hard_skip, source } so the side panel can
// render an expandable reasoning trace.

import { isApprovedMarket } from './markets.js';

export const VERDICT_GO = 'GO';
export const VERDICT_WAIT = 'WAIT';
export const VERDICT_SKIP = 'SKIP';

const WAIT_FLOOR = 0.30;
const SKIP_FLOOR = 0.60;

// Default thresholds — used if the bridge omits a key (e.g. older rules.md). Numeric values
// match rules.md as of the 2026-04-26 calibration; risk.js prefers the bridge values when
// present so threshold edits in rules.md flow through without redeploying.
const DEFAULT_THRESHOLDS = {
  MIN_FLOAT_PER_BOOK_CAD: 200,
  MAX_STAKE_PCT_OF_FLOAT: 0.20,
  STAKE_ROUNDING_CAD: 5,
  MIN_DAYS_BETWEEN_DEPOSIT_AND_WITHDRAWAL: 14,
  MIN_ACCOUNT_AGE_DAYS: 30,
  MIN_NON_ARB_BETS_BEFORE_ARBING: 5,
  POST_WITHDRAWAL_HEAT_DAYS: 10,
  MAX_BETS_PER_BOOK_PER_WEEK: 12
};

const DEFAULT_MULTIPLIERS = {
  Bet365: 1.10,
  FanDuel: 0.95,
  BetMGM: 1.00,
  DraftKings: 1.00,
  'theScore Bet': 1.00,
  'Proline+': 0.95
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Main entry point. Returns a verdict object even if state is null (bridge offline) — see
// scorePairingOffline for the constrained fallback path.
export function scorePairing(candidate, state, nowMs = Date.now()) {
  if (!state) return scorePairingOffline(candidate);

  const thresholds = { ...DEFAULT_THRESHOLDS, ...(state.thresholds || {}) };
  const multipliers = { ...DEFAULT_MULTIPLIERS, ...(state.multipliers || {}) };
  const booksState = state.books || {};
  const pairings30d = state.pairings_last_30d || {};

  const legA = scoreLeg({
    leg: candidate.arb.away,
    stake: candidate.stakes && candidate.stakes.stake_away,
    other: candidate.arb.home,
    candidate,
    booksState,
    multipliers,
    thresholds,
    pairings30d,
    nowMs
  });
  const legB = scoreLeg({
    leg: candidate.arb.home,
    stake: candidate.stakes && candidate.stakes.stake_home,
    other: candidate.arb.away,
    candidate,
    booksState,
    multipliers,
    thresholds,
    pairings30d,
    nowMs
  });

  const pairing_score = Math.max(legA.score, legB.score);
  const hard = legA.hard_skip || legB.hard_skip;
  const verdict = hard ? VERDICT_SKIP : verdictFromScore(pairing_score);

  return {
    verdict,
    pairing_score: round3(pairing_score),
    bridge_status: 'online',
    vpn_check: state.vpn_check || 'unverified',
    legs: [legA, legB]
  };
}

// Bridge-offline path: only history-free factors (rounding, market filter, basic stake-vs-
// default-cap) can fire. Per the Phase 6 contract, every pairing comes back as WAIT with a
// reasoning line that names the gap, so the user knows to verify against rules.md manually.
export function scorePairingOffline(candidate) {
  const legA = scoreLegOffline({
    leg: candidate.arb.away,
    stake: candidate.stakes && candidate.stakes.stake_away,
    candidate
  });
  const legB = scoreLegOffline({
    leg: candidate.arb.home,
    stake: candidate.stakes && candidate.stakes.stake_home,
    candidate
  });

  // Even if a leg trips a hard-block in the offline checks, we still report WAIT (not SKIP) —
  // the user needs the reminder that the full check didn't run. The hard-block reasoning still
  // surfaces in the trace.
  const pairing_score = Math.max(legA.score, legB.score);

  return {
    verdict: VERDICT_WAIT,
    pairing_score: round3(pairing_score),
    bridge_status: 'offline',
    vpn_check: 'unverified',
    legs: [legA, legB],
    bridge_offline_reason: 'Bridge offline — hard-block and history factors not evaluated. Verify manually against rules.md before placing.'
  };
}

function scoreLeg({ leg, stake, candidate, booksState, multipliers, thresholds, pairings30d, nowMs }) {
  const bookName = leg.book;                                    // 'BetMGM', 'FanDuel'
  const bookState = booksState[bookName] || null;
  const multiplier = numericOr(multipliers[bookName], 1.0);
  const factors = [];

  function fire(code, label, weight, hard_skip, source) {
    factors.push({ code, label, weight, hard_skip: !!hard_skip, source });
  }

  // ----- Hard blocks -----

  // 1) Account not active
  if (bookState && bookState.status && bookState.status !== 'active') {
    fire(
      'status_not_active',
      `${bookName}: account status is "${bookState.status}" — do not place`,
      1.00, true, 'rules.md (hard block)'
    );
  }

  // 2) Account too new
  const minAge = numericOr(thresholds.MIN_ACCOUNT_AGE_DAYS, 30);
  const ageDays = bookState ? bookState.account_age_days : null;
  if (bookState == null) {
    fire(
      'no_history',
      `${bookName}: no events logged for this book — track a deposit + recreational bets before arbing`,
      1.00, true, 'rules.md MIN_ACCOUNT_AGE_DAYS'
    );
  } else if (ageDays != null && ageDays < minAge) {
    fire(
      'account_too_new',
      `${bookName}: account age ${ageDays}d < MIN_ACCOUNT_AGE_DAYS (${minAge})`,
      1.00, true, 'rules.md MIN_ACCOUNT_AGE_DAYS'
    );
  }

  // 3) Insufficient recreational history
  const minNonArb = numericOr(thresholds.MIN_NON_ARB_BETS_BEFORE_ARBING, 5);
  if (bookState && bookState.non_arb_bets_count != null && bookState.non_arb_bets_count < minNonArb) {
    fire(
      'insufficient_recreational_history',
      `${bookName}: ${bookState.non_arb_bets_count} recreational bets < MIN_NON_ARB_BETS_BEFORE_ARBING (${minNonArb}) — warm up the account first`,
      1.00, true, 'rules.md MIN_NON_ARB_BETS_BEFORE_ARBING'
    );
  }

  // 4) Stake exceeds float cap (live, against current_balance)
  const maxPct = numericOr(thresholds.MAX_STAKE_PCT_OF_FLOAT, 0.20);
  if (bookState && bookState.current_balance > 0 && stake != null) {
    const pct = stake / bookState.current_balance;
    if (pct > maxPct) {
      fire(
        'stake_exceeds_float_cap',
        `${bookName}: stake $${stake} = ${(pct * 100).toFixed(1)}% of $${bookState.current_balance} float (exceeds ${(maxPct * 100).toFixed(0)}% cap)`,
        0.40, true, 'rules.md MAX_STAKE_PCT_OF_FLOAT'
      );
    }
  }

  // 5) Non-major market — defense-in-depth (Phase 4 filter should catch upstream)
  if (candidate.league && candidate.market && !isApprovedMarket(candidate.league, candidate.market)) {
    fire(
      'non_major_market',
      `Market ${candidate.league}/${candidate.market} not in approved list`,
      1.00, true, 'rules.md "Market selection rules"'
    );
  }

  // 6) VPN — bridge cannot verify reliably; surfaced as informational, never a hard block here
  // (RISK_SCORING.md documents the v1 gap; the panel shows a "VPN check unverified" indicator
  // separately).

  // ----- Behavioural risk -----

  // High / moderate recent CLV
  if (bookState && bookState.recent_clv_avg != null) {
    const clv = bookState.recent_clv_avg;
    if (clv > 0.015) {
      fire('clv_high', `${bookName}: recent CLV +${(clv * 100).toFixed(2)}% (>1.5%) — strongest single ban signal`, 0.30, false, 'rules.md "Persistent positive CLV"');
    } else if (clv > 0.005) {
      fire('clv_moderate', `${bookName}: recent CLV +${(clv * 100).toFixed(2)}% (>0.5%)`, 0.15, false, 'rules.md "Persistent positive CLV"');
    }
  }

  // Stake spike
  if (bookState && bookState.recent_avg_stake > 0 && stake != null) {
    const ratio = stake / bookState.recent_avg_stake;
    if (ratio > 2.0) {
      fire('stake_spike_severe', `${bookName}: stake $${stake} is ${ratio.toFixed(1)}× recent avg $${bookState.recent_avg_stake}`, 0.25, false, 'rules.md "No sudden spikes"');
    } else if (ratio > 1.5) {
      fire('stake_spike_mild', `${bookName}: stake $${stake} is ${ratio.toFixed(1)}× recent avg $${bookState.recent_avg_stake}`, 0.10, false, 'rules.md "Gradual scaling"');
    }
  }

  // Stake not rounded
  const round = numericOr(thresholds.STAKE_ROUNDING_CAD, 5);
  if (stake != null && round > 0 && Math.abs((stake % round)) > 1e-6) {
    fire('stake_not_rounded', `Stake $${stake} not rounded to nearest $${round}`, 0.20, false, 'rules.md STAKE_ROUNDING_CAD');
  }

  // Recent deposit-withdraw cycle
  const cycleDays = numericOr(thresholds.MIN_DAYS_BETWEEN_DEPOSIT_AND_WITHDRAWAL, 14);
  if (bookState && bookState.last_deposit_at && bookState.last_withdrawal_at) {
    const dep = Date.parse(bookState.last_deposit_at);
    const wd = Date.parse(bookState.last_withdrawal_at);
    if (Number.isFinite(dep) && Number.isFinite(wd)) {
      const gap = Math.abs(wd - dep) / MS_PER_DAY;
      if (gap < cycleDays) {
        fire('deposit_withdraw_cycle', `${bookName}: last deposit and withdrawal ${gap.toFixed(0)}d apart (< ${cycleDays}d) — money-laundering pattern`, 0.30, false, 'rules.md "Don\'t withdraw soon after depositing"');
      }
    }
  }

  // Post-withdrawal heat window
  const heatDays = numericOr(thresholds.POST_WITHDRAWAL_HEAT_DAYS, 10);
  if (bookState && bookState.last_withdrawal_at) {
    const wd = Date.parse(bookState.last_withdrawal_at);
    if (Number.isFinite(wd)) {
      const sinceDays = (nowMs - wd) / MS_PER_DAY;
      if (sinceDays >= 0 && sinceDays < heatDays) {
        fire('post_withdrawal_heat', `${bookName}: ${sinceDays.toFixed(0)}d since last withdrawal (< ${heatDays}d) — human review window`, 0.20, false, 'rules.md POST_WITHDRAWAL_HEAT_DAYS');
      }
    }
  }

  // Repeated pairing
  const otherBook = candidate.arb.away.book === bookName ? candidate.arb.home.book : candidate.arb.away.book;
  const pairingKey = pairKey(bookName, otherBook);
  const pairCount = pairings30d[pairingKey] || 0;
  const totalPairs = Object.values(pairings30d).reduce((s, n) => s + n, 0);
  if (totalPairs > 0 && pairCount / totalPairs > 0.30) {
    fire(
      'repeated_pairing',
      `Pairing ${pairingKey.replace('__', ' / ')} = ${pairCount}/${totalPairs} of last-30d arbs (>30%) — rotate book pairings`,
      0.15, false, 'rules.md "Rotate book pairings"'
    );
  }

  // Outcome risk: winning
  if (bookState && bookState.deposits_total > 0 && bookState.total_pnl > 0) {
    const winRatio = bookState.total_pnl / bookState.deposits_total;
    if (winRatio > 0.70) {
      fire('outcome_winning_a_lot', `${bookName}: pnl $${bookState.total_pnl} = +${(winRatio * 100).toFixed(0)}% of deposits (>70%)`, 0.20, false, 'rules.md "Books ban CLV-positive accounts"');
    } else if (winRatio > 0.30) {
      fire('outcome_winning', `${bookName}: pnl $${bookState.total_pnl} = +${(winRatio * 100).toFixed(0)}% of deposits (>30%)`, 0.10, false, 'rules.md "Books ban CLV-positive accounts"');
    }
  }

  // High frequency
  const maxPerWeek = numericOr(thresholds.MAX_BETS_PER_BOOK_PER_WEEK, 12);
  if (bookState && bookState.bets_last_7d > maxPerWeek) {
    fire('high_frequency', `${bookName}: ${bookState.bets_last_7d} bets in last 7d > MAX_BETS_PER_BOOK_PER_WEEK (${maxPerWeek})`, 0.15, false, 'rules.md MAX_BETS_PER_BOOK_PER_WEEK');
  }

  // Frequent cash-outs
  if (bookState && bookState.recent_cashouts_count > 2) {
    fire('frequent_cashouts', `${bookName}: ${bookState.recent_cashouts_count} cash-outs in last 30d (>2) — arber signature`, 0.15, false, 'rules.md "Don\'t use cash-out as a tactic"');
  }

  return finalizeLeg({ bookName, factors, multiplier });
}

function scoreLegOffline({ leg, stake, candidate }) {
  const bookName = leg.book;
  const factors = [];

  function fire(code, label, weight, hard_skip, source) {
    factors.push({ code, label, weight, hard_skip: !!hard_skip, source });
  }

  // History-free hard-block: market filter
  if (candidate.league && candidate.market && !isApprovedMarket(candidate.league, candidate.market)) {
    fire(
      'non_major_market',
      `Market ${candidate.league}/${candidate.market} not in approved list`,
      1.00, true, 'rules.md "Market selection rules"'
    );
  }

  // History-free behavioural: stake rounding
  const round = DEFAULT_THRESHOLDS.STAKE_ROUNDING_CAD;
  if (stake != null && round > 0 && Math.abs((stake % round)) > 1e-6) {
    fire('stake_not_rounded', `Stake $${stake} not rounded to nearest $${round}`, 0.20, false, 'rules.md STAKE_ROUNDING_CAD');
  }

  // History-free hard-block: stake vs MIN_FLOAT_PER_BOOK_CAD floor (we don't know the live
  // float, but we know books are supposed to be at >= MIN_FLOAT_PER_BOOK_CAD, so a stake
  // bigger than that floor is suspicious regardless).
  const minFloat = DEFAULT_THRESHOLDS.MIN_FLOAT_PER_BOOK_CAD;
  const maxPct = DEFAULT_THRESHOLDS.MAX_STAKE_PCT_OF_FLOAT;
  if (stake != null && stake > minFloat * maxPct) {
    fire(
      'stake_over_default_cap',
      `Stake $${stake} exceeds default ${(maxPct * 100).toFixed(0)}% of MIN_FLOAT_PER_BOOK_CAD ($${minFloat * maxPct}) — verify against actual float`,
      0.40, false, 'rules.md MAX_STAKE_PCT_OF_FLOAT'
    );
  }

  return finalizeLeg({ bookName, factors, multiplier: 1.0, includeMultiplierTrace: false });
}

function finalizeLeg({ bookName, factors, multiplier, includeMultiplierTrace = true }) {
  const sum = factors.reduce((s, f) => s + f.weight, 0);
  const score = clamp01(sum * multiplier);
  const hard_skip = factors.some((f) => f.hard_skip);

  const reasoning = factors.map((f) => f.label);
  if (includeMultiplierTrace && multiplier !== 1.0) {
    reasoning.push(`${bookName}: per-book multiplier ${multiplier.toFixed(2)} (sum ${round3(sum)} → ${round3(score)})`);
  }

  return {
    book: bookName,
    score: round3(score),
    raw_sum: round3(sum),
    multiplier,
    hard_skip,
    factors,
    reasoning
  };
}

function verdictFromScore(score) {
  if (score < WAIT_FLOOR) return VERDICT_GO;
  if (score < SKIP_FLOOR) return VERDICT_WAIT;
  return VERDICT_SKIP;
}

function pairKey(a, b) {
  const sorted = [a, b].sort();
  return `${sorted[0]}__${sorted[1]}`;
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function numericOr(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}
