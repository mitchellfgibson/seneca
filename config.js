// ─── Dashboard Config ─────────────────────────────────────────────────────────
// Fill in your API keys below. None of these are committed with real values.
// Run the dashboard with: python3 -m http.server 8080
// Then open: http://localhost:8080
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {

  // Location (Berkeley, CA)
  LAT: 37.8716,
  LON: -122.2727,

  // ── Weather ──────────────────────────────────────────────────────────────
  // Free key at: https://openweathermap.org/api
  OPENWEATHER_KEY: 'ba10dd649a5a59a2fd3d171b5f20391a',

  // ── News ─────────────────────────────────────────────────────────────────
  // Free key at: https://developer.nytimes.com
  NYTIMES_KEY: 'FatENdk6AAAPjVK9K6jXsHSK4m56vnrvD8RnY1TUTEecmsLm',

  // ── Markets ───────────────────────────────────────────────────────────────
  // Free key at: https://www.alphavantage.co/support/#api-key (25 req/day)
  ALPHA_VANTAGE_KEY: 'ZBEAH8TZH0ZFOJOI',

  // ── Google OAuth ──────────────────────────────────────────────────────────
  // Steps:
  //   1. Go to https://console.cloud.google.com
  //   2. Create a project → Enable "Google Calendar API" + "Google Sheets API"
  //   3. APIs & Services → Credentials → Create OAuth 2.0 Client ID
  //   4. Type: Web application
  //   5. Authorized JavaScript origins: http://localhost:8080
  //   6. Paste the Client ID below
  GOOGLE_CLIENT_ID: '',

  // ── To-Do Sheet ───────────────────────────────────────────────────────────
  // Share your Google Sheet with your Google account (it uses OAuth, no service account needed)
  // Column layout: Task | Done (true/false) | Priority (high/medium/low)
  // Sheet ID is the long string in the URL: .../spreadsheets/d/THIS_PART/edit
  TODO_SHEET_ID: '',
  TODO_RANGE: 'Sheet1!A:C',

  // ── Portfolio Sheet ───────────────────────────────────────────────────────
  // Column layout: Name | Description | URL | Tags (comma-separated)
  PORTFOLIO_SHEET_ID: '',
  PORTFOLIO_RANGE: 'Sheet1!A:D',

  // ── Books Sheet (optional) ────────────────────────────────────────────────
  // Column layout: Title | Author | Status (reading/read) | Cover URL
  // Leave blank to use the static BOOKS list below instead
  BOOKS_SHEET_ID: '',
  BOOKS_RANGE: 'Sheet1!A:D',

  // ── Static Books (used if BOOKS_SHEET_ID is empty) ────────────────────────
  BOOKS: [
    { title: 'The Sun Also Rises', author: 'Ernest Hemingway', status: 'reading', pages: 251 },
    { title: 'The Stranger',       author: 'Albert Camus',     status: 'reading', pages: 123 },
    { title: 'Steppenwolf',        author: 'Hermann Hesse',    status: 'reading', pages: 237 },
  ],

  // ── Custom Quotes (mixed into the random rotation) ─────────────────────────
  CUSTOM_QUOTES: [
    { content: 'The soul becomes dyed with the colour of its thoughts.', author: 'Marcus Aurelius' },
    { content: 'It is not death that a man should fear, but he should fear never beginning to live.', author: 'Marcus Aurelius' },
  ],

};
