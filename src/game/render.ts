import { catalog } from "../data/catalog";
import type { ClassId, DungeonId, TownId } from "./types";
import type { CombatHitEvent, CombatRun } from "./combat";

export type SceneId = TownId | DungeonId;

export interface SceneLayer {
  id: string;
  label: string;
  parallax: number;
  colors: [string, string];
}

export interface ScenePalette {
  sceneId: SceneId;
  displayName: string;
  styleTags: string[];
  materials: string[];
  particleMotifs: string[];
  accent: string;
  laneContrast: number;
  layers: SceneLayer[];
}

export interface VfxDrawCommand {
  kind: "afterimage" | "shockwave" | "ground-crack" | "arc-slash" | "spark-burst" | "ink-trail" | "guard-flare";
  color: string;
  opacity: number;
}

export interface SkillVfxProfile {
  skillId: string;
  classId: ClassId;
  durationMs: number;
  screenShakePx: number;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  lightFlash: {
    color: string;
    radius: number;
  };
  particles: string[];
  drawCommands: VfxDrawCommand[];
}

export interface RenderCommand {
  kind: string;
  id?: string;
  label?: string;
  layerId?: string;
  color?: string;
  parallax?: number;
  detailLevel?: "detailed-generated" | "silhouette" | "hud";
}

export interface RenderPlan {
  sceneId: SceneId;
  palette: ScenePalette;
  uiLayerShakes: boolean;
  commands: RenderCommand[];
}

const scenePalettes: Record<SceneId, ScenePalette> = {
  "forge-market": {
    sceneId: "forge-market",
    displayName: "炉山市集",
    styleTags: ["中国风", "市集", "锻炉", "交互城镇"],
    materials: ["青瓦", "木梁", "铜灯", "锻炉火光", "石板"],
    particleMotifs: ["灯尘", "炉火星", "蒸汽"],
    accent: "#f97316",
    laneContrast: 0.76,
    layers: [
      { id: "ink-mountains", label: "远山水墨", parallax: 0.12, colors: ["#172033", "#334155"] },
      { id: "tile-roofs", label: "青瓦屋脊", parallax: 0.28, colors: ["#1f2937", "#475569"] },
      { id: "market-stalls", label: "市集摊棚", parallax: 0.54, colors: ["#78350f", "#f59e0b"] },
      { id: "forge-courtyard", label: "锻炉院落", parallax: 0.82, colors: ["#111827", "#fb923c"] }
    ]
  },
  "cinder-kiln-alley": {
    sceneId: "cinder-kiln-alley",
    displayName: "灰窑巷",
    styleTags: ["中国风", "废窑", "冷暖对比"],
    materials: ["碎瓦", "灰石", "熄炉炭", "石狮残像"],
    particleMotifs: ["漂灰", "冷蓝烟", "余烬"],
    accent: "#f59e0b",
    laneContrast: 0.72,
    layers: [
      { id: "night-sky", label: "冷蓝夜幕", parallax: 0.1, colors: ["#020617", "#1e3a8a"] },
      { id: "broken-roofs", label: "断裂瓦檐", parallax: 0.32, colors: ["#111827", "#475569"] },
      { id: "kiln-walls", label: "塌落窑墙", parallax: 0.62, colors: ["#292524", "#92400e"] },
      { id: "ash-lane", label: "灰烬战道", parallax: 1, colors: ["#1c1917", "#f97316"] }
    ]
  },
  "liuli-furnace": {
    sceneId: "liuli-furnace",
    displayName: "琉璃熔炉",
    styleTags: ["中国风", "琉璃", "熔炉", "首领场景"],
    materials: ["琉璃砖", "青铜链", "熔火", "红灯笼", "镜面釉光"],
    particleMotifs: ["玻璃火星", "热雾", "熔炉烟"],
    accent: "#38bdf8",
    laneContrast: 0.8,
    layers: [
      { id: "furnace-depth", label: "熔炉深腔", parallax: 0.1, colors: ["#111827", "#7f1d1d"] },
      { id: "bronze-chain", label: "青铜悬链", parallax: 0.34, colors: ["#422006", "#d97706"] },
      { id: "glass-crucible", label: "琉璃坩埚", parallax: 0.66, colors: ["#0e7490", "#fb7185"] },
      { id: "heated-lane", label: "热釉战道", parallax: 1, colors: ["#0f172a", "#67e8f9"] }
    ]
  }
};

const classPalettes: Record<ClassId, SkillVfxProfile["palette"]> = {
  "ember-warden": { primary: "#ff6b2c", secondary: "#ffd166", accent: "#ffffff" },
  "liuli-blademage": { primary: "#67e8f9", secondary: "#a78bfa", accent: "#fde68a" },
  "ink-shadow-ranger": { primary: "#111827", secondary: "#8b5cf6", accent: "#22c55e" },
  "iron-forge-guardian": { primary: "#334155", secondary: "#f97316", accent: "#f8fafc" }
};

export function getScenePalette(sceneId: SceneId): ScenePalette {
  const palette = scenePalettes[sceneId];

  if (!palette) {
    throw new Error(`Unknown scene palette: ${sceneId}`);
  }

  return palette;
}

function skillDrawCommands(classId: ClassId, skillTags: string[]): VfxDrawCommand[] {
  const palette = classPalettes[classId];
  const commands: VfxDrawCommand[] = [
    { kind: "afterimage", color: palette.secondary, opacity: 0.6 },
    { kind: "spark-burst", color: palette.primary, opacity: 0.88 },
    { kind: "shockwave", color: palette.accent, opacity: 0.5 }
  ];

  if (classId === "liuli-blademage") {
    commands.push({ kind: "arc-slash", color: palette.primary, opacity: 0.72 });
  }

  if (classId === "ink-shadow-ranger") {
    commands.push({ kind: "ink-trail", color: palette.secondary, opacity: 0.68 });
  }

  if (classId === "iron-forge-guardian") {
    commands.push({ kind: "guard-flare", color: palette.accent, opacity: 0.62 });
  }

  if (skillTags.includes("ultimate") || skillTags.includes("slam") || skillTags.includes("guard-break")) {
    commands.push({ kind: "ground-crack", color: palette.primary, opacity: 0.75 });
  }

  return commands;
}

function skillParticles(classId: ClassId, skillTags: string[]): string[] {
  const particlesByClass: Record<ClassId, string[]> = {
    "ember-warden": ["ember-sparks", "white-hot-core", "bronze-fragments"],
    "liuli-blademage": ["glass-shards", "prism-lines", "cyan-glow"],
    "ink-shadow-ranger": ["ink-drops", "shadow-feathers", "green-runes"],
    "iron-forge-guardian": ["iron-dust", "shield-runes", "molten-chips"]
  };
  const particles = [...particlesByClass[classId]];

  if (skillTags.includes("ultimate") || skillTags.includes("burst")) {
    particles.push("screen-flash");
  }

  return particles;
}

export function createSkillVfx(skillId: string, classId: ClassId): SkillVfxProfile {
  const skill = catalog.classSkills.find((item) => item.id === skillId && item.classId === classId);

  if (!skill) {
    throw new Error(`Unknown class skill for VFX: ${classId}.${skillId}`);
  }

  const isUltimate = skill.tags.includes("ultimate") || skill.resourceCost >= 65;
  const isHeavy = isUltimate || skill.tags.includes("burst") || skill.tags.includes("slam");
  const palette = classPalettes[classId];

  return {
    skillId,
    classId,
    durationMs: isUltimate ? 820 : isHeavy ? 520 : 320,
    screenShakePx: isUltimate ? 9 : isHeavy ? 5 : 2,
    palette,
    lightFlash: {
      color: palette.accent,
      radius: isUltimate ? 220 : isHeavy ? 150 : 90
    },
    particles: skillParticles(classId, skill.tags),
    drawCommands: skillDrawCommands(classId, skill.tags)
  };
}

export function createRenderPlan(run: CombatRun, sceneId: SceneId): RenderPlan {
  const palette = getScenePalette(sceneId);
  const backgroundCommands: RenderCommand[] = palette.layers.map((layer) => ({
    kind: "background-layer",
    id: layer.id,
    label: layer.label,
    layerId: layer.id,
    color: layer.colors[1],
    parallax: layer.parallax
  }));
  const enemyCommands: RenderCommand[] = run.enemies.map((enemy) => ({
    kind: "enemy",
    id: enemy.id,
    label: enemy.displayName,
    detailLevel: enemy.kind === "boss" ? "detailed-generated" : "silhouette"
  }));
  const hitSparkCommands: RenderCommand[] = run.events
    .filter(
      (event): event is CombatHitEvent => event.kind === "hit" && run.elapsedMs - event.occurredAtMs <= 520
    )
    .map((event) => ({
      kind: "hit-spark",
      id: event.id,
      color: event.action === "skill" ? classPalettes[run.state.player.classId].accent : palette.accent
    }));

  return {
    sceneId,
    palette,
    uiLayerShakes: false,
    commands: [
      ...backgroundCommands,
      { kind: "lane-ground", id: `${sceneId}-lane`, color: palette.accent },
      { kind: "player", id: run.state.player.classId, detailLevel: "detailed-generated" },
      ...enemyCommands,
      ...hitSparkCommands,
      { kind: "hud", id: "combat-hud", detailLevel: "hud" }
    ]
  };
}
