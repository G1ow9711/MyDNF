import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { createInitialState, createOwnedGear } from "../game/state";
import type { AmplifyStat, GameState, GearItem, GearSlot, OwnedGearItem } from "../game/types";
import { amplify, getAmplifiedEquippedStats, reinforce } from "../systems/upgrades";

const slotOrder: GearSlot[] = [
  "weapon",
  "core",
  "head",
  "body",
  "legs",
  "belt",
  "boots",
  "necklace",
  "bracelet",
  "ring",
  "sigil",
  "charm"
];

function findCatalogGear(slot: GearSlot, predicate: (gear: GearItem) => boolean): GearItem {
  const gear = catalog.gear.find((item) => item.slot === slot && predicate(item));

  if (!gear) {
    throw new Error(`Missing catalog gear for ${slot}`);
  }

  return gear;
}

function findOwnedGear(state: GameState, instanceId: string): OwnedGearItem {
  const owned = state.player.inventory.find((item) => item.instanceId === instanceId);

  if (!owned) {
    throw new Error(`Missing owned gear: ${instanceId}`);
  }

  return owned;
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

function withInventory(state: GameState, inventory: OwnedGearItem[]): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      inventory: [...inventory]
    }
  };
}

function withOwnedItem(state: GameState, item: OwnedGearItem): GameState {
  return withInventory(state, [...state.player.inventory, item]);
}

function stateWithOwnedItem(item: OwnedGearItem): GameState {
  return withCurrencies(withOwnedItem(createInitialState(), item), {
    gold: 10000,
    ironDust: 1000,
    arcShard: 1000,
    protectionTicket: 0
  });
}

function rngSequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1] ?? 0;
}

describe("reinforcement", () => {
  it("raises level on success and consumes gold and iron dust by owned instance id without mutating input", () => {
    const state = createInitialState();
    const ownedWeaponId = state.player.equipment.weapon;

    if (!ownedWeaponId) {
      throw new Error("Starter weapon is not equipped");
    }

    const result = reinforce(state, ownedWeaponId, () => 0);
    const upgraded = findOwnedGear(result.state, ownedWeaponId);
    const original = findOwnedGear(state, ownedWeaponId);

    expect(result).toMatchObject({
      gearId: ownedWeaponId,
      type: "reinforce",
      success: true,
      protected: false,
      levelBefore: 0,
      levelAfter: 1
    });
    expect(upgraded.reinforceLevel).toBe(1);
    expect(result.state.player.currencies.gold).toBe(state.player.currencies.gold - 120);
    expect(result.state.player.currencies.ironDust).toBe(state.player.currencies.ironDust - 6);
    expect(result.state.player.currencies.protectionTicket).toBe(state.player.currencies.protectionTicket);
    expect(original.reinforceLevel).toBe(0);
    expect(result.state).not.toBe(state);
    expect(result.state.player).not.toBe(state.player);
    expect(result.state.player.inventory).not.toBe(state.player.inventory);
    expect(result.state.player.currencies).not.toBe(state.player.currencies);
  });

  it("consumes resources and does not drop on early reinforcement failure", () => {
    const commonCore = findCatalogGear("core", (gear) => gear.rarity === "common");
    const ownedCore = { ...createOwnedGear(commonCore.id, "early-failure"), reinforceLevel: 5 };
    const state = stateWithOwnedItem(ownedCore);

    const result = reinforce(state, ownedCore.instanceId, () => 0.99);
    const upgraded = findOwnedGear(result.state, ownedCore.instanceId);

    expect(result.success).toBe(false);
    expect(result.protected).toBe(false);
    expect(result.levelBefore).toBe(5);
    expect(result.levelAfter).toBe(5);
    expect(upgraded.reinforceLevel).toBe(5);
    expect(result.state.player.currencies.gold).toBe(state.player.currencies.gold - 420);
    expect(result.state.player.currencies.ironDust).toBe(state.player.currencies.ironDust - 16);
  });

  it.each([
    { levelBefore: 6, unprotectedLevelAfter: 5, protectedLevelAfter: 6 },
    { levelBefore: 9, unprotectedLevelAfter: 8, protectedLevelAfter: 9 },
    { levelBefore: 10, unprotectedLevelAfter: 10, protectedLevelAfter: 10 }
  ])(
    "handles risky reinforcement failure boundary at +$levelBefore",
    ({ levelBefore, unprotectedLevelAfter, protectedLevelAfter }) => {
      const epicBody = findCatalogGear("body", (gear) => gear.rarity === "epic");
      const ownedBody = {
        ...createOwnedGear(epicBody.id, `boundary-${levelBefore}`),
        reinforceLevel: levelBefore
      };
      const unprotected = stateWithOwnedItem(ownedBody);
      const protectedState = withCurrencies(unprotected, { protectionTicket: 1 });

      const unprotectedResult = reinforce(unprotected, ownedBody.instanceId, () => 0.99);
      const protectedResult = reinforce(protectedState, ownedBody.instanceId, () => 0.99);

      expect(unprotectedResult.success).toBe(false);
      expect(unprotectedResult.protected).toBe(false);
      expect(unprotectedResult.levelBefore).toBe(levelBefore);
      expect(unprotectedResult.levelAfter).toBe(unprotectedLevelAfter);
      expect(findOwnedGear(unprotectedResult.state, ownedBody.instanceId).reinforceLevel).toBe(
        unprotectedLevelAfter
      );
      expect(unprotectedResult.state.player.currencies.protectionTicket).toBe(0);

      expect(protectedResult.success).toBe(false);
      expect(protectedResult.protected).toBe(true);
      expect(protectedResult.levelBefore).toBe(levelBefore);
      expect(protectedResult.levelAfter).toBe(protectedLevelAfter);
      expect(findOwnedGear(protectedResult.state, ownedBody.instanceId).reinforceLevel).toBe(protectedLevelAfter);
      expect(protectedResult.state.player.currencies.protectionTicket).toBe(0);
    }
  );

  it("drops one level on risky failure and uses a protection ticket when present", () => {
    const rareRing = findCatalogGear("ring", (gear) => gear.rarity === "rare");
    const ownedRing = { ...createOwnedGear(rareRing.id, "risky-failure"), reinforceLevel: 7 };
    const unprotected = stateWithOwnedItem(ownedRing);
    const protectedState = withCurrencies(unprotected, { protectionTicket: 1 });

    const dropped = reinforce(unprotected, ownedRing.instanceId, () => 0.99);
    const protectedResult = reinforce(protectedState, ownedRing.instanceId, () => 0.99);

    expect(dropped.success).toBe(false);
    expect(dropped.protected).toBe(false);
    expect(dropped.levelAfter).toBe(6);
    expect(findOwnedGear(dropped.state, ownedRing.instanceId).reinforceLevel).toBe(6);
    expect(dropped.state.player.currencies.protectionTicket).toBe(0);

    expect(protectedResult.success).toBe(false);
    expect(protectedResult.protected).toBe(true);
    expect(protectedResult.levelAfter).toBe(7);
    expect(findOwnedGear(protectedResult.state, ownedRing.instanceId).reinforceLevel).toBe(7);
    expect(protectedResult.state.player.currencies.protectionTicket).toBe(0);
  });

  it("resets a +11 failure to +10 unless a protection ticket prevents the reset", () => {
    const epicWeapon = findCatalogGear("weapon", (gear) => gear.rarity === "epic");
    const ownedWeapon = { ...createOwnedGear(epicWeapon.id, "reset-failure"), reinforceLevel: 11 };
    const unprotected = stateWithOwnedItem(ownedWeapon);
    const protectedState = withCurrencies(unprotected, { protectionTicket: 1 });

    const reset = reinforce(unprotected, ownedWeapon.instanceId, () => 0.99);
    const protectedResult = reinforce(protectedState, ownedWeapon.instanceId, () => 0.99);

    expect(reset.success).toBe(false);
    expect(reset.protected).toBe(false);
    expect(reset.levelBefore).toBe(11);
    expect(reset.levelAfter).toBe(10);
    expect(findOwnedGear(reset.state, ownedWeapon.instanceId).reinforceLevel).toBe(10);

    expect(protectedResult.success).toBe(false);
    expect(protectedResult.protected).toBe(true);
    expect(protectedResult.levelAfter).toBe(11);
    expect(findOwnedGear(protectedResult.state, ownedWeapon.instanceId).reinforceLevel).toBe(11);
    expect(protectedResult.state.player.currencies.protectionTicket).toBe(0);
  });

  it("throws for reinforcement cap, catalog ids, unknown owned ids, and missing catalog gear", () => {
    const commonWeapon = findCatalogGear("weapon", (gear) => gear.rarity === "common");
    const capped = { ...createOwnedGear(commonWeapon.id, "capped"), reinforceLevel: 12 };
    const missingCatalog = { ...createOwnedGear("missing-catalog-gear", "missing"), instanceId: "owned-missing" };
    const state = withOwnedItem(stateWithOwnedItem(capped), missingCatalog);

    expect(() => reinforce(state, capped.instanceId, () => 0)).toThrow(/reinforcement cap/i);
    expect(() => reinforce(state, commonWeapon.id, () => 0)).toThrow(/unknown owned gear/i);
    expect(() => reinforce(state, "missing-owned-instance", () => 0)).toThrow(/unknown owned gear/i);
    expect(() => reinforce(state, missingCatalog.instanceId, () => 0)).toThrow(/missing catalog gear/i);
  });
});

describe("amplification", () => {
  it("rejects amplification on gear without an echo slot", () => {
    const state = createInitialState();
    const ownedWeaponId = state.player.equipment.weapon;

    if (!ownedWeaponId) {
      throw new Error("Starter weapon is not equipped");
    }

    expect(() => amplify(withCurrencies(state, { gold: 10000, arcShard: 1000 }), ownedWeaponId, () => 0)).toThrow(
      /echo slot/i
    );
  });

  it("raises level on success, consumes gold and arc shards, and assigns a deterministic stat", () => {
    const epicBracelet = findCatalogGear("bracelet", (gear) => gear.amplification.echoSlot);
    const ownedBracelet = createOwnedGear(epicBracelet.id, "amplify-success");
    const state = stateWithOwnedItem(ownedBracelet);

    const result = amplify(state, ownedBracelet.instanceId, rngSequence([0.1, 0.26]));
    const upgraded = findOwnedGear(result.state, ownedBracelet.instanceId);

    expect(result).toMatchObject({
      gearId: ownedBracelet.instanceId,
      type: "amplify",
      success: true,
      protected: false,
      levelBefore: 0,
      levelAfter: 1,
      amplifyStat: "cooldown"
    });
    expect(upgraded.amplifyLevel).toBe(1);
    expect(upgraded.amplifyStat).toBe("cooldown");
    expect(result.state.player.currencies.gold).toBe(state.player.currencies.gold - 220);
    expect(result.state.player.currencies.arcShard).toBe(state.player.currencies.arcShard - 2);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "falls back to the first amplify stat when stat RNG is non-finite: %s",
    (statRoll) => {
      const epicNecklace = findCatalogGear("necklace", (gear) => gear.amplification.echoSlot);
      const ownedNecklace = createOwnedGear(epicNecklace.id, `non-finite-${String(statRoll)}`);
      const state = stateWithOwnedItem(ownedNecklace);

      const result = amplify(state, ownedNecklace.instanceId, rngSequence([0.1, statRoll]));
      const upgraded = findOwnedGear(result.state, ownedNecklace.instanceId);

      expect(result.success).toBe(true);
      expect(result.amplifyStat).toBe("crit");
      expect(upgraded.amplifyStat).toBe("crit");
    }
  );

  it("throws at amplification cap +5", () => {
    const epicCharm = findCatalogGear("charm", (gear) => gear.amplification.echoSlot);
    const capped = {
      ...createOwnedGear(epicCharm.id, "amplify-cap"),
      amplifyLevel: 5,
      amplifyStat: "crit" as AmplifyStat
    };
    const state = stateWithOwnedItem(capped);

    expect(() => amplify(state, capped.instanceId, () => 0)).toThrow(/amplification cap/i);
  });

  it("consumes resources and keeps level and stat on amplification failure", () => {
    const epicSigil = findCatalogGear("sigil", (gear) => gear.amplification.echoSlot);
    const ownedSigil = {
      ...createOwnedGear(epicSigil.id, "amplify-failure"),
      amplifyLevel: 3,
      amplifyStat: "element" as AmplifyStat
    };
    const state = stateWithOwnedItem(ownedSigil);

    const result = amplify(state, ownedSigil.instanceId, () => 0.99);
    const upgraded = findOwnedGear(result.state, ownedSigil.instanceId);

    expect(result.success).toBe(false);
    expect(result.levelBefore).toBe(3);
    expect(result.levelAfter).toBe(3);
    expect(upgraded.amplifyLevel).toBe(3);
    expect(upgraded.amplifyStat).toBe("element");
    expect(result.state.player.currencies.gold).toBe(state.player.currencies.gold - 520);
    expect(result.state.player.currencies.arcShard).toBe(state.player.currencies.arcShard - 5);
  });

  it("throws for unknown owned ids and owned items with missing catalog gear", () => {
    const missingCatalog = { ...createOwnedGear("missing-catalog-gear", "amp-missing"), instanceId: "owned-amp-missing" };
    const state = withOwnedItem(createInitialState(), missingCatalog);

    expect(() => amplify(state, "missing-owned-instance", () => 0)).toThrow(/unknown owned gear/i);
    expect(() => amplify(state, missingCatalog.instanceId, () => 0)).toThrow(/missing catalog gear/i);
  });
});

describe("amplified equipped derived stats", () => {
  it("counts only the first two amplified equipped pieces in slot order", () => {
    const amplifiedItems = slotOrder.slice(0, 3).map((slot, index) => {
      const gear = findCatalogGear(slot, (item) => item.amplification.echoSlot);
      const stats: AmplifyStat[] = ["crit", "cooldown", "crit"];

      return {
        ...createOwnedGear(gear.id, `derived-${slot}`),
        amplifyLevel: index + 2,
        amplifyStat: stats[index]
      };
    });
    const state = {
      ...withInventory(createInitialState(), amplifiedItems),
      player: {
        ...withInventory(createInitialState(), amplifiedItems).player,
        equipment: {
          weapon: amplifiedItems[0].instanceId,
          core: amplifiedItems[1].instanceId,
          head: amplifiedItems[2].instanceId
        }
      }
    };

    const stats = getAmplifiedEquippedStats(state);

    expect(stats).toEqual({ crit: 2, cooldown: 3 });
  });
});
