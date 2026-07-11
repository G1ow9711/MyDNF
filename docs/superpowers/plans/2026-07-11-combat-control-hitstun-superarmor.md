# DNF Combat Control, Hitstun, and Super Armor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development and execute inline in the current session. Do not start a subagent without fresh user permission.

**Goal:** Add a true `ArrowDown` + `KeyC` backstep command, smooth model-following backstep, trash-enemy hitstun, and armored elite/Boss super armor with post-break interruption.

**Architecture:** Keep the mounted command buffer as the input source and add one pure backstep-sequence predicate. Centralize enemy reaction calculation in `combat.ts`, then call it from both direct and scheduled hit resolution. Drive UI motion and CSS from authoritative combat timers rather than recent-hit decoration alone.

**Tech Stack:** TypeScript, Vitest, Vite, mounted DOM rendering, Edge/Chrome CDP real-browser harness, CSS keyframes.

---

### Task 1: Command input and smooth backstep

**Files:**
- Modify: `src/ui/app.ts`
- Modify: `src/game/combat.ts`
- Test: `src/tests/app-integration.test.ts`
- Test: `src/tests/combat.test.ts`
- Test: `src/tests/browser-keyboard-control.test.ts`

- [x] Add a failing unit test asserting `isBackstepCommandSequence(["ArrowDown", "KeyC"])` is true, unrelated or reversed sequences are false, and standalone `combatActionForKeyCode(..., "KeyC")` remains jump.
- [x] Run `npm test -- src/tests/app-integration.test.ts -t "backstep command" --maxWorkers=1 --minWorkers=1` and confirm failure because the predicate/export is absent.
- [x] Export the pure tail matcher, push `KeyC` through the mounted command buffer, dispatch `combatAction: backstep` before normal `KeyC` routing, then clear the buffer.
- [x] Extend the existing combat test so initial backstep position is unchanged, `activeSkillMovement.skillId` equals `backstep`, a mid-frame step lies between endpoints, and an end-frame step reaches the 74 px endpoint.
- [x] Run the focused app/combat tests and confirm they pass.

### Task 2: Shared enemy reaction state machine

**Files:**
- Modify: `src/game/combat.ts`
- Test: `src/tests/combat.test.ts`

- [x] Add a failing test that starts a trash attack windup, applies an ordinary hit, and expects `hitstunUntilMs` beyond impact plus cleared attack state.
- [x] Add a failing test that ordinary juggle/knockdown against an armored elite/Boss reduces armor but preserves attack state and leaves airborne/downed false.
- [x] Add a failing test that a `guard-break` hit or a hit during `armorBrokenUntilMs` interrupts the same enemy and permits juggle/knockdown.
- [x] Add `hitstunUntilMs` to `CombatEnemy`, hitstop timer shifting, attack-start gating, and recovery cleanup.
- [x] Implement one internal reaction resolver using pre-hit armor state; call it from direct and scheduled hit paths so HP/armor, control, hitstun, air/down, timer delay, and attack cancellation remain identical.
- [x] Run `npm test -- src/tests/combat.test.ts --maxWorkers=1 --minWorkers=1` and confirm all combat tests pass.

### Task 3: Actor state and animation

**Files:**
- Modify: `src/ui/app.ts`
- Modify: `src/styles.css`
- Test: `src/tests/ui-smoke.test.ts`
- Test: `src/tests/app-integration.test.ts`

- [x] Add failing render assertions for `data-enemy-hitstun-active`, `data-enemy-super-armor`, `data-armor-state="super-armor"`, and `data-enemy-motion="hitstun"`.
- [x] Derive hitstun and super-armor flags from combat time and enemy state. Keep airborne/downed/control motion priority above hitstun, and keep attack motion visible while super armor absorbs a hit.
- [x] Add `monster-hitstun-react` and super-armor outline/pulse CSS selectors plus a dedicated backstep body/weapon animation tied to `data-player-skill-move="backstep"`.
- [x] Run UI and app integration tests and confirm resolved markup/CSS behavior passes.

### Task 4: Real keyboard and regression acceptance

**Files:**
- Modify: `src/tests/browser-keyboard-control.test.ts`
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

- [x] Add a mounted CDP test that enters combat, sends `ArrowDown` then `KeyC`, samples start/mid/end x positions, and proves reverse model-following movement with active evade/invulnerability.
- [x] In the same mounted route, use real attack keys to prove a trash enemy enters hitstun and an armored elite/Boss exposes super armor until broken.
- [x] Run focused browser acceptance with one worker, then run the core regression, `npm run build`, `git diff --check`, and the full serial browser suite.
- [x] Record exact evidence in planning files, stage all intended files, commit with a Chinese message, push `feature/vertical-slice`, and verify zero divergence plus a clean worktree.
