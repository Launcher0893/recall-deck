import { rows } from './rows.js';

const legacyDeckNames = [
  '党课复习 · 重大周年与年度党建时政',
  '党课复习 · 党章党规与发展党员',
  '党课复习 · 建党、长征与革命时期的党史',
  '党课复习 · 核心理论表述',
  '党课复习 · 二十大报告与全面从严治党',
];
const legacyDeckParams = legacyDeckNames.map(() => '?').join(', ');

// The original importer placed the supplement marker on the first line of the answer.
const supplementMarker = `
  trim(substr(back, 1, instr(back || char(10), char(10)) - 1), ' ' || char(9) || char(13)) = '> 补充内容'
`;

function findLegacyDeckIds(db) {
  const decks = rows(db, `
    SELECT id, name FROM decks WHERE name IN (${legacyDeckParams})
  `, ...legacyDeckNames);

  // The old schema has no import ID. Require the complete set of names without duplicates.
  const matchingNames = new Set(decks.map((deck) => deck.name));
  if (decks.length !== legacyDeckNames.length || matchingNames.size !== legacyDeckNames.length) return [];

  const ids = decks.map((deck) => deck.id);
  const [marker] = rows(db, `
    SELECT 1 FROM cards WHERE deckId IN (${legacyDeckParams}) AND ${supplementMarker} LIMIT 1
  `, ...ids);
  return marker ? ids : [];
}

function createGroup(db) {
  const [defaultDeck] = rows(db, `
    UPDATE decks SET name = '党课复习'
    WHERE id = 1 AND name = '默认卡组' AND NOT EXISTS (SELECT 1 FROM cards WHERE deckId = 1)
    RETURNING id
  `);
  const parentId = defaultDeck?.id ?? rows(db, "INSERT INTO decks (name) VALUES ('党课复习') RETURNING id")[0].id;
  const result = rows(db, `
    INSERT INTO decks (name, parentId, color)
    VALUES ('大纲考点', ?, '#1D4ED8'), ('补充内容', ?, '#92400E')
    RETURNING id, name
  `, parentId, parentId);
  return new Map(result.map(({ name, id }) => [name, id]));
}

export function groupLegacyOutlineCards(db) {
  const ids = findLegacyDeckIds(db);
  if (!ids.length) return;

  const group = createGroup(db);
  rows(db, `
    UPDATE cards SET deckId = CASE WHEN ${supplementMarker} THEN ? ELSE ? END
    WHERE deckId IN (${legacyDeckParams})
  `, group.get('补充内容'), group.get('大纲考点'), ...ids);
  rows(db, `DELETE FROM decks WHERE id IN (${legacyDeckParams})`, ...ids);
}
