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
