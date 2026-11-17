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

在侧栏新建卡组，或从「默认卡组」开始。卡片正反面支持 Markdown、`$…$` 行内公式和用独立行 `$$` 包围的块公式。可添加一条用于自动比对的文本答案。

选择卡组并点击「开始自测」。用 `Enter` 提交，`Shift + Enter` 换行。查看参考答案后可手动判分。确认后才会保存该题结果。

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
| `src/shared/`、`src/platform/` | 共享的数据类型和 Markdown 渲染，以及有类型约束的 tinyjs 调用 |
| `backend/features/`、`backend/db/` | 处理桌面接口请求，管理 SQLite 连接和迁移 |
| `test/` | 判分和键盘交互的单元测试 |

添加桌面接口时，在对应的后台功能模块实现，再通过 `backend/main.js` 注册，并在 `src/platform/tinyjs.ts` 声明请求和响应类型。数据库结构变更集中在 `backend/db/migrate.js`，通过 SQLite 的 `user_version` 按版本升级。
