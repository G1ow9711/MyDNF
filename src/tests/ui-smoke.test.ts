import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/state";
import { renderAppHtml } from "../ui/app";
import {
  renderAuctionPanel,
  renderInventoryPanel,
  renderQuestPanel,
  renderSettingsPanel,
  renderShopPanel,
  renderSmithPanel
} from "../ui/panels";

describe("town app shell", () => {
  it("renders the playable town as the first screen instead of a landing page", () => {
    const html = renderAppHtml({ state: createInitialState(), mode: "town" });

    expect(html).toContain("烬璃纪元");
    expect(html).toContain("炉山市集");
    expect(html).toContain("烬拳卫");
    expect(html).toContain("灰窑巷");
    expect(html).toContain("琉璃熔炉");
    expect(html).toContain("背包");
    expect(html).toContain("强化");
    expect(html).toContain("增幅");
    expect(html).toContain("拍卖");
    expect(html).toContain("商城");
    expect(html).toContain("任务");
    expect(html).not.toContain("正在加载");
  });

  it("renders expected system panel text for repeated town workflows", () => {
    const state = createInitialState();

    expect(renderInventoryPanel(state)).toContain("套装");
    expect(renderInventoryPanel(state)).toContain("负重");
    expect(renderSmithPanel(state)).toContain("保护券");
    expect(renderSmithPanel(state)).toContain("增幅");
    expect(renderAuctionPanel(state)).toContain("建议价");
    expect(renderAuctionPanel(state)).toContain("热度");
    expect(renderShopPanel(state)).toContain("礼包");
    expect(renderShopPanel(state)).toContain("时装");
    expect(renderShopPanel(state)).toContain("概率");
    expect(renderQuestPanel(state)).toContain("炉火未熄");
    expect(renderSettingsPanel()).toContain("音乐");
    expect(renderSettingsPanel()).toContain("音效");
  });
});
