import { DatabaseSync } from 'node:sqlite';

export function createTestDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');

  // Adapt Node's SQLite API to the transaction and statement methods used by tinyjs.
  return {
    exec: (sql) => db.exec(sql),
    prepare(sql) {
      const statement = db.prepare(sql);
      return {
        all: (...params) => statement.all(...params).map((row) => ({ ...row })),
        finalize() {},
      };
    },
    transaction(action) {
      return {
        immediate() {
          db.exec('BEGIN IMMEDIATE');
          try {
            const result = action();
            db.exec('COMMIT');
            return result;
          } catch (error) {
            db.exec('ROLLBACK');
            throw error;
          }
        },
      };
    },
    close: () => db.close(),
  };
}
