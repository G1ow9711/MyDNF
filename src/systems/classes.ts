import { catalog } from "../data/catalog";
import type {
  AdvancementId,
  ClassAdvancementDefinition,
  ClassDefinition,
  ClassId,
  ClassSkillDefinition,
  GameState
} from "../game/types";

export interface AdvancementPreview {
  classDef: ClassDefinition;
  advancement: ClassAdvancementDefinition;
  requirementsMet: boolean;
  missingRequirements: string[];
}

const advancementQuestId = "prologue-ember-warden";
export const skillMaxLevel = 10;

function findClass(classId: string): ClassDefinition | undefined {
  return catalog.classes.find((classDef) => classDef.id === classId);
}

function findAdvancement(advancementId: string): ClassAdvancementDefinition | undefined {
  return catalog.classes.flatMap((classDef) => classDef.advancements).find((advancement) => advancement.id === advancementId);
}

function advancementGateMet(state: GameState, advancement: ClassAdvancementDefinition): string[] {
  const missing: string[] = [];
  const questStatus = state.player.quests[advancementQuestId];

  if (state.player.level < advancement.unlockLevel) {
    missing.push(`需要等级 ${advancement.unlockLevel}`);
  }

  if (questStatus !== "ready" && questStatus !== "completed") {
    missing.push("需要完成序章转职引导");
  }

  return missing;
}

function resourceValueForClass(classId: ClassId, value: number): number {
  const max = getClassDefinition(classId).resource.max;

  return Math.min(max, Math.max(0, Math.round(value)));
}

export function getClassDefinition(classId: string): ClassDefinition {
  const classDef = findClass(classId);

  if (!classDef) {
    throw new Error(`Unknown class: ${classId}`);
  }

  return classDef;
}

export function classResourceValue(state: GameState, classId: ClassId = state.player.classId): number {
  if (classId === state.player.classId) {
    const stored = state.player.classResources?.[classId];

    if (typeof stored === "number" && Number.isFinite(stored) && stored > 0) {
      return resourceValueForClass(classId, stored);
    }

    return resourceValueForClass(classId, state.player.heat);
  }

  const stored = state.player.classResources?.[classId];

  return resourceValueForClass(classId, typeof stored === "number" && Number.isFinite(stored) ? stored : 0);
}

export function syncCurrentClassResource(state: GameState, current = state.player.heat): GameState {
  const nextCurrent = resourceValueForClass(state.player.classId, current);

  return {
    ...state,
    player: {
      ...state.player,
      heat: nextCurrent,
      classResources: {
        ...state.player.classResources,
        [state.player.classId]: nextCurrent
      }
    }
  };
}

export function selectBaseClass(state: GameState, classId: string): GameState {
  const classDef = getClassDefinition(classId);

  if (state.player.advancementId) {
    throw new Error("Cannot change base class after advancement");
  }

  const syncedState = syncCurrentClassResource(state);
  const nextResource = classResourceValue(syncedState, classDef.id);

  return {
    ...syncedState,
    player: {
      ...syncedState.player,
      heroId: classDef.id,
      classId: classDef.id,
      heat: nextResource,
      classResources: {
        ...syncedState.player.classResources,
        [classDef.id]: nextResource
      }
    }
  };
}

export function getAdvancementPreview(state: GameState, advancementId: string): AdvancementPreview {
  const advancement = findAdvancement(advancementId);

  if (!advancement) {
    throw new Error(`Unknown advancement: ${advancementId}`);
  }

  const classDef = getClassDefinition(advancement.classId);
  const missingRequirements =
    state.player.classId === advancement.classId
      ? advancementGateMet(state, advancement)
      : [`转职不属于当前职业 ${state.player.classId}`];

  return {
    classDef,
    advancement,
    requirementsMet: missingRequirements.length === 0,
    missingRequirements
  };
}

export function advanceClass(state: GameState, advancementId: string): GameState {
  const preview = getAdvancementPreview(state, advancementId);

  if (preview.advancement.classId !== state.player.classId) {
    throw new Error(`Advancement ${advancementId} does not belong to class ${state.player.classId}`);
  }

  if (state.player.advancementId) {
    throw new Error(`Class already advanced: ${state.player.advancementId}`);
  }

  if (!preview.requirementsMet) {
    throw new Error(`Advancement requirements not met: ${preview.missingRequirements.join(", ")}`);
  }

  return {
    ...state,
    player: {
      ...state.player,
      advancementId: preview.advancement.id
    }
  };
}

export function getAvailableSkills(state: GameState): ClassSkillDefinition[] {
  const classDef = getClassDefinition(state.player.classId);
  const advancement = state.player.advancementId ? findAdvancement(state.player.advancementId) : undefined;
  const skillIds = new Set<string>([
    ...classDef.baseSkillIds,
    ...(advancement && advancement.classId === classDef.id ? advancement.skillIds : [])
  ]);

  return catalog.classSkills.filter((skill) => skill.classId === classDef.id && skillIds.has(skill.id));
}

export function getSkillLevel(state: GameState, skillId: string): number {
  const stored = state.player.skillLevels[skillId];

  return typeof stored === "number" && Number.isInteger(stored) ? Math.min(skillMaxLevel, Math.max(1, stored)) : 1;
}

export function skillDamageMultiplier(state: GameState, skillId: string): number {
  return 1 + (getSkillLevel(state, skillId) - 1) * 0.08;
}

export function skillCooldownMultiplier(state: GameState, skillId: string): number {
  return Math.max(0.82, 1 - (getSkillLevel(state, skillId) - 1) * 0.02);
}

export function upgradeSkill(state: GameState, skillId: string): GameState {
  const skill = getAvailableSkills(state).find((item) => item.id === skillId);

  if (!skill) {
    throw new Error(`Skill ${skillId} does not belong to the current class`);
  }

  if (state.player.skillPoints <= 0) {
    throw new Error("No skill points available");
  }

  const level = getSkillLevel(state, skillId);

  if (level >= skillMaxLevel) {
    throw new Error(`Skill ${skillId} is already at maximum level`);
  }

  return {
    ...state,
    player: {
      ...state.player,
      skillPoints: state.player.skillPoints - 1,
      skillLevels: {
        ...state.player.skillLevels,
        [skillId]: level + 1
      }
    }
  };
}

export function isKnownClassId(classId: string): classId is ClassId {
  return findClass(classId) !== undefined;
}

export function isKnownAdvancementId(advancementId: string): advancementId is AdvancementId {
  return findAdvancement(advancementId) !== undefined;
}
