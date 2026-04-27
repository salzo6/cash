// Regression tests for the event-dedup algorithm — locks the behavior that fixed the
// 2026-04-27 FanDuel multi-day collision bug (every NYY@TEX MLB read was returning tomorrow's
// odds because today's and tomorrow's games shared the canonical event_key).
//
// Run: node lib/event_dedupe.test.js

import { dedupeByClosestStart, closenessScore } from './event_dedupe.js';

let failed = 0;
function check(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed++; } else { console.log('  ok:', msg); }
}

const NOW = Date.parse('2026-04-27T18:00:00-04:00');   // pretend "now" is 6pm tonight

console.log('test: same event_key, today wins over tomorrow');
{
  const today = {
    event_key: 'new-york-yankees__texas-rangers',
    away_odds: 1.595,                                // today's -168
    start_time_iso: '2026-04-27T20:06:00-04:00'      // 2h away
  };
  const tomorrow = {
    event_key: 'new-york-yankees__texas-rangers',
    away_odds: 1.847,                                // tomorrow's -118
    start_time_iso: '2026-04-28T20:06:00-04:00'      // 26h away
  };
  const result = dedupeByClosestStart([tomorrow, today], NOW);   // tomorrow first to prove order doesn't matter
  check(result.length === 1, 'one event survives');
  check(result[0].away_odds === 1.595, 'kept today\'s odds (1.595, not 1.847)');
}

console.log('test: in-progress game wins over upcoming-tomorrow');
{
  // Game started 30 min ago — score 30min, much less than 25.5h
  const inProgress = {
    event_key: 'a__b',
    label: 'in-progress',
    start_time_iso: '2026-04-27T17:30:00-04:00'
  };
  const tomorrow = {
    event_key: 'a__b',
    label: 'tomorrow',
    start_time_iso: '2026-04-28T19:30:00-04:00'
  };
  const result = dedupeByClosestStart([tomorrow, inProgress], NOW);
  check(result[0].label === 'in-progress', 'in-progress beats tomorrow');
}

console.log('test: missing start_time_iso is lowest priority');
{
  const noTime = { event_key: 'a__b', label: 'no-time' };
  const future = {
    event_key: 'a__b',
    label: 'has-time',
    start_time_iso: '2026-04-28T20:00:00-04:00'
  };
  const result = dedupeByClosestStart([noTime, future], NOW);
  check(result[0].label === 'has-time', 'event with start_time wins over event without');
}

console.log('test: malformed start_time_iso scores Infinity (treated as missing)');
{
  const bad = { event_key: 'a__b', label: 'bad', start_time_iso: 'not-a-date' };
  const good = { event_key: 'a__b', label: 'good', start_time_iso: '2026-04-28T20:00:00-04:00' };
  const result = dedupeByClosestStart([bad, good], NOW);
  check(result[0].label === 'good', 'malformed time loses to valid time');
}

console.log('test: distinct event_keys are preserved (different games)');
{
  const a = {
    event_key: 'aaa__bbb',
    start_time_iso: '2026-04-27T20:00:00-04:00'
  };
  const b = {
    event_key: 'ccc__ddd',
    start_time_iso: '2026-04-27T20:00:00-04:00'
  };
  const result = dedupeByClosestStart([a, b], NOW);
  check(result.length === 2, 'both distinct events survive');
}

console.log('test: stable on first-seen when scores tie');
{
  const a = { event_key: 'x__y', label: 'first', start_time_iso: '2026-04-28T19:00:00-04:00' };
  const b = { event_key: 'x__y', label: 'second', start_time_iso: '2026-04-28T19:00:00-04:00' };
  const result = dedupeByClosestStart([a, b], NOW);
  // Strict less-than means equal scores keep the first one — important because if FanDuel's
  // page renders the same game twice (carousel + main list, say), we want stable order.
  check(result[0].label === 'first', 'equal-score tie goes to first-seen');
}

console.log('test: closenessScore — basic math');
{
  const ev = { start_time_iso: '2026-04-27T19:00:00-04:00' };  // 1h after NOW
  const score = closenessScore(ev, NOW);
  check(Math.abs(score - 60 * 60 * 1000) < 100, 'score ~= 1 hour in ms');
}

console.log('test: closenessScore — symmetric (past 1h == future 1h)');
{
  const past = { start_time_iso: '2026-04-27T17:00:00-04:00' };   // 1h ago
  const future = { start_time_iso: '2026-04-27T19:00:00-04:00' }; // 1h from now
  check(closenessScore(past, NOW) === closenessScore(future, NOW), 'symmetric — abs() not signed');
}

console.log('test: 2026-04-27 reproduction — Yankees @ Rangers exact bug');
{
  // Reproduces the panel bug exactly: FanDuel emitted both today's and tomorrow's NYY@TEX
  // game with the same event_key. Without dedup the second one (tomorrow) overwrote today.
  const events = [
    {
      event_key: 'new-york-yankees__texas-rangers',
      away: 'New York Yankees',
      away_odds: 1.595,
      away_odds_american: -168,
      home: 'Texas Rangers',
      home_odds: 2.420,
      home_odds_american: 142,
      start_time_iso: '2026-04-27T20:06:00-04:00'
    },
    {
      event_key: 'new-york-yankees__texas-rangers',
      away: 'New York Yankees',
      away_odds: 1.847,
      away_odds_american: -118,
      home: 'Texas Rangers',
      home_odds: 2.000,
      home_odds_american: 100,
      start_time_iso: '2026-04-28T20:06:00-04:00'
    }
  ];
  const result = dedupeByClosestStart(events, NOW);
  check(result.length === 1, 'collapsed to one event');
  check(result[0].away_odds_american === -168, 'kept today\'s -168 (not tomorrow\'s -118)');
  check(result[0].home_odds_american === 142, 'kept today\'s +142 (not tomorrow\'s +100)');
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nall tests pass');
