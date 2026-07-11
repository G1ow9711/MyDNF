import { catalog } from "../data/catalog";
import type { ClassSkillDefinition, ConsumableId, DungeonDifficultyId, DungeonId, GameState, GearItem, Rarity } from "./types";
import type { CombatInput } from "./input";
import { evaluateCombatProfile, type CombatProfile } from "../systems/builds";
import { classResourceValue, skillCooldownMultiplier, skillDamageMultiplier } from "../systems/classes";
import { getDungeonDifficulty } from "../systems/dungeons";

export type EnemyKind = "trash" | "elite" | "boss";
export type EnemyAttackProfileId =
  | "ash-ember-spit"
  | "ash-crawler-burst"
  | "zheng-shockwave"
  | "zheng-horn-charge"
  | "liuli-glass-spray"
  | "liuli-splinter-rush"
  | "liuli-crucible-wave"
  | "liuli-prism-charge"
  | "taotie-flame-breath"
  | "taotie-devour-pull"
  | "taotie-ash-summon"
  | "taotie-forge-shackle"
  | "taotie-chain-cleave"
  | "taotie-world-devour"
  | "liuli-prism-barrage"
  | "liuli-kiln-gravity"
  | "liuli-crucible-shards";
export type CombatSkillInputMethod = "hotkey" | "command";
export type CombatActionInput =
  | { type: "light" }
  | { type: "heavy" }
  | { type: "jump" }
  | { type: "backstep" }
  | { type: "consume"; consumableId: ConsumableId }
  | { type: "skill"; skillId: string; inputMethod?: CombatSkillInputMethod };
export type CombatSkillStatusTag = "shield" | "guard" | "evade" | "reflect" | "trap" | "control" | "guard-break" | "stagger";
export type CombatActionTag = "launcher" | "slam" | "pull" | "knockdown";
export type CombatHitPhase =
  | "ground-light-1"
  | "ground-light-2"
  | "ground-light-3"
  | "ground-heavy-launch"
  | "dash-light"
  | "air-light"
  | "air-heavy-slam"
  | "fall"
  | "impact"
  | "rain"
  | "rain-open"
  | "rain-fall"
  | "rain-shatter"
  | "black-rain-open"
  | "black-rain-fall"
  | "black-rain-burst"
  | "pierce"
  | "mark-lock"
  | "detonate"
  | "trap-bind"
  | "trap-snap"
  | "hammer-stagger"
  | "hammer-impact"
  | "mountain-guard-break"
  | "shoulder-impact"
  | "heat-draw"
  | "heat-eruption"
  | "overdrive-pulse"
  | "overdrive-release"
  | "anvil-slam"
  | "earth-crack"
  | "furnace-eruption"
  | "ink-bolt"
  | "contract-mark"
  | "glass-cut"
  | "jab-chain"
  | "spark-jab"
  | "spark-cross"
  | "spark-finish"
  | "shield-jab"
  | "shield-quake"
  | "furnace-roar"
  | "roll-shot"
  | "feint-shot"
  | "mirror-arc"
  | "mirror-counter"
  | "lotus-bind"
  | "lotus-bloom"
  | "mirrorflame-lock"
  | "mirrorflame-burst"
  | "uppercut"
  | "chain-open"
  | "chain-dance-left"
  | "chain-dance-right"
  | "chain-cross"
  | "chain-finish"
  | "prism-field-lock"
  | "prism-field-burst";
export type CombatVfxCue =
  | "ground-light-slash-1"
  | "ground-light-slash-2"
  | "ground-light-slash-3"
  | "ground-heavy-impact"
  | "dash-light-slash"
  | "air-light-slash"
  | "air-heavy-impact"
  | "meteor-fall"
  | "meteor-impact"
  | "glass-rain-open"
  | "glass-rain-fall"
  | "glass-rain-shatter"
  | "black-rain-open"
  | "black-rain-fall"
  | "black-rain-burst"
  | "prism-pierce"
  | "night-mark-lock"
  | "night-mark-burst"
  | "mechanism-net-bind"
  | "mechanism-net-snap"
  | "mountain-hammer-stagger"
  | "mountain-crack-impact"
  | "mountain-guard-break-impact"
  | "furnace-shoulder-impact"
  | "heat-bloom-draw"
  | "heat-bloom-eruption"
  | "overdrive-core-pulse"
  | "overdrive-core-release"
  | "anvil-crash-impact"
  | "earth-furnace-crack"
  | "earth-furnace-eruption"
  | "ink-shot-pierce"
  | "contract-mark-impact"
  | "ink-snare-bind"
  | "ink-snare-snap"
  | "glass-slash-cut"
  | "ember-jab-chain"
  | "ember-spark-jab"
  | "ember-spark-cross"
  | "ember-spark-finish"
  | "iron-shield-jab"
  | "shield-quake-impact"
  | "anvil-guard-open"
  | "molten-wall-open"
  | "black-aegis-open"
  | "healing-potion-use"
  | "revival-token-use"
  | "furnace-roar-impact"
  | "shadow-roll-shot"
  | "crow-feint-shot"
  | "mirror-arc-slash"
  | "mirror-counter-burst"
  | "glass-lotus-bind"
  | "glass-lotus-bloom"
  | "mirrorflame-lock"
  | "mirrorflame-burst"
  | "cinder-uppercut-rise"
  | "flowing-chain-open"
  | "flowing-chain-dance-left"
  | "flowing-chain-dance-right"
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
  | "taotie-forge-shackle-slam"
  | "taotie-chain-cleave-drag"
  | "taotie-chain-cleave-smash"
  | "taotie-world-devour-impact";
export type CombatPlayerFeedbackCue =
  | "player-hurt-light"
  | "player-hurt-heavy"
  | "player-hurt-boss-breath"
  | "player-hurt-devoured"
  | "player-hurt-forge-collapse"
  | "player-hurt-forge-shackle"
  | "player-hurt-forge-slam"
  | "player-hurt-chain-drag"
  | "player-hurt-chain-smash"
  | "player-hurt-world-devour";
export type CombatBossPhaseSkillId = "taotie-forge-collapse" | "taotie-armor-pulse";
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
  ashSummonCount?: number;
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
  attackConnectedHitIndexes?: number[];
  attackRushStartPosition?: CombatVector;
  attackRushTargetPosition?: CombatVector;
  attackPullStartPosition?: CombatVector;
  attackPullTargetPosition?: CombatVector;
  bossPhase?: 1 | 2 | 3;
  bossPhaseTriggeredAtMs?: number;
  controlledUntilMs?: number;
  hitstunUntilMs?: number;
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
  invulnerableStartedAtMs: number;
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
  normalAttackStartedAtMs: number;
  normalAttackUntilMs: number;
  normalAttackComboStep: number;
  normalAttackType: "none" | "light" | "heavy";
  dashAttackReadyUntilMs: number;
  dashAttackStartedAtMs: number;
  dashAttackUntilMs: number;
  quickRecoverReadyUntilMs: number;
  quickRecoverStartedAtMs: number;
  quickRecoverUntilMs: number;
  shieldUntilMs: number;
  shieldReduction: number;
  evadeStartedAtMs: number;
  evadeUntilMs: number;
  reflectStartedAtMs: number;
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

export interface CombatRoomTransition {
  state: "entering";
  startedAtMs: number;
  completeAtMs: number;
  durationMs: number;
  fromRoomIndex: number;
  targetRoomIndex?: number;
  gateState: Exclude<CombatRoomGateState, "locked">;
  gateX: number;
  gateY: number;
}

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
  critical: boolean;
  criticalMultiplier: number;
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
  impactPosition?: CombatVector;
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
  hitPhase?: CombatHitPhase;
  vfxCue?: CombatVfxCue;
  vfxWindowMs?: number;
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

export interface CombatRoomTransitionEvent {
  kind: "room-transition";
  id: string;
  phase: "enter";
  dungeonId: DungeonId;
  fromRoomIndex: number;
  targetRoomIndex?: number;
  gateState: Exclude<CombatRoomGateState, "locked">;
  occurredAtMs: number;
  completeAtMs: number;
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

export interface CombatPlayerStatusEvent {
  kind: "player-status";
  id: string;
  action: "skill" | "consumable";
  skillId: string;
  occurredAtMs: number;
  inputToHitMs: number;
  canceledFromCombo: boolean;
  statusTags?: CombatSkillStatusTag[];
  vfxCue: CombatVfxCue;
  vfxWindowMs: number;
  casterPosition: CombatVector;
  casterFacing: 1 | -1;
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
  phase: 2 | 3;
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
  | CombatRoomTransitionEvent
  | CombatEnemyAttackEvent
  | CombatPlayerHitEvent
  | CombatPlayerStatusEvent
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
  consumables?: Partial<Record<ConsumableId, number>>;
  gearDropId?: string;
}

export interface CombatRun {
  state: GameState;
  dungeonId: DungeonId;
  difficultyId: DungeonDifficultyId;
  roomIndex: number;
  elapsedMs: number;
  comboCount: number;
  comboExpiresAtMs: number;
  criticalAccumulator: number;
  arena: CombatArena;
  player: CombatPlayer;
  combatProfile: CombatProfile;
  enemies: CombatEnemy[];
  events: CombatEvent[];
  lootEvents: CombatLootEvent[];
  scheduledEnemyHitEffects: CombatScheduledEnemyHitEffect[];
  scheduledMissEffects: CombatScheduledMissEffect[];
  scheduledArenaHazards: CombatScheduledArenaHazard[];
  roomTransition?: CombatRoomTransition;
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
  resourceGainPerConsumedMark?: number;
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
  resourceGainPerConsumedMark?: number;
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
  comboStepOnHit?: number;
  resourceGainOnHit?: number;
  cancelWindowUntilMsOnHit?: number;
  resetComboStepOnMiss?: boolean;
  playerShieldWindowMs?: number;
  playerShieldReduction?: number;
  playerStatusVfxCue?: CombatVfxCue;
  playerStatusVfxWindowMs?: number;
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
  hitPhase?: CombatHitPhase;
  vfxCue?: CombatVfxCue;
  vfxWindowMs?: number;
  casterPosition?: CombatVector;
  casterFacing?: 1 | -1;
  resetComboStepOnMiss?: boolean;
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
  requiresPreviousHitByHit?: boolean[];
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
  resourceGainPerConsumedMark?: number;
  pullCenter?: CombatVector;
  repeatHits?: number;
  repeatIntervalMs?: number;
  repeatDamageMultiplier?: number;
  inputToHitMs: number;
  canceledFromCombo: boolean;
  statusTags?: CombatSkillStatusTag[];
  actionTags?: CombatActionTag[];
  requiresStatusSourceSkillId?: string;
  requiresMarks?: boolean;
}

const arena: CombatArena = {
  width: 960,
  height: 540,
  minY: 260,
  maxY: 430
};
const roomEntranceX = 160;
const roomEntranceY = 345;
const roomClearRecoveryRatio = 0.3;
const roomGateX = 900;
const roomGateY = 345;
const roomGateEnterRangeX = 34;
const roomGateEnterRangeY = 76;
export const roomGateTransitionDurationMs = 480;
export const actionBufferWindowMs = 180;
const backstepDistancePx = 74;
const backstepMovementMs = 180;
const backstepEvadeMs = 420;
const backstepInvulnerableMs = 240;
const backstepActionLockMs = 260;
const enemyOrdinaryHitstunMs = 280;
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
const groundLightLungePxByComboStep = [18, 22, 28] as const;
const groundHeavyInputToHitMs = 85;
const groundHeavyActionMs = 260;
const groundHeavyLungePx = 34;
const quickRecoverReadyWindowMs = 260;
const quickRecoverActionMs = 260;
const quickRecoverInvulnerableMs = 520;
const crowFeintEvadeStartDelayMs = 90;
const crowFeintEvadeDurationMs = 360;
const crowFeintInvulnerableMs = 260;
const taotieForgeCollapseSkillId: CombatBossPhaseSkillId = "taotie-forge-collapse";
const taotieArmorPulseSkillId: CombatBossPhaseSkillId = "taotie-armor-pulse";
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
const taotieBossPhaseTwoPattern: EnemyAttackProfileId[] = [...taotieBossPhaseOnePattern, "taotie-forge-shackle", "taotie-chain-cleave"];
const taotieBossPhaseThreePattern: EnemyAttackProfileId[] = ["taotie-world-devour", "taotie-chain-cleave", "taotie-flame-breath"];
const liuliBossPattern: EnemyAttackProfileId[] = ["liuli-prism-barrage", "liuli-kiln-gravity", "liuli-crucible-shards"];

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

function shiftFutureTime(value: number, originMs: number, deltaMs: number): number {
  return value > originMs ? value + deltaMs : value;
}

function shiftFutureOptionalTime(value: number | undefined, originMs: number, deltaMs: number): number | undefined {
  return value !== undefined && value > originMs ? value + deltaMs : value;
}

function shiftEnemyTimersForHitstop(enemy: CombatEnemy, originMs: number, deltaMs: number): CombatEnemy {
  const attackActive =
    enemy.attackSkillId !== undefined &&
    enemy.attackStartedAtMs !== undefined &&
    enemy.attackImpactAtMs !== undefined &&
    (enemy.attackRecoverUntilMs ?? enemy.attackImpactAtMs) > originMs;

  return {
    ...enemy,
    airborneUntilMs: shiftFutureOptionalTime(enemy.airborneUntilMs, originMs, deltaMs),
    downedUntilMs: shiftFutureOptionalTime(enemy.downedUntilMs, originMs, deltaMs),
    nextAttackAtMs: shiftFutureTime(enemy.nextAttackAtMs, originMs, deltaMs),
    attackStartedAtMs: attackActive ? enemy.attackStartedAtMs! + deltaMs : enemy.attackStartedAtMs,
    attackImpactAtMs: attackActive ? enemy.attackImpactAtMs! + deltaMs : enemy.attackImpactAtMs,
    attackRecoverUntilMs: attackActive ? shiftFutureOptionalTime(enemy.attackRecoverUntilMs, originMs, deltaMs) : enemy.attackRecoverUntilMs,
    controlledUntilMs: shiftFutureOptionalTime(enemy.controlledUntilMs, originMs, deltaMs),
    hitstunUntilMs: shiftFutureOptionalTime(enemy.hitstunUntilMs, originMs, deltaMs),
    armorBrokenUntilMs: shiftFutureOptionalTime(enemy.armorBrokenUntilMs, originMs, deltaMs)
  };
}

function shiftCombatTimersForHitstop(run: CombatRun, originMs: number, deltaMs: number): CombatRun {
  return {
    ...run,
    enemies: run.enemies.map((enemy) => shiftEnemyTimersForHitstop(enemy, originMs, deltaMs)),
    scheduledArenaHazards: run.scheduledArenaHazards.map((hazard) => ({
      ...hazard,
      impactAtMs: hazard.impactAtMs >= originMs ? hazard.impactAtMs + deltaMs : hazard.impactAtMs
    }))
  };
}

function hitstopRemainingMs(run: CombatRun): number {
  return Math.max(0, run.player.hitstopUntilMs - run.elapsedMs);
}

function advanceHitstopFrame(run: CombatRun, input: CombatInput, dtMs: number): CombatRun {
  const remainingMs = hitstopRemainingMs(run);

  if (remainingMs <= 0 || dtMs <= 0) {
    return run;
  }

  const freezeMs = Math.min(dtMs, remainingMs);
  const originMs = run.elapsedMs;
  const frozenPosition = samplePlayerPosition(run.player, originMs);
  const shiftedRun = shiftCombatTimersForHitstop(run, originMs, freezeMs);
  const frozenRun: CombatRun = {
    ...shiftedRun,
    elapsedMs: originMs + freezeMs,
    player: {
      ...shiftedRun.player,
      x: frozenPosition.x,
      y: frozenPosition.y,
      facing: run.player.facing
    }
  };
  const remainingDtMs = dtMs - freezeMs;

  return remainingDtMs > 0 ? stepCombat(frozenRun, input, remainingDtMs) : frozenRun;
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

function playerEvadeActiveAt(player: CombatPlayer, elapsedMs: number): boolean {
  return player.evadeUntilMs > 0 && elapsedMs >= player.evadeStartedAtMs && elapsedMs < player.evadeUntilMs;
}

function playerInvulnerableActiveAt(player: CombatPlayer, elapsedMs: number): boolean {
  return player.invulnerableUntilMs > 0 && elapsedMs >= player.invulnerableStartedAtMs && elapsedMs < player.invulnerableUntilMs;
}

function playerReflectActiveAt(player: CombatPlayer, elapsedMs: number): boolean {
  return player.reflectUntilMs > 0 && elapsedMs >= player.reflectStartedAtMs && elapsedMs < player.reflectUntilMs;
}

function setPlayerEvadeWindow(player: CombatPlayer, startAtMs: number, untilMs: number): CombatPlayer {
  if (untilMs <= player.evadeUntilMs) {
    return player;
  }

  return {
    ...player,
    evadeStartedAtMs: startAtMs,
    evadeUntilMs: untilMs
  };
}

function setPlayerInvulnerabilityWindow(player: CombatPlayer, startAtMs: number, untilMs: number): CombatPlayer {
  if (untilMs <= player.invulnerableUntilMs) {
    return player;
  }

  return {
    ...player,
    invulnerableStartedAtMs: startAtMs,
    invulnerableUntilMs: untilMs
  };
}

function setPlayerReflectWindow(player: CombatPlayer, skillId: string, startAtMs: number, untilMs: number): CombatPlayer {
  if (untilMs <= player.reflectUntilMs) {
    return {
      ...player,
      reflectSkillId: player.reflectSkillId ?? skillId
    };
  }

  return {
    ...player,
    reflectStartedAtMs: startAtMs,
    reflectUntilMs: untilMs,
    reflectSkillId: skillId
  };
}

function applyTimedPlayerWindows(player: CombatPlayer, elapsedMs: number): CombatPlayer {
  const movement = player.activeSkillMovement;

  if (movement?.skillId !== "crow-feint") {
    return player;
  }

  const evadeStartAtMs = movement.startAtMs + crowFeintEvadeStartDelayMs;

  if (elapsedMs < evadeStartAtMs) {
    return player;
  }

  return setPlayerInvulnerabilityWindow(
    setPlayerEvadeWindow(player, evadeStartAtMs, evadeStartAtMs + crowFeintEvadeDurationMs),
    evadeStartAtMs,
    evadeStartAtMs + crowFeintInvulnerableMs
  );
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

function clearCompletedNormalAttack(player: CombatPlayer, elapsedMs: number): CombatPlayer {
  if (elapsedMs < player.normalAttackUntilMs) {
    return player;
  }

  return {
    ...player,
    normalAttackStartedAtMs: 0,
    normalAttackUntilMs: 0,
    normalAttackComboStep: 0,
    normalAttackType: "none"
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

  const tookHit = after.hurtLockUntilMs > before.hurtLockUntilMs || after.boundUntilMs > before.boundUntilMs || after.defeated;

  if (skillId === "mountain-crack-hammer") {
    return undefined;
  }

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

export function roomTransitionActive(run: Pick<CombatRun, "roomTransition" | "elapsedMs">): boolean {
  return Boolean(run.roomTransition && run.elapsedMs < run.roomTransition.completeAtMs);
}

function lockPlayerForRoomTransition(player: CombatPlayer, transition: CombatRoomTransition): CombatPlayer {
  return {
    ...clearBufferedAction(player),
    facing: 1,
    comboStep: 0,
    actionLockUntilMs: Math.max(player.actionLockUntilMs, transition.completeAtMs),
    cancelWindowUntilMs: 0,
    hitstopUntilMs: Math.min(player.hitstopUntilMs, transition.startedAtMs),
    boundUntilMs: Math.min(player.boundUntilMs, transition.startedAtMs),
    airState: "grounded",
    jumpStartedAtMs: 0,
    airborneUntilMs: 0,
    landingUntilMs: 0,
    airAttackUsed: false,
    airAttackType: "none",
    airAttackStartedAtMs: 0,
    airAttackUntilMs: 0,
    normalAttackStartedAtMs: 0,
    normalAttackUntilMs: 0,
    normalAttackComboStep: 0,
    normalAttackType: "none",
    dashAttackReadyUntilMs: 0,
    dashAttackStartedAtMs: 0,
    dashAttackUntilMs: 0,
    quickRecoverReadyUntilMs: 0,
    quickRecoverStartedAtMs: 0,
    quickRecoverUntilMs: 0,
    activeSkillMovement: {
      skillId: "room-gate-enter",
      startAtMs: transition.startedAtMs,
      endAtMs: transition.completeAtMs,
      startX: player.x,
      startY: player.y,
      endX: transition.gateX,
      endY: transition.gateY
    }
  };
}

function bossPhase(enemy: CombatEnemy): 1 | 2 | 3 {
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
  const phaseThreeBossIds = new Set<string>();
  const enemies = run.enemies.map((enemy) => {
    if (enemy.kind !== "boss" || !enemy.attackPatternIds?.some((profileId) => profileId.startsWith("taotie-")) || enemy.hp <= 0) {
      return enemy;
    }

    if (bossPhase(enemy) === 2 && bossHpPercent(enemy) <= 0.3) {
      phaseThreeBossIds.add(enemy.id);
      const phaseEvent: CombatBossPhaseEvent = {
        kind: "boss-phase",
        id: `boss-phase-${occurredAtMs}-${enemy.id}-3`,
        enemyId: enemy.id,
        phase: 3,
        skillId: taotieArmorPulseSkillId,
        occurredAtMs,
        hazardCount: 0,
        vfxCue: taotieArmorPulseSkillId,
        vfxWindowMs: 980
      };

      events.push(phaseEvent);

      return {
        ...enemy,
        bossPhase: 3 as const,
        bossPhaseTriggeredAtMs: occurredAtMs,
        armor: Math.max(enemy.armor, 120),
        attackProfileId: "taotie-world-devour" as const,
        attackPatternIds: taotieBossPhaseThreePattern,
        nextAttackPatternIndex: 0,
        nextAttackAtMs: Math.max(enemy.nextAttackAtMs, occurredAtMs + 860),
        attackStartedAtMs: undefined,
        attackImpactAtMs: undefined,
        attackRecoverUntilMs: undefined,
        attackSkillId: undefined,
        attackHitResolved: undefined,
        attackResolvedHits: undefined,
        attackConnectedHitIndexes: undefined,
        attackRushStartPosition: undefined,
        attackRushTargetPosition: undefined,
        attackPullStartPosition: undefined,
        attackPullTargetPosition: undefined
      };
    }

    if (bossPhase(enemy) !== 1 || bossHpPercent(enemy) > 0.5) {
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
      attackConnectedHitIndexes: undefined,
      attackRushStartPosition: undefined,
      attackRushTargetPosition: undefined,
      attackPullStartPosition: undefined,
      attackPullTargetPosition: undefined
    };
  });

  if (events.length === 0) {
    return run;
  }

  const resolvedEnemies =
    phaseThreeBossIds.size === 0
      ? enemies
      : enemies.map((enemy) => {
          const isConsumedAshSummon =
            enemy.kind !== "boss" &&
            enemy.id.includes("-summon-") &&
            [...phaseThreeBossIds].some((bossId) => enemy.id.includes(bossId));

          if (!isConsumedAshSummon) {
            return enemy;
          }

          return {
            ...enemy,
            hp: 0,
            downed: true,
            downedUntilMs: occurredAtMs + 760,
            attackStartedAtMs: undefined,
            attackImpactAtMs: undefined,
            attackRecoverUntilMs: undefined,
            attackSkillId: undefined,
            attackHitResolved: undefined,
            attackResolvedHits: undefined,
            attackConnectedHitIndexes: undefined,
            attackRushStartPosition: undefined,
            attackRushTargetPosition: undefined,
            attackPullStartPosition: undefined,
            attackPullTargetPosition: undefined
          };
        });

  return {
    ...run,
    enemies: resolvedEnemies,
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
  hitPhase: CombatHitPhase;
  vfxCue: CombatVfxCue;
  vfxWindowMs: number;
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
    actionLockMs: 180,
    hitPhase: "ground-light-1",
    vfxCue: "ground-light-slash-1",
    vfxWindowMs: 240
  },
  {
    baseDamage: 30,
    rangeX: 150,
    laneRange: 54,
    hitstopMs: 48,
    knockback: 28,
    juggle: false,
    inputToHitMs: 65,
    actionLockMs: 200,
    hitPhase: "ground-light-2",
    vfxCue: "ground-light-slash-2",
    vfxWindowMs: 280
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
    hitPhase: "ground-light-3",
    vfxCue: "ground-light-slash-3",
    vfxWindowMs: 340,
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

function groundLightLungePx(comboStep: number): number {
  return groundLightLungePxByComboStep[comboStep - 1] ?? groundLightLungePxByComboStep[0];
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
    value === "liuli-glass-spray" ||
    value === "liuli-splinter-rush" ||
    value === "liuli-crucible-wave" ||
    value === "liuli-prism-charge" ||
    value === "taotie-flame-breath" ||
    value === "taotie-devour-pull" ||
    value === "taotie-ash-summon" ||
    value === "taotie-forge-shackle" ||
    value === "taotie-chain-cleave" ||
    value === "taotie-world-devour" ||
    value === "liuli-prism-barrage" ||
    value === "liuli-kiln-gravity" ||
    value === "liuli-crucible-shards"
  );
}

function enemyAttackProfileKind(profileId: EnemyAttackProfileId): EnemyKind {
  if (
    profileId === "taotie-flame-breath" ||
    profileId === "taotie-devour-pull" ||
    profileId === "taotie-ash-summon" ||
    profileId === "taotie-forge-shackle" ||
    profileId === "taotie-chain-cleave" ||
    profileId === "taotie-world-devour" ||
    profileId === "liuli-prism-barrage" ||
    profileId === "liuli-kiln-gravity" ||
    profileId === "liuli-crucible-shards"
  ) {
    return "boss";
  }

  if (
    profileId === "zheng-shockwave" ||
    profileId === "zheng-horn-charge" ||
    profileId === "liuli-crucible-wave" ||
    profileId === "liuli-prism-charge"
  ) {
    return "elite";
  }

  return "trash";
}

function nextEnemyAttackProfile(
  enemy: Pick<CombatEnemy, "kind" | "attackProfileId" | "attackSkillId" | "attackPatternIds" | "nextAttackPatternIndex" | "ashSummonCount">
): EnemyAttackProfileId {
  if (isEnemyAttackProfileId(enemy.attackSkillId)) {
    return enemy.attackSkillId;
  }

  const patternIds = enemy.attackPatternIds?.filter((profileId) => enemyAttackProfileKind(profileId) === enemy.kind);

  if (patternIds && patternIds.length > 0) {
    const patternIndex = enemy.nextAttackPatternIndex ?? 0;
    const candidate = patternIds[patternIndex] ?? patternIds[0];

    if (candidate === "taotie-ash-summon" && (enemy.ashSummonCount ?? 0) >= 1) {
      return patternIds[(patternIndex + 1) % patternIds.length] ?? patternIds[0];
    }

    return candidate;
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

  if (profileId === "liuli-crucible-shards") {
    return {
      skillId: "liuli-crucible-shards",
      damage: 46,
      rangeX: 260,
      laneRange: 42,
      windupMs: 440,
      recoveryMs: 420,
      cooldownMs: 2800,
      hitstopMs: 60,
      knockback: 48,
      hitCount: 2,
      hitIntervalMs: 160,
      vfxCue: "taotie-chain-cleave-drag",
      hitVfxCues: ["taotie-chain-cleave-drag", "taotie-chain-cleave-smash"],
      vfxWindowMs: 500,
      feedbackCue: "player-hurt-chain-drag",
      feedbackCues: ["player-hurt-chain-drag", "player-hurt-chain-smash"],
      invulnerabilityMs: 120,
      hurtLockMs: 380,
      damageMultipliers: [0.75, 1.25],
      knockbackByHit: [18, 72],
      jumpEvade: true
    };
  }

  if (profileId === "liuli-kiln-gravity") {
    return {
      skillId: "liuli-kiln-gravity",
      damage: 54,
      rangeX: 134,
      laneRange: 30,
      windupMs: 430,
      recoveryMs: 400,
      cooldownMs: 2500,
      hitstopMs: 68,
      knockback: 34,
      hitCount: 1,
      hitIntervalMs: 0,
      vfxCue: "taotie-devour-bite",
      vfxWindowMs: 520,
      feedbackCue: "player-hurt-devoured",
      invulnerabilityMs: 500,
      hurtLockMs: 480,
      windupPullPx: 150
    };
  }

  if (profileId === "liuli-prism-barrage") {
    return {
      skillId: "liuli-prism-barrage",
      damage: 40,
      rangeX: 310,
      laneRange: 72,
      windupMs: 380,
      recoveryMs: 340,
      cooldownMs: 2100,
      hitstopMs: 54,
      knockback: 36,
      hitCount: 3,
      hitIntervalMs: 170,
      vfxCue: "taotie-flame-breath-sustain",
      vfxWindowMs: 480,
      feedbackCue: "player-hurt-boss-breath",
      invulnerabilityMs: 110,
      hurtLockMs: 240
    };
  }

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
      requiresPreviousHitByHit: [false, true],
      jumpEvade: true
    };
  }

  if (profileId === "taotie-chain-cleave") {
    return {
      skillId: "taotie-chain-cleave",
      damage: 50,
      rangeX: 255,
      laneRange: 34,
      windupMs: 360,
      recoveryMs: 430,
      cooldownMs: 2900,
      hitstopMs: 66,
      knockback: 34,
      hitCount: 2,
      hitIntervalMs: 180,
      vfxCue: "taotie-chain-cleave-drag",
      hitVfxCues: ["taotie-chain-cleave-drag", "taotie-chain-cleave-smash"],
      vfxWindowMs: 520,
      feedbackCue: "player-hurt-chain-drag",
      feedbackCues: ["player-hurt-chain-drag", "player-hurt-chain-smash"],
      invulnerabilityMs: 0,
      invulnerabilityMsByHit: [0, 420],
      hurtLockMs: 440,
      hurtLockMsByHit: [380, 500],
      damageMultipliers: [0.7, 1.35],
      knockbackByHit: [16, 86],
      boundMsByHit: [260, 0],
      requiresPreviousHitByHit: [false, true],
      windupPullPx: 126,
      jumpEvade: true
    };
  }

  if (profileId === "taotie-world-devour") {
    return {
      skillId: "taotie-world-devour",
      damage: 78,
      rangeX: 320,
      laneRange: 54,
      windupMs: 760,
      recoveryMs: 720,
      cooldownMs: 4300,
      hitstopMs: 84,
      knockback: 98,
      hitCount: 1,
      hitIntervalMs: 0,
      vfxCue: "taotie-world-devour-impact",
      vfxWindowMs: 740,
      feedbackCue: "player-hurt-world-devour",
      invulnerabilityMs: 620,
      hurtLockMs: 660,
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

  if (profileId === "liuli-prism-charge") {
    return {
      skillId: "liuli-prism-charge",
      damage: 48,
      rangeX: 96,
      laneRange: 34,
      windupMs: 390,
      recoveryMs: 340,
      cooldownMs: 2000,
      hitstopMs: 52,
      knockback: 76,
      hitCount: 1,
      hitIntervalMs: 0,
      vfxCue: "zheng-horn-charge-impact",
      vfxWindowMs: 440,
      feedbackCue: "player-hurt-heavy",
      invulnerabilityMs: 540,
      hurtLockMs: 440,
      windupRushPx: 230,
      jumpEvade: true
    };
  }

  if (profileId === "liuli-crucible-wave") {
    return {
      skillId: "liuli-crucible-wave",
      damage: 50,
      rangeX: 220,
      laneRange: 64,
      windupMs: 340,
      recoveryMs: 280,
      cooldownMs: 1750,
      hitstopMs: 46,
      knockback: 60,
      hitCount: 1,
      hitIntervalMs: 0,
      vfxCue: "zheng-shockwave-impact",
      vfxWindowMs: 400,
      feedbackCue: "player-hurt-heavy",
      invulnerabilityMs: 540,
      hurtLockMs: 400,
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

  if (profileId === "liuli-splinter-rush") {
    return {
      skillId: "liuli-splinter-rush",
      damage: 36,
      rangeX: 76,
      laneRange: 44,
      windupMs: 300,
      recoveryMs: 320,
      cooldownMs: 1800,
      hitstopMs: 48,
      knockback: 62,
      hitCount: 1,
      hitIntervalMs: 0,
      vfxCue: "ash-crawler-burst-explode",
      vfxWindowMs: 420,
      feedbackCue: "player-hurt-heavy",
      invulnerabilityMs: 540,
      hurtLockMs: 440,
      windupRushPx: 170,
      jumpEvade: true
    };
  }

  if (profileId === "liuli-glass-spray") {
    return {
      skillId: "liuli-glass-spray",
      damage: 30,
      rangeX: 205,
      laneRange: 62,
      windupMs: 260,
      recoveryMs: 230,
      cooldownMs: 1450,
      hitstopMs: 34,
      knockback: 38,
      hitCount: 1,
      hitIntervalMs: 0,
      vfxCue: "ash-ember-spit-impact",
      vfxWindowMs: 340,
      feedbackCue: "player-hurt-light",
      invulnerabilityMs: 540,
      hurtLockMs: 400
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
  attackProfileId: EnemyAttackProfileId,
  difficultyId: DungeonDifficultyId
): CombatEnemy {
  const stats = enemyStats(kind);
  const difficulty = getDungeonDifficulty(difficultyId);
  const scaledHp = Math.round(stats.maxHp * difficulty.hpMultiplier);
  const attackPatternIds: EnemyAttackProfileId[] | undefined =
    kind === "boss" ? (dungeonId === "liuli-furnace" ? liuliBossPattern : taotieBossPhaseOnePattern) : undefined;
  const nextAttackPatternIndex = attackPatternIds
    ? attackPatternIds.includes(attackProfileId)
      ? attackPatternIds.indexOf(attackProfileId)
      : 0
    : undefined;

  return {
    id: `${dungeonId}-room-${roomIndex}-enemy-${enemyIndex}`,
    kind,
    ...stats,
    hp: scaledHp,
    maxHp: scaledHp,
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

function createRoomEnemies(dungeonId: DungeonId, roomIndex: number, difficultyId: DungeonDifficultyId): CombatEnemy[] {
  const dungeon = getDungeon(dungeonId);

  if (!dungeon) {
    throw new Error(`Unknown dungeon: ${dungeonId}`);
  }

  if (roomIndex === dungeon.rooms - 1) {
    return [
      createEnemy(
        dungeonId,
        roomIndex,
        0,
        "boss",
        dungeonId === "liuli-furnace" ? "liuli-prism-barrage" : "taotie-flame-breath",
        difficultyId
      )
    ];
  }

  if (roomIndex === dungeon.rooms - 2) {
    if (dungeonId === "liuli-furnace") {
      return [
        createEnemy(dungeonId, roomIndex, 0, "elite", "liuli-crucible-wave", difficultyId),
        createEnemy(dungeonId, roomIndex, 1, "elite", "liuli-prism-charge", difficultyId),
        createEnemy(dungeonId, roomIndex, 2, "trash", "liuli-glass-spray", difficultyId)
      ];
    }

    return [
      createEnemy(dungeonId, roomIndex, 0, "elite", "zheng-shockwave", difficultyId),
      createEnemy(dungeonId, roomIndex, 1, "elite", "zheng-horn-charge", difficultyId),
      createEnemy(dungeonId, roomIndex, 2, "trash", "ash-ember-spit", difficultyId)
    ];
  }

  if (dungeonId === "liuli-furnace") {
    return [
      createEnemy(dungeonId, roomIndex, 0, "trash", "liuli-glass-spray", difficultyId),
      createEnemy(dungeonId, roomIndex, 1, "trash", "liuli-splinter-rush", difficultyId)
    ];
  }

  return [
    createEnemy(dungeonId, roomIndex, 0, "trash", "ash-ember-spit", difficultyId),
    createEnemy(dungeonId, roomIndex, 1, "trash", "ash-crawler-burst", difficultyId)
  ];
}

function createTaotieAshSummons(
  run: Pick<CombatRun, "dungeonId" | "difficultyId" | "roomIndex" | "arena" | "enemies">,
  boss: CombatEnemy,
  profileIds: EnemyAttackProfileId[],
  occurredAtMs: number
): CombatEnemy[] {
  const offsets = [-128, 128];

  return profileIds.map((profileId, index) => {
    const base = createEnemy(run.dungeonId, run.roomIndex, run.enemies.length + index, "trash", profileId, run.difficultyId);
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
      attackConnectedHitIndexes: undefined,
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

      if (hitbox.requiresMarks && enemy.marks <= 0) {
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

export function enemySuperArmorActive(enemy: CombatEnemy, elapsedMs: number): boolean {
  return enemy.hp > 0 && enemy.kind !== "trash" && enemy.armor > 0 && elapsedMs >= (enemy.armorBrokenUntilMs ?? 0);
}

interface EnemyHitReaction {
  armorDamage: number;
  hpDamage: number;
  controlledUntilMs?: number;
  hitstunUntilMs?: number;
  armorBrokenUntilMs?: number;
  nextAttackAtMs: number;
  interruptsAttack: boolean;
  airborne: boolean;
  downed: boolean;
  airborneUntilMs?: number;
  downedUntilMs?: number;
}

function resolveEnemyHitReaction(
  enemy: CombatEnemy,
  impactAtMs: number,
  effectiveDamage: number,
  statusTags: readonly CombatSkillStatusTag[],
  actionTags: readonly CombatActionTag[],
  juggle: boolean
): EnemyHitReaction {
  const armorDamage = Math.min(enemy.armor, effectiveDamage);
  const hpDamage = effectiveDamage - armorDamage;
  const guardBreak = hasStatus(statusTags, "guard-break");
  const superArmor = enemySuperArmorActive(enemy, impactAtMs) && !guardBreak;
  const controlUntil = hasStatus(statusTags, "trap") || hasStatus(statusTags, "control") ? impactAtMs + 1100 : undefined;
  const staggerUntil = hasStatus(statusTags, "stagger") ? impactAtMs + 780 : undefined;
  const controlledUntilMs = Math.max(enemy.controlledUntilMs ?? 0, controlUntil ?? 0, staggerUntil ?? 0) || undefined;
  const armorBrokenUntilMs = guardBreak
    ? Math.max(enemy.armorBrokenUntilMs ?? 0, impactAtMs + 1800)
    : enemy.armorBrokenUntilMs;
  const aliveAfterHit = enemy.hp - hpDamage > 0;
  const ordinaryHitstunUntilMs = aliveAfterHit && !superArmor ? impactAtMs + enemyOrdinaryHitstunMs : undefined;
  const activeHitstunUntilMs = (enemy.hitstunUntilMs ?? 0) > impactAtMs ? enemy.hitstunUntilMs : undefined;
  const hitstunUntilMs = Math.max(activeHitstunUntilMs ?? 0, ordinaryHitstunUntilMs ?? 0) || undefined;
  const forcedKnockdown = actionTags.includes("knockdown");
  const slamDown = actionTags.includes("slam") && enemy.airborne;
  const lethalDown = !juggle && !aliveAfterHit;
  const airborne = superArmor ? enemy.airborne : juggle && !slamDown && !forcedKnockdown;
  const downed = lethalDown || (superArmor ? enemy.downed : forcedKnockdown || slamDown);
  const airborneUntilMs = airborne
    ? superArmor
      ? enemy.airborneUntilMs
      : Math.max(enemy.airborneUntilMs ?? 0, impactAtMs + 1000)
    : undefined;
  const downedUntilMs = downed
    ? lethalDown || !superArmor
      ? Math.max(enemy.downedUntilMs ?? 0, impactAtMs + 760)
      : enemy.downedUntilMs
    : airborne
      ? undefined
      : enemy.downedUntilMs;
  const airControlUntil = Math.max(airborneUntilMs ?? 0, downedUntilMs ?? 0) || undefined;
  const explicitStatusInterrupt =
    Boolean(controlledUntilMs && controlledUntilMs > impactAtMs) || guardBreak;
  const interruptsAttack =
    explicitStatusInterrupt ||
    Boolean(airControlUntil && airControlUntil > impactAtMs) ||
    Boolean(ordinaryHitstunUntilMs && ordinaryHitstunUntilMs > impactAtMs);
  const nextAttackAtMs = Math.max(
    enemy.nextAttackAtMs,
    controlledUntilMs ?? 0,
    hitstunUntilMs ?? 0,
    airControlUntil ?? 0,
    guardBreak ? impactAtMs + 680 : 0
  );

  return {
    armorDamage,
    hpDamage,
    controlledUntilMs,
    hitstunUntilMs,
    armorBrokenUntilMs,
    nextAttackAtMs,
    interruptsAttack,
    airborne,
    downed,
    airborneUntilMs,
    downedUntilMs
  };
}

function playerDamage(run: CombatRun, baseDamage: number): number {
  return Math.max(1, Math.round(baseDamage * run.combatProfile.damageMultiplier));
}

interface CriticalHitResolution {
  damage: number;
  critical: boolean;
  multiplier: number;
  accumulator: number;
}

function resolvePlayerCritical(run: CombatRun, damage: number): CriticalHitResolution {
  const chance = clamp(run.combatProfile.criticalChance, 0, 100);
  const charged = clamp(run.criticalAccumulator, 0, 99.999999) + chance;
  const critical = damage > 0 && chance > 0 && charged >= 100;
  const multiplier = critical ? run.combatProfile.criticalDamageMultiplier : 1;

  return {
    damage: critical ? Math.max(1, Math.round(damage * multiplier)) : damage,
    critical,
    multiplier,
    accumulator: critical ? charged - 100 : charged
  };
}

function playerResourceGain(run: CombatRun, baseGain: number): number {
  return Math.max(0, Math.round(baseGain * run.combatProfile.resourceGainMultiplier));
}

function playerCooldownMs(run: CombatRun, baseCooldownMs: number): number {
  return Math.max(250, Math.round(baseCooldownMs * run.combatProfile.cooldownMultiplier));
}

function skillDamage(run: CombatRun, skill: { id?: string; resourceCost: number; tags: string[] }): number {
  const baseDamage = 38 + Math.round(skill.resourceCost / 4);
  const heatBurstMultiplier =
    run.player.resource.id === "heat" &&
    run.player.resource.current >= 70 &&
    (skill.tags.includes("burst") || skill.tags.includes("ultimate"))
      ? 1.25
      : 1;

  const rankMultiplier = skill.id ? skillDamageMultiplier(run.state, skill.id) : 1;

  return playerDamage(run, Math.round(baseDamage * heatBurstMultiplier * rankMultiplier));
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

  if (skill.id === "meteor-knuckle") {
    return 38;
  }

  if (skill.id === "earth-furnace-breaker") {
    return 46;
  }

  if (skill.id === "mountain-crack-hammer") {
    return 30;
  }

  if (skill.id === "furnace-step") {
    return 124;
  }

  if (skill.id === "prism-step") {
    return 104;
  }

  if (skill.id === "mirror-arc") {
    return 22;
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

const sparkComboStages: Array<{
  suffix: string;
  hitAtMs: number;
  hitPhase: CombatHitPhase;
  vfxCue: CombatVfxCue;
  vfxWindowMs: number;
  damageScale: number;
  knockback: number;
  hitstopMs: number;
}> = [
  {
    suffix: "jab",
    hitAtMs: 120,
    hitPhase: "spark-jab",
    vfxCue: "ember-spark-jab",
    vfxWindowMs: 260,
    damageScale: 0.4,
    knockback: 14,
    hitstopMs: 38
  },
  {
    suffix: "cross",
    hitAtMs: 220,
    hitPhase: "spark-cross",
    vfxCue: "ember-spark-cross",
    vfxWindowMs: 260,
    damageScale: 0.44,
    knockback: 18,
    hitstopMs: 42
  },
  {
    suffix: "finish",
    hitAtMs: 320,
    hitPhase: "spark-finish",
    vfxCue: "ember-spark-finish",
    vfxWindowMs: 320,
    damageScale: 0.58,
    knockback: 30,
    hitstopMs: 54
  }
];

function applySparkCombo(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const firstStageProgress = (() => {
    const progress = sparkComboStages[0].hitAtMs / sparkComboStages[sparkComboStages.length - 1].hitAtMs;
    return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  })();
  const totalLunge = skillMovementDistance(skill) / firstStageProgress;
  const endPosition = {
    x: clamp(run.player.x + totalLunge * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movement: CombatPlayerSkillMovement = {
    skillId: skill.id,
    startAtMs: run.elapsedMs,
    endAtMs: run.elapsedMs + sparkComboStages[sparkComboStages.length - 1].hitAtMs,
    startX: run.player.x,
    startY: run.player.y,
    endX: endPosition.x,
    endY: endPosition.y
  };
  const movingRun = appendSkillCastEvent(
    {
      ...run,
      player: {
        ...run.player,
        activeSkillMovement: movement
      }
    },
    skill,
    canceledFromCombo
  );

  return sparkComboStages.reduce((nextRun, stage) => {
    const stageOrigin = playerSkillMovementPosition(movement, run.elapsedMs + stage.hitAtMs);
    const stageHitbox = {
      ...sparkComboHitbox(run, skill, canceledFromCombo),
      inputToHitMs: stage.hitAtMs,
      damage: Math.max(1, Math.round(skillDamage(run, skill) * stage.damageScale)),
      knockback: stage.knockback,
      hitstopMs: stage.hitstopMs,
      statusTags: stage.suffix === "finish" ? (["stagger"] as CombatSkillStatusTag[]) : undefined
    };

    return schedulePlayerHitboxEffect(nextRun, stageHitbox, stageOrigin, run.player.facing, {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-${stage.suffix}`,
      hitPhase: stage.hitPhase,
      vfxCue: stage.vfxCue,
      vfxWindowMs: stage.vfxWindowMs
    });
  }, movingRun);
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

function playerShieldOpenCue(skillId: string): CombatVfxCue {
  if (skillId === "molten-wall") {
    return "molten-wall-open";
  }

  if (skillId === "black-furnace-aegis") {
    return "black-aegis-open";
  }

  return "anvil-guard-open";
}

function schedulePlayerShieldEffect(
  run: CombatRun,
  skill: ClassSkillDefinition,
  canceledFromCombo: boolean,
  windowMs: number,
  reduction: number
): CombatRun {
  const effect: CombatScheduledEnemyHitEffect = {
    id: `player-status-${run.elapsedMs}-skill-${skill.id}-shield`,
    applyAtMs: run.elapsedMs + skill.animation.hitFrameMs,
    action: "skill",
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    damage: 0,
    hitstopMs: 0,
    knockback: 0,
    juggle: false,
    playerFacing: run.player.facing,
    skillId: skill.id,
    statusTags: skillStatusTags(skill.tags),
    casterPosition: { x: run.player.x, y: run.player.y },
    casterFacing: run.player.facing,
    playerShieldWindowMs: windowMs,
    playerShieldReduction: reduction,
    playerStatusVfxCue: playerShieldOpenCue(skill.id),
    playerStatusVfxWindowMs: 520
  };

  return {
    ...run,
    scheduledEnemyHitEffects: [...(run.scheduledEnemyHitEffects ?? []), effect]
  };
}

function applyAnvilGuard(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + skill.animation.lungePx * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );

  return schedulePlayerShieldEffect(movingRun, skill, canceledFromCombo, 900, 0.48);
}

function applyMoltenWall(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + skill.animation.lungePx * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );

  return schedulePlayerShieldEffect(movingRun, skill, canceledFromCombo, 1500, 0.5);
}

function applyBlackFurnaceAegis(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + skill.animation.lungePx * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );

  return schedulePlayerShieldEffect(movingRun, skill, canceledFromCombo, 1800, 0.58);
}

function furnaceTauntCenter(run: CombatRun): CombatVector {
  return {
    x: clamp(run.player.x + 112 * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
}

function furnaceTauntHitbox(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): PlayerHitboxDefinition {
  return {
    action: "skill",
    skillId: skill.id,
    rangeX: 164,
    laneRange: 76,
    targetCap: 3,
    frontOnly: false,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 0.62)),
    hitstopMs: 56,
    knockback: 0,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    pullCenter: furnaceTauntCenter(run),
    statusTags: ["control", "stagger"],
    actionTags: ["pull"]
  };
}

function applyFurnaceTaunt(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + skill.animation.lungePx * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const roarCenter = furnaceTauntCenter(run);
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );

  return schedulePlayerHitboxEffect(movingRun, furnaceTauntHitbox(run, skill, canceledFromCombo), roarCenter, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-furnace-roar`,
    hitPhase: "furnace-roar",
    vfxCue: "furnace-roar-impact",
    vfxWindowMs: 380
  });
}

function shieldQuakeHitbox(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): PlayerHitboxDefinition {
  return {
    action: "skill",
    skillId: skill.id,
    rangeX: 132,
    laneRange: 64,
    targetCap: 3,
    frontOnly: false,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 1.08)),
    hitstopMs: 78,
    knockback: 38,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags: ["stagger"],
    actionTags: ["slam", "knockdown"]
  };
}

function applyShieldQuake(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const movementDistance = skill.animation.lungePx;
  const endPosition = {
    x: clamp(run.player.x + movementDistance * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const quakeOrigin = {
    x: clamp(run.player.x + 92 * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );

  return schedulePlayerHitboxEffect(movingRun, shieldQuakeHitbox(run, skill, canceledFromCombo), quakeOrigin, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-shield-quake`,
    hitPhase: "shield-quake",
    vfxCue: "shield-quake-impact",
    vfxWindowMs: 360
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
  const facing = run.player.facing;
  const endPosition = {
    x: clamp(run.player.x + skillMovementDistance(skill) * facing, 0, run.arena.width),
    y: run.player.y
  };
  const castingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs + 220),
    skill,
    canceledFromCombo
  );
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
    const hitbox: PlayerHitboxDefinition = {
      action: "skill",
      skillId: skill.id,
      rangeX: skillRangeX(skill.tags),
      laneRange: skillLaneRange(skill.tags),
      targetCap: skillTargetCap(skill.tags),
      frontOnly: skillIsFrontOnly(skill.tags),
      damage: Math.max(1, Math.round(baseDamage * stage.damageMultiplier)),
      hitstopMs: stage.hitstopMs,
      knockback: stage.knockback,
      juggle: stage.juggle,
      inputToHitMs: stage.delayMs,
      canceledFromCombo,
      requiresStatusSourceSkillId: stage.phase === "impact" ? skill.id : undefined,
      statusTags: stage.statusTags,
      actionTags: stage.actionTags
    };

    return schedulePlayerHitboxEffect(nextRun, hitbox, endPosition, facing, {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-${stage.phase}`,
      hitPhase: stage.phase,
      vfxCue: stage.vfxCue,
      vfxWindowMs: stage.phase === "impact" ? 720 : 520,
      missOnEmpty: stage.phase !== "impact"
    });
  }, castingRun);
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

const mirrorArcReflectStartDelayMs = 90;
const mirrorArcReflectDurationMs = 680;

function mirrorArcHitbox(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): PlayerHitboxDefinition {
  return {
    action: "skill",
    skillId: skill.id,
    rangeX: 154,
    laneRange: 54,
    targetCap: 1,
    frontOnly: true,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 0.82)),
    hitstopMs: 62,
    knockback: 28,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags: ["reflect"]
  };
}

function applyMirrorArc(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + skillMovementDistance(skill) * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );
  const reflectingRun: CombatRun = {
    ...movingRun,
    player: setPlayerReflectWindow(
      movingRun.player,
      skill.id,
      run.elapsedMs + mirrorArcReflectStartDelayMs,
      run.elapsedMs + mirrorArcReflectStartDelayMs + mirrorArcReflectDurationMs
    )
  };

  return schedulePlayerHitboxEffect(
    reflectingRun,
    mirrorArcHitbox(run, skill, canceledFromCombo),
    endPosition,
    run.player.facing,
    {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-mirror-slash`,
      hitPhase: "mirror-arc",
      vfxCue: "mirror-arc-slash",
      vfxWindowMs: 320
    }
  );
}

const glassLotusBindDelayMs = 180;
const glassLotusBloomDelayMs = 320;

function glassLotusCenter(run: CombatRun): CombatVector {
  return {
    x: clamp(run.player.x + 118 * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
}

function glassLotusHitbox(
  run: CombatRun,
  skill: ClassSkillDefinition,
  canceledFromCombo: boolean,
  delayMs: number,
  stage: "bind" | "bloom"
): PlayerHitboxDefinition {
  const bloom = stage === "bloom";

  return {
    action: "skill",
    skillId: skill.id,
    rangeX: bloom ? 196 : 176,
    laneRange: bloom ? 96 : 82,
    targetCap: 3,
    frontOnly: false,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * (bloom ? 0.92 : 0.34))),
    hitstopMs: bloom ? 74 : 54,
    knockback: bloom ? 24 : 0,
    juggle: false,
    inputToHitMs: delayMs,
    canceledFromCombo,
    pullCenter: bloom ? undefined : glassLotusCenter(run),
    statusTags: bloom ? ["stagger"] : ["control"],
    actionTags: bloom ? ["knockdown"] : ["pull"],
    requiresStatusSourceSkillId: bloom ? skill.id : undefined
  };
}

function applyGlassLotus(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const center = glassLotusCenter(run);
  const endPosition = {
    x: clamp(run.player.x + skill.animation.lungePx * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const castingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + glassLotusBloomDelayMs),
    skill,
    canceledFromCombo
  );
  const boundRun = schedulePlayerHitboxEffect(
    castingRun,
    glassLotusHitbox(run, skill, canceledFromCombo, glassLotusBindDelayMs, "bind"),
    center,
    run.player.facing,
    {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-lotus-bind`,
      hitPhase: "lotus-bind",
      vfxCue: "glass-lotus-bind",
      vfxWindowMs: 360
    }
  );

  return schedulePlayerHitboxEffect(
    boundRun,
    glassLotusHitbox(run, skill, canceledFromCombo, glassLotusBloomDelayMs, "bloom"),
    center,
    run.player.facing,
    {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-lotus-bloom`,
      hitPhase: "lotus-bloom",
      vfxCue: "glass-lotus-bloom",
      vfxWindowMs: 460,
      missOnEmpty: false
    }
  );
}

const mirrorflameLockDelayMs = 180;
const mirrorflameBurstDelayMs = 350;

function mirrorflameCenter(run: CombatRun): CombatVector {
  return {
    x: clamp(run.player.x + 148 * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
}

function mirrorflameHitbox(
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
    rangeX: burst ? 270 : 250,
    laneRange: burst ? 112 : 104,
    targetCap: 3,
    frontOnly: false,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * (burst ? 1.18 : 0.36))),
    hitstopMs: burst ? 96 : 58,
    knockback: burst ? 34 : 0,
    juggle: false,
    inputToHitMs: delayMs,
    canceledFromCombo,
    statusTags: burst ? ["stagger"] : ["control"],
    actionTags: burst ? ["knockdown"] : [],
    requiresStatusSourceSkillId: burst ? skill.id : undefined
  };
}

function applyMirrorflameBurst(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const center = mirrorflameCenter(run);
  const endPosition = {
    x: clamp(run.player.x + skill.animation.lungePx * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const castingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + mirrorflameBurstDelayMs),
    skill,
    canceledFromCombo
  );
  const lockedRun = schedulePlayerHitboxEffect(
    castingRun,
    mirrorflameHitbox(run, skill, canceledFromCombo, mirrorflameLockDelayMs, "lock"),
    center,
    run.player.facing,
    {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-mirrorflame-lock`,
      hitPhase: "mirrorflame-lock",
      vfxCue: "mirrorflame-lock",
      vfxWindowMs: 420
    }
  );

  return schedulePlayerHitboxEffect(
    lockedRun,
    mirrorflameHitbox(run, skill, canceledFromCombo, mirrorflameBurstDelayMs, "burst"),
    center,
    run.player.facing,
    {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-mirrorflame-burst`,
      hitPhase: "mirrorflame-burst",
      vfxCue: "mirrorflame-burst",
      vfxWindowMs: 560,
      missOnEmpty: false
    }
  );
}

function applyLiuliRain(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const finalRainDelayMs = skill.animation.hitFrameMs + 190;
  const scriptedRun = applySkillStartupMovement(run, skill);
  const castingRun = appendSkillCastEvent(
    startPlayerSkillMovement(
      scriptedRun,
      skill,
      {
        x: scriptedRun.player.x,
        y: scriptedRun.player.y
      },
      run.elapsedMs + finalRainDelayMs
    ),
    skill,
    canceledFromCombo
  );
  const origin = { x: scriptedRun.player.x, y: scriptedRun.player.y };
  const baseDamage = skillDamage(run, skill);
  const waves: Array<{
    delayMs: number;
    damageMultiplier: number;
    hitstopMs: number;
    knockback: number;
    statusTags: CombatSkillStatusTag[];
    hitPhase: CombatHitPhase;
    vfxCue: CombatVfxCue;
    vfxWindowMs: number;
  }> = [
    {
      delayMs: skill.animation.hitFrameMs,
      damageMultiplier: 0.38,
      hitstopMs: 54,
      knockback: 8,
      statusTags: [],
      hitPhase: "rain-open",
      vfxCue: "glass-rain-open",
      vfxWindowMs: 300
    },
    {
      delayMs: skill.animation.hitFrameMs + 95,
      damageMultiplier: 0.42,
      hitstopMs: 58,
      knockback: 12,
      statusTags: [],
      hitPhase: "rain-fall",
      vfxCue: "glass-rain-fall",
      vfxWindowMs: 340
    },
    {
      delayMs: skill.animation.hitFrameMs + 190,
      damageMultiplier: 0.48,
      hitstopMs: 68,
      knockback: 20,
      statusTags: ["stagger"],
      hitPhase: "rain-shatter",
      vfxCue: "glass-rain-shatter",
      vfxWindowMs: 420
    }
  ];

  return waves.reduce((nextRun, wave, waveIndex) => {
    const hitbox: PlayerHitboxDefinition = {
      action: "skill",
      skillId: skill.id,
      rangeX: skillRangeX(skill.tags),
      laneRange: skillLaneRange(skill.tags),
      targetCap: skillTargetCap(skill.tags),
      frontOnly: skillIsFrontOnly(skill.tags),
      damage: Math.max(1, Math.round(baseDamage * wave.damageMultiplier)),
      hitstopMs: wave.hitstopMs,
      knockback: wave.knockback,
      juggle: false,
      inputToHitMs: wave.delayMs,
      canceledFromCombo,
      statusTags: wave.statusTags
    };

    return schedulePlayerHitboxEffect(nextRun, hitbox, origin, scriptedRun.player.facing, {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-rain-${waveIndex}`,
      hitPhase: wave.hitPhase,
      vfxCue: wave.vfxCue,
      vfxWindowMs: wave.vfxWindowMs,
      missOnEmpty: waveIndex === 0
    });
  }, castingRun);
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

const blackRainVolleyStages = [
  {
    phase: "black-rain-open" as const,
    cue: "black-rain-open" as const,
    delayOffsetMs: 0,
    vfxWindowMs: 300
  },
  {
    phase: "black-rain-fall" as const,
    cue: "black-rain-fall" as const,
    delayOffsetMs: 110,
    vfxWindowMs: 360
  },
  {
    phase: "black-rain-burst" as const,
    cue: "black-rain-burst" as const,
    delayOffsetMs: 220,
    vfxWindowMs: 440
  }
];

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

  return blackRainVolleyStages.reduce((nextRun, stage, rainIndex) => {
    const delayMs = skill.animation.hitFrameMs + stage.delayOffsetMs;

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
        hitPhase: stage.phase,
        vfxCue: stage.cue,
        vfxWindowMs: stage.vfxWindowMs,
        missOnEmpty: rainIndex === 0
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
    actionTags: burst ? ["knockdown"] : [],
    requiresStatusSourceSkillId: burst ? skill.id : undefined
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
  const pathDistance = Math.abs(endPosition.x - run.player.x);
  const shoulderStartInset = 34;
  const pathOrigin = {
    x: clamp(run.player.x + shoulderStartInset * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const pathHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: Math.max(150, skillRangeX(skill.tags), pathDistance + 35),
    laneRange: Math.max(46, skillLaneRange(skill.tags)),
    targetCap: 1,
    frontOnly: true,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 1.04)),
    hitstopMs: 64,
    knockback: 58,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags: ["stagger"]
  };

  return schedulePlayerHitboxEffect(movingRun, pathHitbox, pathOrigin, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-shoulder-impact`,
    hitPhase: "shoulder-impact",
    vfxCue: "furnace-shoulder-impact",
    vfxWindowMs: 300
  });
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

function crowFeintHitbox(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): PlayerHitboxDefinition {
  return {
    action: "skill",
    skillId: skill.id,
    rangeX: 230,
    laneRange: 58,
    targetCap: 1,
    frontOnly: true,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 0.88)),
    hitstopMs: 54,
    knockback: 34,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags: ["stagger"]
  };
}

function applyCrowFeint(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x - skill.animation.lungePx * run.player.facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );

  return schedulePlayerHitboxEffect(movingRun, crowFeintHitbox(run, skill, canceledFromCombo), endPosition, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-feint-shot`,
    hitPhase: "feint-shot",
    vfxCue: "crow-feint-shot",
    vfxWindowMs: 320
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

function markingBoltHitbox(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): PlayerHitboxDefinition {
  return {
    action: "skill",
    skillId: skill.id,
    rangeX: 320,
    laneRange: 64,
    targetCap: 1,
    frontOnly: true,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 0.72)),
    hitstopMs: 50,
    knockback: 18,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    marksApplied: markCountForSkill(skill)
  };
}

function applyMarkingBolt(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const castingRun = appendSkillCastEvent(
    startPlayerSkillMovement(
      run,
      skill,
      {
        x: clamp(run.player.x + skill.animation.lungePx * run.player.facing, 0, run.arena.width),
        y: run.player.y
      },
      run.elapsedMs + skill.animation.hitFrameMs
    ),
    skill,
    canceledFromCombo
  );

  return schedulePlayerHitboxEffect(castingRun, markingBoltHitbox(run, skill, canceledFromCombo), run.player, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-contract-mark`,
    hitPhase: "contract-mark",
    vfxCue: "contract-mark-impact",
    vfxWindowMs: 320
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
  const baseDamage = skillDamage(run, skill);
  const drawHitbox: PlayerHitboxDefinition = {
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
    inputToHitMs: heatBloomDrawDelayMs,
    canceledFromCombo,
    pullCenter: center,
    statusTags: ["stagger"]
  };
  const eruptionHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 170,
    laneRange: 82,
    targetCap: 3,
    frontOnly: false,
    damage: Math.max(1, Math.round(baseDamage * 0.96)),
    hitstopMs: 86,
    knockback: 36,
    juggle: true,
    inputToHitMs: heatBloomEruptionDelayMs,
    canceledFromCombo,
    statusTags: ["stagger"],
    actionTags: ["launcher"],
    requiresStatusSourceSkillId: skill.id
  };
  const drawnRun = schedulePlayerHitboxEffect(castingRun, drawHitbox, center, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-heat-draw`,
    hitPhase: "heat-draw",
    vfxCue: "heat-bloom-draw",
    vfxWindowMs: 340
  });

  return schedulePlayerHitboxEffect(drawnRun, eruptionHitbox, center, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-heat-eruption`,
    hitPhase: "heat-eruption",
    vfxCue: "heat-bloom-eruption",
    vfxWindowMs: 520,
    missOnEmpty: false
  });
}

const furnaceHeartOverdrivePulseDelayMs = 360;
const furnaceHeartOverdriveReleaseDelayMs = 560;

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
  const center = { x: run.player.x, y: run.player.y };
  const baseDamage = skillDamage(run, skill);
  const pulseHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 220,
    laneRange: 108,
    targetCap: 3,
    frontOnly: false,
    damage: Math.max(1, Math.round(baseDamage * 0.5)),
    hitstopMs: 62,
    knockback: 14,
    juggle: false,
    inputToHitMs: furnaceHeartOverdrivePulseDelayMs,
    canceledFromCombo,
    statusTags: ["stagger"]
  };
  const releaseHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 220,
    laneRange: 108,
    targetCap: 3,
    frontOnly: false,
    damage: Math.max(1, Math.round(baseDamage * 1.05)),
    hitstopMs: 104,
    knockback: 68,
    juggle: false,
    inputToHitMs: furnaceHeartOverdriveReleaseDelayMs,
    canceledFromCombo,
    statusTags: ["stagger"],
    actionTags: ["knockdown"],
    requiresStatusSourceSkillId: skill.id
  };
  const pulseRun = schedulePlayerHitboxEffect(castRun, pulseHitbox, center, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-overdrive-pulse`,
    hitPhase: "overdrive-pulse",
    vfxCue: "overdrive-core-pulse",
    vfxWindowMs: 360
  });

  return schedulePlayerHitboxEffect(pulseRun, releaseHitbox, center, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-overdrive-release`,
    hitPhase: "overdrive-release",
    vfxCue: "overdrive-core-release",
    vfxWindowMs: 560,
    missOnEmpty: false
  });
}

function applyPrismStep(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const scriptedRun = applySkillStartupMovement(run, skill);
  const movingRun = appendSkillCastEvent(startPlayerSkillMovement(run, skill, scriptedRun.player), skill, canceledFromCombo);
  const pathCenter = {
    x: (run.player.x + scriptedRun.player.x) / 2,
    y: run.player.y
  };
  const hitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: Math.abs(scriptedRun.player.x - run.player.x) / 2 + 22,
    laneRange: skillLaneRange(skill.tags),
    targetCap: 2,
    frontOnly: false,
    damage: Math.max(1, Math.round(skillDamage(run, skill) * 0.88)),
    hitstopMs: 56,
    knockback: 24,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags: ["stagger"]
  };

  return schedulePlayerHitboxEffect(movingRun, hitbox, pathCenter, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-pierce`,
    hitPhase: "pierce",
    vfxCue: "prism-pierce",
    vfxWindowMs: 340
  });
}

const flowingLightChainEndDelayMs = 940;
const flowingLightChainStages: Array<{
  phase: CombatHitPhase;
  cue: CombatVfxCue;
  delayMs: number;
  damageMultiplier: number;
  hitstopMs: number;
  knockback: number;
  vfxWindowMs?: number;
  juggle?: boolean;
  statusTags?: CombatSkillStatusTag[];
  actionTags?: CombatActionTag[];
}> = [
  {
    phase: "chain-open",
    cue: "flowing-chain-open",
    delayMs: 220,
    damageMultiplier: 0.18,
    hitstopMs: 30,
    knockback: 6
  },
  {
    phase: "chain-dance-left",
    cue: "flowing-chain-dance-left",
    delayMs: 330,
    damageMultiplier: 0.08,
    hitstopMs: 22,
    knockback: 5
  },
  {
    phase: "chain-dance-right",
    cue: "flowing-chain-dance-right",
    delayMs: 440,
    damageMultiplier: 0.08,
    hitstopMs: 24,
    knockback: 5
  },
  {
    phase: "chain-dance-left",
    cue: "flowing-chain-dance-left",
    delayMs: 550,
    damageMultiplier: 0.08,
    hitstopMs: 22,
    knockback: 5
  },
  {
    phase: "chain-dance-right",
    cue: "flowing-chain-dance-right",
    delayMs: 660,
    damageMultiplier: 0.08,
    hitstopMs: 24,
    knockback: 5
  },
  {
    phase: "chain-cross",
    cue: "flowing-chain-cross",
    delayMs: 790,
    damageMultiplier: 0.16,
    hitstopMs: 38,
    knockback: 12
  },
  {
    phase: "chain-finish",
    cue: "flowing-chain-finish",
    delayMs: flowingLightChainEndDelayMs,
    damageMultiplier: 1.5,
    hitstopMs: 82,
    knockback: 52,
    vfxWindowMs: 420,
    juggle: true,
    statusTags: ["stagger"],
    actionTags: ["launcher"]
  }
];

function applyFlowingLightChain(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const endPosition = {
    x: clamp(run.player.x + run.player.facing * 168, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + flowingLightChainEndDelayMs),
    skill,
    canceledFromCombo
  );

  return flowingLightChainStages.reduce((stageRun, stage, index) => {
    const stageOrigin = samplePlayerPosition(stageRun.player, run.elapsedMs + stage.delayMs);
    const hitbox: PlayerHitboxDefinition = {
      action: "skill",
      skillId: skill.id,
      rangeX: Math.abs(endPosition.x - run.player.x) / 2 + 82,
      laneRange: 52,
      targetCap: 2,
      frontOnly: false,
      damage: Math.max(1, Math.round(skillDamage(run, skill) * stage.damageMultiplier)),
      hitstopMs: stage.hitstopMs,
      knockback: stage.knockback,
      juggle: stage.juggle ?? false,
      inputToHitMs: stage.delayMs,
      canceledFromCombo,
      statusTags: stage.statusTags,
      actionTags: stage.actionTags
    };

    return schedulePlayerHitboxEffect(stageRun, hitbox, stageOrigin, run.player.facing, {
      id: `hit-${run.elapsedMs}-skill-${skill.id}-${index + 1}-${stage.phase}`,
      hitPhase: stage.phase,
      vfxCue: stage.cue,
      vfxWindowMs: stage.vfxWindowMs ?? 260,
      missOnEmpty: index === 0
    });
  }, movingRun);
}

function applyNightMarkDetonation(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const scriptedRun = applySkillStartupMovement(run, skill);
  const castRun = appendSkillCastEvent(scriptedRun, skill, canceledFromCombo);
  const origin = { x: castRun.player.x, y: castRun.player.y };
  const baseDamage = skillDamage(run, skill);
  const baseHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 380,
    laneRange: 96,
    targetCap: 3,
    frontOnly: false,
    damage: baseDamage,
    hitstopMs: 0,
    knockback: 0,
    juggle: false,
    inputToHitMs: 0,
    canceledFromCombo,
    requiresMarks: true
  };

  const lockHitbox: PlayerHitboxDefinition = {
    ...baseHitbox,
    damage: Math.max(1, Math.round(baseDamage * 0.34)),
    hitstopMs: 58,
    knockback: 8,
    inputToHitMs: skill.animation.hitFrameMs,
    statusTags: ["control"]
  };
  const burstHitbox: PlayerHitboxDefinition = {
    ...baseHitbox,
    damage: Math.max(1, Math.round(baseDamage * 0.9)),
    hitstopMs: 96,
    knockback: 54,
    consumeMarks: true,
    bonusDamagePerMark: bonusDamagePerMarkForSkill(skill),
    resourceGainPerConsumedMark: 6,
    inputToHitMs: skill.animation.hitFrameMs + 180,
    statusTags: ["stagger"],
    actionTags: ["knockdown"],
    requiresStatusSourceSkillId: skill.id
  };
  const lockedRun = schedulePlayerHitboxEffect(castRun, lockHitbox, origin, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-mark-lock`,
    hitPhase: "mark-lock",
    vfxCue: "night-mark-lock",
    vfxWindowMs: 360
  });

  return schedulePlayerHitboxEffect(lockedRun, burstHitbox, origin, run.player.facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-detonate`,
    hitPhase: "detonate",
    vfxCue: "night-mark-burst",
    vfxWindowMs: 520,
    missOnEmpty: false
  });
}

function mechanismShadowNetCenter(run: CombatRun): CombatVector {
  return {
    x: clamp(run.player.x + 150 * run.player.facing, 0, arena.width),
    y: run.player.y
  };
}

function applyMechanismShadowNet(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const facing = run.player.facing;
  const bindDelayMs = skill.animation.hitFrameMs;
  const snapDelayMs = skill.animation.hitFrameMs + 180;
  const netCenter = mechanismShadowNetCenter(run);
  const endPosition = {
    x: clamp(run.player.x + skill.animation.lungePx * facing, 0, run.arena.width),
    y: run.player.y
  };
  const castRun = appendSkillCastEvent(startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + snapDelayMs), skill, canceledFromCombo);
  const baseDamage = skillDamage(run, skill);
  const bindHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 190,
    laneRange: 110,
    targetCap: 3,
    frontOnly: false,
    damage: Math.max(1, Math.round(baseDamage * 0.32)),
    hitstopMs: 54,
    knockback: 0,
    juggle: false,
    inputToHitMs: bindDelayMs,
    canceledFromCombo,
    statusTags: ["trap", "control"]
  };
  const snapHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 210,
    laneRange: 116,
    targetCap: 3,
    frontOnly: false,
    damage: Math.max(1, Math.round(baseDamage * 0.72)),
    hitstopMs: 82,
    knockback: 0,
    juggle: false,
    inputToHitMs: snapDelayMs,
    canceledFromCombo,
    pullCenter: netCenter,
    statusTags: ["trap", "control", "stagger"],
    actionTags: ["pull"],
    requiresStatusSourceSkillId: skill.id
  };
  const boundRun = schedulePlayerHitboxEffect(castRun, bindHitbox, netCenter, facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-trap-bind`,
    hitPhase: "trap-bind",
    vfxCue: "mechanism-net-bind",
    vfxWindowMs: 420
  });

  return schedulePlayerHitboxEffect(boundRun, snapHitbox, netCenter, facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-trap-snap`,
    hitPhase: "trap-snap",
    vfxCue: "mechanism-net-snap",
    vfxWindowMs: 560,
    missOnEmpty: false
  });
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
    requiresStatusSourceSkillId: skill.id,
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
  const facing = run.player.facing;
  const staggerDelayMs = Math.max(0, skill.animation.hitFrameMs - 90);
  const impactDelayMs = skill.animation.hitFrameMs;
  const endPosition = {
    x: clamp(run.player.x + skillMovementDistance(skill) * facing, 0, run.arena.width),
    y: run.player.y
  };
  const castRun = appendSkillCastEvent(startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + impactDelayMs), skill, canceledFromCombo);
  const baseDamage = skillDamage(run, skill);
  const staggerHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 260,
    laneRange: 96,
    targetCap: 2,
    frontOnly: true,
    damage: Math.max(1, Math.round(baseDamage * 0.34)),
    hitstopMs: 62,
    knockback: 18,
    juggle: false,
    inputToHitMs: staggerDelayMs,
    canceledFromCombo,
    statusTags: ["stagger"]
  };
  const impactHitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 280,
    laneRange: 104,
    targetCap: 2,
    frontOnly: true,
    damage: Math.max(1, Math.round(baseDamage * 0.92)),
    hitstopMs: 108,
    knockback: 72,
    juggle: false,
    inputToHitMs: impactDelayMs,
    canceledFromCombo,
    statusTags: ["guard-break", "stagger"],
    actionTags: ["knockdown"],
    requiresStatusSourceSkillId: skill.id
  };
  const staggeredRun = schedulePlayerHitboxEffect(castRun, staggerHitbox, endPosition, facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-hammer-stagger`,
    hitPhase: "hammer-stagger",
    vfxCue: "mountain-hammer-stagger",
    vfxWindowMs: 360
  });

  return schedulePlayerHitboxEffect(staggeredRun, impactHitbox, endPosition, facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-hammer-impact`,
    hitPhase: "hammer-impact",
    vfxCue: "mountain-crack-impact",
    vfxWindowMs: 620,
    missOnEmpty: false
  });
}

function applyMountainGuardBreak(run: CombatRun, skill: ClassSkillDefinition, canceledFromCombo: boolean): CombatRun {
  const facing = run.player.facing;
  const endPosition = {
    x: clamp(run.player.x + skill.animation.lungePx * facing, 0, run.arena.width),
    y: run.player.y
  };
  const movingRun = appendSkillCastEvent(
    startPlayerSkillMovement(run, skill, endPosition, run.elapsedMs + skill.animation.hitFrameMs),
    skill,
    canceledFromCombo
  );
  const hitbox: PlayerHitboxDefinition = {
    action: "skill",
    skillId: skill.id,
    rangeX: 176,
    laneRange: 58,
    targetCap: 2,
    frontOnly: true,
    damage: skillDamage(run, skill),
    hitstopMs: 110,
    knockback: 78,
    juggle: false,
    inputToHitMs: skill.animation.hitFrameMs,
    canceledFromCombo,
    statusTags: ["guard-break"]
  };

  return schedulePlayerHitboxEffect(movingRun, hitbox, endPosition, facing, {
    id: `hit-${run.elapsedMs}-skill-${skill.id}-impact`,
    hitPhase: "mountain-guard-break",
    vfxCue: "mountain-guard-break-impact",
    vfxWindowMs: 620
  });
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
    current: clamp(Math.round(classResourceValue(state)), 0, resource.max)
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

  if (hasStatus(statusTags, "shield") && skillId !== "molten-wall" && skillId !== "black-furnace-aegis") {
    next = {
      ...next,
      shieldUntilMs: Math.max(next.shieldUntilMs, run.elapsedMs + 1500),
      shieldReduction: Math.max(next.shieldReduction, 0.5)
    };
  }

  if (hasStatus(statusTags, "guard") && skillId !== "anvil-guard") {
    next = {
      ...next,
      shieldUntilMs: Math.max(next.shieldUntilMs, run.elapsedMs + 900),
      shieldReduction: Math.max(next.shieldReduction, 0.48)
    };
  }

  if (hasStatus(statusTags, "evade") && skillId !== "crow-feint") {
    next = setPlayerInvulnerabilityWindow(
      setPlayerEvadeWindow(
        {
          ...next,
          x: clamp(next.x - next.facing * 44, 0, arena.width)
        },
        run.elapsedMs,
        run.elapsedMs + 980
      ),
      run.elapsedMs,
      run.elapsedMs + 420
    );
  }

  if (hasStatus(statusTags, "reflect") && skillId !== "mirror-arc") {
    next = setPlayerReflectWindow(next, skillId, run.elapsedMs, run.elapsedMs + 1100);
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
  const base = Math.max(250, Math.round(prismCooldownMs(run, skill.id, skill.cooldownMs) * skillCooldownMultiplier(run.state, skill.id)));

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
          attackConnectedHitIndexes: undefined,
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

export function createCombatRun(
  state: GameState,
  dungeonId: string,
  difficultyId: DungeonDifficultyId = "normal"
): CombatRun {
  const dungeon = getDungeon(dungeonId);
  const difficulty = getDungeonDifficulty(difficultyId);
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
    difficultyId: difficulty.id,
    roomIndex: 0,
    elapsedMs: 0,
    comboCount: 0,
    comboExpiresAtMs: 0,
    criticalAccumulator: 0,
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
      invulnerableStartedAtMs: 0,
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
      normalAttackStartedAtMs: 0,
      normalAttackUntilMs: 0,
      normalAttackComboStep: 0,
      normalAttackType: "none",
      dashAttackReadyUntilMs: 0,
      dashAttackStartedAtMs: 0,
      dashAttackUntilMs: 0,
      quickRecoverReadyUntilMs: 0,
      quickRecoverStartedAtMs: 0,
      quickRecoverUntilMs: 0,
      shieldUntilMs: 0,
      shieldReduction: 0,
      evadeStartedAtMs: 0,
      evadeUntilMs: 0,
      reflectStartedAtMs: 0,
      reflectUntilMs: 0,
      defeated: false,
      skillCooldowns: {},
      prismChain: 0
    },
    enemies: createRoomEnemies(dungeon.id, 0, difficulty.id),
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
      ...clearCompletedNormalAttack(updatePlayerAirState(clearCompletedSkillMovement(applyTimedPlayerWindows(run.player, elapsedMs), elapsedMs), elapsedMs), elapsedMs),
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

function advanceRoomTransitionFrame(run: CombatRun, dtMs: number): CombatRun {
  const transition = run.roomTransition;

  if (!transition) {
    return run;
  }

  const elapsedMs = run.elapsedMs + dtMs;
  const frameElapsedMs = Math.min(elapsedMs, transition.completeAtMs);
  const lockedRun: CombatRun = {
    ...run,
    elapsedMs: frameElapsedMs,
    comboCount: 0,
    comboExpiresAtMs: 0,
    player: lockPlayerForRoomTransition(run.player, transition),
    scheduledEnemyHitEffects: [],
    scheduledMissEffects: [],
    scheduledArenaHazards: []
  };

  if (elapsedMs < transition.completeAtMs) {
    return lockedRun;
  }

  return finishRoom({
    ...lockedRun,
    elapsedMs: transition.completeAtMs,
    roomTransition: undefined,
    player: {
      ...lockedRun.player,
      actionLockUntilMs: transition.completeAtMs,
      activeSkillMovement: undefined
    }
  });
}

export function stepCombat(run: CombatRun, input: CombatInput, dtMs: number): CombatRun {
  if (run.roomTransition) {
    return advanceRoomTransitionFrame(run, dtMs);
  }

  const elapsedMs = run.elapsedMs + dtMs;
  const buffer = run.player.bufferedAction;
  const bufferExecuteAtMs = run.player.bufferedActionExecuteAtMs;
  const terminalBufferExpired =
    buffer !== undefined &&
    bufferExecuteAtMs !== undefined &&
    elapsedMs >= bufferExecuteAtMs &&
    (roomIsCleared(run) || run.completed || run.failed || run.player.defeated);

  if (hitstopRemainingMs(run) > 0) {
    const hitstopBase: CombatRun = terminalBufferExpired
      ? {
          ...run,
          player: clearBufferedAction(run.player)
        }
      : run;
    const hitstopRun = advanceHitstopFrame(hitstopBase, input, dtMs);

    return run.completed || run.failed ? clearPendingCombatEffectsIfFailed(hitstopRun) : hitstopRun;
  }

  const shouldReleaseBuffer =
    buffer !== undefined &&
    bufferExecuteAtMs !== undefined &&
    run.elapsedMs < bufferExecuteAtMs &&
    elapsedMs >= bufferExecuteAtMs &&
    run.player.hurtLockUntilMs <= bufferExecuteAtMs &&
    run.player.boundUntilMs <= bufferExecuteAtMs &&
    !roomIsCleared(run) &&
    !run.completed &&
    !run.failed &&
    !run.player.defeated;

  if (shouldReleaseBuffer) {
    const beforeRelease = advanceCombatFrame(run, input, bufferExecuteAtMs - run.elapsedMs);
    const comboActiveAtRelease = comboStillActive(beforeRelease, bufferExecuteAtMs);
    const releaseBase: CombatRun = {
      ...beforeRelease,
      elapsedMs: bufferExecuteAtMs,
      comboCount: comboActiveAtRelease ? beforeRelease.comboCount : 0,
      comboExpiresAtMs: comboActiveAtRelease ? beforeRelease.comboExpiresAtMs : 0,
      player: {
        ...clearBufferedAction(clearCompletedSkillMovement(beforeRelease.player, bufferExecuteAtMs)),
        comboStep: comboActiveAtRelease ? beforeRelease.player.comboStep : 0,
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
  const recoveredEnemy =
    enemy.hitstunUntilMs !== undefined && elapsedMs >= enemy.hitstunUntilMs
      ? { ...enemy, hitstunUntilMs: undefined }
      : enemy;

  if (recoveredEnemy.attackRecoverUntilMs !== undefined && elapsedMs >= recoveredEnemy.attackRecoverUntilMs) {
    return {
      ...recoveredEnemy,
      attackStartedAtMs: undefined,
      attackImpactAtMs: undefined,
      attackRecoverUntilMs: undefined,
      attackSkillId: undefined,
      attackHitResolved: undefined,
      attackResolvedHits: undefined,
      attackConnectedHitIndexes: undefined,
      attackRushStartPosition: undefined,
      attackRushTargetPosition: undefined,
      attackPullStartPosition: undefined,
      attackPullTargetPosition: undefined
    };
  }

  return recoveredEnemy;
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
    elapsedMs < (recovered.controlledUntilMs ?? 0) ||
    elapsedMs < (recovered.hitstunUntilMs ?? 0)
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
      attackConnectedHitIndexes: [],
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

function playerHitAllowsQuickRecover(feedbackCue: CombatPlayerFeedbackCue, knockback: number, boundMs: number): boolean {
  return boundMs <= 0 && feedbackCue !== "player-hurt-light" && knockback >= 60;
}

function applyEnemyImpact(
  enemy: CombatEnemy,
  player: CombatPlayer,
  elapsedMs: number,
  combatProfile: CombatProfile,
  runContext: Pick<CombatRun, "dungeonId" | "difficultyId" | "roomIndex" | "arena" | "enemies">
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
  const connectedHitIndexes = new Set(enemy.attackConnectedHitIndexes ?? []);
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
    const hitDamageMultiplier = attack.damageMultipliers?.[resolvedHits] ?? 1;
    const difficultyDamage = Math.max(
      1,
      Math.round(attack.damage * hitDamageMultiplier * getDungeonDifficulty(runContext.difficultyId).damageMultiplier)
    );
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
        ashSummonCount: attack.skillId === "taotie-ash-summon" ? (nextEnemy.ashSummonCount ?? 0) + 1 : nextEnemy.ashSummonCount,
        attackResolvedHits: resolvedHits,
        attackHitResolved: resolvedHits >= attack.hitCount,
        attackConnectedHitIndexes: [...connectedHitIndexes]
      };
      spawnedEnemies.push(...summoned);
      events.push(attackEvent, summonEvent);
      continue;
    }

    const requiresPreviousHit = attack.requiresPreviousHitByHit?.[resolvedHits] === true;
    const previousHitConnected = !requiresPreviousHit || connectedHitIndexes.has(resolvedHits);
    const inRange = previousHitConnected && playerInEnemyAttackRange(nextEnemy, nextPlayer, attack);
    const airborneEvaded = inRange && attack.jumpEvade === true && hitTime < nextPlayer.airborneUntilMs;
    const evaded = inRange && (playerEvadeActiveAt(nextPlayer, hitTime) || airborneEvaded);
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
      attackHitResolved: resolvedHits >= attack.hitCount,
      attackConnectedHitIndexes: [...connectedHitIndexes]
    };
    events.push(attackEvent);

    if (phase === "miss" || nextPlayer.defeated || playerInvulnerableActiveAt(nextPlayer, hitTime)) {
      if (phase === "miss" && attack.skillId === "taotie-world-devour") {
        nextEnemy = {
          ...nextEnemy,
          armor: 0,
          armorBrokenUntilMs: Math.max(nextEnemy.armorBrokenUntilMs ?? 0, hitTime + 1800)
        };
      }
      failed = failed || nextPlayer.defeated;
      continue;
    }

    if (playerReflectActiveAt(nextPlayer, hitTime)) {
      const reflectSkillId = nextPlayer.reflectSkillId ?? "mirror-reflect";
      const reflectDamage = Math.max(1, Math.round(difficultyDamage * 0.65));
      const armorDamage = Math.min(nextEnemy.armor, reflectDamage);
      const hpDamage = reflectDamage - armorDamage;
      const reflectedEnemy: CombatEnemy = {
        ...nextEnemy,
        hp: Math.max(0, nextEnemy.hp - hpDamage),
        armor: Math.max(0, nextEnemy.armor - armorDamage)
      };
      const reflectEvent: CombatHitEvent = {
        kind: "hit",
        id: `hit-${hitTime}-${reflectSkillId}-reflect-${enemy.id}-${hitIndex}`,
        action: "skill",
        skillId: reflectSkillId,
        targetId: enemy.id,
        damage: reflectDamage,
        critical: false,
        criticalMultiplier: 1,
        occurredAtMs: hitTime,
        inputToHitMs: 0,
        hitstopMs: attack.hitstopMs,
        canceledFromCombo: false,
        statusTags: ["reflect"],
        hitPhase: reflectSkillId === "mirror-arc" ? "mirror-counter" : undefined,
        vfxCue: reflectSkillId === "mirror-arc" ? "mirror-counter-burst" : undefined,
        vfxWindowMs: reflectSkillId === "mirror-arc" ? 360 : undefined,
        impactPosition: { x: nextEnemy.position.x, y: nextEnemy.position.y }
      };

      nextEnemy = reflectedEnemy;
      if (
        reflectedEnemy.kind === "boss" &&
        reflectedEnemy.hp > 0 &&
        ((bossPhase(reflectedEnemy) === 1 && bossHpPercent(reflectedEnemy) <= 0.5) ||
          (bossPhase(reflectedEnemy) === 2 && bossHpPercent(reflectedEnemy) <= 0.3))
      ) {
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
    const shieldAbsorbedImpact = shieldActive && mitigation > 0;
    const damage = Math.max(1, Math.round(difficultyDamage * combatProfile.damageTakenMultiplier * (1 - mitigation)));
    const nextHp = Math.max(0, nextPlayer.hp - damage);
    const nextFacing: 1 | -1 = nextEnemy.position.x >= nextPlayer.x ? 1 : -1;
    const quickRecoverReadyUntilMs =
      nextHp > 0 && playerHitAllowsQuickRecover(hitFeedbackCue, hitKnockback, hitBoundMs)
        ? hitTime + quickRecoverReadyWindowMs
        : 0;
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
      x: shieldAbsorbedImpact ? nextPlayer.x : clamp(nextPlayer.x - nextFacing * hitKnockback, 0, arena.width),
      facing: shieldAbsorbedImpact ? nextPlayer.facing : nextFacing,
      hitstopUntilMs: Math.max(nextPlayer.hitstopUntilMs, hitTime + attack.hitstopMs),
      invulnerableStartedAtMs: hitTime,
      invulnerableUntilMs: hitTime + hitInvulnerabilityMs,
      hurtLockUntilMs: shieldAbsorbedImpact ? nextPlayer.hurtLockUntilMs : hitTime + Math.max(attack.hitstopMs, hitHurtLockMs),
      boundUntilMs: shieldAbsorbedImpact ? nextPlayer.boundUntilMs : Math.max(nextPlayer.boundUntilMs, hitBoundMs > 0 ? hitTime + hitBoundMs : 0),
      quickRecoverReadyUntilMs: shieldAbsorbedImpact ? nextPlayer.quickRecoverReadyUntilMs : quickRecoverReadyUntilMs,
      quickRecoverStartedAtMs: shieldAbsorbedImpact ? nextPlayer.quickRecoverStartedAtMs : 0,
      quickRecoverUntilMs: shieldAbsorbedImpact ? nextPlayer.quickRecoverUntilMs : 0,
      shieldUntilMs: nextPlayer.shieldUntilMs,
      shieldReduction: nextPlayer.shieldReduction,
      bufferedAction: shieldAbsorbedImpact ? nextPlayer.bufferedAction : undefined,
      bufferedActionQueuedAtMs: shieldAbsorbedImpact ? nextPlayer.bufferedActionQueuedAtMs : undefined,
      bufferedActionExecuteAtMs: shieldAbsorbedImpact ? nextPlayer.bufferedActionExecuteAtMs : undefined,
      activeSkillMovement: shieldAbsorbedImpact ? nextPlayer.activeSkillMovement : undefined,
      defeated: nextHp <= 0
    };

    nextPlayer = damagedPlayer.resource.id === "guard" ? gainFlatPlayerResource(damagedPlayer, 12) : damagedPlayer;
    connectedHitIndexes.add(hitIndex);
    nextEnemy = {
      ...nextEnemy,
      attackConnectedHitIndexes: [...connectedHitIndexes]
    };
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
  const preCriticalDamage = hit.damage + bonusDamage;
  const criticalResolution = target.hp > 0
    ? resolvePlayerCritical(run, preCriticalDamage)
    : { damage: preCriticalDamage, critical: false, multiplier: 1, accumulator: run.criticalAccumulator };
  const effectiveDamage = criticalResolution.damage;
  const statusTags = hit.statusTags ?? [];
  const actionTags = hit.actionTags ?? [];
  const baseHitstopMs = eventHitstop(target, hit.hitstopMs);
  const hitstopMs = criticalResolution.critical ? Math.round(baseHitstopMs * 1.25) : baseHitstopMs;
  const impactAtMs = run.elapsedMs + (hit.inputToHitMs ?? 0);
  const impactPosition = { x: target.position.x, y: target.position.y };
  const comboCount = run.comboCount > 0 && run.elapsedMs <= run.comboExpiresAtMs ? run.comboCount + 1 : 1;
  const comboExpiresAtMs = impactAtMs + 1200;
  const nextEnemies = run.enemies.map((enemy) => {
    if (enemy.id !== hit.targetId) {
      return enemy;
    }

    const reaction = resolveEnemyHitReaction(enemy, impactAtMs, effectiveDamage, statusTags, actionTags, hit.juggle);
    const { armorDamage, hpDamage } = reaction;
    const nextMarks = hit.consumeMarks ? 0 : clamp(enemy.marks + (hit.marksApplied ?? 0), 0, 9);
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
      controlledUntilMs: reaction.controlledUntilMs,
      hitstunUntilMs: reaction.hitstunUntilMs,
      armorBrokenUntilMs: reaction.armorBrokenUntilMs,
      statusSourceSkillId: statusTags.length > 0 ? hit.skillId : enemy.statusSourceSkillId,
      nextAttackAtMs: reaction.nextAttackAtMs,
      attackStartedAtMs: reaction.interruptsAttack ? undefined : enemy.attackStartedAtMs,
      attackImpactAtMs: reaction.interruptsAttack ? undefined : enemy.attackImpactAtMs,
      attackRecoverUntilMs: reaction.interruptsAttack ? undefined : enemy.attackRecoverUntilMs,
      attackSkillId: reaction.interruptsAttack ? undefined : enemy.attackSkillId,
      attackHitResolved: reaction.interruptsAttack ? undefined : enemy.attackHitResolved,
      attackResolvedHits: reaction.interruptsAttack ? undefined : enemy.attackResolvedHits,
      attackConnectedHitIndexes: reaction.interruptsAttack ? undefined : enemy.attackConnectedHitIndexes,
      attackRushStartPosition: reaction.interruptsAttack ? undefined : enemy.attackRushStartPosition,
      attackRushTargetPosition: reaction.interruptsAttack ? undefined : enemy.attackRushTargetPosition,
      attackPullStartPosition: reaction.interruptsAttack ? undefined : enemy.attackPullStartPosition,
      attackPullTargetPosition: reaction.interruptsAttack ? undefined : enemy.attackPullTargetPosition,
      position: nextPosition,
      airborne: reaction.airborne,
      downed: reaction.downed,
      airborneUntilMs: reaction.airborneUntilMs,
      downedUntilMs: reaction.downedUntilMs
    };
  });
  const event: CombatHitEvent = {
    kind: "hit",
    id: hit.id,
    action: hit.action ?? "test",
    skillId: hit.skillId,
    targetId: hit.targetId,
    damage: effectiveDamage,
    critical: criticalResolution.critical,
    criticalMultiplier: criticalResolution.multiplier,
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
    impactPosition,
    casterPosition: { x: run.player.x, y: run.player.y },
    casterFacing: run.player.facing
  };

  return triggerBossPhaseTransitions(
    {
    ...run,
    comboCount,
    comboExpiresAtMs,
    criticalAccumulator: criticalResolution.accumulator,
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
    resourceGainPerConsumedMark: hit.resourceGainPerConsumedMark,
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
  presentation: Pick<CombatScheduledEnemyHitEffect, "id" | "hitPhase" | "vfxCue" | "vfxWindowMs" | "missOnEmpty"> &
    Partial<Pick<CombatScheduledEnemyHitEffect, "comboStepOnHit" | "resourceGainOnHit" | "cancelWindowUntilMsOnHit" | "resetComboStepOnMiss">>
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
    resourceGainPerConsumedMark: hitbox.resourceGainPerConsumedMark,
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
    missOnEmpty: presentation.missOnEmpty ?? true,
    comboStepOnHit: presentation.comboStepOnHit,
    resourceGainOnHit: presentation.resourceGainOnHit,
    cancelWindowUntilMsOnHit: presentation.cancelWindowUntilMsOnHit,
    resetComboStepOnMiss: presentation.resetComboStepOnMiss
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

  if (
    !effect.skillId &&
    (hitbox.action === "light" || hitbox.action === "heavy") &&
    (effect.applyAtMs < run.player.hurtLockUntilMs || effect.applyAtMs < run.player.boundUntilMs)
  ) {
    return {
      ...run,
      player: {
        ...run.player,
        comboStep: 0,
        cancelWindowUntilMs: 0,
        normalAttackUntilMs: 0,
        normalAttackStartedAtMs: 0,
        normalAttackComboStep: 0,
        normalAttackType: "none",
        activeSkillMovement: undefined
      }
    };
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

    if (
      hitbox.requiresStatusSourceSkillId &&
      !sampledRun.enemies.some(
        (enemy) =>
          enemy.hp > 0 &&
          enemy.statusSourceSkillId === hitbox.requiresStatusSourceSkillId &&
          (enemy.controlledUntilMs ?? 0) > effect.applyAtMs
      )
    ) {
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
      hitPhase: effect.hitPhase,
      vfxCue: effect.vfxCue,
      vfxWindowMs: effect.vfxWindowMs,
      casterPosition: effect.casterPosition,
      casterFacing: effect.casterFacing,
      resetComboStepOnMiss: effect.resetComboStepOnMiss
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
    if (effect.playerShieldWindowMs !== undefined) {
      const statusEvent: CombatPlayerStatusEvent | undefined = effect.playerStatusVfxCue
        ? {
            kind: "player-status",
            id: `${effect.id}-status-vfx`,
            action: "skill",
            skillId: effect.skillId ?? "unknown",
            occurredAtMs: effect.applyAtMs,
            inputToHitMs: effect.inputToHitMs,
            canceledFromCombo: effect.canceledFromCombo,
            statusTags: effect.statusTags,
            vfxCue: effect.playerStatusVfxCue,
            vfxWindowMs: effect.playerStatusVfxWindowMs ?? 520,
            casterPosition: { x: impactResolvedRun.player.x, y: impactResolvedRun.player.y },
            casterFacing: impactResolvedRun.player.facing
          }
        : undefined;

      return {
        ...impactResolvedRun,
        events: statusEvent ? [...impactResolvedRun.events, statusEvent] : impactResolvedRun.events,
        player: {
          ...impactResolvedRun.player,
          shieldUntilMs: Math.max(impactResolvedRun.player.shieldUntilMs, effect.applyAtMs + effect.playerShieldWindowMs),
          shieldReduction: Math.max(impactResolvedRun.player.shieldReduction, effect.playerShieldReduction ?? 0)
        }
      };
    }

    return impactResolvedRun;
  }

  const target = impactResolvedRun.enemies.find((enemy) => enemy.id === targetId);

  if (!target || target.hp <= 0) {
    return impactResolvedRun;
  }

  const consumedMarks = effect.consumeMarks ? target.marks : 0;
  const bonusDamage = consumedMarks * (effect.bonusDamagePerMark ?? 0);
  const criticalResolution = resolvePlayerCritical(impactResolvedRun, effect.damage + bonusDamage);
  const effectiveDamage = criticalResolution.damage;
  const hitstopMs = criticalResolution.critical ? Math.round(effect.hitstopMs * 1.25) : effect.hitstopMs;
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
    damage: effectiveDamage,
    critical: criticalResolution.critical,
    criticalMultiplier: criticalResolution.multiplier,
    occurredAtMs: effect.applyAtMs,
    inputToHitMs: effect.inputToHitMs,
    hitstopMs,
    canceledFromCombo: effect.canceledFromCombo,
    comboCount,
    statusTags: effect.statusTags,
    actionTags: effect.actionTags,
    hitPhase: effect.hitPhase,
    vfxCue: effect.vfxCue,
    vfxWindowMs: effect.vfxWindowMs,
    impactPosition: { x: target.position.x, y: target.position.y },
    casterPosition: effect.casterPosition,
    casterFacing: effect.casterFacing
  };
  const nextEnemies = impactResolvedRun.enemies.map((enemy) => {
    if (enemy.id !== targetId) {
      return enemy;
    }

    const reaction = resolveEnemyHitReaction(enemy, effect.applyAtMs, effectiveDamage, statusTags, actionTags, effect.juggle);
    const { armorDamage, hpDamage } = reaction;
    const nextMarks = effect.consumeMarks ? 0 : clamp(enemy.marks + (effect.marksApplied ?? 0), 0, 9);
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
      controlledUntilMs: reaction.controlledUntilMs,
      hitstunUntilMs: reaction.hitstunUntilMs,
      armorBrokenUntilMs: reaction.armorBrokenUntilMs,
      statusSourceSkillId: statusTags.length > 0 ? effect.skillId : enemy.statusSourceSkillId,
      nextAttackAtMs: reaction.nextAttackAtMs,
      attackStartedAtMs: reaction.interruptsAttack ? undefined : enemy.attackStartedAtMs,
      attackImpactAtMs: reaction.interruptsAttack ? undefined : enemy.attackImpactAtMs,
      attackRecoverUntilMs: reaction.interruptsAttack ? undefined : enemy.attackRecoverUntilMs,
      attackSkillId: reaction.interruptsAttack ? undefined : enemy.attackSkillId,
      attackHitResolved: reaction.interruptsAttack ? undefined : enemy.attackHitResolved,
      attackResolvedHits: reaction.interruptsAttack ? undefined : enemy.attackResolvedHits,
      attackConnectedHitIndexes: reaction.interruptsAttack ? undefined : enemy.attackConnectedHitIndexes,
      attackRushStartPosition: reaction.interruptsAttack ? undefined : enemy.attackRushStartPosition,
      attackRushTargetPosition: reaction.interruptsAttack ? undefined : enemy.attackRushTargetPosition,
      attackPullStartPosition: reaction.interruptsAttack ? undefined : enemy.attackPullStartPosition,
      attackPullTargetPosition: reaction.interruptsAttack ? undefined : enemy.attackPullTargetPosition,
      position: nextPosition,
      airborne: reaction.airborne,
      downed: reaction.downed,
      airborneUntilMs: reaction.airborneUntilMs,
      downedUntilMs: reaction.downedUntilMs
    };
  });

  const resourceGain =
    (effect.resourceGainOnHit ??
      (effect.action === "light" && effect.hitPhase === "air-light" ? 5 : effect.action === "light" && effect.hitPhase === "dash-light" ? 6 : 0)) +
    consumedMarks * (effect.resourceGainPerConsumedMark ?? 0);
  const nextPlayerWithResource =
    resourceGain > 0 ? gainPlayerResource(impactResolvedRun.player, impactResolvedRun, resourceGain) : impactResolvedRun.player;

  return triggerBossPhaseTransitions(
    {
      ...impactResolvedRun,
      comboCount,
      comboExpiresAtMs,
      criticalAccumulator: criticalResolution.accumulator,
      enemies: nextEnemies,
      events: [...impactResolvedRun.events, event],
      player: {
        ...nextPlayerWithResource,
        comboStep: effect.comboStepOnHit ?? nextPlayerWithResource.comboStep,
        cancelWindowUntilMs:
          effect.cancelWindowUntilMsOnHit !== undefined
            ? Math.max(nextPlayerWithResource.cancelWindowUntilMs, effect.cancelWindowUntilMsOnHit)
            : nextPlayerWithResource.cancelWindowUntilMs,
        hitstopUntilMs: Math.max(impactResolvedRun.player.hitstopUntilMs, effect.applyAtMs + hitstopMs)
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
    hitPhase: effect.hitPhase,
    vfxCue: effect.vfxCue,
    vfxWindowMs: effect.vfxWindowMs,
    casterPosition: effect.casterPosition,
    casterFacing: effect.casterFacing
  };

  return {
    ...run,
    comboCount: 0,
    comboExpiresAtMs: 0,
    player: effect.resetComboStepOnMiss
      ? {
          ...run.player,
          comboStep: 0,
          cancelWindowUntilMs: 0
        }
      : run.player,
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

function isDefensivePlayerStatusEffect(effect: CombatScheduledEnemyHitEffect): boolean {
  return effect.targetId === undefined && effect.damage === 0 && effect.playerShieldWindowMs !== undefined;
}

function scheduledCombatEffectPriority(item: ScheduledCombatEffectItem): number {
  if (item.kind === "arena-hazard") {
    return 0;
  }

  if (item.kind === "enemy-hit" && isDefensivePlayerStatusEffect(item.effect)) {
    return 0.5;
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

function shiftItemForHitstop(
  item: ScheduledCombatEffectItem,
  hitstopStartedAtMs: number,
  freezeElapsedMs: number
): ScheduledCombatEffectItem {
  if (freezeElapsedMs <= 0 || item.occurredAtMs <= hitstopStartedAtMs || (item.kind !== "enemy-impact" && item.kind !== "arena-hazard")) {
    return item;
  }

  const occurredAtMs = item.occurredAtMs + freezeElapsedMs;

  if (item.kind === "arena-hazard") {
    return {
      ...item,
      hazard: {
        ...item.hazard,
        impactAtMs: shiftFutureTime(item.hazard.impactAtMs, hitstopStartedAtMs, freezeElapsedMs)
      },
      occurredAtMs
    };
  }

  return {
    ...item,
    occurredAtMs
  };
}

function restoreFutureScheduledItem(run: CombatRun, item: ScheduledCombatEffectItem): CombatRun {
  if (item.kind !== "arena-hazard") {
    return run;
  }

  return {
    ...run,
    scheduledArenaHazards: [...run.scheduledArenaHazards, item.hazard]
  };
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
  let hitstopStartedAtMs: number | undefined;
  let hitstopShiftedThroughMs: number | undefined;

  for (let itemIndex = 0; itemIndex < queue.length; itemIndex += 1) {
    let item = queue[itemIndex];

    if (nextRun.failed || nextRun.player.defeated) {
      return clearPendingCombatEffectsIfFailed(nextRun);
    }

    if (hitstopStartedAtMs !== undefined && item.occurredAtMs > hitstopStartedAtMs) {
      const hitstopUntilMs = nextRun.player.hitstopUntilMs;
      const shiftFromMs = hitstopShiftedThroughMs ?? hitstopStartedAtMs;
      const shiftToMs = Math.min(run.elapsedMs, hitstopUntilMs);
      const freezeDeltaMs = Math.max(0, shiftToMs - shiftFromMs);

      if (freezeDeltaMs > 0) {
        nextRun = shiftCombatTimersForHitstop(nextRun, shiftFromMs, freezeDeltaMs);
        hitstopShiftedThroughMs = shiftToMs;
      }

      item = shiftItemForHitstop(item, hitstopStartedAtMs, Math.max(0, (hitstopShiftedThroughMs ?? hitstopStartedAtMs) - hitstopStartedAtMs));

      if (item.occurredAtMs > run.elapsedMs) {
        nextRun = restoreFutureScheduledItem(nextRun, item);
        continue;
      }
    }

    if (item.kind === "enemy-hit") {
      if (item.effect.skillId && canceledSkillIds.has(item.effect.skillId)) {
        continue;
      }

      const beforePlayer = nextRun.player;
      const beforeHitstopUntilMs = nextRun.player.hitstopUntilMs;
      const itemMovement = uncanceledMovementSample(movement, canceledSkillIds);
      const activeMovementSkillId = skillMovementIdAt(itemMovement, item.occurredAtMs);
      nextRun = applyScheduledEnemyHitEffect(nextRun, item.effect, activeMovementSkillId);
      const interruptedSkillId = interruptedActiveSkillId(beforePlayer, nextRun.player, activeMovementSkillId);

      if (interruptedSkillId) {
        canceledSkillIds.add(interruptedSkillId);
        nextRun = cancelScheduledEnemyHitEffectsForSkill(nextRun, interruptedSkillId);
      }

      if (nextRun.player.hitstopUntilMs > item.occurredAtMs && nextRun.player.hitstopUntilMs > beforeHitstopUntilMs) {
        if (beforeHitstopUntilMs <= item.occurredAtMs) {
          hitstopStartedAtMs = item.occurredAtMs;
          hitstopShiftedThroughMs = item.occurredAtMs;
        } else {
          hitstopStartedAtMs = hitstopStartedAtMs ?? item.occurredAtMs;
          hitstopShiftedThroughMs = hitstopShiftedThroughMs ?? hitstopStartedAtMs;
        }
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
      const beforeHitstopUntilMs = nextRun.player.hitstopUntilMs;
      const itemMovement = uncanceledMovementSample(movement, canceledSkillIds);
      const activeMovementSkillId = skillMovementIdAt(itemMovement, item.occurredAtMs);
      nextRun = applyQueuedEnemyImpact(nextRun, item.enemyId, item.occurredAtMs, itemMovement);
      const interruptedSkillId = interruptedActiveSkillId(beforePlayer, nextRun.player, activeMovementSkillId);

      if (interruptedSkillId) {
        canceledSkillIds.add(interruptedSkillId);
        nextRun = cancelScheduledEnemyHitEffectsForSkill(nextRun, interruptedSkillId);
      }

      if (nextRun.player.hitstopUntilMs > item.occurredAtMs && nextRun.player.hitstopUntilMs > beforeHitstopUntilMs) {
        if (beforeHitstopUntilMs <= item.occurredAtMs) {
          hitstopStartedAtMs = item.occurredAtMs;
          hitstopShiftedThroughMs = item.occurredAtMs;
        } else {
          hitstopStartedAtMs = hitstopStartedAtMs ?? item.occurredAtMs;
          hitstopShiftedThroughMs = hitstopShiftedThroughMs ?? hitstopStartedAtMs;
        }
      }

      continue;
    }

    const beforePlayer = nextRun.player;
    const beforeHitstopUntilMs = nextRun.player.hitstopUntilMs;
    const itemMovement = uncanceledMovementSample(movement, canceledSkillIds);
    nextRun = applyScheduledArenaHazard(nextRun, item.hazard, itemMovement);
    const interruptedSkillId = interruptedActiveSkillId(beforePlayer, nextRun.player, skillMovementIdAt(itemMovement, item.occurredAtMs));

    if (interruptedSkillId) {
      canceledSkillIds.add(interruptedSkillId);
      nextRun = cancelScheduledEnemyHitEffectsForSkill(nextRun, interruptedSkillId);
    }

    if (nextRun.player.hitstopUntilMs > item.occurredAtMs && nextRun.player.hitstopUntilMs > beforeHitstopUntilMs) {
      if (beforeHitstopUntilMs <= item.occurredAtMs) {
        hitstopStartedAtMs = item.occurredAtMs;
        hitstopShiftedThroughMs = item.occurredAtMs;
      } else {
        hitstopStartedAtMs = hitstopStartedAtMs ?? item.occurredAtMs;
        hitstopShiftedThroughMs = hitstopShiftedThroughMs ?? hitstopStartedAtMs;
      }
    }
  }

  if (hitstopStartedAtMs !== undefined) {
    const shiftFromMs = hitstopShiftedThroughMs ?? hitstopStartedAtMs;
    const shiftToMs = Math.min(run.elapsedMs, nextRun.player.hitstopUntilMs);
    const freezeDeltaMs = Math.max(0, shiftToMs - shiftFromMs);

    if (freezeDeltaMs > 0) {
      return shiftCombatTimersForHitstop(nextRun, shiftFromMs, freezeDeltaMs);
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
  const evaded = inRange && playerEvadeActiveAt(sampledPlayer, hazard.impactAtMs);
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

  if (phase !== "active" || run.player.defeated || playerInvulnerableActiveAt(sampledPlayer, hazard.impactAtMs)) {
    return {
      ...run,
      events: [...run.events, hazardEvent]
    };
  }

  const difficultyDamage = Math.round(hazard.damage * getDungeonDifficulty(run.difficultyId).damageMultiplier);
  const damage = Math.max(1, Math.round(difficultyDamage * run.combatProfile.damageTakenMultiplier));
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
    invulnerableStartedAtMs: hazard.impactAtMs,
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
      quickRecoverReadyUntilMs: 0,
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

  if (action.type === "consume") {
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

function quickRecoverActive(player: CombatPlayer, elapsedMs: number): boolean {
  return elapsedMs < player.quickRecoverUntilMs;
}

function canStartQuickRecover(run: CombatRun): boolean {
  return (
    run.player.quickRecoverReadyUntilMs > 0 &&
    run.elapsedMs <= run.player.quickRecoverReadyUntilMs &&
    run.elapsedMs < run.player.hurtLockUntilMs &&
    run.elapsedMs >= run.player.boundUntilMs &&
    playerAirStateAt(run.player, run.elapsedMs) === "grounded" &&
    !quickRecoverActive(run.player, run.elapsedMs)
  );
}

function performQuickRecoverAction(run: CombatRun): CombatRun {
  const recoverUntilMs = run.elapsedMs + quickRecoverActionMs;
  const recoveredPlayer = setPlayerInvulnerabilityWindow(run.player, run.elapsedMs, run.elapsedMs + quickRecoverInvulnerableMs);

  return {
    ...run,
    player: {
      ...recoveredPlayer,
      comboStep: 0,
      actionLockUntilMs: recoverUntilMs,
      cancelWindowUntilMs: 0,
      hurtLockUntilMs: run.elapsedMs,
      boundUntilMs: 0,
      quickRecoverReadyUntilMs: 0,
      quickRecoverStartedAtMs: run.elapsedMs,
      quickRecoverUntilMs: recoverUntilMs,
      dashAttackReadyUntilMs: 0,
      airState: "grounded",
      airborneUntilMs: 0,
      landingUntilMs: 0,
      airAttackUsed: false,
      airAttackType: "none",
      airAttackStartedAtMs: 0,
      airAttackUntilMs: 0,
      activeSkillMovement: undefined,
      bufferedAction: undefined,
      bufferedActionQueuedAtMs: undefined,
      bufferedActionExecuteAtMs: undefined
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
  if (action.type === "consume") {
    return performConsumableAction(run, action.consumableId);
  }

  if (run.failed || run.player.defeated) {
    return run;
  }

  if (run.roomTransition) {
    return run;
  }

  if (run.completed || roomIsCleared(run)) {
    return run;
  }

  if (action.type === "jump" && canStartQuickRecover(run)) {
    return performQuickRecoverAction(run);
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
  const canceledFromCombo = action.type === "skill" && run.player.cancelWindowUntilMs > run.elapsedMs && run.player.comboStep > 0;

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
    const origin = samplePlayerPosition(run.player, run.elapsedMs);
    const endPosition = {
      x: clamp(origin.x + groundLightLungePx(comboStep) * run.player.facing, 0, run.arena.width),
      y: origin.y
    };
    const actionLockUntilMs = run.elapsedMs + combo.actionLockMs;
    const movingRun: CombatRun = {
      ...run,
      player: {
        ...run.player,
        activeSkillMovement: {
          skillId: `ground-light-${comboStep}`,
          startAtMs: run.elapsedMs,
          endAtMs: run.elapsedMs + combo.inputToHitMs,
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
      rangeX: Math.max(1, combo.rangeX - groundLightLungePx(comboStep)),
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
      },
      endPosition,
      run.player.facing,
      {
        id: `ground-light-${run.elapsedMs}-${comboStep}`,
        hitPhase: combo.hitPhase,
        vfxCue: combo.vfxCue,
        vfxWindowMs: combo.vfxWindowMs,
        comboStepOnHit: comboStep,
        resourceGainOnHit: 8,
        cancelWindowUntilMsOnHit: actionLockUntilMs,
        resetComboStepOnMiss: true
      }
    );

    return {
      ...scheduledRun,
      player: {
        ...scheduledRun.player,
        comboStep,
        actionLockUntilMs,
        cancelWindowUntilMs: 0,
        normalAttackStartedAtMs: run.elapsedMs,
        normalAttackUntilMs: actionLockUntilMs,
        normalAttackComboStep: comboStep,
        normalAttackType: "light",
        dashAttackReadyUntilMs: 0,
        quickRecoverReadyUntilMs: 0,
        bufferedAction: undefined,
        bufferedActionQueuedAtMs: undefined,
        bufferedActionExecuteAtMs: undefined
      }
    };
  }

  if (action.type === "heavy") {
    const origin = samplePlayerPosition(run.player, run.elapsedMs);
    const endPosition = {
      x: clamp(origin.x + groundHeavyLungePx * run.player.facing, 0, run.arena.width),
      y: origin.y
    };
    const actionLockUntilMs = run.elapsedMs + groundHeavyActionMs;
    const movingRun: CombatRun = {
      ...run,
      player: {
        ...run.player,
        activeSkillMovement: {
          skillId: "ground-heavy",
          startAtMs: run.elapsedMs,
          endAtMs: run.elapsedMs + groundHeavyInputToHitMs,
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
        action: "heavy",
        rangeX: 158,
        laneRange: 58,
        targetCap: 1,
        frontOnly: true,
        damage: playerDamage(run, 48),
        hitstopMs: 72,
        knockback: 60,
        juggle: true,
        inputToHitMs: groundHeavyInputToHitMs,
        canceledFromCombo,
        actionTags: ["launcher"]
      },
      endPosition,
      run.player.facing,
      {
        id: `ground-heavy-${run.elapsedMs}`,
        hitPhase: "ground-heavy-launch",
        vfxCue: "ground-heavy-impact",
        vfxWindowMs: 320,
        resourceGainOnHit: 4,
        resetComboStepOnMiss: true
      }
    );

    return {
      ...scheduledRun,
      player: {
        ...scheduledRun.player,
        comboStep: 0,
        actionLockUntilMs,
        cancelWindowUntilMs: 0,
        normalAttackStartedAtMs: run.elapsedMs,
        normalAttackUntilMs: actionLockUntilMs,
        normalAttackComboStep: 0,
        normalAttackType: "heavy",
        dashAttackReadyUntilMs: 0,
        quickRecoverReadyUntilMs: 0,
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
        quickRecoverReadyUntilMs: 0,
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
    const dodgingPlayer = setPlayerInvulnerabilityWindow(
      setPlayerEvadeWindow(run.player, run.elapsedMs, run.elapsedMs + backstepEvadeMs),
      run.elapsedMs,
      run.elapsedMs + backstepInvulnerableMs
    );

    return {
      ...run,
      player: {
        ...dodgingPlayer,
        activeSkillMovement: {
          skillId: "backstep",
          startAtMs: run.elapsedMs,
          endAtMs: run.elapsedMs + backstepMovementMs,
          startX: run.player.x,
          startY: run.player.y,
          endX: clamp(run.player.x - run.player.facing * backstepDistancePx, 0, run.arena.width),
          endY: run.player.y
        },
        comboStep: 0,
        actionLockUntilMs: run.elapsedMs + backstepActionLockMs,
        cancelWindowUntilMs: 0,
        dashAttackReadyUntilMs: 0,
        quickRecoverReadyUntilMs: 0,
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

  if (skill.id === "anvil-guard") {
    return finishSkillAction(applyAnvilGuard(run, skill, canceledFromCombo));
  }

  if (skill.id === "molten-wall") {
    return finishSkillAction(applyMoltenWall(run, skill, canceledFromCombo));
  }

  if (skill.id === "black-furnace-aegis") {
    return finishSkillAction(applyBlackFurnaceAegis(run, skill, canceledFromCombo));
  }

  if (skill.id === "furnace-taunt") {
    return finishSkillAction(applyFurnaceTaunt(run, skill, canceledFromCombo));
  }

  if (skill.id === "shield-quake") {
    return finishSkillAction(applyShieldQuake(run, skill, canceledFromCombo));
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

  if (skill.id === "mirror-arc") {
    return finishSkillAction(applyMirrorArc(run, skill, canceledFromCombo));
  }

  if (skill.id === "glass-lotus") {
    return finishSkillAction(applyGlassLotus(run, skill, canceledFromCombo));
  }

  if (skill.id === "mirrorflame-burst") {
    return finishSkillAction(applyMirrorflameBurst(run, skill, canceledFromCombo));
  }

  if (skill.id === "furnace-step") {
    return finishSkillAction(applyFurnaceStep(run, skill, canceledFromCombo));
  }

  if (skill.id === "shadow-roll") {
    return finishSkillAction(applyShadowRoll(run, skill, canceledFromCombo));
  }

  if (skill.id === "crow-feint") {
    return finishSkillAction(applyCrowFeint(run, skill, canceledFromCombo));
  }

  if (skill.id === "ink-shot") {
    return finishSkillAction(applyInkShot(run, skill, canceledFromCombo));
  }

  if (skill.id === "marking-bolt") {
    return finishSkillAction(applyMarkingBolt(run, skill, canceledFromCombo));
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

  if (skill.id === "mountain-guard-break") {
    return finishSkillAction(applyMountainGuardBreak(run, skill, canceledFromCombo));
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

export const healingPotionRecoveryRatio = 0.35;
export const revivalTokenRecoveryRatio = 0.35;
export const revivalTokenInvulnerabilityMs = 1200;

function consumeFromRunState(run: CombatRun, consumableId: ConsumableId): GameState | undefined {
  const amount = run.state.player.consumables[consumableId] ?? 0;

  if (amount <= 0) {
    return undefined;
  }

  return {
    ...run.state,
    player: {
      ...run.state.player,
      consumables: {
        ...run.state.player.consumables,
        [consumableId]: amount - 1
      }
    }
  };
}

function consumableStatusEvent(run: CombatRun, consumableId: ConsumableId): CombatPlayerStatusEvent {
  return {
    kind: "player-status",
    id: `consumable-${consumableId}-${run.elapsedMs}`,
    action: "consumable",
    skillId: consumableId,
    occurredAtMs: run.elapsedMs,
    inputToHitMs: 0,
    canceledFromCombo: false,
    vfxCue: consumableId === "healing-potion" ? "healing-potion-use" : "revival-token-use",
    vfxWindowMs: consumableId === "healing-potion" ? 520 : 780,
    casterPosition: { x: run.player.x, y: run.player.y },
    casterFacing: run.player.facing
  };
}

export function performConsumableAction(run: CombatRun, consumableId: ConsumableId): CombatRun {
  const nextState = consumeFromRunState(run, consumableId);

  if (!nextState) {
    return run;
  }

  if (consumableId === "healing-potion") {
    if (run.failed || run.player.defeated || run.completed || roomIsCleared(run) || run.player.hp >= run.player.maxHp) {
      return run;
    }

    return {
      ...run,
      state: nextState,
      events: [...run.events, consumableStatusEvent(run, consumableId)],
      player: {
        ...run.player,
        hp: Math.min(run.player.maxHp, run.player.hp + Math.ceil(run.player.maxHp * healingPotionRecoveryRatio))
      }
    };
  }

  if (!run.failed && !run.player.defeated) {
    return run;
  }

  const revivedPlayer = setPlayerInvulnerabilityWindow(
    {
      ...run.player,
      hp: Math.ceil(run.player.maxHp * revivalTokenRecoveryRatio),
      comboStep: 0,
      actionLockUntilMs: run.elapsedMs + 260,
      cancelWindowUntilMs: 0,
      hitstopUntilMs: run.elapsedMs,
      hurtLockUntilMs: run.elapsedMs,
      boundUntilMs: 0,
      airState: "grounded",
      jumpStartedAtMs: 0,
      airborneUntilMs: 0,
      landingUntilMs: 0,
      airAttackUsed: false,
      airAttackType: "none",
      airAttackStartedAtMs: 0,
      airAttackUntilMs: 0,
      normalAttackStartedAtMs: 0,
      normalAttackUntilMs: 0,
      normalAttackComboStep: 0,
      normalAttackType: "none",
      dashAttackReadyUntilMs: 0,
      quickRecoverReadyUntilMs: 0,
      quickRecoverStartedAtMs: 0,
      quickRecoverUntilMs: 0,
      activeSkillMovement: undefined,
      bufferedAction: undefined,
      bufferedActionQueuedAtMs: undefined,
      bufferedActionExecuteAtMs: undefined,
      defeated: false
    },
    run.elapsedMs,
    run.elapsedMs + revivalTokenInvulnerabilityMs
  );

  return {
    ...run,
    state: nextState,
    failed: false,
    events: [...run.events, consumableStatusEvent(run, consumableId)],
    scheduledEnemyHitEffects: [],
    scheduledMissEffects: [],
    scheduledArenaHazards: [],
    player: revivedPlayer
  };
}

export function skillCooldownRemaining(run: CombatRun, skillId: string): number {
  return Math.max(0, (run.player.skillCooldowns[skillId] ?? 0) - run.elapsedMs);
}

function roomGearRarity(run: CombatRun, roomCount: number): Rarity {
  const bossRoom = run.roomIndex === roomCount - 1;
  const eliteRoom = roomCount > 1 && run.roomIndex === roomCount - 2;

  if (run.difficultyId === "warrior") {
    return bossRoom ? "mythic" : "epic";
  }

  if (run.difficultyId === "adventure" && (eliteRoom || bossRoom)) {
    return "epic";
  }

  return bossRoom ? "epic" : "rare";
}

function stableLootOffset(run: CombatRun): number {
  const difficultyOffset = ["normal", "adventure", "warrior"].indexOf(run.difficultyId);
  const dungeonOffset = catalog.dungeons.findIndex((dungeon) => dungeon.id === run.dungeonId);

  return run.roomIndex + Math.max(0, difficultyOffset) + Math.max(0, dungeonOffset);
}

function leastOwnedCandidate(run: CombatRun, candidates: readonly GearItem[]): GearItem | undefined {
  if (candidates.length === 0) {
    return undefined;
  }

  const ownedCounts = new Map<string, number>();
  for (const owned of run.state.player.inventory) {
    ownedCounts.set(owned.catalogGearId, (ownedCounts.get(owned.catalogGearId) ?? 0) + 1);
  }

  const minimumOwned = Math.min(...candidates.map((item) => ownedCounts.get(item.id) ?? 0));
  const leastOwned = candidates.filter((item) => (ownedCounts.get(item.id) ?? 0) === minimumOwned);

  return leastOwned[stableLootOffset(run) % leastOwned.length];
}

function dungeonGearDrop(run: CombatRun, roomCount: number, lootSetIds: readonly string[]): GearItem | undefined {
  const rarity = roomGearRarity(run, roomCount);
  const allowedSetIds = new Set<string>(lootSetIds);
  const candidates = catalog.gear.filter((item) =>
    item.rarity === rarity && (rarity === "rare" ? item.setId === undefined : item.setId !== undefined && allowedSetIds.has(item.setId))
  );

  return leastOwnedCandidate(run, candidates);
}

function createLootEvent(run: CombatRun): CombatLootEvent {
  const dungeonBonus = run.dungeonId === "liuli-furnace" ? 1 : 0;
  const dungeon = getDungeon(run.dungeonId);
  const rewardMultiplier = getDungeonDifficulty(run.difficultyId).rewardMultiplier;
  const bossRoom = dungeon !== undefined && run.roomIndex === dungeon.rooms - 1;
  const farmingMultiplier = 1 + Math.max(0, run.combatProfile.stats.goldFind ?? 0) / 100;
  const gearDrop = dungeon ? dungeonGearDrop(run, dungeon.rooms, dungeon.lootSetIds) : undefined;

  return {
    dungeonId: run.dungeonId,
    roomIndex: run.roomIndex,
    experience: Math.round((110 + run.roomIndex * 20 + dungeonBonus * 60) * rewardMultiplier),
    gold: Math.round((120 + run.roomIndex * 30 + dungeonBonus * 80) * rewardMultiplier * farmingMultiplier),
    ironDust: Math.round((6 + run.roomIndex * 2) * rewardMultiplier * farmingMultiplier),
    arcShard: Math.round(dungeonBonus * rewardMultiplier * farmingMultiplier),
    consumables: bossRoom ? { "revival-token": 1 } : { "healing-potion": 1 },
    gearDropId: gearDrop?.id
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
  if (run.roomTransition) {
    return false;
  }

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

  const gate = roomGateForRun(run);
  const completeAtMs = run.elapsedMs + roomGateTransitionDurationMs;
  const transition: CombatRoomTransition = {
    state: "entering",
    startedAtMs: run.elapsedMs,
    completeAtMs,
    durationMs: roomGateTransitionDurationMs,
    fromRoomIndex: run.roomIndex,
    targetRoomIndex: gate.targetRoomIndex,
    gateState: gate.state as Exclude<CombatRoomGateState, "locked">,
    gateX: gate.x,
    gateY: gate.y
  };
  const transitionEvent: CombatRoomTransitionEvent = {
    kind: "room-transition",
    id: `room-transition-${run.elapsedMs}-${run.roomIndex}`,
    phase: "enter",
    dungeonId: run.dungeonId,
    fromRoomIndex: run.roomIndex,
    targetRoomIndex: gate.targetRoomIndex,
    gateState: transition.gateState,
    occurredAtMs: run.elapsedMs,
    completeAtMs
  };

  return {
    ...run,
    comboCount: 0,
    comboExpiresAtMs: 0,
    roomTransition: transition,
    events: [...run.events, transitionEvent],
    scheduledEnemyHitEffects: [],
    scheduledMissEffects: [],
    scheduledArenaHazards: [],
    player: lockPlayerForRoomTransition(run.player, transition)
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
    roomTransition: undefined,
    roomIndex: completed ? run.roomIndex : nextRoomIndex,
    comboCount: 0,
    comboExpiresAtMs: 0,
    player: {
      ...run.player,
      hp: Math.min(run.player.maxHp, run.player.hp + Math.ceil(run.player.maxHp * roomClearRecoveryRatio)),
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
      normalAttackStartedAtMs: 0,
      normalAttackUntilMs: 0,
      normalAttackComboStep: 0,
      normalAttackType: "none",
      dashAttackReadyUntilMs: 0,
      dashAttackStartedAtMs: 0,
      dashAttackUntilMs: 0,
      quickRecoverReadyUntilMs: 0,
      quickRecoverStartedAtMs: 0,
      quickRecoverUntilMs: 0,
      activeSkillMovement: undefined,
      bufferedAction: undefined,
      bufferedActionQueuedAtMs: undefined,
      bufferedActionExecuteAtMs: undefined
    },
    enemies: completed ? [] : createRoomEnemies(run.dungeonId, nextRoomIndex, run.difficultyId),
    events: [...run.events, clearedEvent],
    lootEvents: [...run.lootEvents, lootEvent],
    scheduledEnemyHitEffects: [],
    scheduledMissEffects: [],
    scheduledArenaHazards: [],
    completed
  };
}
