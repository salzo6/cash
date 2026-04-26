// Pure arb detection + stake math. No I/O, no DOM. Testable in Node via lib/arb.test.js.

const STAKE_ROUNDING_CAD = 5;     // from ../tracker/rules.md
const MARGIN_FLOOR_PCT = 0.5;     // 0.5% min margin to absorb stake rounding
export const DEFAULT_TOTAL_STAKE = 100;

// Given a candidate event observed across multiple books, find the best 2-way arb pairing.
// Input shape: { [bookKey]: { away_odds, home_odds, away, home } }
// Returns { away: {book, odds, team}, home: {book, odds, team}, margin_pct, implied_total } or null.
export function findArb(byBook) {
  const entries = Object.entries(byBook).filter(([, d]) => d && d.away_odds && d.home_odds);
  if (entries.length < 2) return null;

  let bestAway = null;
  let bestHome = null;
  for (const [book, d] of entries) {
    if (!bestAway || d.away_odds > bestAway.odds) {
      bestAway = { book, odds: d.away_odds, team: d.away };
    }
    if (!bestHome || d.home_odds > bestHome.odds) {
      bestHome = { book, odds: d.home_odds, team: d.home };
    }
  }
  if (!bestAway || !bestHome) return null;

  // Pairing must use two different books — one leg per book.
  if (bestAway.book === bestHome.book) return null;

  const impA = 1 / bestAway.odds;
  const impH = 1 / bestHome.odds;
  const total = impA + impH;
  const margin_pct = (1 - total) * 100;
  if (margin_pct < MARGIN_FLOOR_PCT) return null;

  return { away: bestAway, home: bestHome, implied_total: total, margin_pct };
}

// Stake split that equalizes payout across both legs, rounded to STAKE_ROUNDING_CAD.
// Reports realized profit AFTER rounding (it'll be slightly less than ideal).
export function computeStakes(arb, totalStake = DEFAULT_TOTAL_STAKE) {
  const oA = arb.away.odds;
  const oH = arb.home.odds;
  const idealA = (totalStake * oH) / (oA + oH);
  const idealH = (totalStake * oA) / (oA + oH);

  const stakeA = roundToNearest(idealA, STAKE_ROUNDING_CAD);
  const stakeH = roundToNearest(idealH, STAKE_ROUNDING_CAD);

  const payoutA = stakeA * oA;
  const payoutH = stakeH * oH;
  const minPayout = Math.min(payoutA, payoutH);
  const totalAfterRounding = stakeA + stakeH;
  const realizedProfit = minPayout - totalAfterRounding;
  const realizedRoiPct = totalAfterRounding > 0 ? (realizedProfit / totalAfterRounding) * 100 : 0;

  return {
    stake_away: stakeA,
    stake_home: stakeH,
    total_stake: totalAfterRounding,
    ideal_stake_away: round2(idealA),
    ideal_stake_home: round2(idealH),
    payout_if_away: round2(payoutA),
    payout_if_home: round2(payoutH),
    min_payout: round2(minPayout),
    realized_profit: round2(realizedProfit),
    realized_roi_pct: round2(realizedRoiPct)
  };
}

function roundToNearest(value, increment) {
  return Math.round(value / increment) * increment;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
