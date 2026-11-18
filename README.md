# recall-deck

Recall Deck 是用 Vue、Arco Design Vue 和 tinyjs 开发的离线记忆卡应用。

## 在 Windows 开发

需要 Node.js 22.18 或以上、pnpm、tinyjs 0.74.0 或以上，以及 WebView2 Runtime。在仓库根目录运行：

```powershell
pnpm install
tinyjs dev
```

开发窗口由 tinyjs 启动。Vite 在本机 `127.0.0.1:41767` 提供热更新。开发卡库位于 `%APPDATA%\app.recalldeck.desktop\development\recall-deck.sqlite`，可通过应用内备份把测试数据导入开发库。

## 使用和打包

首次启动时，「默认卡组」是空的。可以前往「卡组管理」新建卡片，也可以在「学习」点击「添加示例卡片」，把三张示例卡加入本机学习队列。

卡片正反面支持 Markdown、`$…$` 行内公式和用独立行 `$$` 包围的块公式。可添加一条用于自动比对的文本答案。

在「卡组管理」点击「选择学习卡片」，勾选卡片并保存。新建卡片也可以直接「保存并加入学习」。「学习」显示已勾选的新卡，「复习」显示已到期的卡片。在卡组页可以只学习、复习或自测本组，父组包含其子组。

点击卡面，或在卡面获得焦点时按空格或回车，即可切换正反面。选择「认识」「模糊」或「忘记」后自动进入下一张，也可在卡面获得焦点时用数字键 `1`、`2`、`3` 判分。点击「上一张」可以改判最近完成的卡片，应用会用原来的进度和作答时间重新计算下次复习。

「键盘自测」可以用已勾选的卡片检验记忆。用 `Enter` 提交，`Shift + Enter` 换行。切换页面后，点击侧栏的「继续自测」可回到本轮进度和作答草稿。当前一轮在应用窗口打开期间保留，已提交的作答记录会写入卡库。学习日程由翻面学习的判分更新。

「备份与恢复」可导出包含卡组、卡片、复习日程和作答历史的 JSON 文件。恢复会用所选备份替换当前卡库，并把恢复前的备份保存在卡库目录。恢复完成后，页面会显示该文件的路径。单个备份文件最大为 128 MB。

复习间隔参考艾宾浩斯遗忘曲线实验中的时间点，并按判分调整：

| 状态 | 下次复习 |
| --- | --- |
| 认识 | 从 20 分钟起，依次延长到 1 小时、9 小时、1 天、2 天、6 天和 31 天。到期前重测答对只更新状态，保持当前日程。 |
| 模糊 | 保留当前阶段，在 20 分钟或 1 小时内再复习。 |
| 忘记 | 回到第一阶段，20 分钟后再复习。 |

卡库显示每张卡片的状态和复习时间。旧版作答记录会自动迁移，原来的「记住了」和「需复习」分别对应「认识」和「忘记」。实验来源见 [Murre 与 Dros 对艾宾浩斯遗忘曲线的复现](https://doi.org/10.1371/journal.pone.0120644)。

「数据统计」包含遗忘曲线、每日记忆和状态趋势三个页签。遗忘曲线用间隔相邻的翻面判分估计个人保留分。每日记忆按本地日期统计，同一天的同一张卡只计最后一次判分。灰色柱显示未来七天的复习预测，样本不足时沿用当前复习日程。状态趋势从最早可用记录开始，旧库未存储的加入时间以首次可用判分估算，新版会记录实际的加入和移出时间。

```powershell
pnpm test
pnpm typecheck
tinyjs build
.\dist\recall-deck.exe
```

分发时将整个 `dist` 目录一起打包，解压后启动 `recall-deck.exe`。打包版可以离线运行。Windows 上的正式卡库文件为 `%APPDATA%\app.recalldeck.desktop\recall-deck.sqlite`。

界面采用 [Arco Design Pro Vue](https://github.com/arco-design/arco-design-pro-vue) 的顶栏和侧栏布局。

## 项目结构

| 位置 | 职责 |
| --- | --- |
| `src/App.vue`、`src/shell/` | 组合卡库和自测界面，提供窗口布局 |
| `src/features/library/` | 卡组导航、卡片列表、编辑弹窗和卡库状态 |
| `src/features/review/` | 自测界面、作答状态、判分和重测 |
| `src/features/study/` | 逐张学习、翻面和日程更新 |
| `src/features/statistics/` | 三个统计页签、图表和交互 |
| `src/shared/`、`src/platform/` | 共享的数据类型和 Markdown 渲染，以及有类型约束的 tinyjs 调用 |
| `backend/features/`、`backend/db/` | 处理桌面接口请求，管理 SQLite 连接和迁移 |
| `test/` | 数据库迁移、作答保存、复习调度和键盘交互测试 |

添加桌面接口时，在对应的后台功能模块实现，再通过 `backend/main.js` 注册，并在 `src/platform/tinyjs.ts` 声明请求和响应类型。数据库结构变更集中在 `backend/db/migrate.js`，通过 SQLite 的 `user_version` 按版本升级。`backend/db/legacyOutline.js` 在升级时识别并整理旧版导入的党课卡组。
