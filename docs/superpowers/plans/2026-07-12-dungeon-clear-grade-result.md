# 地下城通关评级与结果流程实施计划

> **执行约束：** 用户禁止未经允许启动子智能体。本计划只在当前会话内执行。

**Goal:** 用事件驱动的 C–SSS 评级和玩家确认结果页替代 Boss 完成后直接回城。

**Architecture:** `src/game/grading.ts` 负责纯评分和奖励映射；`CombatRun` 保留历史事件；`AppModel` 保存运行时结果并在结算前应用奖励；现有挂载层负责结果 UI、按钮和 Enter/Space。

**Tech Stack:** TypeScript、Vitest、Vite、原生 DOM/CSS、Edge/Chrome CDP。

---

### Task 1: 评分领域 RED/GREEN

**Files:** `src/game/grading.ts`、`src/tests/grading.test.ts`、`src/game/combat.ts`、`src/tests/combat.test.ts`

- [x] 先测试 C–SSS 阈值、六项评分、零事件安全值和各评级奖励。
- [x] 测试 `finishRoom()` 保留旧命中事件并追加房间清理事件。
- [x] 实现 `evaluateDungeonClear(run)` 与不可变评级奖励表。
- [x] 将房间事件从替换改为累积，运行聚焦测试确认 GREEN。

### Task 2: App 结果流程 RED/GREEN

**Files:** `src/ui/app.ts`、`src/tests/app-integration.test.ts`

- [x] 先测试完整结算进入 `dungeon-result`，`combatRun` 清除但 `dungeonResult` 存在。
- [x] 断言最终掉落、任务进度和评级奖励只应用一次。
- [x] 增加 `confirmDungeonResult`，确认后清除结果、切换城镇和城镇 BGM。
- [x] 测试结果模式重载仍通过既有存档恢复城镇且不重复奖励。

### Task 3: 结果表现 RED/GREEN

**Files:** `src/ui/app.ts`、`src/styles.css`、`src/tests/ui-smoke.test.ts`

- [x] 先断言结果根节点、评级/分数/统计/掉落/奖励数据钩子及确认按钮。
- [x] 渲染全屏单列评级界面并隐藏结果模式顶部导航。
- [x] 添加 C–SSS 评级色、入场动画、统计网格、奖励区和移动端布局。
- [x] 运行 UI 聚焦测试确认 GREEN。

### Task 4: 挂载键盘与真实浏览器

**Files:** `src/ui/app.ts`、`src/tests/browser-keyboard-control.test.ts`

- [x] 结果模式 Enter/Space 调用真实确认动作，点击按钮走同一 reducer。
- [x] 强化 `walkThroughCompletionGateToTown()`：先等待结果模式，记录评级和已保存奖励，再按 Enter 回城。
- [x] 新增完整灰窑结果断言，禁止直接调用 reducer 或伪造结果状态。
- [x] 聚焦运行 Boss 完成路线。

### Task 5: 全量验证与交付

**Files:** `task_plan.md`、`findings.md`、`progress.md`

- [x] 运行全部非键盘测试、生产构建和差异检查。
- [x] 串行运行全部真实浏览器键盘场景。
- [ ] 更新项目记录，中文提交并推送 `feature/vertical-slice`。
