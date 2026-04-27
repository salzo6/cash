// Pure dedup helper for content-script per-poll batches.
//
// Some sportsbook pages render multiple game-days on a single scroll (e.g. FanDuel MLB shows
// today + tomorrow + day-after of every series). When same-teams matchups appear on multiple
// days, our canonical event_key (which intentionally drops the per-book event ID so it
// matches across books) collapses them all to one key — and only the last-seen one survives
// in storage.
//
// Fix: pick the event whose start_time_iso is closest to now per event_key. In-progress and
// upcoming both beat far-future, so for typical scanning windows this resolves to "today's
// game" vs "tomorrow's game" automatically.
//
// CONTENT SCRIPTS CANNOT IMPORT in MV3, so a verbatim copy of this function lives inline in
// content/fanduel.js. If you change the algorithm here, mirror it there. The test in
// event_dedupe.test.js is the canonical contract.

export function dedupeByClosestStart(events, nowMs = Date.now()) {
  const byKey = new Map();
  for (const ev of events) {
    const existing = byKey.get(ev.event_key);
    if (!existing) {
      byKey.set(ev.event_key, ev);
      continue;
    }
    if (closenessScore(ev, nowMs) < closenessScore(existing, nowMs)) {
      byKey.set(ev.event_key, ev);
    }
  }
  return [...byKey.values()];
}

export function closenessScore(ev, nowMs) {
  if (!ev || !ev.start_time_iso) return Infinity;
  const t = Date.parse(ev.start_time_iso);
  if (!Number.isFinite(t)) return Infinity;
  return Math.abs(t - nowMs);
}
