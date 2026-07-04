import { catalog } from "../data/catalog";
import type { ClassId, GearItem, WeaponAppearanceDefinition } from "../game/types";

export function weaponAppearanceFor(classId: ClassId, gear: GearItem): WeaponAppearanceDefinition | undefined {
  if (gear.slot !== "weapon") {
    return undefined;
  }

  return [...catalog.weaponAppearances]
    .filter((appearance) => appearance.classId === classId && appearance.minLevel <= gear.level)
    .sort((left, right) => right.minLevel - left.minLevel)[0];
}
