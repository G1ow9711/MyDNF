type FrameActor = {
  element: HTMLElement;
  sprite: HTMLElement;
  id: string;
  x: number;
  motion: string;
  progress: number;
  facing: 1 | -1;
  defeated: boolean;
  skillId?: string;
  skillPhase?: string;
  skillStage?: string;
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
      "/assets/sprites/liuli-flowing-light-array-atlas.png"
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
      const skillProgress = progress(playerElement.dataset.playerSkillStageProgress);
      const normalProgress = progress(playerElement.dataset.playerNormalAttackMoveProgress);
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
        skillStage: playerElement.dataset.playerSkillStage
      }, elapsedMs, hitstop);
    }

    for (const enemy of root.querySelectorAll<HTMLElement>(".combat-enemy-trash")) {
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
        defeated: enemy.dataset.enemyState === "defeated"
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

    if (actor.id === "player") {
      const classId = actor.sprite.dataset.frameClassId ?? "ember-warden";
      actor.sprite.style.backgroundImage = flowingLightSkill
        ? 'url("/assets/sprites/liuli-flowing-light-array-atlas.png")'
        : classId === "liuli-blademage"
          ? 'url("/assets/sprites/liuli-blademage-atlas.png")'
          : 'url("/assets/sprites/ember-warden-atlas.png")';
      actor.sprite.dataset.spriteSkill = flowingLightSkill ? "flowing-light-chain" : "";
      actor.sprite.dataset.spriteSkillPhase = flowingLightSkill ? (actor.skillPhase || actor.skillStage || "windup") : "";
    }

    if (flowingLightSkill) {
      const p = clamp01(actor.progress);
      if (actor.skillPhase === "chain-open") {
        frame = Math.min(4, Math.floor(p * 5));
      } else if (actor.skillPhase === "chain-cross") {
        frame = 5 + Math.min(6, Math.floor(p * 7));
      } else if (actor.skillPhase === "chain-finish") {
        frame = 12 + Math.min(2, Math.floor(p * 3));
      } else if (actor.skillStage === "windup") {
        frame = Math.min(3, Math.floor(p * 4));
      } else if (actor.skillStage === "active") {
        frame = 4 + Math.min(7, Math.floor(p * 8));
      } else {
        frame = 14 + Math.min(1, Math.floor(p * 2));
      }
      state = "skill-dance";
    } else if (actor.defeated || actor.motion === "defeated" || actor.motion === "knockdown") {
      frame = 14 + Math.min(1, Math.floor((elapsedMs % 360) / 180));
      state = "knockdown";
    } else if (["hit", "hitstun", "guard-break", "bound"].includes(actor.motion)) {
      frame = 12 + Math.min(1, Math.floor((elapsedMs % 240) / 120));
      state = "hit";
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
