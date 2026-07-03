# MyDNF Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable offline browser vertical slice for `烬璃纪元`, covering combat, Chinese-style town/dungeons, story quests, equipment builds, trade/auction, reinforcement, amplification, shop, costumes, gift packs, BGM/SFX hooks, and local save.

**Architecture:** Use a small TypeScript + Canvas app with data-driven game definitions. Keep gameplay state, economy systems, and rendering separated so combat and town systems can be tested without a browser canvas. First implementation uses polished code-generated art layers and project-local generated assets where available; final asset upgrades can replace the same interfaces.

**Tech Stack:** TypeScript, Vite, Vitest, HTML Canvas 2D, browser localStorage, Web Audio API, project-local npm cache under `.codex-local/cache/npm`.

---

## File Structure

- Create: `package.json` - scripts and dev dependencies.
- Create: `tsconfig.json` - TypeScript compiler config.
- Create: `vite.config.ts` - Vite + Vitest config.
- Create: `index.html` - app shell.
- Create: `src/main.ts` - app entry.
- Create: `src/styles.css` - layout and UI shell styles.
- Create: `src/data/catalog.ts` - Chinese display names, dungeons, skills, items, sets, shop packs, quests.
- Create: `src/game/types.ts` - shared state and data types.
- Create: `src/game/state.ts` - initial state, derived stats, progression helpers.
- Create: `src/game/combat.ts` - combat loop helpers, hitstop, skills, enemies, loot events.
- Create: `src/game/render.ts` - Canvas scene rendering, Chinese-style environment layers, character/VFX drawing.
- Create: `src/game/input.ts` - keyboard state and action mapping.
- Create: `src/systems/inventory.ts` - item actions, equip, compare, dismantle, sell.
- Create: `src/systems/upgrades.ts` - reinforcement, amplification, protection ticket logic.
- Create: `src/systems/market.ts` - NPC personal trade and auction simulation.
- Create: `src/systems/shop.ts` - shop purchases, gift packs, random boxes, pity history.
- Create: `src/systems/quests.ts` - quest progress, unlocks, rewards.
- Create: `src/systems/save.ts` - localStorage persistence.
- Create: `src/systems/audio.ts` - BGM/SFX manager and volume controls.
- Create: `src/ui/app.ts` - town/combat mode controller.
- Create: `src/ui/panels.ts` - inventory, smith, auction, shop, quest, settings panels.
- Create: `src/tests/*.test.ts` - focused Vitest coverage for core systems.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/ui/app.ts`
- Create: `src/styles.css`
- Test: `src/tests/smoke.test.ts`

- [ ] **Step 1: Create package scripts**

Write `package.json`:

```json
{
  "name": "mydnf",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Create compiler and test config**

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

Write `vite.config.ts`:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: "127.0.0.1", port: 5173 },
  test: { environment: "node", include: ["src/tests/**/*.test.ts"] }
});
```

- [ ] **Step 3: Create app shell**

Write `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>烬璃纪元</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Write `src/main.ts`:

```ts
import "./styles.css";
import { mountApp } from "./ui/app";

mountApp(document.querySelector<HTMLDivElement>("#app")!);
```

Write `src/ui/app.ts`:

```ts
export function mountApp(root: HTMLDivElement): void {
  root.innerHTML = `
    <main class="app-shell">
      <section class="game-frame">
        <h1>烬璃纪元</h1>
        <p>炉山市集正在加载。</p>
      </section>
    </main>
  `;
}
```

Write `src/styles.css`:

```css
:root {
  color: #f8fafc;
  background: #050816;
  font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 20%, rgba(249, 115, 22, 0.18), transparent 32%),
    linear-gradient(180deg, #111827, #020617);
}

.game-frame {
  width: min(1180px, calc(100vw - 32px));
  min-height: min(720px, calc(100vh - 32px));
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: rgba(15, 23, 42, 0.88);
  padding: 24px;
}
```

Write `src/tests/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("scaffold", () => {
  it("runs the test suite", () => {
    expect("烬璃纪元").toContain("烬璃");
  });
});
```

- [ ] **Step 4: Install dependencies with project-local cache**

Run:

```powershell
$env:npm_config_cache="F:\My_DNF\.codex-local\cache\npm"
npm install
```

Expected: `package-lock.json` and `node_modules/` created; no cache under user profile.

- [ ] **Step 5: Run scaffold checks**

Run:

```powershell
npm test
npm run build
```

Expected: smoke test passes and build succeeds.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.ts src/ui/app.ts src/styles.css src/tests/smoke.test.ts
git commit -m "搭建前端项目骨架"
```

## Task 2: Types and Data Catalog

**Files:**
- Create: `src/game/types.ts`
- Create: `src/data/catalog.ts`
- Test: `src/tests/catalog.test.ts`

- [ ] **Step 1: Write catalog tests**

Write `src/tests/catalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";

describe("catalog", () => {
  it("contains Chinese display names for core content", () => {
    expect(catalog.title).toBe("烬璃纪元");
    expect(catalog.hero.displayName).toBe("烬拳卫");
    expect(catalog.dungeons.map((d) => d.displayName)).toEqual(["灰窑巷", "琉璃熔炉"]);
  });

  it("contains at least 60 gear items and 5 epic sets", () => {
    expect(catalog.gear.length).toBeGreaterThanOrEqual(60);
    expect(catalog.epicSets).toHaveLength(5);
    for (const set of catalog.epicSets) {
      expect(set.bonuses.map((b) => b.pieces)).toEqual([2, 3, 5]);
    }
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
npm test -- src/tests/catalog.test.ts
```

Expected: fail because modules do not exist.

- [ ] **Step 3: Implement shared types**

Write `src/game/types.ts` with unions and interfaces for `Rarity`, `GearSlot`, `GearItem`, `EpicSet`, `SkillDef`, `DungeonDef`, `QuestDef`, `CurrencyState`, `PlayerState`, and `GameState`. Use Chinese display strings in data, English ids in code.

- [ ] **Step 4: Implement catalog**

Write `src/data/catalog.ts`:

```ts
import type { DungeonDef, EpicSet, GearItem, SkillDef } from "../game/types";

const slots = ["weapon", "core", "head", "body", "legs", "belt", "boots", "necklace", "bracelet", "ring", "sigil", "charm"] as const;

export const skills: SkillDef[] = [
  { id: "spark-jab", name: "星火连拳", key: "U", heatCost: 0, heatGain: 12, cooldownMs: 1800, tags: ["starter", "multi-hit"] },
  { id: "cinder-upper", name: "烬焰升龙", key: "I", heatCost: 0, heatGain: 8, cooldownMs: 2600, tags: ["launcher"] },
  { id: "furnace-step", name: "炉步冲肩", key: "O", heatCost: 15, heatGain: 0, cooldownMs: 3600, tags: ["dash", "trail"] },
  { id: "anvil-crash", name: "铁砧坠击", key: "L", heatCost: 25, heatGain: 0, cooldownMs: 5200, tags: ["slam", "down-hit"] },
  { id: "heat-bloom", name: "热浪绽放", key: "Space", heatCost: 35, heatGain: 0, cooldownMs: 8200, tags: ["pull", "burst"] },
  { id: "meteor-knuckle", name: "陨星重拳", key: "SpaceHold", heatCost: 70, heatGain: 0, cooldownMs: 16000, tags: ["ultimate", "boss-stagger"] }
];

export const epicSets: EpicSet[] = [
  { id: "ember-artisan", name: "烬火宗匠", tags: ["heat-burst"], bonuses: [{ pieces: 2, text: "普攻获得更多热能" }, { pieces: 3, text: "耗热技能附加烬爆" }, { pieces: 5, text: "陨星重拳产生二段冲击波" }] },
  { id: "liuli-flow", name: "流光琉璃", tags: ["skill-cycler"], bonuses: [{ pieces: 2, text: "技能冷却恢复提升" }, { pieces: 3, text: "高热能冲刺留下火痕" }, { pieces: 5, text: "连续三种技能后下一技能强化" }] },
  { id: "kiln-shadow", name: "窑影行者", tags: ["crit-juggle"], bonuses: [{ pieces: 2, text: "冲刺后暴击提升" }, { pieces: 3, text: "浮空和硬直目标伤害提升" }, { pieces: 5, text: "取消链提供短攻速增益" }] },
  { id: "mountain-guard", name: "镇山玄甲", tags: ["guard-breaker"], bonuses: [{ pieces: 2, text: "重击后获得减伤" }, { pieces: 3, text: "破防伤害提升" }, { pieces: 5, text: "每房间一次濒死护盾" }] },
  { id: "market-wind", name: "市风游商", tags: ["farmer-trader"], bonuses: [{ pieces: 2, text: "金币拾取和移速提升" }, { pieces: 3, text: "精英掉落额外材料" }, { pieces: 5, text: "首个 boss 奖励额外交易收益" }] }
];

export const gear: GearItem[] = Array.from({ length: 60 }, (_, index) => {
  const slot = slots[index % slots.length];
  const set = epicSets[index % epicSets.length];
  const rarity = index < 10 ? "rare" : index < 55 ? "epic" : "mythic";
  return {
    id: `gear-${index + 1}`,
    name: `${set.name}${index + 1}`,
    slot,
    level: 1 + Math.floor((index / 59) * 49),
    rarity,
    setId: rarity === "epic" || rarity === "mythic" ? set.id : undefined,
    attack: slot === "weapon" || slot === "core" ? 12 + index : 0,
    defense: slot !== "weapon" ? 4 + Math.floor(index / 2) : 0,
    affixes: set.tags
  };
});

export const dungeons: DungeonDef[] = [
  { id: "cinder-kiln-alley", displayName: "灰窑巷", minLevel: 1, rooms: 3, bossId: "kiln-warden" },
  { id: "liuli-furnace", displayName: "琉璃熔炉", minLevel: 20, rooms: 5, bossId: "liuli-overseer" }
];

export const catalog = {
  title: "烬璃纪元",
  hero: { id: "ember-warden", displayName: "烬拳卫" },
  skills,
  dungeons,
  epicSets,
  gear
};
```

- [ ] **Step 5: Run catalog tests**

Run:

```powershell
npm test -- src/tests/catalog.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add src/game/types.ts src/data/catalog.ts src/tests/catalog.test.ts
git commit -m "添加核心数据目录和装备套装"
```

## Task 3: State, Save, Inventory, and Loadouts

**Files:**
- Create: `src/game/state.ts`
- Create: `src/systems/save.ts`
- Create: `src/systems/inventory.ts`
- Test: `src/tests/state-inventory-save.test.ts`

- [ ] **Step 1: Write tests**

Write tests for initial currencies, starter gear equip, 3 loadouts, local save round-trip through injected storage object.

- [ ] **Step 2: Run failing tests**

Run:

```powershell
npm test -- src/tests/state-inventory-save.test.ts
```

Expected: fail because modules do not exist.

- [ ] **Step 3: Implement state and inventory**

Create `createInitialState()`, `equipItem(state, itemId)`, `saveLoadout(state, index)`, `applyLoadout(state, index)`, `sellItem(state, itemId)`, `dismantleItem(state, itemId)`.

Rules:
- Initial town is `炉山市集`.
- Initial dungeon unlock includes `灰窑巷`.
- State has `loadouts` length 3.
- Dismantle gear gives Iron Dust and sometimes Arc Shards by rarity.

- [ ] **Step 4: Implement save**

Create `saveGame(storage, state)` and `loadGame(storage)`.

Use key: `mydnf-save-v1`.

- [ ] **Step 5: Run tests**

Run:

```powershell
npm test -- src/tests/state-inventory-save.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add src/game/state.ts src/systems/save.ts src/systems/inventory.ts src/tests/state-inventory-save.test.ts
git commit -m "实现存档背包和配装方案"
```

## Task 4: Upgrade Systems

**Files:**
- Create: `src/systems/upgrades.ts`
- Test: `src/tests/upgrades.test.ts`

- [ ] **Step 1: Write tests**

Cover:
- Reinforcement consumes Gold and Iron Dust.
- `+1` to `+6` cannot drop level.
- Risky failure uses protection ticket when present.
- Amplification requires Echo Slot.
- Amplification cap is `+5`.

- [ ] **Step 2: Implement deterministic RNG injection**

Use function signature:

```ts
export function reinforce(state: GameState, gearId: string, rng: () => number): UpgradeResult
export function amplify(state: GameState, gearId: string, rng: () => number): UpgradeResult
```

- [ ] **Step 3: Implement rules**

Reinforcement:
- cap `+12`
- `+1` to `+6`: success if rng under table, failure no drop
- `+7` to `+10`: failure drops one level
- `+11` to `+12`: failure resets to `+10` unless protected

Amplification:
- cap `+5`
- needs Echo Slot
- adds one stat from crit, cooldown, element, move speed
- only two amplified equipped gear pieces count in derived stats

- [ ] **Step 4: Run tests**

Run:

```powershell
npm test -- src/tests/upgrades.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add src/systems/upgrades.ts src/tests/upgrades.test.ts
git commit -m "实现强化和增幅系统"
```

## Task 5: Market, Auction, Shop, Packs, and Boxes

**Files:**
- Create: `src/systems/market.ts`
- Create: `src/systems/shop.ts`
- Test: `src/tests/economy.test.ts`

- [ ] **Step 1: Write tests**

Cover:
- NPC trade rotates offers after dungeon return.
- Auction listing charges fee and can sell after simulated return.
- Shop purchase deducts Valor Tokens and adds pack contents.
- Random box shows rates through data and pity guarantees Mythic after 20 misses.

- [ ] **Step 2: Implement market**

Functions:
- `createTradeBoard(seed)`
- `acceptTrade(state, offerId)`
- `listAuction(state, itemId, price)`
- `resolveAuctions(state, rng)`

- [ ] **Step 3: Implement shop**

Functions:
- `buyShopItem(state, sku)`
- `openRandomBox(state, boxId, rng)`
- `getBoxRates(boxId)`

Rates must be explicit in data returned to UI.

- [ ] **Step 4: Run tests**

Run:

```powershell
npm test -- src/tests/economy.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add src/systems/market.ts src/systems/shop.ts src/tests/economy.test.ts
git commit -m "实现交易拍卖和商城礼包"
```

## Task 6: Story and Quest System

**Files:**
- Create: `src/systems/quests.ts`
- Test: `src/tests/quests.test.ts`

- [ ] **Step 1: Write tests**

Cover:
- Prologue starts active.
- Clearing `灰窑巷` advances chapter 1.
- Reinforcement tutorial unlocks smith flow.
- Clearing `琉璃熔炉` unlocks amplification, auction, and costume pavilion.
- Quest state persists through save.

- [ ] **Step 2: Implement quest engine**

Create:
- `applyQuestEvent(state, event)`
- `claimQuestReward(state, questId)`
- `getActiveQuestText(state)`
- `isSystemUnlocked(state, systemId)`

Quest events include `enemyDefeated`, `dungeonCleared`, `itemLooted`, `reinforced`, `amplified`, `auctionSold`, `shopPurchased`.

- [ ] **Step 3: Run tests**

Run:

```powershell
npm test -- src/tests/quests.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```powershell
git add src/systems/quests.ts src/tests/quests.test.ts
git commit -m "实现剧情任务和系统解锁"
```

## Task 7: Combat Model

**Files:**
- Create: `src/game/combat.ts`
- Create: `src/game/input.ts`
- Test: `src/tests/combat.test.ts`

- [ ] **Step 1: Write tests**

Cover:
- Light combo advances under 80 ms input-to-hit target.
- Skill cancel allowed during hit-confirm window.
- Hitstop differs between light, heavy, and skill.
- Boss armor hit has lower hitstop.
- Loot event fires on room clear.

- [ ] **Step 2: Implement combat types and update loop**

Functions:
- `createCombatRun(state, dungeonId)`
- `stepCombat(run, input, dtMs)`
- `performAction(run, action)`
- `applyHit(run, hitDef)`
- `finishRoom(run)`

Use deterministic arrays for enemies and boss phases from catalog.

- [ ] **Step 3: Run tests**

Run:

```powershell
npm test -- src/tests/combat.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```powershell
git add src/game/combat.ts src/game/input.ts src/tests/combat.test.ts
git commit -m "实现战斗模型和连招规则"
```

## Task 8: Canvas Rendering and Audio Hooks

**Files:**
- Create: `src/game/render.ts`
- Create: `src/systems/audio.ts`
- Test: `src/tests/render-audio.test.ts`

- [ ] **Step 1: Write tests**

Test pure helpers:
- `getScenePalette("炉山市集")`
- `getScenePalette("灰窑巷")`
- `getScenePalette("琉璃熔炉")`
- `chooseMusicLayer(mode, danger, bossPhase)`

- [ ] **Step 2: Implement renderer**

Renderer responsibilities:
- Draw 中国风 multi-layer backgrounds with parallax offsets.
- Draw detailed stylized `烬拳卫` with face/hair/coat/gauntlet shapes.
- Draw enemy silhouettes, hit sparks, Heat meter, cooldown icons, and loot bursts.
- Never shake UI layer.

- [ ] **Step 3: Implement audio manager**

Audio manager responsibilities:
- `setVolume(kind, value)`
- `playBgm(trackId)`
- `playSfx(sfxId)`
- `chooseMusicLayer(mode, danger, bossPhase)`

Use Web Audio oscillator/noise fallback first, with easy replacement by files under `assets/audio/`.

- [ ] **Step 4: Run tests**

Run:

```powershell
npm test -- src/tests/render-audio.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add src/game/render.ts src/systems/audio.ts src/tests/render-audio.test.ts
git commit -m "实现国风渲染和音频钩子"
```

## Task 9: UI Panels and App Controller

**Files:**
- Modify: `src/ui/app.ts`
- Create: `src/ui/panels.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`
- Test: `src/tests/ui-smoke.test.ts`

- [ ] **Step 1: Write smoke tests**

Test panel rendering functions return text containing:
- `炉山市集`
- `背包`
- `强化`
- `增幅`
- `拍卖`
- `商城`
- `任务`

- [ ] **Step 2: Implement app controller**

App modes:
- `town`
- `combat`
- `inventory`
- `smith`
- `auction`
- `shop`
- `quests`
- `settings`

Town view must be first screen, not a landing page.

- [ ] **Step 3: Implement panels**

Panel content:
- Inventory: tabs and item actions.
- Smith: reinforce/amplify selected item and show protection tickets.
- Auction: list item, show suggested price, demand, recent prices.
- Shop: costumes, packs, boxes, visible rates.
- Quests: active objective, claim rewards.
- Settings: volume controls, reset-save with confirmation.

- [ ] **Step 4: Run tests and build**

Run:

```powershell
npm test
npm run build
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add src/ui/app.ts src/ui/panels.ts src/main.ts src/styles.css src/tests/ui-smoke.test.ts
git commit -m "实现城镇界面和系统面板"
```

## Task 10: Playable Integration and Browser Verification

**Files:**
- Modify: `src/ui/app.ts`
- Modify: `src/game/render.ts`
- Modify: `src/systems/save.ts`
- Create: `docs/runbook.md`

- [ ] **Step 1: Wire complete loop**

Flow:
- Start in `炉山市集`.
- Click dungeon gate.
- Clear `灰窑巷`.
- Receive loot.
- Return town.
- Reinforce one item.
- Open shop and buy a pack.
- Save and reload.

- [ ] **Step 2: Add runbook**

Write `docs/runbook.md`:

```md
# 运行说明

## 安装
```powershell
$env:npm_config_cache="F:\My_DNF\.codex-local\cache\npm"
npm install
```

## 开发运行
```powershell
npm run dev
```

打开 Vite 输出的本地地址。

## 验证
```powershell
npm test
npm run build
```

## 存档
浏览器 localStorage key: `mydnf-save-v1`。
```

- [ ] **Step 3: Run full verification**

Run:

```powershell
npm test
npm run build
npm run dev
```

Expected: tests and build pass; dev server starts.

- [ ] **Step 4: Browser verify**

Use browser at local Vite URL:
- Confirm first screen is town.
- Confirm `烬拳卫` visible.
- Confirm `炉山市集`, `灰窑巷`, `琉璃熔炉` visible somewhere in playable flow.
- Confirm combat canvas nonblank.
- Confirm at least one enemy can be defeated.
- Confirm inventory and shop panels open.
- Confirm save survives reload.

- [ ] **Step 5: Commit**

```powershell
git add src docs/runbook.md
git commit -m "串联首个可玩循环"
```

## Plan Self-Review

Spec coverage:
- Combat: Tasks 7, 8, 10.
- Visuals: Tasks 8, 9, 10.
- Audio: Task 8.
- Story/quests: Task 6.
- Economy: Tasks 3, 5, 9.
- Equipment/builds: Tasks 2, 3, 4, 9.
- Save/runtime: Tasks 1, 3, 10.

Placeholder scan:
- No step uses banned vague planning terms.
- All commit messages are Chinese.
- No GitHub push step is included; push requires separate user approval per current workflow.

Execution recommendation:
- Use Subagent-Driven execution. Suggested ownership:
  - Agent A: data/catalog, state, inventory, upgrades.
  - Agent B: market, shop, quests.
  - Agent C: combat, rendering, audio.
  - Main agent: UI integration, verification, commits, browser checks.
