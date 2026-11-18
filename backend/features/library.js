import { getDatabase } from '../db/connection.js';
import { rows } from '../db/rows.js';
import { content, id } from './validation.js';

function existing(result, message) {
  if (!result.length) throw new Error(message);
  return result[0];
}

const cardFields = 'id, deckId, front, back, expected, reviewState, dueAt, studySelected';
const deckFields = 'id, name, parentId, color';

function toCard(row) {
  return { ...row, studySelected: row.studySelected === 1 };
}

const examples = [
  { front: '用英语怎么说「图书馆」？', back: '**library**', expected: 'library' },
  { front: '计算 $3^2$。', back: '$3^2 = 3 \\times 3 = 9$。', expected: '9' },
  { front: '水的化学式是什么？', back: '**H₂O**，由两个氢原子和一个氧原子组成。', expected: 'H2O' },
];

function readLibrary(db) {
  return {
    decks: rows(db, 'SELECT ' + deckFields + ' FROM decks ORDER BY id'),
    cards: rows(db, 'SELECT ' + cardFields + ' FROM cards ORDER BY id').map(toCard),
  };
}

export const libraryApi = {
  async 'library.list'(_params, app) {
    return readLibrary(await getDatabase(app));
  },

  async 'library.addExamples'(_params, app) {
    const db = await getDatabase(app);
    return db.transaction(() => {
      if (rows(db, 'SELECT 1 FROM cards LIMIT 1').length) return readLibrary(db);

      const [deck] = rows(db, 'INSERT INTO decks (name) VALUES (?) RETURNING id', '示例卡组');
      for (const { front, back, expected } of examples) {
        rows(db, `
          INSERT INTO cards (deckId, front, back, expected, studySelected) VALUES (?, ?, ?, ?, 1)
        `, deck.id, front, back, expected);
      }
      return readLibrary(db);
    }).immediate();
  },

  async 'deck.save'({ deckId, name }, app) {
    const db = await getDatabase(app);
    const label = content(name, '卡组名称', 80).trim();
    return deckId === undefined
      ? rows(db, 'INSERT INTO decks (name) VALUES (?) RETURNING ' + deckFields, label)[0]
      : existing(rows(db, 'UPDATE decks SET name = ? WHERE id = ? RETURNING ' + deckFields, label, id(deckId)),
        '卡组已不存在。');
  },

  async 'card.save'({ cardId, deckId, front, back, expected, joinStudy = false }, app) {
    const db = await getDatabase(app);
    const fields = [
      id(deckId),
      content(front, '正面', 40_000),
      content(back, '背面', 40_000),
      content(expected, '比对答案', 4_000, false).trim(),
    ];
    if (cardId === undefined) {
      if (typeof joinStudy !== 'boolean') throw new Error('学习选择无效。');
      return toCard(rows(db, `
        INSERT INTO cards (deckId, front, back, expected, studySelected) VALUES (?, ?, ?, ?, ?)
        RETURNING ${cardFields}
      `, ...fields, Number(joinStudy))[0]);
    }
    return toCard(existing(rows(db, `
      UPDATE cards SET deckId = ?, front = ?, back = ?, expected = ? WHERE id = ?
      RETURNING ${cardFields}
    `, ...fields, id(cardId)), '卡片已不存在。'));
  },

  async 'library.saveStudySelection'({ changes }, app) {
    if (!Array.isArray(changes)) throw new Error('学习选择无效。');
    const db = await getDatabase(app);
    db.transaction(() => {
      for (const change of changes) {
        if (typeof change?.studySelected !== 'boolean') throw new Error('学习选择无效。');
        existing(rows(db, `
          UPDATE cards SET studySelected = ? WHERE id = ? RETURNING id
        `, Number(change.studySelected), id(change.id)), '卡片已不存在，请重新打开学习卡片选择。');
      }
    }).immediate();
    return null;
  },

  async 'card.remove'({ cardId }, app) {
    const db = await getDatabase(app);
    rows(db, 'DELETE FROM cards WHERE id = ?', id(cardId));
    return null;
  },

};
