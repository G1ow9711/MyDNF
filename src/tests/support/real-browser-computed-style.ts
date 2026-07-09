import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";

export type EnemyVfxFixture = {
  key: string;
  skillId: string;
  cue?: string;
  hitIndex?: number;
  attackDurationMs?: number;
  vfxDurationMs?: number;
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

export type RoomGateFixture = {
  key: string;
  vfx: string;
  transition: string;
  durationMs?: number;
};

export type PlayerSkillPhaseFixture = {
  key: string;
  phase?: string;
  cue?: string;
  durationMs?: number;
};

export type SkillImpactVfxFixture = {
  key: string;
  shape: string;
  phase?: string;
  cue?: string;
  durationMs?: number;
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
      core: ComputedVfxPartStyle;
      wave: ComputedVfxPartStyle;
      sparks: ComputedVfxPartStyle;
    };
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
            ["core", ".skill-core"],
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

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 150));
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

function playerSkillPhaseFixtureMarkup(fixture: PlayerSkillPhaseFixture): string {
  const durationMs = fixture.durationMs ?? 760;
  const phase = fixture.phase ?? "";
  const cue = fixture.cue ?? "";

  return `<div
    data-player-phase-fixture="${escapeAttribute(fixture.key)}"
    class="combat-player"
    data-player-motion="skill"
    data-skill-animation-preset="liuli-light-chain"
    data-skill-weapon-arc="chain-cut"
    data-player-skill-hit-phase="${escapeAttribute(phase)}"
    data-player-skill-vfx-cue="${escapeAttribute(cue)}"
    style="--skill-duration: ${durationMs}ms;"
  >
    <span class="combat-player-art"></span>
    <span class="combat-weapon" data-weapon-hit-phase="${escapeAttribute(phase)}" data-weapon-vfx-cue="${escapeAttribute(cue)}"></span>
    <span
      class="player-skill-vfx skill-vfx-flowing-light-chain skill-vfx-shape-flowing-chain"
      data-player-skill-vfx="flowing-light-chain"
      data-skill-vfx-shape="flowing-chain"
      data-hit-phase="${escapeAttribute(phase)}"
      data-vfx-cue="${escapeAttribute(cue)}"
      data-vfx-action="skill"
    >
      <i class="skill-core"></i>
      <i class="skill-wave"></i>
      <i class="skill-sparks"></i>
    </span>
  </div>`;
}

function skillImpactVfxFixtureMarkup(fixture: SkillImpactVfxFixture): string {
  const durationMs = fixture.durationMs ?? 680;
  const phase = fixture.phase ?? "";
  const cue = fixture.cue ?? "";

  return `<div
    data-skill-impact-fixture="${escapeAttribute(fixture.key)}"
    class="skill-impact-burst skill-impact-shape-${escapeAttribute(fixture.shape)}"
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

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
