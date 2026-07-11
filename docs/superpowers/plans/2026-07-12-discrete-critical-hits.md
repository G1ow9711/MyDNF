# 离散暴击与伤害反馈实施计划

> **执行约束：** 当前用户明确禁止未经允许启动子智能体。本计划必须在当前会话内逐项执行，不得调度 subagent。

**Goal:** 将暴击属性从平均增伤改为真实命中帧触发的 1.5 倍暴击，并提供严格的事件、动画和真实键盘验收。

**Architecture:** `evaluateCombatProfile()` 负责暴击参数；`CombatRun` 保存确定性累积器；所有玩家命中在 `applyHit()` 中统一解析；现有 `CombatHitEvent` 驱动 UI，不新增并行伤害系统。

**Tech Stack:** TypeScript、Vitest、Vite、原生 DOM/CSS、Edge/Chrome CDP 真实浏览器。

---

### Task 1: 构筑参数与领域 RED

**Files:** `src/systems/builds.ts`、`src/tests/builds.test.ts`、`src/game/combat.ts`、`src/tests/combat.test.ts`

- [ ] 在构筑测试断言暴击不再进入稳定 `damageMultiplier`，并暴露 0-100 暴击率及 1.5 倍倍率。
- [ ] 在战斗测试构造 0%、40%、100% 暴击档，断言累积序列、伤害、事件字段和命中停顿。
- [ ] 增加延迟技能与 miss 测试，证明只有真实 `applyHit()` 推进累积器。
- [ ] 运行聚焦测试并确认因字段和行为缺失而 RED。

### Task 2: 统一暴击解析

**Files:** `src/systems/builds.ts`、`src/game/combat.ts`

- [ ] 从稳定伤害倍率删除 `crit / 250`，增加 `criticalChance` 和 `criticalDamageMultiplier`。
- [ ] 为 `CombatRun` 增加 `criticalAccumulator`，只在 `createCombatRun()` 初始化为 0，房间转换通过对象展开自然保留。
- [ ] 在 `applyHit()` 合并附加伤害后调用纯暴击解析器，使用最终伤害处理护甲、HP、事件和 125% 暴击停顿。
- [ ] 运行构筑和战斗聚焦测试并确认 GREEN。

### Task 3: 挂载表现 RED/GREEN

**Files:** `src/ui/app.ts`、`src/styles.css`、`src/tests/app-integration.test.ts`、`src/tests/ui-smoke.test.ts`

- [ ] 先断言场景、冲击节点和伤害数字包含暴击元数据，并要求 `critical` 震动/闪光。
- [ ] 在现有伤害数字中加入“暴击”标签，不创建第二套数字节点。
- [ ] 增加金白冲击、放大数字、独立震动和闪光关键帧；终结技优先级保持不变。
- [ ] 运行聚焦 UI 测试并确认 GREEN。

### Task 4: 真实键盘验收

**Files:** `src/tests/browser-keyboard-control.test.ts`

- [ ] 构造并保存夜契猎手装备稀有手镯、戒指的 22% 暴击合法状态，确保敌人能存活到第五次命中。
- [ ] 真实键盘进入灰窑巷、靠近怪物并连续攻击；MutationObserver/animation-frame 记录短时暴击事件。
- [ ] 断言暴击伤害数字、冲击特效、玩家/武器动作、屏幕反馈和累积器余数。
- [ ] 聚焦运行该场景，禁止通过直接调用 reducer 或修改战斗对象伪造暴击。

### Task 5: 全量验证与交付

**Files:** `task_plan.md`、`findings.md`、`progress.md`

- [ ] 运行 15 文件非键盘串行回归、TypeScript/Vite 构建和 `git diff --check`。
- [ ] 运行全部真实浏览器键盘场景并读取最终退出码。
- [ ] 更新项目记录，使用中文提交信息提交并推送 `feature/vertical-slice`。
