// Dynamic registry of sportsbooks the user has accounts on.
//
// Adding a book:
//   1. Add an entry below.
//   2. Add the book's host pattern to `host_permissions` in manifest.json.
//   3. Add a content_scripts entry in manifest.json pointing at content/<book>.js.
//   4. Write content/<book>.js with that book's DOM selectors.
//
// `multiplier` comes from ../tracker/rules.md per-book risk multipliers. New books default to 1.00
// until enough history exists to recalibrate.
//
// `urls` are starting points for the Phase 9 "Open scan window" helper. Verify each one in a
// real browser session — sportsbook URLs change between regions and over time. Set to null to
// signal "not yet captured."

export const BOOKS = {
  betmgm: {
    name: 'BetMGM',
    multiplier: 1.0,
    hostPatterns: ['*://*.betmgm.ca/*'],
    contentScript: 'content/betmgm.js',
    urls: {
      homepage: 'https://on.betmgm.ca/en/sports',
      nhl: 'https://www.on.betmgm.ca/en/sports/hockey-12/betting/usa-9/nhl-34',
      nba: 'https://www.on.betmgm.ca/en/sports/basketball-7/betting/usa-9/nba-6004',
      nfl: 'https://www.on.betmgm.ca/en/sports/football-11/betting/usa-9/nfl-35',
      mlb: 'https://www.on.betmgm.ca/en/sports/baseball-23/betting/usa-9/mlb-75',
      soccer: null,
      tennis: null
    }
  },

  fanduel: {
    name: 'FanDuel',
    multiplier: 0.95,
    hostPatterns: ['*://*.fanduel.com/*'],
    contentScript: 'content/fanduel.js',
    urls: {
      homepage: 'https://sportsbook.fanduel.com/',
      nhl: 'https://sportsbook.fanduel.com/navigation/nhl',
      nba: 'https://sportsbook.fanduel.com/navigation/nba',
      nfl: 'https://sportsbook.fanduel.com/navigation/nfl',
      mlb: 'https://sportsbook.fanduel.com/navigation/mlb',
      soccer: null,
      tennis: null
    }
  }
};

export function listBooks() {
  return Object.entries(BOOKS).map(([key, book]) => ({ key, ...book }));
}

export function getBook(key) {
  return BOOKS[key] || null;
}

export function scanWindowUrls() {
  const out = [];
  for (const [bookKey, book] of Object.entries(BOOKS)) {
    for (const [sport, url] of Object.entries(book.urls)) {
      if (sport === 'homepage' || !url) continue;
      out.push({ bookKey, sport, url });
    }
  }
  return out;
}
