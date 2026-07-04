import { catalog } from "../data/catalog";
import type { ClassSkillDefinition, DungeonId, GameState } from "./types";
import type { CombatInput } from "./input";
import { evaluateCombatProfile, type CombatProfile } from "../systems/builds";

export type EnemyKind = "trash" | "elite" | "boss";
export type CombatActionInput = { type: "light" } | { type: "heavy" } | { type: "skill"; skillId: string };
export type CombatSkillStatusTag = "shield" | "guard" | "evade" | "reflect" | "trap" | "control" | "guard-break" | "stagger";
export type CombatActionTag = "launcher" | "slam" | "pull" | "knockdown";
export type CombatHitPhase = "fall" | "impact" | "rain";
export type CombatVfxCue = "meteor-fall" | "meteor-impact" | "glass-rain-fall";

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
  marks: number;
  position: CombatVector;
  airborne: boolean;
  downed: boolean;
  airborneUntilMs?: number;
  downedUntilMs?: number;
  nextAttackAtMs: number;
  attackStartedAtMs?: number;
  attackImpactAtMs?: number;
  attackRecoverUntilMs?: number;
  attackSkillId?: string;
  attackHitResolved?: boolean;
  controlledUntilMs?: number;
  armorBrokenUntilMs?: number;
  statusSourceSkillId?: string;
}

export interface CombatPlayer {
  x: number;
  y: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  heat: number;
  resource: CombatResource;
  comboStep: number;
  actionLockUntilMs: number;
  cancelWindowUntilMs: number;
  hitstopUntilMs: number;
  invulnerableUntilMs: number;
  hurtLockUntilMs: number;
  shieldUntilMs: number;
  shieldReduction: number;
  evadeUntilMs: number;
  reflectUntilMs: number;
  reflectSkillId?: string;
  defeated: boolean;
  skillCooldowns: Record<string, number>;
  lastSkillId?: string;
  prismChain: number;
}

export interface CombatResource {
  id: string;
  displayName: string;
  current: number;
  max: number;
}

export interface CombatArena {
  width: number;
  height: number;
  minY: number;
  maxY: number;
}

export type CombatRoomGateState = "locked" | "open" | "boss" | "complete";

export interface CombatRoomGate {
  state: CombatRoomGateState;
  x: number;
  y: number;
  roomIndex: number;
  targetRoomIndex?: number;
  label: string;
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
  comboCount?: number;
  statusTags?: CombatSkillStatusTag[];
  actionTags?: CombatActionTag[];
  hitPhase?: CombatHitPhase;
  vfxCue?: CombatVfxCue;
  vfxWindowMs?: number;
}

export interface CombatMissEvent {
  kind: "miss";
  id: string;
  action: "light" | "heavy" | "skill";
  skillId?: string;
  occurredAtMs: number;
  inputToHitMs: number;
  canceledFromCombo: boolean;
  statusTags?: CombatSkillStatusTag[];
  actionTags?: CombatActionTag[];
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

export type CombatEvent = CombatHitEvent | CombatMissEvent | CombatRoomClearedEvent | CombatEnemyAttackEvent | CombatPlayerHitEvent;

export interface CombatLootEvent {
  dungeonId: DungeonId;
  roomIndex: number;
  experience: number;
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
  comboCount: number;
  comboExpiresAtMs: number;
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
  marksApplied?: number;
  consumeMarks?: boolean;
  bonusDamagePerMark?: number;
  pullCenter?: CombatVector;
  statusTags?: CombatSkillStatusTag[];
  actionTags?: CombatActionTag[];
  hitPhase?: CombatHitPhase;
  vfxCue?: CombatVfxCue;
  vfxWindowMs?: number;
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

interface PlayerHitboxDefinition {
  action: CombatMissEvent["action"];
  skillId?: string;
  rangeX: number;
  laneRange: number;
  targetCap: number;
  frontOnly: boolean;
  damage: number;
  hitstopMs: number;
  knockback: number;
  juggle: boolean;
  marksApplied?: number;
  consumeMarks?: boolean;
  bonusDamagePerMark?: number;
  pullCenter?: CombatVector;
  repeatHits?: number;
  repeatIntervalMs?: number;
  repeatDamageMultiplier?: number;
  inputToHitMs: number;
  canceledFromCombo: boolean;
  statusTags?: CombatSkillStatusTag[];
  actionTags?: CombatActionTag[];
}

const arena: CombatArena = {
  width: 960,
  height: 540,
  minY: 260,
  maxY: 430
};
const roomEntranceX = 160;
const roomEntranceY = 345;
const roomGateX = 900;
const roomGateY = 345;
const roomGateEnterRangeX = 34;
const roomGateEnterRangeY = 76;

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
    marks: 0,
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

function eventHitstop(enemy: CombatEnemy, hitstopMs: number): number {
  if (enemy.kind === "boss" && enemy.armor > 0) {
    return Math.min(hitstopMs, 25);
  }

  return hitstopMs;
}

function enemyDistanceScore(run: CombatRun, enemy: CombatEnemy): number {
  const xDistance = Math.abs(enemy.position.x - run.player.x);
  const yDistance = Math.abs(enemy.position.y - run.player.y);

  return xDistance * 10 + yDistance;
}

function enemyInPlayerHitbox(run: CombatRun, enemy: CombatEnemy, hitbox: PlayerHitboxDefinition): boolean {
  if (enemy.hp <= 0) {
    return false;
  }

  const facingDistance = (enemy.position.x - run.player.x) * run.player.facing;
  const xDistance = Math.abs(enemy.position.x - run.player.x);
  const yDistance = Math.abs(enemy.position.y - run.player.y);
  const inFront = hitbox.frontOnly ? facingDistance >= 0 : true;
  const inRange = hitbox.frontOnly ? facingDistance <= hitbox.rangeX : xDistance <= hitbox.rangeX;

  return inFront && inRange && yDistance <= hitbox.laneRange;
}

function selectPlayerTargets(run: CombatRun, hitbox: PlayerHitboxDefinition): CombatEnemy[] {
  return run.enemies
    .filter((enemy) => enemyInPlayerHitbox(run, enemy, hitbox))
    .sort((left, right) => enemyDistanceScore(run, left) - enemyDistanceScore(run, right))
    .slice(0, hitbox.targetCap);
}

function applyMiss(run: CombatRun, hitbox: PlayerHitboxDefinition): CombatRun {
  const event: CombatMissEvent = {
    kind: "miss",
    id: `miss-${run.elapsedMs}-${hitbox.action}${hitbox.skillId ? `-${hitbox.skillId}` : ""}`,
    action: hitbox.action,
    skillId: hitbox.skillId,
    occurredAtMs: run.elapsedMs,
    inputToHitMs: hitbox.inputToHitMs,
    canceledFromCombo: hitbox.canceledFromCombo,
    statusTags: hitbox.statusTags,
    actionTags: hitbox.actionTags
  };

  return {
    ...run,
    comboCount: 0,
    comboExpiresAtMs: 0,
    events: [...run.events, event]
  };
}

function applyPlayerHitbox(run: CombatRun, hitbox: PlayerHitboxDefinition): CombatRun {
  const targets = selectPlayerTargets(run, hitbox);

  if (targets.length === 0) {
    return applyMiss(run, hitbox);
  }

  const repeatHits = hitbox.repeatHits ?? 1;
  const repeatIntervalMs = hitbox.repeatIntervalMs ?? 0;
  const repeatDamageMultiplier = hitbox.repeatDamageMultiplier ?? 1;

  return targets.reduce((nextRun, target) => {
    let next = nextRun;

    for (let hitIndex = 0; hitIndex < repeatHits; hitIndex += 1) {
      next = applyHit(next, {
        id: `hit-${run.elapsedMs}-${hitbox.action}${hitbox.skillId ? `-${hitbox.skillId}` : ""}-${target.id}-${hitIndex}`,
        targetId: target.id,
        damage: Math.max(1, Math.round(hitbox.damage * repeatDamageMultiplier)),
        hitstopMs: hitbox.hitstopMs,
        knockback: hitbox.knockback,
        juggle: hitbox.juggle,
        action: hitbox.action,
        skillId: hitbox.skillId,
        inputToHitMs: hitbox.inputToHitMs + hitIndex * repeatIntervalMs,
        canceledFromCombo: hitbox.canceledFromCombo,
        marksApplied: hitbox.marksApplied,
        consumeMarks: hitbox.consumeMarks,
        bonusDamagePerMark: hitbox.bonusDamagePerMark,
        pullCenter: hitbox.pullCenter,
        statusTags: hitbox.statusTags,
        actionTags: hitbox.actionTags
      });
    }

    return next;
  }, run);
}

function skillTargetCap(tags: string[]): number {
  if (tags.includes("ultimate") || tags.includes("area") || tags.includes("trap") || tags.includes("pull")) {
    return 3;
  }

  if (tags.includes("burst") || tags.includes("slam") || tags.includes("range") || tags.includes("control")) {
    return 2;
  }

  return 1;
}

function skillRangeX(tags: string[]): number {
  if (tags.includes("range") || tags.includes("ultimate")) {
    return 380;
  }

  if (tags.includes("area") || tags.includes("trap") || tags.includes("pull")) {
    return 280;
  }

  if (tags.includes("dash")) {
    return 210;
  }

  if (tags.includes("slam") || tags.includes("burst")) {
    return 190;
  }

  return 150;
}

function skillLaneRange(tags: string[]): number {
  if (tags.includes("area") || tags.includes("trap") || tags.includes("ultimate") || tags.includes("pull")) {
    return 96;
  }

  if (tags.includes("range")) {
    return 72;
  }

  return 58;
}

function skillIsFrontOnly(tags: string[]): boolean {
  return !(tags.includes("area") || tags.includes("trap") || tags.includes("ultimate"));
}

const combatStatusTags = new Set<CombatSkillStatusTag>(["shield", "guard", "evade", "reflect", "trap", "control", "guard-break", "stagger"]);

function skillStatusTags(tags: string[]): CombatSkillStatusTag[] {
  return tags.filter((tag): tag is CombatSkillStatusTag => combatStatusTags.has(tag as CombatSkillStatusTag));
}

function hasStatus(tags: readonly CombatSkillStatusTag[] | undefined, status: CombatSkillStatusTag): boolean {
  return tags?.includes(status) ?? false;
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

function skillDamage(run: CombatRun, skill: { resourceCost: number; tags: string[] }): number {
  const baseDamage = 38 + Math.round(skill.resourceCost / 4);
  const heatBurstMultiplier =
    run.player.resource.id === "heat" &&
    run.player.resource.current >= 70 &&
    (skill.tags.includes("burst") || skill.tags.includes("ultimate"))
      ? 1.25
      : 1;

  return playerDamage(run, Math.round(baseDamage * heatBurstMultiplier));
}

function skillMovementDistance(skill: ClassSkillDefinition): number {
  if (skill.id === "furnace-step") {
    return 124;
  }

  if (skill.id === "prism-step") {
    return 104;
  }

  if (skill.id === "shadow-roll") {
    return -86;
  }

  if (skill.tags.includes("dash")) {
    return Math.max(72, skill.animation.lungePx * 2);
  }

  return 0;
}

function applySkillStartupMovement(run: CombatRun, skill: ClassSkillDefinition): CombatRun {
  const movement = skillMovementDistance(skill);

  if (movement === 0) {
    return run;
  }

  return {
    ...run,
    player: {
      ...run.player,
      x: clamp(run.player.x + movement * run.player.facing, 0, arena.width)
    }
  };
}

function skillPullCenter(run: CombatRun, skill: ClassSkillDefinition): CombatVector | undefined {
  if (!skill.tags.includes("pull")) {
    return undefined;
  }

  return {
    x: clamp(run.player.x + 112 * run.player.facing, 0, arena.width),
    y: run.player.y
  };
}

function skillRepeatHits(skill: ClassSkillDefinition): Partial<Pick<PlayerHitboxDefinition, "repeatHits" | "repeatIntervalMs" | "repeatDamageMultiplier">> {
  if (skill.id === "black-rain-volley") {
    return {
      repeatHits: 3,
      repeatIntervalMs: 110,
      repeatDamageMultiplier: 0.42
    };
  }

  return {};
}

function applyMeteorKnuckle(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const scriptedRun = applySkillStartupMovement(run, skill);
  const targetingHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: skillRangeX(skill.tags),
    laneRange: skillLaneRange(skill.tags),
    targetCap: skillTargetCap(skill.tags),
    frontOnly: skillIsFrontOnly(skill.tags),
    damage: skillDamage(run, skill),
    hitstopMs: 82,
    knockback: 48,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo
  };
  const targets = selectPlayerTargets(scriptedRun, targetingHitbox);

  if (targets.length === 0) {
    return applyMiss(scriptedRun, targetingHitbox);
  }

  const baseDamage = skillDamage(run, skill);
  const stages: Array<{
    phase: CombatHitPhase;
    vfxCue: CombatVfxCue;
    delayMs: number;
    damageMultiplier: number;
    hitstopMs: number;
    knockback: number;
    juggle: boolean;
    statusTags: CombatSkillStatusTag[];
    actionTags: CombatActionTag[];
  }> = [
    {
      phase: "fall",
      vfxCue: "meteor-fall",
      delayMs: skill.animation.hitFrameMs,
      damageMultiplier: 0.55,
      hitstopMs: 78,
      knockback: 18,
      juggle: true,
      statusTags: ["stagger"],
      actionTags: ["launcher"]
    },
    {
      phase: "impact",
      vfxCue: "meteor-impact",
      delayMs: skill.animation.hitFrameMs + 220,
      damageMultiplier: 1.25,
      hitstopMs: 134,
      knockback: 76,
      juggle: false,
      statusTags: ["guard-break", "stagger"],
      actionTags: ["slam", "knockdown"]
    }
  ];

  return stages.reduce((nextRun, stage) => {
    return targets.reduce((stageRun, target) => {
      return applyHit(stageRun, {
        id: `hit-${run.elapsedMs}-skill-${skill.id}-${stage.phase}-${target.id}`,
        targetId: target.id,
        damage: Math.max(1, Math.round(baseDamage * stage.damageMultiplier)),
        hitstopMs: stage.hitstopMs,
        knockback: stage.knockback,
        juggle: stage.juggle,
        action: "skill",
        skillId: skill.id,
        inputToHitMs: stage.delayMs,
        canceledFromCombo,
        statusTags: stage.statusTags,
        actionTags: stage.actionTags,
        hitPhase: stage.phase,
        vfxCue: stage.vfxCue
      });
    }, nextRun);
  }, scriptedRun);
}

function applyLiuliRain(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const scriptedRun = applySkillStartupMovement(run, skill);
  const targetingHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: skillRangeX(skill.tags),
    laneRange: skillLaneRange(skill.tags),
    targetCap: skillTargetCap(skill.tags),
    frontOnly: skillIsFrontOnly(skill.tags),
    damage: skillDamage(run, skill),
    hitstopMs: 60,
    knockback: 12,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo
  };
  const targets = selectPlayerTargets(scriptedRun, targetingHitbox);

  if (targets.length === 0) {
    return applyMiss(scriptedRun, targetingHitbox);
  }

  const baseDamage = skillDamage(run, skill);
  const waves: Array<{
    delayMs: number;
    damageMultiplier: number;
    hitstopMs: number;
    knockback: number;
    statusTags: CombatSkillStatusTag[];
  }> = [
    {
      delayMs: skill.animation.hitFrameMs,
      damageMultiplier: 0.38,
      hitstopMs: 54,
      knockback: 8,
      statusTags: []
    },
    {
      delayMs: skill.animation.hitFrameMs + 95,
      damageMultiplier: 0.42,
      hitstopMs: 58,
      knockback: 12,
      statusTags: []
    },
    {
      delayMs: skill.animation.hitFrameMs + 190,
      damageMultiplier: 0.48,
      hitstopMs: 68,
      knockback: 20,
      statusTags: ["stagger"]
    }
  ];

  return waves.reduce((nextRun, wave, waveIndex) => {
    return targets.reduce((waveRun, target) => {
      return applyHit(waveRun, {
        id: `hit-${run.elapsedMs}-skill-${skill.id}-rain-${waveIndex}-${target.id}`,
        targetId: target.id,
        damage: Math.max(1, Math.round(baseDamage * wave.damageMultiplier)),
        hitstopMs: wave.hitstopMs,
        knockback: wave.knockback,
        juggle: false,
        action: "skill",
        skillId: skill.id,
        inputToHitMs: wave.delayMs,
        canceledFromCombo,
        statusTags: wave.statusTags,
        hitPhase: "rain",
        vfxCue: "glass-rain-fall",
        vfxWindowMs: 300
      });
    }, nextRun);
  }, scriptedRun);
}

function classResource(state: GameState): Omit<CombatResource, "current"> {
  const classDef = catalog.classes.find((item) => item.id === state.player.classId);
  const resource = classDef?.resource ?? { id: "heat", displayName: "热能", max: 100 };

  return {
    id: resource.id,
    displayName: resource.displayName,
    max: resource.max
  };
}

function createCombatResource(state: GameState): CombatResource {
  const resource = classResource(state);

  return {
    ...resource,
    current: clamp(Math.round(state.player.heat), 0, resource.max)
  };
}

function syncPlayerResource(player: CombatPlayer, current: number): CombatPlayer {
  const nextCurrent = clamp(Math.round(current), 0, player.resource.max);

  return {
    ...player,
    heat: nextCurrent,
    resource: {
      ...player.resource,
      current: nextCurrent
    }
  };
}

function gainPlayerResource(player: CombatPlayer, run: CombatRun, baseGain: number): CombatPlayer {
  return syncPlayerResource(player, player.resource.current + playerResourceGain(run, baseGain));
}

function gainFlatPlayerResource(player: CombatPlayer, gain: number): CombatPlayer {
  return syncPlayerResource(player, player.resource.current + gain);
}

function spendAndGainPlayerResource(player: CombatPlayer, run: CombatRun, cost: number, baseGain: number): CombatPlayer {
  return syncPlayerResource(player, player.resource.current - cost + playerResourceGain(run, baseGain));
}

function applyPlayerSkillStatus(player: CombatPlayer, run: CombatRun, statusTags: readonly CombatSkillStatusTag[], skillId: string): CombatPlayer {
  let next = player;

  if (hasStatus(statusTags, "shield")) {
    next = {
      ...next,
      shieldUntilMs: Math.max(next.shieldUntilMs, run.elapsedMs + 1500),
      shieldReduction: Math.max(next.shieldReduction, 0.5)
    };
  }

  if (hasStatus(statusTags, "guard")) {
    next = {
      ...next,
      shieldUntilMs: Math.max(next.shieldUntilMs, run.elapsedMs + 900),
      shieldReduction: Math.max(next.shieldReduction, 0.48)
    };
  }

  if (hasStatus(statusTags, "evade")) {
    next = {
      ...next,
      x: clamp(next.x - next.facing * 44, 0, arena.width),
      evadeUntilMs: Math.max(next.evadeUntilMs, run.elapsedMs + 980),
      invulnerableUntilMs: Math.max(next.invulnerableUntilMs, run.elapsedMs + 420)
    };
  }

  if (hasStatus(statusTags, "reflect")) {
    next = {
      ...next,
      reflectUntilMs: Math.max(next.reflectUntilMs, run.elapsedMs + 1100),
      reflectSkillId: skillId
    };
  }

  return next;
}

function prismCycleGain(run: CombatRun, skillId: string): number {
  return run.player.resource.id === "prism" && run.player.lastSkillId !== skillId ? 8 : 0;
}

function prismCooldownMs(run: CombatRun, skillId: string, baseCooldownMs: number): number {
  const base = playerCooldownMs(run, baseCooldownMs);

  return run.player.resource.id === "prism" && run.player.lastSkillId !== skillId ? Math.round(base * 0.88) : base;
}

function nextPrismChain(run: CombatRun, skillId: string): number {
  if (run.player.resource.id !== "prism") {
    return 0;
  }

  return run.player.lastSkillId !== skillId ? Math.min(3, run.player.prismChain + 1) : 1;
}

function markCountForSkill(skill: { tags: string[] }): number {
  return skill.tags.includes("mark") ? 2 : 0;
}

function consumesMarksForSkill(skill: { id: string; tags: string[] }): boolean {
  return skill.id.includes("detonation") || skill.tags.includes("detonate");
}

function bonusDamagePerMarkForSkill(skill: { id: string; tags: string[] }): number {
  return consumesMarksForSkill(skill) ? 18 : 0;
}

function actionTagsForSkill(tags: string[]): CombatActionTag[] {
  return tags.filter((tag): tag is CombatActionTag => tag === "launcher" || tag === "slam" || tag === "pull" || tag === "knockdown");
}

function updateEnemyAirStates(run: CombatRun): CombatRun {
  return {
    ...run,
    enemies: run.enemies.map((enemy) => {
      if (enemy.hp <= 0) {
        return enemy;
      }

      if (enemy.airborne && enemy.airborneUntilMs !== undefined && run.elapsedMs >= enemy.airborneUntilMs) {
        return {
          ...enemy,
          airborne: false,
          airborneUntilMs: undefined,
          downed: true,
          downedUntilMs: Math.max(enemy.downedUntilMs ?? 0, run.elapsedMs + 700),
          nextAttackAtMs: Math.max(enemy.nextAttackAtMs, run.elapsedMs + 700),
          attackStartedAtMs: undefined,
          attackImpactAtMs: undefined,
          attackRecoverUntilMs: undefined,
          attackSkillId: undefined,
          attackHitResolved: undefined
        };
      }

      if (enemy.downed && enemy.downedUntilMs !== undefined && run.elapsedMs >= enemy.downedUntilMs) {
        return {
          ...enemy,
          downed: false,
          downedUntilMs: undefined
        };
      }

      return enemy;
    })
  };
}

export function createCombatRun(state: GameState, dungeonId: string): CombatRun {
  const dungeon = getDungeon(dungeonId);
  const combatProfile = evaluateCombatProfile(state);
  const resource = createCombatResource(state);

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
    comboCount: 0,
    comboExpiresAtMs: 0,
    arena,
    combatProfile,
    player: {
      x: 160,
      y: 345,
      facing: 1,
      hp: combatProfile.maxHp,
      maxHp: combatProfile.maxHp,
      heat: resource.current,
      resource,
      comboStep: 0,
      actionLockUntilMs: 0,
      cancelWindowUntilMs: 0,
      hitstopUntilMs: 0,
      invulnerableUntilMs: 0,
      hurtLockUntilMs: 0,
      shieldUntilMs: 0,
      shieldReduction: 0,
      evadeUntilMs: 0,
      reflectUntilMs: 0,
      defeated: false,
      skillCooldowns: {},
      prismChain: 0
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
    comboCount: run.comboCount > 0 && elapsedMs <= run.comboExpiresAtMs ? run.comboCount : 0,
    comboExpiresAtMs: run.comboCount > 0 && elapsedMs <= run.comboExpiresAtMs ? run.comboExpiresAtMs : 0,
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

  return advanceEnemyAttacks(updateEnemyAirStates(movedRun));
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

  if (
    recovered.hp <= 0 ||
    recovered.airborne ||
    recovered.downed ||
    hasActiveEnemyAttack(recovered, elapsedMs) ||
    elapsedMs < recovered.nextAttackAtMs ||
    elapsedMs < (recovered.controlledUntilMs ?? 0)
  ) {
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
  const inRange = playerInEnemyAttackRange(enemy, player, attack);
  const evaded = inRange && elapsedMs < player.evadeUntilMs;
  const phase = inRange && !evaded ? "active" : "miss";
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

  if (elapsedMs < player.reflectUntilMs) {
    const reflectDamage = Math.max(1, Math.round(attack.damage * 0.65));
    const armorDamage = Math.min(resolvedEnemy.armor, reflectDamage);
    const hpDamage = reflectDamage - armorDamage;
    const reflectedEnemy: CombatEnemy = {
      ...resolvedEnemy,
      hp: Math.max(0, resolvedEnemy.hp - hpDamage),
      armor: Math.max(0, resolvedEnemy.armor - armorDamage)
    };
    const reflectEvent: CombatHitEvent = {
      kind: "hit",
      id: `hit-${elapsedMs}-mirror-reflect-${enemy.id}`,
      action: "skill",
      skillId: "mirror-reflect",
      targetId: enemy.id,
      damage: reflectDamage,
      occurredAtMs: elapsedMs,
      inputToHitMs: 0,
      hitstopMs: attack.hitstopMs,
      canceledFromCombo: false,
      statusTags: ["reflect"]
    };

    return {
      enemy: reflectedEnemy,
      player: {
        ...player,
        reflectUntilMs: elapsedMs
      },
      events: [attackEvent, reflectEvent],
      failed: player.defeated
    };
  }

  const shieldActive = elapsedMs < player.shieldUntilMs;
  const mitigation = shieldActive ? clamp(player.shieldReduction, 0, 0.85) : 0;
  const damage = Math.max(1, Math.round(attack.damage * combatProfile.damageTakenMultiplier * (1 - mitigation)));
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
  const damagedPlayer: CombatPlayer = {
    ...player,
    hp: nextHp,
    x: clamp(player.x - nextFacing * attack.knockback, 0, arena.width),
    facing: nextFacing,
    hitstopUntilMs: Math.max(player.hitstopUntilMs, elapsedMs + attack.hitstopMs),
    invulnerableUntilMs: elapsedMs + 560,
    hurtLockUntilMs: elapsedMs + Math.max(attack.hitstopMs, 420),
    shieldUntilMs: shieldActive ? elapsedMs : player.shieldUntilMs,
    shieldReduction: shieldActive ? 0 : player.shieldReduction,
    defeated: nextHp <= 0
  };
  const nextPlayer = damagedPlayer.resource.id === "guard" ? gainFlatPlayerResource(damagedPlayer, 12) : damagedPlayer;

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

  const bonusDamage = hit.consumeMarks ? target.marks * (hit.bonusDamagePerMark ?? 0) : 0;
  const effectiveDamage = hit.damage + bonusDamage;
  const statusTags = hit.statusTags ?? [];
  const actionTags = hit.actionTags ?? [];
  const hitstopMs = eventHitstop(target, hit.hitstopMs);
  const impactAtMs = run.elapsedMs + (hit.inputToHitMs ?? 0);
  const comboCount = run.comboCount > 0 && run.elapsedMs <= run.comboExpiresAtMs ? run.comboCount + 1 : 1;
  const comboExpiresAtMs = impactAtMs + 1200;
  const nextEnemies = run.enemies.map((enemy) => {
    if (enemy.id !== hit.targetId) {
      return enemy;
    }

    const armorDamage = Math.min(enemy.armor, effectiveDamage);
    const hpDamage = effectiveDamage - armorDamage;
    const nextMarks = hit.consumeMarks ? 0 : clamp(enemy.marks + (hit.marksApplied ?? 0), 0, 9);
    const controlUntil = hasStatus(statusTags, "trap") || hasStatus(statusTags, "control") ? impactAtMs + 1100 : undefined;
    const staggerUntil = hasStatus(statusTags, "stagger") ? impactAtMs + 780 : undefined;
    const controlledUntilMs = Math.max(enemy.controlledUntilMs ?? 0, controlUntil ?? 0, staggerUntil ?? 0) || undefined;
    const armorBrokenUntilMs = hasStatus(statusTags, "guard-break")
      ? Math.max(enemy.armorBrokenUntilMs ?? 0, impactAtMs + 1800)
      : enemy.armorBrokenUntilMs;
    const forcedKnockdown = actionTags.includes("knockdown");
    const slamDown = actionTags.includes("slam") && enemy.airborne;
    const lethalDown = !hit.juggle && enemy.hp - hpDamage <= 0;
    const airborne = hit.juggle && !slamDown && !forcedKnockdown;
    const downed = forcedKnockdown || slamDown || lethalDown;
    const airborneUntilMs = airborne ? Math.max(enemy.airborneUntilMs ?? 0, impactAtMs + 1000) : undefined;
    const downedUntilMs = downed ? Math.max(enemy.downedUntilMs ?? 0, impactAtMs + 760) : airborne ? undefined : enemy.downedUntilMs;
    const airControlUntil = Math.max(airborneUntilMs ?? 0, downedUntilMs ?? 0) || undefined;
    const statusInterruptsAttack =
      Boolean(controlledUntilMs && controlledUntilMs > run.elapsedMs) ||
      Boolean(airControlUntil && airControlUntil > run.elapsedMs) ||
      hasStatus(statusTags, "guard-break");
    const delayedUntil = Math.max(
      enemy.nextAttackAtMs,
      controlledUntilMs ?? 0,
      airControlUntil ?? 0,
      hasStatus(statusTags, "guard-break") ? impactAtMs + 680 : 0
    );
    const nextPosition = hit.pullCenter
      ? {
          x: clamp(enemy.position.x + (hit.pullCenter.x - enemy.position.x) * 0.75, 0, arena.width),
          y: clamp(enemy.position.y + (hit.pullCenter.y - enemy.position.y) * 0.45, arena.minY, arena.maxY)
        }
      : {
          ...enemy.position,
          x: clamp(enemy.position.x + hit.knockback * run.player.facing, 0, arena.width)
        };

    return {
      ...enemy,
      hp: Math.max(0, enemy.hp - hpDamage),
      armor: Math.max(0, enemy.armor - armorDamage),
      marks: nextMarks,
      controlledUntilMs,
      armorBrokenUntilMs,
      statusSourceSkillId: statusTags.length > 0 ? hit.skillId : enemy.statusSourceSkillId,
      nextAttackAtMs: delayedUntil,
      attackStartedAtMs: statusInterruptsAttack ? undefined : enemy.attackStartedAtMs,
      attackImpactAtMs: statusInterruptsAttack ? undefined : enemy.attackImpactAtMs,
      attackRecoverUntilMs: statusInterruptsAttack ? undefined : enemy.attackRecoverUntilMs,
      attackSkillId: statusInterruptsAttack ? undefined : enemy.attackSkillId,
      attackHitResolved: statusInterruptsAttack ? undefined : enemy.attackHitResolved,
      position: nextPosition,
      airborne,
      downed,
      airborneUntilMs,
      downedUntilMs
    };
  });
  const event: CombatHitEvent = {
    kind: "hit",
    id: hit.id,
    action: hit.action ?? "test",
    skillId: hit.skillId,
    targetId: hit.targetId,
    damage: effectiveDamage,
    occurredAtMs: impactAtMs,
    inputToHitMs: hit.inputToHitMs ?? 0,
    hitstopMs,
    canceledFromCombo: hit.canceledFromCombo ?? false,
    comboCount,
    statusTags: hit.statusTags,
    actionTags: hit.actionTags,
    hitPhase: hit.hitPhase,
    vfxCue: hit.vfxCue,
    vfxWindowMs: hit.vfxWindowMs
  };

  return {
    ...run,
    comboCount,
    comboExpiresAtMs,
    enemies: nextEnemies,
    events: [...run.events, event],
    player: {
      ...run.player,
      hitstopUntilMs: Math.max(run.player.hitstopUntilMs, impactAtMs + hitstopMs)
    }
  };
}

function completeSkillAction(
  run: CombatRun,
  hitRun: CombatRun,
  skill: ClassSkillDefinition,
  statusTags: CombatSkillStatusTag[]
): CombatRun {
  const prismGain = prismCycleGain(run, skill.id);
  const resourcePlayer = spendAndGainPlayerResource(hitRun.player, run, skill.resourceCost, skill.resourceGain + prismGain);
  const statusPlayer = applyPlayerSkillStatus(resourcePlayer, run, statusTags, skill.id);

  return {
    ...hitRun,
    player: {
      ...statusPlayer,
      comboStep: 0,
      actionLockUntilMs: run.elapsedMs + skill.animation.durationMs,
      cancelWindowUntilMs: 0,
      lastSkillId: skill.id,
      prismChain: nextPrismChain(run, skill.id),
      skillCooldowns: {
        ...hitRun.player.skillCooldowns,
        [skill.id]: run.elapsedMs + prismCooldownMs(run, skill.id, skill.cooldownMs)
      }
    }
  };
}

export function performAction(run: CombatRun, action: CombatActionInput): CombatRun {
  if (run.failed || run.player.defeated) {
    return run;
  }

  if (run.elapsedMs < run.player.hurtLockUntilMs) {
    return run;
  }

  const locked = run.elapsedMs < run.player.actionLockUntilMs;
  const canceledFromCombo = action.type === "skill" && run.elapsedMs <= run.player.cancelWindowUntilMs && run.player.comboStep > 0;

  if (locked && !canceledFromCombo) {
    return run;
  }

  if (action.type === "light") {
    const hitRun = applyPlayerHitbox(run, {
      action: "light",
      rangeX: 132,
      laneRange: 50,
      targetCap: 1,
      frontOnly: true,
      damage: playerDamage(run, 24),
      hitstopMs: 42,
      knockback: 22,
      juggle: false,
      inputToHitMs: 55,
      canceledFromCombo
    });
    const hitConnected = hitRun.events.at(-1)?.kind === "hit";

    return {
      ...hitRun,
      player: {
        ...(hitConnected ? gainPlayerResource(hitRun.player, run, 8) : hitRun.player),
        comboStep: hitConnected ? (run.player.comboStep % 3) + 1 : 0,
        actionLockUntilMs: run.elapsedMs + 180,
        cancelWindowUntilMs: hitConnected ? run.elapsedMs + 180 : 0
      }
    };
  }

  if (action.type === "heavy") {
    const hitRun = applyPlayerHitbox(run, {
      action: "heavy",
      rangeX: 158,
      laneRange: 58,
      targetCap: 1,
      frontOnly: true,
      damage: playerDamage(run, 48),
      hitstopMs: 72,
      knockback: 60,
      juggle: true,
      inputToHitMs: 85,
      canceledFromCombo,
      actionTags: ["launcher"]
    });
    const hitConnected = hitRun.events.at(-1)?.kind === "hit";

    return {
      ...hitRun,
      player: {
        ...(hitConnected ? gainPlayerResource(hitRun.player, run, 4) : hitRun.player),
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

  if (run.player.resource.current < skill.resourceCost) {
    throw new Error(`Insufficient ${run.player.resource.displayName} for skill: ${action.skillId}`);
  }

  if (skillCooldownRemaining(run, action.skillId) > 0) {
    throw new Error(`Skill on cooldown: ${action.skillId}`);
  }

  const statusTags = skillStatusTags(skill.tags);
  const actionTags = actionTagsForSkill(skill.tags);

  if (skill.id === "meteor-knuckle") {
    return completeSkillAction(run, applyMeteorKnuckle(run, skill, canceledFromCombo), skill, statusTags);
  }

  if (skill.id === "liuli-rain") {
    return completeSkillAction(run, applyLiuliRain(run, skill, canceledFromCombo), skill, statusTags);
  }

  const scriptedRun = applySkillStartupMovement(run, skill);
  const hitRun = applyPlayerHitbox(scriptedRun, {
    action: "skill",
    skillId: action.skillId,
    rangeX: skillRangeX(skill.tags),
    laneRange: skillLaneRange(skill.tags),
    targetCap: skillTargetCap(skill.tags),
    frontOnly: skillIsFrontOnly(skill.tags),
    damage: skillDamage(run, skill),
    hitstopMs: 82,
    knockback: 48,
    juggle: skill.tags.includes("launcher") || skill.tags.includes("pull"),
    marksApplied: markCountForSkill(skill),
    consumeMarks: consumesMarksForSkill(skill),
    bonusDamagePerMark: bonusDamagePerMarkForSkill(skill),
    pullCenter: skillPullCenter(scriptedRun, skill),
    ...skillRepeatHits(skill),
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags,
    actionTags
  });

  return completeSkillAction(run, hitRun, skill, statusTags);
}

export function skillCooldownRemaining(run: CombatRun, skillId: string): number {
  return Math.max(0, (run.player.skillCooldowns[skillId] ?? 0) - run.elapsedMs);
}

function createLootEvent(run: CombatRun): CombatLootEvent {
  const dungeonBonus = run.dungeonId === "liuli-furnace" ? 1 : 0;

  return {
    dungeonId: run.dungeonId,
    roomIndex: run.roomIndex,
    experience: 110 + run.roomIndex * 20 + dungeonBonus * 60,
    gold: 120 + run.roomIndex * 30 + dungeonBonus * 80,
    ironDust: 6 + run.roomIndex * 2,
    arcShard: dungeonBonus,
    gearDropId: run.roomIndex % 2 === 0 ? catalog.gear[run.roomIndex % catalog.gear.length]?.id : undefined
  };
}

function roomIsCleared(run: CombatRun): boolean {
  return run.enemies.length === 0 || run.enemies.every((enemy) => enemy.hp <= 0);
}

export function roomGateForRun(run: CombatRun): CombatRoomGate {
  const dungeon = getDungeon(run.dungeonId);

  if (!dungeon) {
    throw new Error(`Unknown dungeon: ${run.dungeonId}`);
  }

  const targetRoomIndex = run.roomIndex + 1;
  const cleared = roomIsCleared(run);
  const state: CombatRoomGateState =
    run.failed || run.player.defeated || !cleared
      ? "locked"
      : run.completed || targetRoomIndex >= dungeon.rooms
        ? "complete"
        : targetRoomIndex === dungeon.rooms - 1
          ? "boss"
          : "open";

  return {
    state,
    x: roomGateX,
    y: roomGateY,
    roomIndex: run.roomIndex,
    targetRoomIndex: state === "open" || state === "boss" ? targetRoomIndex : undefined,
    label: state === "complete" ? "通关出口" : state === "boss" ? "首领房门" : state === "open" ? "下一房门" : "封印房门"
  };
}

export function canEnterRoomGate(run: CombatRun): boolean {
  const gate = roomGateForRun(run);

  return (
    (gate.state === "open" || gate.state === "boss" || gate.state === "complete") &&
    run.player.x >= gate.x - roomGateEnterRangeX &&
    Math.abs(run.player.y - gate.y) <= roomGateEnterRangeY
  );
}

export function enterRoomGate(run: CombatRun): CombatRun {
  if (!canEnterRoomGate(run)) {
    throw new Error("Room gate is not open or the player is not close enough to enter");
  }

  return finishRoom(run);
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
    comboCount: 0,
    comboExpiresAtMs: 0,
    player: {
      ...run.player,
      x: roomEntranceX,
      y: roomEntranceY,
      facing: 1,
      comboStep: 0,
      actionLockUntilMs: 0,
      cancelWindowUntilMs: 0,
      hitstopUntilMs: 0
    },
    enemies: completed ? [] : createRoomEnemies(run.dungeonId, nextRoomIndex),
    events: [clearedEvent],
    lootEvents: [...run.lootEvents, lootEvent],
    completed
  };
}
