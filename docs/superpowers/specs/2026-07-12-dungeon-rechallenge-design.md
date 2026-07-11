# 地下城再次挑战与连续刷装设计

## 目标

在通关结算页直接再次挑战同一地下城、同一难度，补齐定向掉落和套装收集所需的连续刷装循环。再次挑战必须按一次全新入场处理，重新扣除疲劳并立即保存；不得重复发放上一轮奖励。

## 权威规则

- 再次挑战只在 `dungeon-result` 且存在 `dungeonResult` 时合法。
- 使用结果中的 `dungeonId` 和 `difficultyId` 调用现有 `canEnterDungeon()` 与 `consumeDungeonEntry()`。
- 成功后创建全新 `CombatRun`：房间回到 0，事件、连击、暴击累积、掉落和 Boss 阶段全部重置。
- 上一轮奖励、任务进度和结算评级不再处理；状态变化只有新入场疲劳扣除和难度偏好保持。
- 失败时保留结算页、结算数据和角色状态，显示明确原因，不修改存档。

## 界面与输入

- 结算页显示当前疲劳、再次挑战消耗和剩余疲劳。
- 新增“再次挑战”按钮，使用 `data-rechallenge-dungeon="true"`。
- `R` 触发再次挑战；Enter/Space 继续保持返回城镇。
- 疲劳不足或状态非法时禁用再次挑战按钮，返回城镇始终可用。
- 根节点暴露 `data-rechallenge-available`、`data-result-fatigue-current`、`data-result-fatigue-cost` 和 `data-result-fatigue-after-retry`。

## 存档安全

挂载层沿用现有自动存档策略保存 `rechallengeDungeon` 产生的新状态。结果页本身仍不持久化；重启恢复城镇。再次挑战成功后重启将恢复已扣除的疲劳，但不会恢复运行中的战斗。

## 验收

1. Reducer 测试证明成功重开同副本同难度、准确扣疲劳、全新运行且奖励不重复。
2. Reducer/UI 测试证明疲劳不足不会离开结算页，按钮禁用且原因可见。
3. UI 测试证明疲劳、消耗、剩余值、按钮和 `R` 提示完整。
4. 真实浏览器从城镇进图、清完 Boss、穿过完成门、观察结算、按真实 `R`，进入新一轮房间 0，并验证 `localStorage` 已保存第二次疲劳扣除。
