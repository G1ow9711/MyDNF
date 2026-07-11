import { catalog } from "../data/catalog";
import type { DungeonDifficultyId, DungeonId, GameState } from "../game/types";

export interface DungeonDifficultyRule {
  readonly id: DungeonDifficultyId;
  readonly displayName: string;
  readonly hpMultiplier: number;
  readonly damageMultiplier: number;
  readonly rewardMultiplier: number;
  readonly fatigueCost: number;
}

export type DungeonEntryReason =
  | "ready"
  | "unknown-dungeon"
  | "unknown-difficulty"
  | "locked"
  | "level-too-low"
  | "invalid-fatigue"
  | "insufficient-fatigue";

export interface DungeonEntryResult {
  canEnter: boolean;
  reason: DungeonEntryReason;
}

export const DUNGEON_DIFFICULTY_ORDER: readonly DungeonDifficultyId[] = Object.freeze([
  "normal",
  "adventure",
  "warrior"
]);

const dungeonDifficultyIds = new Set<string>(["normal", "adventure", "warrior"]);
const dungeonIds = new Set<string>(catalog.dungeons.map((dungeon) => dungeon.id));

const dungeonDifficulties: Readonly<Record<DungeonDifficultyId, DungeonDifficultyRule>> = Object.freeze({
  normal: Object.freeze({
    id: "normal",
    displayName: "普通",
    hpMultiplier: 1,
    damageMultiplier: 1,
    rewardMultiplier: 1,
    fatigueCost: 6
  }),
  adventure: Object.freeze({
    id: "adventure",
    displayName: "冒险",
    hpMultiplier: 1.35,
    damageMultiplier: 1.2,
    rewardMultiplier: 1.35,
    fatigueCost: 8
  }),
  warrior: Object.freeze({
    id: "warrior",
    displayName: "勇士",
    hpMultiplier: 1.75,
    damageMultiplier: 1.45,
    rewardMultiplier: 1.8,
    fatigueCost: 10
  })
});

function isDungeonDifficultyId(value: string): value is DungeonDifficultyId {
  return dungeonDifficultyIds.has(value);
}

function isDungeonId(value: string): value is DungeonId {
  return dungeonIds.has(value);
}

function hasValidFatigue(state: GameState): boolean {
  const { current, max } = state.player.fatigue;

  return (
    Number.isFinite(current) &&
    Number.isInteger(current) &&
    Number.isFinite(max) &&
    Number.isInteger(max) &&
    max > 0 &&
    current >= 0 &&
    current <= max
  );
}

export function getDungeonDifficulty(difficultyId: string): DungeonDifficultyRule {
  if (!isDungeonDifficultyId(difficultyId)) {
    throw new Error(`Unknown dungeon difficulty: ${difficultyId}`);
  }

  return dungeonDifficulties[difficultyId];
}

export function preferredDungeonDifficulty(
  state: GameState,
  dungeonId: string
): DungeonDifficultyId {
  if (!isDungeonId(dungeonId)) {
    throw new Error(`Unknown dungeon: ${dungeonId}`);
  }

  return state.player.dungeonDifficultyPreferences[dungeonId] ?? "normal";
}

export function canEnterDungeon(
  state: GameState,
  dungeonId: string,
  difficultyId: string
): DungeonEntryResult {
  if (!isDungeonId(dungeonId)) {
    return { canEnter: false, reason: "unknown-dungeon" };
  }

  if (!isDungeonDifficultyId(difficultyId)) {
    return { canEnter: false, reason: "unknown-difficulty" };
  }

  const dungeon = catalog.dungeons.find((candidate) => candidate.id === dungeonId);

  if (!dungeon) {
    return { canEnter: false, reason: "unknown-dungeon" };
  }

  if (!state.player.unlockedDungeons.includes(dungeonId)) {
    return { canEnter: false, reason: "locked" };
  }

  if (state.player.level < dungeon.minLevel) {
    return { canEnter: false, reason: "level-too-low" };
  }

  if (!hasValidFatigue(state)) {
    return { canEnter: false, reason: "invalid-fatigue" };
  }

  if (state.player.fatigue.current < getDungeonDifficulty(difficultyId).fatigueCost) {
    return { canEnter: false, reason: "insufficient-fatigue" };
  }

  return { canEnter: true, reason: "ready" };
}

export function consumeDungeonEntry(
  state: GameState,
  dungeonId: string,
  difficultyId: string
): GameState {
  const entry = canEnterDungeon(state, dungeonId, difficultyId);

  if (!entry.canEnter) {
    throw new Error(`Cannot enter dungeon: ${entry.reason}`);
  }

  if (!isDungeonId(dungeonId) || !isDungeonDifficultyId(difficultyId)) {
    throw new Error("Cannot enter dungeon: invalid runtime identifiers");
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
