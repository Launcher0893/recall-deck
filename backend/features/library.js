import { getDatabase } from '../db/connection.js';
import { rows } from '../db/rows.js';
import { content, id } from './validation.js';

function existing(result, message) {
  if (!result.length) throw new Error(message);
  return result[0];
}

export const libraryApi = {
  async 'library.list'(_params, app) {
    const db = await getDatabase(app);
    return {
      decks: rows(db, 'SELECT id, name FROM decks ORDER BY id'),
      cards: rows(db, 'SELECT id, deckId, front, back, expected FROM cards ORDER BY id'),
    };
  },

  async 'deck.save'({ deckId, name }, app) {
    const db = await getDatabase(app);
    const label = content(name, '卡组名称', 80).trim();
    return deckId === undefined
      ? rows(db, 'INSERT INTO decks (name) VALUES (?) RETURNING id, name', label)[0]
      : existing(rows(db, 'UPDATE decks SET name = ? WHERE id = ? RETURNING id, name', label, id(deckId)),
        '卡组已不存在。');
  },

  async 'card.save'({ cardId, deckId, front, back, expected }, app) {
    const db = await getDatabase(app);
    const fields = [
      id(deckId),
      content(front, '正面', 40_000),
      content(back, '背面', 40_000),
      content(expected, '比对答案', 4_000, false).trim(),
    ];
    if (cardId === undefined) {
      return rows(db, `
        INSERT INTO cards (deckId, front, back, expected) VALUES (?, ?, ?, ?)
        RETURNING id, deckId, front, back, expected
      `, ...fields)[0];
    }
    return existing(rows(db, `
      UPDATE cards SET deckId = ?, front = ?, back = ?, expected = ? WHERE id = ?
      RETURNING id, deckId, front, back, expected
    `, ...fields, id(cardId)), '卡片已不存在。');
  },

  async 'card.remove'({ cardId }, app) {
    const db = await getDatabase(app);
    rows(db, 'DELETE FROM cards WHERE id = ?', id(cardId));
    return null;
  },

};
