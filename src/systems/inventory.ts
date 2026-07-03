import { catalog } from "../data/catalog";
import type { GameState, GearItem, GearSlot, OwnedGearItem, Rarity } from "../game/types";

type EquipmentState = Partial<Record<GearSlot, string>>;

const sellValues: Record<Rarity, number> = {
  common: 40,
  uncommon: 80,
  rare: 160,
  epic: 500,
  mythic: 1500
};

const dismantleIronDustValues: Record<Rarity, number> = {
  common: 4,
  uncommon: 10,
  rare: 24,
  epic: 70,
  mythic: 180
};

const dismantleArcShardValues: Record<Rarity, number> = {
  common: 0,
  uncommon: 0,
  rare: 2,
  epic: 8,
  mythic: 25
};

function validateLoadoutIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index > 2) {
    throw new Error(`Loadout index must be 0..2: ${index}`);
  }
}

function findOwnedItem(state: GameState, instanceId: string): OwnedGearItem {
  const ownedItem = state.player.inventory.find((item) => item.instanceId === instanceId);

  if (!ownedItem) {
    throw new Error(`Unknown owned item: ${instanceId}`);
  }

  return ownedItem;
}

function findCatalogGear(ownedItem: OwnedGearItem): GearItem {
  const catalogGear = catalog.gear.find((item) => item.id === ownedItem.catalogGearId);

  if (!catalogGear) {
    throw new Error(`Missing catalog gear for owned item: ${ownedItem.instanceId}`);
  }

  return catalogGear;
}

function cloneEquipment(equipment: EquipmentState): EquipmentState {
  return { ...equipment };
}

function isEquippedIn(equipment: EquipmentState, instanceId: string): boolean {
  return Object.values(equipment).includes(instanceId);
}

function isEquippedAnywhere(state: GameState, instanceId: string): boolean {
  return (
    isEquippedIn(state.player.equipment, instanceId) ||
    state.player.loadouts.some((loadout) => isEquippedIn(loadout, instanceId))
  );
}

function removeOwnedItem(state: GameState, instanceId: string): OwnedGearItem[] {
  return state.player.inventory.filter((item) => item.instanceId !== instanceId);
}

export function equipItem(state: GameState, instanceId: string): GameState {
  const ownedItem = findOwnedItem(state, instanceId);
  const catalogGear = findCatalogGear(ownedItem);

  return {
    ...state,
    player: {
      ...state.player,
      equipment: {
        ...state.player.equipment,
        [catalogGear.slot]: instanceId
      }
    }
  };
}

export function saveLoadout(state: GameState, index: number): GameState {
  validateLoadoutIndex(index);

  return {
    ...state,
    player: {
      ...state.player,
      loadouts: state.player.loadouts.map((loadout, loadoutIndex) =>
        loadoutIndex === index ? cloneEquipment(state.player.equipment) : cloneEquipment(loadout)
      )
    }
  };
}

export function applyLoadout(state: GameState, index: number): GameState {
  validateLoadoutIndex(index);

  return {
    ...state,
    player: {
      ...state.player,
      equipment: cloneEquipment(state.player.loadouts[index] ?? {})
    }
  };
}

export function sellItem(state: GameState, instanceId: string): GameState {
  const ownedItem = findOwnedItem(state, instanceId);
  const catalogGear = findCatalogGear(ownedItem);

  if (isEquippedAnywhere(state, instanceId)) {
    throw new Error(`Cannot sell equipped item: ${instanceId}`);
  }

  return {
    ...state,
    player: {
      ...state.player,
      inventory: removeOwnedItem(state, instanceId),
      currencies: {
        ...state.player.currencies,
        gold: state.player.currencies.gold + sellValues[catalogGear.rarity] + catalogGear.level * 5
      }
    }
  };
}

export function dismantleItem(state: GameState, instanceId: string): GameState {
  const ownedItem = findOwnedItem(state, instanceId);
  const catalogGear = findCatalogGear(ownedItem);
  const ironDust = dismantleIronDustValues[catalogGear.rarity] + catalogGear.level * 2;
  const arcShard = dismantleArcShardValues[catalogGear.rarity];

  if (isEquippedAnywhere(state, instanceId)) {
    throw new Error(`Cannot dismantle equipped item: ${instanceId}`);
  }

  return {
    ...state,
    player: {
      ...state.player,
      inventory: removeOwnedItem(state, instanceId),
      currencies: {
        ...state.player.currencies,
        ironDust: state.player.currencies.ironDust + ironDust,
        arcShard: state.player.currencies.arcShard + arcShard
      }
    }
  };
}
