import { catalog } from "../data/catalog";
import type { DungeonId, GameState } from "./types";
import type { CombatInput } from "./input";
import { evaluateCombatProfile, type CombatProfile } from "../systems/builds";

export type EnemyKind = "trash" | "elite" | "boss";
export type CombatActionInput = { type: "light" } | { type: "heavy" } | { type: "skill"; skillId: string };

export interface CombatVector {
  x: number;
  y: number;
}

export interface CombatEnemy {
  id: string;
  displayName: string;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  armor: number;
  position: CombatVector;
  airborne: boolean;
  downed: boolean;
  nextAttackAtMs: number;
  attackStartedAtMs?: number;
  attackImpactAtMs?: number;
  attackRecoverUntilMs?: number;
  attackSkillId?: string;
  attackHitResolved?: boolean;
}

export interface CombatPlayer {
  x: number;
  y: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  heat: number;
  comboStep: number;
  actionLockUntilMs: number;
  cancelWindowUntilMs: number;
  hitstopUntilMs: number;
  invulnerableUntilMs: number;
  hurtLockUntilMs: number;
  defeated: boolean;
  skillCooldowns: Record<string, number>;
}

export interface CombatArena {
  width: number;
  height: number;
  minY: number;
  maxY: number;
}

export interface CombatHitEvent {
  kind: "hit";
  id: string;
  action?: "light" | "heavy" | "skill" | "test";
  skillId?: string;
  targetId: string;
  damage: number;
  occurredAtMs: number;
  inputToHitMs: number;
  hitstopMs: number;
  canceledFromCombo: boolean;
}

export interface CombatRoomClearedEvent {
  kind: "room-cleared";
  dungeonId: DungeonId;
  roomIndex: number;
}

export interface CombatEnemyAttackEvent {
  kind: "enemy-attack";
  id: string;
  enemyId: string;
  skillId: string;
  phase: "windup" | "active" | "miss";
  occurredAtMs: number;
  impactAtMs: number;
}

export interface CombatPlayerHitEvent {
  kind: "player-hit";
  id: string;
  enemyId: string;
  skillId: string;
  damage: number;
  occurredAtMs: number;
  hitstopMs: number;
}

export type CombatEvent = CombatHitEvent | CombatRoomClearedEvent | CombatEnemyAttackEvent | CombatPlayerHitEvent;

export interface CombatLootEvent {
  dungeonId: DungeonId;
  roomIndex: number;
  gold: number;
  ironDust: number;
  arcShard: number;
  gearDropId?: string;
}

export interface CombatRun {
  state: GameState;
  dungeonId: DungeonId;
  roomIndex: number;
  elapsedMs: number;
  arena: CombatArena;
  player: CombatPlayer;
  combatProfile: CombatProfile;
  enemies: CombatEnemy[];
  events: CombatEvent[];
  lootEvents: CombatLootEvent[];
  completed: boolean;
  failed: boolean;
}

export interface HitDefinition {
  id: string;
  targetId: string;
  damage: number;
  hitstopMs: number;
  knockback: number;
  juggle: boolean;
  action?: CombatHitEvent["action"];
  skillId?: string;
  inputToHitMs?: number;
  canceledFromCombo?: boolean;
}

interface EnemyAttackDefinition {
  skillId: string;
  damage: number;
  rangeX: number;
  laneRange: number;
  windupMs: number;
  recoveryMs: number;
  cooldownMs: number;
  hitstopMs: number;
  knockback: number;
}

const arena: CombatArena = {
  width: 960,
  height: 540,
  minY: 260,
  maxY: 430
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getDungeon(dungeonId: string) {
  return catalog.dungeons.find((dungeon) => dungeon.id === dungeonId);
}

function enemyStats(kind: EnemyKind): Pick<CombatEnemy, "displayName" | "hp" | "maxHp" | "armor"> {
  if (kind === "boss") {
    return { displayName: "琉璃监工", hp: 520, maxHp: 520, armor: 80 };
  }

  if (kind === "elite") {
    return { displayName: "窑巷卫士", hp: 180, maxHp: 180, armor: 30 };
  }

  return { displayName: "灰烬小妖", hp: 80, maxHp: 80, armor: 0 };
}

function enemyAttackDefinition(kind: EnemyKind): EnemyAttackDefinition {
  if (kind === "boss") {
    return {
      skillId: "taotie-flame-breath",
      damage: 88,
      rangeX: 310,
      laneRange: 86,
      windupMs: 420,
      recoveryMs: 360,
      cooldownMs: 2200,
      hitstopMs: 60,
      knockback: 84
    };
  }

  if (kind === "elite") {
    return {
      skillId: "zheng-shockwave",
      damage: 52,
      rangeX: 230,
      laneRange: 68,
      windupMs: 360,
      recoveryMs: 300,
      cooldownMs: 1800,
      hitstopMs: 48,
      knockback: 64
    };
  }

  return {
    skillId: "ash-ember-spit",
    damage: 28,
    rangeX: 190,
    laneRange: 58,
    windupMs: 280,
    recoveryMs: 240,
    cooldownMs: 1500,
    hitstopMs: 36,
    knockback: 42
  };
}

function createEnemy(dungeonId: DungeonId, roomIndex: number, enemyIndex: number, kind: EnemyKind): CombatEnemy {
  const stats = enemyStats(kind);

  return {
    id: `${dungeonId}-room-${roomIndex}-enemy-${enemyIndex}`,
    kind,
    ...stats,
    position: {
      x: 520 + enemyIndex * 74,
      y: 320 + (enemyIndex % 2) * 34
    },
    airborne: false,
    downed: false,
    nextAttackAtMs: (kind === "boss" ? 650 : kind === "elite" ? 760 : 700) + enemyIndex * 220
  };
}

function createRoomEnemies(dungeonId: DungeonId, roomIndex: number): CombatEnemy[] {
  const dungeon = getDungeon(dungeonId);

  if (!dungeon) {
    throw new Error(`Unknown dungeon: ${dungeonId}`);
  }

  if (roomIndex === dungeon.rooms - 1) {
    return [createEnemy(dungeonId, roomIndex, 0, "boss")];
  }

  if (roomIndex === dungeon.rooms - 2) {
    return [createEnemy(dungeonId, roomIndex, 0, "elite"), createEnemy(dungeonId, roomIndex, 1, "trash")];
  }

  return [createEnemy(dungeonId, roomIndex, 0, "trash"), createEnemy(dungeonId, roomIndex, 1, "trash")];
}

function firstAliveEnemy(run: CombatRun): CombatEnemy {
  const enemy = run.enemies.find((item) => item.hp > 0);

  if (!enemy) {
    throw new Error("No alive enemy target");
  }

  return enemy;
}

function eventHitstop(enemy: CombatEnemy, hitstopMs: number): number {
  if (enemy.kind === "boss" && enemy.armor > 0) {
    return Math.min(hitstopMs, 25);
  }

  return hitstopMs;
}

function playerDamage(run: CombatRun, baseDamage: number): number {
  return Math.max(1, Math.round(baseDamage * run.combatProfile.damageMultiplier));
}

function playerResourceGain(run: CombatRun, baseGain: number): number {
  return Math.max(0, Math.round(baseGain * run.combatProfile.resourceGainMultiplier));
}

function playerCooldownMs(run: CombatRun, baseCooldownMs: number): number {
  return Math.max(250, Math.round(baseCooldownMs * run.combatProfile.cooldownMultiplier));
}

export function createCombatRun(state: GameState, dungeonId: string): CombatRun {
  const dungeon = getDungeon(dungeonId);
  const combatProfile = evaluateCombatProfile(state);

  if (!dungeon) {
    throw new Error(`Unknown dungeon: ${dungeonId}`);
  }

  if (!state.player.unlockedDungeons.includes(dungeon.id)) {
    throw new Error(`Locked dungeon: ${dungeonId}`);
  }

  return {
    state,
    dungeonId: dungeon.id,
    roomIndex: 0,
    elapsedMs: 0,
    arena,
    combatProfile,
    player: {
      x: 160,
      y: 345,
      facing: 1,
      hp: combatProfile.maxHp,
      maxHp: combatProfile.maxHp,
      heat: state.player.heat,
      comboStep: 0,
      actionLockUntilMs: 0,
      cancelWindowUntilMs: 0,
      hitstopUntilMs: 0,
      invulnerableUntilMs: 0,
      hurtLockUntilMs: 0,
      defeated: false,
      skillCooldowns: {}
    },
    enemies: createRoomEnemies(dungeon.id, 0),
    events: [],
    lootEvents: [],
    completed: false,
    failed: false
  };
}

export function stepCombat(run: CombatRun, input: CombatInput, dtMs: number): CombatRun {
  const elapsedMs = run.elapsedMs + dtMs;
  const moveX = input.moveX ?? 0;
  const moveY = input.moveY ?? 0;
  const speed = input.dash ? 0.42 : 0.24;
  const nextX = clamp(run.player.x + moveX * speed * dtMs, 0, run.arena.width);
  const nextY = clamp(run.player.y + moveY * speed * dtMs, run.arena.minY, run.arena.maxY);
  const facing = moveX === 0 ? run.player.facing : moveX > 0 ? 1 : -1;
  const movedRun: CombatRun = {
    ...run,
    elapsedMs,
    player: {
      ...run.player,
      x: nextX,
      y: nextY,
      facing
    }
  };

  if (run.completed || run.failed) {
    return movedRun;
  }

  return advanceEnemyAttacks(movedRun);
}

function hasActiveEnemyAttack(enemy: CombatEnemy, elapsedMs: number): boolean {
  return Boolean(
    enemy.attackSkillId &&
      enemy.attackImpactAtMs !== undefined &&
      enemy.attackRecoverUntilMs !== undefined &&
      elapsedMs < enemy.attackRecoverUntilMs
  );
}

function clearRecoveredAttack(enemy: CombatEnemy, elapsedMs: number): CombatEnemy {
  if (enemy.attackRecoverUntilMs !== undefined && elapsedMs >= enemy.attackRecoverUntilMs) {
    return {
      ...enemy,
      attackStartedAtMs: undefined,
      attackImpactAtMs: undefined,
      attackRecoverUntilMs: undefined,
      attackSkillId: undefined,
      attackHitResolved: undefined
    };
  }

  return enemy;
}

function beginEnemyAttack(enemy: CombatEnemy, elapsedMs: number): { enemy: CombatEnemy; event?: CombatEnemyAttackEvent } {
  const recovered = clearRecoveredAttack(enemy, elapsedMs);

  if (recovered.hp <= 0 || hasActiveEnemyAttack(recovered, elapsedMs) || elapsedMs < recovered.nextAttackAtMs) {
    return { enemy: recovered };
  }

  const attack = enemyAttackDefinition(recovered.kind);
  const impactAtMs = elapsedMs + attack.windupMs;

  return {
    enemy: {
      ...recovered,
      attackStartedAtMs: elapsedMs,
      attackImpactAtMs: impactAtMs,
      attackRecoverUntilMs: impactAtMs + attack.recoveryMs,
      attackSkillId: attack.skillId,
      attackHitResolved: false,
      nextAttackAtMs: elapsedMs + attack.cooldownMs
    },
    event: {
      kind: "enemy-attack",
      id: `enemy-attack-${elapsedMs}-${recovered.id}-windup`,
      enemyId: recovered.id,
      skillId: attack.skillId,
      phase: "windup",
      occurredAtMs: elapsedMs,
      impactAtMs
    }
  };
}

function playerInEnemyAttackRange(enemy: CombatEnemy, player: CombatPlayer, attack: EnemyAttackDefinition): boolean {
  const xDistance = Math.abs(enemy.position.x - player.x);
  const yDistance = Math.abs(enemy.position.y - player.y);

  return xDistance <= attack.rangeX && yDistance <= attack.laneRange;
}

function applyEnemyImpact(
  enemy: CombatEnemy,
  player: CombatPlayer,
  elapsedMs: number,
  combatProfile: CombatProfile
): { enemy: CombatEnemy; player: CombatPlayer; events: CombatEvent[]; failed: boolean } {
  if (
    enemy.hp <= 0 ||
    !enemy.attackSkillId ||
    enemy.attackImpactAtMs === undefined ||
    enemy.attackHitResolved ||
    elapsedMs < enemy.attackImpactAtMs
  ) {
    return { enemy, player, events: [], failed: player.defeated };
  }

  const attack = enemyAttackDefinition(enemy.kind);
  const phase = playerInEnemyAttackRange(enemy, player, attack) ? "active" : "miss";
  const attackEvent: CombatEnemyAttackEvent = {
    kind: "enemy-attack",
    id: `enemy-attack-${elapsedMs}-${enemy.id}-${phase}`,
    enemyId: enemy.id,
    skillId: attack.skillId,
    phase,
    occurredAtMs: elapsedMs,
    impactAtMs: enemy.attackImpactAtMs
  };
  const resolvedEnemy = {
    ...enemy,
    attackHitResolved: true
  };

  if (phase === "miss" || player.defeated || elapsedMs < player.invulnerableUntilMs) {
    return { enemy: resolvedEnemy, player, events: [attackEvent], failed: player.defeated };
  }

  const damage = Math.max(1, Math.round(attack.damage * combatProfile.damageTakenMultiplier));
  const nextHp = Math.max(0, player.hp - damage);
  const nextFacing: 1 | -1 = enemy.position.x >= player.x ? 1 : -1;
  const hitEvent: CombatPlayerHitEvent = {
    kind: "player-hit",
    id: `player-hit-${elapsedMs}-${enemy.id}`,
    enemyId: enemy.id,
    skillId: attack.skillId,
    damage,
    occurredAtMs: elapsedMs,
    hitstopMs: attack.hitstopMs
  };
  const nextPlayer: CombatPlayer = {
    ...player,
    hp: nextHp,
    x: clamp(player.x - nextFacing * attack.knockback, 0, arena.width),
    facing: nextFacing,
    hitstopUntilMs: Math.max(player.hitstopUntilMs, elapsedMs + attack.hitstopMs),
    invulnerableUntilMs: elapsedMs + 560,
    hurtLockUntilMs: elapsedMs + attack.hitstopMs,
    defeated: nextHp <= 0
  };

  return { enemy: resolvedEnemy, player: nextPlayer, events: [attackEvent, hitEvent], failed: nextHp <= 0 };
}

function advanceEnemyAttacks(run: CombatRun): CombatRun {
  let player = run.player;
  let failed = run.failed;
  const events: CombatEvent[] = [];
  const enemies = run.enemies.map((enemy) => {
    const started = beginEnemyAttack(enemy, run.elapsedMs);

    if (started.event) {
      events.push(started.event);
    }

    const impacted = applyEnemyImpact(started.enemy, player, run.elapsedMs, run.combatProfile);

    player = impacted.player;
    failed = failed || impacted.failed;
    events.push(...impacted.events);

    return impacted.enemy;
  });

  return {
    ...run,
    player,
    enemies,
    events: [...run.events, ...events],
    failed
  };
}

export function applyHit(run: CombatRun, hit: HitDefinition): CombatRun {
  const target = run.enemies.find((enemy) => enemy.id === hit.targetId);

  if (!target) {
    throw new Error(`Unknown combat target: ${hit.targetId}`);
  }

  const hitstopMs = eventHitstop(target, hit.hitstopMs);
  const nextEnemies = run.enemies.map((enemy) => {
    if (enemy.id !== hit.targetId) {
      return enemy;
    }

    const armorDamage = Math.min(enemy.armor, hit.damage);
    const hpDamage = hit.damage - armorDamage;

    return {
      ...enemy,
      hp: Math.max(0, enemy.hp - hpDamage),
      armor: Math.max(0, enemy.armor - armorDamage),
      position: {
        ...enemy.position,
        x: enemy.position.x + hit.knockback * run.player.facing
      },
      airborne: hit.juggle,
      downed: !hit.juggle && enemy.hp - hpDamage <= 0
    };
  });
  const event: CombatHitEvent = {
    kind: "hit",
    id: hit.id,
    action: hit.action ?? "test",
    skillId: hit.skillId,
    targetId: hit.targetId,
    damage: hit.damage,
    occurredAtMs: run.elapsedMs,
    inputToHitMs: hit.inputToHitMs ?? 0,
    hitstopMs,
    canceledFromCombo: hit.canceledFromCombo ?? false
  };

  return {
    ...run,
    enemies: nextEnemies,
    events: [...run.events, event],
    player: {
      ...run.player,
      hitstopUntilMs: Math.max(run.player.hitstopUntilMs, run.elapsedMs + hitstopMs)
    }
  };
}

export function performAction(run: CombatRun, action: CombatActionInput): CombatRun {
  if (run.failed || run.player.defeated) {
    return run;
  }

  const locked = run.elapsedMs < run.player.actionLockUntilMs;
  const canceledFromCombo = action.type === "skill" && run.elapsedMs <= run.player.cancelWindowUntilMs && run.player.comboStep > 0;

  if (locked && !canceledFromCombo) {
    return run;
  }

  const target = firstAliveEnemy(run);

  if (action.type === "light") {
    const hitRun = applyHit(run, {
      id: `hit-${run.elapsedMs}-light-${run.player.comboStep + 1}`,
      targetId: target.id,
      damage: playerDamage(run, 24),
      hitstopMs: 42,
      knockback: 22,
      juggle: false,
      action: "light",
      inputToHitMs: 55
    });

    return {
      ...hitRun,
      player: {
        ...hitRun.player,
        heat: clamp(hitRun.player.heat + playerResourceGain(run, 8), 0, 100),
        comboStep: (run.player.comboStep % 3) + 1,
        actionLockUntilMs: run.elapsedMs + 180,
        cancelWindowUntilMs: run.elapsedMs + 180
      }
    };
  }

  if (action.type === "heavy") {
    const hitRun = applyHit(run, {
      id: `hit-${run.elapsedMs}-heavy`,
      targetId: target.id,
      damage: playerDamage(run, 48),
      hitstopMs: 72,
      knockback: 60,
      juggle: true,
      action: "heavy",
      inputToHitMs: 85
    });

    return {
      ...hitRun,
      player: {
        ...hitRun.player,
        heat: clamp(hitRun.player.heat + playerResourceGain(run, 4), 0, 100),
        comboStep: 0,
        actionLockUntilMs: run.elapsedMs + 260,
        cancelWindowUntilMs: 0
      }
    };
  }

  const skill = catalog.classSkills.find((item) => item.id === action.skillId && item.classId === run.state.player.classId);

  if (!skill) {
    throw new Error(`Unknown class skill: ${action.skillId}`);
  }

  if (run.player.heat < skill.resourceCost) {
    throw new Error(`Insufficient class resource for skill: ${action.skillId}`);
  }

  if (skillCooldownRemaining(run, action.skillId) > 0) {
    throw new Error(`Skill on cooldown: ${action.skillId}`);
  }

  const hitRun = applyHit(run, {
    id: `hit-${run.elapsedMs}-skill-${action.skillId}`,
    targetId: target.id,
    damage: playerDamage(run, 38 + Math.round(skill.resourceCost / 4)),
    hitstopMs: 82,
    knockback: 48,
    juggle: skill.tags.includes("launcher") || skill.tags.includes("pull"),
    action: "skill",
    skillId: action.skillId,
    inputToHitMs: 70,
    canceledFromCombo
  });

  return {
    ...hitRun,
    player: {
      ...hitRun.player,
      heat: clamp(hitRun.player.heat - skill.resourceCost + playerResourceGain(run, skill.resourceGain), 0, 100),
      comboStep: 0,
      actionLockUntilMs: run.elapsedMs + 420,
      cancelWindowUntilMs: 0,
      skillCooldowns: {
        ...hitRun.player.skillCooldowns,
        [skill.id]: run.elapsedMs + playerCooldownMs(run, skill.cooldownMs)
      }
    }
  };
}

export function skillCooldownRemaining(run: CombatRun, skillId: string): number {
  return Math.max(0, (run.player.skillCooldowns[skillId] ?? 0) - run.elapsedMs);
}

function createLootEvent(run: CombatRun): CombatLootEvent {
  const dungeonBonus = run.dungeonId === "liuli-furnace" ? 1 : 0;

  return {
    dungeonId: run.dungeonId,
    roomIndex: run.roomIndex,
    gold: 120 + run.roomIndex * 30 + dungeonBonus * 80,
    ironDust: 6 + run.roomIndex * 2,
    arcShard: dungeonBonus,
    gearDropId: run.roomIndex % 2 === 0 ? catalog.gear[run.roomIndex % catalog.gear.length]?.id : undefined
  };
}

export function finishRoom(run: CombatRun): CombatRun {
  if (run.failed || run.player.defeated) {
    throw new Error("Cannot finish failed combat run");
  }

  if (run.enemies.some((enemy) => enemy.hp > 0)) {
    throw new Error("Cannot finish room while enemies are alive");
  }

  const dungeon = getDungeon(run.dungeonId);

  if (!dungeon) {
    throw new Error(`Unknown dungeon: ${run.dungeonId}`);
  }

  const lootEvent = createLootEvent(run);
  const clearedEvent: CombatRoomClearedEvent = {
    kind: "room-cleared",
    dungeonId: run.dungeonId,
    roomIndex: run.roomIndex
  };
  const nextRoomIndex = run.roomIndex + 1;
  const completed = nextRoomIndex >= dungeon.rooms;

  return {
    ...run,
    roomIndex: completed ? run.roomIndex : nextRoomIndex,
    enemies: completed ? [] : createRoomEnemies(run.dungeonId, nextRoomIndex),
    events: [clearedEvent],
    lootEvents: [...run.lootEvents, lootEvent],
    completed
  };
}
