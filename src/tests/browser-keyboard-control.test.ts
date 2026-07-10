import { createServer, type ViteDevServer } from "vite";
import { describe, expect, it } from "vitest";
import {
  runAppInRealBrowser,
  type RealBrowserAppPage,
  type RealBrowserKeyCode
} from "./support/real-browser-computed-style";
import { catalog } from "../data/catalog";
import type { GameState } from "../game/types";
import { SAVE_KEY } from "../systems/save";
import { createInitialState, createOwnedGear } from "../game/state";
import { advanceClass, selectBaseClass } from "../systems/classes";

type BrowserCombatState = {
  objective: string;
  playerX: number;
  playerMotion: string;
  normalAttackMove: string;
  hitstopActive: string;
  screenShake: string;
  impactCue: string;
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
  enemies: Array<{
    id: string;
    kind: string;
    hp: number;
    x: number;
    y: number;
    attackSkillId: string;
    attackStage: string;
    attackProgress: number;
  }>;
};

type BrowserEnemyAttackState = {
  objective: string;
  enemies: Array<{
    id: string;
    stage: string;
    skill: string;
    animationName: string;
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
  objective: string;
  dungeonId: string;
  roomIndex: string;
  roomCount: string;
  liveEnemyCount: string;
  defeatedEnemyCount: string;
  combatElapsedMs: string;
  playerX: string;
  playerY: string;
  gateState: string;
  gateTransition: string;
  gateTargetRoom: string;
  gateEnterReady: string;
  transitionState: string;
  transitionFromRoom: string;
  transitionTargetRoom: string;
  enemies: Array<{
    id: string;
    kind: string;
    hp: number;
    x: number;
    y: number;
  }>;
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
  sawArenaHazard: boolean;
  sawBossSkillVfx: boolean;
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

type BrowserTownEcosystemState = {
  appMode: string;
  toast: string;
  inventoryCount: number;
  saved: GameState | null;
};

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
  const scene = document.querySelector(".combat-scene");
  const gate = document.querySelector("[data-room-gate='true']");
  const enemies = Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => ({
    id: enemy.getAttribute("data-enemy-id") ?? "",
    kind: enemy.getAttribute("data-enemy-kind") ?? "",
    hp: Number(enemy.getAttribute("data-enemy-hp-current") || "0"),
    x: Number(enemy.getAttribute("data-enemy-x") || "0"),
    y: Number(enemy.getAttribute("data-enemy-y") || "0")
  }));

  return {
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    dungeonId: scene?.getAttribute("data-dungeon-id") ?? "",
    roomIndex: scene?.getAttribute("data-room-index") ?? "",
    roomCount: scene?.getAttribute("data-room-count") ?? "",
    liveEnemyCount: scene?.getAttribute("data-live-enemy-count") ?? "",
    defeatedEnemyCount: scene?.getAttribute("data-defeated-enemy-count") ?? "",
    combatElapsedMs: scene?.getAttribute("data-combat-elapsed-ms") ?? "",
    playerX: scene?.getAttribute("data-player-x") ?? "",
    playerY: scene?.getAttribute("data-player-y") ?? "",
    gateState: gate?.getAttribute("data-room-gate-state") ?? "",
    gateTransition: gate?.getAttribute("data-room-gate-transition") ?? "",
    gateTargetRoom: gate?.getAttribute("data-room-gate-target-room") ?? "",
    gateEnterReady: scene?.getAttribute("data-gate-enter-ready") ?? "",
    transitionState: scene?.getAttribute("data-room-transition-state") ?? "",
    transitionFromRoom: scene?.getAttribute("data-room-transition-from-room") ?? "",
    transitionTargetRoom: scene?.getAttribute("data-room-transition-target-room") ?? "",
    enemies
  };
})()
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
      animationName: art ? getComputedStyle(art).animationName : ""
    };
  });
  return {
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    roomIndex: scene?.getAttribute("data-room-index") ?? "",
    bossPhase: scene?.getAttribute("data-boss-phase") ?? "",
    bossPhaseTriggered: scene?.getAttribute("data-boss-phase-triggered") ?? "",
    arenaHazardCount: scene?.getAttribute("data-arena-hazard-count") ?? "",
    activeSkill: player?.getAttribute("data-active-skill-id") ?? "",
    playerMotion: player?.getAttribute("data-player-motion") ?? "",
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
    sparksAnimation: "flowing-chain-open-sparks"
  },
  {
    phase: "chain-cross",
    cue: "flowing-chain-cross",
    playerAnimation: "player-flowing-chain-cross",
    weaponAnimation: "weapon-flowing-chain-cross",
    coreAnimation: "flowing-chain-cross-core",
    waveAnimation: "flowing-chain-cross-wave",
    sparksAnimation: "flowing-chain-cross-sparks"
  },
  {
    phase: "chain-finish",
    cue: "flowing-chain-finish",
    playerAnimation: "player-flowing-chain-finish",
    weaponAnimation: "weapon-flowing-chain-finish",
    coreAnimation: "flowing-chain-finish-core",
    waveAnimation: "flowing-chain-finish-wave",
    sparksAnimation: "flowing-chain-finish-sparks"
  }
] as const;

const readEnemyAttackStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const enemies = Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => {
    const art = enemy.querySelector(".enemy-art");
    return {
      id: enemy.getAttribute("data-enemy-id") ?? "",
      stage: enemy.getAttribute("data-enemy-attack-stage") ?? "",
      skill: enemy.getAttribute("data-enemy-attack-skill-id") ?? "",
      animationName: art ? getComputedStyle(art).animationName : ""
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
  const readSample = () => {
    const shell = document.querySelector(".app-shell");
    const scene = document.querySelector(".combat-scene");
    const player = document.querySelector(".combat-player");
    const art = document.querySelector(".combat-player-art");
    const weapon = document.querySelector(".combat-weapon");
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
      enemies: Array.from(document.querySelectorAll(".combat-enemy")).map((enemy) => ({
        id: enemy.getAttribute("data-enemy-id") ?? "",
        kind: enemy.getAttribute("data-enemy-kind") ?? "",
        hp: Number(enemy.getAttribute("data-enemy-hp-current") || "0"),
        x: Number(enemy.getAttribute("data-enemy-x") || "0"),
        y: Number(enemy.getAttribute("data-enemy-y") || "0"),
        attackSkillId: enemy.getAttribute("data-enemy-attack-skill-id") ?? "",
        attackStage: enemy.getAttribute("data-enemy-attack-stage") ?? "",
        attackProgress: Number(enemy.getAttribute("data-enemy-attack-progress") || "0")
      }))
    };
  };
  const tick = () => {
    const sample = readSample();
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
    if (globalThis.__flowingLightPhaseSamples.length < 3) {
      globalThis.__flowingLightPhaseRecorder = requestAnimationFrame(tick);
    }
  };
  if (globalThis.__flowingLightPhaseRecorder) {
    cancelAnimationFrame(globalThis.__flowingLightPhaseRecorder);
  }
  globalThis.__flowingLightPhaseRecorder = requestAnimationFrame(tick);
  return true;
})()
`;

const readFlowingLightPhaseSamplesExpression = `
(() => globalThis.__flowingLightPhaseSamples ?? [])()
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

describe("real browser keyboard control", () => {
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

        await page.waitFor<BrowserCombatState>(readCombatStateExpression, (state) => state.playerX >= 27, 2500);
        await page.keyUp("ArrowRight");
        await page.evaluate<void>("new Promise((resolve) => setTimeout(resolve, 760))");
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
      });
    } finally {
      await server.close();
    }
  }, 60000);

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

  it("casts Liuli flowing-light-chain with real keyboard input and staged VFX", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
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
        await page.evaluate<boolean>(installFlowingLightPhaseRecorderExpression);
        await page.pressKey("Space");

        let samples: BrowserFlowingLightPhaseSample[];
        try {
          samples = await page.waitFor<BrowserFlowingLightPhaseSample[]>(
            readFlowingLightPhaseSamplesExpression,
            (state) => flowingLightPhases.every((expected) => state.some((sample) => sample.hitPhase === expected.phase)),
            2200
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
        }
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
        await enterDungeonWithKeyboard(page, "Space");
        const combat = await page.waitFor<BrowserRoomFlowState>(
          readRoomFlowStateExpression,
          (state) => state.objective === "active",
          5000
        );

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

  it("clears the first room and walks into the next room with real keyboard input", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
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
          (state) => state.objective === "cleared" && state.liveEnemyCount === "0" && state.gateState === "open",
          5000
        );

        expect(cleared.defeatedEnemyCount).toBe("2");
        expect(cleared.gateTargetRoom).toBe("1");
        expect(cleared.transitionState).toBe("none");

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

        await walkThroughCompletionGateToTown(page);
        const returned = await page.waitFor<BrowserAppModeState>(
          readAppModeStateExpression,
          (state) => state.appMode === "town" && state.townScene === "true",
          8000
        );

        expect(returned.appMode).toBe("town");
        expect(returned.townScene).toBe("true");

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

        await page.click('[data-shop-sku="liuli-gift-pack"]');
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

        await page.evaluate<void>("location.reload()");
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

        await page.evaluate<void>("location.reload()");
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

        await page.evaluate<void>("location.reload()");

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

  it("shows natural monster windup, skill VFX, and model motion in the live browser", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserCombatState>(readCombatStateExpression, (state) => state.objective === "active", 5000);

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

async function walkThroughCompletionGateToTown(page: RealBrowserAppPage): Promise<void> {
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

  await page.waitFor<BrowserAppModeState>(
    readAppModeStateExpression,
    (state) => state.appMode === "town" && state.townScene === "true",
    8000
  );
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
            !nextTarget ||
            nextTarget.hp <= 0 ||
            Math.abs(nextTarget.x - nextPlayerX) <= 92
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
      quests: {
        ...liuliState.player.quests,
        "prologue-ember-warden": "ready" as const
      }
    }
  };

  return advanceClass(readyState, "flowing-light-swordmaster");
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
    const after = await page.waitFor<BrowserTownEcosystemState>(
      readTownEcosystemStateExpression,
      (state) => (state.saved?.player.currencies.ironDust ?? ironDustBefore) < ironDustBefore,
      3000
    );
    const afterGear = after.saved?.player.inventory.find((item) => item.instanceId === gearId);

    if ((afterGear?.reinforceLevel ?? 0) > (beforeGear?.reinforceLevel ?? 0)) {
      return after;
    }
  }

  throw new Error(`Real browser reinforcement did not reach +1 after ${maxAttempts} clicks for ${gearId}`);
}

async function seedSaveAndReload(page: RealBrowserAppPage, state: GameState): Promise<void> {
  await page.evaluate<void>(`(() => {
    localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(state))});
    location.reload();
  })()`);
  await page.waitFor<BrowserAppModeState>(
    readAppModeStateExpression,
    (mode) => mode.appMode === "town" && mode.townScene === "true",
    15000
  );
}

async function enterDungeonWithKeyboard(
  page: Pick<RealBrowserAppPage, "evaluate" | "waitFor" | "pressKey">,
  activationKey: "Enter" | "Space" = "Enter"
): Promise<void> {
  await page.waitFor<{ ready: boolean; focused: boolean; href: string; body: string; scripts: string[] }>(
    `(() => {
      const button = document.querySelector('[data-enter-dungeon="cinder-kiln-alley"]');
      return {
        ready: Boolean(button),
        focused: document.activeElement === button,
        href: location.href,
        body: (document.body?.innerHTML ?? "").slice(0, 500),
        scripts: Array.from(document.scripts).map((script) => script.src || script.textContent?.slice(0, 80) || "")
      };
    })()`,
    (state) => state.ready,
    15000
  );
  await page.evaluate<void>(`(() => {
    const button = document.querySelector('[data-enter-dungeon="cinder-kiln-alley"]');
    button?.focus();
  })()`);
  await page.waitFor<{ focused: boolean }>(
    `(() => {
      const button = document.querySelector('[data-enter-dungeon="cinder-kiln-alley"]');
      return { focused: document.activeElement === button };
    })()`,
    (state) => state.focused,
    1000
  );
  await page.pressKey(activationKey);
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
