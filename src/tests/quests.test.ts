import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/state";
import type { GameState } from "../game/types";
import { loadGame, saveGame, SAVE_KEY, type SaveStorage } from "../systems/save";
import { applyQuestEvent, claimQuestReward, getActiveQuestText, isSystemUnlocked } from "../systems/quests";

class MemoryStorage implements SaveStorage {
  readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

function cloneSave(state: GameState): Record<string, unknown> {
  return JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
}

function writeSave(storage: MemoryStorage, value: unknown): void {
  storage.setItem(SAVE_KEY, JSON.stringify(value));
}

function claimPrologue(state: GameState): GameState {
  return claimQuestReward(
    applyQuestEvent(state, { type: "dungeonCleared", dungeonId: "cinder-kiln-alley" }),
    "prologue-ember-warden"
  );
}

describe("story quest progression", () => {
  it("starts the prologue active while later systems stay locked", () => {
    const state = createInitialState();

    expect(state.player.quests["prologue-ember-warden"]).toBe("active");
    expect(state.player.quests["smith-first-spark"]).toBe("locked");
    expect(state.player.quests["chapter-liuli-furnace"]).toBe("locked");
    expect(getActiveQuestText(state)).toContain("炉火未熄");
    expect(isSystemUnlocked(state, "smith")).toBe(false);
    expect(isSystemUnlocked(state, "auction")).toBe(false);
    expect(isSystemUnlocked(state, "amplification")).toBe(false);
    expect(isSystemUnlocked(state, "costume-pavilion")).toBe(false);
    expect(state.player.unlockedDungeons).toEqual(["cinder-kiln-alley"]);
  });

  it("marks the prologue ready after clearing 灰窑巷 and opens chapter one after reward claim", () => {
    const state = createInitialState();
    const cleared = applyQuestEvent(state, { type: "dungeonCleared", dungeonId: "cinder-kiln-alley" });

    expect(cleared.player.quests["prologue-ember-warden"]).toBe("ready");
    expect(cleared.player.currencies.gold).toBe(state.player.currencies.gold);
    expect(state.player.quests["prologue-ember-warden"]).toBe("active");

    const claimed = claimQuestReward(cleared, "prologue-ember-warden");

    expect(claimed.player.quests["prologue-ember-warden"]).toBe("completed");
    expect(claimed.player.quests["smith-first-spark"]).toBe("active");
    expect(claimed.player.quests["chapter-liuli-furnace"]).toBe("active");
    expect(claimed.player.unlockedDungeons).toEqual(["cinder-kiln-alley", "liuli-furnace"]);
    expect(claimed.player.currencies.gold - state.player.currencies.gold).toBe(600);
    expect(claimed.player.currencies.ironDust - state.player.currencies.ironDust).toBe(20);
  });

  it("uses the reinforcement tutorial to unlock the smith flow", () => {
    const prologueClaimed = claimPrologue(createInitialState());
    const reinforced = applyQuestEvent(prologueClaimed, { type: "reinforced" });

    expect(reinforced.player.quests["smith-first-spark"]).toBe("ready");
    expect(isSystemUnlocked(reinforced, "smith")).toBe(false);

    const claimed = claimQuestReward(reinforced, "smith-first-spark");

    expect(claimed.player.quests["smith-first-spark"]).toBe("completed");
    expect(isSystemUnlocked(claimed, "smith")).toBe(true);
    expect(claimed.player.currencies.protectionTicket - reinforced.player.currencies.protectionTicket).toBe(1);
  });

  it("unlocks amplification, auction, and costume pavilion after clearing 琉璃熔炉", () => {
    const chapterActive = claimPrologue(createInitialState());
    const cleared = applyQuestEvent(chapterActive, { type: "dungeonCleared", dungeonId: "liuli-furnace" });

    expect(cleared.player.quests["chapter-liuli-furnace"]).toBe("ready");
    expect(isSystemUnlocked(cleared, "auction")).toBe(false);

    const claimed = claimQuestReward(cleared, "chapter-liuli-furnace");

    expect(claimed.player.quests["chapter-liuli-furnace"]).toBe("completed");
    expect(isSystemUnlocked(claimed, "amplification")).toBe(true);
    expect(isSystemUnlocked(claimed, "auction")).toBe(true);
    expect(isSystemUnlocked(claimed, "costume-pavilion")).toBe(true);
    expect(claimed.player.currencies.arcShard - chapterActive.player.currencies.arcShard).toBe(8);
    expect(claimed.player.currencies.valorToken - chapterActive.player.currencies.valorToken).toBe(3);
  });

  it("advances chapter two through trade, loot, amplification, and the epilogue shop hook", () => {
    const liuliClaimed = claimQuestReward(
      applyQuestEvent(claimPrologue(createInitialState()), { type: "dungeonCleared", dungeonId: "liuli-furnace" }),
      "chapter-liuli-furnace"
    );

    expect(liuliClaimed.player.quests["chapter-two-trade-contract"]).toBe("active");
    expect(liuliClaimed.player.quests["chapter-two-relic-study"]).toBe("active");

    const relicFound = applyQuestEvent(liuliClaimed, { type: "itemLooted", itemId: "any-dungeon-drop" });
    const tradeReady = applyQuestEvent(relicFound, { type: "tradeCompleted", offerId: "market-contract" });

    expect(relicFound.player.quests["chapter-two-relic-study"]).toBe("ready");
    expect(tradeReady.player.quests["chapter-two-trade-contract"]).toBe("ready");

    const tradeClaimed = claimQuestReward(tradeReady, "chapter-two-trade-contract");
    const resonanceReady = applyQuestEvent(tradeClaimed, { type: "amplified" });
    const resonanceClaimed = claimQuestReward(resonanceReady, "chapter-two-resonance");
    const epilogueReady = applyQuestEvent(resonanceClaimed, { type: "shopPurchased", sku: "liuli-gift-pack" });

    expect(tradeClaimed.player.quests["chapter-two-resonance"]).toBe("active");
    expect(resonanceClaimed.player.quests["epilogue-market-oath"]).toBe("active");
    expect(epilogueReady.player.quests["epilogue-market-oath"]).toBe("ready");
    expect(claimQuestReward(epilogueReady, "epilogue-market-oath").player.quests["epilogue-market-oath"]).toBe("completed");
  });

  it("ignores unmatched events and rejects invalid reward claims", () => {
    const state = createInitialState();
    const unmatched = applyQuestEvent(state, { type: "dungeonCleared", dungeonId: "liuli-furnace" });

    expect(unmatched.player.quests["prologue-ember-warden"]).toBe("active");
    expect(() => claimQuestReward(state, "prologue-ember-warden")).toThrow(/not ready/i);
    expect(() => claimQuestReward(state, "missing-quest")).toThrow(/unknown quest/i);
  });
});

describe("quest save validation", () => {
  it("persists quest progression through the save system", () => {
    const storage = new MemoryStorage();
    const progressed = claimQuestReward(
      applyQuestEvent(claimPrologue(createInitialState()), { type: "reinforced" }),
      "smith-first-spark"
    );

    saveGame(storage, progressed);

    expect(loadGame(storage)).toEqual(progressed);
  });

  it("rejects saves missing a catalog quest status", () => {
    const storage = new MemoryStorage();
    const save = cloneSave(createInitialState());
    const quests = (save.player as Record<string, unknown>).quests as Record<string, unknown>;

    delete quests["smith-first-spark"];
    writeSave(storage, save);

    expect(() => loadGame(storage)).toThrow(/missing quest/i);
  });
});
