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

export interface AudioState {
  volumes: Record<VolumeKind, number>;
  currentBgm?: string;
  commandQueue: AudioCommand[];
}

export function createAudioState(): AudioState {
  return {
    volumes: {
      master: 0.9,
      music: 0.75,
      sfx: 0.85
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
