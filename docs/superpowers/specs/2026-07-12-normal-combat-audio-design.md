# 普通战斗接触帧音效设计

日期：2026-07-12

## 目标

让普通攻击声音遵循 DNF 风格的“挥动声在输入时、打击声在接触时”规则。三段 X 连击必须逐段升高重量，Z 上挑、空中轻击和空中砸地必须有不同质感，不能继续使用通用 UI 点击回退音。

## 声音契约

- 输入层：`attack-swing-light`、`attack-swing-heavy`、`movement-jump`、`movement-backstep`。
- 命中层：`normal-hit-1`、`normal-hit-2`、`normal-hit-3`、`dash-hit`、`air-hit`、`heavy-launch`、`heavy-slam`。
- 三段 X 的实际播放顺序为 `swing / hit-1 / swing / hit-2 / swing / hit-3`。
- 命中音从新追加的 `CombatHitEvent` 派生。同一阶段命中多个目标只播放一次，不能随目标数量放大音量。
- 技能施放音和已完成的剑舞七段音效保持原行为。

## 验收

- 应用测试证明三段 X 在实际命中后依次生成三个不同打击音，而不是按键时生成 `hit-light`。
- 音频测试证明所有新增声音都有独立纹理标签和至少三层程序化声部，不走 `ui-click` 回退。
- 真实浏览器按三次 X，捕获六次实际 WebAudio 调度，顺序与人物 9/10/11 接触帧、怪物 12/13/14 受击帧的既有证据一致。
- 全量测试、构建、HTTP 页面检查通过。
