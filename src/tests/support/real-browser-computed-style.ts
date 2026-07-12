import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type EnemyVfxFixture = {
  key: string;
  skillId: string;
  cue?: string;
  hitIndex?: number;
  attackDurationMs?: number;
  vfxDurationMs?: number;
};

export type EnemyModelMotionFixture = {
  key: string;
  motion: string;
  skillId?: string;
  bossPhaseSkillId?: string;
  cue?: string;
  durationMs?: number;
};

export type ComputedVfxPartStyle = {
  animationName: string;
  animationDuration: string;
};

export type ComputedEnemyVfxStyles = Record<
  string,
  {
    ring: ComputedVfxPartStyle;
    core: ComputedVfxPartStyle;
    trail: ComputedVfxPartStyle;
  }
>;

export type ComputedEnemyModelMotionStyles = Record<
  string,
  {
    art: ComputedVfxPartStyle;
  }
>;

export type RoomGateFixture = {
  key: string;
  vfx: string;
  transition: string;
  durationMs?: number;
};

export type PlayerSkillPhaseFixture = {
  key: string;
  skillId?: string;
  preset?: string;
  weaponArc?: string;
  vfxShape?: string;
  phase?: string;
  cue?: string;
  durationMs?: number;
};

export type PlayerHurtMotionFixture = {
  key: string;
  feedbackCue: string;
};

export type SkillImpactVfxFixture = {
  key: string;
  shape: string;
  phase?: string;
  cue?: string;
  durationMs?: number;
  status?: boolean;
};

export type WeaponLayerFixture = {
  key: string;
  classId: string;
  type: string;
  tier: string;
  rarity: string;
  silhouette: string;
  primary?: string;
  secondary?: string;
  glow?: string;
};

export type ComputedRoomGateStyles = Record<
  string,
  {
    core: ComputedVfxPartStyle;
    rift: ComputedVfxPartStyle;
    threshold: ComputedVfxPartStyle;
  }
>;

export type ComputedPlayerSkillPhaseStyles = Record<
  string,
  {
    player: ComputedVfxPartStyle;
    weapon: ComputedVfxPartStyle;
    skillVfx: {
      bladeEchoes: ComputedVfxPartStyle;
      core: ComputedVfxPartStyle;
      cutGrid: ComputedVfxPartStyle;
      finisherWave: ComputedVfxPartStyle;
      groundShear: ComputedVfxPartStyle;
      wave: ComputedVfxPartStyle;
      sparks: ComputedVfxPartStyle;
    };
  }
>;

export type ComputedPlayerHurtMotionStyles = Record<
  string,
  {
    art: ComputedVfxPartStyle;
  }
>;

export type ComputedSkillImpactVfxStyles = Record<
  string,
  {
    core: ComputedVfxPartStyle;
    ring: ComputedVfxPartStyle;
    shards: ComputedVfxPartStyle;
  }
>;

export type ComputedWeaponLayerStyles = Record<
  string,
  {
    layer: {
      width: string;
      height: string;
      filter: string;
    };
    shape: {
      width: string;
      height: string;
      backgroundImage: string;
    };
    before: {
      width: string;
      height: string;
      borderRadius: string;
      clipPath: string;
      transform: string;
      boxShadow: string;
      backgroundImage: string;
    };
    after: {
      width: string;
      height: string;
      borderRadius: string;
      borderTopWidth: string;
      transform: string;
      boxShadow: string;
      backgroundImage: string;
    };
  }
>;

export type RealBrowserKeyCode =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown"
  | "Enter"
  | "Escape"
  | "ShiftLeft"
  | "ShiftRight"
  | "KeyA"
  | "KeyC"
  | "KeyD"
  | "KeyF"
  | "KeyG"
  | "KeyH"
  | "KeyJ"
  | "KeyK"
  | "KeyR"
  | "KeyS"
  | "KeyU"
  | "KeyX"
  | "KeyZ"
  | "Digit1"
  | "Digit2"
  | "Space";

export type RealBrowserAppPage = {
  evaluate<T>(expression: string): Promise<T>;
  waitFor<T>(expression: string, predicate: (value: T) => boolean, timeoutMs?: number): Promise<T>;
  reload(): Promise<void>;
  click(selector: string): Promise<void>;
  keyDown(code: RealBrowserKeyCode): Promise<void>;
  keyUp(code: RealBrowserKeyCode): Promise<void>;
  pressKey(code: RealBrowserKeyCode): Promise<void>;
  setViewport(width: number, height: number): Promise<void>;
  captureScreenshot(path: string): Promise<void>;
};

type CdpResponse<T> = {
  id?: number;
  result?: T;
  error?: {
    message: string;
  };
};

class CdpClient {
  private nextId = 1;
  private pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();

  private constructor(private readonly socket: WebSocket) {
    const rejectPending = (error: Error): void => {
      for (const callback of this.pending.values()) {
        callback.reject(error);
      }
      this.pending.clear();
    };

    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as CdpResponse<unknown>;
      if (message.id === undefined) {
        return;
      }

      const callback = this.pending.get(message.id);
      if (!callback) {
        return;
      }

      this.pending.delete(message.id);
      if (message.error) {
        callback.reject(new Error(message.error.message));
        return;
      }

      callback.resolve(message.result);
    });
    this.socket.addEventListener("close", () => rejectPending(new Error("Browser DevTools websocket closed")));
    this.socket.addEventListener("error", () => rejectPending(new Error("Browser DevTools websocket failed")));
  }

  static async connect(url: string): Promise<CdpClient> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out connecting to browser DevTools websocket")), 5000);
      socket.addEventListener(
        "open",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
      socket.addEventListener(
        "error",
        () => {
          clearTimeout(timer);
          reject(new Error("Failed to connect to browser DevTools websocket"));
        },
        { once: true }
      );
    });

    return new CdpClient(socket);
  }

  async send<T>(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<T> {
    if (this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Browser DevTools websocket is not open");
    }

    const id = this.nextId;
    this.nextId += 1;

    const payload: Record<string, unknown> = { id, method, params };
    if (sessionId) {
      payload.sessionId = sessionId;
    }

    const response = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject
      });
    });

    this.socket.send(JSON.stringify(payload));
    return response;
  }

  close(): void {
    this.socket.close();
  }
}

function isNavigationContextError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return /execution context was destroyed|cannot find context|inspected target navigated/i.test(message);
}

async function closeBrowserClient(client: CdpClient, timeoutMs = 1500): Promise<void> {
  await Promise.race([
    client.send("Browser.close").catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
  ]);
  client.close();
}

export async function runAppInRealBrowser<T>(
  url: string,
  callback: (page: RealBrowserAppPage) => Promise<T>
): Promise<T> {
  const browserPath = findBrowserExecutable();
  const profileRoot = join(process.cwd(), ".codex-local", "tmp", "browser-app-control");
  await mkdir(profileRoot, { recursive: true });
  const profileDir = await mkdtemp(join(profileRoot, "profile-"));
  let browser: ChildProcessWithoutNullStreams | undefined;
  let client: CdpClient | undefined;

  try {
    browser = spawn(
      browserPath,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--autoplay-policy=no-user-gesture-required",
        "--remote-debugging-port=0",
        `--user-data-dir=${profileDir}`,
        "about:blank"
      ],
      { stdio: "pipe", windowsHide: true }
    );

    const browserDebug = await waitForDevToolsEndpoint(profileDir);
    client = await CdpClient.connect(`ws://127.0.0.1:${browserDebug.port}${browserDebug.path}`);
    const target = await client.send<{ targetId: string }>("Target.createTarget", { url });
    const session = await client.send<{ sessionId: string }>("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: true
    });

    await client.send("Target.activateTarget", { targetId: target.targetId });
    await client.send("Page.enable", {}, session.sessionId);
    await client.send("Page.bringToFront", {}, session.sessionId);
    await client.send("Runtime.enable", {}, session.sessionId);
    await client.send("Page.navigate", { url }, session.sessionId);

    const evaluate = async <R>(expression: string): Promise<R> => {
      const evaluation = await client?.send<{
        result: {
          value: R;
        };
        exceptionDetails?: {
          text?: string;
          exception?: {
            description?: string;
          };
        };
      }>(
        "Runtime.evaluate",
        {
          expression,
          awaitPromise: true,
          returnByValue: true
        },
        session.sessionId
      );

      if (!evaluation) {
        throw new Error("Browser client closed before evaluation");
      }

      if (evaluation.exceptionDetails) {
        throw new Error(evaluation.exceptionDetails.exception?.description ?? evaluation.exceptionDetails.text ?? "Browser evaluation failed");
      }

      return evaluation.result.value;
    };

    const dispatchKey = async (type: "keyDown" | "keyUp", code: RealBrowserKeyCode): Promise<void> => {
      const key = keyInfoForCode(code);
      const text = type === "keyDown" ? key.text : "";
      await client?.send(
        "Input.dispatchKeyEvent",
        {
          type: type === "keyDown" && (code === "Enter" || code === "Space") ? "keyDown" : type === "keyDown" ? "rawKeyDown" : "keyUp",
          code,
          key: key.key,
          text,
          unmodifiedText: text,
          windowsVirtualKeyCode: key.windowsVirtualKeyCode,
          nativeVirtualKeyCode: key.windowsVirtualKeyCode,
          autoRepeat: false,
          isKeypad: false
        },
        session.sessionId
      );
    };

    const click = async (selector: string): Promise<void> => {
      let targetPoint: {
        disabled: boolean;
        found: boolean;
        height: number;
        hitTarget: string;
        receivesPointer: boolean;
        selector: string;
        width: number;
        x: number;
        y: number;
      } | undefined;
      const clickabilityDeadline = Date.now() + 1000;

      do {
        targetPoint = await evaluate<{
          disabled: boolean;
          found: boolean;
          height: number;
          hitTarget: string;
          receivesPointer: boolean;
          selector: string;
          width: number;
          x: number;
          y: number;
        }>(`
(async () => {
  const selector = ${JSON.stringify(selector)};
  const element = document.querySelector(selector);
  if (!element) {
    return { disabled: false, found: false, height: 0, hitTarget: "", receivesPointer: false, selector, width: 0, x: 0, y: 0 };
  }

  const target = element.closest("button,[role='button'],a,input,select,textarea") ?? element;
  target.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const currentElement = document.querySelector(selector);
  if (!currentElement) {
    return { disabled: false, found: false, height: 0, hitTarget: "", receivesPointer: false, selector, width: 0, x: 0, y: 0 };
  }
  const currentTarget = currentElement.closest("button,[role='button'],a,input,select,textarea") ?? currentElement;
  const rect = currentTarget.getBoundingClientRect();
  const hitTarget = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  return {
    disabled: Boolean(currentTarget.disabled || currentTarget.getAttribute("disabled") !== null || currentTarget.getAttribute("aria-disabled") === "true"),
    found: true,
    height: rect.height,
    hitTarget: hitTarget instanceof Element ? hitTarget.tagName + "." + hitTarget.className : "",
    receivesPointer: Boolean(hitTarget && (hitTarget === currentTarget || currentTarget.contains(hitTarget))),
    selector,
    width: rect.width,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
})()
`);

        if (targetPoint.found && targetPoint.width > 0 && targetPoint.height > 0 && targetPoint.receivesPointer) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      } while (Date.now() < clickabilityDeadline);

      if (!targetPoint) {
        throw new Error(`Unable to inspect browser click target: ${selector}`);
      }

      if (!targetPoint.found) {
        throw new Error(`No element found for browser click: ${selector}`);
      }

      if (targetPoint.disabled) {
        throw new Error(`Element is disabled for browser click: ${selector}`);
      }

      if (targetPoint.width <= 0 || targetPoint.height <= 0) {
        throw new Error(`Element has no clickable box for browser click: ${selector}`);
      }

      if (!targetPoint.receivesPointer) {
        throw new Error(`Element is not receiving pointer events for browser click: ${selector}; blocker=${targetPoint.hitTarget}`);
      }

      await client?.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseMoved",
          x: targetPoint.x,
          y: targetPoint.y
        },
        session.sessionId
      );
      await client?.send(
        "Input.dispatchMouseEvent",
        {
          button: "left",
          buttons: 1,
          clickCount: 1,
          type: "mousePressed",
          x: targetPoint.x,
          y: targetPoint.y
        },
        session.sessionId
      );
      await client?.send(
        "Input.dispatchMouseEvent",
        {
          button: "left",
          buttons: 0,
          clickCount: 1,
          type: "mouseReleased",
          x: targetPoint.x,
          y: targetPoint.y
        },
        session.sessionId
      );
    };

    const waitFor = async <R>(expression: string, predicate: (value: R) => boolean, timeoutMs = 3000): Promise<R> => {
      const startedAt = Date.now();
      let latest: R | undefined;

      while (Date.now() - startedAt <= timeoutMs) {
        try {
          latest = await evaluate<R>(expression);
          if (predicate(latest)) {
            return latest;
          }
        } catch (error) {
          if (!isNavigationContextError(error)) {
            throw error;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      throw new Error(`Timed out waiting for browser expression. Last value: ${JSON.stringify(latest)}`);
    };

    const reload = async (): Promise<void> => {
      const previousTimeOrigin = await evaluate<number>("performance.timeOrigin");
      await client?.send("Page.reload", {}, session.sessionId);
      await waitFor<number>("performance.timeOrigin", (timeOrigin) => timeOrigin !== previousTimeOrigin, 15000);
    };

    const page: RealBrowserAppPage = {
      evaluate,
      waitFor,
      reload,
      click,
      keyDown: (code) => dispatchKey("keyDown", code),
      keyUp: (code) => dispatchKey("keyUp", code),
      pressKey: async (code) => {
        await dispatchKey("keyDown", code);
        await dispatchKey("keyUp", code);
      },
      setViewport: async (width, height) => {
        await client?.send(
          "Emulation.setDeviceMetricsOverride",
          { width, height, deviceScaleFactor: 1, mobile: width < 720 },
          session.sessionId
        );
      },
      captureScreenshot: async (path) => {
        const result = await client?.send<{ data: string }>("Page.captureScreenshot", { format: "png", fromSurface: true }, session.sessionId);
        if (!result) throw new Error("Browser client closed before screenshot capture");
        await mkdir(join(path, ".."), { recursive: true });
        await writeFile(path, Buffer.from(result.data, "base64"));
      }
    };

    await page.waitFor<boolean>("document.readyState === 'complete' || document.readyState === 'interactive'", Boolean, 5000);

    return await callback(page);
  } finally {
    if (client) {
      await closeBrowserClient(client);
    }
    if (browser) {
      await waitForProcessExit(browser, 2500);
    }
    await removeWithRetry(profileDir);
  }
}

export async function computeEnemyVfxStylesInRealBrowser(
  css: string,
  fixtures: EnemyVfxFixture[]
): Promise<ComputedEnemyVfxStyles> {
  return computeStylesInRealBrowser(
    css,
    fixtures.map((fixture) => enemyVfxFixtureMarkup(fixture)).join("\n"),
    `
      (() => {
        const parts = [
          ["ring", ".enemy-cast-ring"],
          ["core", ".enemy-cast-core"],
          ["trail", ".enemy-cast-trail"]
        ];
        const result = {};
        for (const root of document.querySelectorAll("[data-vfx-fixture]")) {
          result[root.getAttribute("data-vfx-fixture")] = Object.fromEntries(
            parts.map(([name, selector]) => {
              const style = getComputedStyle(root.querySelector(selector));
              return [name, {
                animationName: style.animationName,
                animationDuration: style.animationDuration
              }];
            })
          );
        }
        return result;
      })()
    `
  );
}

export async function computeEnemyModelMotionStylesInRealBrowser(
  css: string,
  fixtures: EnemyModelMotionFixture[]
): Promise<ComputedEnemyModelMotionStyles> {
  return computeStylesInRealBrowser(
    css,
    fixtures.map((fixture) => enemyModelMotionFixtureMarkup(fixture)).join("\n"),
    `
      (() => {
        const result = {};
        for (const root of document.querySelectorAll("[data-enemy-model-fixture]")) {
          const style = getComputedStyle(root.querySelector(".enemy-art"));
          result[root.getAttribute("data-enemy-model-fixture")] = {
            art: {
              animationName: style.animationName,
              animationDuration: style.animationDuration
            }
          };
        }
        return result;
      })()
    `
  );
}

export async function computePlayerHurtMotionStylesInRealBrowser(
  css: string,
  fixtures: PlayerHurtMotionFixture[]
): Promise<ComputedPlayerHurtMotionStyles> {
  return computeStylesInRealBrowser(
    css,
    fixtures.map((fixture) => playerHurtMotionFixtureMarkup(fixture)).join("\n"),
    `
      (() => {
        const result = {};
        for (const root of document.querySelectorAll("[data-player-hurt-fixture]")) {
          const style = getComputedStyle(root.querySelector(".combat-player-art"));
          result[root.getAttribute("data-player-hurt-fixture")] = {
            art: {
              animationName: style.animationName,
              animationDuration: style.animationDuration
            }
          };
        }
        return result;
      })()
    `
  );
}

export async function computeRoomGateStylesInRealBrowser(css: string, fixtures: RoomGateFixture[]): Promise<ComputedRoomGateStyles> {
  return computeStylesInRealBrowser(
    css,
    fixtures.map((fixture) => roomGateFixtureMarkup(fixture)).join("\n"),
    `
      (() => {
        const parts = [
          ["core", ".room-gate-core"],
          ["rift", ".room-gate-rift"],
          ["threshold", ".room-gate-threshold"]
        ];
        const result = {};
        for (const root of document.querySelectorAll("[data-room-gate-fixture]")) {
          result[root.getAttribute("data-room-gate-fixture")] = Object.fromEntries(
            parts.map(([name, selector]) => {
              const style = getComputedStyle(root.querySelector(selector));
              return [name, {
                animationName: style.animationName,
                animationDuration: style.animationDuration
              }];
            })
          );
        }
        return result;
      })()
    `
  );
}

export async function computePlayerSkillPhaseStylesInRealBrowser(
  css: string,
  fixtures: PlayerSkillPhaseFixture[]
): Promise<ComputedPlayerSkillPhaseStyles> {
  return computeStylesInRealBrowser(
    css,
    fixtures.map((fixture) => playerSkillPhaseFixtureMarkup(fixture)).join("\n"),
    `
      (() => {
        const result = {};
        for (const root of document.querySelectorAll("[data-player-phase-fixture]")) {
          const playerStyle = getComputedStyle(root.querySelector(".combat-player-art"));
          const weaponStyle = getComputedStyle(root.querySelector(".combat-weapon"));
          const skillVfxParts = [
            ["bladeEchoes", ".flowing-chain-blade-echoes"],
            ["core", ".skill-core"],
            ["cutGrid", ".flowing-chain-cut-grid"],
            ["finisherWave", ".flowing-chain-finisher-wave"],
            ["groundShear", ".flowing-chain-ground-shear"],
            ["wave", ".skill-wave"],
            ["sparks", ".skill-sparks"]
          ];
          result[root.getAttribute("data-player-phase-fixture")] = {
            player: {
              animationName: playerStyle.animationName,
              animationDuration: playerStyle.animationDuration
            },
            weapon: {
              animationName: weaponStyle.animationName,
              animationDuration: weaponStyle.animationDuration
            },
            skillVfx: Object.fromEntries(
              skillVfxParts.map(([name, selector]) => {
                const style = getComputedStyle(root.querySelector(selector));
                return [name, {
                  animationName: style.animationName,
                  animationDuration: style.animationDuration
                }];
              })
            )
          };
        }
        return result;
      })()
    `
  );
}

export async function computeSkillImpactVfxStylesInRealBrowser(
  css: string,
  fixtures: SkillImpactVfxFixture[]
): Promise<ComputedSkillImpactVfxStyles> {
  return computeStylesInRealBrowser(
    css,
    fixtures.map((fixture) => skillImpactVfxFixtureMarkup(fixture)).join("\n"),
    `
      (() => {
        const parts = [
          ["core", ".skill-impact-core"],
          ["ring", ".skill-impact-ring"],
          ["shards", ".skill-impact-shards"]
        ];
        const result = {};
        for (const root of document.querySelectorAll("[data-skill-impact-fixture]")) {
          result[root.getAttribute("data-skill-impact-fixture")] = Object.fromEntries(
            parts.map(([name, selector]) => {
              const style = getComputedStyle(root.querySelector(selector));
              return [name, {
                animationName: style.animationName,
                animationDuration: style.animationDuration
              }];
            })
          );
        }
        return result;
      })()
    `
  );
}

export async function computeWeaponLayerStylesInRealBrowser(
  css: string,
  fixtures: WeaponLayerFixture[]
): Promise<ComputedWeaponLayerStyles> {
  return computeStylesInRealBrowser(
    css,
    fixtures.map((fixture) => weaponLayerFixtureMarkup(fixture)).join("\n"),
    `
      (() => {
        const result = {};
        for (const root of document.querySelectorAll("[data-weapon-fixture]")) {
          const layer = root.querySelector(".weapon-layer");
          const shape = root.querySelector(".weapon-shape");
          const layerStyle = getComputedStyle(layer);
          const shapeStyle = getComputedStyle(shape);
          const beforeStyle = getComputedStyle(shape, "::before");
          const afterStyle = getComputedStyle(shape, "::after");
          result[root.getAttribute("data-weapon-fixture")] = {
            layer: {
              width: layerStyle.width,
              height: layerStyle.height,
              filter: layerStyle.filter
            },
            shape: {
              width: shapeStyle.width,
              height: shapeStyle.height,
              backgroundImage: shapeStyle.backgroundImage
            },
            before: {
              width: beforeStyle.width,
              height: beforeStyle.height,
              borderRadius: beforeStyle.borderRadius,
              clipPath: beforeStyle.clipPath,
              transform: beforeStyle.transform,
              boxShadow: beforeStyle.boxShadow,
              backgroundImage: beforeStyle.backgroundImage
            },
            after: {
              width: afterStyle.width,
              height: afterStyle.height,
              borderRadius: afterStyle.borderRadius,
              borderTopWidth: afterStyle.borderTopWidth,
              transform: afterStyle.transform,
              boxShadow: afterStyle.boxShadow,
              backgroundImage: afterStyle.backgroundImage
            }
          };
        }
        return result;
      })()
    `
  );
}

async function computeStylesInRealBrowser<T>(css: string, bodyMarkup: string, expression: string): Promise<T> {
  const browserPath = findBrowserExecutable();
  const profileRoot = join(process.cwd(), ".codex-local", "tmp", "browser-computed-style");
  await mkdir(profileRoot, { recursive: true });
  const profileDir = await mkdtemp(join(profileRoot, "profile-"));
  let browser: ChildProcessWithoutNullStreams | undefined;
  let client: CdpClient | undefined;

  try {
    browser = spawn(
      browserPath,
      [
        "--headless=new",
        "--disable-gpu",
        "--disable-background-networking",
        "--no-first-run",
        "--no-default-browser-check",
        "--remote-debugging-port=0",
        `--user-data-dir=${profileDir}`,
        "about:blank"
      ],
      { stdio: "pipe", windowsHide: true }
    );

    const browserDebug = await waitForDevToolsEndpoint(profileDir);
    client = await CdpClient.connect(`ws://127.0.0.1:${browserDebug.port}${browserDebug.path}`);
    const target = await client.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
    const session = await client.send<{ sessionId: string }>("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: true
    });

    await client.send("Runtime.enable", {}, session.sessionId);
    await client.send(
      "Runtime.evaluate",
      {
        expression: `document.open(); document.write(${JSON.stringify(buildFixtureHtml(css, bodyMarkup))}); document.close();`,
        awaitPromise: true
      },
      session.sessionId
    );

    const evaluation = await client.send<{
      result: {
        value: ComputedEnemyVfxStyles;
      };
    }>(
      "Runtime.evaluate",
      {
        expression,
        returnByValue: true
      },
      session.sessionId
    );

    return evaluation.result.value as T;
  } finally {
    if (client) {
      await client.send("Browser.close").catch(() => undefined);
      client.close();
    }
    if (browser) {
      await waitForProcessExit(browser, 2500);
    }
    await removeWithRetry(profileDir);
  }
}

function findBrowserExecutable(): string {
  const candidates = [
    process.env.DNF_BROWSER_EXECUTABLE,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter((candidate): candidate is string => Boolean(candidate));

  const browserPath = candidates.find((candidate) => existsSync(candidate));
  if (!browserPath) {
    throw new Error("No Edge/Chrome executable found for real browser computed-style tests");
  }

  return browserPath;
}

async function waitForDevToolsEndpoint(profileDir: string): Promise<{ port: number; path: string }> {
  const portFile = join(profileDir, "DevToolsActivePort");

  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const [portText, path] = (await readFile(portFile, "utf8")).trim().split(/\r?\n/);
      const port = Number(portText);
      if (Number.isFinite(port) && path) {
        return { port, path };
      }
    } catch {
      // Browser has not written DevToolsActivePort yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Timed out waiting for browser DevToolsActivePort");
}

async function waitForProcessExit(process: ChildProcessWithoutNullStreams, timeoutMs: number): Promise<void> {
  if (process.exitCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      if (!process.killed) {
        process.kill();
      }
      resolve();
    }, timeoutMs);

    process.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function removeWithRetry(path: string): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100 + attempt * 50));
    }
  }

  throw lastError;
}

function buildFixtureHtml(css: string, bodyMarkup: string): string {
  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>${css.replace(/<\/style/gi, "<\\/style")}</style>
      </head>
      <body>
        ${bodyMarkup}
      </body>
    </html>`;
}

function keyInfoForCode(code: RealBrowserKeyCode): { key: string; text: string; windowsVirtualKeyCode: number } {
  const keyMap: Record<RealBrowserKeyCode, { key: string; text: string; windowsVirtualKeyCode: number }> = {
    ArrowLeft: { key: "ArrowLeft", text: "", windowsVirtualKeyCode: 37 },
    ArrowRight: { key: "ArrowRight", text: "", windowsVirtualKeyCode: 39 },
    ArrowUp: { key: "ArrowUp", text: "", windowsVirtualKeyCode: 38 },
    ArrowDown: { key: "ArrowDown", text: "", windowsVirtualKeyCode: 40 },
    Enter: { key: "Enter", text: "\r", windowsVirtualKeyCode: 13 },
    Escape: { key: "Escape", text: "", windowsVirtualKeyCode: 27 },
    ShiftLeft: { key: "Shift", text: "", windowsVirtualKeyCode: 16 },
    ShiftRight: { key: "Shift", text: "", windowsVirtualKeyCode: 16 },
    KeyA: { key: "a", text: "a", windowsVirtualKeyCode: 65 },
    KeyC: { key: "c", text: "c", windowsVirtualKeyCode: 67 },
    KeyD: { key: "d", text: "d", windowsVirtualKeyCode: 68 },
    KeyF: { key: "f", text: "f", windowsVirtualKeyCode: 70 },
    KeyG: { key: "g", text: "g", windowsVirtualKeyCode: 71 },
    KeyH: { key: "h", text: "h", windowsVirtualKeyCode: 72 },
    KeyJ: { key: "j", text: "j", windowsVirtualKeyCode: 74 },
    KeyK: { key: "k", text: "k", windowsVirtualKeyCode: 75 },
    KeyR: { key: "r", text: "r", windowsVirtualKeyCode: 82 },
    KeyS: { key: "s", text: "s", windowsVirtualKeyCode: 83 },
    KeyU: { key: "u", text: "u", windowsVirtualKeyCode: 85 },
    KeyX: { key: "x", text: "x", windowsVirtualKeyCode: 88 },
    KeyZ: { key: "z", text: "z", windowsVirtualKeyCode: 90 },
    Digit1: { key: "1", text: "1", windowsVirtualKeyCode: 49 },
    Digit2: { key: "2", text: "2", windowsVirtualKeyCode: 50 },
    Space: { key: " ", text: " ", windowsVirtualKeyCode: 32 }
  };

  return keyMap[code];
}

function enemyVfxFixtureMarkup(fixture: EnemyVfxFixture): string {
  const attackDurationMs = fixture.attackDurationMs ?? 660;
  const vfxDurationMs = fixture.vfxDurationMs ?? 460;
  const cue = fixture.cue ?? "";
  const hitIndex = fixture.hitIndex?.toString() ?? "";

  return `<div
    data-vfx-fixture="${escapeAttribute(fixture.key)}"
    class="enemy-skill-vfx enemy-skill-${escapeAttribute(fixture.skillId)}"
    data-enemy-skill-vfx="${escapeAttribute(fixture.skillId)}"
    data-enemy-vfx-cue="${escapeAttribute(cue)}"
    data-enemy-attack-hit-index="${escapeAttribute(hitIndex)}"
    data-enemy-attack-duration-ms="${attackDurationMs}"
    data-enemy-vfx-duration-ms="${vfxDurationMs}"
    style="--enemy-attack-duration: ${attackDurationMs}ms; --enemy-vfx-duration: ${vfxDurationMs}ms;"
  >
    <i class="enemy-cast-ring"></i>
    <i class="enemy-cast-core"></i>
    <i class="enemy-cast-trail"></i>
  </div>`;
}

function roomGateFixtureMarkup(fixture: RoomGateFixture): string {
  const durationMs = fixture.durationMs ?? 480;

  return `<div
    data-room-gate-fixture="${escapeAttribute(fixture.key)}"
    class="room-gate room-gate-open"
    data-room-gate="true"
    data-room-gate-vfx="${escapeAttribute(fixture.vfx)}"
    data-room-gate-transition="${escapeAttribute(fixture.transition)}"
    style="--room-transition-duration: ${durationMs}ms;"
  >
    <span class="room-gate-core"></span>
    <span class="room-gate-rift"></span>
    <span class="room-gate-threshold"></span>
  </div>`;
}

function enemyModelMotionFixtureMarkup(fixture: EnemyModelMotionFixture): string {
  const durationMs = fixture.durationMs ?? 520;
  const skillClass = fixture.skillId ? ` actor-enemy-skill-${escapeAttribute(fixture.skillId)}` : "";

  return `<div
    data-enemy-model-fixture="${escapeAttribute(fixture.key)}"
    class="combat-actor combat-enemy combat-enemy-boss"
    data-enemy-motion="${escapeAttribute(fixture.motion)}"
    data-enemy-attack-skill-id="${escapeAttribute(fixture.skillId ?? "")}"
    data-boss-phase-skill-id="${escapeAttribute(fixture.bossPhaseSkillId ?? "")}"
    data-enemy-model-vfx-cue="${escapeAttribute(fixture.cue ?? "")}"
    style="--enemy-attack-duration: ${durationMs}ms; --model-scale-x: -1;"
  >
    <span class="enemy-art actor-model actor-model-${escapeAttribute(fixture.motion)}${skillClass}"></span>
  </div>`;
}

function playerHurtMotionFixtureMarkup(fixture: PlayerHurtMotionFixture): string {
  return `<div
    data-player-hurt-fixture="${escapeAttribute(fixture.key)}"
    class="combat-actor combat-player"
    data-player-motion="hit"
    data-player-hurt-feedback-cue="${escapeAttribute(fixture.feedbackCue)}"
    style="--model-scale-x: 1;"
  >
    <span class="combat-player-art actor-model actor-model-hit"></span>
  </div>`;
}

function playerSkillPhaseFixtureMarkup(fixture: PlayerSkillPhaseFixture): string {
  const durationMs = fixture.durationMs ?? 1300;
  const skillId = fixture.skillId ?? "flowing-light-chain";
  const preset = fixture.preset ?? "liuli-light-chain";
  const weaponArc = fixture.weaponArc ?? "chain-cut";
  const vfxShape = fixture.vfxShape ?? "flowing-chain";
  const phase = fixture.phase ?? "";
  const cue = fixture.cue ?? "";

  return `<div
    data-player-phase-fixture="${escapeAttribute(fixture.key)}"
    class="combat-player"
    data-player-motion="skill"
    data-skill-animation-preset="${escapeAttribute(preset)}"
    data-skill-weapon-arc="${escapeAttribute(weaponArc)}"
    data-player-skill-hit-phase="${escapeAttribute(phase)}"
    data-player-skill-vfx-cue="${escapeAttribute(cue)}"
    style="--skill-duration: ${durationMs}ms;"
  >
    <span class="combat-player-art"></span>
    <span class="combat-weapon" data-weapon-hit-phase="${escapeAttribute(phase)}" data-weapon-vfx-cue="${escapeAttribute(cue)}"></span>
    <span
      class="player-skill-vfx skill-vfx-${escapeAttribute(skillId)} skill-vfx-shape-${escapeAttribute(vfxShape)}"
      data-player-skill-vfx="${escapeAttribute(skillId)}"
      data-skill-vfx-shape="${escapeAttribute(vfxShape)}"
      data-hit-phase="${escapeAttribute(phase)}"
      data-vfx-cue="${escapeAttribute(cue)}"
      data-vfx-action="skill"
    >
      <i class="skill-core"></i>
      <i class="skill-wave"></i>
      <i class="skill-sparks"></i>
      <i class="flowing-chain-blade-echoes"></i>
      <i class="flowing-chain-cut-grid"></i>
      <i class="flowing-chain-ground-shear"></i>
      <i class="flowing-chain-finisher-wave"></i>
    </span>
  </div>`;
}

function skillImpactVfxFixtureMarkup(fixture: SkillImpactVfxFixture): string {
  const durationMs = fixture.durationMs ?? 680;
  const phase = fixture.phase ?? "";
  const cue = fixture.cue ?? "";
  const statusClass = fixture.status ? "player-status-vfx " : "";

  return `<div
    data-skill-impact-fixture="${escapeAttribute(fixture.key)}"
    class="${statusClass}skill-impact-burst skill-impact-shape-${escapeAttribute(fixture.shape)}"
    data-impact-vfx-shape="${escapeAttribute(fixture.shape)}"
    data-hit-phase="${escapeAttribute(phase)}"
    data-vfx-cue="${escapeAttribute(cue)}"
    style="--skill-duration: ${durationMs}ms;"
  >
    <span class="skill-impact-core"></span>
    <span class="skill-impact-ring"></span>
    <span class="skill-impact-shards"></span>
    </div>`;
}

function weaponLayerFixtureMarkup(fixture: WeaponLayerFixture): string {
  const primary = fixture.primary ?? "#334155";
  const secondary = fixture.secondary ?? "#93c5fd";
  const glow = fixture.glow ?? "#93c5fd";

  return `<div data-weapon-fixture="${escapeAttribute(fixture.key)}">
    <span
      class="weapon-layer weapon-layer-${escapeAttribute(fixture.rarity)}"
      data-weapon-appearance-id="weapon-${escapeAttribute(fixture.classId)}-${escapeAttribute(fixture.tier)}"
      data-weapon-class-id="${escapeAttribute(fixture.classId)}"
      data-weapon-type="${escapeAttribute(fixture.type)}"
      data-weapon-tier="${escapeAttribute(fixture.tier)}"
      data-weapon-rarity="${escapeAttribute(fixture.rarity)}"
      style="--weapon-primary: ${escapeAttribute(primary)}; --weapon-secondary: ${escapeAttribute(secondary)}; --weapon-glow: ${escapeAttribute(glow)};"
    >
      <span class="weapon-shape weapon-shape-${escapeAttribute(fixture.silhouette)}"></span>
    </span>
  </div>`;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
