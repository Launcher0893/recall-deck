# recall-deck

Recall Deck 是用 Vue、Arco Design Vue 和 tinyjs 开发的离线记忆卡应用。

## 在 Windows 开发

需要 Node.js 22.18 或以上、pnpm、tinyjs 0.74.0 或以上，以及 WebView2 Runtime。在仓库根目录运行：

```powershell
pnpm install
tinyjs dev
```

开发窗口由 tinyjs 启动。Vite 在本机 `127.0.0.1:41767` 提供热更新，卡库通过桌面窗口的 tinyjs 接口读写。

## 使用和打包

首次启动时，「默认卡组」是空的。可以前往「卡组管理」新建卡片，也可以在「学习与复习」点击「添加示例卡片」，把三张示例卡加入本机学习队列。

卡片正反面支持 Markdown、`$…$` 行内公式和用独立行 `$$` 包围的块公式。可添加一条用于自动比对的文本答案。

在「卡组管理」点击「选择学习卡片」，勾选卡片并保存。进入「学习与复习」就会显示一张已勾选的到期卡或新卡。点击卡片任意位置切换正反面，在底部选择「认识」「模糊」或「忘记」。应用保存熟悉度和下次复习时间后会显示下一张。

「键盘自测」可以用已勾选的卡片检验记忆。用 `Enter` 提交，`Shift + Enter` 换行。自测结果单独记录，学习日程由翻面学习的判分更新。

复习间隔参考艾宾浩斯遗忘曲线实验中的时间点，并按判分调整：

| 状态 | 下次复习 |
| --- | --- |
| 认识 | 从 20 分钟起，依次延长到 1 小时、9 小时、1 天、2 天、6 天和 31 天。到期前重测答对只更新状态，保持当前日程。 |
| 模糊 | 保留当前阶段，在 20 分钟或 1 小时内再复习。 |
| 忘记 | 回到第一阶段，20 分钟后再复习。 |

卡库显示每张卡片的状态和复习时间。旧版作答记录会自动迁移，原来的「记住了」和「需复习」分别对应「认识」和「忘记」。实验来源见 [Murre 与 Dros 对艾宾浩斯遗忘曲线的复现](https://doi.org/10.1371/journal.pone.0120644)。

```powershell
pnpm test
pnpm typecheck
tinyjs build
.\dist\recall-deck.exe
```

分发时将整个 `dist` 目录一起打包，解压后启动 `recall-deck.exe`。打包版可以离线运行。Windows 上的卡库文件为 `%APPDATA%\app.recalldeck.desktop\recall-deck.sqlite`，开发版和打包版使用同一应用 ID。

界面采用 [Arco Design Pro Vue](https://github.com/arco-design/arco-design-pro-vue) 的顶栏和侧栏布局。

## 项目结构

| 位置 | 职责 |
| --- | --- |
| `src/App.vue`、`src/shell/` | 组合卡库和自测界面，提供窗口布局 |
| `src/features/library/` | 卡组导航、卡片列表、编辑弹窗和卡库状态 |
| `src/features/review/` | 自测界面、作答状态、判分和重测 |
| `src/features/study/` | 逐张学习、翻面和日程更新 |
| `src/shared/`、`src/platform/` | 共享的数据类型和 Markdown 渲染，以及有类型约束的 tinyjs 调用 |
| `backend/features/`、`backend/db/` | 处理桌面接口请求，管理 SQLite 连接和迁移 |
| `test/` | 数据库迁移、作答保存、复习调度和键盘交互测试 |

添加桌面接口时，在对应的后台功能模块实现，再通过 `backend/main.js` 注册，并在 `src/platform/tinyjs.ts` 声明请求和响应类型。数据库结构变更集中在 `backend/db/migrate.js`，通过 SQLite 的 `user_version` 按版本升级。`backend/db/legacyOutline.js` 在升级时识别并整理旧版导入的党课卡组。
