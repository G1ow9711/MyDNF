import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import type { DungeonDef, GearSlot, OwnedGearItem, PlayerState, QuestDef, SkillDef, TownDef } from "../game/types";

const allSlots: GearSlot[] = [
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

const stableIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const mojibakePattern = /[�]|(?:鐑|拑|鍗|鐏|獞|鐞|€|绾|嫵|嚮|橀|拌)/;

function expectUniqueIds(items: Array<{ id: string }>): void {
  expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
}

function textValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(textValues);
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(textValues);
  }
  return [];
}

describe("catalog", () => {
  it("defines the required Chinese title, hero, dungeons, gear, and epic set bonuses", () => {
    expect(catalog.title).toBe("烬璃纪元");
    expect(catalog.hero.displayName).toBe("烬拳卫");
    expect(catalog.towns.map((town) => town.displayName)).toContain("炉山市集");
    expect(catalog.dungeons.map((dungeon) => dungeon.displayName)).toEqual(["灰窑巷", "琉璃熔炉"]);
    expect(catalog.gear.length).toBeGreaterThanOrEqual(60);
    expect(catalog.epicSets).toHaveLength(5);

    for (const epicSet of catalog.epicSets) {
      expect(epicSet.bonuses.map((bonus) => bonus.pieces)).toEqual([2, 3, 5]);
    }
  });

  it("keeps ids unique and stable across core catalog collections", () => {
    expectUniqueIds(catalog.skills);
    expectUniqueIds(catalog.dungeons);
    expectUniqueIds(catalog.epicSets);
    expectUniqueIds(catalog.gear);
    expectUniqueIds(catalog.quests);
    expectUniqueIds(catalog.towns);

    for (const id of [
      catalog.id,
      catalog.hero.id,
      ...catalog.skills.map((skill) => skill.id),
      ...catalog.dungeons.map((dungeon) => dungeon.id),
      ...catalog.epicSets.map((set) => set.id),
      ...catalog.gear.map((item) => item.id),
      ...catalog.quests.map((quest) => quest.id),
      ...catalog.towns.map((town) => town.id)
    ]) {
      expect(id).toMatch(stableIdPattern);
    }
  });

  it("contains readable Chinese display text without mojibake or replacement characters", () => {
    const catalogText = textValues({
      title: catalog.title,
      hero: catalog.hero,
      skills: catalog.skills,
      dungeons: catalog.dungeons,
      towns: catalog.towns,
      epicSets: catalog.epicSets,
      gear: catalog.gear,
      quests: catalog.quests
    });

    for (const text of catalogText) {
      expect(text).not.toMatch(mojibakePattern);
    }
  });

  it("covers all gear slots, rarity tiers, and valid set references", () => {
    expect(new Set(catalog.gear.map((item) => item.slot))).toEqual(new Set(allSlots));
    expect(new Set(catalog.gear.map((item) => item.rarity))).toEqual(
      new Set(["common", "uncommon", "rare", "epic", "mythic"])
    );

    const epicSetIds = new Set(catalog.epicSets.map((set) => set.id));
    for (const item of catalog.gear) {
      if (item.setId) {
        expect(epicSetIds.has(item.setId)).toBe(true);
        expect(["epic", "mythic"]).toContain(item.rarity);
      }
    }

    const levels = catalog.gear.map((item) => item.level);
    expect(Math.min(...levels)).toBe(1);
    expect(Math.max(...levels)).toBe(50);
  });

  it("keeps dungeon loot tables and requested public type names aligned", () => {
    const typedSkill: SkillDef = catalog.skills[0];
    const typedDungeon: DungeonDef = catalog.dungeons[0];
    const typedQuest: QuestDef = catalog.quests[0];
    const typedTown: TownDef = catalog.towns[0];
    const epicSetIds = new Set(catalog.epicSets.map((set) => set.id));

    for (const dungeon of catalog.dungeons) {
      expect(dungeon.lootSetIds.length).toBeGreaterThan(0);
      for (const setId of dungeon.lootSetIds) {
        expect(epicSetIds.has(setId)).toBe(true);
      }
    }

    expect(typedSkill.id).toMatch(stableIdPattern);
    expect(typedDungeon.id).toMatch(stableIdPattern);
    expect(typedQuest.id).toMatch(stableIdPattern);
    expect(typedTown.displayName).toBe("炉山市集");
  });

  it("models owned gear separately from catalog gear ids for future save and upgrade systems", () => {
    const ownedGear: OwnedGearItem = {
      instanceId: "owned-ember-001",
      catalogGearId: catalog.gear[0].id,
      reinforceLevel: 3,
      amplifyLevel: 1,
      amplifyStat: "crit",
      locked: false,
      bound: true,
      tradable: false,
      sealed: false,
      equipped: true
    };

    const player: PlayerState = {
      heroId: catalog.hero.id,
      level: 1,
      experience: 0,
      heat: 0,
      currencies: {
        gold: 0,
        ironDust: 0,
        arcShard: 0,
        valorToken: 0,
        protectionTicket: 0
      },
      inventory: [ownedGear],
      equipment: { weapon: ownedGear.instanceId },
      loadouts: [{ weapon: ownedGear.instanceId }, {}, {}],
      quests: {},
      unlockedDungeons: ["cinder-kiln-alley"]
    };

    expect(player.inventory[0].catalogGearId).toBe(catalog.gear[0].id);
    expect(player.equipment.weapon).toBe(ownedGear.instanceId);
  });
});
