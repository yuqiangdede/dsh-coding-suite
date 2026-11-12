# 编码套件按钮区 React #185 排查记录

状态：工作稿，非正式权威，归属任务 `launcher-crash-185`。只记录证据与验证，不改写正式资料。

## 现象

桌面端启动后，输入区上方出现红色 `[DEBUG-a4f2]` 浮层，内容为 `localStorage['dsh-coding-suite:launcher-probe']` 中的记录：`conversation.input.dock` 槽位捕获 `Minified React error #185`（Maximum update depth exceeded）。

## 证据链

1. 记录本身：`at = 2026-11-02T06:55:38.722Z`（本地 14:55:38），`outlet: true`，`crashFaces: ["conversation.input.dock"]`，`composer: true`；事件为 14:22:54 账号读取失败、14:55:36 `React error #185`、14:55:36 `slot error caught in 'conversation.input.dock'`。该值存于 Electron Local Storage LevelDB（键 `dsh-coding-suite:launcher-probe`），11-02 之后未再更新。
2. 崩溃时运行版本：`88373fc`（2026-11-02 14:50:41，`chore(bundle): synchronize launcher runtime`）。该版本 `Launcher.tsx` 的测量副作用写作 `useLayoutEffect(() => { measure(); ... })`，**没有依赖数组**，且 `measure()` 每次执行都会 `setGroupLimits(...)`。每次 commit 都会重新测量并同步派发一次更新；当行宽与按钮预算互相影响、测量值在两次结果间振荡时，即持续命中 React 的 50 次嵌套更新上限 → #185。
3. 同日修复 `4db9ee0 fix(launcher): avoid repeated layout measurement updates` 增加值比较守卫，注释写明 “React can hit its nested-update limit even when an updater returns the previous state if it is dispatched on every layout effect”。
4. `b7d1baa`（11-06）引入 `measurementKey` 与 `[measurable, measurementKey]` 依赖数组，从结构上禁止每次 commit 重新测量；11-10 未提交改动再补 `useMemo` 与 ResizeObserver 的 rAF 延迟（`src/client/Launcher.tsx`）。
5. 11-02 之后探针未写入新记录，而应用在 11-10～11-12 正常运行，说明 #185 未复发。

## 当前可见缺陷

10-30 加入的临时探针（注释要求“根因修复后删除整块”）仍随包发布：`apply()` 时读取旧记录并渲染固定红色浮层，同时包装 `console.error`、每秒 `setInterval` 轮询、挂 MutationObserver。用户看到的“报错”是 11-02 的旧记录被重放，而不是正在发生的崩溃。

## 修复与验证

- `src/client/index.ts`：删除探针整块与 `installLauncherDisappearanceProbe()` 调用。
- `lib/client.js`：用仓库自带的 `node --experimental-transform-types scripts/rebuild-launcher-bundle.mjs` 重建（重复执行 sha256 一致，非手改生成物）。
- 新增 `tests/launcher-instrumentation.node.test.mjs`：预置旧记录后调用 `apply()`，断言不追加 `data-dsh-launcher-probe` 浮层、不替换 `console.error`。修复前红（追加 2 个浮层），修复后绿。
- `tests/launcher-measure-stability.node.test.mjs`：增加断言，测量 `useLayoutEffect` 必须声明 2 个依赖，钉住 #185 的结构性修复。
- 通过：`launcher-overflow`(31)、`launcher-layout`(7)、`launcher-no-mode-switch`(2)、`launcher-measure-stability`(2)、`launcher-instrumentation`(1)、`spec-action`、`quick-confirm`；`scripts/verify-client-bundle.mjs`、`scripts/verify-launcher-render.mjs`。

## 边界与未做

- 未在真实宿主重放 11-02 的测量振荡（无当时运行环境）；#185 的“行宽 ↔ 按钮预算”直接触发链是推断，结构性根因（无依赖的 layout effect + 每次 commit 派发）由当日修复提交与注释证实。
- 未删除用户 localStorage 中的旧记录；探针删除后该键不再被读取，刷新窗口即不再出现浮层。
- 未提交、未推送。
