import { Database } from 'tjs:sqlite';
import { migrate } from './migrate.js';

let database;

export async function libraryDataDirectory(app) {
  const { data } = await app.paths();
  // The tinyjs CLI sets TINYJS_LAUNCHER for `tinyjs dev`.
  if (!tjs.env.TINYJS_LAUNCHER) return data;
  const development = `${data}/development`;
  await tjs.makeDir(development, { recursive: true });
  return development;
}

async function openDatabase(app) {
  const data = await libraryDataDirectory(app);
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
