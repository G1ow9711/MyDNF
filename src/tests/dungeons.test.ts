import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/state";
import type { DungeonDifficultyId, DungeonId, GameState } from "../game/types";
import {
  DUNGEON_DIFFICULTY_ORDER,
  canEnterDungeon,
  consumeDungeonEntry,
  getDungeonDifficulty,
  preferredDungeonDifficulty
} from "../systems/dungeons";

describe("dungeon difficulty rules", () => {
  it("defines all difficulties in progression order with exact values", () => {
    expect(DUNGEON_DIFFICULTY_ORDER).toEqual(["normal", "adventure", "warrior"]);
    expect(DUNGEON_DIFFICULTY_ORDER.map(getDungeonDifficulty)).toEqual([
      {
        id: "normal",
        displayName: "普通",
        hpMultiplier: 1,
        damageMultiplier: 1,
        rewardMultiplier: 1,
        fatigueCost: 6
      },
      {
        id: "adventure",
        displayName: "冒险",
        hpMultiplier: 1.35,
        damageMultiplier: 1.2,
        rewardMultiplier: 1.35,
        fatigueCost: 8
      },
      {
        id: "warrior",
        displayName: "勇士",
        hpMultiplier: 1.75,
        damageMultiplier: 1.45,
        rewardMultiplier: 1.8,
        fatigueCost: 10
      }
    ]);
  });

  it("uses normal when no dungeon preference has been recorded", () => {
    expect(preferredDungeonDifficulty(createInitialState(), "cinder-kiln-alley")).toBe("normal");
  });
});

describe("dungeon entry", () => {
  it("deducts the exact fatigue cost and records preference without mutating input", () => {
    const state = createInitialState();

    const next = consumeDungeonEntry(state, "cinder-kiln-alley", "warrior");

    expect(next).not.toBe(state);
    expect(next.player).not.toBe(state.player);
    expect(next.player.fatigue).not.toBe(state.player.fatigue);
    expect(next.player.dungeonDifficultyPreferences).not.toBe(
      state.player.dungeonDifficultyPreferences
    );
    expect(next.player.fatigue).toEqual({ current: 54, max: 64 });
    expect(next.player.dungeonDifficultyPreferences).toEqual({
      "cinder-kiln-alley": "warrior"
    });
    expect(state.player.fatigue).toEqual({ current: 64, max: 64 });
    expect(state.player.dungeonDifficultyPreferences).toEqual({});
  });

  it.each([
    {
      name: "unknown dungeon",
      state: createInitialState(),
      dungeonId: "missing-dungeon" as DungeonId,
      difficultyId: "normal" as DungeonDifficultyId,
      reason: "unknown-dungeon"
    },
    {
      name: "locked dungeon",
      state: {
        ...createInitialState(),
        player: { ...createInitialState().player, unlockedDungeons: [] }
      },
      dungeonId: "cinder-kiln-alley" as DungeonId,
      difficultyId: "normal" as DungeonDifficultyId,
      reason: "locked"
    },
    {
      name: "level below dungeon minimum",
      state: {
        ...createInitialState(),
        player: {
          ...createInitialState().player,
          unlockedDungeons: ["cinder-kiln-alley", "liuli-furnace"]
        }
      } as GameState,
      dungeonId: "liuli-furnace" as DungeonId,
      difficultyId: "normal" as DungeonDifficultyId,
      reason: "level-too-low"
    },
    {
      name: "insufficient fatigue",
      state: {
        ...createInitialState(),
        player: {
          ...createInitialState().player,
          fatigue: { current: 7, max: 64 }
        }
      },
      dungeonId: "cinder-kiln-alley" as DungeonId,
      difficultyId: "adventure" as DungeonDifficultyId,
      reason: "insufficient-fatigue"
    }
  ])("rejects $name with a stable reason", ({ state, dungeonId, difficultyId, reason }) => {
    expect(canEnterDungeon(state, dungeonId, difficultyId)).toMatchObject({
      canEnter: false,
      reason
    });
    expect(() => consumeDungeonEntry(state, dungeonId, difficultyId)).toThrow(reason);
  });

  it("allows entry when catalog, unlock, level, and fatigue checks pass", () => {
    expect(canEnterDungeon(createInitialState(), "cinder-kiln-alley", "normal")).toEqual({
      canEnter: true,
      reason: "ready"
    });
  });
});
