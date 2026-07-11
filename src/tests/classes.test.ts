import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { createInitialState } from "../game/state";
import type { GameState } from "../game/types";
import {
  advanceClass,
  getAdvancementPreview,
  getAvailableSkills,
  getClassDefinition,
  getSkillLevel,
  resetSkillTree,
  selectBaseClass,
  skillResetGoldCost,
  upgradeSkill
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
  it("spends skill points on the active class skill tree only", () => {
    const state = {
      ...createInitialState(),
      player: {
        ...createInitialState().player,
        skillPoints: 2
      }
    };

    const upgraded = upgradeSkill(state, "spark-combo");

    expect(upgraded.player.skillPoints).toBe(1);
    expect(getSkillLevel(upgraded, "spark-combo")).toBe(2);
    expect(getSkillLevel(state, "spark-combo")).toBe(1);
    expect(() => upgradeSkill(upgraded, "glass-cut")).toThrow(/current class/i);
  });

  it("refunds spent ranks through a paid skill-tree reset", () => {
    const state = {
      ...createInitialState(),
      player: {
        ...createInitialState().player,
        skillPoints: 0,
        skillLevels: { "spark-combo": 3, "cinder-uppercut": 2 },
        currencies: {
          ...createInitialState().player.currencies,
          gold: skillResetGoldCost
        }
      }
    };

    expect(() =>
      resetSkillTree({
        ...state,
        player: {
          ...state.player,
          currencies: {
            ...state.player.currencies,
            gold: skillResetGoldCost - 1
          }
        }
      })
    ).toThrow(/insufficient gold/i);

    const reset = resetSkillTree(state);

    expect(reset.player.currencies.gold).toBe(0);
    expect(reset.player.skillPoints).toBe(3);
    expect(reset.player.skillLevels).toEqual({});
    expect(() => resetSkillTree(reset)).toThrow(/no upgraded skills/i);
  });

  it("starts as 烬拳卫 and can switch base class before advancement", () => {
    const state = createInitialState();

    expect(state.player.classId).toBe("ember-warden");
    expect(state.player.heroId).toBe("ember-warden");
    expect(state.player.advancementId).toBeUndefined();
    expect(state.player.classResources).toEqual({ "ember-warden": 0 });

    const next = selectBaseClass(state, "liuli-blademage");

    expect(next.player.classId).toBe("liuli-blademage");
    expect(next.player.heroId).toBe("liuli-blademage");
    expect(next.player.heat).toBe(0);
    expect(next.player.classResources).toMatchObject({
      "ember-warden": 0,
      "liuli-blademage": 0
    });
    expect(getClassDefinition(next.player.classId).resource.displayName).toBe("璃息");
    expect(state.player.classId).toBe("ember-warden");
  });

  it("keeps separate resource pools when switching base class before advancement", () => {
    const emberCharged = {
      ...createInitialState(),
      player: {
        ...createInitialState().player,
        heat: 72,
        classResources: {
          "ember-warden": 72
        }
      }
    };
    const liuli = selectBaseClass(emberCharged, "liuli-blademage");
    const liuliCharged = {
      ...liuli,
      player: {
        ...liuli.player,
        heat: 38,
        classResources: {
          ...liuli.player.classResources,
          "liuli-blademage": 38
        }
      }
    };
    const backToEmber = selectBaseClass(liuliCharged, "ember-warden");

    expect(liuli.player.heat).toBe(0);
    expect(liuli.player.classResources).toMatchObject({
      "ember-warden": 72,
      "liuli-blademage": 0
    });
    expect(backToEmber.player.heat).toBe(72);
    expect(backToEmber.player.classResources).toMatchObject({
      "ember-warden": 72,
      "liuli-blademage": 38
    });
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

  it("migrates legacy heat-only saves into class resource storage", () => {
    const storage = new MemoryStorage();
    const legacyState = selectBaseClass({
      ...createInitialState(),
      player: {
        ...createInitialState().player,
        heat: 34
      }
    }, "liuli-blademage");
    const legacySave = cloneSave({
      ...legacyState,
      player: {
        ...legacyState.player,
        heat: 34
      }
    });

    delete (legacySave.player as Record<string, unknown>).classResources;
    writeSave(storage, legacySave);

    expect(loadGame(storage)?.player.classResources).toEqual({
      "liuli-blademage": 34
    });
  });

  it("migrates legacy saves with the default consumable quickbar inventory", () => {
    const storage = new MemoryStorage();
    const legacySave = cloneSave(createInitialState());

    delete (legacySave.player as Record<string, unknown>).consumables;
    writeSave(storage, legacySave);

    expect((loadGame(storage)?.player as { consumables?: unknown }).consumables).toEqual({
      "healing-potion": 3,
      "revival-token": 1
    });
  });

  it("migrates legacy skill progress from the player level", () => {
    const storage = new MemoryStorage();
    const legacySave = cloneSave({
      ...createInitialState(),
      player: {
        ...createInitialState().player,
        level: 6
      }
    });

    delete (legacySave.player as Record<string, unknown>).skillPoints;
    delete (legacySave.player as Record<string, unknown>).skillLevels;
    writeSave(storage, legacySave);

    expect(loadGame(storage)?.player).toMatchObject({ skillPoints: 5, skillLevels: {} });
  });

  it("rejects malformed class resource save data", () => {
    const storage = new MemoryStorage();
    const save = cloneSave(createInitialState());

    (save.player as Record<string, unknown>).classResources = {
      "ember-warden": 10,
      "missing-class": 5
    };
    writeSave(storage, save);

    expect(() => loadGame(storage)).toThrow(/classResources/i);
  });
});
