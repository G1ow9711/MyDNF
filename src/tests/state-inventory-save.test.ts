import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { createInitialState, createOwnedGear } from "../game/state";
import type { GameState, GearItem, GearSlot, OwnedGearItem } from "../game/types";
import { applyLoadout, dismantleItem, equipItem, saveLoadout, sellItem } from "../systems/inventory";
import { loadGame, saveGame, SAVE_KEY, type SaveStorage } from "../systems/save";

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

function findCatalogGear(slot: GearSlot, rarity?: GearItem["rarity"]): GearItem {
  const item = catalog.gear.find((gear) => gear.slot === slot && (!rarity || gear.rarity === rarity));

  if (!item) {
    throw new Error(`Missing catalog gear for ${rarity ?? "any"} ${slot}`);
  }

  return item;
}

function ownedBySlot(state: GameState, slot: GearSlot): OwnedGearItem {
  const owned = state.player.inventory.find((item) => {
    const catalogItem = catalog.gear.find((gear) => gear.id === item.catalogGearId);
    return catalogItem?.slot === slot;
  });

  if (!owned) {
    throw new Error(`Missing owned ${slot}`);
  }

  return owned;
}

function withOwnedItem(state: GameState, item: OwnedGearItem): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      inventory: [...state.player.inventory, item]
    }
  };
}

describe("initial game state", () => {
  it("creates the required starter state from the catalog", () => {
    const state = createInitialState();
    const commonWeapon = findCatalogGear("weapon", "common");
    const commonCore = findCatalogGear("core", "common");
    const prologueQuestId = "prologue-ember-warden";

    expect(state.version).toBe(1);
    expect(state.catalogId).toBe(catalog.id);
    expect(state.currentTown).toBe("forge-market");
    expect(catalog.towns.some((town) => town.id === state.currentTown)).toBe(true);
    expect(state.currentDungeonId).toBeUndefined();
    expect(state.seenTutorials).toEqual([]);

    expect(state.player.heroId).toBe(catalog.hero.id);
    expect(state.player.level).toBe(1);
    expect(state.player.experience).toBe(0);
    expect(state.player.heat).toBe(0);
    expect(state.player.currencies).toEqual({
      gold: 1500,
      ironDust: 30,
      arcShard: 0,
      valorToken: 0,
      protectionTicket: 1
    });
    expect(state.player.unlockedDungeons).toContain("cinder-kiln-alley");

    expect(Object.keys(state.player.quests).sort()).toEqual(catalog.quests.map((quest) => quest.id).sort());
    expect(state.player.quests[prologueQuestId]).toBe("active");
    for (const quest of catalog.quests.filter((item) => item.id !== prologueQuestId)) {
      expect(state.player.quests[quest.id]).toBe("locked");
    }

    expect(state.player.loadouts).toHaveLength(3);
    expect(state.player.inventory.map((item) => item.catalogGearId)).toEqual(
      expect.arrayContaining([commonWeapon.id, commonCore.id])
    );
    expect(new Set(state.player.inventory.map((item) => item.instanceId)).size).toBe(state.player.inventory.length);

    const equippedWeaponId = state.player.equipment.weapon;
    expect(equippedWeaponId).toMatch(/^owned-common-.+-weapon-001$/);
    const equippedWeapon = state.player.inventory.find((item) => item.instanceId === equippedWeaponId);
    expect(equippedWeapon?.catalogGearId).toBe(commonWeapon.id);
  });
});

describe("inventory equipment and loadouts", () => {
  it("equips another owned item by instance id without mutating the input state", () => {
    const state = createInitialState();
    const ownedCore = ownedBySlot(state, "core");

    const next = equipItem(state, ownedCore.instanceId);

    expect(next).not.toBe(state);
    expect(next.player).not.toBe(state.player);
    expect(next.player.equipment).not.toBe(state.player.equipment);
    expect(next.player.equipment.core).toBe(ownedCore.instanceId);
    expect(state.player.equipment.core).toBeUndefined();
    expect(state.player.inventory).toHaveLength(next.player.inventory.length);
  });

  it("rejects unknown owned instances and owned items with missing catalog gear", () => {
    const state = createInitialState();
    const brokenState = withOwnedItem(state, {
      ...createOwnedGear("missing-catalog-gear", "001"),
      instanceId: "owned-missing-catalog-gear-001"
    });

    expect(() => equipItem(state, "missing-instance")).toThrow(/unknown owned item/i);
    expect(() => equipItem(brokenState, "owned-missing-catalog-gear-001")).toThrow(/missing catalog gear/i);
  });

  it("saves and applies one of three loadouts and rejects invalid indices", () => {
    const state = createInitialState();
    const ownedCore = ownedBySlot(state, "core");
    const equipped = equipItem(state, ownedCore.instanceId);
    const saved = saveLoadout(equipped, 1);
    const changed: GameState = {
      ...saved,
      player: {
        ...saved.player,
        equipment: {}
      }
    };

    const restored = applyLoadout(changed, 1);

    expect(saved.player.loadouts).toHaveLength(3);
    expect(saved.player.loadouts[1]).toEqual(equipped.player.equipment);
    expect(restored.player.equipment).toEqual(equipped.player.equipment);
    expect(restored.player.equipment).not.toBe(saved.player.loadouts[1]);

    expect(() => saveLoadout(equipped, -1)).toThrow(/loadout index/i);
    expect(() => saveLoadout(equipped, 3)).toThrow(/loadout index/i);
    expect(() => applyLoadout(equipped, -1)).toThrow(/loadout index/i);
    expect(() => applyLoadout(equipped, 3)).toThrow(/loadout index/i);
  });
});

describe("inventory item conversion", () => {
  it("sells an unequipped owned item for gold and rejects equipped items", () => {
    const state = createInitialState();
    const ownedCore = ownedBySlot(state, "core");
    const equippedWeaponId = state.player.equipment.weapon;

    const next = sellItem(state, ownedCore.instanceId);

    expect(next.player.inventory.some((item) => item.instanceId === ownedCore.instanceId)).toBe(false);
    expect(next.player.currencies.gold).toBeGreaterThan(state.player.currencies.gold);
    expect(() => sellItem(state, equippedWeaponId ?? "")).toThrow(/equipped item/i);
  });

  it("dismantles unequipped gear into deterministic materials and rejects equipped items", () => {
    const state = createInitialState();
    const rareRing = createOwnedGear(findCatalogGear("ring", "rare").id, "rare-test");
    const stateWithRare = withOwnedItem(state, rareRing);
    const equippedWeaponId = state.player.equipment.weapon;

    const next = dismantleItem(stateWithRare, rareRing.instanceId);

    expect(next.player.inventory.some((item) => item.instanceId === rareRing.instanceId)).toBe(false);
    expect(next.player.currencies.ironDust).toBeGreaterThan(stateWithRare.player.currencies.ironDust);
    expect(next.player.currencies.arcShard).toBeGreaterThan(stateWithRare.player.currencies.arcShard);
    expect(() => dismantleItem(state, equippedWeaponId ?? "")).toThrow(/equipped item/i);
  });
});

describe("save system", () => {
  it("round-trips game state through injected storage with the v1 save key", () => {
    const storage = new MemoryStorage();
    const state = createInitialState();

    saveGame(storage, state);
    const loaded = loadGame(storage);

    expect(SAVE_KEY).toBe("mydnf-save-v1");
    expect(storage.data.has(SAVE_KEY)).toBe(true);
    expect(loaded).toEqual(state);
  });

  it("returns null for empty storage and rejects malformed or incompatible saves", () => {
    const storage = new MemoryStorage();
    const state = createInitialState();

    expect(loadGame(storage)).toBeNull();

    storage.setItem(SAVE_KEY, "{bad json");
    expect(() => loadGame(storage)).toThrow(/malformed save/i);

    storage.setItem(SAVE_KEY, JSON.stringify({ ...state, version: 2 }));
    expect(() => loadGame(storage)).toThrow(/incompatible save/i);

    storage.setItem(SAVE_KEY, JSON.stringify({ ...state, catalogId: "other-catalog" }));
    expect(() => loadGame(storage)).toThrow(/incompatible save/i);
  });
});
