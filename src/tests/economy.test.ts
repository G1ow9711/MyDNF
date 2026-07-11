import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { createInitialState, createOwnedGear } from "../game/state";
import type { CurrencyId, GameState, GearItem, OwnedGearItem, Rarity } from "../game/types";
import { acceptTrade, createTradeBoard, getAuctionPricing, listAuction, resolveAuctions } from "../systems/market";
import { loadGame, SAVE_KEY, type SaveStorage } from "../systems/save";
import { buyShopItem, getBoxRates, openRandomBox } from "../systems/shop";

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

function withCurrencies(
  state: GameState,
  currencies: Partial<GameState["player"]["currencies"]>
): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      currencies: {
        ...state.player.currencies,
        ...currencies
      }
    }
  };
}

function withTradeBoard(state: GameState, seed: string): GameState {
  return {
    ...state,
    market: {
      ...state.market,
      tradeBoard: createTradeBoard(seed)
    }
  };
}

function withBoxes(state: GameState, boxId: string, count: number): GameState {
  return {
    ...state,
    shop: {
      ...state.shop,
      boxes: {
        ...state.shop.boxes,
        [boxId]: count
      }
    }
  };
}

function findUnequippedGear(state: GameState): OwnedGearItem {
  const equippedIds = new Set(Object.values(state.player.equipment));
  const item = state.player.inventory.find((owned) => !equippedIds.has(owned.instanceId));

  if (!item) {
    throw new Error("Expected at least one unequipped owned item");
  }

  return item;
}

function catalogGearFor(owned: OwnedGearItem): GearItem {
  const gear = catalog.gear.find((item) => item.id === owned.catalogGearId);

  if (!gear) {
    throw new Error(`Missing catalog gear: ${owned.catalogGearId}`);
  }

  return gear;
}

function currencyDelta(
  before: GameState,
  after: GameState,
  currencyId: CurrencyId
): number {
  return after.player.currencies[currencyId] - before.player.currencies[currencyId];
}

function countOwnedByRarity(state: GameState, rarity: Rarity): number {
  return state.player.inventory.filter((owned) => catalogGearFor(owned).rarity === rarity).length;
}

function writeSave(storage: MemoryStorage, value: unknown): void {
  storage.setItem(SAVE_KEY, JSON.stringify(value));
}

function cloneSave(state: GameState): Record<string, unknown> {
  return JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
}

describe("NPC trade board", () => {
  it("rotates deterministic offers after returning from a dungeon and accepts the current board offer", () => {
    const beforeDungeon = createTradeBoard("cinder-kiln-run-1");
    const sameSeed = createTradeBoard("cinder-kiln-run-1");
    const afterReturn = createTradeBoard("cinder-kiln-run-2");

    expect(sameSeed).toEqual(beforeDungeon);
    expect(afterReturn.id).not.toBe(beforeDungeon.id);
    expect(afterReturn.offers.map((offer) => offer.id)).not.toEqual(beforeDungeon.offers.map((offer) => offer.id));
    expect(beforeDungeon.offers.some((offer) => "tradeCredit" in offer.cost || "tradeCredit" in offer.reward)).toBe(true);

    const affordable = withCurrencies(withTradeBoard(createInitialState(), "cinder-kiln-run-1"), {
      gold: 5000,
      ironDust: 500,
      arcShard: 50,
      protectionTicket: 5,
      valorToken: 5,
      tradeCredit: 10
    });
    const offer = affordable.market.tradeBoard.offers[0];
    const accepted = acceptTrade(affordable, offer.id);

    for (const [currencyId, cost] of Object.entries(offer.cost) as Array<[CurrencyId, number]>) {
      expect(currencyDelta(affordable, accepted, currencyId)).toBe(-cost);
    }

    for (const [currencyId, reward] of Object.entries(offer.reward) as Array<[CurrencyId, number]>) {
      expect(currencyDelta(affordable, accepted, currencyId)).toBe(reward - (offer.cost[currencyId] ?? 0));
    }

    expect(accepted.market.tradeBoard.id).toBe(beforeDungeon.id);
    expect(accepted).not.toBe(affordable);
    expect(accepted.player).not.toBe(affordable.player);
  });
});

describe("auction simulation", () => {
  it("charges a listing fee, escrows an owned item, and sells it after simulated return", () => {
    const state = withCurrencies(createInitialState(), { gold: 2000 });
    const item = findUnequippedGear(state);
    const price = 1000;
    const expectedFee = 50;

    const listed = listAuction(state, item.instanceId, price);
    const listing = listed.market.auctions[0];

    expect(listing).toMatchObject({
      id: "auction-001",
      itemId: item.instanceId,
      price,
      fee: expectedFee,
      listedAtTurn: 0,
      status: "listed"
    });
    expect(listing.ownedItem).toEqual(item);
    expect(listed.player.currencies.gold).toBe(state.player.currencies.gold - expectedFee);
    expect(listed.player.inventory.some((owned) => owned.instanceId === item.instanceId)).toBe(false);

    const sold = resolveAuctions(listed, () => 0.2);

    expect(sold.market.auctions).toEqual([]);
    expect(sold.player.currencies.gold).toBe(state.player.currencies.gold - expectedFee + price);
    expect(sold.player.inventory.some((owned) => owned.instanceId === item.instanceId)).toBe(false);
  });

  it("records recent sold prices and derives demand-aware suggested pricing", () => {
    const baseState = createInitialState();
    const seedItem = findUnequippedGear(baseState);
    let state = withCurrencies(
      {
        ...baseState,
        player: {
          ...baseState.player,
          inventory: [
            ...baseState.player.inventory,
            createOwnedGear(seedItem.catalogGearId, "history-2"),
            createOwnedGear(seedItem.catalogGearId, "history-3"),
            createOwnedGear(seedItem.catalogGearId, "history-4"),
            createOwnedGear(seedItem.catalogGearId, "history-5"),
            createOwnedGear(seedItem.catalogGearId, "history-6")
          ]
        }
      },
      { gold: 5000 }
    );
    const item = findUnequippedGear(state);

    expect(getAuctionPricing(state, item.catalogGearId)).toMatchObject({
      catalogGearId: item.catalogGearId,
      recentPrices: [],
      suggestedPrice: 300,
      demandState: "cold",
      listingFee: 15
    });

    for (const price of [900, 1100, 1300, 1500, 1700, 1900]) {
      const currentItem = findUnequippedGear(state);
      const listed = listAuction(state, currentItem.instanceId, price);
      state = resolveAuctions(listed, () => 0);
    }

    expect(state.market.priceHistory[item.catalogGearId]).toEqual([
      { catalogGearId: item.catalogGearId, price: 1100, turn: 2 },
      { catalogGearId: item.catalogGearId, price: 1300, turn: 3 },
      { catalogGearId: item.catalogGearId, price: 1500, turn: 4 },
      { catalogGearId: item.catalogGearId, price: 1700, turn: 5 },
      { catalogGearId: item.catalogGearId, price: 1900, turn: 6 }
    ]);
    expect(getAuctionPricing(state, item.catalogGearId)).toMatchObject({
      recentPrices: [1100, 1300, 1500, 1700, 1900],
      suggestedPrice: 1500,
      demandState: "hot",
      listingFee: 75
    });
  });

  it("normalizes unordered price history before deriving pricing", () => {
    const state = createInitialState();
    const item = findUnequippedGear(state);
    const withHistory: GameState = {
      ...state,
      market: {
        ...state.market,
        priceHistory: {
          [item.catalogGearId]: [
            { catalogGearId: item.catalogGearId, price: 1600, turn: 6 },
            { catalogGearId: item.catalogGearId, price: 100, turn: 1 },
            { catalogGearId: item.catalogGearId, price: 1500, turn: 5 },
            { catalogGearId: item.catalogGearId, price: 1300, turn: 3 },
            { catalogGearId: item.catalogGearId, price: 1200, turn: 2 },
            { catalogGearId: item.catalogGearId, price: 1400, turn: 4 }
          ]
        }
      }
    };

    expect(getAuctionPricing(withHistory, item.catalogGearId)).toMatchObject({
      recentPrices: [1200, 1300, 1400, 1500, 1600],
      suggestedPrice: 1400,
      demandState: "hot",
      listingFee: 70
    });
  });

  it("rejects missing, equipped, and non-positive auction listings", () => {
    const state = createInitialState();
    const equippedWeaponId = state.player.equipment.weapon;
    const item = findUnequippedGear(state);

    expect(() => listAuction(state, "missing-owned-item", 100)).toThrow(/unknown owned item/i);
    expect(() => listAuction(state, item.instanceId, 0)).toThrow(/positive price/i);
    expect(() => listAuction(state, equippedWeaponId ?? "", 100)).toThrow(/equipped item/i);
  });

  it("keeps owned instance ids unique when an auction escrow holds a matching catalog item", () => {
    const firstPurchase = buyShopItem(
      withCurrencies(createInitialState(), { gold: 2000, valorToken: 6 }),
      "liuli-gift-pack"
    );
    const firstRing = firstPurchase.player.inventory.find((owned) => owned.catalogGearId === "epic-liuli-flow-ring");

    if (!firstRing) {
      throw new Error("Expected liuli gift pack gear");
    }

    const listed = listAuction(firstPurchase, firstRing.instanceId, 1000);
    const secondPurchase = buyShopItem(listed, "liuli-gift-pack");
    const returned = resolveAuctions(secondPurchase, () => 0.99);
    const liuliRingIds = returned.player.inventory
      .filter((owned) => owned.catalogGearId === "epic-liuli-flow-ring")
      .map((owned) => owned.instanceId)
      .sort();

    expect(liuliRingIds).toEqual(["owned-epic-liuli-flow-ring-001", "owned-epic-liuli-flow-ring-002"]);
    expect(new Set(liuliRingIds).size).toBe(liuliRingIds.length);
  });
});

describe("shop packs", () => {
  it("deducts Valor Tokens and grants deterministic gift pack contents", () => {
    const state = withCurrencies(createInitialState(), { valorToken: 5 });

    const bought = buyShopItem(state, "liuli-gift-pack");

    expect(bought.player.currencies.valorToken).toBe(2);
    expect(currencyDelta(state, bought, "ironDust")).toBe(80);
    expect(currencyDelta(state, bought, "arcShard")).toBe(4);
    expect(currencyDelta(state, bought, "protectionTicket")).toBe(2);
    expect(bought.player.inventory.length).toBe(state.player.inventory.length + 1);
    expect(bought.player.inventory.at(-1)?.catalogGearId).toBe("epic-liuli-flow-ring");
    expect(bought.shop.ownedCosmetics).toContain("liuli-market-coat");
    expect(bought.shop.boxes["ember-mythic-box"]).toBe(3);
    expect(bought.player.consumables).toEqual({ "healing-potion": 5, "revival-token": 2 });
    expect(state.shop.ownedCosmetics).toEqual([]);
  });

  it("sells recovery potions and revival tokens as independent consumable shop items", () => {
    const state = withCurrencies(createInitialState(), { gold: 400, valorToken: 2 });
    const withPotions = buyShopItem(state, "healing-potion-bundle");
    const withRevival = buyShopItem(withPotions, "revival-token");

    expect(withPotions.player.currencies.gold).toBe(220);
    expect(withPotions.player.consumables["healing-potion"]).toBe(6);
    expect(withRevival.player.currencies.valorToken).toBe(1);
    expect(withRevival.player.consumables["revival-token"]).toBe(2);
  });

  it("rejects unknown or unaffordable shop purchases", () => {
    expect(() => buyShopItem(createInitialState(), "missing-sku")).toThrow(/unknown shop item/i);
    expect(() => buyShopItem(createInitialState(), "liuli-gift-pack")).toThrow(/insufficient valorToken/i);
  });
});

describe("random boxes", () => {
  it("exposes explicit rates and guarantees Mythic after 20 misses", () => {
    const rates = getBoxRates("ember-mythic-box");
    const totalRate = rates.entries.reduce((sum, entry) => sum + entry.rate, 0);

    expect(rates).toEqual({
      boxId: "ember-mythic-box",
      pityThreshold: 20,
      entries: [
        { rarity: "common", rate: 0.55 },
        { rarity: "rare", rate: 0.3 },
        { rarity: "epic", rate: 0.13 },
        { rarity: "mythic", rate: 0.02 }
      ]
    });
    expect(totalRate).toBeCloseTo(1);

    let state = withBoxes(createInitialState(), "ember-mythic-box", 20);
    const mythicsBefore = countOwnedByRarity(state, "mythic");

    for (let index = 0; index < rates.pityThreshold - 1; index += 1) {
      const result = openRandomBox(state, "ember-mythic-box", () => 0.97);

      expect(result.award.rarity).not.toBe("mythic");
      expect(result.state.shop.boxPity["ember-mythic-box"]).toBe(index + 1);
      state = result.state;
    }

    const pityResult = openRandomBox(state, "ember-mythic-box", () => 0.97);

    expect(pityResult.award.rarity).toBe("mythic");
    expect(pityResult.state.shop.boxPity["ember-mythic-box"]).toBe(0);
    expect(pityResult.state.shop.boxes["ember-mythic-box"]).toBe(0);
    expect(countOwnedByRarity(pityResult.state, "mythic")).toBe(mythicsBefore + 1);
  });

  it("rejects unknown random boxes and empty box inventory", () => {
    expect(() => getBoxRates("missing-box")).toThrow(/unknown random box/i);
    expect(() => openRandomBox(createInitialState(), "ember-mythic-box", () => 0)).toThrow(/no random boxes/i);
  });
});

describe("economy save validation", () => {
  it("migrates missing and oversized auction price history on load", () => {
    const storage = new MemoryStorage();
    const state = createInitialState();
    const item = findUnequippedGear(state);
    const legacySave = cloneSave(state);

    delete ((legacySave.market as Record<string, unknown>).priceHistory);
    writeSave(storage, legacySave);
    expect(loadGame(storage)?.market.priceHistory).toEqual({});

    const editedSave = cloneSave(state);
    (editedSave.market as Record<string, unknown>).priceHistory = {
      [item.catalogGearId]: [
        { catalogGearId: item.catalogGearId, price: 1600, turn: 6 },
        { catalogGearId: item.catalogGearId, price: 100, turn: 1 },
        { catalogGearId: item.catalogGearId, price: 1500, turn: 5 },
        { catalogGearId: item.catalogGearId, price: 1300, turn: 3 },
        { catalogGearId: item.catalogGearId, price: 1200, turn: 2 },
        { catalogGearId: item.catalogGearId, price: 1400, turn: 4 }
      ]
    };
    writeSave(storage, editedSave);

    expect(loadGame(storage)?.market.priceHistory[item.catalogGearId]).toEqual([
      { catalogGearId: item.catalogGearId, price: 1200, turn: 2 },
      { catalogGearId: item.catalogGearId, price: 1300, turn: 3 },
      { catalogGearId: item.catalogGearId, price: 1400, turn: 4 },
      { catalogGearId: item.catalogGearId, price: 1500, turn: 5 },
      { catalogGearId: item.catalogGearId, price: 1600, turn: 6 }
    ]);
  });

  it("round-trips economy state and rejects malformed market and shop branches", () => {
    const storage = new MemoryStorage();
    const item = findUnequippedGear(createInitialState());
    const listed = listAuction(withCurrencies(createInitialState(), { gold: 2000 }), item.instanceId, 1000);
    const economyState = buyShopItem(withCurrencies(listed, { valorToken: 3 }), "liuli-gift-pack");

    writeSave(storage, economyState);
    expect(loadGame(storage)).toEqual(economyState);

    const missingMarket = cloneSave(economyState);
    delete missingMarket.market;
    writeSave(storage, missingMarket);
    expect(() => loadGame(storage)).toThrow(/market/i);

    const badBoxCount = cloneSave(economyState);
    (((badBoxCount.shop as Record<string, unknown>).boxes as Record<string, unknown>)["ember-mythic-box"]) = "many";
    writeSave(storage, badBoxCount);
    expect(() => loadGame(storage)).toThrow(/shop.*boxes/i);

    const unknownBox = cloneSave(economyState);
    (((unknownBox.shop as Record<string, unknown>).boxes as Record<string, unknown>)["unknown-box"]) = 1;
    writeSave(storage, unknownBox);
    expect(() => loadGame(storage)).toThrow(/unknown box/i);

    const badAuctionItem = cloneSave(economyState);
    const auctions = (badAuctionItem.market as Record<string, unknown>).auctions as Array<Record<string, unknown>>;
    (auctions[0].ownedItem as Record<string, unknown>).catalogGearId = "missing-catalog";
    writeSave(storage, badAuctionItem);
    expect(() => loadGame(storage)).toThrow(/auction.*ownedItem.*catalogGearId/i);

    const badPriceHistory = cloneSave(economyState);
    ((badPriceHistory.market as Record<string, unknown>).priceHistory as Record<string, unknown>) = {
      "missing-catalog": [{ catalogGearId: "missing-catalog", price: 1000, turn: 1 }]
    };
    writeSave(storage, badPriceHistory);
    expect(() => loadGame(storage)).toThrow(/priceHistory.*missing-catalog/i);
  });
});
