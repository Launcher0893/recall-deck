export function rows(db, sql, ...params) {
  const statement = db.prepare(sql);
  try {
    return statement.all(...params);
  } finally {
    statement.finalize();
  }
}
