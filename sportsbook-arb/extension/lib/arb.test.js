import { findArb, computeStakes } from './arb.js';

let failed = 0;
function check(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed++; } else { console.log('  ok:', msg); }
}
function near(a, b, msg, eps = 0.01) {
  check(Math.abs(a - b) < eps, `${msg} (got ${a}, expected ${b})`);
}

console.log('test: real arb across two books');
{
  // Synthetic 2-way arb: 2.10 + 2.10 → implied 0.476 + 0.476 = 0.952 → 4.76% margin
  const arb = findArb({
    bookA: { away: 'X', home: 'Y', away_odds: 2.10, home_odds: 1.85 },
    bookB: { away: 'X', home: 'Y', away_odds: 1.95, home_odds: 2.10 }
  });
  check(arb !== null, 'arb detected');
  check(arb.away.book === 'bookA', 'best away leg from bookA');
  check(arb.home.book === 'bookB', 'best home leg from bookB');
  near(arb.away.odds, 2.10, 'best away odds');
  near(arb.home.odds, 2.10, 'best home odds');
  near(arb.margin_pct, 4.762, 'margin pct');
}

console.log('test: no arb (favorite-on-both-sides)');
{
  const arb = findArb({
    bookA: { away: 'X', home: 'Y', away_odds: 1.50, home_odds: 2.20 },
    bookB: { away: 'X', home: 'Y', away_odds: 1.45, home_odds: 2.15 }
  });
  check(arb === null, 'no arb returned');
}

console.log('test: same-book best on both sides is not an arb');
{
  const arb = findArb({
    bookA: { away: 'X', home: 'Y', away_odds: 5.0, home_odds: 5.0 },
    bookB: { away: 'X', home: 'Y', away_odds: 1.5, home_odds: 1.5 }
  });
  // bookA has both best legs but you can't arb against itself
  check(arb === null, 'rejected same-book pairing');
}

console.log('test: live BetMGM/FanDuel Sabres@Bruins is NOT an arb (1.02 + 14.0)');
{
  const arb = findArb({
    betmgm: { away: 'Sabres', home: 'Bruins', away_odds: 1.02, home_odds: 14.0 },
    fanduel: { away: 'Buffalo Sabres', home: 'Boston Bruins', away_odds: 1.017, home_odds: 15.0 }
  });
  // implied = 1/1.02 + 1/15 = 0.98 + 0.067 = 1.047 → no arb
  check(arb === null, 'extreme live odds correctly rejected');
}

console.log('test: stake split equalizes payout');
{
  const arb = {
    away: { book: 'A', odds: 2.10, team: 'X' },
    home: { book: 'B', odds: 2.10, team: 'Y' },
    margin_pct: 4.76
  };
  const s = computeStakes(arb, 100);
  near(s.stake_away, 50, 'stake_away rounded');
  near(s.stake_home, 50, 'stake_home rounded');
  near(s.payout_if_away, 105, 'payout if away');
  near(s.payout_if_home, 105, 'payout if home');
  near(s.realized_profit, 5, 'realized profit');
}

console.log('test: asymmetric rounding — Yankees/Rangers screenshot reproduction');
{
  // Reproduces 2026-04-27 screenshot: FanDuel Yankees 1.820 / BetMGM Rangers 2.400, $100 stake.
  // Should expose the wide min/max spread and a meaningful rounding cost.
  const arb = {
    away: { book: 'FanDuel', odds: 1.820, team: 'Yankees' },
    home: { book: 'BetMGM',  odds: 2.400, team: 'Rangers' },
    margin_pct: 3.38
  };
  const s = computeStakes(arb, 100);
  near(s.stake_away, 55, 'rounded $55 on FanDuel');
  near(s.stake_home, 45, 'rounded $45 on BetMGM');
  near(s.profit_if_away, 0.10, 'Yankees-win profit ≈ $0.10');
  near(s.profit_if_home, 8.00, 'Rangers-win profit = $8.00');
  near(s.min_profit, 0.10, 'min profit is the Yankees-win leg');
  near(s.max_profit, 8.00, 'max profit is the Rangers-win leg');
  near(s.ideal_profit, 3.51, 'ideal pre-rounding profit ≈ $3.51', 0.02);
  near(s.ideal_roi_pct, 3.51, 'ideal ROI ≈ 3.51%', 0.02);
  near(s.rounding_cost, 3.41, 'rounding cost ≈ $3.41 of profit lost', 0.02);
  near(s.ideal_stake_away, 56.87, 'ideal FanDuel stake $56.87', 0.02);
  near(s.ideal_stake_home, 43.13, 'ideal BetMGM stake $43.13', 0.02);
}

console.log('test: rounding loss is real but bounded');
{
  // Asymmetric: 2.50 + 1.80
  const arb = {
    away: { book: 'A', odds: 2.50, team: 'X' },
    home: { book: 'B', odds: 1.80, team: 'Y' },
    margin_pct: 0
  };
  const s = computeStakes(arb, 100);
  // ideal: stake_a = 100*1.80/4.30 = 41.86, stake_h = 100*2.50/4.30 = 58.14
  // rounded to nearest $5: 40 / 60
  near(s.stake_away, 40, 'rounded down');
  near(s.stake_home, 60, 'rounded up');
  // payout_if_away = 40*2.5 = 100; payout_if_home = 60*1.8 = 108
  // min = 100, total stake = 100, profit = 0
  near(s.realized_profit, 0, 'rounding-only profit');
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nall tests pass');
