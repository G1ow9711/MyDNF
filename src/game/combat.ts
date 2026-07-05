import { catalog } from "../data/catalog";
import type { ClassSkillDefinition, DungeonId, GameState } from "./types";
import type { CombatInput } from "./input";
import { evaluateCombatProfile, type CombatProfile } from "../systems/builds";

export type EnemyKind = "trash" | "elite" | "boss";
export type EnemyAttackProfileId =
  | "ash-ember-spit"
  | "ash-crawler-burst"
  | "zheng-shockwave"
  | "zheng-horn-charge"
  | "taotie-flame-breath"
  | "taotie-devour-pull"
  | "taotie-ash-summon"
  | "taotie-forge-shackle";
export type CombatSkillInputMethod = "hotkey" | "command";
export type CombatActionInput =
  | { type: "light" }
  | { type: "heavy" }
  | { type: "jump" }
  | { type: "backstep" }
  | { type: "skill"; skillId: string; inputMethod?: CombatSkillInputMethod };
export type CombatSkillStatusTag = "shield" | "guard" | "evade" | "reflect" | "trap" | "control" | "guard-break" | "stagger";
export type CombatActionTag = "launcher" | "slam" | "pull" | "knockdown";
export type CombatHitPhase =
  | "dash-light"
  | "air-light"
  | "air-heavy-slam"
  | "fall"
  | "impact"
  | "rain"
  | "pierce"
  | "mark-lock"
  | "detonate"
  | "trap-bind"
  | "trap-snap"
  | "hammer-stagger"
  | "hammer-impact"
  | "shoulder-impact"
  | "heat-draw"
  | "heat-eruption"
  | "overdrive-pulse"
  | "overdrive-release"
  | "anvil-slam"
  | "earth-crack"
  | "furnace-eruption"
  | "ink-bolt"
  | "glass-cut"
  | "jab-chain"
  | "shield-jab"
  | "roll-shot"
  | "uppercut"
  | "chain-open"
  | "chain-cross"
  | "chain-finish"
  | "prism-field-lock"
  | "prism-field-burst";
export type CombatVfxCue =
  | "dash-light-slash"
  | "air-light-slash"
  | "air-heavy-impact"
  | "meteor-fall"
  | "meteor-impact"
  | "glass-rain-fall"
  | "black-rain-fall"
  | "prism-pierce"
  | "night-mark-lock"
  | "night-mark-burst"
  | "mechanism-net-bind"
  | "mechanism-net-snap"
  | "mountain-hammer-stagger"
  | "mountain-crack-impact"
  | "furnace-shoulder-impact"
  | "heat-bloom-draw"
  | "heat-bloom-eruption"
  | "overdrive-core-pulse"
  | "overdrive-core-release"
  | "anvil-crash-impact"
  | "earth-furnace-crack"
  | "earth-furnace-eruption"
  | "ink-shot-pierce"
  | "ink-snare-bind"
  | "ink-snare-snap"
  | "glass-slash-cut"
  | "ember-jab-chain"
  | "iron-shield-jab"
  | "shadow-roll-shot"
  | "cinder-uppercut-rise"
  | "flowing-chain-open"
  | "flowing-chain-cross"
  | "flowing-chain-finish"
  | "sword-prism-field-lock"
  | "sword-prism-field-burst";
export type CombatEnemyVfxCue =
  | "ash-ember-spit-impact"
  | "ash-crawler-burst-explode"
  | "zheng-shockwave-impact"
  | "zheng-horn-charge-impact"
  | "taotie-flame-breath-sustain"
  | "taotie-devour-bite"
  | "taotie-ash-summon-rift"
  | "taotie-forge-shackle-bind"
  | "taotie-forge-shackle-slam";
export type CombatPlayerFeedbackCue =
  | "player-hurt-light"
  | "player-hurt-heavy"
  | "player-hurt-boss-breath"
  | "player-hurt-devoured"
  | "player-hurt-forge-collapse"
  | "player-hurt-forge-shackle"
  | "player-hurt-forge-slam";
export type CombatBossPhaseSkillId = "taotie-forge-collapse";
export type CombatArenaHazardPhase = "telegraph" | "active" | "miss";
export type CombatArenaHazardVfxCue = "taotie-forge-collapse-telegraph" | "taotie-forge-collapse-impact";

export interface CombatVector {
  x: number;
  y: number;
}

export interface CombatBodySize {
  width: number;
  height: number;
}

export interface CombatHurtboxSize {
  width: number;
  height: number;
}

export interface CombatEnemy {
  id: string;
  displayName: string;
  kind: EnemyKind;
  attackProfileId: EnemyAttackProfileId;
  attackPatternIds?: EnemyAttackProfileId[];
  nextAttackPatternIndex?: number;
  hp: number;
  maxHp: number;
  armor: number;
  body: CombatBodySize;
  hurtbox: CombatHurtboxSize;
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
  attackResolvedHits?: number;
  attackRushStartPosition?: CombatVector;
  attackRushTargetPosition?: CombatVector;
  attackPullStartPosition?: CombatVector;
  attackPullTargetPosition?: CombatVector;
  bossPhase?: 1 | 2;
  bossPhaseTriggeredAtMs?: number;
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
  boundUntilMs: number;
  airState: "grounded" | "jumping" | "landing";
  jumpStartedAtMs: number;
  airborneUntilMs: number;
  landingUntilMs: number;
  airAttackUsed: boolean;
  airAttackType: "none" | "light" | "heavy";
  airAttackStartedAtMs: number;
  airAttackUntilMs: number;
  dashAttackReadyUntilMs: number;
  dashAttackStartedAtMs: number;
  dashAttackUntilMs: number;
  shieldUntilMs: number;
  shieldReduction: number;
  evadeUntilMs: number;
  reflectUntilMs: number;
  reflectSkillId?: string;
  bufferedAction?: CombatActionInput;
  bufferedActionQueuedAtMs?: number;
  bufferedActionExecuteAtMs?: number;
  defeated: boolean;
  skillCooldowns: Record<string, number>;
  lastSkillId?: string;
  prismChain: number;
  activeSkillMovement?: CombatPlayerSkillMovement;
}

export interface CombatResource {
  id: string;
  displayName: string;
  current: number;
  max: number;
}

export interface CombatPlayerSkillMovement {
  skillId: string;
  startAtMs: number;
  endAtMs: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
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
  casterPosition?: CombatVector;
  casterFacing?: 1 | -1;
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
  casterPosition?: CombatVector;
  casterFacing?: 1 | -1;
}

export interface CombatSkillCastEvent {
  kind: "skill-cast";
  id: string;
  action: "skill";
  skillId: string;
  occurredAtMs: number;
  inputToHitMs: number;
  canceledFromCombo: boolean;
  statusTags?: CombatSkillStatusTag[];
  actionTags?: CombatActionTag[];
  casterPosition?: CombatVector;
  casterFacing?: 1 | -1;
  inputMethod?: CombatSkillInputMethod;
  resourceCostPaid?: number;
  cooldownDurationMs?: number;
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
  hitIndex?: number;
  totalHits?: number;
  vfxCue?: CombatEnemyVfxCue;
  vfxWindowMs?: number;
}

export interface CombatPlayerHitEvent {
  kind: "player-hit";
  id: string;
  enemyId: string;
  skillId: string;
  damage: number;
  occurredAtMs: number;
  hitstopMs: number;
  hitIndex?: number;
  totalHits?: number;
  feedbackCue?: CombatPlayerFeedbackCue;
  vfxWindowMs?: number;
}

export interface CombatEnemySummonEvent {
  kind: "enemy-summon";
  id: string;
  enemyId: string;
  skillId: string;
  summonedEnemyIds: string[];
  positions: CombatVector[];
  occurredAtMs: number;
  vfxCue: CombatEnemyVfxCue;
  vfxWindowMs: number;
}

export interface CombatBossPhaseEvent {
  kind: "boss-phase";
  id: string;
  enemyId: string;
  phase: 2;
  skillId: CombatBossPhaseSkillId;
  occurredAtMs: number;
  hazardCount: number;
  vfxCue: CombatBossPhaseSkillId;
  vfxWindowMs: number;
}

export interface CombatArenaHazardEvent {
  kind: "arena-hazard";
  id: string;
  hazardId: string;
  enemyId: string;
  skillId: CombatBossPhaseSkillId;
  phase: CombatArenaHazardPhase;
  x: number;
  y: number;
  radiusX: number;
  laneRange: number;
  occurredAtMs: number;
  impactAtMs: number;
  vfxCue: CombatArenaHazardVfxCue;
  vfxWindowMs: number;
}

export type CombatEvent =
  | CombatHitEvent
  | CombatMissEvent
  | CombatSkillCastEvent
  | CombatRoomClearedEvent
  | CombatEnemyAttackEvent
  | CombatPlayerHitEvent
  | CombatEnemySummonEvent
  | CombatBossPhaseEvent
  | CombatArenaHazardEvent;

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
  scheduledEnemyHitEffects: CombatScheduledEnemyHitEffect[];
  scheduledMissEffects: CombatScheduledMissEffect[];
  scheduledArenaHazards: CombatScheduledArenaHazard[];
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
  casterPosition?: CombatVector;
  casterFacing?: 1 | -1;
}

export interface CombatScheduledEnemyHitEffect {
  id: string;
  targetId?: string;
  applyAtMs: number;
  action?: CombatHitEvent["action"];
  inputToHitMs: number;
  canceledFromCombo: boolean;
  damage: number;
  hitstopMs: number;
  knockback: number;
  juggle: boolean;
  playerFacing: 1 | -1;
  marksApplied?: number;
  consumeMarks?: boolean;
  bonusDamagePerMark?: number;
  pullCenter?: CombatVector;
  statusTags?: CombatSkillStatusTag[];
  actionTags?: CombatActionTag[];
  skillId?: string;
  hitPhase?: CombatHitPhase;
  vfxCue?: CombatVfxCue;
  vfxWindowMs?: number;
  casterPosition?: CombatVector;
  casterFacing?: 1 | -1;
  dynamicHitbox?: PlayerHitboxDefinition;
  dynamicOrigin?: CombatVector;
  dynamicFacing?: 1 | -1;
  missOnEmpty?: boolean;
}

export interface CombatScheduledMissEffect {
  id: string;
  applyAtMs: number;
  action: CombatMissEvent["action"];
  skillId?: string;
  inputToHitMs: number;
  canceledFromCombo: boolean;
  statusTags?: CombatSkillStatusTag[];
  actionTags?: CombatActionTag[];
  casterPosition?: CombatVector;
  casterFacing?: 1 | -1;
}

export interface CombatScheduledArenaHazard {
  hazardId: string;
  enemyId: string;
  skillId: CombatBossPhaseSkillId;
  x: number;
  y: number;
  radiusX: number;
  laneRange: number;
  impactAtMs: number;
  damage: number;
  hitstopMs: number;
  knockback: number;
  vfxWindowMs: number;
}

interface CombatMovementSample {
  startElapsedMs: number;
  endElapsedMs: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  facing: 1 | -1;
  moveX: number;
  moveY: number;
  speed: number;
  boundUntilMs?: number;
  skillMovement?: CombatPlayerSkillMovement;
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
  hitCount: number;
  hitIntervalMs: number;
  vfxCue: CombatEnemyVfxCue;
  hitVfxCues?: CombatEnemyVfxCue[];
  vfxWindowMs: number;
  feedbackCue: CombatPlayerFeedbackCue;
  feedbackCues?: CombatPlayerFeedbackCue[];
  invulnerabilityMs: number;
  invulnerabilityMsByHit?: number[];
  hurtLockMs: number;
  hurtLockMsByHit?: number[];
  damageMultipliers?: number[];
  knockbackByHit?: number[];
  boundMsByHit?: number[];
  jumpEvade?: boolean;
  windupRushPx?: number;
  windupPullPx?: number;
  summonProfileIds?: EnemyAttackProfileId[];
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
  requiresStatusSourceSkillId?: string;
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
export const actionBufferWindowMs = 180;
const backstepDistancePx = 74;
const backstepEvadeMs = 420;
const backstepInvulnerableMs = 240;
const backstepActionLockMs = 260;
const jumpAirborneMs = 480;
const jumpLandingLockMs = 80;
const jumpActionLockMs = jumpAirborneMs + jumpLandingLockMs;
const airLightInputToHitMs = 65;
const airLightActionMs = 260;
const airHeavyInputToHitMs = 120;
const airHeavyActionMs = 300;
const dashLightReadyWindowMs = 220;
const dashLightInputToHitMs = 90;
const dashLightActionMs = 260;
const dashLightLungePx = 46;
const taotieForgeCollapseSkillId: CombatBossPhaseSkillId = "taotie-forge-collapse";
const taotieForgeCollapseTelegraphMs = 620;
const taotieForgeCollapseHazardGapMs = 140;
const taotieForgeCollapsePhaseVfxMs = 1180;
const taotieForgeCollapseHazardVfxMs = 720;
const taotieForgeCollapseHazardDamage = 62;
const taotieForgeCollapseHazardHitstopMs = 72;
const taotieForgeCollapseHazardKnockback = 36;
const taotieForgeCollapseRadiusX = 86;
const taotieForgeCollapseLaneRange = 36;
const taotieAshSummonMinionDelayMs = 540;
const taotieBossPhaseOnePattern: EnemyAttackProfileId[] = ["taotie-flame-breath", "taotie-devour-pull", "taotie-ash-summon"];
const taotieBossPhaseTwoPattern: EnemyAttackProfileId[] = [...taotieBossPhaseOnePattern, "taotie-forge-shackle"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function playerSkillMovementPosition(movement: CombatPlayerSkillMovement, elapsedMs: number): CombatVector {
  const durationMs = Math.max(1, movement.endAtMs - movement.startAtMs);
  const progress = clamp((elapsedMs - movement.startAtMs) / durationMs, 0, 1);
  const easedProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  return {
    x: clamp(lerp(movement.startX, movement.endX, easedProgress), 0, arena.width),
    y: clamp(lerp(movement.startY, movement.endY, easedProgress), arena.minY, arena.maxY)
  };
}

function samplePlayerPosition(player: CombatPlayer, elapsedMs: number): CombatVector {
  if (!player.activeSkillMovement) {
    return { x: player.x, y: player.y };
  }

  return playerSkillMovementPosition(player.activeSkillMovement, elapsedMs);
}

function playerAirStateAt(player: CombatPlayer, elapsedMs: number): CombatPlayer["airState"] {
  if (elapsedMs < player.airborneUntilMs) {
    return "jumping";
  }

  if (elapsedMs < player.landingUntilMs) {
    return "landing";
  }

  return "grounded";
}

function updatePlayerAirState(player: CombatPlayer, elapsedMs: number): CombatPlayer {
  const airState = playerAirStateAt(player, elapsedMs);

  return {
    ...player,
    airState
  };
}

function clearCompletedPlayerAirState(player: CombatPlayer, elapsedMs: number): CombatPlayer {
  const airState = playerAirStateAt(player, elapsedMs);

  if (airState !== "grounded") {
    return {
      ...player,
      airState
    };
  }

  return {
    ...player,
    airState,
    airborneUntilMs: 0,
    landingUntilMs: 0,
    jumpStartedAtMs: 0,
    airAttackUsed: false,
    airAttackType: "none",
    airAttackStartedAtMs: 0,
    airAttackUntilMs: 0
  };
}

function advancePlayerFramePosition(
  run: CombatRun,
  input: CombatInput,
  startPosition: CombatVector,
  elapsedMs: number
): { x: number; y: number; facing: 1 | -1; movementFinished: boolean; moveX: number; moveY: number; speed: number } {
  const moveX = input.moveX ?? 0;
  const moveY = input.moveY ?? 0;
  const speed = input.dash ? 0.42 : 0.24;

  if (run.elapsedMs < run.player.boundUntilMs) {
    if (elapsedMs > run.player.boundUntilMs) {
      const movableMs = elapsedMs - run.player.boundUntilMs;
      const facing = moveX === 0 ? run.player.facing : moveX > 0 ? 1 : -1;

      return {
        x: clamp(startPosition.x + moveX * speed * movableMs, 0, run.arena.width),
        y: clamp(startPosition.y + moveY * speed * movableMs, run.arena.minY, run.arena.maxY),
        facing,
        movementFinished: true,
        moveX,
        moveY,
        speed
      };
    }

    return {
      x: startPosition.x,
      y: startPosition.y,
      facing: run.player.facing,
      movementFinished: true,
      moveX: 0,
      moveY: 0,
      speed: 0
    };
  }

  if (run.elapsedMs < run.player.airAttackUntilMs) {
    if (elapsedMs > run.player.airAttackUntilMs) {
      const movableMs = elapsedMs - run.player.airAttackUntilMs;
      const facing = moveX === 0 ? run.player.facing : moveX > 0 ? 1 : -1;

      return {
        x: clamp(startPosition.x + moveX * speed * movableMs, 0, run.arena.width),
        y: clamp(startPosition.y + moveY * speed * movableMs, run.arena.minY, run.arena.maxY),
        facing,
        movementFinished: true,
        moveX,
        moveY,
        speed
      };
    }

    return {
      x: startPosition.x,
      y: startPosition.y,
      facing: run.player.facing,
      movementFinished: true,
      moveX: 0,
      moveY: 0,
      speed: 0
    };
  }

  const movement = run.player.activeSkillMovement;
  const skillMovementActive = movement !== undefined && run.elapsedMs < movement.endAtMs;

  if (skillMovementActive && movement) {
    if (elapsedMs <= movement.endAtMs) {
      const position = playerSkillMovementPosition(movement, elapsedMs);

      return {
        ...position,
        facing: run.player.facing,
        movementFinished: elapsedMs >= movement.endAtMs,
        moveX,
        moveY,
        speed
      };
    }

    const endPosition = playerSkillMovementPosition(movement, movement.endAtMs);
    const remainingMs = elapsedMs - movement.endAtMs;
    const facing = moveX === 0 ? run.player.facing : moveX > 0 ? 1 : -1;

    return {
      x: clamp(endPosition.x + moveX * speed * remainingMs, 0, run.arena.width),
      y: clamp(endPosition.y + moveY * speed * remainingMs, run.arena.minY, run.arena.maxY),
      facing,
      movementFinished: true,
      moveX,
      moveY,
      speed
    };
  }

  return {
    x: clamp(startPosition.x + moveX * speed * (elapsedMs - run.elapsedMs), 0, run.arena.width),
    y: clamp(startPosition.y + moveY * speed * (elapsedMs - run.elapsedMs), run.arena.minY, run.arena.maxY),
    facing: moveX === 0 ? run.player.facing : moveX > 0 ? 1 : -1,
    movementFinished: false,
    moveX,
    moveY,
    speed
  };
}

function clearCompletedSkillMovement(player: CombatPlayer, elapsedMs: number): CombatPlayer {
  if (!player.activeSkillMovement || elapsedMs < player.activeSkillMovement.endAtMs) {
    return player;
  }

  return {
    ...player,
    activeSkillMovement: undefined
  };
}

function interruptedActiveSkillId(before: CombatPlayer, after: CombatPlayer, fallbackSkillId?: string): string | undefined {
  const skillId = before.activeSkillMovement?.skillId ?? fallbackSkillId;

  if (!skillId || after.activeSkillMovement?.skillId === skillId) {
    return undefined;
  }

  const tookHit = after.hp < before.hp || after.hurtLockUntilMs > before.hurtLockUntilMs || after.defeated;

  return tookHit ? skillId : undefined;
}

function skillMovementIdAt(movement: CombatMovementSample | undefined, elapsedMs: number): string | undefined {
  if (!movement?.skillMovement || elapsedMs > movement.skillMovement.endAtMs) {
    return undefined;
  }

  return movement.skillMovement.skillId;
}

function cancelScheduledEnemyHitEffectsForSkill(run: CombatRun, skillId: string): CombatRun {
  return {
    ...run,
    scheduledEnemyHitEffects: (run.scheduledEnemyHitEffects ?? []).filter((effect) => effect.skillId !== skillId),
    scheduledMissEffects: (run.scheduledMissEffects ?? []).filter((effect) => effect.skillId !== skillId),
    player: {
      ...run.player,
      hitstopUntilMs: Math.min(run.player.hitstopUntilMs, run.elapsedMs)
    }
  };
}

function clearBufferedAction(player: CombatPlayer): CombatPlayer {
  return {
    ...player,
    bufferedAction: undefined,
    bufferedActionQueuedAtMs: undefined,
    bufferedActionExecuteAtMs: undefined
  };
}

function bossPhase(enemy: CombatEnemy): 1 | 2 {
  return enemy.bossPhase ?? 1;
}

function bossHpPercent(enemy: CombatEnemy): number {
  return enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
}

function taotieForgeCollapseHazardPositions(run: CombatRun, boss: CombatEnemy): CombatVector[] {
  const playerLane = clamp(run.player.y, run.arena.minY + 18, run.arena.maxY - 18);
  const bossSide = boss.position.x >= run.player.x ? 1 : -1;

  return [
    {
      x: clamp(run.player.x, taotieForgeCollapseRadiusX, run.arena.width - taotieForgeCollapseRadiusX),
      y: playerLane
    },
    {
      x: clamp(run.player.x + 148 * bossSide, taotieForgeCollapseRadiusX, run.arena.width - taotieForgeCollapseRadiusX),
      y: clamp(playerLane - 52, run.arena.minY + 18, run.arena.maxY - 18)
    },
    {
      x: clamp(run.player.x - 132 * bossSide, taotieForgeCollapseRadiusX, run.arena.width - taotieForgeCollapseRadiusX),
      y: clamp(playerLane + 56, run.arena.minY + 18, run.arena.maxY - 18)
    }
  ];
}

function createTaotieForgeCollapseHazards(
  run: CombatRun,
  boss: CombatEnemy,
  occurredAtMs: number
): { scheduled: CombatScheduledArenaHazard[]; events: CombatArenaHazardEvent[] } {
  const scheduled = taotieForgeCollapseHazardPositions(run, boss).map((position, index) => {
    const impactAtMs = occurredAtMs + taotieForgeCollapseTelegraphMs + index * taotieForgeCollapseHazardGapMs;

    return {
      hazardId: `${taotieForgeCollapseSkillId}-${occurredAtMs}-${boss.id}-${index}`,
      enemyId: boss.id,
      skillId: taotieForgeCollapseSkillId,
      x: position.x,
      y: position.y,
      radiusX: taotieForgeCollapseRadiusX,
      laneRange: taotieForgeCollapseLaneRange,
      impactAtMs,
      damage: taotieForgeCollapseHazardDamage,
      hitstopMs: taotieForgeCollapseHazardHitstopMs,
      knockback: taotieForgeCollapseHazardKnockback,
      vfxWindowMs: taotieForgeCollapseHazardVfxMs
    };
  });
  const events = scheduled.map((hazard) => ({
    kind: "arena-hazard" as const,
    id: `arena-hazard-${hazard.hazardId}-telegraph`,
    hazardId: hazard.hazardId,
    enemyId: hazard.enemyId,
    skillId: hazard.skillId,
    phase: "telegraph" as const,
    x: hazard.x,
    y: hazard.y,
    radiusX: hazard.radiusX,
    laneRange: hazard.laneRange,
    occurredAtMs,
    impactAtMs: hazard.impactAtMs,
    vfxCue: "taotie-forge-collapse-telegraph" as const,
    vfxWindowMs: hazard.impactAtMs - occurredAtMs
  }));

  return { scheduled, events };
}

function triggerBossPhaseTransitions(run: CombatRun, occurredAtMs = run.elapsedMs): CombatRun {
  if (run.completed || run.failed) {
    return run;
  }

  const events: CombatEvent[] = [];
  const scheduledArenaHazards: CombatScheduledArenaHazard[] = [];
  const enemies = run.enemies.map((enemy) => {
    if (enemy.kind !== "boss" || enemy.hp <= 0 || bossPhase(enemy) >= 2 || bossHpPercent(enemy) > 0.5) {
      return enemy;
    }

    const hazards = createTaotieForgeCollapseHazards(run, enemy, occurredAtMs);
    const phaseEvent: CombatBossPhaseEvent = {
      kind: "boss-phase",
      id: `boss-phase-${occurredAtMs}-${enemy.id}-2`,
      enemyId: enemy.id,
      phase: 2,
      skillId: taotieForgeCollapseSkillId,
      occurredAtMs,
      hazardCount: hazards.scheduled.length,
      vfxCue: taotieForgeCollapseSkillId,
      vfxWindowMs: taotieForgeCollapsePhaseVfxMs
    };

    events.push(phaseEvent, ...hazards.events);
    scheduledArenaHazards.push(...hazards.scheduled);

    return {
      ...enemy,
      bossPhase: 2 as const,
      bossPhaseTriggeredAtMs: occurredAtMs,
      attackProfileId: "taotie-forge-shackle" as const,
      attackPatternIds: taotieBossPhaseTwoPattern,
      nextAttackPatternIndex: taotieBossPhaseTwoPattern.indexOf("taotie-forge-shackle"),
      nextAttackAtMs: Math.max(enemy.nextAttackAtMs, occurredAtMs + 760),
      attackStartedAtMs: undefined,
      attackImpactAtMs: undefined,
      attackRecoverUntilMs: undefined,
      attackSkillId: undefined,
      attackHitResolved: undefined,
      attackResolvedHits: undefined,
      attackRushStartPosition: undefined,
      attackRushTargetPosition: undefined,
      attackPullStartPosition: undefined,
      attackPullTargetPosition: undefined
    };
  });

  if (events.length === 0) {
    return run;
  }

  return {
    ...run,
    enemies,
    events: [...run.events, ...events],
    scheduledArenaHazards: [...(run.scheduledArenaHazards ?? []), ...scheduledArenaHazards]
  };
}

function clearPendingCombatEffectsIfFailed(run: CombatRun): CombatRun {
  if (!run.failed && !run.player.defeated) {
    return run;
  }

  return {
    ...run,
    scheduledEnemyHitEffects: [],
    scheduledMissEffects: [],
    scheduledArenaHazards: []
  };
}

interface LightComboStepDefinition {
  baseDamage: number;
  rangeX: number;
  laneRange: number;
  hitstopMs: number;
  knockback: number;
  juggle: boolean;
  inputToHitMs: number;
  actionLockMs: number;
  actionTags?: CombatActionTag[];
}

const lightComboSteps: LightComboStepDefinition[] = [
  {
    baseDamage: 24,
    rangeX: 132,
    laneRange: 50,
    hitstopMs: 42,
    knockback: 22,
    juggle: false,
    inputToHitMs: 55,
    actionLockMs: 180
  },
  {
    baseDamage: 30,
    rangeX: 150,
    laneRange: 54,
    hitstopMs: 48,
    knockback: 28,
    juggle: false,
    inputToHitMs: 65,
    actionLockMs: 200
  },
  {
    baseDamage: 38,
    rangeX: 176,
    laneRange: 58,
    hitstopMs: 60,
    knockback: 42,
    juggle: true,
    inputToHitMs: 78,
    actionLockMs: 240,
    actionTags: ["launcher"]
  }
];

function comboStillActive(run: CombatRun, elapsedMs = run.elapsedMs): boolean {
  return run.comboCount > 0 && elapsedMs <= run.comboExpiresAtMs;
}

function activeLightComboStep(run: CombatRun): number {
  return comboStillActive(run) ? run.player.comboStep : 0;
}

function nextLightComboStep(run: CombatRun): number {
  return (activeLightComboStep(run) % lightComboSteps.length) + 1;
}

function getDungeon(dungeonId: string) {
  return catalog.dungeons.find((dungeon) => dungeon.id === dungeonId);
}

function enemyStats(kind: EnemyKind): Pick<CombatEnemy, "displayName" | "hp" | "maxHp" | "armor" | "body" | "hurtbox"> {
  if (kind === "boss") {
    return {
      displayName: "琉璃监工",
      hp: 520,
      maxHp: 520,
      armor: 80,
      body: { width: 260, height: 216 },
      hurtbox: { width: 190, height: 128 }
    };
  }

  if (kind === "elite") {
    return {
      displayName: "窑巷卫士",
      hp: 180,
      maxHp: 180,
      armor: 30,
      body: { width: 188, height: 148 },
      hurtbox: { width: 132, height: 96 }
    };
  }

  return {
    displayName: "灰烬小妖",
    hp: 80,
    maxHp: 80,
    armor: 0,
    body: { width: 144, height: 116 },
    hurtbox: { width: 82, height: 52 }
  };
}

function defaultEnemyAttackProfile(kind: EnemyKind): EnemyAttackProfileId {
  if (kind === "boss") {
    return "taotie-flame-breath";
  }

  if (kind === "elite") {
    return "zheng-shockwave";
  }

  return "ash-ember-spit";
}

function isEnemyAttackProfileId(value: string | undefined): value is EnemyAttackProfileId {
  return (
    value === "ash-ember-spit" ||
    value === "ash-crawler-burst" ||
    value === "zheng-shockwave" ||
    value === "zheng-horn-charge" ||
    value === "taotie-flame-breath" ||
    value === "taotie-devour-pull" ||
    value === "taotie-ash-summon" ||
    value === "taotie-forge-shackle"
  );
}

function enemyAttackProfileKind(profileId: EnemyAttackProfileId): EnemyKind {
  if (
    profileId === "taotie-flame-breath" ||
    profileId === "taotie-devour-pull" ||
    profileId === "taotie-ash-summon" ||
    profileId === "taotie-forge-shackle"
  ) {
    return "boss";
  }

  if (profileId === "zheng-shockwave" || profileId === "zheng-horn-charge") {
    return "elite";
  }

  return "trash";
}

function nextEnemyAttackProfile(enemy: Pick<CombatEnemy, "kind" | "attackProfileId" | "attackSkillId" | "attackPatternIds" | "nextAttackPatternIndex">): EnemyAttackProfileId {
  if (isEnemyAttackProfileId(enemy.attackSkillId)) {
    return enemy.attackSkillId;
  }

  const patternIds = enemy.attackPatternIds?.filter((profileId) => enemyAttackProfileKind(profileId) === enemy.kind);

  if (patternIds && patternIds.length > 0) {
    return patternIds[enemy.nextAttackPatternIndex ?? 0] ?? patternIds[0];
  }

  if (enemyAttackProfileKind(enemy.attackProfileId) === enemy.kind) {
    return enemy.attackProfileId;
  }

  return defaultEnemyAttackProfile(enemy.kind);
}

function enemyAttackDefinition(enemy: Pick<CombatEnemy, "kind" | "attackProfileId" | "attackSkillId"> | EnemyKind): EnemyAttackDefinition {
  const profileId =
    typeof enemy === "string"
      ? defaultEnemyAttackProfile(enemy)
      : isEnemyAttackProfileId(enemy.attackSkillId)
        ? enemy.attackSkillId
        : enemyAttackProfileKind(enemy.attackProfileId) === enemy.kind
          ? enemy.attackProfileId
          : defaultEnemyAttackProfile(enemy.kind);

  if (profileId === "taotie-forge-shackle") {
    return {
      skillId: "taotie-forge-shackle",
      damage: 44,
      rangeX: 270,
      laneRange: 24,
      windupMs: 520,
      recoveryMs: 520,
      cooldownMs: 3300,
      hitstopMs: 70,
      knockback: 18,
      hitCount: 2,
      hitIntervalMs: 240,
      vfxCue: "taotie-forge-shackle-bind",
      hitVfxCues: ["taotie-forge-shackle-bind", "taotie-forge-shackle-slam"],
      vfxWindowMs: 620,
      feedbackCue: "player-hurt-forge-shackle",
      feedbackCues: ["player-hurt-forge-shackle", "player-hurt-forge-slam"],
      invulnerabilityMs: 0,
      invulnerabilityMsByHit: [0, 520],
      hurtLockMs: 540,
      hurtLockMsByHit: [560, 520],
      damageMultipliers: [0.55, 1.45],
      knockbackByHit: [0, 74],
      boundMsByHit: [360, 0],
      jumpEvade: true
    };
  }

  if (profileId === "taotie-ash-summon") {
    return {
      skillId: "taotie-ash-summon",
      damage: 0,
      rangeX: 0,
      laneRange: 0,
      windupMs: 540,
      recoveryMs: 520,
      cooldownMs: 3100,
      hitstopMs: 0,
      knockback: 0,
      hitCount: 1,
      hitIntervalMs: 0,
      vfxCue: "taotie-ash-summon-rift",
      vfxWindowMs: 720,
      feedbackCue: "player-hurt-heavy",
      invulnerabilityMs: 0,
      hurtLockMs: 0,
      summonProfileIds: ["ash-crawler-burst", "ash-crawler-burst"]
    };
  }

  if (profileId === "taotie-devour-pull") {
    return {
      skillId: "taotie-devour-pull",
      damage: 58,
      rangeX: 126,
      laneRange: 24,
      windupMs: 460,
      recoveryMs: 420,
      cooldownMs: 2600,
      hitstopMs: 76,
      knockback: 30,
      hitCount: 1,
      hitIntervalMs: 0,
      vfxCue: "taotie-devour-bite",
      vfxWindowMs: 560,
      feedbackCue: "player-hurt-devoured",
      invulnerabilityMs: 520,
      hurtLockMs: 520,
      windupPullPx: 180
    };
  }

  if (profileId === "taotie-flame-breath") {
    return {
      skillId: "taotie-flame-breath",
      damage: 44,
      rangeX: 330,
      laneRange: 86,
      windupMs: 420,
      recoveryMs: 360,
      cooldownMs: 2200,
      hitstopMs: 60,
      knockback: 42,
      hitCount: 3,
      hitIntervalMs: 180,
      vfxCue: "taotie-flame-breath-sustain",
      vfxWindowMs: 520,
      feedbackCue: "player-hurt-boss-breath",
      invulnerabilityMs: 120,
      hurtLockMs: 260
    };
  }

  if (profileId === "zheng-shockwave") {
    return {
      skillId: "zheng-shockwave",
      damage: 52,
      rangeX: 230,
      laneRange: 68,
      windupMs: 360,
      recoveryMs: 300,
      cooldownMs: 1800,
      hitstopMs: 48,
      knockback: 64,
      hitCount: 1,
      hitIntervalMs: 0,
      vfxCue: "zheng-shockwave-impact",
      vfxWindowMs: 420,
      feedbackCue: "player-hurt-heavy",
      invulnerabilityMs: 560,
      hurtLockMs: 420,
      jumpEvade: true
    };
  }

  if (profileId === "zheng-horn-charge") {
    return {
      skillId: "zheng-horn-charge",
      damage: 46,
      rangeX: 92,
      laneRange: 30,
      windupMs: 420,
      recoveryMs: 360,
      cooldownMs: 2100,
      hitstopMs: 54,
      knockback: 82,
      hitCount: 1,
      hitIntervalMs: 0,
      vfxCue: "zheng-horn-charge-impact",
      vfxWindowMs: 480,
      feedbackCue: "player-hurt-heavy",
      invulnerabilityMs: 560,
      hurtLockMs: 460,
      windupRushPx: 260,
      jumpEvade: true
    };
  }

  if (profileId === "ash-crawler-burst") {
    return {
      skillId: "ash-crawler-burst",
      damage: 38,
      rangeX: 70,
      laneRange: 46,
      windupMs: 320,
      recoveryMs: 340,
      cooldownMs: 1900,
      hitstopMs: 52,
      knockback: 68,
      hitCount: 1,
      hitIntervalMs: 0,
      vfxCue: "ash-crawler-burst-explode",
      vfxWindowMs: 460,
      feedbackCue: "player-hurt-heavy",
      invulnerabilityMs: 560,
      hurtLockMs: 460,
      windupRushPx: 190,
      jumpEvade: true
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
    knockback: 42,
    hitCount: 1,
    hitIntervalMs: 0,
    vfxCue: "ash-ember-spit-impact",
    vfxWindowMs: 360,
    feedbackCue: "player-hurt-light",
    invulnerabilityMs: 560,
    hurtLockMs: 420
  };
}

function createEnemy(
  dungeonId: DungeonId,
  roomIndex: number,
  enemyIndex: number,
  kind: EnemyKind,
  attackProfileId = defaultEnemyAttackProfile(kind)
): CombatEnemy {
  const stats = enemyStats(kind);
  const attackPatternIds: EnemyAttackProfileId[] | undefined = kind === "boss" ? taotieBossPhaseOnePattern : undefined;
  const nextAttackPatternIndex = attackPatternIds
    ? attackPatternIds.includes(attackProfileId)
      ? attackPatternIds.indexOf(attackProfileId)
      : 0
    : undefined;

  return {
    id: `${dungeonId}-room-${roomIndex}-enemy-${enemyIndex}`,
    kind,
    ...stats,
    displayName:
      attackProfileId === "ash-crawler-burst"
        ? "灰烬爬妖"
        : attackProfileId === "zheng-horn-charge"
          ? "雷角狰"
          : stats.displayName,
    attackProfileId,
    attackPatternIds,
    nextAttackPatternIndex,
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
    return [
      createEnemy(dungeonId, roomIndex, 0, "elite", "zheng-shockwave"),
      createEnemy(dungeonId, roomIndex, 1, "elite", "zheng-horn-charge"),
      createEnemy(dungeonId, roomIndex, 2, "trash", "ash-ember-spit")
    ];
  }

  return [
    createEnemy(dungeonId, roomIndex, 0, "trash", "ash-ember-spit"),
    createEnemy(dungeonId, roomIndex, 1, "trash", "ash-crawler-burst")
  ];
}

function createTaotieAshSummons(
  run: Pick<CombatRun, "dungeonId" | "roomIndex" | "arena" | "enemies">,
  boss: CombatEnemy,
  profileIds: EnemyAttackProfileId[],
  occurredAtMs: number
): CombatEnemy[] {
  const offsets = [-128, 128];

  return profileIds.map((profileId, index) => {
    const base = createEnemy(run.dungeonId, run.roomIndex, run.enemies.length + index, "trash", profileId);
    const x = clamp(boss.position.x + (offsets[index] ?? 128 * (index + 1)), 72, run.arena.width - 72);
    const yOffset = index % 2 === 0 ? -34 : 34;
    const y = clamp(boss.position.y + yOffset, run.arena.minY, run.arena.maxY);

    return {
      ...base,
      id: `${run.dungeonId}-room-${run.roomIndex}-summon-${occurredAtMs}-${boss.id}-${index}`,
      position: { x, y },
      nextAttackAtMs: occurredAtMs + taotieAshSummonMinionDelayMs + index * 160,
      attackStartedAtMs: undefined,
      attackImpactAtMs: undefined,
      attackRecoverUntilMs: undefined,
      attackSkillId: undefined,
      attackHitResolved: undefined,
      attackResolvedHits: undefined,
      attackRushStartPosition: undefined,
      attackRushTargetPosition: undefined,
      attackPullStartPosition: undefined,
      attackPullTargetPosition: undefined
    };
  });
}

function eventHitstop(enemy: CombatEnemy, hitstopMs: number): number {
  if (enemy.kind === "boss" && enemy.armor > 0) {
    return Math.min(hitstopMs, 25);
  }

  return hitstopMs;
}

function enemyDistanceScore(run: CombatRun, enemy: CombatEnemy): number {
  const xDistance = Math.max(0, Math.abs(enemy.position.x - run.player.x) - enemy.hurtbox.width / 2);
  const yDistance = Math.max(0, Math.abs(enemy.position.y - run.player.y) - enemy.hurtbox.height / 2);

  return xDistance * 10 + yDistance;
}

function axisDistanceOutsideHalfSize(distance: number, halfSize: number): number {
  return Math.max(0, Math.abs(distance) - halfSize);
}

function enemyOverlapsFrontHitbox(run: CombatRun, enemy: CombatEnemy, hitbox: PlayerHitboxDefinition): boolean {
  const halfWidth = enemy.hurtbox.width / 2;
  const enemyMinX = enemy.position.x - halfWidth;
  const enemyMaxX = enemy.position.x + halfWidth;

  if (run.player.facing >= 0) {
    return enemyMaxX >= run.player.x && enemyMinX <= run.player.x + hitbox.rangeX;
  }

  return enemyMinX <= run.player.x && enemyMaxX >= run.player.x - hitbox.rangeX;
}

function enemyInPlayerHitbox(run: CombatRun, enemy: CombatEnemy, hitbox: PlayerHitboxDefinition): boolean {
  if (enemy.hp <= 0) {
    return false;
  }

  const xDistance = axisDistanceOutsideHalfSize(enemy.position.x - run.player.x, enemy.hurtbox.width / 2);
  const yDistance = axisDistanceOutsideHalfSize(enemy.position.y - run.player.y, enemy.hurtbox.height / 2);
  const inRange = hitbox.frontOnly ? enemyOverlapsFrontHitbox(run, enemy, hitbox) : xDistance <= hitbox.rangeX;

  return inRange && yDistance <= hitbox.laneRange;
}

function selectPlayerTargets(run: CombatRun, hitbox: PlayerHitboxDefinition): CombatEnemy[] {
  return run.enemies
    .filter((enemy) => {
      if (!enemyInPlayerHitbox(run, enemy, hitbox)) {
        return false;
      }

      if (!hitbox.requiresStatusSourceSkillId) {
        return true;
      }

      return enemy.statusSourceSkillId === hitbox.requiresStatusSourceSkillId && (enemy.controlledUntilMs ?? 0) > run.elapsedMs;
    })
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

function appendSkillCastEvent(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const event: CombatSkillCastEvent = {
    kind: "skill-cast",
    id: `skill-cast-${run.elapsedMs}-${skill.id}`,
    action: "skill",
    skillId: skill.id,
    occurredAtMs: run.elapsedMs,
    inputToHitMs: 0,
    canceledFromCombo,
    statusTags: skillStatusTags(skill.tags),
    actionTags: actionTagsForSkill(skill.tags),
    casterPosition: { x: run.player.x, y: run.player.y },
    casterFacing: run.player.facing
  };

  return {
    ...run,
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
        actionTags: hitbox.actionTags,
        ...repeatedSkillHitPresentation(hitbox.skillId)
      });
    }

    return next;
  }, run);
}

function actionAddedHitEvent(before: CombatRun, after: CombatRun, action: CombatHitEvent["action"]): boolean {
  const existingEventIds = new Set(before.events.filter((event): event is CombatHitEvent => event.kind === "hit").map((event) => event.id));

  return after.events.some((event): event is CombatHitEvent => event.kind === "hit" && event.action === action && !existingEventIds.has(event.id));
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
  if (skill.id === "spark-combo") {
    return 26;
  }

  if (skill.id === "iron-palm") {
    return 34;
  }

  if (skill.id === "cinder-uppercut") {
    return 64;
  }

  if (skill.id === "anvil-crash") {
    return 74;
  }

  if (skill.id === "earth-furnace-breaker") {
    return 46;
  }

  if (skill.id === "furnace-step") {
    return 124;
  }

  if (skill.id === "prism-step") {
    return 104;
  }

  if (skill.id === "shadow-roll") {
    return -86;
  }

  if (skill.id === "glass-cut") {
    return 52;
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

function startPlayerSkillMovement(run: CombatRun, skill: ClassSkillDefinition, endPosition: CombatVector, endAtMs?: number): CombatRun {
  return {
    ...run,
    player: {
      ...run.player,
      activeSkillMovement: {
        skillId: skill.id,
        startAtMs: run.elapsedMs,
        endAtMs: endAtMs ?? run.elapsedMs + skill.animation.hitFrameMs,
        startX: run.player.x,
        startY: run.player.y,
        endX: endPosition.x,
        endY: endPosition.y
      }
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

function repeatedSkillHitPresentation(skillId: string | undefined): Pick<HitDefinition, "hitPhase" | "vfxCue" | "vfxWindowMs"> {
  if (skillId === "black-rain-volley") {
    return {
      hitPhase: "rain",
      vfxCue: "black-rain-fall",
      vfxWindowMs: 300
    };
  }

  return {};
}

function sparkComboHitbox(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): PlayerHitboxDefinition {
  return {
    action: "skill",
    skillId: skill.id,
    rangeX: 118,
    laneRange: 48,
    targetCap: 1,
    frontOnly: true,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 0.92)),
    hitstopMs: 52,
    knockback: 22,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo
  };
}

function applySparkCombo(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + skillMovementDistance(skill) * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );

  return schedulePlayerHitboxEffect(
    movingRun,
    sparkComboHitbox(run, skill, canceledFromCombo),
    endPosition,
    run.player.facing,
    {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-jab-chain`,
      hitPhase: "jab-chain",
      vfxCue: "ember-jab-chain",
      vfxWindowMs: 240
    }
  );
}

function ironPalmHitbox(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): PlayerHitboxDefinition {
  return {
    action: "skill",
    skillId: skill.id,
    rangeX: 132,
    laneRange: 54,
    targetCap: 1,
    frontOnly: true,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 0.98)),
    hitstopMs: 58,
    knockback: 34,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags: ["stagger"]
  };
}

function applyIronPalm(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + skillMovementDistance(skill) * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );

  return schedulePlayerHitboxEffect(movingRun, ironPalmHitbox(run, skill, canceledFromCombo), endPosition, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-shield-jab`,
    hitPhase: "shield-jab",
    vfxCue: "iron-shield-jab",
    vfxWindowMs: 260
  });
}

function anvilCrashHitbox(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): PlayerHitboxDefinition {
  return {
    action: "skill",
    skillId: skill.id,
    rangeX: skillRangeX(skill.tags),
    laneRange: skillLaneRange(skill.tags),
    targetCap: skillTargetCap(skill.tags),
    frontOnly: false,
    damage: skillDamage(run, skill),
    hitstopMs: 94,
    knockback: 58,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    actionTags: ["slam", "knockdown"]
  };
}

function applyAnvilCrash(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + skillMovementDistance(skill) * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );

  return schedulePlayerHitboxEffect(
    movingRun,
    anvilCrashHitbox(run, skill, canceledFromCombo),
    endPosition,
    run.player.facing,
    {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-anvil-slam`,
      hitPhase: "anvil-slam",
      vfxCue: "anvil-crash-impact",
      vfxWindowMs: 360
    }
  );
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

function cinderUppercutHitbox(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): PlayerHitboxDefinition {
  return {
    action: "skill",
    skillId: skill.id,
    rangeX: Math.max(96, skillRangeX(skill.tags)),
    laneRange: Math.max(54, skillLaneRange(skill.tags)),
    targetCap: 1,
    frontOnly: true,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 1.06)),
    hitstopMs: 68,
    knockback: 24,
    juggle: true,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags: ["stagger"],
    actionTags: ["launcher"]
  };
}

function applyCinderUppercut(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + skillMovementDistance(skill) * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );

  return schedulePlayerHitboxEffect(movingRun, cinderUppercutHitbox(run, skill, canceledFromCombo), endPosition, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-uppercut`,
    hitPhase: "uppercut",
    vfxCue: "cinder-uppercut-rise",
    vfxWindowMs: 320
  });
}

function glassCutHitbox(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): PlayerHitboxDefinition {
  return {
    action: "skill",
    skillId: skill.id,
    rangeX: 122,
    laneRange: 46,
    targetCap: 1,
    frontOnly: true,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 0.9)),
    hitstopMs: 50,
    knockback: 24,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo
  };
}

function applyGlassCut(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + skillMovementDistance(skill) * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );

  return schedulePlayerHitboxEffect(
    movingRun,
    glassCutHitbox(run, skill, canceledFromCombo),
    { x: run.player.x, y: run.player.y },
    run.player.facing,
    {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-slash`,
    hitPhase: "glass-cut",
    vfxCue: "glass-slash-cut",
    vfxWindowMs: 260
    }
  );
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

function blackRainVolleyHitbox(
  run: CombatRun,
  skill: ClassSkillDefinition,
  canceledFromCombo: boolean,
  delayMs: number
): PlayerHitboxDefinition {
  return {
    action: "skill",
    skillId: skill.id,
    rangeX: skillRangeX(skill.tags),
    laneRange: skillLaneRange(skill.tags),
    targetCap: skillTargetCap(skill.tags),
    frontOnly: false,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 0.42)),
    hitstopMs: 58,
    knockback: 12,
    juggle: false,
    inputToHitMs: delayMs,
    canceledFromCombo
  };
}

function applyBlackRainVolley(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const castingRun = appendSkillCastEvent(
    startPlayerSkillMovement(
      run,
      skill,
      {
        x: run.player.x,
        y: run.player.y
      },
      run.elapsedMs + skill.animation.durationMs
    ),
    skill,
    canceledFromCombo
  );
  const rainDelays = [skill.animation.hitFrameMs, skill.animation.hitFrameMs + 110, skill.animation.hitFrameMs + 220];

  return rainDelays.reduce((nextRun, delayMs, rainIndex) => {
    return schedulePlayerHitboxEffect(
      nextRun,
      blackRainVolleyHitbox(run, skill, canceledFromCombo, delayMs),
      {
        x: run.player.x,
        y: run.player.y
      },
      run.player.facing,
      {
        id: `hit-${run.elapsedMs}-skill-${skill.id}-rain-${rainIndex}`,
        hitPhase: "rain",
        vfxCue: "black-rain-fall",
        vfxWindowMs: 300
      }
    );
  }, castingRun);
}

const swordPrismFieldLockDelayMs = 390;
const swordPrismFieldBurstDelayMs = 610;

function swordPrismFieldCenter(run: CombatRun): CombatVector {
  return {
    x: clamp(run.player.x + 150 * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
}

function swordPrismFieldHitbox(
  run: CombatRun,
  skill: ClassSkillDefinition,
  canceledFromCombo: boolean,
  delayMs: number,
  stage: "lock" | "burst"
): PlayerHitboxDefinition {
  const burst = stage === "burst";

  return {
    action: "skill",
    skillId: skill.id,
    rangeX: 260,
    laneRange: 112,
    targetCap: 3,
    frontOnly: false,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * (burst ? 1.16 : 0.36))),
    hitstopMs: burst ? 112 : 60,
    knockback: burst ? 48 : 8,
    juggle: false,
    inputToHitMs: delayMs,
    canceledFromCombo,
    statusTags: ["stagger"],
    actionTags: burst ? ["knockdown"] : []
  };
}

function applySwordPrismField(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const center = swordPrismFieldCenter(run);
  const castingRun = appendSkillCastEvent(
    startPlayerSkillMovement(
      run,
      skill,
      {
        x: run.player.x,
        y: run.player.y
      },
      run.elapsedMs + swordPrismFieldBurstDelayMs
    ),
    skill,
    canceledFromCombo
  );
  const lockedRun = schedulePlayerHitboxEffect(
    castingRun,
    swordPrismFieldHitbox(run, skill, canceledFromCombo, swordPrismFieldLockDelayMs, "lock"),
    center,
    run.player.facing,
    {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-prism-field-lock`,
      hitPhase: "prism-field-lock",
      vfxCue: "sword-prism-field-lock",
      vfxWindowMs: 520
    }
  );

  return schedulePlayerHitboxEffect(
    lockedRun,
    swordPrismFieldHitbox(run, skill, canceledFromCombo, swordPrismFieldBurstDelayMs, "burst"),
    center,
    run.player.facing,
    {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-prism-field-burst`,
      hitPhase: "prism-field-burst",
      vfxCue: "sword-prism-field-burst",
      vfxWindowMs: 640,
      missOnEmpty: false
    }
  );
}

function selectPrismStepTargets(run: CombatRun, scriptedRun: CombatRun, skill: ClassSkillDefinition): CombatEnemy[] {
  const startX = run.player.x;
  const endX = scriptedRun.player.x;
  const minX = Math.min(startX, endX) - 22;
  const maxX = Math.max(startX, endX) + 22;
  const laneRange = skillLaneRange(skill.tags);

  return run.enemies
    .filter((enemy) => {
      if (enemy.hp <= 0) {
        return false;
      }

      const enemyMinX = enemy.position.x - enemy.hurtbox.width / 2;
      const enemyMaxX = enemy.position.x + enemy.hurtbox.width / 2;
      const yDistance = axisDistanceOutsideHalfSize(enemy.position.y - run.player.y, enemy.hurtbox.height / 2);

      return enemyMaxX >= minX && enemyMinX <= maxX && yDistance <= laneRange;
    })
    .sort((left, right) => (left.position.x - right.position.x) * run.player.facing)
    .slice(0, 2);
}

function selectFurnaceStepTargets(run: CombatRun, endPosition: CombatVector, skill: ClassSkillDefinition): CombatEnemy[] {
  const startX = run.player.x;
  const endX = endPosition.x;
  const minX = Math.min(startX, endX) - 30;
  const maxX = Math.max(startX, endX) + 34;
  const laneRange = Math.max(46, skillLaneRange(skill.tags));

  return run.enemies
    .filter((enemy) => {
      if (enemy.hp <= 0) {
        return false;
      }

      const enemyMinX = enemy.position.x - enemy.hurtbox.width / 2;
      const enemyMaxX = enemy.position.x + enemy.hurtbox.width / 2;
      const yDistance = axisDistanceOutsideHalfSize(enemy.position.y - run.player.y, enemy.hurtbox.height / 2);
      const centerInFront = (enemy.position.x - run.player.x) * run.player.facing >= 0;

      return centerInFront && enemyMaxX >= minX && enemyMinX <= maxX && yDistance <= laneRange;
    })
    .sort((left, right) => (left.position.x - right.position.x) * run.player.facing)
    .slice(0, 1);
}

function applyFurnaceStep(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + skillMovementDistance(skill) * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );
  const targetingHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: Math.max(150, skillRangeX(skill.tags)),
    laneRange: Math.max(46, skillLaneRange(skill.tags)),
    targetCap: 1,
    frontOnly: true,
    damage: skillDamage(run, skill),
    hitstopMs: 64,
    knockback: 58,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags: ["stagger"]
  };
  const targets = selectFurnaceStepTargets(run, endPosition, skill);

  if (targets.length === 0) {
    return scheduleMissEffect(movingRun, targetingHitbox);
  }

  return targets.reduce((nextRun, target) => {
    return scheduleEnemyHitEffect(nextRun, {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-shoulder-impact-${target.id}`,
      targetId: target.id,
      damage: Math.max(1, Math.round(skillDamage(run, skill) * 1.04)),
      hitstopMs: 64,
      knockback: 58,
      juggle: false,
      action: "skill",
      skillId: skill.id,
      inputToHitMs: skill.animation.hitFrameMs,
      canceledFromCombo,
      statusTags: ["stagger"],
      hitPhase: "shoulder-impact",
      vfxCue: "furnace-shoulder-impact",
      vfxWindowMs: 300
    });
  }, movingRun);
}

function shadowRollHitbox(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): PlayerHitboxDefinition {
  return {
    action: "skill",
    skillId: skill.id,
    rangeX: Math.max(190, skillRangeX(skill.tags)),
    laneRange: Math.max(54, skillLaneRange(skill.tags)),
    targetCap: 1,
    frontOnly: true,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 0.92)),
    hitstopMs: 52,
    knockback: 36,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags: ["stagger"]
  };
}

function applyShadowRoll(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + skillMovementDistance(skill) * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );
  const hitbox = shadowRollHitbox(run, skill, canceledFromCombo);

  return schedulePlayerHitboxEffect(movingRun, hitbox, endPosition, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-roll-shot`,
    hitPhase: "roll-shot",
    vfxCue: "shadow-roll-shot",
    vfxWindowMs: 280
  });
}

function inkShotHitbox(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): PlayerHitboxDefinition {
  return {
    action: "skill",
    skillId: skill.id,
    rangeX: skillRangeX(skill.tags),
    laneRange: 56,
    targetCap: 1,
    frontOnly: true,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 0.9)),
    hitstopMs: 48,
    knockback: 28,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags: ["stagger"]
  };
}

function applyInkShot(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const castingRun = appendSkillCastEvent(
    startPlayerSkillMovement(
      run,
      skill,
      {
        x: run.player.x,
        y: run.player.y
      },
      run.elapsedMs + skill.animation.hitFrameMs
    ),
    skill,
    canceledFromCombo
  );

  return schedulePlayerHitboxEffect(castingRun, inkShotHitbox(run, skill, canceledFromCombo), run.player, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-ink-bolt`,
    hitPhase: "ink-bolt",
    vfxCue: "ink-shot-pierce",
    vfxWindowMs: 260
  });
}

const inkSnareBindDelayMs = 250;
const inkSnareSnapDelayMs = 430;

function inkSnareCenter(run: CombatRun): CombatVector {
  return {
    x: clamp(run.player.x + 112 * run.player.facing, 0, arena.width),
    y: run.player.y
  };
}

function applyInkSnare(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const facing = run.player.facing;
  const center = inkSnareCenter(run);
  const endPosition = {
    x: clamp(run.player.x + skill.animation.lungePx * facing, 0, run.arena.width),
    y: run.player.y
  };
  const castingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + inkSnareSnapDelayMs),
    skill,
    canceledFromCombo
  );
  const baseDamage = skillDamage(run, skill);
  const bindHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 170,
    laneRange: 82,
    targetCap: 3,
    frontOnly: false,
    damage: Math.max(1, Math.round(baseDamage * 0.34)),
    hitstopMs: 48,
    knockback: 0,
    juggle: false,
    inputToHitMs: inkSnareBindDelayMs,
    canceledFromCombo,
    statusTags: ["trap", "control"]
  };
  const snapHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 190,
    laneRange: 90,
    targetCap: 3,
    frontOnly: false,
    damage: Math.max(1, Math.round(baseDamage * 0.78)),
    hitstopMs: 76,
    knockback: 0,
    juggle: false,
    inputToHitMs: inkSnareSnapDelayMs,
    canceledFromCombo,
    pullCenter: center,
    statusTags: ["trap", "control", "stagger"],
    actionTags: ["pull"],
    requiresStatusSourceSkillId: skill.id
  };
  const boundRun = schedulePlayerHitboxEffect(castingRun, bindHitbox, center, facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-bind`,
    hitPhase: "trap-bind",
    vfxCue: "ink-snare-bind",
    vfxWindowMs: 360
  });

  return schedulePlayerHitboxEffect(boundRun, snapHitbox, center, facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-snap`,
    hitPhase: "trap-snap",
    vfxCue: "ink-snare-snap",
    vfxWindowMs: 520,
    missOnEmpty: false
  });
}

const heatBloomDrawDelayMs = 240;
const heatBloomEruptionDelayMs = 390;

function heatBloomCenter(run: CombatRun): CombatVector {
  return {
    x: clamp(run.player.x + 112 * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
}

function selectHeatBloomTargets(run: CombatRun, center: CombatVector): CombatEnemy[] {
  return run.enemies
    .filter((enemy) => {
      if (enemy.hp <= 0) {
        return false;
      }

      const xDistance = axisDistanceOutsideHalfSize(enemy.position.x - center.x, enemy.hurtbox.width / 2);
      const yDistance = axisDistanceOutsideHalfSize(enemy.position.y - center.y, enemy.hurtbox.height / 2);

      return xDistance <= 170 && yDistance <= 82;
    })
    .sort((left, right) => {
      const leftDistance = Math.abs(left.position.x - center.x) + Math.abs(left.position.y - center.y) * 0.5;
      const rightDistance = Math.abs(right.position.x - center.x) + Math.abs(right.position.y - center.y) * 0.5;

      return leftDistance - rightDistance;
    })
    .slice(0, 3);
}

function applyHeatBloom(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const center = heatBloomCenter(run);
  const castingRun = appendSkillCastEvent(
    startPlayerSkillMovement(
      run,
      skill,
      {
        x: run.player.x,
        y: run.player.y
      },
      run.elapsedMs + heatBloomEruptionDelayMs
    ),
    skill,
    canceledFromCombo
  );
  const targetingHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 170,
    laneRange: 82,
    targetCap: 3,
    frontOnly: false,
    damage: skillDamage(run, skill),
    hitstopMs: 56,
    knockback: 0,
    juggle: false,
    inputToHitMs: heatBloomDrawDelayMs,
    canceledFromCombo,
    statusTags: ["stagger"]
  };
  const targets = selectHeatBloomTargets(run, center);

  if (targets.length === 0) {
    return scheduleMissEffect(castingRun, targetingHitbox);
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
    pullCenter?: CombatVector;
    statusTags: CombatSkillStatusTag[];
    actionTags: CombatActionTag[];
    vfxWindowMs: number;
  }> = [
    {
      phase: "heat-draw",
      vfxCue: "heat-bloom-draw",
      delayMs: heatBloomDrawDelayMs,
      damageMultiplier: 0.34,
      hitstopMs: 48,
      knockback: 0,
      juggle: false,
      pullCenter: center,
      statusTags: ["stagger"],
      actionTags: [],
      vfxWindowMs: 340
    },
    {
      phase: "heat-eruption",
      vfxCue: "heat-bloom-eruption",
      delayMs: heatBloomEruptionDelayMs,
      damageMultiplier: 0.96,
      hitstopMs: 86,
      knockback: 36,
      juggle: true,
      statusTags: ["stagger"],
      actionTags: ["launcher"],
      vfxWindowMs: 520
    }
  ];

  return stages.reduce((nextRun, stage) => {
    return targets.reduce((stageRun, target) => {
      return scheduleEnemyHitEffect(stageRun, {
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
        pullCenter: stage.pullCenter,
        statusTags: stage.statusTags,
        actionTags: stage.actionTags,
        hitPhase: stage.phase,
        vfxCue: stage.vfxCue,
        vfxWindowMs: stage.vfxWindowMs
      });
    }, nextRun);
  }, castingRun);
}

const furnaceHeartOverdrivePulseDelayMs = 360;
const furnaceHeartOverdriveReleaseDelayMs = 560;

function selectFurnaceHeartOverdriveTargets(run: CombatRun): CombatEnemy[] {
  const hitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: "furnace-heart-overdrive",
    rangeX: 220,
    laneRange: 108,
    targetCap: 3,
    frontOnly: false,
    damage: 1,
    hitstopMs: 1,
    knockback: 0,
    juggle: false,
    inputToHitMs: furnaceHeartOverdrivePulseDelayMs,
    canceledFromCombo: false
  };

  return selectPlayerTargets(run, hitbox);
}

function applyFurnaceHeartOverdrive(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const castRun = appendSkillCastEvent(
    startPlayerSkillMovement(
      run,
      skill,
      {
        x: run.player.x,
        y: run.player.y
      },
      run.elapsedMs + furnaceHeartOverdriveReleaseDelayMs
    ),
    skill,
    canceledFromCombo
  );
  const targetingHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 220,
    laneRange: 108,
    targetCap: 3,
    frontOnly: false,
    damage: skillDamage(run, skill),
    hitstopMs: 66,
    knockback: 18,
    juggle: false,
    inputToHitMs: furnaceHeartOverdrivePulseDelayMs,
    canceledFromCombo,
    statusTags: ["stagger"]
  };
  const targets = selectFurnaceHeartOverdriveTargets(run);

  if (targets.length === 0) {
    return scheduleMissEffect(castRun, targetingHitbox);
  }

  const baseDamage = skillDamage(run, skill);
  const stages: Array<{
    phase: CombatHitPhase;
    vfxCue: CombatVfxCue;
    delayMs: number;
    damageMultiplier: number;
    hitstopMs: number;
    knockback: number;
    statusTags: CombatSkillStatusTag[];
    actionTags: CombatActionTag[];
    vfxWindowMs: number;
  }> = [
    {
      phase: "overdrive-pulse",
      vfxCue: "overdrive-core-pulse",
      delayMs: furnaceHeartOverdrivePulseDelayMs,
      damageMultiplier: 0.5,
      hitstopMs: 62,
      knockback: 14,
      statusTags: ["stagger"],
      actionTags: [],
      vfxWindowMs: 360
    },
    {
      phase: "overdrive-release",
      vfxCue: "overdrive-core-release",
      delayMs: furnaceHeartOverdriveReleaseDelayMs,
      damageMultiplier: 1.05,
      hitstopMs: 104,
      knockback: 68,
      statusTags: ["stagger"],
      actionTags: ["knockdown"],
      vfxWindowMs: 560
    }
  ];

  return stages.reduce((nextRun, stage) => {
    return targets.reduce((stageRun, target) => {
      return scheduleEnemyHitEffect(stageRun, {
        id: `hit-${run.elapsedMs}-skill-${skill.id}-${stage.phase}-${target.id}`,
        targetId: target.id,
        damage: Math.max(1, Math.round(baseDamage * stage.damageMultiplier)),
        hitstopMs: stage.hitstopMs,
        knockback: stage.knockback,
        juggle: false,
        action: "skill",
        skillId: skill.id,
        inputToHitMs: stage.delayMs,
        canceledFromCombo,
        statusTags: stage.statusTags,
        actionTags: stage.actionTags,
        hitPhase: stage.phase,
        vfxCue: stage.vfxCue,
        vfxWindowMs: stage.vfxWindowMs
      });
    }, nextRun);
  }, castRun);
}

function applyPrismStep(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const scriptedRun = applySkillStartupMovement(run, skill);
  const movingRun = appendSkillCastEvent(startPlayerSkillMovement(run, skill, scriptedRun.player), skill, canceledFromCombo);
  const targetingHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: skillRangeX(skill.tags),
    laneRange: skillLaneRange(skill.tags),
    targetCap: 2,
    frontOnly: false,
    damage: skillDamage(run, skill),
    hitstopMs: 56,
    knockback: 24,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags: ["stagger"]
  };
  const targets = selectPrismStepTargets(run, scriptedRun, skill);

  if (targets.length === 0) {
    return applyMiss(movingRun, targetingHitbox);
  }

  return targets.reduce((nextRun, target, targetIndex) => {
    return scheduleEnemyHitEffect(nextRun, {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-pierce-${targetIndex}-${target.id}`,
      targetId: target.id,
      damage: Math.max(1, Math.round(skillDamage(run, skill) * 0.88)),
      hitstopMs: 56,
      knockback: 24,
      juggle: false,
      action: "skill",
      skillId: skill.id,
      inputToHitMs: skill.animation.hitFrameMs + targetIndex * 28,
      canceledFromCombo,
      statusTags: ["stagger"],
      hitPhase: "pierce",
      vfxCue: "prism-pierce",
      vfxWindowMs: 340
    });
  }, movingRun);
}

const flowingLightChainEndDelayMs = 470;
const flowingLightChainStages: Array<{
  phase: CombatHitPhase;
  cue: CombatVfxCue;
  delayMs: number;
  damageMultiplier: number;
  hitstopMs: number;
  knockback: number;
  statusTags?: CombatSkillStatusTag[];
}> = [
  {
    phase: "chain-open",
    cue: "flowing-chain-open",
    delayMs: 220,
    damageMultiplier: 0.58,
    hitstopMs: 44,
    knockback: 18
  },
  {
    phase: "chain-cross",
    cue: "flowing-chain-cross",
    delayMs: 340,
    damageMultiplier: 0.68,
    hitstopMs: 50,
    knockback: 22
  },
  {
    phase: "chain-finish",
    cue: "flowing-chain-finish",
    delayMs: flowingLightChainEndDelayMs,
    damageMultiplier: 0.92,
    hitstopMs: 68,
    knockback: 46,
    statusTags: ["stagger"]
  }
];

function selectFlowingLightChainTargets(run: CombatRun, endPosition: CombatVector, skill: ClassSkillDefinition): CombatEnemy[] {
  const minX = Math.min(run.player.x, endPosition.x) - 24;
  const maxX = Math.max(run.player.x, endPosition.x) + 28;
  const laneRange = Math.max(46, skillLaneRange(skill.tags));

  return run.enemies
    .filter((enemy) => {
      if (enemy.hp <= 0) {
        return false;
      }

      const enemyMinX = enemy.position.x - enemy.hurtbox.width / 2;
      const enemyMaxX = enemy.position.x + enemy.hurtbox.width / 2;
      const yDistance = axisDistanceOutsideHalfSize(enemy.position.y - run.player.y, enemy.hurtbox.height / 2);

      return enemyMaxX >= minX && enemyMinX <= maxX && yDistance <= laneRange;
    })
    .sort((left, right) => (left.position.x - right.position.x) * run.player.facing)
    .slice(0, 2);
}

function applyFlowingLightChain(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + run.player.facing * 142, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + flowingLightChainEndDelayMs),
    skill,
    canceledFromCombo
  );
  const targetingHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 172,
    laneRange: 52,
    targetCap: 2,
    frontOnly: false,
    damage: skillDamage(run, skill),
    hitstopMs: 52,
    knockback: 24,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo
  };
  const targets = selectFlowingLightChainTargets(run, endPosition, skill);

  if (targets.length === 0) {
    return applyMiss(movingRun, targetingHitbox);
  }

  return targets.reduce((targetRun, target, targetIndex) => {
    return flowingLightChainStages.reduce((stageRun, stage) => {
      return scheduleEnemyHitEffect(stageRun, {
        id: `hit-${run.elapsedMs}-skill-${skill.id}-${stage.phase}-${targetIndex}-${target.id}`,
        targetId: target.id,
        damage: Math.max(1, Math.round(skillDamage(run, skill) * stage.damageMultiplier)),
        hitstopMs: stage.hitstopMs,
        knockback: stage.knockback,
        juggle: false,
        action: "skill",
        skillId: skill.id,
        inputToHitMs: stage.delayMs,
        canceledFromCombo,
        statusTags: stage.statusTags,
        hitPhase: stage.phase,
        vfxCue: stage.cue,
        vfxWindowMs: 260
      });
    }, targetRun);
  }, movingRun);
}

function selectNightMarkDetonationTargets(run: CombatRun, hitbox: PlayerHitboxDefinition): CombatEnemy[] {
  return run.enemies
    .filter((enemy) => enemy.marks > 0 && enemyInPlayerHitbox(run, enemy, hitbox))
    .sort((left, right) => enemyDistanceScore(run, left) - enemyDistanceScore(run, right))
    .slice(0, hitbox.targetCap);
}

function applyNightMarkDetonation(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const scriptedRun = applySkillStartupMovement(run, skill);
  const castRun = appendSkillCastEvent(scriptedRun, skill, canceledFromCombo);
  const targetingHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 380,
    laneRange: 96,
    targetCap: 3,
    frontOnly: false,
    damage: skillDamage(run, skill),
    hitstopMs: 58,
    knockback: 14,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo
  };
  const targets = selectNightMarkDetonationTargets(scriptedRun, targetingHitbox);

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
    consumeMarks: boolean;
    statusTags: CombatSkillStatusTag[];
    actionTags: CombatActionTag[];
    vfxWindowMs: number;
  }> = [
    {
      phase: "mark-lock",
      vfxCue: "night-mark-lock",
      delayMs: skill.animation.hitFrameMs,
      damageMultiplier: 0.34,
      hitstopMs: 58,
      knockback: 8,
      consumeMarks: false,
      statusTags: [],
      actionTags: [],
      vfxWindowMs: 360
    },
    {
      phase: "detonate",
      vfxCue: "night-mark-burst",
      delayMs: skill.animation.hitFrameMs + 180,
      damageMultiplier: 0.9,
      hitstopMs: 96,
      knockback: 54,
      consumeMarks: true,
      statusTags: ["stagger"],
      actionTags: ["knockdown"],
      vfxWindowMs: 520
    }
  ];

  return stages.reduce((nextRun, stage) => {
    return targets.reduce((stageRun, target) => {
      return scheduleEnemyHitEffect(stageRun, {
        id: `hit-${run.elapsedMs}-skill-${skill.id}-${stage.phase}-${target.id}`,
        targetId: target.id,
        damage: Math.max(1, Math.round(baseDamage * stage.damageMultiplier)),
        hitstopMs: stage.hitstopMs,
        knockback: stage.knockback,
        juggle: false,
        action: "skill",
        skillId: skill.id,
        inputToHitMs: stage.delayMs,
        canceledFromCombo,
        consumeMarks: stage.consumeMarks,
        bonusDamagePerMark: bonusDamagePerMarkForSkill(skill),
        statusTags: stage.statusTags,
        actionTags: stage.actionTags,
        hitPhase: stage.phase,
        vfxCue: stage.vfxCue,
        vfxWindowMs: stage.vfxWindowMs
      });
    }, nextRun);
  }, castRun);
}

function mechanismShadowNetCenter(run: CombatRun): CombatVector {
  return {
    x: clamp(run.player.x + 150 * run.player.facing, 0, arena.width),
    y: run.player.y
  };
}

function applyMechanismShadowNet(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const scriptedRun = applySkillStartupMovement(run, skill);
  const castRun = appendSkillCastEvent(scriptedRun, skill, canceledFromCombo);
  const netCenter = mechanismShadowNetCenter(scriptedRun);
  const targetingHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 340,
    laneRange: 110,
    targetCap: 3,
    frontOnly: false,
    damage: skillDamage(run, skill),
    hitstopMs: 52,
    knockback: 0,
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
    statusTags: CombatSkillStatusTag[];
    pullCenter?: CombatVector;
    vfxWindowMs: number;
  }> = [
    {
      phase: "trap-bind",
      vfxCue: "mechanism-net-bind",
      delayMs: skill.animation.hitFrameMs,
      damageMultiplier: 0.32,
      hitstopMs: 54,
      statusTags: ["trap", "control"],
      vfxWindowMs: 420
    },
    {
      phase: "trap-snap",
      vfxCue: "mechanism-net-snap",
      delayMs: skill.animation.hitFrameMs + 180,
      damageMultiplier: 0.72,
      hitstopMs: 82,
      statusTags: ["trap", "control", "stagger"],
      pullCenter: netCenter,
      vfxWindowMs: 560
    }
  ];

  return stages.reduce((nextRun, stage) => {
    return targets.reduce((stageRun, target) => {
      return scheduleEnemyHitEffect(stageRun, {
        id: `hit-${run.elapsedMs}-skill-${skill.id}-${stage.phase}-${target.id}`,
        targetId: target.id,
        damage: Math.max(1, Math.round(baseDamage * stage.damageMultiplier)),
        hitstopMs: stage.hitstopMs,
        knockback: 0,
        juggle: false,
        action: "skill",
        skillId: skill.id,
        inputToHitMs: stage.delayMs,
        canceledFromCombo,
        pullCenter: stage.pullCenter,
        statusTags: stage.statusTags,
        hitPhase: stage.phase,
        vfxCue: stage.vfxCue,
        vfxWindowMs: stage.vfxWindowMs
      });
    }, nextRun);
  }, castRun);
}

const earthFurnaceCrackDelayMs = 260;

function applyEarthFurnaceBreaker(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const facing = run.player.facing;
  const endPosition = {
    x: clamp(run.player.x + skillMovementDistance(skill) * facing, 0, run.arena.width),
    y: run.player.y
  };
  const crackOrigin = {
    x: clamp(run.player.x + 24 * facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );
  const baseDamage = skillDamage(run, skill);
  const crackHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 220,
    laneRange: 80,
    targetCap: 3,
    frontOnly: true,
    damage: Math.max(1, Math.round(baseDamage * 0.45)),
    hitstopMs: 68,
    knockback: 22,
    juggle: false,
    inputToHitMs: earthFurnaceCrackDelayMs,
    canceledFromCombo,
    statusTags: ["stagger"]
  };
  const eruptionHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 300,
    laneRange: 104,
    targetCap: 3,
    frontOnly: true,
    damage: Math.max(1, Math.round(baseDamage * 1.15)),
    hitstopMs: 118,
    knockback: 82,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags: ["guard-break", "stagger"],
    actionTags: ["slam", "knockdown"]
  };
  const crackedRun = schedulePlayerHitboxEffect(movingRun, crackHitbox, crackOrigin, facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-earth-crack`,
    hitPhase: "earth-crack",
    vfxCue: "earth-furnace-crack",
    vfxWindowMs: 360
  });

  return schedulePlayerHitboxEffect(crackedRun, eruptionHitbox, endPosition, facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-furnace-eruption`,
    hitPhase: "furnace-eruption",
    vfxCue: "earth-furnace-eruption",
    vfxWindowMs: 660
  });
}

function applyMountainCrackHammer(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const scriptedRun = applySkillStartupMovement(run, skill);
  const castRun = appendSkillCastEvent(scriptedRun, skill, canceledFromCombo);
  const targetingHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 260,
    laneRange: 96,
    targetCap: 2,
    frontOnly: true,
    damage: skillDamage(run, skill),
    hitstopMs: 70,
    knockback: 34,
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
    statusTags: CombatSkillStatusTag[];
    actionTags: CombatActionTag[];
    vfxWindowMs: number;
  }> = [
    {
      phase: "hammer-stagger",
      vfxCue: "mountain-hammer-stagger",
      delayMs: Math.max(0, skill.animation.hitFrameMs - 90),
      damageMultiplier: 0.34,
      hitstopMs: 62,
      knockback: 18,
      statusTags: ["stagger"],
      actionTags: [],
      vfxWindowMs: 360
    },
    {
      phase: "hammer-impact",
      vfxCue: "mountain-crack-impact",
      delayMs: skill.animation.hitFrameMs,
      damageMultiplier: 0.92,
      hitstopMs: 108,
      knockback: 72,
      statusTags: ["guard-break", "stagger"],
      actionTags: ["knockdown"],
      vfxWindowMs: 620
    }
  ];

  return stages.reduce((nextRun, stage) => {
    return targets.reduce((stageRun, target) => {
      return scheduleEnemyHitEffect(stageRun, {
        id: `hit-${run.elapsedMs}-skill-${skill.id}-${stage.phase}-${target.id}`,
        targetId: target.id,
        damage: Math.max(1, Math.round(baseDamage * stage.damageMultiplier)),
        hitstopMs: stage.hitstopMs,
        knockback: stage.knockback,
        juggle: false,
        action: "skill",
        skillId: skill.id,
        inputToHitMs: stage.delayMs,
        canceledFromCombo,
        statusTags: stage.statusTags,
        actionTags: stage.actionTags,
        hitPhase: stage.phase,
        vfxCue: stage.vfxCue,
        vfxWindowMs: stage.vfxWindowMs
      });
    }, nextRun);
  }, castRun);
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

export const commandInputResourceCostMultiplier = 0.88;
export const commandInputCooldownMultiplier = 0.92;

function skillInputMethod(action: CombatActionInput): CombatSkillInputMethod {
  return action.type === "skill" && action.inputMethod === "command" ? "command" : "hotkey";
}

export function combatSkillResourceCost(skill: ClassSkillDefinition, inputMethod: CombatSkillInputMethod = "hotkey"): number {
  return inputMethod === "command"
    ? Math.max(0, Math.ceil(skill.resourceCost * commandInputResourceCostMultiplier))
    : skill.resourceCost;
}

function combatSkillCooldownMs(run: CombatRun, skill: ClassSkillDefinition, inputMethod: CombatSkillInputMethod): number {
  const base = prismCooldownMs(run, skill.id, skill.cooldownMs);

  return inputMethod === "command" ? Math.max(0, Math.round(base * commandInputCooldownMultiplier)) : base;
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
          attackHitResolved: undefined,
          attackResolvedHits: undefined,
          attackRushStartPosition: undefined,
          attackRushTargetPosition: undefined,
          attackPullStartPosition: undefined,
          attackPullTargetPosition: undefined
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
      boundUntilMs: 0,
      airState: "grounded",
      jumpStartedAtMs: 0,
      airborneUntilMs: 0,
      landingUntilMs: 0,
      airAttackUsed: false,
      airAttackType: "none",
      airAttackStartedAtMs: 0,
      airAttackUntilMs: 0,
      dashAttackReadyUntilMs: 0,
      dashAttackStartedAtMs: 0,
      dashAttackUntilMs: 0,
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
    scheduledEnemyHitEffects: [],
    scheduledMissEffects: [],
    scheduledArenaHazards: [],
    completed: false,
    failed: false
  };
}

function advanceCombatFrame(run: CombatRun, input: CombatInput, dtMs: number): CombatRun {
  const elapsedMs = run.elapsedMs + dtMs;
  const basePosition = samplePlayerPosition(run.player, run.elapsedMs);
  const framePosition = advancePlayerFramePosition(run, input, basePosition, elapsedMs);
  const movementSample: CombatMovementSample = {
    startElapsedMs: run.elapsedMs,
    endElapsedMs: elapsedMs,
    startX: basePosition.x,
    startY: basePosition.y,
    endX: framePosition.x,
    endY: framePosition.y,
    facing: framePosition.facing,
    moveX: framePosition.moveX,
    moveY: framePosition.moveY,
    speed: framePosition.speed,
    boundUntilMs: run.player.boundUntilMs,
    skillMovement: run.player.activeSkillMovement
  };
  const comboActiveAtElapsed = comboStillActive(run, elapsedMs);
  const dashControlUnlocked = run.elapsedMs >= run.player.hurtLockUntilMs && run.elapsedMs >= run.player.boundUntilMs;
  const dashMovementStarted =
    dashControlUnlocked &&
    Boolean(input.dash) &&
    framePosition.moveX !== 0 &&
    framePosition.speed > 0 &&
    playerAirStateAt(run.player, run.elapsedMs) === "grounded" &&
    run.elapsedMs >= run.player.actionLockUntilMs &&
    run.elapsedMs >= run.player.airAttackUntilMs &&
    run.player.activeSkillMovement === undefined;
  const dashAttackReadyUntilMs = !dashControlUnlocked
    ? 0
    : dashMovementStarted
      ? elapsedMs + dashLightReadyWindowMs
      : run.player.dashAttackReadyUntilMs > elapsedMs
        ? run.player.dashAttackReadyUntilMs
        : 0;
  const movedRun: CombatRun = {
    ...run,
    elapsedMs,
    comboCount: comboActiveAtElapsed ? run.comboCount : 0,
    comboExpiresAtMs: comboActiveAtElapsed ? run.comboExpiresAtMs : 0,
    player: {
      ...updatePlayerAirState(clearCompletedSkillMovement(run.player, elapsedMs), elapsedMs),
      x: framePosition.x,
      y: framePosition.y,
      facing: framePosition.facing,
      dashAttackReadyUntilMs,
      comboStep: comboActiveAtElapsed ? run.player.comboStep : 0
    }
  };
  const movedRunWithEffects = triggerBossPhaseTransitions(resolveScheduledCombatEffects(movedRun, movementSample));

  if (run.completed || run.failed) {
    return clearPendingCombatEffectsIfFailed(movedRunWithEffects);
  }

  const withEnemyAttacks = advanceEnemyAttacks(updateEnemyAirStates(movedRunWithEffects));

  return {
    ...withEnemyAttacks,
    player: clearCompletedPlayerAirState(withEnemyAttacks.player, withEnemyAttacks.elapsedMs)
  };
}

export function stepCombat(run: CombatRun, input: CombatInput, dtMs: number): CombatRun {
  const elapsedMs = run.elapsedMs + dtMs;
  const buffer = run.player.bufferedAction;
  const bufferExecuteAtMs = run.player.bufferedActionExecuteAtMs;
  const shouldReleaseBuffer =
    buffer !== undefined &&
    bufferExecuteAtMs !== undefined &&
    run.elapsedMs < bufferExecuteAtMs &&
    elapsedMs >= bufferExecuteAtMs &&
    run.player.hurtLockUntilMs <= bufferExecuteAtMs &&
    run.player.boundUntilMs <= bufferExecuteAtMs &&
    !run.completed &&
    !run.failed &&
    !run.player.defeated;

  if (shouldReleaseBuffer) {
    const beforeRelease = advanceCombatFrame(run, input, bufferExecuteAtMs - run.elapsedMs);
    const comboActiveAtRelease = comboStillActive(run, bufferExecuteAtMs);
    const releaseBase: CombatRun = {
      ...beforeRelease,
      elapsedMs: bufferExecuteAtMs,
      comboCount: comboActiveAtRelease ? run.comboCount : 0,
      comboExpiresAtMs: comboActiveAtRelease ? run.comboExpiresAtMs : 0,
      player: {
        ...clearBufferedAction(clearCompletedSkillMovement(beforeRelease.player, bufferExecuteAtMs)),
        comboStep: comboActiveAtRelease ? run.player.comboStep : 0,
        actionLockUntilMs: bufferExecuteAtMs
      }
    };
    const released = performAction(releaseBase, buffer);
    const remainingMs = elapsedMs - bufferExecuteAtMs;

    return remainingMs > 0 ? stepCombat(released, input, remainingMs) : released;
  }

  const advanced = advanceCombatFrame(run, input, dtMs);

  if (buffer !== undefined && bufferExecuteAtMs !== undefined && elapsedMs >= bufferExecuteAtMs) {
    const expiredRun: CombatRun = {
      ...advanced,
      player: clearBufferedAction(advanced.player)
    };

    if (run.completed || run.failed) {
      return clearPendingCombatEffectsIfFailed(expiredRun);
    }

    return expiredRun;
  }

  return advanced;
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
      attackHitResolved: undefined,
      attackResolvedHits: undefined,
      attackRushStartPosition: undefined,
      attackRushTargetPosition: undefined,
      attackPullStartPosition: undefined,
      attackPullTargetPosition: undefined
    };
  }

  return enemy;
}

function enemyRushTargetPosition(enemy: CombatEnemy, player: CombatPlayer, rushPx: number): CombatVector {
  const signedDistance = enemy.position.x - player.x;
  const absoluteDistance = Math.abs(signedDistance);
  const desiredGap = Math.max(82, enemy.hurtbox.width / 2 + 38);
  const rushDistance = Math.min(rushPx, Math.max(0, absoluteDistance - desiredGap));
  const direction = signedDistance >= 0 ? -1 : 1;

  return {
    x: clamp(enemy.position.x + direction * rushDistance, 0, arena.width),
    y: clamp(enemy.position.y + (player.y - enemy.position.y) * 0.35, arena.minY, arena.maxY)
  };
}

function enemyPullTargetPosition(enemy: CombatEnemy, player: CombatPlayer, pullPx: number): CombatVector {
  const signedDistance = enemy.position.x - player.x;
  const absoluteDistance = Math.abs(signedDistance);
  const desiredGap = Math.max(118, enemy.hurtbox.width / 2 + 42);
  const pullDistance = Math.min(pullPx, Math.max(0, absoluteDistance - desiredGap));
  const direction = signedDistance >= 0 ? 1 : -1;

  return {
    x: clamp(player.x + direction * pullDistance, 0, arena.width),
    y: player.y
  };
}

function advanceEnemyRushMovement(enemy: CombatEnemy, elapsedMs: number): CombatEnemy {
  if (
    enemy.hp <= 0 ||
    !enemy.attackRushStartPosition ||
    !enemy.attackRushTargetPosition ||
    enemy.attackStartedAtMs === undefined ||
    enemy.attackImpactAtMs === undefined
  ) {
    return enemy;
  }

  const windupMs = Math.max(1, enemy.attackImpactAtMs - enemy.attackStartedAtMs);
  const progress = clamp((elapsedMs - enemy.attackStartedAtMs) / windupMs, 0, 1);
  const easedProgress = progress * progress * (3 - 2 * progress);

  return {
    ...enemy,
    position: {
      x: lerp(enemy.attackRushStartPosition.x, enemy.attackRushTargetPosition.x, easedProgress),
      y: lerp(enemy.attackRushStartPosition.y, enemy.attackRushTargetPosition.y, easedProgress)
    }
  };
}

function advanceEnemyWindupPull(enemy: CombatEnemy, player: CombatPlayer, elapsedMs: number): CombatPlayer {
  if (
    enemy.hp <= 0 ||
    !enemy.attackPullStartPosition ||
    !enemy.attackPullTargetPosition ||
    enemy.attackStartedAtMs === undefined ||
    enemy.attackImpactAtMs === undefined ||
    elapsedMs < enemy.attackStartedAtMs
  ) {
    return player;
  }

  const windupMs = Math.max(1, enemy.attackImpactAtMs - enemy.attackStartedAtMs);
  const pullSampleAtMs = Math.min(elapsedMs, enemy.attackImpactAtMs);
  const progress = clamp((pullSampleAtMs - enemy.attackStartedAtMs) / windupMs, 0, 1);
  const easedProgress = 1 - (1 - progress) * (1 - progress);

  return {
    ...player,
    x: lerp(enemy.attackPullStartPosition.x, enemy.attackPullTargetPosition.x, easedProgress)
  };
}

function advanceEnemyWindupState(
  enemy: CombatEnemy,
  player: CombatPlayer,
  elapsedMs: number
): { enemy: CombatEnemy; player: CombatPlayer } {
  if (enemy.hp <= 0) {
    return { enemy, player };
  }

  const movingEnemy = advanceEnemyRushMovement(enemy, elapsedMs);

  return {
    enemy: movingEnemy,
    player: advanceEnemyWindupPull(movingEnemy, player, elapsedMs)
  };
}

function beginEnemyAttack(
  enemy: CombatEnemy,
  elapsedMs: number,
  player?: CombatPlayer
): { enemy: CombatEnemy; event?: CombatEnemyAttackEvent } {
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

  const attackProfileId = nextEnemyAttackProfile(recovered);
  const attack = enemyAttackDefinition({ ...recovered, attackProfileId });
  const attackRushTargetPosition = attack.windupRushPx && player ? enemyRushTargetPosition(recovered, player, attack.windupRushPx) : undefined;
  const attackPullTargetPosition = attack.windupPullPx && player ? enemyPullTargetPosition(recovered, player, attack.windupPullPx) : undefined;
  const impactAtMs = elapsedMs + attack.windupMs;
  const finalImpactAtMs = impactAtMs + (attack.hitCount - 1) * attack.hitIntervalMs;
  const attackPatternIds = recovered.attackPatternIds?.filter((profileId) => enemyAttackProfileKind(profileId) === recovered.kind);
  const currentPatternIndex = attackPatternIds?.indexOf(attackProfileId) ?? -1;
  const nextAttackPatternIndex =
    attackPatternIds && attackPatternIds.length > 0 ? (currentPatternIndex >= 0 ? (currentPatternIndex + 1) % attackPatternIds.length : 0) : recovered.nextAttackPatternIndex;
  const nextAttackProfileId = attackPatternIds && attackPatternIds.length > 0 ? attackPatternIds[nextAttackPatternIndex ?? 0] : recovered.attackProfileId;

  return {
    enemy: {
      ...recovered,
      attackProfileId: nextAttackProfileId,
      attackPatternIds,
      nextAttackPatternIndex,
      attackStartedAtMs: elapsedMs,
      attackImpactAtMs: impactAtMs,
      attackRecoverUntilMs: finalImpactAtMs + attack.recoveryMs,
      attackSkillId: attack.skillId,
      attackHitResolved: false,
      attackResolvedHits: 0,
      attackRushStartPosition: attackRushTargetPosition ? recovered.position : undefined,
      attackRushTargetPosition,
      attackPullStartPosition: attackPullTargetPosition && player ? { x: player.x, y: player.y } : undefined,
      attackPullTargetPosition,
      nextAttackAtMs: elapsedMs + attack.cooldownMs
    },
    event: {
      kind: "enemy-attack",
      id: `enemy-attack-${elapsedMs}-${recovered.id}-windup`,
      enemyId: recovered.id,
      skillId: attack.skillId,
      phase: "windup",
      occurredAtMs: elapsedMs,
      impactAtMs,
      totalHits: attack.hitCount
    }
  };
}

function playerInEnemyAttackRange(enemy: CombatEnemy, player: CombatPlayer, attack: EnemyAttackDefinition): boolean {
  const xDistance = axisDistanceOutsideHalfSize(enemy.position.x - player.x, enemy.hurtbox.width / 2);
  const yDistance = axisDistanceOutsideHalfSize(enemy.position.y - player.y, enemy.hurtbox.height / 2);

  return xDistance <= attack.rangeX && yDistance <= attack.laneRange;
}

function applyEnemyImpact(
  enemy: CombatEnemy,
  player: CombatPlayer,
  elapsedMs: number,
  combatProfile: CombatProfile,
  runContext: Pick<CombatRun, "dungeonId" | "roomIndex" | "arena" | "enemies">
): { enemy: CombatEnemy; player: CombatPlayer; events: CombatEvent[]; failed: boolean; phaseTransitionAtMs?: number; spawnedEnemies?: CombatEnemy[] } {
  if (
    enemy.hp <= 0 ||
    !enemy.attackSkillId ||
    enemy.attackImpactAtMs === undefined ||
    elapsedMs < enemy.attackImpactAtMs
  ) {
    return { enemy, player, events: [], failed: player.defeated };
  }

  const attack = enemyAttackDefinition(enemy);
  let resolvedHits = enemy.attackResolvedHits ?? (enemy.attackHitResolved ? attack.hitCount : 0);
  let nextEnemy: CombatEnemy = enemy;
  let nextPlayer: CombatPlayer = player;
  let failed = player.defeated;
  let phaseTransitionAtMs: number | undefined;
  const events: CombatEvent[] = [];
  const spawnedEnemies: CombatEnemy[] = [];

  while (resolvedHits < attack.hitCount) {
    const hitTime = enemy.attackImpactAtMs + resolvedHits * attack.hitIntervalMs;

    if (elapsedMs < hitTime) {
      break;
    }

    const hitIndex = resolvedHits + 1;
    const summonProfileIds = attack.summonProfileIds;
    const hitVfxCue = attack.hitVfxCues?.[resolvedHits] ?? attack.vfxCue;
    const hitFeedbackCue = attack.feedbackCues?.[resolvedHits] ?? attack.feedbackCue;
    const hitDamage = Math.max(1, Math.round(attack.damage * (attack.damageMultipliers?.[resolvedHits] ?? 1)));
    const hitKnockback = attack.knockbackByHit?.[resolvedHits] ?? attack.knockback;
    const hitInvulnerabilityMs = attack.invulnerabilityMsByHit?.[resolvedHits] ?? attack.invulnerabilityMs;
    const hitHurtLockMs = attack.hurtLockMsByHit?.[resolvedHits] ?? attack.hurtLockMs;
    const hitBoundMs = attack.boundMsByHit?.[resolvedHits] ?? 0;

    if (summonProfileIds && summonProfileIds.length > 0) {
      const attackEvent: CombatEnemyAttackEvent = {
        kind: "enemy-attack",
        id: `enemy-attack-${hitTime}-${enemy.id}-active-${hitIndex}`,
        enemyId: enemy.id,
        skillId: attack.skillId,
        phase: "active",
        occurredAtMs: hitTime,
        impactAtMs: hitTime,
        hitIndex,
        totalHits: attack.hitCount,
        vfxCue: hitVfxCue,
        vfxWindowMs: attack.vfxWindowMs
      };
      const summoned = createTaotieAshSummons(
        {
          ...runContext,
          enemies: [...runContext.enemies, ...spawnedEnemies]
        },
        nextEnemy,
        summonProfileIds,
        hitTime
      );
      const summonEvent: CombatEnemySummonEvent = {
        kind: "enemy-summon",
        id: `enemy-summon-${hitTime}-${enemy.id}-${hitIndex}`,
        enemyId: enemy.id,
        skillId: attack.skillId,
        summonedEnemyIds: summoned.map((item) => item.id),
        positions: summoned.map((item) => item.position),
        occurredAtMs: hitTime,
        vfxCue: hitVfxCue,
        vfxWindowMs: attack.vfxWindowMs
      };

      resolvedHits = hitIndex;
      nextEnemy = {
        ...nextEnemy,
        attackResolvedHits: resolvedHits,
        attackHitResolved: resolvedHits >= attack.hitCount
      };
      spawnedEnemies.push(...summoned);
      events.push(attackEvent, summonEvent);
      continue;
    }

    const inRange = playerInEnemyAttackRange(nextEnemy, nextPlayer, attack);
    const airborneEvaded = inRange && attack.jumpEvade === true && hitTime < nextPlayer.airborneUntilMs;
    const evaded = inRange && (hitTime < nextPlayer.evadeUntilMs || airborneEvaded);
    const phase = inRange && !evaded ? "active" : "miss";
    const attackEvent: CombatEnemyAttackEvent = {
      kind: "enemy-attack",
      id: `enemy-attack-${hitTime}-${enemy.id}-${phase}-${hitIndex}`,
      enemyId: enemy.id,
      skillId: attack.skillId,
      phase,
      occurredAtMs: hitTime,
      impactAtMs: hitTime,
      hitIndex,
      totalHits: attack.hitCount,
      vfxCue: hitVfxCue,
      vfxWindowMs: attack.vfxWindowMs
    };

    resolvedHits = hitIndex;
    nextEnemy = {
      ...nextEnemy,
      attackResolvedHits: resolvedHits,
      attackHitResolved: resolvedHits >= attack.hitCount
    };
    events.push(attackEvent);

    if (phase === "miss" || nextPlayer.defeated || hitTime < nextPlayer.invulnerableUntilMs) {
      failed = failed || nextPlayer.defeated;
      continue;
    }

    if (hitTime < nextPlayer.reflectUntilMs) {
      const reflectDamage = Math.max(1, Math.round(hitDamage * 0.65));
      const armorDamage = Math.min(nextEnemy.armor, reflectDamage);
      const hpDamage = reflectDamage - armorDamage;
      const reflectedEnemy: CombatEnemy = {
        ...nextEnemy,
        hp: Math.max(0, nextEnemy.hp - hpDamage),
        armor: Math.max(0, nextEnemy.armor - armorDamage)
      };
      const reflectEvent: CombatHitEvent = {
        kind: "hit",
        id: `hit-${hitTime}-mirror-reflect-${enemy.id}-${hitIndex}`,
        action: "skill",
        skillId: "mirror-reflect",
        targetId: enemy.id,
        damage: reflectDamage,
        occurredAtMs: hitTime,
        inputToHitMs: 0,
        hitstopMs: attack.hitstopMs,
        canceledFromCombo: false,
        statusTags: ["reflect"]
      };

      nextEnemy = reflectedEnemy;
      if (reflectedEnemy.kind === "boss" && reflectedEnemy.hp > 0 && bossPhase(reflectedEnemy) < 2 && bossHpPercent(reflectedEnemy) <= 0.5) {
        phaseTransitionAtMs = phaseTransitionAtMs ?? hitTime;
      }
      nextPlayer = {
        ...nextPlayer,
        reflectUntilMs: hitTime
      };
      events.push(reflectEvent);

      if (reflectedEnemy.hp <= 0 || phaseTransitionAtMs !== undefined) {
        break;
      }

      continue;
    }

    const shieldActive = hitTime < nextPlayer.shieldUntilMs;
    const mitigation = shieldActive ? clamp(nextPlayer.shieldReduction, 0, 0.85) : 0;
    const damage = Math.max(1, Math.round(hitDamage * combatProfile.damageTakenMultiplier * (1 - mitigation)));
    const nextHp = Math.max(0, nextPlayer.hp - damage);
    const nextFacing: 1 | -1 = nextEnemy.position.x >= nextPlayer.x ? 1 : -1;
    const hitEvent: CombatPlayerHitEvent = {
      kind: "player-hit",
      id: `player-hit-${hitTime}-${enemy.id}-${hitIndex}`,
      enemyId: enemy.id,
      skillId: attack.skillId,
      damage,
      occurredAtMs: hitTime,
      hitstopMs: attack.hitstopMs,
      hitIndex,
      totalHits: attack.hitCount,
      feedbackCue: hitFeedbackCue,
      vfxWindowMs: attack.vfxWindowMs
    };
    const damagedPlayer: CombatPlayer = {
      ...nextPlayer,
      hp: nextHp,
      x: clamp(nextPlayer.x - nextFacing * hitKnockback, 0, arena.width),
      facing: nextFacing,
      hitstopUntilMs: Math.max(nextPlayer.hitstopUntilMs, hitTime + attack.hitstopMs),
      invulnerableUntilMs: hitTime + hitInvulnerabilityMs,
      hurtLockUntilMs: hitTime + Math.max(attack.hitstopMs, hitHurtLockMs),
      boundUntilMs: Math.max(nextPlayer.boundUntilMs, hitBoundMs > 0 ? hitTime + hitBoundMs : 0),
      shieldUntilMs: shieldActive ? hitTime : nextPlayer.shieldUntilMs,
      shieldReduction: shieldActive ? 0 : nextPlayer.shieldReduction,
      bufferedAction: undefined,
      bufferedActionQueuedAtMs: undefined,
      bufferedActionExecuteAtMs: undefined,
      activeSkillMovement: undefined,
      defeated: nextHp <= 0
    };

    nextPlayer = damagedPlayer.resource.id === "guard" ? gainFlatPlayerResource(damagedPlayer, 12) : damagedPlayer;
    failed = failed || nextHp <= 0;
    events.push(hitEvent);

    if (nextHp <= 0) {
      break;
    }
  }

  return { enemy: nextEnemy, player: nextPlayer, events, failed, phaseTransitionAtMs, spawnedEnemies };
}

function advanceEnemyAttacks(run: CombatRun): CombatRun {
  let player = run.player;
  let failed = run.failed;
  let phaseTransitionAtMs: number | undefined;
  const canceledSkillIds = new Set<string>();
  const events: CombatEvent[] = [];
  const spawnedEnemies: CombatEnemy[] = [];
  const enemies = run.enemies.map((enemy) => {
    const started = beginEnemyAttack(enemy, run.elapsedMs, player);

    if (started.event) {
      events.push(started.event);
    }

    const advanced = advanceEnemyWindupState(started.enemy, player, run.elapsedMs);
    const beforeImpactPlayer = player;
    const impacted = applyEnemyImpact(advanced.enemy, advanced.player, run.elapsedMs, run.combatProfile, {
      ...run,
      enemies: [...run.enemies, ...spawnedEnemies]
    });
    const interruptedSkillId = interruptedActiveSkillId(beforeImpactPlayer, impacted.player);

    player = impacted.player;
    failed = failed || impacted.failed;
    spawnedEnemies.push(...(impacted.spawnedEnemies ?? []));
    if (interruptedSkillId) {
      canceledSkillIds.add(interruptedSkillId);
    }
    if (impacted.phaseTransitionAtMs !== undefined) {
      phaseTransitionAtMs = Math.min(phaseTransitionAtMs ?? impacted.phaseTransitionAtMs, impacted.phaseTransitionAtMs);
    }
    events.push(...impacted.events);

    return impacted.enemy;
  });

  return clearPendingCombatEffectsIfFailed(
    triggerBossPhaseTransitions(
      {
      ...run,
      player,
      enemies: [...enemies, ...spawnedEnemies],
      scheduledEnemyHitEffects: run.scheduledEnemyHitEffects.filter((effect) => !effect.skillId || !canceledSkillIds.has(effect.skillId)),
      scheduledMissEffects: run.scheduledMissEffects.filter((effect) => !effect.skillId || !canceledSkillIds.has(effect.skillId)),
      events: [...run.events, ...events],
      failed
      },
      phaseTransitionAtMs ?? run.elapsedMs
    )
  );
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
      attackResolvedHits: statusInterruptsAttack ? undefined : enemy.attackResolvedHits,
      attackRushStartPosition: statusInterruptsAttack ? undefined : enemy.attackRushStartPosition,
      attackRushTargetPosition: statusInterruptsAttack ? undefined : enemy.attackRushTargetPosition,
      attackPullStartPosition: statusInterruptsAttack ? undefined : enemy.attackPullStartPosition,
      attackPullTargetPosition: statusInterruptsAttack ? undefined : enemy.attackPullTargetPosition,
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
    vfxWindowMs: hit.vfxWindowMs,
    casterPosition: { x: run.player.x, y: run.player.y },
    casterFacing: run.player.facing
  };

  return triggerBossPhaseTransitions(
    {
    ...run,
    comboCount,
    comboExpiresAtMs,
    enemies: nextEnemies,
    events: [...run.events, event],
    player: {
      ...run.player,
      hitstopUntilMs: Math.max(run.player.hitstopUntilMs, impactAtMs + hitstopMs)
    }
    },
    impactAtMs
  );
}

function scheduleEnemyHitEffect(run: CombatRun, hit: HitDefinition): CombatRun {
  const target = run.enemies.find((enemy) => enemy.id === hit.targetId);

  if (!target) {
    throw new Error(`Unknown combat target: ${hit.targetId}`);
  }

  const bonusDamage = hit.consumeMarks ? target.marks * (hit.bonusDamagePerMark ?? 0) : 0;
  const effectiveDamage = hit.damage + bonusDamage;
  const hitstopMs = eventHitstop(target, hit.hitstopMs);
  const impactAtMs = run.elapsedMs + (hit.inputToHitMs ?? 0);
  const effect: CombatScheduledEnemyHitEffect = {
    id: hit.id,
    targetId: hit.targetId,
    applyAtMs: impactAtMs,
    action: hit.action ?? "test",
    inputToHitMs: hit.inputToHitMs ?? 0,
    canceledFromCombo: hit.canceledFromCombo ?? false,
    damage: effectiveDamage,
    hitstopMs,
    knockback: hit.knockback,
    juggle: hit.juggle,
    playerFacing: run.player.facing,
    marksApplied: hit.marksApplied,
    consumeMarks: hit.consumeMarks,
    pullCenter: hit.pullCenter,
    statusTags: hit.statusTags,
    actionTags: hit.actionTags,
    skillId: hit.skillId,
    hitPhase: hit.hitPhase,
    vfxCue: hit.vfxCue,
    vfxWindowMs: hit.vfxWindowMs,
    casterPosition: { x: run.player.x, y: run.player.y },
    casterFacing: run.player.facing
  };

  return {
    ...run,
    scheduledEnemyHitEffects: [...(run.scheduledEnemyHitEffects ?? []), effect]
  };
}

function schedulePlayerHitboxEffect(
  run: CombatRun,
  hitbox: PlayerHitboxDefinition,
  origin: CombatVector,
  facing: 1 | -1,
  presentation: Pick<CombatScheduledEnemyHitEffect, "id" | "hitPhase" | "vfxCue" | "vfxWindowMs" | "missOnEmpty">
): CombatRun {
  const effect: CombatScheduledEnemyHitEffect = {
    id: presentation.id,
    applyAtMs: run.elapsedMs + hitbox.inputToHitMs,
    action: hitbox.action,
    inputToHitMs: hitbox.inputToHitMs,
    canceledFromCombo: hitbox.canceledFromCombo,
    damage: hitbox.damage,
    hitstopMs: hitbox.hitstopMs,
    knockback: hitbox.knockback,
    juggle: hitbox.juggle,
    playerFacing: facing,
    marksApplied: hitbox.marksApplied,
    consumeMarks: hitbox.consumeMarks,
    bonusDamagePerMark: hitbox.bonusDamagePerMark,
    pullCenter: hitbox.pullCenter,
    statusTags: hitbox.statusTags,
    actionTags: hitbox.actionTags,
    skillId: hitbox.skillId,
    hitPhase: presentation.hitPhase,
    vfxCue: presentation.vfxCue,
    vfxWindowMs: presentation.vfxWindowMs,
    casterPosition: { x: run.player.x, y: run.player.y },
    casterFacing: run.player.facing,
    dynamicHitbox: hitbox,
    dynamicOrigin: origin,
    dynamicFacing: facing,
    missOnEmpty: presentation.missOnEmpty ?? true
  };

  return {
    ...run,
    scheduledEnemyHitEffects: [...(run.scheduledEnemyHitEffects ?? []), effect]
  };
}

function scheduleMissEffect(run: CombatRun, hitbox: PlayerHitboxDefinition): CombatRun {
  const effect: CombatScheduledMissEffect = {
    id: `miss-${run.elapsedMs}-${hitbox.action}${hitbox.skillId ? `-${hitbox.skillId}` : ""}`,
    applyAtMs: run.elapsedMs + hitbox.inputToHitMs,
    action: hitbox.action,
    skillId: hitbox.skillId,
    inputToHitMs: hitbox.inputToHitMs,
    canceledFromCombo: hitbox.canceledFromCombo,
    statusTags: hitbox.statusTags,
    actionTags: hitbox.actionTags,
    casterPosition: { x: run.player.x, y: run.player.y },
    casterFacing: run.player.facing
  };

  return {
    ...run,
    scheduledMissEffects: [...(run.scheduledMissEffects ?? []), effect]
  };
}

function applyScheduledPlayerHitboxEffect(
  run: CombatRun,
  effect: CombatScheduledEnemyHitEffect,
  activeMovementSkillId?: string
): CombatRun {
  const hitbox = effect.dynamicHitbox;
  const origin = effect.dynamicOrigin;

  if (!hitbox || !origin) {
    return run;
  }

  if (
    (effect.hitPhase === "air-light" || effect.hitPhase === "air-heavy-slam") &&
    (effect.applyAtMs >= run.player.airborneUntilMs || effect.applyAtMs < run.player.hurtLockUntilMs || effect.applyAtMs < run.player.boundUntilMs)
  ) {
    return run;
  }

  if (effect.hitPhase === "dash-light" && (effect.applyAtMs < run.player.hurtLockUntilMs || effect.applyAtMs < run.player.boundUntilMs)) {
    return run;
  }

  const sampledRun: CombatRun = {
    ...run,
    enemies: run.enemies.map((enemy) => advanceEnemyRushMovement(enemy, effect.applyAtMs))
  };
  const targetingRun: CombatRun = {
    ...sampledRun,
    elapsedMs: effect.applyAtMs,
    player: {
      ...run.player,
      x: origin.x,
      y: origin.y,
      facing: effect.dynamicFacing ?? effect.playerFacing
    }
  };
  const targets = selectPlayerTargets(targetingRun, hitbox);

  if (targets.length === 0) {
    if (effect.missOnEmpty === false) {
      return sampledRun;
    }

    return applyScheduledMissEffect(sampledRun, {
      id: `miss-${effect.id}`,
      applyAtMs: effect.applyAtMs,
      action: hitbox.action,
      skillId: hitbox.skillId,
      inputToHitMs: hitbox.inputToHitMs,
      canceledFromCombo: hitbox.canceledFromCombo,
      statusTags: hitbox.statusTags,
      actionTags: hitbox.actionTags,
      casterPosition: effect.casterPosition,
      casterFacing: effect.casterFacing
    });
  }

  return targets.reduce((nextRun, target, index) => {
    const fixedEffect: CombatScheduledEnemyHitEffect = {
      ...effect,
      id: `${effect.id}-${target.id}-${index}`,
      targetId: target.id,
      hitstopMs: eventHitstop(target, hitbox.hitstopMs),
      dynamicHitbox: undefined,
      dynamicOrigin: undefined,
      dynamicFacing: undefined
    };

    return applyScheduledEnemyHitEffect(nextRun, fixedEffect, activeMovementSkillId);
  }, sampledRun);
}

function applyScheduledEnemyHitEffect(
  run: CombatRun,
  effect: CombatScheduledEnemyHitEffect,
  activeMovementSkillId?: string
): CombatRun {
  const impactResolvedRun = resolveTargetEnemyImpactsBeforeScheduledEffect(run, effect);
  const interruptedSkillId = interruptedActiveSkillId(run.player, impactResolvedRun.player, activeMovementSkillId);

  if (interruptedSkillId && interruptedSkillId === effect.skillId) {
    return cancelScheduledEnemyHitEffectsForSkill(impactResolvedRun, interruptedSkillId);
  }

  if (impactResolvedRun.failed || impactResolvedRun.player.defeated) {
    return clearPendingCombatEffectsIfFailed(impactResolvedRun);
  }

  if (effect.dynamicHitbox && effect.dynamicOrigin) {
    return applyScheduledPlayerHitboxEffect(impactResolvedRun, effect, activeMovementSkillId);
  }

  const targetId = effect.targetId;

  if (!targetId) {
    return impactResolvedRun;
  }

  const target = impactResolvedRun.enemies.find((enemy) => enemy.id === targetId);

  if (!target || target.hp <= 0) {
    return impactResolvedRun;
  }

  const statusTags = effect.statusTags ?? [];
  const actionTags = effect.actionTags ?? [];
  const comboCount =
    impactResolvedRun.comboCount > 0 && effect.applyAtMs <= impactResolvedRun.comboExpiresAtMs
      ? impactResolvedRun.comboCount + 1
      : 1;
  const comboExpiresAtMs = effect.applyAtMs + 1200;
  const event: CombatHitEvent = {
    kind: "hit",
    id: effect.id,
    action: effect.action ?? "test",
    skillId: effect.skillId,
    targetId,
    damage: effect.damage,
    occurredAtMs: effect.applyAtMs,
    inputToHitMs: effect.inputToHitMs,
    hitstopMs: effect.hitstopMs,
    canceledFromCombo: effect.canceledFromCombo,
    comboCount,
    statusTags: effect.statusTags,
    actionTags: effect.actionTags,
    hitPhase: effect.hitPhase,
    vfxCue: effect.vfxCue,
    vfxWindowMs: effect.vfxWindowMs,
    casterPosition: effect.casterPosition,
    casterFacing: effect.casterFacing
  };
  const nextEnemies = impactResolvedRun.enemies.map((enemy) => {
    if (enemy.id !== targetId) {
      return enemy;
    }

    const armorDamage = Math.min(enemy.armor, effect.damage);
    const hpDamage = effect.damage - armorDamage;
    const nextMarks = effect.consumeMarks ? 0 : clamp(enemy.marks + (effect.marksApplied ?? 0), 0, 9);
    const controlUntil = hasStatus(statusTags, "trap") || hasStatus(statusTags, "control") ? effect.applyAtMs + 1100 : undefined;
    const staggerUntil = hasStatus(statusTags, "stagger") ? effect.applyAtMs + 780 : undefined;
    const controlledUntilMs = Math.max(enemy.controlledUntilMs ?? 0, controlUntil ?? 0, staggerUntil ?? 0) || undefined;
    const armorBrokenUntilMs = hasStatus(statusTags, "guard-break")
      ? Math.max(enemy.armorBrokenUntilMs ?? 0, effect.applyAtMs + 1800)
      : enemy.armorBrokenUntilMs;
    const forcedKnockdown = actionTags.includes("knockdown");
    const slamDown = actionTags.includes("slam") && enemy.airborne;
    const lethalDown = !effect.juggle && enemy.hp - hpDamage <= 0;
    const airborne = effect.juggle && !slamDown && !forcedKnockdown;
    const downed = forcedKnockdown || slamDown || lethalDown;
    const airborneUntilMs = airborne ? Math.max(enemy.airborneUntilMs ?? 0, effect.applyAtMs + 1000) : undefined;
    const downedUntilMs = downed ? Math.max(enemy.downedUntilMs ?? 0, effect.applyAtMs + 760) : airborne ? undefined : enemy.downedUntilMs;
    const airControlUntil = Math.max(airborneUntilMs ?? 0, downedUntilMs ?? 0) || undefined;
    const statusInterruptsAttack =
      Boolean(controlledUntilMs && controlledUntilMs > effect.applyAtMs) ||
      Boolean(airControlUntil && airControlUntil > effect.applyAtMs) ||
      hasStatus(statusTags, "guard-break");
    const delayedUntil = Math.max(
      enemy.nextAttackAtMs,
      controlledUntilMs ?? 0,
      airControlUntil ?? 0,
      hasStatus(statusTags, "guard-break") ? effect.applyAtMs + 680 : 0
    );
    const nextPosition = effect.pullCenter
      ? {
          x: clamp(enemy.position.x + (effect.pullCenter.x - enemy.position.x) * 0.75, 0, impactResolvedRun.arena.width),
          y: clamp(
            enemy.position.y + (effect.pullCenter.y - enemy.position.y) * 0.45,
            impactResolvedRun.arena.minY,
            impactResolvedRun.arena.maxY
          )
        }
      : {
          ...enemy.position,
          x: clamp(enemy.position.x + effect.knockback * effect.playerFacing, 0, impactResolvedRun.arena.width)
        };

    return {
      ...enemy,
      hp: Math.max(0, enemy.hp - hpDamage),
      armor: Math.max(0, enemy.armor - armorDamage),
      marks: nextMarks,
      controlledUntilMs,
      armorBrokenUntilMs,
      statusSourceSkillId: statusTags.length > 0 ? effect.skillId : enemy.statusSourceSkillId,
      nextAttackAtMs: delayedUntil,
      attackStartedAtMs: statusInterruptsAttack ? undefined : enemy.attackStartedAtMs,
      attackImpactAtMs: statusInterruptsAttack ? undefined : enemy.attackImpactAtMs,
      attackRecoverUntilMs: statusInterruptsAttack ? undefined : enemy.attackRecoverUntilMs,
      attackSkillId: statusInterruptsAttack ? undefined : enemy.attackSkillId,
      attackHitResolved: statusInterruptsAttack ? undefined : enemy.attackHitResolved,
      attackResolvedHits: statusInterruptsAttack ? undefined : enemy.attackResolvedHits,
      attackRushStartPosition: statusInterruptsAttack ? undefined : enemy.attackRushStartPosition,
      attackRushTargetPosition: statusInterruptsAttack ? undefined : enemy.attackRushTargetPosition,
      attackPullStartPosition: statusInterruptsAttack ? undefined : enemy.attackPullStartPosition,
      attackPullTargetPosition: statusInterruptsAttack ? undefined : enemy.attackPullTargetPosition,
      position: nextPosition,
      airborne,
      downed,
      airborneUntilMs,
      downedUntilMs
    };
  });

  const resourceGain = effect.action === "light" && effect.hitPhase === "air-light" ? 5 : effect.action === "light" && effect.hitPhase === "dash-light" ? 6 : 0;

  return triggerBossPhaseTransitions(
    {
      ...impactResolvedRun,
      comboCount,
      comboExpiresAtMs,
      enemies: nextEnemies,
      events: [...impactResolvedRun.events, event],
      player: {
        ...(resourceGain > 0 ? gainPlayerResource(impactResolvedRun.player, impactResolvedRun, resourceGain) : impactResolvedRun.player),
        hitstopUntilMs: Math.max(impactResolvedRun.player.hitstopUntilMs, effect.applyAtMs + effect.hitstopMs)
      }
    },
    effect.applyAtMs
  );
}

function applyScheduledMissEffect(run: CombatRun, effect: CombatScheduledMissEffect): CombatRun {
  const event: CombatMissEvent = {
    kind: "miss",
    id: effect.id,
    action: effect.action,
    skillId: effect.skillId,
    occurredAtMs: effect.applyAtMs,
    inputToHitMs: effect.inputToHitMs,
    canceledFromCombo: effect.canceledFromCombo,
    statusTags: effect.statusTags,
    actionTags: effect.actionTags,
    casterPosition: effect.casterPosition,
    casterFacing: effect.casterFacing
  };

  return {
    ...run,
    comboCount: 0,
    comboExpiresAtMs: 0,
    events: [...run.events, event]
  };
}

function resolveTargetEnemyImpactsBeforeScheduledEffect(
  run: CombatRun,
  effect: CombatScheduledEnemyHitEffect
): CombatRun {
  const target = run.enemies.find((enemy) => enemy.id === effect.targetId);

  if (!target || target.attackImpactAtMs === undefined || effect.applyAtMs < target.attackImpactAtMs) {
    return run;
  }

  const advanced = advanceEnemyWindupState(target, run.player, effect.applyAtMs);
  const impacted = applyEnemyImpact(advanced.enemy, advanced.player, effect.applyAtMs, run.combatProfile, run);

  if (impacted.events.length === 0) {
    return run;
  }

  return {
    ...run,
    player: impacted.player,
    enemies: [...run.enemies.map((enemy) => (enemy.id === target.id ? impacted.enemy : enemy)), ...(impacted.spawnedEnemies ?? [])],
    events: [...run.events, ...impacted.events],
    failed: run.failed || impacted.failed
  };
}

function resolveScheduledEnemyHitEffects(run: CombatRun): CombatRun {
  const due = (run.scheduledEnemyHitEffects ?? [])
    .filter((effect) => effect.applyAtMs <= run.elapsedMs)
    .sort((left, right) => left.applyAtMs - right.applyAtMs);
  const pending = (run.scheduledEnemyHitEffects ?? []).filter((effect) => effect.applyAtMs > run.elapsedMs);

  return due.reduce(
    (nextRun, effect) => applyScheduledEnemyHitEffect(nextRun, effect),
    {
      ...run,
      scheduledEnemyHitEffects: pending
    }
  );
}

type ScheduledCombatEffectItem =
  | { kind: "enemy-hit"; effect: CombatScheduledEnemyHitEffect; occurredAtMs: number }
  | { kind: "player-miss"; effect: CombatScheduledMissEffect; occurredAtMs: number }
  | { kind: "enemy-impact"; enemyId: string; occurredAtMs: number }
  | { kind: "arena-hazard"; hazard: CombatScheduledArenaHazard; occurredAtMs: number };

function scheduledCombatEffectPriority(item: ScheduledCombatEffectItem): number {
  if (item.kind === "arena-hazard") {
    return 0;
  }

  if (item.kind === "enemy-impact") {
    return 1;
  }

  if (item.kind === "enemy-hit") {
    return 2;
  }

  return 3;
}

function dueEnemyImpactItems(run: CombatRun): ScheduledCombatEffectItem[] {
  return run.enemies.flatMap((enemy) => {
    if (enemy.hp <= 0 || !enemy.attackSkillId || enemy.attackImpactAtMs === undefined) {
      return [];
    }

    const attack = enemyAttackDefinition(enemy);
    const resolvedHits = enemy.attackResolvedHits ?? (enemy.attackHitResolved ? attack.hitCount : 0);
    const items: ScheduledCombatEffectItem[] = [];

    for (let hitIndex = resolvedHits; hitIndex < attack.hitCount; hitIndex += 1) {
      const hitTime = enemy.attackImpactAtMs + hitIndex * attack.hitIntervalMs;

      if (hitTime <= run.elapsedMs) {
        items.push({ kind: "enemy-impact", enemyId: enemy.id, occurredAtMs: hitTime });
      }
    }

    return items;
  });
}

function uncanceledMovementSample(
  movement: CombatMovementSample | undefined,
  canceledSkillIds: Set<string>
): CombatMovementSample | undefined {
  if (!movement?.skillMovement || !canceledSkillIds.has(movement.skillMovement.skillId)) {
    return movement;
  }

  return undefined;
}

function resolveScheduledCombatEffects(run: CombatRun, movement?: CombatMovementSample): CombatRun {
  const dueEnemyEffects = (run.scheduledEnemyHitEffects ?? []).filter((effect) => effect.applyAtMs <= run.elapsedMs);
  const pendingEnemyEffects = (run.scheduledEnemyHitEffects ?? []).filter((effect) => effect.applyAtMs > run.elapsedMs);
  const dueMissEffects = (run.scheduledMissEffects ?? []).filter((effect) => effect.applyAtMs <= run.elapsedMs);
  const pendingMissEffects = (run.scheduledMissEffects ?? []).filter((effect) => effect.applyAtMs > run.elapsedMs);
  const dueArenaHazards = (run.scheduledArenaHazards ?? []).filter((hazard) => hazard.impactAtMs <= run.elapsedMs);
  const pendingArenaHazards = (run.scheduledArenaHazards ?? []).filter((hazard) => hazard.impactAtMs > run.elapsedMs);
  const queue: ScheduledCombatEffectItem[] = [
    ...dueEnemyEffects.map((effect) => ({ kind: "enemy-hit" as const, effect, occurredAtMs: effect.applyAtMs })),
    ...dueMissEffects.map((effect) => ({ kind: "player-miss" as const, effect, occurredAtMs: effect.applyAtMs })),
    ...dueEnemyImpactItems(run),
    ...dueArenaHazards.map((hazard) => ({ kind: "arena-hazard" as const, hazard, occurredAtMs: hazard.impactAtMs }))
  ].sort((left, right) => {
    if (left.occurredAtMs !== right.occurredAtMs) {
      return left.occurredAtMs - right.occurredAtMs;
    }

    if (left.kind === right.kind) {
      return 0;
    }

    return scheduledCombatEffectPriority(left) - scheduledCombatEffectPriority(right);
  });
  let nextRun: CombatRun = {
    ...run,
    scheduledEnemyHitEffects: pendingEnemyEffects,
    scheduledMissEffects: pendingMissEffects,
    scheduledArenaHazards: pendingArenaHazards
  };
  const canceledSkillIds = new Set<string>();

  for (const item of queue) {
    if (nextRun.failed || nextRun.player.defeated) {
      return clearPendingCombatEffectsIfFailed(nextRun);
    }

    if (item.kind === "enemy-hit") {
      if (item.effect.skillId && canceledSkillIds.has(item.effect.skillId)) {
        continue;
      }

      const beforePlayer = nextRun.player;
      const itemMovement = uncanceledMovementSample(movement, canceledSkillIds);
      const activeMovementSkillId = skillMovementIdAt(itemMovement, item.occurredAtMs);
      nextRun = applyScheduledEnemyHitEffect(nextRun, item.effect, activeMovementSkillId);
      const interruptedSkillId = interruptedActiveSkillId(beforePlayer, nextRun.player, activeMovementSkillId);

      if (interruptedSkillId) {
        canceledSkillIds.add(interruptedSkillId);
        nextRun = cancelScheduledEnemyHitEffectsForSkill(nextRun, interruptedSkillId);
      }

      continue;
    }

    if (item.kind === "player-miss") {
      if (item.effect.skillId && canceledSkillIds.has(item.effect.skillId)) {
        continue;
      }

      nextRun = applyScheduledMissEffect(nextRun, item.effect);
      continue;
    }

    if (item.kind === "enemy-impact") {
      const beforePlayer = nextRun.player;
      const itemMovement = uncanceledMovementSample(movement, canceledSkillIds);
      const activeMovementSkillId = skillMovementIdAt(itemMovement, item.occurredAtMs);
      nextRun = applyQueuedEnemyImpact(nextRun, item.enemyId, item.occurredAtMs, itemMovement);
      const interruptedSkillId = interruptedActiveSkillId(beforePlayer, nextRun.player, activeMovementSkillId);

      if (interruptedSkillId) {
        canceledSkillIds.add(interruptedSkillId);
        nextRun = cancelScheduledEnemyHitEffectsForSkill(nextRun, interruptedSkillId);
      }

      continue;
    }

    const beforePlayer = nextRun.player;
    const itemMovement = uncanceledMovementSample(movement, canceledSkillIds);
    nextRun = applyScheduledArenaHazard(nextRun, item.hazard, itemMovement);
    const interruptedSkillId = interruptedActiveSkillId(beforePlayer, nextRun.player, skillMovementIdAt(itemMovement, item.occurredAtMs));

    if (interruptedSkillId) {
      canceledSkillIds.add(interruptedSkillId);
      nextRun = cancelScheduledEnemyHitEffectsForSkill(nextRun, interruptedSkillId);
    }
  }

  return nextRun;
}

function samplePlayerAtElapsed(player: CombatPlayer, elapsedMs: number, movement?: CombatMovementSample): CombatPlayer {
  if (movement?.boundUntilMs && movement.startElapsedMs < movement.boundUntilMs) {
    if (elapsedMs <= movement.boundUntilMs) {
      return {
        ...player,
        x: movement.startX,
        y: movement.startY
      };
    }

    if (movement.endElapsedMs > movement.boundUntilMs && elapsedMs < movement.endElapsedMs) {
      const progress = clamp((elapsedMs - movement.boundUntilMs) / Math.max(1, movement.endElapsedMs - movement.boundUntilMs), 0, 1);

      return {
        ...player,
        x: lerp(movement.startX, movement.endX, progress),
        y: lerp(movement.startY, movement.endY, progress),
        facing: movement.facing
      };
    }
  }

  if (elapsedMs < player.boundUntilMs) {
    return player;
  }

  if (!movement) {
    return player;
  }

  if (elapsedMs <= movement.startElapsedMs) {
    return {
      ...player,
      x: movement.startX,
      y: movement.startY,
      facing: movement.facing
    };
  }

  if (elapsedMs >= movement.endElapsedMs) {
    return player;
  }

  if (movement.skillMovement && elapsedMs <= movement.skillMovement.endAtMs) {
    const sampled = playerSkillMovementPosition(movement.skillMovement, elapsedMs);

    return {
      ...player,
      x: sampled.x,
      y: sampled.y,
      facing: movement.facing
    };
  }

  if (movement.skillMovement && elapsedMs > movement.skillMovement.endAtMs) {
    const skillEnd = playerSkillMovementPosition(movement.skillMovement, movement.skillMovement.endAtMs);
    const remainingMs = elapsedMs - movement.skillMovement.endAtMs;
    const facing = movement.moveX === 0 ? movement.facing : movement.moveX > 0 ? 1 : -1;

    return {
      ...player,
      x: clamp(skillEnd.x + movement.moveX * movement.speed * remainingMs, 0, arena.width),
      y: clamp(skillEnd.y + movement.moveY * movement.speed * remainingMs, arena.minY, arena.maxY),
      facing
    };
  }

  const progress = clamp((elapsedMs - movement.startElapsedMs) / Math.max(1, movement.endElapsedMs - movement.startElapsedMs), 0, 1);

  return {
    ...player,
    x: lerp(movement.startX, movement.endX, progress),
    y: lerp(movement.startY, movement.endY, progress),
    facing: movement.facing
  };
}

function applyQueuedEnemyImpact(run: CombatRun, enemyId: string, occurredAtMs: number, movement?: CombatMovementSample): CombatRun {
  const enemy = run.enemies.find((item) => item.id === enemyId);

  if (!enemy || enemy.hp <= 0) {
    return run;
  }

  const sampledPlayer = samplePlayerAtElapsed(run.player, occurredAtMs, movement);
  const advanced = advanceEnemyWindupState(enemy, sampledPlayer, occurredAtMs);
  const impacted = applyEnemyImpact(advanced.enemy, advanced.player, occurredAtMs, run.combatProfile, run);

  if (impacted.events.length === 0) {
    return run;
  }

  const playerWasHit = impacted.events.some((event): event is CombatPlayerHitEvent => event.kind === "player-hit");

  return clearPendingCombatEffectsIfFailed(
    triggerBossPhaseTransitions(
      {
        ...run,
        player: playerWasHit ? impacted.player : run.player,
        enemies: [...run.enemies.map((item) => (item.id === enemy.id ? impacted.enemy : item)), ...(impacted.spawnedEnemies ?? [])],
        events: [...run.events, ...impacted.events],
        failed: run.failed || impacted.failed
      },
      impacted.phaseTransitionAtMs ?? occurredAtMs
    )
  );
}

function samplePlayerForMovement(player: CombatPlayer, hazard: CombatScheduledArenaHazard, movement?: CombatMovementSample): CombatPlayer {
  return samplePlayerAtElapsed(player, hazard.impactAtMs, movement);
}

function playerInArenaHazard(player: CombatPlayer, hazard: CombatScheduledArenaHazard): boolean {
  const xDistance = axisDistanceOutsideHalfSize(player.x - hazard.x, hazard.radiusX);
  const yDistance = Math.abs(player.y - hazard.y);

  return xDistance <= 0 && yDistance <= hazard.laneRange;
}

function applyScheduledArenaHazard(run: CombatRun, hazard: CombatScheduledArenaHazard, movement?: CombatMovementSample): CombatRun {
  const sampledPlayer = samplePlayerForMovement(run.player, hazard, movement);
  const inRange = playerInArenaHazard(sampledPlayer, hazard);
  const evaded = inRange && hazard.impactAtMs < sampledPlayer.evadeUntilMs;
  const phase: CombatArenaHazardPhase = inRange && !evaded ? "active" : "miss";
  const hazardEvent: CombatArenaHazardEvent = {
    kind: "arena-hazard",
    id: `arena-hazard-${hazard.hazardId}-${phase}`,
    hazardId: hazard.hazardId,
    enemyId: hazard.enemyId,
    skillId: hazard.skillId,
    phase,
    x: hazard.x,
    y: hazard.y,
    radiusX: hazard.radiusX,
    laneRange: hazard.laneRange,
    occurredAtMs: hazard.impactAtMs,
    impactAtMs: hazard.impactAtMs,
    vfxCue: "taotie-forge-collapse-impact",
    vfxWindowMs: hazard.vfxWindowMs
  };

  if (phase !== "active" || run.player.defeated || hazard.impactAtMs < sampledPlayer.invulnerableUntilMs) {
    return {
      ...run,
      events: [...run.events, hazardEvent]
    };
  }

  const damage = Math.max(1, Math.round(hazard.damage * run.combatProfile.damageTakenMultiplier));
  const nextHp = Math.max(0, sampledPlayer.hp - damage);
  const nextFacing: 1 | -1 = hazard.x >= sampledPlayer.x ? 1 : -1;
  const playerHit: CombatPlayerHitEvent = {
    kind: "player-hit",
    id: `player-hit-${hazard.impactAtMs}-${hazard.hazardId}`,
    enemyId: hazard.enemyId,
    skillId: hazard.skillId,
    damage,
    occurredAtMs: hazard.impactAtMs,
    hitstopMs: hazard.hitstopMs,
    feedbackCue: "player-hurt-forge-collapse",
    vfxWindowMs: hazard.vfxWindowMs
  };
  const damagedPlayer: CombatPlayer = {
    ...run.player,
    hp: nextHp,
    x: clamp(sampledPlayer.x - nextFacing * hazard.knockback, 0, run.arena.width),
    y: sampledPlayer.y,
    facing: nextFacing,
    hitstopUntilMs: Math.max(run.player.hitstopUntilMs, hazard.impactAtMs + hazard.hitstopMs),
    invulnerableUntilMs: hazard.impactAtMs + 520,
    hurtLockUntilMs: hazard.impactAtMs + 520,
    bufferedAction: undefined,
    bufferedActionQueuedAtMs: undefined,
    bufferedActionExecuteAtMs: undefined,
    activeSkillMovement: undefined,
    defeated: nextHp <= 0
  };
  const nextPlayer = damagedPlayer.resource.id === "guard" ? gainFlatPlayerResource(damagedPlayer, 12) : damagedPlayer;

  return clearPendingCombatEffectsIfFailed({
    ...run,
    player: nextPlayer,
    failed: run.failed || nextHp <= 0,
    events: [...run.events, hazardEvent, playerHit]
  });
}

function resolveScheduledArenaHazards(run: CombatRun, movement?: CombatMovementSample): CombatRun {
  const due = (run.scheduledArenaHazards ?? [])
    .filter((hazard) => hazard.impactAtMs <= run.elapsedMs)
    .sort((left, right) => left.impactAtMs - right.impactAtMs);
  const pending = (run.scheduledArenaHazards ?? []).filter((hazard) => hazard.impactAtMs > run.elapsedMs);

  return due.reduce(
    (nextRun, hazard) =>
      nextRun.failed || nextRun.player.defeated
        ? clearPendingCombatEffectsIfFailed(nextRun)
        : applyScheduledArenaHazard(nextRun, hazard, movement),
    {
      ...run,
      scheduledArenaHazards: pending
    }
  );
}

function completeSkillAction(
  run: CombatRun,
  hitRun: CombatRun,
  skill: ClassSkillDefinition,
  statusTags: CombatSkillStatusTag[],
  inputMethod: CombatSkillInputMethod = "hotkey"
): CombatRun {
  const prismGain = prismCycleGain(run, skill.id);
  const resourceCostPaid = combatSkillResourceCost(skill, inputMethod);
  const cooldownDurationMs = combatSkillCooldownMs(run, skill, inputMethod);
  const resourcePlayer = spendAndGainPlayerResource(hitRun.player, run, resourceCostPaid, skill.resourceGain + prismGain);
  const statusPlayer = applyPlayerSkillStatus(resourcePlayer, run, statusTags, skill.id);
  const events = hitRun.events.map((event) =>
    event.kind === "skill-cast" && event.skillId === skill.id && event.occurredAtMs === run.elapsedMs
      ? {
          ...event,
          inputMethod,
          resourceCostPaid,
          cooldownDurationMs
        }
      : event
  );

  return {
    ...hitRun,
    events,
    player: {
      ...statusPlayer,
      comboStep: 0,
      actionLockUntilMs: run.elapsedMs + skill.animation.durationMs,
      cancelWindowUntilMs: 0,
      dashAttackReadyUntilMs: 0,
      lastSkillId: skill.id,
      prismChain: nextPrismChain(run, skill.id),
      bufferedAction: undefined,
      bufferedActionQueuedAtMs: undefined,
      bufferedActionExecuteAtMs: undefined,
      skillCooldowns: {
        ...hitRun.player.skillCooldowns,
        [skill.id]: run.elapsedMs + cooldownDurationMs
      }
    }
  };
}

function canBufferAction(run: CombatRun, action: CombatActionInput, remainingLockMs: number): boolean {
  if (remainingLockMs <= 0 || remainingLockMs > actionBufferWindowMs) {
    return false;
  }

  if (action.type !== "skill") {
    return true;
  }

  const skill = catalog.classSkills.find((item) => item.id === action.skillId && item.classId === run.state.player.classId);

  if (!skill || run.player.resource.current < combatSkillResourceCost(skill, skillInputMethod(action))) {
    return false;
  }

  return skillCooldownRemaining(run, action.skillId) <= remainingLockMs;
}

function bufferAction(run: CombatRun, action: CombatActionInput): CombatRun {
  return {
    ...run,
    player: {
      ...run.player,
      bufferedAction: action,
      bufferedActionQueuedAtMs: run.elapsedMs,
      bufferedActionExecuteAtMs: run.player.actionLockUntilMs
    }
  };
}

function canStartDashLight(run: CombatRun): boolean {
  return (
    playerAirStateAt(run.player, run.elapsedMs) === "grounded" &&
    run.player.dashAttackReadyUntilMs > 0 &&
    run.elapsedMs <= run.player.dashAttackReadyUntilMs
  );
}

function performDashLightAction(run: CombatRun): CombatRun {
  const origin = samplePlayerPosition(run.player, run.elapsedMs);
  const endPosition = {
    x: clamp(origin.x + dashLightLungePx * run.player.facing, 0, run.arena.width),
    y: origin.y
  };
  const movingRun: CombatRun = {
    ...run,
    player: {
      ...run.player,
      activeSkillMovement: {
        skillId: "dash-light",
        startAtMs: run.elapsedMs,
        endAtMs: run.elapsedMs + dashLightInputToHitMs,
        startX: origin.x,
        startY: origin.y,
        endX: endPosition.x,
        endY: endPosition.y
      }
    }
  };
  const scheduledRun = schedulePlayerHitboxEffect(
    movingRun,
    {
      action: "light",
      skillId: "dash-light",
      rangeX: 136,
      laneRange: 54,
      targetCap: 1,
      frontOnly: true,
      damage: playerDamage(run, 34),
      hitstopMs: 58,
      knockback: 32,
      juggle: false,
      inputToHitMs: dashLightInputToHitMs,
      canceledFromCombo: false,
      statusTags: ["stagger"]
    },
    endPosition,
    run.player.facing,
    {
      id: `dash-light-${run.elapsedMs}`,
      hitPhase: "dash-light",
      vfxCue: "dash-light-slash",
      vfxWindowMs: 260
    }
  );

  return {
    ...scheduledRun,
    player: {
      ...scheduledRun.player,
      comboStep: 0,
      actionLockUntilMs: Math.max(run.player.actionLockUntilMs, run.elapsedMs + dashLightActionMs),
      cancelWindowUntilMs: 0,
      dashAttackReadyUntilMs: 0,
      dashAttackStartedAtMs: run.elapsedMs,
      dashAttackUntilMs: run.elapsedMs + dashLightActionMs,
      bufferedAction: undefined,
      bufferedActionQueuedAtMs: undefined,
      bufferedActionExecuteAtMs: undefined
    }
  };
}

function canStartAirLight(run: CombatRun): boolean {
  return (
    playerAirStateAt(run.player, run.elapsedMs) === "jumping" &&
    !run.player.airAttackUsed &&
    run.elapsedMs + airLightInputToHitMs < run.player.airborneUntilMs
  );
}

function canStartAirHeavy(run: CombatRun): boolean {
  return (
    playerAirStateAt(run.player, run.elapsedMs) === "jumping" &&
    !run.player.airAttackUsed &&
    run.elapsedMs + airHeavyInputToHitMs < run.player.airborneUntilMs
  );
}

function performAirLightAction(run: CombatRun): CombatRun {
  if (!canStartAirLight(run)) {
    return run;
  }

  const origin = samplePlayerPosition(run.player, run.elapsedMs);
  const scheduledRun = schedulePlayerHitboxEffect(
    run,
    {
      action: "light",
      rangeX: 142,
      laneRange: 54,
      targetCap: 1,
      frontOnly: true,
      damage: playerDamage(run, 28),
      hitstopMs: 48,
      knockback: 24,
      juggle: false,
      inputToHitMs: airLightInputToHitMs,
      canceledFromCombo: false
    },
    origin,
    run.player.facing,
    {
      id: `air-light-${run.elapsedMs}`,
      hitPhase: "air-light",
      vfxCue: "air-light-slash",
      vfxWindowMs: 260
    }
  );

  return {
    ...scheduledRun,
    player: {
      ...scheduledRun.player,
      comboStep: 0,
      actionLockUntilMs: Math.max(run.player.actionLockUntilMs, run.elapsedMs + airLightActionMs),
      cancelWindowUntilMs: 0,
      airAttackUsed: true,
      airAttackType: "light",
      airAttackStartedAtMs: run.elapsedMs,
      airAttackUntilMs: run.elapsedMs + airLightActionMs,
      bufferedAction: undefined,
      bufferedActionQueuedAtMs: undefined,
      bufferedActionExecuteAtMs: undefined
    }
  };
}

function performAirHeavyAction(run: CombatRun): CombatRun {
  if (!canStartAirHeavy(run)) {
    return run;
  }

  const origin = samplePlayerPosition(run.player, run.elapsedMs);
  const scheduledRun = schedulePlayerHitboxEffect(
    run,
    {
      action: "heavy",
      rangeX: 170,
      laneRange: 66,
      targetCap: 2,
      frontOnly: true,
      damage: playerDamage(run, 56),
      hitstopMs: 86,
      knockback: 28,
      juggle: false,
      inputToHitMs: airHeavyInputToHitMs,
      canceledFromCombo: false,
      actionTags: ["slam", "knockdown"]
    },
    origin,
    run.player.facing,
    {
      id: `air-heavy-${run.elapsedMs}`,
      hitPhase: "air-heavy-slam",
      vfxCue: "air-heavy-impact",
      vfxWindowMs: 320
    }
  );

  return {
    ...scheduledRun,
    player: {
      ...scheduledRun.player,
      comboStep: 0,
      actionLockUntilMs: Math.max(run.player.actionLockUntilMs, run.elapsedMs + airHeavyActionMs),
      cancelWindowUntilMs: 0,
      airAttackUsed: true,
      airAttackType: "heavy",
      airAttackStartedAtMs: run.elapsedMs,
      airAttackUntilMs: run.elapsedMs + airHeavyActionMs,
      bufferedAction: undefined,
      bufferedActionQueuedAtMs: undefined,
      bufferedActionExecuteAtMs: undefined
    }
  };
}

export function performAction(run: CombatRun, action: CombatActionInput): CombatRun {
  if (run.failed || run.player.defeated) {
    return run;
  }

  if (run.elapsedMs < run.player.hurtLockUntilMs || run.elapsedMs < run.player.boundUntilMs) {
    return run;
  }

  if (action.type === "jump" && (run.elapsedMs < run.player.airborneUntilMs || run.elapsedMs < run.player.landingUntilMs)) {
    return run;
  }

  if (action.type === "light" && playerAirStateAt(run.player, run.elapsedMs) === "jumping") {
    return performAirLightAction(run);
  }

  if (action.type === "heavy" && playerAirStateAt(run.player, run.elapsedMs) !== "grounded") {
    return performAirHeavyAction(run);
  }

  const locked = run.elapsedMs < run.player.actionLockUntilMs;
  const canceledFromCombo = action.type === "skill" && run.elapsedMs <= run.player.cancelWindowUntilMs && run.player.comboStep > 0;

  if (locked && !canceledFromCombo) {
    const remainingLockMs = run.player.actionLockUntilMs - run.elapsedMs;

    return canBufferAction(run, action, remainingLockMs) ? bufferAction(run, action) : run;
  }

  if (action.type === "light" && canStartDashLight(run)) {
    return performDashLightAction(run);
  }

  if (action.type === "light") {
    const comboStep = nextLightComboStep(run);
    const combo = lightComboSteps[comboStep - 1];
    const hitRun = applyPlayerHitbox(run, {
      action: "light",
      rangeX: combo.rangeX,
      laneRange: combo.laneRange,
      targetCap: 1,
      frontOnly: true,
      damage: playerDamage(run, combo.baseDamage),
      hitstopMs: combo.hitstopMs,
      knockback: combo.knockback,
      juggle: combo.juggle,
      inputToHitMs: combo.inputToHitMs,
      canceledFromCombo,
      actionTags: combo.actionTags
    });
    const hitConnected = actionAddedHitEvent(run, hitRun, "light");

    return {
      ...hitRun,
      player: {
        ...(hitConnected ? gainPlayerResource(hitRun.player, run, 8) : hitRun.player),
        comboStep: hitConnected ? comboStep : 0,
        actionLockUntilMs: run.elapsedMs + combo.actionLockMs,
        cancelWindowUntilMs: hitConnected ? run.elapsedMs + combo.actionLockMs : 0,
        dashAttackReadyUntilMs: 0,
        bufferedAction: undefined,
        bufferedActionQueuedAtMs: undefined,
        bufferedActionExecuteAtMs: undefined
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
    const hitConnected = actionAddedHitEvent(run, hitRun, "heavy");

    return {
      ...hitRun,
      player: {
        ...(hitConnected ? gainPlayerResource(hitRun.player, run, 4) : hitRun.player),
        comboStep: 0,
        actionLockUntilMs: run.elapsedMs + 260,
        cancelWindowUntilMs: 0,
        dashAttackReadyUntilMs: 0,
        bufferedAction: undefined,
        bufferedActionQueuedAtMs: undefined,
        bufferedActionExecuteAtMs: undefined
      }
    };
  }

  if (action.type === "jump") {
    return {
      ...run,
      player: {
        ...run.player,
        airState: "jumping",
        jumpStartedAtMs: run.elapsedMs,
        airborneUntilMs: run.elapsedMs + jumpAirborneMs,
        landingUntilMs: run.elapsedMs + jumpActionLockMs,
        airAttackUsed: false,
        airAttackType: "none",
        airAttackStartedAtMs: 0,
        airAttackUntilMs: 0,
        dashAttackReadyUntilMs: 0,
        comboStep: 0,
        actionLockUntilMs: run.elapsedMs + jumpActionLockMs,
        cancelWindowUntilMs: 0,
        bufferedAction: undefined,
        bufferedActionQueuedAtMs: undefined,
        bufferedActionExecuteAtMs: undefined
      }
    };
  }

  if (action.type === "backstep") {
    return {
      ...run,
      player: {
        ...run.player,
        x: clamp(run.player.x - run.player.facing * backstepDistancePx, 0, run.arena.width),
        comboStep: 0,
        actionLockUntilMs: run.elapsedMs + backstepActionLockMs,
        cancelWindowUntilMs: 0,
        dashAttackReadyUntilMs: 0,
        evadeUntilMs: Math.max(run.player.evadeUntilMs, run.elapsedMs + backstepEvadeMs),
        invulnerableUntilMs: Math.max(run.player.invulnerableUntilMs, run.elapsedMs + backstepInvulnerableMs),
        bufferedAction: undefined,
        bufferedActionQueuedAtMs: undefined,
        bufferedActionExecuteAtMs: undefined
      }
    };
  }

  const skill = catalog.classSkills.find((item) => item.id === action.skillId && item.classId === run.state.player.classId);

  if (!skill) {
    throw new Error(`Unknown class skill: ${action.skillId}`);
  }

  const inputMethod = skillInputMethod(action);
  const resourceCost = combatSkillResourceCost(skill, inputMethod);

  if (run.player.resource.current < resourceCost) {
    throw new Error(`Insufficient ${run.player.resource.displayName} for skill: ${action.skillId}`);
  }

  if (skillCooldownRemaining(run, action.skillId) > 0) {
    throw new Error(`Skill on cooldown: ${action.skillId}`);
  }

  const statusTags = skillStatusTags(skill.tags);
  const actionTags = actionTagsForSkill(skill.tags);
  const finishSkillAction = (hitRun: CombatRun): CombatRun => completeSkillAction(run, hitRun, skill, statusTags, inputMethod);

  if (skill.id === "meteor-knuckle") {
    return finishSkillAction(applyMeteorKnuckle(run, skill, canceledFromCombo));
  }

  if (skill.id === "liuli-rain") {
    return finishSkillAction(applyLiuliRain(run, skill, canceledFromCombo));
  }

  if (skill.id === "black-rain-volley") {
    return finishSkillAction(applyBlackRainVolley(run, skill, canceledFromCombo));
  }

  if (skill.id === "sword-prism-field") {
    return finishSkillAction(applySwordPrismField(run, skill, canceledFromCombo));
  }

  if (skill.id === "spark-combo") {
    return finishSkillAction(applySparkCombo(run, skill, canceledFromCombo));
  }

  if (skill.id === "iron-palm") {
    return finishSkillAction(applyIronPalm(run, skill, canceledFromCombo));
  }

  if (skill.id === "cinder-uppercut") {
    return finishSkillAction(applyCinderUppercut(run, skill, canceledFromCombo));
  }

  if (skill.id === "anvil-crash") {
    return finishSkillAction(applyAnvilCrash(run, skill, canceledFromCombo));
  }

  if (skill.id === "glass-cut") {
    return finishSkillAction(applyGlassCut(run, skill, canceledFromCombo));
  }

  if (skill.id === "furnace-step") {
    return finishSkillAction(applyFurnaceStep(run, skill, canceledFromCombo));
  }

  if (skill.id === "shadow-roll") {
    return finishSkillAction(applyShadowRoll(run, skill, canceledFromCombo));
  }

  if (skill.id === "ink-shot") {
    return finishSkillAction(applyInkShot(run, skill, canceledFromCombo));
  }

  if (skill.id === "ink-snare") {
    return finishSkillAction(applyInkSnare(run, skill, canceledFromCombo));
  }

  if (skill.id === "heat-bloom") {
    return finishSkillAction(applyHeatBloom(run, skill, canceledFromCombo));
  }

  if (skill.id === "furnace-heart-overdrive") {
    return finishSkillAction(applyFurnaceHeartOverdrive(run, skill, canceledFromCombo));
  }

  if (skill.id === "prism-step") {
    return finishSkillAction(applyPrismStep(run, skill, canceledFromCombo));
  }

  if (skill.id === "flowing-light-chain") {
    return finishSkillAction(applyFlowingLightChain(run, skill, canceledFromCombo));
  }

  if (skill.id === "night-mark-detonation") {
    return finishSkillAction(applyNightMarkDetonation(run, skill, canceledFromCombo));
  }

  if (skill.id === "mechanism-shadow-net") {
    return finishSkillAction(applyMechanismShadowNet(run, skill, canceledFromCombo));
  }

  if (skill.id === "earth-furnace-breaker") {
    return finishSkillAction(applyEarthFurnaceBreaker(run, skill, canceledFromCombo));
  }

  if (skill.id === "mountain-crack-hammer") {
    return finishSkillAction(applyMountainCrackHammer(run, skill, canceledFromCombo));
  }

  const scriptedRun = appendSkillCastEvent(applySkillStartupMovement(run, skill), skill, canceledFromCombo);
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

  return finishSkillAction(hitRun);
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
      hitstopUntilMs: 0,
      boundUntilMs: 0,
      airState: "grounded",
      jumpStartedAtMs: 0,
      airborneUntilMs: 0,
      landingUntilMs: 0,
      airAttackUsed: false,
      airAttackType: "none",
      airAttackStartedAtMs: 0,
      airAttackUntilMs: 0,
      dashAttackReadyUntilMs: 0,
      dashAttackStartedAtMs: 0,
      dashAttackUntilMs: 0,
      activeSkillMovement: undefined,
      bufferedAction: undefined,
      bufferedActionQueuedAtMs: undefined,
      bufferedActionExecuteAtMs: undefined
    },
    enemies: completed ? [] : createRoomEnemies(run.dungeonId, nextRoomIndex),
    events: [clearedEvent],
    lootEvents: [...run.lootEvents, lootEvent],
    scheduledEnemyHitEffects: [],
    scheduledMissEffects: [],
    scheduledArenaHazards: [],
    completed
  };
}
