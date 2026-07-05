import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { performAction, stepCombat, type CombatEnemy, type CombatHitEvent, type CombatRun } from "../game/combat";
import { createInitialState } from "../game/state";
import type { GameState } from "../game/types";
import { advanceClass, selectBaseClass } from "../systems/classes";
import { saveGame, SAVE_KEY, type SaveStorage } from "../systems/save";
import { combatActionForKeyCode, createAppModel, mountApp, reduceAppAction, renderAppHtml } from "../ui/app";

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
      heat
    }
  };
}

function countOccurrences(text: string, pattern: string): number {
  return text.split(pattern).length - 1;
}

function playerSkillVfxStyleFor(html: string, skillId: string): string {
  const match = html.match(new RegExp(`<div class="player-skill-vfx skill-vfx-${skillId}[^"]*"[^>]*style="([^"]*)"`));

  return match?.[1] ?? "";
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

function stepToElapsed(run: CombatRun, elapsedMs: number): CombatRun {
  return stepCombat(run, {}, Math.max(0, elapsedMs - run.elapsedMs));
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

function defeatCurrentRoom(model: ReturnType<typeof createAppModel>): ReturnType<typeof createAppModel> {
  let next = model;

  for (let attempt = 0; attempt < 40 && next.combatRun?.enemies.some((enemy) => enemy.hp > 0); attempt += 1) {
    next = placeAliveEnemiesInFront(next);
    next = reduceAppAction(next, { type: "combatAction", action: "heavy" });
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

    expect(clearedHtml).toContain('data-room-gate-state="open"');
    expect(clearedHtml).toContain('data-room-gate-target-room="1"');
    expect(clearedHtml).not.toContain("settle-button");

    for (let attempt = 0; attempt < 20 && model.combatRun?.roomIndex === 0; attempt += 1) {
      model = reduceAppAction(model, { type: "combatMove", moveX: 1, moveY: 0, dash: true });
    }

    expect(model.combatRun?.roomIndex).toBe(1);
    expect(model.combatRun?.player.x).toBeLessThan(220);
    expect(model.state.player.currencies.gold).toBeGreaterThan(goldBefore);
    expect(model.message).toContain("进入下一房间");
    expect(renderAppHtml(model)).toContain('data-room-gate-state="locked"');
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
    const hitEvent = firstHitEvent(model);
    const hitHtml = renderAppHtml({
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            elapsedMs: hitEvent.occurredAtMs
          }
        : undefined
    });
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

    model = reduceAppAction(model, { type: "combatMove", moveX: 1, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 1, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 1, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 1, moveY: 0, dash: false });

    const recoveredHtml = renderAppHtml({
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
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

    const first = performAction(model.combatRun, { type: "light" });
    const secondReady = stepCombat(first, {}, first.player.actionLockUntilMs - first.elapsedMs);
    const second = performAction(secondReady, { type: "light" });
    const thirdReady = stepCombat(second, {}, second.player.actionLockUntilMs - second.elapsedMs);
    const third = performAction(thirdReady, { type: "light" });
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

    const airborneHtml = renderAppHtml(model);

    expect(model.combatRun?.comboCount).toBe(1);
    expect(airborneHtml).toContain('data-combo-count="1"');
    expect(airborneHtml).toContain('class="combo-meter"');
    expect(airborneHtml).toContain('data-airborne-state="airborne"');
    expect(airborneHtml).toContain('data-enemy-motion="airborne"');
    expect(airborneHtml).toContain('class="enemy-art actor-model actor-model-airborne"');

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

    const hitEvent = firstHitEvent(model);
    const html = renderAppHtml({
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
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
      /class="enemy-art actor-model actor-model-attack"[^>]+style="[^"]*--enemy-lunge-x: -28px;/
    );

    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const hitHtml = renderAppHtml(model);

    expect(hitHtml).toMatch(
      /class="combat-player-art actor-model actor-model-hit"[^>]+style="[^"]*--hit-react-x: -18px;/
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

    expect(lastEvent).toMatchObject({ kind: "hit", action: "skill", skillId: "anvil-crash" });
    expect(cast.combatRun?.player.heat).toBeLessThan(model.combatRun?.player.heat ?? 0);
    expect(cast.audio.commandQueue).toEqual(expect.arrayContaining([{ type: "sfx", id: "skill-burst" }]));
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

    const inkHtml = renderAppHtml(inkModel);

    expect(inkHtml).toContain('data-class-id="ink-shadow-ranger"');
    expect(inkHtml).toContain('data-resource-id="ink"');
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

    const shieldHtml = renderAppHtml(shieldModel);

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

    const reflectHtml = renderAppHtml(reflectModel);

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

    const controlHtml = renderAppHtml(controlModel);

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

    const breakHtml = renderAppHtml(breakModel);

    expect(breakHtml).toContain('data-armor-state="broken"');
    expect(breakHtml).toContain('data-enemy-motion="guard-break"');
    expect(breakHtml).toContain('class="enemy-art actor-model actor-model-guard-break"');
  });

  it("renders evade motion and miss result when a monster skill is dodged by a skill window", () => {
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
                },
                nextAttackAtMs: model.combatRun?.elapsedMs ?? 0
              }
            : enemy
        )
      }
    };
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 0, moveY: 0, dash: false });

    const html = renderAppHtml(model);

    expect(html).toContain('data-evade-active="true"');
    expect(html).toContain('data-dodge-result="missed"');
    expect(html).toContain('data-player-motion="dodge"');
    expect(html).toContain('class="combat-player-art actor-model actor-model-dodge"');
  });

  it("maps KeyC to a universal backstep and renders dodge motion without hiding skill hotkeys", () => {
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
    expect(action).toEqual({ type: "combatAction", action: "backstep" });
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

    const xBefore = model.combatRun?.player.x ?? 0;
    model = reduceAppAction(model, { type: "combatAction", action: "backstep" });

    if (!model.combatRun) {
      throw new Error("Expected active combat run");
    }

    const html = renderAppHtml(model);

    expect(model.combatRun.player.x).toBeLessThan(xBefore);
    expect(html).toContain('data-player-motion="dodge"');
    expect(html).toContain('data-evade-active="true"');
    expect(html).toContain('data-combat-action="backstep"');
    expect(html).toContain('data-hotkey="C"');
    expect(html).toContain('class="combat-player-art actor-model actor-model-dodge"');
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

  it("renders player skill burst VFX after casting a combat skill", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = placeAliveEnemiesInFront(model);
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "anvil-crash" });

    const castHtml = renderAppHtml(model);
    const hitEvent = firstHitEvent(model);
    const html = renderAppHtml({
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            elapsedMs: hitEvent.occurredAtMs
          }
        : undefined
    });

    expect(castHtml).toContain('class="combat-vfx-layer"');
    expect(castHtml).toContain('class="combat-player-art actor-model actor-model-skill actor-skill-ember-anvil"');
    expect(castHtml).toContain('data-player-skill-vfx="anvil-crash"');
    expect(castHtml).not.toContain('data-damage-number="true"');
    expect(html).toContain('class="enemy-art actor-model actor-model-hit"');
    expect(html).toContain('data-player-skill-vfx="anvil-crash"');
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

    const [, finalImpactAtMs] = scheduledSkillTimes(model.combatRun, "prism-step");
    const immediateStepHits = skillHitEvents(model.combatRun, "prism-step");
    const castHtml = renderAppHtml(model);
    const beforeImpactRun = stepCombat(model.combatRun, {}, 82);
    const beforeImpactHtml = renderAppHtml({
      ...model,
      combatRun: beforeImpactRun
    });
    const impactRun = stepToElapsed(model.combatRun, finalImpactAtMs);
    const stepHits = skillHitEvents(impactRun, "prism-step");
    const hitFrameHtml = renderAppHtml({
      ...model,
      combatRun: impactRun
    });

    expect(model.combatRun.player.x).toBe(player.x);
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
    expect(openHtml).toContain('data-hit-phase="chain-open"');
    expect(openHtml).toContain('data-vfx-cue="flowing-chain-open"');
    expect(crossHtml).toContain('data-hit-phase="chain-cross"');
    expect(crossHtml).toContain('data-vfx-cue="flowing-chain-cross"');
    expect(finishHtml).toContain('data-hit-phase="chain-finish"');
    expect(finishHtml).toContain('data-vfx-cue="flowing-chain-finish"');
    expect(finishHtml).toContain('class="skill-impact-burst skill-impact-shape-flowing-chain"');
    expect(countOccurrences(finishHtml, 'data-skill-impact-vfx="flowing-light-chain"')).toBe(6);
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

    const rainHits = model.combatRun.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "liuli-rain"
    );

    if (rainHits.length === 0) {
      throw new Error("Expected liuli-rain hit events");
    }

    const firstWaveAtMs = Math.min(...rainHits.map((event) => event.occurredAtMs));
    const finalWaveAtMs = Math.max(...rainHits.map((event) => event.occurredAtMs));
    const preHitHtml = renderAppHtml(model);
    const firstWaveHtml = renderAppHtml({
      ...model,
      combatRun: {
        ...model.combatRun,
        elapsedMs: firstWaveAtMs
      }
    });
    const finalWaveHtml = renderAppHtml({
      ...model,
      combatRun: {
        ...model.combatRun,
        elapsedMs: finalWaveAtMs
      }
    });

    expect(rainHits).toHaveLength(6);
    expect(preHitHtml).toContain('data-hitstop-active="false"');
    expect(preHitHtml).toContain('data-screen-shake="none"');
    expect(preHitHtml).toContain('data-player-trail="skill"');
    expect(preHitHtml).toContain('data-trail-skill-preset="liuli-rain"');
    expect(preHitHtml).toContain('data-player-skill-vfx="liuli-rain"');
    expect(preHitHtml).toContain("--skill-duration: 680ms;");
    expect(preHitHtml).not.toContain('data-impact-spark="true"');
    expect(firstWaveHtml).toContain('data-hitstop-active="true"');
    expect(firstWaveHtml).toContain('data-screen-shake="skill"');
    expect(countOccurrences(firstWaveHtml, 'data-impact-spark="true"')).toBe(2);
    expect(countOccurrences(firstWaveHtml, 'data-skill-impact-vfx="liuli-rain"')).toBe(2);
    expect(finalWaveHtml).toContain('data-impact-vfx-shape="glass-rain"');
    expect(finalWaveHtml).toContain('data-vfx-cue="glass-rain-fall"');
    expect(finalWaveHtml).toContain('data-hit-phase="rain"');
    expect(finalWaveHtml).toContain('class="skill-impact-burst skill-impact-shape-glass-rain"');
    expect(countOccurrences(finalWaveHtml, 'data-impact-spark="true"')).toBe(6);
    expect(countOccurrences(finalWaveHtml, 'data-damage-number="true"')).toBe(6);
    expect(countOccurrences(finalWaveHtml, 'data-skill-impact-vfx="liuli-rain"')).toBe(6);
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

    const volleyHits = model.combatRun.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "black-rain-volley"
    );
    const firstWaveAtMs = Math.min(...volleyHits.map((event) => event.occurredAtMs));
    const finalWaveAtMs = Math.max(...volleyHits.map((event) => event.occurredAtMs));
    const targetIds = [...new Set(volleyHits.map((event) => event.targetId))];
    const castHtml = renderAppHtml(model);
    const firstWaveHtml = renderAppHtml({
      ...model,
      combatRun: {
        ...model.combatRun,
        elapsedMs: firstWaveAtMs
      }
    });
    const finalWaveHtml = renderAppHtml({
      ...model,
      combatRun: {
        ...model.combatRun,
        elapsedMs: finalWaveAtMs
      }
    });

    expect(volleyHits).toHaveLength(6);
    expect(targetIds).toHaveLength(2);
    expect(castHtml).toContain('data-active-skill-id="black-rain-volley"');
    expect(castHtml).toContain('data-skill-animation-preset="ink-volley"');
    expect(castHtml).toContain('data-skill-weapon-arc="rain-volley"');
    expect(castHtml).toContain('data-skill-vfx-shape="black-rain"');
    expect(castHtml).toContain('data-player-skill-vfx="black-rain-volley"');
    expect(countOccurrences(firstWaveHtml, 'data-skill-impact-vfx="black-rain-volley"')).toBe(2);
    expect(countOccurrences(finalWaveHtml, 'data-skill-impact-vfx="black-rain-volley"')).toBe(6);
    expect(finalWaveHtml).toContain('data-impact-vfx-shape="black-rain"');
    expect(finalWaveHtml).toContain('data-vfx-cue="black-rain-fall"');
    expect(finalWaveHtml).toContain('data-hit-phase="rain"');
    expect(finalWaveHtml).toContain('class="skill-impact-burst skill-impact-shape-black-rain"');
    expect(finalWaveHtml).toContain(`data-impact-target-id="${targetIds[0]}"`);
    expect(finalWaveHtml).toContain(`data-impact-target-id="${targetIds[1]}"`);
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
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-mountain-crack-hammer skill-vfx-shape-mountain-crack"');
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

    const meteorHits = model.combatRun.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "meteor-knuckle"
    );
    const impactAtMs = Math.max(...meteorHits.map((event) => event.occurredAtMs));
    const castHtml = renderAppHtml(model);
    const impactHtml = renderAppHtml({
      ...model,
      combatRun: {
        ...model.combatRun,
        elapsedMs: impactAtMs
      }
    });

    expect(meteorHits).toHaveLength(4);
    expect(castHtml).toContain('data-active-skill-id="meteor-knuckle"');
    expect(castHtml).toContain('data-skill-animation-preset="ember-meteor"');
    expect(castHtml).toContain('data-skill-weapon-arc="meteor-smash"');
    expect(castHtml).toContain('data-skill-vfx-shape="meteor-impact"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-meteor-knuckle skill-vfx-shape-meteor-impact"');
    expect(castHtml).not.toContain('data-impact-spark="true"');
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

    const html = renderAppHtml(model);

    expect(model.combatRun?.events.at(-1)).toMatchObject({ kind: "miss", action: "skill", skillId: "liuli-rain" });
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

    const hitEvent = model.combatRun.events.find(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === skill.id
    );

    if (!hitEvent) {
      throw new Error("Expected liuli-rain hit event");
    }

    const actionStartedAtMs = hitEvent.occurredAtMs - hitEvent.inputToHitMs;
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
        elapsedMs: Math.max(actionStartedAtMs + skill.animation.durationMs + 1, hitEvent.occurredAtMs + 521)
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
    expect(windupHtml).toContain('class="enemy-art actor-model actor-model-attack"');
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
    expect(windupHtml).toContain('actor-enemy-skill-ash-crawler-burst');
    expect(windupHtml).toContain('data-enemy-telegraph="ash-crawler-burst"');
    expect(windupHtml).toContain('data-telegraph-shape="circle"');
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

      for (let i = 0; i < 6; i += 1) {
        tickHandler?.();
      }

      expect(tickMs).toBeLessThanOrEqual(160);
      expect(root.innerHTML).toContain('data-enemy-motion="attack"');
      expect(root.innerHTML).toContain('data-enemy-telegraph="ash-ember-spit"');
      expect(root.innerHTML).not.toContain('data-enemy-skill-vfx="ash-ember-spit"');

      for (let i = 0; i < 3; i += 1) {
        tickHandler?.();
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
