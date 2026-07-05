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
  stepCombat,
  type CombatArenaHazardEvent,
  type CombatBossPhaseEvent,
  type CombatEnemyAttackEvent,
  type CombatEnemy,
  type CombatHitEvent,
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
    const input = mapKeyboardToCombatInput(new Set(["KeyD", "KeyW"]));
    const moved = stepCombat(run, input, 100);

    expect(run.dungeonId).toBe("cinder-kiln-alley");
    expect(run.roomIndex).toBe(0);
    expect(run.enemies.length).toBeGreaterThan(0);
    expect(moved.player.x).toBeGreaterThan(run.player.x);
    expect(moved.player.y).toBeLessThan(run.player.y);
    expect(moved.player.x).toBeLessThanOrEqual(moved.arena.width);
    expect(moved.player.y).toBeGreaterThanOrEqual(moved.arena.minY);
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
});

describe("combat actions and impact feel", () => {
  it("lands light attacks inside the 80 ms input-to-hit target and advances combo state", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), { nextAttackAtMs: 9999 });
    const first = performAction(run, { type: "light" });
    const second = performAction(advanceTime(first), { type: "light" });
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
    const first = performAction(run, { type: "light" });
    const second = performAction(advanceTime(first), { type: "light" });
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
    const first = performAction(run, { type: "light" });
    const secondReady = stepCombat(first, {}, first.player.actionLockUntilMs - first.elapsedMs);
    const second = performAction(secondReady, { type: "light" });
    const thirdReady = stepCombat(second, {}, second.player.actionLockUntilMs - second.elapsedMs);
    const third = performAction(thirdReady, { type: "light" });
    const lightHits = third.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.action === "light");

    expect(lightHits.map((event) => event.damage)).toEqual([26, 33, 41]);
    expect(lightHits.map((event) => event.inputToHitMs)).toEqual([55, 65, 78]);
    expect(lightHits[2].actionTags).toEqual(expect.arrayContaining(["launcher"]));
    expect(lightHits.map((event) => event.comboCount)).toEqual([1, 2, 3]);
    expect(third.player.comboStep).toBe(3);
    expect(third.player.actionLockUntilMs).toBe(third.elapsedMs + 240);
    expect(third.enemies[0].airborne).toBe(true);
  });

  it("restarts the normal combo from step one after the hit chain expires", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      hp: 320,
      maxHp: 320,
      nextAttackAtMs: 9999
    });
    const first = performAction(run, { type: "light" });
    const expired = stepCombat(first, {}, 1300);
    const restarted = performAction(expired, { type: "light" });
    const restartHit = lastHitEvent(restarted);

    expect(expired.player.comboStep).toBe(0);
    expect(restarted.player.comboStep).toBe(1);
    expect(restartHit.damage).toBe(26);
    expect(restartHit.inputToHitMs).toBe(55);
    expect(restartHit.comboCount).toBe(1);
  });

  it("keeps launched enemies airborne, blocks their attacks, and then drops them into knockdown", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      hp: 200,
      maxHp: 200,
      nextAttackAtMs: 1
    });
    const launched = performAction(run, { type: "heavy" });
    const airborne = stepCombat(launched, {}, 500);
    const knockedDown = stepCombat(airborne, {}, 650);

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
    const launched = performAction(run, { type: "heavy" });
    const ready = {
      ...stepCombat(launched, {}, 300),
      player: {
        ...stepCombat(launched, {}, 300).player,
        actionLockUntilMs: 0
      }
    };
    const slammed = performAction(ready, { type: "skill", skillId: "anvil-crash" });

    expect(slammed.enemies[0].airborne).toBe(false);
    expect(slammed.enemies[0].downed).toBe(true);
    expect(slammed.enemies[0].downedUntilMs).toBeGreaterThan(slammed.elapsedMs);
    expect(latestHitForSkill(slammed, "anvil-crash").comboCount).toBeGreaterThan(1);
  });

  it("allows a class skill cancel during the hit-confirm window", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), { nextAttackAtMs: 9999 });
    const light = performAction(run, { type: "light" });
    const canceled = performAction(light, { type: "skill", skillId: "spark-combo" });
    const skillHit = lastHitEvent(canceled);

    expect(skillHit).toMatchObject({
      kind: "hit",
      action: "skill",
      skillId: "spark-combo",
      canceledFromCombo: true
    });
    expect(canceled.player.actionLockUntilMs).toBeGreaterThan(light.player.actionLockUntilMs);
    expect(canceled.enemies[0].hp).toBeLessThan(light.enemies[0].hp);
  });

  it("allows a class skill cancel after the third normal combo step", () => {
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
    const first = performAction(run, { type: "light" });
    const second = performAction(stepCombat(first, {}, first.player.actionLockUntilMs - first.elapsedMs), { type: "light" });
    const third = performAction(stepCombat(second, {}, second.player.actionLockUntilMs - second.elapsedMs), { type: "light" });
    const canceled = performAction(third, { type: "skill", skillId: "spark-combo" });
    const skillHit = latestHitForSkill(canceled, "spark-combo");

    expect(third.player.comboStep).toBe(3);
    expect(skillHit.canceledFromCombo).toBe(true);
    expect(canceled.player.actionLockUntilMs).toBeGreaterThan(third.player.actionLockUntilMs);
  });

  it("buffers a queued action near the end of an action lock and releases it on the unlock frame", () => {
    const run = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      hp: 220,
      maxHp: 220,
      nextAttackAtMs: 9999
    });
    const light = performAction(run, { type: "light" });
    const locked = stepCombat(light, {}, 40);
    const queued = performAction(locked, { type: "heavy" });
    const queuedPlayer = queued.player as typeof queued.player & {
      bufferedAction?: { type: string };
      bufferedActionExecuteAtMs?: number;
    };
    const resolved = stepCombat(queued, {}, queuedPlayer.bufferedActionExecuteAtMs ?? 0);
    const heavyHit = [...resolved.events].reverse().find(
      (event): event is CombatHitEvent => event.kind === "hit" && event.action === "heavy"
    );

    expect(queued.events.filter((event) => event.kind === "hit" && event.action === "heavy")).toHaveLength(0);
    expect(queuedPlayer.bufferedAction).toEqual({ type: "heavy" });
    expect(queuedPlayer.bufferedActionExecuteAtMs).toBe(light.player.actionLockUntilMs);
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
    const resolved = stepCombat(queued, {}, queuedPlayer.bufferedActionExecuteAtMs ?? 0);
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
    const light = performAction(run, { type: "light" });
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

    expect(lastHitEvent(recast)).toMatchObject({
      kind: "hit",
      action: "skill",
      skillId: "anvil-crash"
    });
    expect(recast.player.skillCooldowns["anvil-crash"]).toBe(ready.elapsedMs + 5200);
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
    const hit = latestHitForSkill(cast, skill.id);

    expect(hit.inputToHitMs).toBe(skill.animation.hitFrameMs);
    expect(hit.occurredAtMs - run.elapsedMs).toBe(skill.animation.hitFrameMs);
    expect(cast.player.hitstopUntilMs).toBe(hit.occurredAtMs + hit.hitstopMs);
    expect(cast.player.actionLockUntilMs - run.elapsedMs).toBe(skill.animation.durationMs);
  });

  it("uses equipped attack stats and cooldown stats in combat formulas", () => {
    const plainRun = withEnemyInRange(createCombatRun(createInitialState(), "cinder-kiln-alley"), {
      nextAttackAtMs: 9999
    });
    const plainHit = performAction(plainRun, { type: "light" });
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
    const gearedHit = performAction(gearedRun, { type: "light" });
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

    const behind = performAction(behindRun, { type: "light" });
    const far = performAction(farRun, { type: "heavy" });
    const wrongLane = performAction(laneRun, { type: "light" });

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

    const trashHit = performAction(trashRun, { type: "light" });
    const bossHit = performAction(bossRun, { type: "light" });

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

    const hit = performAction(bossRun, { type: "light" });

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
    const hit = performAction(run, { type: "light" });
    const event = lastHitEvent(hit);

    expect(event.targetId).toBe(run.enemies[1].id);
    expect(hit.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
    expect(hit.enemies[0].hp).toBe(run.enemies[0].hp);
  });

  it("lets area skills hit multiple enemies inside the skill hitbox", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 315, y: 340 },
        { x: 390, y: 356 }
      ]
    );
    const cast = performAction(run, { type: "skill", skillId: "heat-bloom" });
    const hitEvents = cast.events.filter((event) => event.kind === "hit");

    expect(hitEvents).toHaveLength(2);
    expect(new Set(hitEvents.map((event) => event.targetId))).toEqual(new Set(run.enemies.map((enemy) => enemy.id)));
    expect(cast.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
    expect(cast.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
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

    expect(latestHitForSkill(burst, "anvil-crash").damage).toBeGreaterThan(latestHitForSkill(normal, "anvil-crash").damage);
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
    const marked = performAction(run, { type: "skill", skillId: "marking-bolt" });
    const ready = {
      ...stepCombat(marked, {}, 500),
      player: {
        ...stepCombat(marked, {}, 500).player,
        actionLockUntilMs: 0
      }
    };
    const detonated = performAction(ready, { type: "skill", skillId: "night-mark-detonation" });
    const resolved = stepCombat(detonated, {}, 490);

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

    const lockFrame = stepToElapsed(beforeLock, lockAtMs);
    const lockHp = lockFrame.enemies.map((enemy) => enemy.hp);

    expect(lockFrame.enemies.map((enemy) => enemy.marks)).toEqual([3, 2]);
    expect(lockHp[0]).toBeLessThan(260);
    expect(lockHp[1]).toBeLessThan(260);
    expect(lockFrame.enemies.some((enemy) => enemy.downed)).toBe(false);

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

    expect(detonated.events.at(-1)).toMatchObject({ kind: "miss", action: "skill", skillId: "night-mark-detonation" });
    expect(detonated.enemies.map((enemy) => enemy.hp)).toEqual(run.enemies.map((enemy) => enemy.hp));
  });

  it("turns shield skills into a visible mitigation window for the next monster hit", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340 }]
    );
    const shielded = performAction(run, { type: "skill", skillId: "molten-wall" });
    const telegraph = stepCombat(
      withEnemyInRange(shielded, {
        nextAttackAtMs: shielded.elapsedMs + 1
      }),
      {},
      80
    );
    const impacted = stepCombat(telegraph, {}, 360);

    expect(shielded.player.shieldUntilMs).toBeGreaterThan(shielded.elapsedMs);
    expect(shielded.player.shieldReduction).toBeGreaterThan(0);
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

  it("turns evade skills into a dodge window that makes monster impact miss", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340 }]
    );
    const evading = performAction(run, { type: "skill", skillId: "crow-feint" });
    const telegraph = stepCombat(
      withEnemyInRange(evading, {
        nextAttackAtMs: evading.elapsedMs + 1
      }),
      {},
      80
    );
    const dodged = stepCombat(telegraph, {}, 360);

    expect(evading.player.evadeUntilMs).toBeGreaterThan(evading.elapsedMs);
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
    expect(countered.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "hit",
          skillId: "mirror-reflect"
        })
      ])
    );
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

    expect(trapped.enemies[0].controlledUntilMs).toBeGreaterThan(trapped.elapsedMs);
    expect(trapped.enemies[0].nextAttackAtMs).toBeGreaterThanOrEqual(trapped.enemies[0].controlledUntilMs ?? 0);

    const breakState = withHeat(createInitialState(), 90);
    const breakRun = withPlayerAndEnemies(
      createCombatRun(breakState, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340 }]
    );
    const broken = performAction(
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

    expect(broken.enemies[0].armorBrokenUntilMs).toBeGreaterThan(broken.elapsedMs);
    expect(broken.enemies[0].armor).toBeLessThan(40);
    expect(broken.enemies[0].nextAttackAtMs).toBeGreaterThan(broken.elapsedMs);
  });

  it("moves dash skills through their startup before resolving the hitbox", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 80), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 470, y: 340 }]
    );

    const dashed = performAction(run, { type: "skill", skillId: "furnace-step" });

    expect(dashed.player.x).toBeGreaterThan(run.player.x + 80);
    expect(latestHitForSkill(dashed, "furnace-step").targetId).toBe(run.enemies[0].id);
    expect(dashed.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
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

    const pulled = performAction(run, { type: "skill", skillId: "heat-bloom" });
    const centerX = run.player.x + 112;

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

    const volley = performAction(run, { type: "skill", skillId: "black-rain-volley" });
    const volleyHits = volley.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "black-rain-volley"
    );
    const hitTimes = [...new Set(volleyHits.map((event) => event.occurredAtMs))];

    expect(volleyHits).toHaveLength(6);
    expect(hitTimes.length).toBeGreaterThan(1);
    expect(Math.max(...hitTimes) - Math.min(...hitTimes)).toBeGreaterThanOrEqual(180);
    expect(volley.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
    expect(volley.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
  });

  it("liuli-rain falls in staggered prism waves on locked targets", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 330, y: 340 },
        { x: 390, y: 356 }
      ]
    );

    const rain = performAction(run, { type: "skill", skillId: "liuli-rain" });
    const rainHits = rain.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "liuli-rain");
    const hitTimes = [...new Set(rainHits.map((event) => event.occurredAtMs))];
    const targetIds = [...new Set(rainHits.map((event) => event.targetId))];

    expect(rainHits).toHaveLength(6);
    expect(hitTimes).toHaveLength(3);
    expect(Math.max(...hitTimes) - Math.min(...hitTimes)).toBeGreaterThanOrEqual(180);
    expect(targetIds).toHaveLength(2);
    expect(targetIds.every((targetId) => rainHits.filter((event) => event.targetId === targetId).length === 3)).toBe(true);
    expect(rainHits.every((event) => event.hitPhase === "rain")).toBe(true);
    expect(rainHits.every((event) => event.vfxCue === "glass-rain-fall")).toBe(true);
    expect(rain.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
    expect(rain.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
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
            x: 240,
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
    expect(cast.scheduledEnemyHitEffects).toHaveLength(4);
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
    expect(cast.scheduledEnemyHitEffects).toHaveLength(4);
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

  it("meteor-knuckle resolves as staged fall and impact hits with forced knockdown", () => {
    const run = withPlayerAndEnemies(
      createCombatRun(withHeat(createInitialState(), 100), "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [
        { x: 330, y: 340, hp: 260, maxHp: 260, armor: 40 },
        { x: 390, y: 356, hp: 220, maxHp: 220, armor: 30 }
      ]
    );

    const meteor = performAction(run, { type: "skill", skillId: "meteor-knuckle" });
    const meteorHits = meteor.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "meteor-knuckle"
    );
    const hitTimes = [...new Set(meteorHits.map((event) => event.occurredAtMs))];
    const meteorPhases = meteorHits.map((event) => event.hitPhase);
    const fallHits = meteorHits.filter((event) => event.hitPhase === "fall");
    const impactHits = meteorHits.filter((event) => event.hitPhase === "impact");

    expect(meteorHits).toHaveLength(4);
    expect(hitTimes).toHaveLength(2);
    expect(Math.max(...hitTimes) - Math.min(...hitTimes)).toBeGreaterThanOrEqual(180);
    expect(meteorPhases).toEqual(["fall", "fall", "impact", "impact"]);
    expect(fallHits.every((event) => event.hitstopMs < impactHits[0].hitstopMs)).toBe(true);
    expect(impactHits.every((event) => event.hitstopMs > 100)).toBe(true);
    expect(impactHits.every((event) => event.statusTags?.includes("guard-break"))).toBe(true);
    expect(impactHits.every((event) => event.actionTags?.includes("knockdown"))).toBe(true);
    expect(meteor.enemies.every((enemy) => enemy.downed && (enemy.downedUntilMs ?? 0) > meteor.elapsedMs)).toBe(true);
    expect(meteor.enemies.every((enemy) => (enemy.armorBrokenUntilMs ?? 0) > meteor.elapsedMs)).toBe(true);
  });

  it("guard skills open a mitigation window like shield skills", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 40);
    const run = withPlayerAndEnemies(
      createCombatRun(state, "cinder-kiln-alley"),
      { x: 240, y: 340, facing: 1 },
      [{ x: 310, y: 340 }]
    );

    const guarded = performAction(run, { type: "skill", skillId: "anvil-guard" });

    expect(guarded.player.shieldUntilMs).toBeGreaterThan(guarded.elapsedMs);
    expect(guarded.player.shieldReduction).toBeGreaterThanOrEqual(0.45);
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
    expect(boss.attackPatternIds).toEqual(["taotie-flame-breath", "taotie-devour-pull"]);
    expect(boss.nextAttackPatternIndex).toBe(0);
  });

  it("rotates the boss next cast from flame breath into devour pull", () => {
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

    expect(firstWindup.enemies[0].attackSkillId).toBe("taotie-flame-breath");
    expect((firstWindup.enemies[0] as { attackProfileId?: string; nextAttackPatternIndex?: number }).attackProfileId).toBe("taotie-devour-pull");
    expect((firstWindup.enemies[0] as { nextAttackPatternIndex?: number }).nextAttackPatternIndex).toBe(1);
    expect(secondWindup.enemies[0].attackSkillId).toBe("taotie-devour-pull");
    expect((secondWindup.enemies[0] as { attackProfileId?: string; nextAttackPatternIndex?: number }).attackProfileId).toBe("taotie-flame-breath");
    expect((secondWindup.enemies[0] as { nextAttackPatternIndex?: number }).nextAttackPatternIndex).toBe(0);
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
    const struck = performAction(run, { type: "light" });

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
    const thirdPulse = stepCombat(secondPulse, {}, 180);
    const attackPulses = thirdPulse.events.filter(
      (event): event is CombatEnemyAttackEvent =>
        event.kind === "enemy-attack" && event.skillId === "taotie-flame-breath" && event.phase === "active"
    );
    const playerHits = thirdPulse.events.filter(
      (event): event is CombatPlayerHitEvent => event.kind === "player-hit" && event.skillId === "taotie-flame-breath"
    );

    expect(attackPulses).toHaveLength(3);
    expect(attackPulses.map((event) => event.occurredAtMs)).toEqual([500, 680, 860]);
    expect(attackPulses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ hitIndex: 1, totalHits: 3, vfxCue: "taotie-flame-breath-sustain" }),
        expect.objectContaining({ hitIndex: 2, totalHits: 3, vfxCue: "taotie-flame-breath-sustain" }),
        expect.objectContaining({ hitIndex: 3, totalHits: 3, vfxCue: "taotie-flame-breath-sustain" })
      ])
    );
    expect(playerHits).toHaveLength(3);
    expect(playerHits.map((event) => event.occurredAtMs)).toEqual([500, 680, 860]);
    expect(thirdPulse.enemies[0].attackHitResolved).toBe(true);
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
    const next = enterRoomGate(atGate);

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
    const roomOne = enterRoomGate({
      ...defeatAll(run),
      player: {
        ...run.player,
        x: roomGateForRun(defeatAll(run)).x,
        y: roomGateForRun(defeatAll(run)).y
      }
    });
    const bossGateRun = defeatAll(roomOne);
    const bossGate = roomGateForRun(bossGateRun);
    const bossRoom = enterRoomGate({
      ...bossGateRun,
      player: {
        ...bossGateRun.player,
        x: bossGate.x,
        y: bossGate.y
      }
    });
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
