import { catalog } from "../data/catalog";
import type { CurrencyId, DungeonId, GameState, QuestDefinition, QuestEventType, SystemId } from "../game/types";

export type QuestEvent =
  | { type: "enemyDefeated"; enemyId: string }
  | { type: "dungeonCleared"; dungeonId: DungeonId }
  | { type: "itemLooted"; itemId: string }
  | { type: "reinforced"; itemId?: string }
  | { type: "amplified"; itemId?: string }
  | { type: "auctionSold"; listingId?: string }
  | { type: "shopPurchased"; sku: string }
  | { type: "tradeCompleted"; offerId: string };

const dungeonIds = new Set<string>(catalog.dungeons.map((dungeon) => dungeon.id));
const alwaysUnlockedSystems = new Set<SystemId>(["shop"]);

function getQuest(questId: string): QuestDefinition {
  const quest = catalog.quests.find((item) => item.id === questId);

  if (!quest) {
    throw new Error(`Unknown quest: ${questId}`);
  }

  return quest;
}

function eventTargetId(event: QuestEvent): string | undefined {
  switch (event.type) {
    case "enemyDefeated":
      return event.enemyId;
    case "dungeonCleared":
      return event.dungeonId;
    case "itemLooted":
      return event.itemId;
    case "shopPurchased":
      return event.sku;
    case "tradeCompleted":
      return event.offerId;
    default:
      return undefined;
  }
}

function questMatchesEvent(quest: QuestDefinition, event: QuestEvent): boolean {
  const trigger = quest.objectiveTrigger;

  if (trigger.type !== event.type) {
    return false;
  }

  if (!trigger.targetId) {
    return true;
  }

  return trigger.targetId === eventTargetId(event);
}

function addCurrencyRewards(state: GameState, rewards: Partial<Record<CurrencyId, number>>): GameState["player"]["currencies"] {
  const currencies = { ...state.player.currencies };

  for (const [currencyId, amount] of Object.entries(rewards) as Array<[CurrencyId, number]>) {
    currencies[currencyId] += amount;
  }

  return currencies;
}

function activateNextQuests(
  currentQuests: GameState["player"]["quests"],
  nextQuestIds: string[]
): GameState["player"]["quests"] {
  const quests = { ...currentQuests };

  for (const questId of nextQuestIds) {
    getQuest(questId);

    if (quests[questId] === "locked") {
      quests[questId] = "active";
    }
  }

  return quests;
}

function unlockDungeons(state: GameState, unlocks: string[]): DungeonId[] {
  const unlocked = new Set<DungeonId>(state.player.unlockedDungeons);

  for (const unlockId of unlocks) {
    if (dungeonIds.has(unlockId)) {
      unlocked.add(unlockId as DungeonId);
    }
  }

  return [...unlocked];
}

export function applyQuestEvent(state: GameState, event: QuestEvent): GameState {
  let changed = false;
  const quests = { ...state.player.quests };

  for (const quest of catalog.quests) {
    if (quests[quest.id] === "active" && questMatchesEvent(quest, event)) {
      quests[quest.id] = "ready";
      changed = true;
    }
  }

  if (!changed) {
    return state;
  }

  return {
    ...state,
    player: {
      ...state.player,
      quests
    }
  };
}

export function claimQuestReward(state: GameState, questId: string): GameState {
  const quest = getQuest(questId);
  const questStatus = state.player.quests[quest.id];

  if (questStatus !== "ready") {
    throw new Error(`Quest is not ready to claim: ${questId}`);
  }

  const quests = activateNextQuests(
    {
      ...state.player.quests,
      [quest.id]: "completed"
    },
    quest.nextQuestIds
  );

  return {
    ...state,
    player: {
      ...state.player,
      currencies: addCurrencyRewards(state, quest.rewards),
      quests,
      unlockedDungeons: unlockDungeons(state, quest.unlocks)
    }
  };
}

export function getActiveQuestText(state: GameState): string {
  const quest = catalog.quests.find((item) => {
    const status = state.player.quests[item.id];
    return status === "ready" || status === "active";
  });

  if (!quest) {
    return "暂无任务";
  }

  const statusText = state.player.quests[quest.id] === "ready" ? "可领取" : "进行中";

  return `${quest.chapter} - ${quest.displayName}：${quest.objective}（${statusText}）`;
}

export function isSystemUnlocked(state: GameState, systemId: SystemId): boolean {
  if (alwaysUnlockedSystems.has(systemId)) {
    return true;
  }

  return catalog.quests.some(
    (quest) => state.player.quests[quest.id] === "completed" && quest.unlocks.includes(systemId)
  );
}
