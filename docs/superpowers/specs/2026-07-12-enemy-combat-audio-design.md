# 怪物攻击与人物受击音效设计

日期：2026-07-12

## 目标

让怪物攻击具备 DNF 风格的听觉预警和命中反馈。玩家应能从声音区分轻型杂兵、重型冲撞和 Boss 招式，并在命中、闪避、护盾承伤时得到不同确认。

## 事件契约

- `enemy-attack/windup`：按敌人种类与技能重量播放 `enemy-windup-light/heavy/boss`。
- `enemy-attack/active`：播放 `enemy-impact-light/heavy/boss`。
- `enemy-attack/miss`：保留对应攻击爆发声，并追加 `evade-confirm`。
- `player-hit`：按反馈类型播放 `player-hurt-light/heavy/boss`；有效护盾承伤播放 `guard-impact`。
- 多段 Boss 招式按各自 `occurredAtMs` 逐段播放；同一时刻同一声音只播放一次。
- 不修改怪物攻击时间、伤害、无敌、护盾减伤、动作或特效。

## 验收

- 应用测试证明灰烬怪自然攻击依次产生蓄力、爆发、人物受击声音；移出攻击范围后产生爆发与闪避确认声音。
- 所有声音有独立程序化播放方案，不走 `ui-click` 回退。
- 真实浏览器等待自然怪物攻击，捕获 windup、impact、hurt 的实际 WebAudio 顺序，同时保留怪物模型动作、攻击 VFX、人物受击动作证据。
- 全量测试、构建和本地页面检查通过。
