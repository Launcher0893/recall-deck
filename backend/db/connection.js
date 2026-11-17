import { Database } from 'tjs:sqlite';
import { migrate } from './migrate.js';

let database;

async function openDatabase(app) {
  const { data } = await app.paths();
  const db = new Database(data + '/recall-deck.sqlite');
  try {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
    migrate(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function getDatabase(app) {
  database ??= openDatabase(app).catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
}
