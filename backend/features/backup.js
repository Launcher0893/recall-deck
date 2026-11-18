import { backupToken, restoreBackup, takeBackup, validateBackup } from '../db/backup.js';
import { getDatabase, libraryDataDirectory } from '../db/connection.js';

const maxBackupBytes = 128 * 1024 * 1024;
const dateStamp = () => new Date().toISOString().slice(0, 10);

async function writeBackup(path, backup) {
  const data = new TextEncoder().encode(JSON.stringify(backup));
  if (data.byteLength > maxBackupBytes) throw new Error('备份文件超过 128 MB。');
  const scratch = `${path}.${crypto.randomUUID()}.tmp`;
  try {
    await tjs.writeFile(scratch, data);
    await tjs.rename(scratch, path);
  } catch (error) {
    await tjs.remove(scratch).catch(() => {});
    throw error;
  }
}

async function readBackup(path) {
  if (Number((await tjs.stat(path)).size) > maxBackupBytes) throw new Error('备份文件超过 128 MB。');
  const data = await tjs.readFile(path);
  if (data.byteLength > maxBackupBytes) throw new Error('备份文件超过 128 MB。');
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
  } catch {
    throw new Error('无法读取备份文件，请选择 Recall Deck 导出的 JSON 文件。');
  }
  return validateBackup(parsed);
}

export const backupApi = {
  async 'backup.export'(_params, app) {
    const path = await app.dialog.saveFile({ types: ['json'], name: `recall-deck-${dateStamp()}.json` });
    if (!path) return null;
    if (!path.toLowerCase().endsWith('.json')) throw new Error('请选择 .json 文件名。');
    await writeBackup(path, takeBackup(await getDatabase(app)));
    return { path };
  },

  async 'backup.restore'(_params, app) {
    const path = await app.dialog.openFile({ types: ['json'] });
    if (!path) return null;
    const backup = await readBackup(path);
    const { decks, cards, reviews } = backup.tables;
    const confirmed = await app.dialog.confirm('用备份替换当前卡库？', {
      detail: `备份包含 ${decks.length} 个卡组、${cards.length} 张卡片和 ${reviews.length} 条作答记录。恢复前会先备份当前卡库。`,
      ok: '恢复卡库', cancel: '取消',
    });
    if (!confirmed) return null;

    const db = await getDatabase(app);
    const data = await libraryDataDirectory(app);
    const safetyPath = `${data}/recall-deck-before-restore-${dateStamp()}-${crypto.randomUUID()}.json`;
    const originalToken = backupToken(db);
    await writeBackup(safetyPath, takeBackup(db));
    restoreBackup(db, backup, originalToken);
    return { path: safetyPath };
  },
};
