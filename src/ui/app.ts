import { catalog } from "../data/catalog";
import {
  applyHit,
  createCombatRun,
  finishRoom,
  performAction,
  stepCombat,
  type CombatLootEvent,
  type CombatRun
} from "../game/combat";
import { addOwnedGear, createInitialState } from "../game/state";
import type { DungeonId, GameState } from "../game/types";
import { createRenderPlan } from "../game/render";
import {
  chooseMusicLayer,
  createAudioCommandProcessor,
  createAudioState,
  playBgm,
  playSfx,
  setVolume,
  type AudioState
} from "../systems/audio";
import { createBrowserAudioSink } from "../systems/audio-browser";
import { advanceClass as applyClassAdvancement, selectBaseClass as applyBaseClass } from "../systems/classes";
import { dismantleItem, equipItem, sellItem, setItemLock } from "../systems/inventory";
import { acceptTrade, listAuction, resolveAuctions } from "../systems/market";
import { applyQuestEvent, claimQuestReward, getActiveQuestText } from "../systems/quests";
import { loadGame, saveGame, SAVE_KEY, type SaveStorage } from "../systems/save";
import { buyShopItem, openRandomBox } from "../systems/shop";
import { amplify, reinforce } from "../systems/upgrades";
import {
  renderAuctionPanel,
  renderClassPanel,
  renderInventoryPanel,
  renderQuestPanel,
  renderSettingsPanel,
  renderShopPanel,
  renderSmithPanel
} from "./panels";
import type { AdvancementId, ClassId } from "../game/types";

export type AppMode = "town" | "combat" | "inventory" | "smith" | "auction" | "shop" | "quests" | "classes" | "settings";

export interface AppViewModel {
  state: GameState;
  mode: AppMode;
  combatRun?: CombatRun;
  message?: string;
  audio?: AudioState;
}

export interface AppModel extends AppViewModel {
  storage?: SaveStorage;
  rng: () => number;
  audio: AudioState;
}

export type AppAction =
  | { type: "setMode"; mode: AppMode }
  | { type: "enterDungeon"; dungeonId: DungeonId }
  | { type: "combatAction"; action: "light" | "heavy" | "skill" | "finish" }
  | { type: "claimQuest"; questId: string }
  | { type: "selectBaseClass"; classId: ClassId }
  | { type: "advanceClass"; advancementId: AdvancementId }
  | { type: "equipItem"; gearId: string }
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

function renderTownScene(model: AppViewModel): string {
  const state = model.state;
  const classDef = catalog.classes.find((item) => item.id === state.player.classId);
  const cinderUnlocked = state.player.unlockedDungeons.includes("cinder-kiln-alley");
  const liuliUnlocked = state.player.unlockedDungeons.includes("liuli-furnace");

  return `
    <section class="town-scene" aria-label="炉山市集">
      <div class="scene-backdrop">
        <div class="moon-gate"></div>
        <div class="forge-glow"></div>
        <div class="market-roof"></div>
        <div class="stone-lane"></div>
      </div>
      <div class="hero-portrait" aria-label="${classDef?.displayName ?? state.player.classId}">
        <div class="hero-face"></div>
        <div class="hero-coat"></div>
        <div class="hero-gauntlet"></div>
      </div>
      <div class="town-hud">
        <h1>烬璃纪元</h1>
        <p>炉山市集 · ${classDef?.displayName ?? "烬拳卫"} · 等级 ${state.player.level}</p>
        <div class="dungeon-row">
          <button data-enter-dungeon="cinder-kiln-alley" ${cinderUnlocked ? "" : "disabled"}>灰窑巷</button>
          <button data-enter-dungeon="liuli-furnace" ${liuliUnlocked ? "" : "disabled"}>琉璃熔炉</button>
        </div>
      </div>
    </section>
  `;
}

function renderCombatScene(run: CombatRun, state: GameState): string {
  const plan = createRenderPlan(run, run.dungeonId);
  const enemies = run.enemies
    .map((enemy) => `<li>${enemy.displayName} HP ${enemy.hp}/${enemy.maxHp} · 护甲 ${enemy.armor}</li>`)
    .join("");
  const sparks = plan.commands.filter((command) => command.kind === "hit-spark").length;
  const activeQuest = getActiveQuestText(state);

  return `
    <section class="combat-scene" aria-label="战斗">
      <div class="combat-backdrop scene-${run.dungeonId}">
        <div class="render-layer-count">${plan.palette.displayName} · ${plan.palette.layers.length}层 · 火花 ${sparks}</div>
      </div>
      <div class="combat-actions">
        <button data-combat-action="light">轻击</button>
        <button data-combat-action="heavy">重击</button>
        <button data-combat-action="skill">技能</button>
        <button data-combat-action="finish">结算房间</button>
        <button data-mode="town">返回</button>
      </div>
      <div class="combat-status">
        <p>房间 ${run.roomIndex + 1} · 热能 ${run.player.heat} · 连段 ${run.player.comboStep}</p>
        <ul>${enemies}</ul>
      </div>
      <aside class="quest-tracker" aria-label="任务追踪">
        <h3>任务追踪</h3>
        <p>${activeQuest}</p>
      </aside>
    </section>
  `;
}

function renderActivePanel(model: AppViewModel): string {
  switch (model.mode) {
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
  const scene = model.mode === "combat" && model.combatRun ? renderCombatScene(model.combatRun, model.state) : renderTownScene(model);

  return `
    <main class="app-shell" aria-label="烬璃纪元">
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

function defeatAll(run: CombatRun): CombatRun {
  return run.enemies.reduce(
    (next, enemy) =>
      applyHit(next, {
        id: `ui-finish-${enemy.id}`,
        targetId: enemy.id,
        damage: 9999,
        hitstopMs: 70,
        knockback: 10,
        juggle: false
      }),
    run
  );
}

function applyCombatLoot(state: GameState, loot: CombatLootEvent): GameState {
  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      currencies: {
        ...state.player.currencies,
        gold: state.player.currencies.gold + loot.gold,
        ironDust: state.player.currencies.ironDust + loot.ironDust,
        arcShard: state.player.currencies.arcShard + loot.arcShard
      }
    }
  };

  if (loot.gearDropId) {
    next = addOwnedGear(next, loot.gearDropId);
  }

  return next;
}

export function createAppModel(options: CreateAppModelOptions = {}): AppModel {
  const townMusic = chooseMusicLayer({ mode: "town" });

  return {
    state: options.initialState ?? createInitialState(),
    mode: "town",
    storage: options.storage ?? defaultStorage(),
    rng: options.rng ?? Math.random,
    audio: playBgm(createAudioState(), townMusic.trackId)
  };
}

export function reduceAppAction(model: AppModel, action: AppAction): AppModel {
  switch (action.type) {
    case "setMode":
      return {
        ...model,
        mode: action.mode,
        message: undefined,
        audio: action.mode === "town" ? playBgm(model.audio, chooseMusicLayer({ mode: "town" }).trackId) : model.audio
      };
    case "enterDungeon":
      return {
        ...model,
        mode: "combat",
        combatRun: createCombatRun(model.state, action.dungeonId),
        message: undefined,
        audio: playBgm(model.audio, chooseMusicLayer({ mode: "dungeon", dungeonId: action.dungeonId, danger: 0.2 }).trackId)
      };
    case "combatAction": {
      if (!model.combatRun) {
        return model;
      }

      if (action.action === "finish") {
        const finishedRun = finishRoom(defeatAll(model.combatRun));
        const latestLoot = finishedRun.lootEvents[finishedRun.lootEvents.length - 1];
        let nextState = latestLoot ? applyCombatLoot(model.state, latestLoot) : model.state;

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
          message: "房间结算完成",
          audio: playSfx(model.audio, "loot-drop")
        };
      }

      const readyRun = stepCombat(model.combatRun, {}, 220);
      const combatRun =
        action.action === "light"
          ? performAction(readyRun, { type: "light" })
          : action.action === "heavy"
            ? performAction(readyRun, { type: "heavy" })
            : performAction(readyRun, { type: "skill", skillId: "spark-combo" });

      return {
        ...model,
        combatRun,
        message: undefined,
        audio: playSfx(model.audio, action.action === "skill" ? "skill-burst" : "hit-light")
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
    case "equipItem":
      return {
        ...model,
        state: equipItem(model.state, action.gearId),
        mode: "inventory",
        message: "装备已穿戴",
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
        state: acceptTrade(model.state, action.offerId),
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
      return {
        ...model,
        audio: setVolume(model.audio, action.kind, action.value),
        message: "音量已调整"
      };
    case "save":
      if (!model.storage) {
        throw new Error("未配置存档空间");
      }

      saveGame(model.storage, model.state);

      return { ...model, message: "保存完成", audio: playSfx(model.audio, "ui-save") };
    case "load":
      if (!model.storage) {
        throw new Error("未配置存档空间");
      }

      return {
        ...model,
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

export function mountApp(root: HTMLDivElement): void {
  let model = createAppModel();
  const audioProcessor = createAudioCommandProcessor(createBrowserAudioSink());

  function render(): void {
    root.innerHTML = renderAppHtml(model);
  }

  function dispatch(action: AppAction): void {
    try {
      model = reduceAppAction(model, action);
    } catch (error) {
      model = { ...model, message: error instanceof Error ? error.message : String(error) };
    }

    model = { ...model, audio: audioProcessor.sync(model.audio) };
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
      const target = event.target as HTMLElement;
      const mode = target.dataset.mode as AppMode | undefined;
      const dungeonId = target.dataset.enterDungeon as DungeonId | undefined;
      const combatAction = target.dataset.combatAction as "light" | "heavy" | "skill" | "finish" | undefined;
      const appAction = target.dataset.appAction;
      const gearId = target.dataset.gearId;
      const sku = target.dataset.shopSku;
      const boxId = target.dataset.boxId;
      const questId = target.dataset.questId;
      const tradeOfferId = target.dataset.tradeOfferId;
      const auctionGearId = target.dataset.auctionGearId;
      const auctionPrice = Number(target.dataset.auctionPrice);
      const classId = target.dataset.classId as ClassId | undefined;
      const advancementId = target.dataset.advancementId as AdvancementId | undefined;

      if (mode) {
        dispatch({ type: "setMode", mode });
      }

      if (dungeonId) {
        dispatch({ type: "enterDungeon", dungeonId });
      }

      if (combatAction) {
        dispatch({ type: "combatAction", action: combatAction });
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
  }

  render();
}
