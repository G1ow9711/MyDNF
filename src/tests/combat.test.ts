import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { createInitialState, createOwnedGear } from "../game/state";
import type { GameState, GearSlot, OwnedGearItem } from "../game/types";
import { equipItem } from "../systems/inventory";
import { selectBaseClass } from "../systems/classes";
import { applyQuestEvent, claimQuestReward } from "../systems/quests";
import {
  applyHit,
  createCombatRun,
  finishRoom,
  performAction,
  stepCombat,
  type CombatEnemy,
  type CombatHitEvent,
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

function withPlayerAndEnemies(run: CombatRun, playerPatch: Partial<CombatRun["player"]>, enemyPositions: Array<{ x: number; y: number; hp?: number }>): CombatRun {
  return {
    ...run,
    player: {
      ...run.player,
      ...playerPatch
    },
    enemies: run.enemies.map((enemy, index) => ({
      ...enemy,
      hp: enemyPositions[index]?.hp ?? enemy.hp,
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

    expect(marked.enemies[0].marks).toBe(2);
    expect(detonated.enemies[0].marks).toBe(0);
    expect(latestHitForSkill(detonated, "night-mark-detonation").damage).toBeGreaterThan(50);
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
