export type Rarity = "common" | "uncommon" | "rare" | "epic" | "mythic";

export type GearSlot =
  | "weapon"
  | "core"
  | "head"
  | "body"
  | "legs"
  | "belt"
  | "boots"
  | "necklace"
  | "bracelet"
  | "ring"
  | "sigil"
  | "charm";

export type StatKey =
  | "attack"
  | "defense"
  | "crit"
  | "cooldown"
  | "element"
  | "moveSpeed"
  | "goldFind"
  | "heatGain";

export type AmplifyStat = "crit" | "cooldown" | "element" | "moveSpeed";

export type SkillTag = "starter" | "launcher" | "dash" | "slam" | "pull" | "burst" | "ultimate" | "combo";

export type ClassId = "ember-warden" | "liuli-blademage" | "ink-shadow-ranger" | "iron-forge-guardian";

export type AdvancementId =
  | "ember-furnace-master"
  | "mountain-breaker"
  | "flowing-light-swordmaster"
  | "mirrorflame-arcanist"
  | "night-contract-hunter"
  | "mechanism-shadow-weaver"
  | "black-furnace-vanguard"
  | "mountain-cracking-smith";

export type DungeonId = "cinder-kiln-alley" | "liuli-furnace";

export type TownId = "forge-market";

export type QuestStatus = "locked" | "active" | "ready" | "completed";

export type QuestEventType =
  | "enemyDefeated"
  | "dungeonCleared"
  | "itemLooted"
  | "reinforced"
  | "amplified"
  | "auctionSold"
  | "shopPurchased";

export type SystemId = "smith" | "trade" | "auction" | "amplification" | "costume-pavilion" | "shop";

export type CurrencyId = "gold" | "ironDust" | "arcShard" | "valorToken" | "tradeCredit" | "protectionTicket";

export interface StatBlock {
  attack?: number;
  defense?: number;
  crit?: number;
  cooldown?: number;
  element?: number;
  moveSpeed?: number;
  goldFind?: number;
  heatGain?: number;
}

export interface GearItem {
  id: string;
  displayName: string;
  rarity: Rarity;
  slot: GearSlot;
  level: number;
  setId?: string;
  amplification: {
    echoSlot: boolean;
  };
  stats: StatBlock;
  tags: string[];
}

export type WeaponAppearanceTier = "novice" | "refined" | "rare" | "epic" | "mythic";

export type WeaponType = "furnace-gauntlet" | "liuli-blade" | "mechanism-crossbow" | "forge-shield";

export interface WeaponAnchor {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface WeaponAssetDefinition {
  src: string;
  width: number;
  height: number;
  gripX: number;
  gripY: number;
}

export interface WeaponAppearanceDefinition {
  id: string;
  classId: ClassId;
  tier: WeaponAppearanceTier;
  rarity: Rarity;
  weaponType: WeaponType;
  minLevel: number;
  displayName: string;
  roleFlavor: string;
  asset: WeaponAssetDefinition;
  silhouette: string;
  materials: string[];
  palette: {
    primary: string;
    secondary: string;
    glow: string;
  };
  townAnchor: WeaponAnchor;
  combatAnchor: WeaponAnchor;
}

export interface OwnedGearItem {
  instanceId: string;
  catalogGearId: string;
  reinforceLevel: number;
  amplifyLevel: number;
  amplifyStat?: AmplifyStat;
  locked: boolean;
  bound: boolean;
  tradable: boolean;
  sealed: boolean;
}

export interface EpicSetBonus {
  pieces: 2 | 3 | 5;
  displayName: string;
  description: string;
  stats: StatBlock;
}

export interface EpicSet {
  id: string;
  displayName: string;
  theme: string;
  bonuses: [EpicSetBonus, EpicSetBonus, EpicSetBonus];
}

export interface SkillDefinition {
  id: string;
  displayName: string;
  key: string;
  heatCost: number;
  heatGain: number;
  cooldownMs: number;
  damageScale: number;
  tags: SkillTag[];
}

export type SkillDef = SkillDefinition;

export interface ClassSkillDefinition {
  id: string;
  classId: ClassId;
  displayName: string;
  key: string;
  resourceCost: number;
  resourceGain: number;
  cooldownMs: number;
  tags: string[];
}

export interface ClassAdvancementDefinition {
  id: AdvancementId;
  classId: ClassId;
  displayName: string;
  description: string;
  unlockLevel: number;
  roleTags: string[];
  passiveBonuses: Partial<Record<StatKey, number>>;
  skillIds: string[];
  vfxPalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface ClassDefinition {
  id: ClassId;
  displayName: string;
  internalName: string;
  resource: {
    id: string;
    displayName: string;
    max: number;
  };
  roleTags: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  preferredWeapon: string;
  armorStyle: string;
  statFocus: StatKey[];
  baseSkillIds: string[];
  advancements: [ClassAdvancementDefinition, ClassAdvancementDefinition];
}

export interface DungeonDefinition {
  id: DungeonId;
  displayName: string;
  minLevel: number;
  rooms: number;
  bossId: string;
  recommendedPower: number;
  lootSetIds: string[];
}

export type DungeonDef = DungeonDefinition;

export interface TownDefinition {
  id: TownId;
  displayName: string;
  description: string;
  services: string[];
  connectedDungeonIds: DungeonId[];
}

export type TownDef = TownDefinition;

export interface QuestDefinition {
  id: string;
  displayName: string;
  chapter: string;
  objective: string;
  objectiveTrigger: {
    type: QuestEventType;
    targetId?: string;
  };
  rewards: Partial<Record<CurrencyId, number>>;
  unlocks: string[];
  nextQuestIds: string[];
}

export type QuestDef = QuestDefinition;

export type CurrencyState = Record<CurrencyId, number>;

export interface TradeOffer {
  id: string;
  label: string;
  cost: Partial<Record<CurrencyId, number>>;
  reward: Partial<Record<CurrencyId, number>>;
}

export interface TradeBoard {
  id: string;
  seed: string;
  offers: TradeOffer[];
}

export type AuctionStatus = "listed" | "sold" | "expired";
export type AuctionDemandState = "cold" | "normal" | "hot";

export interface AuctionListing {
  id: string;
  itemId: string;
  price: number;
  fee: number;
  listedAtTurn: number;
  status: AuctionStatus;
  ownedItem: OwnedGearItem;
}

export interface AuctionPriceRecord {
  catalogGearId: string;
  price: number;
  turn: number;
}

export interface AuctionPricing {
  catalogGearId: string;
  recentPrices: number[];
  suggestedPrice: number;
  demandState: AuctionDemandState;
  listingFee: number;
}

export interface MarketState {
  tradeBoard: TradeBoard;
  auctions: AuctionListing[];
  auctionSequence: number;
  turn: number;
  priceHistory: Record<string, AuctionPriceRecord[]>;
}

export interface ShopState {
  ownedCosmetics: string[];
  boxes: Record<string, number>;
  boxPity: Record<string, number>;
  purchasedSkus: string[];
}

export interface PlayerState {
  heroId: string;
  classId: ClassId;
  advancementId?: AdvancementId;
  level: number;
  experience: number;
  heat: number;
  currencies: CurrencyState;
  inventory: OwnedGearItem[];
  equipment: Partial<Record<GearSlot, string>>;
  loadouts: Array<Partial<Record<GearSlot, string>>>;
  quests: Record<string, QuestStatus>;
  unlockedDungeons: DungeonId[];
}

export interface GameState {
  version: 1;
  catalogId: string;
  player: PlayerState;
  currentTown: TownId;
  currentDungeonId?: DungeonId;
  seenTutorials: string[];
  market: MarketState;
  shop: ShopState;
}
