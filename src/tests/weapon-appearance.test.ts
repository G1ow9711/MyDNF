import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { createInitialState, createOwnedGear } from "../game/state";
import { selectBaseClass } from "../systems/classes";
import { equippedWeaponAppearanceFor, weaponAppearanceFor } from "../systems/weapon-appearance";

function weaponByRarity(rarity: string, preferredId?: string) {
  const weapon = preferredId
    ? catalog.gear.find((item) => item.id === preferredId)
    : catalog.gear.find((item) => item.slot === "weapon" && item.rarity === rarity);

  if (!weapon) {
    throw new Error(`Missing ${rarity} weapon`);
  }

  return weapon;
}

function withEquippedWeapon(classId: Parameters<typeof selectBaseClass>[1], rarity: string, preferredId?: string) {
  const selected = selectBaseClass(createInitialState(), classId);
  const weapon = weaponByRarity(rarity, preferredId);
  const owned = createOwnedGear(weapon.id, `appearance-${rarity}`);

  return {
    ...selected,
    player: {
      ...selected.player,
      inventory: [owned],
      equipment: { weapon: owned.instanceId }
    }
  };
}

describe("weapon appearance system", () => {
  it("chooses a class weapon model with rarity, type, and mount anchors", () => {
    const rareWeapon = weaponByRarity("rare");
    const appearance = weaponAppearanceFor("ink-shadow-ranger", rareWeapon);

    expect(appearance?.id).toBe("weapon-ink-shadow-ranger-rare");
    expect(appearance?.weaponType).toBe("mechanism-crossbow");
    expect(appearance?.rarity).toBe("rare");
    expect(appearance?.roleFlavor).toContain("机关");
    expect(appearance?.asset.src).toBe("/assets/weapons/weapon-ink-shadow-ranger-rare.svg");
    expect(appearance?.asset.width).toBe(160);
    expect(appearance?.asset.height).toBe(160);
    expect(appearance?.townAnchor.scale).toBeGreaterThan(0.6);
    expect(appearance?.combatAnchor.scale).toBeGreaterThan(0.6);
  });

  it("reads the equipped weapon appearance from the player state", () => {
    const state = withEquippedWeapon("liuli-blademage", "mythic", "mythic-liuli-flow-weapon");
    const equipped = equippedWeaponAppearanceFor(state);

    expect(equipped?.appearance.id).toBe("weapon-liuli-blademage-mythic");
    expect(equipped?.appearance.asset.src).toBe("/assets/weapons/weapon-liuli-blademage-mythic.svg");
    expect(equipped?.gear.rarity).toBe("mythic");
    expect(equipped?.owned.instanceId).toBe("owned-mythic-liuli-flow-weapon-appearance-mythic");
  });

  it("returns undefined when no weapon is equipped", () => {
    const selected = selectBaseClass(createInitialState(), "iron-forge-guardian");
    const state = {
      ...selected,
      player: {
        ...selected.player,
        equipment: {}
      }
    };

    expect(equippedWeaponAppearanceFor(state)).toBeUndefined();
  });
});
