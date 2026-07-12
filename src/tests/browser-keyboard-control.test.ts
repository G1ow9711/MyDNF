import { createServer, type ViteDevServer } from "vite";
import { describe, expect, it } from "vitest";
import {
  runAppInRealBrowser,
  type RealBrowserAppPage,
  type RealBrowserKeyCode
} from "./support/real-browser-computed-style";
import { catalog } from "../data/catalog";
import type { DungeonId, GameState } from "../game/types";
import { SAVE_KEY } from "../systems/save";
import { AUDIO_SETTINGS_KEY } from "../ui/app";
import { createInitialState, createOwnedGear } from "../game/state";
import { advanceClass, selectBaseClass, skillResetGoldCost } from "../systems/classes";

type BrowserCombatState = {
  objective: string;
  playerX: number;
  playerMotion: string;
  playerAirborne: string;
  normalAttackMove: string;
  hitstopActive: string;
  screenShake: string;
  impactCue: string;
};

type BrowserBackstepReactionState = {
  objective: string;
  roomIndex: string;
  playerX: number;
  playerFacing: string;
  playerMotion: string;
  skillMove: string;
  skillMoveProgress: number;
  evadeActive: string;
  invulnerableActive: string;
  playerHurtLockActive: string;
  playerAnimation: string;
  weaponAnimation: string;
  enemies: Array<{
    id: string;
    kind: string;
    hp: number;
    armorState: string;
    superArmor: string;
    hitstunActive: string;
    hitRecent: string;
    motion: string;
    airborne: string;
    downed: string;
    animationName: string;
  }>;
};

type BrowserCriticalEvidence = {
  criticalChance: number;
  criticalAccumulator: number;
  criticalHit: string;
  hitstopActive: string;
  screenShake: string;
  screenFlash: string;
  damageText: string;
  impactAnimation: string;
  damageAnimation: string;
  playerAnimation: string;
  weaponAnimation: string;
};

type BrowserSkillState = {
  activeSkill: string;
  playerMotion: string;
  skillMove: string;
  skillMoveProgress: number;
  skillStage: string;
  hitPhase: string;
  vfxCue: string;
  playerHurtLockActive: string;
  playerHurtCue: string;
  playerAnimation: string;
  weaponAnimation: string;
  skillVfx: string;
  skillVfxHitPhase: string;
  skillVfxCue: string;
  skillVfxCoreAnimation: string;
  skillVfxWaveAnimation: string;
  skillVfxSparksAnimation: string;
};

type BrowserSparkComboPhaseSample = BrowserSkillState & {
  capturedAtMs: number;
};

type BrowserFlowingLightPhaseSample = {
  capturedAtMs: number;
  appMode: string;
  classId: string;
  advancementId: string;
  playerX: number;
  playerY: number;
  playerHurtLockActive: string;
  playerHurtCue: string;
  activeSkill: string;
  playerMotion: string;
  skillMove: string;
  skillMoveProgress: number;
  skillStage: string;
  hitstopActive: string;
  hitPhase: string;
  vfxCue: string;
  playerAnimation: string;
  weaponAnimation: string;
  skillVfx: string;
  skillVfxHitPhase: string;
  skillVfxCue: string;
  skillVfxCoreAnimation: string;
  skillVfxWaveAnimation: string;
  skillVfxSparksAnimation: string;
  spriteFrame: number;
  spriteState: string;
  spriteSkill: string;
  spriteSkillPhase: string;
  spriteBackground: string;
  spriteSlashWidth: string;
  spriteGhostBackground: string;
  enemies: Array<{
    id: string;
    kind: string;
    hp: number;
    x: number;
    y: number;
    attackSkillId: string;
    attackStage: string;
    attackProgress: number;
    spriteFrame: number;
    spriteReaction: string;
    spriteTransform: string;
  }>;
};

type BrowserFlowingLightSwordDanceEvidence = {
  stagePhases: Array<{ stage: number; phase: string; cue: string }>;
  hitEventIds: string[];
  maxComboCount: number;
  sawFinisherAirborne: boolean;
  startX: number;
  maxX: number;
  finisherContactHoldFrame: number;
  finisherRecoveryFrame: number;
};

type BrowserFlowingLightLiveState = {
  phase: string;
  cue: string;
  spriteFrame: number;
  comboCount: number;
  airborne: string[];
  elapsedMs: number;
  hitAtMs: number;
};

type BrowserSwordDanceAudioPlayback = {
  commandId: string;
  channel: string;
  noteCount: number;
  textureTags: string[];
};

type BrowserEnemyAttackState = {
  objective: string;
  enemies: Array<{
    id: string;
    x: number;
    y: number;
    aiState: string;
    motion: string;
    stage: string;
    skill: string;
    animationName: string;
    spriteState: string;
    spriteFrame: number;
  }>;
  telegraph: string;
  telegraphShape: string;
  vfx: string;
  vfxPhase: string;
  vfxCue: string;
  vfxRingAnimation: string;
  vfxCoreAnimation: string;
  vfxTrailAnimation: string;
  playerHurtCue: string;
  playerAnimation: string;
};

type BrowserEnemyAudioPlayback = {
  commandId: string;
  channel: string;
  noteCount: number;
  textureTags: string[];
};

type BrowserCommandState = {
  objective: string;
  activeSkill: string;
  skillReleaseSource: string;
  commandReleaseSource: string;
  commandMatchSkillId: string;
  commandReductionApplied: string;
  lastInputMethod: string;
  playerMotion: string;
  normalAttackMove: string;
  actionBufferState: string;
  bufferedAction: string;
  bufferedSkillId: string;
  skillVfx: string;
};

type BrowserDoubleTapRunState = {
  objective: string;
  playerX: number;
  elapsedMs: number;
  dashSource: string;
  doubleTapActive: string;
  doubleTapDirection: string;
  dashReadyUntilMs: number;
  playerMotion: string;
  normalAttackMove: string;
  spriteState: string;
  spriteDashSource: string;
  spriteDustContent: string;
  spriteDustAnimation: string;
  impactCue: string;
  enemyHp: number[];
};

type BrowserDoubleTapRunEvidence = {
  sawDashLightMotion: boolean;
  sawDashLightImpact: boolean;
  lowestEnemyHp: number;
};

type BrowserNormalComboState = {
  objective: string;
  normalAttackActive: string;
  playerHurtLockActive: string;
  comboStep: number;
  comboCount: number;
  spriteComboStep: number;
  spriteComboPhase: string;
  spriteFrame: number;
  impactStep: string;
  enemyAirborne: string[];
  comboArcContent: string;
  comboArcBorderRightWidth: string;
  comboArcBoxShadow: string;
};

type BrowserNormalComboEvidence = {
  playerContactFrames: Array<{ step: number; frame: number }>;
  hitSteps: number[];
  hitCues: string[];
  enemyReactionFrames: Array<{ step: number; frame: number }>;
  maxComboCount: number;
  sawFinisherAirborne: boolean;
  lowestEnemyHp: number;
};

type BrowserNormalComboAudioPlayback = {
  commandId: string;
  channel: string;
  noteCount: number;
  textureTags: string[];
};

type BrowserComboCancelState = {
  objective: string;
  playerX: number;
  activeSkill: string;
  skillReleaseSource: string;
  playerMotion: string;
  normalAttackMove: string;
  playerDashAttackReadyUntilMs: string;
  comboCancelWindowActive: string;
  comboCancelAvailable: string;
  comboCancelState: string;
  comboCancelActive: string;
  comboCancelSkillId: string;
  comboCancelMsRemaining: number;
  hitstopActive: string;
  impactCue: string;
  actionBufferState: string;
  bufferedAction: string;
  bufferedSkillId: string;
  skillStage: string;
  hitPhase: string;
  vfxCue: string;
  playerAnimation: string;
  weaponAnimation: string;
  skillVfx: string;
  skillVfxHitPhase: string;
  skillVfxCue: string;
  skillVfxCoreAnimation: string;
  skillVfxWaveAnimation: string;
  skillVfxSparksAnimation: string;
  skillCancelToast: string;
};

type BrowserRoomFlowState = {
  appMode: string;
  objective: string;
  dungeonId: string;
  difficultyId: string;
  roomIndex: string;
  roomCount: string;
  liveEnemyCount: string;
  defeatedEnemyCount: string;
  combatElapsedMs: string;
  playerX: string;
  playerY: string;
  playerRecoveryAvailable: string;
  playerHurtLockActive: string;
  gateState: string;
  gateTransition: string;
  gateTargetRoom: string;
  gateEnterReady: string;
  transitionState: string;
  transitionFromRoom: string;
  transitionTargetRoom: string;
  combatEventCount: number;
  combatLootEventCount: number;
  floorLootCount: number;
  floorLootId: string;
  floorLootGearId: string;
  floorLootRarity: string;
  floorLootX: number;
  floorLootY: number;
  floorLootCollectible: string;
  resultVisible: boolean;
  savedFatigue: number;
  savedGold: number;
  savedIronDust: number;
  savedGearIds: string[];
  enemies: Array<{
    id: string;
    kind: string;
    hp: number;
    x: number;
    y: number;
  }>;
};

type BrowserEnemyDeathEvidence = {
  phases: string[];
  frames: number[];
};

type BrowserStrictCombatState = {
  objective: string;
  roomIndex: string;
  bossPhase: string;
  bossPhaseTriggered: string;
  arenaHazardCount: string;
  activeSkill: string;
  playerMotion: string;
  skillMove: string;
  skillStage: string;
  skillVfx: string;
  skillVfxCue: string;
  skillVfxCoreAnimation: string;
  hitstopActive: string;
  impactCue: string;
  enemies: Array<{
    id: string;
    kind: string;
    stage: string;
    skill: string;
    armorState: string;
    progress: number;
    animationName: string;
  }>;
  enemyVfx: string;
  enemyVfxCue: string;
};

type BrowserStrictCombatEvidence = {
  roomsSeen: string[];
  enemyKindsSeen: string[];
  sawPlayerSkillVfx: boolean;
  sawSkillMotion: boolean;
  sawHitstop: boolean;
  sawImpactCue: boolean;
  sawEnemyAttackMotion: boolean;
  sawEnemySkillVfx: boolean;
  sawBossPhase: boolean;
  sawBossPhaseThree: boolean;
  sawBossPhaseThreeVfx: boolean;
  sawWorldDevourVfx: boolean;
  sawWorldDevourArmorBreak: boolean;
  sawArenaHazard: boolean;
  sawBossSkillVfx: boolean;
};

type BrowserBossHudState = {
  visible: boolean;
  name: string;
  phase: string;
  hpCurrent: number;
  hpMax: number;
  hpPercent: number;
  armorCurrent: number;
  armorMax: number;
  armorState: string;
  breakRemainingMs: number;
  castSkillId: string;
  castStage: string;
  castProgress: number;
  width: number;
  overlapsStatus: boolean;
  overlapsCombo: boolean;
};

type BrowserLiuliEnemyState = {
  dungeonId: string;
  roomIndex: string;
  enemies: Array<{
    skill: string;
    stage: string;
    animationName: string;
  }>;
  enemyVfx: string;
  enemyVfxCue: string;
};

type BrowserReactionState = {
  objective: string;
  roomIndex: string;
  bossPhase: string;
  playerY: number;
  playerMotion: string;
  playerHurtCue: string;
  playerHurtLockActive: string;
  playerRecoveryState: string;
  playerQuickRecoverActive: string;
  playerInvulnerableActive: string;
  recoveryVfx: string;
  hazards: Array<{
    phase: string;
    skillId: string;
  }>;
  hazardFeedback: string;
  hazardFeedbackCue: string;
};

type BrowserAppModeState = {
  appMode: string;
  townScene: string;
};

type BrowserDungeonResultState = {
  appMode: string;
  dungeonId: string;
  difficultyId: string;
  rank: string;
  score: number;
  maxCombo: number;
  accuracy: number;
  criticalHits: number;
  hitsTaken: number;
  clearTimeMs: number;
  gearId: string;
  rankBonusGold: number;
  rankBonusIronDust: number;
  playerGold: number;
  playerIronDust: number;
  savedGold: number;
  savedIronDust: number;
  saveExists: boolean;
  confirmButton: boolean;
  topNav: boolean;
  rechallengeAvailable: boolean;
  fatigueCurrent: number;
  fatigueCost: number;
  fatigueAfterRetry: number;
};

type BrowserDungeonDifficultyState = {
  appMode: string;
  prepDungeonId: string;
  selectedDifficulty: string;
  fatigueCost: number;
  combatDifficulty: string;
  firstTrashHpMax: number;
  combatScene: boolean;
  savedFatigue: number;
  savedPreference: string;
  enterKeydownCount: number;
  lastEnterKeydownAt: number;
};

type BrowserSavedState = {
  appMode: string;
  saveKey: string;
  playerGold: number;
  playerIronDust: number;
  playerArcShard: number;
  inventoryCount: number;
  rawSaveExists: boolean;
  savedGold: number;
  savedIronDust: number;
  savedArcShard: number;
  savedInventoryCount: number;
};

type BrowserLootResultState = {
  appMode: string;
  combatDifficulty: string;
  gearId: string;
  rarity: string;
  setId: string;
  slot: string;
  roomIndex: string;
  gold: number;
  savedGearIds: string[];
};

type BrowserTownEcosystemState = {
  appMode: string;
  toast: string;
  inventoryCount: number;
  saved: GameState | null;
};

type BrowserAudioSettingsState = {
  appMode: string;
  master: number;
  music: number;
  sfx: number;
  saved: { master: number; music: number; sfx: number } | null;
};

type BrowserStoryDialogueState = {
  appMode: string;
  questId: string;
  phase: string;
  step: number;
  stepCount: number;
  npcId: string;
  dialogueText: string;
  topNavVisible: boolean;
  portraitBackground: string;
  portraitAnimation: string;
  dialogueAnimation: string;
  saved: GameState | null;
};

type BrowserConsumableState = {
  objective: string;
  hp: number;
  maxHp: number;
  healingPotionCount: number;
  revivalTokenCount: number;
  savedHealingPotionCount: number;
  statusVfx: string;
  statusVfxCue: string;
  statusCoreAnimation: string;
};

type BrowserDefeatState = {
  appMode: string;
  objective: string;
  roomIndex: string;
  playerHp: number;
  playerMaxHp: number;
  playerInvulnerable: string;
  overlayVisible: boolean;
  reviveAvailable: string;
  revivalTokenCount: number;
  reviveButtonVisible: boolean;
  reviveButtonDisabled: boolean;
  returnButtonVisible: boolean;
  liveEnemyCount: number;
  combatEventCount: number;
  savedRevivalTokenCount: number;
  enemyHp: number[];
};

type BrowserIronVanguardState = {
  appMode: string;
  classId: string;
  advancementId: string;
  activeSkill: string;
  playerMotion: string;
  skillMove: string;
  skillStage: string;
  shieldActive: string;
  skillVfx: string;
  skillVfxCue: string;
  statusVfx: string;
  statusVfxCue: string;
  enemyVfx: string;
  enemyVfxCue: string;
};

type BrowserInkMarkState = {
  appMode: string;
  classId: string;
  advancementId: string;
  resourceCurrent: number;
  activeSkill: string;
  playerMotion: string;
  skillVfx: string;
  detonationImpact: string;
  detonationCue: string;
  marks: number[];
};

type BrowserFrameSpriteState = {
  stage: string;
  backgroundReady: boolean;
  oldPlayerOpacity: string;
  oldPlayerVisibility: string;
  oldEnemyOpacity: string;
  oldEnemyVisibility: string;
  oldWeaponOpacity: string;
  oldWeaponVisibility: string;
  playerAirborne: string;
  playerShadowContent: string;
  playerShadowBackground: string;
  playerShadowOpacity: number;
  playerShadowTransform: string;
  playerRootFilter: string;
  enemyShadowContents: string[];
  enemyShadowBackgrounds: string[];
  enemyRootFilters: string[];
  playerFrame: number;
  playerSpriteState: string;
  playerBackground: string;
  enemyFrames: number[];
  enemySpriteStates: string[];
  enemyBackgrounds: string[];
  sceneWidth: number;
  sceneHeight: number;
  controlsHeight: number;
  controlsBottom: number;
  actorVisualTop: number;
};

type BrowserMonsterSpriteState = {
  enemies: Array<{
    id: string;
    kind: string;
    atlas: string;
    motion: string;
    skill: string;
    skillStage: string;
    spriteState: string;
    frame: number;
    background: string;
    oldArtOpacity: string;
  }>;
};

const readFrameSpriteStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const background = document.querySelector(".combat-background-art");
  const playerSprite = document.querySelector(".player-frame-sprite");
  const enemySprites = Array.from(document.querySelectorAll(".combat-enemy-trash .enemy-frame-sprite"));
  const playerArt = document.querySelector(".combat-player-art");
  const enemyArt = document.querySelector(".enemy-art");
  const weapon = document.querySelector(".combat-player .weapon-layer");
  const player = document.querySelector(".combat-player");
  const enemies = Array.from(document.querySelectorAll(".combat-enemy"));
  const playerShadow = player ? getComputedStyle(player, "::before") : null;
  const rect = scene?.getBoundingClientRect();
  const controlsRect = document.querySelector(".combat-actions")?.getBoundingClientRect();
  const actorVisualRects = [playerSprite, ...enemySprites]
    .filter((sprite) => sprite instanceof Element)
    .map((sprite) => sprite.getBoundingClientRect());
  return {
    stage: scene?.getAttribute("data-frame-sprite-stage") ?? "",
    backgroundReady: background instanceof HTMLImageElement && background.complete && background.naturalWidth > 0,
    oldPlayerOpacity: playerArt ? getComputedStyle(playerArt).opacity : "",
    oldPlayerVisibility: playerArt ? getComputedStyle(playerArt).visibility : "",
    oldEnemyOpacity: enemyArt ? getComputedStyle(enemyArt).opacity : "",
    oldEnemyVisibility: enemyArt ? getComputedStyle(enemyArt).visibility : "",
    oldWeaponOpacity: weapon ? getComputedStyle(weapon).opacity : "",
    oldWeaponVisibility: weapon ? getComputedStyle(weapon).visibility : "",
    playerAirborne: player?.getAttribute("data-player-airborne-active") ?? "",
    playerShadowContent: playerShadow?.content ?? "",
    playerShadowBackground: playerShadow?.backgroundImage ?? "",
    playerShadowOpacity: Number(playerShadow?.opacity ?? "0"),
    playerShadowTransform: playerShadow?.transform ?? "",
    playerRootFilter: player ? getComputedStyle(player).filter : "",
    enemyShadowContents: enemies.map((enemy) => getComputedStyle(enemy, "::before").content),
    enemyShadowBackgrounds: enemies.map((enemy) => getComputedStyle(enemy, "::before").backgroundImage),
    enemyRootFilters: enemies.map((enemy) => getComputedStyle(enemy).filter),
    playerFrame: Number(playerSprite?.getAttribute("data-sprite-frame") ?? "-1"),
    playerSpriteState: playerSprite?.getAttribute("data-sprite-state") ?? "",
    playerBackground: playerSprite ? getComputedStyle(playerSprite).backgroundImage : "",
    enemyFrames: enemySprites.map((sprite) => Number(sprite.getAttribute("data-sprite-frame") ?? "-1")),
    enemySpriteStates: enemySprites.map((sprite) => sprite.getAttribute("data-sprite-state") ?? ""),
    enemyBackgrounds: enemySprites.map((sprite) => getComputedStyle(sprite).backgroundImage),
    sceneWidth: Math.round(rect?.width ?? 0),
    sceneHeight: Math.round(rect?.height ?? 0),
    controlsHeight: Math.round(controlsRect?.height ?? 0),
    controlsBottom: Math.round((controlsRect?.bottom ?? 0) - (rect?.top ?? 0)),
    actorVisualTop: Math.round(Math.min(...actorVisualRects.map((actorRect) => actorRect.top - (rect?.top ?? 0))))
  };
})()
`;

const readMonsterSpriteStateExpression = `
(() => ({
  enemies: Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => {
    const sprite = enemy.querySelector(".enemy-frame-sprite");
    const oldArt = enemy.querySelector(".enemy-art");
    return {
      id: enemy.getAttribute("data-enemy-id") ?? "",
      kind: enemy.getAttribute("data-enemy-kind") ?? "",
      atlas: sprite?.getAttribute("data-frame-atlas") ?? "",
      motion: enemy.getAttribute("data-enemy-motion") ?? "",
      skill: sprite?.getAttribute("data-sprite-skill") ?? "",
      skillStage: sprite?.getAttribute("data-sprite-skill-phase") ?? "",
      spriteState: sprite?.getAttribute("data-sprite-state") ?? "",
      frame: Number(sprite?.getAttribute("data-sprite-frame") ?? "-1"),
      background: sprite ? getComputedStyle(sprite).backgroundImage : "",
      oldArtOpacity: oldArt ? getComputedStyle(oldArt).opacity : ""
    };
  })
}))()
`;

const readCombatStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const player = document.querySelector(".combat-player");
  const playerStyle = player?.getAttribute("style") ?? "";
  const actorX = /--actor-x:\\s*([0-9.]+)%/.exec(playerStyle)?.[1] ?? "0";
  const impact = document.querySelector("[data-impact-spark='true']");

  return {
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    playerX: Number(actorX),
    playerMotion: player?.getAttribute("data-player-motion") ?? "",
    normalAttackMove: player?.getAttribute("data-player-normal-attack-move") ?? "",
    hitstopActive: scene?.getAttribute("data-hitstop-active") ?? "",
    screenShake: scene?.getAttribute("data-screen-shake") ?? "",
    impactCue: impact?.getAttribute("data-vfx-cue") ?? ""
  };
})()
`;

const readRoomFlowStateExpression = `
(() => {
  const shell = document.querySelector(".app-shell");
  const scene = document.querySelector(".combat-scene");
  const gate = document.querySelector("[data-room-gate='true']");
  const player = document.querySelector(".combat-player");
  const floorLoot = document.querySelector("[data-floor-loot='true']");
  const enemies = Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => ({
    id: enemy.getAttribute("data-enemy-id") ?? "",
    kind: enemy.getAttribute("data-enemy-kind") ?? "",
    hp: Number(enemy.getAttribute("data-enemy-hp-current") || "0"),
    x: Number(enemy.getAttribute("data-enemy-x") || "0"),
    y: Number(enemy.getAttribute("data-enemy-y") || "0")
  }));
  const rawSave = localStorage.getItem(${JSON.stringify(SAVE_KEY)});
  const saved = rawSave ? JSON.parse(rawSave) : null;

  return {
    appMode: shell?.getAttribute("data-app-mode") ?? "",
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    dungeonId: scene?.getAttribute("data-dungeon-id") ?? "",
    difficultyId: scene?.getAttribute("data-combat-difficulty") ?? "",
    roomIndex: scene?.getAttribute("data-room-index") ?? "",
    roomCount: scene?.getAttribute("data-room-count") ?? "",
    liveEnemyCount: scene?.getAttribute("data-live-enemy-count") ?? "",
    defeatedEnemyCount: scene?.getAttribute("data-defeated-enemy-count") ?? "",
    combatElapsedMs: scene?.getAttribute("data-combat-elapsed-ms") ?? "",
    playerX: scene?.getAttribute("data-player-x") ?? "",
    playerY: scene?.getAttribute("data-player-y") ?? "",
    playerRecoveryAvailable: player?.getAttribute("data-player-recovery-available") ?? "false",
    playerHurtLockActive: player?.getAttribute("data-player-hurt-lock-active") ?? "false",
    gateState: gate?.getAttribute("data-room-gate-state") ?? "",
    gateTransition: gate?.getAttribute("data-room-gate-transition") ?? "",
    gateTargetRoom: gate?.getAttribute("data-room-gate-target-room") ?? "",
    gateEnterReady: scene?.getAttribute("data-gate-enter-ready") ?? "",
    transitionState: scene?.getAttribute("data-room-transition-state") ?? "",
    transitionFromRoom: scene?.getAttribute("data-room-transition-from-room") ?? "",
    transitionTargetRoom: scene?.getAttribute("data-room-transition-target-room") ?? "",
    combatEventCount: Number(scene?.getAttribute("data-combat-event-count") ?? "-1"),
    combatLootEventCount: Number(scene?.getAttribute("data-combat-loot-event-count") ?? "-1"),
    floorLootCount: Number(scene?.getAttribute("data-floor-loot-count") ?? "-1"),
    floorLootId: floorLoot?.getAttribute("data-floor-loot-id") ?? "",
    floorLootGearId: floorLoot?.getAttribute("data-floor-loot-gear-id") ?? "",
    floorLootRarity: floorLoot?.getAttribute("data-floor-loot-rarity") ?? "",
    floorLootX: Number(floorLoot?.getAttribute("data-floor-loot-x") ?? "-1"),
    floorLootY: Number(floorLoot?.getAttribute("data-floor-loot-y") ?? "-1"),
    floorLootCollectible: floorLoot?.getAttribute("data-floor-loot-collectible") ?? "false",
    resultVisible: Boolean(document.querySelector("[data-dungeon-result='true']")),
    savedFatigue: Number(saved?.player?.fatigue?.current ?? -1),
    savedGold: Number(saved?.player?.currencies?.gold ?? -1),
    savedIronDust: Number(saved?.player?.currencies?.ironDust ?? -1),
    savedGearIds: Array.isArray(saved?.player?.inventory) ? saved.player.inventory.map((item) => item.catalogGearId) : [],
    enemies
  };
})()
`;

const installEnemyDeathRecorderExpression = `
(() => {
  globalThis.__enemyDeathEvidence = { phases: [], frames: [] };
  const addUnique = (items, value) => {
    if (value !== "" && !items.includes(value)) {
      items.push(value);
    }
  };
  const tick = () => {
    const evidence = globalThis.__enemyDeathEvidence;
    for (const enemy of document.querySelectorAll('.combat-enemy[data-enemy-state="defeated"]')) {
      addUnique(evidence.phases, enemy.getAttribute("data-enemy-death-phase") ?? "");
      const frame = Number(enemy.querySelector(".enemy-frame-sprite")?.getAttribute("data-sprite-frame") ?? "-1");
      if (frame >= 0) {
        addUnique(evidence.frames, frame);
      }
    }
    globalThis.__enemyDeathRecorder = requestAnimationFrame(tick);
  };
  if (globalThis.__enemyDeathRecorder) {
    cancelAnimationFrame(globalThis.__enemyDeathRecorder);
  }
  globalThis.__enemyDeathRecorder = requestAnimationFrame(tick);
  return true;
})()
`;

const readEnemyDeathEvidenceExpression = `
(() => globalThis.__enemyDeathEvidence ?? { phases: [], frames: [] })()
`;

const readStrictCombatStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const player = document.querySelector(".combat-player");
  const skillVfx = document.querySelector("[data-player-skill-vfx]");
  const impact = document.querySelector("[data-impact-spark='true']");
  const enemyVfx = document.querySelector("[data-enemy-skill-vfx]");
  const enemies = Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => {
    const art = enemy.querySelector(".enemy-art");
    return {
      id: enemy.getAttribute("data-enemy-id") ?? "",
      kind: enemy.getAttribute("data-enemy-kind") ?? "",
      stage: enemy.getAttribute("data-enemy-attack-stage") ?? "",
      skill: enemy.getAttribute("data-enemy-attack-skill-id") ?? "",
      armorState: enemy.getAttribute("data-armor-state") ?? "",
      progress: Number(enemy.getAttribute("data-enemy-attack-progress") ?? "0"),
      animationName: art ? getComputedStyle(art).animationName : ""
    };
  });
  return {
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    roomIndex: scene?.getAttribute("data-room-index") ?? "",
  bossPhase: scene?.getAttribute("data-boss-phase") ?? "",
  bossPhaseTriggered: scene?.getAttribute("data-boss-phase-triggered") ?? "",
  bossPhaseVfx: document.querySelector("[data-boss-phase-vfx]")?.getAttribute("data-boss-phase-vfx") ?? "",
    arenaHazardCount: scene?.getAttribute("data-arena-hazard-count") ?? "",
    activeSkill: player?.getAttribute("data-active-skill-id") ?? "",
    playerMotion: player?.getAttribute("data-player-motion") ?? "",
    playerAirborne: player?.getAttribute("data-player-airborne-active") ?? "false",
    skillMove: player?.getAttribute("data-player-skill-move") ?? "",
    skillStage: player?.getAttribute("data-player-skill-stage") ?? "",
    skillVfx: skillVfx?.getAttribute("data-player-skill-vfx") ?? "",
    skillVfxCue: skillVfx?.getAttribute("data-vfx-cue") ?? "",
    skillVfxCoreAnimation: skillVfx ? getComputedStyle(skillVfx.querySelector(".skill-core")).animationName : "",
    hitstopActive: scene?.getAttribute("data-hitstop-active") ?? "",
    impactCue: impact?.getAttribute("data-vfx-cue") ?? "",
    enemies,
    enemyVfx: enemyVfx?.getAttribute("data-enemy-skill-vfx") ?? "",
    enemyVfxCue: enemyVfx?.getAttribute("data-enemy-vfx-cue") ?? ""
  };
})()
`;

const readBossHudStateExpression = `
(() => {
  const hud = document.querySelector("[data-boss-combat-hud='true']");
  const status = document.querySelector(".combat-status");
  const combo = document.querySelector(".combo-meter");
  const overlaps = (left, right) => {
    if (!left || !right) return false;
    const a = left.getBoundingClientRect();
    const b = right.getBoundingClientRect();
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  };
  const rect = hud?.getBoundingClientRect();
  return {
    visible: Boolean(hud && rect && rect.width > 0 && rect.height > 0),
    name: hud?.getAttribute("data-boss-name") ?? "",
    phase: hud?.getAttribute("data-boss-phase") ?? "",
    hpCurrent: Number(hud?.getAttribute("data-boss-hp-current") ?? "0"),
    hpMax: Number(hud?.getAttribute("data-boss-hp-max") ?? "0"),
    hpPercent: Number(hud?.getAttribute("data-boss-hp-percent") ?? "0"),
    armorCurrent: Number(hud?.getAttribute("data-boss-armor-current") ?? "0"),
    armorMax: Number(hud?.getAttribute("data-boss-armor-max") ?? "0"),
    armorState: hud?.getAttribute("data-boss-armor-state") ?? "",
    breakRemainingMs: Number(hud?.getAttribute("data-boss-break-remaining-ms") ?? "0"),
    castSkillId: hud?.getAttribute("data-boss-cast-skill-id") ?? "",
    castStage: hud?.getAttribute("data-boss-cast-stage") ?? "",
    castProgress: Number(hud?.getAttribute("data-boss-cast-progress") ?? "0"),
    width: rect?.width ?? 0,
    overlapsStatus: overlaps(hud, status),
    overlapsCombo: overlaps(hud, combo)
  };
})()
`;

const readLiuliEnemyStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const enemyVfx = document.querySelector("[data-enemy-skill-vfx]");
  const enemies = Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => {
    const art = enemy.querySelector(".enemy-art");
    return {
      skill: enemy.getAttribute("data-enemy-attack-skill-id") ?? "",
      stage: enemy.getAttribute("data-enemy-attack-stage") ?? "",
      animationName: art ? getComputedStyle(art).animationName : ""
    };
  });
  return {
    dungeonId: scene?.getAttribute("data-dungeon-id") ?? "",
    roomIndex: scene?.getAttribute("data-room-index") ?? "",
    enemies,
    enemyVfx: enemyVfx?.getAttribute("data-enemy-skill-vfx") ?? "",
    enemyVfxCue: enemyVfx?.getAttribute("data-enemy-vfx-cue") ?? ""
  };
})()
`;

const readReactionStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const player = document.querySelector(".combat-player");
  const hazards = Array.from(document.querySelectorAll("[data-arena-hazard]")).map((hazard) => ({
    phase: hazard.getAttribute("data-hazard-phase") ?? "",
    skillId: hazard.getAttribute("data-arena-hazard") ?? ""
  }));
  const feedback = document.querySelector("[data-combat-feedback^='arena-hazard-']");
  return {
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    roomIndex: scene?.getAttribute("data-room-index") ?? "",
    bossPhase: scene?.getAttribute("data-boss-phase") ?? "",
    playerY: Number(scene?.getAttribute("data-player-y") ?? "0"),
    playerMotion: player?.getAttribute("data-player-motion") ?? "",
    playerHurtCue: player?.getAttribute("data-player-hurt-feedback-cue") ?? "",
    playerHurtLockActive: player?.getAttribute("data-player-hurt-lock-active") ?? "",
    playerRecoveryState: player?.getAttribute("data-player-recovery-state") ?? "",
    playerQuickRecoverActive: player?.getAttribute("data-player-quick-recover-active") ?? "",
    playerInvulnerableActive: player?.getAttribute("data-player-invulnerable-active") ?? "",
    recoveryVfx: document.querySelector("[data-player-recovery-vfx]")?.getAttribute("data-player-recovery-vfx") ?? "",
    hazards,
    hazardFeedback: feedback?.getAttribute("data-combat-feedback") ?? "",
    hazardFeedbackCue: feedback?.getAttribute("data-player-feedback-cue") ?? ""
  };
})()
`;

const installStrictCombatRecorderExpression = `
(() => {
  globalThis.__strictCombatEvidence = {
    roomsSeen: [],
    enemyKindsSeen: [],
    sawPlayerSkillVfx: false,
    sawSkillMotion: false,
    sawHitstop: false,
    sawImpactCue: false,
    sawEnemyAttackMotion: false,
    sawEnemySkillVfx: false,
    sawBossPhase: false,
    sawBossPhaseThree: false,
    sawBossPhaseThreeVfx: false,
    sawWorldDevourVfx: false,
    sawWorldDevourArmorBreak: false,
    sawArenaHazard: false,
    sawBossSkillVfx: false
  };
  const addUnique = (items, value) => {
    if (value && !items.includes(value)) {
      items.push(value);
    }
  };
  const tick = () => {
    const evidence = globalThis.__strictCombatEvidence;
    const state = ${readStrictCombatStateExpression.trim()};

    if (state.objective) {
      addUnique(evidence.roomsSeen, state.roomIndex);
    }
    for (const enemy of state.enemies) {
      addUnique(evidence.enemyKindsSeen, enemy.kind);
    }

    if (
      state.skillVfx &&
      state.skillVfxCoreAnimation &&
      state.skillVfxCoreAnimation !== "none"
    ) {
      evidence.sawPlayerSkillVfx = true;
    }
    if (
      state.activeSkill &&
      state.playerMotion === "skill" &&
      state.skillMove &&
      ["windup", "active", "recovery"].includes(state.skillStage)
    ) {
      evidence.sawSkillMotion = true;
    }
    if (state.hitstopActive === "true") {
      evidence.sawHitstop = true;
    }
    if (state.impactCue) {
      evidence.sawImpactCue = true;
    }
    if (
      state.enemies.some(
        (enemy) =>
          enemy.stage === "windup" &&
          enemy.skill &&
          enemy.animationName &&
          enemy.animationName !== "none" &&
          enemy.animationName !== "monster-idle-breathe"
      )
    ) {
      evidence.sawEnemyAttackMotion = true;
    }
    if (state.enemyVfx && state.enemyVfxCue) {
      evidence.sawEnemySkillVfx = true;
    }
    if (state.bossPhase === "2" || state.bossPhaseTriggered === "true") {
      evidence.sawBossPhase = true;
    }
    if (state.bossPhase === "3") {
      evidence.sawBossPhaseThree = true;
    }
    if (state.bossPhaseVfx === "taotie-armor-pulse") {
      evidence.sawBossPhaseThreeVfx = true;
    }
    if (
      Array.from(document.querySelectorAll("[data-enemy-skill-vfx]")).some(
        (vfx) =>
          vfx.getAttribute("data-enemy-skill-vfx") === "taotie-world-devour" &&
          vfx.getAttribute("data-enemy-vfx-cue") === "taotie-world-devour-impact"
      )
    ) {
      evidence.sawWorldDevourVfx = true;
    }
    if (state.enemies.some((enemy) => enemy.armorState === "broken")) {
      evidence.sawWorldDevourArmorBreak = true;
    }
    if (Number(state.arenaHazardCount || "0") > 0) {
      evidence.sawArenaHazard = true;
    }
    if (state.roomIndex === "2" && state.enemyVfx && state.enemyVfx.startsWith("taotie-")) {
      evidence.sawBossSkillVfx = true;
    }

    globalThis.__strictCombatRecorder = requestAnimationFrame(tick);
  };
  if (globalThis.__strictCombatRecorder) {
    cancelAnimationFrame(globalThis.__strictCombatRecorder);
  }
  globalThis.__strictCombatRecorder = requestAnimationFrame(tick);
  return true;
})()
`;

const readStrictCombatEvidenceExpression = `
(() => globalThis.__strictCombatEvidence ?? {
  roomsSeen: [],
  enemyKindsSeen: [],
  sawPlayerSkillVfx: false,
  sawSkillMotion: false,
  sawHitstop: false,
  sawImpactCue: false,
  sawEnemyAttackMotion: false,
  sawEnemySkillVfx: false,
  sawBossPhase: false,
  sawBossPhaseThree: false,
  sawBossPhaseThreeVfx: false,
  sawWorldDevourVfx: false,
  sawWorldDevourArmorBreak: false,
  sawArenaHazard: false,
  sawBossSkillVfx: false
})()
`;

const readAppModeStateExpression = `
(() => {
  const shell = document.querySelector(".app-shell");
  const town = document.querySelector(".town-scene");
  return {
    appMode: shell?.getAttribute("data-app-mode") ?? "",
    townScene: town?.getAttribute("data-town-scene") ?? ""
  };
})()
`;

const readDungeonResultStateExpression = `
(() => {
  const shell = document.querySelector(".app-shell");
  const result = document.querySelector("[data-dungeon-result='true']");
  const rawSave = localStorage.getItem(${JSON.stringify(SAVE_KEY)});
  const saved = rawSave ? JSON.parse(rawSave) : null;

  return {
    appMode: shell?.getAttribute("data-app-mode") ?? "",
    dungeonId: result?.getAttribute("data-result-dungeon-id") ?? "",
    difficultyId: result?.getAttribute("data-result-difficulty-id") ?? "",
    rank: result?.getAttribute("data-result-rank") ?? "",
    score: Number(result?.getAttribute("data-result-score") ?? "0"),
    maxCombo: Number(result?.getAttribute("data-result-max-combo") ?? "0"),
    accuracy: Number(result?.getAttribute("data-result-accuracy") ?? "0"),
    criticalHits: Number(result?.getAttribute("data-result-critical-hits") ?? "0"),
    hitsTaken: Number(result?.getAttribute("data-result-hits-taken") ?? "0"),
    clearTimeMs: Number(result?.getAttribute("data-result-clear-time-ms") ?? "0"),
    gearId: result?.getAttribute("data-result-gear-id") ?? "",
    rankBonusGold: Number(result?.getAttribute("data-result-rank-bonus-gold") ?? "0"),
    rankBonusIronDust: Number(result?.getAttribute("data-result-rank-bonus-iron-dust") ?? "0"),
    playerGold: Number(shell?.getAttribute("data-player-gold") ?? "0"),
    playerIronDust: Number(shell?.getAttribute("data-player-iron-dust") ?? "0"),
    savedGold: Number(saved?.player?.currencies?.gold ?? -1),
    savedIronDust: Number(saved?.player?.currencies?.ironDust ?? -1),
    saveExists: Boolean(rawSave),
    confirmButton: Boolean(document.querySelector("[data-confirm-dungeon-result='true']")),
    topNav: Boolean(document.querySelector(".top-nav")),
    rechallengeAvailable: result?.getAttribute("data-rechallenge-available") === "true",
    fatigueCurrent: Number(result?.getAttribute("data-result-fatigue-current") ?? "-1"),
    fatigueCost: Number(result?.getAttribute("data-result-fatigue-cost") ?? "-1"),
    fatigueAfterRetry: Number(result?.getAttribute("data-result-fatigue-after-retry") ?? "-1")
  };
})()
`;

const readDungeonDifficultyStateExpression = `
(() => {
  const shell = document.querySelector(".app-shell");
  const prep = document.querySelector("[data-dungeon-prep='true']");
  const selected = document.querySelector("[data-dungeon-difficulty][data-difficulty-selected='true']");
  const combat = document.querySelector(".combat-scene");
  const firstTrash = document.querySelector(".combat-enemy[data-enemy-kind='trash']");
  const rawSave = localStorage.getItem(${JSON.stringify(SAVE_KEY)});
  const saved = rawSave ? JSON.parse(rawSave) : null;

  return {
    appMode: shell?.getAttribute("data-app-mode") ?? "",
    prepDungeonId: prep?.getAttribute("data-dungeon-prep-id") ?? "",
    selectedDifficulty: selected?.getAttribute("data-dungeon-difficulty") ?? "",
    fatigueCost: Number(selected?.getAttribute("data-fatigue-cost") ?? "0"),
    combatDifficulty: combat?.getAttribute("data-combat-difficulty") ?? "",
    firstTrashHpMax: Number(firstTrash?.getAttribute("data-enemy-hp-max") ?? "0"),
    combatScene: Boolean(combat),
    savedFatigue: Number(saved?.player?.fatigue?.current ?? -1),
    savedPreference: saved?.player?.dungeonDifficultyPreferences?.["cinder-kiln-alley"] ?? "",
    enterKeydownCount: Number(globalThis.__browserEnterKeydownEvidence?.count ?? 0),
    lastEnterKeydownAt: Number(globalThis.__browserEnterKeydownEvidence?.lastAt ?? 0)
  };
})()
`;

const readTownEcosystemStateExpression = `
(() => {
  const shell = document.querySelector(".app-shell");
  const rawSave = localStorage.getItem(${JSON.stringify(SAVE_KEY)});
  return {
    appMode: shell?.getAttribute("data-app-mode") ?? "",
    toast: document.querySelector(".toast")?.textContent ?? "",
    inventoryCount: Number(shell?.getAttribute("data-inventory-count") || "0"),
    saved: rawSave ? JSON.parse(rawSave) : null
  };
})()
`;

const readAudioSettingsStateExpression = `
(() => {
  const shell = document.querySelector(".app-shell");
  const rawSettings = localStorage.getItem(${JSON.stringify(AUDIO_SETTINGS_KEY)});
  return {
    appMode: shell?.getAttribute("data-app-mode") ?? "",
    master: Number(shell?.getAttribute("data-audio-master") || "0"),
    music: Number(shell?.getAttribute("data-audio-music") || "0"),
    sfx: Number(shell?.getAttribute("data-audio-sfx") || "0"),
    saved: rawSettings ? JSON.parse(rawSettings) : null
  };
})()
`;

const readStoryDialogueStateExpression = `
(() => {
  const shell = document.querySelector(".app-shell");
  const dialogue = document.querySelector("[data-story-dialogue='true']");
  const portrait = document.querySelector(".story-npc-portrait");
  const box = document.querySelector(".story-dialogue-box");
  const rawSave = localStorage.getItem(${JSON.stringify(SAVE_KEY)});
  return {
    appMode: shell?.getAttribute("data-app-mode") ?? "",
    questId: dialogue?.getAttribute("data-story-quest-id") ?? "",
    phase: dialogue?.getAttribute("data-story-phase") ?? "",
    step: Number(dialogue?.getAttribute("data-story-step") ?? "-1"),
    stepCount: Number(dialogue?.getAttribute("data-story-step-count") ?? "0"),
    npcId: dialogue?.getAttribute("data-story-npc-id") ?? "",
    dialogueText: document.querySelector(".story-dialogue-line")?.textContent ?? "",
    topNavVisible: Boolean(document.querySelector(".top-nav")),
    portraitBackground: portrait ? getComputedStyle(portrait).backgroundImage : "none",
    portraitAnimation: portrait ? getComputedStyle(portrait).animationName : "none",
    dialogueAnimation: box ? getComputedStyle(box).animationName : "none",
    saved: rawSave ? JSON.parse(rawSave) : null
  };
})()
`;

const readConsumableStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const hotbar = document.querySelector("[data-consumable-hotbar='true']");
  const status = document.querySelector("[data-player-status-vfx]");
  const core = status?.querySelector(".skill-impact-core");
  const rawSave = localStorage.getItem(${JSON.stringify(SAVE_KEY)});
  const saved = rawSave ? JSON.parse(rawSave) : null;
  return {
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    hp: Number(scene?.getAttribute("data-player-hp") || "0"),
    maxHp: Number(scene?.getAttribute("data-player-max-hp") || "0"),
    healingPotionCount: Number(hotbar?.getAttribute("data-healing-potion-count") || "0"),
    revivalTokenCount: Number(hotbar?.getAttribute("data-revival-token-count") || "0"),
    savedHealingPotionCount: Number(saved?.player?.consumables?.["healing-potion"] || "0"),
    statusVfx: status?.getAttribute("data-player-status-vfx") ?? "",
    statusVfxCue: status?.getAttribute("data-vfx-cue") ?? "",
    statusCoreAnimation: core ? getComputedStyle(core).animationName : "none"
  };
})()
`;

const readDefeatStateExpression = `
(() => {
  const shell = document.querySelector(".app-shell");
  const scene = document.querySelector(".combat-scene");
  const player = document.querySelector(".combat-player");
  const overlay = document.querySelector("[data-defeat-overlay='true']");
  const reviveButton = document.querySelector("[data-defeat-revive='true']");
  const rawSave = localStorage.getItem(${JSON.stringify(SAVE_KEY)});
  const saved = rawSave ? JSON.parse(rawSave) : null;
  return {
    appMode: shell?.getAttribute("data-app-mode") ?? "",
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    roomIndex: scene?.getAttribute("data-room-index") ?? "",
    playerHp: Number(scene?.getAttribute("data-player-hp") || "0"),
    playerMaxHp: Number(scene?.getAttribute("data-player-max-hp") || "0"),
    playerInvulnerable: player?.getAttribute("data-player-invulnerable-active") ?? "false",
    overlayVisible: Boolean(overlay),
    reviveAvailable: overlay?.getAttribute("data-defeat-revive-available") ?? "",
    revivalTokenCount: Number(overlay?.getAttribute("data-defeat-revival-token-count") || "0"),
    reviveButtonVisible: Boolean(reviveButton),
    reviveButtonDisabled: reviveButton instanceof HTMLButtonElement ? reviveButton.disabled : true,
    returnButtonVisible: Boolean(document.querySelector("[data-defeat-return-town='true']")),
    liveEnemyCount: Number(scene?.getAttribute("data-live-enemy-count") || "0"),
    combatEventCount: Number(scene?.getAttribute("data-combat-event-count") || "0"),
    savedRevivalTokenCount: Number(saved?.player?.consumables?.["revival-token"] || "0"),
    enemyHp: Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) =>
      Number(enemy.getAttribute("data-enemy-hp-current") || "0")
    )
  };
})()
`;

const readIronVanguardStateExpression = `
(() => {
  const shell = document.querySelector(".app-shell");
  const scene = document.querySelector(".combat-scene");
  const player = document.querySelector(".combat-player");
  const skillVfx = document.querySelector("[data-player-skill-vfx]");
  const statusVfx = document.querySelector("[data-player-status-vfx]");
  const enemyVfx = document.querySelector("[data-enemy-skill-vfx]");
  return {
    appMode: shell?.getAttribute("data-app-mode") ?? "",
    classId: scene?.getAttribute("data-class-id") ?? "",
    advancementId: scene?.getAttribute("data-advancement-id") ?? "",
    activeSkill: player?.getAttribute("data-active-skill-id") ?? "",
    playerMotion: player?.getAttribute("data-player-motion") ?? "",
    skillMove: player?.getAttribute("data-player-skill-move") ?? "",
    skillStage: player?.getAttribute("data-player-skill-stage") ?? "",
    shieldActive: player?.getAttribute("data-shield-active") ?? "",
    skillVfx: skillVfx?.getAttribute("data-player-skill-vfx") ?? "",
    skillVfxCue: skillVfx?.getAttribute("data-vfx-cue") ?? "",
    statusVfx: statusVfx?.getAttribute("data-player-status-vfx") ?? "",
    statusVfxCue: statusVfx?.getAttribute("data-vfx-cue") ?? "",
    enemyVfx: enemyVfx?.getAttribute("data-enemy-skill-vfx") ?? "",
    enemyVfxCue: enemyVfx?.getAttribute("data-enemy-vfx-cue") ?? ""
  };
})()
`;

const readInkMarkStateExpression = `
(() => {
  const shell = document.querySelector(".app-shell");
  const scene = document.querySelector(".combat-scene");
  const player = document.querySelector(".combat-player");
  const skillVfx = document.querySelector("[data-player-skill-vfx]");
  const detonation = document.querySelector('[data-skill-impact-vfx="night-mark-detonation"][data-hit-phase="detonate"]');
  return {
    appMode: shell?.getAttribute("data-app-mode") ?? "",
    classId: scene?.getAttribute("data-class-id") ?? "",
    advancementId: scene?.getAttribute("data-advancement-id") ?? "",
    resourceCurrent: Number(scene?.getAttribute("data-resource-current") || "0"),
    activeSkill: player?.getAttribute("data-active-skill-id") ?? "",
    playerMotion: player?.getAttribute("data-player-motion") ?? "",
    skillVfx: skillVfx?.getAttribute("data-player-skill-vfx") ?? "",
    detonationImpact: detonation?.getAttribute("data-skill-impact-vfx") ?? "",
    detonationCue: detonation?.getAttribute("data-vfx-cue") ?? "",
    marks: Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => Number(enemy.getAttribute("data-ink-marks") || "0"))
  };
})()
`;

const readSavedStateExpression = `
(() => {
  const shell = document.querySelector(".app-shell");
  const rawSave = localStorage.getItem(${JSON.stringify(SAVE_KEY)});
  const parsed = rawSave ? JSON.parse(rawSave) : null;
  return {
    appMode: shell?.getAttribute("data-app-mode") ?? "",
    saveKey: shell?.getAttribute("data-save-key") ?? "",
    playerGold: Number(shell?.getAttribute("data-player-gold") || "0"),
    playerIronDust: Number(shell?.getAttribute("data-player-iron-dust") || "0"),
    playerArcShard: Number(shell?.getAttribute("data-player-arc-shard") || "0"),
    inventoryCount: Number(shell?.getAttribute("data-inventory-count") || "0"),
    rawSaveExists: Boolean(rawSave),
    savedGold: Number(parsed?.player?.currencies?.gold ?? 0),
    savedIronDust: Number(parsed?.player?.currencies?.ironDust ?? 0),
    savedArcShard: Number(parsed?.player?.currencies?.arcShard ?? 0),
    savedInventoryCount: Number(parsed?.player?.inventory?.length ?? 0)
  };
})()
`;

const readLootResultStateExpression = `
(() => {
  const shell = document.querySelector(".app-shell");
  const combat = document.querySelector(".combat-scene");
  const loot = document.querySelector("[data-loot-result='true']");
  const rawSave = localStorage.getItem(${JSON.stringify(SAVE_KEY)});
  const saved = rawSave ? JSON.parse(rawSave) : null;
  return {
    appMode: shell?.getAttribute("data-app-mode") ?? "",
    combatDifficulty: combat?.getAttribute("data-combat-difficulty") ?? "",
    gearId: loot?.getAttribute("data-loot-gear-id") ?? "",
    rarity: loot?.getAttribute("data-loot-rarity") ?? "",
    setId: loot?.getAttribute("data-loot-set-id") ?? "",
    slot: loot?.getAttribute("data-loot-slot") ?? "",
    roomIndex: loot?.getAttribute("data-loot-room-index") ?? "",
    gold: Number(loot?.getAttribute("data-loot-gold") ?? "0"),
    savedGearIds: Array.isArray(saved?.player?.inventory)
      ? saved.player.inventory.map((item) => String(item?.catalogGearId ?? ""))
      : []
  };
})()
`;

const readSkillStateExpression = `
(() => {
  const player = document.querySelector(".combat-player");
  const art = document.querySelector(".combat-player-art");
  const weapon = document.querySelector(".combat-weapon");
  const skillVfx = document.querySelector('[data-player-skill-vfx="spark-combo"]');
  return {
    activeSkill: player?.getAttribute("data-active-skill-id") ?? "",
    playerMotion: player?.getAttribute("data-player-motion") ?? "",
    skillMove: player?.getAttribute("data-player-skill-move") ?? "",
    skillMoveProgress: Number(player?.getAttribute("data-player-skill-move-progress") || "0"),
    skillStage: player?.getAttribute("data-player-skill-stage") ?? "",
    hitPhase: player?.getAttribute("data-player-skill-hit-phase") ?? "",
    vfxCue: player?.getAttribute("data-player-skill-vfx-cue") ?? "",
    playerHurtLockActive: player?.getAttribute("data-player-hurt-lock-active") ?? "",
    playerHurtCue: player?.getAttribute("data-player-hurt-feedback-cue") ?? "",
    playerAnimation: art ? getComputedStyle(art).animationName : "",
    weaponAnimation: weapon ? getComputedStyle(weapon).animationName : "",
    skillVfx: skillVfx?.getAttribute("data-player-skill-vfx") ?? "",
    skillVfxHitPhase: skillVfx?.getAttribute("data-hit-phase") ?? "",
    skillVfxCue: skillVfx?.getAttribute("data-vfx-cue") ?? "",
    skillVfxCoreAnimation: skillVfx ? getComputedStyle(skillVfx.querySelector(".skill-core")).animationName : "",
    skillVfxWaveAnimation: skillVfx ? getComputedStyle(skillVfx.querySelector(".skill-wave")).animationName : "",
    skillVfxSparksAnimation: skillVfx ? getComputedStyle(skillVfx.querySelector(".skill-sparks")).animationName : ""
  };
})()
`;

const sparkComboPhases = [
  {
    phase: "spark-jab",
    cue: "ember-spark-jab",
    playerAnimation: "player-ember-spark-jab",
    weaponAnimation: "weapon-spark-jab",
    coreAnimation: "ember-spark-jab-vfx-core",
    waveAnimation: "ember-spark-jab-vfx-ring",
    sparksAnimation: "ember-spark-jab-vfx-sparks"
  },
  {
    phase: "spark-cross",
    cue: "ember-spark-cross",
    playerAnimation: "player-ember-spark-cross",
    weaponAnimation: "weapon-spark-cross",
    coreAnimation: "ember-spark-cross-vfx-core",
    waveAnimation: "ember-spark-cross-vfx-ring",
    sparksAnimation: "ember-spark-cross-vfx-sparks"
  },
  {
    phase: "spark-finish",
    cue: "ember-spark-finish",
    playerAnimation: "player-ember-spark-finish",
    weaponAnimation: "weapon-spark-finish",
    coreAnimation: "ember-spark-finish-vfx-core",
    waveAnimation: "ember-spark-finish-vfx-ring",
    sparksAnimation: "ember-spark-finish-vfx-sparks"
  }
] as const;

const flowingLightPhases = [
  {
    phase: "chain-open",
    cue: "flowing-chain-open",
    playerAnimation: "player-flowing-chain-open",
    weaponAnimation: "weapon-flowing-chain-open",
    coreAnimation: "flowing-chain-open-core",
    waveAnimation: "flowing-chain-open-wave",
    sparksAnimation: "flowing-chain-open-sparks",
    minFrame: 0,
    maxFrame: 3,
    enemyFrame: 12,
    enemyReaction: "chain-open"
  },
  {
    phase: "chain-dance-left",
    cue: "flowing-chain-dance-left",
    playerAnimation: "player-flowing-chain-dance-left",
    weaponAnimation: "weapon-flowing-chain-dance-left",
    coreAnimation: "flowing-chain-dance-left-core",
    waveAnimation: "flowing-chain-dance-left-wave",
    sparksAnimation: "flowing-chain-dance-left-sparks",
    minFrame: 4,
    maxFrame: 7,
    enemyFrame: 12,
    enemyReaction: "chain-dance-left"
  },
  {
    phase: "chain-dance-right",
    cue: "flowing-chain-dance-right",
    playerAnimation: "player-flowing-chain-dance-right",
    weaponAnimation: "weapon-flowing-chain-dance-right",
    coreAnimation: "flowing-chain-dance-right-core",
    waveAnimation: "flowing-chain-dance-right-wave",
    sparksAnimation: "flowing-chain-dance-right-sparks",
    minFrame: 8,
    maxFrame: 11,
    enemyFrame: 13,
    enemyReaction: "chain-dance-right"
  },
  {
    phase: "chain-cross",
    cue: "flowing-chain-cross",
    playerAnimation: "player-flowing-chain-cross",
    weaponAnimation: "weapon-flowing-chain-cross",
    coreAnimation: "flowing-chain-cross-core",
    waveAnimation: "flowing-chain-cross-wave",
    sparksAnimation: "flowing-chain-cross-sparks",
    minFrame: 6,
    maxFrame: 11,
    enemyFrame: 13,
    enemyReaction: "chain-cross"
  },
  {
    phase: "chain-finish",
    cue: "flowing-chain-finish",
    playerAnimation: "player-flowing-chain-finish",
    weaponAnimation: "weapon-flowing-chain-finish",
    coreAnimation: "flowing-chain-finish-core",
    waveAnimation: "flowing-chain-finish-wave",
    sparksAnimation: "flowing-chain-finish-sparks",
    minFrame: 12,
    maxFrame: 14,
    enemyFrame: 14,
    enemyReaction: "chain-finish"
  }
] as const;

const readEnemyAttackStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const enemies = Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => {
    const art = enemy.querySelector(".enemy-art");
    const modelFrame = enemy.querySelector(".enemy-model-frame");
    const sprite = enemy.querySelector(".enemy-frame-sprite");
    return {
      id: enemy.getAttribute("data-enemy-id") ?? "",
      x: Number(enemy.getAttribute("data-enemy-x") ?? "0"),
      y: Number(enemy.getAttribute("data-enemy-y") ?? "0"),
      aiState: modelFrame?.getAttribute("data-enemy-ai-state") ?? "idle",
      motion: enemy.getAttribute("data-enemy-motion") ?? "",
      stage: enemy.getAttribute("data-enemy-attack-stage") ?? "",
      skill: enemy.getAttribute("data-enemy-attack-skill-id") ?? "",
      animationName: art ? getComputedStyle(art).animationName : "",
      spriteState: sprite?.getAttribute("data-sprite-state") ?? "",
      spriteFrame: Number(sprite?.getAttribute("data-sprite-frame") ?? "-1")
    };
  });
  const telegraph = document.querySelector("[data-enemy-telegraph]");
  const vfx = document.querySelector("[data-enemy-skill-vfx]");
  const player = document.querySelector(".combat-player");
  const playerArt = document.querySelector(".combat-player-art");
  return {
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    enemies,
    telegraph: telegraph?.getAttribute("data-enemy-telegraph") ?? "",
    telegraphShape: telegraph?.getAttribute("data-telegraph-shape") ?? "",
    vfx: vfx?.getAttribute("data-enemy-skill-vfx") ?? "",
    vfxPhase: vfx?.getAttribute("data-enemy-attack-phase") ?? "",
    vfxCue: vfx?.getAttribute("data-enemy-vfx-cue") ?? "",
    vfxRingAnimation: vfx ? getComputedStyle(vfx.querySelector(".enemy-cast-ring")).animationName : "",
    vfxCoreAnimation: vfx ? getComputedStyle(vfx.querySelector(".enemy-cast-core")).animationName : "",
    vfxTrailAnimation: vfx ? getComputedStyle(vfx.querySelector(".enemy-cast-trail")).animationName : "",
    playerHurtCue: player?.getAttribute("data-player-hurt-feedback-cue") ?? "",
    playerAnimation: playerArt ? getComputedStyle(playerArt).animationName : ""
  };
})()
`;

const installEnemyAudioRecorderExpression = `
(() => {
  globalThis.__enemyAudioPlayback = [];
  if (globalThis.__enemyAudioListener) {
    globalThis.removeEventListener("mydnf:audio-playback", globalThis.__enemyAudioListener);
  }
  globalThis.__enemyAudioListener = (event) => {
    const detail = event.detail ?? {};
    const commandId = String(detail.commandId ?? "");
    if (
      commandId.startsWith("enemy-windup-") ||
      commandId.startsWith("enemy-impact-") ||
      commandId.startsWith("player-hurt-") ||
      commandId === "evade-confirm" ||
      commandId === "guard-impact"
    ) {
      globalThis.__enemyAudioPlayback.push({
        commandId,
        channel: detail.channel ?? "",
        noteCount: Number(detail.noteCount ?? 0),
        textureTags: Array.isArray(detail.textureTags) ? detail.textureTags : []
      });
    }
  };
  globalThis.addEventListener("mydnf:audio-playback", globalThis.__enemyAudioListener);
  return true;
})()
`;

const readEnemyAudioPlaybackExpression = `
(() => globalThis.__enemyAudioPlayback ?? [])()
`;

const readCommandStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const player = document.querySelector(".combat-player");
  const skillVfx = document.querySelector("[data-player-skill-vfx]");
  return {
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    activeSkill: player?.getAttribute("data-active-skill-id") ?? "",
    skillReleaseSource: player?.getAttribute("data-skill-release-source") ?? "",
    commandReleaseSource: scene?.getAttribute("data-command-release-source") ?? "",
    commandMatchSkillId: scene?.getAttribute("data-command-match-skill-id") ?? "",
    commandReductionApplied: scene?.getAttribute("data-command-reduction-applied") ?? "",
    lastInputMethod: scene?.getAttribute("data-last-input-method") ?? "",
    playerMotion: player?.getAttribute("data-player-motion") ?? "",
    normalAttackMove: player?.getAttribute("data-player-normal-attack-move") ?? "",
    actionBufferState: scene?.getAttribute("data-action-buffer-state") ?? "",
    bufferedAction: scene?.getAttribute("data-buffered-action") ?? "",
    bufferedSkillId: scene?.getAttribute("data-buffered-skill-id") ?? "",
    skillVfx: skillVfx?.getAttribute("data-player-skill-vfx") ?? ""
  };
})()
`;

const readDoubleTapRunStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const player = document.querySelector(".combat-player");
  const sprite = document.querySelector(".player-frame-sprite");
  const impact = document.querySelector("[data-impact-spark='true']");
  return {
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    playerX: Number(scene?.getAttribute("data-player-x") ?? "0"),
    elapsedMs: Number(scene?.getAttribute("data-combat-elapsed-ms") ?? "0"),
    dashSource: scene?.getAttribute("data-movement-dash-source") ?? "",
    doubleTapActive: scene?.getAttribute("data-double-tap-dash-active") ?? "",
    doubleTapDirection: scene?.getAttribute("data-double-tap-dash-direction") ?? "",
    dashReadyUntilMs: Number(player?.getAttribute("data-player-dash-attack-ready-until-ms") ?? "0"),
    playerMotion: player?.getAttribute("data-player-motion") ?? "",
    normalAttackMove: player?.getAttribute("data-player-normal-attack-move") ?? "",
    spriteState: sprite?.getAttribute("data-sprite-state") ?? "",
    spriteDashSource: sprite?.getAttribute("data-sprite-dash-source") ?? "",
    spriteDustContent: sprite ? getComputedStyle(sprite, "::before").content : "",
    spriteDustAnimation: sprite ? getComputedStyle(sprite, "::before").animationName : "",
    impactCue: impact?.getAttribute("data-vfx-cue") ?? "",
    enemyHp: Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => Number(enemy.getAttribute("data-enemy-hp-current") ?? "0"))
  };
})()
`;

const installDoubleTapRunRecorderExpression = `
(() => {
  globalThis.__doubleTapRunEvidence = {
    sawDashLightMotion: false,
    sawDashLightImpact: false,
    lowestEnemyHp: Number.POSITIVE_INFINITY
  };
  const sample = () => {
    const player = document.querySelector(".combat-player");
    const impact = document.querySelector("[data-impact-spark='true']");
    const enemyHp = Array.from(document.querySelectorAll(".combat-enemy"))
      .map((enemy) => Number(enemy.getAttribute("data-enemy-hp-current") ?? "0"));
    const evidence = globalThis.__doubleTapRunEvidence;
    evidence.sawDashLightMotion ||=
      player?.getAttribute("data-player-motion") === "dash-light" &&
      player?.getAttribute("data-player-skill-move") === "dash-light";
    evidence.sawDashLightImpact ||= impact?.getAttribute("data-vfx-cue") === "dash-light-slash";
    evidence.lowestEnemyHp = Math.min(evidence.lowestEnemyHp, ...enemyHp);
  };
  const observer = new MutationObserver(sample);
  observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
  globalThis.__doubleTapRunObserver = observer;
  const startedAt = performance.now();
  const tick = () => {
    sample();
    if (performance.now() - startedAt < 5000) {
      globalThis.__doubleTapRunFrame = requestAnimationFrame(tick);
    }
  };
  globalThis.__doubleTapRunFrame = requestAnimationFrame(tick);
  return true;
})()
`;

const readDoubleTapRunEvidenceExpression = `
(() => globalThis.__doubleTapRunEvidence)()
`;

const readNormalComboStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const player = document.querySelector(".combat-player");
  const sprite = document.querySelector(".player-frame-sprite");
  const impact = document.querySelector("[data-impact-ground-light-step]");
  const comboArc = sprite ? getComputedStyle(sprite, "::after") : null;
  return {
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    normalAttackActive: player?.getAttribute("data-player-normal-attack-active") ?? "",
    playerHurtLockActive: player?.getAttribute("data-player-hurt-lock-active") ?? "",
    comboStep: Number(player?.getAttribute("data-player-normal-combo-step") ?? "0"),
    comboCount: Number(scene?.getAttribute("data-combo-count") ?? "0"),
    spriteComboStep: Number(sprite?.getAttribute("data-sprite-combo-step") ?? "0"),
    spriteComboPhase: sprite?.getAttribute("data-sprite-combo-phase") ?? "",
    spriteFrame: Number(sprite?.getAttribute("data-sprite-frame") ?? "-1"),
    impactStep: impact?.getAttribute("data-impact-ground-light-step") ?? "",
    enemyAirborne: Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => enemy.getAttribute("data-enemy-airborne") ?? ""),
    comboArcContent: comboArc?.content ?? "",
    comboArcBorderRightWidth: comboArc?.borderRightWidth ?? "",
    comboArcBoxShadow: comboArc?.boxShadow ?? ""
  };
})()
`;

const installNormalComboRecorderExpression = `
(() => {
  globalThis.__normalComboEvidence = {
    playerContactFrames: [],
    hitSteps: [],
    hitCues: [],
    enemyReactionFrames: [],
    maxComboCount: 0,
    sawFinisherAirborne: false,
    lowestEnemyHp: Number.POSITIVE_INFINITY
  };
  const addFrame = (items, step, frame) => {
    if (step > 0 && frame >= 0 && !items.some((item) => item.step === step)) items.push({ step, frame });
  };
  const addUnique = (items, value) => {
    if (value && !items.includes(value)) items.push(value);
  };
  const sample = () => {
    const scene = document.querySelector(".combat-scene");
    const playerSprite = document.querySelector(".player-frame-sprite");
    const evidence = globalThis.__normalComboEvidence;
    const playerStep = Number(playerSprite?.getAttribute("data-sprite-combo-step") ?? "0");
    const playerFrame = Number(playerSprite?.getAttribute("data-sprite-frame") ?? "-1");
    const playerPhase = playerSprite?.getAttribute("data-sprite-combo-phase") ?? "";
    if (playerPhase === "impact") addFrame(evidence.playerContactFrames, playerStep, playerFrame);
    for (const impact of document.querySelectorAll("[data-impact-ground-light-step]")) {
      addUnique(evidence.hitSteps, Number(impact.getAttribute("data-impact-ground-light-step") ?? "0"));
      addUnique(evidence.hitCues, impact.getAttribute("data-vfx-cue") ?? "");
    }
    for (const enemy of document.querySelectorAll(".combat-enemy")) {
      const sprite = enemy.querySelector(".enemy-frame-sprite");
      const reactionStep = Number(sprite?.getAttribute("data-sprite-reaction-step") ?? "0");
      const reactionFrame = Number(sprite?.getAttribute("data-sprite-frame") ?? "-1");
      addFrame(evidence.enemyReactionFrames, reactionStep, reactionFrame);
      evidence.sawFinisherAirborne ||= reactionStep === 3 && enemy.getAttribute("data-enemy-airborne") === "true";
      evidence.lowestEnemyHp = Math.min(evidence.lowestEnemyHp, Number(enemy.getAttribute("data-enemy-hp-current") ?? "0"));
    }
    evidence.maxComboCount = Math.max(evidence.maxComboCount, Number(scene?.getAttribute("data-combo-count") ?? "0"));
  };
  const observer = new MutationObserver(sample);
  observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
  globalThis.__normalComboObserver = observer;
  const startedAt = performance.now();
  const tick = () => {
    sample();
    if (performance.now() - startedAt < 6000) globalThis.__normalComboFrame = requestAnimationFrame(tick);
  };
  globalThis.__normalComboFrame = requestAnimationFrame(tick);
  return true;
})()
`;

const installNormalComboAudioRecorderExpression = `
(() => {
  globalThis.__normalComboAudioPlayback = [];
  if (globalThis.__normalComboAudioListener) {
    globalThis.removeEventListener("mydnf:audio-playback", globalThis.__normalComboAudioListener);
  }
  globalThis.__normalComboAudioListener = (event) => {
    const detail = event.detail ?? {};
    if (
      detail.commandId === "attack-swing-light" ||
      detail.commandId === "attack-swing-heavy" ||
      detail.commandId === "dash-hit" ||
      detail.commandId === "heavy-launch" ||
      String(detail.commandId ?? "").startsWith("normal-hit-")
    ) {
      globalThis.__normalComboAudioPlayback.push({
        commandId: detail.commandId,
        channel: detail.channel ?? "",
        noteCount: Number(detail.noteCount ?? 0),
        textureTags: Array.isArray(detail.textureTags) ? detail.textureTags : []
      });
    }
  };
  globalThis.addEventListener("mydnf:audio-playback", globalThis.__normalComboAudioListener);
  return true;
})()
`;

const readNormalComboAudioPlaybackExpression = `
(() => globalThis.__normalComboAudioPlayback ?? [])()
`;

const readNormalComboEvidenceExpression = `
(() => globalThis.__normalComboEvidence)()
`;

const readComboCancelStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const player = document.querySelector(".combat-player");
  const art = document.querySelector(".combat-player-art");
  const weapon = document.querySelector(".combat-weapon");
  const playerStyle = player?.getAttribute("style") ?? "";
  const actorX = /--actor-x:\\s*([0-9.]+)%/.exec(playerStyle)?.[1] ?? "0";
  const impact = document.querySelector("[data-impact-spark='true']");
  const skillVfx = document.querySelector('[data-player-skill-vfx="spark-combo"]');
  const skillCancelToast = document.querySelector("[data-skill-cancel-toast='true']");

  return {
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    playerX: Number(actorX),
    activeSkill: player?.getAttribute("data-active-skill-id") ?? "",
    skillReleaseSource: player?.getAttribute("data-skill-release-source") ?? "",
    playerMotion: player?.getAttribute("data-player-motion") ?? "",
    normalAttackMove: player?.getAttribute("data-player-normal-attack-move") ?? "",
    playerDashAttackReadyUntilMs: player?.getAttribute("data-player-dash-attack-ready-until-ms") ?? "",
    comboCancelWindowActive: scene?.getAttribute("data-combo-cancel-window-active") ?? "",
    comboCancelAvailable: scene?.getAttribute("data-combo-cancel-available") ?? "",
    comboCancelState: scene?.getAttribute("data-combo-cancel-state") ?? "",
    comboCancelActive: scene?.getAttribute("data-combo-cancel-active") ?? "",
    comboCancelSkillId: scene?.getAttribute("data-combo-cancel-skill-id") ?? "",
    comboCancelMsRemaining: Number(scene?.getAttribute("data-combo-cancel-ms-remaining") || "0"),
    hitstopActive: scene?.getAttribute("data-hitstop-active") ?? "",
    impactCue: impact?.getAttribute("data-vfx-cue") ?? "",
    actionBufferState: scene?.getAttribute("data-action-buffer-state") ?? "",
    bufferedAction: scene?.getAttribute("data-buffered-action") ?? "",
    bufferedSkillId: scene?.getAttribute("data-buffered-skill-id") ?? "",
    skillStage: player?.getAttribute("data-player-skill-stage") ?? "",
    hitPhase: player?.getAttribute("data-player-skill-hit-phase") ?? "",
    vfxCue: player?.getAttribute("data-player-skill-vfx-cue") ?? "",
    playerAnimation: art ? getComputedStyle(art).animationName : "",
    weaponAnimation: weapon ? getComputedStyle(weapon).animationName : "",
    skillVfx: skillVfx?.getAttribute("data-player-skill-vfx") ?? "",
    skillVfxHitPhase: skillVfx?.getAttribute("data-hit-phase") ?? "",
    skillVfxCue: skillVfx?.getAttribute("data-vfx-cue") ?? "",
    skillVfxCoreAnimation: skillVfx ? getComputedStyle(skillVfx.querySelector(".skill-core")).animationName : "",
    skillVfxWaveAnimation: skillVfx ? getComputedStyle(skillVfx.querySelector(".skill-wave")).animationName : "",
    skillVfxSparksAnimation: skillVfx ? getComputedStyle(skillVfx.querySelector(".skill-sparks")).animationName : "",
    skillCancelToast: skillCancelToast?.getAttribute("data-combo-cancel-skill-id") ?? ""
  };
})()
`;

const installSparkComboPhaseRecorderExpression = `
(() => {
  globalThis.__sparkComboPhaseSamples = [];
  const readSample = () => {
    const player = document.querySelector(".combat-player");
    const art = document.querySelector(".combat-player-art");
    const weapon = document.querySelector(".combat-weapon");
    const sprite = document.querySelector(".player-frame-sprite");
    const skillVfx = document.querySelector('[data-player-skill-vfx="spark-combo"]');
    return {
      capturedAtMs: performance.now(),
      activeSkill: player?.getAttribute("data-active-skill-id") ?? "",
      playerMotion: player?.getAttribute("data-player-motion") ?? "",
      skillMove: player?.getAttribute("data-player-skill-move") ?? "",
      skillMoveProgress: Number(player?.getAttribute("data-player-skill-move-progress") || "0"),
      skillStage: player?.getAttribute("data-player-skill-stage") ?? "",
      hitPhase: player?.getAttribute("data-player-skill-hit-phase") ?? "",
      vfxCue: player?.getAttribute("data-player-skill-vfx-cue") ?? "",
      playerHurtLockActive: player?.getAttribute("data-player-hurt-lock-active") ?? "",
      playerHurtCue: player?.getAttribute("data-player-hurt-feedback-cue") ?? "",
      playerAnimation: art ? getComputedStyle(art).animationName : "",
      weaponAnimation: weapon ? getComputedStyle(weapon).animationName : "",
      skillVfx: skillVfx?.getAttribute("data-player-skill-vfx") ?? "",
      skillVfxHitPhase: skillVfx?.getAttribute("data-hit-phase") ?? "",
      skillVfxCue: skillVfx?.getAttribute("data-vfx-cue") ?? "",
      skillVfxCoreAnimation: skillVfx ? getComputedStyle(skillVfx.querySelector(".skill-core")).animationName : "",
      skillVfxWaveAnimation: skillVfx ? getComputedStyle(skillVfx.querySelector(".skill-wave")).animationName : "",
      skillVfxSparksAnimation: skillVfx ? getComputedStyle(skillVfx.querySelector(".skill-sparks")).animationName : ""
    };
  };
  const tick = () => {
    const sample = readSample();
    if (
      sample.activeSkill === "spark-combo" &&
      sample.playerMotion === "skill" &&
      sample.hitPhase !== "" &&
      sample.vfxCue !== "" &&
      sample.skillVfxHitPhase === sample.hitPhase &&
      sample.skillVfxCue === sample.vfxCue
    ) {
      const existing = globalThis.__sparkComboPhaseSamples.some((item) => item.hitPhase === sample.hitPhase);
      if (!existing) {
        globalThis.__sparkComboPhaseSamples.push(sample);
      }
    }
    if (globalThis.__sparkComboPhaseSamples.length < 3) {
      globalThis.__sparkComboPhaseRecorder = requestAnimationFrame(tick);
    }
  };
  if (globalThis.__sparkComboPhaseRecorder) {
    cancelAnimationFrame(globalThis.__sparkComboPhaseRecorder);
  }
  globalThis.__sparkComboPhaseRecorder = requestAnimationFrame(tick);
  return true;
})()
`;

const readSparkComboPhaseSamplesExpression = `
(() => globalThis.__sparkComboPhaseSamples ?? [])()
`;

const installFlowingLightPhaseRecorderExpression = `
(() => {
  globalThis.__flowingLightPhaseSamples = [];
  globalThis.__flowingLightDebugSamples = [];
  globalThis.__flowingLightSwordDanceEvidence = {
    stagePhases: [],
    hitEventIds: [],
    maxComboCount: 0,
    sawFinisherAirborne: false,
    startX: Number(document.querySelector(".combat-scene")?.getAttribute("data-player-x") || "0"),
    maxX: Number(document.querySelector(".combat-scene")?.getAttribute("data-player-x") || "0"),
    finisherContactHoldFrame: -1,
    finisherRecoveryFrame: -1
  };
  const readSample = () => {
    const shell = document.querySelector(".app-shell");
    const scene = document.querySelector(".combat-scene");
    const player = document.querySelector(".combat-player");
    const art = document.querySelector(".combat-player-art");
    const weapon = document.querySelector(".combat-weapon");
    const sprite = document.querySelector(".player-frame-sprite");
    const skillVfx = document.querySelector('[data-player-skill-vfx="flowing-light-chain"]');
    return {
      capturedAtMs: performance.now(),
      appMode: shell?.getAttribute("data-app-mode") ?? "",
      classId: scene?.getAttribute("data-class-id") ?? "",
      advancementId: scene?.getAttribute("data-advancement-id") ?? "",
      playerX: Number(scene?.getAttribute("data-player-x") || "0"),
      playerY: Number(scene?.getAttribute("data-player-y") || "0"),
      playerHurtLockActive: player?.getAttribute("data-player-hurt-lock-active") ?? "",
      playerHurtCue: player?.getAttribute("data-player-hurt-feedback-cue") ?? "",
      activeSkill: player?.getAttribute("data-active-skill-id") ?? "",
      playerMotion: player?.getAttribute("data-player-motion") ?? "",
      skillMove: player?.getAttribute("data-player-skill-move") ?? "",
      skillMoveProgress: Number(player?.getAttribute("data-player-skill-move-progress") || "0"),
      skillStage: player?.getAttribute("data-player-skill-stage") ?? "",
      hitstopActive: scene?.getAttribute("data-hitstop-active") ?? "",
      hitPhase: player?.getAttribute("data-player-skill-hit-phase") ?? "",
      vfxCue: player?.getAttribute("data-player-skill-vfx-cue") ?? "",
      playerAnimation: art ? getComputedStyle(art).animationName : "",
      weaponAnimation: weapon ? getComputedStyle(weapon).animationName : "",
      skillVfx: skillVfx?.getAttribute("data-player-skill-vfx") ?? "",
      skillVfxHitPhase: skillVfx?.getAttribute("data-hit-phase") ?? "",
      skillVfxCue: skillVfx?.getAttribute("data-vfx-cue") ?? "",
      skillVfxCoreAnimation: skillVfx ? getComputedStyle(skillVfx.querySelector(".skill-core")).animationName : "",
      skillVfxWaveAnimation: skillVfx ? getComputedStyle(skillVfx.querySelector(".skill-wave")).animationName : "",
      skillVfxSparksAnimation: skillVfx ? getComputedStyle(skillVfx.querySelector(".skill-sparks")).animationName : "",
      spriteFrame: Number(sprite?.getAttribute("data-sprite-frame") ?? "-1"),
      spriteState: sprite?.getAttribute("data-sprite-state") ?? "",
      spriteSkill: sprite?.getAttribute("data-sprite-skill") ?? "",
      spriteSkillPhase: sprite?.getAttribute("data-sprite-skill-phase") ?? "",
      spriteBackground: sprite ? getComputedStyle(sprite).backgroundImage : "",
      spriteSlashWidth: sprite ? getComputedStyle(sprite, "::before").borderTopWidth : "",
      spriteGhostBackground: sprite ? getComputedStyle(sprite, "::after").backgroundImage : "",
      enemies: Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => {
        const enemySprite = enemy.querySelector(".enemy-frame-sprite");
        return {
          id: enemy.getAttribute("data-enemy-id") ?? "",
          kind: enemy.getAttribute("data-enemy-kind") ?? "",
          hp: Number(enemy.getAttribute("data-enemy-hp-current") || "0"),
          x: Number(enemy.getAttribute("data-enemy-x") || "0"),
          y: Number(enemy.getAttribute("data-enemy-y") || "0"),
          attackSkillId: enemy.getAttribute("data-enemy-attack-skill-id") ?? "",
          attackStage: enemy.getAttribute("data-enemy-attack-stage") ?? "",
          attackProgress: Number(enemy.getAttribute("data-enemy-attack-progress") || "0"),
          spriteFrame: Number(enemySprite?.getAttribute("data-sprite-frame") ?? "-1"),
          spriteReaction: enemySprite?.getAttribute("data-sprite-skill-reaction") ?? "",
          spriteTransform: enemySprite ? getComputedStyle(enemySprite).transform : ""
        };
      })
    };
  };
  const captureFinisherFrames = (sample) => {
    const evidence = globalThis.__flowingLightSwordDanceEvidence;
    const sceneElapsedMs = Number(document.querySelector(".combat-scene")?.getAttribute("data-combat-elapsed-ms") ?? "0");
    const skillHitAtMs = Number(document.querySelector(".combat-player")?.getAttribute("data-player-skill-hit-at-ms") ?? "0");
    if (sample.hitPhase === "chain-finish" && skillHitAtMs > 0 && sceneElapsedMs - skillHitAtMs >= 180) {
      evidence.finisherContactHoldFrame = evidence.finisherContactHoldFrame < 0 ? sample.spriteFrame : evidence.finisherContactHoldFrame;
    }
    if (sample.hitPhase === "chain-finish" && skillHitAtMs > 0 && sceneElapsedMs - skillHitAtMs >= 310) {
      evidence.finisherRecoveryFrame = sample.spriteFrame;
    }
  };
  const tick = () => {
    const sample = readSample();
    const evidence = globalThis.__flowingLightSwordDanceEvidence;
    globalThis.__flowingLightDebugSamples.push(sample);
    if (globalThis.__flowingLightDebugSamples.length > 80) {
      globalThis.__flowingLightDebugSamples.shift();
    }
    if (
      sample.activeSkill === "flowing-light-chain" &&
      sample.playerMotion === "skill" &&
      sample.hitPhase !== "" &&
      sample.vfxCue !== "" &&
      sample.skillVfxHitPhase === sample.hitPhase &&
      sample.skillVfxCue === sample.vfxCue
    ) {
      const existing = globalThis.__flowingLightPhaseSamples.some((item) => item.hitPhase === sample.hitPhase);
      if (!existing) {
        globalThis.__flowingLightPhaseSamples.push(sample);
      }
    }
    for (const impact of document.querySelectorAll('[data-skill-impact-vfx="flowing-light-chain"]')) {
      const eventId = impact.getAttribute("data-hit-event-id") ?? "";
      const phase = impact.getAttribute("data-hit-phase") ?? "";
      const cue = impact.getAttribute("data-vfx-cue") ?? "";
      if (eventId && !evidence.hitEventIds.includes(eventId)) evidence.hitEventIds.push(eventId);
      const stage = Number(eventId.match(/flowing-light-chain-(\\d+)-/)?.[1] ?? "0");
      if (stage > 0 && !evidence.stagePhases.some((item) => item.stage === stage)) {
        evidence.stagePhases.push({ stage, phase, cue });
        evidence.stagePhases.sort((left, right) => left.stage - right.stage);
      }
    }
    evidence.maxComboCount = Math.max(
      evidence.maxComboCount,
      Number(document.querySelector(".combat-scene")?.getAttribute("data-combo-count") || "0")
    );
    evidence.maxX = Math.max(evidence.maxX, sample.playerX);
    evidence.sawFinisherAirborne ||=
      sample.hitPhase === "chain-finish" &&
      Array.from(document.querySelectorAll(".combat-enemy")).some((enemy) => enemy.getAttribute("data-enemy-airborne") === "true");
    captureFinisherFrames(sample);
    if (
      globalThis.__flowingLightPhaseSamples.length < 5 ||
      evidence.stagePhases.length < 7 ||
      evidence.finisherContactHoldFrame < 0 ||
      evidence.finisherRecoveryFrame < 0
    ) {
      globalThis.__flowingLightPhaseRecorder = requestAnimationFrame(tick);
    }
  };
  if (globalThis.__flowingLightPhaseRecorder) {
    cancelAnimationFrame(globalThis.__flowingLightPhaseRecorder);
  }
  if (globalThis.__flowingLightPhaseObserver) {
    globalThis.__flowingLightPhaseObserver.disconnect();
  }
  globalThis.__flowingLightPhaseObserver = new MutationObserver(() => captureFinisherFrames(readSample()));
  globalThis.__flowingLightPhaseObserver.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["data-combat-elapsed-ms", "data-player-skill-hit-phase", "data-player-skill-hit-at-ms", "data-sprite-frame"]
  });
  globalThis.__flowingLightPhaseRecorder = requestAnimationFrame(tick);
  return true;
})()
`;

const readFlowingLightPhaseSamplesExpression = `
(() => globalThis.__flowingLightPhaseSamples ?? [])()
`;

const readFlowingLightSwordDanceEvidenceExpression = `
(() => globalThis.__flowingLightSwordDanceEvidence)()
`;

const readFlowingLightLiveStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const player = document.querySelector(".combat-player");
  const sprite = document.querySelector(".player-frame-sprite");
  return {
    phase: player?.getAttribute("data-player-skill-hit-phase") ?? "",
    cue: player?.getAttribute("data-player-skill-vfx-cue") ?? "",
    spriteFrame: Number(sprite?.getAttribute("data-sprite-frame") ?? "-1"),
    comboCount: Number(scene?.getAttribute("data-combo-count") ?? "0"),
    airborne: Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => enemy.getAttribute("data-enemy-airborne") ?? ""),
    elapsedMs: Number(scene?.getAttribute("data-combat-elapsed-ms") ?? "0"),
    hitAtMs: Number(player?.getAttribute("data-player-skill-hit-at-ms") ?? "0")
  };
})()
`;

const installSwordDanceAudioRecorderExpression = `
(() => {
  globalThis.__swordDanceAudioPlayback = [];
  if (globalThis.__swordDanceAudioListener) {
    globalThis.removeEventListener("mydnf:audio-playback", globalThis.__swordDanceAudioListener);
  }
  globalThis.__swordDanceAudioListener = (event) => {
    const detail = event.detail ?? {};
    if (typeof detail.commandId === "string" && detail.commandId.startsWith("sword-dance-")) {
      globalThis.__swordDanceAudioPlayback.push({
        commandId: detail.commandId,
        channel: detail.channel ?? "",
        noteCount: Number(detail.noteCount ?? 0),
        textureTags: Array.isArray(detail.textureTags) ? detail.textureTags : []
      });
    }
  };
  globalThis.addEventListener("mydnf:audio-playback", globalThis.__swordDanceAudioListener);
  return true;
})()
`;

const readSwordDanceAudioPlaybackExpression = `
(() => globalThis.__swordDanceAudioPlayback ?? [])()
`;

const readFlowingLightDebugSamplesExpression = `
(() => globalThis.__flowingLightDebugSamples ?? [])()
`;

const readFlowingLightSafeCastWindowExpression = `
(() => {
  const stages = Array.from(document.querySelectorAll(".combat-enemy[data-enemy-attack-stage]")).map((enemy) =>
    enemy.getAttribute("data-enemy-attack-stage") ?? "none"
  );
  const sawAttack = Boolean(globalThis.__flowingLightSawEnemyAttack) || stages.some((stage) => stage !== "none");
  globalThis.__flowingLightSawEnemyAttack = sawAttack;
  return { sawAttack, stages };
})()
`;

const readBackstepReactionStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const player = document.querySelector(".combat-player");
  const playerArt = player?.querySelector(".combat-player-art");
  const weapon = player?.querySelector(".combat-weapon");
  return {
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    roomIndex: scene?.getAttribute("data-room-index") ?? "",
    playerX: Number(scene?.getAttribute("data-player-x") || "0"),
    playerFacing: player?.getAttribute("data-player-facing") ?? "",
    playerMotion: player?.getAttribute("data-player-motion") ?? "",
    skillMove: player?.getAttribute("data-player-skill-move") ?? "",
    skillMoveProgress: Number(player?.getAttribute("data-player-skill-move-progress") || "0"),
    evadeActive: player?.getAttribute("data-evade-active") ?? "",
    invulnerableActive: player?.getAttribute("data-player-invulnerable-active") ?? "",
    playerHurtLockActive: player?.getAttribute("data-player-hurt-lock-active") ?? "",
    playerAnimation: playerArt ? getComputedStyle(playerArt).animationName : "",
    weaponAnimation: weapon ? getComputedStyle(weapon).animationName : "",
    enemies: Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => {
      const art = enemy.querySelector(".enemy-art");
      return {
        id: enemy.getAttribute("data-enemy-id") ?? "",
        kind: enemy.getAttribute("data-enemy-kind") ?? "",
        hp: Number(enemy.getAttribute("data-enemy-hp-current") || "0"),
        armorState: enemy.getAttribute("data-armor-state") ?? "",
        superArmor: enemy.getAttribute("data-enemy-super-armor") ?? "",
        hitstunActive: enemy.getAttribute("data-enemy-hitstun-active") ?? "",
        hitRecent: enemy.getAttribute("data-hit-recent") ?? "",
        motion: enemy.getAttribute("data-enemy-motion") ?? "",
        airborne: enemy.getAttribute("data-enemy-airborne") ?? "",
        downed: enemy.getAttribute("data-enemy-knockdown") ?? "",
        animationName: art ? getComputedStyle(art).animationName : ""
      };
    })
  };
})()
`;

const installTrashHitstunRecorderExpression = `
(() => {
  globalThis.__browserTrashHitstunEvidence = null;
  globalThis.__browserTrashHitstunRecorder?.disconnect?.();
  if (globalThis.__browserTrashHitstunFrame) {
    cancelAnimationFrame(globalThis.__browserTrashHitstunFrame);
  }
  const sample = () => {
    const enemy = Array.from(document.querySelectorAll('.combat-enemy')).find((node) =>
      node.getAttribute('data-enemy-kind') === 'trash' &&
      node.getAttribute('data-enemy-hitstun-active') === 'true' &&
      node.getAttribute('data-enemy-motion') === 'hitstun'
    );
    const art = enemy?.querySelector('.enemy-art');
    if (enemy && art && getComputedStyle(art).animationName === 'monster-hitstun-react') {
      globalThis.__browserTrashHitstunEvidence = {
        id: enemy.getAttribute('data-enemy-id') ?? '',
        hp: Number(enemy.getAttribute('data-enemy-hp-current') || '0'),
        motion: enemy.getAttribute('data-enemy-motion') ?? '',
        animationName: getComputedStyle(art).animationName
      };
    }
  };
  const observer = new MutationObserver(sample);
  observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
  globalThis.__browserTrashHitstunRecorder = observer;
  const startedAt = performance.now();
  const tick = () => {
    sample();
    if (!globalThis.__browserTrashHitstunEvidence && performance.now() - startedAt < 1800) {
      globalThis.__browserTrashHitstunFrame = requestAnimationFrame(tick);
    }
  };
  globalThis.__browserTrashHitstunFrame = requestAnimationFrame(tick);
  return true;
})()
`;

const readTrashHitstunEvidenceExpression = `
(() => globalThis.__browserTrashHitstunEvidence ?? null)()
`;

const installCriticalHitRecorderExpression = `
(() => {
  globalThis.__browserCriticalEvidence = null;
  globalThis.__browserCriticalRecorder?.disconnect?.();
  if (globalThis.__browserCriticalFrame) {
    cancelAnimationFrame(globalThis.__browserCriticalFrame);
  }
  const sample = () => {
    if (globalThis.__browserCriticalEvidence) {
      return;
    }
    const scene = document.querySelector('.combat-scene[data-critical-hit="true"]');
    const impact = document.querySelector('.hit-impact[data-critical="true"]');
    const damage = document.querySelector('.damage-number[data-critical="true"]');
    const playerArt = document.querySelector('.combat-player-art');
    const weapon = document.querySelector('.combat-weapon');
    if (!scene || !impact || !damage || !playerArt || !weapon) {
      return;
    }
    globalThis.__browserCriticalEvidence = {
      criticalChance: Number(scene.getAttribute('data-critical-chance') || '0'),
      criticalAccumulator: Number(scene.getAttribute('data-critical-accumulator') || '0'),
      criticalHit: scene.getAttribute('data-critical-hit') ?? '',
      hitstopActive: scene.getAttribute('data-hitstop-active') ?? '',
      screenShake: scene.getAttribute('data-screen-shake') ?? '',
      screenFlash: scene.getAttribute('data-screen-flash') ?? '',
      damageText: damage.textContent?.trim() ?? '',
      impactAnimation: getComputedStyle(impact).animationName,
      damageAnimation: getComputedStyle(damage).animationName,
      playerAnimation: getComputedStyle(playerArt).animationName,
      weaponAnimation: getComputedStyle(weapon).animationName
    };
  };
  const observer = new MutationObserver(sample);
  observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
  globalThis.__browserCriticalRecorder = observer;
  const startedAt = performance.now();
  const tick = () => {
    sample();
    if (!globalThis.__browserCriticalEvidence && performance.now() - startedAt < 30000) {
      globalThis.__browserCriticalFrame = requestAnimationFrame(tick);
    }
  };
  globalThis.__browserCriticalFrame = requestAnimationFrame(tick);
  return true;
})()
`;

const readCriticalHitEvidenceExpression = `
(() => globalThis.__browserCriticalEvidence ?? null)()
`;

describe("real browser keyboard control", () => {
  it("renders KOF-style player and monster action frames through real combat controls", async () => {
    const server = await startViteServer();
    const screenshotRoot = `${process.cwd().replace(/\\/g, "/")}/.codex-local/tmp/articulated-model-acceptance`;

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await page.setViewport(1440, 900);
        await enterDungeonWithKeyboard(page);
        const idle = await page.waitFor<BrowserFrameSpriteState>(
          readFrameSpriteStateExpression,
          (state) => state.stage === "ready" && state.backgroundReady && state.enemyFrames.length === 2 && state.playerBackground.includes("ember-warden-atlas") && state.enemyBackgrounds.every((background) => background.includes("ash-cinder-imp-atlas")),
          10000
        );
        expect(idle.oldPlayerOpacity).toBe("0");
        expect(idle.oldEnemyOpacity).toBe("0");
        expect(idle.oldWeaponOpacity).toBe("0");
        expect(idle.oldPlayerVisibility).toBe("hidden");
        expect(idle.oldEnemyVisibility).toBe("hidden");
        expect(idle.oldWeaponVisibility).toBe("hidden");
        expect(idle.playerShadowContent).toBe('\"\"');
        expect(idle.playerShadowBackground).toContain("radial-gradient");
        expect(idle.playerShadowOpacity).toBeGreaterThan(0.5);
        expect(idle.playerRootFilter).toBe("none");
        expect(idle.enemyShadowContents).toEqual(['\"\"', '\"\"']);
        expect(idle.enemyShadowBackgrounds.every((background) => background.includes("radial-gradient"))).toBe(true);
        expect(idle.enemyRootFilters).toEqual(["none", "none"]);
        expect(idle.sceneWidth).toBeGreaterThan(900);
        expect(idle.sceneHeight).toBeGreaterThan(500);
        expect(idle.playerFrame).toBeGreaterThanOrEqual(0);
        expect(idle.playerFrame).toBeLessThanOrEqual(3);
        await page.captureScreenshot(`${screenshotRoot}/desktop.png`);

        await page.keyDown("ArrowRight");
        const running = await page.waitFor<BrowserFrameSpriteState>(readFrameSpriteStateExpression, (state) => state.playerSpriteState === "run" && state.playerFrame >= 4 && state.playerFrame <= 7, 4000);
        await page.keyUp("ArrowRight");
        expect(running.playerFrame).not.toBe(idle.playerFrame);

        await page.pressKey("KeyX");
        const attacking = await page.waitFor<BrowserFrameSpriteState>(
          readFrameSpriteStateExpression,
          (state) => state.playerSpriteState === "attack" && state.playerFrame >= 8 && state.playerFrame <= 11,
          2500
        );
        expect(attacking.playerFrame).not.toBe(running.playerFrame);
        await page.captureScreenshot(`${screenshotRoot}/player-attack.png`);

        await page.waitFor<BrowserFrameSpriteState>(
          readFrameSpriteStateExpression,
          (state) => state.playerSpriteState === "idle",
          1200
        );

        await page.pressKey("KeyC");
        const airborne = await page.waitFor<BrowserFrameSpriteState>(
          readFrameSpriteStateExpression,
          (state) => state.playerAirborne === "true" && state.playerShadowOpacity < idle.playerShadowOpacity,
          1000
        );
        expect(airborne.playerShadowTransform).not.toBe(idle.playerShadowTransform);
        await page.waitFor<BrowserFrameSpriteState>(
          readFrameSpriteStateExpression,
          (state) => state.playerAirborne === "false" && state.playerShadowOpacity === idle.playerShadowOpacity,
          1200
        );

        await moveIntoLiveEnemyRange(page);
        const enemyAttack = await page.waitFor<BrowserFrameSpriteState>(
          readFrameSpriteStateExpression,
          (state) => state.enemySpriteStates.some((spriteState) => spriteState === "attack" || spriteState.startsWith("monster-skill-")) && state.enemyFrames.some((frame) => frame >= 8 && frame <= 11),
          10000
        );
        expect(enemyAttack.enemySpriteStates.some((spriteState) => spriteState.startsWith("monster-skill-"))).toBe(true);
        await page.captureScreenshot(`${screenshotRoot}/enemy-attack.png`);

        await page.keyDown("ArrowLeft");
        await page.waitFor<BrowserCombatState>(readCombatStateExpression, (state) => state.playerX <= 15, 3000);
        await page.keyUp("ArrowLeft");
        await page.waitFor<BrowserFrameSpriteState>(
          readFrameSpriteStateExpression,
          (state) => state.playerSpriteState === "idle" && state.enemySpriteStates.every((spriteState) => spriteState === "idle"),
          4000
        );
        await waitInBrowser(page, 650);
        await page.setViewport(390, 844);
        const mobile = await page.waitFor<BrowserFrameSpriteState>(
          readFrameSpriteStateExpression,
          (state) => state.stage === "ready" && state.backgroundReady && state.playerSpriteState === "idle" && state.sceneWidth >= 350 && state.sceneWidth <= 390 && state.sceneHeight > 500,
          5000
        );
        expect(mobile.enemyFrames.length).toBe(2);
        expect(mobile.oldPlayerVisibility).toBe("hidden");
        expect(mobile.oldEnemyVisibility).toBe("hidden");
        expect(mobile.oldWeaponVisibility).toBe("hidden");
        expect(mobile.playerRootFilter).toBe("none");
        expect(mobile.enemyRootFilters).toEqual(["none", "none"]);
        expect(mobile.controlsHeight).toBeLessThanOrEqual(140);
        expect(mobile.actorVisualTop).toBeGreaterThanOrEqual(mobile.controlsBottom + 20);
        await page.captureScreenshot(`${screenshotRoot}/mobile.png`);
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("uses a recovery potion through real Digit1 input and auto-saves the quickbar", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await page.setViewport(1440, 900);
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserConsumableState>(
          readConsumableStateExpression,
          (state) => state.objective === "active" && state.healingPotionCount === 3,
          5000
        );

        await page.keyDown("ArrowRight");
        await page.waitFor<BrowserCombatState>(readCombatStateExpression, (state) => state.playerX >= 27, 2500);
        await page.keyUp("ArrowRight");

        const wounded = await page.waitFor<BrowserConsumableState>(
          readConsumableStateExpression,
          (state) => state.objective === "active" && state.hp > 0 && state.hp < state.maxHp,
          8000
        );

        await page.pressKey("Digit1");
        const healed = await page.waitFor<BrowserConsumableState>(
          readConsumableStateExpression,
          (state) =>
            state.hp > wounded.hp &&
            state.healingPotionCount === 2 &&
            state.savedHealingPotionCount === 2 &&
            state.statusVfx === "healing-potion" &&
            state.statusVfxCue === "healing-potion-use" &&
            state.statusCoreAnimation === "consumable-healing-core",
          3000
        );

        expect(healed.revivalTokenCount).toBe(1);
        expect(healed.hp).toBeLessThanOrEqual(healed.maxHp);
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("opens the defeat decision and revives through a real mounted click", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, createDefeatAcceptanceState());
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserDefeatState>(
          readDefeatStateExpression,
          (state) => state.objective === "active" && state.liveEnemyCount === 2 && state.savedRevivalTokenCount === 1,
          5000
        );

        let defeated: BrowserDefeatState | undefined;
        for (let attempt = 0; attempt < 48; attempt += 1) {
          const current = await page.evaluate<BrowserDefeatState>(readDefeatStateExpression);
          if (current.objective === "failed") {
            defeated = current;
            break;
          }

          await moveIntoLiveEnemyRange(page);
          await waitInBrowser(page, 650);
        }

        defeated ??= await page.waitFor<BrowserDefeatState>(
          readDefeatStateExpression,
          (state) => state.objective === "failed",
          5000
        );

        expect(defeated.playerHp).toBe(0);
        expect(defeated.overlayVisible).toBe(true);
        expect(defeated.reviveAvailable).toBe("true");
        expect(defeated.revivalTokenCount).toBe(1);
        expect(defeated.reviveButtonVisible).toBe(true);
        expect(defeated.reviveButtonDisabled).toBe(false);
        expect(defeated.returnButtonVisible).toBe(true);
        expect(defeated.liveEnemyCount).toBeGreaterThan(0);
        expect(defeated.savedRevivalTokenCount).toBe(1);

        const reviveGeometry = await page.evaluate<{ width: number; height: number; display: string; overlayHeight: number; sceneHeight: number }>(`(() => {
          const button = document.querySelector("[data-defeat-revive='true']");
          const overlay = document.querySelector(".combat-defeat-overlay");
          const scene = document.querySelector(".combat-scene");
          const rect = button?.getBoundingClientRect();
          return {
            width: rect?.width ?? 0,
            height: rect?.height ?? 0,
            display: button ? getComputedStyle(button).display : "missing",
            overlayHeight: overlay?.getBoundingClientRect().height ?? 0,
            sceneHeight: scene?.getBoundingClientRect().height ?? 0
          };
        })()`);
        expect(reviveGeometry.width).toBeGreaterThan(0);
        expect(reviveGeometry.height).toBeGreaterThan(0);

        await page.click("[data-defeat-revive='true']");
        const revived = await page.waitFor<BrowserDefeatState>(
          readDefeatStateExpression,
          (state) =>
            state.objective === "active" &&
            !state.overlayVisible &&
            state.playerHp > 0 &&
            state.playerInvulnerable === "true" &&
            state.savedRevivalTokenCount === 0,
          1200
        );

        expect(revived.roomIndex).toBe(defeated.roomIndex);
        expect(revived.playerHp).toBeLessThanOrEqual(Math.ceil(revived.playerMaxHp * 0.35));
        expect(revived.liveEnemyCount).toBe(defeated.liveEnemyCount);
        expect(revived.enemyHp).toEqual(defeated.enemyHp);
        expect(revived.combatEventCount).toBe(defeated.combatEventCount + 1);
      });
    } finally {
      await server.close();
    }
  }, 90000);

  it("triggers a deterministic critical hit with real keyboard attacks and mounted feedback", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, createReadyCriticalBuildState());
        await enterDungeonWithKeyboard(page);
        await page.waitFor<{ criticalChance: number; classId: string; advancementId: string }>(
          `(() => {
            const scene = document.querySelector('.combat-scene');
            return {
              criticalChance: Number(scene?.getAttribute('data-critical-chance') || '0'),
              classId: scene?.getAttribute('data-class-id') ?? '',
              advancementId: scene?.getAttribute('data-advancement-id') ?? ''
            };
          })()`,
          (state) =>
            state.classId === "ink-shadow-ranger" &&
            state.advancementId === "night-contract-hunter" &&
            state.criticalChance === 22,
          5000
        );
        await page.evaluate<boolean>(installCriticalHitRecorderExpression);
        await clearCurrentRoomWithKeyboard(page, 28);

        const critical = await page.waitFor<BrowserCriticalEvidence | null>(
          readCriticalHitEvidenceExpression,
          (state): state is BrowserCriticalEvidence => state !== null,
          5000
        );

        expect(critical.criticalChance).toBe(22);
        expect(critical.criticalAccumulator).toBeGreaterThanOrEqual(0);
        expect(critical.criticalAccumulator).toBeLessThan(22);
        expect(critical.criticalHit).toBe("true");
        expect(critical.hitstopActive).toBe("true");
        expect(critical.screenShake).toBe("critical");
        expect(critical.screenFlash).toBe("critical");
        expect(critical.damageText).toMatch(/^暴击 -\d+$/);
        expect(critical.impactAnimation).toBe("critical-impact-pulse");
        expect(critical.damageAnimation).toBe("critical-damage-float");
        expect(critical.playerAnimation).not.toBe("none");
        expect(critical.weaponAnimation).not.toBe("none");
      });
    } finally {
      await server.close();
    }
  }, 90000);

  it("moves continuously and lands a heavy attack through real keyboard events", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserCombatState>(readCombatStateExpression, (state) => state.objective === "active", 5000);

        const start = await page.evaluate<BrowserCombatState>(readCombatStateExpression);

        await page.keyDown("ArrowRight");
        const firstMove = await page.waitFor<BrowserCombatState>(
          readCombatStateExpression,
          (state) => state.playerX > start.playerX,
          1000
        );
        const heldMove = await page.waitFor<BrowserCombatState>(
          readCombatStateExpression,
          (state) => state.playerX > firstMove.playerX + 0.8,
          1500
        );

        expect(firstMove.playerX).toBeGreaterThan(start.playerX);
        expect(heldMove.playerX).toBeGreaterThan(firstMove.playerX);

        await page.keyUp("ArrowRight");
        await moveIntoLiveEnemyRange(page);
        await waitInBrowser(page, 420);
        await page.waitFor<{ sawAttack: boolean; stages: string[] }>(
          readFlowingLightSafeCastWindowExpression,
          (state) => state.sawAttack && state.stages.every((stage) => stage === "none"),
          5000
        );
        await page.evaluate<boolean>(installNormalComboAudioRecorderExpression);
        await page.pressKey("KeyZ");

        const heavyWindup = await page.waitFor<BrowserCombatState>(
          readCombatStateExpression,
          (state) => state.playerMotion === "heavy" && state.normalAttackMove === "ground-heavy",
          1000
        );

        expect(heavyWindup.playerMotion).toBe("heavy");
        expect(heavyWindup.normalAttackMove).toBe("ground-heavy");

        const heavyImpact = await page.waitFor<BrowserCombatState>(
          readCombatStateExpression,
          (state) => state.hitstopActive === "true" && state.impactCue === "ground-heavy-impact",
          1500
        );

        expect(heavyImpact.screenShake).toBe("heavy");
        expect(heavyImpact.impactCue).toBe("ground-heavy-impact");
        const heavyAudio = await page.waitFor<BrowserNormalComboAudioPlayback[]>(
          readNormalComboAudioPlaybackExpression,
          (state) => state.length === 2,
          1200
        );
        expect(heavyAudio.map((event) => event.commandId)).toEqual(["attack-swing-heavy", "heavy-launch"]);
        expect(heavyAudio.every((event) => event.channel === "sfx" && event.noteCount >= 3)).toBe(true);
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("double-taps a direction to run and chains a real dash-light attack", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await page.setViewport(1440, 900);
        await enterDungeonWithKeyboard(page);
        await moveIntoLiveEnemyRange(page);
        await page.waitFor<{ sawAttack: boolean; stages: string[] }>(
          readFlowingLightSafeCastWindowExpression,
          (state) => state.sawAttack && state.stages.every((stage) => stage === "none"),
          5000
        );
        await page.waitFor<BrowserBackstepReactionState>(
          readBackstepReactionStateExpression,
          (state) => state.playerHurtLockActive !== "true",
          1500
        );
        const start = await page.waitFor<BrowserDoubleTapRunState>(
          readDoubleTapRunStateExpression,
          (state) => state.objective === "active" && state.enemyHp.length === 2,
          5000
        );

        await page.pressKey("ArrowRight");
        await waitInBrowser(page, 90);
        const singleTap = await page.evaluate<BrowserDoubleTapRunState>(readDoubleTapRunStateExpression);
        expect(singleTap.dashSource).not.toBe("double-tap");
        expect(singleTap.doubleTapActive).not.toBe("true");

        await page.keyDown("ArrowRight");
        const running = await page.waitFor<BrowserDoubleTapRunState>(
          readDoubleTapRunStateExpression,
          (state) =>
            state.dashSource === "double-tap" &&
            state.doubleTapActive === "true" &&
            state.doubleTapDirection === "ArrowRight" &&
            state.playerX > start.playerX &&
            state.dashReadyUntilMs > state.elapsedMs &&
            state.spriteState === "run" &&
            state.spriteDashSource === "double-tap",
          1500
        );
        expect(running.spriteDustContent).toBe('\"\"');
        expect(running.spriteDustAnimation).toBe("sprite-double-tap-dust");

        await page.evaluate<boolean>(installDoubleTapRunRecorderExpression);
        await page.evaluate<boolean>(installNormalComboAudioRecorderExpression);
        await page.pressKey("KeyX");
        const evidence = await page.waitFor<BrowserDoubleTapRunEvidence>(
          readDoubleTapRunEvidenceExpression,
          (state) => state.sawDashLightMotion && state.sawDashLightImpact && state.lowestEnemyHp < Math.min(...start.enemyHp),
          1600
        );
        expect(evidence.sawDashLightMotion).toBe(true);
        expect(evidence.sawDashLightImpact).toBe(true);
        const dashAudio = await page.waitFor<BrowserNormalComboAudioPlayback[]>(
          readNormalComboAudioPlaybackExpression,
          (state) => state.length === 2,
          1200
        );
        expect(dashAudio.map((event) => event.commandId)).toEqual(["attack-swing-light", "dash-hit"]);

        await page.keyUp("ArrowRight");
        await page.waitFor<BrowserDoubleTapRunState>(
          readDoubleTapRunStateExpression,
          (state) => state.dashSource === "none" && state.doubleTapActive === "false",
          1000
        );
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("chains three real X attacks through distinct contact frames into an airborne finisher", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await page.setViewport(1440, 900);
        await enterDungeonWithKeyboard(page);
        await moveIntoLiveEnemyRange(page);
        await page.waitFor<{ sawAttack: boolean; stages: string[] }>(
          readFlowingLightSafeCastWindowExpression,
          (state) => state.sawAttack && state.stages.every((stage) => stage === "none"),
          5000
        );
        await page.waitFor<BrowserNormalComboState>(
          readNormalComboStateExpression,
          (state) => state.objective === "active" && state.playerHurtLockActive !== "true",
          1500
        );
        await page.evaluate<boolean>(installNormalComboRecorderExpression);
        await page.evaluate<boolean>(installNormalComboAudioRecorderExpression);

        for (const step of [1, 2, 3]) {
          await page.pressKey("KeyX");
          await page.waitFor<BrowserNormalComboEvidence>(
            readNormalComboEvidenceExpression,
            (evidence) =>
              evidence.hitSteps.includes(step) &&
              evidence.playerContactFrames.some((item) => item.step === step) &&
              evidence.enemyReactionFrames.some((item) => item.step === step),
            1400
          );
          if (step < 3) {
            await page.waitFor<BrowserNormalComboState>(
              readNormalComboStateExpression,
              (state) => state.normalAttackActive === "false" && state.playerHurtLockActive !== "true",
              900
            );
          }
        }

        const finisher = await page.waitFor<BrowserNormalComboState>(
          readNormalComboStateExpression,
          (state) => state.impactStep === "3" && state.spriteComboStep === 3 && state.spriteComboPhase === "impact" && state.spriteFrame === 11,
          700
        );
        expect(finisher.enemyAirborne).toContain("true");
        expect(finisher.comboArcContent).toBe('\"\"');
        expect(finisher.comboArcBorderRightWidth).toBe("9px");
        expect(finisher.comboArcBoxShadow).not.toBe("none");
        await page.captureScreenshot(`${process.cwd().replace(/\\/g, "/")}/.codex-local/tmp/articulated-model-acceptance/normal-combo-finisher.png`);

        const evidence = await page.evaluate<BrowserNormalComboEvidence>(readNormalComboEvidenceExpression);
        expect(evidence.playerContactFrames).toEqual([
          { step: 1, frame: 9 },
          { step: 2, frame: 10 },
          { step: 3, frame: 11 }
        ]);
        expect(evidence.enemyReactionFrames).toEqual([
          { step: 1, frame: 12 },
          { step: 2, frame: 13 },
          { step: 3, frame: 14 }
        ]);
        expect(evidence.hitSteps).toEqual([1, 2, 3]);
        expect(evidence.hitCues).toEqual(["ground-light-slash-1", "ground-light-slash-2", "ground-light-slash-3"]);
        expect(evidence.maxComboCount).toBe(3);
        expect(evidence.sawFinisherAirborne).toBe(true);
        expect(evidence.lowestEnemyHp).toBeLessThan(80);
        const audioPlayback = await page.waitFor<BrowserNormalComboAudioPlayback[]>(
          readNormalComboAudioPlaybackExpression,
          (state) => state.length === 6,
          1200
        );
        expect(audioPlayback.map((event) => event.commandId)).toEqual([
          "attack-swing-light",
          "normal-hit-1",
          "attack-swing-light",
          "normal-hit-2",
          "attack-swing-light",
          "normal-hit-3"
        ]);
        expect(audioPlayback.every((event) => event.channel === "sfx" && event.noteCount >= 3)).toBe(true);
        expect(audioPlayback.every((event) => event.textureTags.length >= 3)).toBe(true);
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("uses down-C backstep and proves trash hitstun plus elite super armor through real keyboard combat", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await page.setViewport(1440, 900);
        await enterDungeonWithKeyboard(page);
        const start = await page.waitFor<BrowserBackstepReactionState>(
          readBackstepReactionStateExpression,
          (state) => state.objective === "active" && state.roomIndex === "0",
          5000
        );

        await page.pressKey("ArrowDown");
        await page.pressKey("KeyC");
        const backstepStart = await page.waitFor<BrowserBackstepReactionState>(
          readBackstepReactionStateExpression,
          (state) =>
            state.skillMove === "backstep" &&
            state.playerMotion === "dodge" &&
            state.evadeActive === "true" &&
            state.invulnerableActive === "true",
          700
        );
        const backstepMiddle = await page.waitFor<BrowserBackstepReactionState>(
          readBackstepReactionStateExpression,
          (state) =>
            state.skillMove === "backstep" &&
            state.skillMoveProgress > 0 &&
            state.skillMoveProgress < 100 &&
            state.playerX < start.playerX - 2,
          700
        );
        const backstepEnd = await page.waitFor<BrowserBackstepReactionState>(
          readBackstepReactionStateExpression,
          (state) => state.skillMove === "" && state.playerX <= start.playerX - 70,
          900
        );

        expect(backstepStart.playerFacing).toBe(start.playerFacing);
        expect(backstepStart.playerAnimation).toBe("player-backstep-slide");
        expect(backstepStart.weaponAnimation).toBe("weapon-backstep-guard");
        expect(backstepMiddle.playerX).toBeLessThan(start.playerX);
        expect(backstepMiddle.playerX).toBeGreaterThan(backstepEnd.playerX);
        expect(backstepEnd.playerFacing).toBe(start.playerFacing);

        await waitInBrowser(page, 160);
        await moveIntoLiveEnemyRange(page);
        await page.waitFor<BrowserBackstepReactionState>(
          readBackstepReactionStateExpression,
          (state) => state.playerHurtLockActive !== "true",
          1500
        );
        await page.evaluate<boolean>(installTrashHitstunRecorderExpression);
        await page.pressKey("KeyX");
        const trashHitstun = await page.waitFor<{ id: string; hp: number; motion: string; animationName: string } | null>(
          readTrashHitstunEvidenceExpression,
          (state) => state !== null,
          1800
        );

        expect(trashHitstun?.id).not.toBe("");
        expect(trashHitstun?.hp).toBeGreaterThan(0);
        expect(trashHitstun?.motion).toBe("hitstun");
        expect(trashHitstun?.animationName).toBe("monster-hitstun-react");

        await clearCurrentRoomWithKeyboard(page);
        await walkThroughOpenGate(page);
        await page.waitFor<BrowserBackstepReactionState>(
          readBackstepReactionStateExpression,
          (state) =>
            state.roomIndex === "1" &&
            state.enemies.some((enemy) => enemy.kind === "elite" && enemy.superArmor === "true" && enemy.armorState === "super-armor"),
          5000
        );
        await moveIntoLiveEnemyRange(page);
        const eliteWindup = await page.waitFor<BrowserMonsterSpriteState>(
          readMonsterSpriteStateExpression,
          (state) => state.enemies.some((enemy) =>
            enemy.kind === "elite" &&
            enemy.atlas === "zheng-guard" &&
            enemy.motion === "attack" &&
            enemy.skillStage === "windup" &&
            enemy.frame === 8 &&
            enemy.oldArtOpacity === "0"
          ),
          6000
        );
        const activeZheng = eliteWindup.enemies.find((enemy) => enemy.kind === "elite" && enemy.skillStage === "windup");
        expect(activeZheng?.spriteState).toContain("monster-skill-zheng-");
        expect(activeZheng?.background).toContain("zheng-guard-atlas.png");
        await page.captureScreenshot(`${process.cwd().replace(/\\/g, "/")}/.codex-local/tmp/articulated-model-acceptance/zheng-elite-windup.png`);
        await page.waitFor<{ sawAttack: boolean; stages: string[] }>(
          readFlowingLightSafeCastWindowExpression,
          (state) => state.sawAttack && state.stages.every((stage) => stage === "none"),
          5000
        );
        await page.waitFor<BrowserBackstepReactionState>(
          readBackstepReactionStateExpression,
          (state) => state.playerHurtLockActive !== "true",
          1500
        );
        await moveIntoLiveEnemyRange(page);

        await page.pressKey("KeyX");
        const armoredHit = await page.waitFor<BrowserBackstepReactionState>(
          readBackstepReactionStateExpression,
          (state) =>
            state.enemies.some(
              (enemy) =>
                enemy.kind === "elite" &&
                enemy.hitRecent === "true" &&
                enemy.superArmor === "true" &&
                enemy.hitstunActive === "false" &&
                enemy.airborne === "false" &&
                enemy.downed === "false"
            ),
          1200
        );
        expect(armoredHit.enemies.some((enemy) => enemy.kind === "elite" && enemy.superArmor === "true")).toBe(true);

        await waitInBrowser(page, 230);
        await moveIntoLiveEnemyRange(page);
        await waitInBrowser(page, 420);
        await page.waitFor<{ sawAttack: boolean; stages: string[] }>(
          readFlowingLightSafeCastWindowExpression,
          (state) => state.sawAttack && state.stages.every((stage) => stage === "none"),
          5000
        );
        await page.pressKey("KeyZ");
        await page.waitFor<BrowserBackstepReactionState>(
          readBackstepReactionStateExpression,
          (state) => state.enemies.some((enemy) => enemy.kind === "elite" && enemy.superArmor === "false"),
          1800
        );
        await waitInBrowser(page, 360);
        await moveIntoLiveEnemyRange(page);
        await page.pressKey("KeyX");
        const postArmorLaunch = await page.waitFor<BrowserBackstepReactionState>(
          readBackstepReactionStateExpression,
          (state) =>
            state.enemies.some(
              (enemy) =>
                enemy.kind === "elite" &&
                enemy.hitstunActive === "true" &&
                enemy.superArmor === "false"
            ),
          1800
        );

        expect(postArmorLaunch.enemies.some((enemy) => enemy.kind === "elite" && enemy.motion === "hitstun")).toBe(true);
      });
    } finally {
      await server.close();
    }
  }, 120000);

  it("drives a DNF hotkey skill with model-following motion and dedicated animations", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserCombatState>(readCombatStateExpression, (state) => state.objective === "active", 5000);

        await page.pressKey("KeyA");
        const cast = await page.waitFor<BrowserSkillState>(
          readSkillStateExpression,
          (state) =>
            state.activeSkill === "spark-combo" &&
            state.skillMove === "spark-combo" &&
            state.skillStage === "windup",
          1200
        );

        const moving = await page.waitFor<BrowserSkillState>(
          readSkillStateExpression,
          (state) => state.activeSkill === "spark-combo" && state.skillMove === "spark-combo" && state.skillMoveProgress > 0,
          1200
        );

        expect(cast.playerAnimation).not.toBe("player-skill-cast");
        expect(cast.weaponAnimation).not.toBe("weapon-skill-flare");
        expect(moving.skillMoveProgress).toBeGreaterThan(0);
        expect(["player-ember-spark-combo", ...sparkComboPhases.map((phase) => phase.playerAnimation)]).toContain(moving.playerAnimation);
        expect(["weapon-jab-chain", ...sparkComboPhases.map((phase) => phase.weaponAnimation)]).toContain(moving.weaponAnimation);
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("shows spark-combo jab, cross, and finish phases in the live browser", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserCombatState>(readCombatStateExpression, (state) => state.objective === "active", 5000);

        await page.evaluate<boolean>(installSparkComboPhaseRecorderExpression);
        await page.pressKey("KeyA");

        const samples = await page.waitFor<BrowserSparkComboPhaseSample[]>(
          readSparkComboPhaseSamplesExpression,
          (state) => sparkComboPhases.every((expected) => state.some((sample) => sample.hitPhase === expected.phase)),
          1800
        );

        for (const expected of sparkComboPhases) {
          const phaseState = samples.find((sample) => sample.hitPhase === expected.phase);

          expect(phaseState?.activeSkill).toBe("spark-combo");
          expect(phaseState?.playerMotion).toBe("skill");
          expect(phaseState?.skillStage).toBe("active");
          expect(phaseState?.vfxCue).toBe(expected.cue);
          expect(phaseState?.playerHurtLockActive).not.toBe("true");
          expect(phaseState?.playerHurtCue).toBe("");
          expect(phaseState?.skillVfx).toBe("spark-combo");
          expect(phaseState?.skillVfxHitPhase).toBe(expected.phase);
          expect(phaseState?.skillVfxCue).toBe(expected.cue);
          expect(phaseState?.playerAnimation).toBe(expected.playerAnimation);
          expect(phaseState?.weaponAnimation).toBe(expected.weaponAnimation);
          expect(phaseState?.skillVfxCoreAnimation).toBe(expected.coreAnimation);
          expect(phaseState?.skillVfxWaveAnimation).toBe(expected.waveAnimation);
          expect(phaseState?.skillVfxSparksAnimation).toBe(expected.sparksAnimation);
        }
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("casts Liuli flowing-light-chain as a seven-hit sword dance with real keyboard input", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await page.setViewport(1440, 900);
        await seedSaveAndReload(page, createFlowingLightSwordmasterState());
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) => state.objective === "active" && state.roomIndex === "0" && state.liveEnemyCount === "2",
          5000
        );

        const positioned = await moveIntoOpeningFlowingLightChainRange(page);
        expect(Number(positioned.playerX)).toBeGreaterThanOrEqual(348);
        expect(positioned.enemies.some((enemy) => enemy.hp > 0 && Math.abs(enemy.x - Number(positioned.playerX)) <= 190)).toBe(true);

        await page.waitFor<{ sawAttack: boolean; stages: string[] }>(
          readFlowingLightSafeCastWindowExpression,
          (state) => state.sawAttack && state.stages.length === 2 && state.stages.every((stage) => stage === "none"),
          4000
        );
        await page.evaluate<boolean>(installSwordDanceAudioRecorderExpression);
        await page.evaluate<boolean>(installFlowingLightPhaseRecorderExpression);
        await page.pressKey("Space");
        await page.waitFor<BrowserFlowingLightPhaseSample[]>(
          readFlowingLightPhaseSamplesExpression,
          (state) => state.some((sample) => sample.hitPhase === "chain-open"),
          1800
        );
        await page.waitFor<BrowserFlowingLightPhaseSample[]>(
          readFlowingLightPhaseSamplesExpression,
          (state) => state.some((sample) => sample.hitPhase === "chain-dance-left"),
          1800
        );
        const liveFinisher = await page.waitFor<BrowserFlowingLightLiveState>(
          readFlowingLightLiveStateExpression,
          (state) =>
            state.phase === "chain-finish" &&
            state.cue === "flowing-chain-finish" &&
            state.spriteFrame === 13 &&
            state.comboCount === 14 &&
            state.airborne.includes("true"),
          2600
        );
        expect(liveFinisher.airborne.filter((state) => state === "true")).toHaveLength(2);
        await page.captureScreenshot(`${process.cwd().replace(/\\/g, "/")}/.codex-local/tmp/articulated-model-acceptance/liuli-flowing-sword-dance-finish.png`);
        const finisherRecovery = await page.waitFor<BrowserFlowingLightSwordDanceEvidence>(
          readFlowingLightSwordDanceEvidenceExpression,
          (state) => state.finisherContactHoldFrame >= 0 && state.finisherRecoveryFrame >= 0,
          1200
        );
        expect(finisherRecovery.finisherContactHoldFrame).toBe(13);
        expect(finisherRecovery.finisherRecoveryFrame).toBe(14);

        let samples: BrowserFlowingLightPhaseSample[];
        try {
          samples = await page.waitFor<BrowserFlowingLightPhaseSample[]>(
            readFlowingLightPhaseSamplesExpression,
            (state) => flowingLightPhases.every((expected) => state.some((sample) => sample.hitPhase === expected.phase)),
            3200
          );
        } catch (error) {
          const debugSamples = await page.evaluate<BrowserFlowingLightPhaseSample[]>(readFlowingLightDebugSamplesExpression);
          const tail = debugSamples.slice(-12).map((sample) => ({
            capturedAtMs: Math.round(sample.capturedAtMs),
            playerX: sample.playerX,
            playerHurtLockActive: sample.playerHurtLockActive,
            playerHurtCue: sample.playerHurtCue,
            activeSkill: sample.activeSkill,
            playerMotion: sample.playerMotion,
            skillStage: sample.skillStage,
            hitPhase: sample.hitPhase,
            vfxCue: sample.vfxCue,
            acceptedPhases: debugSamples
              .filter((item) => item.activeSkill === "flowing-light-chain" && item.hitPhase)
              .map((item) => item.hitPhase)
              .filter((phase, index, phases) => phases.indexOf(phase) === index),
            enemies: sample.enemies
          }));
          throw new Error(`${error instanceof Error ? error.message : String(error)}\nFlowing light debug tail: ${JSON.stringify(tail, null, 2)}`);
        }

        for (const expected of flowingLightPhases) {
          const phaseState = samples.find((sample) => sample.hitPhase === expected.phase);

          expect(phaseState?.appMode).toBe("combat");
          expect(phaseState?.classId).toBe("liuli-blademage");
          expect(phaseState?.advancementId).toBe("flowing-light-swordmaster");
          expect(phaseState?.activeSkill).toBe("flowing-light-chain");
          expect(phaseState?.playerMotion).toBe("skill");
          if (expected.phase !== "chain-finish") {
            expect(phaseState?.skillMove).toBe("flowing-light-chain");
            expect(phaseState?.skillMoveProgress).toBeGreaterThan(0);
          }
          expect(phaseState?.skillStage).toBe("active");
          expect(phaseState?.vfxCue).toBe(expected.cue);
          expect(phaseState?.skillVfx).toBe("flowing-light-chain");
          expect(phaseState?.skillVfxHitPhase).toBe(expected.phase);
          expect(phaseState?.skillVfxCue).toBe(expected.cue);
          expect(phaseState?.playerAnimation).toBe(expected.playerAnimation);
          expect(phaseState?.weaponAnimation).toBe(expected.weaponAnimation);
          expect(phaseState?.skillVfxCoreAnimation).toBe(expected.coreAnimation);
          expect(phaseState?.skillVfxWaveAnimation).toBe(expected.waveAnimation);
          expect(phaseState?.skillVfxSparksAnimation).toBe(expected.sparksAnimation);
          expect(phaseState?.spriteState).toBe("skill-dance");
          expect(phaseState?.spriteSkill).toBe("flowing-light-chain");
          expect(phaseState?.spriteSkillPhase).toBe(expected.phase);
          expect(phaseState?.spriteFrame).toBeGreaterThanOrEqual(expected.minFrame);
          expect(phaseState?.spriteFrame).toBeLessThanOrEqual(expected.maxFrame);
          expect(phaseState?.spriteBackground).toContain("liuli-flowing-light-array-atlas");
          expect(phaseState?.spriteSlashWidth).not.toBe("0px");
          expect(phaseState?.spriteGhostBackground).toContain("liuli-flowing-light-array-atlas");
          expect(phaseState?.enemies).toHaveLength(2);
          expect(phaseState?.enemies.every((enemy) => enemy.spriteFrame === expected.enemyFrame)).toBe(true);
          expect(phaseState?.enemies.every((enemy) => enemy.spriteReaction === expected.enemyReaction)).toBe(true);
        }
        const leftReaction = samples.find((sample) => sample.hitPhase === "chain-dance-left")?.enemies[0];
        const rightReaction = samples.find((sample) => sample.hitPhase === "chain-dance-right")?.enemies[0];
        expect(leftReaction?.spriteTransform).not.toBe(rightReaction?.spriteTransform);

        const evidence = await page.waitFor<BrowserFlowingLightSwordDanceEvidence>(
          readFlowingLightSwordDanceEvidenceExpression,
          (state) => state.stagePhases.length === 7 && state.hitEventIds.length === 14 && state.sawFinisherAirborne,
          3200
        );
        expect(evidence.stagePhases).toEqual([
          { stage: 1, phase: "chain-open", cue: "flowing-chain-open" },
          { stage: 2, phase: "chain-dance-left", cue: "flowing-chain-dance-left" },
          { stage: 3, phase: "chain-dance-right", cue: "flowing-chain-dance-right" },
          { stage: 4, phase: "chain-dance-left", cue: "flowing-chain-dance-left" },
          { stage: 5, phase: "chain-dance-right", cue: "flowing-chain-dance-right" },
          { stage: 6, phase: "chain-cross", cue: "flowing-chain-cross" },
          { stage: 7, phase: "chain-finish", cue: "flowing-chain-finish" }
        ]);
        expect(evidence.maxComboCount).toBe(14);
        expect(evidence.maxX - evidence.startX).toBeGreaterThan(140);
        const audioPlayback = await page.waitFor<BrowserSwordDanceAudioPlayback[]>(
          readSwordDanceAudioPlaybackExpression,
          (state) => state.length === 7,
          1600
        );
        expect(audioPlayback.map((event) => event.commandId)).toEqual([
          "sword-dance-open",
          "sword-dance-left",
          "sword-dance-right",
          "sword-dance-left",
          "sword-dance-right",
          "sword-dance-cross",
          "sword-dance-finish"
        ]);
        expect(audioPlayback.every((event) => event.channel === "sfx" && event.noteCount >= 3)).toBe(true);
        expect(audioPlayback.every((event) => event.textureTags.length >= 3)).toBe(true);
      });
    } finally {
      await server.close();
    }
  }, 140000);

  it("drives a DNF command input skill before the normal heavy fallback in the live browser", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserCombatState>(readCombatStateExpression, (state) => state.objective === "active", 5000);

        await page.pressKey("ArrowRight");
        await page.pressKey("KeyZ");

        const commandCast = await page.waitFor<BrowserCommandState>(
          readCommandStateExpression,
          (state) =>
            state.activeSkill === "spark-combo" &&
            state.commandReleaseSource === "manual" &&
            state.commandMatchSkillId === "spark-combo" &&
            state.commandReductionApplied === "true" &&
            state.lastInputMethod === "command",
          1200
        );

        expect(commandCast.objective).toBe("active");
        expect(commandCast.skillReleaseSource).toBe("manual");
        expect(commandCast.playerMotion).toBe("skill");
        expect(commandCast.normalAttackMove).toBe("");
        expect(commandCast.actionBufferState).toBe("empty");
        expect(commandCast.bufferedAction).toBe("");
        expect(commandCast.bufferedSkillId).toBe("");
        expect(commandCast.skillVfx).toBe("spark-combo");
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("cancels a confirmed light hit into spark-combo with real keyboard input and live VFX", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserComboCancelState>(
          readComboCancelStateExpression,
          (state) => state.objective === "active",
          5000
        );
        await moveIntoLiveEnemyRange(page);
        await page.waitFor<BrowserComboCancelState>(
          readComboCancelStateExpression,
          (state) => state.playerDashAttackReadyUntilMs === "",
          800
        );
        await page.waitFor<{ sawAttack: boolean; stages: string[] }>(
          readFlowingLightSafeCastWindowExpression,
          (state) => state.sawAttack && state.stages.length === 2 && state.stages.every((stage) => stage === "none"),
          4000
        );
        await page.waitFor<BrowserComboCancelState>(
          readComboCancelStateExpression,
          (state) => state.playerMotion !== "hit",
          1000
        );

        await page.pressKey("KeyX");
        const cancelWindow = await page.waitFor<BrowserComboCancelState>(
          readComboCancelStateExpression,
          (state) =>
            state.comboCancelWindowActive === "true" &&
            state.comboCancelAvailable === "true" &&
            state.comboCancelState === "available" &&
            state.impactCue === "ground-light-slash-1",
          700
        );

        expect(cancelWindow.objective).toBe("active");
        expect(cancelWindow.comboCancelWindowActive).toBe("true");
        expect(cancelWindow.comboCancelAvailable).toBe("true");
        expect(cancelWindow.comboCancelState).toBe("available");
        expect(cancelWindow.comboCancelMsRemaining).toBeGreaterThan(0);
        expect(cancelWindow.impactCue).toBe("ground-light-slash-1");

        await page.pressKey("KeyA");
        const cancelCast = await page.waitFor<BrowserComboCancelState>(
          readComboCancelStateExpression,
          (state) =>
            state.activeSkill === "spark-combo" &&
            state.skillReleaseSource === "cancel" &&
            state.comboCancelActive === "true" &&
            state.comboCancelSkillId === "spark-combo",
          1200
        );

        expect(cancelCast.playerMotion).toBe("skill");
        expect(cancelCast.actionBufferState).toBe("empty");
        expect(cancelCast.bufferedAction).toBe("");
        expect(cancelCast.bufferedSkillId).toBe("");
        expect(cancelCast.skillCancelToast).toBe("spark-combo");
        expect(cancelCast.skillVfx).toBe("spark-combo");
        expect(cancelCast.playerAnimation).toBe("player-ember-spark-combo");
        expect(cancelCast.weaponAnimation).toBe("weapon-jab-chain");
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("enters the dungeon with Space on a focused town button", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await page.evaluate<void>(`(() => {
          globalThis.__browserSawDungeonPrep = false;
          const observer = new MutationObserver(() => {
            if (document.querySelector('[data-app-mode="dungeon-prep"]')) {
              globalThis.__browserSawDungeonPrep = true;
            }
          });
          observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
        })()`);
        await enterDungeonWithKeyboard(page, "Space");
        const combat = await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) => state.objective === "active",
          5000
        );
        const sawDungeonPrep = await page.evaluate<boolean>("Boolean(globalThis.__browserSawDungeonPrep)");

        expect(sawDungeonPrep).toBe(true);
        expect(combat.objective).toBe("active");
        expect(combat.dungeonId).toBe("cinder-kiln-alley");
        expect(combat.roomIndex).toBe("0");
        expect(combat.roomCount).toBe("3");
        expect(combat.liveEnemyCount).toBe("2");
        expect(combat.defeatedEnemyCount).toBe("0");
        expect(Number(combat.combatElapsedMs)).toBeGreaterThanOrEqual(0);
        expect(Number(combat.playerX)).toBeGreaterThan(0);
        expect(Number(combat.playerY)).toBeGreaterThan(0);
        expect(combat.gateState).toBe("locked");
        expect(combat.gateTransition).toBe("blocked");
        expect(combat.gateTargetRoom).toBe("");
        expect(combat.gateEnterReady).toBe("false");
        expect(combat.transitionState).toBe("none");
        expect(combat.transitionFromRoom).toBe("");
        expect(combat.transitionTargetRoom).toBe("");
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("selects dungeon difficulty and enforces fatigue through real browser controls", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, createInitialState());
        await waitInBrowser(page, 200);
        const normalPrep = await openDungeonPrepThroughRealClick(page, "cinder-kiln-alley");

        expect(normalPrep.fatigueCost).toBe(6);

        await page.pressKey("ArrowRight");
        const adventurePrep = await page.waitFor<BrowserDungeonDifficultyState>(
          readDungeonDifficultyStateExpression,
          (state) => state.selectedDifficulty === "adventure" && state.fatigueCost === 8,
          5000
        );

        expect(adventurePrep.appMode).toBe("dungeon-prep");
        await page.pressKey("Enter");
        const combat = await page.waitFor<BrowserDungeonDifficultyState>(
          readDungeonDifficultyStateExpression,
          (state) =>
            state.appMode === "combat" &&
            state.combatDifficulty === "adventure" &&
            state.firstTrashHpMax === 108 &&
            state.savedFatigue === 56 &&
            state.savedPreference === "adventure",
          5000
        );

        expect(combat.combatScene).toBe(true);

        await page.reload();
        const restored = await page.waitFor<BrowserDungeonDifficultyState>(
          readDungeonDifficultyStateExpression,
          (state) => state.appMode === "town" && state.savedFatigue === 56 && state.savedPreference === "adventure",
          15000
        );

        expect(restored.combatScene).toBe(false);

        const lowFatigueState = createInitialState();
        lowFatigueState.player.fatigue = { current: 7, max: 64 };
        await seedSaveAndReload(page, lowFatigueState);
        await waitInBrowser(page, 200);
        await openDungeonPrepThroughRealClick(page, "cinder-kiln-alley");
        await page.pressKey("ArrowRight");
        await page.waitFor<BrowserDungeonDifficultyState>(
          readDungeonDifficultyStateExpression,
          (state) => state.selectedDifficulty === "adventure" && state.fatigueCost === 8,
          5000
        );
        await page.evaluate<void>(`(() => {
          globalThis.__browserEnterKeydownEvidence = { count: 0, lastAt: 0 };
          globalThis.addEventListener("keydown", (event) => {
            if (event.code === "Enter") {
              globalThis.__browserEnterKeydownEvidence.count += 1;
              globalThis.__browserEnterKeydownEvidence.lastAt = event.timeStamp;
            }
          }, { capture: true });
        })()`);
        await page.pressKey("Enter");
        const refused = await page.waitFor<BrowserDungeonDifficultyState>(
          readDungeonDifficultyStateExpression,
          (state) =>
            state.enterKeydownCount >= 1 &&
            state.appMode === "dungeon-prep" &&
            !state.combatScene &&
            state.savedFatigue === 7,
          5000
        );

        expect(refused.enterKeydownCount).toBeGreaterThanOrEqual(1);
        expect(refused.lastEnterKeydownAt).toBeGreaterThan(0);
        expect(refused.appMode).toBe("dungeon-prep");
        expect(refused.combatScene).toBe(false);
        expect(refused.savedFatigue).toBe(7);
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("keeps focused dungeon prep Enter on the native control action", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, createInitialState());
        await openDungeonPrepThroughRealClick(page, "cinder-kiln-alley");
        await page.evaluate<void>(`document.querySelector('[data-dungeon-prep-back]')?.focus()`);
        await page.pressKey("Enter");
        await page.waitFor<BrowserAppModeState>(readAppModeStateExpression, (state) => state.appMode === "town", 5000);

        await openDungeonPrepThroughRealClick(page, "cinder-kiln-alley");
        await page.evaluate<void>(`document.querySelector('[data-dungeon-difficulty="adventure"]')?.focus()`);
        await page.pressKey("Enter");
        const selected = await page.waitFor<BrowserDungeonDifficultyState>(
          readDungeonDifficultyStateExpression,
          (state) => state.appMode === "dungeon-prep" && state.selectedDifficulty === "adventure",
          5000
        );
        expect(selected.combatScene).toBe(false);

        const lowFatigueState = createInitialState();
        lowFatigueState.player.fatigue = { current: 5, max: 64 };
        await seedSaveAndReload(page, lowFatigueState);
        await openDungeonPrepThroughRealClick(page, "cinder-kiln-alley");
        await page.evaluate<void>(`document.querySelector('[data-dungeon-prep-back]')?.focus()`);
        await page.pressKey("Enter");
        const returned = await page.waitFor<BrowserDungeonDifficultyState>(
          readDungeonDifficultyStateExpression,
          (state) => state.appMode === "town" && state.savedFatigue === 5,
          5000
        );
        expect(returned.combatScene).toBe(false);
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("clears the first room and walks into the next room with real keyboard input", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await page.setViewport(1440, 900);
        await enterDungeonWithKeyboard(page);
        await page.evaluate<boolean>(installEnemyDeathRecorderExpression);
        await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) => state.objective === "active" && state.roomIndex === "0" && state.liveEnemyCount === "2",
          5000
        );

        for (let attempt = 0; attempt < 18; attempt += 1) {
          const state = await page.evaluate<BrowserRoomFlowState>(readRoomFlowStateExpression);
          if (state.liveEnemyCount === "0") {
            break;
          }

          await moveIntoLiveEnemyRange(page);
          await page.pressKey("KeyA");
          await waitInBrowser(page, 430);
          await page.pressKey("KeyS");
          await waitInBrowser(page, 560);
          await page.pressKey("KeyX");
          await waitInBrowser(page, 280);
          await page.pressKey("KeyX");
          await waitInBrowser(page, 320);
        }

        const cleared = await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) =>
            state.objective === "cleared" &&
            state.liveEnemyCount === "0" &&
            state.gateState === "open" &&
            state.floorLootCount === 1 &&
            state.floorLootGearId !== "" &&
            state.enemies.length === 0,
          5000
        );

        expect(cleared.defeatedEnemyCount).toBe("2");
        expect(cleared.gateTargetRoom).toBe("1");
        expect(cleared.transitionState).toBe("none");
        expect(cleared.combatLootEventCount).toBe(0);
        expect(["rare", "epic", "mythic"]).toContain(cleared.floorLootRarity);
        expect(cleared.savedGearIds).not.toContain(cleared.floorLootGearId);
        const deathEvidence = await page.evaluate<BrowserEnemyDeathEvidence>(readEnemyDeathEvidenceExpression);
        expect(deathEvidence.phases).toEqual(
          expect.arrayContaining(["death-impact", "death-collapse", "death-dissolve"])
        );
        expect(deathEvidence.frames).toEqual(expect.arrayContaining([12, 14, 15]));
        await page.captureScreenshot(`${process.cwd().replace(/\\/g, "/")}/.codex-local/tmp/articulated-model-acceptance/cinder-floor-loot.png`);

        let approaching = cleared;
        if (Math.abs(approaching.floorLootY - Number(approaching.playerY)) > 34) {
          const verticalKey = approaching.floorLootY > Number(approaching.playerY) ? "ArrowDown" : "ArrowUp";
          await page.keyDown(verticalKey);
          try {
            approaching = await page.waitFor<BrowserRoomFlowState>(
              readRoomFlowStateExpression,
              (state) => state.floorLootCount === 0 || Math.abs(state.floorLootY - Number(state.playerY)) <= 34,
              2200
            );
          } finally {
            await page.keyUp(verticalKey);
          }
        }

        if (approaching.floorLootCount > 0) {
          const horizontalKey = approaching.floorLootX > Number(approaching.playerX) ? "ArrowRight" : "ArrowLeft";
          await page.keyDown(horizontalKey);
          try {
            approaching = await page.waitFor<BrowserRoomFlowState>(
              readRoomFlowStateExpression,
              (state) => state.floorLootCount === 0 && state.combatLootEventCount === 1,
              3200
            );
          } finally {
            await page.keyUp(horizontalKey);
          }
        }

        expect(approaching.floorLootCount).toBe(0);
        expect(approaching.combatLootEventCount).toBe(1);
        expect(approaching.roomIndex).toBe("0");
        expect(approaching.savedGold).toBe(cleared.savedGold + 120);
        expect(approaching.savedGearIds).toContain(cleared.floorLootGearId);

        await page.keyDown("ArrowRight");
        try {
          const entering = await page.waitFor<BrowserRoomFlowState>(
            readRoomFlowStateExpression,
            (state) => state.gateTransition === "entering" && state.transitionState === "entering",
            5000
          );

          expect(entering.transitionFromRoom).toBe("0");
          expect(entering.transitionTargetRoom).toBe("1");
          expect(entering.gateEnterReady).toBe("false");
        } finally {
          await page.keyUp("ArrowRight");
        }

        const nextRoom = await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) => state.objective === "active" && state.roomIndex === "1" && state.liveEnemyCount === "3",
          4000
        );

        expect(nextRoom.gateState).toBe("locked");
        expect(nextRoom.defeatedEnemyCount).toBe("0");
        expect(nextRoom.gateTargetRoom).toBe("");
      });
    } finally {
      await server.close();
    }
  }, 90000);

  it("clears two rooms into the boss room while proving live action motion and VFX", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await page.setViewport(1440, 900);
        await enterDungeonWithKeyboard(page);
        await page.evaluate<boolean>(installStrictCombatRecorderExpression);
        await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) => state.objective === "active" && state.roomIndex === "0" && state.liveEnemyCount === "2",
          5000
        );

        const firstCleared = await clearCurrentRoomWithKeyboard(page);
        expect(firstCleared.defeatedEnemyCount).toBe("2");
        expect(firstCleared.gateState).toBe("open");
        expect(firstCleared.gateTargetRoom).toBe("1");

        const eliteRoom = await walkThroughOpenGate(page);
        expect(eliteRoom.roomIndex).toBe("1");
        expect(eliteRoom.liveEnemyCount).toBe("3");

        const secondCleared = await clearCurrentRoomWithKeyboard(page, 28);
        expect(secondCleared.defeatedEnemyCount).toBe("3");
        expect(secondCleared.gateState).toBe("boss");
        expect(secondCleared.gateTargetRoom).toBe("2");

        const bossRoom = await walkThroughOpenGate(page);
        expect(bossRoom.roomIndex).toBe("2");
        expect(bossRoom.liveEnemyCount).toBe("1");
        expect(bossRoom.enemies.some((enemy) => enemy.kind === "boss" && enemy.hp > 0)).toBe(true);

        const bossHud = await page.waitFor<BrowserBossHudState>(
          readBossHudStateExpression,
          (state) => state.visible && state.name === "饕餮监工" && state.hpCurrent === 520 && state.armorMax === 80,
          3000
        );
        expect(bossHud.phase).toBe("1");
        expect(bossHud.hpMax).toBe(520);
        expect(bossHud.hpPercent).toBe(100);
        expect(bossHud.armorCurrent).toBe(80);
        expect(bossHud.armorState).toBe("super-armor");
        expect(bossHud.width).toBeGreaterThan(500);
        expect(bossHud.overlapsStatus).toBe(false);
        expect(bossHud.overlapsCombo).toBe(false);
        await page.captureScreenshot(`${process.cwd().replace(/\\/g, "/")}/.codex-local/tmp/articulated-model-acceptance/boss-hud-phase-one.png`);

        const evidence = await page.waitFor<BrowserStrictCombatEvidence>(
          readStrictCombatEvidenceExpression,
          (state) =>
            ["0", "1", "2"].every((roomIndex) => state.roomsSeen.includes(roomIndex)) &&
            state.enemyKindsSeen.includes("boss") &&
            state.sawSkillMotion &&
            state.sawPlayerSkillVfx &&
            state.sawHitstop &&
            state.sawImpactCue &&
            state.sawEnemyAttackMotion &&
            state.sawEnemySkillVfx,
          5000
        );
        expect(evidence.roomsSeen).toEqual(expect.arrayContaining(["0", "1", "2"]));
        expect(evidence.enemyKindsSeen).toContain("boss");
        expect(evidence.sawSkillMotion).toBe(true);
        expect(evidence.sawPlayerSkillVfx).toBe(true);
        expect(evidence.sawHitstop).toBe(true);
        expect(evidence.sawImpactCue).toBe(true);
        expect(evidence.sawEnemyAttackMotion).toBe(true);
        expect(evidence.sawEnemySkillVfx).toBe(true);
      });
    } finally {
      await server.close();
    }
  }, 120000);

  it("clears the boss room and returns to town with real keyboard input", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await page.evaluate<boolean>(installStrictCombatRecorderExpression);
        await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) => state.objective === "active" && state.roomIndex === "0" && state.liveEnemyCount === "2",
          5000
        );

        await clearCurrentRoomWithKeyboard(page);
        await walkThroughOpenGate(page);
        await clearCurrentRoomWithKeyboard(page, 28);
        const bossRoom = await walkThroughOpenGate(page);

        expect(bossRoom.roomIndex).toBe("2");
        expect(bossRoom.liveEnemyCount).toBe("1");
        expect(bossRoom.enemies.some((enemy) => enemy.kind === "boss" && enemy.hp > 0)).toBe(true);

        const bossCleared = await clearCurrentRoomWithKeyboard(page, 80);
        expect(bossCleared.objective).toBe("cleared");
        expect(bossCleared.roomIndex).toBe("2");
        expect(bossCleared.liveEnemyCount).toBe("0");
        expect(bossCleared.gateState).toBe("complete");
        expect(bossCleared.gateTargetRoom).toBe("");

        const dungeonResult = await walkThroughCompletionGateToTown(page);
        const returned = await page.waitFor<BrowserAppModeState>(
          readAppModeStateExpression,
          (state) => state.appMode === "town" && state.townScene === "true",
          8000
        );

        expect(returned.appMode).toBe("town");
        expect(returned.townScene).toBe("true");
        expect(dungeonResult.appMode).toBe("dungeon-result");
        expect(dungeonResult.dungeonId).toBe("cinder-kiln-alley");
        expect(dungeonResult.difficultyId).toBe("normal");
        expect(["C", "B", "A", "S", "SS", "SSS"]).toContain(dungeonResult.rank);
        expect(dungeonResult.score).toBeGreaterThan(0);
        expect(dungeonResult.maxCombo).toBeGreaterThan(0);
        expect(dungeonResult.accuracy).toBeGreaterThan(0);
        expect(dungeonResult.clearTimeMs).toBeGreaterThan(0);
        expect(dungeonResult.gearId).toBeTruthy();
        expect(dungeonResult.confirmButton).toBe(true);
        expect(dungeonResult.topNav).toBe(false);
        expect(dungeonResult.saveExists).toBe(true);
        expect(dungeonResult.savedGold).toBe(dungeonResult.playerGold);
        expect(dungeonResult.savedIronDust).toBe(dungeonResult.playerIronDust);

        const evidence = await page.evaluate<BrowserStrictCombatEvidence>(readStrictCombatEvidenceExpression);
        expect(evidence.roomsSeen).toEqual(expect.arrayContaining(["0", "1", "2"]));
        expect(evidence.enemyKindsSeen).toContain("boss");
        expect(evidence.sawSkillMotion).toBe(true);
        expect(evidence.sawPlayerSkillVfx).toBe(true);
        expect(evidence.sawHitstop).toBe(true);
        expect(evidence.sawImpactCue).toBe(true);
        expect(evidence.sawEnemyAttackMotion).toBe(true);
        expect(evidence.sawEnemySkillVfx).toBe(true);
        expect(evidence.sawBossPhase).toBe(true);
        expect(evidence.sawArenaHazard).toBe(true);
        expect(evidence.sawBossSkillVfx).toBe(true);
      });
    } finally {
      await server.close();
    }
  }, 240000);

  it("chains mounted-button and real-R dungeon rechallenges with fresh saved runs", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await clearCurrentRoomWithKeyboard(page);
        await walkThroughOpenGate(page);
        await clearCurrentRoomWithKeyboard(page, 28);
        await walkThroughOpenGate(page);
        await clearCurrentRoomWithKeyboard(page, 80);

        const result = await reachDungeonResult(page);

        expect(result.dungeonId).toBe("cinder-kiln-alley");
        expect(result.difficultyId).toBe("normal");
        expect(result.rechallengeAvailable).toBe(true);
        expect(result.fatigueCurrent).toBe(58);
        expect(result.fatigueCost).toBe(6);
        expect(result.fatigueAfterRetry).toBe(52);

        await page.click("[data-rechallenge-dungeon='true']");
        const buttonRechallenged = await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) =>
            state.appMode === "combat" &&
            state.objective === "active" &&
            state.dungeonId === "cinder-kiln-alley" &&
            state.difficultyId === "normal" &&
            state.roomIndex === "0" &&
            state.liveEnemyCount === "2" &&
            state.combatEventCount === 0 &&
            state.combatLootEventCount === 0 &&
            !state.resultVisible &&
            state.savedFatigue === 52,
          8000
        );

        expect(buttonRechallenged.defeatedEnemyCount).toBe("0");
        expect(buttonRechallenged.savedGold).toBe(result.savedGold);
        expect(buttonRechallenged.savedIronDust).toBe(result.savedIronDust);

        await clearCurrentRoomWithKeyboard(page);
        await walkThroughOpenGate(page);
        await clearCurrentRoomWithKeyboard(page, 28);
        await walkThroughOpenGate(page);
        await clearCurrentRoomWithKeyboard(page, 80);

        const secondResult = await reachDungeonResult(page);

        expect(secondResult.fatigueCurrent).toBe(52);
        expect(secondResult.fatigueAfterRetry).toBe(46);
        expect(secondResult.savedGold).toBeGreaterThan(result.savedGold);
        expect(secondResult.savedIronDust).toBeGreaterThan(result.savedIronDust);

        await page.pressKey("KeyR");
        const keyRechallenged = await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) =>
            state.appMode === "combat" &&
            state.objective === "active" &&
            state.dungeonId === "cinder-kiln-alley" &&
            state.difficultyId === "normal" &&
            state.roomIndex === "0" &&
            state.liveEnemyCount === "2" &&
            state.combatEventCount === 0 &&
            state.combatLootEventCount === 0 &&
            !state.resultVisible &&
            state.savedFatigue === 46,
          8000
        );

        expect(keyRechallenged.defeatedEnemyCount).toBe("0");
        expect(keyRechallenged.savedGold).toBe(secondResult.savedGold);
        expect(keyRechallenged.savedIronDust).toBe(secondResult.savedIronDust);
      });
    } finally {
      await server.close();
    }
  }, 240000);

  it("completes the default-save Cinder-to-Liuli campaign through real controls and reload", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) => state.objective === "active" && state.dungeonId === "cinder-kiln-alley" && state.roomIndex === "0",
          5000
        );

        await clearCurrentRoomWithKeyboard(page);
        await walkThroughOpenGate(page);
        await clearCurrentRoomWithKeyboard(page, 28);
        await walkThroughOpenGate(page);
        await clearCurrentRoomWithKeyboard(page, 80);
        const cinderResult = await walkThroughCompletionGateToTown(page, "button");

        await page.click('[data-mode="quests"]');
        const ready = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "quests" && state.saved?.player.quests["prologue-ember-warden"] === "ready",
          8000
        );
        const goldBeforeClaim = ready.saved?.player.currencies.gold ?? 0;
        const ironDustBeforeClaim = ready.saved?.player.currencies.ironDust ?? 0;

        expect(goldBeforeClaim).toBe(cinderResult.savedGold);
        expect(ironDustBeforeClaim).toBe(cinderResult.savedIronDust);

        await turnInQuestThroughRealKeys(page, "prologue-ember-warden");
        const unlocked = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) =>
            state.saved?.player.quests["prologue-ember-warden"] === "completed" &&
            state.saved.player.quests["chapter-liuli-furnace"] === "active" &&
            state.saved.player.unlockedDungeons.includes("liuli-furnace"),
          5000
        );

        expect(unlocked.saved?.player.currencies).toMatchObject({
          gold: goldBeforeClaim + 600,
          ironDust: ironDustBeforeClaim + 20,
          arcShard: 0,
          valorToken: 0
        });
        expect(unlocked.saved?.player.inventory).toHaveLength(5);

        await page.click('[data-mode="town"]');
        await enterDungeonWithKeyboard(page, "Enter", "liuli-furnace");
        const liuliEntry = await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) =>
            state.objective === "active" &&
            state.dungeonId === "liuli-furnace" &&
            state.roomIndex === "0" &&
            state.roomCount === "5" &&
            state.liveEnemyCount === "2" &&
            state.enemies.every((enemy) => enemy.kind === "trash"),
          5000
        );

        expect(liuliEntry.gateState).toBe("locked");

        const liuliRooms = [
          { roomIndex: "0", liveEnemyCount: "2", gateState: "open", maxAttempts: 34 },
          { roomIndex: "1", liveEnemyCount: "2", gateState: "open", maxAttempts: 34 },
          { roomIndex: "2", liveEnemyCount: "2", gateState: "open", maxAttempts: 34 },
          { roomIndex: "3", liveEnemyCount: "3", gateState: "boss", maxAttempts: 54 }
        ] as const;

        for (const room of liuliRooms) {
          const activeRoom = await page.waitFor<BrowserRoomFlowState>(
            readRoomFlowStateExpression,
            (state) =>
              state.objective === "active" &&
              state.dungeonId === "liuli-furnace" &&
              state.roomIndex === room.roomIndex &&
              state.liveEnemyCount === room.liveEnemyCount,
            6000
          );

          expect(activeRoom.gateState).toBe("locked");
          const clearedRoom = await clearCurrentRoomWithKeyboard(page, room.maxAttempts);
          expect(clearedRoom.gateState).toBe(room.gateState);
          await walkThroughOpenGate(page);
        }

        const liuliBoss = await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) =>
            state.objective === "active" &&
            state.dungeonId === "liuli-furnace" &&
            state.roomIndex === "4" &&
            state.liveEnemyCount === "1" &&
            state.enemies.length === 1,
          6000
        );
        expect(liuliBoss.enemies[0]?.kind).toBe("boss");

        await clearCurrentRoomWithKeyboard(page, 100);
        const liuliResult = await walkThroughCompletionGateToTown(page, "Space");

        await page.click('[data-mode="quests"]');
        const liuliReady = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "quests" && state.saved?.player.quests["chapter-liuli-furnace"] === "ready",
          8000
        );
        expect(liuliReady.saved?.player.currencies).toMatchObject({
          gold: liuliResult.savedGold,
          ironDust: liuliResult.savedIronDust,
          arcShard: 5,
          valorToken: 0
        });
        expect(liuliReady.saved?.player.inventory).toHaveLength(10);

        await turnInQuestThroughRealKeys(page, "chapter-liuli-furnace");
        const chapterClaimed = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) =>
            state.saved?.player.quests["chapter-liuli-furnace"] === "completed" &&
            state.saved.player.quests["chapter-two-trade-contract"] === "active" &&
            state.saved.player.quests["chapter-two-relic-study"] === "active",
          5000
        );
        expect(chapterClaimed.saved?.player.currencies).toMatchObject({
          gold: liuliResult.savedGold + 1600,
          ironDust: liuliResult.savedIronDust,
          arcShard: 13,
          valorToken: 3
        });
        expect(chapterClaimed.saved?.player.inventory).toHaveLength(10);

        await page.reload();
        const restored = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) =>
            state.appMode === "town" &&
            state.saved?.player.quests["chapter-liuli-furnace"] === "completed" &&
            state.saved.player.unlockedDungeons.includes("liuli-furnace"),
          15000
        );
        expect(restored.saved?.player.currencies).toEqual(chapterClaimed.saved?.player.currencies);
        expect(restored.saved?.player.inventory).toHaveLength(10);
      });
    } finally {
      await server.close();
    }
  }, 420000);

  it("uses KeyC to quick-recover from a live heavy monster hit", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await page.keyDown("ArrowRight");
        try {
          await page.waitFor<BrowserCombatState>(readCombatStateExpression, (state) => state.playerX >= 34, 1800);
        } finally {
          await page.keyUp("ArrowRight");
        }

        const hurt = await page.waitFor<BrowserReactionState>(
          readReactionStateExpression,
          (state) =>
            state.playerHurtCue === "player-hurt-heavy" &&
            state.playerHurtLockActive === "true" &&
            state.playerRecoveryState === "ready",
          7000
        );

        expect(hurt.playerMotion).toBe("hit");
        await page.pressKey("KeyC");

        const recovered = await page.waitFor<BrowserReactionState>(
          readReactionStateExpression,
          (state) =>
            state.playerMotion === "quick-recover" &&
            state.playerQuickRecoverActive === "true" &&
            state.playerInvulnerableActive === "true" &&
            state.recoveryVfx === "wake-invulnerable",
          1200
        );

        expect(recovered.playerRecoveryState).toBe("quick-recover");
        expect(recovered.playerHurtLockActive).toBe("false");
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("sidesteps Taotie forge-collapse with live keyboard lane movement", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await clearCurrentRoomWithKeyboard(page);
        await walkThroughOpenGate(page);
        await clearCurrentRoomWithKeyboard(page, 28);
        await walkThroughOpenGate(page);

        const phased = await triggerBossPhaseTwoWithKeyboard(page);
        expect(phased.bossPhase).toBe("2");

        const telegraph = await page.waitFor<BrowserReactionState>(
          readReactionStateExpression,
          (state) => state.hazards.some((hazard) => hazard.skillId === "taotie-forge-collapse" && hazard.phase === "telegraph"),
          5000
        );

        await page.keyDown("ArrowUp");
        let dodged: BrowserReactionState;
        try {
          dodged = await page.waitFor<BrowserReactionState>(
            readReactionStateExpression,
            (state) =>
              state.hazardFeedback === "arena-hazard-miss" &&
              state.hazardFeedbackCue === "" &&
              state.playerHurtCue !== "player-hurt-forge-collapse",
            2500
          );
        } finally {
          await page.keyUp("ArrowUp");
        }

        expect(dodged.playerY).toBeLessThan(telegraph.playerY - 36);
        expect(dodged.playerHurtCue).not.toBe("player-hurt-forge-collapse");
      });
    } finally {
      await server.close();
    }
  }, 180000);

  it("operates shop, smith, trade, and auction through real browser clicks and persists them", async () => {
    const server = await startViteServer();
    const seededState = createTownEcosystemState();
    const echoGearId = browserEcosystemEchoOwnedId();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, seededState);

        await page.click('[data-mode="shop"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "shop",
          5000
        );

        await buyLiuliGiftPackThroughRealClicks(page);
        const bought = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) =>
            state.toast.includes("礼包") &&
            state.saved?.shop.purchasedSkus.includes("liuli-gift-pack") === true &&
            state.saved?.shop.boxes["ember-mythic-box"] === 3,
          3000
        );

        await page.click('[data-box-id="ember-mythic-box"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) =>
            state.toast.includes("箱子") &&
            state.saved?.shop.boxes["ember-mythic-box"] === 2 &&
            (state.saved?.player.inventory.length ?? 0) > (bought.saved?.player.inventory.length ?? 0),
          3000
        );

        await page.click('[data-mode="smith"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "smith",
          3000
        );

        const reinforced = await reinforceGearThroughRealClicks(page, echoGearId);
        const arcShardBeforeAmplify = reinforced.saved?.player.currencies.arcShard ?? 0;

        await page.click(`[data-app-action="amplify"][data-gear-id="${echoGearId}"]`);
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.toast.includes("增幅") && (state.saved?.player.currencies.arcShard ?? arcShardBeforeAmplify) < arcShardBeforeAmplify,
          3000
        );

        await page.click('[data-mode="auction"]');
        const auctionReady = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "auction",
          3000
        );
        const currencyBeforeTrade = JSON.stringify(auctionReady.saved?.player.currencies);

        await page.click("[data-trade-offer-id]");
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.toast.includes("交易完成") && JSON.stringify(state.saved?.player.currencies) !== currencyBeforeTrade,
          3000
        );

        await page.click('[data-auction-gear-id]:not([data-auction-gear-id=""])');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.toast.includes("寄售") && state.saved?.market.auctions.length === 1,
          3000
        );

        await page.click('[data-app-action="resolve-auctions"]');
        const resolved = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.toast.includes("拍卖结算") && state.saved?.market.turn === 1 && state.saved?.market.auctions.length === 0,
          3000
        );

        await page.reload();
        const reloaded = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) =>
            state.appMode === "town" &&
            state.saved?.shop.purchasedSkus.includes("liuli-gift-pack") === true &&
            state.saved?.shop.boxes["ember-mythic-box"] === 2 &&
            state.saved?.market.turn === 1,
          15000
        );

        expect(reloaded.saved?.player.inventory.some((item) => item.instanceId === echoGearId && item.reinforceLevel === 1)).toBe(true);
        expect(reloaded.saved?.shop.ownedCosmetics.length).toBeGreaterThan(0);
        expect(resolved.saved?.market.auctions).toHaveLength(0);
      });
    } finally {
      await server.close();
    }
  }, 90000);

  it("reaches Taotie phase three then dodges world devour into its live armor-break window", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await page.setViewport(1440, 900);
        await enterDungeonWithKeyboard(page);
        await page.evaluate<boolean>(installStrictCombatRecorderExpression);
        await clearCurrentRoomWithKeyboard(page);
        await walkThroughOpenGate(page);
        await clearCurrentRoomWithKeyboard(page, 28);
        await walkThroughOpenGate(page);

        const phaseThree = await triggerBossPhaseThreeWithKeyboard(page);
        expect(phaseThree.bossPhase).toBe("3");
        const phaseThreeHud = await page.waitFor<BrowserBossHudState>(
          readBossHudStateExpression,
          (state) => state.visible && state.phase === "3" && state.armorMax === 120,
          3000
        );
        expect(phaseThreeHud.name).toBe("饕餮监工");
        const phaseThreeEvidence = await page.waitFor<BrowserStrictCombatEvidence>(
          readStrictCombatEvidenceExpression,
          (evidence) => evidence.sawBossPhaseThree && evidence.sawBossPhaseThreeVfx,
          3000
        );
        expect(phaseThreeEvidence.sawBossPhaseThreeVfx).toBe(true);

        await page.keyDown("ArrowUp");
        let windup: BrowserStrictCombatState;
        let broken: BrowserStrictCombatEvidence;
        try {
          windup = await page.waitFor<BrowserStrictCombatState>(
            readStrictCombatStateExpression,
            (state) =>
              state.objective === "active" &&
              state.bossPhase === "3" &&
              state.enemies.some(
                (enemy) =>
                  enemy.skill === "taotie-world-devour" &&
                  enemy.stage === "windup" &&
                  enemy.animationName.includes("taotie-world-devour")
              ),
            9000
          );
          const windupHud = await page.waitFor<BrowserBossHudState>(
            readBossHudStateExpression,
            (state) => state.castSkillId === "taotie-world-devour" && state.castStage === "windup" && state.castProgress > 0,
            1200
          );
          expect(windupHud.phase).toBe("3");
          const taotieWindup = await page.waitFor<BrowserMonsterSpriteState>(
            readMonsterSpriteStateExpression,
            (state) => state.enemies.some((enemy) =>
              enemy.kind === "boss" &&
              enemy.atlas === "taotie-overseer" &&
              enemy.skill === "taotie-world-devour" &&
              enemy.skillStage === "windup" &&
              enemy.frame === 8 &&
              enemy.oldArtOpacity === "0"
            ),
            1200
          );
          const activeTaotie = taotieWindup.enemies.find((enemy) => enemy.kind === "boss");
          expect(activeTaotie?.spriteState).toBe("monster-skill-taotie-world-devour");
          expect(activeTaotie?.background).toContain("taotie-overseer-atlas.png");
          await page.captureScreenshot(`${process.cwd().replace(/\\/g, "/")}/.codex-local/tmp/articulated-model-acceptance/taotie-world-devour-windup.png`);
          await page.waitFor<BrowserStrictCombatState>(
            readStrictCombatStateExpression,
            (state) => state.enemies.every((enemy) => enemy.skill !== "taotie-world-devour" || enemy.stage === "none"),
            3000
          );
          await page.waitFor<BrowserStrictCombatState>(
            readStrictCombatStateExpression,
            (state) =>
              state.enemies.some(
                (enemy) => enemy.skill === "taotie-world-devour" && enemy.stage === "windup" && enemy.progress >= 0.38
              ),
            12000
          );
          await page.pressKey("KeyC");
          const jumped = await page.waitFor<BrowserStrictCombatState>(
            readStrictCombatStateExpression,
            (state) => state.playerAirborne === "true",
            600
          );
          expect(jumped.playerAirborne).toBe("true");
          broken = await page.waitFor<BrowserStrictCombatEvidence>(
            readStrictCombatEvidenceExpression,
            (evidence) => evidence.sawWorldDevourVfx && evidence.sawWorldDevourArmorBreak,
            4000
          );
        } finally {
          await page.keyUp("ArrowUp");
        }

        expect(windup.enemies.some((enemy) => enemy.skill === "taotie-world-devour")).toBe(true);
        expect(broken.sawWorldDevourVfx).toBe(true);
        expect(broken.sawWorldDevourArmorBreak).toBe(true);
        const brokenHud = await page.waitFor<BrowserBossHudState>(
          readBossHudStateExpression,
          (state) => state.armorState === "broken" && state.breakRemainingMs > 0,
          1200
        );
        expect(brokenHud.armorCurrent).toBe(0);

        await page.setViewport(390, 844);
        const mobileHud = await page.waitFor<BrowserBossHudState>(
          readBossHudStateExpression,
          (state) => state.visible && state.width > 340 && state.width <= 374,
          1200
        );
        expect(mobileHud.overlapsStatus).toBe(false);
        expect(mobileHud.overlapsCombo).toBe(false);
      });
    } finally {
      await server.close();
    }
  }, 150000);

  it("persists real settings slider input across a browser reload", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await page.waitFor<BrowserAppModeState>(
          readAppModeStateExpression,
          (state) => state.appMode === "town" && state.townScene === "true",
          5000
        );
        await page.click('[data-mode="settings"]');
        await page.waitFor<BrowserAudioSettingsState>(
          readAudioSettingsStateExpression,
          (state) => state.appMode === "settings" && state.music === 0.75,
          5000
        );

        await page.click('[data-volume-kind="music"]');
        await page.pressKey("ArrowLeft");
        const changed = await page.waitFor<BrowserAudioSettingsState>(
          readAudioSettingsStateExpression,
          (state) => state.music !== 0.75 && state.saved?.music === state.music,
          3000
        );

        await page.reload();
        const restored = await page.waitFor<BrowserAudioSettingsState>(
          readAudioSettingsStateExpression,
          (state) => state.appMode === "town" && state.music === changed.music && state.saved?.music === changed.music,
          15000
        );

        expect(restored.master).toBe(0.9);
        expect(restored.sfx).toBe(0.85);
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("turns in a ready main quest and closes an active briefing through real keys", async () => {
    const server = await startViteServer();
    const readyState = createInitialState();
    readyState.player.quests["prologue-ember-warden"] = "ready";
    const goldBefore = readyState.player.currencies.gold;

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, readyState);
        await page.click('[data-mode="quests"]');
        const opened = await openQuestDialogueThroughRealClick(page, "prologue-ember-warden", "turn-in");

        expect(opened.step).toBe(0);
        expect(opened.stepCount).toBe(3);
        expect(opened.npcId).toBe("guild-archivist");
        expect(opened.dialogueText.length).toBeGreaterThan(12);
        expect(opened.topNavVisible).toBe(false);
        expect(opened.portraitBackground).toContain("story-npc-atlas.png");
        expect(opened.portraitAnimation).toContain("story-portrait-enter");
        expect(opened.dialogueAnimation).toContain("story-dialogue-enter");
        expect(opened.saved?.player.quests["prologue-ember-warden"]).toBe("ready");

        await completeOpenQuestDialogueWithKeyboard(page, "prologue-ember-warden");
        const completed = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) =>
            state.appMode === "quests" &&
            state.saved?.player.quests["prologue-ember-warden"] === "completed" &&
            state.saved.player.quests["smith-first-spark"] === "active" &&
            state.saved.player.unlockedDungeons.includes("liuli-furnace"),
          4000
        );

        expect(completed.saved?.player.currencies.gold).toBe(goldBefore + 600);

        const briefing = await openQuestDialogueThroughRealClick(page, "smith-first-spark", "briefing");
        const goldBeforeBriefing = briefing.saved?.player.currencies.gold;
        await page.pressKey("Escape");
        const closed = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "quests" && state.saved?.player.quests["smith-first-spark"] === "active",
          3000
        );

        expect(closed.saved?.player.currencies.gold).toBe(goldBeforeBriefing);
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("advances chapter two and the epilogue through real trade, amplify, shop, and quest clicks", async () => {
    const server = await startViteServer();
    const seededState = createChapterTwoQuestState();
    const echoGearId = browserEcosystemEchoOwnedId();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, seededState);

        await page.click('[data-mode="auction"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "auction",
          3000
        );
        await completeChapterTwoTradeThroughRealClicks(page);

        await page.click('[data-mode="quests"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "quests",
          3000
        );
        await turnInQuestThroughRealKeys(page, "chapter-two-trade-contract");
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) =>
            state.saved?.player.quests["chapter-two-trade-contract"] === "completed" &&
            state.saved.player.quests["chapter-two-resonance"] === "active",
          3000
        );

        await page.click('[data-mode="smith"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "smith",
          3000
        );
        await page.click(`[data-app-action="amplify"][data-gear-id="${echoGearId}"]`);
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.saved?.player.quests["chapter-two-resonance"] === "ready",
          3000
        );

        await page.click('[data-mode="quests"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "quests",
          3000
        );
        await turnInQuestThroughRealKeys(page, "chapter-two-resonance");
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.saved?.player.quests["epilogue-market-oath"] === "active",
          3000
        );

        await page.click('[data-mode="shop"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "shop",
          3000
        );
        await page.click('[data-shop-sku="liuli-gift-pack"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.saved?.player.quests["epilogue-market-oath"] === "ready",
          3000
        );

        await page.click('[data-mode="quests"]');
        await page.waitFor<{ appMode: string; disabled: boolean; questId: string }>(
          `(() => {
            const button = document.querySelector('[data-quest-id="epilogue-market-oath"]');
            return {
              appMode: document.querySelector(".app-shell")?.getAttribute("data-app-mode") ?? "",
              disabled: Boolean(button?.hasAttribute("disabled")),
              questId: button?.getAttribute("data-quest-id") ?? ""
            };
          })()`,
          (state) => state.appMode === "quests" && state.questId === "epilogue-market-oath" && !state.disabled,
          3000
        );
        await turnInQuestThroughRealKeys(page, "epilogue-market-oath");
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.saved?.player.quests["epilogue-market-oath"] === "completed",
          3000
        );

        await page.reload();
        const restored = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "town" && state.saved?.player.quests["epilogue-market-oath"] === "completed",
          15000
        );

        expect(restored.saved?.player.quests["chapter-two-trade-contract"]).toBe("completed");
        expect(restored.saved?.player.quests["chapter-two-resonance"]).toBe("completed");
      });
    } finally {
      await server.close();
    }
  }, 90000);

  it("selects a class, advances its build, equips a core, and persists the progression", async () => {
    const server = await startViteServer();
    const seededState = createReadyClassProgressionState();
    const coreGearId = browserProgressionCoreGearId(seededState);
    const alternateCoreGearId = browserProgressionAlternateCoreGearId(seededState, coreGearId);

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, seededState);

        await page.click('[data-mode="classes"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "classes",
          3000
        );

        await page.click('[data-class-id="liuli-blademage"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.toast.includes("职业") && state.saved?.player.classId === "liuli-blademage",
          3000
        );

        await page.click('[data-advancement-id="flowing-light-swordmaster"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) =>
            state.toast.includes("转职") &&
            state.saved?.player.classId === "liuli-blademage" &&
            state.saved?.player.advancementId === "flowing-light-swordmaster",
          3000
        );

        await page.click('[data-mode="inventory"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "inventory",
          3000
        );

        await page.click(`[data-app-action="equip-item"][data-gear-id="${coreGearId}"]`);
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.toast.includes("装备") && state.saved?.player.equipment.core === coreGearId,
          3000
        );
        await page.click('[data-app-action="save-loadout"][data-loadout-index="0"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.saved?.player.loadouts[0]?.core === coreGearId,
          3000
        );
        await page.click(`[data-app-action="equip-item"][data-gear-id="${alternateCoreGearId}"]`);
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.saved?.player.equipment.core === alternateCoreGearId,
          3000
        );
        await page.click('[data-app-action="apply-loadout"][data-loadout-index="0"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.saved?.player.equipment.core === coreGearId && state.saved.player.loadouts[0]?.core === coreGearId,
          3000
        );

        await page.reload();
        const restored = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) =>
            state.appMode === "town" &&
            state.saved?.player.classId === "liuli-blademage" &&
            state.saved?.player.advancementId === "flowing-light-swordmaster" &&
            state.saved?.player.equipment.core === coreGearId,
          15000
        );

        expect(restored.saved?.player.classResources["liuli-blademage"]).toBeDefined();
        expect(restored.saved?.player.loadouts).toHaveLength(3);
      });
    } finally {
      await server.close();
    }
  }, 90000);

  it("drives Iron Forge Vanguard shield counter skills with real class clicks and keyboard input", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, createReadyIronVanguardState());
        await page.click('[data-mode="classes"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "classes",
          3000
        );
        await page.click('[data-class-id="iron-forge-guardian"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.saved?.player.classId === "iron-forge-guardian",
          3000
        );
        await page.click('[data-advancement-id="black-furnace-vanguard"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.saved?.player.advancementId === "black-furnace-vanguard",
          3000
        );
        await page.click('[data-mode="town"]');
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) => state.objective === "active" && state.liveEnemyCount === "2",
          5000
        );
        await page.evaluate<void>(`
(() => {
  const evidence = [];
  const capture = () => {
    const player = document.querySelector(".combat-player");
    const vfx = document.querySelector("[data-player-skill-vfx]");
    evidence.push({
      activeSkill: player?.getAttribute("data-active-skill-id") ?? "",
      cue: vfx?.getAttribute("data-vfx-cue") ?? "",
      stage: player?.getAttribute("data-player-skill-stage") ?? ""
    });
  };
  const observer = new MutationObserver(capture);
  observer.observe(document.body, { attributes: true, childList: true, subtree: true });
  capture();
  globalThis.__ironPalmEvidence = evidence;
  globalThis.__ironPalmObserver = observer;
})()
`);
        await page.pressKey("KeyA");
        const palmWindup = await page.waitFor<BrowserIronVanguardState>(
          readIronVanguardStateExpression,
          (state) =>
            state.classId === "iron-forge-guardian" &&
            state.advancementId === "black-furnace-vanguard" &&
            state.activeSkill === "iron-palm" &&
            state.playerMotion === "skill" &&
            state.skillMove === "iron-palm" &&
            state.skillStage === "windup" &&
            state.skillVfx === "iron-palm",
          3000
        );
        expect(palmWindup.skillMove).toBe("iron-palm");
        const palmImpactSeen = await page.waitFor<boolean>(
          `Boolean(globalThis.__ironPalmEvidence?.some((entry) => entry.activeSkill === "iron-palm" && entry.stage === "active" && entry.cue === "iron-shield-jab"))`,
          Boolean,
          1000
        );
        expect(palmImpactSeen).toBe(true);

        await waitInBrowser(page, 480);
        await page.pressKey("KeyS");
        const guard = await page.waitFor<BrowserIronVanguardState>(
          readIronVanguardStateExpression,
          (state) =>
            state.activeSkill === "anvil-guard" &&
            state.shieldActive === "true" &&
            state.statusVfx === "anvil-guard" &&
            state.statusVfxCue === "anvil-guard-open",
          3000
        );
        expect(guard.playerMotion).toBe("shield");

        await waitInBrowser(page, 560);
        await page.pressKey("Space");
        const aegis = await page.waitFor<BrowserIronVanguardState>(
          readIronVanguardStateExpression,
          (state) =>
            state.activeSkill === "black-furnace-aegis" &&
            state.shieldActive === "true" &&
            state.statusVfx === "black-furnace-aegis" &&
            state.statusVfxCue === "black-aegis-open",
          3000
        );

        expect(aegis.skillVfx).toBe("black-furnace-aegis");

        await moveIntoLiveEnemyRange(page);
        const enemyAttack = await page.waitFor<BrowserIronVanguardState>(
          readIronVanguardStateExpression,
          (state) => state.enemyVfx !== "" && state.enemyVfxCue !== "",
          3500
        );
        expect(enemyAttack.enemyVfx).toMatch(/^ash-(ember-spit|crawler-burst)$/);
      });
    } finally {
      await server.close();
    }
  }, 75000);

  it("spends a skill point through the real class tree and keeps the rank after reload", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, createSkillTreeState());
        await page.click('[data-mode="classes"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "classes",
          3000
        );
        await page.click('[data-skill-upgrade-id="spark-combo"]');
        const upgraded = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.saved?.player.skillPoints === 0 && state.saved.player.skillLevels["spark-combo"] === 2,
          3000
        );

        await page.reload();
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "town" && state.saved?.player.skillLevels["spark-combo"] === 2,
          15000
        );
        await enterDungeonWithKeyboard(page);
        const combatRank = await page.waitFor<{ rank: string; activeSkill: string }>(
          `(() => {
            const slot = document.querySelector('[data-combat-skill-id="spark-combo"]');
            return {
              rank: slot?.getAttribute("data-skill-rank") ?? "",
              activeSkill: document.querySelector(".combat-player")?.getAttribute("data-active-skill-id") ?? ""
            };
          })()`,
          (state) => state.rank === "2",
          5000
        );

        expect(upgraded.saved?.player.skillLevels["spark-combo"]).toBe(2);
        expect(combatRank.rank).toBe("2");
        await page.pressKey("KeyA");
        await page.waitFor<{ activeSkill: string }>(
          `(() => ({ activeSkill: document.querySelector(".combat-player")?.getAttribute("data-active-skill-id") ?? "" }))()`,
          (state) => state.activeSkill === "spark-combo",
          3000
        );
      });
    } finally {
      await server.close();
    }
  }, 75000);

  it("resets allocated skill ranks through the real class tree and keeps the refund after reload", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, createAllocatedSkillTreeState());
        await page.click('[data-mode="classes"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.appMode === "classes",
          3000
        );
        await page.click('[data-app-action="reset-skill-tree"]');
        const reset = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) =>
            state.saved?.player.skillPoints === 3 &&
            Object.keys(state.saved.player.skillLevels).length === 0 &&
            state.saved.player.currencies.gold === 0,
          3000
        );

        await page.reload();
        const reloaded = await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) =>
            state.appMode === "town" &&
            state.saved?.player.skillPoints === 3 &&
            Object.keys(state.saved.player.skillLevels).length === 0 &&
            state.saved.player.currencies.gold === 0,
          15000
        );

        expect(reset.saved?.player.currencies.gold).toBe(0);
        expect(reloaded.saved?.player.skillPoints).toBe(3);
      });
    } finally {
      await server.close();
    }
  }, 75000);

  it("returns Ink from real marked-target detonation through class clicks and keyboard input", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, createReadyInkContractState());
        await page.click('[data-mode="classes"]');
        await page.waitFor<BrowserTownEcosystemState>(readTownEcosystemStateExpression, (state) => state.appMode === "classes", 3000);
        await page.click('[data-class-id="ink-shadow-ranger"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.saved?.player.classId === "ink-shadow-ranger",
          3000
        );
        await page.click('[data-advancement-id="night-contract-hunter"]');
        await page.waitFor<BrowserTownEcosystemState>(
          readTownEcosystemStateExpression,
          (state) => state.saved?.player.advancementId === "night-contract-hunter",
          3000
        );
        await page.click('[data-mode="town"]');
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserInkMarkState>(
          readInkMarkStateExpression,
          (state) => state.appMode === "combat" && state.classId === "ink-shadow-ranger" && state.advancementId === "night-contract-hunter",
          5000
        );

        await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) => state.objective === "active" && state.playerHurtLockActive === "false",
          1800
        );
        await page.pressKey("KeyD");
        const marked = await page.waitFor<BrowserInkMarkState>(
          readInkMarkStateExpression,
          (state) => state.activeSkill === "marking-bolt" && state.resourceCurrent === 88 && state.marks.some((marks) => marks === 2),
          3000
        );

        expect(marked.skillVfx).toBe("marking-bolt");
        await page.evaluate<void>("new Promise((resolve) => setTimeout(resolve, 520))");
        await page.pressKey("Space");
        const detonated = await page.waitFor<BrowserInkMarkState>(
          readInkMarkStateExpression,
          (state) =>
            state.resourceCurrent === 50 &&
            state.detonationImpact === "night-mark-detonation" &&
            state.detonationCue === "night-mark-burst" &&
            state.marks.every((marks) => marks === 0),
          4000
        );
      });
    } finally {
      await server.close();
    }
  }, 75000);

  it("shows Liuli Furnace enemy windup, model motion, and VFX through real browser control", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, createLiuliUnlockedState());
        await enterDungeonWithKeyboard(page, "Enter", "liuli-furnace");
        await page.waitFor<BrowserLiuliEnemyState>(
          readLiuliEnemyStateExpression,
          (state) => state.dungeonId === "liuli-furnace" && state.roomIndex === "0" && state.enemies.length === 2,
          5000
        );

        await page.keyDown("ArrowRight");
        try {
          await page.waitFor<BrowserRoomFlowState>(
            readRoomFlowStateExpression,
            (state) => Number(state.playerX) >= 340,
            1800
          );
        } finally {
          await page.keyUp("ArrowRight");
        }

        const active = await page.waitFor<BrowserLiuliEnemyState>(
          readLiuliEnemyStateExpression,
          (state) =>
            state.enemies.some((enemy) => enemy.skill.startsWith("liuli-") && enemy.stage !== "none" && enemy.animationName !== "none") &&
            state.enemyVfx.startsWith("liuli-") && state.enemyVfxCue.length > 0,
          6000
        );

        expect(active.enemies.some((enemy) => enemy.skill === "liuli-glass-spray" || enemy.skill === "liuli-splinter-rush")).toBe(true);
        expect(active.enemyVfx).toMatch(/^liuli-(glass-spray|splinter-rush)$/);
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("auto-saves combat rewards and restores them after a real browser reload", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) => state.objective === "active" && state.roomIndex === "0" && state.liveEnemyCount === "2",
          5000
        );

        await clearCurrentRoomWithKeyboard(page);
        await walkThroughOpenGate(page);
        const nextRoom = await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) => state.objective === "active" && state.roomIndex === "1",
          4000
        );

        expect(nextRoom.liveEnemyCount).toBe("3");

        const savedBeforeReload = await page.waitFor<BrowserSavedState>(
          readSavedStateExpression,
          (state) =>
            state.appMode === "combat" &&
            state.saveKey === SAVE_KEY &&
            state.rawSaveExists &&
            state.playerGold > 0 &&
            state.playerGold === state.savedGold &&
            state.inventoryCount === state.savedInventoryCount,
          1500
        );

        expect(savedBeforeReload.savedIronDust).toBeGreaterThan(0);
        expect(savedBeforeReload.savedArcShard).toBe(savedBeforeReload.playerArcShard);
        expect(savedBeforeReload.savedInventoryCount).toBeGreaterThan(0);

        await page.reload();

        const restored = await page.waitFor<BrowserSavedState>(
          readSavedStateExpression,
          (state) =>
            state.appMode === "town" &&
            state.saveKey === SAVE_KEY &&
            state.rawSaveExists &&
            state.playerGold === savedBeforeReload.savedGold &&
            state.inventoryCount === savedBeforeReload.savedInventoryCount,
          15000
        );

        expect(restored.playerIronDust).toBe(savedBeforeReload.savedIronDust);
        expect(restored.playerArcShard).toBe(savedBeforeReload.savedArcShard);
      });
    } finally {
      await server.close();
    }
  }, 90000);

  it("earns a targeted Warrior epic through real keyboard combat and persists the exact drop", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await seedSaveAndReload(page, createInitialState());
        await page.evaluate<void>(`document.querySelector('[data-prepare-dungeon="cinder-kiln-alley"]')?.focus()`);
        await page.pressKey("Enter");
        await page.waitFor<BrowserDungeonDifficultyState>(
          readDungeonDifficultyStateExpression,
          (state) => state.appMode === "dungeon-prep" && state.selectedDifficulty === "normal",
          5000
        );
        await page.pressKey("ArrowRight");
        await page.pressKey("ArrowRight");
        await page.waitFor<BrowserDungeonDifficultyState>(
          readDungeonDifficultyStateExpression,
          (state) => state.selectedDifficulty === "warrior" && state.fatigueCost === 10,
          5000
        );
        await page.pressKey("Enter");
        await page.waitFor<BrowserDungeonDifficultyState>(
          readDungeonDifficultyStateExpression,
          (state) => state.appMode === "combat" && state.combatDifficulty === "warrior",
          5000
        );

        await clearCurrentRoomWithKeyboard(page, 28);
        await walkThroughOpenGate(page);
        const earned = await page.waitFor<BrowserLootResultState>(
          readLootResultStateExpression,
          (state) =>
            state.appMode === "combat" &&
            state.combatDifficulty === "warrior" &&
            state.roomIndex === "0" &&
            state.rarity === "epic" &&
            state.gearId.length > 0 &&
            state.savedGearIds.includes(state.gearId),
          5000
        );

        expect(catalog.dungeons.find((dungeon) => dungeon.id === "cinder-kiln-alley")?.lootSetIds).toContain(earned.setId);
        expect(earned.slot).not.toBe("");
        expect(earned.gold).toBe(216);

        await page.reload();
        const restored = await page.waitFor<BrowserLootResultState>(
          readLootResultStateExpression,
          (state) => state.appMode === "town" && state.savedGearIds.includes(earned.gearId),
          15000
        );

        expect(restored.gearId).toBe("");
        expect(restored.savedGearIds).toContain(earned.gearId);
      });
    } finally {
      await server.close();
    }
  }, 90000);

  it("shows natural monster windup, skill VFX, and model motion in the live browser", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await page.setViewport(1440, 900);
        await page.evaluate<boolean>(installEnemyAudioRecorderExpression);
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserCombatState>(readCombatStateExpression, (state) => state.objective === "active", 5000);
        const initial = await page.evaluate<BrowserEnemyAttackState>(readEnemyAttackStateExpression);
        await page.waitFor<boolean>(
          `(() => {
            const image = document.querySelector(".combat-background-art");
            return Boolean(image && image.complete && image.naturalWidth > 0);
          })()`,
          (loaded) => loaded,
          3000
        );
        await waitInBrowser(page, 120);

        const initialById = new Map(initial.enemies.map((enemy) => [enemy.id, enemy]));
        const approaching = await page.waitFor<BrowserEnemyAttackState>(
          readEnemyAttackStateExpression,
          (state) =>
            state.enemies.some((enemy) => {
              const start = initialById.get(enemy.id);
              return Boolean(
                start &&
                enemy.aiState === "approach" &&
                enemy.motion === "approach" &&
                enemy.x < start.x &&
                enemy.y !== start.y &&
                enemy.animationName === "monster-approach-stride" &&
                enemy.spriteState === "run" &&
                enemy.spriteFrame >= 4 &&
                enemy.spriteFrame <= 7
              );
            }),
          2200
        );
        const pursuingEnemy = approaching.enemies.find((enemy) => enemy.aiState === "approach");

        expect(pursuingEnemy?.motion).toBe("approach");
        expect(pursuingEnemy?.animationName).toBe("monster-approach-stride");
        expect(pursuingEnemy?.spriteState).toBe("run");
        await page.captureScreenshot(`${process.cwd().replace(/\\/g, "/")}/.codex-local/tmp/articulated-model-acceptance/enemy-pursuit.png`);

        const windup = await page.waitFor<BrowserEnemyAttackState>(
          readEnemyAttackStateExpression,
          (state) =>
            state.vfx === "" &&
            state.enemies.some(
              (enemy) => enemy.stage === "windup" && enemy.skill !== "" && enemy.skill === state.telegraph
            ),
          2500
        );
        const windupEnemy = windup.enemies.find(
          (enemy) => enemy.stage === "windup" && enemy.skill !== "" && enemy.skill === windup.telegraph
        );

        expect(windup.objective).toBe("active");
        expect(windup.telegraph).toBe(windupEnemy?.skill);
        expect(windup.telegraphShape).not.toBe("");
        expect(windup.vfx).toBe("");
        expect(windupEnemy?.animationName).not.toBe("none");
        expect(windupEnemy?.animationName).not.toBe("monster-idle-breathe");

        const activeVfx = await page.waitFor<BrowserEnemyAttackState>(
          readEnemyAttackStateExpression,
          (state) =>
            state.vfx !== "" &&
            state.vfxCue !== "" &&
            (state.vfxRingAnimation !== "none" || state.vfxCoreAnimation !== "none" || state.vfxTrailAnimation !== "none"),
          3000
        );

        expect(["ash-ember-spit", "ash-crawler-burst"]).toContain(activeVfx.vfx);
        expect(["active", "miss"]).toContain(activeVfx.vfxPhase);
        expect(activeVfx.vfxCue).toMatch(/ash-(ember-spit-impact|crawler-burst-explode)/);
        expect([activeVfx.vfxRingAnimation, activeVfx.vfxCoreAnimation, activeVfx.vfxTrailAnimation]).not.toEqual([
          "none",
          "none",
          "none"
        ]);

        await page.keyDown("ArrowRight");
        await page.waitFor<BrowserCombatState>(
          readCombatStateExpression,
          (state) => state.playerX >= 34,
          1800
        );
        await page.keyUp("ArrowRight");

        const playerHit = await page.waitFor<BrowserEnemyAttackState>(
          readEnemyAttackStateExpression,
          (state) =>
            state.vfxPhase === "active" &&
            state.playerHurtCue !== "" &&
            state.playerAnimation !== "" &&
            state.playerAnimation !== "none" &&
            state.playerAnimation !== "player-hurt-react",
          3500
        );

        expect(["player-hurt-light", "player-hurt-heavy"]).toContain(playerHit.playerHurtCue);
        expect(playerHit.playerAnimation).toBe(playerHit.playerHurtCue);
        const audioPlayback = await page.waitFor<BrowserEnemyAudioPlayback[]>(
          readEnemyAudioPlaybackExpression,
          (state) =>
            state.some((event) => event.commandId.startsWith("enemy-windup-")) &&
            state.some((event) => event.commandId.startsWith("enemy-impact-")) &&
            state.some((event) => event.commandId.startsWith("player-hurt-")),
          1800
        );
        const hurtIndex = audioPlayback.findIndex((event) => event.commandId.startsWith("player-hurt-"));
        const impactIndex = audioPlayback.findLastIndex(
          (event, index) => index < hurtIndex && event.commandId.startsWith("enemy-impact-")
        );
        const windupIndex = audioPlayback.findLastIndex(
          (event, index) => index < impactIndex && event.commandId.startsWith("enemy-windup-")
        );
        expect(windupIndex).toBeGreaterThanOrEqual(0);
        expect(impactIndex).toBeGreaterThan(windupIndex);
        expect(hurtIndex).toBeGreaterThan(impactIndex);
        expect(audioPlayback.every((event) => event.channel === "sfx" && event.noteCount >= 3)).toBe(true);
      });
    } finally {
      await server.close();
    }
  }, 60000);
});

async function clearCurrentRoomWithKeyboard(page: RealBrowserAppPage, maxAttempts = 18): Promise<BrowserRoomFlowState> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const state = await page.evaluate<BrowserRoomFlowState>(readRoomFlowStateExpression);
    if (state.liveEnemyCount === "0") {
      break;
    }

    if (state.objective === "failed") {
      await page.pressKey("Digit2");
      await page.waitFor<BrowserRoomFlowState>(
        readRoomFlowStateExpression,
        (next) => next.objective === "active" && next.playerHurtLockActive === "false",
        3000
      );
      continue;
    }

    if (state.playerRecoveryAvailable === "true") {
      await page.pressKey("KeyC");
      await waitInBrowser(page, 280);
      continue;
    }

    if (state.playerHurtLockActive === "true") {
      await page.waitFor<BrowserRoomFlowState>(
        readRoomFlowStateExpression,
        (next) => next.objective !== "active" || next.playerRecoveryAvailable === "true" || next.playerHurtLockActive === "false",
        1200
      );
      continue;
    }

    const strictState = await page.evaluate<BrowserStrictCombatState>(readStrictCombatStateExpression);
    const boss = strictState.enemies.find((enemy) => enemy.kind === "boss");
    const bossWindup = boss?.stage === "windup";

    if (bossWindup) {
      if ((boss?.progress ?? 0) < 0.34) {
        await waitInBrowser(page, 180);
      }
      await page.keyDown("ArrowUp");
      await waitInBrowser(page, 150);
      await page.keyUp("ArrowUp");
      await page.pressKey("KeyC");
      await waitInBrowser(page, 360);
      continue;
    }

    if (boss) {
      await moveIntoLiveEnemyRange(page);
      await page.pressKey("KeyA");
      await waitInBrowser(page, 300);
      await page.pressKey("KeyS");
      await waitInBrowser(page, 340);
      continue;
    }

    await moveIntoLiveEnemyRange(page);
    await page.pressKey("KeyA");
    await waitInBrowser(page, 430);
    await page.pressKey("KeyS");
    await waitInBrowser(page, 560);
    await page.pressKey("KeyX");
    await waitInBrowser(page, 280);
    await page.pressKey("KeyX");
    await waitInBrowser(page, 320);
  }

  return page.waitFor<BrowserRoomFlowState>(
    readRoomFlowStateExpression,
    (state) => state.objective === "cleared" && state.liveEnemyCount === "0" && state.gateState !== "locked",
    5000
  );
}

async function triggerBossPhaseTwoWithKeyboard(page: RealBrowserAppPage, maxAttempts = 40): Promise<BrowserStrictCombatState> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const state = await page.evaluate<BrowserStrictCombatState>(readStrictCombatStateExpression);
    if (state.bossPhase === "2") {
      return state;
    }

    await moveIntoLiveEnemyRange(page);
    await page.pressKey("KeyA");
    const afterSpark = await waitForBossPhaseTwoWithin(page, 430);
    if (afterSpark) {
      return afterSpark;
    }
    await page.pressKey("KeyS");
    const afterFollowUp = await waitForBossPhaseTwoWithin(page, 560);
    if (afterFollowUp) {
      return afterFollowUp;
    }
    await page.pressKey("KeyX");
    const afterLightOne = await waitForBossPhaseTwoWithin(page, 280);
    if (afterLightOne) {
      return afterLightOne;
    }
    await page.pressKey("KeyX");
    const afterLightTwo = await waitForBossPhaseTwoWithin(page, 320);
    if (afterLightTwo) {
      return afterLightTwo;
    }
  }

  return page.waitFor<BrowserStrictCombatState>(readStrictCombatStateExpression, (state) => state.bossPhase === "2", 5000);
}

async function triggerBossPhaseThreeWithKeyboard(page: RealBrowserAppPage, maxAttempts = 60): Promise<BrowserStrictCombatState> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const state = await page.evaluate<BrowserStrictCombatState>(readStrictCombatStateExpression);
    if (state.bossPhase === "3") {
      return state;
    }

    await moveIntoLiveEnemyRange(page);
    await page.pressKey("KeyA");
    await waitInBrowser(page, 430);
    await page.pressKey("KeyS");
    await waitInBrowser(page, 560);
    await page.pressKey("KeyX");
    await waitInBrowser(page, 280);
    await page.pressKey("KeyX");
    await waitInBrowser(page, 320);
  }

  return page.waitFor<BrowserStrictCombatState>(readStrictCombatStateExpression, (state) => state.bossPhase === "3", 5000);
}

async function waitForBossPhaseTwoWithin(page: RealBrowserAppPage, timeoutMs: number): Promise<BrowserStrictCombatState | undefined> {
  try {
    return await page.waitFor<BrowserStrictCombatState>(readStrictCombatStateExpression, (state) => state.bossPhase === "2", timeoutMs);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Timed out waiting for browser expression")) {
      return undefined;
    }

    throw error;
  }
}

async function walkThroughOpenGate(page: RealBrowserAppPage): Promise<BrowserRoomFlowState> {
  await alignWithExitGateLane(page);
  await page.keyDown("ArrowRight");
  try {
    await page.waitFor<BrowserRoomFlowState>(
      readRoomFlowStateExpression,
      (state) => state.gateTransition === "entering" && state.transitionState === "entering",
      5000
    );
  } finally {
    await page.keyUp("ArrowRight");
  }

  return page.waitFor<BrowserRoomFlowState>(
    readRoomFlowStateExpression,
    (state) => state.transitionState === "none" && state.objective === "active",
    4000
  );
}

async function walkThroughCompletionGateToTown(
  page: RealBrowserAppPage,
  confirmation: "Enter" | "Space" | "button" = "Enter"
): Promise<BrowserDungeonResultState> {
  const result = await reachDungeonResult(page);

  if (confirmation === "button") {
    await page.click("[data-confirm-dungeon-result='true']");
  } else {
    await page.pressKey(confirmation);
  }
  await page.waitFor<BrowserAppModeState>(
    readAppModeStateExpression,
    (state) => state.appMode === "town" && state.townScene === "true",
    8000
  );

  return result;
}

async function reachDungeonResult(page: RealBrowserAppPage): Promise<BrowserDungeonResultState> {
  await alignWithExitGateLane(page);
  const currentMode = await page.evaluate<BrowserAppModeState>(readAppModeStateExpression);

  if (currentMode.appMode === "combat") {
    await page.keyDown("ArrowRight");
    try {
      await page.waitFor<BrowserRoomFlowState>(
        readRoomFlowStateExpression,
        (state) => state.gateTransition === "entering" && state.transitionState === "entering",
        5000
      );
    } finally {
      await page.keyUp("ArrowRight");
    }
  }

  return page.waitFor<BrowserDungeonResultState>(
    readDungeonResultStateExpression,
    (state) => state.appMode === "dungeon-result" && state.confirmButton && !state.topNav && state.saveExists,
    8000
  );
}

async function alignWithExitGateLane(page: RealBrowserAppPage): Promise<void> {
  const state = await page.evaluate<BrowserRoomFlowState>(readRoomFlowStateExpression);
  const playerY = Number(state.playerY);

  if (playerY >= 320 && playerY <= 360) {
    return;
  }

  const directionKey: RealBrowserKeyCode = playerY < 320 ? "ArrowDown" : "ArrowUp";
  await page.keyDown(directionKey);
  try {
    await page.waitFor<BrowserRoomFlowState>(
      readRoomFlowStateExpression,
      (next) => {
        const nextPlayerY = Number(next.playerY);
        return next.objective === "" || next.objective === "failed" || (nextPlayerY >= 320 && nextPlayerY <= 360);
      },
      1800
    );
  } finally {
    await page.keyUp(directionKey);
  }
}

async function moveIntoLiveEnemyRange(page: RealBrowserAppPage): Promise<void> {
  const state = await page.evaluate<BrowserRoomFlowState>(readRoomFlowStateExpression);
  const playerX = Number(state.playerX);
  const liveEnemies = state.enemies.filter((enemy) => enemy.hp > 0);
  const target = liveEnemies.sort((left, right) => Math.abs(left.x - playerX) - Math.abs(right.x - playerX))[0];

  if (!target) {
    return;
  }

  const directionKey: RealBrowserKeyCode = target.x >= playerX ? "ArrowRight" : "ArrowLeft";
  const targetDistance = Math.abs(target.x - playerX);

  if (targetDistance > 108) {
    await page.keyDown(directionKey);
    try {
      await page.waitFor<BrowserRoomFlowState>(
        readRoomFlowStateExpression,
        (nextState) => {
          const nextPlayerX = Number(nextState.playerX);
          const nextTarget = nextState.enemies.find((enemy) => enemy.id === target.id);
          return (
            nextState.liveEnemyCount === "0" ||
            nextState.objective === "failed" ||
            nextState.playerHurtLockActive === "true" ||
            !nextTarget ||
            nextTarget.hp <= 0 ||
            Math.abs(nextTarget.x - nextPlayerX) <= 108
          );
        },
        2200
      );
    } finally {
      await page.keyUp(directionKey);
    }
  } else {
    await page.keyDown(directionKey);
    await waitInBrowser(page, 55);
    await page.keyUp(directionKey);
  }
}

async function moveIntoOpeningFlowingLightChainRange(page: RealBrowserAppPage): Promise<BrowserRoomFlowState> {
  await page.keyDown("ShiftLeft");
  await page.keyDown("ArrowRight");
  try {
    return await page.waitFor<BrowserRoomFlowState>(
      readRoomFlowStateExpression,
      (state) => Number(state.playerX) >= 348 && state.liveEnemyCount === "2",
      1200
    );
  } finally {
    await page.keyUp("ArrowRight");
    await page.keyUp("ShiftLeft");
  }
}

async function waitInBrowser(page: RealBrowserAppPage, ms: number): Promise<void> {
  await page.evaluate<void>(`new Promise((resolve) => setTimeout(resolve, ${ms}))`);
}

function createFlowingLightSwordmasterState() {
  const liuliState = selectBaseClass(createInitialState(), "liuli-blademage");
  const readyState = {
    ...liuliState,
    player: {
      ...liuliState.player,
      level: 15,
      heat: 100,
      classResources: {
        ...liuliState.player.classResources,
        "liuli-blademage": 100
      },
      dungeonDifficultyPreferences: {
        ...liuliState.player.dungeonDifficultyPreferences,
        "cinder-kiln-alley": "warrior" as const
      },
      quests: {
        ...liuliState.player.quests,
        "prologue-ember-warden": "ready" as const
      }
    }
  };

  return advanceClass(readyState, "flowing-light-swordmaster");
}

function createDefeatAcceptanceState(): GameState {
  const classState = selectBaseClass(createInitialState(), "ink-shadow-ranger");

  return {
    ...classState,
    player: {
      ...classState.player,
      consumables: {
        ...classState.player.consumables,
        "revival-token": 1
      },
      equipment: {},
      dungeonDifficultyPreferences: {
        ...classState.player.dungeonDifficultyPreferences,
        "cinder-kiln-alley": "warrior"
      }
    }
  };
}

function browserEcosystemEchoOwnedId(): string {
  const gear = catalog.gear.find((item) => item.amplification.echoSlot);

  if (!gear) {
    throw new Error("Expected at least one Echo Slot gear item for browser ecosystem acceptance");
  }

  return createOwnedGear(gear.id, "browser-echo").instanceId;
}

function createTownEcosystemState(): GameState {
  const baseState = createInitialState();
  const echoGear = catalog.gear.find((item) => item.amplification.echoSlot);

  if (!echoGear) {
    throw new Error("Expected at least one Echo Slot gear item for browser ecosystem acceptance");
  }

  return {
    ...baseState,
    player: {
      ...baseState.player,
      currencies: {
        ...baseState.player.currencies,
        gold: 20000,
        ironDust: 2000,
        arcShard: 500,
        valorToken: 10,
        tradeCredit: 10,
        protectionTicket: 3
      },
      inventory: [...baseState.player.inventory, createOwnedGear(echoGear.id, "browser-echo")]
    }
  };
}

function createChapterTwoQuestState(): GameState {
  const baseState = createTownEcosystemState();

  return {
    ...baseState,
    player: {
      ...baseState.player,
      quests: {
        ...baseState.player.quests,
        "prologue-ember-warden": "completed",
        "smith-first-spark": "completed",
        "chapter-liuli-furnace": "completed",
        "chapter-two-trade-contract": "active",
        "chapter-two-relic-study": "active",
        "chapter-two-resonance": "locked",
        "epilogue-market-oath": "locked"
      },
      unlockedDungeons: ["cinder-kiln-alley", "liuli-furnace"]
    }
  };
}

function createReadyClassProgressionState(): GameState {
  const baseState = createInitialState();

  return {
    ...baseState,
    player: {
      ...baseState.player,
      level: 15,
      quests: {
        ...baseState.player.quests,
        "prologue-ember-warden": "ready"
      },
      inventory: [
        ...baseState.player.inventory,
        createOwnedGear(browserProgressionAlternateCoreCatalogId(baseState), "browser-loadout")
      ]
    }
  };
}

function createReadyIronVanguardState(): GameState {
  const baseState = createInitialState();

  return {
    ...baseState,
    player: {
      ...baseState.player,
      level: 15,
      classResources: {
        ...baseState.player.classResources,
        "iron-forge-guardian": 100
      },
      quests: {
        ...baseState.player.quests,
        "prologue-ember-warden": "ready"
      }
    }
  };
}

function createReadyInkContractState(): GameState {
  const baseState = createInitialState();

  return {
    ...baseState,
    player: {
      ...baseState.player,
      level: 15,
      classResources: {
        ...baseState.player.classResources,
        "ink-shadow-ranger": 100
      },
      quests: {
        ...baseState.player.quests,
        "prologue-ember-warden": "ready"
      }
    }
  };
}

function createReadyCriticalBuildState(): GameState {
  const selected = selectBaseClass(createReadyInkContractState(), "ink-shadow-ranger");
  const advanced = advanceClass(selected, "night-contract-hunter");
  const accessories = ["bracelet", "ring"].map((slot) => {
    const gear = catalog.gear.find((item) => item.rarity === "rare" && item.setId === undefined && item.slot === slot);

    if (!gear) {
      throw new Error(`Expected rare ${slot} gear for critical browser acceptance`);
    }

    return createOwnedGear(gear.id, `critical-${slot}`);
  });

  return {
    ...advanced,
    player: {
      ...advanced.player,
      inventory: [...advanced.player.inventory, ...accessories],
      equipment: {
        ...advanced.player.equipment,
        bracelet: accessories[0].instanceId,
        ring: accessories[1].instanceId
      }
    }
  };
}

function createSkillTreeState(): GameState {
  const baseState = createInitialState();

  return {
    ...baseState,
    player: {
      ...baseState.player,
      level: 2,
      skillPoints: 1
    }
  };
}

function createAllocatedSkillTreeState(): GameState {
  const baseState = createInitialState();

  return {
    ...baseState,
    player: {
      ...baseState.player,
      level: 4,
      skillPoints: 0,
      skillLevels: {
        "spark-combo": 3,
        "cinder-uppercut": 2
      },
      currencies: {
        ...baseState.player.currencies,
        gold: skillResetGoldCost
      }
    }
  };
}

function createLiuliUnlockedState(): GameState {
  const baseState = createInitialState();

  return {
    ...baseState,
    player: {
      ...baseState.player,
      level: 4,
      unlockedDungeons: [...baseState.player.unlockedDungeons, "liuli-furnace"]
    }
  };
}

function browserProgressionCoreGearId(state: GameState): string {
  const core = state.player.inventory.find((owned) => catalog.gear.find((gear) => gear.id === owned.catalogGearId)?.slot === "core");

  if (!core) {
    throw new Error("Expected an unequipped starter core for browser progression acceptance");
  }

  return core.instanceId;
}

function browserProgressionAlternateCoreCatalogId(state: GameState): string {
  const starterCoreIds = new Set(
    state.player.inventory
      .filter((owned) => catalog.gear.find((gear) => gear.id === owned.catalogGearId)?.slot === "core")
      .map((owned) => owned.catalogGearId)
  );
  const alternate = catalog.gear.find((gear) => gear.slot === "core" && !starterCoreIds.has(gear.id));

  if (!alternate) {
    throw new Error("Expected a distinct core catalog item for browser loadout acceptance");
  }

  return alternate.id;
}

function browserProgressionAlternateCoreGearId(state: GameState, primaryCoreGearId: string): string {
  const core = state.player.inventory.find(
    (owned) =>
      owned.instanceId !== primaryCoreGearId &&
      catalog.gear.find((gear) => gear.id === owned.catalogGearId)?.slot === "core"
  );

  if (!core) {
    throw new Error("Expected a second owned core for browser loadout acceptance");
  }

  return core.instanceId;
}

async function reinforceGearThroughRealClicks(
  page: RealBrowserAppPage,
  gearId: string,
  maxAttempts = 4
): Promise<BrowserTownEcosystemState> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const before = await page.evaluate<BrowserTownEcosystemState>(readTownEcosystemStateExpression);
    const beforeGear = before.saved?.player.inventory.find((item) => item.instanceId === gearId);
    const ironDustBefore = before.saved?.player.currencies.ironDust ?? 0;

    if ((beforeGear?.reinforceLevel ?? 0) >= 1) {
      return before;
    }

    await page.click(`[data-app-action="reinforce"][data-gear-id="${gearId}"]`);
    let after: BrowserTownEcosystemState;
    try {
      after = await page.waitFor<BrowserTownEcosystemState>(
        readTownEcosystemStateExpression,
        (state) => (state.saved?.player.currencies.ironDust ?? ironDustBefore) < ironDustBefore,
        3000
      );
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("Timed out waiting for browser expression") || attempt === maxAttempts - 1) {
        throw error;
      }
      continue;
    }
    const afterGear = after.saved?.player.inventory.find((item) => item.instanceId === gearId);

    if ((afterGear?.reinforceLevel ?? 0) > (beforeGear?.reinforceLevel ?? 0)) {
      return after;
    }
  }

  throw new Error(`Real browser reinforcement did not reach +1 after ${maxAttempts} clicks for ${gearId}`);
}

async function completeChapterTwoTradeThroughRealClicks(page: RealBrowserAppPage, maxAttempts = 2): Promise<BrowserTownEcosystemState> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const before = await page.evaluate<BrowserTownEcosystemState>(readTownEcosystemStateExpression);

    if (before.saved?.player.quests["chapter-two-trade-contract"] === "ready") {
      return before;
    }

    await page.click('[data-trade-offer-id]');
    try {
      return await page.waitFor<BrowserTownEcosystemState>(
        readTownEcosystemStateExpression,
        (state) => state.saved?.player.quests["chapter-two-trade-contract"] === "ready",
        1800
      );
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("Timed out waiting for browser expression") || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error("Real browser trade did not complete the chapter-two contract");
}

async function buyLiuliGiftPackThroughRealClicks(page: RealBrowserAppPage, maxAttempts = 2): Promise<BrowserTownEcosystemState> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const before = await page.evaluate<BrowserTownEcosystemState>(readTownEcosystemStateExpression);

    if (before.saved?.shop.purchasedSkus.includes("liuli-gift-pack") && before.saved.shop.boxes["ember-mythic-box"] === 3) {
      return before;
    }

    await page.click('[data-shop-sku="liuli-gift-pack"]');
    try {
      return await page.waitFor<BrowserTownEcosystemState>(
        readTownEcosystemStateExpression,
        (state) => state.saved?.shop.purchasedSkus.includes("liuli-gift-pack") && state.saved.shop.boxes["ember-mythic-box"] === 3,
        1800
      );
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("Timed out waiting for browser expression") || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error("Real browser gift-pack purchase did not complete");
}

async function seedSaveAndReload(page: RealBrowserAppPage, state: GameState): Promise<void> {
  await page.evaluate<void>(`localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(state))})`);
  await page.reload();
  await page.waitFor<BrowserAppModeState>(
    readAppModeStateExpression,
    (mode) => mode.appMode === "town" && mode.townScene === "true",
    15000
  );
}

async function openQuestDialogueThroughRealClick(
  page: RealBrowserAppPage,
  questId: string,
  phase: "briefing" | "turn-in",
  maxAttempts = 3
): Promise<BrowserStoryDialogueState> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await page.click(`[data-story-quest-id="${questId}"]`);
    try {
      return await page.waitFor<BrowserStoryDialogueState>(
        readStoryDialogueStateExpression,
        (state) => state.appMode === "story-dialogue" && state.questId === questId && state.phase === phase && state.step === 0,
        1800
      );
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("Timed out waiting for browser expression") || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error(`Real browser quest dialogue did not open after ${maxAttempts} clicks for ${questId}`);
}

async function completeOpenQuestDialogueWithKeyboard(page: RealBrowserAppPage, questId: string): Promise<void> {
  for (const expectedStep of [1, 2]) {
    await page.pressKey("Enter");
    await page.waitFor<BrowserStoryDialogueState>(
      readStoryDialogueStateExpression,
      (state) => state.questId === questId && state.step === expectedStep,
      2000
    );
  }

  await page.pressKey("Enter");
}

async function turnInQuestThroughRealKeys(page: RealBrowserAppPage, questId: string): Promise<void> {
  await openQuestDialogueThroughRealClick(page, questId, "turn-in");
  await completeOpenQuestDialogueWithKeyboard(page, questId);
  await page.waitFor<BrowserTownEcosystemState>(
    readTownEcosystemStateExpression,
    (state) => state.appMode === "quests" && state.saved?.player.quests[questId] === "completed",
    4000
  );
}

async function openDungeonPrepThroughRealClick(
  page: Pick<RealBrowserAppPage, "click" | "waitFor">,
  dungeonId: DungeonId,
  maxAttempts = 3
): Promise<BrowserDungeonDifficultyState> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await page.click(`[data-prepare-dungeon="${dungeonId}"]`);

    try {
      return await page.waitFor<BrowserDungeonDifficultyState>(
        readDungeonDifficultyStateExpression,
        (state) =>
          state.appMode === "dungeon-prep" &&
          state.prepDungeonId === dungeonId &&
          state.selectedDifficulty === "normal",
        1800
      );
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("Timed out waiting for browser expression") || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error(`Real browser dungeon preparation did not open for ${dungeonId}`);
}

async function enterDungeonWithKeyboard(
  page: Pick<RealBrowserAppPage, "evaluate" | "waitFor" | "pressKey">,
  activationKey: "Enter" | "Space" = "Enter",
  dungeonId: DungeonId = "cinder-kiln-alley"
): Promise<void> {
  await page.waitFor<{ ready: boolean }>(
    `(() => {
      const button = document.querySelector(${JSON.stringify(`[data-prepare-dungeon="${dungeonId}"]`)});
      return { ready: Boolean(button) };
    })()`,
    (state) => state.ready,
    15000
  );
  await page.evaluate<void>(`(() => {
    const button = document.querySelector(${JSON.stringify(`[data-prepare-dungeon="${dungeonId}"]`)});
    button?.focus();
  })()`);
  await page.waitFor<{ focused: boolean }>(
    `(() => {
      const button = document.querySelector(${JSON.stringify(`[data-prepare-dungeon="${dungeonId}"]`)});
      return { focused: document.activeElement === button };
    })()`,
    (state) => state.focused,
    1000
  );
  await page.pressKey(activationKey);
  await page.waitFor<BrowserAppModeState>(readAppModeStateExpression, (state) => state.appMode === "dungeon-prep", 5000);
  await page.pressKey("Enter");
  await page.waitFor<BrowserAppModeState>(readAppModeStateExpression, (state) => state.appMode === "combat", 5000);
}

async function startViteServer(): Promise<{ server: ViteDevServer; url: string; close(): Promise<void> }> {
  const server = await createServer({
    logLevel: "silent",
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false
    }
  });

  await server.listen();
  const url = server.resolvedUrls?.local[0];

  if (!url) {
    await server.close();
    throw new Error("Expected Vite to expose a local test URL");
  }

  return {
    server,
    url,
    close: () => server.close()
  };
}
