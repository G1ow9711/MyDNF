import type {
  AuctionListing,
  AuctionPriceRecord,
  AuctionPricing,
  CurrencyId,
  CurrencyState,
  GameState,
  GearSlot,
  MarketState,
  OwnedGearItem,
  TradeBoard,
  TradeOffer
} from "../game/types";

const currencyIds: readonly CurrencyId[] = ["gold", "ironDust", "arcShard", "valorToken", "tradeCredit", "protectionTicket"];

const tradeTemplates: Array<{
  key: string;
  label: string;
  cost: Partial<Record<CurrencyId, number>>;
  reward: Partial<Record<CurrencyId, number>>;
}> = [
  { key: "dust-for-credit", label: "Dust supply contract", cost: { tradeCredit: 2 }, reward: { ironDust: 20 } },
  {
    key: "ticket-for-shards",
    label: "Protection ticket exchange",
    cost: { tradeCredit: 3, arcShard: 3 },
    reward: { protectionTicket: 1 }
  },
  { key: "token-for-credit", label: "Valor stipend", cost: { valorToken: 1 }, reward: { tradeCredit: 5 } },
  { key: "shards-for-credit", label: "Arc shard refining", cost: { tradeCredit: 2, ironDust: 45 }, reward: { arcShard: 3 } },
  { key: "credit-for-ticket", label: "Smithing guarantee", cost: { tradeCredit: 5 }, reward: { protectionTicket: 1 } },
  { key: "credit-for-shards", label: "Furnace shard crate", cost: { tradeCredit: 4 }, reward: { arcShard: 2 } }
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
    turn: 0,
    priceHistory: {}
  };
}

function getMarket(state: GameState): MarketState {
  const market = state.market ?? defaultMarket();

  return {
    ...market,
    priceHistory: market.priceHistory ?? {}
  };
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

function auctionListingFee(price: number): number {
  return Math.max(10, Math.floor(price * 0.05));
}

function average(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function normalizeAuctionPriceRecords(records: AuctionPriceRecord[] | undefined): AuctionPriceRecord[] {
  return [...(records ?? [])]
    .sort((left, right) => left.turn - right.turn || left.price - right.price)
    .slice(-5);
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

export function getAuctionPricing(state: GameState, catalogGearId: string): AuctionPricing {
  const market = getMarket(state);
  const recentRecords = normalizeAuctionPriceRecords(market.priceHistory[catalogGearId]);
  const recentPrices = recentRecords.map((record) => record.price);
  const fallbackPrice = Math.max(300, state.player.level * 80);
  const suggestedPrice = recentPrices.length > 0 ? Math.max(300, average(recentPrices)) : fallbackPrice;
  const activeListings = market.auctions.filter(
    (listing) => listing.status === "listed" && listing.ownedItem.catalogGearId === catalogGearId
  ).length;
  const demandState = recentPrices.length >= 3 ? "hot" : recentPrices.length > 0 || activeListings > 0 ? "normal" : "cold";

  return {
    catalogGearId,
    recentPrices,
    suggestedPrice,
    demandState,
    listingFee: auctionListingFee(suggestedPrice)
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

  const fee = auctionListingFee(price);

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
  const nextTurn = market.turn + 1;
  const priceHistory: Record<string, AuctionPriceRecord[]> = Object.fromEntries(
    Object.entries(market.priceHistory).map(([catalogGearId, records]) => [
      catalogGearId,
      normalizeAuctionPriceRecords(records)
    ])
  );
  let gold = state.player.currencies.gold;

  for (const listing of market.auctions) {
    if (listing.status !== "listed") {
      remainingAuctions.push(listing);
      continue;
    }

    if (normalizeRoll(rng()) < 0.75) {
      gold += listing.price;
      const catalogGearId = listing.ownedItem.catalogGearId;
      priceHistory[catalogGearId] = normalizeAuctionPriceRecords([
        ...(priceHistory[catalogGearId] ?? []),
        { catalogGearId, price: listing.price, turn: nextTurn }
      ]);
    } else {
      returnedItems.push(listing.ownedItem);
    }
  }

  return {
    ...state,
    market: {
      ...market,
      turn: nextTurn,
      auctions: remainingAuctions,
      priceHistory
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
