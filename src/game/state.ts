import { catalog } from "../data/catalog";
import type { CurrencyState, GameState, GearItem, GearSlot, OwnedGearItem, QuestStatus } from "./types";

const starterCurrency: CurrencyState = {
  gold: 1500,
  ironDust: 30,
  arcShard: 0,
  valorToken: 0,
  protectionTicket: 1
};

export function createOwnedGear(catalogGearId: string, suffix = "001"): OwnedGearItem {
  return {
    instanceId: `owned-${catalogGearId}-${suffix}`,
    catalogGearId,
    reinforceLevel: 0,
    amplifyLevel: 0,
    locked: false,
    bound: true,
    tradable: false,
    sealed: false
  };
}

function findCommonStarterGear(slot: GearSlot): GearItem | undefined {
  return catalog.gear.find((item) => item.slot === slot && item.rarity === "common");
}

function createInitialQuests(): Record<string, QuestStatus> {
  return Object.fromEntries(
    catalog.quests.map((quest) => [quest.id, quest.id === "prologue-ember-warden" ? "active" : "locked"])
  );
}

export function createInitialState(): GameState {
  const starterWeapon = findCommonStarterGear("weapon");
  const starterCore = findCommonStarterGear("core");
  const inventory = [starterWeapon, starterCore]
    .filter((item): item is GearItem => item !== undefined)
    .map((item) => createOwnedGear(item.id));
  const ownedWeapon = starterWeapon
    ? inventory.find((item) => item.catalogGearId === starterWeapon.id)
    : undefined;

  return {
    version: 1,
    catalogId: catalog.id,
    currentTown: "forge-market",
    seenTutorials: [],
    player: {
      heroId: catalog.hero.id,
      level: 1,
      experience: 0,
      heat: 0,
      currencies: { ...starterCurrency },
      inventory,
      equipment: ownedWeapon ? { weapon: ownedWeapon.instanceId } : {},
      loadouts: [{}, {}, {}],
      quests: createInitialQuests(),
      unlockedDungeons: ["cinder-kiln-alley"]
    }
  };
}
