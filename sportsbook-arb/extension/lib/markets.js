// Approved sports + markets allowlist — derived from ../../tracker/rules.md "Market selection rules."
// Anything not on this list is rejected at detection time and never surfaced to the user.
// Editing this file is a hard-SKIP bypass — adding non-major markets accelerates account limiting
// per the rulebook's research backing.

const APPROVED_LEAGUES = {
  NHL: { sport: 'hockey', markets: ['moneyline', 'puck_line', 'totals'] },
  NBA: { sport: 'basketball', markets: ['moneyline', 'spread', 'totals'] },
  NFL: { sport: 'football', markets: ['moneyline', 'spread', 'totals'] },
  MLB: { sport: 'baseball', markets: ['moneyline', 'run_line', 'totals'] },

  // Top-tier soccer only. No third-tier leagues. MLS deferred until liquidity reconfirmed
  // per ../../tracker/rules.md.
  EPL: { sport: 'soccer', markets: ['moneyline_3way', 'totals'] },
  LA_LIGA: { sport: 'soccer', markets: ['moneyline_3way', 'totals'] },
  SERIE_A: { sport: 'soccer', markets: ['moneyline_3way', 'totals'] },
  BUNDESLIGA: { sport: 'soccer', markets: ['moneyline_3way', 'totals'] },
  UCL: { sport: 'soccer', markets: ['moneyline_3way', 'totals'] },

  // Top-tier tennis main tour only. Challengers / ITF / juniors are rejected.
  ATP: { sport: 'tennis', markets: ['moneyline'] },
  WTA: { sport: 'tennis', markets: ['moneyline'] }
};

export function isApprovedMarket(league, market) {
  const entry = APPROVED_LEAGUES[league];
  if (!entry) return false;
  return entry.markets.includes(market);
}

export function approvedLeagues() {
  return Object.keys(APPROVED_LEAGUES);
}

export function approvedMarketsFor(league) {
  const entry = APPROVED_LEAGUES[league];
  return entry ? [...entry.markets] : [];
}

export { APPROVED_LEAGUES };
