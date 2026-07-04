import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/state";
import type { GameState } from "../game/types";
import { saveGame, SAVE_KEY, type SaveStorage } from "../systems/save";
import { combatActionForKeyCode, createAppModel, mountApp, reduceAppAction, renderAppHtml } from "../ui/app";

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

function withQuestReady(state: GameState, questId: string): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      quests: {
        ...state.player.quests,
        [questId]: "ready"
      }
    }
  };
}

function withCurrency(state: GameState, patch: Partial<GameState["player"]["currencies"]>): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      currencies: {
        ...state.player.currencies,
        ...patch
      }
    }
  };
}

function withHeat(state: GameState, heat: number): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      heat
    }
  };
}

function readyForAdvancement(state: GameState): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      level: 15,
      quests: {
        ...state.player.quests,
        "prologue-ember-warden": "completed"
      }
    }
  };
}

function defeatCurrentRoom(model: ReturnType<typeof createAppModel>): ReturnType<typeof createAppModel> {
  let next = model;

  for (let attempt = 0; attempt < 40 && next.combatRun?.enemies.some((enemy) => enemy.hp > 0); attempt += 1) {
    next = reduceAppAction(next, { type: "combatAction", action: "heavy" });
  }

  expect(next.combatRun?.enemies.some((enemy) => enemy.hp > 0)).toBe(false);

  return next;
}

function settleClearedRoom(model: ReturnType<typeof createAppModel>): ReturnType<typeof createAppModel> {
  return reduceAppAction(defeatCurrentRoom(model), { type: "combatAction", action: "finish" });
}

describe("playable app integration actions", () => {
  it("reinforces selected gear through the app reducer", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({ storage, rng: () => 0 });
    const gearId = model.state.player.inventory[0].instanceId;
    const reinforced = reduceAppAction(model, { type: "reinforce", gearId });
    const updated = reinforced.state.player.inventory.find((item) => item.instanceId === gearId);

    expect(updated?.reinforceLevel).toBe(1);
    expect(reinforced.message).toContain("强化");
    expect(reinforced.state.player.currencies.gold).toBeLessThan(model.state.player.currencies.gold);
    expect(reinforced.audio.commandQueue.at(-1)).toEqual({ type: "sfx", id: "reinforce-success" });
  });

  it("updates the active reinforcement quest through the app reducer", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      rng: () => 0,
      initialState: withQuestReady(createInitialState(), "prologue-ember-warden")
    });
    const gearId = model.state.player.inventory[0].instanceId;

    model = reduceAppAction(model, { type: "claimQuest", questId: "prologue-ember-warden" });
    model = reduceAppAction(model, { type: "reinforce", gearId });

    expect(model.state.player.quests["smith-first-spark"]).toBe("ready");
  });

  it("claims a ready quest and unlocks the next dungeon and quests", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({
      storage,
      initialState: withQuestReady(createInitialState(), "prologue-ember-warden")
    });
    const claimed = reduceAppAction(model, { type: "claimQuest", questId: "prologue-ember-warden" });

    expect(claimed.state.player.quests["prologue-ember-warden"]).toBe("completed");
    expect(claimed.state.player.quests["smith-first-spark"]).toBe("active");
    expect(claimed.state.player.unlockedDungeons).toContain("liuli-furnace");
  });

  it("selects a base class and applies advancement through app actions", () => {
    const storage = new MemoryStorage();
    let model = createAppModel({ storage });

    model = reduceAppAction(model, { type: "selectBaseClass", classId: "liuli-blademage" });
    expect(model.state.player.classId).toBe("liuli-blademage");
    expect(model.state.player.heroId).toBe("liuli-blademage");
    expect(model.message).toContain("职业");

    model = {
      ...model,
      state: readyForAdvancement(model.state)
    };
    model = reduceAppAction(model, { type: "advanceClass", advancementId: "flowing-light-swordmaster" });

    expect(model.state.player.advancementId).toBe("flowing-light-swordmaster");
    expect(model.message).toContain("转职");

    const saved = reduceAppAction(model, { type: "save" });
    const loaded = reduceAppAction({ ...saved, state: createInitialState(), message: undefined }, { type: "load" });

    expect(loaded.state.player.classId).toBe("liuli-blademage");
    expect(loaded.state.player.advancementId).toBe("flowing-light-swordmaster");
  });

  it("grants room loot and marks the dungeon-clear quest ready after a full clear", () => {
    let model = createAppModel({ storage: new MemoryStorage() });
    const goldBefore = model.state.player.currencies.gold;
    const ironDustBefore = model.state.player.currencies.ironDust;

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    expect(model.audio.currentBgm).toBe("dungeon-cinder-kiln");
    model = settleClearedRoom(model);
    model = settleClearedRoom(model);
    model = settleClearedRoom(model);

    expect(model.mode).toBe("town");
    expect(model.combatRun).toBeUndefined();
    expect(model.state.player.currencies.gold).toBeGreaterThan(goldBefore);
    expect(model.state.player.currencies.ironDust).toBeGreaterThan(ironDustBefore);
    expect(model.state.player.inventory.length).toBeGreaterThan(createInitialState().player.inventory.length);
    expect(model.state.player.quests["prologue-ember-warden"]).toBe("ready");
    expect(model.message).toContain("通关");
    expect(model.audio.currentBgm).toBe("town-forge-market");
    expect(model.audio.commandQueue).toEqual(expect.arrayContaining([{ type: "sfx", id: "loot-drop" }]));
  });

  it("requires defeating all monsters before room settlement", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    const refused = reduceAppAction(model, { type: "combatAction", action: "finish" });

    expect(refused.mode).toBe("combat");
    expect(refused.combatRun?.enemies.some((enemy) => enemy.hp > 0)).toBe(true);
    expect(refused.message).toContain("击败所有怪物");
  });

  it("maps PC movement keys to combat movement actions", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    const beforeX = model.combatRun?.player.x ?? 0;
    const action = combatActionForKeyCode(model.state, "ArrowRight", model.combatRun?.player.heat);

    expect(action).toEqual({ type: "combatMove", moveX: 1, moveY: 0, dash: false });

    if (!action) {
      throw new Error("Expected ArrowRight to map to movement");
    }

    const moved = reduceAppAction(model, action);

    expect(moved.combatRun?.player.x).toBeGreaterThan(beforeX);
    expect(renderAppHtml(moved)).toContain('data-player-facing="1"');
  });

  it("renders the active objective tracker while inside a dungeon", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    const html = renderAppHtml(model);
    expect(html).toContain("任务追踪");
    expect(html).toContain("清理灰窑巷");
  });

  it("prompts settlement instead of attacking an already cleared combat room", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = {
      ...model,
      combatRun: model.combatRun
        ? {
            ...model.combatRun,
            enemies: model.combatRun.enemies.map((enemy) => ({
              ...enemy,
              hp: 0,
              downed: true
            }))
          }
        : undefined
    };

    const next = reduceAppAction(model, { type: "combatAction", action: "light" });

    expect(next.message).toContain("结算房间");
    expect(next.combatRun).toEqual(model.combatRun);
  });

  it("renders player attack motion and monster hit reaction after striking", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });

    const idleHtml = renderAppHtml(model);
    expect(idleHtml).toContain('data-player-motion="idle"');
    expect(idleHtml).toContain('data-enemy-motion="idle"');

    model = reduceAppAction(model, { type: "combatAction", action: "light" });

    const hitHtml = renderAppHtml(model);
    const targetId = model.combatRun?.events.find((event) => event.kind === "hit")?.targetId;

    expect(targetId).toBeTruthy();
    expect(hitHtml).toContain('data-player-motion="light"');
    expect(hitHtml).toContain('class="combat-player-art actor-model actor-model-light"');
    expect(hitHtml).toContain(`data-last-hit-target="${targetId}"`);
    expect(hitHtml).toContain('data-hit-recent="true"');
    expect(hitHtml).toContain('data-enemy-motion="hit"');
    expect(hitHtml).toContain('class="enemy-art actor-model actor-model-hit"');

    model = reduceAppAction(model, { type: "combatMove", moveX: 1, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 1, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 1, moveY: 0, dash: false });
    model = reduceAppAction(model, { type: "combatMove", moveX: 1, moveY: 0, dash: false });

    const recoveredHtml = renderAppHtml(model);
    expect(recoveredHtml).toContain('data-player-motion="idle"');
    expect(recoveredHtml).toContain('data-enemy-motion="idle"');
    expect(recoveredHtml).toContain('class="combat-player-art actor-model actor-model-idle"');
    expect(recoveredHtml).not.toContain('class="hit-impact');
  });

  it("does not carry old hit VFX into the next combat room", () => {
    let model = createAppModel({ storage: new MemoryStorage() });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = defeatCurrentRoom(model);

    const clearedHtml = renderAppHtml(model);
    expect(clearedHtml).toContain('data-player-motion="heavy"');

    model = reduceAppAction(model, { type: "combatAction", action: "finish" });

    const nextRoomHtml = renderAppHtml(model);
    expect(model.combatRun?.roomIndex).toBe(1);
    expect(nextRoomHtml).toContain('data-player-motion="idle"');
    expect(nextRoomHtml).toContain('data-enemy-motion="idle"');
    expect(nextRoomHtml).not.toContain('class="hit-impact');
    expect(nextRoomHtml).not.toContain('data-damage-number="true"');
  });

  it("renders concrete combat skill slots and maps hotkeys to those skills", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    const html = renderAppHtml(model);

    expect(html).toContain('data-combat-skill-id="anvil-crash"');
    expect(html).toContain('data-hotkey="U"');
    expect(html).toContain('data-skill-cost="25"');
    expect(combatActionForKeyCode(model.state, "KeyJ")).toEqual({ type: "combatAction", action: "light" });
    expect(combatActionForKeyCode(model.state, "KeyX")).toEqual({ type: "combatAction", action: "light" });
    expect(combatActionForKeyCode(model.state, "KeyZ")).toEqual({ type: "combatAction", action: "heavy" });
    expect(combatActionForKeyCode(model.state, "KeyU")).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "anvil-crash"
    });

    const action = combatActionForKeyCode(model.state, "KeyU");

    if (!action) {
      throw new Error("Expected KeyU to map to a combat skill");
    }

    const cast = reduceAppAction(model, action);
    const lastEvent = cast.combatRun?.events.at(-1);

    expect(lastEvent).toMatchObject({ kind: "hit", action: "skill", skillId: "anvil-crash" });
    expect(cast.combatRun?.player.heat).toBeLessThan(model.combatRun?.player.heat ?? 0);
    expect(cast.audio.commandQueue).toEqual(expect.arrayContaining([{ type: "sfx", id: "skill-burst" }]));
  });

  it("renders player skill burst VFX after casting a combat skill", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      initialState: withHeat(createInitialState(), 80)
    });

    model = reduceAppAction(model, { type: "enterDungeon", dungeonId: "cinder-kiln-alley" });
    model = reduceAppAction(model, { type: "combatAction", action: "skill", skillId: "anvil-crash" });

    const html = renderAppHtml(model);

    expect(html).toContain('class="combat-vfx-layer"');
    expect(html).toContain('class="combat-player-art actor-model actor-model-skill"');
    expect(html).toContain('class="enemy-art actor-model actor-model-hit"');
    expect(html).toContain('data-player-skill-vfx="anvil-crash"');
    expect(html).toContain('data-vfx-action="skill"');
    expect(html).toContain('data-damage-number="true"');
  });

  it("does not map unaffordable combat skill hotkeys", () => {
    const state = createInitialState();

    expect(combatActionForKeyCode(state, "KeyU", 10)).toBeUndefined();
    expect(combatActionForKeyCode(state, "KeyU", 30)).toEqual({
      type: "combatAction",
      action: "skill",
      skillId: "anvil-crash"
    });
  });

  it("mounts combat nested skill-label clicks and returns keyboard cleanup", () => {
    const previousLocalStorage = globalThis.localStorage;
    const previousAddEventListener = globalThis.addEventListener;
    const previousRemoveEventListener = globalThis.removeEventListener;
    const storage = new MemoryStorage();
    const listeners = new Map<string, EventListener>();
    let clickHandler: ((event: Event) => void) | undefined;
    const classList = new Set<string>();
    const root = {
      innerHTML: "",
      addEventListener(type: string, handler: EventListener): void {
        if (type === "click") {
          clickHandler = handler as (event: Event) => void;
        }
      }
    } as unknown as HTMLDivElement;

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage
    });
    Object.defineProperty(globalThis, "addEventListener", {
      configurable: true,
      value: (type: string, handler: EventListener) => listeners.set(type, handler)
    });
    Object.defineProperty(globalThis, "removeEventListener", {
      configurable: true,
      value: (type: string, handler: EventListener) => {
        if (listeners.get(type) === handler) {
          listeners.delete(type);
        }
      }
    });

    try {
      const cleanup = mountApp(root);
      const enterButton = {
        dataset: { enterDungeon: "cinder-kiln-alley" },
        classList: { contains: (className: string) => classList.has(className) },
        closest: () => enterButton
      };

      clickHandler?.({ target: enterButton } as unknown as Event);

      const lightButton = {
        dataset: { combatAction: "light" },
        classList: { contains: (className: string) => classList.has(className) },
        closest: () => lightButton
      };

      clickHandler?.({ target: lightButton } as unknown as Event);
      clickHandler?.({ target: lightButton } as unknown as Event);
      clickHandler?.({ target: lightButton } as unknown as Event);
      clickHandler?.({ target: lightButton } as unknown as Event);

      const skillButton = {
        dataset: { combatAction: "skill", combatSkillId: "anvil-crash" },
        classList: { contains: (className: string) => classList.has(className) },
        closest: () => skillButton
      };
      const nestedSpan = {
        dataset: {},
        closest: () => skillButton
      };

      clickHandler?.({ target: nestedSpan } as unknown as Event);

      expect(root.innerHTML).toContain('class="combat-vfx-layer"');
      expect(root.innerHTML).toContain('data-player-skill-vfx="anvil-crash"');
      expect(root.innerHTML).toContain("热能 7");
      expect(listeners.has("keydown")).toBe(true);

      cleanup();
      expect(listeners.has("keydown")).toBe(false);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage
      });
      Object.defineProperty(globalThis, "addEventListener", {
        configurable: true,
        value: previousAddEventListener
      });
      Object.defineProperty(globalThis, "removeEventListener", {
        configurable: true,
        value: previousRemoveEventListener
      });
    }
  });

  it("buys a gift pack, opens a box, and renders actionable shop controls", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({
      storage,
      rng: () => 0.99,
      initialState: withCurrency(createInitialState(), { valorToken: 5 })
    });
    const bought = reduceAppAction(model, { type: "buyShopItem", sku: "liuli-gift-pack" });
    const opened = reduceAppAction(bought, { type: "openBox", boxId: "ember-mythic-box" });
    const shopHtml = renderAppHtml({ ...opened, mode: "shop" });

    expect(bought.state.shop.boxes["ember-mythic-box"]).toBe(3);
    expect(opened.state.shop.boxes["ember-mythic-box"]).toBe(2);
    expect(opened.state.player.inventory.length).toBeGreaterThan(bought.state.player.inventory.length);
    expect(shopHtml).toContain("购买礼包");
    expect(shopHtml).toContain("开启箱子");
    expect(opened.audio.commandQueue).toEqual(expect.arrayContaining([{ type: "sfx", id: "box-open" }]));
  });

  it("equips, locks, sells, and dismantles inventory items through app actions", () => {
    let model = createAppModel({ storage: new MemoryStorage() });
    const core = model.state.player.inventory.find((item) => item.catalogGearId.includes("-core"));

    if (!core) {
      throw new Error("Expected starter core");
    }

    model = reduceAppAction(model, { type: "equipItem", gearId: core.instanceId });
    expect(model.state.player.equipment.core).toBe(core.instanceId);
    expect(model.message).toContain("装备");

    model = reduceAppAction(
      { ...model, state: withCurrency(model.state, { valorToken: 5 }) },
      { type: "buyShopItem", sku: "liuli-gift-pack" }
    );
    const sellable = model.state.player.inventory.at(-1);

    if (!sellable) {
      throw new Error("Expected gift-pack gear");
    }

    model = reduceAppAction(model, { type: "toggleItemLock", gearId: sellable.instanceId });
    expect(model.state.player.inventory.find((item) => item.instanceId === sellable.instanceId)?.locked).toBe(true);
    expect(() => reduceAppAction(model, { type: "sellItem", gearId: sellable.instanceId })).toThrow(/locked item/i);

    model = reduceAppAction(model, { type: "toggleItemLock", gearId: sellable.instanceId });
    const beforeGold = model.state.player.currencies.gold;
    model = reduceAppAction(model, { type: "sellItem", gearId: sellable.instanceId });
    expect(model.state.player.inventory.some((item) => item.instanceId === sellable.instanceId)).toBe(false);
    expect(model.state.player.currencies.gold).toBeGreaterThan(beforeGold);

    const bought = reduceAppAction(
      { ...model, state: withCurrency(model.state, { valorToken: 5 }) },
      { type: "buyShopItem", sku: "liuli-gift-pack" }
    );
    const dropped = bought.state.player.inventory.at(-1);

    if (!dropped) {
      throw new Error("Expected gift-pack gear");
    }

    const beforeDust = bought.state.player.currencies.ironDust;
    const dismantled = reduceAppAction(bought, { type: "dismantleItem", gearId: dropped.instanceId });
    expect(dismantled.state.player.inventory.some((item) => item.instanceId === dropped.instanceId)).toBe(false);
    expect(dismantled.state.player.currencies.ironDust).toBeGreaterThan(beforeDust);
  });

  it("accepts a trade offer and resolves an auction listing through app actions", () => {
    let model = createAppModel({
      storage: new MemoryStorage(),
      rng: () => 0,
      initialState: withCurrency(createInitialState(), { gold: 5000, ironDust: 500, arcShard: 50, valorToken: 5 })
    });
    const offer = model.state.market.tradeBoard.offers[0];
    const unequipped = model.state.player.inventory.find(
      (item) => !Object.values(model.state.player.equipment).includes(item.instanceId)
    );

    if (!unequipped) {
      throw new Error("Expected unequipped item for auction");
    }

    model = reduceAppAction(model, { type: "acceptTrade", offerId: offer.id });
    expect(model.message).toContain("交易");

    const listed = reduceAppAction(model, { type: "listAuction", gearId: unequipped.instanceId, price: 500 });
    expect(listed.state.market.auctions).toHaveLength(1);
    expect(listed.state.player.inventory.some((item) => item.instanceId === unequipped.instanceId)).toBe(false);

    const resolved = reduceAppAction(listed, { type: "resolveAuctions" });
    expect(resolved.state.market.auctions).toHaveLength(0);
    expect(resolved.state.player.currencies.gold).toBeGreaterThan(listed.state.player.currencies.gold);
    expect(resolved.message).toContain("拍卖");
  });

  it("saves and loads app state through injected storage", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({ storage, rng: () => 0 });
    const gearId = model.state.player.inventory[0].instanceId;
    const reinforced = reduceAppAction(model, { type: "reinforce", gearId });
    const saved = reduceAppAction(reinforced, { type: "save" });
    const resetModel = { ...saved, state: createInitialState(), message: undefined };
    const loaded = reduceAppAction(resetModel, { type: "load" });

    expect(storage.data.has(SAVE_KEY)).toBe(true);
    expect(loaded.state).toEqual(saved.state);
    expect(loaded.message).toContain("读取");
  });

  it("loads the local single-player save when the app starts", () => {
    const storage = new MemoryStorage();
    const savedState = withCurrency(createInitialState(), { gold: 7777, tradeCredit: 88 });

    saveGame(storage, savedState);

    const loaded = createAppModel({ storage });
    const explicitNewGame = createAppModel({
      storage,
      initialState: withCurrency(createInitialState(), { gold: 1234, tradeCredit: 12 })
    });

    expect(loaded.state.player.currencies.gold).toBe(7777);
    expect(loaded.state.player.currencies.tradeCredit).toBe(88);
    expect(loaded.message).toContain("读取本地存档");
    expect(explicitNewGame.state.player.currencies.gold).toBe(1234);
  });

  it("does not auto overwrite a malformed local save after fallback startup", () => {
    const previousLocalStorage = globalThis.localStorage;
    const storage = new MemoryStorage();
    let clickHandler: ((event: Event) => void) | undefined;
    const root = {
      innerHTML: "",
      addEventListener(type: string, handler: EventListener): void {
        if (type === "click") {
          clickHandler = handler as (event: Event) => void;
        }
      }
    } as unknown as HTMLDivElement;

    storage.setItem(SAVE_KEY, "{bad json");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage
    });

    try {
      const cleanup = mountApp(root);
      const gearId = createInitialState().player.inventory[0].instanceId;
      const reinforceButton = {
        dataset: { appAction: "reinforce", gearId },
        closest: () => reinforceButton
      };

      clickHandler?.({ target: reinforceButton } as unknown as Event);

      expect(storage.getItem(SAVE_KEY)).toBe("{bad json");

      cleanup();
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage
      });
    }
  });

  it("auto saves mounted persistent actions to the local single-player save", () => {
    const previousLocalStorage = globalThis.localStorage;
    const storage = new MemoryStorage();
    let clickHandler: ((event: Event) => void) | undefined;
    const root = {
      innerHTML: "",
      addEventListener(type: string, handler: EventListener): void {
        if (type === "click") {
          clickHandler = handler as (event: Event) => void;
        }
      }
    } as unknown as HTMLDivElement;

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage
    });

    try {
      const cleanup = mountApp(root);
      const gearId = createInitialState().player.inventory[0].instanceId;
      const reinforceButton = {
        dataset: { appAction: "reinforce", gearId },
        closest: () => reinforceButton
      };

      clickHandler?.({ target: reinforceButton } as unknown as Event);

      const rawSave = storage.getItem(SAVE_KEY);

      if (!rawSave) {
        throw new Error("Expected mounted app action to write local save");
      }

      const saved = JSON.parse(rawSave) as GameState;
      const reinforced = saved.player.inventory.find((item) => item.instanceId === gearId);

      expect(reinforced?.reinforceLevel).toBe(1);
      expect(root.innerHTML).toContain("+1");

      cleanup();
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: previousLocalStorage
      });
    }
  });

  it("updates audio volumes through app settings actions", () => {
    const model = createAppModel({ storage: new MemoryStorage() });

    const musicChanged = reduceAppAction(model, { type: "setVolume", kind: "music", value: 0.32 });
    const sfxMuted = reduceAppAction(musicChanged, { type: "setVolume", kind: "sfx", value: -1 });

    expect(musicChanged.audio.volumes.music).toBe(0.32);
    expect(musicChanged.message).toContain("音量");
    expect(sfxMuted.audio.volumes.sfx).toBe(0);
    expect(sfxMuted.audio.volumes.music).toBe(0.32);
  });

  it("requires confirmation before resetting the local save", () => {
    const storage = new MemoryStorage();
    const model = createAppModel({ storage, rng: () => 0 });
    const gearId = model.state.player.inventory[0].instanceId;
    const reinforced = reduceAppAction(model, { type: "reinforce", gearId });
    const saved = reduceAppAction(reinforced, { type: "save" });

    const canceled = reduceAppAction(saved, { type: "resetSave", confirmed: false });
    expect(storage.data.has(SAVE_KEY)).toBe(true);
    expect(canceled.state).toEqual(saved.state);
    expect(canceled.message).toContain("取消");

    const reset = reduceAppAction(saved, { type: "resetSave", confirmed: true });
    expect(storage.data.has(SAVE_KEY)).toBe(false);
    expect(reset.state).toEqual(createInitialState());
    expect(reset.mode).toBe("town");
    expect(reset.message).toContain("重置");
  });
});
