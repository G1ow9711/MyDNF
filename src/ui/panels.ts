import { catalog } from "../data/catalog";
import type { GameState, GearItem, OwnedGearItem } from "../game/types";
import { getActiveQuestText, isSystemUnlocked } from "../systems/quests";
import { getBoxRates } from "../systems/shop";

function gearFor(owned: OwnedGearItem): GearItem | undefined {
  return catalog.gear.find((item) => item.id === owned.catalogGearId);
}

function gearName(owned: OwnedGearItem): string {
  return gearFor(owned)?.displayName ?? owned.catalogGearId;
}

function panel(title: string, body: string): string {
  return `
    <section class="system-panel" aria-label="${title}">
      <header class="panel-title">
        <h2>${title}</h2>
      </header>
      ${body}
    </section>
  `;
}

function currencyLine(state: GameState): string {
  const currencies = state.player.currencies;

  return `
    <div class="currency-strip" aria-label="货币">
      <span>金币 ${currencies.gold}</span>
      <span>铁尘 ${currencies.ironDust}</span>
      <span>弧晶 ${currencies.arcShard}</span>
      <span>勇气币 ${currencies.valorToken}</span>
      <span>保护券 ${currencies.protectionTicket}</span>
    </div>
  `;
}

export function renderInventoryPanel(state: GameState): string {
  const equippedIds = new Set(Object.values(state.player.equipment));
  const equippedItems = state.player.inventory.filter((item) => equippedIds.has(item.instanceId));
  const setNames = new Set(
    equippedItems
      .map((owned) => gearFor(owned)?.setId)
      .filter((setId): setId is string => Boolean(setId))
      .map((setId) => catalog.epicSets.find((set) => set.id === setId)?.displayName ?? setId)
  );
  const inventoryRows = state.player.inventory
    .slice(0, 8)
    .map((owned) => `<li><span>${gearName(owned)}</span><b>+${owned.reinforceLevel}</b></li>`)
    .join("");

  return panel(
    "背包",
    `
      ${currencyLine(state)}
      <div class="panel-grid">
        <div>
          <h3>装备</h3>
          <ul class="dense-list">${inventoryRows}</ul>
        </div>
        <div>
          <h3>套装</h3>
          <p>${setNames.size > 0 ? [...setNames].join(" / ") : "未激活套装"}</p>
          <p>负重 ${state.player.inventory.length}/120</p>
        </div>
      </div>
    `
  );
}

export function renderSmithPanel(state: GameState): string {
  const selected = state.player.inventory[0];
  const selectedName = selected ? gearName(selected) : "无装备";
  const gearAttribute = selected ? `data-gear-id="${selected.instanceId}"` : "";

  return panel(
    "强化 / 增幅",
    `
      ${currencyLine(state)}
      <div class="smith-board">
        <h3>${selectedName}</h3>
        <p>强化消耗金币与铁尘，增幅消耗弧晶并绑定异响槽。</p>
        <div class="action-row">
          <button data-app-action="reinforce" ${gearAttribute} aria-label="强化">强化</button>
          <button data-app-action="amplify" ${gearAttribute} aria-label="增幅">增幅</button>
        </div>
        <p>保护券 ${state.player.currencies.protectionTicket}</p>
      </div>
    `
  );
}

export function renderAuctionPanel(state: GameState): string {
  const offer = state.market.tradeBoard.offers[0];
  const unequipped = state.player.inventory.find((item) => !Object.values(state.player.equipment).includes(item.instanceId));
  const listingRows = state.market.auctions
    .map((listing) => `<li>${listing.id} · ${listing.price} 金币 · ${listing.status}</li>`)
    .join("");

  return panel(
    "拍卖行",
    `
      <div class="panel-grid">
        <div>
          <h3>交易</h3>
          <p>${offer ? offer.label : "暂无交易"}</p>
          <button data-trade-offer-id="${offer?.id ?? ""}" ${offer ? "" : "disabled"}>完成交易</button>
        </div>
        <div>
          <h3>寄售</h3>
          <p>建议价 ${Math.max(300, state.player.level * 80)} 金币</p>
          <p>热度 ${state.market.auctions.length > 0 ? "热门" : "正常"}</p>
          <div class="action-row">
            <button data-auction-gear-id="${unequipped?.instanceId ?? ""}" ${unequipped ? "" : "disabled"}>寄售装备</button>
            <button data-app-action="resolve-auctions">结算拍卖</button>
          </div>
        </div>
        <div>
          <h3>委托单</h3>
          <ul class="dense-list">${listingRows || "<li>暂无寄售</li>"}</ul>
        </div>
      </div>
    `
  );
}

export function renderShopPanel(state: GameState): string {
  const rates = getBoxRates("ember-mythic-box");
  const rateText = rates.entries.map((entry) => `${entry.rarity} ${(entry.rate * 100).toFixed(0)}%`).join(" / ");

  return panel(
    "商城",
    `
      ${currencyLine(state)}
      <div class="panel-grid">
        <div>
          <h3>礼包</h3>
          <p>琉璃市集礼包 · 强化支援礼包 · 锻炉时装礼包</p>
          <p>时装 ${state.shop.ownedCosmetics.length} 件</p>
          <div class="action-row">
            <button data-shop-sku="liuli-gift-pack">购买礼包</button>
            <button data-box-id="ember-mythic-box">开启箱子</button>
          </div>
        </div>
        <div>
          <h3>概率</h3>
          <p>${rates.boxId}：${rateText}</p>
          <p>保底 ${rates.pityThreshold} 次</p>
        </div>
      </div>
    `
  );
}

export function renderQuestPanel(state: GameState): string {
  const readyQuest = Object.entries(state.player.quests).find(([, status]) => status === "ready");

  return panel(
    "任务",
    `
      <div class="quest-board">
        <p>${getActiveQuestText(state)}</p>
        <p>锻造 ${isSystemUnlocked(state, "smith") ? "已解锁" : "未解锁"} · 拍卖 ${
          isSystemUnlocked(state, "auction") ? "已解锁" : "未解锁"
        } · 增幅 ${isSystemUnlocked(state, "amplification") ? "已解锁" : "未解锁"}</p>
        <button data-quest-id="${readyQuest?.[0] ?? ""}" ${readyQuest ? "" : "disabled"}>领取奖励</button>
      </div>
    `
  );
}

export function renderSettingsPanel(): string {
  return panel(
    "设置",
    `
      <div class="settings-grid">
        <label>主音量 <input type="range" min="0" max="100" value="90" /></label>
        <label>音乐 <input type="range" min="0" max="100" value="75" /></label>
        <label>音效 <input type="range" min="0" max="100" value="85" /></label>
        <div class="action-row">
          <button data-app-action="save">保存</button>
          <button data-app-action="load">读取</button>
        </div>
      </div>
    `
  );
}
