import { rows } from './rows.js';
import { groupLegacyOutlineCards } from './legacyOutline.js';
import { nextSchedule } from '../features/schedule.js';

const schemaVersion = 4;

export function migrate(db) {
  db.transaction(() => {
    const [{ user_version: version }] = rows(db, 'PRAGMA user_version');
    if (version === schemaVersion) return;
    if (version < 0 || version > schemaVersion) {
      throw new Error('数据库版本高于当前应用支持的版本。');
    }
    if (version === 0) createInitialSchema(db);
    if (version < 2) addReviewSchedule(db);
    if (version < 3) addStudySelection(db);
    addDeckGrouping(db);
    groupLegacyOutlineCards(db);
    db.exec('PRAGMA user_version = ' + schemaVersion);
  }).immediate();
}

function addStudySelection(db) {
  db.exec(`
    ALTER TABLE cards ADD COLUMN studySelected INTEGER NOT NULL DEFAULT 0 CHECK(studySelected IN (0, 1));
    UPDATE cards SET studySelected = 1 WHERE dueAt IS NOT NULL;
    ALTER TABLE reviews ADD COLUMN source TEXT NOT NULL DEFAULT 'test' CHECK(source IN ('study', 'test'));
  `);
}

function addDeckGrouping(db) {
  db.exec(`
    ALTER TABLE decks ADD COLUMN parentId INTEGER REFERENCES decks(id);
    ALTER TABLE decks ADD COLUMN color TEXT;
  `);
}

function createInitialSchema(db) {
  db.exec(`
      CREATE TABLE decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );
      CREATE TABLE cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deckId INTEGER NOT NULL REFERENCES decks(id),
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        expected TEXT NOT NULL
      );
      CREATE INDEX cards_deck ON cards(deckId, id);
      CREATE TABLE reviews (
        attemptId TEXT PRIMARY KEY NOT NULL,
        cardId INTEGER REFERENCES cards(id) ON DELETE SET NULL,
        answer TEXT NOT NULL,
        remembered INTEGER NOT NULL CHECK(remembered IN (0, 1)),
        reviewedAt INTEGER NOT NULL
      );
      CREATE INDEX reviews_card ON reviews(cardId);
      INSERT INTO decks (name) VALUES ('默认卡组');
    `);
}

function addReviewSchedule(db) {
  db.exec(`
    ALTER TABLE cards ADD COLUMN reviewState TEXT CHECK(reviewState IN ('known', 'fuzzy', 'forgotten'));
    ALTER TABLE cards ADD COLUMN reviewStep INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE cards ADD COLUMN dueAt INTEGER;
    CREATE TABLE scheduled_reviews (
      attemptId TEXT PRIMARY KEY NOT NULL,
      cardId INTEGER REFERENCES cards(id) ON DELETE SET NULL,
      answer TEXT NOT NULL,
      rating TEXT NOT NULL CHECK(rating IN ('known', 'fuzzy', 'forgotten')),
      reviewedAt INTEGER NOT NULL
    );
    INSERT INTO scheduled_reviews (attemptId, cardId, answer, rating, reviewedAt)
      SELECT attemptId, cardId, answer, CASE remembered WHEN 1 THEN 'known' ELSE 'forgotten' END, reviewedAt
      FROM reviews ORDER BY rowid;
    DROP TABLE reviews;
    ALTER TABLE scheduled_reviews RENAME TO reviews;
    CREATE INDEX reviews_card ON reviews(cardId);
  `);

  const existingReviews = rows(db, `
    SELECT cardId, rating, reviewedAt FROM reviews WHERE cardId IS NOT NULL ORDER BY reviewedAt, rowid
  `);
  const schedules = new Map();
  for (const { cardId, rating, reviewedAt } of existingReviews) {
    const previous = schedules.get(cardId) ?? { reviewStep: 0, dueAt: null };
    schedules.set(cardId, nextSchedule(previous, rating, reviewedAt));
  }
  for (const [cardId, { reviewState, reviewStep, dueAt }] of schedules) {
    rows(db, 'UPDATE cards SET reviewState = ?, reviewStep = ?, dueAt = ? WHERE id = ?',
      reviewState, reviewStep, dueAt, cardId);
  }
}
