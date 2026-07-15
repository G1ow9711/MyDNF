import { afterEach, describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { createCombatRun, performAction, stepCombat, type CombatRun } from "../game/combat";
import { createInitialState } from "../game/state";
import { createRenderPlan, createSkillVfx, getScenePalette } from "../game/render";
import {
  chooseMusicLayer,
  createAudioCommandProcessor,
  createAudioPlaybackPlan,
  createAudioState,
  playBgm,
  playSfx,
  setVolume,
  type AudioPlaybackPlan,
  type AudioPlaybackSink
} from "../systems/audio";
import { createBrowserAudioSink } from "../systems/audio-browser";

describe("Chinese-style scene palettes", () => {
  it("defines layered readable palettes for town and both dungeons", () => {
    const town = getScenePalette("forge-market");
    const cinder = getScenePalette("cinder-kiln-alley");
    const liuli = getScenePalette("liuli-furnace");

    expect(town.displayName).toBe("炉山市集");
    expect(town.styleTags).toEqual(expect.arrayContaining(["中国风", "市集", "锻炉"]));
    expect(town.layers).toHaveLength(4);
    expect(town.materials).toEqual(expect.arrayContaining(["青瓦", "木梁", "铜灯", "锻炉火光"]));

    expect(cinder.accent).not.toBe(liuli.accent);
    expect(cinder.laneContrast).toBeGreaterThanOrEqual(0.7);
    expect(liuli.laneContrast).toBeGreaterThanOrEqual(0.7);
    expect(liuli.particleMotifs).toEqual(expect.arrayContaining(["玻璃火星", "热雾"]));
  });
});

describe("skill visual effects", () => {
  it("creates flashy VFX profiles for every class skill", () => {
    for (const skill of catalog.classSkills) {
      const vfx = createSkillVfx(skill.id, skill.classId);

      expect(vfx.skillId).toBe(skill.id);
      expect(vfx.palette.primary).toMatch(/^#/);
      expect(vfx.durationMs).toBeGreaterThanOrEqual(260);
      expect(vfx.particles.length).toBeGreaterThanOrEqual(3);
      expect(vfx.drawCommands.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives 烬拳卫 ultimate a large flash, shockwave, and screen shake", () => {
    const vfx = createSkillVfx("meteor-knuckle", "ember-warden");

    expect(vfx.lightFlash.radius).toBeGreaterThanOrEqual(180);
    expect(vfx.screenShakePx).toBeGreaterThanOrEqual(8);
    expect(vfx.drawCommands.map((command) => command.kind)).toEqual(
      expect.arrayContaining(["afterimage", "shockwave", "ground-crack"])
    );
    expect(vfx.particles).toEqual(expect.arrayContaining(["ember-sparks", "white-hot-core"]));
  });
});

describe("render plan", () => {
  it("orders background, combat actors, VFX, and HUD without shaking the UI layer", () => {
    const baseRun = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const cast = performAction(
      {
        ...baseRun,
        enemies: baseRun.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: {
                  x: baseRun.player.x + 96,
                  y: baseRun.player.y
                },
                nextAttackAtMs: 9999
              }
            : enemy
        )
      },
      { type: "light" }
    );
    const [hitAtMs] = cast.scheduledEnemyHitEffects
      .filter((effect) => effect.action === "light" && !effect.skillId && effect.id.startsWith("ground-light-"))
      .map((effect) => effect.applyAtMs);
    if (hitAtMs === undefined) {
      throw new Error("Expected scheduled ground-light effect");
    }
    const run: CombatRun = stepCombat(cast, {}, Math.max(0, hitAtMs - cast.elapsedMs));
    const plan = createRenderPlan(run, "cinder-kiln-alley");

    expect(plan.sceneId).toBe("cinder-kiln-alley");
    expect(plan.uiLayerShakes).toBe(false);
    expect(plan.commands[0].kind).toBe("background-layer");
    expect(plan.commands.some((command) => command.kind === "player" && command.detailLevel === "detailed-generated")).toBe(true);
    expect(plan.commands.some((command) => command.kind === "enemy")).toBe(true);
    expect(plan.commands.some((command) => command.kind === "hit-spark")).toBe(true);
    expect(plan.commands.at(-1)?.kind).toBe("hud");

    const heavyCast = performAction(
      {
        ...baseRun,
        enemies: baseRun.enemies.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                position: {
                  x: baseRun.player.x + 96,
                  y: baseRun.player.y
                },
                nextAttackAtMs: 9999
              }
            : enemy
        )
      },
      { type: "heavy" }
    );
    const heavyInputPlan = createRenderPlan(heavyCast, "cinder-kiln-alley");
    const [heavyAtMs] = heavyCast.scheduledEnemyHitEffects
      .filter((effect) => effect.action === "heavy" && !effect.skillId && effect.id.startsWith("ground-heavy-"))
      .map((effect) => effect.applyAtMs);
    if (heavyAtMs === undefined) {
      throw new Error("Expected scheduled ground-heavy effect");
    }
    const heavyRun: CombatRun = stepCombat(heavyCast, {}, Math.max(0, heavyAtMs - heavyCast.elapsedMs));
    const heavyPlan = createRenderPlan(heavyRun, "cinder-kiln-alley");

    expect(heavyInputPlan.commands.some((command) => command.kind === "hit-spark")).toBe(false);
    expect(heavyPlan.commands.some((command) => command.kind === "hit-spark")).toBe(true);
  });
});

describe("adaptive audio hooks", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "AudioContext");
    Reflect.deleteProperty(globalThis, "webkitAudioContext");
  });

  it("chooses distinct music layers for town, dungeon, and boss phase pressure", () => {
    expect(chooseMusicLayer({ mode: "town", hotspot: "smith" })).toEqual({
      trackId: "town-forge-market",
      intensity: "calm",
      layers: ["market-strings", "forge-pulse"]
    });
    expect(chooseMusicLayer({ mode: "dungeon", dungeonId: "cinder-kiln-alley", danger: 0.2 })).toMatchObject({
      trackId: "dungeon-cinder-kiln",
      intensity: "explore"
    });
    expect(chooseMusicLayer({ mode: "boss", dungeonId: "liuli-furnace", danger: 0.9, bossPhase: 3 })).toEqual({
      trackId: "boss-liuli-overseer",
      intensity: "boss-phase-3",
      layers: ["forge-drums", "glass-shimmer", "phase-three-bass"]
    });
  });

  it("clamps volume and queues BGM/SFX commands without requiring real audio assets", () => {
    const audio = createAudioState();
    const loudMusic = setVolume(audio, "music", 1.4);
    const mutedSfx = setVolume(loudMusic, "sfx", -0.5);
    const withBgm = playBgm(mutedSfx, "town-forge-market");
    const withSfx = playSfx(withBgm, "reinforce-success");

    expect(loudMusic.volumes.music).toBe(1);
    expect(mutedSfx.volumes.sfx).toBe(0);
    expect(withSfx.currentBgm).toBe("town-forge-market");
    expect(withSfx.commandQueue).toEqual([
      { type: "bgm", id: "town-forge-market" },
      { type: "sfx", id: "reinforce-success" }
    ]);
  });

  it("builds procedural BGM and SFX playback plans from queued commands", () => {
    const audio = playSfx(playBgm(createAudioState(), "town-forge-market"), "skill-impact-heavy");
    const bgmPlan = createAudioPlaybackPlan(audio.commandQueue[0], audio.volumes);
    const sfxPlan = createAudioPlaybackPlan(audio.commandQueue[1], audio.volumes);

    expect(bgmPlan).toMatchObject({
      commandId: "town-forge-market",
      channel: "music",
      loopMs: 3200,
      textureTags: ["guqin-pentatonic", "lantern-ambience", "forge-pulse"]
    });
    expect(bgmPlan.notes.length).toBeGreaterThanOrEqual(10);
    expect(bgmPlan.notes.every((note) => note.channel === "music" && note.effectiveGain <= 0.9 * 0.75)).toBe(true);
    expect(sfxPlan).toMatchObject({
      commandId: "skill-impact-heavy",
      channel: "sfx",
      loopMs: 0,
      textureTags: ["impact", "metal-body", "spark-tail"]
    });
    expect(sfxPlan.notes.length).toBeGreaterThanOrEqual(3);
    expect(sfxPlan.notes.every((note) => note.durationMs <= 320 && note.effectiveGain <= 0.9 * 0.85)).toBe(true);
  });

  it("builds distinct layered playback plans for every sword-dance hit family", () => {
    const ids = [
      "sword-dance-open",
      "sword-dance-left",
      "sword-dance-right",
      "sword-dance-cross",
      "sword-dance-finish"
    ];
    const plans = ids.map((id) => createAudioPlaybackPlan({ type: "sfx", id }, createAudioState().volumes));

    expect(plans.map((plan) => plan.commandId)).toEqual(ids);
    expect(plans.every((plan) => plan.notes.length >= 3)).toBe(true);
    expect(plans.every((plan) => !plan.textureTags.includes("ui-click"))).toBe(true);
    expect(new Set(plans.map((plan) => plan.textureTags.join(":"))).size).toBe(ids.length);
  });

  it("builds authored layered plans for normal movement, swings, and contact hits", () => {
    const ids = [
      "attack-swing-light",
      "attack-swing-heavy",
      "movement-jump",
      "movement-backstep",
      "normal-hit-1",
      "normal-hit-2",
      "normal-hit-3",
      "dash-hit",
      "air-hit",
      "heavy-launch",
      "heavy-slam"
    ];
    const plans = ids.map((id) => createAudioPlaybackPlan({ type: "sfx", id }, createAudioState().volumes));

    expect(plans.map((plan) => plan.commandId)).toEqual(ids);
    expect(plans.every((plan) => plan.notes.length >= 3)).toBe(true);
    expect(plans.every((plan) => !plan.textureTags.includes("ui-click"))).toBe(true);
    expect(new Set(plans.map((plan) => plan.textureTags.join(":"))).size).toBe(ids.length);
  });

  it("builds authored enemy telegraph, impact, evade, hurt, and guard plans", () => {
    const ids = [
      "enemy-windup-light",
      "enemy-windup-heavy",
      "enemy-windup-boss",
      "enemy-impact-light",
      "enemy-impact-heavy",
      "enemy-impact-boss",
      "evade-confirm",
      "player-hurt-light",
      "player-hurt-heavy",
      "player-hurt-boss",
      "guard-impact"
    ];
    const plans = ids.map((id) => createAudioPlaybackPlan({ type: "sfx", id }, createAudioState().volumes));

    expect(plans.map((plan) => plan.commandId)).toEqual(ids);
    expect(plans.every((plan) => plan.notes.length >= 3)).toBe(true);
    expect(plans.every((plan) => !plan.textureTags.includes("ui-click"))).toBe(true);
    expect(new Set(plans.map((plan) => plan.textureTags.join(":"))).size).toBe(ids.length);
  });

  it("builds authored positional-hit confirmation sounds", () => {
    const ids = ["back-attack-confirm", "counter-hit-confirm"];
    const plans = ids.map((id) => createAudioPlaybackPlan({ type: "sfx", id }, createAudioState().volumes));

    expect(plans.map((plan) => plan.commandId)).toEqual(ids);
    expect(plans.every((plan) => plan.notes.length >= 3)).toBe(true);
    expect(plans.every((plan) => !plan.textureTags.includes("ui-click"))).toBe(true);
    expect(new Set(plans.map((plan) => plan.textureTags.join(":"))).size).toBe(ids.length);
  });

  it("builds authored juggle-protection and OTG confirmation sounds", () => {
    const ids = ["juggle-protection-confirm", "otg-hit-confirm"];
    const plans = ids.map((id) => createAudioPlaybackPlan({ type: "sfx", id }, createAudioState().volumes));

    expect(plans.map((plan) => plan.commandId)).toEqual(ids);
    expect(plans.every((plan) => plan.notes.length >= 3)).toBe(true);
    expect(plans.every((plan) => !plan.textureTags.includes("ui-click"))).toBe(true);
    expect(new Set(plans.map((plan) => plan.textureTags.join(":"))).size).toBe(ids.length);
  });

  it("builds an authored wall-bounce confirmation sound", () => {
    const plan = createAudioPlaybackPlan({ type: "sfx", id: "wall-bounce-confirm" }, createAudioState().volumes);

    expect(plan.commandId).toBe("wall-bounce-confirm");
    expect(plan.notes.length).toBeGreaterThanOrEqual(4);
    expect(plan.textureTags).toEqual(expect.arrayContaining(["wall-crack", "body-rebound"]));
    expect(plan.textureTags).not.toContain("ui-click");
  });

  it("builds distinct authored catch, throw, and grab-resistance sounds", () => {
    const ids = ["grab-catch-confirm", "grab-throw-impact", "grab-resist-confirm"];
    const plans = ids.map((id) => createAudioPlaybackPlan({ type: "sfx", id }, createAudioState().volumes));

    expect(plans.map((plan) => plan.commandId)).toEqual(ids);
    expect(plans.every((plan) => plan.notes.length >= 3)).toBe(true);
    expect(plans.every((plan) => !plan.textureTags.includes("ui-click"))).toBe(true);
    expect(new Set(plans.map((plan) => plan.textureTags.join(":"))).size).toBe(ids.length);
  });

  it("builds an authored enemy wake-up protection sound", () => {
    const plan = createAudioPlaybackPlan({ type: "sfx", id: "enemy-wake-up-protection" }, createAudioState().volumes);

    expect(plan.commandId).toBe("enemy-wake-up-protection");
    expect(plan.notes.length).toBeGreaterThanOrEqual(3);
    expect(plan.textureTags).toEqual(expect.arrayContaining(["rise", "protection-frame"]));
    expect(plan.textureTags).not.toContain("ui-click");
  });

  it("builds distinct authored meteor charge start, release, and maximum sounds", () => {
    const ids = ["meteor-charge-start", "meteor-charge-release", "meteor-charge-maximum"];
    const plans = ids.map((id) => createAudioPlaybackPlan({ type: "sfx", id }, createAudioState().volumes));

    expect(plans.map((plan) => plan.commandId)).toEqual(ids);
    expect(plans.every((plan) => plan.notes.length >= 3)).toBe(true);
    expect(plans.every((plan) => !plan.textureTags.includes("ui-click"))).toBe(true);
    expect(new Set(plans.map((plan) => plan.textureTags.join(":"))).size).toBe(ids.length);
  });

  it("processes audio command queues once and restarts music after volume changes", () => {
    const calls: Array<{ kind: "music" | "sfx"; plan: AudioPlaybackPlan }> = [];
    const sink: AudioPlaybackSink = {
      startMusic: (plan) => calls.push({ kind: "music", plan }),
      playSfx: (plan) => calls.push({ kind: "sfx", plan })
    };
    const processor = createAudioCommandProcessor(sink);
    const audio = playSfx(playBgm(createAudioState(), "town-forge-market"), "reinforce-success");
    const flushed = processor.sync(audio);

    expect(flushed.commandQueue).toEqual([]);
    expect(calls.map((call) => [call.kind, call.plan.commandId])).toEqual([
      ["music", "town-forge-market"],
      ["sfx", "reinforce-success"]
    ]);

    processor.sync(flushed);
    expect(calls).toHaveLength(2);

    const quieter = setVolume(flushed, "music", 0.3);
    processor.sync(quieter);
    expect(calls).toHaveLength(3);
    expect(calls.at(-1)).toMatchObject({ kind: "music", plan: { commandId: "town-forge-market" } });
  });

  it("does not restart BGM for SFX-only volume changes", () => {
    const calls: Array<{ kind: "music" | "sfx"; plan: AudioPlaybackPlan }> = [];
    const sink: AudioPlaybackSink = {
      startMusic: (plan) => calls.push({ kind: "music", plan }),
      playSfx: (plan) => calls.push({ kind: "sfx", plan })
    };
    const processor = createAudioCommandProcessor(sink);
    const audio = playBgm(createAudioState(), "town-forge-market");
    const flushed = processor.sync(audio);
    const sfxChanged = setVolume(flushed, "sfx", 0.12);

    processor.sync(sfxChanged);

    expect(calls.map((call) => call.plan.commandId)).toEqual(["town-forge-market"]);
  });

  it("plays only the latest BGM command when a queue contains stale tracks", () => {
    const calls: Array<{ kind: "music" | "sfx"; plan: AudioPlaybackPlan }> = [];
    const sink: AudioPlaybackSink = {
      startMusic: (plan) => calls.push({ kind: "music", plan }),
      playSfx: (plan) => calls.push({ kind: "sfx", plan })
    };
    const processor = createAudioCommandProcessor(sink);
    const queued = playBgm(playBgm(createAudioState(), "town-forge-market"), "dungeon-cinder-kiln");

    processor.sync(queued);

    expect(calls.map((call) => [call.kind, call.plan.commandId])).toEqual([["music", "dungeon-cinder-kiln"]]);
  });

  it("falls back to a no-op browser sink when WebAudio is unavailable", () => {
    const sink = createBrowserAudioSink();
    const audio = playBgm(createAudioState(), "town-forge-market");
    const plan = createAudioPlaybackPlan(audio.commandQueue[0], audio.volumes);

    expect(() => sink.startMusic(plan)).not.toThrow();
    expect(() => sink.playSfx(plan)).not.toThrow();
  });

  it("stops scheduled music nodes when browser BGM restarts", () => {
    const stopped: number[] = [];
    const intervals: number[] = [];
    let nextInterval = 1;

    class FakeAudioContext {
      currentTime = 0;
      state: AudioContextState = "running";
      destination = {};

      createOscillator(): OscillatorNode {
        return {
          type: "sine",
          frequency: { setValueAtTime: () => undefined },
          connect: () => undefined,
          start: () => undefined,
          stop: (time?: number) => stopped.push(time ?? 0)
        } as unknown as OscillatorNode;
      }

      createGain(): GainNode {
        return {
          gain: {
            setValueAtTime: () => undefined,
            exponentialRampToValueAtTime: () => undefined
          },
          connect: () => undefined
        } as unknown as GainNode;
      }

      resume(): Promise<void> {
        return Promise.resolve();
      }
    }

    const originalSetInterval = globalThis.setInterval;
    const originalClearInterval = globalThis.clearInterval;
    (globalThis as typeof globalThis & { AudioContext?: typeof AudioContext }).AudioContext =
      FakeAudioContext as unknown as typeof AudioContext;
    globalThis.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      intervals.push(timeout ?? 0);
      void handler;
      void args;
      return nextInterval++ as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval;
    globalThis.clearInterval = (() => undefined) as typeof clearInterval;

    try {
      const sink = createBrowserAudioSink();
      const audio = playBgm(createAudioState(), "town-forge-market");
      const plan = createAudioPlaybackPlan(audio.commandQueue[0], audio.volumes);

      sink.startMusic(plan);
      const scheduledStopCount = stopped.length;
      sink.startMusic(plan);

      expect(intervals).toEqual([3200, 3200]);
      expect(scheduledStopCount).toBe(plan.notes.length);
      expect(stopped.length).toBe(plan.notes.length * 3);
    } finally {
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
    }
  });

  it("forgets ended browser music nodes before the next restart", () => {
    const stopped: number[] = [];
    const createdNodes: OscillatorNode[] = [];

    class FakeAudioContext {
      currentTime = 0;
      state: AudioContextState = "running";
      destination = {};

      createOscillator(): OscillatorNode {
        const node = {
          type: "sine",
          frequency: { setValueAtTime: () => undefined },
          connect: () => undefined,
          start: () => undefined,
          stop: (time?: number) => stopped.push(time ?? 0),
          onended: null
        } as unknown as OscillatorNode;

        createdNodes.push(node);
        return node;
      }

      createGain(): GainNode {
        return {
          gain: {
            setValueAtTime: () => undefined,
            exponentialRampToValueAtTime: () => undefined
          },
          connect: () => undefined
        } as unknown as GainNode;
      }

      resume(): Promise<void> {
        return Promise.resolve();
      }
    }

    (globalThis as typeof globalThis & { AudioContext?: typeof AudioContext }).AudioContext =
      FakeAudioContext as unknown as typeof AudioContext;

    const sink = createBrowserAudioSink();
    const audio = playBgm(createAudioState(), "town-forge-market");
    const plan = createAudioPlaybackPlan(audio.commandQueue[0], audio.volumes);

    sink.startMusic(plan);
    for (const node of [...createdNodes]) {
      node.onended?.({} as Event);
    }
    sink.startMusic(plan);

    expect(stopped.length).toBe(plan.notes.length * 2);
  });

  it("does not throw when active WebAudio construction fails", () => {
    class FailingAudioContext {
      constructor() {
        throw new Error("audio locked");
      }
    }

    (globalThis as typeof globalThis & { AudioContext?: typeof AudioContext }).AudioContext =
      FailingAudioContext as unknown as typeof AudioContext;

    const sink = createBrowserAudioSink();
    const audio = playBgm(createAudioState(), "town-forge-market");
    const plan = createAudioPlaybackPlan(audio.commandQueue[0], audio.volumes);

    expect(() => sink.startMusic(plan)).not.toThrow();
    expect(() => sink.playSfx(plan)).not.toThrow();
  });
});
