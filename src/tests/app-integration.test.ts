import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { performAction, stepCombat, type CombatEnemy, type CombatEnemySummonEvent, type CombatHitEvent, type CombatPlayerHitEvent, type CombatRun } from "../game/combat";
import { createInitialState } from "../game/state";
import type { GameState } from "../game/types";
import { advanceClass, selectBaseClass } from "../systems/classes";
import { saveGame, SAVE_KEY, type SaveStorage } from "../systems/save";
import {
  combatActionForCommandSequence,
  combatActionForKeyCode,
  createAppModel,
  mountApp,
  reduceAppAction,
  renderAppHtml
} from "../ui/app";

class MemoryStorage implements SaveStorage {
  readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

function withQuestReady(state: GameState, questId: string): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      quests: {
        ...state.player.quests,
        [questId]: "ready"
      }
    }
  };
}

function withCurrency(state: GameState, patch: Partial<GameState["player"]["currencies"]>): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      currencies: {
        ...state.player.currencies,
        ...patch
      }
    }
  };
}

function withHeat(state: GameState, heat: number): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      heat,
      classResources: {
        ...state.player.classResources,
        [state.player.classId]: heat
      }
    }
  };
}

function withClassResource(state: GameState, classId: GameState["player"]["classId"], value: number): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      heat: state.player.classId === classId ? value : state.player.heat,
      classResources: {
        ...state.player.classResources,
        [classId]: value
      }
    }
  };
}

function countOccurrences(text: string, pattern: string): number {
  return text.split(pattern).length - 1;
}

function countSkillImpactBursts(text: string, cue: string): number {
  return text.match(new RegExp(`class="skill-impact-burst [^"]*"[^>]*data-vfx-cue="${cue}"`, "g"))?.length ?? 0;
}

function playerSkillVfxStyleFor(html: string, skillId: string): string {
  const match = html.match(new RegExp(`<div class="player-skill-vfx skill-vfx-${skillId}[^"]*"[^>]*style="([^"]*)"`));

  return match?.[1] ?? "";
}

function mountedPlayerActorX(html: string): number {
  const playerStyle = html.match(/<div class="combat-actor combat-player"[^>]*style="([^"]*)"/)?.[1] ?? "";
  const actorX = playerStyle.match(/--actor-x: ([0-9.]+)%/)?.[1];

  if (!actorX) {
    throw new Error("Expected mounted combat player actor x style");
  }

  return Number(actorX);
}

function skillHitEvents(run: CombatRun, skillId: string): CombatHitEvent[] {
  return run.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.skillId === skillId);
}

function scheduledSkillTimes(run: CombatRun, skillId: string): number[] {
  const times = run.scheduledEnemyHitEffects
    .filter((effect) => effect.skillId === skillId)
    .map((effect) => effect.applyAtMs)
    .sort((left, right) => left - right);

  if (times.length === 0) {
    throw new Error(`Expected scheduled effects for ${skillId}`);
  }

  return [...new Set(times)];
}

function scheduledGroundLightTimes(run: CombatRun): number[] {
  const times = run.scheduledEnemyHitEffects
    .filter((effect) => effect.action === "light" && !effect.skillId && effect.id.startsWith("ground-light-"))
    .map((effect) => effect.applyAtMs)
    .sort((left, right) => left - right);

  if (times.length === 0) {
    throw new Error("Expected scheduled ground-light effect");
  }

  return [...new Set(times)];
}

function scheduledGroundHeavyTimes(run: CombatRun): number[] {
  const times = run.scheduledEnemyHitEffects
    .filter((effect) => effect.action === "heavy" && !effect.skillId && effect.id.startsWith("ground-heavy-"))
    .map((effect) => effect.applyAtMs)
    .sort((left, right) => left - right);

  if (times.length === 0) {
    throw new Error("Expected scheduled ground-heavy effect");
  }

  return [...new Set(times)];
}

function stepToElapsed(run: CombatRun, elapsedMs: number): CombatRun {
  return stepCombat(run, {}, Math.max(0, elapsedMs - run.elapsedMs));
}

function resolveGroundLight(run: CombatRun): CombatRun {
  const [hitAtMs] = scheduledGroundLightTimes(run);

  return stepToElapsed(run, hitAtMs);
}

function resolveGroundHeavy(run: CombatRun): CombatRun {
  const [hitAtMs] = scheduledGroundHeavyTimes(run);

  return stepToElapsed(run, hitAtMs);
}

function firstHitEvent(model: { combatRun?: { events: Array<unknown> } }): CombatHitEvent {
  const hit = model.combatRun?.events.find((event): event is CombatHitEvent => {
    return typeof event === "object" && event !== null && "kind" in event && event.kind === "hit";
  });

  if (!hit) {
    throw new Error("Expected combat hit event");
  }

  return hit;
}

function readyForAdvancement(state: GameState): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      level: 15,
      quests: {
        ...state.player.quests,
        "prologue-ember-warden": "completed"
      }
    }
  };
}

function placeAliveEnemiesInFront(model: ReturnType<typeof createAppModel>): ReturnType<typeof createAppModel> {
  if (!model.combatRun) {
    throw new Error("Expected active combat run");
  }

  const player = {
    ...model.combatRun.player,
    x: 260,
    y: 340,
    facing: 1 as const,
    actionLockUntilMs: 0,
    hurtLockUntilMs: 0
  };
  let aliveIndex = 0;

  return {
    ...model,
    combatRun: {
      ...model.combatRun,
      player,
      enemies: model.combatRun.enemies.map((enemy) => {
        if (enemy.hp <= 0) {
          return enemy;
        }

        const nextIndex = aliveIndex;
        aliveIndex += 1;

        return {
          ...enemy,
          position: {
            x: player.x + 76 + nextIndex * 58,
            y: player.y + nextIndex * 8
          },
          nextAttackAtMs: 9999,
          attackStartedAtMs: undefined,
          attackImpactAtMs: undefined,
          attackRecoverUntilMs: undefined,
          attackSkillId: undefined,
          attackHitResolved: undefined
        };
      })
    }
  };
}

function leaveSingleWeakEnemyInFront(model: ReturnType<typeof createAppModel>): ReturnType<typeof createAppModel> {
  const placed = placeAliveEnemiesInFront(model);

  if (!placed.combatRun) {
    throw new Error("Expected active combat run");
  }

  return {
    ...placed,
    combatRun: {
      ...placed.combatRun,
      enemies: placed.combatRun.enemies.map((enemy, index) => ({
        ...enemy,
        hp: index === 0 ? 1 : 0,
        armor: 0,
        nextAttackAtMs: 9999,
        attackStartedAtMs: undefined,
        attackImpactAtMs: undefined,
        attackRecoverUntilMs: undefined,
        attackSkillId: undefined,
        attackHitResolved: undefined
      }))
    }
  };
}

function defeatCurrentRoom(model: ReturnType<typeof createAppModel>): ReturnType<typeof createAppModel> {
  let next = model;

  for (let attempt = 0; attempt < 40 && next.combatRun?.enemies.some((enemy) => enemy.hp > 0); attempt += 1) {
    next = placeAliveEnemiesInFront(next);
    next = reduceAppAction(next, { type: "combatAction", action: "heavy" });

    if (next.combatRun) {
      const hitRun = resolveGroundHeavy(next.combatRun);
      const hasAliveEnemies = hitRun.enemies.some((enemy) => enemy.hp > 0);
      next = {
        ...next,
        combatRun: hasAliveEnemies ? stepToElapsed(hitRun, hitRun.player.actionLockUntilMs) : hitRun
      };
    }
  }

  expect(next.combatRun?.enemies.some((enemy) => enemy.hp > 0)).toBe(false);

  return next;
}

function walkThroughOpenGate(model: ReturnType<typeof createAppModel>): ReturnType<typeof createAppModel> {
  let next = model;

  for (
    let attempt = 0;
    attempt < 20 &&
    next.mode === "combat" &&
    next.combatRun?.enemies.every((enemy) => enemy.hp <= 0);
    attempt += 1
  ) {
    next = reduceAppAction(next, { type: "combatMove", moveX: 1, moveY: 0, dash: true });
  }

  return next;
}

function settleClearedRoom(model: ReturnType<typeof createAppModel>): ReturnType<typeof createAppModel> {
  return walkThroughOpenGate(defeatCurrentRoom(model));
}

function readyFirstEnemyAttack(model: ReturnType<typeof createAppModel>): ReturnType<typeof createAppModel> {
  if (!model.combatRun) {
    throw new Error("Expected active combat run");
  }

  return {
    ...model,
    combatRun: {
      ...model.combatRun,
      enemies: model.combatRun.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              position: {
                x: model.combatRun?.player.x ?? enemy.position.x,
                y: model.combatRun?.player.y ?? enemy.position.y
              },
              nextAttackAtMs: 1
            }
          : enemy
      )
    }
  };
}

describe("playable app integration actions", () => {
  it("reinforces selected gear through the app reducer", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({ storage, rng: () => 0 });
    const gearId = model.state.player.inventory[0].instanceId;
    const reinforced = reduceAppAction(model, { type: "reinforce", gearId });
    const updated = reinforced.state.player.inventory.find((item) => item.instanceId === gearId);

    expect(updated?.reinforceLevel).toBe(1);
    expect(reinforced.message).toContain("强化");
    expect(reinforced.state.player.currencies.gold).toBeLessThan(model.state.player.currencies.gold);
    expect(reinforced.audio.commandQueue.at(-1)).toEqual({ type: "sfx", id: "reinforce-success" });
  });

  it("updates the active reinforcement quest through the app reducer", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      rng: () => 0,
      initialState: withQuestReady(createInitialState(), "prologue-ember-warden")
    });
    const gearId = model.state.player.inventory[0].instanceId;

    model = reduceAppAction(model, { type: "claimQuest", questId: "prologue-ember-warden" });
    model = reduceAppAction(model, { type: "reinforce", gearId });

    expect(model.state.player.quests["smith-first-spark"]).toBe("ready");
  });

  it("claims a ready quest and unlocks the next dungeon and quests", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({
      storage,
      initialState: withQuestReady(createInitialState(), "prologue-ember-warden")
    });
    const claimed = reduceAppAction(model, { type: "claimQuest", questId: "prologue-ember-warden" });

    expect(claimed.state.player.quests["prologue-ember-warden"]).toBe("completed");
    expect(claimed.state.player.quests["smith-first-spark"]).toBe("active");
    expect(claimed.state.player.unlockedDungeons).toContain("liuli-furnace");
  });

  it("selects a base class and applies advancement through app actions", () => {
    const storage = new MemoryStorage();
    let model = createAppModel({ storage });

    model = reduceAppAction(model, { type: "selectBaseClass", classId: "liuli-blademage" });
    expect(model.state.player.classId).toBe("liuli-blademage");
    expect(model.state.player.heroId).toBe("liuli-blademage");
    expect(model.message).toContain("职业");

    model = {
      ...model,
      state: readyForAdvancement(model.state)
    };
    model = reduceAppAction(model, { type: "advanceClass", advancementId: "flowing-light-swordmaster" });

    expect(model.state.player.advancementId).toBe("flowing-light-swordmaster");
    expect(model.message).toContain("转职");

    const saved = reduceAppAction(model, { type: "save" });
    const loaded = reduceAppAction({ ...saved, state: createInitialState(), message: undefined }, { type: "load" });

    expect(loaded.state.player.classId).toBe("liuli-blademage");
    expect(loaded.state.player.advancementId).toBe("flowing-light-swordmaster");
  });

  it("grants room loot and marks the dungeon-clear quest ready after a full clear", () => {
    let model = createAppModel({ storage: new MemoryStorage() });
    const goldBefore = model.state.player.currencies.gold;
    const ironDustBefore = model.state.player.currencies.ironDust;

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    expect(model.audio.currentBgm).toBe("dungeon-cinder-kiln");
    model = settleClearedRoom(model);
    model = settleClearedRoom(model);
    model = settleClearedRoom(model);

    expect(model.mode).toBe("town");
    expect(model.combatRun).toBeUndefined();
    expect(model.state.player.currencies.gold).toBeGreaterThan(goldBefore);
    expect(model.state.player.currencies.ironDust).toBeGreaterThan(ironDustBefore);
    expect(model.state.player.inventory.length).toBeGreaterThan(createInitialState().player.inventory.length);
    expect(model.state.player.quests["prologue-ember-warden"]).toBe("ready");
    expect(model.message).toContain("通关");
    expect(model.audio.currentBgm).toBe("town-forge-market");
    expect(model.audio.commandQueue).toEqual(expect.arrayContaining([{ type: "sfx", id: "loot-drop" }]));
  });

  it("awards room experience so advancement can be reached through normal dungeon play", () => {
    const baseState = withQuestReady(createInitialState(), "prologue-ember-warden");
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: {
        ...baseState,
        player: {
          ...baseState.player,
          level: 14,
          experience: 90
        }
      }
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = settleClearedRoom(model);

    expect(model.state.player.level).toBeGreaterThanOrEqual(15);
    expect(model.state.player.experience).toBeLessThan(100);

    const advanced = reduceAppAction(model, { type: "advanceClass", advancementId: "ember-furnace-master" });

    expect(advanced.state.player.advancementId).toBe("ember-furnace-master");
  });

  it("requires defeating all monsters before room settlement", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    const refused = reduceAppAction(model, { type: "combatAction", action: "finish" });

    expect(refused.mode).toBe("combat");
    expect(refused.combatRun?.enemies.some((enemy) => enemy.hp > 0)).toBe(true);
    expect(refused.message).toContain("击败所有怪物");
  });

  it("opens a visible room gate and enters the next room by walking into it", () => {
    let model = createAppModel({ storage: new MemoryStorage() });
    const goldBefore = model.state.player.currencies.gold;

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = defeatCurrentRoom(model);

    const clearedHtml = renderAppHtml(model);

    expect(clearedHtml).toContain('data-dungeon-id="cinder-kiln-alley"');
    expect(clearedHtml).toContain('data-room-index="0"');
    expect(clearedHtml).toContain('data-room-count="3"');
    expect(clearedHtml).toContain('data-live-enemy-count="0"');
    expect(clearedHtml).toContain('data-defeated-enemy-count="2"');
    expect(clearedHtml).toContain('data-room-gate-state="open"');
    expect(clearedHtml).toContain('data-room-gate-vfx="open-rift"');
    expect(clearedHtml).toContain('data-room-gate-transition="ready"');
    expect(clearedHtml).toContain('class="room-gate-rift"');
    expect(clearedHtml).toContain('class="room-gate-threshold"');
    expect(clearedHtml).toContain('data-room-gate-target-room="1"');
    expect(clearedHtml).toContain('data-gate-enter-ready="false"');
    expect(clearedHtml).not.toContain("settle-button");

    for (let attempt = 0; attempt < 20 && !renderAppHtml(model).includes('data-room-gate-transition="entering"'); attempt += 1) {
      model = reduceAppAction(model, { type: "combatMove", moveX: 1, moveY: 0, dash: true });
    }

    expect(model.combatRun?.roomIndex).toBe(0);
    expect(model.state.player.currencies.gold).toBe(goldBefore);
    const enteringHtml = renderAppHtml(model);

    expect(enteringHtml).toContain('data-room-gate-transition="entering"');
    expect(enteringHtml).toContain('data-room-gate-vfx="enter-rift"');
    expect(enteringHtml).toContain('data-room-transition-state="entering"');
    expect(enteringHtml).toContain('data-room-transition-from-room="0"');
    expect(enteringHtml).toContain('data-room-transition-target-room="1"');
    expect(enteringHtml).toContain('data-room-transition-gate-state="open"');
    expect(enteringHtml).toContain('data-player-room-transition="entering"');

    for (let tick = 0; tick < 12 && model.combatRun?.roomIndex === 0; tick += 1) {
      model = reduceAppAction(model, { type: "combatTick" });
    }

    expect(model.combatRun?.roomIndex).toBe(1);
    expect(model.combatRun?.player.x).toBeLessThan(220);
    expect(model.state.player.currencies.gold).toBeGreaterThan(goldBefore);
    expect(model.message).toContain("进入下一房间");
    const nextRoomHtml = renderAppHtml(model);

    expect(nextRoomHtml).toContain('data-room-gate-state="locked"');
    expect(nextRoomHtml).toContain('data-room-index="1"');
    expect(nextRoomHtml).toContain('data-live-enemy-count="3"');
    expect(nextRoomHtml).toContain('data-defeated-enemy-count="0"');
    expect(nextRoomHtml).toContain('data-gate-enter-ready="false"');
    expect(nextRoomHtml).not.toContain('data-room-gate-vfx="open-rift"');
  });

  it("walks from elite room into boss room, clears the boss, and returns to town through the completion gate", () => {
    let model = createAppModel({ storage: new MemoryStorage() });
    const goldBefore = model.state.player.currencies.gold;
    const inventoryBefore = model.state.player.inventory.length;

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = settleClearedRoom(model);
    expect(model.combatRun?.roomIndex).toBe(1);

    model = defeatCurrentRoom(model);
    const eliteClearedHtml = renderAppHtml(model);

    expect(eliteClearedHtml).toContain('data-room-index="1"');
    expect(eliteClearedHtml).toContain('data-combat-objective="cleared"');
    expect(eliteClearedHtml).toContain('data-room-gate-state="boss"');
    expect(eliteClearedHtml).toContain('data-room-gate-vfx="boss-rift"');
    expect(eliteClearedHtml).toContain('data-room-gate-target-room="2"');

    for (let attempt = 0; attempt < 20 && !renderAppHtml(model).includes('data-room-gate-transition="entering"'); attempt += 1) {
      model = reduceAppAction(model, { type: "combatMove", moveX: 1, moveY: 0, dash: true });
    }
    const enteringBossHtml = renderAppHtml(model);

    expect(model.combatRun?.roomIndex).toBe(1);
    expect(enteringBossHtml).toContain('data-room-gate-transition="entering"');
    expect(enteringBossHtml).toContain('data-room-transition-state="entering"');
    expect(enteringBossHtml).toContain('data-room-transition-from-room="1"');
    expect(enteringBossHtml).toContain('data-room-transition-target-room="2"');
    expect(enteringBossHtml).toContain('data-room-transition-gate-state="boss"');

    for (let tick = 0; tick < 12 && model.combatRun?.roomIndex === 1; tick += 1) {
      model = reduceAppAction(model, { type: "combatTick" });
    }

    expect(model.combatRun?.roomIndex).toBe(2);
    const bossRoomHtml = renderAppHtml(model);

    expect(bossRoomHtml).toContain('data-room-index="2"');
    expect(bossRoomHtml).toContain('data-live-enemy-count="1"');
    expect(bossRoomHtml).toContain('data-enemy-kind="boss"');

    model = defeatCurrentRoom(model);
    const bossClearedHtml = renderAppHtml(model);

    expect(bossClearedHtml).toContain('data-combat-objective="cleared"');
    expect(bossClearedHtml).toContain('data-room-gate-state="complete"');
    expect(bossClearedHtml).toContain('data-room-gate-vfx="exit-rift"');
    expect(bossClearedHtml).toContain('data-room-gate-target-room=""');

    model = walkThroughOpenGate(model);

    expect(model.mode).toBe("town");
    expect(model.combatRun).toBeUndefined();
    expect(model.state.player.currencies.gold).toBeGreaterThan(goldBefore);
    expect(model.state.player.inventory.length).toBeGreaterThan(inventoryBefore);
    expect(model.state.player.quests["prologue-ember-warden"]).toBe("ready");
    expect(model.message).toContain("通关");

    const townHtml = renderAppHtml(model);

    expect(townHtml).toContain('data-app-mode="town"');
    expect(townHtml).toContain('data-town-scene="true"');
  });

  it("uses held combat tick movement to enter an open room gate", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = defeatCurrentRoom(model);

    expect(renderAppHtml(model)).toContain('data-room-gate-transition="ready"');

    for (let attempt = 0; attempt < 30 && !renderAppHtml(model).includes('data-room-gate-transition="entering"'); attempt += 1) {
      model = reduceAppAction(model, { type: "combatTick", moveX: 1, moveY: 0, dash: true });
    }

    expect(model.combatRun?.roomIndex).toBe(0);
    expect(renderAppHtml(model)).toContain('data-room-gate-transition="entering"');
    expect(renderAppHtml(model)).toContain('data-room-transition-state="entering"');
  });

  it("keeps final-hit hitstop, buffered input, and held movement gate entry in one keyboard flow", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = leaveSingleWeakEnemyInFront(model);
    const heavy = reduceAppAction(model, { type: "combatAction", action: "heavy" });
    const heavyHtml = renderAppHtml(heavy);

    expect(heavyHtml).toContain('data-player-motion="heavy"');
    expect(heavyHtml).toContain('data-player-normal-attack-move="ground-heavy"');
    expect(heavyHtml).toContain('class="combat-player-art actor-model actor-model-heavy"');

    if (!heavy.combatRun) {
      throw new Error("Expected active combat run");
    }

    const [heavyHitAtMs] = scheduledGroundHeavyTimes(heavy.combatRun);
    model = {
      ...heavy,
      combatRun: stepToElapsed(heavy.combatRun, heavyHitAtMs - 5)
    };
    model = reduceAppAction(model, { type: "combatAction", action: "light" });
    let html = renderAppHtml(model);

    expect(html).toContain('data-action-buffer-state="queued"');
    expect(html).toContain('data-buffered-action="light"');

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    model = {
      ...model,
      combatRun: stepToElapsed(model.combatRun, heavyHitAtMs)
    };
    html = renderAppHtml(model);

    expect(model.combatRun?.enemies.every((enemy) => enemy.hp <= 0)).toBe(true);
    expect(firstHitEvent(model).action).toBe("heavy");
    expect(html).toContain('data-hitstop-active="true"');
    expect(html).toContain('data-screen-shake="heavy"');
    expect(html).toContain('data-impact-spark="true"');
    expect(html).toContain('data-vfx-cue="ground-heavy-impact"');
    expect(html).toContain('data-room-gate-state="open"');
    expect(html).toContain('data-room-gate-transition="ready"');
    expect(html).toContain('data-action-buffer-state="queued"');
    expect(html).toContain('data-buffered-action="light"');

    for (let attempt = 0; attempt < 60 && !renderAppHtml(model).includes('data-room-gate-transition="entering"'); attempt += 1) {
      model = reduceAppAction(model, { type: "combatTick", moveX: 1, moveY: 0, dash: true });
    }

    html = renderAppHtml(model);

    expect(html).toContain('data-room-gate-transition="entering"');
    expect(html).toContain('data-room-transition-state="entering"');
    expect(html).toContain('data-player-room-transition="entering"');
    expect(html).toContain('data-action-buffer-state="empty"');
    expect(model.combatRun?.player.bufferedAction).toBeUndefined();
  });

  it("maps PC movement keys to combat movement actions", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    const beforeX = model.combatRun?.player.x ?? 0;
    const action = combatActionForKeyCode(model.state, "ArrowRight", model.combatRun?.player.heat);

    expect(action).toEqual({ type: "combatMove", moveX: 1, moveY: 0, dash: false });

    if (!action) {
      throw new Error("Expected ArrowRight to map to movement");
    }

    const moved = reduceAppAction(model, action);

    expect(moved.combatRun?.player.x).toBeGreaterThan(beforeX);
    expect(renderAppHtml(moved)).toContain('data-player-facing="1"');
  });

  it("keeps repeated arrow key movement while excluding repeats from command buffering", () => {
    const previousLocalStorage = globalThis.localStorage;
    const previousAddEventListener = globalThis.addEventListener;
    const previousRemoveEventListener = globalThis.removeEventListener;
    const storage = new MemoryStorage();
    const listeners = new Map<string, EventListener>();
    let clickHandler: ((event: Event) => void) | undefined;
    const root = {
      innerHTML: "",
      addEventListener(type: string, handler: EventListener): void {
        if (type === "click") {
          clickHandler = handler as (event: Event) => void;
        }
      }
    } as unknown as HTMLDivElement;

    saveGame(storage, withHeat(createInitialState(), 80));

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage
    });
    Object.defineProperty(globalThis, "addEventListener", {
      configurable: true,
      value: (type: string, handler: EventListener) => listeners.set(type, handler)
    });
    Object.defineProperty(globalThis, "removeEventListener", {
      configurable: true,
      value: (type: string, handler: EventListener) => {
        if (listeners.get(type) === handler) {
          listeners.delete(type);
        }
      }
    });

    try {
      const cleanup = mountApp(root);
      const enterButton = {
        dataset: { enterDungeon: "cinder-kiln-alley" },
        closest: () => enterButton
      };
      const keydown = listeners.get("keydown") as ((event: KeyboardEvent) => void) | undefined;
      const makeEvent = (repeat: boolean) =>
        ({
          code: "ArrowRight",
          repeat,
          shiftKey: false,
          preventDefault: () => undefined
        }) as KeyboardEvent;

      clickHandler?.({ target: enterButton } as unknown as Event);
      keydown?.(makeEvent(false));
      const firstX = Number(root.innerHTML.match(/--actor-x: ([0-9.]+)%/)?.[1] ?? 0);
      keydown?.(makeEvent(true));
      const repeatedX = Number(root.innerHTML.match(/--actor-x: ([0-9.]+)%/)?.[1] ?? 0);

      expect(repeatedX).toBeGreaterThan(firstX);
      expect(root.innerHTML).not.toContain('data-command-release-source="manual"');

      cleanup();
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage
      });
      Object.defineProperty(globalThis, "addEventListener", {
        configurable: true,
        value: previousAddEventListener
      });
      Object.defineProperty(globalThis, "removeEventListener", {
        configurable: true,
        value: previousRemoveEventListener
      });
    }
  });

  it("mounts held arrow movement across combat ticks and stops on keyup", () => {
    const previousLocalStorage = globalThis.localStorage;
    const previousAddEventListener = globalThis.addEventListener;
    const previousRemoveEventListener = globalThis.removeEventListener;
    const previousSetInterval = globalThis.setInterval;
    const previousClearInterval = globalThis.clearInterval;
    const storage = new MemoryStorage();
    const listeners = new Map<string, EventListener>();
    let clickHandler: ((event: Event) => void) | undefined;
    let tickHandler: (() => void) | undefined;
    let clearedTickId: number | undefined;
    const root = {
      innerHTML: "",
      addEventListener(type: string, handler: EventListener): void {
        if (type === "click") {
          clickHandler = handler as (event: Event) => void;
        }
      }
    } as unknown as HTMLDivElement;

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage
    });
    Object.defineProperty(globalThis, "addEventListener", {
      configurable: true,
      value: (type: string, handler: EventListener) => listeners.set(type, handler)
    });
    Object.defineProperty(globalThis, "removeEventListener", {
      configurable: true,
      value: (type: string, handler: EventListener) => {
        if (listeners.get(type) === handler) {
          listeners.delete(type);
        }
      }
    });
    Object.defineProperty(globalThis, "setInterval", {
      configurable: true,
      value: (handler: () => void) => {
        tickHandler = handler;
        return 88;
      }
    });
    Object.defineProperty(globalThis, "clearInterval", {
      configurable: true,
      value: (id: number) => {
        clearedTickId = id;
      }
    });

    try {
      const cleanup = mountApp(root);
      const enterButton = {
        dataset: { enterDungeon: "cinder-kiln-alley" },
        closest: () => enterButton
      };
      const keydown = listeners.get("keydown") as ((event: KeyboardEvent) => void) | undefined;
      const keyup = listeners.get("keyup") as ((event: KeyboardEvent) => void) | undefined;

      clickHandler?.({ target: enterButton } as unknown as Event);

      const startX = mountedPlayerActorX(root.innerHTML);

      keydown?.({
        code: "ArrowRight",
        repeat: false,
        shiftKey: false,
        preventDefault: () => undefined
      } as KeyboardEvent);

      const keydownX = mountedPlayerActorX(root.innerHTML);

      tickHandler?.();
      const firstTickX = mountedPlayerActorX(root.innerHTML);
      tickHandler?.();
      const secondTickX = mountedPlayerActorX(root.innerHTML);

      keyup?.({
        code: "ArrowRight",
        preventDefault: () => undefined
      } as KeyboardEvent);

      tickHandler?.();
      const stoppedX = mountedPlayerActorX(root.innerHTML);

      expect(keydownX).toBeGreaterThan(startX);
      expect(firstTickX).toBeGreaterThan(keydownX);
      expect(secondTickX).toBeGreaterThan(firstTickX);
      expect(stoppedX).toBe(secondTickX);
      expect(root.innerHTML).not.toContain('data-command-release-source="manual"');

      cleanup();
      expect(listeners.has("keydown")).toBe(false);
      expect(listeners.has("keyup")).toBe(false);
      expect(clearedTickId).toBe(88);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage
      });
      Object.defineProperty(globalThis, "addEventListener", {
        configurable: true,
        value: previousAddEventListener
      });
      Object.defineProperty(globalThis, "removeEventListener", {
        configurable: true,
        value: previousRemoveEventListener
      });
      Object.defineProperty(globalThis, "setInterval", {
        configurable: true,
        value: previousSetInterval
      });
      Object.defineProperty(globalThis, "clearInterval", {
        configurable: true,
        value: previousClearInterval
      });
    }
  });

  it("clears held mounted movement on window blur so missed keyup cannot keep walking", () => {
    const previousLocalStorage = globalThis.localStorage;
    const previousAddEventListener = globalThis.addEventListener;
    const previousRemoveEventListener = globalThis.removeEventListener;
    const previousSetInterval = globalThis.setInterval;
    const previousClearInterval = globalThis.clearInterval;
    const storage = new MemoryStorage();
    const listeners = new Map<string, EventListener>();
    let clickHandler: ((event: Event) => void) | undefined;
    let tickHandler: (() => void) | undefined;
    let clearedTickId: number | undefined;
    const root = {
      innerHTML: "",
      addEventListener(type: string, handler: EventListener): void {
        if (type === "click") {
          clickHandler = handler as (event: Event) => void;
        }
      }
    } as unknown as HTMLDivElement;

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage
    });
    Object.defineProperty(globalThis, "addEventListener", {
      configurable: true,
      value: (type: string, handler: EventListener) => listeners.set(type, handler)
    });
    Object.defineProperty(globalThis, "removeEventListener", {
      configurable: true,
      value: (type: string, handler: EventListener) => {
        if (listeners.get(type) === handler) {
          listeners.delete(type);
        }
      }
    });
    Object.defineProperty(globalThis, "setInterval", {
      configurable: true,
      value: (handler: () => void) => {
        tickHandler = handler;
        return 89;
      }
    });
    Object.defineProperty(globalThis, "clearInterval", {
      configurable: true,
      value: (id: number) => {
        clearedTickId = id;
      }
    });

    try {
      const cleanup = mountApp(root);
      const enterButton = {
        dataset: { enterDungeon: "cinder-kiln-alley" },
        closest: () => enterButton
      };
      const keydown = listeners.get("keydown") as ((event: KeyboardEvent) => void) | undefined;
      const blur = listeners.get("blur") as ((event: Event) => void) | undefined;

      clickHandler?.({ target: enterButton } as unknown as Event);
      keydown?.({
        code: "ArrowRight",
        repeat: false,
        shiftKey: false,
        preventDefault: () => undefined
      } as KeyboardEvent);
      tickHandler?.();

      const beforeBlurTickX = mountedPlayerActorX(root.innerHTML);

      expect(listeners.has("blur")).toBe(true);
      blur?.({} as Event);
      tickHandler?.();

      const afterBlurTickX = mountedPlayerActorX(root.innerHTML);

      expect(afterBlurTickX).toBe(beforeBlurTickX);

      cleanup();
      expect(listeners.has("blur")).toBe(false);
      expect(clearedTickId).toBe(89);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage
      });
      Object.defineProperty(globalThis, "addEventListener", {
        configurable: true,
        value: previousAddEventListener
      });
      Object.defineProperty(globalThis, "removeEventListener", {
        configurable: true,
        value: previousRemoveEventListener
      });
      Object.defineProperty(globalThis, "setInterval", {
        configurable: true,
        value: previousSetInterval
      });
      Object.defineProperty(globalThis, "clearInterval", {
        configurable: true,
        value: previousClearInterval
      });
    }
  });

  it("renders the active objective tracker while inside a dungeon", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    const html = renderAppHtml(model);
    expect(html).toContain("任务追踪");
    expect(html).toContain("清理灰窑巷");
  });

  it("renders combat profile stats in the dungeon HUD", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    const html = renderAppHtml(model);

    expect(html).toContain("攻击");
    expect(html).toContain("防御");
    expect(html).toContain("冷却");
  });

  it("prompts gate entry instead of attacking an already cleared combat room", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = {
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            enemies: model.combatRun.enemies.map((enemy) => ({
              ...enemy,
              hp: 0,
              downed: true
            }))
          }
        : undefined
    };

    const next = reduceAppAction(model, { type: "combatAction", action: "light" });

    expect(next.message).toContain("右侧房门");
    expect(next.combatRun).toEqual(model.combatRun);
  });

  it("renders player attack motion and monster hit reaction after striking", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    const idleHtml = renderAppHtml(model);
    expect(idleHtml).toContain('data-player-motion="idle"');
    expect(idleHtml).toContain('data-enemy-motion="idle"');

    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "light" });

    const inputHtml = renderAppHtml(model);
    const hitRun = model.combatRun ? resolveGroundLight(model.combatRun) : undefined;
    const hitEvent = firstHitEvent({ combatRun: hitRun });
    const hitHtml = renderAppHtml({ ...model, combatRun: hitRun });
    const targetId = hitEvent.targetId;

    expect(targetId).toBeTruthy();
    expect(inputHtml).toContain('data-player-motion="light"');
    expect(inputHtml).not.toContain('data-enemy-motion="hit"');
    expect(hitHtml).toContain('data-player-motion="light"');
    expect(hitHtml).toContain('class="combat-player-art actor-model actor-model-light actor-model-light-1"');
    expect(hitHtml).toContain(`data-last-hit-target="${targetId}"`);
    expect(hitHtml).toContain('data-hit-recent="true"');
    expect(hitHtml).toContain('data-enemy-motion="hit"');
    expect(hitHtml).toContain('class="enemy-art actor-model actor-model-hit"');

    const recoveredHtml = renderAppHtml({
      ...model,
      combatRun: hitRun
        ? {
            ...hitRun,
            elapsedMs: hitEvent.occurredAtMs + 521
          }
        : undefined
    });
    expect(recoveredHtml).toContain('data-player-motion="idle"');
    expect(recoveredHtml).toContain('data-enemy-motion="idle"');
    expect(recoveredHtml).toContain('class="combat-player-art actor-model actor-model-idle"');
    expect(recoveredHtml).not.toContain('class="hit-impact');
  });

  it("renders distinct third normal-attack combo motion on the player model", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const first = resolveGroundLight(performAction(model.combatRun, { type: "light" }));
    const secondReady = stepCombat(first, {}, first.player.actionLockUntilMs - first.elapsedMs);
    const second = resolveGroundLight(performAction(secondReady, { type: "light" }));
    const thirdReady = stepCombat(second, {}, second.player.actionLockUntilMs - second.elapsedMs);
    const third = resolveGroundLight(performAction(thirdReady, { type: "light" }));
    const html = renderAppHtml({
      ...model,
      combatRun: third
    });

    expect(html).toContain('data-player-motion="light"');
    expect(html).toContain('data-player-combo-step="3"');
    expect(html).toContain('data-player-normal-combo-step="3"');
    expect(html).toContain('class="combat-player-art actor-model actor-model-light actor-model-light-3"');
    expect(html).toContain('data-combo-count="3"');
  });

  it("renders grounded light model-following movement hooks before impact", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = {
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            player: {
              ...model.combatRun.player,
              x: 240,
              y: 340,
              facing: 1
            },
            enemies: model.combatRun.enemies.map((enemy, index) =>
              index === 0
                ? {
                    ...enemy,
                    hp: 180,
                    maxHp: 180,
                    position: { x: 405, y: 340 },
                    nextAttackAtMs: 9999
                  }
                : {
                    ...enemy,
                    hp: 0
                  }
            )
          }
        : undefined
    };

    model = reduceAppAction(model, { type: "combatAction", action: "light" });

    const inputHtml = renderAppHtml(model);

    expect(inputHtml).toContain('data-player-motion="light"');
    expect(inputHtml).toContain('--actor-x: 25.00%;');
    expect(inputHtml).toContain('data-player-normal-attack-type="light"');
    expect(inputHtml).toContain('data-player-normal-attack-move="ground-light-1"');
    expect(inputHtml).toContain('data-player-normal-attack-start-x="240"');
    expect(inputHtml).toContain('data-player-normal-attack-end-x="258"');
    expect(inputHtml).not.toContain('data-player-skill-move="ground-light-1"');
    expect(inputHtml).not.toContain('data-enemy-motion="hit"');

    model = {
      ...model,
      combatRun: model.combatRun ? resolveGroundLight(model.combatRun) : undefined
    };

    const hitHtml = renderAppHtml(model);

    expect(model.combatRun?.player.x).toBe(258);
    expect(hitHtml).toContain('--actor-x: 26.88%;');
    expect(hitHtml).toMatch(/<section class="combat-scene"[^>]*data-hitstop-active="true"/);
    expect(model.combatRun?.enemies[0].position.x).toBe(427);
    expect(hitHtml).toContain('data-impact-origin-x="405"');
    expect(hitHtml).toContain('data-impact-origin-y="340"');
    expect(hitHtml).toContain('data-damage-origin-x="405"');
    expect(hitHtml).toContain('data-damage-origin-y="340"');
    expect(hitHtml).toContain('style="--actor-x: 42.19%; --actor-y: 65.29%;"');
    expect(hitHtml).toContain('data-enemy-hit-slide-active="true"');
    expect(hitHtml).toContain('data-enemy-hit-slide-start-x="405"');
    expect(hitHtml).toContain('data-enemy-hit-slide-end-x="427"');
    expect(hitHtml).toContain('data-enemy-hit-slide-progress="0.00"');
    expect(hitHtml).toContain('style="--actor-x: 42.19%; --actor-y: 65.29%; --enemy-body-width:');
    expect(hitHtml).toContain('data-hit-action="light"');
    expect(hitHtml).toContain('data-hit-phase="ground-light-1"');
    expect(hitHtml).toContain('data-hit-vfx-cue="ground-light-slash-1"');
    expect(hitHtml).toContain('data-enemy-hit-ground-light-step="1"');
    expect(hitHtml).toContain('data-enemy-motion="hit"');
    expect(hitHtml).toContain('hit-impact-ground-light-1');
    expect(hitHtml).toContain('data-impact-ground-light-step="1"');

    const slidingRun = model.combatRun ? stepCombat(model.combatRun, {}, 80) : undefined;
    const slidingHtml = renderAppHtml({
      ...model,
      combatRun: slidingRun
    });
    const settledRun = slidingRun ? stepCombat(slidingRun, {}, 80) : undefined;
    const settledHtml = renderAppHtml({
      ...model,
      combatRun: settledRun
    });

    expect(slidingRun?.enemies[0].position.x).toBe(427);
    expect(slidingHtml).toContain('data-enemy-hit-slide-progress="0.50"');
    expect(slidingHtml).toContain('style="--actor-x: 43.33%; --actor-y: 65.29%; --enemy-body-width:');
    expect(settledHtml).toMatch(/<section class="combat-scene"[^>]*data-hitstop-active="false"/);
    expect(settledHtml).toContain('data-enemy-hit-slide-active="false"');
    expect(settledHtml).toContain('style="--actor-x: 44.48%; --actor-y: 65.29%; --enemy-body-width:');
  });

  it("renders combo HUD plus enemy airborne and knockdown model states", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = {
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            enemies: model.combatRun.enemies.map((enemy, index) =>
              index === 0
                ? {
                    ...enemy,
                    hp: 220,
                    maxHp: 220,
                    nextAttackAtMs: 9999
                  }
                : {
                    ...enemy,
                    hp: 0
                  }
            )
          }
        : undefined
    };

    model = reduceAppAction(model, { type: "combatAction", action: "heavy" });

    const inputHtml = renderAppHtml(model);
    expect(model.combatRun?.comboCount).toBe(0);
    expect(inputHtml).toContain('data-player-motion="heavy"');
    expect(inputHtml).toContain('class="combat-player-art actor-model actor-model-heavy"');
    expect(inputHtml).toContain('--actor-x: 27.08%;');
    expect(inputHtml).toContain('data-player-normal-attack-type="heavy"');
    expect(inputHtml).toContain('data-player-normal-attack-move="ground-heavy"');
    expect(inputHtml).toContain('data-player-normal-attack-start-x="260"');
    expect(inputHtml).toContain('data-player-normal-attack-end-x="294"');
    expect(inputHtml).not.toContain('data-player-skill-move="ground-heavy"');
    expect(inputHtml).not.toContain('data-airborne-state="airborne"');
    expect(inputHtml).not.toContain('hit-impact-heavy');

    model = {
      ...model,
      combatRun: model.combatRun ? resolveGroundHeavy(model.combatRun) : undefined
    };

    const airborneHtml = renderAppHtml(model);

    expect(model.combatRun?.comboCount).toBe(1);
    expect(model.combatRun?.player.x).toBe(294);
    expect(airborneHtml).toContain('data-combo-count="1"');
    expect(airborneHtml).toContain('class="combo-meter"');
    expect(airborneHtml).toContain('--actor-x: 30.63%;');
    expect(airborneHtml).toContain('data-airborne-state="airborne"');
    expect(airborneHtml).toContain('data-hit-action="heavy"');
    expect(airborneHtml).toContain('data-enemy-motion="airborne"');
    expect(airborneHtml).toContain('class="enemy-art actor-model actor-model-airborne"');
    expect(airborneHtml).toContain('hit-impact-heavy');

    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const downedHtml = renderAppHtml(model);

    expect(downedHtml).toContain('data-airborne-state="downed"');
    expect(downedHtml).toContain('data-enemy-motion="knockdown"');
    expect(downedHtml).toContain('class="enemy-art actor-model actor-model-knockdown"');
  });

  it("advances automatic combat ticks in short frames so grounded heavy renders windup before impact", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "heavy" });

    const windup = reduceAppAction(model, { type: "combatTick" });
    const windupHtml = renderAppHtml(windup);

    expect(windup.combatRun?.elapsedMs).toBeLessThan(85);
    expect(windup.combatRun?.player.x).toBeGreaterThan(model.combatRun?.player.x ?? 0);
    expect(windup.combatRun?.player.x).toBeLessThan(model.combatRun?.player.activeSkillMovement?.endX ?? Number.POSITIVE_INFINITY);
    expect(windupHtml).toContain('data-player-motion="heavy"');
    expect(windupHtml).toContain('data-player-normal-attack-move="ground-heavy"');
    expect(windupHtml).not.toContain('hit-impact-heavy');

    const impact = reduceAppAction(windup, { type: "combatTick" });
    const impactHtml = renderAppHtml(impact);

    expect(impact.combatRun?.elapsedMs).toBeGreaterThanOrEqual(85);
    expect(impact.combatRun?.player.x).toBe(model.combatRun?.player.activeSkillMovement?.endX);
    expect(impactHtml).toContain('hit-impact-heavy');
  });

  it("binds player strike direction to the bitmap model node", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 380,
      y: 340,
      facing: -1 as const
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: {
                  x: player.x - 92,
                  y: player.y
                },
                nextAttackAtMs: 9999
              }
            : {
                ...enemy,
                hp: 0
              }
        )
      }
    };

    model = reduceAppAction(model, { type: "combatAction", action: "light" });
    const hitRun = model.combatRun ? resolveGroundLight(model.combatRun) : undefined;
    const hitEvent = firstHitEvent({ combatRun: hitRun });
    const html = renderAppHtml({
      ...model,
      combatRun: hitRun
        ? {
            ...hitRun,
            elapsedMs: hitEvent.occurredAtMs
          }
        : undefined
    });

    expect(html).toContain('data-player-facing="-1"');
    expect(html).toMatch(
      /class="combat-player-art actor-model actor-model-light actor-model-light-1"[^>]+style="[^"]*--model-scale-x: -1;[^"]*--light-lunge-x: -24px;[^"]*--hit-react-x: 18px;/
    );
    expect(html).toMatch(
      /class="enemy-art actor-model actor-model-hit"[^>]+style="[^"]*--hit-react-x: -18px;/
    );
  });

  it("binds monster attack direction and player hurt direction to bitmap model nodes", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = readyFirstEnemyAttack(model);

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        enemies: model.combatRun.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: {
                  x: model.combatRun?.player.x ?? enemy.position.x,
                  y: model.combatRun?.player.y ?? enemy.position.y
                }
              }
            : enemy
        )
      }
    };

    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const windupHtml = renderAppHtml(model);

    expect(windupHtml).toMatch(
      /class="enemy-art actor-model actor-model-attack actor-enemy-skill-ash-ember-spit"[^>]+style="[^"]*--enemy-lunge-x: -20px;/
    );

    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const hitHtml = renderAppHtml(model);

    expect(hitHtml).toMatch(
      /class="combat-player-art actor-model actor-model-hit"[^>]+style="[^"]*--hit-react-x: -18px;/
    );
  });

  it("binds monster skill model motion to skill-specific lunge and timing windows", () => {
    let chargeModel = createAppModel({ storage: new MemoryStorage() });

    chargeModel = reduceAppAction(chargeModel, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!chargeModel.combatRun) {
      throw new Error("Expected active combat run");
    }

    chargeModel = {
      ...chargeModel,
      combatRun: {
        ...chargeModel.combatRun,
        enemies: chargeModel.combatRun.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                kind: "elite",
                attackProfileId: "zheng-horn-charge" as CombatEnemy["attackProfileId"],
                position: {
                  x: (chargeModel.combatRun?.player.x ?? enemy.position.x) + 310,
                  y: chargeModel.combatRun?.player.y ?? enemy.position.y
                },
                nextAttackAtMs: 1
              }
            : enemy
        )
      }
    };
    chargeModel = reduceAppAction(chargeModel, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const chargeHtml = renderAppHtml(chargeModel);

    expect(chargeHtml).toContain('data-enemy-attack-skill-id="zheng-horn-charge"');
    expect(chargeHtml).toContain('data-enemy-attack-stage="windup"');
    expect(chargeHtml).toContain('data-enemy-attack-duration-ms="780"');
    expect(chargeHtml).toContain('data-enemy-attack-progress="0.00"');
    expect(chargeHtml).toMatch(
      /class="enemy-art actor-model actor-model-attack actor-enemy-skill-zheng-horn-charge"[^>]+style="[^"]*--enemy-lunge-x: -64px;[^"]*--enemy-attack-duration: 780ms;[^"]*--enemy-attack-progress: 0.00;/
    );

    let spitModel = createAppModel({ storage: new MemoryStorage() });

    spitModel = reduceAppAction(spitModel, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    spitModel = readyFirstEnemyAttack(spitModel);
    spitModel = reduceAppAction(spitModel, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const spitHtml = renderAppHtml(spitModel);

    expect(spitHtml).toContain('data-enemy-attack-skill-id="ash-ember-spit"');
    expect(spitHtml).toContain('data-enemy-attack-duration-ms="520"');
    expect(spitHtml).toMatch(
      /class="enemy-art actor-model actor-model-attack actor-enemy-skill-ash-ember-spit"[^>]+style="[^"]*--enemy-lunge-x: -20px;[^"]*--enemy-attack-duration: 520ms;/
    );
  });

  it("does not carry old hit VFX into the next combat room", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = defeatCurrentRoom(model);

    const clearedHtml = renderAppHtml(model);
    expect(clearedHtml).toContain('data-player-motion="heavy"');

    model = walkThroughOpenGate(model);

    const nextRoomHtml = renderAppHtml(model);
    expect(model.combatRun?.roomIndex).toBe(1);
    expect(nextRoomHtml).toContain('data-player-motion="idle"');
    expect(nextRoomHtml).toContain('data-enemy-motion="idle"');
    expect(nextRoomHtml).not.toContain('class="hit-impact');
    expect(nextRoomHtml).not.toContain('data-damage-number="true"');
  });

  it("renders concrete combat skill slots and maps hotkeys to those skills", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    const html = renderAppHtml(model);

    expect(html).toContain('data-combat-skill-id="anvil-crash"');
    expect(html).toContain('data-hotkey="U"');
    expect(html).toContain('data-skill-cost="25"');
    expect(combatActionForKeyCode(model.state, "KeyJ")).toEqual({ type: "combatAction", action: "light" });
    expect(combatActionForKeyCode(model.state, "KeyX")).toEqual({ type: "combatAction", action: "light" });
    expect(combatActionForKeyCode(model.state, "KeyZ")).toEqual({ type: "combatAction", action: "heavy" });
    expect(combatActionForKeyCode(model.state, "KeyU")).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "anvil-crash"
    });

    const action = combatActionForKeyCode(model.state, "KeyU");

    if (!action) {
      throw new Error("Expected KeyU to map to a combat skill");
    }

    model = placeAliveEnemiesInFront(model);
    const cast = reduceAppAction(model, action);
    const lastEvent = cast.combatRun?.events.at(-1);

    if (!cast.combatRun) {
      throw new Error("Expected active combat run after anvil-crash");
    }

    const [slamAtMs] = scheduledSkillTimes(cast.combatRun, "anvil-crash");
    const slamRun = stepToElapsed(cast.combatRun, slamAtMs);
    const [slamHit] = skillHitEvents(slamRun, "anvil-crash");

    expect(lastEvent).toMatchObject({ kind: "skill-cast", action: "skill", skillId: "anvil-crash" });
    expect(slamHit).toMatchObject({ kind: "hit", action: "skill", skillId: "anvil-crash", hitPhase: "anvil-slam" });
    expect(cast.combatRun?.player.heat).toBeLessThan(model.combatRun?.player.heat ?? 0);
    expect(cast.audio.commandQueue).toEqual(expect.arrayContaining([{ type: "sfx", id: "skill-burst" }]));
  });

  it("maps DNF-style A-H combat skill slots while arrow keys own movement", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    const html = renderAppHtml(model);

    expect(html).toContain('data-dnf-skill-bar="true"');
    expect(html).toContain('data-dnf-hotkey="A"');
    expect(html).toContain('data-dnf-hotkey="F"');
    expect(html).toContain('data-dnf-slot-index="0"');
    expect(html).toContain('data-dnf-slot-index="5"');
    expect(html).toContain('data-legacy-hotkey="U"');
    expect(html).toContain('data-dnf-slot-state="ready"');
    expect(html).toContain('data-combat-skill-id="spark-combo"');
    expect(html).toContain('data-combat-skill-id="anvil-crash"');
    expect(html).toContain('data-hotkey="U"');
    expect(html).toContain("方向键移动");
    expect(html).toContain("A/S/D/F/G/H 技能");
    expect(html).not.toContain("方向键/WASD 移动");

    expect(combatActionForKeyCode(model.state, "ArrowRight")).toEqual({
      type: "combatMove",
      moveX: 1,
      moveY: 0,
      dash: false
    });
    expect(combatActionForKeyCode(model.state, "KeyA", 80, false, model.combatRun)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "spark-combo"
    });
    expect(combatActionForKeyCode(model.state, "KeyD", 80, false, model.combatRun)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "furnace-step"
    });
    expect(combatActionForKeyCode(model.state, "KeyF", 80, false, model.combatRun)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "anvil-crash"
    });
    expect(combatActionForKeyCode(model.state, "KeyG", 30, false, model.combatRun)).toBeUndefined();
    expect(combatActionForKeyCode(model.state, "KeyU", 80, false, model.combatRun)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "anvil-crash"
    });
  });

  it("maps DNF-style command input before falling back to heavy attack", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 24)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    expect(combatActionForKeyCode(model.state, "KeyZ", 24, false, model.combatRun)).toEqual({
      type: "combatAction",
      action: "heavy"
    });
    expect(combatActionForKeyCode(model.state, "KeyF", 24, false, model.combatRun)).toBeUndefined();
    expect(combatActionForCommandSequence(model.state, ["ArrowDown", "ArrowRight", "KeyZ"], 24, model.combatRun)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "anvil-crash",
      inputMethod: "command"
    });

    const cast = reduceAppAction(model, {
      type: "combatAction",
      action: "skill",
      skillId: "anvil-crash",
      inputMethod: "command"
    });
    const html = renderAppHtml(cast);

    expect(cast.combatRun?.player.resource.current).toBe(2);
    expect(cast.combatRun?.player.skillCooldowns["anvil-crash"]).toBe(4784);
    expect(html).toContain('data-command-release-source="manual"');
    expect(html).toContain('data-command-reduction-applied="true"');
    expect(html).toContain('data-skill-release-source="manual"');

    expect(combatActionForCommandSequence(cast.state, ["ArrowDown", "ArrowRight", "KeyZ"], 80, cast.combatRun)).toBeUndefined();
  });

  it("allows command skills to enter the action buffer when cooldown recovers before unlock", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 24)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const lockedRun: CombatRun = {
      ...model.combatRun,
      elapsedMs: 100,
      player: {
        ...model.combatRun.player,
        actionLockUntilMs: 220,
        skillCooldowns: {
          ...model.combatRun.player.skillCooldowns,
          "anvil-crash": 210
        }
      }
    };

    expect(combatActionForCommandSequence(model.state, ["ArrowDown", "ArrowRight", "KeyZ"], 24, lockedRun)).toBeUndefined();
    expect(combatActionForCommandSequence(model.state, ["ArrowDown", "ArrowRight", "KeyZ"], 24, lockedRun, true)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "anvil-crash",
      inputMethod: "command"
    });
  });

  it("allows DNF hotkey skills to enter the action buffer when cooldown recovers before unlock", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const lockedRun: CombatRun = {
      ...model.combatRun,
      elapsedMs: 100,
      player: {
        ...model.combatRun.player,
        actionLockUntilMs: 220,
        skillCooldowns: {
          ...model.combatRun.player.skillCooldowns,
          "anvil-crash": 210
        }
      }
    };
    const lockedModel = { ...model, combatRun: lockedRun };
    const hotkeyAction = combatActionForKeyCode(lockedModel.state, "KeyF", 80, false, lockedModel.combatRun, true);

    expect(combatActionForKeyCode(lockedModel.state, "KeyF", 80, false, lockedModel.combatRun)).toBeUndefined();
    expect(hotkeyAction).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "anvil-crash"
    });

    if (!hotkeyAction) {
      throw new Error("Expected buffered hotkey action");
    }

    const queued = reduceAppAction(lockedModel, hotkeyAction);
    const queuedPlayer = queued.combatRun?.player as NonNullable<typeof queued.combatRun>["player"] & {
      bufferedAction?: { type: string; skillId?: string };
      bufferedActionExecuteAtMs?: number;
    };
    const queuedHtml = renderAppHtml(queued);

    expect(queuedPlayer.bufferedAction).toEqual({ type: "skill", skillId: "anvil-crash" });
    expect(queuedPlayer.bufferedActionExecuteAtMs).toBe(lockedRun.player.actionLockUntilMs);
    expect(queuedHtml).toContain('data-action-buffer-state="queued"');
    expect(queuedHtml).toContain('data-buffered-action="skill"');
    expect(queuedHtml).toContain('data-buffered-skill-id="anvil-crash"');
  });

  it("renders manual release metadata for command-cast generic class skills", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 20)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    const cast = reduceAppAction(model, {
      type: "combatAction",
      action: "skill",
      skillId: "ink-snare",
      inputMethod: "command"
    });
    const html = renderAppHtml(cast);

    expect(cast.combatRun?.player.resource.current).toBe(0);
    expect(cast.combatRun?.player.skillCooldowns["ink-snare"]).toBe(4784);
    expect(html).toContain('data-command-release-source="manual"');
    expect(html).toContain('data-command-match-skill-id="ink-snare"');
    expect(html).toContain('data-skill-release-source="manual"');
    expect(html).toContain('data-player-skill-vfx="ink-snare"');
  });

  it("renders combo-cancel availability and cancel-release feedback during light hit confirms", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "light" });
    model = {
      ...model,
      combatRun: model.combatRun ? resolveGroundLight(model.combatRun) : model.combatRun
    };

    const confirmHtml = renderAppHtml(model);

    expect(confirmHtml).toContain('data-combo-cancel-window-active="true"');
    expect(confirmHtml).toContain('data-combo-cancel-state="available"');
    expect(confirmHtml).toContain('data-combo-cancel-available="true"');

    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "spark-combo" });

    const cancelHtml = renderAppHtml(model);

    expect(cancelHtml).toContain('data-skill-release-source="cancel"');
    expect(cancelHtml).toContain('data-player-motion="skill"');
    expect(cancelHtml).toContain('data-combo-cancel-active="true"');
    expect(cancelHtml).toContain('data-combo-cancel-skill-id="spark-combo"');
    expect(cancelHtml).toContain('data-skill-cancel-toast="true"');
    expect(cancelHtml).toContain('class="skill-cancel-toast"');
  });

  it("queues combat input during the action buffer window instead of skipping past the lock", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    const light = reduceAppAction(model, { type: "combatAction", action: "light" });
    const queued = reduceAppAction(light, { type: "combatAction", action: "heavy" });
    const queuedPlayer = queued.combatRun?.player as NonNullable<typeof queued.combatRun>["player"] & {
      bufferedAction?: { type: string };
      bufferedActionExecuteAtMs?: number;
    };
    const queuedHtml = renderAppHtml(queued);

    expect(queuedPlayer.bufferedAction).toEqual({ type: "heavy" });
    expect(queuedPlayer.bufferedActionExecuteAtMs).toBe(light.combatRun?.player.actionLockUntilMs);
    expect(queuedHtml).toContain('data-action-buffer-state="queued"');
    expect(queuedHtml).toContain('data-buffered-action="heavy"');
    expect(queuedHtml).toContain('data-buffered-execute-at-ms="');
    expect(queued.message).toContain("缓冲");
  });

  it("renders selected class resource identity in combat HUD and skill buttons", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 40);
    const resource = catalog.classes.find((item) => item.id === "liuli-blademage")?.resource;
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: state
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    const html = renderAppHtml(model);

    expect(resource).toBeDefined();
    expect(html).toContain(`${resource?.displayName} 40/${resource?.max}`);
    expect(html).toContain('data-combat-skill-id="liuli-rain"');
    expect(html).toContain('data-resource-id="prism"');
    expect(html).toContain('data-skill-cost="24"');
    expect(html).not.toContain("热能 40");
  });

  it("renders zero-cost guard skills as clickable combat skill buttons", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 40);
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: state
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    const html = renderAppHtml(model);

    expect(html).toContain('data-combat-skill-id="anvil-guard"');
    expect(html).toContain('data-skill-cost="0"');
  });

  it("renders structured class mechanic state for browser verification", () => {
    let liuliModel = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 40)
    });

    liuliModel = reduceAppAction(liuliModel, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    liuliModel = placeAliveEnemiesInFront(liuliModel);
    liuliModel = reduceAppAction(liuliModel, { type: "combatAction", action: "skill", skillId: "mirror-arc" });

    const liuliHtml = renderAppHtml(liuliModel);

    expect(liuliHtml).toContain('data-class-id="liuli-blademage"');
    expect(liuliHtml).toContain('data-resource-id="prism"');
    expect(liuliHtml).toContain('data-resource-current="34"');
    expect(liuliHtml).toContain('data-prism-chain="1"');
    expect(liuliHtml).toContain('data-last-skill-id="mirror-arc"');

    let inkModel = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90)
    });

    inkModel = reduceAppAction(inkModel, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    inkModel = placeAliveEnemiesInFront(inkModel);
    inkModel = reduceAppAction(inkModel, { type: "combatAction", action: "skill", skillId: "marking-bolt" });

    if (!inkModel.combatRun) {
      throw new Error("Expected active Ink combat run");
    }

    const inkCastHtml = renderAppHtml(inkModel);
    const [inkMarkAtMs] = scheduledSkillTimes(inkModel.combatRun, "marking-bolt");
    inkModel = {
      ...inkModel,
      combatRun: stepToElapsed(inkModel.combatRun, inkMarkAtMs)
    };
    const inkHtml = renderAppHtml(inkModel);

    expect(inkHtml).toContain('data-class-id="ink-shadow-ranger"');
    expect(inkHtml).toContain('data-resource-id="ink"');
    expect(inkCastHtml).toContain('data-ink-marks="0"');
    expect(inkHtml).toContain('data-ink-marks="2"');
  });

  it("renders skill status motion classes for shield, counter, control, and armor break", () => {
    let shieldModel = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 90)
    });

    shieldModel = reduceAppAction(shieldModel, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    shieldModel = placeAliveEnemiesInFront(shieldModel);
    shieldModel = reduceAppAction(shieldModel, { type: "combatAction", action: "skill", skillId: "molten-wall" });

    if (!shieldModel.combatRun) {
      throw new Error("Expected active combat run after molten-wall");
    }

    const [wallAtMs] = scheduledSkillTimes(shieldModel.combatRun, "molten-wall");
    const shieldHtml = renderAppHtml({
      ...shieldModel,
      combatRun: stepToElapsed(shieldModel.combatRun, wallAtMs)
    });

    expect(shieldHtml).toContain('data-shield-active="true"');
    expect(shieldHtml).toContain('data-player-motion="shield"');
    expect(shieldHtml).toContain('class="combat-player-art actor-model actor-model-shield"');

    let reflectModel = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90)
    });

    reflectModel = reduceAppAction(reflectModel, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    reflectModel = placeAliveEnemiesInFront(reflectModel);
    reflectModel = reduceAppAction(reflectModel, { type: "combatAction", action: "skill", skillId: "mirror-arc" });

    if (!reflectModel.combatRun) {
      throw new Error("Expected active combat run after mirror-arc");
    }

    const reflectHtml = renderAppHtml({
      ...reflectModel,
      combatRun: stepToElapsed(reflectModel.combatRun, 90)
    });

    expect(reflectHtml).toContain('data-reflect-active="true"');
    expect(reflectHtml).toContain('data-player-motion="counter"');
    expect(reflectHtml).toContain('class="combat-player-art actor-model actor-model-counter"');

    let controlModel = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90)
    });

    controlModel = reduceAppAction(controlModel, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    controlModel = placeAliveEnemiesInFront(controlModel);
    controlModel = reduceAppAction(controlModel, { type: "combatAction", action: "skill", skillId: "ink-snare" });

    if (!controlModel.combatRun) {
      throw new Error("Expected active combat run after ink-snare");
    }

    const immediateControlHtml = renderAppHtml(controlModel);
    const [bindAtMs] = scheduledSkillTimes(controlModel.combatRun, "ink-snare");
    const controlHtml = renderAppHtml({
      ...controlModel,
      combatRun: stepToElapsed(controlModel.combatRun, bindAtMs)
    });

    expect(immediateControlHtml).not.toContain('data-control-state="controlled"');
    expect(controlHtml).toContain('data-control-state="controlled"');
    expect(controlHtml).toContain('data-enemy-motion="controlled"');
    expect(controlHtml).toContain('class="enemy-art actor-model actor-model-controlled"');

    let breakModel = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 90)
    });

    breakModel = reduceAppAction(breakModel, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    breakModel = placeAliveEnemiesInFront(breakModel);
    breakModel = {
      ...breakModel,
      combatRun: breakModel.combatRun
        ? {
            ...breakModel.combatRun,
            enemies: breakModel.combatRun.enemies.map((enemy, index) =>
              index === 0
                ? {
                    ...enemy,
                    armor: 40
                  }
                : enemy
            )
          }
        : undefined
    };
    breakModel = reduceAppAction(breakModel, { type: "combatAction", action: "skill", skillId: "mountain-guard-break" });

    if (!breakModel.combatRun) {
      throw new Error("Expected active combat run after mountain-guard-break");
    }

    const [breakAtMs] = scheduledSkillTimes(breakModel.combatRun, "mountain-guard-break");
    const breakCastHtml = renderAppHtml(breakModel);
    const breakHtml = renderAppHtml({
      ...breakModel,
      combatRun: stepToElapsed(breakModel.combatRun, breakAtMs)
    });

    expect(breakCastHtml).not.toContain('data-armor-state="broken"');
    expect(breakHtml).toContain('data-armor-state="broken"');
    expect(breakHtml).toContain('data-enemy-motion="guard-break"');
    expect(breakHtml).toContain('class="enemy-art actor-model actor-model-guard-break"');
  });

  it("renders molten-wall as a delayed self shield with molten-wall VFX", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 90)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "molten-wall" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after molten-wall");
    }

    const [wallAtMs] = scheduledSkillTimes(model.combatRun, "molten-wall");
    const castHtml = renderAppHtml(model);
    const beforeWallHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, wallAtMs - 1)
    });
    const wallHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, wallAtMs)
    });

    expect(wallAtMs).toBe(260);
    expect(castHtml).toContain('data-active-skill-id="molten-wall"');
    expect(castHtml).toContain('data-skill-animation-preset="iron-wall"');
    expect(castHtml).toContain('data-skill-weapon-arc="wall-guard"');
    expect(castHtml).toContain('data-skill-vfx-shape="molten-wall"');
    expect(castHtml).toContain('data-player-skill-move="molten-wall"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-molten-wall skill-vfx-shape-molten-wall"');
    expect(beforeWallHtml).toContain('data-shield-active="false"');
    expect(beforeWallHtml).not.toContain('data-player-motion="shield"');
    expect(beforeWallHtml).not.toContain('class="combat-player-art actor-model actor-model-shield');
    expect(beforeWallHtml).not.toContain('data-weapon-motion="shield"');
    expect(wallHtml).toContain('data-shield-active="true"');
    expect(wallHtml).toContain('data-player-motion="shield"');
    expect(wallHtml).toContain('class="combat-player-art actor-model actor-model-shield');
    expect(beforeWallHtml).not.toContain('data-player-status-vfx="molten-wall"');
    expect(wallHtml).toContain('data-player-status-vfx="molten-wall"');
    expect(wallHtml).toContain('data-vfx-cue="molten-wall-open"');
    expect(wallHtml).toContain('class="player-status-vfx skill-impact-burst skill-impact-shape-molten-wall"');
    expect(wallHtml).not.toContain('data-damage-number="true"');
  });

  it("renders anvil-guard as a delayed shield raise with guard-rune VFX", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 40)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "anvil-guard" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after anvil-guard");
    }

    const [guardAtMs] = scheduledSkillTimes(model.combatRun, "anvil-guard");
    const castHtml = renderAppHtml(model);
    const beforeGuardHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, guardAtMs - 1)
    });
    const guardHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, guardAtMs)
    });

    expect(castHtml).toContain('data-active-skill-id="anvil-guard"');
    expect(castHtml).toContain('data-skill-animation-preset="iron-guard"');
    expect(castHtml).toContain('data-skill-weapon-arc="guard-raise"');
    expect(castHtml).toContain('data-skill-vfx-shape="guard-rune"');
    expect(castHtml).toContain('data-player-skill-move="anvil-guard"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-anvil-guard skill-vfx-shape-guard-rune"');
    expect(beforeGuardHtml).toContain('data-shield-active="false"');
    expect(beforeGuardHtml).not.toContain('data-player-motion="shield"');
    expect(beforeGuardHtml).not.toContain('class="combat-player-art actor-model actor-model-shield');
    expect(beforeGuardHtml).not.toContain('data-weapon-motion="shield"');
    expect(guardHtml).toContain('data-shield-active="true"');
    expect(guardHtml).toContain('data-player-motion="shield"');
    expect(guardHtml).toContain('class="combat-player-art actor-model actor-model-shield');
    expect(beforeGuardHtml).not.toContain('data-player-status-vfx="anvil-guard"');
    expect(guardHtml).toContain('data-player-status-vfx="anvil-guard"');
    expect(guardHtml).toContain('data-vfx-cue="anvil-guard-open"');
    expect(guardHtml).toContain('class="player-status-vfx skill-impact-burst skill-impact-shape-guard-rune"');
    expect(guardHtml).not.toContain('data-damage-number="true"');
  });

  it("renders black-furnace-aegis as a delayed advancement shield with black-aegis VFX", () => {
    const advancedState = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100)),
      "black-furnace-vanguard"
    );
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: advancedState
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "black-furnace-aegis" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after black-furnace-aegis");
    }

    const [aegisAtMs] = scheduledSkillTimes(model.combatRun, "black-furnace-aegis");
    const castHtml = renderAppHtml(model);
    const beforeAegisHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, aegisAtMs - 1)
    });
    const aegisHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, aegisAtMs)
    });

    expect(aegisAtMs).toBe(280);
    expect(castHtml).toContain('data-active-skill-id="black-furnace-aegis"');
    expect(castHtml).toContain('data-advancement-id="black-furnace-vanguard"');
    expect(castHtml).toContain('data-skill-animation-preset="iron-aegis"');
    expect(castHtml).toContain('data-skill-weapon-arc="aegis-raise"');
    expect(castHtml).toContain('data-skill-vfx-shape="black-aegis"');
    expect(castHtml).toContain('data-player-skill-move="black-furnace-aegis"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-black-furnace-aegis skill-vfx-shape-black-aegis"');
    expect(castHtml).not.toContain('data-damage-number="true"');
    expect(beforeAegisHtml).not.toContain('data-skill-impact-vfx="black-furnace-aegis"');
    expect(beforeAegisHtml).not.toContain('data-damage-number="true"');
    expect(beforeAegisHtml).toContain('data-shield-active="false"');
    expect(beforeAegisHtml).not.toContain('data-player-motion="shield"');
    expect(beforeAegisHtml).not.toContain('class="combat-player-art actor-model actor-model-shield');
    expect(beforeAegisHtml).not.toContain('data-weapon-motion="shield"');
    expect(aegisHtml).toContain('data-shield-active="true"');
    expect(aegisHtml).toContain('data-player-motion="shield"');
    expect(aegisHtml).toContain('class="combat-player-art actor-model actor-model-shield');
    expect(aegisHtml).toContain('data-player-status-vfx="black-furnace-aegis"');
    expect(aegisHtml).toContain('data-vfx-cue="black-aegis-open"');
    expect(aegisHtml).toContain('class="player-status-vfx skill-impact-burst skill-impact-shape-black-aegis"');
  });

  it("renders crow-feint as a delayed dodge window with a feint-shot impact", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "crow-feint" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const castHtml = renderAppHtml(model);
    const [shotAtMs] = scheduledSkillTimes(model.combatRun, "crow-feint");
    const activeRun = stepToElapsed(model.combatRun, 90);
    const activeHtml = renderAppHtml({
      ...model,
      combatRun: activeRun
    });
    const attackedRun: CombatRun = {
      ...model.combatRun,
      enemies: model.combatRun.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              position: { x: model.combatRun?.player.x ?? enemy.position.x, y: model.combatRun?.player.y ?? enemy.position.y },
              attackStartedAtMs: model.combatRun?.elapsedMs ?? 0,
              attackImpactAtMs: 110,
              attackRecoverUntilMs: 300,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };
    const dodgedRun = stepToElapsed(attackedRun, shotAtMs);
    const dodgedHtml = renderAppHtml({
      ...model,
      combatRun: dodgedRun
    });

    expect(shotAtMs).toBe(190);
    expect(castHtml).toContain('data-active-skill-id="crow-feint"');
    expect(castHtml).toContain('data-skill-animation-preset="ink-feint"');
    expect(castHtml).toContain('data-skill-weapon-arc="feint-shot"');
    expect(castHtml).toContain('data-skill-vfx-shape="crow-feint"');
    expect(castHtml).toContain('data-player-skill-move="crow-feint"');
    expect(castHtml).toContain('data-evade-active="false"');
    expect(castHtml).not.toContain('data-skill-impact-vfx="crow-feint"');
    expect(activeHtml).toContain('data-evade-active="true"');
    expect(activeHtml).toContain('data-player-motion="dodge"');
    expect(dodgedHtml).toContain('data-dodge-result="missed"');
    expect(dodgedHtml).toContain('data-hit-phase="feint-shot"');
    expect(dodgedHtml).toContain('data-vfx-cue="crow-feint-shot"');
    expect(dodgedHtml).toContain('data-impact-vfx-shape="crow-feint"');
    expect(dodgedHtml).toContain('class="skill-impact-burst skill-impact-shape-crow-feint"');
    expect(countOccurrences(dodgedHtml, 'data-skill-impact-vfx="crow-feint"')).toBe(1);
  });

  it("maps KeyC to DNF-style jump and renders airborne motion without hiding skill hotkeys", () => {
    const advancedState = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90)),
      "flowing-light-swordmaster"
    );
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: advancedState
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);

    const action = combatActionForKeyCode(model.state, "KeyC", model.combatRun?.player.resource.current, false, model.combatRun);
    expect(action).toEqual({ type: "combatAction", action: "jump" });
    expect(combatActionForKeyCode(model.state, "KeyX", model.combatRun?.player.resource.current, false, model.combatRun)).toEqual({
      type: "combatAction",
      action: "light"
    });
    expect(combatActionForKeyCode(model.state, "KeyZ", model.combatRun?.player.resource.current, false, model.combatRun)).toEqual({
      type: "combatAction",
      action: "heavy"
    });
    expect(combatActionForKeyCode(model.state, "KeyU", model.combatRun?.player.resource.current, false, model.combatRun)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "liuli-rain"
    });
    expect(combatActionForKeyCode(model.state, "Space", model.combatRun?.player.resource.current, false, model.combatRun)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "flowing-light-chain"
    });

    const yBefore = model.combatRun?.player.y ?? 0;
    model = reduceAppAction(model, { type: "combatAction", action: "jump" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const html = renderAppHtml(model);

    expect(model.combatRun.player.y).toBe(yBefore);
    expect(html).toContain('data-player-motion="jump"');
    expect(html).toContain('data-player-air-state="jumping"');
    expect(html).toContain('data-player-airborne-active="true"');
    expect(html).toContain('data-combat-action="jump"');
    expect(html).toContain('data-hotkey="C"');
    expect(html).toContain('class="combat-player-art actor-model actor-model-jump"');

    model = {
      ...model,
      combatRun: stepCombat(model.combatRun, {}, 180)
    };
    model = reduceAppAction(model, { type: "combatAction", action: "light" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    expect(model.message).not.toBe("动作硬直中");
    expect(model.combatRun.scheduledEnemyHitEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "light",
          applyAtMs: model.combatRun.elapsedMs + 65,
          hitPhase: "air-light",
          vfxCue: "air-light-slash"
        })
      ])
    );

    model = {
      ...model,
      combatRun: stepCombat(model.combatRun, {}, 65)
    };

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const airLightHit = model.combatRun.events.find(
      (event): event is CombatHitEvent => event.kind === "hit" && event.action === "light" && event.hitPhase === "air-light"
    );
    const airLightHtml = renderAppHtml(model);

    expect(airLightHit).toMatchObject({
      inputToHitMs: 65,
      vfxCue: "air-light-slash"
    });
    expect(airLightHtml).toContain('data-player-motion="air-light"');
    expect(airLightHtml).toContain('data-player-air-state="jumping"');
    expect(airLightHtml).toContain('data-player-air-attack-used="true"');
    expect(airLightHtml).toContain('class="combat-player-art actor-model actor-model-air-light"');
  });

  it("uses KeyC as DNF-style quick recover during strong monster hit recovery", () => {
    let model = createAppModel({
      storage: new MemoryStorage()
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = {
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            player: {
              ...model.combatRun.player,
              x: 260,
              y: 340,
              facing: 1 as const,
              actionLockUntilMs: 0,
              hurtLockUntilMs: 0
            },
            enemies: model.combatRun.enemies.map((enemy, index) =>
              index === 0
                ? {
                    ...enemy,
                    hp: 180,
                    maxHp: 180,
                    attackProfileId: "ash-crawler-burst" as CombatEnemy["attackProfileId"],
                    position: { x: 352, y: 340 },
                    nextAttackAtMs: 1
                  }
                : {
                    ...enemy,
                    hp: 0
                  }
            )
          }
        : undefined
    };

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const telegraph = stepCombat(model.combatRun, {}, 1);
    const impacted = stepToElapsed(telegraph, telegraph.enemies[0].attackImpactAtMs ?? 0);
    model = {
      ...model,
      combatRun: impacted
    };

    expect(impacted.events.some((event) => event.kind === "player-hit" && event.skillId === "ash-crawler-burst")).toBe(true);
    const impactedRun = model.combatRun;
    if (!impactedRun) {
      throw new Error("Expected impacted combat run");
    }
    expect(combatActionForKeyCode(model.state, "KeyC", impactedRun.player.resource.current, false, impactedRun)).toEqual({
      type: "combatAction",
      action: "jump"
    });

    model = reduceAppAction(model, { type: "combatAction", action: "jump" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after quick recover");
    }

    const html = renderAppHtml(model);

    expect(html).toContain('data-player-motion="quick-recover"');
    expect(html).toContain('data-player-state="recovering"');
    expect(html).toContain('data-player-quick-recover-active="true"');
    expect(html).toContain('data-player-quick-recover-ready-until-ms=""');
    expect(html).toContain('data-player-quick-recover-started-at-ms="');
    expect(html).toContain('data-player-quick-recover-until-ms="');
    expect(html).toContain('class="combat-player-art actor-model actor-model-quick-recover"');
    expect(html).toContain('data-hotkey="C"');
  });

  it("casts airborne heavy slam from the jump lock with dedicated motion and impact hooks", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: selectBaseClass(createInitialState(), "liuli-blademage")
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player: {
          ...model.combatRun.player,
          x: 260,
          y: 340,
          facing: 1
        },
        enemies: model.combatRun.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 348, y: 340 },
                nextAttackAtMs: 9999
              }
            : enemy
        )
      }
    };

    model = reduceAppAction(model, { type: "combatAction", action: "jump" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    model = {
      ...model,
      combatRun: stepCombat(model.combatRun, {}, 180)
    };
    model = reduceAppAction(model, { type: "combatAction", action: "heavy" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    expect(model.combatRun.scheduledEnemyHitEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "heavy",
          applyAtMs: model.combatRun.elapsedMs + 120,
          hitPhase: "air-heavy-slam",
          vfxCue: "air-heavy-impact"
        })
      ])
    );

    model = {
      ...model,
      combatRun: stepCombat(model.combatRun, {}, 120)
    };

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const airHeavyHit = model.combatRun.events.find(
      (event): event is CombatHitEvent =>
        event.kind === "hit" && event.action === "heavy" && (event as { hitPhase?: string }).hitPhase === "air-heavy-slam"
    );
    const airHeavyHtml = renderAppHtml(model);

    expect(airHeavyHit).toMatchObject({
      inputToHitMs: 120,
      vfxCue: "air-heavy-impact",
      actionTags: expect.arrayContaining(["slam", "knockdown"])
    });
    expect(airHeavyHtml).toContain('data-player-motion="air-heavy"');
    expect(airHeavyHtml).toContain('data-player-air-state="jumping"');
    expect(airHeavyHtml).toContain('data-player-air-attack-used="true"');
    expect(airHeavyHtml).toContain('data-player-air-attack-type="heavy"');
    expect(airHeavyHtml).toContain('class="combat-player-art actor-model actor-model-air-heavy"');
    expect(airHeavyHtml).toContain('data-vfx-cue="air-heavy-impact"');
    expect(airHeavyHtml).toContain('hit-impact-air-heavy');
  });

  it("renders dash-light windup, weapon motion, target reaction, and impact VFX hooks", () => {
    let model = createAppModel({
      storage: new MemoryStorage()
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = {
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            player: {
              ...model.combatRun.player,
              x: 240,
              y: 340,
              facing: 1 as const,
              actionLockUntilMs: 0,
              hurtLockUntilMs: 0
            },
            enemies: model.combatRun.enemies.map((enemy, index) => ({
              ...enemy,
              hp: index === 0 ? 180 : 0,
              maxHp: 180,
              position: { x: 382, y: 340 },
              nextAttackAtMs: 9999,
              attackStartedAtMs: undefined,
              attackImpactAtMs: undefined,
              attackRecoverUntilMs: undefined,
              attackSkillId: undefined,
              attackHitResolved: undefined
            }))
          }
        : undefined
    };
    model = reduceAppAction(model, { type: "combatMove", moveX: 1, moveY: 0, dash: true });
    model = reduceAppAction(model, { type: "combatAction", action: "light" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after dash-light");
    }

    const [effect] = model.combatRun.scheduledEnemyHitEffects.filter((item) => item.hitPhase === "dash-light");
    expect(effect).toBeDefined();
    if (!effect) {
      return;
    }
    const castHtml = renderAppHtml(model);
    const beforeHitHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, effect.applyAtMs - 1)
    });
    const hitRun = stepToElapsed(model.combatRun, effect.applyAtMs);
    const hitHtml = renderAppHtml({
      ...model,
      combatRun: hitRun
    });

    expect(effect).toMatchObject({
      action: "light",
      skillId: "dash-light",
      hitPhase: "dash-light",
      vfxCue: "dash-light-slash"
    });
    expect(castHtml).toContain('data-player-motion="dash-light"');
    expect(castHtml).toContain('data-player-state="dash-attacking"');
    expect(castHtml).toContain('data-player-dash-attack-active="true"');
    expect(castHtml).toContain('data-player-skill-move="dash-light"');
    expect(castHtml).toContain('data-weapon-dash-action="light"');
    expect(castHtml).toContain('class="combat-player-art actor-model actor-model-dash-light"');
    expect(beforeHitHtml).not.toContain('data-vfx-cue="dash-light-slash"');
    expect(hitHtml).toContain('data-hit-phase="dash-light"');
    expect(hitHtml).toContain('data-vfx-cue="dash-light-slash"');
    expect(hitHtml).toContain('data-impact-dash-action="light"');
    expect(hitHtml).toContain('data-enemy-hit-dash-action="light"');
    expect(hitHtml).toContain('hit-impact-dash-light');
    expect(skillHitEvents(hitRun, "dash-light")).toHaveLength(1);
  });

  it("expires dash-light player motion at the action window instead of the generic recent-hit window", () => {
    let model = createAppModel({
      storage: new MemoryStorage()
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = {
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            player: {
              ...model.combatRun.player,
              x: 240,
              y: 340,
              facing: 1 as const,
              actionLockUntilMs: 0,
              hurtLockUntilMs: 0
            },
            enemies: model.combatRun.enemies.map((enemy, index) => ({
              ...enemy,
              hp: index === 0 ? 180 : 0,
              maxHp: 180,
              position: { x: 382, y: 340 },
              nextAttackAtMs: 9999
            }))
          }
        : undefined
    };
    model = reduceAppAction(model, { type: "combatMove", moveX: 1, moveY: 0, dash: true });
    model = reduceAppAction(model, { type: "combatAction", action: "light" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after dash-light");
    }

    const [effect] = model.combatRun.scheduledEnemyHitEffects.filter((item) => item.hitPhase === "dash-light");
    expect(effect).toBeDefined();
    if (!effect) {
      return;
    }

    const hitRun = stepToElapsed(model.combatRun, effect.applyAtMs);
    const expiredRun = stepToElapsed(hitRun, hitRun.player.dashAttackUntilMs + 1);
    const expiredHtml = renderAppHtml({
      ...model,
      combatRun: expiredRun
    });

    expect(skillHitEvents(hitRun, "dash-light")).toHaveLength(1);
    expect(expiredRun.elapsedMs).toBeGreaterThan(hitRun.player.dashAttackUntilMs);
    expect(expiredHtml).toContain('data-player-dash-attack-active="false"');
    expect(expiredHtml).not.toContain('data-player-motion="dash-light"');
    expect(expiredHtml).not.toContain('data-player-state="dash-attacking"');
  });

  it("renders player hit state over airborne light attack state when interrupted", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: selectBaseClass(createInitialState(), "liuli-blademage")
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const midair = stepCombat(performAction(model.combatRun, { type: "jump" }), {}, 180);
    const airWindup = performAction(midair, { type: "light" });
    const interruptedRun: CombatRun = {
      ...airWindup,
      player: {
        ...airWindup.player,
        hurtLockUntilMs: airWindup.elapsedMs + 320
      },
      events: [
        ...airWindup.events,
        {
          kind: "player-hit",
          id: "test-air-light-interrupt",
          enemyId: airWindup.enemies[0].id,
          skillId: "ash-ember-spit",
          damage: 1,
          occurredAtMs: airWindup.elapsedMs,
          hitstopMs: 60,
          feedbackCue: "player-hurt-light"
        } satisfies CombatPlayerHitEvent
      ]
    };
    const html = renderAppHtml({ ...model, combatRun: interruptedRun });

    expect(html).toContain('data-player-motion="hit"');
    expect(html).toContain('data-player-state="hit"');
    expect(html).toContain('class="combat-player-art actor-model actor-model-hit"');
  });

  it("filters combat skill hotkeys and settlement persistence by selected class resource", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 20)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    expect(combatActionForKeyCode(model.state, "KeyU", model.combatRun?.player.resource.current, false, model.combatRun)).toBeUndefined();

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const readyRun = {
      ...model.combatRun,
      player: {
        ...model.combatRun.player,
        resource: {
          ...model.combatRun.player.resource,
          current: 30
        }
      }
    };

    expect(combatActionForKeyCode(model.state, "KeyU", readyRun.player.resource.current, false, readyRun)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "liuli-rain"
    });

    model = {
      ...model,
      combatRun: readyRun
    };
    model = defeatCurrentRoom(model);

    const resourceBeforeSettlement = model.combatRun?.player.resource.current;
    const settled = walkThroughOpenGate(model);

    expect(resourceBeforeSettlement).toBeGreaterThan(20);
    expect(settled.state.player.heat).toBe(settled.combatRun?.player.resource.current);
    expect(settled.state.player.classResources?.["liuli-blademage"]).toBe(settled.combatRun?.player.resource.current);
  });

  it("preserves separate class resources across combat settlement and class swaps", () => {
    const liuliState = withClassResource(
      selectBaseClass(withClassResource(createInitialState(), "ember-warden", 64), "liuli-blademage"),
      "liuli-blademage",
      40
    );
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: liuliState
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    expect(renderAppHtml(model)).toContain('data-resource-current="40"');

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player: {
          ...model.combatRun.player,
          resource: {
            ...model.combatRun.player.resource,
            current: 52
          }
        }
      }
    };
    model = defeatCurrentRoom(model);

    const resourceBeforeSettlement = model.combatRun?.player.resource.current;
    const settled = walkThroughOpenGate(model);
    const emberAgain = selectBaseClass(settled.state, "ember-warden");

    expect(resourceBeforeSettlement).toBeGreaterThan(52);
    expect(settled.state.player.heat).toBe(resourceBeforeSettlement);
    expect(settled.state.player.classResources?.["liuli-blademage"]).toBe(resourceBeforeSettlement);
    expect(settled.state.player.classResources?.["ember-warden"]).toBe(64);
    expect(emberAgain.player.heat).toBe(64);
  });

  it("disables cooling skill buttons and filters cooling skill hotkeys", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "anvil-crash" });

    const coolingHtml = renderAppHtml(model);

    expect(coolingHtml).toContain('data-combat-skill-id="anvil-crash"');
    expect(coolingHtml).toContain('data-skill-cooldown-remaining="5200"');
    expect(coolingHtml).toContain('data-cooldown-state="cooling"');
    expect(coolingHtml).toContain("冷却 5.2s");
    expect(combatActionForKeyCode(model.state, "KeyU", model.combatRun?.player.heat, false, model.combatRun)).toBeUndefined();

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const readyRun = {
      ...model.combatRun,
      elapsedMs: model.combatRun.elapsedMs + 5300
    };
    const readyHtml = renderAppHtml({ ...model, combatRun: readyRun });

    expect(readyHtml).toContain('data-skill-cooldown-remaining="0"');
    expect(combatActionForKeyCode(model.state, "KeyU", readyRun.player.heat, false, readyRun)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "anvil-crash"
    });
  });

  it("renders anvil-crash player skill burst VFX after the hammer-drop frame", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "anvil-crash" });

    const castHtml = renderAppHtml(model);
    if (!model.combatRun) {
      throw new Error("Expected active combat run after anvil-crash");
    }

    const [slamAtMs] = scheduledSkillTimes(model.combatRun, "anvil-crash");
    const beforeSlamHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, slamAtMs - 1)
    });
    const slamRun = stepToElapsed(model.combatRun, slamAtMs);
    const html = renderAppHtml({
      ...model,
      combatRun: slamRun
    });
    const castSkillVfxStyle = playerSkillVfxStyleFor(castHtml, "anvil-crash");

    expect(castHtml).toContain('class="combat-vfx-layer"');
    expect(castHtml).toContain('class="combat-player-art actor-model actor-model-skill actor-skill-ember-anvil"');
    expect(castHtml).toContain('data-player-skill-vfx="anvil-crash"');
    expect(castSkillVfxStyle).toContain("--actor-x: 34.79%");
    expect(castSkillVfxStyle).not.toContain("--actor-x: 40.42%");
    expect(castHtml).not.toContain('data-damage-number="true"');
    expect(beforeSlamHtml).not.toContain('data-skill-impact-vfx="anvil-crash"');
    expect(html).toContain('class="enemy-art actor-model actor-model-knockdown"');
    expect(html).toContain('data-enemy-knockdown="true"');
    expect(html).toContain('data-player-skill-vfx="anvil-crash"');
    expect(html).toContain('data-hit-phase="anvil-slam"');
    expect(html).toContain('data-vfx-cue="anvil-crash-impact"');
    expect(html).toContain('data-impact-vfx-shape="anvil-sparks"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-anvil-sparks"');
    expect(html).toContain('data-vfx-action="skill"');
    expect(html).toContain('data-damage-number="true"');
  });

  it("renders skill-specific actor, weapon, and VFX metadata after casting a class skill", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "liuli-rain" });

    const html = renderAppHtml(model);

    expect(html).toContain('data-active-skill-id="liuli-rain"');
    expect(html).toContain('data-skill-animation-preset="liuli-rain"');
    expect(html).toContain('data-skill-weapon-arc="fan"');
    expect(html).toContain('data-skill-vfx-shape="glass-rain"');
    expect(html).toContain('class="combat-player-art actor-model actor-model-skill actor-skill-liuli-rain"');
    expect(html).toContain('class="combat-weapon weapon-layer weapon-layer-');
    expect(html).toContain('data-weapon-arc="fan"');
    expect(html).toContain('class="player-skill-vfx skill-vfx-liuli-rain skill-vfx-shape-glass-rain"');
    expect(html).toContain('data-player-skill-vfx="liuli-rain"');
    expect(html).toContain('data-vfx-anchor="front"');
  });

  it("renders prism-step as a path-piercing dash with target impact bursts", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 40)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          position: { x: player.x + 52 + index * 40, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "prism-step" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after prism-step");
    }

    const [impactAtMs] = scheduledSkillTimes(model.combatRun, "prism-step");
    const immediateStepHits = skillHitEvents(model.combatRun, "prism-step");
    const castHtml = renderAppHtml(model);
    const beforeImpactRun = stepCombat(model.combatRun, {}, 82);
    const beforeImpactHtml = renderAppHtml({
      ...model,
      combatRun: beforeImpactRun
    });
    const impactRun = stepToElapsed(model.combatRun, impactAtMs);
    const stepHits = skillHitEvents(impactRun, "prism-step");
    const hitFrameHtml = renderAppHtml({
      ...model,
      combatRun: impactRun
    });

    expect(model.combatRun.player.x).toBe(player.x);
    expect(impactAtMs).toBe(165);
    expect(beforeImpactRun.player.x).toBeGreaterThan(player.x);
    expect(beforeImpactRun.player.x).toBeLessThan(344);
    expect(immediateStepHits).toHaveLength(0);
    expect(stepHits).toHaveLength(2);
    expect(castHtml).toContain('data-player-skill-move="prism-step"');
    expect(beforeImpactHtml).toContain('data-player-skill-move="prism-step"');
    expect(beforeImpactHtml).not.toContain('data-skill-impact-vfx="prism-step"');
    expect(hitFrameHtml).toContain('data-active-skill-id="prism-step"');
    expect(hitFrameHtml).toContain('data-skill-animation-preset="liuli-step"');
    expect(hitFrameHtml).toContain('data-skill-weapon-arc="prism-dash"');
    expect(hitFrameHtml).toContain('data-skill-vfx-shape="prism-afterimage"');
    expect(hitFrameHtml).toContain('data-player-trail="skill"');
    expect(hitFrameHtml).toContain('data-vfx-cue="prism-pierce"');
    expect(hitFrameHtml).toContain('class="skill-impact-burst skill-impact-shape-prism-afterimage"');
    expect(countOccurrences(hitFrameHtml, 'data-skill-impact-vfx="prism-step"')).toBe(2);
  });

  it("renders furnace-step as a timed shoulder rush with target-bound furnace impact", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x + 70 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "furnace-step" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after furnace-step");
    }

    const [impactAtMs] = scheduledSkillTimes(model.combatRun, "furnace-step");
    const castHtml = renderAppHtml(model);
    const beforeImpactRun = stepToElapsed(model.combatRun, impactAtMs - 1);
    const beforeImpactHtml = renderAppHtml({
      ...model,
      combatRun: beforeImpactRun
    });
    const impactRun = stepToElapsed(model.combatRun, impactAtMs);
    const impactHtml = renderAppHtml({
      ...model,
      combatRun: impactRun
    });

    expect(model.combatRun.player.x).toBe(player.x);
    expect(beforeImpactRun.player.x).toBeGreaterThan(player.x);
    expect(skillHitEvents(impactRun, "furnace-step")).toHaveLength(1);
    expect(castHtml).toContain('data-active-skill-id="furnace-step"');
    expect(castHtml).toContain('data-skill-animation-preset="ember-shoulder"');
    expect(castHtml).toContain('data-skill-weapon-arc="dash-burst"');
    expect(castHtml).toContain('data-skill-vfx-shape="furnace-trail"');
    expect(castHtml).toContain('data-player-skill-move="furnace-step"');
    expect(beforeImpactHtml).not.toContain('data-skill-impact-vfx="furnace-step"');
    expect(impactHtml).toContain('data-hit-phase="shoulder-impact"');
    expect(impactHtml).toContain('data-vfx-cue="furnace-shoulder-impact"');
    expect(impactHtml).toContain('class="skill-impact-burst skill-impact-shape-furnace-trail"');
    expect(countOccurrences(impactHtml, 'data-skill-impact-vfx="furnace-step"')).toBe(1);
  });

  it("renders spark-combo as a timed three-stage ember chain with target sparks", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: createInitialState()
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x + 64 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "spark-combo" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after spark-combo");
    }

    const [jabAtMs, crossAtMs, finishAtMs] = scheduledSkillTimes(model.combatRun, "spark-combo");
    const castHtml = renderAppHtml(model);
    const beforeJabRun = stepToElapsed(model.combatRun, jabAtMs - 1);
    const beforeJabHtml = renderAppHtml({
      ...model,
      combatRun: beforeJabRun
    });
    const jabRun = stepToElapsed(model.combatRun, jabAtMs);
    const jabHtml = renderAppHtml({
      ...model,
      combatRun: jabRun
    });
    const finishRun = stepToElapsed(jabRun, finishAtMs);
    const finishHtml = renderAppHtml({
      ...model,
      combatRun: finishRun
    });

    expect(model.combatRun.player.x).toBe(player.x);
    expect(beforeJabRun.player.x).toBeGreaterThan(player.x);
    expect([jabAtMs, crossAtMs, finishAtMs]).toEqual([120, 220, 320]);
    expect(skillHitEvents(model.combatRun, "spark-combo")).toHaveLength(0);
    expect(skillHitEvents(jabRun, "spark-combo")).toHaveLength(1);
    expect(skillHitEvents(finishRun, "spark-combo").map((event) => event.hitPhase)).toEqual([
      "spark-jab",
      "spark-cross",
      "spark-finish"
    ]);
    expect(castHtml).toContain('data-active-skill-id="spark-combo"');
    expect(castHtml).toContain('data-skill-animation-preset="ember-combo"');
    expect(castHtml).toContain('data-skill-weapon-arc="jab-chain"');
    expect(castHtml).toContain('data-skill-vfx-shape="ember-sparks"');
    expect(castHtml).toContain('data-player-skill-stage="windup"');
    expect(castHtml).toContain(`data-player-skill-hit-at-ms="${jabAtMs}"`);
    expect(castHtml).toContain('data-player-skill-stage-progress="0"');
    expect(castHtml).toContain('data-player-skill-stage-duration-ms="420"');
    expect(castHtml).toContain('data-player-skill-move="spark-combo"');
    expect(beforeJabHtml).toContain('data-player-skill-stage="windup"');
    expect(beforeJabHtml).toContain('data-player-skill-stage-progress="99"');
    expect(beforeJabHtml).not.toContain('data-skill-impact-vfx="spark-combo"');
    expect(jabHtml).toContain('data-player-skill-stage="active"');
    expect(jabHtml).toContain('data-player-skill-stage-progress="100"');
    expect(jabHtml).toContain('data-hit-phase="spark-jab"');
    expect(jabHtml).toContain('data-vfx-cue="ember-spark-jab"');
    expect(jabHtml).toContain('--skill-duration: 260ms;');
    expect(finishHtml).toContain('data-hit-phase="spark-finish"');
    expect(finishHtml).toContain('data-vfx-cue="ember-spark-finish"');
    expect(finishHtml).toContain('data-impact-vfx-shape="ember-sparks"');
    expect(finishHtml).toContain('class="skill-impact-burst skill-impact-shape-ember-sparks"');
    expect(countOccurrences(finishHtml, 'data-skill-impact-vfx="spark-combo"')).toBe(3);
  });

  it("renders iron-palm as a timed shield jab with target iron sparks", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: selectBaseClass(createInitialState(), "iron-forge-guardian")
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 190,
          maxHp: 190,
          position: { x: player.x + 78 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "iron-palm" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after iron-palm");
    }

    const [jabAtMs] = scheduledSkillTimes(model.combatRun, "iron-palm");
    const castHtml = renderAppHtml(model);
    const beforeJabRun = stepToElapsed(model.combatRun, jabAtMs - 1);
    const beforeJabHtml = renderAppHtml({
      ...model,
      combatRun: beforeJabRun
    });
    const hitRun = stepToElapsed(model.combatRun, jabAtMs);
    const hitHtml = renderAppHtml({
      ...model,
      combatRun: hitRun
    });

    expect(model.combatRun.player.x).toBe(player.x);
    expect(beforeJabRun.player.x).toBeGreaterThan(player.x);
    expect(skillHitEvents(model.combatRun, "iron-palm")).toHaveLength(0);
    expect(skillHitEvents(hitRun, "iron-palm")).toHaveLength(1);
    expect(castHtml).toContain('data-active-skill-id="iron-palm"');
    expect(castHtml).toContain('data-skill-animation-preset="iron-palm"');
    expect(castHtml).toContain('data-skill-weapon-arc="shield-jab"');
    expect(castHtml).toContain('data-skill-vfx-shape="iron-spark"');
    expect(castHtml).toContain('data-player-skill-move="iron-palm"');
    expect(beforeJabHtml).not.toContain('data-skill-impact-vfx="iron-palm"');
    expect(hitHtml).toContain('data-hit-phase="shield-jab"');
    expect(hitHtml).toContain('data-vfx-cue="iron-shield-jab"');
    expect(hitHtml).toContain('data-impact-vfx-shape="iron-spark"');
    expect(hitHtml).toContain('class="skill-impact-burst skill-impact-shape-iron-spark"');
    expect(countOccurrences(hitHtml, 'data-skill-impact-vfx="iron-palm"')).toBe(1);
  });

  it("renders furnace-taunt as a delayed roar control field with target bursts", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 90)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 210,
          maxHp: 210,
          armor: 0,
          position: { x: index === 0 ? 330 : 390, y: player.y + index * 12 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "furnace-taunt" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after furnace-taunt");
    }

    const [roarAtMs] = scheduledSkillTimes(model.combatRun, "furnace-taunt");
    const castHtml = renderAppHtml(model);
    const beforeRoarRun = stepToElapsed(model.combatRun, roarAtMs - 1);
    const beforeRoarHtml = renderAppHtml({
      ...model,
      combatRun: beforeRoarRun
    });
    const roarRun = stepToElapsed(model.combatRun, roarAtMs);
    const roarHtml = renderAppHtml({
      ...model,
      combatRun: roarRun
    });

    expect(model.combatRun.player.x).toBe(player.x);
    expect(beforeRoarRun.player.x).toBeGreaterThan(player.x);
    expect(skillHitEvents(model.combatRun, "furnace-taunt")).toHaveLength(0);
    expect(skillHitEvents(roarRun, "furnace-taunt")).toHaveLength(2);
    expect(castHtml).toContain('data-active-skill-id="furnace-taunt"');
    expect(castHtml).toContain('data-skill-animation-preset="iron-taunt"');
    expect(castHtml).toContain('data-skill-weapon-arc="taunt-ring"');
    expect(castHtml).toContain('data-skill-vfx-shape="furnace-roar"');
    expect(castHtml).toContain('data-player-skill-move="furnace-taunt"');
    expect(beforeRoarHtml).not.toContain('data-skill-impact-vfx="furnace-taunt"');
    expect(roarHtml).toContain('data-hit-phase="furnace-roar"');
    expect(roarHtml).toContain('data-vfx-cue="furnace-roar-impact"');
    expect(roarHtml).toContain('data-impact-vfx-shape="furnace-roar"');
    expect(roarHtml).toContain('data-control-state="controlled"');
    expect(roarHtml).toContain('class="skill-impact-burst skill-impact-shape-furnace-roar"');
    expect(countOccurrences(roarHtml, 'data-skill-impact-vfx="furnace-taunt"')).toBe(2);
  });

  it("renders shield-quake as a delayed area slam with quake impact bursts", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 90)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 220,
          maxHp: 220,
          armor: 0,
          position: { x: index === 0 ? 320 : 390, y: player.y + index * 12 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "shield-quake" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after shield-quake");
    }

    const [quakeAtMs] = scheduledSkillTimes(model.combatRun, "shield-quake");
    const castHtml = renderAppHtml(model);
    const beforeQuakeRun = stepToElapsed(model.combatRun, quakeAtMs - 1);
    const beforeQuakeHtml = renderAppHtml({
      ...model,
      combatRun: beforeQuakeRun
    });
    const hitRun = stepToElapsed(model.combatRun, quakeAtMs);
    const hitHtml = renderAppHtml({
      ...model,
      combatRun: hitRun
    });

    expect(model.combatRun.player.x).toBe(player.x);
    expect(beforeQuakeRun.player.x).toBeGreaterThan(player.x);
    expect(skillHitEvents(model.combatRun, "shield-quake")).toHaveLength(0);
    expect(skillHitEvents(hitRun, "shield-quake")).toHaveLength(2);
    expect(castHtml).toContain('data-active-skill-id="shield-quake"');
    expect(castHtml).toContain('data-skill-animation-preset="iron-quake"');
    expect(castHtml).toContain('data-skill-weapon-arc="shield-slam"');
    expect(castHtml).toContain('data-skill-vfx-shape="shield-quake"');
    expect(castHtml).toContain('data-player-skill-move="shield-quake"');
    expect(beforeQuakeHtml).not.toContain('data-skill-impact-vfx="shield-quake"');
    expect(hitHtml).toContain('data-hit-phase="shield-quake"');
    expect(hitHtml).toContain('data-vfx-cue="shield-quake-impact"');
    expect(hitHtml).toContain('data-impact-vfx-shape="shield-quake"');
    expect(hitHtml).toContain('class="skill-impact-burst skill-impact-shape-shield-quake"');
    expect(countOccurrences(hitHtml, 'data-skill-impact-vfx="shield-quake"')).toBe(2);
  });

  it("renders cinder-uppercut as a timed forward launcher with flame-column impact", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x + 64 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "cinder-uppercut" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after cinder-uppercut");
    }

    const [uppercutAtMs] = scheduledSkillTimes(model.combatRun, "cinder-uppercut");
    const castHtml = renderAppHtml(model);
    const beforeHitRun = stepToElapsed(model.combatRun, uppercutAtMs - 1);
    const beforeHitHtml = renderAppHtml({
      ...model,
      combatRun: beforeHitRun
    });
    const hitRun = stepToElapsed(model.combatRun, uppercutAtMs);
    const hitHtml = renderAppHtml({
      ...model,
      combatRun: hitRun
    });
    const castVfxStyle = playerSkillVfxStyleFor(castHtml, "cinder-uppercut");

    expect(model.combatRun.player.x).toBe(player.x);
    expect(beforeHitRun.player.x).toBeGreaterThan(player.x);
    expect(skillHitEvents(model.combatRun, "cinder-uppercut")).toHaveLength(0);
    expect(skillHitEvents(hitRun, "cinder-uppercut")).toHaveLength(1);
    expect(castHtml).toContain('data-active-skill-id="cinder-uppercut"');
    expect(castHtml).toContain('data-skill-animation-preset="ember-uppercut"');
    expect(castHtml).toContain('data-skill-weapon-arc="uppercut"');
    expect(castHtml).toContain('data-skill-vfx-shape="flame-column"');
    expect(castHtml).toContain('data-player-skill-move="cinder-uppercut"');
    expect(castVfxStyle).toContain("--actor-x: 31.67%");
    expect(castVfxStyle).not.toContain("--actor-x: 38.33%");
    expect(beforeHitHtml).not.toContain('data-skill-impact-vfx="cinder-uppercut"');
    expect(hitHtml).toContain('data-hit-phase="uppercut"');
    expect(hitHtml).toContain('data-vfx-cue="cinder-uppercut-rise"');
    expect(hitHtml).toContain('data-impact-vfx-shape="flame-column"');
    expect(hitHtml).toContain('class="skill-impact-burst skill-impact-shape-flame-column"');
    expect(hitHtml).toContain('data-enemy-airborne="true"');
    expect(hitHtml).toContain('data-airborne-state="airborne"');
    expect(countOccurrences(hitHtml, 'data-skill-impact-vfx="cinder-uppercut"')).toBe(1);
  });

  it("renders shadow-roll as a backward roll with delayed roll-shot impact", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: selectBaseClass(createInitialState(), "ink-shadow-ranger")
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 360,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x - 20 + index * 140, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "shadow-roll" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after shadow-roll");
    }

    const [shotAtMs] = scheduledSkillTimes(model.combatRun, "shadow-roll");
    const castHtml = renderAppHtml(model);
    const beforeShotRun = stepToElapsed(model.combatRun, shotAtMs - 1);
    const beforeShotHtml = renderAppHtml({
      ...model,
      combatRun: beforeShotRun
    });
    const shotRun = stepToElapsed(model.combatRun, shotAtMs);
    const shotHtml = renderAppHtml({
      ...model,
      combatRun: shotRun
    });

    expect(model.combatRun.player.x).toBe(player.x);
    expect(beforeShotRun.player.x).toBeLessThan(player.x);
    expect(skillHitEvents(shotRun, "shadow-roll")).toHaveLength(1);
    expect(castHtml).toContain('data-active-skill-id="shadow-roll"');
    expect(castHtml).toContain('data-skill-animation-preset="ink-roll"');
    expect(castHtml).toContain('data-skill-weapon-arc="roll-shot"');
    expect(castHtml).toContain('data-skill-vfx-shape="shadow-smoke"');
    expect(castHtml).toContain('data-player-skill-move="shadow-roll"');
    expect(beforeShotHtml).not.toContain('data-skill-impact-vfx="shadow-roll"');
    expect(shotHtml).toContain('data-hit-phase="roll-shot"');
    expect(shotHtml).toContain('data-vfx-cue="shadow-roll-shot"');
    expect(shotHtml).toContain('class="skill-impact-burst skill-impact-shape-shadow-smoke"');
    expect(countOccurrences(shotHtml, 'data-skill-impact-vfx="shadow-roll"')).toBe(1);
  });

  it("renders ink-shot as a delayed crossbow bolt with dedicated impact metadata", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: selectBaseClass(createInitialState(), "ink-shadow-ranger")
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x + 280 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "ink-shot" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after ink-shot");
    }

    const [boltAtMs] = scheduledSkillTimes(model.combatRun, "ink-shot");
    const castHtml = renderAppHtml(model);
    const beforeBoltHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, boltAtMs - 1)
    });
    const hitRun = stepToElapsed(model.combatRun, boltAtMs);
    const hitHtml = renderAppHtml({
      ...model,
      combatRun: hitRun
    });

    expect(model.combatRun.player.x).toBe(player.x);
    expect(skillHitEvents(model.combatRun, "ink-shot")).toHaveLength(0);
    expect(castHtml).toContain('data-active-skill-id="ink-shot"');
    expect(castHtml).toContain('data-skill-animation-preset="ink-shot"');
    expect(castHtml).toContain('data-skill-weapon-arc="crossbow-shot"');
    expect(castHtml).toContain('data-skill-vfx-shape="ink-bolt"');
    expect(castHtml).toContain('data-player-skill-move="ink-shot"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-ink-shot skill-vfx-shape-ink-bolt"');
    expect(beforeBoltHtml).not.toContain('data-skill-impact-vfx="ink-shot"');
    expect(skillHitEvents(hitRun, "ink-shot")).toHaveLength(1);
    expect(hitHtml).toContain('data-hit-phase="ink-bolt"');
    expect(hitHtml).toContain('data-vfx-cue="ink-shot-pierce"');
    expect(hitHtml).toContain('data-impact-vfx-shape="ink-bolt"');
    expect(hitHtml).toContain('class="skill-impact-burst skill-impact-shape-ink-bolt"');
    expect(countOccurrences(hitHtml, 'data-skill-impact-vfx="ink-shot"')).toBe(1);
  });

  it("renders glass-cut as a timed Liuli slash with glass impact metadata", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: selectBaseClass(createInitialState(), "liuli-blademage")
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x + 66 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "glass-cut" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after glass-cut");
    }

    const [slashAtMs] = scheduledSkillTimes(model.combatRun, "glass-cut");
    const castHtml = renderAppHtml(model);
    const beforeSlashRun = stepToElapsed(model.combatRun, slashAtMs - 1);
    const beforeSlashHtml = renderAppHtml({
      ...model,
      combatRun: beforeSlashRun
    });
    const hitRun = stepToElapsed(model.combatRun, slashAtMs);
    const hitHtml = renderAppHtml({
      ...model,
      combatRun: hitRun
    });

    expect(model.combatRun.player.x).toBe(player.x);
    expect(beforeSlashRun.player.x).toBeGreaterThan(player.x);
    expect(skillHitEvents(model.combatRun, "glass-cut")).toHaveLength(0);
    expect(skillHitEvents(hitRun, "glass-cut")).toHaveLength(1);
    expect(castHtml).toContain('data-active-skill-id="glass-cut"');
    expect(castHtml).toContain('data-skill-animation-preset="liuli-cut"');
    expect(castHtml).toContain('data-skill-weapon-arc="glass-slash"');
    expect(castHtml).toContain('data-skill-vfx-shape="glass-slash"');
    expect(castHtml).toContain('data-player-skill-move="glass-cut"');
    expect(beforeSlashHtml).not.toContain('data-skill-impact-vfx="glass-cut"');
    expect(hitHtml).toContain('data-hit-phase="glass-cut"');
    expect(hitHtml).toContain('data-vfx-cue="glass-slash-cut"');
    expect(hitHtml).toContain('data-impact-vfx-shape="glass-slash"');
    expect(hitHtml).toContain('class="skill-impact-burst skill-impact-shape-glass-slash"');
    expect(countOccurrences(hitHtml, 'data-skill-impact-vfx="glass-cut"')).toBe(1);
  });

  it("renders mirror-arc as a delayed parry window with mirror slash and counter VFX", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 220,
          maxHp: 220,
          position: { x: player.x + 86 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "mirror-arc" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after mirror-arc");
    }

    const [slashAtMs] = scheduledSkillTimes(model.combatRun, "mirror-arc");
    const castHtml = renderAppHtml(model);
    const activeRun = stepToElapsed(model.combatRun, 90);
    const activeHtml = renderAppHtml({
      ...model,
      combatRun: activeRun
    });
    const beforeSlashHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, slashAtMs - 1)
    });
    const slashRun = stepToElapsed(model.combatRun, slashAtMs);
    const slashHtml = renderAppHtml({
      ...model,
      combatRun: slashRun
    });

    expect(skillHitEvents(model.combatRun, "mirror-arc")).toHaveLength(0);
    expect(castHtml).toContain('data-active-skill-id="mirror-arc"');
    expect(castHtml).toContain('data-reflect-active="false"');
    expect(castHtml).toContain('data-player-motion="skill"');
    expect(castHtml).toContain('data-skill-animation-preset="liuli-mirror"');
    expect(castHtml).toContain('data-skill-weapon-arc="mirror-parry"');
    expect(castHtml).toContain('data-skill-vfx-shape="mirror-arc"');
    expect(castHtml).toContain('data-player-skill-move="mirror-arc"');
    expect(activeHtml).toContain('data-reflect-active="true"');
    expect(activeHtml).toContain('data-player-motion="counter"');
    expect(beforeSlashHtml).not.toContain('data-skill-impact-vfx="mirror-arc"');
    expect(slashHtml).toContain('data-hit-phase="mirror-arc"');
    expect(slashHtml).toContain('data-vfx-cue="mirror-arc-slash"');
    expect(slashHtml).toContain('data-impact-vfx-shape="mirror-arc"');
    expect(slashHtml).toContain('class="skill-impact-burst skill-impact-shape-mirror-arc"');
    expect(countOccurrences(slashHtml, 'data-skill-impact-vfx="mirror-arc"')).toBe(1);
  });

  it("renders glass-lotus as delayed bind and bloom VFX instead of cast-frame damage", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 220,
          maxHp: 220,
          position: { x: player.x + 76 + index * 80, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "glass-lotus" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after glass-lotus");
    }

    const [bindAtMs, bloomAtMs] = scheduledSkillTimes(model.combatRun, "glass-lotus");
    const castHtml = renderAppHtml(model);
    const beforeBindHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, bindAtMs - 1)
    });
    const bindRun = stepToElapsed(model.combatRun, bindAtMs);
    const bindHtml = renderAppHtml({
      ...model,
      combatRun: bindRun
    });
    const bloomRun = stepToElapsed(model.combatRun, bloomAtMs);
    const bloomHtml = renderAppHtml({
      ...model,
      combatRun: bloomRun
    });

    expect(skillHitEvents(model.combatRun, "glass-lotus")).toHaveLength(0);
    expect(skillHitEvents(bindRun, "glass-lotus").filter((event) => event.hitPhase === "lotus-bind")).toHaveLength(2);
    expect(skillHitEvents(bloomRun, "glass-lotus").filter((event) => event.hitPhase === "lotus-bloom")).toHaveLength(2);
    expect(castHtml).toContain('data-active-skill-id="glass-lotus"');
    expect(castHtml).toContain('data-skill-animation-preset="liuli-lotus"');
    expect(castHtml).toContain('data-skill-weapon-arc="lotus-bloom"');
    expect(castHtml).toContain('data-skill-vfx-shape="glass-lotus"');
    expect(castHtml).toContain('data-player-skill-move="glass-lotus"');
    expect(beforeBindHtml).not.toContain('data-skill-impact-vfx="glass-lotus"');
    expect(bindHtml).toContain('data-hit-phase="lotus-bind"');
    expect(bindHtml).toContain('data-vfx-cue="glass-lotus-bind"');
    expect(bindHtml).toContain('data-impact-vfx-shape="glass-lotus"');
    expect(bindHtml).toContain('class="skill-impact-burst skill-impact-shape-glass-lotus"');
    expect(countSkillImpactBursts(bindHtml, "glass-lotus-bind")).toBe(2);
    expect(bloomHtml).toContain('data-hit-phase="lotus-bloom"');
    expect(bloomHtml).toContain('data-vfx-cue="glass-lotus-bloom"');
    expect(countSkillImpactBursts(bloomHtml, "glass-lotus-bloom")).toBe(2);
  });

  it("renders mirrorflame-burst as delayed lock and burst VFX instead of cast-frame damage", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: [
          {
            ...model.combatRun.enemies[0],
            hp: 260,
            maxHp: 260,
            armor: 20,
            position: { x: 330, y: 340 },
            nextAttackAtMs: 9999
          },
          {
            ...model.combatRun.enemies[1],
            hp: 260,
            maxHp: 260,
            armor: 20,
            position: { x: 410, y: 352 },
            nextAttackAtMs: 9999
          },
          {
            ...model.combatRun.enemies[0],
            id: "test-mirrorflame-third",
            hp: 260,
            maxHp: 260,
            armor: 20,
            position: { x: 492, y: 332 },
            nextAttackAtMs: 9999
          }
        ]
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "mirrorflame-burst" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after mirrorflame-burst");
    }

    const [lockAtMs, burstAtMs] = scheduledSkillTimes(model.combatRun, "mirrorflame-burst");
    const castHtml = renderAppHtml(model);
    const beforeLockHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, lockAtMs - 1)
    });
    const lockRun = stepToElapsed(model.combatRun, lockAtMs);
    const lockHtml = renderAppHtml({
      ...model,
      combatRun: lockRun
    });
    const burstRun = stepToElapsed(model.combatRun, burstAtMs);
    const burstHtml = renderAppHtml({
      ...model,
      combatRun: burstRun
    });

    expect(skillHitEvents(model.combatRun, "mirrorflame-burst")).toHaveLength(0);
    expect(skillHitEvents(lockRun, "mirrorflame-burst").filter((event) => event.hitPhase === "mirrorflame-lock")).toHaveLength(3);
    expect(skillHitEvents(burstRun, "mirrorflame-burst").filter((event) => event.hitPhase === "mirrorflame-burst")).toHaveLength(3);
    expect(castHtml).toContain('data-active-skill-id="mirrorflame-burst"');
    expect(castHtml).toContain('data-skill-animation-preset="liuli-mirrorflame"');
    expect(castHtml).toContain('data-skill-weapon-arc="mirrorflame-fan"');
    expect(castHtml).toContain('data-skill-vfx-shape="mirrorflame-burst"');
    expect(castHtml).toContain('data-player-skill-move="mirrorflame-burst"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-mirrorflame-burst skill-vfx-shape-mirrorflame-burst"');
    expect(beforeLockHtml).not.toContain('data-skill-impact-vfx="mirrorflame-burst"');
    expect(lockHtml).toContain('data-hit-phase="mirrorflame-lock"');
    expect(lockHtml).toContain('data-vfx-cue="mirrorflame-lock"');
    expect(lockHtml).toContain('data-impact-vfx-shape="mirrorflame-burst"');
    expect(lockHtml).toContain('class="skill-impact-burst skill-impact-shape-mirrorflame-burst"');
    expect(countSkillImpactBursts(lockHtml, "mirrorflame-lock")).toBe(3);
    expect(burstHtml).toContain('data-hit-phase="mirrorflame-burst"');
    expect(burstHtml).toContain('data-vfx-cue="mirrorflame-burst"');
    expect(countSkillImpactBursts(burstHtml, "mirrorflame-burst")).toBe(3);
  });

  it("keeps ink-shot bolt VFX anchored to the cast origin after the player moves", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: selectBaseClass(createInitialState(), "ink-shadow-ranger")
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x + 280 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "ink-shot" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after ink-shot");
    }

    const [boltAtMs] = scheduledSkillTimes(model.combatRun, "ink-shot");
    const hitRun = stepToElapsed(model.combatRun, boltAtMs);
    const driftedHtml = renderAppHtml({
      ...model,
      combatRun: {
        ...hitRun,
        elapsedMs: boltAtMs + 90,
        player: {
          ...hitRun.player,
          x: 420
        }
      }
    });
    const driftedStyle = playerSkillVfxStyleFor(driftedHtml, "ink-shot");

    expect(driftedHtml).toContain('data-player-skill-vfx="ink-shot"');
    expect(driftedStyle).toContain("--actor-x: 38.33%");
    expect(driftedStyle).not.toContain("--actor-x: 57.08%");
  });

  it("renders heat-bloom as a delayed pull and eruption field", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 220,
          maxHp: 220,
          position: { x: index === 0 ? 315 : 390, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "heat-bloom" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after heat-bloom");
    }

    const [drawAtMs, eruptAtMs] = scheduledSkillTimes(model.combatRun, "heat-bloom");
    const castHtml = renderAppHtml(model);
    const beforeDrawHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, drawAtMs - 1)
    });
    const drawHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, drawAtMs)
    });
    const eruptionRun = stepToElapsed(model.combatRun, eruptAtMs);
    const eruptionHtml = renderAppHtml({
      ...model,
      combatRun: eruptionRun
    });
    const driftedEruptionHtml = renderAppHtml({
      ...model,
      combatRun: {
        ...eruptionRun,
        player: {
          ...eruptionRun.player,
          x: 120
        }
      }
    });
    const driftedHeatBloomStyle = playerSkillVfxStyleFor(driftedEruptionHtml, "heat-bloom");

    expect(skillHitEvents(model.combatRun, "heat-bloom")).toHaveLength(0);
    expect(castHtml).toContain('data-active-skill-id="heat-bloom"');
    expect(castHtml).toContain('data-skill-animation-preset="ember-bloom"');
    expect(castHtml).toContain('data-skill-weapon-arc="pull-bloom"');
    expect(castHtml).toContain('data-skill-vfx-shape="heat-bloom"');
    expect(castHtml).toContain('data-player-skill-move="heat-bloom"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-heat-bloom skill-vfx-shape-heat-bloom"');
    expect(beforeDrawHtml).not.toContain('data-skill-impact-vfx="heat-bloom"');
    expect(drawHtml).toContain('data-hit-phase="heat-draw"');
    expect(drawHtml).toContain('data-vfx-cue="heat-bloom-draw"');
    expect(countOccurrences(drawHtml, 'data-skill-impact-vfx="heat-bloom"')).toBe(2);
    expect(eruptionHtml).toContain('data-hit-phase="heat-eruption"');
    expect(eruptionHtml).toContain('data-vfx-cue="heat-bloom-eruption"');
    expect(eruptionHtml).toContain('class="skill-impact-burst skill-impact-shape-heat-bloom"');
    expect(countOccurrences(eruptionHtml, 'data-skill-impact-vfx="heat-bloom"')).toBe(4);
    expect(skillHitEvents(eruptionRun, "heat-bloom")).toHaveLength(4);
    expect(driftedHeatBloomStyle).toContain("--actor-x: 36.67%");
    expect(driftedHeatBloomStyle).not.toContain("--actor-x: 24.17%");
  });

  it("renders furnace-heart-overdrive as a staged self-centered core release", () => {
    const advancedState = advanceClass(
      readyForAdvancement(withHeat(createInitialState(), 100)),
      "ember-furnace-master"
    );
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: advancedState
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 320,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 240,
          maxHp: 240,
          armor: 18,
          position: { x: index === 0 ? player.x - 82 : player.x + 100, y: player.y + index * 10 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "furnace-heart-overdrive" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after furnace-heart-overdrive");
    }

    const [pulseAtMs, releaseAtMs] = scheduledSkillTimes(model.combatRun, "furnace-heart-overdrive");
    const castHtml = renderAppHtml(model);
    const beforePulseHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, pulseAtMs - 1)
    });
    const pulseHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, pulseAtMs)
    });
    const releaseRun = stepToElapsed(model.combatRun, releaseAtMs);
    const releaseHtml = renderAppHtml({
      ...model,
      combatRun: releaseRun
    });

    expect(skillHitEvents(model.combatRun, "furnace-heart-overdrive")).toHaveLength(0);
    expect(castHtml).toContain('data-advancement-id="ember-furnace-master"');
    expect(castHtml).toContain('data-active-skill-id="furnace-heart-overdrive"');
    expect(castHtml).toContain('data-skill-animation-preset="ember-overdrive"');
    expect(castHtml).toContain('data-skill-weapon-arc="core-overdrive"');
    expect(castHtml).toContain('data-skill-vfx-shape="overdrive-core"');
    expect(castHtml).toContain('data-player-skill-move="furnace-heart-overdrive"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-furnace-heart-overdrive skill-vfx-shape-overdrive-core"');
    expect(beforePulseHtml).not.toContain('data-skill-impact-vfx="furnace-heart-overdrive"');
    expect(pulseHtml).toContain('data-hit-phase="overdrive-pulse"');
    expect(pulseHtml).toContain('data-vfx-cue="overdrive-core-pulse"');
    expect(countOccurrences(pulseHtml, 'data-skill-impact-vfx="furnace-heart-overdrive"')).toBe(2);
    expect(releaseHtml).toContain('data-hitstop-active="true"');
    expect(releaseHtml).toContain('data-screen-shake="skill"');
    expect(releaseHtml).toContain('data-hit-phase="overdrive-release"');
    expect(releaseHtml).toContain('data-vfx-cue="overdrive-core-release"');
    expect(releaseHtml).toContain('data-impact-vfx-shape="overdrive-core"');
    expect(releaseHtml).toContain('class="skill-impact-burst skill-impact-shape-overdrive-core"');
    expect(countOccurrences(releaseHtml, 'data-skill-impact-vfx="furnace-heart-overdrive"')).toBe(4);
    expect(skillHitEvents(releaseRun, "furnace-heart-overdrive")).toHaveLength(4);
  });

  it("removes furnace-heart-overdrive cast VFX after enemy interruption", () => {
    const advancedState = advanceClass(
      readyForAdvancement(withHeat(createInitialState(), 100)),
      "ember-furnace-master"
    );
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: advancedState
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 320,
      y: 340,
      facing: 1 as const,
      hp: 500,
      maxHp: 500,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 240,
          maxHp: 240,
          position: { x: index === 0 ? player.x - 82 : player.x + 100, y: player.y + index * 10 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "furnace-heart-overdrive" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after furnace-heart-overdrive");
    }

    const interruptedRun = stepCombat(
      {
        ...model.combatRun,
        enemies: model.combatRun.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                attackSkillId: "ash-ember-spit" as const,
                attackStartedAtMs: 0,
                attackImpactAtMs: 220,
                attackRecoverUntilMs: 420,
                attackHitResolved: false,
                attackResolvedHits: 0
              }
            : enemy
        )
      },
      {},
      560
    );
    const interruptedHtml = renderAppHtml({
      ...model,
      combatRun: interruptedRun
    });

    expect(interruptedRun.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit"
        })
      ])
    );
    expect(skillHitEvents(interruptedRun, "furnace-heart-overdrive")).toHaveLength(0);
    expect(interruptedHtml).not.toContain('data-active-skill-id="furnace-heart-overdrive"');
    expect(interruptedHtml).not.toContain('data-player-skill-vfx="furnace-heart-overdrive"');
    expect(interruptedHtml).not.toContain('skill-vfx-furnace-heart-overdrive');
  });

  it("renders flowing-light-chain as a three-stage advancement chain slash", () => {
    const advancedState = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100)),
      "flowing-light-swordmaster"
    );
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: advancedState
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "flowing-light-chain" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after flowing-light-chain");
    }

    const [openAtMs, crossAtMs, finishAtMs] = scheduledSkillTimes(model.combatRun, "flowing-light-chain");
    const castHtml = renderAppHtml(model);
    const beforeOpenHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, openAtMs - 1)
    });
    const openHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, openAtMs)
    });
    const crossHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, crossAtMs)
    });
    const finishHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, finishAtMs)
    });
    const finishHits = skillHitEvents(stepToElapsed(model.combatRun, finishAtMs), "flowing-light-chain");

    expect(finishHits).toHaveLength(6);
    expect(castHtml).toContain('data-active-skill-id="flowing-light-chain"');
    expect(castHtml).toContain('data-skill-animation-preset="liuli-light-chain"');
    expect(castHtml).toContain('data-skill-weapon-arc="chain-cut"');
    expect(castHtml).toContain('data-skill-vfx-shape="flowing-chain"');
    expect(castHtml).toContain('data-player-skill-move="flowing-light-chain"');
    expect(beforeOpenHtml).not.toContain('data-skill-impact-vfx="flowing-light-chain"');
    expect(beforeOpenHtml).not.toContain('data-player-skill-hit-phase="chain-open"');
    expect(openHtml).toContain('data-hit-phase="chain-open"');
    expect(openHtml).toContain('data-vfx-cue="flowing-chain-open"');
    expect(openHtml).toContain('data-player-skill-hit-phase="chain-open"');
    expect(openHtml).toContain('data-player-skill-vfx-cue="flowing-chain-open"');
    expect(openHtml).toContain("actor-skill-phase-chain-open");
    expect(openHtml).toContain('data-weapon-hit-phase="chain-open"');
    expect(openHtml).toContain('data-weapon-vfx-cue="flowing-chain-open"');
    expect(crossHtml).toContain('data-hit-phase="chain-cross"');
    expect(crossHtml).toContain('data-vfx-cue="flowing-chain-cross"');
    expect(crossHtml).toContain('data-player-skill-hit-phase="chain-cross"');
    expect(crossHtml).toContain('data-player-skill-vfx-cue="flowing-chain-cross"');
    expect(crossHtml).toContain("actor-skill-phase-chain-cross");
    expect(crossHtml).toContain('data-weapon-hit-phase="chain-cross"');
    expect(crossHtml).toContain('data-weapon-vfx-cue="flowing-chain-cross"');
    expect(finishHtml).toContain('data-hit-phase="chain-finish"');
    expect(finishHtml).toContain('data-vfx-cue="flowing-chain-finish"');
    expect(finishHtml).toContain('data-player-skill-hit-phase="chain-finish"');
    expect(finishHtml).toContain('data-player-skill-vfx-cue="flowing-chain-finish"');
    expect(finishHtml).toContain("actor-skill-phase-chain-finish");
    expect(finishHtml).toContain('data-weapon-hit-phase="chain-finish"');
    expect(finishHtml).toContain('data-weapon-vfx-cue="flowing-chain-finish"');
    expect(finishHtml).toContain('class="skill-impact-burst skill-impact-shape-flowing-chain"');
    expect(countOccurrences(finishHtml, 'data-skill-impact-vfx="flowing-light-chain"')).toBe(6);
  });

  it("renders flowing-light-chain whiff as the real opening slash on player and weapon", () => {
    const advancedState = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100)),
      "flowing-light-swordmaster"
    );
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: advancedState
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);

    if (!model.combatRun) {
      throw new Error("Expected active combat run before flowing-light-chain whiff setup");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        enemies: model.combatRun.enemies.map((enemy, index) =>
          enemy.hp > 0
            ? {
                ...enemy,
                position: { x: 720 + index * 40, y: 430 },
                nextAttackAtMs: 9999
              }
            : enemy
        )
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "flowing-light-chain" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after flowing-light-chain whiff");
    }

    const [openAtMs] = scheduledSkillTimes(model.combatRun, "flowing-light-chain");
    const beforeOpenHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, openAtMs - 1)
    });
    const openHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, openAtMs)
    });

    expect(beforeOpenHtml).not.toContain('data-player-skill-hit-phase="chain-open"');
    expect(beforeOpenHtml).not.toContain('data-skill-impact-vfx="flowing-light-chain"');
    expect(openHtml).toContain('data-player-skill-hit-phase="chain-open"');
    expect(openHtml).toContain('data-player-skill-vfx-cue="flowing-chain-open"');
    expect(openHtml).toContain("actor-skill-phase-chain-open");
    expect(openHtml).toContain('data-weapon-hit-phase="chain-open"');
    expect(openHtml).toContain('data-weapon-vfx-cue="flowing-chain-open"');
    expect(openHtml).toContain('data-player-skill-vfx="flowing-light-chain"');
    expect(openHtml).toContain('data-player-skill-vfx="flowing-light-chain" data-skill-vfx-shape="flowing-chain"');
    expect(openHtml).toContain('data-hit-phase="chain-open" data-vfx-cue="flowing-chain-open" data-vfx-action="skill"');
    expect(openHtml).not.toContain('data-skill-impact-vfx="flowing-light-chain"');
  });

  it("renders per-target impact sparks, hitstop shake, and player motion trails for multi-target skills", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "liuli-rain" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const [firstWaveAtMs, , finalWaveAtMs] = scheduledSkillTimes(model.combatRun, "liuli-rain");
    const preHitHtml = renderAppHtml(model);
    const beforeWaveRun = stepToElapsed(model.combatRun, firstWaveAtMs - 1);
    const beforeWaveHtml = renderAppHtml({
      ...model,
      combatRun: beforeWaveRun
    });
    const firstWaveRun = stepToElapsed(model.combatRun, firstWaveAtMs);
    const firstWaveHtml = renderAppHtml({
      ...model,
      combatRun: firstWaveRun
    });
    const finalWaveRun = stepToElapsed(model.combatRun, finalWaveAtMs);
    const finalWaveHtml = renderAppHtml({
      ...model,
      combatRun: finalWaveRun
    });
    const rainHits = skillHitEvents(finalWaveRun, "liuli-rain");

    expect(rainHits).toHaveLength(6);
    expect(preHitHtml).toContain('data-hitstop-active="false"');
    expect(preHitHtml).toContain('data-screen-shake="none"');
    expect(preHitHtml).toContain('data-player-trail="skill"');
    expect(preHitHtml).toContain('data-trail-skill-preset="liuli-rain"');
    expect(preHitHtml).toContain('data-player-skill-move="liuli-rain"');
    expect(preHitHtml).toContain('data-player-skill-vfx="liuli-rain"');
    expect(preHitHtml).toContain("--skill-duration: 680ms;");
    expect(preHitHtml).not.toContain('data-impact-spark="true"');
    expect(beforeWaveHtml).not.toContain('data-impact-spark="true"');
    expect(firstWaveHtml).toContain('data-hitstop-active="true"');
    expect(firstWaveHtml).toContain('data-screen-shake="skill"');
    expect(countOccurrences(firstWaveHtml, 'data-impact-spark="true"')).toBe(2);
    expect(countOccurrences(firstWaveHtml, 'data-skill-impact-vfx="liuli-rain"')).toBe(2);
    expect(firstWaveHtml).toContain('data-hit-phase="rain-open"');
    expect(firstWaveHtml).toContain('data-vfx-cue="glass-rain-open"');
    expect(countSkillImpactBursts(firstWaveHtml, "glass-rain-open")).toBe(2);
    expect(finalWaveHtml).toContain('data-impact-vfx-shape="glass-rain"');
    expect(finalWaveHtml).toContain('data-vfx-cue="glass-rain-shatter"');
    expect(finalWaveHtml).toContain('data-hit-phase="rain-shatter"');
    expect(finalWaveHtml).toContain('class="skill-impact-burst skill-impact-shape-glass-rain"');
    expect(countOccurrences(finalWaveHtml, 'data-impact-spark="true"')).toBe(6);
    expect(countOccurrences(finalWaveHtml, 'data-damage-number="true"')).toBe(6);
    expect(countOccurrences(finalWaveHtml, 'data-skill-impact-vfx="liuli-rain"')).toBe(6);
    expect(countSkillImpactBursts(finalWaveHtml, "glass-rain-open")).toBe(2);
    expect(countSkillImpactBursts(finalWaveHtml, "glass-rain-fall")).toBe(2);
    expect(countSkillImpactBursts(finalWaveHtml, "glass-rain-shatter")).toBe(2);
  });

  it("renders skill-specific impact bursts on every target hit of a multi-hit skill", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "black-rain-volley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const [firstWaveAtMs, , finalWaveAtMs] = scheduledSkillTimes(model.combatRun, "black-rain-volley");
    const castHtml = renderAppHtml(model);
    const beforeWaveRun = stepToElapsed(model.combatRun, firstWaveAtMs - 1);
    const beforeWaveHtml = renderAppHtml({
      ...model,
      combatRun: beforeWaveRun
    });
    const firstWaveRun = stepToElapsed(model.combatRun, firstWaveAtMs);
    const firstWaveHits = skillHitEvents(firstWaveRun, "black-rain-volley");
    const targetIds = [...new Set(firstWaveHits.map((event) => event.targetId))];
    const firstWaveHtml = renderAppHtml({
      ...model,
      combatRun: firstWaveRun
    });
    const finalWaveRun = stepToElapsed(model.combatRun, finalWaveAtMs);
    const volleyHits = skillHitEvents(finalWaveRun, "black-rain-volley");
    const finalWaveHtml = renderAppHtml({
      ...model,
      combatRun: finalWaveRun
    });

    expect(skillHitEvents(model.combatRun, "black-rain-volley")).toHaveLength(0);
    expect(volleyHits).toHaveLength(6);
    expect(targetIds).toHaveLength(2);
    expect(castHtml).toContain('data-active-skill-id="black-rain-volley"');
    expect(castHtml).toContain('data-skill-animation-preset="ink-volley"');
    expect(castHtml).toContain('data-skill-weapon-arc="rain-volley"');
    expect(castHtml).toContain('data-skill-vfx-shape="black-rain"');
    expect(castHtml).toContain('data-player-skill-vfx="black-rain-volley"');
    expect(beforeWaveHtml).not.toContain('data-skill-impact-vfx="black-rain-volley"');
    expect(firstWaveHtml).toContain('data-hit-phase="black-rain-open"');
    expect(firstWaveHtml).toContain('data-vfx-cue="black-rain-open"');
    expect(countOccurrences(firstWaveHtml, 'data-skill-impact-vfx="black-rain-volley"')).toBe(2);
    expect(countOccurrences(finalWaveHtml, 'data-skill-impact-vfx="black-rain-volley"')).toBe(6);
    expect(finalWaveHtml).toContain('data-impact-vfx-shape="black-rain"');
    expect(finalWaveHtml).toContain('data-vfx-cue="black-rain-fall"');
    expect(finalWaveHtml).toContain('data-hit-phase="black-rain-burst"');
    expect(finalWaveHtml).toContain('data-vfx-cue="black-rain-burst"');
    expect(countSkillImpactBursts(finalWaveHtml, "black-rain-open")).toBe(2);
    expect(countSkillImpactBursts(finalWaveHtml, "black-rain-fall")).toBe(2);
    expect(countSkillImpactBursts(finalWaveHtml, "black-rain-burst")).toBe(2);
    expect(finalWaveHtml).toContain('class="skill-impact-burst skill-impact-shape-black-rain"');
    expect(finalWaveHtml).toContain(`data-impact-target-id="${targetIds[0]}"`);
    expect(finalWaveHtml).toContain(`data-impact-target-id="${targetIds[1]}"`);
  });

  it("renders ink-snare as delayed bind and snap target VFX", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "ink-snare" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const [bindAtMs, snapAtMs] = scheduledSkillTimes(model.combatRun, "ink-snare");
    const castHtml = renderAppHtml(model);
    const castVfxStyle = playerSkillVfxStyleFor(castHtml, "ink-snare");
    const beforeBindHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, bindAtMs - 1)
    });
    const snapRun = stepToElapsed(stepToElapsed(model.combatRun, bindAtMs), snapAtMs);
    const hits = skillHitEvents(snapRun, "ink-snare");
    const html = renderAppHtml({
      ...model,
      combatRun: snapRun
    });

    expect(skillHitEvents(model.combatRun, "ink-snare")).toHaveLength(0);
    expect(hits.map((event) => event.hitPhase)).toEqual(["trap-bind", "trap-bind", "trap-snap", "trap-snap"]);
    expect(castHtml).toContain('data-active-skill-id="ink-snare"');
    expect(castHtml).toContain('data-skill-animation-preset="ink-snare"');
    expect(castHtml).toContain('data-skill-weapon-arc="trap-cast"');
    expect(castHtml).toContain('data-skill-vfx-shape="ink-snare"');
    expect(castHtml).toContain('data-player-skill-vfx="ink-snare"');
    expect(castVfxStyle).toContain("--actor-x: 38.75%");
    expect(beforeBindHtml).not.toContain('data-skill-impact-vfx="ink-snare"');
    expect(countOccurrences(html, 'data-skill-impact-vfx="ink-snare"')).toBe(4);
    expect(html).toContain('data-impact-vfx-shape="ink-snare"');
    expect(html).toContain('data-hit-phase="trap-snap"');
    expect(html).toContain('data-vfx-cue="ink-snare-snap"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-ink-snare"');
    expect(html).toContain('data-enemy-motion="controlled"');
  });

  it("renders night-mark-detonation as staged marked-target bursts", () => {
    const advancedState = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 100)),
      "night-contract-hunter"
    );
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: advancedState
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = {
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            enemies: model.combatRun.enemies.map((enemy, index) => ({
              ...enemy,
              hp: 260,
              maxHp: 260,
              marks: index === 0 ? 3 : 2
            }))
          }
        : undefined
    };

    expect(combatActionForKeyCode(model.state, "Space", model.combatRun?.player.resource.current, false, model.combatRun)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "night-mark-detonation"
    });

    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "night-mark-detonation" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const [lockAtMs, finalBurstAtMs] = scheduledSkillTimes(model.combatRun, "night-mark-detonation");
    const immediateDetonationHits = skillHitEvents(model.combatRun, "night-mark-detonation");
    const castHtml = renderAppHtml(model);
    const beforeLockRun = stepToElapsed(model.combatRun, lockAtMs - 1);
    const beforeLockHtml = renderAppHtml({
      ...model,
      combatRun: beforeLockRun
    });
    const lockRun = stepToElapsed(model.combatRun, lockAtMs);
    const lockHtml = renderAppHtml({
      ...model,
      combatRun: lockRun
    });
    const finalRun = stepToElapsed(lockRun, finalBurstAtMs);
    const detonationHits = skillHitEvents(finalRun, "night-mark-detonation");
    const finalBurstHtml = renderAppHtml({
      ...model,
      combatRun: finalRun
    });

    expect(immediateDetonationHits).toHaveLength(0);
    expect(detonationHits).toHaveLength(4);
    expect(castHtml).toContain('data-advancement-id="night-contract-hunter"');
    expect(castHtml).toContain('data-active-skill-id="night-mark-detonation"');
    expect(castHtml).toContain('data-skill-animation-preset="ink-detonation"');
    expect(castHtml).toContain('data-skill-weapon-arc="detonate-mark"');
    expect(castHtml).toContain('data-skill-vfx-shape="night-detonation"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-night-mark-detonation skill-vfx-shape-night-detonation"');
    expect(castHtml).toContain('data-ink-marks="3"');
    expect(castHtml).toContain('data-ink-marks="2"');
    expect(castHtml).not.toContain('data-hit-phase="detonate"');
    expect(beforeLockHtml).not.toContain('data-hit-phase="mark-lock"');
    expect(beforeLockHtml).not.toContain('data-vfx-cue="night-mark-lock"');
    expect(beforeLockHtml).not.toContain('data-skill-impact-vfx="night-mark-detonation"');
    expect(lockHtml).toContain('data-hit-phase="mark-lock"');
    expect(lockHtml).toContain('data-vfx-cue="night-mark-lock"');
    expect(countOccurrences(lockHtml, 'data-skill-impact-vfx="night-mark-detonation"')).toBe(2);
    expect(lockHtml).not.toContain('data-hit-phase="detonate"');
    expect(lockHtml).toContain('data-ink-marks="3"');
    expect(lockHtml).toContain('data-ink-marks="2"');
    expect(lockHtml).not.toContain('data-enemy-knockdown="true"');
    expect(finalBurstHtml).toContain('data-hitstop-active="true"');
    expect(finalBurstHtml).toContain('data-screen-shake="skill"');
    expect(finalBurstHtml).toContain('data-impact-skill-id="night-mark-detonation"');
    expect(finalBurstHtml).toContain('data-hit-phase="detonate"');
    expect(finalBurstHtml).toContain('data-vfx-cue="night-mark-burst"');
    expect(countOccurrences(finalBurstHtml, 'data-skill-impact-vfx="night-mark-detonation"')).toBe(4);
    expect(countOccurrences(finalBurstHtml, 'data-damage-number="true"')).toBe(4);
    expect(countOccurrences(finalBurstHtml, 'data-ink-marks="0"')).toBe(2);
    expect(countOccurrences(finalBurstHtml, 'data-enemy-knockdown="true"')).toBe(2);
  });

  it("marks with marking-bolt before detonating from the Space advancement hotkey", () => {
    const advancedState = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 100)),
      "night-contract-hunter"
    );
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: advancedState
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "marking-bolt" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    expect(model.combatRun.enemies[0].marks).toBe(0);

    const [markAtMs] = scheduledSkillTimes(model.combatRun, "marking-bolt");
    model = {
      ...model,
      combatRun: stepToElapsed(model.combatRun, markAtMs)
    };

    if (!model.combatRun) {
      throw new Error("Expected active combat run after marking-bolt impact");
    }

    expect(model.combatRun.enemies[0].marks).toBe(2);

    const steppedRun = stepCombat(model.combatRun, {}, 620);
    const readyRun = {
      ...steppedRun,
      player: {
        ...steppedRun.player,
        actionLockUntilMs: 0
      }
    };
    model = {
      ...model,
      combatRun: readyRun
    };
    const spaceRun = model.combatRun;

    if (!spaceRun) {
      throw new Error("Expected active combat run");
    }

    expect(combatActionForKeyCode(model.state, "Space", spaceRun.player.resource.current, false, spaceRun)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "night-mark-detonation"
    });

    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "night-mark-detonation" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const burstRun = stepCombat(model.combatRun, {}, 490);
    const html = renderAppHtml({
      ...model,
      combatRun: burstRun
    });

    expect(burstRun.enemies[0].marks).toBe(0);
    expect(html).toContain('data-skill-impact-vfx="night-mark-detonation"');
    expect(html).toContain('data-hit-phase="detonate"');
    expect(html).toContain('data-skill-cooldown-remaining="');
  });

  it("renders marking-bolt as a delayed contract mark with target-bound seal burst", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "marking-bolt" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after marking-bolt");
    }

    const [markAtMs] = scheduledSkillTimes(model.combatRun, "marking-bolt");
    const castHtml = renderAppHtml(model);
    const beforeMarkHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, markAtMs - 1)
    });
    const markRun = stepToElapsed(model.combatRun, markAtMs);
    const markHtml = renderAppHtml({
      ...model,
      combatRun: markRun
    });

    expect(skillHitEvents(model.combatRun, "marking-bolt")).toHaveLength(0);
    expect(model.combatRun.enemies[0].marks).toBe(0);
    expect(castHtml).toContain('data-active-skill-id="marking-bolt"');
    expect(castHtml).toContain('data-skill-animation-preset="ink-mark"');
    expect(castHtml).toContain('data-skill-weapon-arc="mark-bolt"');
    expect(castHtml).toContain('data-skill-vfx-shape="contract-mark"');
    expect(castHtml).toContain('data-player-skill-move="marking-bolt"');
    expect(beforeMarkHtml).not.toContain('data-skill-impact-vfx="marking-bolt"');
    expect(markHtml).toContain('data-skill-impact-vfx="marking-bolt"');
    expect(markHtml).toContain('data-impact-vfx-shape="contract-mark"');
    expect(markHtml).toContain('data-hit-phase="contract-mark"');
    expect(markHtml).toContain('data-vfx-cue="contract-mark-impact"');
    expect(markHtml).toContain('data-ink-marks="2"');
    expect(markHtml).toContain('class="skill-impact-burst skill-impact-shape-contract-mark"');
  });

  it("renders mechanism-shadow-net as a delayed binding field with enemy control motion", () => {
    const advancedState = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 100)),
      "mechanism-shadow-weaver"
    );
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: advancedState
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = {
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            enemies: model.combatRun.enemies.map((enemy) => ({
              ...enemy,
              hp: 260,
              maxHp: 260
            }))
          }
        : undefined
    };

    expect(combatActionForKeyCode(model.state, "Space", model.combatRun?.player.resource.current, false, model.combatRun)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "mechanism-shadow-net"
    });

    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "mechanism-shadow-net" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const [bindAtMs, snapAtMs] = scheduledSkillTimes(model.combatRun, "mechanism-shadow-net");
    const immediateNetHits = skillHitEvents(model.combatRun, "mechanism-shadow-net");
    const expectedNetActorX = (((model.combatRun.player.x + 150 * model.combatRun.player.facing) / model.combatRun.arena.width) * 100).toFixed(2);
    const castHtml = renderAppHtml(model);
    const beforeBindRun = stepToElapsed(model.combatRun, bindAtMs - 1);
    const beforeBindHtml = renderAppHtml({
      ...model,
      combatRun: beforeBindRun
    });
    const bindRun = stepToElapsed(model.combatRun, bindAtMs);
    const bindHtml = renderAppHtml({
      ...model,
      combatRun: bindRun
    });
    const snapRun = stepToElapsed(bindRun, snapAtMs);
    const netHits = skillHitEvents(snapRun, "mechanism-shadow-net");
    const snapHtml = renderAppHtml({
      ...model,
      combatRun: snapRun
    });

    expect(immediateNetHits).toHaveLength(0);
    expect(netHits).toHaveLength(4);
    expect(castHtml).toContain('data-advancement-id="mechanism-shadow-weaver"');
    expect(castHtml).toContain('data-active-skill-id="mechanism-shadow-net"');
    expect(castHtml).toContain('data-skill-animation-preset="ink-shadow-net"');
    expect(castHtml).toContain('data-skill-weapon-arc="net-cast"');
    expect(castHtml).toContain('data-skill-vfx-shape="mechanism-net"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-mechanism-shadow-net skill-vfx-shape-mechanism-net"');
    expect(castHtml).not.toContain('data-hit-phase="trap-bind"');
    expect(castHtml).toContain(`--actor-x: ${expectedNetActorX}%`);
    expect(beforeBindHtml).not.toContain('data-hit-phase="trap-bind"');
    expect(beforeBindHtml).not.toContain('data-skill-impact-vfx="mechanism-shadow-net"');
    expect(beforeBindHtml).not.toContain('data-damage-number="true"');
    expect(beforeBindHtml).not.toContain('data-enemy-motion="controlled"');
    expect(bindHtml).toContain('data-hit-phase="trap-bind"');
    expect(bindHtml).toContain('data-vfx-cue="mechanism-net-bind"');
    expect(bindHtml).toContain('data-enemy-motion="controlled"');
    expect(countOccurrences(bindHtml, 'data-skill-impact-vfx="mechanism-shadow-net"')).toBe(2);
    expect(bindHtml).not.toContain('data-hit-phase="trap-snap"');
    expect(snapHtml).toContain('data-hitstop-active="true"');
    expect(snapHtml).toContain('data-screen-shake="skill"');
    expect(snapHtml).toContain('data-hit-phase="trap-snap"');
    expect(snapHtml).toContain('data-vfx-cue="mechanism-net-snap"');
    expect(snapHtml).toContain('data-impact-vfx-shape="mechanism-net"');
    expect(countOccurrences(snapHtml, 'data-skill-impact-vfx="mechanism-shadow-net"')).toBe(4);
    expect(countOccurrences(snapHtml, 'data-damage-number="true"')).toBe(4);
  });

  it("renders mountain-crack-hammer as a staged iron hammer impact with knockdown feedback", () => {
    const advancedState = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100)),
      "mountain-cracking-smith"
    );
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: advancedState
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = {
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            enemies: model.combatRun.enemies.map((enemy) => ({
              ...enemy,
              hp: 280,
              maxHp: 280,
              armor: 32
            }))
          }
        : undefined
    };

    expect(combatActionForKeyCode(model.state, "Space", model.combatRun?.player.resource.current, false, model.combatRun)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "mountain-crack-hammer"
    });

    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "mountain-crack-hammer" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const [staggerAtMs, impactAtMs] = scheduledSkillTimes(model.combatRun, "mountain-crack-hammer");
    const immediateHammerHits = skillHitEvents(model.combatRun, "mountain-crack-hammer");
    const castHtml = renderAppHtml(model);
    const beforeStaggerHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, staggerAtMs - 1)
    });
    const staggerRun = stepToElapsed(model.combatRun, staggerAtMs);
    const staggerHtml = renderAppHtml({
      ...model,
      combatRun: staggerRun
    });
    const impactRun = stepToElapsed(staggerRun, impactAtMs);
    const hammerHits = skillHitEvents(impactRun, "mountain-crack-hammer");
    const impactHtml = renderAppHtml({
      ...model,
      combatRun: impactRun
    });

    expect(immediateHammerHits).toHaveLength(0);
    expect(hammerHits).toHaveLength(4);
    expect(castHtml).toContain('data-advancement-id="mountain-cracking-smith"');
    expect(castHtml).toContain('data-active-skill-id="mountain-crack-hammer"');
    expect(castHtml).toContain('data-skill-animation-preset="iron-mountain-crack"');
    expect(castHtml).toContain('data-skill-weapon-arc="mountain-hammer"');
    expect(castHtml).toContain('data-skill-vfx-shape="mountain-crack"');
    expect(castHtml).toContain('data-player-skill-move="mountain-crack-hammer"');
    expect(castHtml).toContain('data-player-skill-move-end-x="290"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-mountain-crack-hammer skill-vfx-shape-mountain-crack"');
    expect(beforeStaggerHtml).toContain('data-player-skill-move="mountain-crack-hammer"');
    expect(beforeStaggerHtml).toContain('data-player-skill-stage="windup"');
    expect(beforeStaggerHtml).not.toContain('data-skill-impact-vfx="mountain-crack-hammer"');
    expect(beforeStaggerHtml).not.toContain('data-damage-number="true"');
    expect(staggerHtml).toContain('data-hit-phase="hammer-stagger"');
    expect(staggerHtml).toContain('data-vfx-cue="mountain-hammer-stagger"');
    expect(staggerHtml).toContain('data-enemy-motion="controlled"');
    expect(countOccurrences(staggerHtml, 'data-skill-impact-vfx="mountain-crack-hammer"')).toBe(2);
    expect(impactHtml).toContain('data-hitstop-active="true"');
    expect(impactHtml).toContain('data-screen-shake="skill"');
    expect(impactHtml).toContain('data-hit-phase="hammer-impact"');
    expect(impactHtml).toContain('data-vfx-cue="mountain-crack-impact"');
    expect(impactHtml).toContain('data-impact-vfx-shape="mountain-crack"');
    expect(impactHtml).toContain('data-enemy-motion="knockdown"');
    expect(countOccurrences(impactHtml, 'data-skill-impact-vfx="mountain-crack-hammer"')).toBe(4);
    expect(countOccurrences(impactHtml, 'data-damage-number="true"')).toBe(4);
  });

  it("renders mountain-guard-break as a delayed Ember guard-break impact", () => {
    const advancedState = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "ember-warden"), 100)),
      "mountain-breaker"
    );
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: advancedState
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: model.combatRun.enemies.slice(0, 2).map((enemy, index) => ({
          ...enemy,
          hp: 260,
          maxHp: 260,
          armor: 40,
          position: { x: player.x + 92 + index * 58, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "mountain-guard-break" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after mountain-guard-break");
    }

    const [breakAtMs] = scheduledSkillTimes(model.combatRun, "mountain-guard-break");
    const castHtml = renderAppHtml(model);
    const beforeBreakHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, breakAtMs - 1)
    });
    const breakRun = stepToElapsed(model.combatRun, breakAtMs);
    const breakHtml = renderAppHtml({
      ...model,
      combatRun: breakRun
    });

    expect(skillHitEvents(model.combatRun, "mountain-guard-break")).toHaveLength(0);
    expect(castHtml).toContain('data-advancement-id="mountain-breaker"');
    expect(castHtml).toContain('data-active-skill-id="mountain-guard-break"');
    expect(castHtml).toContain('data-skill-animation-preset="ember-mountain-break"');
    expect(castHtml).toContain('data-skill-weapon-arc="guard-break"');
    expect(castHtml).toContain('data-skill-vfx-shape="mountain-crack"');
    expect(castHtml).toContain('data-player-skill-move="mountain-guard-break"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-mountain-guard-break skill-vfx-shape-mountain-crack"');
    expect(beforeBreakHtml).not.toContain('data-skill-impact-vfx="mountain-guard-break"');
    expect(beforeBreakHtml).not.toContain('data-damage-number="true"');
    expect(breakHtml).toContain('data-hitstop-active="true"');
    expect(breakHtml).toContain('data-screen-shake="skill"');
    expect(breakHtml).toContain('data-hit-phase="mountain-guard-break"');
    expect(breakHtml).toContain('data-vfx-cue="mountain-guard-break-impact"');
    expect(breakHtml).toContain('data-impact-vfx-shape="mountain-crack"');
    expect(breakHtml).toContain('data-enemy-motion="guard-break"');
    expect(breakHtml).toContain('class="skill-impact-burst skill-impact-shape-mountain-crack"');
    expect(countOccurrences(breakHtml, 'data-skill-impact-vfx="mountain-guard-break"')).toBe(2);
    expect(skillHitEvents(breakRun, "mountain-guard-break")).toHaveLength(2);
  });

  it("renders earth-furnace-breaker as a staged Iron ultimate quake", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run before earth-furnace-breaker");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player: {
          ...model.combatRun.player,
          x: 240,
          y: 340,
          facing: 1 as const,
          actionLockUntilMs: 0,
          hurtLockUntilMs: 0
        },
        enemies: model.combatRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 320,
          maxHp: 320,
          armor: 42,
          position: { x: 334 + index * 70, y: 340 + index * 8 },
          nextAttackAtMs: 9999
        }))
      }
    };

    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "earth-furnace-breaker" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after earth-furnace-breaker");
    }

    const [crackAtMs, eruptionAtMs] = scheduledSkillTimes(model.combatRun, "earth-furnace-breaker");
    const beforeCrackRun = stepToElapsed(model.combatRun, crackAtMs - 1);
    const crackRun = stepToElapsed(model.combatRun, crackAtMs);
    const eruptionRun = stepToElapsed(crackRun, eruptionAtMs);
    const castHtml = renderAppHtml(model);
    const beforeCrackHtml = renderAppHtml({ ...model, combatRun: beforeCrackRun });
    const crackHtml = renderAppHtml({ ...model, combatRun: crackRun });
    const eruptionHtml = renderAppHtml({ ...model, combatRun: eruptionRun });

    expect(skillHitEvents(model.combatRun, "earth-furnace-breaker")).toHaveLength(0);
    expect(castHtml).toContain('data-active-skill-id="earth-furnace-breaker"');
    expect(castHtml).toContain('data-skill-animation-preset="iron-breaker"');
    expect(castHtml).toContain('data-skill-weapon-arc="furnace-breaker"');
    expect(castHtml).toContain('data-skill-vfx-shape="forge-quake"');
    expect(castHtml).toContain('data-player-skill-move="earth-furnace-breaker"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-earth-furnace-breaker skill-vfx-shape-forge-quake"');
    expect(beforeCrackHtml).not.toContain('data-skill-impact-vfx="earth-furnace-breaker"');
    expect(crackHtml).toContain('data-hit-phase="earth-crack"');
    expect(crackHtml).toContain('data-vfx-cue="earth-furnace-crack"');
    expect(countOccurrences(crackHtml, 'data-skill-impact-vfx="earth-furnace-breaker"')).toBe(2);
    expect(eruptionHtml).toContain('data-screen-shake="ultimate"');
    expect(eruptionHtml).toContain('data-screen-flash="forge-quake"');
    expect(eruptionHtml).toContain('data-hit-phase="furnace-eruption"');
    expect(eruptionHtml).toContain('data-vfx-cue="earth-furnace-eruption"');
    expect(eruptionHtml).toContain('data-impact-vfx-shape="forge-quake"');
    expect(eruptionHtml).toContain('class="skill-impact-burst skill-impact-shape-forge-quake"');
    expect(eruptionHtml).toContain('data-enemy-motion="knockdown"');
    expect(countOccurrences(eruptionHtml, 'data-skill-impact-vfx="earth-furnace-breaker"')).toBe(4);
    expect(skillHitEvents(eruptionRun, "earth-furnace-breaker")).toHaveLength(4);
  });

  it("renders sword-prism-field as a staged Liuli prism-field ultimate", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const player = {
      ...model.combatRun.player,
      x: 240,
      y: 340,
      facing: 1 as const,
      actionLockUntilMs: 0,
      hurtLockUntilMs: 0
    };
    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player,
        enemies: [
          {
            ...model.combatRun.enemies[0],
            hp: 240,
            maxHp: 240,
            position: { x: 330, y: 340 },
            nextAttackAtMs: 9999
          },
          {
            ...model.combatRun.enemies[1],
            hp: 240,
            maxHp: 240,
            position: { x: 390, y: 352 },
            nextAttackAtMs: 9999
          },
          {
            ...model.combatRun.enemies[0],
            id: "test-prism-field-third",
            hp: 240,
            maxHp: 240,
            position: { x: 450, y: 332 },
            nextAttackAtMs: 9999
          }
        ]
      }
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "sword-prism-field" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after sword-prism-field");
    }

    const [lockAtMs, burstAtMs] = scheduledSkillTimes(model.combatRun, "sword-prism-field");
    const castHtml = renderAppHtml(model);
    const beforeLockHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, lockAtMs - 1)
    });
    const lockHtml = renderAppHtml({
      ...model,
      combatRun: stepToElapsed(model.combatRun, lockAtMs)
    });
    const burstRun = stepToElapsed(model.combatRun, burstAtMs);
    const burstHtml = renderAppHtml({
      ...model,
      combatRun: burstRun
    });

    expect(skillHitEvents(model.combatRun, "sword-prism-field")).toHaveLength(0);
    expect(castHtml).toContain('data-active-skill-id="sword-prism-field"');
    expect(castHtml).toContain('data-skill-animation-preset="liuli-prism-field"');
    expect(castHtml).toContain('data-skill-weapon-arc="prism-field"');
    expect(castHtml).toContain('data-skill-vfx-shape="sword-prism-field"');
    expect(castHtml).toContain('data-player-skill-move="sword-prism-field"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-sword-prism-field skill-vfx-shape-sword-prism-field"');
    expect(beforeLockHtml).not.toContain('data-skill-impact-vfx="sword-prism-field"');
    expect(lockHtml).toContain('data-hit-phase="prism-field-lock"');
    expect(lockHtml).toContain('data-vfx-cue="sword-prism-field-lock"');
    expect(countOccurrences(lockHtml, 'data-skill-impact-vfx="sword-prism-field"')).toBe(3);
    expect(burstHtml).toContain('data-screen-shake="ultimate"');
    expect(burstHtml).toContain('data-screen-flash="prism-field"');
    expect(burstHtml).toContain('data-hit-phase="prism-field-burst"');
    expect(burstHtml).toContain('data-vfx-cue="sword-prism-field-burst"');
    expect(burstHtml).toContain('data-impact-vfx-shape="sword-prism-field"');
    expect(burstHtml).toContain('class="skill-impact-burst skill-impact-shape-sword-prism-field"');
    expect(countOccurrences(burstHtml, 'data-skill-impact-vfx="sword-prism-field"')).toBe(6);
    expect(skillHitEvents(burstRun, "sword-prism-field")).toHaveLength(6);
  });

  it("renders meteor-knuckle as a staged ultimate with screen flash and ground impact", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 100)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = {
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            enemies: model.combatRun.enemies.map((enemy) => ({
              ...enemy,
              hp: 220,
              maxHp: 220,
              armor: 32
            }))
          }
        : undefined
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "meteor-knuckle" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const [, impactAtMs] = scheduledSkillTimes(model.combatRun, "meteor-knuckle");
    const impactRun = stepToElapsed(model.combatRun, impactAtMs);
    const meteorHits = skillHitEvents(impactRun, "meteor-knuckle");
    const castHtml = renderAppHtml(model);
    const impactHtml = renderAppHtml({
      ...model,
      combatRun: impactRun
    });

    expect(skillHitEvents(model.combatRun, "meteor-knuckle")).toHaveLength(0);
    expect(meteorHits).toHaveLength(4);
    expect(castHtml).toContain('data-active-skill-id="meteor-knuckle"');
    expect(castHtml).toContain('data-skill-animation-preset="ember-meteor"');
    expect(castHtml).toContain('data-skill-weapon-arc="meteor-smash"');
    expect(castHtml).toContain('data-skill-vfx-shape="meteor-impact"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-meteor-knuckle skill-vfx-shape-meteor-impact"');
    expect(castHtml).toContain('data-player-skill-move="meteor-knuckle"');
    expect(castHtml).not.toContain('data-impact-spark="true"');
    expect(castHtml).not.toContain('data-skill-impact-vfx="meteor-knuckle"');
    expect(impactHtml).toContain('data-hitstop-active="true"');
    expect(impactHtml).toContain('data-screen-shake="ultimate"');
    expect(impactHtml).toContain('data-screen-flash="meteor"');
    expect(impactHtml).toContain('data-impact-skill-id="meteor-knuckle"');
    expect(impactHtml).toContain('data-skill-impact-vfx="meteor-knuckle"');
    expect(impactHtml).toContain('data-impact-vfx-shape="meteor-impact"');
    expect(impactHtml).toContain('class="skill-impact-burst skill-impact-shape-meteor-impact"');
    expect(impactHtml).toContain('data-enemy-knockdown="true"');
    expect(impactHtml).toContain('data-airborne-state="downed"');
    expect(impactHtml).toContain('data-enemy-motion="knockdown"');
  });

  it("keeps skill-specific VFX metadata when a class skill misses", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = {
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            player: {
              ...model.combatRun.player,
              x: 120,
              y: 340,
              facing: 1 as const,
              actionLockUntilMs: 0,
              hurtLockUntilMs: 0
            },
            enemies: model.combatRun.enemies.map((enemy) => ({
              ...enemy,
              position: { x: 900, y: 420 },
              nextAttackAtMs: 9999
            }))
          }
        : undefined
    };
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "liuli-rain" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run after liuli-rain");
    }

    const [firstWaveAtMs] = scheduledSkillTimes(model.combatRun, "liuli-rain");
    const html = renderAppHtml(model);
    const missedRun = stepToElapsed(model.combatRun, firstWaveAtMs);

    expect(model.combatRun.events.filter((event) => event.kind === "miss" && event.skillId === "liuli-rain")).toHaveLength(0);
    expect(missedRun.events.at(-1)).toMatchObject({ kind: "miss", action: "skill", skillId: "liuli-rain", occurredAtMs: firstWaveAtMs });
    expect(html).toContain('data-active-skill-id="liuli-rain"');
    expect(html).toContain('data-skill-animation-preset="liuli-rain"');
    expect(html).toContain('data-player-skill-vfx="liuli-rain"');
    expect(html).toContain('data-skill-vfx-shape="glass-rain"');
  });

  it("keeps skill VFX alive for the full catalog animation duration and clears it afterward", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90)
    });
    const skill = catalog.classSkills.find((item) => item.id === "liuli-rain");

    if (!skill) {
      throw new Error("Expected liuli-rain skill");
    }

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: skill.id });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const [, , finalWaveAtMs] = scheduledSkillTimes(model.combatRun, skill.id);
    const actionStartedAtMs = model.combatRun.elapsedMs;
    const duringHtml = renderAppHtml({
      ...model,
      combatRun: {
        ...model.combatRun,
        elapsedMs: actionStartedAtMs + skill.animation.durationMs - 1
      }
    });
    const expiredHtml = renderAppHtml({
      ...model,
      combatRun: {
        ...model.combatRun,
        elapsedMs: Math.max(actionStartedAtMs + skill.animation.durationMs + 1, finalWaveAtMs + 521)
      }
    });

    expect(duringHtml).toContain('data-active-skill-id="liuli-rain"');
    expect(duringHtml).toContain('data-player-skill-vfx="liuli-rain"');
    expect(expiredHtml).not.toContain('data-player-skill-vfx="liuli-rain"');
    expect(expiredHtml).not.toContain('data-impact-spark="true"');
  });

  it("renders monster attack motion and player hurt motion from real enemy skills", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = readyFirstEnemyAttack(model);
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const windupHtml = renderAppHtml(model);

    expect(windupHtml).toContain('data-enemy-motion="attack"');
    expect(windupHtml).toMatch(
      /class="enemy-art actor-model actor-model-attack actor-enemy-skill-ash-ember-spit"[^>]+data-enemy-skill-motion-class="actor-enemy-skill-ash-ember-spit"/
    );
    expect(windupHtml).toContain('data-enemy-telegraph="ash-ember-spit"');
    expect(windupHtml).toContain('data-telegraph-phase="windup"');
    expect(windupHtml).toContain('data-telegraph-shape="cone"');
    expect(windupHtml).not.toContain('data-enemy-skill-vfx="ash-ember-spit"');

    const hpBeforeImpact = model.combatRun?.player.hp ?? 0;

    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const hitHtml = renderAppHtml(model);

    expect(model.combatRun?.player.hp).toBeLessThan(hpBeforeImpact);
    expect(hitHtml).toContain('data-player-motion="hit"');
    expect(hitHtml).toContain('data-player-state="hit"');
    expect(hitHtml).toContain('class="combat-player-art actor-model actor-model-hit"');
    expect(hitHtml).toContain('data-enemy-attack-phase="active"');
    expect(hitHtml).toContain('data-enemy-skill-vfx="ash-ember-spit"');
    expect(hitHtml).toContain('data-combat-feedback="enemy-skill-hit"');
    expect(hitHtml).toContain('data-feedback-skill-id="ash-ember-spit"');
    expect(hitHtml).toContain('data-feedback-result="hit"');
    expect(hitHtml).toContain('class="combat-feedback combat-feedback-hit combat-feedback-skill-ash-ember-spit"');
    expect(hitHtml).not.toContain('data-enemy-telegraph="ash-ember-spit"');
  });

  it("renders target-side feedback when the player dodges a monster skill", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = readyFirstEnemyAttack(model);
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player: {
          ...model.combatRun.player,
          y: model.combatRun.arena.maxY
        }
      }
    };
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const missHtml = renderAppHtml(model);

    expect(missHtml).toContain('data-enemy-skill-vfx="ash-ember-spit"');
    expect(missHtml).toContain('data-enemy-attack-phase="miss"');
    expect(missHtml).not.toContain('data-enemy-telegraph="ash-ember-spit"');
    expect(missHtml).toContain('data-combat-feedback="enemy-skill-miss"');
    expect(missHtml).toContain('data-feedback-skill-id="ash-ember-spit"');
    expect(missHtml).toContain('data-feedback-result="miss"');
    expect(missHtml).toContain('class="combat-feedback combat-feedback-miss combat-feedback-skill-ash-ember-spit"');
  });

  it("renders skill-specific target feedback for each sustained boss breath tick", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = settleClearedRoom(model);
    model = settleClearedRoom(model);
    model = readyFirstEnemyAttack(model);

    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const windupHtml = renderAppHtml(model);

    expect(model.combatRun?.roomIndex).toBe(2);
    expect(windupHtml).toContain('data-enemy-telegraph="taotie-flame-breath"');
    expect(windupHtml).not.toContain('data-enemy-skill-vfx="taotie-flame-breath"');

    for (const hitIndex of [1, 2, 3]) {
      let guard = 0;

      while (
        model.combatRun &&
        !model.combatRun.events.some(
          (event) =>
            event.kind === "enemy-attack" &&
            event.skillId === "taotie-flame-breath" &&
            event.phase === "active" &&
            event.hitIndex === hitIndex
        ) &&
        guard < 8
      ) {
        model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
        guard += 1;
      }

      const hitHtml = renderAppHtml(model);

      expect(hitHtml).toContain('data-player-motion="hit"');
      expect(hitHtml).toContain('class="combat-player-art actor-model actor-model-hit"');
      expect(hitHtml).toContain('data-enemy-skill-vfx="taotie-flame-breath"');
      expect(hitHtml).toContain(`data-enemy-attack-hit-index="${hitIndex}"`);
      expect(hitHtml).toContain('data-enemy-attack-total-hits="3"');
      expect(hitHtml).toContain('data-enemy-vfx-cue="taotie-flame-breath-sustain"');
      expect(hitHtml).toContain('data-combat-feedback="enemy-skill-hit"');
      expect(hitHtml).toContain('data-feedback-skill-id="taotie-flame-breath"');
      expect(hitHtml).toContain(
        'class="combat-feedback combat-feedback-hit combat-feedback-skill-taotie-flame-breath"'
      );
    }
  });

  it("renders taotie half-health phase change and forge collapse arena hazards", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = settleClearedRoom(model);
    model = settleClearedRoom(model);

    if (!model.combatRun) {
      throw new Error("Expected boss combat run");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player: {
          ...model.combatRun.player,
          x: 240,
          y: 340,
          hp: 999,
          maxHp: 999
        },
        enemies: [
          {
            ...model.combatRun.enemies[0],
            hp: Math.floor(model.combatRun.enemies[0].maxHp / 2),
            armor: 0,
            nextAttackAtMs: 9999
          } as CombatEnemy
        ]
      }
    };

    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const phaseHtml = renderAppHtml(model);

    expect(phaseHtml).toContain('data-boss-phase="2"');
    expect(phaseHtml).toContain('data-boss-phase-triggered="true"');
    expect(phaseHtml).toContain('data-boss-phase-vfx="taotie-forge-collapse"');
    expect(phaseHtml).toContain('data-enemy-motion="attack"');
    expect(phaseHtml).toContain('data-boss-phase-skill-id="taotie-forge-collapse"');
    expect(phaseHtml).toContain('actor-enemy-skill-taotie-forge-collapse');
    expect(phaseHtml).toContain('data-arena-hazard-layer="true"');
    expect(countOccurrences(phaseHtml, 'data-arena-hazard="taotie-forge-collapse"')).toBe(3);
    expect(phaseHtml).toContain('data-hazard-phase="telegraph"');
    expect(phaseHtml).toContain('data-hazard-vfx-cue="taotie-forge-collapse-telegraph"');
    expect(phaseHtml).toContain('data-enemy-hp-percent="50"');
    expect(phaseHtml).not.toContain('data-enemy-skill-vfx="taotie-flame-breath"');

    let guard = 0;

    while (
      model.combatRun &&
      !model.combatRun.events.some(
        (event) => event.kind === "arena-hazard" && event.skillId === "taotie-forge-collapse" && event.phase === "active"
      ) &&
      guard < 8
    ) {
      model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
      guard += 1;
    }

    const impactHtml = renderAppHtml(model);

    expect(impactHtml).toContain('data-hazard-phase="active"');
    expect(impactHtml).toContain('data-hazard-vfx-cue="taotie-forge-collapse-impact"');
    expect(impactHtml).toContain('data-combat-feedback="arena-hazard-hit"');
    expect(impactHtml).toContain('data-feedback-skill-id="taotie-forge-collapse"');
    expect(impactHtml).toContain('data-player-feedback-cue="player-hurt-forge-collapse"');
    expect(impactHtml).toContain('data-player-motion="hit"');
  });

  it("renders taotie devour as a pull windup and bite impact instead of boss flame fallback", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = settleClearedRoom(model);
    model = settleClearedRoom(model);

    if (!model.combatRun) {
      throw new Error("Expected boss combat run");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player: {
          ...model.combatRun.player,
          x: 160,
          y: 340,
          hp: 999,
          maxHp: 999
        },
        enemies: [
          {
            ...model.combatRun.enemies[0],
            attackProfileId: "taotie-devour-pull",
            attackPatternIds: ["taotie-devour-pull"],
            nextAttackPatternIndex: 0,
            position: {
              x: 520,
              y: 340
            },
            nextAttackAtMs: 1
          } as CombatEnemy
        ]
      }
    };
    const devourCombatRun = model.combatRun;

    if (!devourCombatRun) {
      throw new Error("Expected devour combat run");
    }

    const playerStartX = devourCombatRun.player.x;

    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const windupHtml = renderAppHtml(model);

    expect(windupHtml).toContain('data-enemy-telegraph="taotie-devour-pull"');
    expect(windupHtml).toContain('data-telegraph-shape="circle"');
    expect(windupHtml).toContain('data-enemy-attack-skill-id="taotie-devour-pull"');
    expect(windupHtml).toContain('actor-enemy-skill-taotie-devour-pull');
    expect(windupHtml).not.toContain('data-enemy-telegraph="taotie-flame-breath"');
    expect(windupHtml).not.toContain('data-enemy-skill-vfx="taotie-devour-pull"');

    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    expect(model.combatRun?.player.x).toBeGreaterThan(playerStartX);

    let guard = 0;
    while (
      model.combatRun &&
      !model.combatRun.events.some(
        (event) => event.kind === "enemy-attack" && event.skillId === "taotie-devour-pull" && event.phase === "active"
      ) &&
      guard < 8
    ) {
      model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
      guard += 1;
    }

    const hitHtml = renderAppHtml(model);

    expect(hitHtml).toContain('data-player-motion="hit"');
    expect(hitHtml).toContain('data-enemy-skill-vfx="taotie-devour-pull"');
    expect(hitHtml).toContain('data-enemy-vfx-cue="taotie-devour-bite"');
    expect(hitHtml).toContain('data-combat-feedback="enemy-skill-hit"');
    expect(hitHtml).toContain('data-feedback-skill-id="taotie-devour-pull"');
    expect(hitHtml).toContain('class="combat-feedback combat-feedback-hit combat-feedback-skill-taotie-devour-pull"');
    expect(hitHtml).not.toContain('data-enemy-skill-vfx="taotie-flame-breath"');
  });

  it("renders taotie ash summon as a boss cast, rift VFX, and newly spawned crawlers", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = settleClearedRoom(model);
    model = settleClearedRoom(model);

    if (!model.combatRun) {
      throw new Error("Expected boss combat run");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player: {
          ...model.combatRun.player,
          x: 180,
          y: 340,
          hp: 999,
          maxHp: 999
        },
        enemies: [
          {
            ...model.combatRun.enemies[0],
            attackProfileId: "taotie-ash-summon",
            attackPatternIds: ["taotie-ash-summon"],
            nextAttackPatternIndex: 0,
            position: {
              x: 520,
              y: 340
            },
            nextAttackAtMs: 1
          } as CombatEnemy
        ]
      }
    };

    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const windupHtml = renderAppHtml(model);

    expect(windupHtml).toContain('data-enemy-telegraph="taotie-ash-summon"');
    expect(windupHtml).toContain('data-telegraph-shape="circle"');
    expect(windupHtml).toContain('data-enemy-attack-skill-id="taotie-ash-summon"');
    expect(windupHtml).toContain('actor-enemy-skill-taotie-ash-summon');
    expect(windupHtml).not.toContain('data-enemy-summon-vfx="taotie-ash-summon"');
    expect(countOccurrences(windupHtml, 'class="combat-actor combat-enemy combat-enemy-trash"')).toBe(0);

    let guard = 0;
    while (
      model.combatRun &&
      !model.combatRun.events.some(
        (event): event is CombatEnemySummonEvent => event.kind === "enemy-summon" && event.skillId === "taotie-ash-summon"
      ) &&
      guard < 10
    ) {
      model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
      guard += 1;
    }

    const summonHtml = renderAppHtml(model);

    expect(summonHtml).toContain('data-enemy-skill-vfx="taotie-ash-summon"');
    expect(summonHtml).toContain('data-enemy-vfx-cue="taotie-ash-summon-rift"');
    expect(summonHtml).toContain('data-enemy-summon-vfx="taotie-ash-summon"');
    expect(summonHtml).toContain('data-summon-vfx-cue="taotie-ash-summon-rift"');
    expect(countOccurrences(summonHtml, 'data-summoned-enemy-id=')).toBe(2);
    expect(countOccurrences(summonHtml, 'class="combat-actor combat-enemy combat-enemy-trash"')).toBe(2);
    expect(summonHtml).not.toContain('data-enemy-skill-vfx="taotie-flame-breath"');
  });

  it("renders taotie forge shackle as a bind windup, chain lock, and furnace slam", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = settleClearedRoom(model);
    model = settleClearedRoom(model);

    if (!model.combatRun) {
      throw new Error("Expected boss combat run");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player: {
          ...model.combatRun.player,
          x: 230,
          y: 340,
          hp: 999,
          maxHp: 999,
          actionLockUntilMs: 0,
          hurtLockUntilMs: 0
        },
        enemies: [
          {
            ...model.combatRun.enemies[0],
            bossPhase: 2,
            attackProfileId: "taotie-forge-shackle",
            attackPatternIds: ["taotie-forge-shackle"],
            nextAttackPatternIndex: 0,
            position: {
              x: 470,
              y: 340
            },
            nextAttackAtMs: 1
          } as unknown as CombatEnemy
        ]
      }
    };

    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const windupHtml = renderAppHtml(model);

    expect(windupHtml).toContain('data-enemy-telegraph="taotie-forge-shackle"');
    expect(windupHtml).toContain('data-telegraph-shape="circle"');
    expect(windupHtml).toContain('data-enemy-attack-skill-id="taotie-forge-shackle"');
    expect(windupHtml).toContain('actor-enemy-skill-taotie-forge-shackle');
    expect(windupHtml).not.toContain('data-enemy-skill-vfx="taotie-forge-shackle"');
    expect(windupHtml).not.toContain('data-enemy-telegraph="taotie-flame-breath"');

    let guard = 0;
    while (
      model.combatRun &&
      !model.combatRun.events.some(
        (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-forge-shackle" && event.hitIndex === 1
      ) &&
      guard < 10
    ) {
      model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
      guard += 1;
    }

    const bindHtml = renderAppHtml(model);

    expect(bindHtml).toContain('data-player-bound-active="true"');
    expect(bindHtml).toContain('data-enemy-skill-vfx="taotie-forge-shackle"');
    expect(bindHtml).toContain('data-enemy-vfx-cue="taotie-forge-shackle-bind"');
    expect(bindHtml).toContain('data-feedback-skill-id="taotie-forge-shackle"');
    expect(bindHtml).toContain('class="combat-feedback combat-feedback-hit combat-feedback-skill-taotie-forge-shackle"');
    expect(bindHtml).not.toContain('data-enemy-skill-vfx="taotie-flame-breath"');

    while (
      model.combatRun &&
      !model.combatRun.events.some(
        (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-forge-shackle" && event.hitIndex === 2
      ) &&
      guard < 16
    ) {
      model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
      guard += 1;
    }

    const slamHtml = renderAppHtml(model);

    expect(slamHtml).toContain('data-enemy-skill-vfx="taotie-forge-shackle"');
    expect(slamHtml).toContain('data-enemy-vfx-cue="taotie-forge-shackle-slam"');
    expect(slamHtml).toContain('data-player-feedback-cue="player-hurt-forge-slam"');
    expect(slamHtml).toContain('data-player-hurt-feedback-cue="player-hurt-forge-slam"');
    expect(slamHtml).not.toContain('data-enemy-skill-vfx="taotie-flame-breath"');
  });

  it("renders taotie chain cleave as a phase-two drag and smash boss chain", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = settleClearedRoom(model);
    model = settleClearedRoom(model);

    if (!model.combatRun) {
      throw new Error("Expected boss combat run");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player: {
          ...model.combatRun.player,
          x: 230,
          y: 340,
          hp: 999,
          maxHp: 999,
          actionLockUntilMs: 0,
          hurtLockUntilMs: 0
        },
        enemies: [
          {
            ...model.combatRun.enemies[0],
            bossPhase: 2,
            attackProfileId: "taotie-chain-cleave",
            attackPatternIds: ["taotie-chain-cleave"],
            nextAttackPatternIndex: 0,
            position: {
              x: 470,
              y: 340
            },
            nextAttackAtMs: 1
          } as unknown as CombatEnemy
        ]
      }
    };

    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const windupHtml = renderAppHtml(model);

    expect(windupHtml).toContain('data-enemy-telegraph="taotie-chain-cleave"');
    expect(windupHtml).toContain('data-telegraph-shape="line"');
    expect(windupHtml).toContain('data-enemy-attack-skill-id="taotie-chain-cleave"');
    expect(windupHtml).toContain('actor-enemy-skill-taotie-chain-cleave');
    expect(windupHtml).not.toContain('data-enemy-skill-vfx="taotie-chain-cleave"');
    expect(windupHtml).not.toContain('data-enemy-telegraph="taotie-flame-breath"');

    let guard = 0;
    while (
      model.combatRun &&
      !model.combatRun.events.some(
        (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-chain-cleave" && event.hitIndex === 1
      ) &&
      guard < 10
    ) {
      model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
      guard += 1;
    }

    const dragHtml = renderAppHtml(model);

    expect(dragHtml).toContain('data-player-bound-active="true"');
    expect(dragHtml).toContain('data-enemy-skill-vfx="taotie-chain-cleave"');
    expect(dragHtml).toContain('data-enemy-vfx-cue="taotie-chain-cleave-drag"');
    expect(dragHtml).toContain('data-enemy-model-vfx-cue="taotie-chain-cleave-drag"');
    expect(dragHtml).toContain('data-feedback-skill-id="taotie-chain-cleave"');
    expect(dragHtml).toContain('class="combat-feedback combat-feedback-hit combat-feedback-skill-taotie-chain-cleave"');

    while (
      model.combatRun &&
      !model.combatRun.events.some(
        (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-chain-cleave" && event.hitIndex === 2
      ) &&
      guard < 16
    ) {
      model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
      guard += 1;
    }

    const smashHtml = renderAppHtml(model);

    expect(smashHtml).toContain('data-enemy-skill-vfx="taotie-chain-cleave"');
    expect(smashHtml).toContain('data-enemy-vfx-cue="taotie-chain-cleave-smash"');
    expect(smashHtml).toContain('data-enemy-model-vfx-cue="taotie-chain-cleave-smash"');
    expect(smashHtml).toContain('data-player-feedback-cue="player-hurt-chain-smash"');
    expect(smashHtml).toContain('data-player-hurt-feedback-cue="player-hurt-chain-smash"');
    expect(smashHtml).not.toContain('data-enemy-skill-vfx="taotie-flame-breath"');
  });

  it("renders crawler burst as a rushing monster skill with explosion feedback", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        enemies: model.combatRun.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                attackProfileId: "ash-crawler-burst",
                position: {
                  x: (model.combatRun?.player.x ?? enemy.position.x) + 260,
                  y: model.combatRun?.player.y ?? enemy.position.y
                },
                nextAttackAtMs: 1
              }
            : enemy
        )
      }
    };
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const windupHtml = renderAppHtml(model);

    expect(windupHtml).toContain('data-enemy-motion="attack"');
    expect(windupHtml).toContain('data-enemy-attack-skill-id="ash-crawler-burst"');
    expect(windupHtml).toMatch(
      /class="enemy-art actor-model actor-model-attack actor-enemy-skill-ash-crawler-burst"[^>]+data-enemy-skill-motion-class="actor-enemy-skill-ash-crawler-burst"/
    );
    expect(windupHtml).toContain('data-enemy-telegraph="ash-crawler-burst"');
    expect(windupHtml).toContain('data-telegraph-shape="circle"');
    expect(windupHtml).toMatch(
      /class="enemy-telegraph[^"]*enemy-telegraph-ash-crawler-burst"[^>]+data-enemy-attack-duration-ms="660"[^>]+data-enemy-vfx-duration-ms="660"[^>]+style="[^"]*--enemy-attack-duration: 660ms;[^"]*--enemy-vfx-duration: 660ms;/
    );
    expect(windupHtml).not.toContain('data-enemy-skill-vfx="ash-crawler-burst"');

    for (let guard = 0; guard < 6; guard += 1) {
      if (
        model.combatRun?.events.some(
          (event) =>
            event.kind === "enemy-attack" &&
            event.skillId === "ash-crawler-burst" &&
            event.phase === "active"
        )
      ) {
        break;
      }

      model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    }

    const burstHtml = renderAppHtml(model);

    expect(burstHtml).toContain('data-player-motion="hit"');
    expect(burstHtml).toContain('data-enemy-skill-vfx="ash-crawler-burst"');
    expect(burstHtml).toContain('data-enemy-attack-phase="active"');
    expect(burstHtml).toContain('data-enemy-vfx-cue="ash-crawler-burst-explode"');
    expect(burstHtml).toMatch(
      /class="enemy-skill-vfx enemy-skill-ash-crawler-burst"[^>]+data-enemy-attack-duration-ms="660"[^>]+data-enemy-vfx-duration-ms="460"[^>]+style="[^"]*--enemy-attack-duration: 660ms;[^"]*--enemy-vfx-duration: 460ms;/
    );
    expect(burstHtml).toContain('data-combat-feedback="enemy-skill-hit"');
    expect(burstHtml).toContain('data-feedback-skill-id="ash-crawler-burst"');
    expect(burstHtml).toContain('data-player-feedback-cue="player-hurt-heavy"');
    expect(burstHtml).toContain('class="combat-feedback combat-feedback-hit combat-feedback-skill-ash-crawler-burst"');
    expect(burstHtml).not.toContain('data-enemy-telegraph="ash-crawler-burst"');
  });

  it("renders crawler burst miss feedback when the player sidesteps the explosion", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        enemies: model.combatRun.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                attackProfileId: "ash-crawler-burst",
                position: {
                  x: (model.combatRun?.player.x ?? enemy.position.x) + 260,
                  y: model.combatRun?.player.y ?? enemy.position.y
                },
                nextAttackAtMs: 1
              }
            : enemy
        )
      }
    };
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player: {
          ...model.combatRun.player,
          y: model.combatRun.arena.maxY
        }
      }
    };

    for (let guard = 0; guard < 6; guard += 1) {
      if (
        model.combatRun?.events.some(
          (event) =>
            event.kind === "enemy-attack" &&
            event.skillId === "ash-crawler-burst" &&
            event.phase === "miss"
        )
      ) {
        break;
      }

      model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    }

    const missHtml = renderAppHtml(model);

    expect(missHtml).toContain('data-enemy-skill-vfx="ash-crawler-burst"');
    expect(missHtml).toContain('data-enemy-attack-phase="miss"');
    expect(missHtml).toContain('data-enemy-vfx-cue="ash-crawler-burst-explode"');
    expect(missHtml).toContain('data-combat-feedback="enemy-skill-miss"');
    expect(missHtml).toContain('data-feedback-skill-id="ash-crawler-burst"');
    expect(missHtml).toContain('class="combat-feedback combat-feedback-miss combat-feedback-skill-ash-crawler-burst"');
    expect(missHtml).not.toContain('data-player-motion="hit"');
  });

  it("does not render hit feedback when invulnerability absorbs an active monster skill", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = readyFirstEnemyAttack(model);
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    model = {
      ...model,
      combatRun: {
        ...model.combatRun,
        player: {
          ...model.combatRun.player,
          invulnerableUntilMs: model.combatRun.elapsedMs + 1000
        }
      }
    };
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const absorbedHtml = renderAppHtml(model);
    const playerHitEvents = model.combatRun?.events.filter((event) => event.kind === "player-hit") ?? [];

    expect(absorbedHtml).toContain('data-enemy-skill-vfx="ash-ember-spit"');
    expect(absorbedHtml).toContain('data-enemy-attack-phase="active"');
    expect(playerHitEvents).toHaveLength(0);
    expect(absorbedHtml).not.toContain('data-combat-feedback="enemy-skill-hit"');
  });

  it("stops monster attack model motion after the attack recovery ends", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = readyFirstEnemyAttack(model);
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    expect(renderAppHtml(model)).toContain('data-enemy-motion="attack"');

    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const recoveredHtml = renderAppHtml(model);

    expect(model.combatRun?.enemies[0].attackRecoverUntilMs).toBeUndefined();
    expect(recoveredHtml).not.toContain('data-enemy-motion="attack"');
    expect(recoveredHtml).not.toContain('class="enemy-art actor-model actor-model-attack"');
  });

  it("shows failed combat state after monster attacks defeat the player", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = readyFirstEnemyAttack(model);
    model = {
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            player: {
              ...model.combatRun.player,
              hp: 20
            }
          }
        : undefined
    };
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const failedHtml = renderAppHtml(model);

    expect(model.combatRun?.failed).toBe(true);
    expect(model.combatRun?.player.hp).toBe(0);
    expect(failedHtml).toContain('data-combat-objective="failed"');
    expect(failedHtml).toContain('data-player-state="defeated"');
    expect(failedHtml).toContain('class="combat-player-art actor-model actor-model-defeated"');
    expect(failedHtml).toContain('<button data-combat-action="light" data-hotkey="J" disabled>');

    const blocked = reduceAppAction(model, { type: "combatAction", action: "light" });

    expect(blocked.combatRun).toEqual(model.combatRun);
    expect(blocked.message).toContain("倒地");
  });

  it("does not map unaffordable combat skill hotkeys", () => {
    const state = createInitialState();

    expect(combatActionForKeyCode(state, "KeyU", 10)).toBeUndefined();
    expect(combatActionForKeyCode(state, "KeyU", 30)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "anvil-crash"
    });
  });

  it("mounts combat nested skill-label clicks and returns keyboard cleanup", () => {
    const previousLocalStorage = globalThis.localStorage;
    const previousAddEventListener = globalThis.addEventListener;
    const previousRemoveEventListener = globalThis.removeEventListener;
    const storage = new MemoryStorage();
    const listeners = new Map<string, EventListener>();
    let clickHandler: ((event: Event) => void) | undefined;
    const classList = new Set<string>();
    const root = {
      innerHTML: "",
      addEventListener(type: string, handler: EventListener): void {
        if (type === "click") {
          clickHandler = handler as (event: Event) => void;
        }
      }
    } as unknown as HTMLDivElement;

    saveGame(storage, withHeat(createInitialState(), 80));

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage
    });
    Object.defineProperty(globalThis, "addEventListener", {
      configurable: true,
      value: (type: string, handler: EventListener) => listeners.set(type, handler)
    });
    Object.defineProperty(globalThis, "removeEventListener", {
      configurable: true,
      value: (type: string, handler: EventListener) => {
        if (listeners.get(type) === handler) {
          listeners.delete(type);
        }
      }
    });

    try {
      const cleanup = mountApp(root);
      const enterButton = {
        dataset: { enterDungeon: "cinder-kiln-alley" },
        classList: { contains: (className: string) => classList.has(className) },
        closest: () => enterButton
      };

      clickHandler?.({ target: enterButton } as unknown as Event);

      for (let i = 0; i < 5; i += 1) {
        (listeners.get("keydown") as ((event: KeyboardEvent) => void) | undefined)?.({
          code: "ArrowRight",
          shiftKey: true,
          preventDefault: () => undefined
        } as KeyboardEvent);
      }

      const skillButton = {
        dataset: { combatAction: "skill", combatSkillId: "anvil-crash" },
        classList: { contains: (className: string) => classList.has(className) },
        closest: () => skillButton
      };
      const nestedSpan = {
        dataset: {},
        closest: () => skillButton
      };

      clickHandler?.({ target: nestedSpan } as unknown as Event);

      expect(root.innerHTML).toContain('class="combat-vfx-layer"');
      expect(root.innerHTML).toContain('data-player-skill-vfx="anvil-crash"');
      expect(root.innerHTML).toContain("热能 55");
      expect(listeners.has("keydown")).toBe(true);

      cleanup();
      expect(listeners.has("keydown")).toBe(false);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage
      });
      Object.defineProperty(globalThis, "addEventListener", {
        configurable: true,
        value: previousAddEventListener
      });
      Object.defineProperty(globalThis, "removeEventListener", {
        configurable: true,
        value: previousRemoveEventListener
      });
    }
  });

  it("mounts DNF-style command key sequences without turning the final Z into heavy attack", () => {
    const previousLocalStorage = globalThis.localStorage;
    const previousAddEventListener = globalThis.addEventListener;
    const previousRemoveEventListener = globalThis.removeEventListener;
    const storage = new MemoryStorage();
    const listeners = new Map<string, EventListener>();
    let clickHandler: ((event: Event) => void) | undefined;
    const root = {
      innerHTML: "",
      addEventListener(type: string, handler: EventListener): void {
        if (type === "click") {
          clickHandler = handler as (event: Event) => void;
        }
      }
    } as unknown as HTMLDivElement;

    saveGame(storage, withHeat(createInitialState(), 24));

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage
    });
    Object.defineProperty(globalThis, "addEventListener", {
      configurable: true,
      value: (type: string, handler: EventListener) => listeners.set(type, handler)
    });
    Object.defineProperty(globalThis, "removeEventListener", {
      configurable: true,
      value: (type: string, handler: EventListener) => {
        if (listeners.get(type) === handler) {
          listeners.delete(type);
        }
      }
    });

    try {
      const cleanup = mountApp(root);
      const enterButton = {
        dataset: { enterDungeon: "cinder-kiln-alley" },
        closest: () => enterButton
      };
      const keydown = listeners.get("keydown") as ((event: KeyboardEvent) => void) | undefined;

      clickHandler?.({ target: enterButton } as unknown as Event);

      for (const code of ["ArrowDown", "ArrowRight", "KeyZ"]) {
        keydown?.({
          code,
          repeat: false,
          shiftKey: false,
          preventDefault: () => undefined
        } as KeyboardEvent);
      }

      expect(root.innerHTML).toContain('data-player-skill-vfx="anvil-crash"');
      expect(root.innerHTML).toContain('data-command-release-source="manual"');
      expect(root.innerHTML).toContain('data-skill-release-source="manual"');
      expect(root.innerHTML).toContain("热能 2");

      cleanup();
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage
      });
      Object.defineProperty(globalThis, "addEventListener", {
        configurable: true,
        value: previousAddEventListener
      });
      Object.defineProperty(globalThis, "removeEventListener", {
        configurable: true,
        value: previousRemoveEventListener
      });
    }
  });

  it("mounts a combat tick loop so monsters can attack without extra player input", () => {
    const previousLocalStorage = globalThis.localStorage;
    const previousSetInterval = globalThis.setInterval;
    const previousClearInterval = globalThis.clearInterval;
    let clickHandler: ((event: Event) => void) | undefined;
    let tickHandler: (() => void) | undefined;
    let tickMs = 0;
    let clearedTickId: number | undefined;
    const root = {
      innerHTML: "",
      addEventListener(type: string, handler: EventListener): void {
        if (type === "click") {
          clickHandler = handler as (event: Event) => void;
        }
      }
    } as unknown as HTMLDivElement;

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: new MemoryStorage()
    });
    Object.defineProperty(globalThis, "setInterval", {
      configurable: true,
      value: (handler: () => void, ms?: number) => {
        tickHandler = handler;
        tickMs = ms ?? 0;
        return 77;
      }
    });
    Object.defineProperty(globalThis, "clearInterval", {
      configurable: true,
      value: (id: number) => {
        clearedTickId = id;
      }
    });

    try {
      const cleanup = mountApp(root);
      const enterButton = {
        dataset: { enterDungeon: "cinder-kiln-alley" },
        closest: () => enterButton
      };

      clickHandler?.({ target: enterButton } as unknown as Event);

      let guard = 0;

      while (!root.innerHTML.includes('data-enemy-motion="attack"') && guard < 30) {
        tickHandler?.();
        guard += 1;
      }

      expect(tickMs).toBeLessThanOrEqual(50);
      expect(root.innerHTML).toContain('data-enemy-motion="attack"');
      expect(root.innerHTML).toContain('data-enemy-telegraph="ash-ember-spit"');
      expect(root.innerHTML).not.toContain('data-enemy-skill-vfx="ash-ember-spit"');

      guard = 0;

      while (!root.innerHTML.includes('data-enemy-skill-vfx="ash-ember-spit"') && guard < 30) {
        tickHandler?.();
        guard += 1;
      }

      expect(root.innerHTML).toContain('data-enemy-skill-vfx="ash-ember-spit"');

      cleanup();
      expect(clearedTickId).toBe(77);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage
      });
      Object.defineProperty(globalThis, "setInterval", {
        configurable: true,
        value: previousSetInterval
      });
      Object.defineProperty(globalThis, "clearInterval", {
        configurable: true,
        value: previousClearInterval
      });
    }
  });

  it("buys a gift pack, opens a box, and renders actionable shop controls", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({
      storage,
      rng: () => 0.99,
      initialState: withCurrency(createInitialState(), { valorToken: 5 })
    });
    const bought = reduceAppAction(model, { type: "buyShopItem", sku: "liuli-gift-pack" });
    const opened = reduceAppAction(bought, { type: "openBox", boxId: "ember-mythic-box" });
    const shopHtml = renderAppHtml({ ...opened, mode: "shop" });

    expect(bought.state.shop.boxes["ember-mythic-box"]).toBe(3);
    expect(opened.state.shop.boxes["ember-mythic-box"]).toBe(2);
    expect(opened.state.player.inventory.length).toBeGreaterThan(bought.state.player.inventory.length);
    expect(shopHtml).toContain("购买礼包");
    expect(shopHtml).toContain("开启箱子");
    expect(opened.audio.commandQueue).toEqual(expect.arrayContaining([{ type: "sfx", id: "box-open" }]));
  });

  it("equips, locks, sells, and dismantles inventory items through app actions", () => {
    let model = createAppModel({ storage: new MemoryStorage() });
    const core = model.state.player.inventory.find((item) => item.catalogGearId.includes("-core"));

    if (!core) {
      throw new Error("Expected starter core");
    }

    model = reduceAppAction(model, { type: "equipItem", gearId: core.instanceId });
    expect(model.state.player.equipment.core).toBe(core.instanceId);
    expect(model.message).toContain("装备");

    model = reduceAppAction(
      { ...model, state: withCurrency(model.state, { valorToken: 5 }) },
      { type: "buyShopItem", sku: "liuli-gift-pack" }
    );
    const sellable = model.state.player.inventory.at(-1);

    if (!sellable) {
      throw new Error("Expected gift-pack gear");
    }

    model = reduceAppAction(model, { type: "toggleItemLock", gearId: sellable.instanceId });
    expect(model.state.player.inventory.find((item) => item.instanceId === sellable.instanceId)?.locked).toBe(true);
    expect(() => reduceAppAction(model, { type: "sellItem", gearId: sellable.instanceId })).toThrow(/locked item/i);

    model = reduceAppAction(model, { type: "toggleItemLock", gearId: sellable.instanceId });
    const beforeGold = model.state.player.currencies.gold;
    model = reduceAppAction(model, { type: "sellItem", gearId: sellable.instanceId });
    expect(model.state.player.inventory.some((item) => item.instanceId === sellable.instanceId)).toBe(false);
    expect(model.state.player.currencies.gold).toBeGreaterThan(beforeGold);

    const bought = reduceAppAction(
      { ...model, state: withCurrency(model.state, { valorToken: 5 }) },
      { type: "buyShopItem", sku: "liuli-gift-pack" }
    );
    const dropped = bought.state.player.inventory.at(-1);

    if (!dropped) {
      throw new Error("Expected gift-pack gear");
    }

    const beforeDust = bought.state.player.currencies.ironDust;
    const dismantled = reduceAppAction(bought, { type: "dismantleItem", gearId: dropped.instanceId });
    expect(dismantled.state.player.inventory.some((item) => item.instanceId === dropped.instanceId)).toBe(false);
    expect(dismantled.state.player.currencies.ironDust).toBeGreaterThan(beforeDust);
  });

  it("accepts a trade offer and resolves an auction listing through app actions", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      rng: () => 0,
      initialState: withCurrency(createInitialState(), { gold: 5000, ironDust: 500, arcShard: 50, valorToken: 5 })
    });
    const offer = model.state.market.tradeBoard.offers[0];
    const unequipped = model.state.player.inventory.find(
      (item) => !Object.values(model.state.player.equipment).includes(item.instanceId)
    );

    if (!unequipped) {
      throw new Error("Expected unequipped item for auction");
    }

    model = reduceAppAction(model, { type: "acceptTrade", offerId: offer.id });
    expect(model.message).toContain("交易");

    const listed = reduceAppAction(model, { type: "listAuction", gearId: unequipped.instanceId, price: 500 });
    expect(listed.state.market.auctions).toHaveLength(1);
    expect(listed.state.player.inventory.some((item) => item.instanceId === unequipped.instanceId)).toBe(false);

    const resolved = reduceAppAction(listed, { type: "resolveAuctions" });
    expect(resolved.state.market.auctions).toHaveLength(0);
    expect(resolved.state.player.currencies.gold).toBeGreaterThan(listed.state.player.currencies.gold);
    expect(resolved.message).toContain("拍卖");
  });

  it("saves and loads app state through injected storage", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({ storage, rng: () => 0 });
    const gearId = model.state.player.inventory[0].instanceId;
    const reinforced = reduceAppAction(model, { type: "reinforce", gearId });
    const saved = reduceAppAction(reinforced, { type: "save" });
    const resetModel = { ...saved, state: createInitialState(), message: undefined };
    const loaded = reduceAppAction(resetModel, { type: "load" });

    expect(storage.data.has(SAVE_KEY)).toBe(true);
    expect(loaded.state).toEqual(saved.state);
    expect(loaded.message).toContain("读取");
  });

  it("loads the local single-player save when the app starts", () => {
    const storage = new MemoryStorage();
    const savedState = withCurrency(createInitialState(), { gold: 7777, tradeCredit: 88 });

    saveGame(storage, savedState);

    const loaded = createAppModel({ storage });
    const explicitNewGame = createAppModel({
      storage,
      initialState: withCurrency(createInitialState(), { gold: 1234, tradeCredit: 12 })
    });

    expect(loaded.state.player.currencies.gold).toBe(7777);
    expect(loaded.state.player.currencies.tradeCredit).toBe(88);
    expect(loaded.message).toContain("读取本地存档");
    expect(explicitNewGame.state.player.currencies.gold).toBe(1234);
  });

  it("does not auto overwrite a malformed local save after fallback startup", () => {
    const previousLocalStorage = globalThis.localStorage;
    const storage = new MemoryStorage();
    let clickHandler: ((event: Event) => void) | undefined;
    const root = {
      innerHTML: "",
      addEventListener(type: string, handler: EventListener): void {
        if (type === "click") {
          clickHandler = handler as (event: Event) => void;
        }
      }
    } as unknown as HTMLDivElement;

    storage.setItem(SAVE_KEY, "{bad json");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage
    });

    try {
      const cleanup = mountApp(root);
      const gearId = createInitialState().player.inventory[0].instanceId;
      const reinforceButton = {
        dataset: { appAction: "reinforce", gearId },
        closest: () => reinforceButton
      };

      clickHandler?.({ target: reinforceButton } as unknown as Event);

      expect(storage.getItem(SAVE_KEY)).toBe("{bad json");

      cleanup();
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage
      });
    }
  });

  it("auto saves mounted persistent actions to the local single-player save", () => {
    const previousLocalStorage = globalThis.localStorage;
    const storage = new MemoryStorage();
    let clickHandler: ((event: Event) => void) | undefined;
    const root = {
      innerHTML: "",
      addEventListener(type: string, handler: EventListener): void {
        if (type === "click") {
          clickHandler = handler as (event: Event) => void;
        }
      }
    } as unknown as HTMLDivElement;

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage
    });

    try {
      const cleanup = mountApp(root);
      const gearId = createInitialState().player.inventory[0].instanceId;
      const reinforceButton = {
        dataset: { appAction: "reinforce", gearId },
        closest: () => reinforceButton
      };

      clickHandler?.({ target: reinforceButton } as unknown as Event);

      const rawSave = storage.getItem(SAVE_KEY);

      if (!rawSave) {
        throw new Error("Expected mounted app action to write local save");
      }

      const saved = JSON.parse(rawSave) as GameState;
      const reinforced = saved.player.inventory.find((item) => item.instanceId === gearId);

      expect(reinforced?.reinforceLevel).toBe(1);
      expect(root.innerHTML).toContain("+1");

      cleanup();
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage
      });
    }
  });

  it("updates audio volumes through app settings actions", () => {
    const model = createAppModel({ storage: new MemoryStorage() });

    const musicChanged = reduceAppAction(model, { type: "setVolume", kind: "music", value: 0.32 });
    const sfxMuted = reduceAppAction(musicChanged, { type: "setVolume", kind: "sfx", value: -1 });

    expect(musicChanged.audio.volumes.music).toBe(0.32);
    expect(musicChanged.message).toContain("音量");
    expect(sfxMuted.audio.volumes.sfx).toBe(0);
    expect(sfxMuted.audio.volumes.music).toBe(0.32);
  });

  it("requires confirmation before resetting the local save", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({ storage, rng: () => 0 });
    const gearId = model.state.player.inventory[0].instanceId;
    const reinforced = reduceAppAction(model, { type: "reinforce", gearId });
    const saved = reduceAppAction(reinforced, { type: "save" });

    const canceled = reduceAppAction(saved, { type: "resetSave", confirmed: false });
    expect(storage.data.has(SAVE_KEY)).toBe(true);
    expect(canceled.state).toEqual(saved.state);
    expect(canceled.message).toContain("取消");

    const reset = reduceAppAction(saved, { type: "resetSave", confirmed: true });
    expect(storage.data.has(SAVE_KEY)).toBe(false);
    expect(reset.state).toEqual(createInitialState());
    expect(reset.mode).toBe("town");
    expect(reset.message).toContain("重置");
  });
});
