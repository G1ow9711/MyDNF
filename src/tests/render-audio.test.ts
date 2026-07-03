import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { createCombatRun, performAction } from "../game/combat";
import { createInitialState } from "../game/state";
import { createRenderPlan, createSkillVfx, getScenePalette } from "../game/render";
import { chooseMusicLayer, createAudioState, playBgm, playSfx, setVolume } from "../systems/audio";

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
    const run = performAction(createCombatRun(createInitialState(), "cinder-kiln-alley"), { type: "light" });
    const plan = createRenderPlan(run, "cinder-kiln-alley");

    expect(plan.sceneId).toBe("cinder-kiln-alley");
    expect(plan.uiLayerShakes).toBe(false);
    expect(plan.commands[0].kind).toBe("background-layer");
    expect(plan.commands.some((command) => command.kind === "player" && command.detailLevel === "detailed-generated")).toBe(true);
    expect(plan.commands.some((command) => command.kind === "enemy")).toBe(true);
    expect(plan.commands.some((command) => command.kind === "hit-spark")).toBe(true);
    expect(plan.commands.at(-1)?.kind).toBe("hud");
  });
});

describe("adaptive audio hooks", () => {
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
});
