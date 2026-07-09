import { createServer, type ViteDevServer } from "vite";
import { describe, expect, it } from "vitest";
import { runAppInRealBrowser } from "./support/real-browser-computed-style";

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
        expect(moving.playerAnimation).toBe("player-ember-spark-combo");
        expect(moving.weaponAnimation).toBe("weapon-jab-chain");
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

        await page.keyDown("ShiftLeft");
        await page.keyDown("ArrowRight");
        try {
          await page.waitFor<BrowserComboCancelState>(
            readComboCancelStateExpression,
            (state) => state.playerX >= 36.5,
            2000
          );
        } finally {
          await page.keyUp("ArrowRight");
          await page.keyUp("ShiftLeft");
        }
        await page.waitFor<BrowserComboCancelState>(
          readComboCancelStateExpression,
          (state) => state.playerDashAttackReadyUntilMs === "",
          800
        );

        await page.pressKey("KeyX");
        await page.evaluate<void>("new Promise((resolve) => setTimeout(resolve, 70))");
        const cancelWindow = await page.evaluate<BrowserComboCancelState>(readComboCancelStateExpression);

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
        const combat = await page.waitFor<BrowserCombatState>(
          readCombatStateExpression,
          (state) => state.objective === "active",
          5000
        );

        expect(combat.objective).toBe("active");
      });
    } finally {
      await server.close();
    }
  }, 60000);

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

async function enterDungeonWithKeyboard(page: {
  evaluate<T>(expression: string): Promise<T>;
  waitFor<T>(expression: string, predicate: (value: T) => boolean, timeoutMs?: number): Promise<T>;
  pressKey(code: "Enter" | "Space"): Promise<void>;
}, activationKey: "Enter" | "Space" = "Enter"): Promise<void> {
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
