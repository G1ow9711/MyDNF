# 地下城再次挑战实施计划

> **执行约束：** 用户禁止未经允许启动子智能体。本计划只在当前会话执行。

### Task 1: Reducer RED/GREEN

- [x] 先测试结果模式成功再战、准确扣疲劳、保持地下城/难度和创建全新运行。
- [x] 断言上一轮奖励、任务和背包不重复变化。
- [x] 先测试疲劳不足保持结果页和状态不变。
- [x] 实现 `rechallengeDungeon`，复用现有入场规则并运行聚焦测试。

### Task 2: Result UI RED/GREEN

- [x] 先断言疲劳、消耗、剩余值、可用状态、按钮和快捷键数据钩子。
- [x] 渲染再次挑战与返回城镇双操作区以及疲劳不足原因。
- [x] 添加紧凑响应式布局和禁用状态样式。
- [x] 运行 UI 聚焦测试确认 GREEN。

### Task 3: Mounted Input And Save

- [x] 点击再次挑战按钮走统一 reducer。
- [x] 结果模式真实 `R` 触发再次挑战，Enter/Space 语义不变。
- [x] 证明挂载自动存档包含第二次疲劳扣除。

### Task 4: True Browser Acceptance

- [x] 新增完整灰窑 Boss 通关后真实 `R` 再战场景。
- [x] 断言新运行房间 0、活怪、同难度、空历史和保存疲劳。
- [x] 运行聚焦真实浏览器路线。

### Task 5: Full Verification And Delivery

- [x] 运行全部非键盘测试、生产构建和差异检查。
- [x] 串行运行全部真实浏览器键盘场景。
- [x] 更新记录，中文提交并推送 `feature/vertical-slice`。
