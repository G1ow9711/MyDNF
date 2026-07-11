import { catalog } from "../data/catalog";
import type { DungeonDifficultyId, DungeonId, GameState } from "../game/types";

export interface DungeonDifficultyRule {
  id: DungeonDifficultyId;
  displayName: string;
  hpMultiplier: number;
  damageMultiplier: number;
  rewardMultiplier: number;
  fatigueCost: number;
}

export type DungeonEntryReason =
  | "ready"
  | "unknown-dungeon"
  | "unknown-difficulty"
  | "locked"
  | "level-too-low"
  | "insufficient-fatigue";

export interface DungeonEntryResult {
  canEnter: boolean;
  reason: DungeonEntryReason;
}

export const DUNGEON_DIFFICULTY_ORDER: readonly DungeonDifficultyId[] = [
  "normal",
  "adventure",
  "warrior"
];

const dungeonDifficulties: Record<DungeonDifficultyId, DungeonDifficultyRule> = {
  normal: {
    id: "normal",
    displayName: "普通",
    hpMultiplier: 1,
    damageMultiplier: 1,
    rewardMultiplier: 1,
    fatigueCost: 6
  },
  adventure: {
    id: "adventure",
    displayName: "冒险",
    hpMultiplier: 1.35,
    damageMultiplier: 1.2,
    rewardMultiplier: 1.35,
    fatigueCost: 8
  },
  warrior: {
    id: "warrior",
    displayName: "勇士",
    hpMultiplier: 1.75,
    damageMultiplier: 1.45,
    rewardMultiplier: 1.8,
    fatigueCost: 10
  }
};

function isDungeonDifficultyId(value: string): value is DungeonDifficultyId {
  return DUNGEON_DIFFICULTY_ORDER.includes(value as DungeonDifficultyId);
}

export function getDungeonDifficulty(difficultyId: DungeonDifficultyId): DungeonDifficultyRule {
  if (!isDungeonDifficultyId(difficultyId)) {
    throw new Error(`Unknown dungeon difficulty: ${difficultyId}`);
  }

  return dungeonDifficulties[difficultyId];
}

export function preferredDungeonDifficulty(
  state: GameState,
  dungeonId: DungeonId
): DungeonDifficultyId {
  return state.player.dungeonDifficultyPreferences[dungeonId] ?? "normal";
}

export function canEnterDungeon(
  state: GameState,
  dungeonId: DungeonId,
  difficultyId: DungeonDifficultyId
): DungeonEntryResult {
  const dungeon = catalog.dungeons.find((candidate) => candidate.id === dungeonId);

  if (!dungeon) {
    return { canEnter: false, reason: "unknown-dungeon" };
  }

  if (!isDungeonDifficultyId(difficultyId)) {
    return { canEnter: false, reason: "unknown-difficulty" };
  }

  if (!state.player.unlockedDungeons.includes(dungeonId)) {
    return { canEnter: false, reason: "locked" };
  }

  if (state.player.level < dungeon.minLevel) {
    return { canEnter: false, reason: "level-too-low" };
  }

  if (state.player.fatigue.current < getDungeonDifficulty(difficultyId).fatigueCost) {
    return { canEnter: false, reason: "insufficient-fatigue" };
  }

  return { canEnter: true, reason: "ready" };
}

export function consumeDungeonEntry(
  state: GameState,
  dungeonId: DungeonId,
  difficultyId: DungeonDifficultyId
): GameState {
  const entry = canEnterDungeon(state, dungeonId, difficultyId);

  if (!entry.canEnter) {
    throw new Error(`Cannot enter dungeon: ${entry.reason}`);
  }

  const fatigueCost = getDungeonDifficulty(difficultyId).fatigueCost;

  return {
    ...state,
    player: {
      ...state.player,
      fatigue: {
        ...state.player.fatigue,
        current: state.player.fatigue.current - fatigueCost
      },
      dungeonDifficultyPreferences: {
        ...state.player.dungeonDifficultyPreferences,
        [dungeonId]: difficultyId
      }
    }
  };
}
