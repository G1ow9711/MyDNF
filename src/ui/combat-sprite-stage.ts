type FrameActor = {
  element: HTMLElement;
  sprite: HTMLElement;
  id: string;
  x: number;
  motion: string;
  progress: number;
  facing: 1 | -1;
  defeated: boolean;
  defeatedAtMs?: number;
  skillId?: string;
  skillPhase?: string;
  skillStage?: string;
  atlas?: string;
  comboStep?: number;
  reactionStep?: number;
  hitPhase?: string;
};

const swordDanceEnemyReactionFrames: Readonly<Record<string, number>> = {
  "chain-open": 12,
  "chain-dance-left": 12,
  "chain-dance-right": 13,
  "chain-cross": 13,
  "chain-finish": 14
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function progress(value: string | undefined): number {
  const parsed = Number(value ?? "0");
  return clamp01(parsed > 1 ? parsed / 100 : parsed);
}

function framePosition(index: number): string {
  const column = index % 4;
  const row = Math.floor(index / 4);
  return `${(column / 3) * 100}% ${(row / 3) * 100}%`;
}

function actionFrame(progressValue: number): number {
  return 8 + Math.min(3, Math.floor(clamp01(progressValue) * 4));
}

function intervalProgress(startAtMs: number, endAtMs: number, elapsedMs: number): number {
  if (endAtMs <= startAtMs) return 0;
  return clamp01((elapsedMs - startAtMs) / (endAtMs - startAtMs));
}

export class CombatSpriteStage {
  private readonly previousX = new Map<string, number>();
  private assetsReady = false;
  private assetsFailed = false;

  constructor() {
    if (typeof globalThis.Image === "undefined") {
      this.assetsFailed = true;
      return;
    }

    const sources = [
      "/assets/sprites/ember-warden-atlas.png",
      "/assets/sprites/ash-cinder-imp-atlas.png",
      "/assets/sprites/liuli-blademage-atlas.png",
      "/assets/sprites/liuli-flowing-light-array-atlas.png",
      "/assets/sprites/zheng-guard-atlas.png",
      "/assets/sprites/taotie-overseer-atlas.png"
    ];
    Promise.all(sources.map((source) => new Promise<void>((resolve, reject) => {
      const image = new globalThis.Image();
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Unable to load combat sprite atlas: ${source}`));
      image.src = source;
    }))).then(() => {
      this.assetsReady = true;
    }).catch(() => {
      this.assetsFailed = true;
    });
  }

  sync(root: ParentNode): void {
    if (typeof root.querySelector !== "function") {
      return;
    }

    const scene = root.querySelector<HTMLElement>(".combat-scene");
    if (!scene) {
      this.previousX.clear();
      return;
    }

    if (!this.assetsReady) {
      scene.dataset.frameSpriteStage = this.assetsFailed ? "failed" : "loading";
      return;
    }

    const elapsedMs = Number(scene.dataset.combatElapsedMs ?? "0");
    const hitstop = scene.dataset.hitstopActive === "true";
    const playerElement = root.querySelector<HTMLElement>(".combat-player");
    const playerSprite = playerElement?.querySelector<HTMLElement>(".player-frame-sprite");
    const playerX = Number(scene.dataset.playerX ?? "0");

    if (playerElement && playerSprite && ["ember-warden", "liuli-blademage"].includes(playerSprite.dataset.frameClassId ?? "")) {
      const skillHitAtMs = Number(playerElement.dataset.playerSkillHitAtMs ?? "0");
      const skillProgress = playerElement.dataset.playerSkillHitPhase && skillHitAtMs > 0
        ? intervalProgress(
            skillHitAtMs,
            skillHitAtMs + (playerElement.dataset.playerSkillHitPhase === "chain-finish" ? 360 : 120),
            elapsedMs
          )
        : progress(playerElement.dataset.playerSkillStageProgress);
      const normalAttackStartedAtMs = Number(playerElement.dataset.playerNormalAttackStartedAtMs ?? "0");
      const normalAttackUntilMs = Number(playerElement.dataset.playerNormalAttackUntilMs ?? "0");
      const normalProgress = normalAttackUntilMs > normalAttackStartedAtMs
        ? intervalProgress(normalAttackStartedAtMs, normalAttackUntilMs, elapsedMs)
        : progress(playerElement.dataset.playerNormalAttackMoveProgress);
      this.applyFrame({
        element: playerElement,
        sprite: playerSprite,
        id: "player",
        x: playerX,
        motion: playerElement.dataset.playerMotion ?? "idle",
        progress: (playerElement.dataset.playerMotion === "skill" ? skillProgress : normalProgress),
        facing: playerElement.dataset.playerFacing === "left" ? -1 : 1,
        defeated: playerElement.dataset.playerState === "defeated",
        skillId: playerElement.dataset.activeSkillId,
        skillPhase: playerElement.dataset.playerSkillHitPhase,
        skillStage: playerElement.dataset.playerSkillStage,
        comboStep: Number(playerElement.dataset.playerNormalComboStep ?? "0")
      }, elapsedMs, hitstop);
    }

    for (const enemy of root.querySelectorAll<HTMLElement>(".combat-enemy")) {
      const sprite = enemy.querySelector<HTMLElement>(".enemy-frame-sprite");
      if (!sprite) continue;
      const x = Number(enemy.dataset.enemyX ?? "0");
      this.applyFrame({
        element: enemy,
        sprite,
        id: enemy.dataset.enemyId ?? "enemy",
        x,
        motion: enemy.dataset.enemyMotion ?? "idle",
        progress: progress(enemy.dataset.enemyAttackProgress),
        facing: x >= playerX ? -1 : 1,
        defeated: enemy.dataset.enemyState === "defeated",
        defeatedAtMs: enemy.dataset.enemyDefeatedAtMs ? Number(enemy.dataset.enemyDefeatedAtMs) : undefined,
        skillId: enemy.dataset.enemyAttackSkillId || enemy.dataset.bossPhaseSkillId,
        skillStage: enemy.dataset.enemyAttackStage,
        atlas: sprite.dataset.frameAtlas ?? "ash-cinder-imp",
        reactionStep: Number(enemy.dataset.enemyHitGroundLightStep ?? "0"),
        hitPhase: enemy.dataset.hitPhase
      }, elapsedMs, hitstop);
    }

    scene.dataset.frameSpriteStage = "ready";
  }

  destroy(): void {
    this.previousX.clear();
  }

  private applyFrame(actor: FrameActor, elapsedMs: number, hitstop: boolean): void {
    const previous = this.previousX.get(actor.id) ?? actor.x;
    const moving = Math.abs(actor.x - previous) > 0.2;
    this.previousX.set(actor.id, actor.x);
    let frame = Math.floor(elapsedMs / 180) % 4;
    let state = "idle";
    const flowingLightSkill = actor.id === "player" && actor.skillId === "flowing-light-chain";

    actor.sprite.dataset.spriteComboStep = "";
    actor.sprite.dataset.spriteComboPhase = "";
    actor.sprite.dataset.spriteReactionStep = "";
    actor.sprite.dataset.spriteSkillReaction = "";

    if (actor.id === "player") {
      const classId = actor.sprite.dataset.frameClassId ?? "ember-warden";
      actor.sprite.style.backgroundImage = flowingLightSkill
        ? 'url("/assets/sprites/liuli-flowing-light-array-atlas.png")'
        : classId === "liuli-blademage"
          ? 'url("/assets/sprites/liuli-blademage-atlas.png")'
          : 'url("/assets/sprites/ember-warden-atlas.png")';
      actor.sprite.dataset.spriteSkill = flowingLightSkill ? "flowing-light-chain" : "";
      actor.sprite.dataset.spriteSkillPhase = flowingLightSkill ? (actor.skillPhase || actor.skillStage || "windup") : "";
    } else {
      actor.sprite.style.backgroundImage = `url("/assets/sprites/${actor.atlas ?? "ash-cinder-imp"}-atlas.png")`;
      actor.sprite.dataset.spriteSkill = actor.skillId ?? "";
      actor.sprite.dataset.spriteSkillPhase = actor.skillStage ?? "none";
    }

    const swordDanceEnemyReaction = actor.id === "player" ? undefined : swordDanceEnemyReactionFrames[actor.hitPhase ?? ""];

    if (flowingLightSkill) {
      const p = clamp01(actor.progress);
      if (actor.skillPhase === "chain-open") {
        frame = Math.min(3, Math.floor(p * 4));
      } else if (actor.skillPhase === "chain-dance-left") {
        frame = 4 + Math.min(3, Math.floor(p * 4));
      } else if (actor.skillPhase === "chain-dance-right") {
        frame = 8 + Math.min(3, Math.floor(p * 4));
      } else if (actor.skillPhase === "chain-cross") {
        frame = 6 + Math.min(5, Math.floor(p * 6));
      } else if (actor.skillPhase === "chain-finish") {
        frame = p < 0.12 ? 12 : p < 0.82 ? 13 : 14;
      } else if (actor.skillStage === "windup") {
        frame = Math.min(3, Math.floor(p * 4));
      } else if (actor.skillStage === "active") {
        frame = 4 + Math.min(7, Math.floor(p * 8));
      } else {
        frame = 14 + Math.min(1, Math.floor(p * 2));
      }
      state = "skill-dance";
    } else if (actor.defeated || actor.motion === "defeated") {
      const deathAgeMs = actor.defeatedAtMs === undefined ? Number.POSITIVE_INFINITY : Math.max(0, elapsedMs - actor.defeatedAtMs);
      const lethalReactionFrame = actor.reactionStep ? 11 + Math.min(3, actor.reactionStep) : undefined;
      frame = deathAgeMs < 180 ? lethalReactionFrame ?? 12 : deathAgeMs < 520 ? 14 : 15;
      if (deathAgeMs < 180 && actor.reactionStep) {
        actor.sprite.dataset.spriteReactionStep = String(actor.reactionStep);
      }
      state = deathAgeMs < 180 ? "death-impact" : deathAgeMs < 520 ? "death-collapse" : "death-dissolve";
    } else if (actor.id !== "player" && actor.motion === "grabbed") {
      frame = 13;
      state = "grabbed";
    } else if (actor.id !== "player" && actor.motion === "grab-throw") {
      frame = 14;
      state = "grab-throw";
    } else if (swordDanceEnemyReaction !== undefined) {
      frame = swordDanceEnemyReaction;
      actor.sprite.dataset.spriteSkillReaction = actor.hitPhase ?? "";
      state = actor.hitPhase === "chain-finish" ? "knockdown" : "hit";
    } else if (actor.id !== "player" && actor.reactionStep) {
      frame = 11 + Math.min(3, actor.reactionStep);
      actor.sprite.dataset.spriteReactionStep = String(actor.reactionStep);
      state = actor.reactionStep === 3 ? "knockdown" : "hit";
    } else if (actor.motion === "knockdown") {
      frame = actor.reactionStep === 3 ? 14 : 14 + Math.min(1, Math.floor((elapsedMs % 360) / 180));
      if (actor.reactionStep) actor.sprite.dataset.spriteReactionStep = String(actor.reactionStep);
      state = "knockdown";
    } else if (["hit", "hitstun", "guard-break", "bound", "controlled"].includes(actor.motion)) {
      frame = actor.reactionStep ? 11 + Math.min(3, actor.reactionStep) : 12 + Math.min(1, Math.floor((elapsedMs % 240) / 120));
      if (actor.reactionStep) actor.sprite.dataset.spriteReactionStep = String(actor.reactionStep);
      state = "hit";
    } else if (actor.id !== "player" && actor.motion === "attack") {
      if (actor.skillStage === "windup") {
        frame = 8;
      } else if (actor.skillStage === "recovery") {
        frame = 11;
      } else if (actor.atlas === "zheng-guard") {
        frame = actor.skillId === "zheng-horn-charge" ? 9 : 10;
      } else if (actor.atlas === "taotie-overseer") {
        frame = actor.skillId === "taotie-chain-cleave"
          ? 9
          : ["taotie-flame-breath", "taotie-devour-pull", "taotie-world-devour"].includes(actor.skillId ?? "")
            ? 10
            : actor.skillId === "taotie-forge-shackle" || actor.skillId === "taotie-forge-collapse"
              ? 11
              : 8;
      } else {
        frame = actionFrame(actor.progress || ((elapsedMs % 420) / 420));
      }
      state = `monster-skill-${actor.skillId || "attack"}`;
    } else if (actor.id === "player" && actor.motion === "light" && actor.comboStep && actor.comboStep >= 1 && actor.comboStep <= 3) {
      const p = clamp01(actor.progress);
      const comboPhase = p < 0.24 ? "windup" : p < 0.72 ? "impact" : "recovery";
      const windupFrame = 7 + actor.comboStep;
      const contactFrame = 8 + actor.comboStep;
      frame = comboPhase === "impact" ? contactFrame : windupFrame;
      state = "attack";
      actor.sprite.dataset.spriteComboStep = String(actor.comboStep);
      actor.sprite.dataset.spriteComboPhase = comboPhase;
    } else if (["light", "heavy", "skill", "air-light", "air-heavy", "dash-light", "attack", "counter", "shield"].includes(actor.motion)) {
      frame = actionFrame(actor.progress || ((elapsedMs % 420) / 420));
      state = "attack";
    } else if (moving) {
      frame = 4 + (Math.floor(elapsedMs / 90) % 4);
      state = "run";
    }

    actor.sprite.style.backgroundPosition = framePosition(frame);
    actor.sprite.style.setProperty("--sprite-frame-position", framePosition(frame));
    actor.sprite.style.setProperty("--sprite-facing", String(actor.facing));
    actor.sprite.dataset.spriteFrame = String(frame);
    actor.sprite.dataset.spriteState = state;
    actor.sprite.dataset.spriteHitstop = hitstop ? "true" : "false";
  }
}

export function createCombatSpriteStage(): CombatSpriteStage {
  return new CombatSpriteStage();
}
