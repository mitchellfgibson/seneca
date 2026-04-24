// ─── Dashboard Config ─────────────────────────────────────────────────────────
// Run the dashboard with: python3 -m http.server 8080
// Then open: http://localhost:8080
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {

  // Location (Berkeley, CA)
  LAT: 37.8716,
  LON: -122.2727,

  // ── Weather ──────────────────────────────────────────────────────────────
  OPENWEATHER_KEY: 'ba10dd649a5a59a2fd3d171b5f20391a',

  // ── News ─────────────────────────────────────────────────────────────────
  NYTIMES_KEY: 'FatENdk6AAAPjVK9K6jXsHSK4m56vnrvD8RnY1TUTEecmsLm',

  // ── Markets ───────────────────────────────────────────────────────────────
  ALPHA_VANTAGE_KEY: 'ZBEAH8TZH0ZFOJOI',

  // ── Google OAuth ──────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: '',

  // ── To-Do Sheet ───────────────────────────────────────────────────────────
  TODO_SHEET_ID: '',
  TODO_RANGE: 'Sheet1!A:C',

  // ── Portfolio Sheet ───────────────────────────────────────────────────────
  PORTFOLIO_SHEET_ID: '',
  PORTFOLIO_RANGE: 'Sheet1!A:D',

  // ── Books Sheet (optional) ────────────────────────────────────────────────
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
    { content: 'I freed a thousand slaves. I could have freed a thousand more if only they knew they were slaves.', author: 'Harriet Tubman' },
  ],

};
