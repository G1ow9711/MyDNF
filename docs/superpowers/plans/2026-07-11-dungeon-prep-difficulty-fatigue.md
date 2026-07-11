# Dungeon Prep, Difficulty, and Fatigue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mounted dungeon preparation flow with three real combat difficulties and persisted fatigue.

**Architecture:** A focused dungeon-rules module owns difficulty definitions and entry validation. `CombatRun` carries the confirmed difficulty so enemy creation and loot scaling stay deterministic, while the app owns preparation-mode selection and keyboard/mouse interaction. Existing v1 saves migrate missing fatigue and preference fields without a version bump.

**Tech Stack:** TypeScript, Vitest, Vite, mounted Edge/Chrome CDP browser acceptance.

---

### Task 1: Difficulty Rules, Player State, and Save Migration

**Files:**
- Create: `src/systems/dungeons.ts`
- Modify: `src/game/types.ts`
- Modify: `src/game/state.ts`
- Modify: `src/systems/save.ts`
- Create: `src/tests/dungeons.test.ts`
- Modify: `src/tests/state-inventory-save.test.ts`

- [ ] **Step 1: Write failing domain and migration tests**

Cover normal/adventure/warrior rule lookup, `64/64` new-save fatigue, exact fatigue deduction, preference persistence, locked/under-level/insufficient-fatigue rejection, missing-field migration, and malformed-field rejection.

- [ ] **Step 2: Run RED tests**

Run: `npm test -- --run src/tests/dungeons.test.ts src/tests/state-inventory-save.test.ts --maxWorkers=1 --minWorkers=1`

Expected: failure because `DungeonDifficultyId`, fatigue state, and dungeon entry rules do not exist.

- [ ] **Step 3: Implement types and rules**

Define:

```ts
export type DungeonDifficultyId = "normal" | "adventure" | "warrior";

export interface PlayerFatigue {
  current: number;
  max: number;
}
```

Create immutable rules with `{ id, displayName, enemyHpMultiplier, enemyDamageMultiplier, rewardMultiplier, fatigueCost }`, plus `getDungeonDifficulty()`, `canEnterDungeon()`, and `consumeDungeonEntry()` that validates catalog unlock/level/fatigue and returns an immutable state update.

- [ ] **Step 4: Implement migration-safe validation**

Missing `player.fatigue` becomes `{ current: 64, max: 64 }`; missing preferences become `{}` and therefore resolve to normal. Present fields must contain finite integers, `0 <= current <= max`, known dungeon ids, and known difficulty ids.

- [ ] **Step 5: Run GREEN tests**

Run the Step 2 command. Expected: all selected tests pass.

### Task 2: Combat Difficulty Scaling

**Files:**
- Modify: `src/game/combat.ts`
- Modify: `src/tests/combat.test.ts`

- [ ] **Step 1: Write failing combat scaling tests**

Create otherwise identical normal/adventure runs and assert adventure trash HP is `round(normal * 1.35)`, a fixed monster impact deals `round(normal * 1.20)` before existing defense handling, room loot is `round(normal * 1.35)`, and the next room plus Taotie summons retain `difficultyId="adventure"` scaling.

- [ ] **Step 2: Run RED test selection**

Run: `npm test -- --run src/tests/combat.test.ts --testNamePattern="difficulty" --maxWorkers=1 --minWorkers=1`

Expected: failure because `createCombatRun` has no difficulty and enemy/reward creation is unscaled.

- [ ] **Step 3: Carry and apply difficulty**

Change `createCombatRun(state, dungeonId, difficultyId = "normal")`. Store `difficultyId` on `CombatRun`; pass it into every room enemy and summon creation; round scaled HP/maxHP, monster profile damage, and loot numeric rewards exactly once. Leave timing, armor, actions, VFX, item identity, and consumable quantities unchanged.

- [ ] **Step 4: Run GREEN combat tests**

Run the Step 2 command, then the full `src/tests/combat.test.ts`. Expected: all pass.

### Task 3: Dungeon Preparation UI and Controller

**Files:**
- Modify: `src/ui/app.ts`
- Modify: `src/styles.css`
- Modify: `src/tests/app-integration.test.ts`
- Modify: `src/tests/ui-smoke.test.ts`

- [ ] **Step 1: Write failing reducer and rendering tests**

Assert a town click action opens `dungeon-prep` without a combat run, difficulty selection cycles, confirmation deducts fatigue and creates a scaled run, Escape returns to town, insufficient fatigue cannot enter, and HTML exposes `data-dungeon-prep`, `data-dungeon-difficulty`, `data-fatigue-current`, `data-difficulty-selected`, and `data-combat-difficulty`.

- [ ] **Step 2: Run RED UI tests**

Run: `npm test -- --run src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts --testNamePattern="dungeon prep|difficulty|fatigue" --maxWorkers=1 --minWorkers=1`

Expected: failure because preparation mode and controls do not exist.

- [ ] **Step 3: Implement mounted preparation flow**

Add `dungeon-prep` to `AppMode`; add selected dungeon/difficulty to the view model; add `openDungeonPrep`, `selectDungeonDifficulty`, and difficulty-bearing `enterDungeon` actions. Render dungeon details, segmented difficulty buttons, fatigue/cost, reward multipliers, start and back controls. Use the domain rule for both disabled state and reducer validation.

- [ ] **Step 4: Implement keyboard flow**

In non-combat key handling, when mode is `dungeon-prep`, ArrowLeft/ArrowRight cycles the three ids, Enter dispatches entry only when valid, and Escape returns to town. Preserve all existing town-focus and combat key paths.

- [ ] **Step 5: Run GREEN UI tests and build**

Run the Step 2 command, then `npm run build`. Expected: selected tests and TypeScript build pass.

### Task 4: Mounted Browser Acceptance and Final Regression

**Files:**
- Modify: `src/tests/browser-keyboard-control.test.ts`
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

- [ ] **Step 1: Update the shared keyboard entry helper**

The helper must focus `[data-prepare-dungeon]`, press Enter/Space, wait for `data-app-mode="dungeon-prep"`, then press Enter on the start action and wait for combat. This keeps all existing scenarios on the default normal difficulty.

- [ ] **Step 2: Add a real difficulty/fatigue scenario**

Use a real mouse click to open Cinder prep, real ArrowRight to choose adventure, real Enter to start, then assert fatigue `64 -> 56`, combat difficulty `adventure`, first trash max HP `108`, and local save persistence after reload. Add a low-fatigue state proving Enter leaves the app in prep mode with no combat run.

- [ ] **Step 3: Run focused browser acceptance**

Run: `npm test -- --run src/tests/browser-keyboard-control.test.ts --testNamePattern="selects dungeon difficulty" --maxWorkers=1 --minWorkers=1 --reporter=basic`

Expected: one passing browser scenario.

- [ ] **Step 4: Run final verification**

Run core regression, `npm run build`, `git diff --check`, then the full serial mounted browser suite. Record exact totals and duration in project planning files.

- [ ] **Step 5: Commit and push**

Stage only this feature's files, commit with the Chinese message `新增地下城难度与疲劳准备流程`, push `feature/vertical-slice`, and verify local/remote divergence is `0 0`.
