import { createServer, type ViteDevServer } from "vite";
import { describe, expect, it } from "vitest";
import { runAppInRealBrowser } from "./support/real-browser-computed-style";

type BrowserCombatState = {
  objective: string;
  playerX: number;
  playerMotion: string;
  normalAttackMove: string;
  hitstopActive: string;
  screenShake: string;
  impactCue: string;
};

type BrowserSkillState = {
  activeSkill: string;
  skillMove: string;
  skillMoveProgress: number;
  skillStage: string;
  playerAnimation: string;
  weaponAnimation: string;
};

const readCombatStateExpression = `
(() => {
  const scene = document.querySelector(".combat-scene");
  const player = document.querySelector(".combat-player");
  const playerStyle = player?.getAttribute("style") ?? "";
  const actorX = /--actor-x:\\s*([0-9.]+)%/.exec(playerStyle)?.[1] ?? "0";
  const impact = document.querySelector("[data-impact-spark='true']");

  return {
    objective: scene?.getAttribute("data-combat-objective") ?? "",
    playerX: Number(actorX),
    playerMotion: player?.getAttribute("data-player-motion") ?? "",
    normalAttackMove: player?.getAttribute("data-player-normal-attack-move") ?? "",
    hitstopActive: scene?.getAttribute("data-hitstop-active") ?? "",
    screenShake: scene?.getAttribute("data-screen-shake") ?? "",
    impactCue: impact?.getAttribute("data-vfx-cue") ?? ""
  };
})()
`;

const readSkillStateExpression = `
(() => {
  const player = document.querySelector(".combat-player");
  const art = document.querySelector(".combat-player-art");
  const weapon = document.querySelector(".combat-weapon");
  return {
    activeSkill: player?.getAttribute("data-active-skill-id") ?? "",
    skillMove: player?.getAttribute("data-player-skill-move") ?? "",
    skillMoveProgress: Number(player?.getAttribute("data-player-skill-move-progress") || "0"),
    skillStage: player?.getAttribute("data-player-skill-stage") ?? "",
    playerAnimation: art ? getComputedStyle(art).animationName : "",
    weaponAnimation: weapon ? getComputedStyle(weapon).animationName : ""
  };
})()
`;

describe("real browser keyboard control", () => {
  it("moves continuously and lands a heavy attack through real keyboard events", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserCombatState>(readCombatStateExpression, (state) => state.objective === "active", 5000);

        const start = await page.evaluate<BrowserCombatState>(readCombatStateExpression);

        await page.keyDown("ArrowRight");
        const firstMove = await page.waitFor<BrowserCombatState>(
          readCombatStateExpression,
          (state) => state.playerX > start.playerX,
          1000
        );
        const heldMove = await page.waitFor<BrowserCombatState>(
          readCombatStateExpression,
          (state) => state.playerX > firstMove.playerX + 0.8,
          1500
        );

        expect(firstMove.playerX).toBeGreaterThan(start.playerX);
        expect(heldMove.playerX).toBeGreaterThan(firstMove.playerX);

        await page.waitFor<BrowserCombatState>(readCombatStateExpression, (state) => state.playerX >= 27, 2500);
        await page.keyUp("ArrowRight");
        await page.evaluate<void>("new Promise((resolve) => setTimeout(resolve, 760))");
        await page.pressKey("KeyZ");

        const heavyWindup = await page.waitFor<BrowserCombatState>(
          readCombatStateExpression,
          (state) => state.playerMotion === "heavy" && state.normalAttackMove === "ground-heavy",
          1000
        );

        expect(heavyWindup.playerMotion).toBe("heavy");
        expect(heavyWindup.normalAttackMove).toBe("ground-heavy");

        const heavyImpact = await page.waitFor<BrowserCombatState>(
          readCombatStateExpression,
          (state) => state.hitstopActive === "true" && state.impactCue === "ground-heavy-impact",
          1500
        );

        expect(heavyImpact.screenShake).toBe("heavy");
        expect(heavyImpact.impactCue).toBe("ground-heavy-impact");
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("drives a DNF hotkey skill with model-following motion and dedicated animations", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page);
        await page.waitFor<BrowserCombatState>(readCombatStateExpression, (state) => state.objective === "active", 5000);

        await page.pressKey("KeyA");
        const cast = await page.waitFor<BrowserSkillState>(
          readSkillStateExpression,
          (state) =>
            state.activeSkill === "spark-combo" &&
            state.skillMove === "spark-combo" &&
            state.skillStage === "windup",
          1200
        );

        const moving = await page.waitFor<BrowserSkillState>(
          readSkillStateExpression,
          (state) => state.activeSkill === "spark-combo" && state.skillMove === "spark-combo" && state.skillMoveProgress > 0,
          1200
        );

        expect(cast.playerAnimation).not.toBe("player-skill-cast");
        expect(cast.weaponAnimation).not.toBe("weapon-skill-flare");
        expect(moving.skillMoveProgress).toBeGreaterThan(0);
        expect(moving.playerAnimation).toBe("player-ember-spark-combo");
        expect(moving.weaponAnimation).toBe("weapon-jab-chain");
      });
    } finally {
      await server.close();
    }
  }, 60000);

  it("enters the dungeon with Space on a focused town button", async () => {
    const server = await startViteServer();

    try {
      await runAppInRealBrowser(server.url, async (page) => {
        await enterDungeonWithKeyboard(page, "Space");
        const combat = await page.waitFor<BrowserCombatState>(
          readCombatStateExpression,
          (state) => state.objective === "active",
          5000
        );

        expect(combat.objective).toBe("active");
      });
    } finally {
      await server.close();
    }
  }, 60000);
});

async function enterDungeonWithKeyboard(page: {
  evaluate<T>(expression: string): Promise<T>;
  waitFor<T>(expression: string, predicate: (value: T) => boolean, timeoutMs?: number): Promise<T>;
  pressKey(code: "Enter" | "Space"): Promise<void>;
}, activationKey: "Enter" | "Space" = "Enter"): Promise<void> {
  await page.waitFor<{ ready: boolean; focused: boolean; href: string; body: string; scripts: string[] }>(
    `(() => {
      const button = document.querySelector('[data-enter-dungeon="cinder-kiln-alley"]');
      return {
        ready: Boolean(button),
        focused: document.activeElement === button,
        href: location.href,
        body: (document.body?.innerHTML ?? "").slice(0, 500),
        scripts: Array.from(document.scripts).map((script) => script.src || script.textContent?.slice(0, 80) || "")
      };
    })()`,
    (state) => state.ready,
    5000
  );
  await page.evaluate<void>(`(() => {
    const button = document.querySelector('[data-enter-dungeon="cinder-kiln-alley"]');
    button?.focus();
  })()`);
  await page.waitFor<{ focused: boolean }>(
    `(() => {
      const button = document.querySelector('[data-enter-dungeon="cinder-kiln-alley"]');
      return { focused: document.activeElement === button };
    })()`,
    (state) => state.focused,
    1000
  );
  await page.pressKey(activationKey);
}

async function startViteServer(): Promise<{ server: ViteDevServer; url: string; close(): Promise<void> }> {
  const server = await createServer({
    logLevel: "silent",
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false
    }
  });

  await server.listen();
  const url = server.resolvedUrls?.local[0];

  if (!url) {
    await server.close();
    throw new Error("Expected Vite to expose a local test URL");
  }

  return {
    server,
    url,
    close: () => server.close()
  };
}
