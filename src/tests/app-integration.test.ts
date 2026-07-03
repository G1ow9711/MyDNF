import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/state";
import type { GameState } from "../game/types";
import { SAVE_KEY, type SaveStorage } from "../systems/save";
import { createAppModel, reduceAppAction, renderAppHtml } from "../ui/app";

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

function withQuestReady(state: GameState, questId: string): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      quests: {
        ...state.player.quests,
        [questId]: "ready"
      }
    }
  };
}

function withCurrency(state: GameState, patch: Partial<GameState["player"]["currencies"]>): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      currencies: {
        ...state.player.currencies,
        ...patch
      }
    }
  };
}

function readyForAdvancement(state: GameState): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      level: 15,
      quests: {
        ...state.player.quests,
        "prologue-ember-warden": "completed"
      }
    }
  };
}

describe("playable app integration actions", () => {
  it("reinforces selected gear through the app reducer", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({ storage, rng: () => 0 });
    const gearId = model.state.player.inventory[0].instanceId;
    const reinforced = reduceAppAction(model, { type: "reinforce", gearId });
    const updated = reinforced.state.player.inventory.find((item) => item.instanceId === gearId);

    expect(updated?.reinforceLevel).toBe(1);
    expect(reinforced.message).toContain("强化");
    expect(reinforced.state.player.currencies.gold).toBeLessThan(model.state.player.currencies.gold);
    expect(reinforced.audio.commandQueue.at(-1)).toEqual({ type: "sfx", id: "reinforce-success" });
  });

  it("updates the active reinforcement quest through the app reducer", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      rng: () => 0,
      initialState: withQuestReady(createInitialState(), "prologue-ember-warden")
    });
    const gearId = model.state.player.inventory[0].instanceId;

    model = reduceAppAction(model, { type: "claimQuest", questId: "prologue-ember-warden" });
    model = reduceAppAction(model, { type: "reinforce", gearId });

    expect(model.state.player.quests["smith-first-spark"]).toBe("ready");
  });

  it("claims a ready quest and unlocks the next dungeon and quests", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({
      storage,
      initialState: withQuestReady(createInitialState(), "prologue-ember-warden")
    });
    const claimed = reduceAppAction(model, { type: "claimQuest", questId: "prologue-ember-warden" });

    expect(claimed.state.player.quests["prologue-ember-warden"]).toBe("completed");
    expect(claimed.state.player.quests["smith-first-spark"]).toBe("active");
    expect(claimed.state.player.unlockedDungeons).toContain("liuli-furnace");
  });

  it("selects a base class and applies advancement through app actions", () => {
    const storage = new MemoryStorage();
    let model = createAppModel({ storage });

    model = reduceAppAction(model, { type: "selectBaseClass", classId: "liuli-blademage" });
    expect(model.state.player.classId).toBe("liuli-blademage");
    expect(model.state.player.heroId).toBe("liuli-blademage");
    expect(model.message).toContain("职业");

    model = {
      ...model,
      state: readyForAdvancement(model.state)
    };
    model = reduceAppAction(model, { type: "advanceClass", advancementId: "flowing-light-swordmaster" });

    expect(model.state.player.advancementId).toBe("flowing-light-swordmaster");
    expect(model.message).toContain("转职");

    const saved = reduceAppAction(model, { type: "save" });
    const loaded = reduceAppAction({ ...saved, state: createInitialState(), message: undefined }, { type: "load" });

    expect(loaded.state.player.classId).toBe("liuli-blademage");
    expect(loaded.state.player.advancementId).toBe("flowing-light-swordmaster");
  });

  it("grants room loot and marks the dungeon-clear quest ready after a full clear", () => {
    let model = createAppModel({ storage: new MemoryStorage() });
    const goldBefore = model.state.player.currencies.gold;
    const ironDustBefore = model.state.player.currencies.ironDust;

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    expect(model.audio.currentBgm).toBe("dungeon-cinder-kiln");
    model = reduceAppAction(model, { type: "combatAction", action: "finish" });
    model = reduceAppAction(model, { type: "combatAction", action: "finish" });
    model = reduceAppAction(model, { type: "combatAction", action: "finish" });

    expect(model.mode).toBe("town");
    expect(model.combatRun).toBeUndefined();
    expect(model.state.player.currencies.gold).toBeGreaterThan(goldBefore);
    expect(model.state.player.currencies.ironDust).toBeGreaterThan(ironDustBefore);
    expect(model.state.player.inventory.length).toBeGreaterThan(createInitialState().player.inventory.length);
    expect(model.state.player.quests["prologue-ember-warden"]).toBe("ready");
    expect(model.message).toContain("通关");
    expect(model.audio.currentBgm).toBe("town-forge-market");
    expect(model.audio.commandQueue).toEqual(expect.arrayContaining([{ type: "sfx", id: "loot-drop" }]));
  });

  it("renders the active objective tracker while inside a dungeon", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    const html = renderAppHtml(model);
    expect(html).toContain("任务追踪");
    expect(html).toContain("清理灰窑巷");
  });

  it("buys a gift pack, opens a box, and renders actionable shop controls", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({
      storage,
      rng: () => 0.99,
      initialState: withCurrency(createInitialState(), { valorToken: 5 })
    });
    const bought = reduceAppAction(model, { type: "buyShopItem", sku: "liuli-gift-pack" });
    const opened = reduceAppAction(bought, { type: "openBox", boxId: "ember-mythic-box" });
    const shopHtml = renderAppHtml({ ...opened, mode: "shop" });

    expect(bought.state.shop.boxes["ember-mythic-box"]).toBe(3);
    expect(opened.state.shop.boxes["ember-mythic-box"]).toBe(2);
    expect(opened.state.player.inventory.length).toBeGreaterThan(bought.state.player.inventory.length);
    expect(shopHtml).toContain("购买礼包");
    expect(shopHtml).toContain("开启箱子");
    expect(opened.audio.commandQueue).toEqual(expect.arrayContaining([{ type: "sfx", id: "box-open" }]));
  });

  it("accepts a trade offer and resolves an auction listing through app actions", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      rng: () => 0,
      initialState: withCurrency(createInitialState(), { gold: 5000, ironDust: 500, arcShard: 50, valorToken: 5 })
    });
    const offer = model.state.market.tradeBoard.offers[0];
    const unequipped = model.state.player.inventory.find(
      (item) => !Object.values(model.state.player.equipment).includes(item.instanceId)
    );

    if (!unequipped) {
      throw new Error("Expected unequipped item for auction");
    }

    model = reduceAppAction(model, { type: "acceptTrade", offerId: offer.id });
    expect(model.message).toContain("交易");

    const listed = reduceAppAction(model, { type: "listAuction", gearId: unequipped.instanceId, price: 500 });
    expect(listed.state.market.auctions).toHaveLength(1);
    expect(listed.state.player.inventory.some((item) => item.instanceId === unequipped.instanceId)).toBe(false);

    const resolved = reduceAppAction(listed, { type: "resolveAuctions" });
    expect(resolved.state.market.auctions).toHaveLength(0);
    expect(resolved.state.player.currencies.gold).toBeGreaterThan(listed.state.player.currencies.gold);
    expect(resolved.message).toContain("拍卖");
  });

  it("saves and loads app state through injected storage", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({ storage, rng: () => 0 });
    const gearId = model.state.player.inventory[0].instanceId;
    const reinforced = reduceAppAction(model, { type: "reinforce", gearId });
    const saved = reduceAppAction(reinforced, { type: "save" });
    const resetModel = { ...saved, state: createInitialState(), message: undefined };
    const loaded = reduceAppAction(resetModel, { type: "load" });

    expect(storage.data.has(SAVE_KEY)).toBe(true);
    expect(loaded.state).toEqual(saved.state);
    expect(loaded.message).toContain("读取");
  });
});
