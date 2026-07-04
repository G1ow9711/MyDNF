import { catalog } from "../data/catalog";
import type { ClassId, GameState, GearItem, OwnedGearItem, WeaponAppearanceDefinition } from "../game/types";

export interface EquippedWeaponAppearance {
  owned: OwnedGearItem;
  gear: GearItem;
  appearance: WeaponAppearanceDefinition;
}

export function weaponAppearanceFor(classId: ClassId, gear: GearItem): WeaponAppearanceDefinition | undefined {
  if (gear.slot !== "weapon") {
    return undefined;
  }

  return [...catalog.weaponAppearances]
    .filter((appearance) => appearance.classId === classId && appearance.minLevel <= gear.level)
    .sort((left, right) => right.minLevel - left.minLevel)[0];
}

export function equippedWeaponAppearanceFor(state: GameState): EquippedWeaponAppearance | undefined {
  const equippedWeaponId = state.player.equipment.weapon;

  if (!equippedWeaponId) {
    return undefined;
  }

  const owned = state.player.inventory.find((item) => item.instanceId === equippedWeaponId);

  if (!owned) {
    return undefined;
  }

  const gear = catalog.gear.find((item) => item.id === owned.catalogGearId);

  if (!gear || gear.slot !== "weapon") {
    return undefined;
  }

  const appearance = weaponAppearanceFor(state.player.classId, gear);

  if (!appearance) {
    return undefined;
  }

  return { owned, gear, appearance };
}
