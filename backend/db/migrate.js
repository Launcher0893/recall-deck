import { rows } from './rows.js';

export function migrate(db) {
  db.transaction(() => {
    const [{ user_version: version }] = rows(db, 'PRAGMA user_version');
    if (version === 1) return;
    if (version !== 0) throw new Error('数据库版本高于当前应用支持的版本。');
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
      PRAGMA user_version = 1;
    `);
  }).immediate();
}
