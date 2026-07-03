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

export function getClassDefinition(classId: string): ClassDefinition {
  const classDef = findClass(classId);

  if (!classDef) {
    throw new Error(`Unknown class: ${classId}`);
  }

  return classDef;
}

export function selectBaseClass(state: GameState, classId: string): GameState {
  const classDef = getClassDefinition(classId);

  if (state.player.advancementId) {
    throw new Error("Cannot change base class after advancement");
  }

  return {
    ...state,
    player: {
      ...state.player,
      heroId: classDef.id,
      classId: classDef.id,
      heat: 0
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

export function isKnownClassId(classId: string): classId is ClassId {
  return findClass(classId) !== undefined;
}

export function isKnownAdvancementId(advancementId: string): advancementId is AdvancementId {
  return findAdvancement(advancementId) !== undefined;
}
