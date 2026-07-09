import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { createInitialState, createOwnedGear } from "../game/state";
import type { GameState, GearSlot, OwnedGearItem } from "../game/types";
import { equipItem } from "../systems/inventory";
import { advanceClass, selectBaseClass } from "../systems/classes";
import { applyQuestEvent, claimQuestReward } from "../systems/quests";
import {
  applyHit,
  createCombatRun,
  enterRoomGate,
  finishRoom,
  performAction,
  roomGateForRun,
  skillCooldownRemaining,
  stepCombat,
  type CombatArenaHazardEvent,
  type CombatBossPhaseEvent,
  type CombatEnemyAttackEvent,
  type CombatEnemy,
  type CombatEnemySummonEvent,
  type CombatHitEvent,
  type CombatMissEvent,
  type CombatPlayerHitEvent,
  type CombatRun
} from "../game/combat";
import { mapKeyboardToCombatInput } from "../game/input";

function unlockLiuli(state: GameState): GameState {
  return claimQuestReward(
    applyQuestEvent(state, { type: "dungeonCleared", dungeonId: "cinder-kiln-alley" }),
    "prologue-ember-warden"
  );
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

function completeRoomGateTransition(run: CombatRun): CombatRun {
  const transition = (
    run as CombatRun & {
      roomTransition?: {
        completeAtMs: number;
      };
    }
  ).roomTransition;

  return transition ? stepCombat(run, {}, transition.completeAtMs - run.elapsedMs) : run;
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

function gearId(setId: string, slot: GearSlot): string {
  const gear = catalog.gear.find((item) => item.setId === setId && item.slot === slot && item.rarity === "epic");

  if (!gear) {
    throw new Error(`Missing ${setId} ${slot}`);
  }

  return gear.id;
}

function withEquippedOwnedGear(state: GameState, ownedGear: OwnedGearItem): GameState {
  return equipItem(
    {
      ...state,
      player: {
        ...state.player,
        inventory: [...state.player.inventory, ownedGear]
      }
    },
    ownedGear.instanceId
  );
}

function advanceTime(run: CombatRun, dtMs = 220): CombatRun {
  return stepCombat(run, {}, dtMs);
}

function lastHitEvent(run: CombatRun): CombatHitEvent {
  const event = run.events.at(-1);

  if (!event || event.kind !== "hit") {
    throw new Error("Expected last combat event to be a hit");
  }

  return event;
}

function latestHitForSkill(run: CombatRun, skillId: string): CombatHitEvent {
  const event = [...run.events].reverse().find((item): item is CombatHitEvent => item.kind === "hit" && item.skillId === skillId);

  if (!event) {
    throw new Error(`Expected hit event for ${skillId}`);
  }

  return event;
}

function skillHitEvents(run: CombatRun, skillId: string): CombatHitEvent[] {
  return run.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.skillId === skillId);
}

function skillMissEvents(run: CombatRun, skillId: string): CombatMissEvent[] {
  return run.events.filter((event): event is CombatMissEvent => event.kind === "miss" && event.skillId === skillId);
}

function playerStatusEvents(run: CombatRun, skillId: string): Array<{ kind: string; skillId?: string; vfxCue?: string; occurredAtMs: number }> {
  return (run.events as Array<{ kind: string; skillId?: string; vfxCue?: string; occurredAtMs: number }>).filter(
    (event) => event.kind === "player-status" && event.skillId === skillId
  );
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

function scheduledMissTimes(run: CombatRun, skillId: string): number[] {
  const times = run.scheduledMissEffects
    .filter((effect) => effect.skillId === skillId)
    .map((effect) => effect.applyAtMs)
    .sort((left, right) => left - right);

  if (times.length === 0) {
    throw new Error(`Expected scheduled misses for ${skillId}`);
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

function resolveGroundLight(run: CombatRun): CombatRun {
  const [hitAtMs] = scheduledGroundLightTimes(run);

  return stepToElapsed(run, hitAtMs);
}

function resolveGroundHeavy(run: CombatRun): CombatRun {
  const [hitAtMs] = scheduledGroundHeavyTimes(run);

  return stepToElapsed(run, hitAtMs);
}

function stepToElapsed(run: CombatRun, elapsedMs: number): CombatRun {
  return stepCombat(run, {}, Math.max(0, elapsedMs - run.elapsedMs));
}

function quickRecoverState(run: CombatRun): { readyUntilMs: number; startedAtMs: number; untilMs: number } {
  const player = run.player as CombatRun["player"] & {
    quickRecoverReadyUntilMs?: number;
    quickRecoverStartedAtMs?: number;
    quickRecoverUntilMs?: number;
  };

  return {
    readyUntilMs: player.quickRecoverReadyUntilMs ?? 0,
    startedAtMs: player.quickRecoverStartedAtMs ?? 0,
    untilMs: player.quickRecoverUntilMs ?? 0
  };
}

function defeatAll(run: CombatRun): CombatRun {
  return run.enemies.reduce(
    (next, enemy) =>
      applyHit(next, {
        id: `test-kill-${enemy.id}`,
        targetId: enemy.id,
        damage: 9999,
        hitstopMs: 70,
        knockback: 10,
        juggle: false
      }),
    run
  );
}

function reachBossRoom(run: CombatRun): CombatRun {
  const dungeon = catalog.dungeons.find((item) => item.id === run.dungeonId);

  if (!dungeon) {
    throw new Error(`Missing dungeon ${run.dungeonId}`);
  }

  let next = run;

  while (next.roomIndex < dungeon.rooms - 1) {
    next = finishRoom(defeatAll(next));
  }

  return next;
}

function reachEliteRoom(run: CombatRun): CombatRun {
  return finishRoom(defeatAll(run));
}

function withEnemyInRange(run: CombatRun, enemyPatch: Partial<CombatEnemy> = {}): CombatRun {
  return {
    ...run,
    enemies: run.enemies.map((enemy, index) =>
      index === 0
        ? {
            ...enemy,
            position: {
              x: run.player.x + 96,
              y: run.player.y
            },
            nextAttackAtMs: 1,
            ...enemyPatch
          }
        : enemy
      )
  };
}

function withPlayerAndEnemies(
  run: CombatRun,
  playerPatch: Partial<CombatRun["player"]>,
  enemyPositions: Array<{ x: number; y: number; hp?: number; maxHp?: number; armor?: number }>
): CombatRun {
  return {
    ...run,
    player: {
      ...run.player,
      ...playerPatch
    },
    enemies: run.enemies.map((enemy, index) => ({
      ...enemy,
      hp: enemyPositions[index]?.hp ?? enemy.hp,
      maxHp: enemyPositions[index]?.maxHp ?? enemy.maxHp,
      armor: enemyPositions[index]?.armor ?? enemy.armor,
      position: {
        x: enemyPositions[index]?.x ?? enemy.position.x,
        y: enemyPositions[index]?.y ?? enemy.position.y
      },
      nextAttackAtMs: 9999
    }))
  };
}

describe("combat run setup and movement", () => {
  it("creates a dungeon run and clamps belt-scroll movement from keyboard input", () => {
    const run = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const input = mapKeyboardToCombatInput(new Set(["ArrowRight", "ArrowUp"]));
    const moved = stepCombat(run, input, 100);

    expect(run.dungeonId).toBe("cinder-kiln-alley");
    expect(run.roomIndex).toBe(0);
    expect(run.enemies.length).toBeGreaterThan(0);
    expect(moved.player.x).toBeGreaterThan(run.player.x);
    expect(moved.player.y).toBeLessThan(run.player.y);
    expect(moved.player.x).toBeLessThanOrEqual(moved.arena.width);
    expect(moved.player.y).toBeGreaterThanOrEqual(moved.arena.minY);
  });

  it("maps DNF-style skill-slot keys separately from arrow movement", () => {
    const skillInput = mapKeyboardToCombatInput(new Set(["KeyA", "KeyF"]));
    const movementInput = mapKeyboardToCombatInput(new Set(["ArrowLeft", "ArrowDown"]));
    const actionInput = mapKeyboardToCombatInput(new Set(["KeyX", "KeyZ", "KeyC"]));

    expect(skillInput.moveX).toBe(0);
    expect(skillInput.moveY).toBe(0);
    expect(skillInput.skillId).toBe("spark-combo");
    expect(movementInput).toMatchObject({ moveX: -1, moveY: 1 });
    expect(actionInput.light).toBe(true);
    expect(actionInput.heavy).toBe(true);
    expect(actionInput.jump).toBe(true);
  });

  it("rejects entering locked or unknown dungeons", () => {
    expect(() => createCombatRun(createInitialState(), "liuli-furnace")).toThrow(/locked dungeon/i);
    expect(() => createCombatRun(createInitialState(), "missing-dungeon")).toThrow(/unknown dungeon/i);
  });

  it("uses the selected class resource identity and max instead of a generic heat bar", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 140);
    const classDef = catalog.classes.find((item) => item.id === "liuli-blademage");
    const run = createCombatRun(state, "cinder-kiln-alley");

    expect(run.player.resource).toEqual({
      id: classDef?.resource.id,
      displayName: classDef?.resource.displayName,
      current: classDef?.resource.max,
      max: classDef?.resource.max
    });
  });

  it("loads current combat resource from class resource storage when heat alias is stale", () => {
    const state = {
      ...selectBaseClass(createInitialState(), "liuli-blademage"),
      player: {
        ...selectBaseClass(createInitialState(), "liuli-blademage").player,
        heat: 0,
        classResources: {
          "liuli-blademage": 44
        }
      }
    };
    const run = createCombatRun(state, "cinder-kiln-alley");

    expect(run.player.resource.id).toBe("prism");
    expect(run.player.resource.current).toBe(44);
    expect(run.player.heat).toBe(44);
  });

  it("resumes player movement inside a frame that crosses the bound control expiry", () => {
    const baseRun = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const run: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 160,
        y: 345,
        boundUntilMs: 100
      }
    };
    const moved = stepCombat(run, { moveX: 1, moveY: 0, dash: false }, 160);

    expect(moved.player.x).toBeGreaterThan(run.player.x);
    expect(moved.player.x).toBeLessThan(run.player.x + 0.24 * 160);
    expect(moved.player.x).toBeCloseTo(run.player.x + 0.24 * 60, 5);
  });
});

describe("combat actions and impact feel", () => {
  it("resolves grounded light damage, resource, and cancel window only on the real hit frame", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      hp: 180,
      maxHp: 180,
      nextAttackAtMs: 9999
    });
    const cast = performAction(run, { type: "light" });
    const [hitAtMs] = scheduledGroundLightTimes(cast);
    const beforeHit = stepToElapsed(cast, hitAtMs - 1);
    const hit = stepToElapsed(cast, hitAtMs);
    const [lightHit] = hit.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.action === "light");

    expect(cast.events.filter((event) => event.kind === "hit" && event.action === "light")).toHaveLength(0);
    expect(cast.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(cast.player.resource.current).toBe(run.player.resource.current);
    expect(cast.comboCount).toBe(0);
    expect(cast.player.comboStep).toBe(1);
    expect(cast.player.cancelWindowUntilMs).toBe(0);
    expect(cast.player.actionLockUntilMs).toBe(cast.elapsedMs + 180);

    expect(beforeHit.events.filter((event) => event.kind === "hit" && event.action === "light")).toHaveLength(0);
    expect(beforeHit.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(beforeHit.player.resource.current).toBe(run.player.resource.current);
    expect(beforeHit.player.cancelWindowUntilMs).toBe(0);

    expect(lightHit).toMatchObject({
      action: "light",
      inputToHitMs: 55,
      occurredAtMs: hitAtMs,
      hitstopMs: 42,
      comboCount: 1
    });
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
    expect(hit.player.resource.current).toBe(run.player.resource.current + 8);
    expect(hit.comboCount).toBe(1);
    expect(hit.player.comboStep).toBe(1);
    expect(hit.player.cancelWindowUntilMs).toBe(cast.player.actionLockUntilMs);
    expect(hit.player.hitstopUntilMs).toBe(hitAtMs + 42);
  });

  it("rechecks grounded light targets at the hit frame and keeps misses from opening cancel", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      hp: 180,
      maxHp: 180,
      nextAttackAtMs: 9999
    });
    const cast = performAction(run, { type: "light" });
    const [hitAtMs] = scheduledGroundLightTimes(cast);
    const movedOut = stepToElapsed(
      {
        ...cast,
        enemies: cast.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: run.player.x - 240, y: run.player.y + 120 }
              }
            : enemy
        )
      },
      hitAtMs
    );

    expect(movedOut.events.filter((event) => event.kind === "hit" && event.action === "light")).toHaveLength(0);
    expect(movedOut.events.filter((event) => event.kind === "miss" && event.action === "light")).toHaveLength(1);
    expect(movedOut.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(movedOut.player.resource.current).toBe(run.player.resource.current);
    expect(movedOut.comboCount).toBe(0);
    expect(movedOut.player.comboStep).toBe(0);
    expect(movedOut.player.cancelWindowUntilMs).toBe(0);
  });

  it("moves grounded light into its slash point and resolves the hitbox from the moved model position", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 405, y: 340, hp: 180, maxHp: 180 }]
    );
    const cast = performAction(run, { type: "light" });
    const [hitAtMs] = scheduledGroundLightTimes(cast);
    const midWindup = stepToElapsed(cast, cast.elapsedMs + 27);
    const hit = stepToElapsed(cast, hitAtMs);
    const [lightHit] = hit.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.action === "light");

    expect(cast.player.activeSkillMovement).toMatchObject({
      skillId: "ground-light-1",
      startX: run.player.x,
      endX: run.player.x + 18,
      startY: run.player.y,
      endY: run.player.y
    });
    expect(midWindup.player.x).toBeGreaterThan(run.player.x);
    expect(midWindup.player.x).toBeLessThan(run.player.x + 18);
    expect(hit.player.x).toBe(run.player.x + 18);
    expect(lightHit).toMatchObject({
      targetId: run.enemies[0].id,
      action: "light",
      occurredAtMs: hitAtMs
    });
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("keeps the grounded light impact point at contact while knockback moves the enemy model", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 405, y: 340, hp: 180, maxHp: 180 }]
    );
    const hit = resolveGroundLight(performAction(run, { type: "light" }));
    const [lightHit] = hit.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.action === "light");

    expect(lightHit).toMatchObject({
      targetId: run.enemies[0].id,
      impactPosition: { x: 405, y: 340 }
    });
    expect(hit.enemies[0].position.x).toBe(427);
    expect(hit.enemies[0].position.y).toBe(340);
  });

  it("resolves grounded heavy damage, resource, launcher, and hitstop only on the real hit frame", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      hp: 220,
      maxHp: 220,
      nextAttackAtMs: 9999
    });
    const cast = performAction(run, { type: "heavy" });
    const [hitAtMs] = scheduledGroundHeavyTimes(cast);
    const beforeHit = stepToElapsed(cast, hitAtMs - 1);
    const hit = stepToElapsed(cast, hitAtMs);
    const [heavyHit] = hit.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.action === "heavy");

    expect(cast.events.filter((event) => event.kind === "hit" && event.action === "heavy")).toHaveLength(0);
    expect(cast.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(cast.enemies[0].airborne).not.toBe(true);
    expect(cast.player.resource.current).toBe(run.player.resource.current);
    expect(cast.comboCount).toBe(0);
    expect(cast.player.comboStep).toBe(0);
    expect(cast.player.cancelWindowUntilMs).toBe(0);
    expect(cast.player.actionLockUntilMs).toBe(cast.elapsedMs + 260);

    expect(beforeHit.events.filter((event) => event.kind === "hit" && event.action === "heavy")).toHaveLength(0);
    expect(beforeHit.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(beforeHit.enemies[0].airborne).not.toBe(true);
    expect(beforeHit.player.resource.current).toBe(run.player.resource.current);

    expect(heavyHit).toMatchObject({
      action: "heavy",
      inputToHitMs: 85,
      occurredAtMs: hitAtMs,
      hitstopMs: 72,
      comboCount: 1,
      actionTags: expect.arrayContaining(["launcher"])
    });
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
    expect(hit.enemies[0].airborne).toBe(true);
    expect(hit.player.resource.current).toBe(run.player.resource.current + 4);
    expect(hit.comboCount).toBe(1);
    expect(hit.player.comboStep).toBe(0);
    expect(hit.player.cancelWindowUntilMs).toBe(0);
    expect(hit.player.hitstopUntilMs).toBe(hitAtMs + 72);
  });

  it("moves grounded heavy into its launcher point and resolves the hitbox from the moved model position", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 456, y: 340, hp: 220, maxHp: 220 }]
    );
    const cast = performAction(run, { type: "heavy" });
    const [hitAtMs] = scheduledGroundHeavyTimes(cast);
    const midWindup = stepToElapsed(cast, cast.elapsedMs + 42);
    const hit = stepToElapsed(cast, hitAtMs);
    const [heavyHit] = hit.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.action === "heavy");

    expect(cast.player.activeSkillMovement).toMatchObject({
      skillId: "ground-heavy",
      startX: run.player.x,
      endX: run.player.x + 34,
      startY: run.player.y,
      endY: run.player.y
    });
    expect(midWindup.player.x).toBeGreaterThan(run.player.x);
    expect(midWindup.player.x).toBeLessThan(run.player.x + 34);
    expect(hit.player.x).toBe(run.player.x + 34);
    expect(heavyHit).toMatchObject({
      targetId: run.enemies[0].id,
      action: "heavy",
      occurredAtMs: hitAtMs
    });
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("rechecks grounded heavy targets at the launcher frame and delays misses", () => {
    const baseRun = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const inRangeRun = withPlayerAndEnemies(baseRun, { x: 240, y: 340, facing: 1 }, [{ x: 304, y: 340, hp: 220, maxHp: 220 }]);
    const castWithTarget = performAction(inRangeRun, { type: "heavy" });
    const [heavyEffect] = castWithTarget.scheduledEnemyHitEffects.filter((effect) => effect.id.startsWith("ground-heavy-"));
    const [heavyAtMs] = scheduledGroundHeavyTimes(castWithTarget);
    const movedOutBeforeHit = stepToElapsed(
      {
        ...castWithTarget,
        enemies: castWithTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 120, y: 430 }
              }
            : enemy
        )
      },
      heavyAtMs
    );

    const outOfRangeRun = withPlayerAndEnemies(baseRun, { x: 240, y: 340, facing: 1 }, [{ x: 520, y: 340, hp: 220, maxHp: 220 }]);
    const castWithoutTarget = performAction(outOfRangeRun, { type: "heavy" });
    const [lateHeavyAtMs] = scheduledGroundHeavyTimes(castWithoutTarget);
    const movedInBeforeHit = stepToElapsed(
      {
        ...castWithoutTarget,
        enemies: castWithoutTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 304, y: 340 }
              }
            : enemy
        )
      },
      lateHeavyAtMs
    );
    const [lateHit] = movedInBeforeHit.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.action === "heavy");
    const [heavyMiss] = movedOutBeforeHit.events.filter((event) => event.kind === "miss" && event.action === "heavy");

    expect(heavyEffect).toMatchObject({
      hitPhase: "ground-heavy-launch",
      vfxCue: "ground-heavy-impact",
      vfxWindowMs: 320
    });

    expect(movedOutBeforeHit.events.filter((event) => event.kind === "hit" && event.action === "heavy")).toHaveLength(0);
    expect(movedOutBeforeHit.events.filter((event) => event.kind === "miss" && event.action === "heavy")).toHaveLength(1);
    expect(heavyMiss).toMatchObject({
      hitPhase: "ground-heavy-launch",
      vfxCue: "ground-heavy-impact",
      vfxWindowMs: 320
    });
    expect(movedOutBeforeHit.enemies[0].hp).toBe(inRangeRun.enemies[0].hp);
    expect(movedOutBeforeHit.enemies[0].airborne).not.toBe(true);
    expect(movedOutBeforeHit.player.resource.current).toBe(inRangeRun.player.resource.current);
    expect(movedOutBeforeHit.comboCount).toBe(0);

    expect(lateHit).toMatchObject({
      targetId: outOfRangeRun.enemies[0].id,
      action: "heavy",
      hitPhase: "ground-heavy-launch",
      vfxCue: "ground-heavy-impact",
      vfxWindowMs: 320,
      actionTags: expect.arrayContaining(["launcher"])
    });
    expect(movedInBeforeHit.events.filter((event) => event.kind === "miss" && event.action === "heavy")).toHaveLength(0);
    expect(movedInBeforeHit.enemies[0].hp).toBeLessThan(outOfRangeRun.enemies[0].hp);
    expect(movedInBeforeHit.enemies[0].airborne).toBe(true);
  });

  it("cancels pending grounded heavy when monster damage lands before the launcher frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 304, y: 340, hp: 220, maxHp: 220 }]
    );

    const cast = performAction(run, { type: "heavy" });
    const [heavyAtMs] = scheduledGroundHeavyTimes(cast);
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: 80,
            attackRecoverUntilMs: 320,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      heavyAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 80
        })
      ])
    );
    expect(interrupted.events.filter((event) => event.kind === "hit" && event.action === "heavy")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(interrupted.enemies[0].airborne).not.toBe(true);
    expect(interrupted.player.resource.current).toBe(run.player.resource.current);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.action === "heavy" && !effect.skillId)).toHaveLength(0);
  });

  it("does not let grounded light cancel into skills before hit confirm", () => {
    const run = withEnemyInRange(createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"), {
      hp: 180,
      maxHp: 180,
      nextAttackAtMs: 9999
    });
    const cast = performAction(run, { type: "light" });
    const attempted = performAction(cast, { type: "skill", skillId: "spark-combo" });
    const [hitAtMs] = scheduledGroundLightTimes(cast);
    const confirmed = stepToElapsed(cast, hitAtMs);
    const canceled = performAction(confirmed, { type: "skill", skillId: "spark-combo" });
    const [skillCast] = canceled.events.filter((event) => event.kind === "skill-cast" && event.skillId === "spark-combo");

    expect(attempted.events.filter((event) => event.kind === "skill-cast" && event.skillId === "spark-combo")).toHaveLength(0);
    expect(attempted.player.cancelWindowUntilMs).toBe(0);
    expect(attempted.player.bufferedAction).toEqual({ type: "skill", skillId: "spark-combo" });
    expect(skillCast).toMatchObject({
      kind: "skill-cast",
      skillId: "spark-combo",
      canceledFromCombo: true
    });
  });

  it("lands light attacks inside the 80 ms input-to-hit target and advances combo state", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), { nextAttackAtMs: 9999 });
    const firstCast = performAction(run, { type: "light" });
    const first = resolveGroundLight(firstCast);
    const secondCast = performAction(advanceTime(first), { type: "light" });
    const second = resolveGroundLight(secondCast);
    const firstHit = lastHitEvent(first);

    expect(firstHit).toMatchObject({
      kind: "hit",
      action: "light",
      inputToHitMs: 55,
      hitstopMs: 42
    });
    expect(firstHit?.inputToHitMs).toBeLessThanOrEqual(80);
    expect(first.player.comboStep).toBe(1);
    expect(second.player.comboStep).toBe(2);
    expect(second.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("tracks a dungeon-fighter style hit combo counter and expires it after a pause", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      hp: 200,
      maxHp: 200,
      nextAttackAtMs: 9999
    });
    const first = resolveGroundLight(performAction(run, { type: "light" }));
    const second = resolveGroundLight(performAction(advanceTime(first), { type: "light" }));
    const expired = stepCombat(second, {}, 1300);

    expect(first.comboCount).toBe(1);
    expect(lastHitEvent(first).comboCount).toBe(1);
    expect(second.comboCount).toBe(2);
    expect(lastHitEvent(second).comboCount).toBe(2);
    expect(second.comboExpiresAtMs).toBeGreaterThan(second.elapsedMs);
    expect(expired.comboCount).toBe(0);
    expect(expired.comboExpiresAtMs).toBe(0);
  });

  it("turns repeated light attacks into a three-step normal combo with a finisher launch", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      hp: 320,
      maxHp: 320,
      nextAttackAtMs: 9999
    });
    const first = resolveGroundLight(performAction(run, { type: "light" }));
    const secondReady = stepCombat(first, {}, first.player.actionLockUntilMs - first.elapsedMs);
    const second = resolveGroundLight(performAction(secondReady, { type: "light" }));
    const thirdReady = stepCombat(second, {}, second.player.actionLockUntilMs - second.elapsedMs);
    const third = resolveGroundLight(performAction(thirdReady, { type: "light" }));
    const lightHits = third.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.action === "light");

    expect(lightHits.map((event) => event.damage)).toEqual([26, 33, 41]);
    expect(lightHits.map((event) => event.inputToHitMs)).toEqual([55, 65, 78]);
    expect(lightHits.map((event) => event.hitPhase)).toEqual(["ground-light-1", "ground-light-2", "ground-light-3"]);
    expect(lightHits.map((event) => event.vfxCue)).toEqual([
      "ground-light-slash-1",
      "ground-light-slash-2",
      "ground-light-slash-3"
    ]);
    expect(lightHits[2].actionTags).toEqual(expect.arrayContaining(["launcher"]));
    expect(lightHits.map((event) => event.comboCount)).toEqual([1, 2, 3]);
    expect(third.player.comboStep).toBe(3);
    expect(third.player.actionLockUntilMs).toBe(lightHits[2].occurredAtMs - lightHits[2].inputToHitMs + 240);
    expect(third.enemies[0].airborne).toBe(true);
  });

  it("restarts the normal combo from step one after the hit chain expires", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      hp: 320,
      maxHp: 320,
      nextAttackAtMs: 9999
    });
    const first = resolveGroundLight(performAction(run, { type: "light" }));
    const expired = stepCombat(first, {}, 1300);
    const restarted = performAction(expired, { type: "light" });
    const restartHit = lastHitEvent(resolveGroundLight(restarted));

    expect(expired.player.comboStep).toBe(0);
    expect(restarted.player.comboStep).toBe(1);
    expect(restartHit.damage).toBe(26);
    expect(restartHit.inputToHitMs).toBe(55);
    expect(restartHit.comboCount).toBe(1);
  });

  it("turns recent dash movement into a delayed model-following dash-light strike", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 382, y: 340, hp: 180, maxHp: 180 }]
    );
    const dashed = stepCombat(run, { moveX: 1, moveY: 0, dash: true }, 80);
    const cast = performAction(dashed, { type: "light" });
    const [effect] = cast.scheduledEnemyHitEffects.filter((item) => item.hitPhase === "dash-light");
    expect(effect).toBeDefined();
    if (!effect) {
      return;
    }
    const beforeHit = stepToElapsed(cast, effect.applyAtMs - 1);
    const midLunge = stepToElapsed(cast, cast.elapsedMs + 45);
    const hit = stepToElapsed(cast, effect.applyAtMs);
    const [dashHit] = hit.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.action === "light" && event.hitPhase === "dash-light"
    );

    expect(effect).toMatchObject({
      action: "light",
      skillId: "dash-light",
      inputToHitMs: 90,
      hitPhase: "dash-light",
      vfxCue: "dash-light-slash"
    });
    expect(cast.player.activeSkillMovement?.skillId).toBe("dash-light");
    expect(midLunge.player.x).toBeGreaterThan(cast.player.x);
    expect(midLunge.player.x).toBeLessThan(effect.dynamicOrigin?.x ?? 0);
    expect(beforeHit.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(dashHit).toMatchObject({
      targetId: run.enemies[0].id,
      inputToHitMs: 90,
      hitstopMs: 58,
      vfxCue: "dash-light-slash",
      vfxWindowMs: 260
    });
    expect(hit.player.x).toBeCloseTo(effect.dynamicOrigin?.x ?? 0, 5);
    expect(hit.player.comboStep).toBe(0);
    expect(hit.player.activeSkillMovement).toBeUndefined();
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("rechecks dash-light targets at the hit frame instead of locking cast-time targets", () => {
    const inRangeRun = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 382, y: 340, hp: 180, maxHp: 180 }]
    );
    const castWithTarget = performAction(stepCombat(inRangeRun, { moveX: 1, moveY: 0, dash: true }, 80), { type: "light" });
    const [dashEffect] = castWithTarget.scheduledEnemyHitEffects.filter((item) => item.hitPhase === "dash-light");
    expect(dashEffect).toBeDefined();
    if (!dashEffect) {
      return;
    }
    const movedOutBeforeHit = stepToElapsed(
      {
        ...castWithTarget,
        enemies: castWithTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 620, y: 430 }
              }
            : enemy
        )
      },
      dashEffect.applyAtMs
    );

    expect(
      movedOutBeforeHit.events.filter((event) => event.kind === "hit" && event.action === "light" && event.hitPhase === "dash-light")
    ).toHaveLength(0);
    expect(movedOutBeforeHit.events.filter((event) => event.kind === "miss" && event.action === "light" && event.skillId === "dash-light")).toHaveLength(1);
    expect(movedOutBeforeHit.enemies[0].hp).toBe(inRangeRun.enemies[0].hp);

    const outOfRangeRun = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 620, y: 430, hp: 180, maxHp: 180 }]
    );
    const castWithoutTarget = performAction(stepCombat(outOfRangeRun, { moveX: 1, moveY: 0, dash: true }, 80), { type: "light" });
    const [lateDashEffect] = castWithoutTarget.scheduledEnemyHitEffects.filter((item) => item.hitPhase === "dash-light");
    expect(lateDashEffect).toBeDefined();
    if (!lateDashEffect) {
      return;
    }
    const movedInBeforeHit = stepToElapsed(
      {
        ...castWithoutTarget,
        enemies: castWithoutTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 382, y: 340 }
              }
            : enemy
        )
      },
      lateDashEffect.applyAtMs
    );
    const [lateHit] = movedInBeforeHit.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.action === "light" && event.hitPhase === "dash-light"
    );

    expect(lateHit).toMatchObject({
      targetId: outOfRangeRun.enemies[0].id,
      vfxCue: "dash-light-slash"
    });
    expect(movedInBeforeHit.events.filter((event) => event.kind === "miss" && event.action === "light" && event.skillId === "dash-light")).toHaveLength(0);
    expect(movedInBeforeHit.enemies[0].hp).toBeLessThan(outOfRangeRun.enemies[0].hp);
  });

  it("cancels pending dash-light damage when a monster interrupts before the hit frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 350, y: 340, hp: 180, maxHp: 180 }]
    );
    const dashed = stepCombat(run, { moveX: 1, moveY: 0, dash: true }, 80);
    const interruptingRun: CombatRun = {
      ...dashed,
      enemies: dashed.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: dashed.elapsedMs,
              attackImpactAtMs: dashed.elapsedMs + 50,
              attackRecoverUntilMs: dashed.elapsedMs + 420,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };

    const cast = performAction(interruptingRun, { type: "light" });
    const [effect] = cast.scheduledEnemyHitEffects.filter((item) => item.hitPhase === "dash-light");
    expect(effect).toBeDefined();
    if (!effect) {
      return;
    }
    const interrupted = stepToElapsed(cast, effect.applyAtMs);
    const playerHits = interrupted.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(playerHits).toHaveLength(1);
    expect(interrupted.events.filter((event) => event.kind === "hit" && event.action === "light" && event.hitPhase === "dash-light")).toHaveLength(0);
    expect(interrupted.events.filter((event) => event.kind === "miss" && event.action === "light" && event.skillId === "dash-light")).toHaveLength(0);
    expect(interrupted.scheduledEnemyHitEffects.filter((item) => item.skillId === "dash-light")).toHaveLength(0);
  });

  it("clears dash-light readiness and movement state when entering the next room", () => {
    const run = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const cleared = defeatAll(run);
    const dashedAtGate = stepCombat(cleared, { moveX: 1, moveY: 0, dash: true }, 80);
    expect(dashedAtGate.player.dashAttackReadyUntilMs).toBeGreaterThan(dashedAtGate.elapsedMs);

    const nextRoom = finishRoom({
      ...dashedAtGate,
      enemies: dashedAtGate.enemies.map((enemy) => ({ ...enemy, hp: 0 }))
    });
    const nextAction = performAction(nextRoom, { type: "light" });

    expect(nextRoom.roomIndex).toBe(1);
    expect(nextRoom.player.dashAttackReadyUntilMs).toBe(0);
    expect(nextRoom.player.dashAttackStartedAtMs).toBe(0);
    expect(nextRoom.player.dashAttackUntilMs).toBe(0);
    expect(nextRoom.player.activeSkillMovement).toBeUndefined();
    expect(nextAction.scheduledEnemyHitEffects.filter((item) => item.skillId === "dash-light")).toHaveLength(0);
  });

  it("does not precharge dash-light while hurt or bound control locks are active", () => {
    const base = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const hurtLocked: CombatRun = {
      ...base,
      player: {
        ...base.player,
        hurtLockUntilMs: 120
      }
    };
    const hurtDash = stepCombat(hurtLocked, { moveX: 1, moveY: 0, dash: true }, 80);
    const afterHurt = stepToElapsed(hurtDash, 130);
    const hurtAction = performAction(afterHurt, { type: "light" });

    expect(hurtDash.player.dashAttackReadyUntilMs).toBe(0);
    expect(hurtAction.scheduledEnemyHitEffects.filter((item) => item.skillId === "dash-light")).toHaveLength(0);

    const boundLocked: CombatRun = {
      ...base,
      player: {
        ...base.player,
        boundUntilMs: 50
      }
    };
    const boundDash = stepCombat(boundLocked, { moveX: 1, moveY: 0, dash: true }, 80);
    const afterBound = stepToElapsed(boundDash, 100);
    const boundAction = performAction(afterBound, { type: "light" });

    expect(boundDash.player.dashAttackReadyUntilMs).toBe(0);
    expect(boundAction.scheduledEnemyHitEffects.filter((item) => item.skillId === "dash-light")).toHaveLength(0);
  });

  it("keeps launched enemies airborne, blocks their attacks, and then drops them into knockdown", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      hp: 200,
      maxHp: 200,
      nextAttackAtMs: 1
    });
    const windup = performAction(run, { type: "heavy" });
    const [launchAtMs] = scheduledGroundHeavyTimes(windup);
    const beforeLaunch = stepToElapsed(windup, launchAtMs - 1);
    const launched = stepToElapsed(windup, launchAtMs);
    const airborne = stepCombat(launched, {}, 500);
    const knockedDown = stepCombat(airborne, {}, 650);

    expect(windup.comboCount).toBe(0);
    expect(beforeLaunch.enemies[0].airborne).not.toBe(true);
    expect(launched.enemies[0].airborne).toBe(true);
    expect(launched.enemies[0].airborneUntilMs).toBeGreaterThan(launched.elapsedMs);
    expect(airborne.enemies[0].airborne).toBe(true);
    expect(airborne.events.some((event) => event.kind === "enemy-attack")).toBe(false);
    expect(knockedDown.enemies[0].airborne).toBe(false);
    expect(knockedDown.enemies[0].downed).toBe(true);
    expect(knockedDown.enemies[0].downedUntilMs).toBeGreaterThan(knockedDown.elapsedMs);
  });

  it("lets slam skills knock airborne enemies down without waiting for natural fall", () => {
    const run = withEnemyInRange(createCombatRun(withHeat(createInitialState(), 90), "cinder-kiln-alley"), {
      hp: 220,
      maxHp: 220,
      nextAttackAtMs: 9999
    });
    const launched = resolveGroundHeavy(performAction(run, { type: "heavy" }));
    const ready = {
      ...stepCombat(launched, {}, 300),
      player: {
        ...stepCombat(launched, {}, 300).player,
        actionLockUntilMs: 0
      }
    };
    const cast = performAction(ready, { type: "skill", skillId: "anvil-crash" });
    const [slamAtMs] = scheduledSkillTimes(cast, "anvil-crash");
    const beforeSlam = stepToElapsed(cast, slamAtMs - 1);
    const slammed = stepToElapsed(cast, slamAtMs);

    expect(skillHitEvents(cast, "anvil-crash")).toHaveLength(0);
    expect(skillHitEvents(beforeSlam, "anvil-crash")).toHaveLength(0);
    expect(slammed.enemies[0].airborne).toBe(false);
    expect(slammed.enemies[0].downed).toBe(true);
    expect(slammed.enemies[0].downedUntilMs).toBeGreaterThan(slammed.elapsedMs);
    expect(latestHitForSkill(slammed, "anvil-crash").comboCount).toBeGreaterThan(1);
  });

  it("delays anvil-crash into a forward hammer-drop slam frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 332, y: 340, hp: 220, maxHp: 220 },
        { x: 394, y: 350, hp: 220, maxHp: 220 }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "anvil-crash" });
    const [slamAtMs] = scheduledSkillTimes(cast, "anvil-crash");
    const beforeSlam = stepToElapsed(cast, slamAtMs - 1);
    const slammed = stepToElapsed(cast, slamAtMs);
    const slamHits = skillHitEvents(slammed, "anvil-crash");

    expect(slamAtMs - run.elapsedMs).toBe(260);
    expect(cast.player.activeSkillMovement?.skillId).toBe("anvil-crash");
    expect(cast.player.x).toBe(run.player.x);
    expect(beforeSlam.player.x).toBeGreaterThan(run.player.x);
    expect(skillHitEvents(cast, "anvil-crash")).toHaveLength(0);
    expect(skillHitEvents(beforeSlam, "anvil-crash")).toHaveLength(0);
    expect(slamHits).toHaveLength(2);
    expect(slamHits.every((event) => event.hitPhase === "anvil-slam")).toBe(true);
    expect(slamHits.every((event) => event.vfxCue === "anvil-crash-impact")).toBe(true);
    expect(slamHits.every((event) => event.actionTags?.includes("slam"))).toBe(true);
    expect(slamHits.every((event) => event.inputToHitMs === 260)).toBe(true);
    expect(slammed.enemies[0].downed).toBe(true);
  });

  it("rechecks anvil-crash targets at the hammer-drop landing point", () => {
    const inRangeRun = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 330, y: 340, hp: 220, maxHp: 220 }]
    );
    const castWithTarget = performAction(inRangeRun, { type: "skill", skillId: "anvil-crash" });
    const [slamAtMs] = scheduledSkillTimes(castWithTarget, "anvil-crash");
    const movedOutBeforeSlam = stepToElapsed(
      {
        ...castWithTarget,
        enemies: [
          {
            ...castWithTarget.enemies[0],
            position: { x: 560, y: 500 }
          }
        ]
      },
      slamAtMs
    );

    expect(skillHitEvents(movedOutBeforeSlam, "anvil-crash")).toHaveLength(0);
    expect(skillMissEvents(movedOutBeforeSlam, "anvil-crash")).toHaveLength(1);

    const outOfRangeRun = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 520, y: 340, hp: 220, maxHp: 220 }]
    );
    const castWithoutTarget = performAction(outOfRangeRun, { type: "skill", skillId: "anvil-crash" });
    const [lateSlamAtMs] = scheduledSkillTimes(castWithoutTarget, "anvil-crash");
    const movedInBeforeSlam = stepToElapsed(
      {
        ...castWithoutTarget,
        enemies: [
          {
            ...castWithoutTarget.enemies[0],
            position: { x: 452, y: 340 }
          }
        ]
      },
      lateSlamAtMs
    );
    const [lateHit] = skillHitEvents(movedInBeforeSlam, "anvil-crash");

    expect(lateHit).toMatchObject({
      hitPhase: "anvil-slam",
      vfxCue: "anvil-crash-impact"
    });
    expect(skillMissEvents(movedInBeforeSlam, "anvil-crash")).toHaveLength(0);
  });

  it("lets anvil-crash slam around a wall-clamped landing point", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 930, y: 340, facing: 1 },
      [{ x: 910, y: 340, hp: 220, maxHp: 220 }]
    );
    const cast = performAction(run, { type: "skill", skillId: "anvil-crash" });
    const [slamAtMs] = scheduledSkillTimes(cast, "anvil-crash");
    const slammed = stepToElapsed(cast, slamAtMs);
    const [wallHit] = skillHitEvents(slammed, "anvil-crash");

    expect(cast.player.activeSkillMovement?.endX).toBe(run.arena.width);
    expect(wallHit).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "anvil-slam",
      vfxCue: "anvil-crash-impact"
    });
    expect(skillMissEvents(slammed, "anvil-crash")).toHaveLength(0);
  });

  it("cancels anvil-crash slam when monster damage interrupts before landing", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 332, y: 340, hp: 220, maxHp: 220 }]
    );
    const cast = performAction(run, { type: "skill", skillId: "anvil-crash" });
    const [slamAtMs] = scheduledSkillTimes(cast, "anvil-crash");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: slamAtMs,
            attackRecoverUntilMs: 420,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      slamAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: slamAtMs
        })
      ])
    );
    expect(interrupted.player.activeSkillMovement).toBeUndefined();
    expect(skillHitEvents(interrupted, "anvil-crash")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "anvil-crash")).toHaveLength(0);
  });

  it("allows spark-combo cancel during the hit-confirm window and lands on its jab frame", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), { nextAttackAtMs: 9999 });
    const light = resolveGroundLight(performAction(run, { type: "light" }));
    const canceled = performAction(light, { type: "skill", skillId: "spark-combo" });
    const [jabAtMs] = scheduledSkillTimes(canceled, "spark-combo");
    const beforeJab = stepToElapsed(canceled, jabAtMs - 1);
    const jab = stepToElapsed(canceled, jabAtMs);
    const [skillHit] = skillHitEvents(jab, "spark-combo");

    expect(skillHit).toMatchObject({
      kind: "hit",
      action: "skill",
      skillId: "spark-combo",
      canceledFromCombo: true,
      hitPhase: "spark-jab",
      vfxCue: "ember-spark-jab"
    });
    expect(skillHitEvents(canceled, "spark-combo")).toHaveLength(0);
    expect(skillHitEvents(beforeJab, "spark-combo")).toHaveLength(0);
    expect(canceled.player.actionLockUntilMs).toBeGreaterThan(light.player.actionLockUntilMs);
    expect(canceled.enemies[0].hp).toBe(light.enemies[0].hp);
    expect(jab.enemies[0].hp).toBeLessThan(light.enemies[0].hp);
  });

  it("allows spark-combo cancel after the third normal combo step", () => {
    const baseRun = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const run = withEnemyInRange(baseRun, {
      hp: 420,
      maxHp: 420,
      position: {
        x: baseRun.player.x + 50,
        y: baseRun.player.y
      },
      nextAttackAtMs: 9999
    });
    const first = resolveGroundLight(performAction(run, { type: "light" }));
    const second = resolveGroundLight(performAction(stepCombat(first, {}, first.player.actionLockUntilMs - first.elapsedMs), { type: "light" }));
    const third = resolveGroundLight(performAction(stepCombat(second, {}, second.player.actionLockUntilMs - second.elapsedMs), { type: "light" }));
    const canceled = performAction(third, { type: "skill", skillId: "spark-combo" });
    const [jabAtMs] = scheduledSkillTimes(canceled, "spark-combo");
    const jab = stepToElapsed(canceled, jabAtMs);
    const skillHit = latestHitForSkill(jab, "spark-combo");

    expect(third.player.comboStep).toBe(3);
    expect(skillHit.canceledFromCombo).toBe(true);
    expect(canceled.player.actionLockUntilMs).toBeGreaterThan(third.player.actionLockUntilMs);
  });

  it("delays spark-combo into a forward ember jab-chain hit frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 304, y: 340, hp: 180, maxHp: 180 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "spark-combo" });
    const [jabAtMs] = scheduledSkillTimes(cast, "spark-combo");
    const midJab = stepToElapsed(cast, 60);
    const beforeJab = stepToElapsed(cast, jabAtMs - 1);
    const hit = stepToElapsed(cast, jabAtMs);
    const [jabHit] = skillHitEvents(hit, "spark-combo");

    expect(cast.player.x).toBe(run.player.x);
    expect(cast.player.activeSkillMovement?.skillId).toBe("spark-combo");
    expect(skillHitEvents(cast, "spark-combo")).toHaveLength(0);
    expect(jabAtMs).toBe(120);
    expect(midJab.player.x).toBeGreaterThan(run.player.x);
    expect(midJab.player.x).toBeLessThan(run.player.x + 26);
    expect(beforeJab.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(jabHit).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "spark-jab",
      vfxCue: "ember-spark-jab",
      vfxWindowMs: 260
    });
    expect(hit.player.activeSkillMovement?.skillId).toBe("spark-combo");
    expect(hit.player.x).toBe(266);
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("chains spark-combo through three strict ember hit frames", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 306, y: 340, hp: 240, maxHp: 240 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "spark-combo" });
    const [jabAtMs, crossAtMs, finishAtMs] = scheduledSkillTimes(cast, "spark-combo");
    const beforeJab = stepToElapsed(cast, jabAtMs - 1);
    const jab = stepToElapsed(cast, jabAtMs);
    const beforeCross = stepToElapsed(jab, crossAtMs - 1);
    const cross = stepToElapsed(jab, crossAtMs);
    const finish = stepToElapsed(cross, finishAtMs);
    const hits = skillHitEvents(finish, "spark-combo");

    expect([jabAtMs, crossAtMs, finishAtMs]).toEqual([120, 220, 320]);
    expect(skillHitEvents(beforeJab, "spark-combo")).toHaveLength(0);
    expect(skillHitEvents(jab, "spark-combo").map((event) => event.hitPhase)).toEqual(["spark-jab"]);
    expect(skillHitEvents(beforeCross, "spark-combo").map((event) => event.hitPhase)).toEqual(["spark-jab"]);
    expect(skillHitEvents(cross, "spark-combo").map((event) => event.hitPhase)).toEqual(["spark-jab", "spark-cross"]);
    expect(hits.map((event) => event.hitPhase)).toEqual(["spark-jab", "spark-cross", "spark-finish"]);
    expect(hits.map((event) => event.vfxCue)).toEqual(["ember-spark-jab", "ember-spark-cross", "ember-spark-finish"]);
    expect(finish.player.activeSkillMovement).toBeUndefined();
    expect(finish.player.x).toBeGreaterThan(run.player.x + 80);
    expect(finish.enemies[0].hp).toBeLessThan(cross.enemies[0].hp);
  });

  it("rechecks spark-combo targets at the jab frame instead of locking cast-time targets", () => {
    const inRangeRun = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 304, y: 340, hp: 180, maxHp: 180 }]
    );
    const castWithTarget = performAction(inRangeRun, { type: "skill", skillId: "spark-combo" });
    const [jabAtMs] = scheduledSkillTimes(castWithTarget, "spark-combo");
    const movedOutBeforeJab = stepToElapsed(
      {
        ...castWithTarget,
        enemies: castWithTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 520, y: 500 }
              }
            : enemy
        )
      },
      jabAtMs
    );

    expect(skillHitEvents(movedOutBeforeJab, "spark-combo")).toHaveLength(0);
    expect(skillMissEvents(movedOutBeforeJab, "spark-combo")).toHaveLength(1);
    expect(movedOutBeforeJab.enemies[0].hp).toBe(inRangeRun.enemies[0].hp);

    const outOfRangeRun = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 520, y: 500, hp: 180, maxHp: 180 }]
    );
    const castWithoutTarget = performAction(outOfRangeRun, { type: "skill", skillId: "spark-combo" });
    const [lateJabAtMs] = scheduledSkillTimes(castWithoutTarget, "spark-combo");
    const movedInBeforeJab = stepToElapsed(
      {
        ...castWithoutTarget,
        enemies: castWithoutTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 304, y: 340 }
              }
            : enemy
        )
      },
      lateJabAtMs
    );
    const [lateHit] = skillHitEvents(movedInBeforeJab, "spark-combo");

    expect(lateHit).toMatchObject({
      targetId: outOfRangeRun.enemies[0].id,
      hitPhase: "spark-jab",
      vfxCue: "ember-spark-jab"
    });
    expect(skillMissEvents(movedInBeforeJab, "spark-combo")).toHaveLength(0);
    expect(movedInBeforeJab.enemies[0].hp).toBeLessThan(outOfRangeRun.enemies[0].hp);
  });

  it("uses spark-combo forward step as the jab-frame hitbox origin", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 425, y: 340, hp: 180, maxHp: 180 },
        { x: 650, y: 500, hp: 0, maxHp: 180 }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "spark-combo" });
    const [jabAtMs] = scheduledSkillTimes(cast, "spark-combo");
    const hit = stepToElapsed(cast, jabAtMs);
    const [jabHit] = skillHitEvents(hit, "spark-combo");

    expect(hit.player.x).toBe(266);
    expect(jabHit).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "spark-jab",
      vfxCue: "ember-spark-jab"
    });
    expect(skillMissEvents(hit, "spark-combo")).toHaveLength(0);
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("delays spark-combo whiff feedback until the jab frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 520, y: 500, hp: 180, maxHp: 180 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "spark-combo" });
    const [jabAtMs] = scheduledSkillTimes(cast, "spark-combo");
    const beforeJab = stepToElapsed(cast, jabAtMs - 1);
    const missed = stepToElapsed(cast, jabAtMs);

    expect(skillMissEvents(cast, "spark-combo")).toHaveLength(0);
    expect(skillMissEvents(beforeJab, "spark-combo")).toHaveLength(0);
    expect(skillMissEvents(missed, "spark-combo")).toHaveLength(1);
    expect(missed.enemies[0].hp).toBe(run.enemies[0].hp);
  });

  it("delays iron-palm into a forward shield-jab hit frame", () => {
    const state = selectBaseClass(createInitialState(), "iron-forge-guardian");
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 318, y: 340, hp: 190, maxHp: 190 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "iron-palm" });
    const [jabAtMs] = scheduledSkillTimes(cast, "iron-palm");
    const midJab = stepToElapsed(cast, 75);
    const beforeJab = stepToElapsed(cast, jabAtMs - 1);
    const hit = stepToElapsed(cast, jabAtMs);
    const [shieldHit] = skillHitEvents(hit, "iron-palm");

    expect(cast.player.x).toBe(run.player.x);
    expect(cast.player.activeSkillMovement?.skillId).toBe("iron-palm");
    expect(skillHitEvents(cast, "iron-palm")).toHaveLength(0);
    expect(jabAtMs).toBe(150);
    expect(midJab.player.x).toBeGreaterThan(run.player.x);
    expect(midJab.player.x).toBeLessThan(run.player.x + 34);
    expect(beforeJab.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(shieldHit).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "shield-jab",
      vfxCue: "iron-shield-jab",
      vfxWindowMs: 260
    });
    expect(hit.player.activeSkillMovement).toBeUndefined();
    expect(hit.player.x).toBe(274);
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("uses the iron-palm left-facing endpoint as the shield-jab hitbox origin", () => {
    const state = selectBaseClass(createInitialState(), "iron-forge-guardian");
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 360, y: 340, facing: -1 },
      [{ x: 172, y: 340, hp: 190, maxHp: 190 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "iron-palm" });
    const [jabAtMs] = scheduledSkillTimes(cast, "iron-palm");
    const hit = stepToElapsed(cast, jabAtMs);
    const [shieldHit] = skillHitEvents(hit, "iron-palm");

    expect(hit.player.x).toBe(326);
    expect(shieldHit).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "shield-jab",
      vfxCue: "iron-shield-jab"
    });
    expect(skillMissEvents(hit, "iron-palm")).toHaveLength(0);
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("cancels spark-combo jab when monster damage interrupts before the jab frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 304, y: 340, hp: 180, maxHp: 180 }]
    );
    const cast = performAction(run, { type: "skill", skillId: "spark-combo" });
    const [jabAtMs] = scheduledSkillTimes(cast, "spark-combo");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: 80,
            attackRecoverUntilMs: 320,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      jabAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 80
        })
      ])
    );
    expect(interrupted.player.activeSkillMovement).toBeUndefined();
    expect(skillHitEvents(interrupted, "spark-combo")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "spark-combo")).toHaveLength(0);
  });

  it("lets same-frame monster impact interrupt spark-combo before the queued jab resolves", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 304, y: 340, hp: 180, maxHp: 180 }]
    );
    const cast = performAction(run, { type: "skill", skillId: "spark-combo" });
    const [jabAtMs] = scheduledSkillTimes(cast, "spark-combo");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: jabAtMs,
            attackRecoverUntilMs: 320,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      jabAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: jabAtMs
        })
      ])
    );
    expect(skillHitEvents(interrupted, "spark-combo")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(run.enemies[0].hp);
  });

  it("buffers a queued action near the end of an action lock and releases it on the unlock frame", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      hp: 220,
      maxHp: 220,
      nextAttackAtMs: 9999
    });
    const light = resolveGroundLight(performAction(run, { type: "light" }));
    const locked = stepCombat(light, {}, 40);
    const queued = performAction(locked, { type: "heavy" });
    const queuedPlayer = queued.player as typeof queued.player & {
      bufferedAction?: { type: string };
      bufferedActionExecuteAtMs?: number;
    };
    const released = stepToElapsed(queued, queuedPlayer.bufferedActionExecuteAtMs ?? 0);
    const [heavyAtMs] = scheduledGroundHeavyTimes(released);
    const resolved = stepToElapsed(released, heavyAtMs);
    const heavyHit = [...resolved.events].reverse().find(
      (event): event is CombatHitEvent => event.kind === "hit" && event.action === "heavy"
    );

    expect(queued.events.filter((event) => event.kind === "hit" && event.action === "heavy")).toHaveLength(0);
    expect(queuedPlayer.bufferedAction).toEqual({ type: "heavy" });
    expect(queuedPlayer.bufferedActionExecuteAtMs).toBe(light.player.actionLockUntilMs);
    expect(released.events.filter((event) => event.kind === "hit" && event.action === "heavy")).toHaveLength(0);
    expect(heavyHit).toMatchObject({
      action: "heavy",
      occurredAtMs: light.player.actionLockUntilMs + 85
    });
    expect((resolved.player as typeof resolved.player & { bufferedAction?: unknown }).bufferedAction).toBeUndefined();
    expect(resolved.player.actionLockUntilMs).toBe(light.player.actionLockUntilMs + 260);
  });

  it("releases a buffered light attack as the next normal combo step", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      hp: 320,
      maxHp: 320,
      nextAttackAtMs: 9999
    });
    const first = performAction(run, { type: "light" });
    const locked = stepCombat(first, {}, 40);
    const queued = performAction(locked, { type: "light" });
    const queuedPlayer = queued.player as typeof queued.player & { bufferedActionExecuteAtMs?: number };
    const released = stepToElapsed(queued, queuedPlayer.bufferedActionExecuteAtMs ?? 0);
    const resolved = resolveGroundLight(released);
    const lightHits = resolved.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.action === "light");

    expect(queued.player.bufferedAction).toEqual({ type: "light" });
    expect(lightHits.map((event) => event.inputToHitMs)).toEqual([55, 65]);
    expect(lightHits.map((event) => event.comboCount)).toEqual([1, 2]);
    expect(resolved.player.comboStep).toBe(2);
    expect(resolved.player.actionLockUntilMs).toBe(first.player.actionLockUntilMs + 200);
  });

  it("clears a buffered action when the player is interrupted before the release frame", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      hp: 220,
      maxHp: 220,
      nextAttackAtMs: 9999
    });
    const light = resolveGroundLight(performAction(run, { type: "light" }));
    const locked = stepCombat(light, {}, 40);
    const queued = performAction(locked, { type: "heavy" });
    const queuedPlayer = queued.player as typeof queued.player & { bufferedActionExecuteAtMs?: number };
    const interrupted = {
      ...queued,
      player: {
        ...queued.player,
        hurtLockUntilMs: (queuedPlayer.bufferedActionExecuteAtMs ?? 0) + 120
      }
    };
    const resolved = stepCombat(interrupted, {}, 200);

    expect(resolved.events.filter((event) => event.kind === "hit" && event.action === "heavy")).toHaveLength(0);
    expect((resolved.player as typeof resolved.player & { bufferedAction?: unknown }).bufferedAction).toBeUndefined();
    expect(resolved.player.actionLockUntilMs).toBe(light.player.actionLockUntilMs);
  });

  it("keeps command input reductions when a skill is released from the action buffer", () => {
    const run = withEnemyInRange(createCombatRun(withHeat(createInitialState(), 24), "cinder-kiln-alley"), {
      hp: 220,
      maxHp: 220,
      nextAttackAtMs: 9999
    });
    const light = performAction(run, { type: "light" });
    const locked = stepCombat(light, {}, 40);
    const strictLocked = {
      ...locked,
      player: {
        ...locked.player,
        comboStep: 0,
        cancelWindowUntilMs: 0
      }
    };
    const queued = performAction(strictLocked, { type: "skill", skillId: "anvil-crash", inputMethod: "command" });
    const queuedPlayer = queued.player as typeof queued.player & {
      bufferedAction?: { type: string; skillId?: string; inputMethod?: string };
      bufferedActionExecuteAtMs?: number;
    };
    const resolved = stepToElapsed(queued, queuedPlayer.bufferedActionExecuteAtMs ?? 0);
    const castEvent = resolved.events.find((event) => event.kind === "skill-cast" && event.skillId === "anvil-crash");

    expect(queuedPlayer.bufferedAction).toEqual({ type: "skill", skillId: "anvil-crash", inputMethod: "command" });
    expect(resolved.player.resource.current).toBe(strictLocked.player.resource.current + 8 - 22);
    expect(resolved.player.skillCooldowns["anvil-crash"]).toBe((queuedPlayer.bufferedActionExecuteAtMs ?? 0) + 4784);
    expect(castEvent).toMatchObject({
      inputMethod: "command",
      resourceCostPaid: 22,
      cooldownDurationMs: 4784
    });
  });

  it("tracks per-skill cooldowns and blocks recasting until the timer expires", () => {
    const run = withEnemyInRange(createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"), {
      nextAttackAtMs: 9999
    });
    const cast = performAction(run, { type: "skill", skillId: "anvil-crash" });
    const blockedBase = stepCombat(cast, {}, 600);
    const blockedReady = {
      ...blockedBase,
      player: {
        ...blockedBase.player,
        heat: 80,
        actionLockUntilMs: 0
      }
    };

    expect(cast.player.skillCooldowns["anvil-crash"]).toBe(run.elapsedMs + 5200);
    expect(() => performAction(blockedReady, { type: "skill", skillId: "anvil-crash" })).toThrow(/cooldown/i);

    const readyBase = stepCombat(cast, {}, 5300);
    const ready = {
      ...readyBase,
      player: {
        ...readyBase.player,
        heat: 80,
        actionLockUntilMs: 0
      }
    };
    const recast = performAction(ready, { type: "skill", skillId: "anvil-crash" });
    const [recastAtMs] = scheduledSkillTimes(recast, "anvil-crash");
    const recastHit = stepToElapsed(recast, recastAtMs);

    expect(latestHitForSkill(recastHit, "anvil-crash")).toMatchObject({
      kind: "hit",
      action: "skill",
      skillId: "anvil-crash",
      hitPhase: "anvil-slam"
    });
    expect(recast.player.skillCooldowns["anvil-crash"]).toBe(ready.elapsedMs + 5200);
  });

  it("applies DNF-style command input resource and cooldown reductions to skill casts", () => {
    const run = createCombatRun(withHeat(createInitialState(), 24), "cinder-kiln-alley");

    expect(() => performAction(run, { type: "skill", skillId: "anvil-crash" })).toThrow(/Insufficient/i);

    const commandCast = performAction(run, { type: "skill", skillId: "anvil-crash", inputMethod: "command" });
    const castEvent = commandCast.events.find((event) => event.kind === "skill-cast" && event.skillId === "anvil-crash");

    expect(commandCast.player.resource.current).toBe(2);
    expect(skillCooldownRemaining(commandCast, "anvil-crash")).toBe(4784);
    expect(castEvent).toMatchObject({
      inputMethod: "command",
      resourceCostPaid: 22,
      cooldownDurationMs: 4784
    });
  });

  it("uses catalog animation timing for skill hit frames and action locks", () => {
    const run = withEnemyInRange(createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"), {
      nextAttackAtMs: 9999
    });
    const skill = catalog.classSkills.find((item) => item.id === "anvil-crash");

    if (!skill) {
      throw new Error("Expected anvil-crash skill");
    }

    const cast = performAction(run, { type: "skill", skillId: skill.id });
    const [hitAtMs] = scheduledSkillTimes(cast, skill.id);
    const hitRun = stepToElapsed(cast, hitAtMs);
    const hit = latestHitForSkill(hitRun, skill.id);

    expect(skillHitEvents(cast, skill.id)).toHaveLength(0);
    expect(hit.inputToHitMs).toBe(skill.animation.hitFrameMs);
    expect(hit.occurredAtMs - run.elapsedMs).toBe(skill.animation.hitFrameMs);
    expect(hitRun.player.hitstopUntilMs).toBe(hit.occurredAtMs + hit.hitstopMs);
    expect(cast.player.actionLockUntilMs - run.elapsedMs).toBe(skill.animation.durationMs);
  });

  it("freezes combat timers, movement, and monster impacts during hitstop", () => {
    const baseRun = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 324, y: 340, hp: 180, maxHp: 180 }]
    );
    const hitRun = applyHit(baseRun, {
      id: "test-hitstop-freeze",
      targetId: baseRun.enemies[0].id,
      damage: 1,
      hitstopMs: 70,
      knockback: 0,
      juggle: false,
      action: "test"
    });
    const impactAtMs = hitRun.elapsedMs + 10;
    const armedRun: CombatRun = {
      ...hitRun,
      enemies: hitRun.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              position: {
                x: hitRun.player.x + 84,
                y: hitRun.player.y
              },
              attackStartedAtMs: hitRun.elapsedMs,
              attackImpactAtMs: impactAtMs,
              attackRecoverUntilMs: hitRun.elapsedMs + 320,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              attackConnectedHitIndexes: [],
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };

    expect(armedRun.player.hitstopUntilMs).toBe(70);
    const frozen = stepCombat(armedRun, { moveX: 1, moveY: 0 }, 20);

    expect(frozen.elapsedMs).toBe(20);
    expect(frozen.player.x).toBe(armedRun.player.x);
    expect(frozen.events.some((event) => event.kind === "player-hit" && event.skillId === "ash-ember-spit")).toBe(false);
    expect(frozen.enemies[0].attackResolvedHits).toBe(0);
    expect(frozen.enemies[0].attackStartedAtMs).toBe(20);
    expect(frozen.enemies[0].attackImpactAtMs).toBe(30);
    expect(frozen.enemies[0].attackRecoverUntilMs).toBe(340);

    const released = stepCombat(frozen, {}, 50);
    expect(released.elapsedMs).toBe(70);
    expect(released.events.some((event) => event.kind === "player-hit" && event.skillId === "ash-ember-spit")).toBe(false);
    expect(released.enemies[0].attackImpactAtMs).toBe(80);

    const beforeImpact = stepCombat(released, {}, 9);
    expect(beforeImpact.events.some((event) => event.kind === "player-hit" && event.skillId === "ash-ember-spit")).toBe(false);

    const impacted = stepCombat(beforeImpact, {}, 1);
    const playerHit = impacted.events.find(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(playerHit).toMatchObject({
      occurredAtMs: 80,
      hitstopMs: 36
    });
    expect(impacted.enemies[0].attackResolvedHits).toBe(1);
  });

  it("uses equipped attack stats and cooldown stats in combat formulas", () => {
    const plainRun = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      nextAttackAtMs: 9999
    });
    const plainHit = resolveGroundLight(performAction(plainRun, { type: "light" }));
    let gearedState = withEquippedOwnedGear(
      createInitialState(),
      {
        ...createOwnedGear(gearId("ember-artisan", "weapon"), "combat-weapon"),
        reinforceLevel: 6
      }
    );

    gearedState = withEquippedOwnedGear(gearedState, createOwnedGear(gearId("liuli-flow", "sigil"), "combat-sigil"));
    gearedState = withEquippedOwnedGear(gearedState, createOwnedGear(gearId("liuli-flow", "charm"), "combat-charm"));

    const gearedRun = withEnemyInRange(createCombatRun(withHeat(gearedState, 80), "cinder-kiln-alley"), {
      nextAttackAtMs: 9999
    });
    const gearedHit = resolveGroundLight(performAction(gearedRun, { type: "light" }));
    const gearedSkill = performAction(gearedRun, { type: "skill", skillId: "anvil-crash" });

    expect(gearedRun.player.maxHp).toBeGreaterThan(plainRun.player.maxHp);
    expect(lastHitEvent(gearedHit).damage).toBeGreaterThan(lastHitEvent(plainHit).damage);
    expect(gearedSkill.player.skillCooldowns["anvil-crash"]).toBeLessThan(gearedRun.elapsedMs + 5200);
  });

  it("uses stronger hitstop for heavy hits and reduced hitstop against boss armor", () => {
    const run = createCombatRun(unlockLiuli(createInitialState()), "liuli-furnace");
    const targetId = run.enemies[0].id;
    const light = applyHit(run, {
      id: "light-hit",
      targetId,
      damage: 1,
      hitstopMs: 42,
      knockback: 20,
      juggle: false
    });
    const heavy = applyHit(run, {
      id: "heavy-hit",
      targetId,
      damage: 1,
      hitstopMs: 72,
      knockback: 60,
      juggle: true
    });
    const bossRun = reachBossRoom(run);
    const bossArmorHit = applyHit(bossRun, {
      id: "boss-armor-hit",
      targetId: bossRun.enemies[0].id,
      damage: 1,
      hitstopMs: 90,
      knockback: 40,
      juggle: false
    });

    expect(lastHitEvent(light).hitstopMs).toBe(42);
    expect(lastHitEvent(heavy).hitstopMs).toBe(72);
    expect(lastHitEvent(bossArmorHit).hitstopMs).toBe(25);
    expect(lastHitEvent(bossArmorHit).hitstopMs).toBeLessThan(lastHitEvent(light).hitstopMs);
  });

  it("misses basic attacks when enemies are behind, out of range, or outside the lane", () => {
    const baseRun = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const behindRun = withPlayerAndEnemies(
      baseRun,
      { x: 420, y: 340, facing: 1 },
      [
        { x: 330, y: 340 },
        { x: 360, y: 340 }
      ]
    );
    const farRun = withPlayerAndEnemies(
      baseRun,
      { x: 120, y: 340, facing: 1 },
      [
        { x: 420, y: 340 },
        { x: 460, y: 340 }
      ]
    );
    const laneRun = withPlayerAndEnemies(
      baseRun,
      { x: 220, y: 300, facing: 1 },
      [
        { x: 300, y: 420 },
        { x: 340, y: 430 }
      ]
    );

    const behind = resolveGroundLight(performAction(behindRun, { type: "light" }));
    const far = resolveGroundHeavy(performAction(farRun, { type: "heavy" }));
    const wrongLane = resolveGroundLight(performAction(laneRun, { type: "light" }));

    expect(behind.enemies.map((enemy) => enemy.hp)).toEqual(behindRun.enemies.map((enemy) => enemy.hp));
    expect(far.enemies.map((enemy) => enemy.hp)).toEqual(farRun.enemies.map((enemy) => enemy.hp));
    expect(wrongLane.enemies.map((enemy) => enemy.hp)).toEqual(laneRun.enemies.map((enemy) => enemy.hp));
    expect(behind.events.some((event) => event.kind === "hit")).toBe(false);
    expect(far.events.some((event) => event.kind === "hit")).toBe(false);
    expect(wrongLane.events.some((event) => event.kind === "hit")).toBe(false);
    expect(behind.events.at(-1)).toMatchObject({ kind: "miss", action: "light" });
    expect(far.events.at(-1)).toMatchObject({ kind: "miss", action: "heavy" });
  });

  it("uses monster body and hurtbox size so large enemies can be hit at their visible edge", () => {
    const baseRun = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const trashRun = withPlayerAndEnemies(
      baseRun,
      { x: 120, y: 340, facing: 1 },
      [{ x: 310, y: 340 }]
    );
    const bossBaseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const bossRun = withPlayerAndEnemies(
      bossBaseRun,
      { x: 120, y: 340, facing: 1 },
      [{ x: 310, y: 340, hp: 520, maxHp: 520, armor: 0 }]
    );

    expect(bossRun.enemies[0].kind).toBe("boss");
    expect(bossRun.enemies[0].body.width).toBeGreaterThan(trashRun.enemies[0].body.width);
    expect(bossRun.enemies[0].hurtbox.width).toBeGreaterThan(trashRun.enemies[0].hurtbox.width);

    const trashHit = resolveGroundLight(performAction(trashRun, { type: "light" }));
    const bossHit = resolveGroundLight(performAction(bossRun, { type: "light" }));

    expect(trashHit.events.at(-1)).toMatchObject({ kind: "miss", action: "light" });
    expect(lastHitEvent(bossHit).targetId).toBe(bossRun.enemies[0].id);
  });

  it("uses hurtbox overlap instead of center point for front-facing attacks", () => {
    const bossRun = withPlayerAndEnemies(
      reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley")),
      { x: 120, y: 340, facing: 1 },
      [{ x: 80, y: 340, hp: 520, maxHp: 520, armor: 0 }]
    );

    expect(bossRun.enemies[0].kind).toBe("boss");
    expect(bossRun.enemies[0].position.x).toBeLessThan(bossRun.player.x);
    expect(bossRun.enemies[0].position.x + bossRun.enemies[0].hurtbox.width / 2).toBeGreaterThan(bossRun.player.x);

    const hit = resolveGroundLight(performAction(bossRun, { type: "light" }));

    expect(lastHitEvent(hit).targetId).toBe(bossRun.enemies[0].id);
  });

  it("targets the nearest alive enemy in front inside the attack lane", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 380, y: 340 },
        { x: 305, y: 342 }
      ]
    );
    const hit = resolveGroundLight(performAction(run, { type: "light" }));
    const event = lastHitEvent(hit);

    expect(event.targetId).toBe(run.enemies[1].id);
    expect(hit.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
    expect(hit.enemies[0].hp).toBe(run.enemies[0].hp);
  });

  it("heat-bloom draws enemies before erupting on a delayed hit frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 315, y: 340 },
        { x: 390, y: 356 }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "heat-bloom" });
    const [drawAtMs, eruptAtMs] = scheduledSkillTimes(cast, "heat-bloom");
    const beforeDraw = stepToElapsed(cast, drawAtMs - 1);
    const drawRun = stepToElapsed(cast, drawAtMs);
    const eruptionRun = stepToElapsed(drawRun, eruptAtMs);
    const heatBloomHits = skillHitEvents(eruptionRun, "heat-bloom");

    expect([drawAtMs, eruptAtMs]).toEqual([240, 390]);
    expect(skillHitEvents(cast, "heat-bloom")).toHaveLength(0);
    expect(cast.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
    expect(beforeDraw.enemies.map((enemy) => enemy.position.x)).toEqual(run.enemies.map((enemy) => enemy.position.x));
    expect(skillHitEvents(drawRun, "heat-bloom")).toHaveLength(2);
    expect(drawRun.enemies[0].position.x).toBeGreaterThan(run.enemies[0].position.x);
    expect(drawRun.enemies[1].position.x).toBeLessThan(run.enemies[1].position.x);
    expect(heatBloomHits).toHaveLength(4);
    expect(heatBloomHits.map((event) => event.hitPhase)).toEqual([
      "heat-draw",
      "heat-draw",
      "heat-eruption",
      "heat-eruption"
    ]);
    expect(heatBloomHits.map((event) => event.vfxCue)).toEqual([
      "heat-bloom-draw",
      "heat-bloom-draw",
      "heat-bloom-eruption",
      "heat-bloom-eruption"
    ]);
    expect(eruptionRun.enemies.every((enemy) => enemy.hp < run.enemies.find((source) => source.id === enemy.id)!.hp)).toBe(true);
    expect(eruptionRun.enemies.every((enemy) => enemy.airborne && (enemy.airborneUntilMs ?? 0) > eruptionRun.elapsedMs)).toBe(true);
  });

  it("rechecks heat-bloom targets at the draw frame and erupts only drawn enemies", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 315, y: 340, hp: 220, maxHp: 220 },
        { x: 650, y: 420, hp: 220, maxHp: 220 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "heat-bloom" });
    const [drawAtMs, eruptAtMs] = scheduledSkillTimes(cast, "heat-bloom");
    const movedBeforeDraw: CombatRun = {
      ...cast,
      enemies: cast.enemies.map((enemy, index) => ({
        ...enemy,
        position: index === 0 ? { x: 720, y: 420 } : { x: 352, y: 340 }
      }))
    };
    const drawRun = stepToElapsed(movedBeforeDraw, drawAtMs);
    const eruptionRun = stepToElapsed(drawRun, eruptAtMs);
    const heatBloomHits = skillHitEvents(eruptionRun, "heat-bloom");

    expect(skillHitEvents(drawRun, "heat-bloom").map((event) => event.targetId)).toEqual([run.enemies[1].id]);
    expect(heatBloomHits.map((event) => event.targetId)).toEqual([run.enemies[1].id, run.enemies[1].id]);
    expect(heatBloomHits.map((event) => event.hitPhase)).toEqual(["heat-draw", "heat-eruption"]);
    expect(eruptionRun.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(eruptionRun.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
    expect(eruptionRun.enemies[1].airborne).toBe(true);
  });

  it("lets heat-bloom catch targets entering an initially empty field before draw", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 110, y: 340, hp: 220, maxHp: 220 },
        { x: 650, y: 420, hp: 220, maxHp: 220 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "heat-bloom" });
    const [drawAtMs, eruptAtMs] = scheduledSkillTimes(cast, "heat-bloom");
    const movedIntoField: CombatRun = {
      ...cast,
      enemies: cast.enemies.map((enemy, index) => ({
        ...enemy,
        position: index === 1 ? { x: 352, y: 340 } : enemy.position
      }))
    };
    const beforeDraw = stepToElapsed(movedIntoField, drawAtMs - 1);
    const eruptionRun = stepToElapsed(movedIntoField, eruptAtMs);
    const heatBloomHits = skillHitEvents(eruptionRun, "heat-bloom");

    expect(skillHitEvents(beforeDraw, "heat-bloom")).toHaveLength(0);
    expect(skillMissEvents(eruptionRun, "heat-bloom")).toHaveLength(0);
    expect(heatBloomHits.map((event) => event.targetId)).toEqual([run.enemies[1].id, run.enemies[1].id]);
    expect(heatBloomHits.map((event) => event.hitPhase)).toEqual(["heat-draw", "heat-eruption"]);
    expect(eruptionRun.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(eruptionRun.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
  });

  it("cancels pending heat-bloom draw and eruption when monster damage interrupts the cast", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [
        { x: 315, y: 340 },
        { x: 390, y: 356 }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "heat-bloom" });
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: cast.enemies.map((enemy, index) =>
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
      390
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 220
        })
      ])
    );
    expect(skillHitEvents(interrupted, "heat-bloom")).toHaveLength(0);
    expect(interrupted.enemies.map((enemy) => enemy.hp)).toEqual(cast.enemies.map((enemy) => enemy.hp));
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "heat-bloom")).toHaveLength(0);
  });

  it("does not erupt against heat-bloom targets killed by the draw frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 315, y: 340, hp: 12, maxHp: 12, armor: 0 },
        { x: 390, y: 356, hp: 12, maxHp: 12, armor: 0 }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "heat-bloom" });
    const [, eruptAtMs] = scheduledSkillTimes(cast, "heat-bloom");
    const resolved = stepToElapsed(cast, eruptAtMs);
    const heatBloomHits = skillHitEvents(resolved, "heat-bloom");

    expect(resolved.enemies.every((enemy) => enemy.hp === 0)).toBe(true);
    expect(heatBloomHits.map((event) => event.hitPhase)).toEqual(["heat-draw", "heat-draw"]);
    expect(heatBloomHits.some((event) => event.hitPhase === "heat-eruption")).toBe(false);
  });

  it("spends and updates the selected class resource when a non-ember class casts", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 40);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 315, y: 340 },
        { x: 390, y: 356 }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "mirror-arc" });

    expect(cast.player.resource.id).toBe("prism");
    expect(cast.player.resource.current).toBe(34);
    expect(cast.player.heat).toBe(cast.player.resource.current);
  });

  it("adds heat burst damage for ember burst skills at high heat", () => {
    const lowHeat = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 40), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 315, y: 340 },
        { x: 390, y: 356 }
      ]
    );
    const highHeat = {
      ...lowHeat,
      player: {
        ...lowHeat.player,
        heat: 90,
        resource: {
          ...lowHeat.player.resource,
          current: 90
        }
      }
    };

    const normal = performAction(lowHeat, { type: "skill", skillId: "anvil-crash" });
    const burst = performAction(highHeat, { type: "skill", skillId: "anvil-crash" });
    const [normalAtMs] = scheduledSkillTimes(normal, "anvil-crash");
    const [burstAtMs] = scheduledSkillTimes(burst, "anvil-crash");
    const normalHit = stepToElapsed(normal, normalAtMs);
    const burstHit = stepToElapsed(burst, burstAtMs);

    expect(latestHitForSkill(burstHit, "anvil-crash").damage).toBeGreaterThan(latestHitForSkill(normalHit, "anvil-crash").damage);
  });

  it("rewards liuli prism cycling with resource refund and shorter cooldown", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 40);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 315, y: 340 },
        { x: 390, y: 356 }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "mirror-arc" });

    expect(cast.player.resource.current).toBe(34);
    expect(cast.player.prismChain).toBe(1);
    expect(cast.player.lastSkillId).toBe("mirror-arc");
    expect(cast.player.skillCooldowns["mirror-arc"]).toBeLessThan(run.elapsedMs + 3600);
  });

  it("lets ink marking skills stack marks and detonate them for bonus damage", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 315, y: 340 },
        { x: 390, y: 356 }
      ]
    );
    const markingCast = performAction(run, { type: "skill", skillId: "marking-bolt" });
    const [markAtMs] = scheduledSkillTimes(markingCast, "marking-bolt");
    const marked = stepToElapsed(markingCast, markAtMs);
    const ready = {
      ...stepCombat(marked, {}, 500),
      player: {
        ...stepCombat(marked, {}, 500).player,
        actionLockUntilMs: 0
      }
    };
    const detonated = performAction(ready, { type: "skill", skillId: "night-mark-detonation" });
    const resolved = stepCombat(detonated, {}, 490);

    expect(markingCast.enemies[0].marks).toBe(0);
    expect(marked.enemies[0].marks).toBe(2);
    expect(detonated.enemies[0].marks).toBe(2);
    expect(resolved.enemies[0].marks).toBe(0);
    expect(skillHitEvents(detonated, "night-mark-detonation")).toHaveLength(0);
    expect(latestHitForSkill(resolved, "night-mark-detonation").damage).toBeGreaterThan(50);
  });

  it("detonates night marks as staged bursts on every marked target", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 100)),
      "night-contract-hunter"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 318, y: 340, hp: 260, maxHp: 260 },
        { x: 376, y: 348, hp: 260, maxHp: 260 }
      ]
    );
    const markedRun = {
      ...run,
      enemies: run.enemies.map((enemy, index) => ({
        ...enemy,
        marks: index === 0 ? 3 : 2
      }))
    };
    const detonated = performAction(markedRun, { type: "skill", skillId: "night-mark-detonation" });
    const [lockAtMs, burstAtMs] = scheduledSkillTimes(detonated, "night-mark-detonation");

    expect(skillHitEvents(detonated, "night-mark-detonation")).toHaveLength(0);
    expect(detonated.enemies.map((enemy) => enemy.marks)).toEqual([3, 2]);
    expect(detonated.enemies.some((enemy) => enemy.downed)).toBe(false);

    const beforeLock = stepToElapsed(detonated, lockAtMs - 1);

    expect(beforeLock.enemies.map((enemy) => enemy.marks)).toEqual([3, 2]);
    expect(beforeLock.enemies.map((enemy) => enemy.hp)).toEqual([260, 260]);
    expect(beforeLock.enemies.some((enemy) => enemy.downed)).toBe(false);
    expect(beforeLock.enemies.map((enemy) => enemy.controlledUntilMs ?? 0)).toEqual([0, 0]);
    expect(beforeLock.enemies.map((enemy) => enemy.statusSourceSkillId)).toEqual([undefined, undefined]);

    const lockFrame = stepToElapsed(beforeLock, lockAtMs);
    const lockHp = lockFrame.enemies.map((enemy) => enemy.hp);

    expect(lockFrame.enemies.map((enemy) => enemy.marks)).toEqual([3, 2]);
    expect(lockHp[0]).toBeLessThan(260);
    expect(lockHp[1]).toBeLessThan(260);
    expect(lockFrame.enemies.some((enemy) => enemy.downed)).toBe(false);
    expect(lockFrame.enemies.every((enemy) => (enemy.controlledUntilMs ?? 0) > lockAtMs)).toBe(true);
    expect(lockFrame.enemies.map((enemy) => enemy.statusSourceSkillId)).toEqual([
      "night-mark-detonation",
      "night-mark-detonation"
    ]);

    const burstFrame = stepToElapsed(lockFrame, burstAtMs);
    const detonationHits = skillHitEvents(burstFrame, "night-mark-detonation");

    expect(detonationHits).toHaveLength(4);
    expect(detonationHits.map((event) => event.hitPhase)).toEqual(["mark-lock", "mark-lock", "detonate", "detonate"]);
    expect(detonationHits.map((event) => event.vfxCue)).toEqual([
      "night-mark-lock",
      "night-mark-lock",
      "night-mark-burst",
      "night-mark-burst"
    ]);
    expect(detonationHits.map((event) => event.occurredAtMs)).toEqual([310, 310, 490, 490]);
    expect(new Set(detonationHits.map((event) => event.targetId)).size).toBe(2);
    expect(detonationHits[2].damage).toBeGreaterThan(detonationHits[0].damage);
    expect(detonationHits[2].hitstopMs).toBeGreaterThan(detonationHits[0].hitstopMs);
    expect(burstFrame.enemies.map((enemy) => enemy.marks)).toEqual([0, 0]);
    expect(burstFrame.enemies[0].hp).toBeLessThan(lockHp[0]);
    expect(burstFrame.enemies[1].hp).toBeLessThan(lockHp[1]);
    expect(burstFrame.enemies.every((enemy) => enemy.downed)).toBe(true);
  });

  it("rechecks marked targets at the night mark lock frame", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 100)),
      "night-contract-hunter"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 318, y: 340, hp: 260, maxHp: 260 },
        { x: 860, y: 340, hp: 260, maxHp: 260 }
      ]
    );
    const markedRun = {
      ...run,
      enemies: run.enemies.map((enemy, index) => ({
        ...enemy,
        marks: index === 0 ? 3 : 2
      }))
    };
    const detonated = performAction(markedRun, { type: "skill", skillId: "night-mark-detonation" });
    const [lockAtMs] = scheduledSkillTimes(detonated, "night-mark-detonation");
    const shiftedBeforeLock = {
      ...detonated,
      enemies: detonated.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              position: { x: 860, y: 340 }
            }
          : {
              ...enemy,
              position: { x: 330, y: 340 }
            }
      )
    };
    const beforeLock = stepToElapsed(shiftedBeforeLock, lockAtMs - 1);
    const lockFrame = stepToElapsed(beforeLock, lockAtMs);
    const lockHits = skillHitEvents(lockFrame, "night-mark-detonation");

    expect(beforeLock.enemies.map((enemy) => enemy.hp)).toEqual([260, 260]);
    expect(lockHits).toHaveLength(1);
    expect(lockHits[0].hitPhase).toBe("mark-lock");
    expect(lockHits[0].targetId).toBe(run.enemies[1].id);
    expect(lockFrame.enemies[0].hp).toBe(260);
    expect(lockFrame.enemies[1].hp).toBeLessThan(260);
    expect(lockFrame.enemies[0].statusSourceSkillId).toBeUndefined();
    expect(lockFrame.enemies[1].statusSourceSkillId).toBe("night-mark-detonation");
  });

  it("makes night mark detonation miss when no marked target is available", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 100)),
      "night-contract-hunter"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 318, y: 340 },
        { x: 376, y: 348 }
      ]
    );
    const detonated = performAction(run, { type: "skill", skillId: "night-mark-detonation" });
    const [lockAtMs] = scheduledSkillTimes(detonated, "night-mark-detonation");
    const beforeLock = stepToElapsed(detonated, lockAtMs - 1);
    const lockFrame = stepToElapsed(beforeLock, lockAtMs);

    expect(skillMissEvents(detonated, "night-mark-detonation")).toHaveLength(0);
    expect(skillMissEvents(beforeLock, "night-mark-detonation")).toHaveLength(0);
    expect(skillMissEvents(lockFrame, "night-mark-detonation")).toHaveLength(1);
    expect(skillMissEvents(lockFrame, "night-mark-detonation")[0]).toMatchObject({
      kind: "miss",
      action: "skill",
      skillId: "night-mark-detonation",
      occurredAtMs: lockAtMs
    });
    expect(lockFrame.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
  });

  it("delays molten-wall shield mitigation until the wall frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340, hp: 180, maxHp: 180, armor: 0 }]
    );
    const shielded = performAction(run, { type: "skill", skillId: "molten-wall" });
    const [wallAtMs] = scheduledSkillTimes(shielded, "molten-wall");
    const beforeWall = stepToElapsed(shielded, wallAtMs - 1);
    const walled = stepToElapsed(shielded, wallAtMs);
    const armedEnemyRun: CombatRun = {
      ...shielded,
      enemies: shielded.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: 0,
              attackImpactAtMs: wallAtMs + 20,
              attackRecoverUntilMs: wallAtMs + 520,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };
    const impacted = stepToElapsed(armedEnemyRun, wallAtMs + 20);

    expect(wallAtMs).toBe(260);
    expect(shielded.player.activeSkillMovement?.skillId).toBe("molten-wall");
    expect(shielded.player.activeSkillMovement?.endX).toBe(246);
    expect(shielded.player.shieldUntilMs).toBeLessThanOrEqual(shielded.elapsedMs);
    expect(shielded.enemies[0].hp).toBe(180);
    expect(skillHitEvents(shielded, "molten-wall")).toHaveLength(0);
    expect(beforeWall.player.shieldUntilMs).toBeLessThanOrEqual(beforeWall.elapsedMs);
    expect(walled.player.shieldUntilMs).toBeGreaterThan(walled.elapsedMs);
    expect(walled.player.shieldReduction).toBeGreaterThanOrEqual(0.5);
    expect(impacted.player.hp).toBeGreaterThan(run.player.hp - 28);
    expect(impacted.player.shieldUntilMs).toBeLessThanOrEqual(impacted.elapsedMs);
    expect(impacted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          damage: 14
        })
      ])
    );
  });

  it("cancels molten-wall opening when monster damage interrupts startup", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340, hp: 180, maxHp: 180, armor: 0 }]
    );
    const interruptingRun: CombatRun = {
      ...run,
      enemies: run.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: 0,
              attackImpactAtMs: 120,
              attackRecoverUntilMs: 620,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };

    const cast = performAction(interruptingRun, { type: "skill", skillId: "molten-wall" });
    const [wallAtMs] = scheduledSkillTimes(cast, "molten-wall");
    const interrupted = stepToElapsed(cast, wallAtMs);
    const playerHits = interrupted.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(playerHits).toHaveLength(1);
    expect(interrupted.player.shieldUntilMs).toBeLessThanOrEqual(interrupted.elapsedMs);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "molten-wall")).toHaveLength(0);
  });

  it("delays crow-feint dodge and shot until their strict action frames", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 360, y: 340, facing: 1 },
      [{ x: 520, y: 340, hp: 180, maxHp: 180 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "crow-feint" });
    const [shotAtMs] = scheduledSkillTimes(cast, "crow-feint");
    const startup = stepToElapsed(cast, 89);
    const evading = stepToElapsed(cast, 90);
    const beforeShot = stepToElapsed(cast, shotAtMs - 1);
    const shot = stepToElapsed(cast, shotAtMs);
    const [feintHit] = skillHitEvents(shot, "crow-feint");

    expect(shotAtMs).toBe(190);
    expect(cast.player.x).toBe(run.player.x);
    expect(cast.player.evadeUntilMs).toBe(0);
    expect(cast.player.invulnerableUntilMs).toBe(0);
    expect(cast.player.activeSkillMovement?.skillId).toBe("crow-feint");
    expect(skillHitEvents(cast, "crow-feint")).toHaveLength(0);
    expect(cast.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(startup.player.evadeUntilMs).toBe(0);
    expect(evading.player.evadeUntilMs).toBeGreaterThan(evading.elapsedMs);
    expect(evading.player.invulnerableUntilMs).toBeGreaterThan(evading.elapsedMs);
    expect(beforeShot.player.x).toBeLessThan(run.player.x);
    expect(skillHitEvents(beforeShot, "crow-feint")).toHaveLength(0);
    expect(feintHit).toMatchObject({
      hitPhase: "feint-shot",
      vfxCue: "crow-feint-shot",
      vfxWindowMs: 320
    });
    expect(shot.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("uses crow-feint active frames to dodge hits and cancels if hit during startup", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90);
    const startupRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 300, y: 340, hp: 180, maxHp: 180 }]
    );
    const startupCast = performAction(startupRun, { type: "skill", skillId: "crow-feint" });
    const [startupShotAtMs] = scheduledSkillTimes(startupCast, "crow-feint");
    const startupHitRun: CombatRun = {
      ...startupCast,
      enemies: startupCast.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: startupCast.elapsedMs,
              attackImpactAtMs: startupCast.elapsedMs + 70,
              attackRecoverUntilMs: startupCast.elapsedMs + 260,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };
    const interrupted = stepToElapsed(startupHitRun, startupShotAtMs);
    const startupPlayerHits = interrupted.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(startupPlayerHits).toHaveLength(1);
    expect(skillHitEvents(interrupted, "crow-feint")).toHaveLength(0);
    expect(skillMissEvents(interrupted, "crow-feint")).toHaveLength(0);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "crow-feint")).toHaveLength(0);

    const activeRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 300, y: 340, hp: 180, maxHp: 180 }]
    );
    const activeCast = performAction(activeRun, { type: "skill", skillId: "crow-feint" });
    const [activeShotAtMs] = scheduledSkillTimes(activeCast, "crow-feint");
    const activeAttackRun: CombatRun = {
      ...activeCast,
      enemies: activeCast.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: activeCast.elapsedMs,
              attackImpactAtMs: activeCast.elapsedMs + 110,
              attackRecoverUntilMs: activeCast.elapsedMs + 300,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };
    const dodged = stepToElapsed(activeAttackRun, activeShotAtMs);

    expect(dodged.player.hp).toBe(activeRun.player.hp);
    expect(dodged.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          phase: "miss"
        })
      ])
    );
    expect(dodged.events.some((event) => event.kind === "player-hit")).toBe(false);
    expect(skillHitEvents(dodged, "crow-feint")).toHaveLength(1);
  });

  it("rechecks crow-feint shot targets on the feint-shot frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90);
    const inRangeRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 360, y: 340, facing: 1 },
      [{ x: 520, y: 340, hp: 180, maxHp: 180 }]
    );
    const castWithTarget = performAction(inRangeRun, { type: "skill", skillId: "crow-feint" });
    const [shotAtMs] = scheduledSkillTimes(castWithTarget, "crow-feint");
    const movedOutBeforeShot = stepToElapsed(
      {
        ...castWithTarget,
        enemies: castWithTarget.enemies.map((enemy) => ({
          ...enemy,
          position: { x: 760, y: 500 }
        }))
      },
      shotAtMs
    );

    expect(skillHitEvents(movedOutBeforeShot, "crow-feint")).toHaveLength(0);
    expect(skillMissEvents(movedOutBeforeShot, "crow-feint")).toHaveLength(1);
    expect(movedOutBeforeShot.enemies[0].hp).toBe(inRangeRun.enemies[0].hp);

    const outOfRangeRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 360, y: 340, facing: 1 },
      [{ x: 760, y: 500, hp: 180, maxHp: 180 }]
    );
    const castWithoutTarget = performAction(outOfRangeRun, { type: "skill", skillId: "crow-feint" });
    const [lateShotAtMs] = scheduledSkillTimes(castWithoutTarget, "crow-feint");
    const movedInBeforeShot = stepToElapsed(
      {
        ...castWithoutTarget,
        enemies: castWithoutTarget.enemies.map((enemy) => ({
          ...enemy,
          position: { x: 510, y: 340 }
        }))
      },
      lateShotAtMs
    );

    expect(skillHitEvents(movedInBeforeShot, "crow-feint")).toHaveLength(1);
    expect(skillMissEvents(movedInBeforeShot, "crow-feint")).toHaveLength(0);
  });

  it("lets every class backstep into a short dodge window without spending resources", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1 },
      [{ x: 322, y: 340 }]
    );
    const resourceBefore = run.player.resource.current;
    const backstep = performAction(run, { type: "backstep" });
    const telegraph = stepCombat(
      withEnemyInRange(backstep, {
        position: { x: backstep.player.x + 20, y: backstep.player.y },
        nextAttackAtMs: backstep.elapsedMs + 1
      }),
      {},
      80
    );
    const dodged = stepCombat(telegraph, {}, 360);

    expect(backstep.player.x).toBeLessThan(run.player.x);
    expect(backstep.player.facing).toBe(run.player.facing);
    expect(backstep.player.evadeUntilMs).toBeGreaterThan(backstep.elapsedMs);
    expect(backstep.player.actionLockUntilMs).toBeGreaterThan(backstep.elapsedMs);
    expect(backstep.player.resource.current).toBe(resourceBefore);
    expect(backstep.events.filter((event) => event.kind === "hit" || event.kind === "miss")).toHaveLength(0);
    expect(dodged.player.hp).toBe(run.player.hp);
    expect(dodged.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          phase: "miss"
        })
      ])
    );
    expect(dodged.events.some((event) => event.kind === "player-hit")).toBe(false);
  });

  it("lets C trigger a DNF-style quick recover during strong monster hurt lock", () => {
    const baseRun = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const run = withEnemyInRange(baseRun, {
      ...({ attackProfileId: "ash-crawler-burst" } as unknown as Partial<CombatEnemy>),
      position: { x: baseRun.player.x + 92, y: baseRun.player.y },
      nextAttackAtMs: 1
    });
    const telegraph = stepCombat(run, {}, 1);
    const impactAtMs = telegraph.enemies[0].attackImpactAtMs ?? 0;
    const impacted = stepToElapsed(telegraph, impactAtMs);
    const playerHit = impacted.events.find(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-crawler-burst"
    );
    const ready = quickRecoverState(impacted);

    expect(playerHit).toBeDefined();
    expect(impacted.player.hurtLockUntilMs).toBeGreaterThan(impacted.elapsedMs);
    expect(ready.readyUntilMs).toBeGreaterThan(impacted.elapsedMs);
    expect(ready.readyUntilMs).toBeLessThan(impacted.player.hurtLockUntilMs);

    const recovered = performAction(impacted, { type: "jump" });
    const recovering = quickRecoverState(recovered);

    expect(recovering.startedAtMs).toBe(impacted.elapsedMs);
    expect(recovering.untilMs).toBeGreaterThan(recovered.elapsedMs);
    expect(recovered.player.hurtLockUntilMs).toBe(impacted.elapsedMs);
    expect(recovered.player.boundUntilMs).toBe(0);
    expect(recovered.player.invulnerableUntilMs).toBeGreaterThanOrEqual(recovered.elapsedMs + 500);
    expect(recovered.player.actionLockUntilMs).toBe(recovering.untilMs);
    expect(recovered.player.airState).toBe("grounded");

    const followUpRun: CombatRun = {
      ...recovered,
      enemies: recovered.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              position: { x: recovered.player.x + 36, y: recovered.player.y },
              attackStartedAtMs: recovered.elapsedMs,
              attackImpactAtMs: recovered.elapsedMs + 120,
              attackRecoverUntilMs: recovered.elapsedMs + 320,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };
    const protectedByRecover = stepToElapsed(followUpRun, recovered.elapsedMs + 120);

    expect(protectedByRecover.events.some((event) => event.kind === "enemy-attack" && event.phase === "active")).toBe(true);
    expect(
      protectedByRecover.events.some(
        (event) => event.kind === "player-hit" && event.skillId === "ash-ember-spit" && event.occurredAtMs === recovered.elapsedMs + 120
      )
    ).toBe(false);
    expect(protectedByRecover.player.hp).toBe(recovered.player.hp);
  });

  it("does not quick recover from light projectile hits or after the recover window expires", () => {
    const lightRun = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      position: { x: 260, y: 345 },
      nextAttackAtMs: 1
    });
    const lightTelegraph = stepCombat(lightRun, {}, 1);
    const lightImpact = stepToElapsed(lightTelegraph, lightTelegraph.enemies[0].attackImpactAtMs ?? 0);
    const lightAttempt = performAction(lightImpact, { type: "jump" });

    expect(lightImpact.events.some((event) => event.kind === "player-hit" && event.skillId === "ash-ember-spit")).toBe(true);
    expect(quickRecoverState(lightImpact).readyUntilMs).toBe(0);
    expect(quickRecoverState(lightAttempt).startedAtMs).toBe(0);
    expect(lightAttempt.player.airState).toBe("grounded");
    expect(lightAttempt.player.hurtLockUntilMs).toBe(lightImpact.player.hurtLockUntilMs);

    const baseRun = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const heavyRun = withEnemyInRange(baseRun, {
      ...({ attackProfileId: "ash-crawler-burst" } as unknown as Partial<CombatEnemy>),
      position: { x: baseRun.player.x + 92, y: baseRun.player.y },
      nextAttackAtMs: 1
    });
    const heavyTelegraph = stepCombat(heavyRun, {}, 1);
    const heavyImpact = stepToElapsed(heavyTelegraph, heavyTelegraph.enemies[0].attackImpactAtMs ?? 0);
    const readyUntilMs = quickRecoverState(heavyImpact).readyUntilMs;
    const expired = stepToElapsed(heavyImpact, readyUntilMs + 1);
    const expiredAttempt = performAction(expired, { type: "jump" });

    expect(readyUntilMs).toBeGreaterThan(heavyImpact.elapsedMs);
    expect(expired.elapsedMs).toBeLessThan(expired.player.hurtLockUntilMs);
    expect(quickRecoverState(expiredAttempt).startedAtMs).toBe(0);
    expect(expiredAttempt.player.hurtLockUntilMs).toBe(expired.player.hurtLockUntilMs);
  });

  it("lets every class jump into a timed airborne state without moving combat lane height", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1 },
      [{ x: 322, y: 340 }]
    );
    const jumped = performAction(run, { type: "jump" });
    const midair = stepCombat(jumped, { moveX: 1 }, 220);
    const landed = stepCombat(jumped, {}, 560);

    expect(jumped.player.airState).toBe("jumping");
    expect(jumped.player.airborneUntilMs).toBeGreaterThan(jumped.elapsedMs);
    expect(jumped.player.jumpStartedAtMs).toBe(jumped.elapsedMs);
    expect(jumped.player.y).toBe(run.player.y);
    expect(jumped.player.actionLockUntilMs).toBeGreaterThan(jumped.elapsedMs);
    expect(midair.player.x).toBeGreaterThan(jumped.player.x);
    expect(midair.player.y).toBe(run.player.y);
    expect(midair.player.airState).toBe("jumping");
    expect(landed.player.airState).toBe("grounded");
    expect(landed.player.airborneUntilMs).toBe(0);
  });

  it("lets airborne light attack connect once per jump with a dedicated hit phase", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1 },
      [{ x: 350, y: 340 }]
    );
    const jumped = performAction(run, { type: "jump" });
    const midair = stepCombat(jumped, {}, 180);
    const yBefore = midair.player.y;
    const airWindup = performAction(midair, { type: "light" });
    const immediateAirHits = airWindup.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.action === "light" && event.hitPhase === "air-light"
    );
    const airStrike = stepCombat(airWindup, {}, 65);
    const airHits = airStrike.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.action === "light" && event.hitPhase === "air-light"
    );
    const target = airStrike.enemies[0];
    const secondAttempt = performAction(airWindup, { type: "light" });
    const scheduledAirHits = secondAttempt.scheduledEnemyHitEffects.filter((effect) => effect.hitPhase === "air-light");
    const landed = stepCombat(airStrike, {}, airStrike.player.landingUntilMs - airStrike.elapsedMs);

    expect(midair.player.airState).toBe("jumping");
    expect(immediateAirHits).toHaveLength(0);
    expect(airWindup.enemies[0].hp).toBe(midair.enemies[0].hp);
    expect(airWindup.scheduledEnemyHitEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "light",
          applyAtMs: airWindup.elapsedMs + 65,
          hitPhase: "air-light",
          vfxCue: "air-light-slash"
        })
      ])
    );
    expect(airHits).toHaveLength(1);
    expect(airHits[0]).toMatchObject({
      targetId: target.id,
      inputToHitMs: 65,
      hitPhase: "air-light",
      vfxCue: "air-light-slash"
    });
    expect(airStrike.enemies[0].hp).toBeLessThan(midair.enemies[0].hp);
    expect(airStrike.player.y).toBe(yBefore);
    expect(airStrike.player.airState).toBe("jumping");
    expect(airStrike.player.comboStep).toBe(0);
    expect((airStrike.player as { airAttackUsed?: boolean }).airAttackUsed).toBe(true);
    expect(scheduledAirHits).toHaveLength(1);
    expect(secondAttempt.player.bufferedAction).toBeUndefined();
    expect((landed.player as { airAttackUsed?: boolean }).airAttackUsed).toBe(false);
  });

  it("lets airborne heavy attack slam on a strict delayed hit frame with dedicated VFX", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1 },
      [{ x: 366, y: 340 }]
    );
    const jumped = performAction(run, { type: "jump" });
    const midair = stepCombat(jumped, {}, 180);
    const yBefore = midair.player.y;
    const airWindup = performAction(midair, { type: "heavy" });
    const immediateAirHits = airWindup.events.filter(
      (event): event is CombatHitEvent =>
        event.kind === "hit" && event.action === "heavy" && (event as { hitPhase?: string }).hitPhase === "air-heavy-slam"
    );
    const airSlam = stepCombat(airWindup, {}, 120);
    const airHits = airSlam.events.filter(
      (event): event is CombatHitEvent =>
        event.kind === "hit" && event.action === "heavy" && (event as { hitPhase?: string }).hitPhase === "air-heavy-slam"
    );
    const target = airSlam.enemies[0];
    const secondAttempt = performAction(airWindup, { type: "heavy" });
    const scheduledAirHits = secondAttempt.scheduledEnemyHitEffects.filter((effect) => (effect as { hitPhase?: string }).hitPhase === "air-heavy-slam");

    expect(midair.player.airState).toBe("jumping");
    expect(immediateAirHits).toHaveLength(0);
    expect(airWindup.enemies[0].hp).toBe(midair.enemies[0].hp);
    expect(airWindup.scheduledEnemyHitEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "heavy",
          applyAtMs: airWindup.elapsedMs + 120,
          hitPhase: "air-heavy-slam",
          vfxCue: "air-heavy-impact"
        })
      ])
    );
    expect(airHits).toHaveLength(1);
    expect(airHits[0]).toMatchObject({
      targetId: target.id,
      inputToHitMs: 120,
      hitPhase: "air-heavy-slam",
      vfxCue: "air-heavy-impact",
      actionTags: expect.arrayContaining(["slam", "knockdown"])
    });
    expect(airSlam.enemies[0].hp).toBeLessThan(midair.enemies[0].hp);
    expect(airSlam.enemies[0].downed).toBe(true);
    expect(airSlam.player.y).toBe(yBefore);
    expect(airSlam.player.airState).toBe("jumping");
    expect((airSlam.player as { airAttackUsed?: boolean; airAttackType?: string }).airAttackUsed).toBe(true);
    expect((airSlam.player as { airAttackUsed?: boolean; airAttackType?: string }).airAttackType).toBe("heavy");
    expect(scheduledAirHits).toHaveLength(1);
    expect(secondAttempt.player.bufferedAction).toBeUndefined();
  });

  it("locks airborne light movement and facing so the hitbox follows the attacking model", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1 },
      [{ x: 350, y: 340 }]
    );
    const midair = stepCombat(performAction(run, { type: "jump" }), {}, 180);
    const airWindup = performAction(midair, { type: "light" });
    const movedDuringWindup = stepCombat(airWindup, { moveX: -1, moveY: 1 }, 64);
    const hitFrame = stepCombat(movedDuringWindup, { moveX: -1, moveY: 1 }, 1);
    const airHit = hitFrame.events.find(
      (event): event is CombatHitEvent => event.kind === "hit" && event.action === "light" && event.hitPhase === "air-light"
    );

    expect(movedDuringWindup.player.x).toBe(airWindup.player.x);
    expect(movedDuringWindup.player.y).toBe(airWindup.player.y);
    expect(movedDuringWindup.player.facing).toBe(airWindup.player.facing);
    expect(airHit?.casterPosition).toEqual({ x: airWindup.player.x, y: airWindup.player.y });
    expect(airHit?.casterFacing).toBe(airWindup.player.facing);
  });

  it("locks airborne heavy movement and rechecks targets at the slam frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1 },
      [{ x: 510, y: 340 }]
    );
    const midair = stepCombat(performAction(run, { type: "jump" }), {}, 180);
    const airWindup = performAction(midair, { type: "heavy" });
    const movedDuringWindup = stepCombat(airWindup, { moveX: -1, moveY: 1 }, 119);
    const enteredBeforeHit = {
      ...movedDuringWindup,
      enemies: movedDuringWindup.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              position: { x: 366, y: 340 }
            }
          : enemy
      )
    };
    const hitFrame = stepCombat(enteredBeforeHit, { moveX: -1, moveY: 1 }, 1);
    const airHit = hitFrame.events.find(
      (event): event is CombatHitEvent =>
        event.kind === "hit" && event.action === "heavy" && (event as { hitPhase?: string }).hitPhase === "air-heavy-slam"
    );
    const inRangeWindup = performAction(
      stepCombat(
        performAction(
          withPlayerAndEnemies(
            createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
            { x: 280, y: 340, facing: 1 },
            [{ x: 366, y: 340 }]
          ),
          { type: "jump" }
        ),
        {},
        180
      ),
      { type: "heavy" }
    );
    const leftBeforeHit = {
      ...inRangeWindup,
      enemies: inRangeWindup.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              position: { x: 510, y: 340 }
            }
          : enemy
      )
    };
    const leftHit = stepCombat(leftBeforeHit, {}, 120);

    expect(movedDuringWindup.player.x).toBe(airWindup.player.x);
    expect(movedDuringWindup.player.y).toBe(airWindup.player.y);
    expect(movedDuringWindup.player.facing).toBe(airWindup.player.facing);
    expect(airHit?.casterPosition).toEqual({ x: airWindup.player.x, y: airWindup.player.y });
    expect(airHit?.casterFacing).toBe(airWindup.player.facing);
    expect(leftHit.events.some((event) => event.kind === "hit" && event.action === "heavy")).toBe(false);
    expect(leftHit.events).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "miss", action: "heavy" })]));
  });

  it("rechecks airborne light targets at the hit frame instead of cast time", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1 },
      [{ x: 510, y: 340 }]
    );
    const midair = stepCombat(performAction(run, { type: "jump" }), {}, 180);
    const airWindup = performAction(midair, { type: "light" });
    const enteredBeforeHit = {
      ...airWindup,
      enemies: airWindup.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              position: { x: 350, y: 340 }
            }
          : enemy
      )
    };
    const enteredHit = stepCombat(enteredBeforeHit, {}, 65);
    const inRangeWindup = performAction(
      stepCombat(
        performAction(
          withPlayerAndEnemies(
            createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
            { x: 280, y: 340, facing: 1 },
            [{ x: 350, y: 340 }]
          ),
          { type: "jump" }
        ),
        {},
        180
      ),
      { type: "light" }
    );
    const leftBeforeHit = {
      ...inRangeWindup,
      enemies: inRangeWindup.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              position: { x: 510, y: 340 }
            }
          : enemy
      )
    };
    const leftHit = stepCombat(leftBeforeHit, {}, 65);

    expect(enteredHit.events).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "hit", action: "light", hitPhase: "air-light" })])
    );
    expect(leftHit.events.some((event) => event.kind === "hit" && event.action === "light")).toBe(false);
    expect(leftHit.events).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "miss", action: "light" })]));
  });

  it("does not queue airborne light when the hit frame would land after the airborne window", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1 },
      [{ x: 350, y: 340 }]
    );
    const jumped = performAction(run, { type: "jump" });
    const lateAir = stepCombat(jumped, {}, 430);
    const attempted = performAction(lateAir, { type: "light" });

    expect(lateAir.player.airState).toBe("jumping");
    expect(attempted).toBe(lateAir);
    expect(attempted.scheduledEnemyHitEffects.filter((effect) => effect.hitPhase === "air-light")).toHaveLength(0);
    expect(attempted.player.bufferedAction).toBeUndefined();

    const landed = stepCombat(attempted, {}, attempted.player.landingUntilMs - attempted.elapsedMs);
    const groundLight = performAction(landed, { type: "light" });
    const groundHit = groundLight.events.find((event): event is CombatHitEvent => event.kind === "hit" && event.action === "light");

    expect(landed.player.airState).toBe("grounded");
    expect(groundHit?.hitPhase).not.toBe("air-light");
    expect(groundLight.player.comboStep).toBe(1);
  });

  it("cancels pending airborne light when the player is interrupted before the hit frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1 },
      [{ x: 350, y: 340 }]
    );
    const midair = stepCombat(performAction(run, { type: "jump" }), {}, 180);
    const airWindup = performAction(midair, { type: "light" });
    const interrupted = {
      ...airWindup,
      player: {
        ...airWindup.player,
        hurtLockUntilMs: airWindup.elapsedMs + 160
      }
    };
    const resolved = stepCombat(interrupted, {}, 65);

    expect(resolved.events.some((event) => event.kind === "hit" && event.action === "light")).toBe(false);
    expect(resolved.enemies[0].hp).toBe(airWindup.enemies[0].hp);
  });

  it("does not queue airborne heavy near landing and cancels it when interrupted", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1 },
      [{ x: 366, y: 340 }]
    );
    const jumped = performAction(run, { type: "jump" });
    const lateAir = stepCombat(jumped, {}, 390);
    const attemptedLate = performAction(lateAir, { type: "heavy" });
    const landing = stepCombat(jumped, {}, 500);
    const attemptedLanding = performAction(landing, { type: "heavy" });
    const midair = stepCombat(performAction(run, { type: "jump" }), {}, 180);
    const airWindup = performAction(midair, { type: "heavy" });
    const interrupted = {
      ...airWindup,
      player: {
        ...airWindup.player,
        hurtLockUntilMs: airWindup.elapsedMs + 260
      }
    };
    const resolved = stepCombat(interrupted, {}, 120);

    expect(lateAir.player.airState).toBe("jumping");
    expect(attemptedLate).toBe(lateAir);
    expect(attemptedLate.scheduledEnemyHitEffects.filter((effect) => (effect as { hitPhase?: string }).hitPhase === "air-heavy-slam")).toHaveLength(0);
    expect(attemptedLate.player.bufferedAction).toBeUndefined();
    expect(landing.player.airState).toBe("landing");
    expect(attemptedLanding).toBe(landing);
    expect(attemptedLanding.player.bufferedAction).toBeUndefined();
    expect(attemptedLanding.events.some((event) => event.kind === "hit" && event.action === "heavy")).toBe(false);
    expect(resolved.events.some((event) => event.kind === "hit" && event.action === "heavy")).toBe(false);
    expect(resolved.enemies[0].hp).toBe(airWindup.enemies[0].hp);
  });

  it("makes ground monster attacks miss while the player is airborne from jump", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 322, y: 340 }]
    );
    const jumped = performAction(run, { type: "jump" });
    const telegraph = stepCombat(
      withEnemyInRange(jumped, {
        attackProfileId: "ash-crawler-burst",
        position: { x: jumped.player.x + 24, y: jumped.player.y },
        nextAttackAtMs: jumped.elapsedMs + 1
      }),
      {},
      80
    );
    const missed = stepCombat(telegraph, {}, 360);

    expect(telegraph.player.airState).toBe("jumping");
    expect(missed.player.hp).toBe(run.player.hp);
    expect(missed.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          phase: "miss"
        })
      ])
    );
    expect(missed.events.some((event) => event.kind === "player-hit")).toBe(false);
  });

  it("keeps jump evasion based on hit time when a large frame crosses the landing window", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 322, y: 340 }]
    );
    const jumped = performAction(run, { type: "jump" });
    const telegraph = stepCombat(
      withEnemyInRange(jumped, {
        attackProfileId: "ash-crawler-burst",
        position: { x: jumped.player.x + 24, y: jumped.player.y },
        nextAttackAtMs: jumped.elapsedMs + 1
      }),
      {},
      80
    );
    const crossedLanding = stepCombat(telegraph, {}, 500);

    expect(crossedLanding.elapsedMs).toBeGreaterThan(jumped.player.landingUntilMs);
    expect(crossedLanding.player.hp).toBe(run.player.hp);
    expect(crossedLanding.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          phase: "miss"
        })
      ])
    );
    expect(crossedLanding.events.some((event) => event.kind === "player-hit")).toBe(false);
    expect(crossedLanding.player.airState).toBe("grounded");
    expect(crossedLanding.player.airborneUntilMs).toBe(0);
  });

  it("does not buffer repeated jump during airborne or landing state", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1 },
      [{ x: 322, y: 340 }]
    );
    const jumped = performAction(run, { type: "jump" });
    const landing = stepCombat(jumped, {}, 500);
    const attemptedRepeat = performAction(landing, { type: "jump" });
    const afterLock = stepCombat(attemptedRepeat, {}, 80);

    expect(landing.player.airState).toBe("landing");
    expect(attemptedRepeat.player.bufferedAction).toBeUndefined();
    expect(afterLock.player.bufferedAction).toBeUndefined();
    expect(afterLock.player.airState).toBe("grounded");
    expect(afterLock.player.airborneUntilMs).toBe(0);
    expect(afterLock.player.jumpStartedAtMs).toBe(0);
  });

  it("does not make projectile monster attacks miss just because the player is airborne", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 280, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 322, y: 340 }]
    );
    const jumped = performAction(run, { type: "jump" });
    const telegraph = stepCombat(
      withEnemyInRange(jumped, {
        attackProfileId: "ash-ember-spit",
        position: { x: jumped.player.x + 24, y: jumped.player.y },
        nextAttackAtMs: jumped.elapsedMs + 1
      }),
      {},
      80
    );
    const hit = stepCombat(telegraph, {}, 360);

    expect(hit.player.hp).toBeLessThan(run.player.hp);
    expect(hit.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          phase: "active",
          skillId: "ash-ember-spit"
        }),
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit"
        })
      ])
    );
  });

  it("turns reflect skills into a counter window against monster attacks", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340 }]
    );
    const reflecting = performAction(run, { type: "skill", skillId: "mirror-arc" });
    const enemyHpBeforeImpact = reflecting.enemies[0].hp;
    const telegraph = stepCombat(
      withEnemyInRange(reflecting, {
        nextAttackAtMs: reflecting.elapsedMs + 1
      }),
      {},
      80
    );
    const countered = stepCombat(telegraph, {}, 360);

    expect(reflecting.player.reflectUntilMs).toBeGreaterThan(reflecting.elapsedMs);
    expect(countered.player.hp).toBe(run.player.hp);
    expect(countered.enemies[0].hp).toBeLessThan(enemyHpBeforeImpact);
    const reflectHit = countered.events.find(
      (event): event is CombatHitEvent =>
        event.kind === "hit" && event.skillId === "mirror-arc" && event.hitPhase === "mirror-counter"
    );
    expect(reflectHit).toMatchObject({
      kind: "hit",
      skillId: "mirror-arc",
      hitPhase: "mirror-counter",
      vfxCue: "mirror-counter-burst"
    });
    expect(reflectHit?.impactPosition).toEqual(countered.enemies[0].position);
  });

  it("delays mirror-arc parry and mirror slash to strict action frames", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 326, y: 340, hp: 220, maxHp: 220 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "mirror-arc" });
    const [slashAtMs] = scheduledSkillTimes(cast, "mirror-arc");
    const castPlayer = cast.player as CombatRun["player"] & { reflectStartedAtMs?: number };
    const startup = stepToElapsed(cast, 89);
    const active = stepToElapsed(cast, 90);
    const beforeSlash = stepToElapsed(cast, slashAtMs - 1);
    const slash = stepToElapsed(cast, slashAtMs);
    const [slashHit] = skillHitEvents(slash, "mirror-arc");

    expect(slashAtMs).toBe(210);
    expect(cast.player.x).toBe(run.player.x);
    expect(cast.player.activeSkillMovement?.skillId).toBe("mirror-arc");
    expect(castPlayer.reflectStartedAtMs).toBe(90);
    expect(cast.player.reflectUntilMs).toBeGreaterThan(700);
    expect(skillHitEvents(cast, "mirror-arc")).toHaveLength(0);
    expect(cast.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(startup.elapsedMs).toBeLessThan((startup.player as CombatRun["player"] & { reflectStartedAtMs?: number }).reflectStartedAtMs ?? 0);
    expect(active.player.reflectUntilMs).toBeGreaterThan(active.elapsedMs);
    expect(beforeSlash.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(slashHit).toMatchObject({
      hitPhase: "mirror-arc",
      vfxCue: "mirror-arc-slash",
      vfxWindowMs: 320,
      statusTags: ["reflect"]
    });
    expect(slash.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("uses mirror-arc active frames to counter hits and cancels if hit during startup", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90);
    const startupRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 310, y: 340, hp: 220, maxHp: 220 }]
    );
    const startupCast = performAction(startupRun, { type: "skill", skillId: "mirror-arc" });
    const [startupSlashAtMs] = scheduledSkillTimes(startupCast, "mirror-arc");
    const startupHitRun: CombatRun = {
      ...startupCast,
      enemies: startupCast.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: startupCast.elapsedMs,
              attackImpactAtMs: startupCast.elapsedMs + 70,
              attackRecoverUntilMs: startupCast.elapsedMs + 260,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };
    const interrupted = stepToElapsed(startupHitRun, startupSlashAtMs);
    const startupPlayerHits = interrupted.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(startupPlayerHits).toHaveLength(1);
    expect(skillHitEvents(interrupted, "mirror-arc")).toHaveLength(0);
    expect(skillMissEvents(interrupted, "mirror-arc")).toHaveLength(0);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "mirror-arc")).toHaveLength(0);

    const activeRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 310, y: 340, hp: 220, maxHp: 220 }]
    );
    const activeCast = performAction(activeRun, { type: "skill", skillId: "mirror-arc" });
    const activeAttackRun: CombatRun = {
      ...activeCast,
      enemies: activeCast.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: activeCast.elapsedMs,
              attackImpactAtMs: activeCast.elapsedMs + 110,
              attackRecoverUntilMs: activeCast.elapsedMs + 300,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };
    const countered = stepToElapsed(activeAttackRun, activeCast.elapsedMs + 110);
    const [counterHit] = skillHitEvents(countered, "mirror-arc");

    expect(countered.player.hp).toBe(activeRun.player.hp);
    expect(countered.events.some((event) => event.kind === "player-hit")).toBe(false);
    expect(counterHit).toMatchObject({
      hitPhase: "mirror-counter",
      vfxCue: "mirror-counter-burst",
      statusTags: ["reflect"]
    });
    expect(countered.enemies[0].hp).toBeLessThan(activeRun.enemies[0].hp);
  });

  it("casts glass-lotus as delayed bind and bloom frames with live area recheck", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 316, y: 340, hp: 220, maxHp: 220 },
        { x: 396, y: 348, hp: 220, maxHp: 220 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "glass-lotus" });
    const [bindAtMs, bloomAtMs] = scheduledSkillTimes(cast, "glass-lotus");
    const beforeBind = stepToElapsed(cast, bindAtMs - 1);
    const bound = stepToElapsed(cast, bindAtMs);
    const bloomed = stepToElapsed(cast, bloomAtMs);
    const bindHits = skillHitEvents(bound, "glass-lotus").filter((event) => event.hitPhase === "lotus-bind");
    const bloomHits = skillHitEvents(bloomed, "glass-lotus").filter((event) => event.hitPhase === "lotus-bloom");

    expect([bindAtMs, bloomAtMs]).toEqual([180, 320]);
    expect(cast.player.x).toBe(run.player.x);
    expect(cast.player.activeSkillMovement?.skillId).toBe("glass-lotus");
    expect(skillHitEvents(cast, "glass-lotus")).toHaveLength(0);
    expect(cast.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
    expect(beforeBind.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
    expect(bound.player.x).toBeGreaterThan(run.player.x);
    expect(bindHits).toHaveLength(2);
    expect(bindHits.every((event) => event.vfxCue === "glass-lotus-bind")).toBe(true);
    expect(bindHits.every((event) => event.statusTags?.includes("control"))).toBe(true);
    expect(bound.enemies[0].position.x).toBeGreaterThan(run.enemies[0].position.x);
    expect(bound.enemies[1].position.x).toBeLessThan(run.enemies[1].position.x);
    expect(bloomHits).toHaveLength(2);
    expect(bloomHits.every((event) => event.vfxCue === "glass-lotus-bloom")).toBe(true);
    expect(bloomHits.every((event) => event.actionTags?.includes("knockdown"))).toBe(true);
    expect(bloomed.enemies.every((enemy) => enemy.downed)).toBe(true);
  });

  it("rechecks and cancels glass-lotus stages instead of locking cast-time targets", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90);
    const escapeRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 316, y: 340, hp: 220, maxHp: 220 }]
    );
    const escapeCast = performAction(escapeRun, { type: "skill", skillId: "glass-lotus" });
    const [bindAtMs, bloomAtMs] = scheduledSkillTimes(escapeCast, "glass-lotus");
    const escapedBeforeBind: CombatRun = {
      ...escapeCast,
      enemies: escapeCast.enemies.map((enemy, index) =>
        index === 0 ? { ...enemy, position: { ...enemy.position, x: 740 } } : enemy
      )
    };
    const avoidedBind = stepToElapsed(escapedBeforeBind, bindAtMs);

    expect(skillHitEvents(avoidedBind, "glass-lotus")).toHaveLength(0);
    expect(skillMissEvents(avoidedBind, "glass-lotus")).toHaveLength(1);

    const interruptedRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 310, y: 340, hp: 220, maxHp: 220 }]
    );
    const interruptedCast = performAction(interruptedRun, { type: "skill", skillId: "glass-lotus" });
    const attackedCast: CombatRun = {
      ...interruptedCast,
      enemies: interruptedCast.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: interruptedCast.elapsedMs,
              attackImpactAtMs: interruptedCast.elapsedMs + 120,
              attackRecoverUntilMs: interruptedCast.elapsedMs + 320,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };
    const interrupted = stepToElapsed(attackedCast, bloomAtMs);

    expect(interrupted.events.some((event) => event.kind === "player-hit" && event.skillId === "ash-ember-spit")).toBe(true);
    expect(skillHitEvents(interrupted, "glass-lotus")).toHaveLength(0);
    expect(skillMissEvents(interrupted, "glass-lotus")).toHaveLength(0);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "glass-lotus")).toHaveLength(0);
  });

  it("does not bloom glass-lotus on targets that enter after the bind frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 316, y: 340, hp: 220, maxHp: 220 },
        { x: 720, y: 500, hp: 220, maxHp: 220 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "glass-lotus" });
    const [bindAtMs, bloomAtMs] = scheduledSkillTimes(cast, "glass-lotus");
    const bound = stepToElapsed(cast, bindAtMs);
    const lateEntrantBeforeBloom: CombatRun = {
      ...bound,
      enemies: bound.enemies.map((enemy, index) =>
        index === 1
          ? {
              ...enemy,
              position: { x: 340, y: 344 }
            }
          : enemy
      )
    };
    const bloomed = stepToElapsed(lateEntrantBeforeBloom, bloomAtMs);
    const bloomHits = skillHitEvents(bloomed, "glass-lotus").filter((event) => event.hitPhase === "lotus-bloom");

    expect(skillHitEvents(bound, "glass-lotus").filter((event) => event.hitPhase === "lotus-bind")).toHaveLength(1);
    expect(bloomHits.map((event) => event.targetId)).toEqual([run.enemies[0].id]);
    expect(bloomed.enemies[0].hp).toBeLessThan(bound.enemies[0].hp);
    expect(bloomed.enemies[1].hp).toBe(bound.enemies[1].hp);
  });

  it("casts mirrorflame-burst as delayed lock and burst frames with live area recheck", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100);
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const };
    const run: CombatRun = {
      ...baseRun,
      player,
      enemies: [
        { ...baseRun.enemies[0], hp: 260, maxHp: 260, armor: 20, position: { x: 330, y: 340 }, nextAttackAtMs: 9999 },
        { ...baseRun.enemies[1], hp: 260, maxHp: 260, armor: 20, position: { x: 410, y: 348 }, nextAttackAtMs: 9999 },
        {
          ...baseRun.enemies[0],
          id: "test-mirrorflame-third",
          hp: 260,
          maxHp: 260,
          armor: 20,
          position: { x: 492, y: 356 },
          nextAttackAtMs: 9999
        }
      ]
    };

    const cast = performAction(run, { type: "skill", skillId: "mirrorflame-burst" });
    const [lockAtMs, burstAtMs] = scheduledSkillTimes(cast, "mirrorflame-burst");
    const beforeLock = stepToElapsed(cast, lockAtMs - 1);
    const locked = stepToElapsed(cast, lockAtMs);
    const bursted = stepToElapsed(cast, burstAtMs);
    const lockHits = skillHitEvents(locked, "mirrorflame-burst").filter((event) => event.hitPhase === "mirrorflame-lock");
    const burstHits = skillHitEvents(bursted, "mirrorflame-burst").filter((event) => event.hitPhase === "mirrorflame-burst");

    expect([lockAtMs, burstAtMs]).toEqual([180, 350]);
    expect(cast.player.x).toBe(run.player.x);
    expect(cast.player.activeSkillMovement?.skillId).toBe("mirrorflame-burst");
    expect(skillHitEvents(cast, "mirrorflame-burst")).toHaveLength(0);
    expect(cast.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
    expect(beforeLock.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
    expect(locked.player.x).toBeGreaterThan(run.player.x);
    expect(lockHits).toHaveLength(3);
    expect(lockHits.every((event) => event.vfxCue === "mirrorflame-lock")).toBe(true);
    expect(lockHits.every((event) => event.statusTags?.includes("control"))).toBe(true);
    expect(burstHits).toHaveLength(3);
    expect(burstHits.every((event) => event.vfxCue === "mirrorflame-burst")).toBe(true);
    expect(burstHits.every((event) => event.actionTags?.includes("knockdown"))).toBe(true);
    expect(bursted.enemies.every((enemy) => enemy.downed)).toBe(true);
  });

  it("rechecks and cancels mirrorflame-burst stages instead of locking cast-time targets", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100);
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const };
    const escapeRun: CombatRun = {
      ...baseRun,
      player,
      enemies: [{ ...baseRun.enemies[0], hp: 260, maxHp: 260, position: { x: 330, y: 340 }, nextAttackAtMs: 9999 }]
    };
    const escapeCast = performAction(escapeRun, { type: "skill", skillId: "mirrorflame-burst" });
    const [lockAtMs, burstAtMs] = scheduledSkillTimes(escapeCast, "mirrorflame-burst");
    const escapedBeforeLock: CombatRun = {
      ...escapeCast,
      enemies: escapeCast.enemies.map((enemy, index) =>
        index === 0 ? { ...enemy, position: { ...enemy.position, x: 760 } } : enemy
      )
    };
    const avoidedLock = stepToElapsed(escapedBeforeLock, lockAtMs);

    expect(skillHitEvents(avoidedLock, "mirrorflame-burst")).toHaveLength(0);
    expect(skillMissEvents(avoidedLock, "mirrorflame-burst")).toHaveLength(1);

    const burstEscapeCast = performAction(escapeRun, { type: "skill", skillId: "mirrorflame-burst" });
    const locked = stepToElapsed(burstEscapeCast, lockAtMs);
    const movedOutBeforeBurst: CombatRun = {
      ...locked,
      enemies: locked.enemies.map((enemy, index) =>
        index === 0 ? { ...enemy, position: { ...enemy.position, x: 760 } } : enemy
      )
    };
    const avoidedBurst = stepToElapsed(movedOutBeforeBurst, burstAtMs);

    expect(skillHitEvents(avoidedBurst, "mirrorflame-burst").filter((event) => event.hitPhase === "mirrorflame-lock")).toHaveLength(1);
    expect(skillHitEvents(avoidedBurst, "mirrorflame-burst").filter((event) => event.hitPhase === "mirrorflame-burst")).toHaveLength(0);

    const interruptedPlayer = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, hp: 500, maxHp: 500 };
    const interruptedRun: CombatRun = {
      ...baseRun,
      player: interruptedPlayer,
      enemies: [{ ...baseRun.enemies[0], hp: 260, maxHp: 260, position: { x: 310, y: 340 }, nextAttackAtMs: 9999 }]
    };
    const interruptedCast = performAction(interruptedRun, { type: "skill", skillId: "mirrorflame-burst" });
    const attackedCast: CombatRun = {
      ...interruptedCast,
      enemies: interruptedCast.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: interruptedCast.elapsedMs,
              attackImpactAtMs: interruptedCast.elapsedMs + 120,
              attackRecoverUntilMs: interruptedCast.elapsedMs + 340,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };
    const interrupted = stepToElapsed(attackedCast, burstAtMs);

    expect(interrupted.events.some((event) => event.kind === "player-hit" && event.skillId === "ash-ember-spit")).toBe(true);
    expect(skillHitEvents(interrupted, "mirrorflame-burst")).toHaveLength(0);
    expect(skillMissEvents(interrupted, "mirrorflame-burst")).toHaveLength(0);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "mirrorflame-burst")).toHaveLength(0);
  });

  it("does not burst mirrorflame-burst on targets that enter after the lock frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 330, y: 340, hp: 260, maxHp: 260 },
        { x: 720, y: 500, hp: 260, maxHp: 260 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "mirrorflame-burst" });
    const [lockAtMs, burstAtMs] = scheduledSkillTimes(cast, "mirrorflame-burst");
    const locked = stepToElapsed(cast, lockAtMs);
    const lateEntrantBeforeBurst: CombatRun = {
      ...locked,
      enemies: locked.enemies.map((enemy, index) =>
        index === 1
          ? {
              ...enemy,
              position: { x: 340, y: 344 }
            }
          : enemy
      )
    };
    const bursted = stepToElapsed(lateEntrantBeforeBurst, burstAtMs);
    const burstHits = skillHitEvents(bursted, "mirrorflame-burst").filter((event) => event.hitPhase === "mirrorflame-burst");

    expect(skillHitEvents(locked, "mirrorflame-burst").filter((event) => event.hitPhase === "mirrorflame-lock")).toHaveLength(1);
    expect(burstHits.map((event) => event.targetId)).toEqual([run.enemies[0].id]);
    expect(bursted.enemies[0].hp).toBeLessThan(locked.enemies[0].hp);
    expect(bursted.enemies[1].hp).toBe(locked.enemies[1].hp);
  });

  it("turns trap and break tags into monster control and armor-break state", () => {
    const trapState = withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90);
    const trapRun = withPlayerAndEnemies(
      createCombatRun(trapState, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 310, y: 340 },
        { x: 360, y: 348 }
      ]
    );
    const trapped = performAction(trapRun, { type: "skill", skillId: "ink-snare" });
    const [bindAtMs] = scheduledSkillTimes(trapped, "ink-snare");
    const bound = stepToElapsed(trapped, bindAtMs);

    expect(skillHitEvents(trapped, "ink-snare")).toHaveLength(0);
    expect(trapped.enemies[0].controlledUntilMs).toBeUndefined();
    expect(bound.enemies[0].controlledUntilMs).toBeGreaterThan(bound.elapsedMs);
    expect(bound.enemies[0].nextAttackAtMs).toBeGreaterThanOrEqual(bound.enemies[0].controlledUntilMs ?? 0);

    const breakState = withHeat(createInitialState(), 90);
    const breakRun = withPlayerAndEnemies(
      createCombatRun(breakState, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340 }]
    );
    const brokenCast = performAction(
      {
        ...breakRun,
        enemies: breakRun.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                armor: 40
              }
            : enemy
        )
      },
      { type: "skill", skillId: "mountain-guard-break" }
    );
    const [breakAtMs] = scheduledSkillTimes(brokenCast, "mountain-guard-break");
    const beforeBreak = stepToElapsed(brokenCast, breakAtMs - 1);
    const broken = stepToElapsed(brokenCast, breakAtMs);

    expect(skillHitEvents(brokenCast, "mountain-guard-break")).toHaveLength(0);
    expect(beforeBreak.enemies[0].armorBrokenUntilMs).toBeUndefined();
    expect(broken.enemies[0].armorBrokenUntilMs).toBeGreaterThan(broken.elapsedMs);
    expect(broken.enemies[0].armor).toBeLessThan(40);
    expect(broken.enemies[0].nextAttackAtMs).toBeGreaterThan(broken.elapsedMs);
  });

  it("moves dash skills through their startup before resolving the hitbox", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340, hp: 180, maxHp: 180 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "furnace-step" });
    const [impactAtMs] = scheduledSkillTimes(cast, "furnace-step");
    const beforeImpact = stepToElapsed(cast, impactAtMs - 1);
    const impact = stepToElapsed(cast, impactAtMs);
    const stepHits = skillHitEvents(impact, "furnace-step");

    expect(cast.player.x).toBe(run.player.x);
    expect(cast.player.activeSkillMovement?.skillId).toBe("furnace-step");
    expect(skillHitEvents(cast, "furnace-step")).toHaveLength(0);
    expect(impactAtMs).toBe(170);
    expect(beforeImpact.player.x).toBeGreaterThan(run.player.x);
    expect(beforeImpact.player.x).toBeLessThan(run.player.x + 124);
    expect(beforeImpact.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(stepHits).toHaveLength(1);
    expect(stepHits[0]).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "shoulder-impact",
      vfxCue: "furnace-shoulder-impact",
      vfxWindowMs: 300
    });
    expect(stepHits[0].hitstopMs).toBeGreaterThan(50);
    expect(impact.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("keeps furnace-step targeting in front of the player during the rush", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 220, y: 340, hp: 180, maxHp: 180 },
        { x: 310, y: 340, hp: 180, maxHp: 180 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "furnace-step" });
    const [impactAtMs] = scheduledSkillTimes(cast, "furnace-step");
    const impact = stepToElapsed(cast, impactAtMs);
    const [stepHit] = skillHitEvents(impact, "furnace-step");

    expect(stepHit.targetId).toBe(run.enemies[1].id);
    expect(impact.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(impact.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
  });

  it("rechecks furnace-step targets at the shoulder impact frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 310, y: 340, hp: 180, maxHp: 180 },
        { x: 540, y: 420, hp: 180, maxHp: 180 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "furnace-step" });
    const [impactAtMs] = scheduledSkillTimes(cast, "furnace-step");
    const movedBeforeImpact: CombatRun = {
      ...cast,
      enemies: cast.enemies.map((enemy, index) => ({
        ...enemy,
        position: index === 0 ? { x: 760, y: 470 } : { x: 322, y: 340 }
      }))
    };
    const impact = stepToElapsed(movedBeforeImpact, impactAtMs);
    const [stepHit] = skillHitEvents(impact, "furnace-step");

    expect(stepHit.targetId).toBe(run.enemies[1].id);
    expect(impact.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(impact.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
  });

  it("hits a furnace-step target that enters the rush path before impact", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 110, y: 340, hp: 180, maxHp: 180 },
        { x: 118, y: 380, hp: 180, maxHp: 180 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "furnace-step" });
    const [impactAtMs] = scheduledSkillTimes(cast, "furnace-step");
    const movedIntoPath: CombatRun = {
      ...cast,
      enemies: cast.enemies.map((enemy, index) => ({
        ...enemy,
        position: index === 1 ? { x: 318, y: 340 } : enemy.position
      }))
    };
    const beforeImpact = stepToElapsed(movedIntoPath, impactAtMs - 1);
    const impact = stepToElapsed(movedIntoPath, impactAtMs);
    const [stepHit] = skillHitEvents(impact, "furnace-step");

    expect(skillHitEvents(beforeImpact, "furnace-step")).toHaveLength(0);
    expect(skillMissEvents(impact, "furnace-step")).toHaveLength(0);
    expect(stepHit.targetId).toBe(run.enemies[1].id);
    expect(impact.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(impact.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
  });

  it("delays furnace-step whiff feedback until the rush hit frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 110, y: 340, hp: 180, maxHp: 180 },
        { x: 118, y: 380, hp: 180, maxHp: 180 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "furnace-step" });
    const [impactAtMs] = scheduledSkillTimes(cast, "furnace-step");
    const beforeMiss = stepToElapsed(cast, impactAtMs - 1);
    const missed = stepToElapsed(cast, impactAtMs);

    expect(skillHitEvents(cast, "furnace-step")).toHaveLength(0);
    expect(skillMissEvents(cast, "furnace-step")).toHaveLength(0);
    expect(impactAtMs).toBe(170);
    expect(beforeMiss.player.x).toBeGreaterThan(run.player.x);
    expect(skillMissEvents(beforeMiss, "furnace-step")).toHaveLength(0);
    expect(skillMissEvents(missed, "furnace-step")).toEqual([
      expect.objectContaining({
        occurredAtMs: 170,
        inputToHitMs: 170,
        action: "skill",
        skillId: "furnace-step"
      })
    ]);
  });

  it("cancels furnace-step path impact when monster damage interrupts the rush", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 310, y: 340, hp: 180, maxHp: 180 }]
    );
    const cast = performAction(run, { type: "skill", skillId: "furnace-step" });
    const [impactAtMs] = scheduledSkillTimes(cast, "furnace-step");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: 82,
            attackRecoverUntilMs: 360,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      impactAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 82
        })
      ])
    );
    expect(interrupted.player.activeSkillMovement).toBeUndefined();
    expect(skillHitEvents(interrupted, "furnace-step")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "furnace-step")).toHaveLength(0);
  });

  it("delays cinder-uppercut into a forward rising launcher hit frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 304, y: 340, hp: 180, maxHp: 180 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "cinder-uppercut" });
    const [uppercutAtMs] = scheduledSkillTimes(cast, "cinder-uppercut");
    const beforeHit = stepToElapsed(cast, uppercutAtMs - 1);
    const hit = stepToElapsed(cast, uppercutAtMs);
    const [uppercutHit] = skillHitEvents(hit, "cinder-uppercut");

    expect(cast.player.x).toBe(run.player.x);
    expect(cast.player.activeSkillMovement?.skillId).toBe("cinder-uppercut");
    expect(skillHitEvents(cast, "cinder-uppercut")).toHaveLength(0);
    expect(uppercutAtMs).toBe(180);
    expect(beforeHit.player.x).toBeGreaterThan(run.player.x);
    expect(beforeHit.player.x).toBeLessThan(run.player.x + 64);
    expect(beforeHit.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(uppercutHit).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "uppercut",
      vfxCue: "cinder-uppercut-rise",
      vfxWindowMs: 320,
      actionTags: ["launcher"]
    });
    expect(hit.player.activeSkillMovement).toBeUndefined();
    expect(hit.enemies[0].airborne).toBe(true);
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("delays cinder-uppercut whiff feedback until the rising hit frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 110, y: 340, hp: 180, maxHp: 180 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "cinder-uppercut" });
    const [missAtMs] = scheduledSkillTimes(cast, "cinder-uppercut");
    const beforeMiss = stepToElapsed(cast, missAtMs - 1);
    const missed = stepToElapsed(cast, missAtMs);

    expect(skillMissEvents(cast, "cinder-uppercut")).toHaveLength(0);
    expect(skillHitEvents(cast, "cinder-uppercut")).toHaveLength(0);
    expect(missAtMs).toBe(180);
    expect(skillMissEvents(beforeMiss, "cinder-uppercut")).toHaveLength(0);
    expect(skillMissEvents(missed, "cinder-uppercut")).toEqual([
      expect.objectContaining({
        occurredAtMs: 180,
        inputToHitMs: 180,
        action: "skill",
        skillId: "cinder-uppercut"
      })
    ]);
  });

  it("rechecks cinder-uppercut targets at the launcher frame instead of locking cast-time targets", () => {
    const inRangeRun = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 304, y: 340, hp: 180, maxHp: 180 }]
    );
    const castWithTarget = performAction(inRangeRun, { type: "skill", skillId: "cinder-uppercut" });
    const [uppercutAtMs] = scheduledSkillTimes(castWithTarget, "cinder-uppercut");
    const movedOutBeforeHit = stepToElapsed(
      {
        ...castWithTarget,
        enemies: castWithTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 110, y: 340 }
              }
            : enemy
        )
      },
      uppercutAtMs
    );

    expect(skillHitEvents(movedOutBeforeHit, "cinder-uppercut")).toHaveLength(0);
    expect(skillMissEvents(movedOutBeforeHit, "cinder-uppercut")).toHaveLength(1);
    expect(movedOutBeforeHit.enemies[0].hp).toBe(inRangeRun.enemies[0].hp);

    const outOfRangeRun = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 110, y: 340, hp: 180, maxHp: 180 }]
    );
    const castWithoutTarget = performAction(outOfRangeRun, { type: "skill", skillId: "cinder-uppercut" });
    const [lateUppercutAtMs] = scheduledSkillTimes(castWithoutTarget, "cinder-uppercut");
    const movedInBeforeHit = stepToElapsed(
      {
        ...castWithoutTarget,
        enemies: castWithoutTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 304, y: 340 }
              }
            : enemy
        )
      },
      lateUppercutAtMs
    );
    const [lateHit] = skillHitEvents(movedInBeforeHit, "cinder-uppercut");

    expect(lateHit).toMatchObject({
      targetId: outOfRangeRun.enemies[0].id,
      hitPhase: "uppercut",
      vfxCue: "cinder-uppercut-rise"
    });
    expect(skillMissEvents(movedInBeforeHit, "cinder-uppercut")).toHaveLength(0);
    expect(movedInBeforeHit.enemies[0].hp).toBeLessThan(outOfRangeRun.enemies[0].hp);
  });

  it("cancels cinder-uppercut when monster damage lands before the launcher frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 304, y: 340, hp: 180, maxHp: 180 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "cinder-uppercut" });
    const [uppercutAtMs] = scheduledSkillTimes(cast, "cinder-uppercut");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: 90,
            attackRecoverUntilMs: 360,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      uppercutAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 90
        })
      ])
    );
    expect(interrupted.player.activeSkillMovement).toBeUndefined();
    expect(skillHitEvents(interrupted, "cinder-uppercut")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "cinder-uppercut")).toHaveLength(0);
  });

  it("lets cinder-uppercut cancel from a light hit and keep combo timing metadata", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 304, y: 340, hp: 220, maxHp: 220 }]
    );
    const light = resolveGroundLight(performAction(run, { type: "light" }));

    const cast = performAction(light, { type: "skill", skillId: "cinder-uppercut" });
    const [uppercutAtMs] = scheduledSkillTimes(cast, "cinder-uppercut");
    const hit = stepToElapsed(cast, uppercutAtMs);
    const [uppercutHit] = skillHitEvents(hit, "cinder-uppercut");

    expect(uppercutHit.canceledFromCombo).toBe(true);
    expect(uppercutHit.comboCount).toBeGreaterThan(1);
  });

  it("delays glass-cut into a short forward slash hit frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 306, y: 340, hp: 180, maxHp: 180 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "glass-cut" });
    const [slashAtMs] = scheduledSkillTimes(cast, "glass-cut");
    const beforeSlash = stepToElapsed(cast, slashAtMs - 1);
    const hit = stepToElapsed(cast, slashAtMs);
    const [slashHit] = skillHitEvents(hit, "glass-cut");

    expect(cast.player.x).toBe(run.player.x);
    expect(cast.player.activeSkillMovement?.skillId).toBe("glass-cut");
    expect(skillHitEvents(cast, "glass-cut")).toHaveLength(0);
    expect(slashAtMs).toBe(115);
    expect(beforeSlash.player.x).toBeGreaterThan(run.player.x);
    expect(beforeSlash.player.x).toBeLessThan(run.player.x + 52);
    expect(beforeSlash.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(slashHit).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "glass-cut",
      vfxCue: "glass-slash-cut",
      vfxWindowMs: 260
    });
    expect(hit.player.activeSkillMovement).toBeUndefined();
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("rechecks glass-cut targets at the slash frame instead of locking cast-time targets", () => {
    const inRangeRun = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 306, y: 340, hp: 180, maxHp: 180 }]
    );
    const castWithTarget = performAction(inRangeRun, { type: "skill", skillId: "glass-cut" });
    const [slashAtMs] = scheduledSkillTimes(castWithTarget, "glass-cut");
    const movedOutBeforeSlash = stepToElapsed(
      {
        ...castWithTarget,
        enemies: castWithTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 520, y: 500 }
              }
            : enemy
        )
      },
      slashAtMs
    );

    expect(skillHitEvents(movedOutBeforeSlash, "glass-cut")).toHaveLength(0);
    expect(skillMissEvents(movedOutBeforeSlash, "glass-cut")).toHaveLength(1);
    expect(movedOutBeforeSlash.enemies[0].hp).toBe(inRangeRun.enemies[0].hp);

    const outOfRangeRun = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 520, y: 500, hp: 180, maxHp: 180 }]
    );
    const castWithoutTarget = performAction(outOfRangeRun, { type: "skill", skillId: "glass-cut" });
    const [lateSlashAtMs] = scheduledSkillTimes(castWithoutTarget, "glass-cut");
    const movedInBeforeSlash = stepToElapsed(
      {
        ...castWithoutTarget,
        enemies: castWithoutTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 306, y: 340 }
              }
            : enemy
        )
      },
      lateSlashAtMs
    );
    const [lateHit] = skillHitEvents(movedInBeforeSlash, "glass-cut");

    expect(lateHit).toMatchObject({
      targetId: outOfRangeRun.enemies[0].id,
      hitPhase: "glass-cut",
      vfxCue: "glass-slash-cut"
    });
    expect(skillMissEvents(movedInBeforeSlash, "glass-cut")).toHaveLength(0);
    expect(movedInBeforeSlash.enemies[0].hp).toBeLessThan(outOfRangeRun.enemies[0].hp);
  });

  it("sweeps glass-cut through enemies between the start and slash endpoint", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 246, y: 340, hp: 180, maxHp: 180 }]
    );
    const cast = performAction(run, { type: "skill", skillId: "glass-cut" });
    const [slashAtMs] = scheduledSkillTimes(cast, "glass-cut");
    const hit = stepToElapsed(cast, slashAtMs);
    const [slashHit] = skillHitEvents(hit, "glass-cut");

    expect(hit.player.x).toBe(292);
    expect(slashHit).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "glass-cut",
      vfxCue: "glass-slash-cut"
    });
    expect(skillMissEvents(hit, "glass-cut")).toHaveLength(0);
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("lets same-frame monster impact interrupt glass-cut before the queued slash resolves", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 306, y: 340, hp: 180, maxHp: 180 }]
    );
    const cast = performAction(run, { type: "skill", skillId: "glass-cut" });
    const [slashAtMs] = scheduledSkillTimes(cast, "glass-cut");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: slashAtMs,
            attackRecoverUntilMs: 320,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      slashAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: slashAtMs
        })
      ])
    );
    expect(skillHitEvents(interrupted, "glass-cut")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(run.enemies[0].hp);
  });

  it("cancels glass-cut slash when monster damage interrupts before the cut frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "liuli-blademage"), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 306, y: 340, hp: 180, maxHp: 180 }]
    );
    const cast = performAction(run, { type: "skill", skillId: "glass-cut" });
    const [slashAtMs] = scheduledSkillTimes(cast, "glass-cut");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: 82,
            attackRecoverUntilMs: 320,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      slashAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 82
        })
      ])
    );
    expect(interrupted.player.activeSkillMovement).toBeUndefined();
    expect(skillHitEvents(interrupted, "glass-cut")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "glass-cut")).toHaveLength(0);
  });

  it("fires ink-shot as a delayed ranged projectile instead of cast-frame damage", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 520, y: 340, hp: 180, maxHp: 180 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "ink-shot" });
    const [boltAtMs] = scheduledSkillTimes(cast, "ink-shot");
    const beforeBolt = stepToElapsed(cast, boltAtMs - 1);
    const hit = stepToElapsed(cast, boltAtMs);
    const [boltHit] = skillHitEvents(hit, "ink-shot");

    expect(cast.player.x).toBe(run.player.x);
    expect(cast.player.activeSkillMovement?.skillId).toBe("ink-shot");
    expect(skillHitEvents(cast, "ink-shot")).toHaveLength(0);
    expect(boltAtMs).toBe(120);
    expect(beforeBolt.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(skillHitEvents(beforeBolt, "ink-shot")).toHaveLength(0);
    expect(boltHit).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "ink-bolt",
      vfxCue: "ink-shot-pierce",
      vfxWindowMs: 260
    });
    expect(hit.player.activeSkillMovement).toBeUndefined();
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("rechecks ink-shot targets when the bolt reaches the hit frame", () => {
    const inRangeRun = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 520, y: 340, hp: 180, maxHp: 180 },
        { x: 760, y: 500, hp: 180, maxHp: 180 }
      ]
    );
    const castWithTarget = performAction(inRangeRun, { type: "skill", skillId: "ink-shot" });
    const [boltAtMs] = scheduledSkillTimes(castWithTarget, "ink-shot");
    const movedOutBeforeBolt = stepToElapsed(
      {
        ...castWithTarget,
        enemies: castWithTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 760, y: 500 }
              }
            : enemy
        )
      },
      boltAtMs
    );

    expect(skillHitEvents(movedOutBeforeBolt, "ink-shot")).toHaveLength(0);
    expect(skillMissEvents(movedOutBeforeBolt, "ink-shot")).toHaveLength(1);
    expect(movedOutBeforeBolt.enemies[0].hp).toBe(inRangeRun.enemies[0].hp);

    const outOfRangeRun = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 760, y: 500, hp: 180, maxHp: 180 },
        { x: 820, y: 500, hp: 180, maxHp: 180 }
      ]
    );
    const castWithoutTarget = performAction(outOfRangeRun, { type: "skill", skillId: "ink-shot" });
    const [lateBoltAtMs] = scheduledSkillTimes(castWithoutTarget, "ink-shot");
    const movedInBeforeBolt = stepToElapsed(
      {
        ...castWithoutTarget,
        enemies: castWithoutTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 520, y: 340 }
              }
            : enemy
        )
      },
      lateBoltAtMs
    );
    const [lateHit] = skillHitEvents(movedInBeforeBolt, "ink-shot");

    expect(lateHit).toMatchObject({
      targetId: outOfRangeRun.enemies[0].id,
      hitPhase: "ink-bolt",
      vfxCue: "ink-shot-pierce"
    });
    expect(skillMissEvents(movedInBeforeBolt, "ink-shot")).toHaveLength(0);
    expect(movedInBeforeBolt.enemies[0].hp).toBeLessThan(outOfRangeRun.enemies[0].hp);
  });

  it("samples rushing monster positions before resolving ink-shot projectile targets", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 700, y: 340, hp: 180, maxHp: 180 },
        { x: 820, y: 500, hp: 180, maxHp: 180 }
      ]
    );
    const rushingRun: CombatRun = {
      ...run,
      enemies: run.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackSkillId: "ash-crawler-burst",
              attackStartedAtMs: 0,
              attackImpactAtMs: 200,
              attackRecoverUntilMs: 420,
              attackHitResolved: false,
              attackResolvedHits: 0,
              attackRushStartPosition: { x: 700, y: 340 },
              attackRushTargetPosition: { x: 520, y: 340 }
            }
          : enemy
      )
    };

    const cast = performAction(rushingRun, { type: "skill", skillId: "ink-shot" });
    const [boltAtMs] = scheduledSkillTimes(cast, "ink-shot");
    const hit = stepToElapsed(cast, boltAtMs);
    const [boltHit] = skillHitEvents(hit, "ink-shot");

    expect(boltAtMs).toBe(120);
    expect(boltHit).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "ink-bolt",
      vfxCue: "ink-shot-pierce"
    });
    expect(hit.enemies[0].position.x).toBeLessThan(700);
    expect(hit.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
    expect(skillMissEvents(hit, "ink-shot")).toHaveLength(0);
  });

  it("cancels ink-shot projectile when monster damage interrupts the shot windup", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "ink-shadow-ranger"), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 300, y: 340, hp: 180, maxHp: 180 }]
    );
    const cast = performAction(run, { type: "skill", skillId: "ink-shot" });
    const [boltAtMs] = scheduledSkillTimes(cast, "ink-shot");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: 80,
            attackRecoverUntilMs: 300,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      boltAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 80
        })
      ])
    );
    expect(interrupted.player.activeSkillMovement).toBeUndefined();
    expect(skillHitEvents(interrupted, "ink-shot")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "ink-shot")).toHaveLength(0);
  });

  it("delays marking-bolt marks until the contract hit frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 500, y: 340, hp: 180, maxHp: 180 },
        { x: 620, y: 356, hp: 180, maxHp: 180 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "marking-bolt" });
    const [markAtMs] = scheduledSkillTimes(cast, "marking-bolt");
    const beforeMark = stepToElapsed(cast, markAtMs - 1);
    const hit = stepToElapsed(cast, markAtMs);
    const [markHit] = skillHitEvents(hit, "marking-bolt");

    expect(markAtMs).toBe(180);
    expect(cast.player.x).toBe(run.player.x);
    expect(cast.player.activeSkillMovement?.skillId).toBe("marking-bolt");
    expect(skillHitEvents(cast, "marking-bolt")).toHaveLength(0);
    expect(cast.enemies.map((enemy) => enemy.marks)).toEqual([0, 0]);
    expect(beforeMark.enemies.map((enemy) => enemy.marks)).toEqual([0, 0]);
    expect(skillHitEvents(beforeMark, "marking-bolt")).toHaveLength(0);
    expect(markHit).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "contract-mark",
      vfxCue: "contract-mark-impact",
      vfxWindowMs: 320
    });
    expect(hit.enemies.map((enemy) => enemy.marks)).toEqual([2, 0]);
    expect(hit.player.activeSkillMovement).toBeUndefined();
  });

  it("rechecks marking-bolt targets and cancels pending marks on interruption", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 500, y: 340, hp: 180, maxHp: 180 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "marking-bolt" });
    const [markAtMs] = scheduledSkillTimes(cast, "marking-bolt");
    const escaped = stepToElapsed(
      {
        ...cast,
        enemies: cast.enemies.map((enemy) => ({
          ...enemy,
          position: { x: 760, y: 500 }
        }))
      },
      markAtMs
    );

    expect(skillHitEvents(escaped, "marking-bolt")).toHaveLength(0);
    expect(skillMissEvents(escaped, "marking-bolt")).toHaveLength(1);
    expect(escaped.enemies[0].marks).toBe(0);

    const interruptRun = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 300, y: 340, hp: 180, maxHp: 180 }]
    );
    const interruptedCast = performAction(interruptRun, { type: "skill", skillId: "marking-bolt" });
    const attackedCast: CombatRun = {
      ...interruptedCast,
      enemies: interruptedCast.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: 0,
              attackImpactAtMs: 90,
              attackRecoverUntilMs: 360,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };
    const [interruptedMarkAtMs] = scheduledSkillTimes(attackedCast, "marking-bolt");
    const interrupted = stepToElapsed(attackedCast, interruptedMarkAtMs);
    const playerHits = interrupted.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(playerHits).toHaveLength(1);
    expect(skillHitEvents(interrupted, "marking-bolt")).toHaveLength(0);
    expect(skillMissEvents(interrupted, "marking-bolt")).toHaveLength(0);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "marking-bolt")).toHaveLength(0);
    expect(interrupted.enemies[0].marks).toBe(0);
  });

  it("delays ink-snare into bind and snap hit frames before controlling targets", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 318, y: 340, hp: 180, maxHp: 180 },
        { x: 382, y: 348, hp: 180, maxHp: 180 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "ink-snare" });
    const [bindAtMs, snapAtMs] = scheduledSkillTimes(cast, "ink-snare");
    const beforeBind = stepToElapsed(cast, bindAtMs - 1);
    const bound = stepToElapsed(cast, bindAtMs);
    const snapped = stepToElapsed(bound, snapAtMs);
    const hits = skillHitEvents(snapped, "ink-snare");

    expect(bindAtMs).toBe(250);
    expect(snapAtMs).toBe(430);
    expect(cast.player.activeSkillMovement?.skillId).toBe("ink-snare");
    expect(skillHitEvents(cast, "ink-snare")).toHaveLength(0);
    expect(cast.enemies[0].controlledUntilMs).toBeUndefined();
    expect(beforeBind.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(beforeBind.enemies[0].controlledUntilMs).toBeUndefined();
    expect(skillHitEvents(beforeBind, "ink-snare")).toHaveLength(0);
    expect(bound.enemies[0].controlledUntilMs).toBeGreaterThan(bound.elapsedMs);
    expect(hits.map((event) => event.hitPhase)).toEqual(["trap-bind", "trap-bind", "trap-snap", "trap-snap"]);
    expect(hits.map((event) => event.vfxCue)).toEqual(["ink-snare-bind", "ink-snare-bind", "ink-snare-snap", "ink-snare-snap"]);
    expect(snapped.enemies[0].hp).toBeLessThan(bound.enemies[0].hp);
    expect(snapped.enemies[0].position.x).toBeGreaterThan(bound.enemies[0].position.x);
  });

  it("rechecks ink-snare targets at the bind frame instead of locking cast-time targets", () => {
    const inRangeRun = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 318, y: 340, hp: 180, maxHp: 180 },
        { x: 382, y: 348, hp: 180, maxHp: 180 }
      ]
    );
    const castWithTarget = performAction(inRangeRun, { type: "skill", skillId: "ink-snare" });
    const [bindAtMs] = scheduledSkillTimes(castWithTarget, "ink-snare");
    const movedOutBeforeBind = stepToElapsed(
      {
        ...castWithTarget,
        enemies: castWithTarget.enemies.map((enemy) => ({
          ...enemy,
          position: { x: 760, y: 500 }
        }))
      },
      bindAtMs
    );

    expect(skillHitEvents(movedOutBeforeBind, "ink-snare")).toHaveLength(0);
    expect(skillMissEvents(movedOutBeforeBind, "ink-snare")).toHaveLength(1);
    expect(movedOutBeforeBind.enemies[0].controlledUntilMs).toBeUndefined();

    const outOfRangeRun = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 760, y: 500, hp: 180, maxHp: 180 },
        { x: 820, y: 500, hp: 180, maxHp: 180 }
      ]
    );
    const castWithoutTarget = performAction(outOfRangeRun, { type: "skill", skillId: "ink-snare" });
    const [lateBindAtMs] = scheduledSkillTimes(castWithoutTarget, "ink-snare");
    const movedInBeforeBind = stepToElapsed(
      {
        ...castWithoutTarget,
        enemies: castWithoutTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 318, y: 340 }
              }
            : enemy
        )
      },
      lateBindAtMs
    );
    const [lateHit] = skillHitEvents(movedInBeforeBind, "ink-snare");

    expect(lateHit).toMatchObject({
      targetId: outOfRangeRun.enemies[0].id,
      hitPhase: "trap-bind",
      vfxCue: "ink-snare-bind"
    });
    expect(skillMissEvents(movedInBeforeBind, "ink-snare")).toHaveLength(0);
    expect(movedInBeforeBind.enemies[0].controlledUntilMs).toBeGreaterThan(movedInBeforeBind.elapsedMs);
  });

  it("does not let ink-snare snap hit targets that were not bound first", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 760, y: 500, hp: 180, maxHp: 180 },
        { x: 820, y: 500, hp: 180, maxHp: 180 }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "ink-snare" });
    const [bindAtMs, snapAtMs] = scheduledSkillTimes(cast, "ink-snare");
    const missedBind = stepToElapsed(cast, bindAtMs);
    const movedInBeforeSnap = stepToElapsed(
      {
        ...missedBind,
        enemies: missedBind.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 318, y: 340 }
              }
            : enemy
        )
      },
      snapAtMs
    );

    expect(skillMissEvents(missedBind, "ink-snare")).toHaveLength(1);
    expect(skillHitEvents(missedBind, "ink-snare")).toHaveLength(0);
    expect(skillHitEvents(movedInBeforeSnap, "ink-snare")).toHaveLength(0);
    expect(movedInBeforeSnap.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(movedInBeforeSnap.enemies[0].controlledUntilMs).toBeUndefined();
  });

  it("lets same-frame monster impacts interrupt ink-snare before bind or snap resolves", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 300, y: 340, hp: 180, maxHp: 180 }]
    );

    const bindCast = performAction(run, { type: "skill", skillId: "ink-snare" });
    const [bindAtMs, snapAtMs] = scheduledSkillTimes(bindCast, "ink-snare");
    const bindInterrupted = stepCombat(
      {
        ...bindCast,
        enemies: [
          {
            ...bindCast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: bindAtMs,
            attackRecoverUntilMs: bindAtMs + 220,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      bindAtMs
    );

    expect(bindInterrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          occurredAtMs: bindAtMs
        })
      ])
    );
    expect(skillHitEvents(bindInterrupted, "ink-snare")).toHaveLength(0);
    expect(bindInterrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "ink-snare")).toHaveLength(0);

    const snapRun = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [
        { x: 318, y: 340, hp: 180, maxHp: 180 },
        { x: 80, y: 340, hp: 180, maxHp: 180 }
      ]
    );
    const snapCast = performAction(snapRun, { type: "skill", skillId: "ink-snare" });
    const snapInterrupted = stepCombat(
      {
        ...snapCast,
        enemies: snapCast.enemies.map((enemy, index) =>
          index === 1
            ? {
                ...enemy,
                attackSkillId: "ash-ember-spit",
                attackStartedAtMs: 0,
                attackImpactAtMs: snapAtMs,
                attackRecoverUntilMs: snapAtMs + 220,
                attackHitResolved: false,
                attackResolvedHits: 0
              }
            : enemy
        )
      },
      {},
      snapAtMs
    );

    expect(snapInterrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          occurredAtMs: snapAtMs
        })
      ])
    );
    expect(skillHitEvents(snapInterrupted, "ink-snare").filter((event) => event.hitPhase === "trap-snap")).toHaveLength(0);
    expect(snapInterrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "ink-snare")).toHaveLength(0);
  });

  it("cancels ink-snare bind and snap when monster damage interrupts the cast", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 300, y: 340, hp: 180, maxHp: 180 }]
    );
    const cast = performAction(run, { type: "skill", skillId: "ink-snare" });
    const [bindAtMs] = scheduledSkillTimes(cast, "ink-snare");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: 80,
            attackRecoverUntilMs: 300,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      bindAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 80
        })
      ])
    );
    expect(interrupted.player.activeSkillMovement).toBeUndefined();
    expect(skillHitEvents(interrupted, "ink-snare")).toHaveLength(0);
    expect(interrupted.enemies[0].controlledUntilMs).toBeUndefined();
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "ink-snare")).toHaveLength(0);
  });

  it("moves shadow-roll backward before firing the roll-shot hit frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "ink-shadow-ranger"), "cinder-kiln-alley"),
      { x: 360, y: 340, facing: 1 },
      [{ x: 340, y: 340, hp: 180, maxHp: 180 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "shadow-roll" });
    const [shotAtMs] = scheduledSkillTimes(cast, "shadow-roll");
    const middleRoll = stepToElapsed(cast, 80);
    const beforeShot = stepToElapsed(cast, shotAtMs - 1);
    const shot = stepToElapsed(cast, shotAtMs);
    const rollHits = skillHitEvents(shot, "shadow-roll");

    expect(cast.player.x).toBe(run.player.x);
    expect(cast.player.activeSkillMovement?.skillId).toBe("shadow-roll");
    expect(skillHitEvents(cast, "shadow-roll")).toHaveLength(0);
    expect(shotAtMs).toBe(160);
    expect(middleRoll.player.x).toBeLessThan(run.player.x - 34);
    expect(middleRoll.player.x).toBeGreaterThan(run.player.x - 70);
    expect(skillHitEvents(middleRoll, "shadow-roll")).toHaveLength(0);
    expect(beforeShot.player.x).toBeLessThan(run.player.x);
    expect(beforeShot.player.x).toBeGreaterThan(run.player.x - 86);
    expect(beforeShot.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(shot.player.x).toBe(run.player.x - 86);
    expect(rollHits).toHaveLength(1);
    expect(rollHits[0]).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "roll-shot",
      vfxCue: "shadow-roll-shot",
      vfxWindowMs: 280
    });
    expect(shot.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("rechecks shadow-roll targets on the roll-shot frame instead of locking target state at cast", () => {
    const inRangeRun = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "ink-shadow-ranger"), "cinder-kiln-alley"),
      { x: 360, y: 340, facing: 1 },
      [{ x: 340, y: 340, hp: 180, maxHp: 180 }]
    );
    const castWithTarget = performAction(inRangeRun, { type: "skill", skillId: "shadow-roll" });
    const [shotAtMs] = scheduledSkillTimes(castWithTarget, "shadow-roll");
    const movedOutBeforeShot = stepToElapsed(
      {
        ...castWithTarget,
        enemies: castWithTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 118, y: 340 }
              }
            : enemy
        )
      },
      shotAtMs
    );

    expect(skillHitEvents(movedOutBeforeShot, "shadow-roll")).toHaveLength(0);
    expect(skillMissEvents(movedOutBeforeShot, "shadow-roll")).toHaveLength(1);
    expect(movedOutBeforeShot.enemies[0].hp).toBe(inRangeRun.enemies[0].hp);

    const outOfRangeRun = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "ink-shadow-ranger"), "cinder-kiln-alley"),
      { x: 360, y: 340, facing: 1 },
      [{ x: 118, y: 340, hp: 180, maxHp: 180 }]
    );
    const castWithoutTarget = performAction(outOfRangeRun, { type: "skill", skillId: "shadow-roll" });
    const [lateShotAtMs] = scheduledSkillTimes(castWithoutTarget, "shadow-roll");
    const movedInBeforeShot = stepToElapsed(
      {
        ...castWithoutTarget,
        enemies: castWithoutTarget.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 340, y: 340 }
              }
            : enemy
        )
      },
      lateShotAtMs
    );
    const [lateHit] = skillHitEvents(movedInBeforeShot, "shadow-roll");

    expect(lateHit).toMatchObject({
      targetId: outOfRangeRun.enemies[0].id,
      hitPhase: "roll-shot",
      vfxCue: "shadow-roll-shot"
    });
    expect(skillMissEvents(movedInBeforeShot, "shadow-roll")).toHaveLength(0);
    expect(movedInBeforeShot.enemies[0].hp).toBeLessThan(outOfRangeRun.enemies[0].hp);
  });

  it("continues shadow-roll to the endpoint when a monster attack misses before the shot frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "ink-shadow-ranger"), "cinder-kiln-alley"),
      { x: 360, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [
        { x: 340, y: 340, hp: 180, maxHp: 180 },
        { x: 360, y: 430, hp: 180, maxHp: 180 }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "shadow-roll" });
    const [shotAtMs] = scheduledSkillTimes(cast, "shadow-roll");
    const missedDuringRoll = stepCombat(
      {
        ...cast,
        enemies: cast.enemies.map((enemy, index) =>
          index === 1
            ? {
                ...enemy,
                attackSkillId: "ash-ember-spit",
                attackStartedAtMs: 0,
                attackImpactAtMs: 80,
                attackRecoverUntilMs: 300,
                attackHitResolved: false,
                attackResolvedHits: 0
              }
            : enemy
        )
      },
      {},
      shotAtMs
    );

    expect(missedDuringRoll.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          skillId: "ash-ember-spit",
          phase: "miss",
          occurredAtMs: 80
        })
      ])
    );
    expect(missedDuringRoll.events.some((event) => event.kind === "player-hit" && event.skillId === "ash-ember-spit")).toBe(false);
    expect(missedDuringRoll.player.x).toBe(run.player.x - 86);
    expect(skillHitEvents(missedDuringRoll, "shadow-roll")).toHaveLength(1);
  });

  it("cancels shadow-roll shot when monster damage interrupts the roll before the hit frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(selectBaseClass(createInitialState(), "ink-shadow-ranger"), "cinder-kiln-alley"),
      { x: 360, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 340, y: 340, hp: 180, maxHp: 180 }]
    );
    const cast = performAction(run, { type: "skill", skillId: "shadow-roll" });
    const [shotAtMs] = scheduledSkillTimes(cast, "shadow-roll");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: 120,
            attackRecoverUntilMs: 360,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      shotAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 120
        })
      ])
    );
    expect(interrupted.player.activeSkillMovement).toBeUndefined();
    expect(skillHitEvents(interrupted, "shadow-roll")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "shadow-roll")).toHaveLength(0);
  });

  it("pull skills gather enemies toward the skill center instead of knocking them away", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 90), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 315, y: 340 },
        { x: 430, y: 348 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "heat-bloom" });
    const [drawAtMs] = scheduledSkillTimes(cast, "heat-bloom");
    const pulled = stepToElapsed(cast, drawAtMs);
    const centerX = run.player.x + 112;

    expect(cast.enemies.map((enemy) => enemy.position.x)).toEqual(run.enemies.map((enemy) => enemy.position.x));
    expect(Math.abs(pulled.enemies[0].position.x - centerX)).toBeLessThan(Math.abs(run.enemies[0].position.x - centerX));
    expect(Math.abs(pulled.enemies[1].position.x - centerX)).toBeLessThan(Math.abs(run.enemies[1].position.x - centerX));
  });

  it("volley skills emit staggered multi-hit events per target", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 330, y: 340 },
        { x: 390, y: 356 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "black-rain-volley" });
    const [firstRainAtMs, secondRainAtMs, finalRainAtMs] = scheduledSkillTimes(cast, "black-rain-volley");
    const beforeFirstRain = stepToElapsed(cast, firstRainAtMs - 1);
    const firstRain = stepToElapsed(cast, firstRainAtMs);
    const secondRain = stepToElapsed(cast, secondRainAtMs);
    const finalRain = stepToElapsed(cast, finalRainAtMs);
    const firstRainHits = skillHitEvents(firstRain, "black-rain-volley");
    const volleyHits = skillHitEvents(finalRain, "black-rain-volley");
    const hitTimes = [...new Set(volleyHits.map((event) => event.occurredAtMs))];

    expect(skillHitEvents(cast, "black-rain-volley")).toHaveLength(0);
    expect(cast.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(cast.enemies[1].hp).toBe(run.enemies[1].hp);
    expect(beforeFirstRain.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(beforeFirstRain.enemies[1].hp).toBe(run.enemies[1].hp);
    expect(firstRainHits).toHaveLength(2);
    expect(skillHitEvents(secondRain, "black-rain-volley")).toHaveLength(4);
    expect(volleyHits).toHaveLength(6);
    expect(hitTimes.length).toBeGreaterThan(1);
    expect(Math.max(...hitTimes) - Math.min(...hitTimes)).toBeGreaterThanOrEqual(180);
    expect([...new Set(volleyHits.map((event) => event.inputToHitMs))]).toEqual([340, 450, 560]);
    expect(volleyHits.map((event) => event.hitPhase)).toEqual([
      "black-rain-open",
      "black-rain-open",
      "black-rain-fall",
      "black-rain-fall",
      "black-rain-burst",
      "black-rain-burst"
    ]);
    expect(volleyHits.map((event) => event.vfxCue)).toEqual([
      "black-rain-open",
      "black-rain-open",
      "black-rain-fall",
      "black-rain-fall",
      "black-rain-burst",
      "black-rain-burst"
    ]);
    expect(volleyHits.map((event) => event.vfxWindowMs)).toEqual([300, 300, 360, 360, 440, 440]);
    expect(firstRain.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
    expect(finalRain.enemies[0].hp).toBeLessThan(firstRain.enemies[0].hp);
    expect(finalRain.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
  });

  it("emits only the opening black-rain-volley MISS when all rain waves whiff", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 720, y: 430, hp: 220, maxHp: 220 },
        { x: 760, y: 430, hp: 220, maxHp: 220 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "black-rain-volley" });
    const [firstRainAtMs, , finalRainAtMs] = scheduledSkillTimes(cast, "black-rain-volley");
    const beforeFirstRain = stepToElapsed(cast, firstRainAtMs - 1);
    const firstRain = stepToElapsed(cast, firstRainAtMs);
    const finalRain = stepToElapsed(cast, finalRainAtMs);
    const misses = skillMissEvents(finalRain, "black-rain-volley");

    expect(skillHitEvents(cast, "black-rain-volley")).toHaveLength(0);
    expect(skillMissEvents(cast, "black-rain-volley")).toHaveLength(0);
    expect(skillMissEvents(beforeFirstRain, "black-rain-volley")).toHaveLength(0);
    expect(skillMissEvents(firstRain, "black-rain-volley")).toHaveLength(1);
    expect(skillHitEvents(finalRain, "black-rain-volley")).toHaveLength(0);
    expect(misses).toHaveLength(1);
    expect(misses[0]).toMatchObject({
      occurredAtMs: firstRainAtMs,
      inputToHitMs: firstRainAtMs,
      hitPhase: "black-rain-open",
      vfxCue: "black-rain-open",
      vfxWindowMs: 300
    });
  });

  it("cancels black-rain-volley rain waves when monster damage interrupts the cast", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [
        { x: 330, y: 340, hp: 220, maxHp: 220 },
        { x: 390, y: 356, hp: 220, maxHp: 220 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "black-rain-volley" });
    const [, , finalRainAtMs] = scheduledSkillTimes(cast, "black-rain-volley");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: 220,
            attackRecoverUntilMs: 420,
            attackHitResolved: false,
            attackResolvedHits: 0
          },
          cast.enemies[1]
        ]
      },
      {},
      finalRainAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 220
        })
      ])
    );
    expect(interrupted.player.activeSkillMovement).toBeUndefined();
    expect(skillHitEvents(interrupted, "black-rain-volley")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(interrupted.enemies[1].hp).toBe(run.enemies[1].hp);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "black-rain-volley")).toHaveLength(0);
  });

  it("cancels remaining black-rain-volley waves after the first rain if a monster interrupts", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [
        { x: 330, y: 340, hp: 220, maxHp: 220 },
        { x: 390, y: 356, hp: 220, maxHp: 220 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "black-rain-volley" });
    const [firstRainAtMs, secondRainAtMs, finalRainAtMs] = scheduledSkillTimes(cast, "black-rain-volley");
    const firstRain = stepToElapsed(cast, firstRainAtMs);
    const interruptDelayMs = 30;
    const shiftedInterruptAtMs = firstRainAtMs + interruptDelayMs + (firstRain.player.hitstopUntilMs - firstRain.elapsedMs);
    const interrupted = stepCombat(
      {
        ...firstRain,
        enemies: [
          {
            ...firstRain.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: firstRainAtMs,
            attackImpactAtMs: firstRainAtMs + interruptDelayMs,
            attackRecoverUntilMs: firstRainAtMs + 260,
            attackHitResolved: false,
            attackResolvedHits: 0
          },
          firstRain.enemies[1]
        ]
      },
      {},
      finalRainAtMs - firstRain.elapsedMs
    );

    expect(skillHitEvents(firstRain, "black-rain-volley")).toHaveLength(2);
    expect(shiftedInterruptAtMs).toBeLessThan(secondRainAtMs);
    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: shiftedInterruptAtMs
        })
      ])
    );
    expect(skillHitEvents(interrupted, "black-rain-volley")).toHaveLength(2);
    expect(interrupted.enemies[0].hp).toBe(firstRain.enemies[0].hp);
    expect(interrupted.enemies[1].hp).toBe(firstRain.enemies[1].hp);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "black-rain-volley")).toHaveLength(0);
  });

  it("liuli-rain falls in staggered prism waves on live rain targets", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 330, y: 340 },
        { x: 390, y: 356 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "liuli-rain" });
    const [firstRainAtMs, , finalRainAtMs] = scheduledSkillTimes(cast, "liuli-rain");
    const beforeFirstRain = stepToElapsed(cast, firstRainAtMs - 1);
    const firstRain = stepToElapsed(cast, firstRainAtMs);
    const finalRain = stepToElapsed(cast, finalRainAtMs);
    const rainHits = skillHitEvents(finalRain, "liuli-rain");
    const hitTimes = [...new Set(rainHits.map((event) => event.occurredAtMs))];
    const targetIds = [...new Set(rainHits.map((event) => event.targetId))];

    expect(skillHitEvents(cast, "liuli-rain")).toHaveLength(0);
    expect(cast.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(cast.enemies[1].hp).toBe(run.enemies[1].hp);
    expect(beforeFirstRain.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(beforeFirstRain.enemies[1].hp).toBe(run.enemies[1].hp);
    expect(skillHitEvents(firstRain, "liuli-rain")).toHaveLength(2);
    expect(rainHits).toHaveLength(6);
    expect(hitTimes).toHaveLength(3);
    expect(Math.max(...hitTimes) - Math.min(...hitTimes)).toBeGreaterThanOrEqual(180);
    expect([...new Set(rainHits.map((event) => event.inputToHitMs))]).toEqual([260, 355, 450]);
    expect(targetIds).toHaveLength(2);
    expect(targetIds.every((targetId) => rainHits.filter((event) => event.targetId === targetId).length === 3)).toBe(true);
    expect(rainHits.map((event) => event.hitPhase)).toEqual([
      "rain-open",
      "rain-open",
      "rain-fall",
      "rain-fall",
      "rain-shatter",
      "rain-shatter"
    ]);
    expect(rainHits.map((event) => event.vfxCue)).toEqual([
      "glass-rain-open",
      "glass-rain-open",
      "glass-rain-fall",
      "glass-rain-fall",
      "glass-rain-shatter",
      "glass-rain-shatter"
    ]);
    expect(rainHits.map((event) => event.vfxWindowMs)).toEqual([300, 300, 340, 340, 420, 420]);
    expect(firstRain.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
    expect(finalRain.enemies[0].hp).toBeLessThan(firstRain.enemies[0].hp);
    expect(finalRain.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
  });

  it("rechecks liuli-rain targets at each rain wave", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 330, y: 340, hp: 260, maxHp: 260, armor: 0 },
        { x: 760, y: 430, hp: 260, maxHp: 260, armor: 0 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "liuli-rain" });
    const [firstRainAtMs, , finalRainAtMs] = scheduledSkillTimes(cast, "liuli-rain");
    const firstRain = stepToElapsed(cast, firstRainAtMs);
    const movedAfterFirstRain: CombatRun = {
      ...firstRain,
      enemies: firstRain.enemies.map((enemy, index) => ({
        ...enemy,
        position: index === 0 ? { x: 760, y: 430 } : { x: 390, y: 356 }
      }))
    };
    const finalRain = stepToElapsed(movedAfterFirstRain, finalRainAtMs);
    const rainHits = skillHitEvents(finalRain, "liuli-rain");

    expect(rainHits).toHaveLength(3);
    expect(rainHits.map((event) => event.targetId)).toEqual([
      run.enemies[0].id,
      run.enemies[1].id,
      run.enemies[1].id
    ]);
    expect([...new Set(rainHits.map((event) => event.inputToHitMs))]).toEqual([260, 355, 450]);
    expect(firstRain.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
    expect(finalRain.enemies[0].hp).toBe(firstRain.enemies[0].hp);
    expect(finalRain.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
  });

  it("lets liuli-rain catch enemies entering an initially empty rain lane before the first wave", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 40, y: 430, hp: 260, maxHp: 260, armor: 0 },
        { x: 760, y: 430, hp: 260, maxHp: 260, armor: 0 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "liuli-rain" });
    const [firstRainAtMs, , finalRainAtMs] = scheduledSkillTimes(cast, "liuli-rain");
    const movedIntoRain: CombatRun = {
      ...cast,
      enemies: cast.enemies.map((enemy, index) => ({
        ...enemy,
        position: index === 1 ? { x: 390, y: 356 } : enemy.position
      }))
    };
    const beforeFirstRain = stepToElapsed(movedIntoRain, firstRainAtMs - 1);
    const finalRain = stepToElapsed(movedIntoRain, finalRainAtMs);
    const rainHits = skillHitEvents(finalRain, "liuli-rain");

    expect(skillMissEvents(cast, "liuli-rain")).toHaveLength(0);
    expect(skillHitEvents(beforeFirstRain, "liuli-rain")).toHaveLength(0);
    expect(skillMissEvents(finalRain, "liuli-rain")).toHaveLength(0);
    expect(rainHits.map((event) => event.targetId)).toEqual([
      run.enemies[1].id,
      run.enemies[1].id,
      run.enemies[1].id
    ]);
    expect(finalRain.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(finalRain.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
  });

  it("cancels liuli-rain prism waves when monster damage interrupts before the first rain", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [
        { x: 330, y: 340, hp: 220, maxHp: 220 },
        { x: 390, y: 356, hp: 220, maxHp: 220 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "liuli-rain" });
    const [, , finalRainAtMs] = scheduledSkillTimes(cast, "liuli-rain");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: 180,
            attackRecoverUntilMs: 420,
            attackHitResolved: false,
            attackResolvedHits: 0
          },
          cast.enemies[1]
        ]
      },
      {},
      finalRainAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 180
        })
      ])
    );
    expect(interrupted.player.activeSkillMovement).toBeUndefined();
    expect(skillHitEvents(interrupted, "liuli-rain")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(interrupted.enemies[1].hp).toBe(run.enemies[1].hp);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "liuli-rain")).toHaveLength(0);
  });

  it("sword-prism-field locks targets before a delayed ultimate field burst", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100);
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const run: CombatRun = {
      ...baseRun,
      player,
      enemies: [
        {
          ...baseRun.enemies[0],
          hp: 240,
          maxHp: 240,
          position: { x: 330, y: 340 },
          nextAttackAtMs: 9999
        },
        {
          ...baseRun.enemies[1],
          hp: 240,
          maxHp: 240,
          position: { x: 390, y: 352 },
          nextAttackAtMs: 9999
        },
        {
          ...baseRun.enemies[0],
          id: "test-prism-field-third",
          hp: 240,
          maxHp: 240,
          position: { x: 450, y: 332 },
          nextAttackAtMs: 9999
        }
      ]
    };

    const cast = performAction(run, { type: "skill", skillId: "sword-prism-field" });
    const [lockAtMs, burstAtMs] = scheduledSkillTimes(cast, "sword-prism-field");
    const beforeLock = stepToElapsed(cast, lockAtMs - 1);
    const locked = stepToElapsed(cast, lockAtMs);
    const burst = stepToElapsed(cast, burstAtMs);
    const lockHits = skillHitEvents(locked, "sword-prism-field").filter((event) => event.hitPhase === "prism-field-lock");
    const burstHits = skillHitEvents(burst, "sword-prism-field").filter((event) => event.hitPhase === "prism-field-burst");

    expect(cast.player.activeSkillMovement?.skillId).toBe("sword-prism-field");
    expect(lockAtMs).toBe(390);
    expect(burstAtMs).toBe(610);
    expect(skillHitEvents(cast, "sword-prism-field")).toHaveLength(0);
    expect(beforeLock.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
    expect(lockHits).toHaveLength(3);
    expect(lockHits.every((event) => event.vfxCue === "sword-prism-field-lock")).toBe(true);
    expect(burstHits).toHaveLength(3);
    expect(burstHits.every((event) => event.vfxCue === "sword-prism-field-burst")).toBe(true);
    expect(burstHits.every((event) => event.actionTags?.includes("knockdown"))).toBe(true);
    expect(burst.enemies.every((enemy) => enemy.hp < 240)).toBe(true);
    expect(burst.enemies.every((enemy) => enemy.downed)).toBe(true);
    expect(burst.player.activeSkillMovement).toBeUndefined();
  });

  it("rechecks sword-prism-field targets when the prism field locks", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 720, y: 500, hp: 240, maxHp: 240 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "sword-prism-field" });
    const [lockAtMs] = scheduledSkillTimes(cast, "sword-prism-field");
    const movedIntoField = stepToElapsed(
      {
        ...cast,
        enemies: cast.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: 390, y: 340 }
              }
            : enemy
        )
      },
      lockAtMs
    );
    const [lockHit] = skillHitEvents(movedIntoField, "sword-prism-field");

    expect(lockHit).toMatchObject({
      targetId: run.enemies[0].id,
      hitPhase: "prism-field-lock",
      vfxCue: "sword-prism-field-lock"
    });
    expect(skillMissEvents(movedIntoField, "sword-prism-field")).toHaveLength(0);
    expect(movedIntoField.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("delays sword-prism-field whiff feedback until the field lock frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 40, y: 500, hp: 240, maxHp: 240 },
        { x: 760, y: 500, hp: 240, maxHp: 240 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "sword-prism-field" });
    const [lockAtMs] = scheduledSkillTimes(cast, "sword-prism-field");
    const beforeMiss = stepToElapsed(cast, lockAtMs - 1);
    const missed = stepToElapsed(cast, lockAtMs);

    expect(lockAtMs).toBe(390);
    expect(skillMissEvents(cast, "sword-prism-field")).toHaveLength(0);
    expect(skillMissEvents(beforeMiss, "sword-prism-field")).toHaveLength(0);
    expect(skillMissEvents(missed, "sword-prism-field")).toHaveLength(1);
    expect(missed.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
  });

  it("does not emit a duplicate sword-prism-field miss on the burst frame after an empty lock", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 40, y: 500, hp: 240, maxHp: 240 },
        { x: 760, y: 500, hp: 240, maxHp: 240 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "sword-prism-field" });
    const [, burstAtMs] = scheduledSkillTimes(cast, "sword-prism-field");
    const afterBurst = stepToElapsed(cast, burstAtMs);
    const misses = skillMissEvents(afterBurst, "sword-prism-field");

    expect(misses).toHaveLength(1);
    expect(misses[0].occurredAtMs).toBe(390);
    expect(skillHitEvents(afterBurst, "sword-prism-field")).toHaveLength(0);
  });

  it("does not burst sword-prism-field on targets that enter after the lock frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 390, y: 340, hp: 240, maxHp: 240 },
        { x: 720, y: 500, hp: 240, maxHp: 240 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "sword-prism-field" });
    const [lockAtMs, burstAtMs] = scheduledSkillTimes(cast, "sword-prism-field");
    const locked = stepToElapsed(cast, lockAtMs);
    const lateEntrantBeforeBurst: CombatRun = {
      ...locked,
      enemies: locked.enemies.map((enemy, index) =>
        index === 1
          ? {
              ...enemy,
              position: { x: 400, y: 344 }
            }
          : enemy
      )
    };
    const burst = stepToElapsed(lateEntrantBeforeBurst, burstAtMs);
    const burstHits = skillHitEvents(burst, "sword-prism-field").filter((event) => event.hitPhase === "prism-field-burst");

    expect(skillHitEvents(locked, "sword-prism-field").filter((event) => event.hitPhase === "prism-field-lock")).toHaveLength(1);
    expect(burstHits.map((event) => event.targetId)).toEqual([run.enemies[0].id]);
    expect(burst.enemies[0].hp).toBeLessThan(locked.enemies[0].hp);
    expect(burst.enemies[1].hp).toBe(locked.enemies[1].hp);
  });

  it("cancels sword-prism-field pending lock and burst when monster damage interrupts the cast", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 390, y: 340, hp: 240, maxHp: 240 }]
    );
    const cast = performAction(run, { type: "skill", skillId: "sword-prism-field" });
    const [, burstAtMs] = scheduledSkillTimes(cast, "sword-prism-field");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: 300,
            attackRecoverUntilMs: 620,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      burstAtMs
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 300
        })
      ])
    );
    expect(interrupted.player.activeSkillMovement).toBeUndefined();
    expect(skillHitEvents(interrupted, "sword-prism-field")).toHaveLength(0);
    expect(skillMissEvents(interrupted, "sword-prism-field")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "sword-prism-field")).toHaveLength(0);
  });

  it("furnace-heart-overdrive charges in place before pulsing and releasing around the player", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(createInitialState(), 100)),
      "ember-furnace-master"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 320, y: 340, facing: 1 },
      [
        { x: 238, y: 340, hp: 240, maxHp: 240, armor: 18 },
        { x: 420, y: 350, hp: 240, maxHp: 240, armor: 18 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "furnace-heart-overdrive" });
    const [pulseAtMs, releaseAtMs] = scheduledSkillTimes(cast, "furnace-heart-overdrive");
    const beforePulse = stepToElapsed(cast, pulseAtMs - 1);
    const pulseRun = stepToElapsed(cast, pulseAtMs);
    const releaseRun = stepToElapsed(pulseRun, releaseAtMs);
    const jumpedReleaseRun = stepToElapsed(cast, releaseAtMs);
    const overdriveHits = skillHitEvents(releaseRun, "furnace-heart-overdrive");
    const jumpedOverdriveHits = skillHitEvents(jumpedReleaseRun, "furnace-heart-overdrive");

    expect(cast.player.activeSkillMovement?.skillId).toBe("furnace-heart-overdrive");
    expect(cast.player.x).toBe(run.player.x);
    expect(cast.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
    expect(skillHitEvents(cast, "furnace-heart-overdrive")).toHaveLength(0);
    expect([pulseAtMs, releaseAtMs]).toEqual([360, 560]);
    expect(beforePulse.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
    expect(skillHitEvents(pulseRun, "furnace-heart-overdrive")).toHaveLength(2);
    expect(overdriveHits).toHaveLength(4);
    expect(overdriveHits.map((event) => event.hitPhase)).toEqual([
      "overdrive-pulse",
      "overdrive-pulse",
      "overdrive-release",
      "overdrive-release"
    ]);
    expect(overdriveHits.map((event) => event.vfxCue)).toEqual([
      "overdrive-core-pulse",
      "overdrive-core-pulse",
      "overdrive-core-release",
      "overdrive-core-release"
    ]);
    expect(jumpedOverdriveHits.map((event) => event.hitPhase)).toEqual(overdriveHits.map((event) => event.hitPhase));
    expect(jumpedReleaseRun.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "furnace-heart-overdrive")).toHaveLength(0);
    expect(overdriveHits.filter((event) => event.hitPhase === "overdrive-release").every((event) => event.statusTags?.includes("stagger"))).toBe(
      true
    );
    expect(releaseRun.enemies.every((enemy) => enemy.hp < run.enemies.find((source) => source.id === enemy.id)!.hp)).toBe(true);
    expect(releaseRun.enemies.every((enemy) => enemy.downed && (enemy.downedUntilMs ?? 0) > releaseRun.elapsedMs)).toBe(true);
  });

  it("rechecks furnace-heart-overdrive targets at pulse and releases only pulsed enemies", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(createInitialState(), 100)),
      "ember-furnace-master"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 320, y: 340, facing: 1 },
      [
        { x: 238, y: 340, hp: 260, maxHp: 260, armor: 0 },
        { x: 760, y: 430, hp: 260, maxHp: 260, armor: 0 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "furnace-heart-overdrive" });
    const [pulseAtMs, releaseAtMs] = scheduledSkillTimes(cast, "furnace-heart-overdrive");
    const movedBeforePulse: CombatRun = {
      ...cast,
      enemies: cast.enemies.map((enemy, index) => ({
        ...enemy,
        position: index === 0 ? { x: 760, y: 430 } : { x: 420, y: 350 }
      }))
    };
    const pulseRun = stepToElapsed(movedBeforePulse, pulseAtMs);
    const withLateEntrant: CombatRun = {
      ...pulseRun,
      enemies: pulseRun.enemies.map((enemy, index) => ({
        ...enemy,
        position: index === 0 ? { x: 250, y: 340 } : enemy.position
      }))
    };
    const releaseRun = stepToElapsed(withLateEntrant, releaseAtMs);
    const overdriveHits = skillHitEvents(releaseRun, "furnace-heart-overdrive");

    expect(skillHitEvents(pulseRun, "furnace-heart-overdrive").map((event) => event.targetId)).toEqual([run.enemies[1].id]);
    expect(overdriveHits.map((event) => event.targetId)).toEqual([run.enemies[1].id, run.enemies[1].id]);
    expect(overdriveHits.map((event) => event.hitPhase)).toEqual(["overdrive-pulse", "overdrive-release"]);
    expect(releaseRun.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(releaseRun.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
    expect(releaseRun.enemies[1].downed).toBe(true);
  });

  it("lets furnace-heart-overdrive catch enemies entering an initially empty core before pulse", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(createInitialState(), 100)),
      "ember-furnace-master"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 320, y: 340, facing: 1 },
      [
        { x: 40, y: 430, hp: 260, maxHp: 260, armor: 0 },
        { x: 760, y: 430, hp: 260, maxHp: 260, armor: 0 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "furnace-heart-overdrive" });
    const [pulseAtMs, releaseAtMs] = scheduledSkillTimes(cast, "furnace-heart-overdrive");
    const movedIntoCore: CombatRun = {
      ...cast,
      enemies: cast.enemies.map((enemy, index) => ({
        ...enemy,
        position: index === 1 ? { x: 420, y: 350 } : enemy.position
      }))
    };
    const beforePulse = stepToElapsed(movedIntoCore, pulseAtMs - 1);
    const releaseRun = stepToElapsed(movedIntoCore, releaseAtMs);
    const overdriveHits = skillHitEvents(releaseRun, "furnace-heart-overdrive");

    expect(skillHitEvents(beforePulse, "furnace-heart-overdrive")).toHaveLength(0);
    expect(skillMissEvents(releaseRun, "furnace-heart-overdrive")).toHaveLength(0);
    expect(overdriveHits.map((event) => event.targetId)).toEqual([run.enemies[1].id, run.enemies[1].id]);
    expect(overdriveHits.map((event) => event.hitPhase)).toEqual(["overdrive-pulse", "overdrive-release"]);
    expect(releaseRun.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(releaseRun.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
  });

  it("delays furnace-heart-overdrive whiff feedback and cancels it when interrupted", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(createInitialState(), 100)),
      "ember-furnace-master"
    );
    const missRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 320, y: 340, facing: 1 },
      [
        { x: 40, y: 430 },
        { x: 760, y: 430 }
      ]
    );
    const whiffCast = performAction(missRun, { type: "skill", skillId: "furnace-heart-overdrive" });
    const [pulseAtMs] = scheduledSkillTimes(whiffCast, "furnace-heart-overdrive");
    const beforeMiss = stepToElapsed(whiffCast, pulseAtMs - 1);
    const whiffed = stepToElapsed(whiffCast, pulseAtMs);

    expect(skillMissEvents(whiffCast, "furnace-heart-overdrive")).toHaveLength(0);
    expect(skillMissEvents(beforeMiss, "furnace-heart-overdrive")).toHaveLength(0);
    expect(skillMissEvents(whiffed, "furnace-heart-overdrive")).toEqual([
      expect.objectContaining({
        occurredAtMs: 360,
        inputToHitMs: 360
      })
    ]);

    const hitRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 320, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [
        { x: 238, y: 340, hp: 240, maxHp: 240 },
        { x: 420, y: 350, hp: 240, maxHp: 240 }
      ]
    );
    const cast = performAction(hitRun, { type: "skill", skillId: "furnace-heart-overdrive" });
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: cast.enemies.map((enemy, index) =>
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

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 220
        })
      ])
    );
    expect(skillHitEvents(interrupted, "furnace-heart-overdrive")).toHaveLength(0);
    expect(interrupted.enemies.map((enemy) => enemy.hp)).toEqual(cast.enemies.map((enemy) => enemy.hp));
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "furnace-heart-overdrive")).toHaveLength(0);
  });

  it("lets same-frame enemy interruption cancel furnace-heart-overdrive whiff feedback", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(createInitialState(), 100)),
      "ember-furnace-master"
    );
    const missRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 320, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [
        { x: 40, y: 430 },
        { x: 760, y: 430 }
      ]
    );
    const whiffCast = performAction(missRun, { type: "skill", skillId: "furnace-heart-overdrive" });
    const interrupted = stepCombat(
      {
        ...whiffCast,
        enemies: whiffCast.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: { x: whiffCast.player.x + 80, y: whiffCast.player.y },
                attackSkillId: "ash-ember-spit" as const,
                attackStartedAtMs: 80,
                attackImpactAtMs: 360,
                attackRecoverUntilMs: 600,
                attackHitResolved: false,
                attackResolvedHits: 0
              }
            : enemy
        )
      },
      {},
      360
    );

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 360
        })
      ])
    );
    expect(skillMissEvents(interrupted, "furnace-heart-overdrive")).toHaveLength(0);
    expect(interrupted.scheduledMissEffects.filter((effect) => effect.skillId === "furnace-heart-overdrive")).toHaveLength(0);
  });

  it("prism-step pierces enemies along the dash path instead of only checking the landing point", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 40);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 292, y: 340 },
        { x: 332, y: 348 }
      ]
    );

    const step = performAction(run, { type: "skill", skillId: "prism-step" });
    const earlyStepHits = step.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "prism-step");
    const beforeImpact = stepCombat(step, {}, 82);
    const atFirstImpact = stepCombat(step, {}, 165);
    const afterFinalImpact = stepCombat(step, {}, 193);
    const stepHits = afterFinalImpact.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "prism-step");
    const targetIds = [...new Set(stepHits.map((event) => event.targetId))];

    expect(step.player.x).toBe(run.player.x);
    expect(earlyStepHits).toHaveLength(0);
    expect(beforeImpact.player.x).toBeGreaterThan(run.player.x);
    expect(beforeImpact.player.x).toBeLessThan(344);
    expect(beforeImpact.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(beforeImpact.enemies[1].hp).toBe(run.enemies[1].hp);
    expect(atFirstImpact.player.x).toBeGreaterThanOrEqual(344);
    expect(atFirstImpact.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
    expect(stepHits).toHaveLength(2);
    expect(targetIds).toHaveLength(2);
    expect(stepHits.every((event) => (event.hitPhase as string | undefined) === "pierce")).toBe(true);
    expect(stepHits.every((event) => (event.vfxCue as string | undefined) === "prism-pierce")).toBe(true);
    expect(stepHits.every((event) => event.statusTags?.includes("stagger"))).toBe(true);
    expect(afterFinalImpact.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
    expect(afterFinalImpact.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
    expect((afterFinalImpact.player as typeof afterFinalImpact.player & { activeSkillMovement?: unknown }).activeSkillMovement).toBeUndefined();
  });

  it("rechecks prism-step targets live at the dash impact frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 40);
    const twoTargetRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 292, y: 340, hp: 160, maxHp: 160 },
        { x: 332, y: 348, hp: 160, maxHp: 160 }
      ]
    );
    const run: CombatRun = {
      ...twoTargetRun,
      enemies: [
        ...twoTargetRun.enemies,
        {
          ...twoTargetRun.enemies[0],
          id: "test-prism-step-live-third",
          hp: 160,
          maxHp: 160,
          armor: 0,
          position: { x: 720, y: 430 },
          nextAttackAtMs: 9999
        }
      ]
    };
    const cast = performAction(run, { type: "skill", skillId: "prism-step" });
    const [impactAtMs] = scheduledSkillTimes(cast, "prism-step");
    const movedBeforeImpact = {
      ...cast,
      enemies: cast.enemies.map((enemy, index) => {
        if (index < 2) {
          return {
            ...enemy,
            position: { x: 760 + index * 32, y: 430 }
          };
        }

        return {
          ...enemy,
          position: { x: 310, y: 340 }
        };
      })
    };
    const beforeImpact = stepToElapsed(movedBeforeImpact, impactAtMs - 1);
    const impact = stepToElapsed(movedBeforeImpact, impactAtMs);
    const stepHits = skillHitEvents(impact, "prism-step");
    const targetIds = [...new Set(stepHits.map((event) => event.targetId))];

    expect(impactAtMs).toBe(165);
    expect(skillHitEvents(cast, "prism-step")).toHaveLength(0);
    expect(skillHitEvents(beforeImpact, "prism-step")).toHaveLength(0);
    expect(stepHits).toHaveLength(1);
    expect(targetIds).toEqual([cast.enemies[2].id]);
    expect(impact.enemies[0].hp).toBe(cast.enemies[0].hp);
    expect(impact.enemies[1].hp).toBe(cast.enemies[1].hp);
    expect(impact.enemies[2].hp).toBeLessThan(cast.enemies[2].hp);
    expect(skillMissEvents(impact, "prism-step")).toHaveLength(0);
  });

  it("delays prism-step MISS feedback until the dash impact frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 40);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 720, y: 430, hp: 160, maxHp: 160 },
        { x: 760, y: 430, hp: 160, maxHp: 160 }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "prism-step" });
    const [impactAtMs] = scheduledSkillTimes(cast, "prism-step");
    const beforeImpact = stepToElapsed(cast, impactAtMs - 1);
    const impact = stepToElapsed(cast, impactAtMs);

    expect(impactAtMs).toBe(165);
    expect(skillMissEvents(cast, "prism-step")).toHaveLength(0);
    expect(skillMissEvents(beforeImpact, "prism-step")).toHaveLength(0);
    expect(skillMissEvents(impact, "prism-step")).toHaveLength(1);
    expect(skillMissEvents(impact, "prism-step")[0]).toMatchObject({
      occurredAtMs: impactAtMs,
      inputToHitMs: impactAtMs
    });
  });

  it("samples prism-step movement for arena hazards inside a large frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 40);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [
        { x: 292, y: 340 },
        { x: 332, y: 348 }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "prism-step" });
    const jumped = stepCombat(
      {
        ...cast,
        scheduledArenaHazards: [
          {
            hazardId: "test-prism-mid-hazard",
            enemyId: cast.enemies[0].id,
            skillId: "taotie-forge-collapse",
            x: 291,
            y: 340,
            radiusX: 3,
            laneRange: 24,
            impactAtMs: 82,
            damage: 40,
            hitstopMs: 20,
            knockback: 4,
            vfxWindowMs: 300
          }
        ]
      },
      {},
      193
    );

    expect(jumped.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "arena-hazard",
          hazardId: "test-prism-mid-hazard",
          phase: "active"
        }),
        expect.objectContaining({
          kind: "player-hit",
          skillId: "taotie-forge-collapse",
          occurredAtMs: 82
        })
      ])
    );
    expect(skillHitEvents(jumped, "prism-step")).toHaveLength(0);
    expect(jumped.enemies.map((enemy) => enemy.hp)).toEqual(cast.enemies.map((enemy) => enemy.hp));
    expect(jumped.player.hp).toBeLessThan(cast.player.hp);
  });

  it("flowing-light-chain moves through delayed three-stage path slashes", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100)),
      "flowing-light-swordmaster"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 294, y: 340, hp: 180, maxHp: 180 },
        { x: 362, y: 348, hp: 180, maxHp: 180 }
      ]
    );
    const castingEnemyRun = {
      ...run,
      enemies: run.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackSkillId: "ash-ember-spit" as const,
              attackStartedAtMs: 0,
              attackImpactAtMs: 820,
              attackRecoverUntilMs: 980,
              attackHitResolved: false,
              attackResolvedHits: 0
            }
          : enemy
      )
    };

    const cast = performAction(castingEnemyRun, { type: "skill", skillId: "flowing-light-chain" });
    const [openAtMs, crossAtMs, finishAtMs] = scheduledSkillTimes(cast, "flowing-light-chain");
    const beforeOpen = stepToElapsed(cast, openAtMs - 1);
    const final = stepToElapsed(cast, finishAtMs);
    const chainHits = skillHitEvents(final, "flowing-light-chain");
    const targetIds = [...new Set(chainHits.map((event) => event.targetId))];

    expect(cast.player.x).toBe(run.player.x);
    expect(cast.player.activeSkillMovement?.skillId).toBe("flowing-light-chain");
    expect(cast.enemies.map((enemy) => enemy.hp)).toEqual(castingEnemyRun.enemies.map((enemy) => enemy.hp));
    expect(skillHitEvents(cast, "flowing-light-chain")).toHaveLength(0);
    expect([openAtMs, crossAtMs, finishAtMs]).toEqual([220, 340, 470]);
    expect(beforeOpen.player.x).toBeGreaterThan(run.player.x);
    expect(skillHitEvents(beforeOpen, "flowing-light-chain")).toHaveLength(0);
    expect(chainHits).toHaveLength(6);
    expect(targetIds).toHaveLength(2);
    expect(targetIds.every((targetId) => chainHits.filter((event) => event.targetId === targetId).length === 3)).toBe(true);
    expect([...new Set(chainHits.map((event) => event.hitPhase))]).toEqual(["chain-open", "chain-cross", "chain-finish"]);
    expect([...new Set(chainHits.map((event) => event.vfxCue))]).toEqual([
      "flowing-chain-open",
      "flowing-chain-cross",
      "flowing-chain-finish"
    ]);
    expect(chainHits.every((event) => event.vfxWindowMs === 260)).toBe(true);
    expect(chainHits.filter((event) => event.hitPhase === "chain-finish").every((event) => event.statusTags?.includes("stagger"))).toBe(
      true
    );
    expect(final.enemies[0].attackSkillId).toBeUndefined();
    expect(final.enemies[0].controlledUntilMs).toBeGreaterThan(finishAtMs);
  });

  it("rechecks flowing-light-chain targets live on each slash frame", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100)),
      "flowing-light-swordmaster"
    );
    const twoTargetRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 294, y: 340, hp: 180, maxHp: 180 },
        { x: 362, y: 348, hp: 180, maxHp: 180 }
      ]
    );
    const run: CombatRun = {
      ...twoTargetRun,
      enemies: [
        ...twoTargetRun.enemies,
        {
          ...twoTargetRun.enemies[0],
          id: "test-flowing-light-live-third",
          hp: 180,
          maxHp: 180,
          armor: 0,
          position: { x: 720, y: 430 },
          nextAttackAtMs: 9999
        }
      ]
    };
    const cast = performAction(run, { type: "skill", skillId: "flowing-light-chain" });
    const [, , finishAtMs] = scheduledSkillTimes(cast, "flowing-light-chain");
    const movedBeforeOpen = {
      ...cast,
      enemies: cast.enemies.map((enemy, index) => {
        if (index < 2) {
          return {
            ...enemy,
            position: { x: 760 + index * 32, y: 430 }
          };
        }

        return {
          ...enemy,
          position: { x: 318, y: 340 }
        };
      })
    };
    const final = stepToElapsed(movedBeforeOpen, finishAtMs);
    const chainHits = skillHitEvents(final, "flowing-light-chain");
    const hitTargetIds = [...new Set(chainHits.map((event) => event.targetId))];

    expect(chainHits).toHaveLength(3);
    expect(hitTargetIds).toEqual([cast.enemies[2].id]);
    expect(final.enemies[0].hp).toBe(cast.enemies[0].hp);
    expect(final.enemies[1].hp).toBe(cast.enemies[1].hp);
    expect(final.enemies[2].hp).toBeLessThan(cast.enemies[2].hp);
    expect(skillMissEvents(final, "flowing-light-chain")).toHaveLength(0);
  });

  it("delays flowing-light-chain MISS feedback until the first slash frame", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100)),
      "flowing-light-swordmaster"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 720, y: 430, hp: 180, maxHp: 180 },
        { x: 760, y: 430, hp: 180, maxHp: 180 }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "flowing-light-chain" });
    const [openAtMs, , finishAtMs] = scheduledSkillTimes(cast, "flowing-light-chain");
    const beforeOpen = stepToElapsed(cast, openAtMs - 1);
    const atOpen = stepToElapsed(cast, openAtMs);
    const final = stepToElapsed(cast, finishAtMs);

    expect(skillMissEvents(cast, "flowing-light-chain")).toHaveLength(0);
    expect(skillMissEvents(beforeOpen, "flowing-light-chain")).toHaveLength(0);
    expect(skillMissEvents(atOpen, "flowing-light-chain")).toHaveLength(1);
    expect(skillMissEvents(final, "flowing-light-chain")).toHaveLength(1);
    expect(skillMissEvents(final, "flowing-light-chain")[0]).toMatchObject({
      occurredAtMs: openAtMs,
      inputToHitMs: openAtMs,
      hitPhase: "chain-open",
      vfxCue: "flowing-chain-open",
      vfxWindowMs: 260
    });
  });

  it("cancels pending flowing-light-chain hits when monster damage interrupts the dash", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100)),
      "flowing-light-swordmaster"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 294, y: 340, hp: 180, maxHp: 180 }]
    );
    const cast = performAction(run, { type: "skill", skillId: "flowing-light-chain" });
    const [, , finishAtMs] = scheduledSkillTimes(cast, "flowing-light-chain");
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: 180,
            attackRecoverUntilMs: 360,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      180
    );
    const afterQueuedWindows = stepCombat(interrupted, {}, finishAtMs);

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 180
        })
      ])
    );
    expect(interrupted.player.activeSkillMovement).toBeUndefined();
    expect(skillHitEvents(afterQueuedWindows, "flowing-light-chain")).toHaveLength(0);
    expect(afterQueuedWindows.enemies.map((enemy) => enemy.hp)).toEqual(interrupted.enemies.map((enemy) => enemy.hp));
  });

  it("cancels flowing-light-chain before queued slashes when an unselected enemy hits earlier in a large frame", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100)),
      "flowing-light-swordmaster"
    );
    const twoTargetRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [
        { x: 294, y: 340, hp: 180, maxHp: 180 },
        { x: 362, y: 348, hp: 180, maxHp: 180 }
      ]
    );
    const run = {
      ...twoTargetRun,
      enemies: [
        ...twoTargetRun.enemies,
        {
          ...twoTargetRun.enemies[0],
          id: "off-path-ash-attacker",
          hp: 180,
          maxHp: 180,
          position: { x: 160, y: 340 },
          nextAttackAtMs: 9999
        }
      ]
    };
    const cast = performAction(run, { type: "skill", skillId: "flowing-light-chain" });
    const [, , finishAtMs] = scheduledSkillTimes(cast, "flowing-light-chain");
    const firstTwoHpBefore = cast.enemies.slice(0, 2).map((enemy) => enemy.hp);
    const jumped = stepCombat(
      {
        ...cast,
        enemies: cast.enemies.map((enemy, index) =>
          index === 2
            ? {
                ...enemy,
                attackSkillId: "ash-ember-spit" as const,
                attackStartedAtMs: 0,
                attackImpactAtMs: 180,
                attackRecoverUntilMs: 360,
                attackHitResolved: false,
                attackResolvedHits: 0
              }
            : enemy
        )
      },
      {},
      finishAtMs
    );

    expect(jumped.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 180
        })
      ])
    );
    expect(skillHitEvents(jumped, "flowing-light-chain")).toHaveLength(0);
    expect(jumped.enemies.slice(0, 2).map((enemy) => enemy.hp)).toEqual(firstTwoHpBefore);
    expect(jumped.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "flowing-light-chain")).toHaveLength(0);
    expect(jumped.player.hitstopUntilMs).toBeLessThan(finishAtMs);
  });

  it("clears active prism-step movement when an enemy hit interrupts the dash", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 40);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [
        {
          x: 300,
          y: 340,
          hp: 160,
          maxHp: 160
        }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "prism-step" });
    const interrupted = stepCombat(
      {
        ...cast,
        enemies: [
          {
            ...cast.enemies[0],
            attackSkillId: "ash-ember-spit",
            attackStartedAtMs: 0,
            attackImpactAtMs: 82,
            attackRecoverUntilMs: 360,
            attackHitResolved: false,
            attackResolvedHits: 0
          }
        ]
      },
      {},
      82
    );
    const advanced = stepCombat(interrupted, {}, 80);
    const afterQueuedImpactWindow = stepCombat(interrupted, {}, 111);

    expect(interrupted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "ash-ember-spit",
          occurredAtMs: 82
        })
      ])
    );
    expect((interrupted.player as typeof interrupted.player & { activeSkillMovement?: unknown }).activeSkillMovement).toBeUndefined();
    expect(advanced.player.x).toBe(interrupted.player.x);
    expect(skillHitEvents(afterQueuedImpactWindow, "prism-step")).toHaveLength(0);
    expect(afterQueuedImpactWindow.enemies.map((enemy) => enemy.hp)).toEqual(interrupted.enemies.map((enemy) => enemy.hp));
  });

  it("releases buffered actions before later arena hazards in the same large frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(createInitialState(), "cinder-kiln-alley"),
      {
        x: 240,
        y: 340,
        facing: 1,
        hp: 45,
        maxHp: 45,
        actionLockUntilMs: 100,
        bufferedAction: { type: "light" },
        bufferedActionQueuedAtMs: 40,
        bufferedActionExecuteAtMs: 100
      },
      [{ x: 320, y: 340, hp: 180, maxHp: 180 }]
    );
    const advanced = stepCombat(
      {
        ...run,
        scheduledArenaHazards: [
          {
            hazardId: "test-buffer-after-hazard",
            enemyId: run.enemies[0].id,
            skillId: "taotie-forge-collapse",
            x: 258,
            y: 340,
            radiusX: 16,
            laneRange: 24,
            impactAtMs: 165,
            damage: 80,
            hitstopMs: 20,
            knockback: 0,
            vfxWindowMs: 300
          }
        ]
      },
      {},
      193
    );

    expect(advanced.failed).toBe(true);
    expect(advanced.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "hit",
          action: "light",
          occurredAtMs: 155
        }),
        expect.objectContaining({
          kind: "player-hit",
          skillId: "taotie-forge-collapse",
          occurredAtMs: 165
        })
      ])
    );
    expect(advanced.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
  });

  it("mechanism-shadow-net binds enemies on delayed net frames before snapping them inward", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 100)),
      "mechanism-shadow-weaver"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 332, y: 340, hp: 260, maxHp: 260, armor: 12 },
        { x: 418, y: 356, hp: 240, maxHp: 240, armor: 8 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "mechanism-shadow-net" });
    const [bindAtMs, snapAtMs] = scheduledSkillTimes(cast, "mechanism-shadow-net");
    const beforeBindRun = stepToElapsed(cast, bindAtMs - 1);
    const bindRun = stepToElapsed(cast, bindAtMs);
    const snapRun = stepToElapsed(bindRun, snapAtMs);
    const netHits = skillHitEvents(snapRun, "mechanism-shadow-net");
    const netCenterX = run.player.x + 150;

    expect(netHits).toHaveLength(4);
    expect(netHits.map((event) => event.hitPhase)).toEqual(["trap-bind", "trap-bind", "trap-snap", "trap-snap"]);
    expect(netHits.map((event) => event.vfxCue)).toEqual([
      "mechanism-net-bind",
      "mechanism-net-bind",
      "mechanism-net-snap",
      "mechanism-net-snap"
    ]);
    expect(cast.scheduledEnemyHitEffects).toHaveLength(2);
    expect(cast.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
    expect(cast.enemies.every((enemy) => enemy.controlledUntilMs === undefined)).toBe(true);
    expect(beforeBindRun.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
    expect(beforeBindRun.enemies.every((enemy) => enemy.controlledUntilMs === undefined)).toBe(true);
    expect(bindRun.enemies.every((enemy) => (enemy.controlledUntilMs ?? 0) > bindRun.elapsedMs)).toBe(true);
    expect(bindRun.enemies.every((enemy) => enemy.nextAttackAtMs >= (enemy.controlledUntilMs ?? 0))).toBe(true);
    expect(bindRun.enemies.every((enemy) => enemy.hp < run.enemies.find((source) => source.id === enemy.id)!.hp)).toBe(true);
    expect(snapRun.enemies.every((enemy) => enemy.hp < bindRun.enemies.find((source) => source.id === enemy.id)!.hp)).toBe(true);
    expect(
      snapRun.enemies.every((enemy) => {
        const before = bindRun.enemies.find((source) => source.id === enemy.id)!;

        return Math.abs(enemy.position.x - netCenterX) < Math.abs(before.position.x - netCenterX);
      })
    ).toBe(true);
  });

  it("rechecks mechanism-shadow-net targets at the bind frame and snaps only bound enemies", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 100)),
      "mechanism-shadow-weaver"
    );
    const baseRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 332, y: 340, hp: 260, maxHp: 260, armor: 0 },
        { x: 418, y: 356, hp: 240, maxHp: 240, armor: 0 }
      ]
    );
    const lateTarget: CombatEnemy = {
      ...baseRun.enemies[0],
      id: "late-mechanism-target",
      hp: 260,
      maxHp: 260,
      armor: 0,
      position: { x: 820, y: 500 },
      nextAttackAtMs: 9999
    };
    const run = {
      ...baseRun,
      enemies: [...baseRun.enemies, lateTarget]
    };

    const cast = performAction(run, { type: "skill", skillId: "mechanism-shadow-net" });
    const [bindAtMs, snapAtMs] = scheduledSkillTimes(cast, "mechanism-shadow-net");
    const movedBeforeBind = {
      ...cast,
      enemies: cast.enemies.map((enemy) =>
        enemy.id === lateTarget.id
          ? {
              ...enemy,
              position: { x: 390, y: 340 }
            }
          : {
              ...enemy,
              position: { x: 820, y: 500 }
            }
      )
    };
    const bound = stepToElapsed(movedBeforeBind, bindAtMs);
    const movedBeforeSnap = {
      ...bound,
      enemies: bound.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              position: { x: 400, y: 340 }
            }
          : enemy
      )
    };
    const snapped = stepToElapsed(movedBeforeSnap, snapAtMs);
    const hits = skillHitEvents(snapped, "mechanism-shadow-net");

    expect(bindAtMs).toBe(290);
    expect(snapAtMs).toBe(470);
    expect(skillHitEvents(bound, "mechanism-shadow-net").map((event) => event.targetId)).toEqual([lateTarget.id]);
    expect(hits.map((event) => event.targetId)).toEqual([lateTarget.id, lateTarget.id]);
    expect(hits.map((event) => event.hitPhase)).toEqual(["trap-bind", "trap-snap"]);
    expect(snapped.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(snapped.enemies[1].hp).toBe(run.enemies[1].hp);
    expect(snapped.enemies.find((enemy) => enemy.id === lateTarget.id)?.hp).toBeLessThan(lateTarget.hp);
  });

  it("delays mechanism-shadow-net miss feedback until the bind frame", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 100)),
      "mechanism-shadow-weaver"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 820, y: 500, hp: 260, maxHp: 260 },
        { x: 860, y: 500, hp: 240, maxHp: 240 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "mechanism-shadow-net" });
    const [bindAtMs, snapAtMs] = scheduledSkillTimes(cast, "mechanism-shadow-net");
    const beforeBind = stepToElapsed(cast, bindAtMs - 1);
    const missedBind = stepToElapsed(cast, bindAtMs);
    const afterSnap = stepToElapsed(missedBind, snapAtMs);

    expect(skillMissEvents(cast, "mechanism-shadow-net")).toHaveLength(0);
    expect(skillMissEvents(beforeBind, "mechanism-shadow-net")).toHaveLength(0);
    expect(skillMissEvents(missedBind, "mechanism-shadow-net")).toHaveLength(1);
    expect(skillMissEvents(afterSnap, "mechanism-shadow-net")).toHaveLength(1);
    expect(skillHitEvents(afterSnap, "mechanism-shadow-net")).toHaveLength(0);
  });

  it("mountain-crack-hammer staggers first and then breaks armor on the impact frame", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100)),
      "mountain-cracking-smith"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 332, y: 340, hp: 280, maxHp: 280, armor: 34 },
        { x: 402, y: 356, hp: 260, maxHp: 260, armor: 28 }
      ]
    );
    const windingRun = {
      ...run,
      enemies: run.enemies.map((enemy) => ({
        ...enemy,
        attackStartedAtMs: 10,
        attackImpactAtMs: 420,
        attackRecoverUntilMs: 780,
        attackSkillId: "ash-ember-spit",
        attackHitResolved: false,
        nextAttackAtMs: 20
      }))
    };

    const cast = performAction(windingRun, { type: "skill", skillId: "mountain-crack-hammer" });
    const [staggerAtMs, impactAtMs] = scheduledSkillTimes(cast, "mountain-crack-hammer");
    const beforeStagger = stepToElapsed(cast, staggerAtMs - 1);
    const staggerRun = stepToElapsed(cast, staggerAtMs);
    const impactRun = stepToElapsed(staggerRun, impactAtMs);
    const hammerHits = skillHitEvents(impactRun, "mountain-crack-hammer");

    expect(cast.player.activeSkillMovement).toMatchObject({
      skillId: "mountain-crack-hammer",
      startX: 240,
      endX: 270,
      endAtMs: impactAtMs
    });
    expect(beforeStagger.player.x).toBeGreaterThan(run.player.x);
    expect(beforeStagger.player.x).toBeLessThan(270);
    expect(impactRun.player.x).toBe(270);
    expect(hammerHits).toHaveLength(4);
    expect(hammerHits.map((event) => event.hitPhase)).toEqual([
      "hammer-stagger",
      "hammer-stagger",
      "hammer-impact",
      "hammer-impact"
    ]);
    expect(hammerHits.map((event) => event.vfxCue)).toEqual([
      "mountain-hammer-stagger",
      "mountain-hammer-stagger",
      "mountain-crack-impact",
      "mountain-crack-impact"
    ]);
    expect(new Set(hammerHits.map((event) => event.occurredAtMs))).toEqual(new Set([290, 380]));
    expect(cast.scheduledEnemyHitEffects).toHaveLength(2);
    expect(cast.enemies.map((enemy) => enemy.hp)).toEqual(windingRun.enemies.map((enemy) => enemy.hp));
    expect(cast.enemies.every((enemy) => enemy.controlledUntilMs === undefined)).toBe(true);
    expect(cast.enemies.every((enemy) => enemy.armorBrokenUntilMs === undefined)).toBe(true);
    expect(cast.enemies.every((enemy) => !enemy.downed)).toBe(true);
    expect(beforeStagger.enemies.map((enemy) => enemy.hp)).toEqual(windingRun.enemies.map((enemy) => enemy.hp));
    expect(beforeStagger.enemies.every((enemy) => enemy.attackSkillId === "ash-ember-spit")).toBe(true);
    expect(staggerRun.enemies.every((enemy) => (enemy.controlledUntilMs ?? 0) > staggerRun.elapsedMs)).toBe(true);
    expect(staggerRun.enemies.every((enemy) => enemy.statusSourceSkillId === "mountain-crack-hammer")).toBe(true);
    expect(staggerRun.enemies.every((enemy) => enemy.attackSkillId === undefined)).toBe(true);
    expect(staggerRun.enemies.every((enemy) => enemy.nextAttackAtMs >= (enemy.controlledUntilMs ?? 0))).toBe(true);
    expect(impactRun.enemies.every((enemy) => enemy.hp < staggerRun.enemies.find((source) => source.id === enemy.id)!.hp)).toBe(true);
    expect(impactRun.enemies.every((enemy) => (enemy.armorBrokenUntilMs ?? 0) > impactRun.elapsedMs)).toBe(true);
    expect(impactRun.enemies.every((enemy) => enemy.downed && (enemy.downedUntilMs ?? 0) > impactRun.elapsedMs)).toBe(true);
  });

  it("mountain-crack-hammer does not cancel enemy hits that landed before the stagger frame", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100)),
      "mountain-cracking-smith"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 332, y: 340, hp: 280, maxHp: 280, armor: 34 },
        { x: 402, y: 356, hp: 260, maxHp: 260, armor: 28 }
      ]
    );
    const earlyEnemyHitRun: CombatRun = {
      ...run,
      enemies: run.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: 0,
              attackImpactAtMs: 200,
              attackRecoverUntilMs: 620,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };

    const cast = performAction(earlyEnemyHitRun, { type: "skill", skillId: "mountain-crack-hammer" });
    const jumped = stepCombat(cast, {}, 380);
    const playerHits = jumped.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.occurredAtMs === 200
    );
    const hammerHits = jumped.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "mountain-crack-hammer"
    );

    expect(playerHits).toHaveLength(1);
    expect(playerHits[0].skillId).toBe("ash-ember-spit");
    expect(jumped.player.hp).toBeLessThan(cast.player.hp);
    expect(hammerHits.map((event) => event.hitPhase)).toEqual([
      "hammer-stagger",
      "hammer-stagger",
      "hammer-impact",
      "hammer-impact"
    ]);
    expect(jumped.enemies[0].attackSkillId).toBeUndefined();
    expect(jumped.enemies[0].controlledUntilMs ?? 0).toBeGreaterThan(jumped.elapsedMs);
    expect(jumped.enemies[0].downed).toBe(true);
  });

  it("rechecks mountain-crack-hammer targets at stagger and impacts only staggered enemies", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100)),
      "mountain-cracking-smith"
    );
    const baseRun = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 332, y: 340, hp: 280, maxHp: 280, armor: 0 },
        { x: 402, y: 356, hp: 260, maxHp: 260, armor: 0 }
      ]
    );
    const lateTarget: CombatEnemy = {
      ...baseRun.enemies[0],
      id: "late-mountain-target",
      hp: 280,
      maxHp: 280,
      armor: 0,
      position: { x: 820, y: 500 },
      nextAttackAtMs: 9999
    };
    const run = {
      ...baseRun,
      enemies: [...baseRun.enemies, lateTarget]
    };

    const cast = performAction(run, { type: "skill", skillId: "mountain-crack-hammer" });
    const [staggerAtMs, impactAtMs] = scheduledSkillTimes(cast, "mountain-crack-hammer");
    const movedBeforeStagger = {
      ...cast,
      enemies: cast.enemies.map((enemy) =>
        enemy.id === lateTarget.id
          ? {
              ...enemy,
              position: { x: 392, y: 340 }
            }
          : {
              ...enemy,
              position: { x: 820, y: 500 }
            }
      )
    };
    const staggered = stepToElapsed(movedBeforeStagger, staggerAtMs);
    const movedBeforeImpact = {
      ...staggered,
      enemies: staggered.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              position: { x: 390, y: 340 }
            }
          : enemy
      )
    };
    const impacted = stepToElapsed(movedBeforeImpact, impactAtMs);
    const hits = skillHitEvents(impacted, "mountain-crack-hammer");

    expect(staggerAtMs).toBe(290);
    expect(impactAtMs).toBe(380);
    expect(skillHitEvents(staggered, "mountain-crack-hammer").map((event) => event.targetId)).toEqual([lateTarget.id]);
    expect(hits.map((event) => event.targetId)).toEqual([lateTarget.id, lateTarget.id]);
    expect(hits.map((event) => event.hitPhase)).toEqual(["hammer-stagger", "hammer-impact"]);
    expect(impacted.enemies[0].hp).toBe(run.enemies[0].hp);
    expect(impacted.enemies[1].hp).toBe(run.enemies[1].hp);
    expect(impacted.enemies.find((enemy) => enemy.id === lateTarget.id)?.hp).toBeLessThan(lateTarget.hp);
    expect(impacted.enemies.find((enemy) => enemy.id === lateTarget.id)?.downed).toBe(true);
  });

  it("delays mountain-crack-hammer miss feedback until the stagger frame", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100)),
      "mountain-cracking-smith"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 820, y: 500, hp: 280, maxHp: 280 },
        { x: 860, y: 500, hp: 260, maxHp: 260 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "mountain-crack-hammer" });
    const [staggerAtMs, impactAtMs] = scheduledSkillTimes(cast, "mountain-crack-hammer");
    const beforeStagger = stepToElapsed(cast, staggerAtMs - 1);
    const missedStagger = stepToElapsed(cast, staggerAtMs);
    const afterImpact = stepToElapsed(missedStagger, impactAtMs);

    expect(skillMissEvents(cast, "mountain-crack-hammer")).toHaveLength(0);
    expect(skillMissEvents(beforeStagger, "mountain-crack-hammer")).toHaveLength(0);
    expect(skillMissEvents(missedStagger, "mountain-crack-hammer")).toHaveLength(1);
    expect(skillMissEvents(afterImpact, "mountain-crack-hammer")).toHaveLength(1);
    expect(skillHitEvents(afterImpact, "mountain-crack-hammer")).toHaveLength(0);
  });

  it("mountain-guard-break lunges before the delayed guard-break frame", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "ember-warden"), 100)),
      "mountain-breaker"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 334, y: 340, hp: 260, maxHp: 260, armor: 40 },
        { x: 396, y: 354, hp: 240, maxHp: 240, armor: 32 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "mountain-guard-break" });
    const [breakAtMs] = scheduledSkillTimes(cast, "mountain-guard-break");
    const beforeBreak = stepToElapsed(cast, breakAtMs - 1);
    const broken = stepToElapsed(cast, breakAtMs);
    const hits = skillHitEvents(broken, "mountain-guard-break");

    expect(breakAtMs).toBe(330);
    expect(cast.player.activeSkillMovement?.skillId).toBe("mountain-guard-break");
    expect(cast.player.activeSkillMovement?.endX).toBe(run.player.x + 32);
    expect(cast.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
    expect(cast.enemies.every((enemy) => enemy.armorBrokenUntilMs === undefined)).toBe(true);
    expect(skillHitEvents(cast, "mountain-guard-break")).toHaveLength(0);
    expect(skillHitEvents(beforeBreak, "mountain-guard-break")).toHaveLength(0);
    expect(beforeBreak.player.x).toBeGreaterThan(run.player.x);
    expect(beforeBreak.player.x).toBeLessThan(run.player.x + 32);
    expect(hits).toHaveLength(2);
    expect(hits.map((event) => event.hitPhase)).toEqual(["mountain-guard-break", "mountain-guard-break"]);
    expect(hits.map((event) => event.vfxCue)).toEqual(["mountain-guard-break-impact", "mountain-guard-break-impact"]);
    expect(hits.every((event) => event.statusTags?.includes("guard-break"))).toBe(true);
    expect(broken.enemies.every((enemy) => (enemy.armorBrokenUntilMs ?? 0) > broken.elapsedMs)).toBe(true);
    expect(broken.enemies.every((enemy) => enemy.nextAttackAtMs > broken.elapsedMs)).toBe(true);
  });

  it("mountain-guard-break rechecks targets at impact and cancels when interrupted", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "ember-warden"), 100)),
      "mountain-breaker"
    );
    const castWithTarget = performAction(
      withPlayerAndEnemies(
        createCombatRun(state, "cinder-kiln-alley"),
        { x: 240, y: 340, facing: 1 },
        [{ x: 334, y: 340, hp: 260, maxHp: 260, armor: 40 }]
      ),
      { type: "skill", skillId: "mountain-guard-break" }
    );
    const [breakAtMs] = scheduledSkillTimes(castWithTarget, "mountain-guard-break");
    const movedOutBeforeBreak = stepToElapsed(
      {
        ...castWithTarget,
        enemies: castWithTarget.enemies.map((enemy) => ({
          ...enemy,
          position: { x: 720, y: enemy.position.y }
        }))
      },
      breakAtMs
    );

    expect(skillHitEvents(movedOutBeforeBreak, "mountain-guard-break")).toHaveLength(0);
    expect(skillMissEvents(movedOutBeforeBreak, "mountain-guard-break")).toHaveLength(1);

    const castWithoutTarget = performAction(
      withPlayerAndEnemies(
        createCombatRun(state, "cinder-kiln-alley"),
        { x: 240, y: 340, facing: 1 },
        [{ x: 720, y: 340, hp: 260, maxHp: 260, armor: 40 }]
      ),
      { type: "skill", skillId: "mountain-guard-break" }
    );
    const [lateBreakAtMs] = scheduledSkillTimes(castWithoutTarget, "mountain-guard-break");
    const movedInBeforeBreak = stepToElapsed(
      {
        ...castWithoutTarget,
        enemies: castWithoutTarget.enemies.map((enemy) => ({
          ...enemy,
          position: { x: 336, y: enemy.position.y }
        }))
      },
      lateBreakAtMs
    );
    const [lateHit] = skillHitEvents(movedInBeforeBreak, "mountain-guard-break");

    expect(lateHit).toMatchObject({
      hitPhase: "mountain-guard-break",
      vfxCue: "mountain-guard-break-impact"
    });
    expect(skillMissEvents(movedInBeforeBreak, "mountain-guard-break")).toHaveLength(0);

    const interruptBase = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 334, y: 340, hp: 260, maxHp: 260, armor: 40 }]
    );
    const interruptingRun: CombatRun = {
      ...interruptBase,
      enemies: interruptBase.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: 0,
              attackImpactAtMs: 160,
              attackRecoverUntilMs: 520,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };
    const interruptedCast = performAction(interruptingRun, { type: "skill", skillId: "mountain-guard-break" });
    const [interruptedBreakAtMs] = scheduledSkillTimes(interruptedCast, "mountain-guard-break");
    const interrupted = stepToElapsed(interruptedCast, interruptedBreakAtMs);
    const playerHits = interrupted.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(playerHits).toHaveLength(1);
    expect(skillHitEvents(interrupted, "mountain-guard-break")).toHaveLength(0);
    expect(skillMissEvents(interrupted, "mountain-guard-break")).toHaveLength(0);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "mountain-guard-break")).toHaveLength(0);
    expect(interrupted.player.activeSkillMovement).toBeUndefined();
  });

  it("earth-furnace-breaker charges before cracking the floor and erupting", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 336, y: 340, hp: 320, maxHp: 320, armor: 42 },
        { x: 408, y: 354, hp: 300, maxHp: 300, armor: 36 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "earth-furnace-breaker" });
    const [crackAtMs, eruptionAtMs] = scheduledSkillTimes(cast, "earth-furnace-breaker");
    const beforeCrack = stepToElapsed(cast, crackAtMs - 1);
    const cracked = stepToElapsed(cast, crackAtMs);
    const erupted = stepToElapsed(cracked, eruptionAtMs);
    const hits = skillHitEvents(erupted, "earth-furnace-breaker");

    expect([crackAtMs, eruptionAtMs]).toEqual([260, 410]);
    expect(cast.player.activeSkillMovement?.skillId).toBe("earth-furnace-breaker");
    expect(cast.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
    expect(skillHitEvents(cast, "earth-furnace-breaker")).toHaveLength(0);
    expect(skillHitEvents(beforeCrack, "earth-furnace-breaker")).toHaveLength(0);
    expect(skillHitEvents(cracked, "earth-furnace-breaker").map((event) => event.hitPhase)).toEqual([
      "earth-crack",
      "earth-crack"
    ]);
    expect(hits).toHaveLength(4);
    expect(hits.map((event) => event.hitPhase)).toEqual([
      "earth-crack",
      "earth-crack",
      "furnace-eruption",
      "furnace-eruption"
    ]);
    expect(hits.map((event) => event.vfxCue)).toEqual([
      "earth-furnace-crack",
      "earth-furnace-crack",
      "earth-furnace-eruption",
      "earth-furnace-eruption"
    ]);
    expect(erupted.enemies.every((enemy) => (enemy.armorBrokenUntilMs ?? 0) > erupted.elapsedMs)).toBe(true);
    expect(erupted.enemies.every((enemy) => enemy.downed && (enemy.downedUntilMs ?? 0) > erupted.elapsedMs)).toBe(true);
  });

  it("rechecks earth-furnace-breaker targets at the delayed quake frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100);
    const castWithTarget = performAction(
      withPlayerAndEnemies(
        createCombatRun(state, "cinder-kiln-alley"),
        { x: 240, y: 340, facing: 1 },
        [{ x: 336, y: 340, hp: 260, maxHp: 260, armor: 30 }]
      ),
      { type: "skill", skillId: "earth-furnace-breaker" }
    );
    const [crackAtMs] = scheduledSkillTimes(castWithTarget, "earth-furnace-breaker");
    const movedOutBeforeCrack = stepToElapsed(
      {
        ...castWithTarget,
        enemies: castWithTarget.enemies.map((enemy) => ({
          ...enemy,
          position: { x: 720, y: enemy.position.y }
        }))
      },
      crackAtMs
    );

    expect(skillHitEvents(movedOutBeforeCrack, "earth-furnace-breaker")).toHaveLength(0);
    expect(skillMissEvents(movedOutBeforeCrack, "earth-furnace-breaker")).toHaveLength(1);

    const castWithoutTarget = performAction(
      withPlayerAndEnemies(
        createCombatRun(state, "cinder-kiln-alley"),
        { x: 240, y: 340, facing: 1 },
        [{ x: 720, y: 340, hp: 260, maxHp: 260, armor: 30 }]
      ),
      { type: "skill", skillId: "earth-furnace-breaker" }
    );
    const [lateCrackAtMs] = scheduledSkillTimes(castWithoutTarget, "earth-furnace-breaker");
    const movedInBeforeCrack = stepToElapsed(
      {
        ...castWithoutTarget,
        enemies: castWithoutTarget.enemies.map((enemy) => ({
          ...enemy,
          position: { x: 338, y: enemy.position.y }
        }))
      },
      lateCrackAtMs
    );
    const [lateHit] = skillHitEvents(movedInBeforeCrack, "earth-furnace-breaker");

    expect(lateHit).toMatchObject({
      hitPhase: "earth-crack",
      vfxCue: "earth-furnace-crack"
    });
    expect(skillMissEvents(movedInBeforeCrack, "earth-furnace-breaker")).toHaveLength(0);
  });

  it("emits an earth-furnace-breaker miss if the target leaves before the eruption frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100);
    const cast = performAction(
      withPlayerAndEnemies(
        createCombatRun(state, "cinder-kiln-alley"),
        { x: 240, y: 340, facing: 1 },
        [{ x: 336, y: 340, hp: 320, maxHp: 320, armor: 42 }]
      ),
      { type: "skill", skillId: "earth-furnace-breaker" }
    );
    const [crackAtMs, eruptionAtMs] = scheduledSkillTimes(cast, "earth-furnace-breaker");
    const cracked = stepToElapsed(cast, crackAtMs);
    const movedOutBeforeEruption = stepToElapsed(
      {
        ...cracked,
        enemies: cracked.enemies.map((enemy) => ({
          ...enemy,
          position: { x: 720, y: enemy.position.y }
        }))
      },
      eruptionAtMs
    );
    const hits = skillHitEvents(movedOutBeforeEruption, "earth-furnace-breaker");
    const misses = skillMissEvents(movedOutBeforeEruption, "earth-furnace-breaker");

    expect(hits.map((event) => event.hitPhase)).toEqual(["earth-crack"]);
    expect(misses).toHaveLength(1);
    expect(misses[0]).toMatchObject({
      skillId: "earth-furnace-breaker",
      occurredAtMs: eruptionAtMs
    });
  });

  it("does not emit a duplicate earth-furnace-breaker miss on the eruption frame after an empty crack", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100);
    const cast = performAction(
      withPlayerAndEnemies(
        createCombatRun(state, "cinder-kiln-alley"),
        { x: 240, y: 340, facing: 1 },
        [{ x: 720, y: 430, hp: 320, maxHp: 320, armor: 42 }]
      ),
      { type: "skill", skillId: "earth-furnace-breaker" }
    );
    const [crackAtMs, eruptionAtMs] = scheduledSkillTimes(cast, "earth-furnace-breaker");
    const afterEruption = stepToElapsed(cast, eruptionAtMs);
    const misses = skillMissEvents(afterEruption, "earth-furnace-breaker");

    expect([crackAtMs, eruptionAtMs]).toEqual([260, 410]);
    expect(skillHitEvents(afterEruption, "earth-furnace-breaker")).toHaveLength(0);
    expect(misses).toHaveLength(1);
    expect(misses[0]).toMatchObject({
      hitPhase: "earth-crack",
      vfxCue: "earth-furnace-crack",
      occurredAtMs: crackAtMs
    });
    expect(afterEruption.enemies[0].hp).toBe(cast.enemies[0].hp);
  });

  it("does not erupt earth-furnace-breaker on targets that enter after the crack frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 336, y: 340, hp: 320, maxHp: 320, armor: 42 },
        { x: 720, y: 500, hp: 320, maxHp: 320, armor: 42 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "earth-furnace-breaker" });
    const [crackAtMs, eruptionAtMs] = scheduledSkillTimes(cast, "earth-furnace-breaker");
    const cracked = stepToElapsed(cast, crackAtMs);
    const lateHpBeforeEruption = cracked.enemies[1].hp;
    const lateEntrantBeforeEruption: CombatRun = {
      ...cracked,
      enemies: cracked.enemies.map((enemy, index) =>
        index === 1
          ? {
              ...enemy,
              position: { x: 390, y: 344 }
            }
          : enemy
      )
    };
    const erupted = stepToElapsed(lateEntrantBeforeEruption, eruptionAtMs);
    const crackHits = skillHitEvents(cracked, "earth-furnace-breaker").filter((event) => event.hitPhase === "earth-crack");
    const eruptionHits = skillHitEvents(erupted, "earth-furnace-breaker").filter((event) => event.hitPhase === "furnace-eruption");

    expect([crackAtMs, eruptionAtMs]).toEqual([260, 410]);
    expect(crackHits.map((event) => event.targetId)).toEqual([run.enemies[0].id]);
    expect(cracked.enemies[0].statusSourceSkillId).toBe("earth-furnace-breaker");
    expect(cracked.enemies[1].statusSourceSkillId).toBeUndefined();
    expect(eruptionHits.map((event) => event.targetId)).toEqual([run.enemies[0].id]);
    expect(erupted.enemies[0].hp).toBeLessThan(cracked.enemies[0].hp);
    expect(erupted.enemies[1].hp).toBe(lateHpBeforeEruption);
    expect(erupted.enemies[1].armorBrokenUntilMs).toBeUndefined();
    expect(erupted.enemies[1].downed).toBe(false);
    expect(skillMissEvents(erupted, "earth-furnace-breaker")).toHaveLength(0);
  });

  it("cancels earth-furnace-breaker pending quake when monster damage interrupts the cast", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 336, y: 340, hp: 320, maxHp: 320, armor: 42 }]
    );
    const interruptingRun: CombatRun = {
      ...run,
      enemies: run.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: 0,
              attackImpactAtMs: 180,
              attackRecoverUntilMs: 620,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };

    const cast = performAction(interruptingRun, { type: "skill", skillId: "earth-furnace-breaker" });
    const [, eruptionAtMs] = scheduledSkillTimes(cast, "earth-furnace-breaker");
    const interrupted = stepToElapsed(cast, eruptionAtMs);
    const playerHits = interrupted.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(playerHits).toHaveLength(1);
    expect(skillHitEvents(interrupted, "earth-furnace-breaker")).toHaveLength(0);
    expect(skillMissEvents(interrupted, "earth-furnace-breaker")).toHaveLength(0);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "earth-furnace-breaker")).toHaveLength(0);
  });

  it("meteor-knuckle schedules staged fall and impact frames instead of cast-frame damage", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 100), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 330, y: 340, hp: 260, maxHp: 260, armor: 40 },
        { x: 390, y: 356, hp: 220, maxHp: 220, armor: 30 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "meteor-knuckle" });
    const [fallAtMs, impactAtMs] = scheduledSkillTimes(cast, "meteor-knuckle");
    const beforeFall = stepToElapsed(cast, fallAtMs - 1);
    const fall = stepToElapsed(cast, fallAtMs);
    const impact = stepToElapsed(fall, impactAtMs);
    const meteorHits = skillHitEvents(impact, "meteor-knuckle");
    const hitTimes = [...new Set(meteorHits.map((event) => event.occurredAtMs))];
    const meteorPhases = meteorHits.map((event) => event.hitPhase);
    const fallHits = meteorHits.filter((event) => event.hitPhase === "fall");
    const impactHits = meteorHits.filter((event) => event.hitPhase === "impact");

    expect(skillHitEvents(cast, "meteor-knuckle")).toHaveLength(0);
    expect(cast.enemies.map((enemy) => enemy.hp)).toEqual([260, 220]);
    expect(cast.enemies.some((enemy) => enemy.downed || (enemy.armorBrokenUntilMs ?? 0) > cast.elapsedMs)).toBe(false);
    expect(cast.player.x).toBe(240);
    expect(cast.player.activeSkillMovement).toMatchObject({
      skillId: "meteor-knuckle",
      startX: 240,
      endX: 278
    });
    expect(skillHitEvents(beforeFall, "meteor-knuckle")).toHaveLength(0);
    expect(skillHitEvents(fall, "meteor-knuckle")).toHaveLength(2);
    expect(meteorHits).toHaveLength(4);
    expect(hitTimes).toHaveLength(2);
    expect(impactAtMs - fallAtMs).toBeGreaterThanOrEqual(180);
    expect(meteorPhases).toEqual(["fall", "fall", "impact", "impact"]);
    expect(fallHits.every((event) => event.hitstopMs < impactHits[0].hitstopMs)).toBe(true);
    expect(impactHits.every((event) => event.hitstopMs > 100)).toBe(true);
    expect(impactHits.every((event) => event.statusTags?.includes("guard-break"))).toBe(true);
    expect(impactHits.every((event) => event.actionTags?.includes("knockdown"))).toBe(true);
    expect(impact.enemies.every((enemy) => enemy.downed && (enemy.downedUntilMs ?? 0) > impact.elapsedMs)).toBe(true);
    expect(impact.enemies.every((enemy) => (enemy.armorBrokenUntilMs ?? 0) > impact.elapsedMs)).toBe(true);
  });

  it("rechecks meteor-knuckle targets at the falling impact frame", () => {
    const castWithTarget = performAction(
      withPlayerAndEnemies(
        createCombatRun(withHeat(createInitialState(), 100), "cinder-kiln-alley"),
        { x: 240, y: 340, facing: 1 },
        [{ x: 330, y: 340, hp: 260, maxHp: 260, armor: 30 }]
      ),
      { type: "skill", skillId: "meteor-knuckle" }
    );
    const [fallAtMs] = scheduledSkillTimes(castWithTarget, "meteor-knuckle");
    const movedOutBeforeFall = stepToElapsed(
      {
        ...castWithTarget,
        enemies: castWithTarget.enemies.map((enemy) => ({
          ...enemy,
          position: { x: 720, y: enemy.position.y }
        }))
      },
      fallAtMs
    );

    expect(skillHitEvents(movedOutBeforeFall, "meteor-knuckle")).toHaveLength(0);
    expect(skillMissEvents(movedOutBeforeFall, "meteor-knuckle")).toHaveLength(1);

    const castWithoutTarget = performAction(
      withPlayerAndEnemies(
        createCombatRun(withHeat(createInitialState(), 100), "cinder-kiln-alley"),
        { x: 240, y: 340, facing: 1 },
        [{ x: 720, y: 340, hp: 260, maxHp: 260, armor: 30 }]
      ),
      { type: "skill", skillId: "meteor-knuckle" }
    );
    const [lateFallAtMs] = scheduledSkillTimes(castWithoutTarget, "meteor-knuckle");
    const movedInBeforeFall = stepToElapsed(
      {
        ...castWithoutTarget,
        enemies: castWithoutTarget.enemies.map((enemy) => ({
          ...enemy,
          position: { x: 336, y: enemy.position.y }
        }))
      },
      lateFallAtMs
    );
    const [lateHit] = skillHitEvents(movedInBeforeFall, "meteor-knuckle");

    expect(lateHit).toMatchObject({
      hitPhase: "fall",
      vfxCue: "meteor-fall"
    });
    expect(skillMissEvents(movedInBeforeFall, "meteor-knuckle")).toHaveLength(0);
  });

  it("does not impact meteor-knuckle targets that enter after the fall frame", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 100), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 330, y: 340, hp: 260, maxHp: 260, armor: 40 },
        { x: 720, y: 430, hp: 260, maxHp: 260, armor: 40 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "meteor-knuckle" });
    const [fallAtMs, impactAtMs] = scheduledSkillTimes(cast, "meteor-knuckle");
    const fall = stepToElapsed(cast, fallAtMs);
    const lateHpBeforeImpact = fall.enemies[1].hp;
    const lateEntrantBeforeImpact: CombatRun = {
      ...fall,
      enemies: fall.enemies.map((enemy, index) =>
        index === 1
          ? {
              ...enemy,
              position: { x: 360, y: 348 }
            }
          : enemy
      )
    };
    const impact = stepToElapsed(lateEntrantBeforeImpact, impactAtMs);
    const fallHits = skillHitEvents(fall, "meteor-knuckle").filter((event) => event.hitPhase === "fall");
    const impactHits = skillHitEvents(impact, "meteor-knuckle").filter((event) => event.hitPhase === "impact");

    expect([fallAtMs, impactAtMs]).toEqual([420, 640]);
    expect(fallHits.map((event) => event.targetId)).toEqual([run.enemies[0].id]);
    expect(fall.enemies[0].statusSourceSkillId).toBe("meteor-knuckle");
    expect(fall.enemies[1].statusSourceSkillId).toBeUndefined();
    expect(impactHits.map((event) => event.targetId)).toEqual([run.enemies[0].id]);
    expect(impact.enemies[0].hp).toBeLessThan(fall.enemies[0].hp);
    expect(impact.enemies[1].hp).toBe(lateHpBeforeImpact);
    expect(impact.enemies[1].armorBrokenUntilMs).toBeUndefined();
    expect(impact.enemies[1].downed).toBe(false);
    expect(skillMissEvents(impact, "meteor-knuckle")).toHaveLength(0);
  });

  it("cancels meteor-knuckle staged impacts when monster damage interrupts before the fall", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 100), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1, hp: 500, maxHp: 500 },
      [{ x: 330, y: 340, hp: 260, maxHp: 260, armor: 30 }]
    );
    const interruptingRun: CombatRun = {
      ...run,
      enemies: run.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: 0,
              attackImpactAtMs: 180,
              attackRecoverUntilMs: 620,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };

    const cast = performAction(interruptingRun, { type: "skill", skillId: "meteor-knuckle" });
    const [, impactAtMs] = scheduledSkillTimes(cast, "meteor-knuckle");
    const interrupted = stepToElapsed(cast, impactAtMs);
    const playerHits = interrupted.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(playerHits).toHaveLength(1);
    expect(skillHitEvents(interrupted, "meteor-knuckle")).toHaveLength(0);
    expect(skillMissEvents(interrupted, "meteor-knuckle")).toHaveLength(0);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "meteor-knuckle")).toHaveLength(0);
  });

  it("makes shield-quake resolve as a delayed area slam with target knockdown", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 320, y: 340, hp: 220, maxHp: 220, armor: 0 },
        { x: 390, y: 352, hp: 220, maxHp: 220, armor: 0 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "shield-quake" });
    const [quakeAtMs] = scheduledSkillTimes(cast, "shield-quake");
    const beforeImpact = stepToElapsed(cast, quakeAtMs - 1);
    const impact = stepToElapsed(cast, quakeAtMs);
    const hits = skillHitEvents(impact, "shield-quake");

    expect(quakeAtMs).toBe(280);
    expect(skillHitEvents(cast, "shield-quake")).toHaveLength(0);
    expect(cast.enemies.map((enemy) => enemy.hp)).toEqual([220, 220]);
    expect(beforeImpact.enemies.map((enemy) => enemy.hp)).toEqual([220, 220]);
    expect(skillHitEvents(beforeImpact, "shield-quake")).toHaveLength(0);
    expect(hits).toHaveLength(2);
    expect(hits.map((event) => event.hitPhase)).toEqual(["shield-quake", "shield-quake"]);
    expect(hits.every((event) => event.vfxCue === "shield-quake-impact")).toBe(true);
    expect(hits.every((event) => event.actionTags?.includes("knockdown"))).toBe(true);
    expect(impact.enemies.every((enemy) => enemy.downed && (enemy.downedUntilMs ?? 0) > impact.elapsedMs)).toBe(true);
  });

  it("rechecks shield-quake targets on the quake frame instead of locking cast-time targets", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 90);
    const run = withPlayerAndEnemies(createCombatRun(state, "cinder-kiln-alley"), { x: 240, y: 340, facing: 1 }, [
      { x: 320, y: 340, hp: 220, maxHp: 220, armor: 0 }
    ]);

    const cast = performAction(run, { type: "skill", skillId: "shield-quake" });
    const [quakeAtMs] = scheduledSkillTimes(cast, "shield-quake");
    const escaped = {
      ...cast,
      enemies: cast.enemies.map((enemy) => ({
        ...enemy,
        position: { x: 620, y: enemy.position.y }
      }))
    };
    const avoided = stepToElapsed(escaped, quakeAtMs);

    expect(skillHitEvents(avoided, "shield-quake")).toHaveLength(0);
    expect(skillMissEvents(avoided, "shield-quake")).toHaveLength(1);
    expect(avoided.enemies[0].hp).toBe(220);
  });

  it("delays furnace-taunt control until the roar frame and pulls enemies inward", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 330, y: 340, hp: 210, maxHp: 210, armor: 0 },
        { x: 390, y: 352, hp: 210, maxHp: 210, armor: 0 }
      ]
    );

    const cast = performAction(run, { type: "skill", skillId: "furnace-taunt" });
    const [roarAtMs] = scheduledSkillTimes(cast, "furnace-taunt");
    const beforeRoar = stepToElapsed(cast, roarAtMs - 1);
    const roar = stepToElapsed(cast, roarAtMs);
    const hits = skillHitEvents(roar, "furnace-taunt");

    expect(roarAtMs).toBe(230);
    expect(skillHitEvents(cast, "furnace-taunt")).toHaveLength(0);
    expect(cast.enemies.map((enemy) => enemy.hp)).toEqual([210, 210]);
    expect(cast.enemies.every((enemy) => (enemy.controlledUntilMs ?? 0) === 0)).toBe(true);
    expect(beforeRoar.enemies.map((enemy) => enemy.hp)).toEqual([210, 210]);
    expect(skillHitEvents(beforeRoar, "furnace-taunt")).toHaveLength(0);
    expect(hits).toHaveLength(2);
    expect(hits.map((event) => event.hitPhase)).toEqual(["furnace-roar", "furnace-roar"]);
    expect(hits.every((event) => event.vfxCue === "furnace-roar-impact")).toBe(true);
    expect(hits.every((event) => event.statusTags?.includes("control"))).toBe(true);
    expect(roar.enemies.every((enemy) => (enemy.controlledUntilMs ?? 0) > roar.elapsedMs)).toBe(true);
    expect(Math.abs(roar.enemies[0].position.x - 352)).toBeLessThan(Math.abs(330 - 352));
    expect(Math.abs(roar.enemies[1].position.x - 352)).toBeLessThan(Math.abs(390 - 352));
  });

  it("rechecks furnace-taunt targets on the roar frame instead of locking cast-time targets", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 90);
    const run = withPlayerAndEnemies(createCombatRun(state, "cinder-kiln-alley"), { x: 240, y: 340, facing: 1 }, [
      { x: 330, y: 340, hp: 210, maxHp: 210, armor: 0 }
    ]);

    const cast = performAction(run, { type: "skill", skillId: "furnace-taunt" });
    const [roarAtMs] = scheduledSkillTimes(cast, "furnace-taunt");
    const escaped = {
      ...cast,
      enemies: cast.enemies.map((enemy) => ({
        ...enemy,
        position: { x: 650, y: enemy.position.y }
      }))
    };
    const avoided = stepToElapsed(escaped, roarAtMs);

    expect(skillHitEvents(avoided, "furnace-taunt")).toHaveLength(0);
    expect(skillMissEvents(avoided, "furnace-taunt")).toHaveLength(1);
    expect(avoided.enemies[0].hp).toBe(210);
    expect(avoided.enemies[0].controlledUntilMs ?? 0).toBe(0);
  });

  it("cancels furnace-taunt roar when monster damage interrupts before the roar frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 330, y: 340, hp: 210, maxHp: 210, armor: 0 }]
    );
    const interruptingRun: CombatRun = {
      ...run,
      enemies: run.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: 0,
              attackImpactAtMs: 180,
              attackRecoverUntilMs: 620,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };

    const cast = performAction(interruptingRun, { type: "skill", skillId: "furnace-taunt" });
    const [roarAtMs] = scheduledSkillTimes(cast, "furnace-taunt");
    const interrupted = stepToElapsed(cast, roarAtMs);
    const playerHits = interrupted.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(playerHits).toHaveLength(1);
    expect(skillHitEvents(interrupted, "furnace-taunt")).toHaveLength(0);
    expect(skillMissEvents(interrupted, "furnace-taunt")).toHaveLength(0);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "furnace-taunt")).toHaveLength(0);
    expect(interrupted.enemies[0].hp).toBe(210);
    expect(interrupted.enemies[0].controlledUntilMs ?? 0).toBe(0);
  });

  it("delays anvil-guard mitigation until the guard frame", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 40);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340, hp: 180, maxHp: 180, armor: 0 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "anvil-guard" });
    const [guardAtMs] = scheduledSkillTimes(cast, "anvil-guard");
    const beforeGuard = stepToElapsed(cast, guardAtMs - 1);
    const guarded = stepToElapsed(cast, guardAtMs);
    const armedEnemyRun: CombatRun = {
      ...cast,
      enemies: cast.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: 0,
              attackImpactAtMs: guardAtMs + 20,
              attackRecoverUntilMs: guardAtMs + 520,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };
    const afterGuardHit = stepToElapsed(armedEnemyRun, guardAtMs + 20);
    const playerHits = afterGuardHit.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(guardAtMs).toBe(180);
    expect(cast.player.activeSkillMovement?.skillId).toBe("anvil-guard");
    expect(cast.player.activeSkillMovement?.endX).toBe(250);
    expect(cast.player.shieldUntilMs).toBeLessThanOrEqual(cast.elapsedMs);
    expect(cast.enemies[0].hp).toBe(180);
    expect(skillHitEvents(cast, "anvil-guard")).toHaveLength(0);
    expect(beforeGuard.player.shieldUntilMs).toBeLessThanOrEqual(beforeGuard.elapsedMs);
    expect(guarded.player.shieldUntilMs).toBeGreaterThan(guarded.elapsedMs);
    expect(guarded.player.shieldReduction).toBeGreaterThanOrEqual(0.45);
    expect(playerHits).toHaveLength(1);
    expect(playerHits[0].damage).toBeLessThan(20);
    expect(afterGuardHit.player.shieldUntilMs).toBeLessThanOrEqual(afterGuardHit.elapsedMs);
  });

  it("emits non-damage shield-open VFX events on real guard frames", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100)),
      "black-furnace-vanguard"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340, hp: 180, maxHp: 180, armor: 0 }]
    );

    const guardCast = performAction(run, { type: "skill", skillId: "anvil-guard" });
    const [guardAtMs] = scheduledSkillTimes(guardCast, "anvil-guard");
    const beforeGuard = stepToElapsed(guardCast, guardAtMs - 1);
    const guardOpen = stepToElapsed(guardCast, guardAtMs);

    const wallCast = performAction(run, { type: "skill", skillId: "molten-wall" });
    const [wallAtMs] = scheduledSkillTimes(wallCast, "molten-wall");
    const wallOpen = stepToElapsed(wallCast, wallAtMs);

    const aegisCast = performAction(run, { type: "skill", skillId: "black-furnace-aegis" });
    const [aegisAtMs] = scheduledSkillTimes(aegisCast, "black-furnace-aegis");
    const aegisOpen = stepToElapsed(aegisCast, aegisAtMs);

    expect(playerStatusEvents(beforeGuard, "anvil-guard")).toHaveLength(0);
    expect(playerStatusEvents(guardOpen, "anvil-guard")).toMatchObject([
      { kind: "player-status", occurredAtMs: guardAtMs, vfxCue: "anvil-guard-open" }
    ]);
    expect(playerStatusEvents(wallOpen, "molten-wall")).toMatchObject([
      { kind: "player-status", occurredAtMs: wallAtMs, vfxCue: "molten-wall-open" }
    ]);
    expect(playerStatusEvents(aegisOpen, "black-furnace-aegis")).toMatchObject([
      { kind: "player-status", occurredAtMs: aegisAtMs, vfxCue: "black-aegis-open" }
    ]);
    expect(skillHitEvents(guardOpen, "anvil-guard")).toHaveLength(0);
    expect(skillHitEvents(wallOpen, "molten-wall")).toHaveLength(0);
    expect(skillHitEvents(aegisOpen, "black-furnace-aegis")).toHaveLength(0);
  });

  it("cancels anvil-guard opening when monster damage interrupts startup", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 40);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340, hp: 180, maxHp: 180, armor: 0 }]
    );
    const interruptingRun: CombatRun = {
      ...run,
      enemies: run.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: 0,
              attackImpactAtMs: 120,
              attackRecoverUntilMs: 620,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };

    const cast = performAction(interruptingRun, { type: "skill", skillId: "anvil-guard" });
    const [guardAtMs] = scheduledSkillTimes(cast, "anvil-guard");
    const interrupted = stepToElapsed(cast, guardAtMs);
    const playerHits = interrupted.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(playerHits).toHaveLength(1);
    expect(interrupted.player.shieldUntilMs).toBeLessThanOrEqual(interrupted.elapsedMs);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "anvil-guard")).toHaveLength(0);
  });

  it("delays black-furnace-aegis mitigation until the aegis frame", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100)),
      "black-furnace-vanguard"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340, hp: 180, maxHp: 180, armor: 0 }]
    );

    const cast = performAction(run, { type: "skill", skillId: "black-furnace-aegis" });
    const [aegisAtMs] = scheduledSkillTimes(cast, "black-furnace-aegis");
    const beforeAegis = stepToElapsed(cast, aegisAtMs - 1);
    const aegisOpen = stepToElapsed(cast, aegisAtMs);
    const armedEnemyRun: CombatRun = {
      ...cast,
      enemies: cast.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: 0,
              attackImpactAtMs: aegisAtMs + 20,
              attackRecoverUntilMs: aegisAtMs + 520,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };
    const afterAegisHit = stepToElapsed(armedEnemyRun, aegisAtMs + 20);
    const playerHits = afterAegisHit.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(aegisAtMs).toBe(280);
    expect(cast.player.activeSkillMovement?.skillId).toBe("black-furnace-aegis");
    expect(cast.player.activeSkillMovement?.endX).toBe(248);
    expect(cast.player.shieldUntilMs).toBeLessThanOrEqual(cast.elapsedMs);
    expect(cast.enemies[0].hp).toBe(180);
    expect(skillHitEvents(cast, "black-furnace-aegis")).toHaveLength(0);
    expect(beforeAegis.player.shieldUntilMs).toBeLessThanOrEqual(beforeAegis.elapsedMs);
    expect(aegisOpen.player.shieldUntilMs).toBeGreaterThan(aegisOpen.elapsedMs);
    expect(aegisOpen.player.shieldReduction).toBeGreaterThanOrEqual(0.55);
    expect(playerHits).toHaveLength(1);
    expect(playerHits[0].damage).toBeGreaterThan(0);
    expect(playerHits[0].damage).toBeLessThanOrEqual(12);
    expect(afterAegisHit.player.shieldUntilMs).toBeLessThanOrEqual(afterAegisHit.elapsedMs);
  });

  it("cancels black-furnace-aegis opening when monster damage interrupts startup", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100)),
      "black-furnace-vanguard"
    );
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340, hp: 180, maxHp: 180, armor: 0 }]
    );
    const interruptingRun: CombatRun = {
      ...run,
      enemies: run.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              attackStartedAtMs: 0,
              attackImpactAtMs: 120,
              attackRecoverUntilMs: 620,
              attackSkillId: "ash-ember-spit",
              attackHitResolved: false,
              attackResolvedHits: 0,
              nextAttackAtMs: 9999
            }
          : enemy
      )
    };

    const cast = performAction(interruptingRun, { type: "skill", skillId: "black-furnace-aegis" });
    const [aegisAtMs] = scheduledSkillTimes(cast, "black-furnace-aegis");
    const interrupted = stepToElapsed(cast, aegisAtMs);
    const playerHits = interrupted.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(playerHits).toHaveLength(1);
    expect(interrupted.player.shieldUntilMs).toBeLessThanOrEqual(interrupted.elapsedMs);
    expect(interrupted.scheduledEnemyHitEffects.filter((effect) => effect.skillId === "black-furnace-aegis")).toHaveLength(0);
  });
});

describe("enemy attacks and player defeat", () => {
  it("creates mixed trash attack profiles in normal rooms", () => {
    const run = createCombatRun(createInitialState(), "cinder-kiln-alley");

    expect(run.enemies.map((enemy) => enemy.kind)).toEqual(["trash", "trash"]);
    expect(run.enemies.map((enemy) => (enemy as { attackProfileId?: string }).attackProfileId)).toEqual([
      "ash-ember-spit",
      "ash-crawler-burst"
    ]);
  });

  it("creates mixed elite attack profiles in elite rooms", () => {
    const run = reachEliteRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));

    expect(run.enemies.map((enemy) => enemy.kind)).toEqual(["elite", "elite", "trash"]);
    expect(run.enemies.map((enemy) => (enemy as { attackProfileId?: string }).attackProfileId)).toEqual([
      "zheng-shockwave",
      "zheng-horn-charge",
      "ash-ember-spit"
    ]);
  });

  it("gives the boss alternating flame breath and devour pull attack patterns", () => {
    const run = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const boss = run.enemies[0] as CombatEnemy & { attackPatternIds?: string[]; nextAttackPatternIndex?: number };

    expect(run.enemies.map((enemy) => enemy.kind)).toEqual(["boss"]);
    expect(boss.attackProfileId).toBe("taotie-flame-breath");
    expect(boss.attackPatternIds).toEqual(["taotie-flame-breath", "taotie-devour-pull", "taotie-ash-summon"]);
    expect(boss.nextAttackPatternIndex).toBe(0);
  });

  it("unlocks taotie forge shackle and chain cleave as phase-two control-chain casts", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const lowHpRun: CombatRun = {
      ...baseRun,
      enemies: [
        {
          ...baseRun.enemies[0],
          hp: Math.floor(baseRun.enemies[0].maxHp / 2),
          armor: 0,
          nextAttackAtMs: 9999
        } as CombatEnemy
      ]
    };
    const phased = stepCombat(lowHpRun, {}, 1);
    const boss = phased.enemies[0] as CombatEnemy & { attackPatternIds?: string[]; nextAttackPatternIndex?: number };
    const ready = {
      ...phased,
      enemies: [
        {
          ...phased.enemies[0],
          nextAttackAtMs: phased.elapsedMs
        } as CombatEnemy
      ]
    };
    const windup = stepCombat(ready, {}, 1);

    expect(boss.bossPhase).toBe(2);
    expect(boss.attackPatternIds).toEqual([
      "taotie-flame-breath",
      "taotie-devour-pull",
      "taotie-ash-summon",
      "taotie-forge-shackle",
      "taotie-chain-cleave"
    ]);
    expect(boss.attackProfileId).toBe("taotie-forge-shackle");
    expect(boss.nextAttackPatternIndex).toBe(3);
    expect(windup.enemies[0].attackSkillId).toBe("taotie-forge-shackle");
    expect((windup.enemies[0] as { attackProfileId?: string; nextAttackPatternIndex?: number }).attackProfileId).toBe("taotie-chain-cleave");
    expect((windup.enemies[0] as { nextAttackPatternIndex?: number }).nextAttackPatternIndex).toBe(4);
  });

  it("rotates the boss casts through flame breath, devour pull, and ash summon", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 180,
        y: 340,
        hp: 999,
        maxHp: 999
      },
      enemies: [
        {
          ...baseRun.enemies[0],
          position: {
            x: 400,
            y: 340
          },
          nextAttackAtMs: 1
        }
      ]
    };
    const firstWindup = stepCombat(run, {}, 80);
    const afterRecovery = stepCombat(firstWindup, {}, 1141);
    const readySecond = {
      ...afterRecovery,
      enemies: [
        {
          ...afterRecovery.enemies[0],
          nextAttackAtMs: afterRecovery.elapsedMs
        }
      ]
    };
    const secondWindup = stepCombat(readySecond, {}, 1);
    const afterSecondRecovery = stepCombat(secondWindup, {}, 1380);
    const readyThird = {
      ...afterSecondRecovery,
      enemies: [
        {
          ...afterSecondRecovery.enemies[0],
          nextAttackAtMs: afterSecondRecovery.elapsedMs
        }
      ]
    };
    const thirdWindup = stepCombat(readyThird, {}, 1);

    expect(firstWindup.enemies[0].attackSkillId).toBe("taotie-flame-breath");
    expect((firstWindup.enemies[0] as { attackProfileId?: string; nextAttackPatternIndex?: number }).attackProfileId).toBe("taotie-devour-pull");
    expect((firstWindup.enemies[0] as { nextAttackPatternIndex?: number }).nextAttackPatternIndex).toBe(1);
    expect(secondWindup.enemies[0].attackSkillId).toBe("taotie-devour-pull");
    expect((secondWindup.enemies[0] as { attackProfileId?: string; nextAttackPatternIndex?: number }).attackProfileId).toBe("taotie-ash-summon");
    expect((secondWindup.enemies[0] as { nextAttackPatternIndex?: number }).nextAttackPatternIndex).toBe(2);
    expect(thirdWindup.enemies[0].attackSkillId).toBe("taotie-ash-summon");
    expect((thirdWindup.enemies[0] as { attackProfileId?: string; nextAttackPatternIndex?: number }).attackProfileId).toBe("taotie-flame-breath");
    expect((thirdWindup.enemies[0] as { nextAttackPatternIndex?: number }).nextAttackPatternIndex).toBe(0);
  });

  it("casts taotie forge shackle as a two-stage bind and furnace slam with strict hit frames", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 230,
        y: 340,
        hp: 999,
        maxHp: 999,
        actionLockUntilMs: 0,
        hurtLockUntilMs: 0
      },
      enemies: [
        {
          ...baseRun.enemies[0],
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
    };
    const telegraph = stepCombat(run, {}, 80);
    const impactAtMs = telegraph.enemies[0].attackImpactAtMs;

    if (impactAtMs === undefined) {
      throw new Error("Expected taotie forge shackle impact frame");
    }

    const beforeBind = stepToElapsed(telegraph, impactAtMs - 1);
    const bind = stepToElapsed(beforeBind, impactAtMs);
    const actionDuringBind = performAction(bind, { type: "light" });
    const moveDuringBind = stepCombat(bind, { moveX: -1, moveY: 1, dash: true }, 120);
    const slamAtMs = impactAtMs + 240;
    const shiftedSlamAtMs = slamAtMs + (bind.player.hitstopUntilMs - bind.elapsedMs);
    const beforeSlam = stepToElapsed(bind, shiftedSlamAtMs - 1);
    const slammed = stepToElapsed(beforeSlam, shiftedSlamAtMs);
    const shackleAttacks = slammed.events.filter(
      (event): event is CombatEnemyAttackEvent => event.kind === "enemy-attack" && event.skillId === "taotie-forge-shackle"
    );
    const playerHits = slammed.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-forge-shackle"
    );

    expect(telegraph.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          skillId: "taotie-forge-shackle",
          phase: "windup",
          totalHits: 2
        })
      ])
    );
    expect(beforeBind.events.some((event) => event.kind === "player-hit" && event.skillId === "taotie-forge-shackle")).toBe(false);
    expect(playerHits).toHaveLength(2);
    expect(playerHits.map((event) => event.occurredAtMs)).toEqual([impactAtMs, shiftedSlamAtMs]);
    expect(playerHits.map((event) => event.feedbackCue)).toEqual(["player-hurt-forge-shackle", "player-hurt-forge-slam"]);
    expect(shackleAttacks.filter((event) => event.phase === "active").map((event) => event.vfxCue)).toEqual([
      "taotie-forge-shackle-bind",
      "taotie-forge-shackle-slam"
    ]);
    expect(actionDuringBind.events.some((event) => event.kind === "hit" && event.action === "light" && event.occurredAtMs === bind.elapsedMs)).toBe(false);
    expect(moveDuringBind.player.x).toBe(bind.player.x);
    expect(moveDuringBind.player.y).toBe(bind.player.y);
    expect(bind.player.hurtLockUntilMs).toBeGreaterThan(shiftedSlamAtMs);
    expect(slammed.player.hp).toBeLessThan(bind.player.hp);
    expect(slammed.player.hurtLockUntilMs).toBeGreaterThan(slammed.elapsedMs);
  });

  it("casts taotie chain cleave as a phase-two drag and smash chain with strict hit frames", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 230,
        y: 340,
        hp: 999,
        maxHp: 999,
        actionLockUntilMs: 0,
        hurtLockUntilMs: 0
      },
      enemies: [
        {
          ...baseRun.enemies[0],
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
    };
    const telegraph = stepCombat(run, {}, 80);
    const impactAtMs = telegraph.enemies[0].attackImpactAtMs;

    if (impactAtMs === undefined) {
      throw new Error("Expected taotie chain cleave impact frame");
    }

    const beforeDrag = stepToElapsed(telegraph, impactAtMs - 1);
    const drag = stepToElapsed(beforeDrag, impactAtMs);
    const actionDuringDrag = performAction(drag, { type: "light" });
    const moveDuringDrag = stepCombat(drag, { moveX: -1, moveY: 1, dash: true }, 96);
    const smashAtMs = impactAtMs + 180;
    const shiftedSmashAtMs = smashAtMs + (drag.player.hitstopUntilMs - drag.elapsedMs);
    const beforeSmash = stepToElapsed(drag, shiftedSmashAtMs - 1);
    const smashed = stepToElapsed(beforeSmash, shiftedSmashAtMs);
    const chainAttacks = smashed.events.filter(
      (event): event is CombatEnemyAttackEvent => event.kind === "enemy-attack" && event.skillId === "taotie-chain-cleave"
    );
    const playerHits = smashed.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-chain-cleave"
    );

    expect(telegraph.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          skillId: "taotie-chain-cleave",
          phase: "windup",
          totalHits: 2
        })
      ])
    );
    expect(beforeDrag.events.some((event) => event.kind === "player-hit" && event.skillId === "taotie-chain-cleave")).toBe(false);
    expect(playerHits).toHaveLength(2);
    expect(playerHits.map((event) => event.occurredAtMs)).toEqual([impactAtMs, shiftedSmashAtMs]);
    expect(playerHits.map((event) => event.feedbackCue)).toEqual(["player-hurt-chain-drag", "player-hurt-chain-smash"]);
    expect(chainAttacks.filter((event) => event.phase === "active").map((event) => event.vfxCue)).toEqual([
      "taotie-chain-cleave-drag",
      "taotie-chain-cleave-smash"
    ]);
    expect(actionDuringDrag.events.some((event) => event.kind === "hit" && event.action === "light" && event.occurredAtMs === drag.elapsedMs)).toBe(false);
    expect(moveDuringDrag.player.x).toBe(drag.player.x);
    expect(moveDuringDrag.player.y).toBe(drag.player.y);
    expect(drag.player.boundUntilMs).toBeGreaterThan(shiftedSmashAtMs);
    expect(smashed.player.hp).toBeLessThan(drag.player.hp);
    expect(smashed.player.hurtLockUntilMs).toBeGreaterThan(smashed.elapsedMs);
  });

  it("does not let taotie chain cleave smash a player who dodged the drag frame", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 230,
        y: 340,
        hp: 999,
        maxHp: 999,
        actionLockUntilMs: 0,
        hurtLockUntilMs: 0,
        boundUntilMs: 0
      },
      enemies: [
        {
          ...baseRun.enemies[0],
          bossPhase: 2,
          attackProfileId: "taotie-chain-cleave",
          attackPatternIds: ["taotie-chain-cleave"],
          nextAttackPatternIndex: 0,
          position: {
            x: 470,
            y: baseRun.arena.minY
          },
          nextAttackAtMs: 1
        } as unknown as CombatEnemy
      ]
    };
    const telegraph = stepCombat(run, {}, 80);
    const impactAtMs = telegraph.enemies[0].attackImpactAtMs;

    if (impactAtMs === undefined) {
      throw new Error("Expected taotie chain cleave impact frame");
    }

    const beforeDrag = stepToElapsed(telegraph, impactAtMs - 1);
    const sidesteppedBeforeDrag: CombatRun = {
      ...beforeDrag,
      player: {
        ...beforeDrag.player,
        y: beforeDrag.arena.maxY
      }
    };
    const dragMissed = stepToElapsed(sidesteppedBeforeDrag, impactAtMs);
    const smashAtMs = impactAtMs + 180;
    const reenteredBeforeSmash: CombatRun = {
      ...dragMissed,
      player: {
        ...dragMissed.player,
        x: 230,
        y: 340,
        boundUntilMs: 0,
        hurtLockUntilMs: 0
      }
    };
    const smashed = stepToElapsed(reenteredBeforeSmash, smashAtMs);
    const chainAttacks = smashed.events.filter(
      (event): event is CombatEnemyAttackEvent =>
        event.kind === "enemy-attack" && event.skillId === "taotie-chain-cleave" && event.phase !== "windup"
    );
    const playerHits = smashed.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-chain-cleave"
    );

    expect(chainAttacks.map((event) => [event.hitIndex, event.phase, event.vfxCue])).toEqual([
      [1, "miss", "taotie-chain-cleave-drag"],
      [2, "miss", "taotie-chain-cleave-smash"]
    ]);
    expect(playerHits).toHaveLength(0);
    expect(dragMissed.player.hp).toBe(run.player.hp);
    expect(smashed.player.hp).toBe(run.player.hp);
    expect(dragMissed.player.boundUntilMs).toBe(0);
    expect(smashed.player.hurtLockUntilMs).toBe(0);
  });

  it("does not let taotie forge shackle slam a player who dodged the bind frame", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 230,
        y: 340,
        hp: 999,
        maxHp: 999,
        actionLockUntilMs: 0,
        hurtLockUntilMs: 0,
        boundUntilMs: 0
      },
      enemies: [
        {
          ...baseRun.enemies[0],
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
    };
    const telegraph = stepCombat(run, {}, 80);
    const impactAtMs = telegraph.enemies[0].attackImpactAtMs;

    if (impactAtMs === undefined) {
      throw new Error("Expected taotie forge shackle impact frame");
    }

    const beforeBind = stepToElapsed(telegraph, impactAtMs - 1);
    const sidesteppedBeforeBind: CombatRun = {
      ...beforeBind,
      player: {
        ...beforeBind.player,
        y: beforeBind.arena.maxY
      }
    };
    const bindMissed = stepToElapsed(sidesteppedBeforeBind, impactAtMs);
    const slamAtMs = impactAtMs + 240;
    const reenteredBeforeSlam: CombatRun = {
      ...bindMissed,
      player: {
        ...bindMissed.player,
        x: 230,
        y: 340,
        boundUntilMs: 0,
        hurtLockUntilMs: 0
      }
    };
    const slammed = stepToElapsed(reenteredBeforeSlam, slamAtMs);
    const shackleAttacks = slammed.events.filter(
      (event): event is CombatEnemyAttackEvent =>
        event.kind === "enemy-attack" && event.skillId === "taotie-forge-shackle" && event.phase !== "windup"
    );
    const playerHits = slammed.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-forge-shackle"
    );

    expect(shackleAttacks.map((event) => [event.hitIndex, event.phase, event.vfxCue])).toEqual([
      [1, "miss", "taotie-forge-shackle-bind"],
      [2, "miss", "taotie-forge-shackle-slam"]
    ]);
    expect(playerHits).toHaveLength(0);
    expect(bindMissed.player.hp).toBe(run.player.hp);
    expect(slammed.player.hp).toBe(run.player.hp);
    expect(bindMissed.player.boundUntilMs).toBe(0);
    expect(slammed.player.hurtLockUntilMs).toBe(0);
  });

  it("lets lane movement dodge taotie forge shackle before the bind frame", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 230,
        y: 340,
        hp: 999,
        maxHp: 999
      },
      enemies: [
        {
          ...baseRun.enemies[0],
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
    };
    const telegraph = stepCombat(run, {}, 80);
    const impactAtMs = telegraph.enemies[0].attackImpactAtMs;

    if (impactAtMs === undefined) {
      throw new Error("Expected taotie forge shackle impact frame");
    }

    const sidestepped = {
      ...telegraph,
      player: {
        ...telegraph.player,
        y: telegraph.arena.maxY
      }
    };
    const missed = stepToElapsed(sidestepped, impactAtMs + 260);

    expect(missed.player.hp).toBe(run.player.hp);
    expect(missed.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          skillId: "taotie-forge-shackle",
          phase: "miss",
          vfxCue: "taotie-forge-shackle-bind"
        }),
        expect.objectContaining({
          kind: "enemy-attack",
          skillId: "taotie-forge-shackle",
          phase: "miss",
          vfxCue: "taotie-forge-shackle-slam"
        })
      ])
    );
    expect(missed.events.some((event) => event.kind === "player-hit" && event.skillId === "taotie-forge-shackle")).toBe(false);
  });

  it("cancels taotie forge shackle when the boss is staggered before the chain locks", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      enemies: [
        {
          ...baseRun.enemies[0],
          bossPhase: 2,
          attackProfileId: "taotie-forge-shackle",
          attackPatternIds: ["taotie-forge-shackle"],
          nextAttackPatternIndex: 0,
          nextAttackAtMs: 1
        } as unknown as CombatEnemy
      ]
    };
    const telegraph = stepCombat(run, {}, 80);
    const interrupted = applyHit(telegraph, {
      id: "test-stagger-taotie-forge-shackle",
      targetId: telegraph.enemies[0].id,
      damage: 1,
      hitstopMs: 40,
      knockback: 0,
      juggle: false,
      statusTags: ["stagger"]
    });
    const afterImpact = stepCombat(interrupted, {}, 900);

    expect(telegraph.enemies[0].attackSkillId).toBe("taotie-forge-shackle");
    expect(interrupted.enemies[0].attackSkillId).toBeUndefined();
    expect(afterImpact.events.some((event) => event.kind === "enemy-attack" && event.skillId === "taotie-forge-shackle" && event.phase !== "windup")).toBe(false);
    expect(afterImpact.events.some((event) => event.kind === "player-hit" && event.skillId === "taotie-forge-shackle")).toBe(false);
  });

  it("summons ash crawler minions only on the taotie ash summon impact frame", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 180,
        y: 340,
        hp: 999,
        maxHp: 999
      },
      enemies: [
        {
          ...baseRun.enemies[0],
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
    };
    const telegraph = stepCombat(run, {}, 80);
    const impactAtMs = telegraph.enemies[0].attackImpactAtMs;

    if (impactAtMs === undefined) {
      throw new Error("Expected taotie ash summon impact frame");
    }

    const beforeImpact = stepToElapsed(telegraph, impactAtMs - 1);
    const impacted = stepToElapsed(beforeImpact, impactAtMs);
    const summonEvent = impacted.events.find(
      (event): event is CombatEnemySummonEvent => event.kind === "enemy-summon" && event.skillId === "taotie-ash-summon"
    );
    const summoned = impacted.enemies.filter((enemy) => enemy.id !== telegraph.enemies[0].id);

    expect(telegraph.enemies).toHaveLength(1);
    expect(beforeImpact.enemies).toHaveLength(1);
    expect(beforeImpact.events.some((event) => event.kind === "enemy-summon")).toBe(false);
    expect(impacted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          skillId: "taotie-ash-summon",
          phase: "active",
          vfxCue: "taotie-ash-summon-rift"
        })
      ])
    );
    expect(summonEvent).toBeDefined();
    expect(summonEvent?.summonedEnemyIds).toHaveLength(2);
    expect(summonEvent?.positions).toHaveLength(2);
    expect(summonEvent?.vfxCue).toBe("taotie-ash-summon-rift");
    expect(summoned).toHaveLength(2);
    expect(summoned.map((enemy) => enemy.kind)).toEqual(["trash", "trash"]);
    expect(summoned.map((enemy) => enemy.attackProfileId)).toEqual(["ash-crawler-burst", "ash-crawler-burst"]);
    expect(summoned.every((enemy) => enemy.nextAttackAtMs > impactAtMs)).toBe(true);
  });

  it("cancels taotie ash summon when the boss is staggered before the rift opens", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      enemies: [
        {
          ...baseRun.enemies[0],
          attackProfileId: "taotie-ash-summon",
          attackPatternIds: ["taotie-ash-summon"],
          nextAttackPatternIndex: 0,
          nextAttackAtMs: 1
        } as CombatEnemy
      ]
    };
    const telegraph = stepCombat(run, {}, 80);
    const interrupted = applyHit(telegraph, {
      id: "test-stagger-taotie-ash-summon",
      targetId: telegraph.enemies[0].id,
      damage: 1,
      hitstopMs: 40,
      knockback: 0,
      juggle: false,
      statusTags: ["stagger"]
    });
    const afterImpact = stepCombat(interrupted, {}, 900);

    expect(telegraph.enemies[0].attackSkillId).toBe("taotie-ash-summon");
    expect(interrupted.enemies[0].attackSkillId).toBeUndefined();
    expect(afterImpact.enemies).toHaveLength(1);
    expect(afterImpact.events.some((event) => event.kind === "enemy-summon")).toBe(false);
    expect(afterImpact.events.some((event) => event.kind === "enemy-attack" && event.skillId === "taotie-ash-summon" && event.phase !== "windup")).toBe(false);
  });

  it("lets a large-frame scheduled boss-phase hit cancel taotie ash summon before the rift opens", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 180,
        y: 340,
        facing: 1,
        hp: 999,
        maxHp: 999
      },
      enemies: [
        {
          ...baseRun.enemies[0],
          hp: Math.floor(baseRun.enemies[0].maxHp / 2) + 16,
          armor: 0,
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
    };
    const telegraph = stepCombat(run, {}, 80);
    const impactAtMs = telegraph.enemies[0].attackImpactAtMs;

    if (impactAtMs === undefined) {
      throw new Error("Expected taotie ash summon impact frame");
    }

    const phaseCutAtMs = impactAtMs - 120;
    const queuedPhaseCut: CombatRun = {
      ...telegraph,
      scheduledEnemyHitEffects: [
        ...telegraph.scheduledEnemyHitEffects,
        {
          id: "test-phase-cut-before-taotie-summon",
          targetId: telegraph.enemies[0].id,
          applyAtMs: phaseCutAtMs,
          action: "skill",
          skillId: "test-phase-cut",
          inputToHitMs: 0,
          canceledFromCombo: false,
          damage: 40,
          hitstopMs: 40,
          knockback: 0,
          juggle: false,
          playerFacing: 1
        }
      ]
    };
    const advanced = stepCombat(queuedPhaseCut, {}, impactAtMs - queuedPhaseCut.elapsedMs + 160);

    expect(advanced.enemies).toHaveLength(1);
    expect((advanced.enemies[0] as { bossPhase?: number }).bossPhase).toBe(2);
    expect(advanced.enemies[0].attackSkillId).toBeUndefined();
    expect(advanced.events.some((event) => event.kind === "hit" && event.skillId === "test-phase-cut" && event.occurredAtMs === phaseCutAtMs)).toBe(true);
    expect(advanced.events.some((event) => event.kind === "boss-phase" && event.occurredAtMs === phaseCutAtMs)).toBe(true);
    expect(advanced.events.some((event) => event.kind === "enemy-summon")).toBe(false);
    expect(advanced.events.some((event) => event.kind === "enemy-attack" && event.skillId === "taotie-ash-summon" && event.phase !== "windup")).toBe(false);
  });

  it("keeps taotie ash summons as live room enemies until every spawned crawler is defeated", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 180,
        y: 340,
        hp: 999,
        maxHp: 999
      },
      enemies: [
        {
          ...baseRun.enemies[0],
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
    };
    const telegraph = stepCombat(run, {}, 80);
    const impactAtMs = telegraph.enemies[0].attackImpactAtMs;

    if (impactAtMs === undefined) {
      throw new Error("Expected taotie ash summon impact frame");
    }

    const summoned = stepToElapsed(telegraph, impactAtMs);
    const bossDefeated = applyHit(summoned, {
      id: "test-kill-taotie-after-summon",
      targetId: summoned.enemies[0].id,
      damage: 9999,
      hitstopMs: 1,
      knockback: 0,
      juggle: false
    });
    const allDefeated = defeatAll(bossDefeated);
    const finished = finishRoom(allDefeated);

    expect(summoned.enemies).toHaveLength(3);
    expect(roomGateForRun(bossDefeated).state).toBe("locked");
    expect(() => finishRoom(bossDefeated)).toThrow("Cannot finish room while enemies are alive");
    expect(roomGateForRun(allDefeated).state).toBe("complete");
    expect(finished.completed).toBe(true);
  });

  it("triggers taotie forge collapse once when the boss drops below half hp", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const lowHpRun: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 240,
        y: 340,
        hp: 999,
        maxHp: 999
      },
      enemies: [
        {
          ...baseRun.enemies[0],
          hp: Math.floor(baseRun.enemies[0].maxHp / 2),
          armor: 0,
          nextAttackAtMs: 9999
        } as CombatEnemy
      ]
    };
    const phased = stepCombat(lowHpRun, {}, 1);
    const phaseEvents = phased.events.filter(
      (event): event is CombatBossPhaseEvent => event.kind === "boss-phase"
    );
    const hazardTelegraphs = phased.events.filter(
      (event): event is CombatArenaHazardEvent =>
        event.kind === "arena-hazard" && event.skillId === "taotie-forge-collapse" && event.phase === "telegraph"
    );
    const repeated = stepCombat(phased, {}, 180);

    expect((phased.enemies[0] as { bossPhase?: number }).bossPhase).toBe(2);
    expect(phaseEvents).toHaveLength(1);
    expect(phaseEvents[0]).toMatchObject({
      enemyId: phased.enemies[0].id,
      phase: 2,
      skillId: "taotie-forge-collapse",
      hazardCount: 3,
      vfxCue: "taotie-forge-collapse"
    });
    expect(hazardTelegraphs).toHaveLength(3);
    expect(hazardTelegraphs.every((event) => event.impactAtMs > phased.elapsedMs)).toBe(true);
    expect(hazardTelegraphs.every((event) => event.radiusX > 0 && event.laneRange > 0)).toBe(true);
    expect(phased.scheduledArenaHazards).toHaveLength(3);
    expect(repeated.events.filter((event) => event.kind === "boss-phase")).toHaveLength(1);
  });

  it("keeps light attack rewards when the hit also triggers boss phase events", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 220,
        y: 340,
        facing: 1,
        heat: 0,
        resource: {
          ...baseRun.player.resource,
          current: 0
        }
      },
      enemies: [
        {
          ...baseRun.enemies[0],
          hp: Math.floor(baseRun.enemies[0].maxHp / 2) + 8,
          armor: 0,
          position: {
            x: 320,
            y: 340
          },
          nextAttackAtMs: 9999
        } as CombatEnemy
      ]
    };
    const struck = resolveGroundLight(performAction(run, { type: "light" }));

    expect(struck.events.at(-1)?.kind).toBe("arena-hazard");
    expect(struck.events.some((event) => event.kind === "hit" && event.action === "light")).toBe(true);
    expect((struck.enemies[0] as { bossPhase?: number }).bossPhase).toBe(2);
    expect(struck.player.resource.current).toBeGreaterThan(run.player.resource.current);
    expect(struck.player.comboStep).toBe(1);
    expect(struck.player.cancelWindowUntilMs).toBeGreaterThan(struck.elapsedMs);
  });

  it("resolves taotie forge collapse hazards on the impact frame and lets lane movement dodge them", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const lowHpRun: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 240,
        y: 340,
        hp: 999,
        maxHp: 999
      },
      enemies: [
        {
          ...baseRun.enemies[0],
          hp: Math.floor(baseRun.enemies[0].maxHp / 2),
          armor: 0,
          nextAttackAtMs: 9999
        } as CombatEnemy
      ]
    };
    const phased = stepCombat(lowHpRun, {}, 1);
    const firstHazard = phased.events.find(
      (event): event is CombatArenaHazardEvent =>
        event.kind === "arena-hazard" && event.skillId === "taotie-forge-collapse" && event.phase === "telegraph"
    );

    if (!firstHazard) {
      throw new Error("Expected forge collapse telegraph");
    }

    const beforeImpact = stepCombat(phased, {}, firstHazard.impactAtMs - phased.elapsedMs - 1);
    const impacted = stepCombat(beforeImpact, {}, 1);
    const activeHazard = impacted.events.find(
      (event): event is CombatArenaHazardEvent =>
        event.kind === "arena-hazard" && event.hazardId === firstHazard.hazardId && event.phase === "active"
    );
    const playerHit = impacted.events.find(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-forge-collapse"
    );
    const sidestepped = stepCombat(
      {
        ...phased,
        player: {
          ...phased.player,
          y: phased.arena.maxY,
          hp: 999,
          invulnerableUntilMs: 0,
          hurtLockUntilMs: 0
        }
      },
      {},
      firstHazard.impactAtMs - phased.elapsedMs
    );

    expect(beforeImpact.events.some((event) => event.kind === "player-hit" && event.skillId === "taotie-forge-collapse")).toBe(false);
    expect(beforeImpact.scheduledArenaHazards).toHaveLength(3);
    expect(activeHazard).toMatchObject({
      skillId: "taotie-forge-collapse",
      phase: "active",
      vfxCue: "taotie-forge-collapse-impact"
    });
    expect(playerHit).toMatchObject({
      enemyId: phased.enemies[0].id,
      skillId: "taotie-forge-collapse",
      damage: expect.any(Number),
      feedbackCue: "player-hurt-forge-collapse"
    });
    expect(playerHit?.damage ?? 0).toBeGreaterThan(40);
    expect(impacted.player.hp).toBeLessThan(phased.player.hp);
    expect(impacted.player.hurtLockUntilMs).toBeGreaterThan(impacted.elapsedMs);
    expect(sidestepped.player.hp).toBe(999);
    expect(sidestepped.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "arena-hazard",
          hazardId: firstHazard.hazardId,
          skillId: "taotie-forge-collapse",
          phase: "miss",
          vfxCue: "taotie-forge-collapse-impact"
        })
      ])
    );
    expect(sidestepped.events.some((event) => event.kind === "player-hit" && event.skillId === "taotie-forge-collapse")).toBe(false);
  });

  it("samples player position at the forge collapse impact frame during large movement ticks", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      elapsedMs: 1000,
      player: {
        ...baseRun.player,
        x: 240,
        y: baseRun.arena.maxY,
        hp: 999,
        maxHp: 999
      },
      enemies: [
        {
          ...baseRun.enemies[0],
          nextAttackAtMs: 9999
        }
      ],
      scheduledArenaHazards: [
        {
          hazardId: "test-forge-sample",
          enemyId: baseRun.enemies[0].id,
          skillId: "taotie-forge-collapse",
          x: 240,
          y: 340,
          radiusX: 86,
          laneRange: 36,
          impactAtMs: 1100,
          damage: 62,
          hitstopMs: 72,
          knockback: 36,
          vfxWindowMs: 720
        }
      ]
    };
    const movedThroughHazard = stepCombat(run, { moveY: -1 }, 500);

    expect(movedThroughHazard.player.y).toBeLessThan(340 + 36);
    expect(movedThroughHazard.player.hp).toBe(999);
    expect(movedThroughHazard.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "arena-hazard",
          hazardId: "test-forge-sample",
          phase: "miss"
        })
      ])
    );
    expect(movedThroughHazard.events.some((event) => event.kind === "player-hit" && event.skillId === "taotie-forge-collapse")).toBe(false);
  });

  it("clears pending hazards when a forge collapse impact defeats the player", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      elapsedMs: 1000,
      player: {
        ...baseRun.player,
        x: 240,
        y: 340,
        hp: 1,
        maxHp: 999
      },
      enemies: [
        {
          ...baseRun.enemies[0],
          nextAttackAtMs: 9999
        }
      ],
      scheduledEnemyHitEffects: [
        {
          id: "test-pending-hit",
          targetId: baseRun.enemies[0].id,
          applyAtMs: 1400,
          damage: 1,
          hitstopMs: 1,
          knockback: 0,
          juggle: false,
          inputToHitMs: 400,
          canceledFromCombo: false,
          playerFacing: 1
        }
      ],
      scheduledArenaHazards: [
        {
          hazardId: "test-lethal-forge-1",
          enemyId: baseRun.enemies[0].id,
          skillId: "taotie-forge-collapse",
          x: 240,
          y: 340,
          radiusX: 86,
          laneRange: 36,
          impactAtMs: 1100,
          damage: 62,
          hitstopMs: 72,
          knockback: 36,
          vfxWindowMs: 720
        },
        {
          hazardId: "test-lethal-forge-2",
          enemyId: baseRun.enemies[0].id,
          skillId: "taotie-forge-collapse",
          x: 260,
          y: 340,
          radiusX: 86,
          laneRange: 36,
          impactAtMs: 1240,
          damage: 62,
          hitstopMs: 72,
          knockback: 36,
          vfxWindowMs: 720
        }
      ]
    };
    const defeated = stepCombat(run, {}, 120);

    expect(defeated.failed).toBe(true);
    expect(defeated.player.defeated).toBe(true);
    expect(defeated.scheduledEnemyHitEffects).toHaveLength(0);
    expect(defeated.scheduledArenaHazards).toHaveLength(0);
  });

  it("also triggers taotie forge collapse when reflect damage pushes the boss below half hp", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      elapsedMs: 0,
      player: {
        ...baseRun.player,
        x: 160,
        y: 340,
        hp: 999,
        maxHp: 999,
        reflectUntilMs: 1000
      },
      enemies: [
        {
          ...baseRun.enemies[0],
          hp: Math.floor(baseRun.enemies[0].maxHp / 2) + 10,
          armor: 0,
          position: {
            x: 256,
            y: 340
          },
          attackStartedAtMs: 0,
          attackImpactAtMs: 100,
          attackRecoverUntilMs: 520,
          attackSkillId: "taotie-flame-breath",
          attackHitResolved: false,
          attackResolvedHits: 0,
          nextAttackAtMs: 9999
        } as CombatEnemy
      ]
    };
    const reflected = stepCombat(run, {}, 360);
    const reflectHit = reflected.events.find(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "mirror-reflect"
    );
    const phaseEvent = reflected.events.find(
      (event): event is CombatBossPhaseEvent => event.kind === "boss-phase" && event.skillId === "taotie-forge-collapse"
    );
    const firstHazard = reflected.events.find(
      (event): event is CombatArenaHazardEvent =>
        event.kind === "arena-hazard" && event.skillId === "taotie-forge-collapse" && event.phase === "telegraph"
    );

    expect(reflectHit).toBeDefined();
    expect(reflected.enemies[0].hp).toBeLessThanOrEqual(reflected.enemies[0].maxHp / 2);
    expect((reflected.enemies[0] as { bossPhase?: number }).bossPhase).toBe(2);
    expect(phaseEvent).toMatchObject({
      occurredAtMs: 100,
      enemyId: reflected.enemies[0].id
    });
    expect(firstHazard).toMatchObject({
      impactAtMs: 720
    });
    expect(
      reflected.events.some(
        (event) => event.kind === "player-hit" && event.skillId === "taotie-flame-breath" && event.occurredAtMs > 100
      )
    ).toBe(false);
  });

  it("telegraphs monster attacks before the damage frame", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const telegraph = stepCombat(run, {}, 80);

    expect(telegraph.player.hp).toBe(run.player.hp);
    expect(telegraph.enemies[0].attackSkillId).toBe("ash-ember-spit");
    expect(telegraph.enemies[0].attackImpactAtMs).toBeGreaterThan(telegraph.elapsedMs);
    expect(telegraph.events.at(-1)).toMatchObject({
      kind: "enemy-attack",
      enemyId: telegraph.enemies[0].id,
      skillId: "ash-ember-spit",
      phase: "windup"
    });
  });

  it("damages the player on a monster attack impact frame and starts recovery", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const telegraph = stepCombat(run, {}, 80);
    const impacted = stepCombat(telegraph, {}, 360);

    expect(impacted.player.hp).toBeLessThan(run.player.hp);
    expect(impacted.player.invulnerableUntilMs).toBeGreaterThan(impacted.elapsedMs);
    expect(impacted.enemies[0].attackHitResolved).toBe(true);
    expect(impacted.enemies[0].nextAttackAtMs).toBeGreaterThan(impacted.elapsedMs);
    expect(impacted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          enemyId: impacted.enemies[0].id,
          skillId: "ash-ember-spit"
        })
      ])
    );
  });

  it("resolves monster skill damage on the scheduled impact frame with feedback cues", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const telegraph = stepCombat(run, {}, 80);
    const windup = telegraph.events.find(
      (event) => event.kind === "enemy-attack" && event.skillId === "ash-ember-spit" && event.phase === "windup"
    );
    const impacted = stepCombat(telegraph, {}, 360);
    const active = impacted.events.find(
      (event) => event.kind === "enemy-attack" && event.skillId === "ash-ember-spit" && event.phase === "active"
    );
    const playerHit = impacted.events.find(
      (event) => event.kind === "player-hit" && event.skillId === "ash-ember-spit"
    );

    expect(windup).toMatchObject({ impactAtMs: 360 });
    expect(active).toMatchObject({
      occurredAtMs: 360,
      impactAtMs: 360,
      hitIndex: 1,
      totalHits: 1,
      vfxCue: "ash-ember-spit-impact",
      vfxWindowMs: 360
    });
    expect(playerHit).toMatchObject({
      damage: 28,
      occurredAtMs: 360,
      hitstopMs: 36,
      hitIndex: 1,
      totalHits: 1,
      feedbackCue: "player-hurt-light"
    });
    expect(impacted.player.hitstopUntilMs).toBe(396);
    expect(impacted.player.hurtLockUntilMs).toBe(780);
    expect(impacted.player.invulnerableUntilMs).toBe(920);
  });

  it("rushes a crawler trash enemy into close range before its burst impact", () => {
    const baseRun = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const crawlerPatch = { attackProfileId: "ash-crawler-burst" } as unknown as Partial<CombatEnemy>;
    const run = withEnemyInRange(baseRun, {
      ...crawlerPatch,
      position: {
        x: baseRun.player.x + 260,
        y: baseRun.player.y
      },
      nextAttackAtMs: 1
    });
    const startDistance = run.enemies[0].position.x - run.player.x;
    const telegraph = stepCombat(run, {}, 80);
    const windup = telegraph.events.find(
      (event) => event.kind === "enemy-attack" && event.skillId === "ash-crawler-burst" && event.phase === "windup"
    );
    const windupStartDistance = telegraph.enemies[0].position.x - telegraph.player.x;
    const midRush = stepCombat(telegraph, {}, 160);
    const midRushDistance = midRush.enemies[0].position.x - midRush.player.x;
    const impacted = stepCombat(midRush, {}, 160);
    const impactDistanceBeforeKnockback = impacted.enemies[0].position.x - midRush.player.x;
    const active = impacted.events.find(
      (event) => event.kind === "enemy-attack" && event.skillId === "ash-crawler-burst" && event.phase === "active"
    );
    const playerHit = impacted.events.find(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "ash-crawler-burst"
    );

    expect(windup).toMatchObject({
      impactAtMs: 400,
      totalHits: 1
    });
    expect(windupStartDistance).toBe(startDistance);
    expect(midRushDistance).toBeLessThan(startDistance);
    expect(midRushDistance).toBeGreaterThan(96);
    expect(impactDistanceBeforeKnockback).toBeLessThanOrEqual(96);
    expect(telegraph.player.hp).toBe(run.player.hp);
    expect(active).toMatchObject({
      occurredAtMs: 400,
      impactAtMs: 400,
      hitIndex: 1,
      totalHits: 1,
      vfxCue: "ash-crawler-burst-explode",
      vfxWindowMs: 460
    });
    expect(playerHit).toMatchObject({
      damage: expect.any(Number),
      occurredAtMs: 400,
      hitstopMs: 52,
      feedbackCue: "player-hurt-heavy"
    });
    expect(playerHit?.damage ?? 0).toBeGreaterThan(28);
    expect(impacted.player.x).toBeLessThan(telegraph.player.x);
    expect(impacted.player.hurtLockUntilMs).toBeGreaterThan(impacted.elapsedMs);
  });

  it("lets the player sidestep a crawler burst so it explodes as a miss", () => {
    const baseRun = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const crawlerPatch = { attackProfileId: "ash-crawler-burst" } as unknown as Partial<CombatEnemy>;
    const run = withEnemyInRange(baseRun, {
      ...crawlerPatch,
      position: {
        x: baseRun.player.x + 260,
        y: baseRun.player.y
      },
      nextAttackAtMs: 1
    });
    const telegraph = stepCombat(run, {}, 80);
    const sidestepped = {
      ...telegraph,
      player: {
        ...telegraph.player,
        y: telegraph.arena.maxY
      }
    };
    const missed = stepCombat(sidestepped, {}, 360);

    expect(missed.player.hp).toBe(run.player.hp);
    expect(missed.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          skillId: "ash-crawler-burst",
          phase: "miss",
          vfxCue: "ash-crawler-burst-explode"
        })
      ])
    );
    expect(missed.events.some((event) => event.kind === "player-hit" && event.skillId === "ash-crawler-burst")).toBe(false);
  });

  it("cancels crawler burst explosion when the rushing enemy is staggered", () => {
    const baseRun = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const crawlerPatch = { attackProfileId: "ash-crawler-burst" } as unknown as Partial<CombatEnemy>;
    const run = withEnemyInRange(baseRun, {
      ...crawlerPatch,
      position: {
        x: baseRun.player.x + 260,
        y: baseRun.player.y
      },
      nextAttackAtMs: 1
    });
    const telegraph = stepCombat(run, {}, 80);
    const interrupted = applyHit(telegraph, {
      id: "test-stagger-crawler-burst",
      targetId: telegraph.enemies[0].id,
      damage: 1,
      hitstopMs: 40,
      knockback: 0,
      juggle: false,
      statusTags: ["stagger"]
    });
    const afterImpact = stepCombat(interrupted, {}, 360);

    expect(telegraph.enemies[0].attackSkillId).toBe("ash-crawler-burst");
    expect(interrupted.enemies[0].attackSkillId).toBeUndefined();
    expect(afterImpact.events.some((event) => event.kind === "enemy-attack" && event.skillId === "ash-crawler-burst" && event.phase !== "windup")).toBe(false);
    expect(afterImpact.events.some((event) => event.kind === "player-hit" && event.skillId === "ash-crawler-burst")).toBe(false);
  });

  it("casts zheng shockwave only on the quake frame and live-samples the player lane", () => {
    const baseRun = reachEliteRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const laneBaseRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        y: baseRun.arena.maxY
      }
    };
    const shockwavePatch = { attackProfileId: "zheng-shockwave" } as unknown as Partial<CombatEnemy>;
    const run = withEnemyInRange(laneBaseRun, {
      ...shockwavePatch,
      position: {
        x: laneBaseRun.player.x + 130,
        y: laneBaseRun.player.y
      },
      nextAttackAtMs: 1
    });
    const isolatedRun = {
      ...run,
      enemies: run.enemies.map((enemy, index) => (index === 0 ? enemy : { ...enemy, nextAttackAtMs: 9999 }))
    };
    const telegraph = stepCombat(isolatedRun, {}, 80);
    const impactAtMs = telegraph.enemies[0].attackImpactAtMs ?? 0;
    const beforeImpact = stepToElapsed(telegraph, impactAtMs - 1);
    const impacted = stepToElapsed(beforeImpact, impactAtMs);
    const sidestepped = {
      ...telegraph,
      player: {
        ...telegraph.player,
        y: telegraph.arena.minY
      }
    };
    const missed = stepToElapsed(sidestepped, impactAtMs);
    const active = impacted.events.find(
      (event) => event.kind === "enemy-attack" && event.skillId === "zheng-shockwave" && event.phase === "active"
    );
    const playerHit = impacted.events.find(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "zheng-shockwave"
    );

    expect(telegraph.player.hp).toBe(isolatedRun.player.hp);
    expect(telegraph.enemies[0].attackSkillId).toBe("zheng-shockwave");
    expect(impactAtMs).toBe(telegraph.elapsedMs + 360);
    expect(beforeImpact.events.some((event) => event.kind === "player-hit" && event.skillId === "zheng-shockwave")).toBe(false);
    expect(active).toMatchObject({
      occurredAtMs: impactAtMs,
      impactAtMs,
      hitIndex: 1,
      totalHits: 1,
      vfxCue: "zheng-shockwave-impact",
      vfxWindowMs: 420
    });
    expect(playerHit).toMatchObject({
      damage: 52,
      occurredAtMs: impactAtMs,
      hitstopMs: 48,
      feedbackCue: "player-hurt-heavy"
    });
    expect(missed.player.hp).toBe(isolatedRun.player.hp);
    expect(missed.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          skillId: "zheng-shockwave",
          phase: "miss",
          vfxCue: "zheng-shockwave-impact"
        })
      ])
    );
    expect(missed.events.some((event) => event.kind === "player-hit" && event.skillId === "zheng-shockwave")).toBe(false);
  });

  it("cancels zheng shockwave when the elite is staggered before the quake frame", () => {
    const baseRun = reachEliteRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const shockwavePatch = { attackProfileId: "zheng-shockwave" } as unknown as Partial<CombatEnemy>;
    const run = withEnemyInRange(baseRun, {
      ...shockwavePatch,
      position: {
        x: baseRun.player.x + 130,
        y: baseRun.player.y
      },
      nextAttackAtMs: 1
    });
    const isolatedRun = {
      ...run,
      enemies: run.enemies.map((enemy, index) => (index === 0 ? enemy : { ...enemy, nextAttackAtMs: 9999 }))
    };
    const telegraph = stepCombat(isolatedRun, {}, 80);
    const impactAtMs = telegraph.enemies[0].attackImpactAtMs ?? 0;
    const interrupted = applyHit(telegraph, {
      id: "test-stagger-zheng-shockwave",
      targetId: telegraph.enemies[0].id,
      damage: 1,
      hitstopMs: 40,
      knockback: 0,
      juggle: false,
      statusTags: ["stagger"]
    });
    const afterImpact = stepToElapsed(interrupted, impactAtMs);

    expect(telegraph.enemies[0].attackSkillId).toBe("zheng-shockwave");
    expect(interrupted.enemies[0].attackSkillId).toBeUndefined();
    expect(afterImpact.events.some((event) => event.kind === "enemy-attack" && event.skillId === "zheng-shockwave" && event.phase !== "windup")).toBe(false);
    expect(afterImpact.events.some((event) => event.kind === "player-hit" && event.skillId === "zheng-shockwave")).toBe(false);
  });

  it("rushes an elite zheng horn charge through a line telegraph before impact", () => {
    const baseRun = reachEliteRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const chargePatch = { attackProfileId: "zheng-horn-charge" } as unknown as Partial<CombatEnemy>;
    const run = withEnemyInRange(baseRun, {
      ...chargePatch,
      position: {
        x: baseRun.player.x + 310,
        y: baseRun.player.y
      },
      nextAttackAtMs: 1
    });
    const startDistance = run.enemies[0].position.x - run.player.x;
    const telegraph = stepCombat(run, {}, 80);
    const windup = telegraph.events.find(
      (event) => event.kind === "enemy-attack" && event.skillId === "zheng-horn-charge" && event.phase === "windup"
    );
    const windupStartDistance = telegraph.enemies[0].position.x - telegraph.player.x;
    const midRush = stepCombat(telegraph, {}, 210);
    const midRushDistance = midRush.enemies[0].position.x - midRush.player.x;
    const impacted = stepCombat(midRush, {}, 210);
    const impactDistanceBeforeKnockback = impacted.enemies[0].position.x - midRush.player.x;
    const active = impacted.events.find(
      (event) => event.kind === "enemy-attack" && event.skillId === "zheng-horn-charge" && event.phase === "active"
    );
    const playerHit = impacted.events.find(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "zheng-horn-charge"
    );

    expect(windup).toMatchObject({
      impactAtMs: 500,
      totalHits: 1
    });
    expect(windupStartDistance).toBe(startDistance);
    expect(midRushDistance).toBeLessThan(startDistance);
    expect(midRushDistance).toBeGreaterThan(120);
    expect(impactDistanceBeforeKnockback).toBeLessThanOrEqual(120);
    expect(telegraph.player.hp).toBe(run.player.hp);
    expect(active).toMatchObject({
      occurredAtMs: 500,
      impactAtMs: 500,
      hitIndex: 1,
      totalHits: 1,
      vfxCue: "zheng-horn-charge-impact",
      vfxWindowMs: 480
    });
    expect(playerHit).toMatchObject({
      damage: expect.any(Number),
      occurredAtMs: 500,
      hitstopMs: 54,
      feedbackCue: "player-hurt-heavy"
    });
    expect(playerHit?.damage ?? 0).toBeGreaterThan(40);
    expect(impacted.player.hurtLockUntilMs).toBeGreaterThan(impacted.elapsedMs);
  });

  it("lets the player sidestep a zheng horn charge line attack", () => {
    const baseRun = reachEliteRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const chargePatch = { attackProfileId: "zheng-horn-charge" } as unknown as Partial<CombatEnemy>;
    const run = withEnemyInRange(baseRun, {
      ...chargePatch,
      position: {
        x: baseRun.player.x + 310,
        y: baseRun.player.y
      },
      nextAttackAtMs: 1
    });
    const telegraph = stepCombat(run, {}, 80);
    const sidestepped = {
      ...telegraph,
      player: {
        ...telegraph.player,
        y: telegraph.arena.maxY
      }
    };
    const missed = stepCombat(sidestepped, {}, 430);

    expect(missed.player.hp).toBe(run.player.hp);
    expect(missed.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          skillId: "zheng-horn-charge",
          phase: "miss",
          vfxCue: "zheng-horn-charge-impact"
        })
      ])
    );
    expect(missed.events.some((event) => event.kind === "player-hit" && event.skillId === "zheng-horn-charge")).toBe(false);
  });

  it("cancels zheng horn charge when the elite is staggered mid-rush", () => {
    const baseRun = reachEliteRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const chargePatch = { attackProfileId: "zheng-horn-charge" } as unknown as Partial<CombatEnemy>;
    const run = withEnemyInRange(baseRun, {
      ...chargePatch,
      position: {
        x: baseRun.player.x + 310,
        y: baseRun.player.y
      },
      nextAttackAtMs: 1
    });
    const telegraph = stepCombat(run, {}, 80);
    const midRush = stepCombat(telegraph, {}, 210);
    const interrupted = applyHit(midRush, {
      id: "test-stagger-zheng-horn-charge",
      targetId: midRush.enemies[0].id,
      damage: 1,
      hitstopMs: 40,
      knockback: 0,
      juggle: false,
      statusTags: ["stagger"]
    });
    const afterImpact = stepCombat(interrupted, {}, 260);

    expect(telegraph.enemies[0].attackSkillId).toBe("zheng-horn-charge");
    expect(interrupted.enemies[0].attackSkillId).toBeUndefined();
    expect((interrupted.enemies[0] as { attackRushStartPosition?: unknown }).attackRushStartPosition).toBeUndefined();
    expect((interrupted.enemies[0] as { attackRushTargetPosition?: unknown }).attackRushTargetPosition).toBeUndefined();
    expect(afterImpact.events.some((event) => event.kind === "enemy-attack" && event.skillId === "zheng-horn-charge" && event.phase !== "windup")).toBe(false);
    expect(afterImpact.events.some((event) => event.kind === "player-hit" && event.skillId === "zheng-horn-charge")).toBe(false);
  });

  it("uses monster hurtbox edges for monster skill attack range boundaries", () => {
    const bossBaseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const makeBossAttackRun = (xOffset: number) => ({
      ...bossBaseRun,
      player: {
        ...bossBaseRun.player,
        x: 120,
        y: 340
      },
      enemies: [
        {
          ...bossBaseRun.enemies[0],
          position: {
            x: 120 + xOffset,
            y: 340
          },
          armor: 0,
          nextAttackAtMs: 1
        }
      ]
    });
    const atEdge = makeBossAttackRun(425);
    const outsideEdge = makeBossAttackRun(426);

    const edgeImpact = stepCombat(stepCombat(atEdge, {}, 80), {}, 420);
    const outsideImpact = stepCombat(stepCombat(outsideEdge, {}, 80), {}, 420);

    expect(atEdge.enemies[0].hurtbox.width).toBe(190);
    expect(edgeImpact.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "player-hit",
          skillId: "taotie-flame-breath"
        })
      ])
    );
    expect(outsideImpact.events.some((event) => event.kind === "player-hit" && event.skillId === "taotie-flame-breath")).toBe(false);
    expect(outsideImpact.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          skillId: "taotie-flame-breath",
          phase: "miss"
        })
      ])
    );
  });

  it("makes taotie flame breath a sustained multi-hit boss skill", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      kind: "boss",
      hp: 520,
      maxHp: 520,
      armor: 80,
      nextAttackAtMs: 1
    });
    const telegraph = stepCombat(run, {}, 80);
    const firstPulse = stepCombat(telegraph, {}, 430);
    const secondPulse = stepCombat(firstPulse, {}, 180);
    const thirdPulse = stepCombat(secondPulse, {}, 240);
    const secondPulseAtMs = 500 + (firstPulse.player.hitstopUntilMs - firstPulse.elapsedMs) + 180;
    const thirdPulseAtMs = secondPulseAtMs + 180;
    const attackPulses = thirdPulse.events.filter(
      (event): event is CombatEnemyAttackEvent =>
        event.kind === "enemy-attack" && event.skillId === "taotie-flame-breath" && event.phase === "active"
    );
    const playerHits = thirdPulse.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-flame-breath"
    );

    expect(attackPulses).toHaveLength(3);
    expect(attackPulses.map((event) => event.occurredAtMs)).toEqual([500, secondPulseAtMs, thirdPulseAtMs]);
    expect(attackPulses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ hitIndex: 1, totalHits: 3, vfxCue: "taotie-flame-breath-sustain" }),
        expect.objectContaining({ hitIndex: 2, totalHits: 3, vfxCue: "taotie-flame-breath-sustain" }),
        expect.objectContaining({ hitIndex: 3, totalHits: 3, vfxCue: "taotie-flame-breath-sustain" })
      ])
    );
    expect(playerHits).toHaveLength(3);
    expect(playerHits.map((event) => event.occurredAtMs)).toEqual([500, secondPulseAtMs, thirdPulseAtMs]);
    expect(thirdPulse.enemies[0].attackHitResolved).toBe(true);
  });

  it("still lets taotie flame breath hit an airborne player", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 220,
        y: 340,
        hp: 999,
        maxHp: 999,
        actionLockUntilMs: 0,
        hurtLockUntilMs: 0
      },
      enemies: [
        {
          ...baseRun.enemies[0],
          attackProfileId: "taotie-flame-breath",
          attackPatternIds: ["taotie-flame-breath"],
          nextAttackPatternIndex: 0,
          position: { x: 350, y: 340 },
          nextAttackAtMs: 0
        }
      ]
    };
    const jumped = performAction(run, { type: "jump" });
    const telegraph = stepCombat(jumped, {}, 1);
    const impacted = stepCombat(telegraph, {}, 420);

    expect(jumped.player.airborneUntilMs).toBeGreaterThan(impacted.enemies[0].attackImpactAtMs ?? 0);
    expect(impacted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          skillId: "taotie-flame-breath",
          phase: "active"
        }),
        expect.objectContaining({
          kind: "player-hit",
          skillId: "taotie-flame-breath"
        })
      ])
    );
    expect(impacted.player.hp).toBeLessThan(run.player.hp);
  });

  it("pulls the player during taotie devour windup before the close bite impact", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 160,
        y: 340,
        hp: 999,
        maxHp: 999
      },
      enemies: [
        {
          ...baseRun.enemies[0],
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
    };
    const telegraph = stepCombat(run, {}, 80);
    const midPull = stepCombat(telegraph, {}, 200);
    const impacted = stepCombat(midPull, {}, 260);
    const active = impacted.events.find(
      (event) => event.kind === "enemy-attack" && event.skillId === "taotie-devour-pull" && event.phase === "active"
    );
    const playerHit = impacted.events.find(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-devour-pull"
    );

    expect(telegraph.player.hp).toBe(run.player.hp);
    expect(telegraph.player.x).toBe(run.player.x);
    expect(midPull.player.x).toBeGreaterThan(run.player.x);
    expect(midPull.player.x).toBeLessThan(impacted.enemies[0].position.x);
    expect((telegraph.enemies[0] as { attackPullStartPosition?: unknown }).attackPullStartPosition).toBeDefined();
    expect((telegraph.enemies[0] as { attackPullTargetPosition?: unknown }).attackPullTargetPosition).toBeDefined();
    expect(active).toMatchObject({
      occurredAtMs: 540,
      impactAtMs: 540,
      hitIndex: 1,
      totalHits: 1,
      vfxCue: "taotie-devour-bite",
      vfxWindowMs: 560
    });
    expect(playerHit).toMatchObject({
      damage: expect.any(Number),
      occurredAtMs: 540,
      hitstopMs: 76,
      feedbackCue: "player-hurt-devoured"
    });
    expect(playerHit?.damage ?? 0).toBeGreaterThan(50);
    expect(impacted.player.hurtLockUntilMs).toBeGreaterThan(impacted.elapsedMs);
  });

  it("still lets taotie devour bite hit an airborne player after the pull", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 160,
        y: 340,
        hp: 999,
        maxHp: 999,
        actionLockUntilMs: 0,
        hurtLockUntilMs: 0
      },
      enemies: [
        {
          ...baseRun.enemies[0],
          attackProfileId: "taotie-devour-pull",
          attackPatternIds: ["taotie-devour-pull"],
          nextAttackPatternIndex: 0,
          position: { x: 520, y: 340 },
          nextAttackAtMs: 0
        }
      ]
    };
    const jumped = performAction(run, { type: "jump" });
    const telegraph = stepCombat(jumped, {}, 1);
    const impacted = stepCombat(telegraph, {}, 460);

    expect(jumped.player.airborneUntilMs).toBeGreaterThan(impacted.enemies[0].attackImpactAtMs ?? 0);
    expect(impacted.player.x).toBeGreaterThan(run.player.x);
    expect(impacted.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          skillId: "taotie-devour-pull",
          phase: "active"
        }),
        expect.objectContaining({
          kind: "player-hit",
          skillId: "taotie-devour-pull"
        })
      ])
    );
    expect(impacted.player.hp).toBeLessThan(run.player.hp);
  });

  it("still applies taotie devour pull when a frame jumps past the bite impact", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 160,
        y: 340,
        hp: 999,
        maxHp: 999
      },
      enemies: [
        {
          ...baseRun.enemies[0],
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
    };
    const telegraph = stepCombat(run, {}, 80);
    const jumpedPastImpact = stepCombat(telegraph, {}, 500);
    const playerHit = jumpedPastImpact.events.find(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-devour-pull"
    );

    expect(jumpedPastImpact.elapsedMs).toBeGreaterThan(telegraph.enemies[0].attackImpactAtMs ?? 0);
    expect(jumpedPastImpact.player.x).toBeGreaterThan(run.player.x);
    expect(playerHit).toMatchObject({
      occurredAtMs: 540,
      feedbackCue: "player-hurt-devoured"
    });
  });

  it("resolves taotie devour bite before delayed player skill effects that cross the bite frame", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100)),
      "mountain-cracking-smith"
    );
    const baseRun = reachBossRoom(createCombatRun(state, "cinder-kiln-alley"));
    const devourRun: CombatRun = {
      ...baseRun,
      elapsedMs: 0,
      player: {
        ...baseRun.player,
        x: 160,
        y: 340,
        facing: 1,
        hp: 999,
        maxHp: 999,
        actionLockUntilMs: 0,
        hurtLockUntilMs: 0
      },
      enemies: [
        {
          ...baseRun.enemies[0],
          position: {
            x: 515,
            y: 340
          },
          attackProfileId: "taotie-devour-pull",
          attackStartedAtMs: 0,
          attackImpactAtMs: 240,
          attackRecoverUntilMs: 660,
          attackSkillId: "taotie-devour-pull",
          attackHitResolved: false,
          attackResolvedHits: 0,
          attackPullStartPosition: {
            x: 160,
            y: 340
          },
          attackPullTargetPosition: {
            x: 340,
            y: 340
          },
          nextAttackAtMs: 9999
        } as CombatEnemy
      ]
    };
    const cast = performAction(devourRun, { type: "skill", skillId: "mountain-crack-hammer" });
    const jumped = stepCombat(cast, {}, 380);
    const playerHits = jumped.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-devour-pull"
    );

    expect(cast.scheduledEnemyHitEffects.length).toBeGreaterThan(0);
    expect(playerHits).toHaveLength(1);
    expect(playerHits[0]).toMatchObject({
      occurredAtMs: 240,
      feedbackCue: "player-hurt-devoured"
    });
    expect(jumped.player.hp).toBeLessThan(cast.player.hp);
  });

  it("does not keep pulling the player after a dead boss retains stale devour anchors", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run: CombatRun = {
      ...baseRun,
      elapsedMs: 80,
      player: {
        ...baseRun.player,
        x: 160,
        y: 340
      },
      enemies: [
        {
          ...baseRun.enemies[0],
          hp: 0,
          armor: 0,
          position: {
            x: 520,
            y: 340
          },
          attackSkillId: "taotie-devour-pull",
          attackStartedAtMs: 80,
          attackImpactAtMs: 540,
          attackRecoverUntilMs: 960,
          attackPullStartPosition: {
            x: 160,
            y: 340
          },
          attackPullTargetPosition: {
            x: 340,
            y: 340
          },
          nextAttackAtMs: 9999
        } as CombatEnemy
      ]
    };
    const advanced = stepCombat(run, {}, 200);

    expect(advanced.player.x).toBe(run.player.x);
    expect(advanced.events.some((event) => event.kind === "player-hit" && event.skillId === "taotie-devour-pull")).toBe(false);
  });

  it("lets the player sidestep taotie devour pull so the bite misses", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 160,
        y: 340,
        hp: 999,
        maxHp: 999
      },
      enemies: [
        {
          ...baseRun.enemies[0],
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
    };
    const telegraph = stepCombat(run, {}, 80);
    const sidestepped = {
      ...telegraph,
      player: {
        ...telegraph.player,
        y: telegraph.arena.maxY
      }
    };
    const missed = stepCombat(sidestepped, {}, 460);

    expect(missed.player.hp).toBe(run.player.hp);
    expect(missed.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          skillId: "taotie-devour-pull",
          phase: "miss",
          vfxCue: "taotie-devour-bite"
        })
      ])
    );
    expect(missed.events.some((event) => event.kind === "player-hit" && event.skillId === "taotie-devour-pull")).toBe(false);
  });

  it("cancels taotie devour pull and clears pull anchors when staggered", () => {
    const baseRun = reachBossRoom(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const run = {
      ...baseRun,
      player: {
        ...baseRun.player,
        x: 160,
        y: 340
      },
      enemies: [
        {
          ...baseRun.enemies[0],
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
    };
    const telegraph = stepCombat(run, {}, 80);
    const midPull = stepCombat(telegraph, {}, 200);
    const interrupted = applyHit(midPull, {
      id: "test-stagger-taotie-devour",
      targetId: midPull.enemies[0].id,
      damage: 1,
      hitstopMs: 40,
      knockback: 0,
      juggle: false,
      statusTags: ["stagger"]
    });
    const afterImpact = stepCombat(interrupted, {}, 260);

    expect(telegraph.enemies[0].attackSkillId).toBe("taotie-devour-pull");
    expect(interrupted.enemies[0].attackSkillId).toBeUndefined();
    expect((interrupted.enemies[0] as { attackPullStartPosition?: unknown }).attackPullStartPosition).toBeUndefined();
    expect((interrupted.enemies[0] as { attackPullTargetPosition?: unknown }).attackPullTargetPosition).toBeUndefined();
    expect(afterImpact.events.some((event) => event.kind === "enemy-attack" && event.skillId === "taotie-devour-pull" && event.phase !== "windup")).toBe(false);
    expect(afterImpact.events.some((event) => event.kind === "player-hit" && event.skillId === "taotie-devour-pull")).toBe(false);
  });

  it("clears boss skill pulse state when a status hit interrupts the attack", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      kind: "boss",
      hp: 520,
      maxHp: 520,
      armor: 80,
      nextAttackAtMs: 1
    });
    const telegraph = stepCombat(run, {}, 80);
    const firstPulse = stepCombat(telegraph, {}, 430);
    const interrupted = applyHit(firstPulse, {
      id: "test-stagger-taotie-breath",
      targetId: firstPulse.enemies[0].id,
      damage: 1,
      hitstopMs: 40,
      knockback: 0,
      juggle: false,
      statusTags: ["stagger"]
    });

    expect(firstPulse.enemies[0].attackResolvedHits).toBe(1);
    expect(interrupted.enemies[0].attackSkillId).toBeUndefined();
    expect(interrupted.enemies[0].attackHitResolved).toBeUndefined();
    expect(interrupted.enemies[0].attackResolvedHits).toBeUndefined();
  });

  it("builds iron guard resource when the guardian is hit", () => {
    const state = selectBaseClass(createInitialState(), "iron-forge-guardian");
    const run = withEnemyInRange(createCombatRun(state, "cinder-kiln-alley"));
    const telegraph = stepCombat(run, {}, 80);
    const impacted = stepCombat(telegraph, {}, 360);

    expect(impacted.player.resource.id).toBe("guard");
    expect(impacted.player.resource.current).toBeGreaterThan(run.player.resource.current);
    expect(impacted.player.heat).toBe(impacted.player.resource.current);
  });

  it("blocks player attacks while monster-hit hurt lock is active", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const telegraph = stepCombat(run, {}, 80);
    const impacted = stepCombat(telegraph, {}, 360);
    const hitEventsBefore = impacted.events.filter((event) => event.kind === "hit").length;
    const hpBefore = impacted.enemies[0].hp;
    const attempted = performAction(impacted, { type: "light" });

    expect(impacted.player.hurtLockUntilMs).toBeGreaterThan(impacted.elapsedMs);
    expect(attempted.enemies[0].hp).toBe(hpBefore);
    expect(attempted.events.filter((event) => event.kind === "hit")).toHaveLength(hitEventsBefore);
    expect(attempted.player.comboStep).toBe(impacted.player.comboStep);
  });

  it("lets the player dodge monster skills by leaving the attack lane", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"));
    const telegraph = stepCombat(run, {}, 80);
    const dodged = stepCombat(
      {
        ...telegraph,
        player: {
          ...telegraph.player,
          y: telegraph.arena.maxY
        }
      },
      {},
      360
    );

    expect(dodged.player.hp).toBe(run.player.hp);
    expect(dodged.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "enemy-attack",
          enemyId: dodged.enemies[0].id,
          phase: "miss"
        })
      ])
    );
    expect(dodged.events.some((event) => event.kind === "player-hit")).toBe(false);
  });

  it("marks the combat run failed when monster attacks drop player HP to zero", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      kind: "boss",
      hp: 520,
      maxHp: 520,
      armor: 0,
      nextAttackAtMs: 1
    });
    const lowHpRun = {
      ...run,
      player: {
        ...run.player,
        hp: 40
      }
    };
    const telegraph = stepCombat(lowHpRun, {}, 80);
    const defeated = stepCombat(telegraph, {}, 520);

    expect(defeated.player.hp).toBe(0);
    expect(defeated.player.defeated).toBe(true);
    expect(defeated.failed).toBe(true);
    expect(() => finishRoom(defeated)).toThrow(/failed combat/i);
  });
});

describe("room completion", () => {
  it("blocks combat actions after room clear while still allowing gate movement", () => {
    const run = createCombatRun(withHeat(createInitialState(), 100), "cinder-kiln-alley");
    const cleared = defeatAll(run);
    const light = performAction(cleared, { type: "light" });
    const skill = performAction(cleared, { type: "skill", skillId: "anvil-crash" });
    const moved = stepCombat(cleared, { moveX: 1, moveY: 0, dash: true }, 80);

    expect(light.events).toHaveLength(cleared.events.length);
    expect(light.scheduledEnemyHitEffects).toHaveLength(0);
    expect(light.scheduledMissEffects).toHaveLength(0);
    expect(light.player.normalAttackType).toBe("none");
    expect(skill.events.filter((event) => event.kind === "skill-cast")).toHaveLength(0);
    expect(skill.scheduledEnemyHitEffects).toHaveLength(0);
    expect(skill.scheduledMissEffects).toHaveLength(0);
    expect(skill.player.resource.current).toBe(cleared.player.resource.current);
    expect(skillCooldownRemaining(skill, "anvil-crash")).toBe(0);
    expect(moved.player.x).toBeGreaterThan(cleared.player.x);
  });

  it("opens a room gate after clear and requires walking to it before entering the next room", () => {
    const run = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const defeated = defeatAll(run);
    const gate = roomGateForRun(defeated);

    expect(roomGateForRun(run).state).toBe("locked");
    expect(gate.state).toBe("open");
    expect(gate.x).toBeGreaterThan(850);
    expect(() => enterRoomGate(defeated)).toThrow(/gate/i);

    const atGate = {
      ...defeated,
      player: {
        ...defeated.player,
        x: gate.x,
        y: gate.y
      }
    };
    const entering = enterRoomGate(atGate);
    const transition = (
      entering as CombatRun & {
        roomTransition?: {
          state: string;
          fromRoomIndex: number;
          targetRoomIndex?: number;
          gateState: string;
          completeAtMs: number;
        };
      }
    ).roomTransition;
    const blockedMove = stepCombat(entering, { moveX: -1, moveY: 0, dash: true }, 160);
    const blockedAttack = performAction(entering, { type: "light" });
    const next = completeRoomGateTransition(entering);

    expect(entering.roomIndex).toBe(0);
    expect(transition).toMatchObject({
      state: "entering",
      fromRoomIndex: 0,
      targetRoomIndex: 1,
      gateState: "open"
    });
    expect(entering.player.actionLockUntilMs).toBeGreaterThan(entering.elapsedMs);
    expect(blockedMove.roomIndex).toBe(0);
    expect(blockedMove.player.x).toBe(entering.player.x);
    expect(blockedAttack.events).toHaveLength(entering.events.length);
    expect(blockedAttack.player.bufferedAction).toBeUndefined();
    expect(next.roomIndex).toBe(1);
    expect(next.player.x).toBeLessThan(220);
    expect(next.enemies.length).toBeGreaterThan(0);
    expect(next.lootEvents.at(-1)).toMatchObject({
      dungeonId: "cinder-kiln-alley",
      roomIndex: 0,
      gold: 120,
      ironDust: 6
    });
    expect(next.events.at(-1)?.kind).toBe("room-cleared");
  });

  it("marks the boss door and final clear gate distinctly", () => {
    const run = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const roomOne = completeRoomGateTransition(enterRoomGate({
      ...defeatAll(run),
      player: {
        ...run.player,
        x: roomGateForRun(defeatAll(run)).x,
        y: roomGateForRun(defeatAll(run)).y
      }
    }));
    const bossGateRun = defeatAll(roomOne);
    const bossGate = roomGateForRun(bossGateRun);
    const bossRoom = completeRoomGateTransition(enterRoomGate({
      ...bossGateRun,
      player: {
        ...bossGateRun.player,
        x: bossGate.x,
        y: bossGate.y
      }
    }));
    const finalClear = defeatAll(bossRoom);

    expect(bossGate.state).toBe("boss");
    expect(roomGateForRun(finalClear).state).toBe("complete");
  });

  it("emits loot when a room is cleared and spawns the next room", () => {
    const run = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const defeated = defeatAll(run);
    const next = finishRoom(defeated);

    expect(next.roomIndex).toBe(1);
    expect(next.lootEvents.at(-1)).toMatchObject({
      dungeonId: "cinder-kiln-alley",
      roomIndex: 0,
      gold: 120,
      ironDust: 6
    });
    expect(next.enemies.length).toBeGreaterThan(0);
    expect(next.events.at(-1)?.kind).toBe("room-cleared");
  });
});
