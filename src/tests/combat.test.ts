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
    expect(latestHitForSkill(detonated, "night-mark-detonation").damage).toBeGreaterThan(50);
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
    const detonationHits = detonated.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "night-mark-detonation"
    );

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
    expect(detonated.enemies.map((enemy) => enemy.marks)).toEqual([3, 2]);
    expect(detonated.enemies.some((enemy) => enemy.downed)).toBe(false);

    const beforeLock = stepCombat(detonated, {}, 309);

    expect(beforeLock.enemies.map((enemy) => enemy.marks)).toEqual([3, 2]);
    expect(beforeLock.enemies.map((enemy) => enemy.hp)).toEqual([260, 260]);
    expect(beforeLock.enemies.some((enemy) => enemy.downed)).toBe(false);

    const lockFrame = stepCombat(beforeLock, {}, 1);
    const lockHp = lockFrame.enemies.map((enemy) => enemy.hp);

    expect(lockFrame.enemies.map((enemy) => enemy.marks)).toEqual([3, 2]);
    expect(lockHp[0]).toBeLessThan(260);
    expect(lockHp[1]).toBeLessThan(260);
    expect(lockFrame.enemies.some((enemy) => enemy.downed)).toBe(false);

    const burstFrame = stepCombat(lockFrame, {}, 180);

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
    const stepHits = step.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "prism-step");
    const targetIds = [...new Set(stepHits.map((event) => event.targetId))];

    expect(step.player.x).toBeGreaterThanOrEqual(344);
    expect(stepHits).toHaveLength(2);
    expect(targetIds).toHaveLength(2);
    expect(stepHits.every((event) => (event.hitPhase as string | undefined) === "pierce")).toBe(true);
    expect(stepHits.every((event) => (event.vfxCue as string | undefined) === "prism-pierce")).toBe(true);
    expect(stepHits.every((event) => event.statusTags?.includes("stagger"))).toBe(true);
    expect(step.enemies[0].hp).toBeLessThan(run.enemies[0].hp);
    expect(step.enemies[1].hp).toBeLessThan(run.enemies[1].hp);
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
