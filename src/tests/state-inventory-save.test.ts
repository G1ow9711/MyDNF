import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { addOwnedGear, createInitialState, createOwnedGear, nextOwnedGearSequence } from "../game/state";
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

function withLoadoutEquipment(
  state: GameState,
  index: number,
  equipment: Partial<Record<GearSlot, string>>
): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      loadouts: state.player.loadouts.map((loadout, loadoutIndex) =>
        loadoutIndex === index ? { ...equipment } : { ...loadout }
      )
    }
  };
}

function expectedSellGold(item: GearItem): number {
  const rarityValues: Record<GearItem["rarity"], number> = {
    common: 40,
    uncommon: 80,
    rare: 160,
    epic: 500,
    mythic: 1500
  };

  return rarityValues[item.rarity] + item.level * 5;
}

function expectedDismantleMaterials(item: GearItem): { ironDust: number; arcShard: number } {
  const ironDustValues: Record<GearItem["rarity"], number> = {
    common: 4,
    uncommon: 10,
    rare: 24,
    epic: 70,
    mythic: 180
  };
  const arcShardValues: Record<GearItem["rarity"], number> = {
    common: 0,
    uncommon: 0,
    rare: 2,
    epic: 8,
    mythic: 25
  };

  return {
    ironDust: ironDustValues[item.rarity] + item.level * 2,
    arcShard: arcShardValues[item.rarity]
  };
}

function writeSave(storage: MemoryStorage, value: unknown): void {
  storage.setItem(SAVE_KEY, JSON.stringify(value));
}

function cloneSave(state: GameState): Record<string, unknown> {
  return JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
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
  it("allocates unique readable instance ids for duplicate catalog acquisitions", () => {
    const state = createInitialState();
    const commonCore = findCatalogGear("core", "common");

    expect(nextOwnedGearSequence(state.player.inventory, commonCore.id)).toBe(2);

    const withSecondCore = addOwnedGear(state, commonCore.id);
    const withThirdCore = addOwnedGear(withSecondCore, commonCore.id);
    const coreCopies = withThirdCore.player.inventory.filter((item) => item.catalogGearId === commonCore.id);
    const coreInstanceIds = coreCopies.map((item) => item.instanceId);
    const targetInstanceId = `owned-${commonCore.id}-002`;

    expect(coreInstanceIds).toEqual([
      `owned-${commonCore.id}-001`,
      targetInstanceId,
      `owned-${commonCore.id}-003`
    ]);
    expect(new Set(coreInstanceIds).size).toBe(coreInstanceIds.length);

    const sold = sellItem(withThirdCore, targetInstanceId);

    expect(sold.player.inventory.some((item) => item.instanceId === targetInstanceId)).toBe(false);
    expect(sold.player.inventory.filter((item) => item.catalogGearId === commonCore.id).map((item) => item.instanceId)).toEqual([
      `owned-${commonCore.id}-001`,
      `owned-${commonCore.id}-003`
    ]);
    expect(sold.player.currencies.gold - withThirdCore.player.currencies.gold).toBe(expectedSellGold(commonCore));
  });

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
    const ownedCoreCatalog = findCatalogGear("core", "common");
    const equippedWeaponId = state.player.equipment.weapon;

    const next = sellItem(state, ownedCore.instanceId);

    expect(next.player.inventory.some((item) => item.instanceId === ownedCore.instanceId)).toBe(false);
    expect(next.player.currencies.gold - state.player.currencies.gold).toBe(expectedSellGold(ownedCoreCatalog));
    expect(() => sellItem(state, equippedWeaponId ?? "")).toThrow(/equipped item/i);
  });

  it("sells an item referenced only by a saved loadout and clears the stale loadout ref", () => {
    const state = createInitialState();
    const ownedCore = ownedBySlot(state, "core");
    const commonCore = findCatalogGear("core", "common");
    const loadoutOnly = withLoadoutEquipment(state, 2, { core: ownedCore.instanceId });

    const next = sellItem(loadoutOnly, ownedCore.instanceId);

    expect(next.player.inventory.some((item) => item.instanceId === ownedCore.instanceId)).toBe(false);
    expect(next.player.loadouts[2].core).toBeUndefined();
    expect(loadoutOnly.player.loadouts[2].core).toBe(ownedCore.instanceId);
    expect(next.player.currencies.gold - loadoutOnly.player.currencies.gold).toBe(expectedSellGold(commonCore));
  });

  it("dismantles unequipped gear into deterministic materials and rejects equipped items", () => {
    const state = createInitialState();
    const rareRingCatalog = findCatalogGear("ring", "rare");
    const rareRing = createOwnedGear(rareRingCatalog.id, "rare-test");
    const stateWithRare = withOwnedItem(state, rareRing);
    const equippedWeaponId = state.player.equipment.weapon;
    const expectedMaterials = expectedDismantleMaterials(rareRingCatalog);

    const next = dismantleItem(stateWithRare, rareRing.instanceId);

    expect(next.player.inventory.some((item) => item.instanceId === rareRing.instanceId)).toBe(false);
    expect(next.player.currencies.ironDust - stateWithRare.player.currencies.ironDust).toBe(
      expectedMaterials.ironDust
    );
    expect(next.player.currencies.arcShard - stateWithRare.player.currencies.arcShard).toBe(
      expectedMaterials.arcShard
    );
    expect(() => dismantleItem(state, equippedWeaponId ?? "")).toThrow(/equipped item/i);
  });

  it("dismantles an item referenced only by a saved loadout and clears the stale loadout ref", () => {
    const state = createInitialState();
    const rareRingCatalog = findCatalogGear("ring", "rare");
    const rareRing = createOwnedGear(rareRingCatalog.id, "rare-loadout");
    const stateWithRare = withOwnedItem(state, rareRing);
    const loadoutOnly = withLoadoutEquipment(stateWithRare, 1, { ring: rareRing.instanceId });
    const expectedMaterials = expectedDismantleMaterials(rareRingCatalog);

    const next = dismantleItem(loadoutOnly, rareRing.instanceId);

    expect(next.player.inventory.some((item) => item.instanceId === rareRing.instanceId)).toBe(false);
    expect(next.player.loadouts[1].ring).toBeUndefined();
    expect(loadoutOnly.player.loadouts[1].ring).toBe(rareRing.instanceId);
    expect(next.player.currencies.ironDust - loadoutOnly.player.currencies.ironDust).toBe(
      expectedMaterials.ironDust
    );
    expect(next.player.currencies.arcShard - loadoutOnly.player.currencies.arcShard).toBe(
      expectedMaterials.arcShard
    );
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

  it("rejects structurally invalid saves before returning state", () => {
    const storage = new MemoryStorage();
    const state = createInitialState();
    const missingPlayer: Partial<GameState> = { ...state };
    const duplicateInventory = [state.player.inventory[0], { ...state.player.inventory[0] }];

    delete missingPlayer.player;

    writeSave(storage, missingPlayer);
    expect(() => loadGame(storage)).toThrow(/player/i);

    writeSave(storage, { ...state, player: { ...state.player, inventory: {} } });
    expect(() => loadGame(storage)).toThrow(/inventory/i);

    writeSave(storage, { ...state, player: { ...state.player, inventory: duplicateInventory } });
    expect(() => loadGame(storage)).toThrow(/duplicate instance/i);

    writeSave(storage, { ...state, player: { ...state.player, equipment: { weapon: "missing-owned" } } });
    expect(() => loadGame(storage)).toThrow(/equipment.*inventory/i);
  });

  it.each([
    {
      name: "missing player hero id",
      mutate: (save: Record<string, unknown>) => {
        delete (save.player as Record<string, unknown>).heroId;
      },
      error: /heroId/i
    },
    {
      name: "wrong player hero id",
      mutate: (save: Record<string, unknown>) => {
        (save.player as Record<string, unknown>).heroId = "other-hero";
      },
      error: /heroId/i
    },
    {
      name: "bad player level",
      mutate: (save: Record<string, unknown>) => {
        (save.player as Record<string, unknown>).level = 0;
      },
      error: /level/i
    },
    {
      name: "bad player experience",
      mutate: (save: Record<string, unknown>) => {
        (save.player as Record<string, unknown>).experience = -1;
      },
      error: /experience/i
    },
    {
      name: "bad player heat",
      mutate: (save: Record<string, unknown>) => {
        (save.player as Record<string, unknown>).heat = Number.NaN;
      },
      error: /heat/i
    },
    {
      name: "inventory item missing reinforce level",
      mutate: (save: Record<string, unknown>) => {
        const player = save.player as Record<string, unknown>;
        const inventory = player.inventory as Array<Record<string, unknown>>;
        delete inventory[0].reinforceLevel;
      },
      error: /reinforceLevel/i
    },
    {
      name: "inventory item bad boolean flag",
      mutate: (save: Record<string, unknown>) => {
        const player = save.player as Record<string, unknown>;
        const inventory = player.inventory as Array<Record<string, unknown>>;
        inventory[0].locked = "no";
      },
      error: /locked/i
    },
    {
      name: "inventory item bad amplify stat",
      mutate: (save: Record<string, unknown>) => {
        const player = save.player as Record<string, unknown>;
        const inventory = player.inventory as Array<Record<string, unknown>>;
        inventory[0].amplifyStat = "speed";
      },
      error: /amplifyStat/i
    },
    {
      name: "invalid current town",
      mutate: (save: Record<string, unknown>) => {
        save.currentTown = "unknown-town";
      },
      error: /currentTown/i
    },
    {
      name: "unknown quest id",
      mutate: (save: Record<string, unknown>) => {
        const player = save.player as Record<string, unknown>;
        const quests = player.quests as Record<string, unknown>;
        quests["missing-quest"] = "active";
      },
      error: /quest/i
    },
    {
      name: "unknown unlocked dungeon id",
      mutate: (save: Record<string, unknown>) => {
        const player = save.player as Record<string, unknown>;
        player.unlockedDungeons = ["missing-dungeon"];
      },
      error: /unlockedDungeons/i
    },
    {
      name: "loadout ref points to missing inventory id",
      mutate: (save: Record<string, unknown>) => {
        const player = save.player as Record<string, unknown>;
        const loadouts = player.loadouts as Array<Record<string, unknown>>;
        loadouts[0].weapon = "missing-owned";
      },
      error: /loadouts.*inventory/i
    }
  ])("rejects invalid save: $name", ({ mutate, error }) => {
    const storage = new MemoryStorage();
    const state = createInitialState();
    const save = cloneSave(state);

    mutate(save);
    writeSave(storage, save);

    expect(() => loadGame(storage)).toThrow(error);
  });
});
