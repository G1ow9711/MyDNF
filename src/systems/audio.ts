import type { DungeonId } from "../game/types";

export type VolumeKind = "master" | "music" | "sfx";
export type AudioIntensity = "calm" | "explore" | "combat" | "boss-phase-1" | "boss-phase-2" | "boss-phase-3";

export type MusicRequest =
  | { mode: "town"; hotspot?: "smith" | "auction" | "shop" | "costume" }
  | { mode: "dungeon"; dungeonId: DungeonId; danger: number }
  | { mode: "boss"; dungeonId: DungeonId; danger: number; bossPhase: 1 | 2 | 3 };

export interface MusicLayerPlan {
  trackId: string;
  intensity: AudioIntensity;
  layers: string[];
}

export interface AudioCommand {
  type: "bgm" | "sfx";
  id: string;
}

export type AudioChannel = "music" | "sfx";
export type AudioWaveform = "sine" | "triangle" | "sawtooth" | "square";

export interface AudioPlaybackNote {
  channel: AudioChannel;
  frequencyHz: number;
  startMs: number;
  durationMs: number;
  gain: number;
  effectiveGain: number;
  waveform: AudioWaveform;
}

export interface AudioPlaybackPlan {
  commandId: string;
  channel: AudioChannel;
  loopMs: number;
  textureTags: string[];
  notes: AudioPlaybackNote[];
}

export interface AudioPlaybackSink {
  startMusic(plan: AudioPlaybackPlan): void;
  playSfx(plan: AudioPlaybackPlan): void;
}

export interface AudioState {
  volumes: Record<VolumeKind, number>;
  currentBgm?: string;
  commandQueue: AudioCommand[];
}

const defaultVolumes: AudioState["volumes"] = {
  master: 0.9,
  music: 0.75,
  sfx: 0.85
};

export function createAudioState(savedVolumes?: Partial<AudioState["volumes"]>): AudioState {
  return {
    volumes: {
      master: clampVolume(savedVolumes?.master ?? defaultVolumes.master),
      music: clampVolume(savedVolumes?.music ?? defaultVolumes.music),
      sfx: clampVolume(savedVolumes?.sfx ?? defaultVolumes.sfx)
    },
    commandQueue: []
  };
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export function parseSavedVolumes(rawSettings: string | null): AudioState["volumes"] | undefined {
  if (!rawSettings) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawSettings) as Partial<Record<VolumeKind, unknown>>;
    const values = [parsed.master, parsed.music, parsed.sfx];

    if (!values.every((value) => typeof value === "number" && Number.isFinite(value))) {
      return undefined;
    }

    return {
      master: clampVolume(parsed.master as number),
      music: clampVolume(parsed.music as number),
      sfx: clampVolume(parsed.sfx as number)
    };
  } catch {
    return undefined;
  }
}

export function setVolume(state: AudioState, kind: VolumeKind, value: number): AudioState {
  return {
    ...state,
    volumes: {
      ...state.volumes,
      [kind]: clampVolume(value)
    }
  };
}

export function playBgm(state: AudioState, trackId: string): AudioState {
  return {
    ...state,
    currentBgm: trackId,
    commandQueue: [...state.commandQueue, { type: "bgm", id: trackId }]
  };
}

export function playSfx(state: AudioState, sfxId: string): AudioState {
  return {
    ...state,
    commandQueue: [...state.commandQueue, { type: "sfx", id: sfxId }]
  };
}

export function flushAudioCommands(state: AudioState): AudioState {
  return {
    ...state,
    commandQueue: []
  };
}

const musicPatterns: Record<string, Omit<AudioPlaybackPlan, "notes"> & { notes: Array<Omit<AudioPlaybackNote, "channel" | "effectiveGain">> }> = {
  "town-forge-market": {
    commandId: "town-forge-market",
    channel: "music",
    loopMs: 3200,
    textureTags: ["guqin-pentatonic", "lantern-ambience", "forge-pulse"],
    notes: [
      { frequencyHz: 220, startMs: 0, durationMs: 1200, gain: 0.22, waveform: "triangle" },
      { frequencyHz: 277.18, startMs: 420, durationMs: 480, gain: 0.18, waveform: "sine" },
      { frequencyHz: 329.63, startMs: 820, durationMs: 520, gain: 0.18, waveform: "sine" },
      { frequencyHz: 392, startMs: 1260, durationMs: 620, gain: 0.16, waveform: "triangle" },
      { frequencyHz: 329.63, startMs: 1880, durationMs: 520, gain: 0.16, waveform: "sine" },
      { frequencyHz: 277.18, startMs: 2360, durationMs: 600, gain: 0.16, waveform: "sine" },
      { frequencyHz: 82.41, startMs: 0, durationMs: 140, gain: 0.16, waveform: "sine" },
      { frequencyHz: 82.41, startMs: 800, durationMs: 140, gain: 0.16, waveform: "sine" },
      { frequencyHz: 110, startMs: 1600, durationMs: 140, gain: 0.16, waveform: "sine" },
      { frequencyHz: 82.41, startMs: 2400, durationMs: 140, gain: 0.16, waveform: "sine" }
    ]
  },
  "dungeon-cinder-kiln": {
    commandId: "dungeon-cinder-kiln",
    channel: "music",
    loopMs: 2800,
    textureTags: ["ash-wind", "combat-drums", "low-pulse"],
    notes: [
      { frequencyHz: 146.83, startMs: 0, durationMs: 800, gain: 0.24, waveform: "sawtooth" },
      { frequencyHz: 196, startMs: 620, durationMs: 360, gain: 0.16, waveform: "triangle" },
      { frequencyHz: 220, startMs: 980, durationMs: 360, gain: 0.16, waveform: "triangle" },
      { frequencyHz: 293.66, startMs: 1440, durationMs: 520, gain: 0.18, waveform: "sine" },
      { frequencyHz: 73.42, startMs: 0, durationMs: 120, gain: 0.22, waveform: "square" },
      { frequencyHz: 73.42, startMs: 700, durationMs: 120, gain: 0.18, waveform: "square" },
      { frequencyHz: 98, startMs: 1400, durationMs: 120, gain: 0.2, waveform: "square" },
      { frequencyHz: 73.42, startMs: 2100, durationMs: 120, gain: 0.18, waveform: "square" }
    ]
  },
  "dungeon-liuli-furnace": {
    commandId: "dungeon-liuli-furnace",
    channel: "music",
    loopMs: 3000,
    textureTags: ["glass-shimmer", "furnace-drone", "combat-drums"],
    notes: [
      { frequencyHz: 261.63, startMs: 0, durationMs: 700, gain: 0.16, waveform: "sine" },
      { frequencyHz: 329.63, startMs: 360, durationMs: 480, gain: 0.14, waveform: "sine" },
      { frequencyHz: 392, startMs: 720, durationMs: 520, gain: 0.15, waveform: "triangle" },
      { frequencyHz: 523.25, startMs: 1280, durationMs: 520, gain: 0.16, waveform: "sine" },
      { frequencyHz: 196, startMs: 1900, durationMs: 760, gain: 0.18, waveform: "triangle" },
      { frequencyHz: 65.41, startMs: 0, durationMs: 160, gain: 0.18, waveform: "square" },
      { frequencyHz: 98, startMs: 1500, durationMs: 160, gain: 0.18, waveform: "square" }
    ]
  },
  "boss-cinder-warden": {
    commandId: "boss-cinder-warden",
    channel: "music",
    loopMs: 2400,
    textureTags: ["boss-drums", "forge-roar", "phase-pressure"],
    notes: [
      { frequencyHz: 110, startMs: 0, durationMs: 900, gain: 0.26, waveform: "sawtooth" },
      { frequencyHz: 146.83, startMs: 420, durationMs: 560, gain: 0.2, waveform: "triangle" },
      { frequencyHz: 220, startMs: 980, durationMs: 620, gain: 0.22, waveform: "sawtooth" },
      { frequencyHz: 55, startMs: 0, durationMs: 120, gain: 0.24, waveform: "square" },
      { frequencyHz: 55, startMs: 600, durationMs: 120, gain: 0.22, waveform: "square" },
      { frequencyHz: 73.42, startMs: 1200, durationMs: 120, gain: 0.24, waveform: "square" },
      { frequencyHz: 55, startMs: 1800, durationMs: 120, gain: 0.22, waveform: "square" }
    ]
  },
  "boss-liuli-overseer": {
    commandId: "boss-liuli-overseer",
    channel: "music",
    loopMs: 2400,
    textureTags: ["boss-drums", "glass-shatter", "phase-three-bass"],
    notes: [
      { frequencyHz: 130.81, startMs: 0, durationMs: 840, gain: 0.24, waveform: "sawtooth" },
      { frequencyHz: 261.63, startMs: 420, durationMs: 420, gain: 0.18, waveform: "sine" },
      { frequencyHz: 392, startMs: 840, durationMs: 420, gain: 0.2, waveform: "triangle" },
      { frequencyHz: 523.25, startMs: 1320, durationMs: 420, gain: 0.18, waveform: "sine" },
      { frequencyHz: 65.41, startMs: 0, durationMs: 110, gain: 0.24, waveform: "square" },
      { frequencyHz: 65.41, startMs: 600, durationMs: 110, gain: 0.22, waveform: "square" },
      { frequencyHz: 98, startMs: 1200, durationMs: 110, gain: 0.24, waveform: "square" },
      { frequencyHz: 65.41, startMs: 1800, durationMs: 110, gain: 0.22, waveform: "square" }
    ]
  }
};

const sfxPatterns: Record<string, Omit<AudioPlaybackPlan, "notes"> & { notes: Array<Omit<AudioPlaybackNote, "channel" | "effectiveGain">> }> = {
  "back-attack-confirm": {
    commandId: "back-attack-confirm",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["rear-cut", "reverse-swish", "position-confirm"],
    notes: [
      { frequencyHz: 622.25, startMs: 0, durationMs: 84, gain: 0.13, waveform: "sawtooth" },
      { frequencyHz: 1244.51, startMs: 28, durationMs: 112, gain: 0.11, waveform: "triangle" },
      { frequencyHz: 1864.66, startMs: 74, durationMs: 146, gain: 0.08, waveform: "sine" }
    ]
  },
  "counter-hit-confirm": {
    commandId: "counter-hit-confirm",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["attack-break", "metal-crack", "counter-confirm"],
    notes: [
      { frequencyHz: 82.41, startMs: 0, durationMs: 126, gain: 0.24, waveform: "square" },
      { frequencyHz: 493.88, startMs: 18, durationMs: 154, gain: 0.16, waveform: "sawtooth" },
      { frequencyHz: 1479.98, startMs: 68, durationMs: 184, gain: 0.1, waveform: "triangle" },
      { frequencyHz: 2217.46, startMs: 112, durationMs: 138, gain: 0.07, waveform: "sine" }
    ]
  },
  "juggle-protection-confirm": {
    commandId: "juggle-protection-confirm",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["air-guard", "pressure-release", "juggle-limit"],
    notes: [
      { frequencyHz: 880, startMs: 0, durationMs: 96, gain: 0.14, waveform: "triangle" },
      { frequencyHz: 659.25, startMs: 36, durationMs: 142, gain: 0.12, waveform: "sawtooth" },
      { frequencyHz: 329.63, startMs: 92, durationMs: 190, gain: 0.09, waveform: "sine" }
    ]
  },
  "otg-hit-confirm": {
    commandId: "otg-hit-confirm",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["ground-crack", "low-impact", "prone-confirm"],
    notes: [
      { frequencyHz: 55, startMs: 0, durationMs: 180, gain: 0.3, waveform: "square" },
      { frequencyHz: 164.81, startMs: 18, durationMs: 150, gain: 0.2, waveform: "sawtooth" },
      { frequencyHz: 493.88, startMs: 72, durationMs: 126, gain: 0.1, waveform: "triangle" },
      { frequencyHz: 987.77, startMs: 116, durationMs: 104, gain: 0.07, waveform: "sine" }
    ]
  },
  "wall-bounce-confirm": {
    commandId: "wall-bounce-confirm",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["wall-crack", "body-rebound", "stone-debris"],
    notes: [
      { frequencyHz: 46.25, startMs: 0, durationMs: 190, gain: 0.32, waveform: "square" },
      { frequencyHz: 138.59, startMs: 16, durationMs: 170, gain: 0.22, waveform: "sawtooth" },
      { frequencyHz: 415.3, startMs: 58, durationMs: 132, gain: 0.13, waveform: "triangle" },
      { frequencyHz: 1244.51, startMs: 108, durationMs: 116, gain: 0.08, waveform: "sine" }
    ]
  },
  "grab-catch-confirm": {
    commandId: "grab-catch-confirm",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["gauntlet-lock", "cloth-tension", "grab-confirm"],
    notes: [
      { frequencyHz: 98, startMs: 0, durationMs: 128, gain: 0.24, waveform: "square" },
      { frequencyHz: 392, startMs: 20, durationMs: 116, gain: 0.16, waveform: "sawtooth" },
      { frequencyHz: 1174.66, startMs: 54, durationMs: 142, gain: 0.09, waveform: "triangle" }
    ]
  },
  "grab-throw-impact": {
    commandId: "grab-throw-impact",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["body-arc", "forge-slam", "stone-impact"],
    notes: [
      { frequencyHz: 49, startMs: 0, durationMs: 220, gain: 0.34, waveform: "square" },
      { frequencyHz: 146.83, startMs: 14, durationMs: 194, gain: 0.24, waveform: "sawtooth" },
      { frequencyHz: 440, startMs: 58, durationMs: 150, gain: 0.14, waveform: "triangle" },
      { frequencyHz: 1318.51, startMs: 112, durationMs: 132, gain: 0.08, waveform: "sine" }
    ]
  },
  "grab-resist-confirm": {
    commandId: "grab-resist-confirm",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["armor-repel", "grip-break", "resist-confirm"],
    notes: [
      { frequencyHz: 73.42, startMs: 0, durationMs: 164, gain: 0.28, waveform: "square" },
      { frequencyHz: 293.66, startMs: 24, durationMs: 146, gain: 0.18, waveform: "sawtooth" },
      { frequencyHz: 880, startMs: 72, durationMs: 138, gain: 0.1, waveform: "triangle" }
    ]
  },
  "enemy-wake-up-protection": {
    commandId: "enemy-wake-up-protection",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["rise", "protection-frame", "aether-shell"],
    notes: [
      { frequencyHz: 293.66, startMs: 0, durationMs: 146, gain: 0.13, waveform: "sine" },
      { frequencyHz: 587.33, startMs: 42, durationMs: 178, gain: 0.12, waveform: "triangle" },
      { frequencyHz: 1174.66, startMs: 94, durationMs: 204, gain: 0.08, waveform: "sine" }
    ]
  },
  "enemy-windup-light": {
    commandId: "enemy-windup-light",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["enemy-inhale", "claw-ready", "warning-rise"],
    notes: [
      { frequencyHz: 174.61, startMs: 0, durationMs: 130, gain: 0.14, waveform: "sawtooth" },
      { frequencyHz: 349.23, startMs: 58, durationMs: 160, gain: 0.12, waveform: "triangle" },
      { frequencyHz: 698.46, startMs: 128, durationMs: 180, gain: 0.08, waveform: "sine" }
    ]
  },
  "enemy-windup-heavy": {
    commandId: "enemy-windup-heavy",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["beast-growl", "armor-tension", "danger-pulse"],
    notes: [
      { frequencyHz: 73.42, startMs: 0, durationMs: 220, gain: 0.28, waveform: "square" },
      { frequencyHz: 220, startMs: 64, durationMs: 230, gain: 0.18, waveform: "sawtooth" },
      { frequencyHz: 440, startMs: 148, durationMs: 210, gain: 0.12, waveform: "triangle" }
    ]
  },
  "enemy-windup-boss": {
    commandId: "enemy-windup-boss",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["boss-roar", "arena-pressure", "doom-rise"],
    notes: [
      { frequencyHz: 41.2, startMs: 0, durationMs: 340, gain: 0.42, waveform: "square" },
      { frequencyHz: 110, startMs: 72, durationMs: 360, gain: 0.3, waveform: "sawtooth" },
      { frequencyHz: 329.63, startMs: 190, durationMs: 300, gain: 0.18, waveform: "triangle" },
      { frequencyHz: 987.77, startMs: 310, durationMs: 260, gain: 0.1, waveform: "sine" }
    ]
  },
  "enemy-impact-light": {
    commandId: "enemy-impact-light",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["claw-snap", "ember-pop", "impact-short"],
    notes: [
      { frequencyHz: 130.81, startMs: 0, durationMs: 92, gain: 0.24, waveform: "square" },
      { frequencyHz: 523.25, startMs: 18, durationMs: 118, gain: 0.16, waveform: "sawtooth" },
      { frequencyHz: 1567.98, startMs: 62, durationMs: 142, gain: 0.09, waveform: "triangle" }
    ]
  },
  "enemy-impact-heavy": {
    commandId: "enemy-impact-heavy",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["beast-crash", "armor-impact", "debris-ring"],
    notes: [
      { frequencyHz: 61.74, startMs: 0, durationMs: 180, gain: 0.4, waveform: "square" },
      { frequencyHz: 185, startMs: 20, durationMs: 210, gain: 0.26, waveform: "sawtooth" },
      { frequencyHz: 740, startMs: 74, durationMs: 230, gain: 0.15, waveform: "triangle" },
      { frequencyHz: 1480, startMs: 142, durationMs: 190, gain: 0.08, waveform: "sine" }
    ]
  },
  "enemy-impact-boss": {
    commandId: "enemy-impact-boss",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["boss-impact", "furnace-bass", "arena-shock"],
    notes: [
      { frequencyHz: 36.71, startMs: 0, durationMs: 300, gain: 0.5, waveform: "square" },
      { frequencyHz: 82.41, startMs: 18, durationMs: 330, gain: 0.36, waveform: "sawtooth" },
      { frequencyHz: 329.63, startMs: 80, durationMs: 280, gain: 0.2, waveform: "triangle" },
      { frequencyHz: 1318.51, startMs: 170, durationMs: 320, gain: 0.12, waveform: "sine" }
    ]
  },
  "evade-confirm": {
    commandId: "evade-confirm",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["evade-air", "near-miss", "confirm-chime"],
    notes: [
      { frequencyHz: 880, startMs: 0, durationMs: 70, gain: 0.1, waveform: "sawtooth" },
      { frequencyHz: 1320, startMs: 36, durationMs: 92, gain: 0.09, waveform: "triangle" },
      { frequencyHz: 2093, startMs: 82, durationMs: 120, gain: 0.07, waveform: "sine" }
    ]
  },
  "player-hurt-light": {
    commandId: "player-hurt-light",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["body-hit-light", "cloth-jolt", "hurt-short"],
    notes: [
      { frequencyHz: 116.54, startMs: 0, durationMs: 96, gain: 0.25, waveform: "square" },
      { frequencyHz: 349.23, startMs: 24, durationMs: 118, gain: 0.15, waveform: "sawtooth" },
      { frequencyHz: 698.46, startMs: 66, durationMs: 132, gain: 0.08, waveform: "triangle" }
    ]
  },
  "player-hurt-heavy": {
    commandId: "player-hurt-heavy",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["body-hit-heavy", "armor-rattle", "hurt-fall"],
    notes: [
      { frequencyHz: 55, startMs: 0, durationMs: 178, gain: 0.4, waveform: "square" },
      { frequencyHz: 164.81, startMs: 18, durationMs: 210, gain: 0.26, waveform: "sawtooth" },
      { frequencyHz: 659.25, startMs: 78, durationMs: 218, gain: 0.13, waveform: "triangle" }
    ]
  },
  "player-hurt-boss": {
    commandId: "player-hurt-boss",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["boss-crush", "player-impact", "low-shock"],
    notes: [
      { frequencyHz: 43.65, startMs: 0, durationMs: 260, gain: 0.48, waveform: "square" },
      { frequencyHz: 130.81, startMs: 20, durationMs: 280, gain: 0.32, waveform: "sawtooth" },
      { frequencyHz: 523.25, startMs: 90, durationMs: 260, gain: 0.17, waveform: "triangle" },
      { frequencyHz: 1046.5, startMs: 170, durationMs: 220, gain: 0.09, waveform: "sine" }
    ]
  },
  "guard-impact": {
    commandId: "guard-impact",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["shield-ring", "guard-spark", "absorbed-impact"],
    notes: [
      { frequencyHz: 196, startMs: 0, durationMs: 128, gain: 0.24, waveform: "square" },
      { frequencyHz: 987.77, startMs: 18, durationMs: 168, gain: 0.18, waveform: "triangle" },
      { frequencyHz: 1975.53, startMs: 76, durationMs: 220, gain: 0.12, waveform: "sine" }
    ]
  },
  "attack-swing-light": {
    commandId: "attack-swing-light",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["air-whoosh", "blade-edge", "short-tail"],
    notes: [
      { frequencyHz: 740, startMs: 0, durationMs: 70, gain: 0.13, waveform: "sawtooth" },
      { frequencyHz: 1110, startMs: 26, durationMs: 92, gain: 0.11, waveform: "triangle" },
      { frequencyHz: 1568, startMs: 64, durationMs: 108, gain: 0.08, waveform: "sine" }
    ]
  },
  "attack-swing-heavy": {
    commandId: "attack-swing-heavy",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["low-whoosh", "weapon-weight", "air-tail"],
    notes: [
      { frequencyHz: 180, startMs: 0, durationMs: 112, gain: 0.18, waveform: "square" },
      { frequencyHz: 420, startMs: 28, durationMs: 148, gain: 0.16, waveform: "sawtooth" },
      { frequencyHz: 840, startMs: 76, durationMs: 178, gain: 0.1, waveform: "triangle" }
    ]
  },
  "movement-jump": {
    commandId: "movement-jump",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["foot-release", "cloth-rise", "air-lift"],
    notes: [
      { frequencyHz: 196, startMs: 0, durationMs: 72, gain: 0.12, waveform: "square" },
      { frequencyHz: 392, startMs: 32, durationMs: 118, gain: 0.1, waveform: "triangle" },
      { frequencyHz: 784, startMs: 74, durationMs: 132, gain: 0.07, waveform: "sine" }
    ]
  },
  "movement-backstep": {
    commandId: "movement-backstep",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["heel-scrape", "cloth-snap", "air-retreat"],
    notes: [
      { frequencyHz: 130.81, startMs: 0, durationMs: 84, gain: 0.13, waveform: "square" },
      { frequencyHz: 523.25, startMs: 24, durationMs: 98, gain: 0.1, waveform: "sawtooth" },
      { frequencyHz: 1046.5, startMs: 62, durationMs: 120, gain: 0.07, waveform: "triangle" }
    ]
  },
  "normal-hit-1": {
    commandId: "normal-hit-1",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["blade-contact", "body-impact-light", "spark-short"],
    notes: [
      { frequencyHz: 146.83, startMs: 0, durationMs: 82, gain: 0.22, waveform: "square" },
      { frequencyHz: 659.25, startMs: 18, durationMs: 104, gain: 0.14, waveform: "sawtooth" },
      { frequencyHz: 1318.51, startMs: 58, durationMs: 126, gain: 0.09, waveform: "triangle" }
    ]
  },
  "normal-hit-2": {
    commandId: "normal-hit-2",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["blade-contact-hard", "body-impact-mid", "spark-cross"],
    notes: [
      { frequencyHz: 123.47, startMs: 0, durationMs: 96, gain: 0.26, waveform: "square" },
      { frequencyHz: 783.99, startMs: 20, durationMs: 126, gain: 0.16, waveform: "sawtooth" },
      { frequencyHz: 1567.98, startMs: 64, durationMs: 148, gain: 0.1, waveform: "triangle" }
    ]
  },
  "normal-hit-3": {
    commandId: "normal-hit-3",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["launcher-body", "rising-blade", "impact-ring"],
    notes: [
      { frequencyHz: 82.41, startMs: 0, durationMs: 132, gain: 0.34, waveform: "square" },
      { frequencyHz: 587.33, startMs: 20, durationMs: 162, gain: 0.2, waveform: "sawtooth" },
      { frequencyHz: 1760, startMs: 76, durationMs: 210, gain: 0.12, waveform: "triangle" },
      { frequencyHz: 2637.02, startMs: 138, durationMs: 184, gain: 0.08, waveform: "sine" }
    ]
  },
  "dash-hit": {
    commandId: "dash-hit",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["rush-contact", "speed-blade", "stagger-tail"],
    notes: [
      { frequencyHz: 110, startMs: 0, durationMs: 104, gain: 0.28, waveform: "square" },
      { frequencyHz: 987.77, startMs: 18, durationMs: 132, gain: 0.16, waveform: "sawtooth" },
      { frequencyHz: 1975.53, startMs: 72, durationMs: 168, gain: 0.1, waveform: "triangle" }
    ]
  },
  "air-hit": {
    commandId: "air-hit",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["air-contact", "light-blade", "high-spark"],
    notes: [
      { frequencyHz: 164.81, startMs: 0, durationMs: 82, gain: 0.2, waveform: "square" },
      { frequencyHz: 880, startMs: 18, durationMs: 112, gain: 0.14, waveform: "sawtooth" },
      { frequencyHz: 2093, startMs: 62, durationMs: 148, gain: 0.09, waveform: "sine" }
    ]
  },
  "heavy-launch": {
    commandId: "heavy-launch",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["heavy-contact", "launcher-rise", "metal-ring"],
    notes: [
      { frequencyHz: 65.41, startMs: 0, durationMs: 158, gain: 0.4, waveform: "square" },
      { frequencyHz: 329.63, startMs: 18, durationMs: 190, gain: 0.24, waveform: "sawtooth" },
      { frequencyHz: 1318.51, startMs: 72, durationMs: 228, gain: 0.14, waveform: "triangle" },
      { frequencyHz: 2637.02, startMs: 142, durationMs: 188, gain: 0.08, waveform: "sine" }
    ]
  },
  "heavy-slam": {
    commandId: "heavy-slam",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["ground-crush", "slam-bass", "debris-tail"],
    notes: [
      { frequencyHz: 49, startMs: 0, durationMs: 220, gain: 0.46, waveform: "square" },
      { frequencyHz: 98, startMs: 16, durationMs: 250, gain: 0.3, waveform: "sawtooth" },
      { frequencyHz: 392, startMs: 58, durationMs: 210, gain: 0.16, waveform: "triangle" },
      { frequencyHz: 1174.66, startMs: 124, durationMs: 248, gain: 0.1, waveform: "sine" }
    ]
  },
  "sword-dance-open": {
    commandId: "sword-dance-open",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["blade-draw", "air-cut", "glass-tail"],
    notes: [
      { frequencyHz: 1320, startMs: 0, durationMs: 72, gain: 0.2, waveform: "triangle" },
      { frequencyHz: 1760, startMs: 34, durationMs: 96, gain: 0.17, waveform: "sawtooth" },
      { frequencyHz: 180, startMs: 52, durationMs: 110, gain: 0.22, waveform: "square" },
      { frequencyHz: 2637.02, startMs: 96, durationMs: 150, gain: 0.1, waveform: "sine" }
    ]
  },
  "sword-dance-left": {
    commandId: "sword-dance-left",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["low-blade-whoosh", "left-cut", "light-impact"],
    notes: [
      { frequencyHz: 880, startMs: 0, durationMs: 82, gain: 0.17, waveform: "sawtooth" },
      { frequencyHz: 1318.51, startMs: 24, durationMs: 112, gain: 0.15, waveform: "triangle" },
      { frequencyHz: 130.81, startMs: 46, durationMs: 90, gain: 0.18, waveform: "square" }
    ]
  },
  "sword-dance-right": {
    commandId: "sword-dance-right",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["high-blade-whoosh", "right-cut", "light-impact"],
    notes: [
      { frequencyHz: 1174.66, startMs: 0, durationMs: 78, gain: 0.17, waveform: "sawtooth" },
      { frequencyHz: 1760, startMs: 22, durationMs: 108, gain: 0.15, waveform: "triangle" },
      { frequencyHz: 146.83, startMs: 44, durationMs: 92, gain: 0.18, waveform: "square" }
    ]
  },
  "sword-dance-cross": {
    commandId: "sword-dance-cross",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["crossed-blades", "double-cut", "stagger-impact"],
    notes: [
      { frequencyHz: 987.77, startMs: 0, durationMs: 90, gain: 0.18, waveform: "sawtooth" },
      { frequencyHz: 1479.98, startMs: 26, durationMs: 116, gain: 0.16, waveform: "triangle" },
      { frequencyHz: 1975.53, startMs: 58, durationMs: 128, gain: 0.14, waveform: "triangle" },
      { frequencyHz: 110, startMs: 44, durationMs: 130, gain: 0.24, waveform: "square" }
    ]
  },
  "sword-dance-finish": {
    commandId: "sword-dance-finish",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["finisher-bass", "heavy-blade", "liuli-shatter"],
    notes: [
      { frequencyHz: 55, startMs: 0, durationMs: 180, gain: 0.4, waveform: "square" },
      { frequencyHz: 164.81, startMs: 18, durationMs: 210, gain: 0.3, waveform: "sawtooth" },
      { frequencyHz: 1046.5, startMs: 54, durationMs: 170, gain: 0.2, waveform: "triangle" },
      { frequencyHz: 2093, startMs: 112, durationMs: 240, gain: 0.16, waveform: "sine" },
      { frequencyHz: 3135.96, startMs: 184, durationMs: 260, gain: 0.1, waveform: "sine" }
    ]
  },
  "skill-impact-heavy": {
    commandId: "skill-impact-heavy",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["impact", "metal-body", "spark-tail"],
    notes: [
      { frequencyHz: 96, startMs: 0, durationMs: 90, gain: 0.42, waveform: "square" },
      { frequencyHz: 220, startMs: 28, durationMs: 140, gain: 0.26, waveform: "sawtooth" },
      { frequencyHz: 880, startMs: 64, durationMs: 210, gain: 0.18, waveform: "triangle" }
    ]
  },
  "reinforce-success": {
    commandId: "reinforce-success",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["anvil", "spark-tail", "success-ring"],
    notes: [
      { frequencyHz: 180, startMs: 0, durationMs: 120, gain: 0.34, waveform: "square" },
      { frequencyHz: 523.25, startMs: 120, durationMs: 160, gain: 0.2, waveform: "triangle" },
      { frequencyHz: 1046.5, startMs: 250, durationMs: 180, gain: 0.14, waveform: "sine" }
    ]
  },
  "auction-sold": {
    commandId: "auction-sold",
    channel: "sfx",
    loopMs: 0,
    textureTags: ["coin", "paper-slip", "market-chime"],
    notes: [
      { frequencyHz: 660, startMs: 0, durationMs: 90, gain: 0.18, waveform: "triangle" },
      { frequencyHz: 880, startMs: 90, durationMs: 110, gain: 0.16, waveform: "triangle" },
      { frequencyHz: 1320, startMs: 210, durationMs: 120, gain: 0.12, waveform: "sine" }
    ]
  }
};

function fallbackSfxPattern(commandId: string): Omit<AudioPlaybackPlan, "notes"> & {
  notes: Array<Omit<AudioPlaybackNote, "channel" | "effectiveGain">>;
} {
  return {
    commandId,
    channel: "sfx",
    loopMs: 0,
    textureTags: ["ui-click", "short-tail"],
    notes: [
      { frequencyHz: 440, startMs: 0, durationMs: 80, gain: 0.18, waveform: "triangle" },
      { frequencyHz: 660, startMs: 80, durationMs: 100, gain: 0.12, waveform: "sine" }
    ]
  };
}

function applyVolumeToPlan(
  pattern: Omit<AudioPlaybackPlan, "notes"> & { notes: Array<Omit<AudioPlaybackNote, "channel" | "effectiveGain">> },
  volumes: Record<VolumeKind, number>
): AudioPlaybackPlan {
  const channelVolume = pattern.channel === "music" ? volumes.music : volumes.sfx;
  const effectiveMultiplier = volumes.master * channelVolume;

  return {
    commandId: pattern.commandId,
    channel: pattern.channel,
    loopMs: pattern.loopMs,
    textureTags: pattern.textureTags,
    notes: pattern.notes.map((note) => ({
      ...note,
      channel: pattern.channel,
      effectiveGain: note.gain * effectiveMultiplier
    }))
  };
}

export function createAudioPlaybackPlan(
  command: AudioCommand,
  volumes: Record<VolumeKind, number>
): AudioPlaybackPlan {
  const clampedVolumes = {
    master: clampVolume(volumes.master),
    music: clampVolume(volumes.music),
    sfx: clampVolume(volumes.sfx)
  };

  if (command.type === "bgm") {
    return applyVolumeToPlan(musicPatterns[command.id] ?? musicPatterns["town-forge-market"], clampedVolumes);
  }

  const pattern = sfxPatterns[command.id] ?? fallbackSfxPattern(command.id);
  return applyVolumeToPlan(pattern, clampedVolumes);
}

function musicVolumeKey(volumes: Record<VolumeKind, number>): string {
  return `${clampVolume(volumes.master)}:${clampVolume(volumes.music)}`;
}

export function createAudioCommandProcessor(sink: AudioPlaybackSink): { sync(state: AudioState): AudioState } {
  let lastBgm: string | undefined;
  let lastMusicVolumeKey = "";

  return {
    sync(state: AudioState): AudioState {
      const nextMusicVolumeKey = musicVolumeKey(state.volumes);
      let latestBgmIndex = -1;
      let playedBgm = false;

      for (const [index, command] of state.commandQueue.entries()) {
        if (command.type === "bgm") {
          latestBgmIndex = index;
        }
      }

      for (const [index, command] of state.commandQueue.entries()) {
        if (command.type === "bgm" && index !== latestBgmIndex) {
          continue;
        }

        const plan = createAudioPlaybackPlan(command, state.volumes);

        if (command.type === "bgm") {
          sink.startMusic(plan);
          lastBgm = command.id;
          playedBgm = true;
        } else {
          sink.playSfx(plan);
        }
      }

      if (
        !playedBgm &&
        state.currentBgm &&
        lastBgm === state.currentBgm &&
        lastMusicVolumeKey !== "" &&
        nextMusicVolumeKey !== lastMusicVolumeKey
      ) {
        sink.startMusic(createAudioPlaybackPlan({ type: "bgm", id: state.currentBgm }, state.volumes));
      }

      if (playedBgm || state.currentBgm) {
        lastBgm = state.currentBgm;
      }
      lastMusicVolumeKey = nextMusicVolumeKey;

      return flushAudioCommands(state);
    }
  };
}

export function chooseMusicLayer(request: MusicRequest): MusicLayerPlan {
  if (request.mode === "town") {
    return {
      trackId: "town-forge-market",
      intensity: "calm",
      layers: request.hotspot === "smith" ? ["market-strings", "forge-pulse"] : ["market-strings", "lantern-ambience"]
    };
  }

  if (request.mode === "boss") {
    const phaseLayers: Record<1 | 2 | 3, string[]> = {
      1: ["forge-drums", "glass-shimmer"],
      2: ["forge-drums", "glass-shimmer", "armor-break-pulse"],
      3: ["forge-drums", "glass-shimmer", "phase-three-bass"]
    };

    return {
      trackId: request.dungeonId === "liuli-furnace" ? "boss-liuli-overseer" : "boss-cinder-warden",
      intensity: `boss-phase-${request.bossPhase}` as AudioIntensity,
      layers: phaseLayers[request.bossPhase]
    };
  }

  const isLiuli = request.dungeonId === "liuli-furnace";
  const combat = request.danger >= 0.55;

  return {
    trackId: isLiuli ? "dungeon-liuli-furnace" : "dungeon-cinder-kiln",
    intensity: combat ? "combat" : "explore",
    layers: combat
      ? [isLiuli ? "glass-shimmer" : "ash-wind", "combat-drums"]
      : [isLiuli ? "glass-shimmer" : "ash-wind", "low-pulse"]
  };
}
