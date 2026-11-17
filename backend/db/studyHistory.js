import { rows } from './rows.js';

// Event order also breaks ties when selection and rating share a millisecond.
export function addStudyHistory(db) {
  db.exec(`
    CREATE TABLE study_events (
      id INTEGER PRIMARY KEY,
      cardId INTEGER NOT NULL,
      occurredAt INTEGER NOT NULL,
      selected INTEGER CHECK (selected IN (0, 1)),
      rating TEXT CHECK (rating IN ('known', 'fuzzy', 'forgotten')),
      CHECK (selected IS NOT NULL OR rating IS NOT NULL)
    );
    CREATE INDEX study_events_time ON study_events(occurredAt, id);

    INSERT INTO study_events (cardId, occurredAt, selected)
      SELECT cardId, min(reviewedAt), 1 FROM reviews
      WHERE source = 'study' AND cardId IS NOT NULL GROUP BY cardId;
    INSERT INTO study_events (cardId, occurredAt, rating)
      SELECT cardId, reviewedAt, rating FROM reviews
      WHERE source = 'study' AND cardId IS NOT NULL ORDER BY reviewedAt, rowid;
  `);

  // Old selection dates were never stored. Reconcile inferred history with the current library.
  rows(db, `
    INSERT INTO study_events (cardId, occurredAt, selected, rating)
      SELECT id, ?, studySelected, reviewState FROM cards
      WHERE studySelected = 1 OR id IN (SELECT cardId FROM study_events)
  `, Date.now());

  const timestamp = "CAST(round((julianday('now') - 2440587.5) * 86400000) AS INTEGER)";
  db.exec(`
    CREATE TRIGGER study_history_insert AFTER INSERT ON cards WHEN NEW.studySelected = 1
    BEGIN
      INSERT INTO study_events (cardId, occurredAt, selected, rating)
      VALUES (NEW.id, ${timestamp}, 1, NEW.reviewState);
    END;
    CREATE TRIGGER study_history_select AFTER UPDATE OF studySelected ON cards
    WHEN NEW.studySelected <> OLD.studySelected
    BEGIN
      INSERT INTO study_events (cardId, occurredAt, selected, rating)
      VALUES (NEW.id, ${timestamp}, NEW.studySelected, NEW.reviewState);
    END;
    CREATE TRIGGER study_history_remove AFTER DELETE ON cards WHEN OLD.studySelected = 1
    BEGIN
      INSERT INTO study_events (cardId, occurredAt, selected, rating)
      VALUES (OLD.id, ${timestamp}, 0, OLD.reviewState);
    END;
  `);
}
