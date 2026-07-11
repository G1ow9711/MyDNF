import { catalog } from "../data/catalog";
import {
  actionBufferWindowMs,
  canEnterRoomGate,
  combatSkillResourceCost,
  createCombatRun,
  enterRoomGate,
  finishRoom,
  performAction,
  roomGateForRun,
  roomTransitionActive,
  skillCooldownRemaining,
  stepCombat,
  type CombatActionInput,
  type CombatArenaHazardEvent,
  type CombatBossPhaseEvent,
  type CombatEnemy,
  type CombatEnemyAttackEvent,
  type CombatEnemySummonEvent,
  type CombatHitEvent,
  type CombatLootEvent,
  type CombatMissEvent,
  type CombatPlayerHitEvent,
  type CombatPlayerStatusEvent,
  type CombatRun,
  type CombatSkillCastEvent,
  type CombatSkillInputMethod,
  type CombatVector
} from "../game/combat";
import { addOwnedGear, createInitialState } from "../game/state";
import type { AdvancementId, ClassId, ClassSkillDefinition, ConsumableId, DungeonDifficultyId, DungeonId, GameState, SkillAnimationDefinition } from "../game/types";
import { createRenderPlan } from "../game/render";
import {
  chooseMusicLayer,
  createAudioCommandProcessor,
  createAudioState,
  parseSavedVolumes,
  playBgm,
  playSfx,
  setVolume,
  type AudioState
} from "../systems/audio";
import { createBrowserAudioSink } from "../systems/audio-browser";
import { advanceClass as applyClassAdvancement, getSkillLevel, resetSkillTree, selectBaseClass as applyBaseClass, syncCurrentClassResource, upgradeSkill } from "../systems/classes";
import { DUNGEON_DIFFICULTY_ORDER, canEnterDungeon, consumeDungeonEntry, getDungeonDifficulty, preferredDungeonDifficulty } from "../systems/dungeons";
import { applyLoadout, dismantleItem, equipItem, saveLoadout, sellItem, setItemLock } from "../systems/inventory";
import { acceptTrade, listAuction, resolveAuctions } from "../systems/market";
import { applyQuestEvent, claimQuestReward, getActiveQuestText } from "../systems/quests";
import { loadGame, saveGame, SAVE_KEY, type SaveStorage } from "../systems/save";
import { buyShopItem, openRandomBox } from "../systems/shop";
import { amplify, reinforce } from "../systems/upgrades";
import { equippedWeaponAppearanceFor, type EquippedWeaponAppearance } from "../systems/weapon-appearance";
import { heroAssetForClass } from "./assets";
import {
  renderAuctionPanel,
  renderClassPanel,
  renderInventoryPanel,
  renderQuestPanel,
  renderSettingsPanel,
  renderShopPanel,
  renderSmithPanel
} from "./panels";

export type AppMode = "town" | "dungeon-prep" | "combat" | "inventory" | "smith" | "auction" | "shop" | "quests" | "classes" | "settings";

export const AUDIO_SETTINGS_KEY = "mydnf-audio-settings-v1";

export interface AppViewModel {
  state: GameState;
  mode: AppMode;
  dungeonPrep?: { dungeonId: DungeonId; difficultyId: DungeonDifficultyId };
  combatRun?: CombatRun;
  message?: string;
  audio?: AudioState;
}

export interface AppModel extends AppViewModel {
  storage?: SaveStorage;
  rng: () => number;
  audio: AudioState;
  autoSaveDisabled?: boolean;
}

const combatTickMs = 48;

export type AppAction =
  | { type: "setMode"; mode: AppMode }
  | { type: "openDungeonPrep"; dungeonId: DungeonId }
  | { type: "selectDungeonDifficulty"; difficultyId: DungeonDifficultyId }
  | { type: "enterDungeon"; dungeonId: DungeonId; difficultyId?: DungeonDifficultyId }
  | { type: "combatTick"; moveX?: number; moveY?: number; dash?: boolean }
  | { type: "combatMove"; moveX: number; moveY: number; dash: boolean }
  | { type: "combatAction"; action: "light" | "heavy" | "jump" | "backstep" | "finish" }
  | { type: "combatAction"; action: "skill"; skillId: string; inputMethod?: CombatSkillInputMethod }
  | { type: "useConsumable"; consumableId: ConsumableId }
  | { type: "claimQuest"; questId: string }
  | { type: "selectBaseClass"; classId: ClassId }
  | { type: "advanceClass"; advancementId: AdvancementId }
  | { type: "upgradeSkill"; skillId: string }
  | { type: "resetSkillTree" }
  | { type: "equipItem"; gearId: string }
  | { type: "saveLoadout"; index: number }
  | { type: "applyLoadout"; index: number }
  | { type: "sellItem"; gearId: string }
  | { type: "dismantleItem"; gearId: string }
  | { type: "toggleItemLock"; gearId: string }
  | { type: "reinforce"; gearId?: string }
  | { type: "amplify"; gearId?: string }
  | { type: "buyShopItem"; sku: string }
  | { type: "openBox"; boxId: string }
  | { type: "acceptTrade"; offerId: string }
  | { type: "listAuction"; gearId?: string; price: number }
  | { type: "resolveAuctions" }
  | { type: "setVolume"; kind: keyof AudioState["volumes"]; value: number }
  | { type: "save" }
  | { type: "load" }
  | { type: "resetSave"; confirmed: boolean };

export interface CreateAppModelOptions {
  initialState?: GameState;
  storage?: SaveStorage;
  rng?: () => number;
}

interface InitialStateResult {
  state: GameState;
  message?: string;
  autoSaveDisabled?: boolean;
}

function navButton(mode: AppMode, label: string, activeMode: AppMode): string {
  return `<button class="nav-button${activeMode === mode ? " is-active" : ""}" data-mode="${mode}">${label}</button>`;
}

function renderNav(mode: AppMode): string {
  return `
    <nav class="top-nav" aria-label="系统导航">
      ${navButton("town", "城镇", mode)}
      ${navButton("inventory", "背包", mode)}
      ${navButton("smith", "强化", mode)}
      ${navButton("auction", "拍卖", mode)}
      ${navButton("shop", "商城", mode)}
      ${navButton("quests", "任务", mode)}
      ${navButton("classes", "职业", mode)}
      ${navButton("settings", "设置", mode)}
    </nav>
  `;
}

function defaultStorage(): SaveStorage | undefined {
  if (typeof globalThis.localStorage === "undefined") {
    return undefined;
  }

  return globalThis.localStorage;
}

function resolveInitialState(options: CreateAppModelOptions, storage: SaveStorage | undefined): InitialStateResult {
  if (options.initialState) {
    return { state: options.initialState };
  }

  if (!storage) {
    return { state: createInitialState() };
  }

  try {
    const loaded = loadGame(storage);

    if (loaded) {
      return { state: loaded, message: "已读取本地存档" };
    }
  } catch {
    return { state: createInitialState(), message: "存档读取失败，已启动新游戏", autoSaveDisabled: true };
  }

  return { state: createInitialState() };
}

function dungeonBackgroundAsset(dungeonId: DungeonId): string {
  return dungeonId === "liuli-furnace" ? "/assets/liuli-furnace-bg.png" : "/assets/cinder-kiln-bg.png";
}

function classSkillIds(state: GameState): Set<string> {
  const classDef = catalog.classes.find((item) => item.id === state.player.classId);
  const skillIds = new Set(classDef?.baseSkillIds ?? []);

  if (state.player.advancementId && classDef) {
    const advancement = classDef.advancements.find((item) => item.id === state.player.advancementId);

    for (const skillId of advancement?.skillIds ?? []) {
      skillIds.add(skillId);
    }
  }

  return skillIds;
}

function combatSkillsForState(state: GameState): ClassSkillDefinition[] {
  const skillIds = classSkillIds(state);

  return catalog.classSkills.filter((skill) => skill.classId === state.player.classId && skillIds.has(skill.id));
}

const dnfSkillHotkeys = ["A", "S", "D", "F", "G", "H"] as const;

function combatSkillForDnfHotkey(state: GameState, hotkey: string): ClassSkillDefinition | undefined {
  const index = dnfSkillHotkeys.indexOf(hotkey as (typeof dnfSkillHotkeys)[number]);

  return index >= 0 ? combatSkillsForState(state)[index] : undefined;
}

interface CombatCommandDefinition {
  slotIndex: number;
  codes: readonly string[];
  input: string;
  display: string;
  terminalKey: "Z" | "Space";
}

const dnfCommandInputs: readonly CombatCommandDefinition[] = [
  { slotIndex: 0, codes: ["ArrowRight", "KeyZ"], input: "right,z", display: "→Z", terminalKey: "Z" },
  { slotIndex: 1, codes: ["ArrowUp", "KeyZ"], input: "up,z", display: "↑Z", terminalKey: "Z" },
  { slotIndex: 2, codes: ["ArrowLeft", "KeyZ"], input: "left,z", display: "←Z", terminalKey: "Z" },
  { slotIndex: 3, codes: ["ArrowDown", "ArrowRight", "KeyZ"], input: "down,right,z", display: "↓→Z", terminalKey: "Z" },
  { slotIndex: 4, codes: ["ArrowDown", "ArrowUp", "KeyZ"], input: "down,up,z", display: "↓↑Z", terminalKey: "Z" },
  { slotIndex: 5, codes: ["ArrowUp", "ArrowDown", "KeyZ"], input: "up,down,z", display: "↑↓Z", terminalKey: "Z" }
];

const commandInputDiscountPercent = 12;

function commandDefinitionForSlot(slotIndex: number): CombatCommandDefinition | undefined {
  return dnfCommandInputs.find((definition) => definition.slotIndex === slotIndex);
}

function commandDefinitionForSkill(state: GameState, skillId: string): CombatCommandDefinition | undefined {
  const index = combatSkillsForState(state).findIndex((skill) => skill.id === skillId);

  return index >= 0 ? commandDefinitionForSlot(index) : undefined;
}

function commandSequenceMatches(codes: readonly string[], command: readonly string[]): boolean {
  if (codes.length < command.length) {
    return false;
  }

  const offset = codes.length - command.length;

  return command.every((code, index) => codes[offset + index] === code);
}

function combatCommandSkillForSequence(
  state: GameState,
  codes: readonly string[]
): { definition: CombatCommandDefinition; skill: ClassSkillDefinition } | undefined {
  const definitions = [...dnfCommandInputs].sort((left, right) => right.codes.length - left.codes.length);

  for (const definition of definitions) {
    if (!commandSequenceMatches(codes, definition.codes)) {
      continue;
    }

    const skill = combatSkillsForState(state)[definition.slotIndex];

    if (skill) {
      return { definition, skill };
    }
  }

  return undefined;
}

export function combatActionForCommandSequence(
  state: GameState,
  codes: readonly string[],
  resourceValue?: number,
  run?: CombatRun,
  allowBuffered = false
): AppAction | undefined {
  const match = combatCommandSkillForSequence(state, codes);

  if (!match) {
    return undefined;
  }

  const manualCost = combatSkillResourceCost(match.skill, "command");

  const cooldownRemaining = run !== undefined ? skillCooldownRemaining(run, match.skill.id) : 0;
  const remainingLockMs = run !== undefined ? run.player.actionLockUntilMs - run.elapsedMs : 0;
  const canBufferUntilReady =
    allowBuffered && run !== undefined && remainingLockMs > 0 && remainingLockMs <= actionBufferWindowMs && cooldownRemaining <= remainingLockMs;

  if ((resourceValue !== undefined && resourceValue < manualCost) || (cooldownRemaining > 0 && !canBufferUntilReady)) {
    return undefined;
  }

  return { type: "combatAction", action: "skill", skillId: match.skill.id, inputMethod: "command" };
}

export function combatActionForKeyCode(
  state: GameState,
  code: string,
  resourceValue?: number,
  dash = false,
  run?: CombatRun,
  allowBuffered = false
): AppAction | undefined {
  const movementByCode: Record<string, Pick<Extract<AppAction, { type: "combatMove" }>, "moveX" | "moveY">> = {
    ArrowLeft: { moveX: -1, moveY: 0 },
    ArrowRight: { moveX: 1, moveY: 0 },
    ArrowUp: { moveX: 0, moveY: -1 },
    ArrowDown: { moveX: 0, moveY: 1 }
  };
  const movement = movementByCode[code];

  if (movement) {
    return { type: "combatMove", ...movement, dash };
  }

  if (code === "KeyJ" || code === "KeyX") {
    return { type: "combatAction", action: "light" };
  }

  if (code === "KeyK" || code === "KeyZ") {
    return { type: "combatAction", action: "heavy" };
  }

  if (code === "KeyC") {
    return { type: "combatAction", action: "jump" };
  }

  if (code === "Digit1") {
    return { type: "useConsumable", consumableId: "healing-potion" };
  }

  if (code === "Digit2") {
    return { type: "useConsumable", consumableId: "revival-token" };
  }

  const dnfKeyByCode: Record<string, string> = {
    KeyA: "A",
    KeyS: "S",
    KeyD: "D",
    KeyF: "F",
    KeyG: "G",
    KeyH: "H"
  };
  const keyByCode: Record<string, string> = {
    KeyL: "L",
    KeyU: "U",
    KeyI: "I",
    KeyO: "O",
    Space: "Space"
  };
  const dnfSkill = combatSkillForDnfHotkey(state, dnfKeyByCode[code] ?? "");
  const key = keyByCode[code];
  const skill = dnfSkill ?? (key ? combatSkillsForState(state).find((item) => item.key === key) : undefined);

  if (!skill) {
    return undefined;
  }

  const cooldownRemaining = run !== undefined ? skillCooldownRemaining(run, skill.id) : 0;
  const remainingLockMs = run !== undefined ? run.player.actionLockUntilMs - run.elapsedMs : 0;
  const canBufferUntilReady =
    allowBuffered && run !== undefined && remainingLockMs > 0 && remainingLockMs <= actionBufferWindowMs && cooldownRemaining <= remainingLockMs;

  if ((resourceValue !== undefined && resourceValue < skill.resourceCost) || (cooldownRemaining > 0 && !canBufferUntilReady)) {
    return undefined;
  }

  return { type: "combatAction", action: "skill", skillId: skill.id };
}

function toCombatActionInput(action: Extract<AppAction, { type: "combatAction" }>): CombatActionInput | undefined {
  if (action.action === "light") {
    return { type: "light" };
  }

  if (action.action === "heavy") {
    return { type: "heavy" };
  }

  if (action.action === "jump") {
    return { type: "jump" };
  }

  if (action.action === "backstep") {
    return { type: "backstep" };
  }

  if (action.action === "skill") {
    return action.inputMethod
      ? { type: "skill", skillId: action.skillId, inputMethod: action.inputMethod }
      : { type: "skill", skillId: action.skillId };
  }

  return undefined;
}

function bufferedActionName(action: CombatActionInput | undefined): string {
  if (!action) {
    return "";
  }

  return action.type;
}

function bufferedSkillId(action: CombatActionInput | undefined): string {
  return action?.type === "skill" ? action.skillId : "";
}

function weaponLayerStyle(
  equipped: EquippedWeaponAppearance,
  layer: "town" | "combat",
  animation?: SkillAnimationDefinition
): string {
  const anchor = layer === "town" ? equipped.appearance.townAnchor : equipped.appearance.combatAnchor;
  const skillLunge = animation?.lungePx ?? 30;
  const skillLift = Math.max(8, Math.round((animation?.durationMs ?? 520) / 48));
  const skillDuration = animation?.durationMs ?? 520;

  return `--weapon-primary: ${equipped.appearance.palette.primary}; --weapon-secondary: ${equipped.appearance.palette.secondary}; --weapon-glow: ${equipped.appearance.palette.glow}; --weapon-anchor-x: ${anchor.x}%; --weapon-anchor-y: ${anchor.y}%; --weapon-scale: ${anchor.scale}; --weapon-rotation: ${anchor.rotation}deg; --weapon-grip-x: ${equipped.appearance.asset.gripX}%; --weapon-grip-y: ${equipped.appearance.asset.gripY}%; --weapon-skill-lunge: ${skillLunge}px; --weapon-skill-lift: -${skillLift}px; --skill-duration: ${skillDuration}ms;`;
}

function weaponLayerMarkup(
  state: GameState,
  layer: "town" | "combat",
  animation?: SkillAnimationDefinition,
  motion = "",
  normalComboStep = 0,
  skillHitPhase = "",
  skillVfxCue = ""
): string {
  const equipped = equippedWeaponAppearanceFor(state);

  if (!equipped) {
    return "";
  }

  const appearance = equipped.appearance;
  const layerClass = layer === "town" ? "town-weapon" : "combat-weapon";
  const airAction = motion === "air-light" ? "light" : motion === "air-heavy" ? "heavy" : "";
  const dashAction = motion === "dash-light" ? "light" : "";
  const combatAttr =
    layer === "combat"
      ? ` data-combat-weapon-appearance-id="${appearance.id}" data-weapon-arc="${animation?.weaponArc ?? ""}" data-weapon-skill-preset="${animation?.preset ?? ""}" data-weapon-motion="${motion}" data-weapon-air-action="${airAction}" data-weapon-dash-action="${dashAction}" data-weapon-normal-combo-step="${normalComboStep || ""}" data-weapon-hit-phase="${skillHitPhase}" data-weapon-vfx-cue="${skillVfxCue}"`
      : "";

  return `
    <div class="${layerClass} weapon-layer weapon-layer-${appearance.rarity}" data-weapon-appearance-id="${appearance.id}"${combatAttr} data-equipped-weapon-id="${equipped.owned.instanceId}" data-weapon-class-id="${appearance.classId}" data-weapon-type="${appearance.weaponType}" data-weapon-tier="${appearance.tier}" data-weapon-rarity="${appearance.rarity}" data-weapon-level="${equipped.gear.level}" data-weapon-asset-src="${appearance.asset.src}" style="${weaponLayerStyle(equipped, layer, animation)}" aria-label="${appearance.displayName}">
      <img class="weapon-art weapon-art-equipped" data-weapon-art-id="${appearance.id}" src="${appearance.asset.src}" width="${appearance.asset.width}" height="${appearance.asset.height}" alt="" aria-hidden="true" />
      <span class="weapon-shape weapon-shape-${appearance.silhouette}" aria-hidden="true"></span>
    </div>
  `;
}

function renderTownScene(model: AppViewModel): string {
  const state = model.state;
  const classDef = catalog.classes.find((item) => item.id === state.player.classId);
  const cinderUnlocked = state.player.unlockedDungeons.includes("cinder-kiln-alley");
  const liuliUnlocked = state.player.unlockedDungeons.includes("liuli-furnace");

  return `
    <section class="town-scene" data-town-scene="true" aria-label="炉山市集">
      <div class="scene-backdrop">
        <img class="scene-background-art" src="/assets/forge-market-bg.png" alt="" aria-hidden="true" />
        <div class="moon-gate"></div>
        <div class="forge-glow"></div>
        <div class="market-roof"></div>
        <div class="stone-lane"></div>
      </div>
      <div class="hero-portrait" aria-label="${classDef?.displayName ?? state.player.classId}">
        <img class="hero-art" data-hero-class-id="${state.player.classId}" src="${heroAssetForClass(state.player.classId)}" alt="${classDef?.displayName ?? state.player.classId}" />
        ${weaponLayerMarkup(state, "town")}
      </div>
      <div class="town-hud">
        <h1>烬璃纪元</h1>
        <p>炉山市集 · ${classDef?.displayName ?? "烬拳卫"} · 等级 ${state.player.level}</p>
        <p class="town-fatigue">疲劳 <strong data-fatigue-current="${state.player.fatigue.current}">${state.player.fatigue.current}</strong>/<span data-fatigue-max="${state.player.fatigue.max}">${state.player.fatigue.max}</span></p>
        <div class="dungeon-row">
          <button data-prepare-dungeon="cinder-kiln-alley" ${cinderUnlocked ? "" : "disabled"}>灰窑巷</button>
          <button data-prepare-dungeon="liuli-furnace" ${liuliUnlocked ? "" : "disabled"}>琉璃熔炉</button>
        </div>
      </div>
    </section>
  `;
}

function dungeonBossName(bossId: string): string {
  return bossId === "kiln-warden" ? "饕餮监工" : bossId === "liuli-overseer" ? "琉璃监工" : bossId;
}

function multiplierLabel(value: number): string {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)}x`;
}

function renderDungeonPrep(model: AppViewModel): string {
  const prep = model.dungeonPrep;

  if (!prep) {
    return renderTownScene(model);
  }

  const dungeon = catalog.dungeons.find((item) => item.id === prep.dungeonId);

  if (!dungeon) {
    return renderTownScene(model);
  }

  const selectedDifficulty = getDungeonDifficulty(prep.difficultyId);
  const entry = canEnterDungeon(model.state, prep.dungeonId, prep.difficultyId);
  const difficultyButtons = DUNGEON_DIFFICULTY_ORDER.map((difficultyId) => {
    const difficulty = getDungeonDifficulty(difficultyId);
    const selected = difficultyId === prep.difficultyId;

    return `
      <button class="dungeon-difficulty-option" data-dungeon-difficulty="${difficultyId}" data-difficulty-selected="${selected ? "true" : "false"}" data-fatigue-cost="${difficulty.fatigueCost}" aria-pressed="${selected ? "true" : "false"}">
        <strong>${difficulty.displayName}</strong>
        <span>HP ${multiplierLabel(difficulty.hpMultiplier)}</span>
        <span>伤害 ${multiplierLabel(difficulty.damageMultiplier)}</span>
        <span>奖励 ${multiplierLabel(difficulty.rewardMultiplier)}</span>
        <span>疲劳 ${difficulty.fatigueCost}</span>
      </button>
    `;
  }).join("");

  return `
    <section class="dungeon-prep" data-dungeon-prep="true" data-dungeon-prep-id="${dungeon.id}" aria-label="地下城准备">
      <header class="dungeon-prep-header">
        <p class="dungeon-prep-kicker">地下城准备</p>
        <h2>${dungeon.displayName}</h2>
      </header>
      <dl class="dungeon-prep-summary">
        <div><dt>等级要求</dt><dd>Lv.${dungeon.minLevel}</dd></div>
        <div><dt>房间数</dt><dd>${dungeon.rooms}</dd></div>
        <div><dt>Boss</dt><dd>${dungeonBossName(dungeon.bossId)}</dd></div>
        <div><dt>推荐战力</dt><dd>${dungeon.recommendedPower}</dd></div>
      </dl>
      <div class="dungeon-prep-fatigue">
        <span>当前疲劳</span>
        <strong data-fatigue-current="${model.state.player.fatigue.current}">${model.state.player.fatigue.current}</strong>
        <span>/</span>
        <span data-fatigue-max="${model.state.player.fatigue.max}">${model.state.player.fatigue.max}</span>
        <span>本次消耗</span>
        <strong data-fatigue-cost="${selectedDifficulty.fatigueCost}">${selectedDifficulty.fatigueCost}</strong>
      </div>
      <div class="dungeon-difficulty-segments" role="group" aria-label="难度选择">
        ${difficultyButtons}
      </div>
      <div class="dungeon-prep-actions">
        <button data-dungeon-prep-back="true">返回城镇</button>
        <button class="dungeon-start-button" data-dungeon-start="true" data-fatigue-cost="${selectedDifficulty.fatigueCost}" ${entry.canEnter ? "" : "disabled"}>开始挑战 · ${selectedDifficulty.displayName}</button>
      </div>
    </section>
  `;
}

function combatActorStyle(run: CombatRun, x: number, y: number): string {
  const xPercent = (Math.min(1, Math.max(0, x / run.arena.width)) * 100).toFixed(2);
  const laneRange = Math.max(1, run.arena.maxY - run.arena.minY);
  const laneProgress = Math.min(1, Math.max(0, (y - run.arena.minY) / laneRange));
  const yPercent = (54 + laneProgress * 24).toFixed(2);

  return `--actor-x: ${xPercent}%; --actor-y: ${yPercent}%;`;
}

function enemyHitSlideState(run: CombatRun, enemy: CombatEnemy, hitEvent: CombatHitEvent | undefined): EnemyHitSlideState {
  const end = { x: enemy.position.x, y: enemy.position.y };

  if (!hitEvent?.impactPosition) {
    return {
      active: false,
      progress: 1,
      position: end
    };
  }

  const start = hitEvent.impactPosition;
  const moved = Math.abs(start.x - end.x) >= 0.5 || Math.abs(start.y - end.y) >= 0.5;

  if (!moved) {
    return {
      active: false,
      progress: 1,
      start,
      end,
      position: end
    };
  }

  const age = eventAge(run, hitEvent.occurredAtMs);
  const progress = Math.min(1, Math.max(0, age / enemyHitSlideDurationMs));
  const active = age >= 0 && age < enemyHitSlideDurationMs;

  if (!active) {
    return {
      active: false,
      progress: 1,
      start,
      end,
      position: end
    };
  }

  return {
    active,
    progress,
    start,
    end,
    position: {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress
    }
  };
}

function enemyActorStyle(run: CombatRun, enemy: CombatEnemy, visualPosition = enemy.position): string {
  return `${combatActorStyle(run, visualPosition.x, visualPosition.y)} --enemy-body-width: ${enemy.body.width}px; --enemy-body-height: ${enemy.body.height}px; --enemy-hurtbox-width: ${enemy.hurtbox.width}px; --enemy-hurtbox-height: ${enemy.hurtbox.height}px;`;
}

function playerModelMotionStyle(run: CombatRun, animation?: SkillAnimationDefinition): string {
  const facing = run.player.facing;
  const skillLunge = animation?.lungePx ?? 30;
  const skillDuration = animation?.durationMs ?? 520;

  return `--model-scale-x: ${facing}; --light-lunge-x: ${24 * facing}px; --heavy-lunge-x: ${34 * facing}px; --skill-lunge-x: ${skillLunge * facing}px; --hit-react-x: ${-18 * facing}px; --skill-duration: ${skillDuration}ms;`;
}

function enemyAttackLungePx(skillId: string | undefined): number {
  switch (skillId) {
    case "liuli-glass-spray":
      return 18;
    case "liuli-splinter-rush":
      return 48;
    case "liuli-crucible-wave":
      return 26;
    case "liuli-prism-charge":
      return 66;
    case "liuli-prism-barrage":
      return 22;
    case "liuli-kiln-gravity":
      return 44;
    case "liuli-crucible-shards":
      return 58;
    case "ash-ember-spit":
      return 20;
    case "ash-crawler-burst":
      return 44;
    case "zheng-shockwave":
      return 24;
    case "zheng-horn-charge":
      return 64;
    case "taotie-flame-breath":
      return 18;
    case "taotie-devour-pull":
      return 42;
    case "taotie-ash-summon":
      return 14;
    case "taotie-forge-shackle":
      return 38;
    case "taotie-chain-cleave":
      return 56;
    case "taotie-world-devour":
      return 88;
    case "taotie-forge-collapse":
      return 72;
    default:
      return 28;
  }
}

function enemyAttackVisualState(enemy: CombatEnemy, elapsedMs: number): EnemyAttackVisualState {
  if (
    !enemy.attackSkillId ||
    enemy.attackStartedAtMs === undefined ||
    enemy.attackImpactAtMs === undefined ||
    enemy.attackRecoverUntilMs === undefined ||
    elapsedMs >= enemy.attackRecoverUntilMs
  ) {
    return {
      stage: "none",
      durationMs: 0,
      progress: ""
    };
  }

  const durationMs = Math.max(1, enemy.attackRecoverUntilMs - enemy.attackStartedAtMs);
  const progress = Math.min(1, Math.max(0, (elapsedMs - enemy.attackStartedAtMs) / durationMs));
  const stage = elapsedMs < enemy.attackImpactAtMs ? "windup" : enemy.attackHitResolved ? "recovery" : "active";

  return {
    stage,
    durationMs,
    progress: progress.toFixed(2)
  };
}

function bossPhaseAttackVisualState(event: CombatBossPhaseEvent | undefined, elapsedMs: number): EnemyAttackVisualState {
  if (!event) {
    return {
      stage: "none",
      durationMs: 0,
      progress: ""
    };
  }

  const durationMs = Math.max(1, event.vfxWindowMs);
  const progress = Math.min(1, Math.max(0, (elapsedMs - event.occurredAtMs) / durationMs));

  return {
    stage: "active",
    durationMs,
    progress: progress.toFixed(2)
  };
}

function enemyModelMotionStyle(
  run: CombatRun,
  enemy: CombatEnemy,
  attackVisual: EnemyAttackVisualState,
  motionSkillId = enemy.attackSkillId
): string {
  const directionToPlayer = enemy.position.x >= run.player.x ? -1 : 1;
  const lungePx = enemyAttackLungePx(motionSkillId) * directionToPlayer;
  const attackVars =
    attackVisual.durationMs > 0
      ? ` --enemy-attack-duration: ${attackVisual.durationMs}ms; --enemy-attack-progress: ${attackVisual.progress};`
      : "";

  return `--model-scale-x: ${directionToPlayer}; --enemy-lunge-x: ${lungePx}px;${attackVars} --hit-react-x: ${18 * run.player.facing}px;`;
}

function enemyAttackPresentationTiming(
  run: CombatRun,
  enemy: CombatEnemy,
  event?: CombatEnemyAttackEvent
): EnemyAttackPresentationTiming {
  const attackVisual = enemyAttackVisualState(enemy, run.elapsedMs);
  const attackDurationMs =
    attackVisual.durationMs ||
    (enemy.attackStartedAtMs !== undefined && enemy.attackRecoverUntilMs !== undefined
      ? Math.max(1, enemy.attackRecoverUntilMs - enemy.attackStartedAtMs)
      : 0);
  const fallbackDurationMs = attackDurationMs || event?.vfxWindowMs || 520;
  const vfxDurationMs = event?.phase === "windup" ? fallbackDurationMs : event?.vfxWindowMs || fallbackDurationMs;

  return {
    attackDurationMs: fallbackDurationMs,
    vfxDurationMs,
    styleVars: ` --enemy-attack-duration: ${fallbackDurationMs}ms; --enemy-vfx-duration: ${vfxDurationMs}ms;`
  };
}

function enemyHpPercent(enemy: CombatEnemy): number {
  if (enemy.maxHp <= 0) {
    return 0;
  }

  return Math.round(Math.min(1, Math.max(0, enemy.hp / enemy.maxHp)) * 100);
}

function enemyAsset(enemy: CombatEnemy): string {
  if (enemy.kind === "boss") {
    return "/assets/monster-taotie-overseer.png";
  }

  if (enemy.kind === "elite") {
    return "/assets/monster-zheng-guard.png";
  }

  return "/assets/monster-ash-rat.png";
}

const recentHitWindowMs = 520;
const recentEnemyAttackWindowMs = 760;
const enemyHitSlideDurationMs = 160;

interface EnemyHitSlideState {
  active: boolean;
  progress: number;
  start?: CombatVector;
  end?: CombatVector;
  position: CombatVector;
}

interface EnemyAttackVisualState {
  stage: "none" | "windup" | "active" | "recovery";
  durationMs: number;
  progress: string;
}

interface EnemyAttackPresentationTiming {
  attackDurationMs: number;
  vfxDurationMs: number;
  styleVars: string;
}

interface PlayerSkillVisualState {
  stage: "none" | "windup" | "active" | "recovery";
  progress: string;
  durationMs: string;
  hitAtMs: string;
  activeFrameMs: string;
  hitPhase: string;
  vfxCue: string;
}

function eventAge(run: CombatRun, occurredAtMs: number): number {
  return run.elapsedMs - occurredAtMs;
}

function isActiveHitEvent(run: CombatRun, event: CombatHitEvent): boolean {
  const age = eventAge(run, event.occurredAtMs);
  const vfxWindowMs = event.vfxWindowMs ?? recentHitWindowMs;

  return age >= 0 && age <= vfxWindowMs;
}

function actionStartedAtMs(event: CombatHitEvent | CombatMissEvent | CombatSkillCastEvent): number {
  return event.occurredAtMs - event.inputToHitMs;
}

function latestHitEvent(run: CombatRun): CombatHitEvent | undefined {
  return [...run.events].reverse().find((event): event is CombatHitEvent => event.kind === "hit" && isActiveHitEvent(run, event));
}

function recentHitEvents(run: CombatRun): CombatHitEvent[] {
  return run.events.filter((event): event is CombatHitEvent => event.kind === "hit" && isActiveHitEvent(run, event));
}

function latestPlayerHitEvent(run: CombatRun): CombatPlayerHitEvent | undefined {
  return [...run.events]
    .reverse()
    .find(
      (event): event is CombatPlayerHitEvent =>
        event.kind === "player-hit" && eventAge(run, event.occurredAtMs) >= 0 && eventAge(run, event.occurredAtMs) <= recentHitWindowMs
    );
}

function recentPlayerStatusEvents(run: CombatRun): CombatPlayerStatusEvent[] {
  return run.events.filter((event): event is CombatPlayerStatusEvent => {
    if (event.kind !== "player-status") {
      return false;
    }

    const age = eventAge(run, event.occurredAtMs);

    return age >= 0 && age <= event.vfxWindowMs;
  });
}

function combatHitstopActive(run: CombatRun): boolean {
  const hit = latestHitEvent(run);
  const playerHit = latestPlayerHitEvent(run);

  return Boolean(hit && run.elapsedMs < hit.occurredAtMs + hit.hitstopMs) || Boolean(playerHit && run.elapsedMs < run.player.hitstopUntilMs);
}

function matchingPlayerHitEvent(run: CombatRun, attackEvent: CombatEnemyAttackEvent): CombatPlayerHitEvent | undefined {
  return [...run.events].reverse().find((event): event is CombatPlayerHitEvent => {
    if (event.kind !== "player-hit") {
      return false;
    }

    const age = eventAge(run, event.occurredAtMs);

    return (
      age >= 0 &&
      age <= (event.vfxWindowMs ?? recentHitWindowMs) &&
      event.enemyId === attackEvent.enemyId &&
      event.skillId === attackEvent.skillId &&
      event.occurredAtMs === attackEvent.occurredAtMs &&
      (attackEvent.hitIndex === undefined || event.hitIndex === attackEvent.hitIndex)
    );
  });
}

function matchingArenaHazardPlayerHit(run: CombatRun, hazardEvent: CombatArenaHazardEvent): CombatPlayerHitEvent | undefined {
  return [...run.events].reverse().find((event): event is CombatPlayerHitEvent => {
    if (event.kind !== "player-hit") {
      return false;
    }

    const age = eventAge(run, event.occurredAtMs);

    return (
      age >= 0 &&
      age <= (event.vfxWindowMs ?? recentHitWindowMs) &&
      event.enemyId === hazardEvent.enemyId &&
      event.skillId === hazardEvent.skillId &&
      event.occurredAtMs === hazardEvent.occurredAtMs
    );
  });
}

function recentEnemyAttackEvents(run: CombatRun): CombatEnemyAttackEvent[] {
  const latestByEnemy = new Map<string, CombatEnemyAttackEvent>();

  for (const event of run.events) {
    if (event.kind !== "enemy-attack") {
      continue;
    }

    const age = run.elapsedMs - event.occurredAtMs;
    const windowMs = event.vfxWindowMs ?? recentEnemyAttackWindowMs;

    if (age >= 0 && age <= windowMs) {
      latestByEnemy.set(event.enemyId, event);
    }
  }

  return [...latestByEnemy.values()];
}

function recentEnemySummonEvents(run: CombatRun): CombatEnemySummonEvent[] {
  return run.events.filter((event): event is CombatEnemySummonEvent => {
    if (event.kind !== "enemy-summon") {
      return false;
    }

    const age = eventAge(run, event.occurredAtMs);

    return age >= 0 && age <= event.vfxWindowMs;
  });
}

function latestBossPhaseEvent(run: CombatRun): CombatBossPhaseEvent | undefined {
  return [...run.events].reverse().find((event): event is CombatBossPhaseEvent => {
    if (event.kind !== "boss-phase") {
      return false;
    }

    const age = eventAge(run, event.occurredAtMs);

    return age >= 0 && age <= event.vfxWindowMs;
  });
}

function recentArenaHazardEvents(run: CombatRun): CombatArenaHazardEvent[] {
  const latestByHazard = new Map<string, CombatArenaHazardEvent>();

  for (const event of run.events) {
    if (event.kind !== "arena-hazard") {
      continue;
    }

    const age = eventAge(run, event.occurredAtMs);

    if (age >= 0 && age <= event.vfxWindowMs) {
      latestByHazard.set(event.hazardId, event);
    }
  }

  return [...latestByHazard.values()];
}

function latestPlayerActionEvent(run: CombatRun): CombatHitEvent | CombatMissEvent | CombatSkillCastEvent | undefined {
  let blockingPlayerHitAtMs: number | undefined;

  for (const event of [...run.events].reverse()) {
    if (event.kind === "player-hit" && run.elapsedMs >= event.occurredAtMs) {
      blockingPlayerHitAtMs = event.occurredAtMs;
      continue;
    }

    if (event.kind !== "hit" && event.kind !== "miss" && event.kind !== "skill-cast") {
      continue;
    }

    const actionStartAtMs = actionStartedAtMs(event);
    const actionAge = run.elapsedMs - actionStartAtMs;

    if (blockingPlayerHitAtMs !== undefined && blockingPlayerHitAtMs >= actionStartAtMs) {
      return undefined;
    }

    if (actionAge >= 0 && actionAge <= playerActionWindowMs(event)) {
      return event;
    }
  }

  return undefined;
}

function classSkillById(skillId: string | undefined): ClassSkillDefinition | undefined {
  return skillId ? catalog.classSkills.find((skill) => skill.id === skillId) : undefined;
}

function playerActionWindowMs(event: CombatHitEvent | CombatMissEvent | CombatSkillCastEvent): number {
  if (event.action === "skill") {
    return classSkillById(event.skillId)?.animation.durationMs ?? recentHitWindowMs;
  }

  return recentHitWindowMs;
}

function latestSkillCastEvent(run: CombatRun): CombatSkillCastEvent | undefined {
  return [...run.events].reverse().find((event): event is CombatSkillCastEvent => {
    if (event.kind !== "skill-cast") {
      return false;
    }

    const age = eventAge(run, event.occurredAtMs);

    return age >= 0 && age <= playerActionWindowMs(event);
  });
}

function latestComboCancelCastEvent(run: CombatRun): CombatSkillCastEvent | undefined {
  const cast = latestSkillCastEvent(run);

  return cast?.canceledFromCombo ? cast : undefined;
}

function comboCancelWindowActive(run: CombatRun): boolean {
  return run.player.comboStep > 0 && run.player.cancelWindowUntilMs > run.elapsedMs;
}

function latestSkillReleaseSource(run: CombatRun): "cancel" | "manual" | "hotkey" | "none" {
  const cast = latestSkillCastEvent(run);

  if (!cast) {
    return "none";
  }

  if (cast.canceledFromCombo) {
    return "cancel";
  }

  return cast.inputMethod === "command" ? "manual" : "hotkey";
}

function latestPlayerSkillAnimation(
  run: CombatRun
): { skillId: string; animation: SkillAnimationDefinition } | undefined {
  const action = latestPlayerActionEvent(run);

  if (action?.action !== "skill" || !action.skillId) {
    return undefined;
  }

  const skill = classSkillById(action.skillId);

  return skill ? { skillId: skill.id, animation: skill.animation } : undefined;
}

function playerSkillVisualState(run: CombatRun): PlayerSkillVisualState {
  const none: PlayerSkillVisualState = {
    stage: "none",
    progress: "",
    durationMs: "",
    hitAtMs: "",
    activeFrameMs: "",
    hitPhase: "",
    vfxCue: ""
  };
  const action = latestPlayerActionEvent(run);

  if (action?.action !== "skill" || !action.skillId) {
    return none;
  }

  const skill = classSkillById(action.skillId);

  if (!skill) {
    return none;
  }

  const actionStartAtMs = actionStartedAtMs(action);
  const elapsedMs = Math.max(0, run.elapsedMs - actionStartAtMs);
  const durationMs = skill.animation.durationMs;

  if (elapsedMs > durationMs) {
    return none;
  }

  const activeFrameMs = action.kind === "hit" || action.kind === "miss" ? action.inputToHitMs : skill.animation.hitFrameMs;
  const activeWindowMs = Math.min(120, Math.max(70, Math.round(durationMs * 0.18)));
  const stage =
    elapsedMs < activeFrameMs ? "windup" : elapsedMs <= activeFrameMs + activeWindowMs ? "active" : "recovery";
  const progress =
    activeFrameMs <= 0 ? "100" : String(Math.min(100, Math.max(0, Math.round((elapsedMs / activeFrameMs) * 100))));

  return {
    stage,
    progress,
    durationMs: String(durationMs),
    hitAtMs: String(actionStartAtMs + activeFrameMs),
    activeFrameMs: String(activeFrameMs),
    hitPhase: action.kind === "hit" || action.kind === "miss" ? action.hitPhase ?? "" : "",
    vfxCue: action.kind === "hit" || action.kind === "miss" ? action.vfxCue ?? "" : ""
  };
}

function playerShieldActive(run: CombatRun): boolean {
  return run.elapsedMs < run.player.shieldUntilMs;
}

function playerEvadeActive(run: CombatRun): boolean {
  return run.player.evadeUntilMs > 0 && run.elapsedMs >= run.player.evadeStartedAtMs && run.elapsedMs < run.player.evadeUntilMs;
}

function playerReflectActive(run: CombatRun): boolean {
  const player = run.player as CombatRun["player"] & { reflectStartedAtMs?: number };

  return run.player.reflectUntilMs > 0 && run.elapsedMs >= (player.reflectStartedAtMs ?? 0) && run.elapsedMs < run.player.reflectUntilMs;
}

function playerBoundActive(run: CombatRun): boolean {
  return run.elapsedMs < run.player.boundUntilMs;
}

function playerAirState(run: CombatRun): "grounded" | "jumping" | "landing" {
  if (run.elapsedMs < run.player.airborneUntilMs) {
    return "jumping";
  }

  if (run.elapsedMs < run.player.landingUntilMs) {
    return "landing";
  }

  return "grounded";
}

function playerAirborneActive(run: CombatRun): boolean {
  return playerAirState(run) === "jumping";
}

function playerAirAttackActive(run: CombatRun): boolean {
  return playerAirborneActive(run) && run.elapsedMs < run.player.airAttackUntilMs;
}

function playerQuickRecoverActive(run: CombatRun): boolean {
  return run.elapsedMs < run.player.quickRecoverUntilMs;
}

function playerQuickRecoverReady(run: CombatRun): boolean {
  return (
    run.player.quickRecoverReadyUntilMs > 0 &&
    run.elapsedMs <= run.player.quickRecoverReadyUntilMs &&
    run.elapsedMs < run.player.hurtLockUntilMs &&
    run.elapsedMs >= run.player.boundUntilMs
  );
}

function playerInvulnerableActive(run: CombatRun): boolean {
  return (
    run.player.invulnerableUntilMs > 0 &&
    run.elapsedMs >= run.player.invulnerableStartedAtMs &&
    run.elapsedMs < run.player.invulnerableUntilMs
  );
}

function playerHurtLockActive(run: CombatRun): boolean {
  return run.elapsedMs < run.player.hurtLockUntilMs;
}

function playerDashAttackActive(run: CombatRun): boolean {
  if (latestPlayerHitEvent(run)) {
    return false;
  }

  return run.player.activeSkillMovement?.skillId === "dash-light" || run.elapsedMs < run.player.dashAttackUntilMs;
}

function playerNormalAttackActive(run: CombatRun): boolean {
  return run.elapsedMs < run.player.normalAttackUntilMs;
}

function airActionForHitPhase(hitPhase: string | undefined): "light" | "heavy" | "" {
  if (hitPhase === "air-light") {
    return "light";
  }

  if (hitPhase === "air-heavy-slam") {
    return "heavy";
  }

  return "";
}

function dashActionForHitPhase(hitPhase: string | undefined): "light" | "" {
  return hitPhase === "dash-light" ? "light" : "";
}

function groundLightStepForHitPhase(hitPhase: string | undefined): "1" | "2" | "3" | "" {
  if (hitPhase === "ground-light-1") {
    return "1";
  }

  if (hitPhase === "ground-light-2") {
    return "2";
  }

  if (hitPhase === "ground-light-3") {
    return "3";
  }

  return "";
}

function playerDodgeResult(run: CombatRun): "missed" | "none" {
  return recentEnemyAttackEvents(run).some((event) => event.phase === "miss") ? "missed" : "none";
}

function playerSkillMovementProgress(run: CombatRun, movement = run.player.activeSkillMovement): string {
  if (!movement) {
    return "";
  }

  const durationMs = Math.max(1, movement.endAtMs - movement.startAtMs);
  const progress = Math.min(1, Math.max(0, (run.elapsedMs - movement.startAtMs) / durationMs));

  return String(Math.round(progress * 100));
}

function playerUiSkillMovement(run: CombatRun): CombatRun["player"]["activeSkillMovement"] {
  const movement = run.player.activeSkillMovement;

  if (movement?.skillId === "ground-heavy" || movement?.skillId.startsWith("ground-light-")) {
    return undefined;
  }

  return movement;
}

function playerNormalAttackMovement(run: CombatRun): CombatRun["player"]["activeSkillMovement"] {
  const movement = run.player.activeSkillMovement;

  if (movement?.skillId === "ground-heavy" && run.player.normalAttackType === "heavy") {
    return movement;
  }

  if (movement?.skillId.startsWith("ground-light-") && run.player.normalAttackType === "light") {
    return movement;
  }

  return undefined;
}

function playerMotion(run: CombatRun): string {
  if (run.player.defeated) {
    return "defeated";
  }

  if (playerQuickRecoverActive(run)) {
    return "quick-recover";
  }

  if (latestPlayerHitEvent(run)) {
    return "hit";
  }

  if (playerBoundActive(run)) {
    return "bound";
  }

  const action = latestPlayerActionEvent(run);
  const airState = playerAirState(run);
  const hitPhase = action?.kind === "hit" ? action.hitPhase : undefined;

  if (airState === "jumping" && ((playerAirAttackActive(run) && run.player.airAttackType === "heavy") || hitPhase === "air-heavy-slam")) {
    return "air-heavy";
  }

  if (airState === "jumping" && (playerAirAttackActive(run) || hitPhase === "air-light")) {
    return "air-light";
  }

  if (airState === "jumping") {
    return "jump";
  }

  if (airState === "landing") {
    return "landing";
  }

  if (playerDashAttackActive(run)) {
    return "dash-light";
  }

  if (playerNormalAttackActive(run) && !action) {
    return run.player.normalAttackType === "heavy" ? "heavy" : "light";
  }

  if (playerDodgeResult(run) === "missed" && playerEvadeActive(run)) {
    return "dodge";
  }

  if (action?.statusTags?.includes("evade") || playerEvadeActive(run)) {
    return "dodge";
  }

  if ((action?.statusTags?.includes("reflect") && action.skillId !== "mirror-arc") || playerReflectActive(run)) {
    return "counter";
  }

  if (playerShieldActive(run)) {
    return "shield";
  }

  return action?.action === "skill" ? "skill" : action?.action ?? "idle";
}

function playerState(run: CombatRun): string {
  if (run.player.defeated) {
    return "defeated";
  }

  if (playerBoundActive(run)) {
    return "bound";
  }

  if (playerQuickRecoverActive(run)) {
    return "recovering";
  }

  if (latestPlayerHitEvent(run)) {
    return "hit";
  }

  if (playerAirAttackActive(run)) {
    return "air-attacking";
  }

  if (playerAirState(run) !== "grounded") {
    return "airborne";
  }

  if (playerDashAttackActive(run)) {
    return "dash-attacking";
  }

  return "active";
}

function enemyMotion(
  enemy: CombatEnemy,
  lastHitTargetId: string | undefined,
  elapsedMs: number
): string {
  if (enemy.hp <= 0) {
    return "defeated";
  }

  if (enemy.airborne) {
    return "airborne";
  }

  if (enemy.downed) {
    return "knockdown";
  }

  if (elapsedMs < (enemy.controlledUntilMs ?? 0)) {
    return "controlled";
  }

  if (elapsedMs < (enemy.armorBrokenUntilMs ?? 0)) {
    return "guard-break";
  }

  if (enemy.id === lastHitTargetId) {
    return "hit";
  }

  if (enemy.attackSkillId && enemy.attackRecoverUntilMs !== undefined && elapsedMs < enemy.attackRecoverUntilMs) {
    return "attack";
  }

  return "idle";
}

function enemyControlState(enemy: CombatEnemy, elapsedMs: number): string {
  if (elapsedMs < (enemy.controlledUntilMs ?? 0)) {
    return "controlled";
  }

  if (enemy.airborne) {
    return "airborne";
  }

  if (enemy.downed) {
    return "downed";
  }

  return "none";
}

function enemyAirborneState(enemy: CombatEnemy): string {
  if (enemy.airborne) {
    return "airborne";
  }

  if (enemy.downed) {
    return "downed";
  }

  return "grounded";
}

function enemyArmorState(enemy: CombatEnemy, elapsedMs: number): string {
  return elapsedMs < (enemy.armorBrokenUntilMs ?? 0) ? "broken" : "normal";
}

function enemySkillEffect(enemy: CombatEnemy, skillId = enemy.attackSkillId): { id: string; label: string } {
  if (skillId === "liuli-glass-spray") {
    return { id: skillId, label: "琉璃碎雾" };
  }

  if (skillId === "liuli-splinter-rush") {
    return { id: skillId, label: "琉璃裂冲" };
  }

  if (skillId === "liuli-crucible-wave") {
    return { id: skillId, label: "熔池震波" };
  }

  if (skillId === "liuli-prism-charge") {
    return { id: skillId, label: "棱镜突袭" };
  }

  if (skillId === "liuli-prism-barrage") {
    return { id: skillId, label: "监工棱雨" };
  }

  if (skillId === "liuli-kiln-gravity") {
    return { id: skillId, label: "熔炉引力" };
  }

  if (skillId === "liuli-crucible-shards") {
    return { id: skillId, label: "坩埚裂片" };
  }

  if (skillId === "ash-crawler-burst") {
    return { id: "ash-crawler-burst", label: "灰爬虫爆冲" };
  }

  if (skillId === "zheng-horn-charge") {
    return { id: "zheng-horn-charge", label: "雷角狰突" };
  }

  if (skillId === "taotie-devour-pull") {
    return { id: "taotie-devour-pull", label: "饕餮吞吸" };
  }

  if (skillId === "taotie-ash-summon") {
    return { id: "taotie-ash-summon", label: "饕餮唤烬" };
  }

  if (skillId === "taotie-forge-shackle") {
    return { id: "taotie-forge-shackle", label: "饕餮炉锁" };
  }

  if (skillId === "taotie-chain-cleave") {
    return { id: "taotie-chain-cleave", label: "饕餮链斩" };
  }

  if (skillId === "taotie-world-devour") {
    return { id: "taotie-world-devour", label: "饕餮吞界" };
  }

  if (skillId === "taotie-flame-breath" || enemy.kind === "boss") {
    return { id: "taotie-flame-breath", label: "饕餮炉火" };
  }

  if (skillId === "zheng-shockwave" || enemy.kind === "elite") {
    return { id: "zheng-shockwave", label: "狰卫震地" };
  }

  return { id: "ash-ember-spit", label: "灰烬喷吐" };
}

function enemyTelegraphShape(effectId: string): "cone" | "line" | "circle" {
  if (
    effectId === "taotie-flame-breath" ||
    effectId === "zheng-horn-charge" ||
    effectId === "taotie-chain-cleave" ||
    effectId === "taotie-world-devour" ||
    effectId === "liuli-prism-charge" ||
    effectId === "liuli-prism-barrage" ||
    effectId === "liuli-crucible-shards"
  ) {
    return "line";
  }

  if (
    effectId === "zheng-shockwave" ||
    effectId === "ash-crawler-burst" ||
    effectId === "taotie-ash-summon" ||
    effectId === "taotie-forge-shackle" ||
    effectId === "liuli-crucible-wave" ||
    effectId === "liuli-kiln-gravity" ||
    effectId === "liuli-splinter-rush"
  ) {
    return "circle";
  }

  if (effectId === "taotie-devour-pull") {
    return "circle";
  }

  return "cone";
}

function playerTrailMarkup(
  run: CombatRun,
  motion: string,
  activeSkill?: { skillId: string; animation: SkillAnimationDefinition }
): string {
  if (!["light", "dash-light", "heavy", "skill", "dodge", "counter"].includes(motion)) {
    return "";
  }

  return `
    <div class="player-motion-trail player-motion-trail-${motion}" data-player-trail="${motion}" data-trail-skill-preset="${activeSkill?.animation.preset ?? ""}" data-trail-facing="${run.player.facing}" style="--model-scale-x: ${run.player.facing};" aria-hidden="true">
      <span class="trail-ghost trail-ghost-a"></span>
      <span class="trail-ghost trail-ghost-b"></span>
    </div>
  `;
}

function playerSkillVfxStyle(
  run: CombatRun,
  animation: SkillAnimationDefinition | undefined,
  target: CombatEnemy | undefined,
  playerAction?: CombatHitEvent | CombatMissEvent | CombatSkillCastEvent
): string {
  const eventDurationMs = playerAction?.kind === "hit" || playerAction?.kind === "miss" ? playerAction.vfxWindowMs : undefined;
  const durationStyle = ` --skill-duration: ${eventDurationMs ?? animation?.durationMs ?? 520}ms;`;
  const skillId = playerAction?.skillId;
  const origin = playerAction?.casterPosition ?? run.player;
  const facing = playerAction?.casterFacing ?? run.player.facing;

  if (skillId === "mechanism-shadow-net") {
    return `${combatActorStyle(run, origin.x + 150 * facing, origin.y)}${durationStyle}`;
  }

  if (skillId === "sword-prism-field") {
    return `${combatActorStyle(run, origin.x + 150 * facing, origin.y)}${durationStyle}`;
  }

  if (skillId === "mirrorflame-burst") {
    return `${combatActorStyle(run, origin.x + 148 * facing, origin.y)}${durationStyle}`;
  }

  if (skillId === "heat-bloom") {
    return `${combatActorStyle(run, origin.x + 112 * facing, origin.y)}${durationStyle}`;
  }

  if (skillId === "furnace-taunt") {
    return `${combatActorStyle(run, origin.x + 112 * facing, origin.y)}${durationStyle}`;
  }

  if (skillId === "cinder-uppercut") {
    return `${combatActorStyle(run, origin.x + 64 * facing, origin.y)}${durationStyle}`;
  }

  if (skillId === "anvil-crash") {
    return `${combatActorStyle(run, origin.x + 74 * facing, origin.y)}${durationStyle}`;
  }

  if (skillId === "shield-quake") {
    return `${combatActorStyle(run, origin.x + 92 * facing, origin.y)}${durationStyle}`;
  }

  if (skillId === "earth-furnace-breaker") {
    return `${combatActorStyle(run, origin.x + 96 * facing, origin.y)}${durationStyle}`;
  }

  if (skillId === "mountain-guard-break") {
    return `${combatActorStyle(run, origin.x + 88 * facing, origin.y)}${durationStyle}`;
  }

  if (skillId === "ink-shot") {
    return `${combatActorStyle(run, origin.x + 128 * facing, origin.y)}${durationStyle}`;
  }

  if (skillId === "ink-snare") {
    return `${combatActorStyle(run, origin.x + 112 * facing, origin.y)}${durationStyle}`;
  }

  if (animation?.vfxAnchor === "self") {
    return `${combatActorStyle(run, run.player.x, run.player.y)}${durationStyle}`;
  }

  if (animation?.vfxAnchor === "target" && target) {
    return `${combatActorStyle(run, target.position.x, target.position.y)}${durationStyle}`;
  }

  if (animation?.vfxAnchor === "area" && target) {
    return `${combatActorStyle(run, (run.player.x + target.position.x) / 2, (run.player.y + target.position.y) / 2)}${durationStyle}`;
  }

  return `${combatActorStyle(run, run.player.x + 128 * run.player.facing, run.player.y)}${durationStyle}`;
}

function combatScreenShake(hit: CombatHitEvent | undefined, playerHit: CombatPlayerHitEvent | undefined): string {
  if (hit?.vfxCue === "meteor-impact" || hit?.vfxCue === "sword-prism-field-burst" || hit?.vfxCue === "earth-furnace-eruption") {
    return "ultimate";
  }

  return hit ? hit.action ?? "test" : playerHit ? "enemy" : "none";
}

function combatScreenFlash(hit: CombatHitEvent | undefined): string {
  if (hit?.vfxCue === "meteor-impact") {
    return "meteor";
  }

  if (hit?.vfxCue === "sword-prism-field-burst") {
    return "prism-field";
  }

  if (hit?.vfxCue === "earth-furnace-eruption") {
    return "forge-quake";
  }

  return "none";
}

function renderCombatVfx(run: CombatRun): string {
  const hit = latestHitEvent(run);
  const hits = recentHitEvents(run);
  const playerHit = latestPlayerHitEvent(run);
  const bossPhase = latestBossPhaseEvent(run);
  const playerAction = latestPlayerActionEvent(run);
  const playerStatusVfx = recentPlayerStatusEvents(run)
    .map((event, eventIndex) => {
      const animation = classSkillById(event.skillId)?.animation;
      const statusPosition = event.casterPosition ?? { x: run.player.x, y: run.player.y };

      return `
        <div class="player-status-vfx skill-impact-burst skill-impact-shape-${animation?.vfxShape ?? "generic"}" data-player-status-vfx="${event.skillId}" data-status-vfx-shape="${animation?.vfxShape ?? ""}" data-status-event-id="${event.id}" data-status-hit-index="${eventIndex}" data-vfx-cue="${event.vfxCue}" data-status-origin-x="${Math.round(statusPosition.x)}" data-status-origin-y="${Math.round(statusPosition.y)}" style="${combatActorStyle(run, statusPosition.x, statusPosition.y)} --skill-duration: ${event.vfxWindowMs ?? animation?.durationMs ?? 520}ms; --status-hit-index: ${eventIndex};">
          <span class="skill-impact-core"></span>
          <span class="skill-impact-ring"></span>
          <span class="skill-impact-shards"></span>
        </div>
      `;
    })
    .join("");
  const skillTarget =
    playerAction?.kind === "hit" ? run.enemies.find((enemy) => enemy.id === playerAction.targetId) : undefined;
  const skillAnimation =
    playerAction?.action === "skill" && playerAction.skillId
      ? classSkillById(playerAction.skillId)?.animation
      : undefined;
  const hitstopActive = combatHitstopActive(run);
  const screenShake = combatScreenShake(hit, playerHit);
  const screenFlash = combatScreenFlash(hit);
  const impactSkillId = hit?.skillId ?? "";
  const hitVfx = hits
    .map((hitEvent, hitIndex) => {
      const target = run.enemies.find((enemy) => enemy.id === hitEvent.targetId);

      if (!target) {
        return "";
      }

      const impactPosition = hitEvent.impactPosition ?? target.position;
      const skillImpactAnimation =
        hitEvent.action === "skill" && hitEvent.skillId ? classSkillById(hitEvent.skillId)?.animation : undefined;
      const skillImpactVfx =
        hitEvent.action === "skill" && hitEvent.skillId && skillImpactAnimation
          ? `
        <div class="skill-impact-burst skill-impact-shape-${skillImpactAnimation.vfxShape}" data-skill-impact-vfx="${hitEvent.skillId}" data-impact-vfx-shape="${skillImpactAnimation.vfxShape}" data-impact-target-id="${target.id}" data-hit-event-id="${hitEvent.id}" data-impact-hit-index="${hitIndex}" data-hit-phase="${hitEvent.hitPhase ?? ""}" data-vfx-cue="${hitEvent.vfxCue ?? ""}" data-impact-origin-x="${Math.round(impactPosition.x)}" data-impact-origin-y="${Math.round(impactPosition.y)}" style="${combatActorStyle(run, impactPosition.x, impactPosition.y)} --skill-duration: ${hitEvent.vfxWindowMs ?? skillImpactAnimation.durationMs}ms; --impact-hit-index: ${hitIndex};">
          <span class="skill-impact-core"></span>
          <span class="skill-impact-ring"></span>
          <span class="skill-impact-shards"></span>
        </div>
      `
          : "";
      const airImpactAction = airActionForHitPhase(hitEvent.hitPhase);
      const airImpactClass = airImpactAction ? ` hit-impact-air-${airImpactAction}` : "";
      const dashImpactAction = dashActionForHitPhase(hitEvent.hitPhase);
      const dashImpactClass = dashImpactAction ? ` hit-impact-dash-${dashImpactAction}` : "";
      const groundLightImpactStep = groundLightStepForHitPhase(hitEvent.hitPhase);
      const groundLightImpactClass = groundLightImpactStep ? ` hit-impact-ground-light-${groundLightImpactStep}` : "";

      return `
        ${skillImpactVfx}
        <div class="hit-impact hit-impact-${hitEvent.action ?? "test"}${airImpactClass}${dashImpactClass}${groundLightImpactClass}" data-impact-spark="true" data-hit-event-id="${hitEvent.id}" data-vfx-action="${hitEvent.action ?? "test"}" data-hit-phase="${hitEvent.hitPhase ?? ""}" data-vfx-cue="${hitEvent.vfxCue ?? ""}" data-impact-air-action="${airImpactAction}" data-impact-dash-action="${dashImpactAction}" data-impact-ground-light-step="${groundLightImpactStep}" data-impact-origin-x="${Math.round(impactPosition.x)}" data-impact-origin-y="${Math.round(impactPosition.y)}" data-hitstop-ms="${hitEvent.hitstopMs}" style="${combatActorStyle(run, impactPosition.x, impactPosition.y)}">
          <span class="hit-ring"></span>
          <span class="hit-slash"></span>
        </div>
        <div class="damage-number" data-damage-number="true" data-hit-event-id="${hitEvent.id}" data-damage-origin-x="${Math.round(impactPosition.x)}" data-damage-origin-y="${Math.round(impactPosition.y)}" style="${combatActorStyle(run, impactPosition.x, impactPosition.y)}">-${hitEvent.damage}</div>
      `;
    })
    .join("");
  const skillVfx =
    playerAction?.action === "skill"
      ? `
        <div class="player-skill-vfx skill-vfx-${playerAction.skillId ?? "unknown"} skill-vfx-shape-${skillAnimation?.vfxShape ?? "generic"}" data-player-skill-vfx="${playerAction.skillId ?? "unknown"}" data-skill-vfx-shape="${skillAnimation?.vfxShape ?? ""}" data-vfx-anchor="${skillAnimation?.vfxAnchor ?? "front"}" data-weapon-arc="${skillAnimation?.weaponArc ?? ""}" data-hit-phase="${playerAction.kind === "hit" || playerAction.kind === "miss" ? playerAction.hitPhase ?? "" : ""}" data-vfx-cue="${playerAction.kind === "hit" || playerAction.kind === "miss" ? playerAction.vfxCue ?? "" : ""}" data-vfx-action="skill" style="${playerSkillVfxStyle(run, skillAnimation, skillTarget, playerAction)}">
          <span class="skill-core"></span>
          <span class="skill-wave"></span>
          <span class="skill-sparks"></span>
        </div>
      `
      : "";
  const enemyVfx = recentEnemyAttackEvents(run)
    .map((event) => {
      const enemy = run.enemies.find((item) => item.id === event.enemyId);

      if (!enemy || enemy.hp <= 0) {
        return "";
      }

      const effect = enemySkillEffect(enemy, event.skillId);
      const telegraphShape = enemyTelegraphShape(effect.id);
      const timing = enemyAttackPresentationTiming(run, enemy, event);
      const effectStyle = `${combatActorStyle(run, enemy.position.x, enemy.position.y)}${timing.styleVars}`;
      const telegraph =
        event.phase === "windup"
          ? `
            <div class="enemy-telegraph enemy-telegraph-${telegraphShape} enemy-telegraph-${effect.id}" data-enemy-id="${enemy.id}" data-enemy-telegraph="${effect.id}" data-telegraph-phase="${event.phase}" data-telegraph-shape="${telegraphShape}" data-enemy-attack-duration-ms="${timing.attackDurationMs}" data-enemy-vfx-duration-ms="${timing.vfxDurationMs}" style="${effectStyle}">
              <span class="enemy-telegraph-zone"></span>
              <span class="enemy-telegraph-edge"></span>
            </div>
          `
          : "";
      const skillVfx =
        event.phase !== "windup"
          ? `
            <div class="enemy-skill-vfx enemy-skill-${effect.id}" data-enemy-id="${enemy.id}" data-enemy-skill-vfx="${effect.id}" data-enemy-attack-phase="${event.phase}" data-enemy-attack-hit-index="${event.hitIndex ?? ""}" data-enemy-attack-total-hits="${event.totalHits ?? ""}" data-enemy-vfx-cue="${event.vfxCue ?? ""}" data-enemy-attack-duration-ms="${timing.attackDurationMs}" data-enemy-vfx-duration-ms="${timing.vfxDurationMs}" aria-label="${effect.label}" style="${effectStyle}">
              <span class="enemy-cast-ring"></span>
              <span class="enemy-cast-core"></span>
              <span class="enemy-cast-trail"></span>
            </div>
          `
          : "";
      const playerHit = matchingPlayerHitEvent(run, event);
      const feedbackResult = playerHit ? "hit" : event.phase === "miss" ? "miss" : "";
      const feedback =
        feedbackResult !== ""
          ? `
            <div class="combat-feedback combat-feedback-${feedbackResult} combat-feedback-skill-${effect.id}" data-combat-feedback="enemy-skill-${feedbackResult}" data-feedback-skill-id="${effect.id}" data-feedback-result="${feedbackResult}" data-player-feedback-cue="${playerHit?.feedbackCue ?? ""}" data-enemy-id="${enemy.id}" data-enemy-attack-hit-index="${event.hitIndex ?? ""}" data-enemy-attack-total-hits="${event.totalHits ?? ""}" data-enemy-vfx-cue="${event.vfxCue ?? ""}" style="${combatActorStyle(run, run.player.x, run.player.y)}">
              <span class="combat-feedback-text">${feedbackResult === "miss" ? "MISS" : "HIT"}</span>
            </div>
          `
          : "";

      return `
        ${telegraph}
        ${skillVfx}
        ${feedback}
      `;
    })
    .join("");
  const summonVfx = recentEnemySummonEvents(run)
    .flatMap((event) =>
      event.positions.map((position, index) => {
        const summonedEnemyId = event.summonedEnemyIds[index] ?? "";

        return `
          <div class="enemy-summon-vfx enemy-summon-rift-${event.skillId}" data-enemy-summon-vfx="${event.skillId}" data-summoned-enemy-id="${summonedEnemyId}" data-summon-index="${index}" data-summon-vfx-cue="${event.vfxCue}" style="${combatActorStyle(run, position.x, position.y)} --summon-index: ${index};">
            <span class="summon-rift-shadow"></span>
            <span class="summon-rift-ring"></span>
            <span class="summon-rift-core"></span>
            <span class="summon-rift-embers"></span>
          </div>
        `;
      })
    )
    .join("");
  const bossPhaseVfx = bossPhase
    ? `
        <div class="boss-phase-vfx boss-phase-vfx-${bossPhase.skillId}" data-boss-phase-vfx="${bossPhase.skillId}" data-boss-phase="${bossPhase.phase}" data-boss-phase-enemy-id="${bossPhase.enemyId}" data-boss-phase-hazard-count="${bossPhase.hazardCount}" data-boss-phase-cue="${bossPhase.vfxCue}" style="${combatActorStyle(run, run.arena.width / 2, run.arena.minY + 84)}">
          <span class="boss-phase-ring"></span>
          <span class="boss-phase-core"></span>
          <span class="boss-phase-shards"></span>
        </div>
      `
    : "";
  const recoveryVfx = playerQuickRecoverActive(run)
    ? `
        <div class="player-recovery-vfx" data-player-recovery-vfx="wake-invulnerable" data-player-recovery-state="quick-recover" data-player-invulnerable-active="${playerInvulnerableActive(run) ? "true" : "false"}" style="${combatActorStyle(run, run.player.x, run.player.y)}">
          <span class="player-recovery-ring"></span>
          <span class="player-recovery-core"></span>
          <span class="player-recovery-aura"></span>
        </div>
      `
    : "";

  return `
    <div class="combat-vfx-layer" data-hitstop-active="${hitstopActive ? "true" : "false"}" data-screen-shake="${screenShake}" data-screen-flash="${screenFlash}" data-impact-skill-id="${impactSkillId}">
      ${bossPhaseVfx}
      ${recoveryVfx}
      ${enemyVfx}
      ${summonVfx}
      ${hitVfx}
      ${playerStatusVfx}
      ${skillVfx}
    </div>
  `;
}

function renderArenaHazards(run: CombatRun): string {
  const hazards = recentArenaHazardEvents(run);

  if (hazards.length === 0) {
    return `<div class="arena-hazard-layer" data-arena-hazard-layer="true" data-arena-hazard-count="0"></div>`;
  }

  const hazardMarkup = hazards
    .map((event, index) => {
      const playerHit = matchingArenaHazardPlayerHit(run, event);
      const feedbackResult = playerHit ? "hit" : event.phase === "miss" ? "miss" : "";
      const feedback =
        feedbackResult !== ""
          ? `
            <div class="combat-feedback combat-feedback-${feedbackResult} combat-feedback-skill-${event.skillId}" data-combat-feedback="arena-hazard-${feedbackResult}" data-feedback-skill-id="${event.skillId}" data-feedback-result="${feedbackResult}" data-player-feedback-cue="${playerHit?.feedbackCue ?? ""}" data-hazard-id="${event.hazardId}" data-hazard-vfx-cue="${event.vfxCue}" style="${combatActorStyle(run, run.player.x, run.player.y)}">
              <span class="combat-feedback-text">${feedbackResult === "miss" ? "MISS" : "HIT"}</span>
            </div>
          `
          : "";

      return `
        <div class="arena-hazard arena-hazard-${event.skillId}" data-arena-hazard="${event.skillId}" data-hazard-id="${event.hazardId}" data-hazard-phase="${event.phase}" data-hazard-index="${index}" data-hazard-impact-at-ms="${event.impactAtMs}" data-hazard-vfx-cue="${event.vfxCue}" data-hazard-radius-x="${event.radiusX}" data-hazard-lane-range="${event.laneRange}" style="${combatActorStyle(run, event.x, event.y)} --hazard-radius-x: ${event.radiusX}px; --hazard-lane-range: ${event.laneRange}px; --hazard-index: ${index};">
          <span class="arena-hazard-shadow"></span>
          <span class="arena-hazard-marker"></span>
          <span class="arena-hazard-core"></span>
          <span class="arena-hazard-debris"></span>
        </div>
        ${feedback}
      `;
    })
    .join("");

  return `
    <div class="arena-hazard-layer" data-arena-hazard-layer="true" data-arena-hazard-count="${hazards.length}">
      ${hazardMarkup}
    </div>
  `;
}

function renderCombatActors(run: CombatRun, state: GameState): string {
  const classDef = catalog.classes.find((item) => item.id === state.player.classId);
  const recentHits = recentHitEvents(run);
  const hitTargetIds = new Set(recentHits.map((event) => event.targetId));
  const latestHitByTargetId = new Map<string, CombatHitEvent>();
  const summonedById = new Map<string, string>();

  for (const event of recentHits) {
    latestHitByTargetId.set(event.targetId, event);
  }

  for (const event of recentEnemySummonEvents(run)) {
    for (const enemyId of event.summonedEnemyIds) {
      summonedById.set(enemyId, event.skillId);
    }
  }

  const playerMotionName = playerMotion(run);
  const latestPlayerHit = latestPlayerHitEvent(run);
  const playerHurtFeedbackCue = playerMotionName === "hit" ? latestPlayerHit?.feedbackCue ?? "" : "";
  const airState = playerAirState(run);
  const activeSkill = latestPlayerSkillAnimation(run);
  const releaseSource = latestSkillReleaseSource(run);
  const comboCancelCast = latestComboCancelCastEvent(run);
  const comboCancelWindow = comboCancelWindowActive(run);
  const activeSkillMovement = playerUiSkillMovement(run);
  const playerSkillStage = playerSkillVisualState(run);
  const activeBossPhase = latestBossPhaseEvent(run);
  const playerSkillStageStyle =
    playerSkillStage.stage === "none" ? "" : ` --player-skill-stage-progress: ${playerSkillStage.progress}%;`;
  const roomTransition = run.roomTransition;
  const roomTransitionProgress = roomTransition
    ? Math.round(Math.min(1, Math.max(0, (run.elapsedMs - roomTransition.startedAtMs) / roomTransition.durationMs)) * 100)
    : 0;
  const roomTransitionStyle = roomTransition
    ? ` --room-transition-progress: ${roomTransitionProgress}%; --room-transition-duration: ${roomTransition.durationMs}ms;`
    : "";
  const normalAttackMovement = playerNormalAttackMovement(run);
  const skillMotionClass =
    playerMotionName === "skill" && activeSkill ? ` actor-skill-${activeSkill.animation.preset}` : "";
  const skillPhaseClass =
    playerMotionName === "skill" && playerSkillStage.hitPhase ? ` actor-skill-phase-${playerSkillStage.hitPhase}` : "";
  const normalComboStep =
    playerMotionName === "light" ? Math.min(3, Math.max(1, run.player.normalAttackComboStep || run.player.comboStep || 1)) : 0;
  const normalComboMotionClass = normalComboStep > 0 ? ` actor-model-light-${normalComboStep}` : "";
  const recentEnemyModelAttackEvents = recentEnemyAttackEvents(run);
  const enemyActors = run.enemies
    .map((enemy) => {
      const enemyState = enemy.hp > 0 ? "alive" : "defeated";
      const hpPercent = enemyHpPercent(enemy);
      const hpPercentRounded = Math.round(hpPercent);
      const bossPhase = enemy.kind === "boss" ? enemy.bossPhase ?? 1 : "";
      const bossEnraged = enemy.kind === "boss" && (enemy.bossPhase ?? 1) >= 2;
      const baseMotion = enemyMotion(enemy, hitTargetIds.has(enemy.id) ? enemy.id : undefined, run.elapsedMs);
      const bossPhaseSkillId =
        enemy.kind === "boss" && !enemy.attackSkillId && baseMotion === "idle" && activeBossPhase?.enemyId === enemy.id
          ? activeBossPhase.skillId
          : "";
      const motion = bossPhaseSkillId ? "attack" : baseMotion;
      const enemyMotionSkillId = enemy.attackSkillId ?? bossPhaseSkillId;
      const enemySkillMotionClass = enemyMotionSkillId ? `actor-enemy-skill-${enemyMotionSkillId}` : "";
      const attackVisual = bossPhaseSkillId
        ? bossPhaseAttackVisualState(activeBossPhase, run.elapsedMs)
        : enemyAttackVisualState(enemy, run.elapsedMs);
      const hitRecent = hitTargetIds.has(enemy.id);
      const controlState = enemyControlState(enemy, run.elapsedMs);
      const airborneState = enemyAirborneState(enemy);
      const armorState = enemyArmorState(enemy, run.elapsedMs);
      const spawnSource = summonedById.get(enemy.id);
      const recentTargetHit = latestHitByTargetId.get(enemy.id);
      const hitAirAction = airActionForHitPhase(recentTargetHit?.hitPhase);
      const hitDashAction = dashActionForHitPhase(recentTargetHit?.hitPhase);
      const hitGroundLightStep = groundLightStepForHitPhase(recentTargetHit?.hitPhase);
      const hitSlide = enemyHitSlideState(run, enemy, recentTargetHit);
      const enemyModelAttackEvent = recentEnemyModelAttackEvents.find(
        (event) => event.enemyId === enemy.id && event.skillId === enemyMotionSkillId && event.phase !== "windup"
      );
      const enemyModelVfxCue = enemyModelAttackEvent?.vfxCue ?? "";

      return `
        <div class="combat-actor combat-enemy combat-enemy-${enemy.kind}" data-enemy-id="${enemy.id}" data-enemy-kind="${enemy.kind}" data-enemy-state="${enemyState}" data-enemy-motion="${motion}" data-enemy-attack-skill-id="${enemy.attackSkillId ?? ""}" data-boss-phase-skill-id="${bossPhaseSkillId}" data-enemy-model-vfx-cue="${enemyModelVfxCue}" data-enemy-attack-hit-index="${enemy.attackResolvedHits ?? ""}" data-enemy-attack-stage="${attackVisual.stage}" data-enemy-attack-duration-ms="${attackVisual.durationMs || ""}" data-enemy-attack-progress="${attackVisual.progress}" data-hit-recent="${hitRecent ? "true" : "false"}" data-hit-action="${recentTargetHit?.action ?? ""}" data-hit-phase="${recentTargetHit?.hitPhase ?? ""}" data-hit-air-action="${hitAirAction}" data-enemy-hit-air-action="${hitAirAction}" data-hit-dash-action="${hitDashAction}" data-enemy-hit-dash-action="${hitDashAction}" data-enemy-hit-ground-light-step="${hitGroundLightStep}" data-hit-vfx-cue="${recentTargetHit?.vfxCue ?? ""}" data-enemy-hit-slide-active="${hitSlide.active ? "true" : "false"}" data-enemy-hit-slide-progress="${hitSlide.progress.toFixed(2)}" data-enemy-hit-slide-start-x="${hitSlide.start ? Math.round(hitSlide.start.x) : ""}" data-enemy-hit-slide-start-y="${hitSlide.start ? Math.round(hitSlide.start.y) : ""}" data-enemy-hit-slide-end-x="${hitSlide.end ? Math.round(hitSlide.end.x) : ""}" data-enemy-hit-slide-end-y="${hitSlide.end ? Math.round(hitSlide.end.y) : ""}" data-enemy-hit-slide-duration-ms="${enemyHitSlideDurationMs}" data-ink-marks="${enemy.marks}" data-control-state="${controlState}" data-airborne-state="${airborneState}" data-enemy-airborne="${enemy.airborne ? "true" : "false"}" data-enemy-knockdown="${enemy.downed ? "true" : "false"}" data-armor-state="${armorState}" data-enemy-spawn-source="${spawnSource ?? ""}" data-enemy-spawn-state="${spawnSource ? "summoned" : "native"}" data-enemy-body-width="${enemy.body.width}" data-enemy-body-height="${enemy.body.height}" data-enemy-hurtbox-width="${enemy.hurtbox.width}" data-enemy-hurtbox-height="${enemy.hurtbox.height}" data-enemy-x="${Math.round(enemy.position.x)}" data-enemy-y="${Math.round(enemy.position.y)}" data-boss-phase="${bossPhase}" data-boss-enraged="${bossEnraged ? "true" : "false"}" data-enemy-hp-current="${enemy.hp}" data-enemy-hp-max="${enemy.maxHp}" data-enemy-hp-percent="${hpPercentRounded}" style="${enemyActorStyle(run, enemy, hitSlide.position)}">
          <div class="enemy-nameplate">${enemy.displayName}</div>
          <div class="enemy-model-frame">
            <img class="enemy-art actor-model actor-model-${motion}${enemySkillMotionClass ? ` ${enemySkillMotionClass}` : ""}" data-enemy-skill-motion-class="${enemySkillMotionClass}" style="${enemyModelMotionStyle(run, enemy, attackVisual, enemyMotionSkillId)}" src="${enemyAsset(enemy)}" alt="${enemy.displayName}" />
          </div>
          <div class="enemy-health" aria-label="${enemy.displayName} HP ${enemy.hp}/${enemy.maxHp}">
            <span class="enemy-health-fill" style="--hp: ${hpPercent}%;"></span>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="combat-actors" data-last-hit-target="${[...hitTargetIds].at(-1) ?? ""}">
      <div class="combat-actor combat-player" data-player-facing="${run.player.facing}" data-player-motion="${playerMotionName}" data-player-state="${playerState(run)}" data-player-hurt-feedback-cue="${playerHurtFeedbackCue}" data-player-room-transition="${roomTransition?.state ?? "none"}" data-player-room-transition-progress="${roomTransitionProgress || ""}" data-player-combo-step="${run.player.comboStep}" data-player-combo-count="${run.comboCount}" data-player-normal-combo-step="${normalComboStep || ""}" data-player-normal-attack-active="${playerNormalAttackActive(run) ? "true" : "false"}" data-player-normal-attack-type="${run.player.normalAttackType}" data-player-normal-attack-started-at-ms="${run.player.normalAttackStartedAtMs || ""}" data-player-normal-attack-until-ms="${run.player.normalAttackUntilMs || ""}" data-player-normal-attack-move="${normalAttackMovement?.skillId ?? ""}" data-player-normal-attack-move-progress="${playerSkillMovementProgress(run, normalAttackMovement)}" data-player-normal-attack-start-x="${normalAttackMovement ? Math.round(normalAttackMovement.startX) : ""}" data-player-normal-attack-end-x="${normalAttackMovement ? Math.round(normalAttackMovement.endX) : ""}" data-player-normal-attack-hit-x="${normalAttackMovement ? Math.round(normalAttackMovement.endX) : ""}" data-player-normal-attack-hit-at-ms="${normalAttackMovement ? normalAttackMovement.endAtMs : ""}" data-shield-active="${playerShieldActive(run) ? "true" : "false"}" data-evade-active="${playerEvadeActive(run) ? "true" : "false"}" data-reflect-active="${playerReflectActive(run) ? "true" : "false"}" data-player-bound-active="${playerBoundActive(run) ? "true" : "false"}" data-player-bound-until-ms="${run.player.boundUntilMs || ""}" data-player-hurt-lock-active="${playerHurtLockActive(run) ? "true" : "false"}" data-player-invulnerable-active="${playerInvulnerableActive(run) ? "true" : "false"}" data-player-invulnerable-until-ms="${run.player.invulnerableUntilMs || ""}" data-player-recovery-state="${playerQuickRecoverActive(run) ? "quick-recover" : playerQuickRecoverReady(run) ? "ready" : "none"}" data-player-recovery-available="${playerQuickRecoverReady(run) ? "true" : "false"}" data-player-quick-recover-active="${playerQuickRecoverActive(run) ? "true" : "false"}" data-player-quick-recover-ready-until-ms="${playerQuickRecoverReady(run) ? run.player.quickRecoverReadyUntilMs : ""}" data-player-quick-recover-started-at-ms="${run.player.quickRecoverStartedAtMs || ""}" data-player-quick-recover-until-ms="${run.player.quickRecoverUntilMs || ""}" data-player-air-state="${airState}" data-player-airborne-active="${playerAirborneActive(run) ? "true" : "false"}" data-player-air-attack-active="${playerAirAttackActive(run) ? "true" : "false"}" data-player-air-attack-used="${run.player.airAttackUsed ? "true" : "false"}" data-player-air-attack-type="${run.player.airAttackType}" data-player-air-attack-started-at-ms="${run.player.airAttackStartedAtMs || ""}" data-player-air-attack-until-ms="${run.player.airAttackUntilMs || ""}" data-player-dash-attack-active="${playerDashAttackActive(run) ? "true" : "false"}" data-player-dash-attack-ready-until-ms="${run.player.dashAttackReadyUntilMs || ""}" data-player-dash-attack-started-at-ms="${run.player.dashAttackStartedAtMs || ""}" data-player-dash-attack-until-ms="${run.player.dashAttackUntilMs || ""}" data-player-airborne-until-ms="${run.player.airborneUntilMs || ""}" data-player-landing-until-ms="${run.player.landingUntilMs || ""}" data-dodge-result="${playerDodgeResult(run)}" data-prism-chain="${run.player.prismChain}" data-last-skill-id="${run.player.lastSkillId ?? ""}" data-active-skill-id="${activeSkill?.skillId ?? ""}" data-skill-release-source="${releaseSource}" data-combo-cancel-active="${comboCancelCast ? "true" : "false"}" data-combo-cancel-window-active="${comboCancelWindow ? "true" : "false"}" data-combo-cancel-skill-id="${comboCancelCast?.skillId ?? ""}" data-skill-animation-preset="${activeSkill?.animation.preset ?? ""}" data-skill-weapon-arc="${activeSkill?.animation.weaponArc ?? ""}" data-skill-vfx-shape="${activeSkill?.animation.vfxShape ?? ""}" data-skill-duration-ms="${activeSkill?.animation.durationMs ?? ""}" data-player-skill-stage="${playerSkillStage.stage}" data-player-skill-stage-progress="${playerSkillStage.progress}" data-player-skill-stage-duration-ms="${playerSkillStage.durationMs}" data-player-skill-active-frame-ms="${playerSkillStage.activeFrameMs}" data-player-skill-hit-at-ms="${playerSkillStage.hitAtMs}" data-player-skill-hit-phase="${playerSkillStage.hitPhase}" data-player-skill-vfx-cue="${playerSkillStage.vfxCue}" data-player-skill-move="${activeSkillMovement?.skillId ?? ""}" data-player-skill-move-progress="${playerSkillMovementProgress(run, activeSkillMovement)}" data-player-skill-move-end-x="${activeSkillMovement ? Math.round(activeSkillMovement.endX) : ""}" style="${combatActorStyle(run, run.player.x, run.player.y)}${playerSkillStageStyle}${roomTransitionStyle}">
        ${playerTrailMarkup(run, playerMotionName, activeSkill)}
        <img class="combat-player-art actor-model actor-model-${playerMotionName}${skillMotionClass}${skillPhaseClass}${normalComboMotionClass}" data-hero-class-id="${state.player.classId}" style="${playerModelMotionStyle(run, activeSkill?.animation)}" src="${heroAssetForClass(state.player.classId)}" alt="${classDef?.displayName ?? state.player.classId}" />
        ${weaponLayerMarkup(state, "combat", activeSkill?.animation, playerMotionName, normalComboStep, playerSkillStage.hitPhase, playerSkillStage.vfxCue)}
        <div class="player-nameplate">${classDef?.displayName ?? state.player.classId}</div>
      </div>
      ${enemyActors}
    </div>
  `;
}

function renderCombatScene(run: CombatRun, state: GameState): string {
  const plan = createRenderPlan(run, run.dungeonId);
  const roomCleared = run.enemies.length === 0 || run.enemies.every((enemy) => enemy.hp <= 0);
  const roomFailed = run.failed || run.player.defeated;
  const objective = roomFailed ? "failed" : roomCleared ? "cleared" : "active";
  const roomGate = roomGateForRun(run);
  const dungeon = catalog.dungeons.find((item) => item.id === run.dungeonId);
  const combatDifficulty = getDungeonDifficulty(run.difficultyId);
  const roomCount = dungeon?.rooms ?? 0;
  const liveEnemyCount = run.enemies.filter((enemy) => enemy.hp > 0).length;
  const defeatedEnemyCount = run.enemies.filter((enemy) => enemy.hp <= 0).length;
  const gateEnterReady = canEnterRoomGate(run);
  const transitionFromRoom = run.roomTransition?.fromRoomIndex ?? "";
  const transitionTargetRoom = run.roomTransition?.targetRoomIndex ?? "";
  const transitionGateState = run.roomTransition?.gateState ?? "";
  const activeRoomTransition = roomTransitionActive(run);
  const roomTransitionProgress = run.roomTransition
    ? Math.round(Math.min(1, Math.max(0, (run.elapsedMs - run.roomTransition.startedAtMs) / run.roomTransition.durationMs)) * 100)
    : 0;
  const roomGateVfx =
    activeRoomTransition
      ? "enter-rift"
      : roomGate.state === "locked"
        ? "sealed"
        : roomGate.state === "boss"
          ? "boss-rift"
          : roomGate.state === "complete"
            ? "exit-rift"
            : "open-rift";
  const roomGateTransition = activeRoomTransition ? "entering" : roomGate.state === "locked" ? "blocked" : "ready";
  const roomGateMarkup = `
    <div class="room-gate room-gate-${roomGate.state}" data-room-gate="true" data-room-gate-state="${roomGate.state}" data-room-gate-vfx="${roomGateVfx}" data-room-gate-transition="${roomGateTransition}" data-room-gate-room-index="${roomGate.roomIndex}" data-room-gate-target-room="${roomGate.targetRoomIndex ?? ""}" data-room-gate-enter-ready="${gateEnterReady ? "true" : "false"}" data-room-gate-x="${Math.round(roomGate.x)}" data-room-gate-y="${Math.round(roomGate.y)}" data-room-transition-progress="${roomTransitionProgress || ""}" style="${combatActorStyle(run, roomGate.x, roomGate.y)} --room-transition-duration: ${run.roomTransition?.durationMs ?? 0}ms;" aria-label="${roomGate.label}">
      <span class="room-gate-core"></span>
      <span class="room-gate-rift"></span>
      <span class="room-gate-threshold"></span>
      <span class="room-gate-label">${roomGate.label}</span>
    </div>
  `;
  const doorStatusLabel =
    activeRoomTransition
      ? "穿越房门"
      : roomGate.state === "locked"
      ? "房门封印"
      : roomGate.state === "boss"
        ? "前往首领房"
        : roomGate.state === "complete"
          ? "离开副本"
        : "前往下一房";
  const doorStatus = `<div class="door-status-button" data-door-state="${roomGate.state}" data-room-gate-state="${roomGate.state}">${doorStatusLabel}</div>`;
  const availableCombatSkills = combatSkillsForState(state);
  const comboCancelWindow = comboCancelWindowActive(run);
  const comboCancelCast = latestComboCancelCastEvent(run);
  const comboCancelAvailable =
    comboCancelWindow &&
    !roomCleared &&
    !roomFailed &&
    availableCombatSkills.some((skill) => run.player.resource.current >= skill.resourceCost && skillCooldownRemaining(run, skill.id) <= 0);
  const comboCancelState = comboCancelCast ? "used" : comboCancelAvailable ? "available" : comboCancelWindow ? "blocked" : "none";
  const renderSkillButton = (skill: ClassSkillDefinition | undefined, dnfHotkey: string, slotIndex: number): string => {
    if (!skill) {
      return `<button class="dnf-skill-slot is-empty" data-dnf-hotkey="${dnfHotkey}" data-dnf-slot-index="${slotIndex}" data-dnf-slot-state="empty" data-command-slot-state="empty" disabled><span class="dnf-keycap">${dnfHotkey}</span><span>空槽</span></button>`;
    }

      const skillRank = getSkillLevel(state, skill.id);
      const cooldownRemaining = skillCooldownRemaining(run, skill.id);
      const cooldownLabel = cooldownRemaining > 0 ? ` · 冷却 ${(cooldownRemaining / 1000).toFixed(1)}s` : "";
      const cooldownState = cooldownRemaining > 0 ? "cooling" : "ready";
      const command = commandDefinitionForSkill(state, skill.id);
      const commandManualCost = combatSkillResourceCost(skill, "command");
      const directAvailable = !roomCleared && !roomFailed && run.player.resource.current >= skill.resourceCost && cooldownRemaining <= 0;
      const commandAvailable = Boolean(command) && !roomCleared && !roomFailed && run.player.resource.current >= commandManualCost && cooldownRemaining <= 0;
      const disabled = !directAvailable;
      const hotkeyLabel = dnfHotkey ? `${dnfHotkey}/${skill.key}` : skill.key;
      const slotState = cooldownRemaining > 0 ? "cooling" : disabled ? "locked" : "ready";
      const commandSlotState =
        cooldownRemaining > 0
          ? "cooling"
          : commandAvailable && !directAvailable
            ? "available-by-command"
            : commandAvailable
              ? "ready"
              : command
                ? "locked"
                : "empty";
      const slotIndexAttribute = slotIndex >= 0 ? String(slotIndex) : "";
      const dnfClass = dnfHotkey ? "dnf-skill-slot" : "legacy-skill-slot";
      const commandKeys = command
        ? [...command.display].map((key) => `<span class="command-key">${key}</span>`).join("")
        : "";
      const commandMarkup = command
        ? `<span class="skill-slot-command" aria-label="手搓指令 ${command.display}">${commandKeys}</span><span class="skill-slot-discount">消耗-${commandInputDiscountPercent}%</span>`
        : "";
      const commandAttributes = command
        ? `data-command-input="${command.input}" data-command-display="${command.display}" data-command-terminal-key="${command.terminalKey}" data-command-base-cost="${skill.resourceCost}" data-command-manual-cost="${commandManualCost}" data-command-discount-percent="${commandInputDiscountPercent}"`
        : `data-command-input="" data-command-display="" data-command-terminal-key="" data-command-base-cost="${skill.resourceCost}" data-command-manual-cost="${skill.resourceCost}" data-command-discount-percent="0"`;

      return `<button class="${dnfClass}" data-combat-action="skill" data-combat-skill-id="${skill.id}" data-skill-rank="${skillRank}" data-hotkey="${skill.key}" data-dnf-hotkey="${dnfHotkey}" data-dnf-slot-index="${slotIndexAttribute}" data-legacy-hotkey="${skill.key}" data-dnf-slot-state="${slotState}" data-command-slot-state="${commandSlotState}" ${commandAttributes} data-resource-id="${run.player.resource.id}" data-skill-cost="${skill.resourceCost}" data-skill-cooldown-remaining="${cooldownRemaining}" data-cooldown-state="${cooldownState}" data-combo-cancel-available="${comboCancelAvailable && directAvailable ? "true" : "false"}" data-combo-cancel-button-state="${comboCancelAvailable && directAvailable ? "available" : comboCancelWindow ? "blocked" : "none"}" ${disabled ? "disabled" : ""}>${dnfHotkey ? `<span class="dnf-keycap">${dnfHotkey}</span>` : ""}<span class="skill-slot-name">${skill.displayName}</span><span class="skill-slot-meta">${hotkeyLabel} · ${skill.resourceCost} · Lv.${skillRank}${cooldownLabel}</span>${commandMarkup}<span class="dnf-cooldown-overlay" aria-hidden="true"></span></button>`;
  };
  const dnfSkillButtons = dnfSkillHotkeys
    .map((hotkey, index) => renderSkillButton(availableCombatSkills[index], hotkey, index))
    .join("");
  const legacySkillButtons = availableCombatSkills
    .slice(dnfSkillHotkeys.length)
    .map((skill) => renderSkillButton(skill, "", -1))
    .join("");
  const skillButtons = `
    <div class="dnf-skill-bar" data-dnf-skill-bar="true" data-dnf-slot-count="${dnfSkillHotkeys.length}">
      ${dnfSkillButtons}
    </div>
    ${legacySkillButtons ? `<div class="legacy-skill-bar" data-legacy-skill-bar="true">${legacySkillButtons}</div>` : ""}
  `;
  const enemies = run.enemies
    .map((enemy) => `<li>${enemy.displayName} HP ${enemy.hp}/${enemy.maxHp} · 护甲 ${enemy.armor}</li>`)
    .join("");
  const sparks = plan.commands.filter((command) => command.kind === "hit-spark").length;
  const activeQuest = getActiveQuestText(state);
  const combatStats = run.combatProfile.stats;
  const attackValue = Math.round(combatStats.attack ?? 0);
  const defenseValue = Math.round(combatStats.defense ?? 0);
  const cooldownValue = Math.round(combatStats.cooldown ?? 0);
  const comboActive = run.comboCount > 0 && run.elapsedMs <= run.comboExpiresAtMs;
  const comboMeter = comboActive
    ? `<div class="combo-meter" data-combo-active="true" data-combo-count="${run.comboCount}"><strong>${run.comboCount}</strong><span>CHAIN</span></div>`
    : `<div class="combo-meter is-idle" data-combo-active="false" data-combo-count="0"><strong>0</strong><span>CHAIN</span></div>`;
  const sceneHit = latestHitEvent(run);
  const scenePlayerHit = latestPlayerHitEvent(run);
  const sceneScreenShake = combatScreenShake(sceneHit, scenePlayerHit);
  const sceneScreenFlash = combatScreenFlash(sceneHit);
  const sceneHitstopActive = combatHitstopActive(run);
  const sceneImpactSkillId = sceneHit?.skillId ?? "";
  const bufferedAction = run.player.bufferedAction;
  const bufferState = bufferedAction ? "queued" : "empty";
  const bufferExecuteAtMs = run.player.bufferedActionExecuteAtMs;
  const bufferRemainingMs = bufferedAction && bufferExecuteAtMs !== undefined ? Math.max(0, bufferExecuteAtMs - run.elapsedMs) : 0;
  const bossEnemy = run.enemies.find((enemy) => enemy.kind === "boss");
  const bossPhase = bossEnemy ? bossEnemy.bossPhase ?? 1 : "";
  const bossPhaseTriggered = Boolean(bossEnemy?.bossPhaseTriggeredAtMs !== undefined || (bossEnemy?.bossPhase ?? 1) >= 2);
  const activeArenaHazards = roomFailed ? [] : recentArenaHazardEvents(run);
  const arenaHazardIds = new Set([
    ...activeArenaHazards.map((hazard) => hazard.hazardId),
    ...(roomFailed ? [] : (run.scheduledArenaHazards ?? []).map((hazard) => hazard.hazardId))
  ]);
  const arenaHazardCount = arenaHazardIds.size;
  const arenaDanger = arenaHazardCount > 0 ? "taotie-forge-collapse" : "none";
  const latestCast = latestSkillCastEvent(run);
  const commandReleaseSource = latestSkillReleaseSource(run);
  const commandReductionApplied = latestCast?.inputMethod === "command";
  const healingPotionCount = state.player.consumables["healing-potion"] ?? 0;
  const revivalTokenCount = state.player.consumables["revival-token"] ?? 0;
  const healingPotionDisabled = roomCleared || roomFailed || healingPotionCount <= 0 || run.player.hp >= run.player.maxHp;
  const revivalTokenDisabled = !roomFailed || revivalTokenCount <= 0;
  const consumableQuickbar = `
    <div class="consumable-quickbar" data-consumable-hotbar="true" data-healing-potion-count="${healingPotionCount}" data-revival-token-count="${revivalTokenCount}">
      <button class="consumable-slot consumable-slot-healing" data-consumable-id="healing-potion" data-consumable-hotkey="1" ${healingPotionDisabled ? "disabled" : ""}><span class="consumable-keycap">1</span><span class="consumable-name">恢复药剂</span><strong>${healingPotionCount}</strong></button>
      <button class="consumable-slot consumable-slot-revive" data-consumable-id="revival-token" data-consumable-hotkey="2" ${revivalTokenDisabled ? "disabled" : ""}><span class="consumable-keycap">2</span><span class="consumable-name">复活令</span><strong>${revivalTokenCount}</strong></button>
    </div>
  `;

  return `
    <section class="combat-scene" aria-label="战斗 · ${combatDifficulty.displayName}" data-combat-difficulty="${run.difficultyId}" data-combat-objective="${objective}" data-dungeon-id="${run.dungeonId}" data-room-index="${run.roomIndex}" data-room-count="${roomCount}" data-combat-elapsed-ms="${run.elapsedMs}" data-live-enemy-count="${liveEnemyCount}" data-defeated-enemy-count="${defeatedEnemyCount}" data-player-hp="${run.player.hp}" data-player-max-hp="${run.player.maxHp}" data-player-x="${Math.round(run.player.x)}" data-player-y="${Math.round(run.player.y)}" data-gate-enter-ready="${gateEnterReady ? "true" : "false"}" data-class-id="${state.player.classId}" data-advancement-id="${state.player.advancementId ?? ""}" data-resource-id="${run.player.resource.id}" data-resource-current="${run.player.resource.current}" data-resource-max="${run.player.resource.max}" data-combo-count="${run.comboCount}" data-room-gate-state="${roomGate.state}" data-room-gate-target-room="${roomGate.targetRoomIndex ?? ""}" data-room-transition-state="${run.roomTransition?.state ?? "none"}" data-room-transition-from-room="${transitionFromRoom}" data-room-transition-target-room="${transitionTargetRoom}" data-room-transition-gate-state="${transitionGateState}" data-room-transition-progress="${roomTransitionProgress || ""}" data-screen-shake="${sceneScreenShake}" data-screen-flash="${sceneScreenFlash}" data-hitstop-active="${sceneHitstopActive ? "true" : "false"}" data-impact-skill-id="${sceneImpactSkillId}" data-action-buffer-state="${bufferState}" data-buffered-action="${bufferedActionName(bufferedAction)}" data-buffered-skill-id="${bufferedSkillId(bufferedAction)}" data-buffered-execute-at-ms="${bufferExecuteAtMs ?? ""}" data-buffer-ms-remaining="${bufferRemainingMs}" data-buffer-window-ms="${actionBufferWindowMs}" data-combo-cancel-window-active="${comboCancelWindow ? "true" : "false"}" data-combo-cancel-available="${comboCancelAvailable ? "true" : "false"}" data-combo-cancel-state="${comboCancelState}" data-combo-cancel-active="${comboCancelCast ? "true" : "false"}" data-combo-cancel-skill-id="${comboCancelCast?.skillId ?? ""}" data-combo-cancel-ms-remaining="${comboCancelWindow ? Math.max(0, run.player.cancelWindowUntilMs - run.elapsedMs) : 0}" data-boss-phase="${bossPhase}" data-boss-phase-triggered="${bossPhaseTriggered ? "true" : "false"}" data-arena-danger="${arenaDanger}" data-arena-hazard-count="${arenaHazardCount}" data-command-release-source="${commandReleaseSource}" data-command-match-skill-id="${commandReductionApplied ? latestCast?.skillId ?? "" : ""}" data-command-reduction-applied="${commandReductionApplied ? "true" : "false"}" data-last-input-method="${latestCast?.inputMethod ?? (latestCast ? "hotkey" : "none")}">
      <div class="combat-backdrop scene-${run.dungeonId}">
        <img class="combat-background-art" src="${dungeonBackgroundAsset(run.dungeonId)}" alt="" aria-hidden="true" />
        <div class="render-layer-count">${plan.palette.displayName} · ${plan.palette.layers.length}层 · 火花 ${sparks}</div>
      </div>
      ${renderCombatActors(run, state)}
      ${roomGateMarkup}
      ${roomFailed ? `<div class="arena-hazard-layer" data-arena-hazard-layer="true" data-arena-hazard-count="0"></div>` : renderArenaHazards(run)}
      ${renderCombatVfx(run)}
      ${comboMeter}
      ${commandReductionApplied ? `<div class="command-input-toast" data-command-toast="true">COMMAND INPUT</div>` : ""}
      ${comboCancelCast ? `<div class="skill-cancel-toast" data-skill-cancel-toast="true" data-combo-cancel-skill-id="${comboCancelCast.skillId}">CANCEL</div>` : ""}
      ${
        roomCleared
          ? `<div class="room-clear-banner"><strong>房间已清理</strong><span>前往右侧房门进入下一段战斗</span></div>`
          : ""
      }
      ${
        roomFailed
          ? `<div class="room-failed-banner"><strong>角色倒地</strong><span>返回城镇整备后重新挑战</span></div>`
          : ""
      }
      <div class="combat-actions">
        <div class="combat-control-hint">方向键移动 · Shift 冲刺 · X/J 轻击 · Z/K 重击 · C 跳跃/受身 · A/S/D/F/G/H 技能 · 1 药剂 · 2 复活</div>
        <button data-combat-action="light" data-hotkey="J" ${roomCleared || roomFailed ? "disabled" : ""}>轻击<span>X/J</span></button>
        <button data-combat-action="heavy" data-hotkey="K" ${roomCleared || roomFailed ? "disabled" : ""}>重击<span>Z/K</span></button>
        <button data-combat-action="jump" data-hotkey="C" data-player-recovery-available="${playerQuickRecoverReady(run) ? "true" : "false"}" ${roomCleared || roomFailed ? "disabled" : ""}>${playerQuickRecoverReady(run) ? "受身" : "跳跃"}<span>C</span></button>
        <button data-combat-action="backstep" ${roomCleared || roomFailed ? "disabled" : ""}>后跳<span>鼠标</span></button>
        ${skillButtons}
        ${consumableQuickbar}
        ${doorStatus}
        <button data-mode="town">返回</button>
      </div>
      <div class="combat-status">
        <p>${combatDifficulty.displayName} · 房间 ${run.roomIndex + 1} · HP ${run.player.hp}/${run.player.maxHp} · ${run.player.resource.displayName} ${run.player.resource.current}/${run.player.resource.max} · 连段 ${run.player.comboStep} · 攻击 ${attackValue} · 防御 ${defenseValue} · 冷却 ${cooldownValue}%</p>
        <ul>${enemies}</ul>
      </div>
      <aside class="quest-tracker quest-tracker-prominent" aria-label="任务追踪">
        <h3>任务追踪</h3>
        <p>${activeQuest}</p>
      </aside>
    </section>
  `;
}

function renderActivePanel(model: AppViewModel): string {
  switch (model.mode) {
    case "dungeon-prep":
      return "";
    case "inventory":
      return renderInventoryPanel(model.state);
    case "smith":
      return renderSmithPanel(model.state);
    case "auction":
      return renderAuctionPanel(model.state);
    case "shop":
      return renderShopPanel(model.state);
    case "quests":
      return renderQuestPanel(model.state);
    case "classes":
      return renderClassPanel(model.state);
    case "settings":
      return renderSettingsPanel(model.audio);
    case "combat":
      return model.combatRun ? renderCombatScene(model.combatRun, model.state) : renderTownScene(model);
    case "town":
    default:
      return renderQuestPanel(model.state);
  }
}

export function renderAppHtml(model: AppViewModel): string {
  const scene = model.mode === "combat" && model.combatRun
    ? renderCombatScene(model.combatRun, model.state)
    : model.mode === "dungeon-prep"
      ? renderDungeonPrep(model)
      : renderTownScene(model);
  const currencies = model.state.player.currencies;
  const audioVolumes = model.audio?.volumes ?? createAudioState().volumes;

  return `
    <main class="app-shell" aria-label="烬璃纪元" data-app-mode="${model.mode}" data-save-key="${SAVE_KEY}" data-audio-settings-key="${AUDIO_SETTINGS_KEY}" data-audio-master="${audioVolumes.master}" data-audio-music="${audioVolumes.music}" data-audio-sfx="${audioVolumes.sfx}" data-player-gold="${currencies.gold}" data-player-iron-dust="${currencies.ironDust}" data-player-arc-shard="${currencies.arcShard}" data-player-skill-points="${model.state.player.skillPoints}" data-inventory-count="${model.state.player.inventory.length}">
      ${renderNav(model.mode)}
      <section class="game-layout">
        ${scene}
        ${model.mode === "combat" ? "" : renderActivePanel(model)}
      </section>
      ${model.message ? `<div class="toast">${model.message}</div>` : ""}
    </main>
  `;
}

function selectedGearId(state: GameState, explicitGearId?: string): string {
  const gearId = explicitGearId ?? state.player.inventory[0]?.instanceId;

  if (!gearId) {
    throw new Error("没有可操作的装备");
  }

  return gearId;
}

const maxPlayerLevel = 50;
const experiencePerLevel = 100;

function applyExperience(player: GameState["player"], gainedExperience: number): GameState["player"] {
  let level = player.level;
  let experience = player.experience + Math.max(0, Math.floor(gainedExperience));

  while (experience >= experiencePerLevel && level < maxPlayerLevel) {
    experience -= experiencePerLevel;
    level += 1;
  }

  if (level >= maxPlayerLevel) {
    experience = Math.min(experience, experiencePerLevel - 1);
  }

  return {
    ...player,
    level,
    experience,
    skillPoints: player.skillPoints + Math.max(0, level - player.level)
  };
}

function applyCombatLoot(state: GameState, loot: CombatLootEvent): GameState {
  const playerWithExperience = applyExperience(state.player, loot.experience);
  let next: GameState = {
    ...state,
    player: {
      ...playerWithExperience,
      consumables: Object.entries(loot.consumables ?? {}).reduce(
        (consumables, [consumableId, amount]) => ({
          ...consumables,
          [consumableId]: (consumables[consumableId as ConsumableId] ?? 0) + amount
        }),
        playerWithExperience.consumables
      ) as Record<ConsumableId, number>,
      currencies: {
        ...playerWithExperience.currencies,
        gold: playerWithExperience.currencies.gold + loot.gold,
        ironDust: playerWithExperience.currencies.ironDust + loot.ironDust,
        arcShard: playerWithExperience.currencies.arcShard + loot.arcShard
      }
    }
  };

  if (loot.gearDropId) {
    next = addOwnedGear(next, loot.gearDropId);
    next = applyQuestEvent(next, { type: "itemLooted", itemId: loot.gearDropId });
  }

  return next;
}

function syncCombatResourceToState(state: GameState, run: CombatRun): GameState {
  return syncCurrentClassResource(state, run.player.resource.current);
}

function syncCombatConsumablesToState(state: GameState, run: CombatRun): GameState {
  const resourceState = syncCombatResourceToState(state, run);

  return {
    ...resourceState,
    player: {
      ...resourceState.player,
      consumables: { ...run.state.player.consumables }
    }
  };
}

function applyFinishedRoom(model: AppModel, finishedRun: CombatRun, roomMessage: string): AppModel {
  const latestLoot = finishedRun.lootEvents[finishedRun.lootEvents.length - 1];
  const resourceState = syncCombatResourceToState(model.state, finishedRun);
  let nextState = latestLoot ? applyCombatLoot(resourceState, latestLoot) : resourceState;

  if (finishedRun.completed) {
    nextState = applyQuestEvent(nextState, { type: "dungeonCleared", dungeonId: finishedRun.dungeonId });

    return {
      ...model,
      state: nextState,
      mode: "town",
      combatRun: undefined,
      message: "副本通关，战利品已入账",
      audio: playSfx(playBgm(model.audio, chooseMusicLayer({ mode: "town" }).trackId), "loot-drop")
    };
  }

  return {
    ...model,
    state: nextState,
    combatRun: {
      ...finishedRun,
      state: nextState
    },
    message: roomMessage,
    audio: playSfx(model.audio, "loot-drop")
  };
}

function roomTransitionCompleteMessage(previousRun: CombatRun): string {
  return previousRun.roomTransition?.gateState === "boss" ? "进入首领房间" : "进入下一房间";
}

function applyFinishedRoomIfResolved(model: AppModel, previousRun: CombatRun, combatRun: CombatRun): AppModel | undefined {
  if (combatRun.lootEvents.length <= previousRun.lootEvents.length) {
    return undefined;
  }

  return applyFinishedRoom(model, combatRun, roomTransitionCompleteMessage(previousRun));
}

function enterGateIfReady(model: AppModel, run: CombatRun): AppModel | undefined {
  if (!canEnterRoomGate(run)) {
    return undefined;
  }

  const gate = roomGateForRun(run);
  const enteredRun = enterRoomGate(run);
  const message = gate.state === "boss" ? "进入首领房间" : "进入下一房间";

  if (enteredRun.roomTransition) {
    return {
      ...model,
      combatRun: enteredRun,
      message,
      audio: playSfx(model.audio, "ui-select")
    };
  }

  return applyFinishedRoom(model, enteredRun, message);
}

export function createAppModel(options: CreateAppModelOptions = {}): AppModel {
  const townMusic = chooseMusicLayer({ mode: "town" });
  const storage = options.storage ?? defaultStorage();
  const initial = resolveInitialState(options, storage);
  const savedVolumes = storage ? parseSavedVolumes(storage.getItem(AUDIO_SETTINGS_KEY)) : undefined;

  return {
    state: initial.state,
    mode: "town",
    storage,
    rng: options.rng ?? Math.random,
    audio: playBgm(createAudioState(savedVolumes), townMusic.trackId),
    message: initial.message,
    autoSaveDisabled: initial.autoSaveDisabled
  };
}

export function reduceAppAction(model: AppModel, action: AppAction): AppModel {
  switch (action.type) {
    case "setMode":
      return {
        ...model,
        mode: action.mode,
        dungeonPrep: action.mode === "town" ? undefined : model.dungeonPrep,
        message: undefined,
        audio: action.mode === "town" ? playBgm(model.audio, chooseMusicLayer({ mode: "town" }).trackId) : model.audio
      };
    case "openDungeonPrep":
      return {
        ...model,
        mode: "dungeon-prep",
        dungeonPrep: {
          dungeonId: action.dungeonId,
          difficultyId: preferredDungeonDifficulty(model.state, action.dungeonId)
        },
        combatRun: undefined,
        message: undefined
      };
    case "selectDungeonDifficulty":
      if (model.mode !== "dungeon-prep" || !model.dungeonPrep) {
        return model;
      }

      return {
        ...model,
        dungeonPrep: { ...model.dungeonPrep, difficultyId: action.difficultyId },
        message: undefined
      };
    case "enterDungeon":
      {
        const difficultyId = action.difficultyId
          ?? (model.mode === "dungeon-prep" && model.dungeonPrep?.dungeonId === action.dungeonId
            ? model.dungeonPrep.difficultyId
            : "normal");
        const entry = canEnterDungeon(model.state, action.dungeonId, difficultyId);

        if (!entry.canEnter) {
          return {
            ...model,
            message: entry.reason === "insufficient-fatigue" || entry.reason === "invalid-fatigue"
              ? "疲劳值不足，无法进入地下城"
              : "当前无法进入该地下城"
          };
        }

        const state = consumeDungeonEntry(model.state, action.dungeonId, difficultyId);

        return {
          ...model,
          state,
          mode: "combat",
          dungeonPrep: undefined,
          combatRun: createCombatRun(state, action.dungeonId, difficultyId),
          message: undefined,
          audio: playBgm(model.audio, chooseMusicLayer({ mode: "dungeon", dungeonId: action.dungeonId, danger: 0.2 }).trackId)
        };
      }
    case "combatTick": {
      if (model.mode !== "combat" || !model.combatRun) {
        return model;
      }

      const roomCleared = model.combatRun.enemies.length === 0 || model.combatRun.enemies.every((enemy) => enemy.hp <= 0);
      const tickInput = {
        moveX: action.moveX ?? 0,
        moveY: action.moveY ?? 0,
        dash: action.dash ?? false
      };
      const hasTickMovement = tickInput.moveX !== 0 || tickInput.moveY !== 0;

      if ((roomCleared && !model.combatRun.roomTransition && !hasTickMovement) || model.combatRun.failed || model.combatRun.player.defeated) {
        return model;
      }

      const combatRun = stepCombat(model.combatRun, hasTickMovement ? tickInput : {}, combatTickMs);
      const completedTransition = applyFinishedRoomIfResolved(model, model.combatRun, combatRun);

      if (completedTransition) {
        return completedTransition;
      }

      const gateTransition = hasTickMovement ? enterGateIfReady({ ...model, combatRun }, combatRun) : undefined;

      if (gateTransition) {
        return gateTransition;
      }

      return {
        ...model,
        combatRun,
        message: combatRun.failed ? "角色倒地，请返回城镇整备" : model.message,
        audio: combatRun.failed ? playSfx(model.audio, "hit-light") : model.audio
      };
    }
    case "combatMove":
      if (!model.combatRun) {
        return model;
      }

      if (model.combatRun.failed || model.combatRun.player.defeated) {
        return {
          ...model,
          message: "角色已倒地，请返回城镇整备"
        };
      }

      {
        const combatRun = stepCombat(
          model.combatRun,
          {
            moveX: action.moveX,
            moveY: action.moveY,
            dash: action.dash
          },
          160
        );
        const completedTransition = applyFinishedRoomIfResolved(model, model.combatRun, combatRun);

        if (completedTransition) {
          return completedTransition;
        }

        const gateTransition = enterGateIfReady({ ...model, combatRun }, combatRun);

        if (gateTransition) {
          return gateTransition;
        }

        return {
          ...model,
          combatRun,
          message: combatRun.failed ? "角色倒地，请返回城镇整备" : undefined,
          audio: combatRun.failed ? playSfx(model.audio, "hit-light") : model.audio
        };
      }

    case "combatAction": {
      if (!model.combatRun) {
        return model;
      }

      if (model.combatRun.failed || model.combatRun.player.defeated) {
        return {
          ...model,
          message: "角色已倒地，请返回城镇整备",
          audio: playSfx(model.audio, "ui-select")
        };
      }

      if (action.action === "finish") {
        if (model.combatRun.enemies.some((enemy) => enemy.hp > 0)) {
          return {
            ...model,
            message: "请先击败所有怪物，再结算房间",
            audio: playSfx(model.audio, "ui-select")
          };
        }

        return applyFinishedRoom(model, finishRoom(model.combatRun), "房间结算完成");
      }

      if (model.combatRun.enemies.every((enemy) => enemy.hp <= 0)) {
        return {
          ...model,
          message: "房间已清理，请前往右侧房门",
          audio: playSfx(model.audio, "ui-select")
        };
      }

      const directInput = toCombatActionInput(action);

      if (directInput && model.combatRun.elapsedMs < model.combatRun.player.actionLockUntilMs) {
        try {
          const queuedRun = performAction(model.combatRun, directInput);
          const queued = queuedRun.player.bufferedAction !== undefined;
          const executed = queuedRun !== model.combatRun && !queued;

          return {
            ...model,
            combatRun: queuedRun,
            message: queued ? "输入已缓冲" : executed ? undefined : "动作硬直中",
            audio: playSfx(model.audio, executed ? (directInput.type === "skill" ? "skill-burst" : "hit-light") : "ui-select")
          };
        } catch (error) {
          const message = error instanceof Error && /cooldown/i.test(error.message) ? "鎶€鑳藉喎鍗翠腑" : error instanceof Error ? error.message : String(error);

          return {
            ...model,
            message,
            audio: playSfx(model.audio, "ui-select")
          };
        }
      }

      const readyRun = model.combatRun;
      let combatRun: CombatRun;

      if (readyRun.failed || readyRun.player.defeated) {
        return {
          ...model,
          combatRun: readyRun,
          message: "角色倒地，请返回城镇整备",
          audio: playSfx(model.audio, "hit-light")
        };
      }

      try {
        if (action.action === "light") {
          combatRun = performAction(readyRun, { type: "light" });
        } else if (action.action === "heavy") {
          combatRun = performAction(readyRun, { type: "heavy" });
        } else if (action.action === "jump") {
          combatRun = performAction(readyRun, { type: "jump" });
        } else if (action.action === "backstep") {
          combatRun = performAction(readyRun, { type: "backstep" });
        } else if (action.action === "skill") {
          combatRun = performAction(
            readyRun,
            action.inputMethod ? { type: "skill", skillId: action.skillId, inputMethod: action.inputMethod } : { type: "skill", skillId: action.skillId }
          );
        } else {
          return model;
        }
      } catch (error) {
        const message = error instanceof Error && /cooldown/i.test(error.message) ? "技能冷却中" : error instanceof Error ? error.message : String(error);

        return {
          ...model,
          combatRun: readyRun,
          message,
          audio: playSfx(model.audio, "ui-select")
        };
      }

      return {
        ...model,
        combatRun,
        message: undefined,
        audio: playSfx(model.audio, action.action === "skill" ? "skill-burst" : "hit-light")
      };
    }
    case "useConsumable": {
      if (!model.combatRun) {
        return model;
      }

      const combatRun = performAction(model.combatRun, { type: "consume", consumableId: action.consumableId });

      if (combatRun === model.combatRun) {
        return {
          ...model,
          message: action.consumableId === "healing-potion" ? "恢复药剂当前无法使用" : "复活令当前无法使用",
          audio: playSfx(model.audio, "ui-select")
        };
      }

      const nextState = syncCombatConsumablesToState(model.state, combatRun);

      return {
        ...model,
        state: nextState,
        combatRun: {
          ...combatRun,
          state: nextState
        },
        message: action.consumableId === "healing-potion" ? "恢复药剂已使用" : "复活令已激活",
        audio: playSfx(model.audio, "skill-burst")
      };
    }
    case "claimQuest":
      return {
        ...model,
        state: claimQuestReward(model.state, action.questId),
        message: "任务奖励已领取",
        audio: playSfx(model.audio, "quest-complete")
      };
    case "selectBaseClass": {
      const nextState = applyBaseClass(model.state, action.classId);
      const classDef = catalog.classes.find((item) => item.id === nextState.player.classId);

      return {
        ...model,
        state: nextState,
        mode: "classes",
        message: `职业已切换：${classDef?.displayName ?? action.classId}`,
        audio: playSfx(model.audio, "ui-select")
      };
    }
    case "advanceClass": {
      const nextState = applyClassAdvancement(model.state, action.advancementId);
      const advancement = catalog.classes.flatMap((item) => item.advancements).find((item) => item.id === action.advancementId);

      return {
        ...model,
        state: nextState,
        mode: "classes",
        message: `转职完成：${advancement?.displayName ?? action.advancementId}`,
        audio: playSfx(model.audio, "quest-complete")
      };
    }
    case "upgradeSkill":
      return {
        ...model,
        state: upgradeSkill(model.state, action.skillId),
        mode: "classes",
        message: "技能已升级",
        audio: playSfx(model.audio, "ui-select")
      };
    case "resetSkillTree":
      return {
        ...model,
        state: resetSkillTree(model.state),
        mode: "classes",
        message: "技能树已重置",
        audio: playSfx(model.audio, "ui-select")
      };
    case "equipItem":
      return {
        ...model,
        state: equipItem(model.state, action.gearId),
        mode: "inventory",
        message: "装备已穿戴",
        audio: playSfx(model.audio, "ui-equip")
      };
    case "saveLoadout":
      return {
        ...model,
        state: saveLoadout(model.state, action.index),
        mode: "inventory",
        message: `配装 ${action.index + 1} 已保存`,
        audio: playSfx(model.audio, "ui-equip")
      };
    case "applyLoadout":
      return {
        ...model,
        state: applyLoadout(model.state, action.index),
        mode: "inventory",
        message: `已应用配装 ${action.index + 1}`,
        audio: playSfx(model.audio, "ui-equip")
      };
    case "sellItem":
      return {
        ...model,
        state: sellItem(model.state, action.gearId),
        mode: "inventory",
        message: "装备已出售",
        audio: playSfx(model.audio, "coin-gain")
      };
    case "dismantleItem":
      return {
        ...model,
        state: dismantleItem(model.state, action.gearId),
        mode: "inventory",
        message: "装备已分解",
        audio: playSfx(model.audio, "dismantle")
      };
    case "toggleItemLock": {
      const owned = model.state.player.inventory.find((item) => item.instanceId === action.gearId);
      const nextState = setItemLock(model.state, action.gearId, !owned?.locked);
      const locked = nextState.player.inventory.find((item) => item.instanceId === action.gearId)?.locked;

      return {
        ...model,
        state: nextState,
        mode: "inventory",
        message: locked ? "装备已锁定" : "装备已解锁",
        audio: playSfx(model.audio, "ui-lock")
      };
    }
    case "reinforce": {
      const gearId = selectedGearId(model.state, action.gearId);
      const result = reinforce(model.state, gearId, model.rng);
      const nextState = applyQuestEvent(result.state, { type: "reinforced", itemId: gearId });

      return {
        ...model,
        state: nextState,
        message: `强化 ${result.success ? "成功" : "失败"}：+${result.levelAfter}`,
        audio: playSfx(model.audio, result.success ? "reinforce-success" : "reinforce-fail")
      };
    }
    case "amplify": {
      const gearId = selectedGearId(model.state, action.gearId);
      const result = amplify(model.state, gearId, model.rng);
      const nextState = applyQuestEvent(result.state, { type: "amplified", itemId: gearId });

      return {
        ...model,
        state: nextState,
        message: `增幅 ${result.success ? "成功" : "失败"}：+${result.levelAfter}`,
        audio: playSfx(model.audio, result.success ? "amplify-success" : "amplify-fail")
      };
    }
    case "buyShopItem":
      return {
        ...model,
        state: applyQuestEvent(buyShopItem(model.state, action.sku), { type: "shopPurchased", sku: action.sku }),
        message: "礼包已购买",
        audio: playSfx(model.audio, "shop-purchase")
      };
    case "openBox": {
      const result = openRandomBox(model.state, action.boxId, model.rng);

      return {
        ...model,
        state: result.state,
        message: `开启箱子：${result.award.rarity}`,
        audio: playSfx(model.audio, "box-open")
      };
    }
    case "acceptTrade":
      return {
        ...model,
        state: applyQuestEvent(acceptTrade(model.state, action.offerId), { type: "tradeCompleted", offerId: action.offerId }),
        message: "交易完成",
        audio: playSfx(model.audio, "trade-complete")
      };
    case "listAuction":
      return {
        ...model,
        state: listAuction(model.state, selectedGearId(model.state, action.gearId), action.price),
        message: "拍卖已寄售",
        audio: playSfx(model.audio, "auction-list")
      };
    case "resolveAuctions": {
      const nextState = resolveAuctions(model.state, model.rng);
      const sold = nextState.player.currencies.gold > model.state.player.currencies.gold;

      return {
        ...model,
        state: sold ? applyQuestEvent(nextState, { type: "auctionSold" }) : nextState,
        message: "拍卖结算完成",
        audio: playSfx(model.audio, "auction-sold")
      };
    }
    case "setVolume":
      {
        const audio = setVolume(model.audio, action.kind, action.value);
        model.storage?.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(audio.volumes));

      return {
        ...model,
        audio,
        message: "音量已调整"
      };
      }
    case "save":
      if (!model.storage) {
        throw new Error("未配置存档空间");
      }

      saveGame(model.storage, model.state);

      return { ...model, autoSaveDisabled: false, message: "保存完成", audio: playSfx(model.audio, "ui-save") };
    case "load":
      if (!model.storage) {
        throw new Error("未配置存档空间");
      }

      return {
        ...model,
        autoSaveDisabled: false,
        state: loadGame(model.storage) ?? model.state,
        message: "读取存档完成",
        audio: playSfx(model.audio, "ui-load")
      };
    case "resetSave":
      if (!model.storage) {
        throw new Error("未配置存档空间");
      }

      if (!action.confirmed) {
        return { ...model, message: "已取消重置存档", audio: playSfx(model.audio, "ui-cancel") };
      }

      model.storage.removeItem(SAVE_KEY);

      return {
        ...model,
        autoSaveDisabled: false,
        state: createInitialState(),
        mode: "town",
        combatRun: undefined,
        message: "存档已重置",
        audio: playSfx(playBgm(model.audio, chooseMusicLayer({ mode: "town" }).trackId), "ui-reset")
      };
    default:
      return model;
  }
}

function shouldAutoSave(model: AppModel, action: AppAction, previousState: GameState, nextState: GameState): boolean {
  return !model.autoSaveDisabled && action.type !== "load" && action.type !== "resetSave" && previousState !== nextState;
}

export function mountApp(root: HTMLDivElement): () => void {
  let model = createAppModel();
  const audioProcessor = createAudioCommandProcessor(createBrowserAudioSink());
  const heldCombatKeys = new Set<string>();

  function render(): void {
    root.innerHTML = renderAppHtml(model);
  }

  function dispatch(action: AppAction): void {
    const previousState = model.state;

    try {
      model = reduceAppAction(model, action);

      if (model.storage && shouldAutoSave(model, action, previousState, model.state)) {
        saveGame(model.storage, model.state);
      }
    } catch (error) {
      model = { ...model, message: error instanceof Error ? error.message : String(error) };
    }

    model = { ...model, audio: audioProcessor.sync(model.audio) };
  }

  function heldCombatTickAction(): Extract<AppAction, { type: "combatTick" }> {
    const moveX = (heldCombatKeys.has("ArrowRight") ? 1 : 0) + (heldCombatKeys.has("ArrowLeft") ? -1 : 0);
    const moveY = (heldCombatKeys.has("ArrowDown") ? 1 : 0) + (heldCombatKeys.has("ArrowUp") ? -1 : 0);
    const dash = heldCombatKeys.has("ShiftLeft") || heldCombatKeys.has("ShiftRight");

    return {
      type: "combatTick",
      moveX: Math.max(-1, Math.min(1, moveX)),
      moveY: Math.max(-1, Math.min(1, moveY)),
      dash
    };
  }

  const combatTickTimer = globalThis.setInterval?.(() => {
    if (model.mode !== "combat" || !model.combatRun) {
      return;
    }

    dispatch(heldCombatTickAction());
    render();
  }, combatTickMs);

  function clearCombatTick(): void {
    if (combatTickTimer !== undefined) {
      globalThis.clearInterval?.(combatTickTimer);
    }
  }

  if ("addEventListener" in root) {
    root.addEventListener("input", (event) => {
      const target = event.target as HTMLInputElement;
      const volumeKind = target.dataset.volumeKind as keyof AudioState["volumes"] | undefined;

      if (volumeKind) {
        dispatch({ type: "setVolume", kind: volumeKind, value: Number(target.value) / 100 });
        render();
      }
    });

    root.addEventListener("click", (event) => {
      const rawTarget = event.target as HTMLElement;
      const target = rawTarget.closest?.("button") as HTMLElement | null;

      if (!target) {
        return;
      }

      const mode = target.dataset.mode as AppMode | undefined;
      const dungeonId = target.dataset.enterDungeon as DungeonId | undefined;
      const prepareDungeonId = target.dataset.prepareDungeon as DungeonId | undefined;
      const difficultyId = target.dataset.dungeonDifficulty as DungeonDifficultyId | undefined;
      const combatAction = target.dataset.combatAction as "light" | "heavy" | "jump" | "backstep" | "skill" | "finish" | undefined;
      const combatSkillId = target.dataset.combatSkillId;
      const appAction = target.dataset.appAction;
      const gearId = target.dataset.gearId;
      const sku = target.dataset.shopSku;
      const consumableId = target.dataset.consumableId as ConsumableId | undefined;
      const boxId = target.dataset.boxId;
      const questId = target.dataset.questId;
      const tradeOfferId = target.dataset.tradeOfferId;
      const auctionGearId = target.dataset.auctionGearId;
      const auctionPrice = Number(target.dataset.auctionPrice);
      const classId = target.dataset.classId as ClassId | undefined;
      const advancementId = target.dataset.advancementId as AdvancementId | undefined;
      const skillUpgradeId = target.dataset.skillUpgradeId;
      const loadoutIndex = Number(target.dataset.loadoutIndex);

      if (mode) {
        dispatch({ type: "setMode", mode });
      }

      if (dungeonId) {
        dispatch({ type: "enterDungeon", dungeonId });
      }

      if (prepareDungeonId) {
        dispatch({ type: "openDungeonPrep", dungeonId: prepareDungeonId });
      }

      if (difficultyId) {
        dispatch({ type: "selectDungeonDifficulty", difficultyId });
      }

      if (target.dataset.dungeonStart && model.dungeonPrep) {
        dispatch({ type: "enterDungeon", dungeonId: model.dungeonPrep.dungeonId });
      }

      if (target.dataset.dungeonPrepBack) {
        dispatch({ type: "setMode", mode: "town" });
      }

      if (combatAction) {
        if (combatAction === "skill") {
          if (combatSkillId) {
            dispatch({ type: "combatAction", action: combatAction, skillId: combatSkillId });
          }
        } else {
          dispatch({ type: "combatAction", action: combatAction });
        }
      }

      if (consumableId) {
        dispatch({ type: "useConsumable", consumableId });
      }

      if (appAction === "reinforce") {
        dispatch({ type: "reinforce", gearId });
      }

      if (appAction === "amplify") {
        dispatch({ type: "amplify", gearId });
      }

      if (gearId && appAction === "equip-item") {
        dispatch({ type: "equipItem", gearId });
      }

      if (appAction === "save-loadout" && Number.isInteger(loadoutIndex)) {
        dispatch({ type: "saveLoadout", index: loadoutIndex });
      }

      if (appAction === "apply-loadout" && Number.isInteger(loadoutIndex)) {
        dispatch({ type: "applyLoadout", index: loadoutIndex });
      }

      if (gearId && appAction === "sell-item") {
        dispatch({ type: "sellItem", gearId });
      }

      if (gearId && appAction === "dismantle-item") {
        dispatch({ type: "dismantleItem", gearId });
      }

      if (gearId && appAction === "toggle-lock") {
        dispatch({ type: "toggleItemLock", gearId });
      }

      if (sku) {
        dispatch({ type: "buyShopItem", sku });
      }

      if (boxId) {
        dispatch({ type: "openBox", boxId });
      }

      if (questId) {
        dispatch({ type: "claimQuest", questId });
      }

      if (classId) {
        dispatch({ type: "selectBaseClass", classId });
      }

      if (advancementId) {
        dispatch({ type: "advanceClass", advancementId });
      }

      if (skillUpgradeId) {
        dispatch({ type: "upgradeSkill", skillId: skillUpgradeId });
      }

      if (appAction === "reset-skill-tree") {
        dispatch({ type: "resetSkillTree" });
      }

      if (tradeOfferId) {
        dispatch({ type: "acceptTrade", offerId: tradeOfferId });
      }

      if (auctionGearId) {
        dispatch({
          type: "listAuction",
          gearId: auctionGearId,
          price: Number.isFinite(auctionPrice) && auctionPrice > 0 ? auctionPrice : 500
        });
      }

      if (appAction === "resolve-auctions") {
        dispatch({ type: "resolveAuctions" });
      }

      if (appAction === "save" || appAction === "load") {
        dispatch({ type: appAction });
      }

      if (appAction === "reset-save") {
        const confirmed =
          typeof globalThis.confirm === "function" ? globalThis.confirm("确认重置本地存档？此操作不可撤销。") : false;
        dispatch({ type: "resetSave", confirmed });
      }

      render();
    });

    const commandDirectionCodes = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);
    const heldMovementCodes = new Set([...commandDirectionCodes, "ShiftLeft", "ShiftRight"]);
    const commandTerminalCodes = new Set(["KeyZ", "Space"]);
    const commandBufferTtlMs = 700;
    const commandBufferMaxTokens = 5;
    let commandBuffer: Array<{ code: string; atMs: number }> = [];
    const commandNow = (): number => globalThis.performance?.now?.() ?? Date.now();
    const pruneCommandBuffer = (atMs: number): void => {
      commandBuffer = commandBuffer.filter((item) => atMs - item.atMs <= commandBufferTtlMs).slice(-commandBufferMaxTokens);
    };
    const pushCommandCode = (code: string, atMs: number): void => {
      pruneCommandBuffer(atMs);

      if (commandDirectionCodes.has(code) && commandBuffer.at(-1)?.code === code) {
        return;
      }

      commandBuffer = [...commandBuffer, { code, atMs }].slice(-commandBufferMaxTokens);
    };
    const commandCodes = (): string[] => commandBuffer.map((item) => item.code);

    const keydownHandler = (event: KeyboardEvent) => {
      if (model.mode !== "combat") {
        commandBuffer = [];
        heldCombatKeys.clear();

        if (model.mode === "dungeon-prep" && model.dungeonPrep) {
          if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
            event.preventDefault();
            const currentIndex = DUNGEON_DIFFICULTY_ORDER.indexOf(model.dungeonPrep.difficultyId);
            const direction = event.code === "ArrowRight" ? 1 : -1;
            const nextIndex = (currentIndex + direction + DUNGEON_DIFFICULTY_ORDER.length) % DUNGEON_DIFFICULTY_ORDER.length;
            dispatch({ type: "selectDungeonDifficulty", difficultyId: DUNGEON_DIFFICULTY_ORDER[nextIndex] });
            render();
            return;
          }

          if (event.code === "Enter") {
            const interactiveSelector = "button, input, select, textarea, a, [contenteditable='true'], [role='button']";
            const eventTarget = event.target as { closest?: (selector: string) => unknown } | null;
            const interactiveTarget = eventTarget?.closest?.(interactiveSelector)
              ?? globalThis.document?.activeElement?.closest?.(interactiveSelector);
            if (interactiveTarget) {
              return;
            }

            event.preventDefault();
            if (canEnterDungeon(model.state, model.dungeonPrep.dungeonId, model.dungeonPrep.difficultyId).canEnter) {
              dispatch({ type: "enterDungeon", dungeonId: model.dungeonPrep.dungeonId });
              render();
            }
            return;
          }

          if (event.code === "Escape") {
            event.preventDefault();
            dispatch({ type: "setMode", mode: "town" });
            render();
            return;
          }
        }

        if (event.code === "Enter" || event.code === "Space") {
          const activeElement = (event.target instanceof HTMLElement ? event.target : globalThis.document?.activeElement) as
            | HTMLElement
            | undefined;
          const dungeonButton = activeElement?.closest?.("[data-prepare-dungeon]") as HTMLElement | null | undefined;
          const dungeonId = dungeonButton?.dataset.prepareDungeon as DungeonId | undefined;

          if (dungeonId) {
            event.preventDefault();
            dispatch({ type: "openDungeonPrep", dungeonId });
            render();
          }
        }

        return;
      }

      if (heldMovementCodes.has(event.code)) {
        heldCombatKeys.add(event.code);
      }

      const isRepeat = event.repeat;
      const atMs = commandNow();
      pruneCommandBuffer(atMs);

      if (commandDirectionCodes.has(event.code) && !isRepeat) {
        pushCommandCode(event.code, atMs);
      }

      if (commandTerminalCodes.has(event.code) && !isRepeat) {
        pushCommandCode(event.code, atMs);
        const codes = commandCodes();
        const commandMatch = combatCommandSkillForSequence(model.state, codes);

        if (commandMatch) {
          const commandAction = combatActionForCommandSequence(model.state, codes, model.combatRun?.player.resource.current, model.combatRun, true);

          event.preventDefault();
          commandBuffer = [];

          if (commandAction) {
            dispatch(commandAction);
          }

          render();
          return;
        }

        commandBuffer = [];
      } else if (!isRepeat && !commandDirectionCodes.has(event.code) && event.code !== "ShiftLeft" && event.code !== "ShiftRight") {
        commandBuffer = [];
      }

      const action = combatActionForKeyCode(
        model.state,
        event.code,
        model.combatRun?.player.resource.current,
        event.shiftKey,
        model.combatRun,
        true
      );

      if (!action) {
        return;
      }

      event.preventDefault();
      dispatch(action);
      render();
    };
    const keyupHandler = (event: KeyboardEvent) => {
      if (heldMovementCodes.has(event.code)) {
        heldCombatKeys.delete(event.code);
      }
    };
    const clearHeldCombatKeys = () => {
      heldCombatKeys.clear();
    };

    globalThis.addEventListener?.("keydown", keydownHandler);
    globalThis.addEventListener?.("keyup", keyupHandler);
    globalThis.addEventListener?.("blur", clearHeldCombatKeys);

    render();

    return () => {
      globalThis.removeEventListener?.("keydown", keydownHandler);
      globalThis.removeEventListener?.("keyup", keyupHandler);
      globalThis.removeEventListener?.("blur", clearHeldCombatKeys);
      heldCombatKeys.clear();
      clearCombatTick();
    };
  }

  render();

  return clearCombatTick;
}
