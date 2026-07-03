import type {
  AuctionListing,
  CurrencyId,
  CurrencyState,
  GameState,
  GearSlot,
  MarketState,
  OwnedGearItem,
  TradeBoard,
  TradeOffer
} from "../game/types";

const currencyIds: readonly CurrencyId[] = ["gold", "ironDust", "arcShard", "valorToken", "protectionTicket"];

const tradeTemplates: Array<{
  key: string;
  label: string;
  cost: Partial<Record<CurrencyId, number>>;
  reward: Partial<Record<CurrencyId, number>>;
}> = [
  { key: "dust-for-gold", label: "Dust supply contract", cost: { gold: 260 }, reward: { ironDust: 20 } },
  {
    key: "ticket-for-shards",
    label: "Protection ticket exchange",
    cost: { gold: 120, arcShard: 3 },
    reward: { protectionTicket: 1 }
  },
  { key: "token-for-gold", label: "Valor stipend", cost: { valorToken: 1 }, reward: { gold: 700 } },
  { key: "shards-for-dust", label: "Arc shard refining", cost: { ironDust: 45 }, reward: { arcShard: 3 } },
  { key: "gold-for-ticket", label: "Smithing guarantee", cost: { gold: 500 }, reward: { protectionTicket: 1 } },
  { key: "gold-for-shards", label: "Furnace shard crate", cost: { gold: 420 }, reward: { arcShard: 2 } }
];

function hashText(text: string): number {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function slugSeed(seed: string): string {
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "default";
}

function assertKnownCurrencies(values: Partial<Record<CurrencyId, number>>, path: string): void {
  for (const [currencyId, amount] of Object.entries(values)) {
    if (!currencyIds.includes(currencyId as CurrencyId) || typeof amount !== "number" || amount <= 0) {
      throw new Error(`Invalid trade currency entry: ${path}.${currencyId}`);
    }
  }
}

function defaultMarket(): MarketState {
  return {
    tradeBoard: createTradeBoard("default-market"),
    auctions: [],
    auctionSequence: 1,
    turn: 0
  };
}

function getMarket(state: GameState): MarketState {
  return state.market ?? defaultMarket();
}

function hasCurrency(currencies: CurrencyState, cost: Partial<Record<CurrencyId, number>>): boolean {
  return Object.entries(cost).every(([currencyId, amount]) => currencies[currencyId as CurrencyId] >= (amount ?? 0));
}

function applyCurrencyDelta(
  currencies: CurrencyState,
  cost: Partial<Record<CurrencyId, number>>,
  reward: Partial<Record<CurrencyId, number>>
): CurrencyState {
  const next = { ...currencies };

  for (const [currencyId, amount] of Object.entries(cost) as Array<[CurrencyId, number]>) {
    next[currencyId] -= amount;
  }

  for (const [currencyId, amount] of Object.entries(reward) as Array<[CurrencyId, number]>) {
    next[currencyId] += amount;
  }

  return next;
}

function findOwnedItem(state: GameState, itemId: string): OwnedGearItem {
  const item = state.player.inventory.find((owned) => owned.instanceId === itemId);

  if (!item) {
    throw new Error(`Unknown owned item: ${itemId}`);
  }

  return item;
}

function isCurrentlyEquipped(state: GameState, itemId: string): boolean {
  return Object.values(state.player.equipment).includes(itemId);
}

function clearLoadoutRefs(state: GameState, itemId: string): Array<Partial<Record<GearSlot, string>>> {
  return state.player.loadouts.map((loadout) =>
    Object.fromEntries(Object.entries(loadout).filter(([, equippedId]) => equippedId !== itemId))
  ) as Array<Partial<Record<GearSlot, string>>>;
}

function normalizeRoll(roll: number): number {
  if (!Number.isFinite(roll)) {
    return 1;
  }

  return Math.min(Math.max(roll, 0), 0.999999);
}

export function createTradeBoard(seed: string): TradeBoard {
  const boardHash = hashText(seed).toString(36);
  const boardId = `trade-${slugSeed(seed)}-${boardHash}`;
  const offers: TradeOffer[] = tradeTemplates
    .map((template, index) => ({
      template,
      score: hashText(`${seed}:${template.key}:${index}`)
    }))
    .sort((left, right) => left.score - right.score)
    .slice(0, 3)
    .map(({ template }) => {
      assertKnownCurrencies(template.cost, template.key);
      assertKnownCurrencies(template.reward, template.key);

      return {
        id: `${boardId}-${template.key}`,
        label: template.label,
        cost: { ...template.cost },
        reward: { ...template.reward }
      };
    });

  return {
    id: boardId,
    seed,
    offers
  };
}

export function acceptTrade(state: GameState, offerId: string): GameState {
  const market = getMarket(state);
  const offer = market.tradeBoard.offers.find((item) => item.id === offerId);

  if (!offer) {
    throw new Error(`Unknown trade offer: ${offerId}`);
  }

  if (!hasCurrency(state.player.currencies, offer.cost)) {
    throw new Error(`Insufficient currency for trade offer: ${offerId}`);
  }

  return {
    ...state,
    market,
    player: {
      ...state.player,
      currencies: applyCurrencyDelta(state.player.currencies, offer.cost, offer.reward)
    }
  };
}

export function listAuction(state: GameState, itemId: string, price: number): GameState {
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Auction listing requires a positive price: ${price}`);
  }

  const ownedItem = findOwnedItem(state, itemId);

  if (isCurrentlyEquipped(state, itemId)) {
    throw new Error(`Cannot list equipped item: ${itemId}`);
  }

  const fee = Math.max(10, Math.floor(price * 0.05));

  if (state.player.currencies.gold < fee) {
    throw new Error(`Insufficient gold for auction fee: need ${fee}, have ${state.player.currencies.gold}`);
  }

  const market = getMarket(state);
  const listing: AuctionListing = {
    id: `auction-${String(market.auctionSequence).padStart(3, "0")}`,
    itemId,
    price,
    fee,
    listedAtTurn: market.turn,
    status: "listed",
    ownedItem: { ...ownedItem }
  };

  return {
    ...state,
    market: {
      ...market,
      auctions: [...market.auctions, listing],
      auctionSequence: market.auctionSequence + 1
    },
    player: {
      ...state.player,
      inventory: state.player.inventory.filter((item) => item.instanceId !== itemId),
      loadouts: clearLoadoutRefs(state, itemId),
      currencies: {
        ...state.player.currencies,
        gold: state.player.currencies.gold - fee
      }
    }
  };
}

export function resolveAuctions(state: GameState, rng: () => number): GameState {
  const market = getMarket(state);
  const returnedItems: OwnedGearItem[] = [];
  const remainingAuctions: AuctionListing[] = [];
  let gold = state.player.currencies.gold;

  for (const listing of market.auctions) {
    if (listing.status !== "listed") {
      remainingAuctions.push(listing);
      continue;
    }

    if (normalizeRoll(rng()) < 0.75) {
      gold += listing.price;
    } else {
      returnedItems.push(listing.ownedItem);
    }
  }

  return {
    ...state,
    market: {
      ...market,
      turn: market.turn + 1,
      auctions: remainingAuctions
    },
    player: {
      ...state.player,
      inventory: [...state.player.inventory, ...returnedItems],
      currencies: {
        ...state.player.currencies,
        gold
      }
    }
  };
}
