import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { createInitialState } from "../game/state";
import type { GameState } from "../game/types";
import {
  advanceClass,
  getAdvancementPreview,
  getAvailableSkills,
  getClassDefinition,
  selectBaseClass
} from "../systems/classes";
import { loadGame, SAVE_KEY, type SaveStorage } from "../systems/save";

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

function readyToAdvance(state: GameState): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      level: 15,
      quests: {
        ...state.player.quests,
        "prologue-ember-warden": "ready"
      }
    }
  };
}

function writeSave(storage: MemoryStorage, value: unknown): void {
  storage.setItem(SAVE_KEY, JSON.stringify(value));
}

function cloneSave(state: GameState): Record<string, unknown> {
  return JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
}

describe("class catalog", () => {
  it("defines four original base classes with six skills and two advancements each", () => {
    expect(catalog.classes.map((item) => item.id)).toEqual([
      "ember-warden",
      "liuli-blademage",
      "ink-shadow-ranger",
      "iron-forge-guardian"
    ]);
    expect(catalog.classes.map((item) => item.displayName)).toEqual(["烬拳卫", "琉璃剑客", "墨影游侠", "玄甲司炉"]);

    for (const classDef of catalog.classes) {
      expect(classDef.baseSkillIds).toHaveLength(6);
      expect(classDef.advancements).toHaveLength(2);
      expect(classDef.resource.displayName.length).toBeGreaterThan(0);
      expect(classDef.roleTags.length).toBeGreaterThan(0);

      for (const advancement of classDef.advancements) {
        expect(advancement.classId).toBe(classDef.id);
        expect(advancement.unlockLevel).toBeGreaterThanOrEqual(15);
        expect(advancement.skillIds.length).toBeGreaterThan(0);
        expect(advancement.vfxPalette.primary).toMatch(/^#/);
      }
    }
  });
});

describe("class selection and advancement", () => {
  it("starts as 烬拳卫 and can switch base class before advancement", () => {
    const state = createInitialState();

    expect(state.player.classId).toBe("ember-warden");
    expect(state.player.heroId).toBe("ember-warden");
    expect(state.player.advancementId).toBeUndefined();

    const next = selectBaseClass(state, "liuli-blademage");

    expect(next.player.classId).toBe("liuli-blademage");
    expect(next.player.heroId).toBe("liuli-blademage");
    expect(getClassDefinition(next.player.classId).resource.displayName).toBe("璃息");
    expect(state.player.classId).toBe("ember-warden");
  });

  it("previews advancement requirements, bonuses, skills, and palette", () => {
    const state = selectBaseClass(createInitialState(), "ink-shadow-ranger");
    const preview = getAdvancementPreview(state, "night-contract-hunter");

    expect(preview.requirementsMet).toBe(false);
    expect(preview.advancement.displayName).toBe("夜契猎手");
    expect(preview.advancement.passiveBonuses.crit).toBeGreaterThan(0);
    expect(preview.advancement.skillIds).toEqual(expect.arrayContaining(["night-mark-detonation"]));
    expect(preview.advancement.vfxPalette.primary).toMatch(/^#/);
  });

  it("requires level and prologue progress before applying advancement", () => {
    const state = selectBaseClass(createInitialState(), "ember-warden");

    expect(() => advanceClass(state, "ember-furnace-master")).toThrow(/requirements/i);

    const advanced = advanceClass(readyToAdvance(state), "ember-furnace-master");

    expect(advanced.player.classId).toBe("ember-warden");
    expect(advanced.player.heroId).toBe("ember-warden");
    expect(advanced.player.advancementId).toBe("ember-furnace-master");
    expect(getAvailableSkills(advanced).map((skill) => skill.id)).toEqual(
      expect.arrayContaining(["spark-combo", "meteor-knuckle", "furnace-heart-overdrive"])
    );
  });

  it("rejects invalid class or advancement combinations and locks base class after advancement", () => {
    const state = readyToAdvance(selectBaseClass(createInitialState(), "liuli-blademage"));
    const advanced = advanceClass(state, "flowing-light-swordmaster");

    expect(() => selectBaseClass(advanced, "ember-warden")).toThrow(/cannot change base class/i);
    expect(() => selectBaseClass(createInitialState(), "missing-class")).toThrow(/unknown class/i);
    expect(() => advanceClass(state, "ember-furnace-master")).toThrow(/does not belong/i);
    expect(() => getAdvancementPreview(state, "missing-advancement")).toThrow(/unknown advancement/i);
  });
});

describe("class save validation", () => {
  it("round-trips class and advancement state and rejects unknown ids", () => {
    const storage = new MemoryStorage();
    const advanced = advanceClass(readyToAdvance(createInitialState()), "mountain-breaker");

    writeSave(storage, advanced);
    expect(loadGame(storage)).toEqual(advanced);

    const badClass = cloneSave(advanced);
    (badClass.player as Record<string, unknown>).classId = "missing-class";
    writeSave(storage, badClass);
    expect(() => loadGame(storage)).toThrow(/classId/i);

    const badAdvancement = cloneSave(advanced);
    (badAdvancement.player as Record<string, unknown>).advancementId = "missing-advancement";
    writeSave(storage, badAdvancement);
    expect(() => loadGame(storage)).toThrow(/advancementId/i);

    const mismatchedHero = cloneSave(advanced);
    (mismatchedHero.player as Record<string, unknown>).heroId = "liuli-blademage";
    writeSave(storage, mismatchedHero);
    expect(() => loadGame(storage)).toThrow(/heroId/i);
  });
});
