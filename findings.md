# Findings & Decisions

## Requirements
- User wants a single-player game inspired by Dungeon Fighter Online.
- Must brainstorm and design multiple features before build.
- Must automatically find needed skills and reference material.
- Must support flashy skill visuals and smooth, impactful combat feel.
- Must include multiple in-game ecosystems: trade, enhancement, amplification.
- Must include shop system with costumes, gift packs, and items.
- High playability requested.
- Multiple agents may be used where useful.

## Research Findings
- Project inspection: `F:\My_DNF` is effectively empty except `.codex-local`.
- `git status --short` reports this is not a git repository.
- No existing source files found by `rg --files`.
- User accepted browser visual companion for mockups/diagrams.
- The provided `start-server.sh` path needs bash/WSL in this PowerShell environment; WSL has no distro installed.
- The brainstorm server is plain Node (`server.cjs`) and can be launched directly with `BRAINSTORM_DIR`, `BRAINSTORM_HOST`, and `BRAINSTORM_URL_HOST`.
- Official DFO positioning: arcade-style belt/side-scrolling action RPG with many character archetypes and in-game purchases that can include random items.
- Gameplay references to carry into original design:
  - 2D room-by-room brawler flow with enemy hordes.
  - Skill hotkeys plus optional command-input skills.
  - Skills can be cancelable from normal attacks.
  - Class fantasy should be clear from weapon/skill style.
- Equipment-system references to adapt:
  - Reinforcement improves gear through chance/cost loops.
  - Refinement can be safer and bounded for weapon-specific growth.
  - Amplification adds all reinforcement-style gains plus extra base stats, but requires setup and harsher fail penalties.
  - High-level failures can reduce level or destroy/reset equipment; protection tickets can soften the risk.
- Trading/economy references to adapt:
  - Personal trade exchanges items and gold.
  - Auction hall supports buy/sell/register flow, categories, mail delivery, and recent trade-price context.
  - Raid/loot auction pattern can become a single-player "contract auction" or NPC market simulator.
- Shop/cosmetic references to adapt:
  - CERA-style premium shop maps well to offline "Star Gem" currency earned or granted locally.
  - Avatar/costume sets can alter appearance, stats, and set bonuses.
  - Gift packs can bundle avatar boxes, enhancement materials, protection tickets, and consumables.
  - Some packs include random boxes; offline implementation should display rates and avoid real-money mechanics.
- Skill constraints active:
  - `caveman` style active from user AGENTS instructions.
  - `planning-with-files` required because task is complex.
  - `superpowers:brainstorming` required before creative implementation; design approval is a hard gate.
- User added visual quality requirement: character image must be detailed. Updated design requires high-detail concept art, portrait, battle sprite/sprite-sheet, visible costume layers, and no placeholder player art in final playable delivery.
- User added environment quality requirement: environments must be realistic and good-looking. Updated design requires detailed 2.5D dungeon/town scene art, parallax layers, realistic material/light/atmosphere detail, and no placeholder backgrounds in final playable delivery.
- Visual asset audit found CSS-only shapes were not enough for the user's detailed character and realistic environment requirement; generated original bitmap assets are now stored under `public/assets` and referenced by town/combat renders.
- User replied `C` after environment-art screen; interpreted as selecting interactive town scene emphasis. Character style remains recommended A unless changed.
- User requested Chinese-style maps. Updated environment direction to Chinese fantasy-industrial maps: interactive forge market town, abandoned kiln alley, and liuli furnace dungeon.
- User requested background music consideration. Updated design to include original/licensed Chinese fantasy-industrial BGM, adaptive town/dungeon/boss layers, SFX categories, and audio volume controls.
- User requested story quest mode. Updated design to include `烬璃纪元` premise, prologue, two chapters, epilogue hook, quest categories, quest UI, rewards, and data-driven quest tracking.
- User requested equipment levels, Epic sets, and multiple build archetypes. Updated design to include 12 gear slots, level 1-50 equipment, rarity tiers, 5 Epic sets, 2/3/5 set bonuses, mixed builds, build tags, and 3 saved loadouts.
- User expanded the goal on 2026-07-04: final deliverable needs at least four base classes, class advancement gameplay, and a complete mature shippable version rather than a one-class vertical slice.
- Completion audit found that data/model support is not enough for the user's "可玩性高" requirement; class selection and advancement must also be exposed in the player-facing UI and reducer actions.
- Quest progression must be checked through app actions, not only through pure quest-system tests; reinforcement initially failed this audit until the reducer emitted quest events.
- Combat audit found class skills and keyboard mapping existed in model code, but the player-facing combat UI needed concrete skill slots and hotkey binding before the combat loop felt directly playable.
- Economy audit found `Trade Credits` absent even though the acceptance checklist required distinct Gold, Valor Token, and Trade Credit usage; NPC trade now uses `tradeCredit` / `商契`.
- Native browser `confirm` dialogs can block the current in-app browser automation session; reset-save confirmation should be validated primarily through reducer tests plus UI smoke coverage.
- Browser automation again timed out on 2026-07-04 during asset visual verification, including basic tab inspection after reconnect; rely on tests/build and asset file verification until browser-control session state is recovered.
- Inventory audit found system helpers for equip/sell/dismantle existed, but the player-facing inventory panel needed direct controls plus lock protection before it satisfied the economy checklist.
- Gear audit found Epic set definitions were present, but active 2/3/5-piece effects and mixed build tags needed explicit evaluation and UI evidence.
- Audio audit found settings sliders existed as static markup; they now read/write `AudioState` through reducer actions.
- Playback audit found audio commands were queued but not rendered; the app now creates procedural WebAudio BGM/SFX from command plans after user interaction, with no-op fallback when WebAudio is unavailable.
- Auction audit found listing fees and sale settlement existed, but recent prices and demand state were absent; market now records sold prices by catalog gear id and derives UI-facing suggested price, fee, and cold/normal/hot demand.
- Final delivery branch `feature/vertical-slice` is pushed to GitHub; local and remote refs match after the final-record commit.
- Final automated verification passed with `npm test` (116 tests), `npm run build`, and `git diff --check`.
- Official DFO character reference notes broad class/advancement structure: 16 classes and 60+ advancements. This supports adding class breadth while keeping all names/mechanics original.
- Official DFO advancement/awakening guide notes advancement grants subclass-specific skills and later awakening milestones; this project adapts the advancement concept into original offline level/story-gated class paths.
- Spec naming was adjusted to use Chinese display names for user-facing content: `烬璃纪元`, `烬拳卫`, `灰窑巷`, `琉璃熔炉`, `炉山市集`, and Chinese Epic set names.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Build original DNF-inspired design rather than cloning assets/names/content | Keeps project legally safer while delivering requested feel and systems |
| Use project-local `.codex-local` for temp/cache/runtime artifacts | Matches user storage instructions |
| Delay scaffolding and code until approved design | Required by brainstorming skill |
| Use TypeScript + Vite + Canvas for first playable version | Small dependency surface, easy local browser play, enough for 2.5D action prototype |
| Use Chinese commit messages | User explicitly required all git commit messages to be Chinese |
| Task 2 uses current exact Chinese display strings | Current task requires `烬璃纪元`, `烬拳卫`, `灰窑巷`, and `琉璃熔炉`; older plan text contains mojibake and is not source data |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Empty workspace means no local conventions exist | Use conservative web game architecture after design approval unless user picks another target |
| Not a git repository | Do not commit design doc unless user wants git initialized; note mismatch with brainstorming skill commit instruction |

## Resources
- Local project root: `F:\My_DNF`
- GitHub repository: https://github.com/G1ow9711/MyDNF
- Planning files: `F:\My_DNF\task_plan.md`, `F:\My_DNF\findings.md`, `F:\My_DNF\progress.md`
- Implementation plan: `F:\My_DNF\docs\superpowers\plans\2026-07-03-mydnf-vertical-slice-implementation.md`
- DFO official equipment guide: https://www.dfoneople.com/gameinfo/guide/Advanced-Game-Information/Equipment-System
- DFO official trading and auction guide: https://www.dfoneople.com/gameinfo/guide/Advanced-Game-Information/Advanced-Game-System/Trading-and-Auction-Hall
- DFO official avatars guide: https://www.dfoneople.com/gameinfo/guide/Advanced-Game-Information/Advanced-Game-System/Avatars
- DFO official CERA items guide: https://www.dfoneople.com/gameinfo/guide/Advanced-Game-Information/Advanced-Game-System/CERA-Items
- DFO official amplification support sale example: https://www.dfoneople.com/news/sales/4822/Amazing-Amplification-Support-Sale
- DFO overview/gameplay reference: https://en.wikipedia.org/wiki/Dungeon_Fighter_Online
- DFO official characters reference: https://www.dfoneople.com/gameinfo/character
- DFO official advancement and awakening guide: https://www.dfoneople.com/gameinfo/guide/Start-Leveling%21/Basic-Leveling/Advancement-and-Awakening

## Visual/Browser Findings
- Visual companion server started at `http://localhost:50336`.
- Screen directory: `F:\My_DNF\.superpowers\brainstorm\node-1783087863\content`
- State directory: `F:\My_DNF\.superpowers\brainstorm\node-1783087863\state`
- First visual screen shows 3 first-version directions:
  - A: combat-first slice
  - B: hybrid playable RPG, recommended
  - C: economy/system sandbox
- Third visual screen shows character-art direction options:
  - A: refined 2D action illustration, recommended
  - B: high-definition pixel/frame animation
  - C: semi-3D rendered cutout
- Fourth visual screen shows environment-art direction options:
  - A: realistic 2.5D painted scene, recommended
  - B: rendered 3D scene plates
  - C: interactive town scene
- Fifth visual screen shows Chinese-style map direction: forge market town, kiln alley dungeon, liuli furnace dungeon, and scene-integrated system hotspots.
- Sixth visual screen shows equipment levels, gear slots, Epic sets, and build archetypes.
- In-app browser was refreshed and latest equipment-build screen contains `装备等级`.

---
*Update this file after every 2 view/browser/search operations.*

## Combat Visibility Fix Findings
- Combat visibility bug root cause: battle data existed, but the live combat DOM lacked visible actor sprites, so the background could hide the play state. The fix renders player and enemy actors directly in `renderCombatScene()`.
- Cleared combat rooms need explicit UI state because users can keep trying attacks after enemies reach 0 HP. The fix shows a clear banner, disables attack controls, highlights settlement, and keeps reducer behavior in Chinese.
- Browser verification on `http://127.0.0.1:5174/` confirmed visible player actor, enemy actors, prominent task tracker, defeated enemy state, and cleared-room settlement prompt.

## DNF-Style Control Findings
- Strict gameplay audit found the previous room settlement button was effectively a skip/auto-kill button because UI code called `defeatAll()` before `finishRoom()`. This contradicted room-clear combat flow and has been removed.
- Live keyboard audit found attack/skill keys worked, but movement keys were not wired to the app reducer. Arrow keys and WASD now dispatch movement through `stepCombat()`, with Shift passed as dash.
- Browser acceptance confirmed PC controls on the local app: ArrowRight moved the actor, X performed a basic attack and reduced enemy HP, and settlement is blocked while enemies are alive.

## Single-Player Save Findings
- Save validation and manual save/load already existed in `src/systems/save.ts`, but `createAppModel()` previously ignored `SAVE_KEY` during startup, so refreshing the browser always created a new state.
- Mounted UI actions previously changed reducer state without persisting it. The app now auto-saves when a dispatched action changes `GameState`, while manual load and reset-save remain explicit exceptions.
- Settings now explains the local single-player save behavior so players can see that role, equipment, quest, currency, and shop progress are stored locally.

## Combat VFX and Motion Findings
- Open-source game-engine patterns worth borrowing are structural, not asset-level: keep VFX as a separate render layer, drive actor animation from state/events, and define reusable effect ids instead of hardcoding every frame.
- The current combat model already emits hit events with action, target id, damage, and hitstop. That is enough to drive player attack motion, target hit reaction, skill burst effects, and floating damage without adding a full animation engine yet.
- Monster skill effects now exist as visual telegraphs by enemy tier: ash ember spit for trash enemies, zheng shockwave for elites, and taotie flame breath for bosses. A later AI pass can attach these telegraphs to real monster attacks and player damage windows.
- Review found old hit events could otherwise leak motion/VFX into movement or the next room. Hit events now carry timestamps, UI/render filters old hits to the recent impact window, and room settlement resets old hit events.
- Review also found malformed saves could be overwritten by auto-save after fallback startup. The app now disables auto-save for a malformed-save fallback until the player explicitly saves or resets.
- Vite must ignore `.codex-local` because Edge headless browser profiles create locked cache files under that project-local temp path; otherwise dev-server file watching can crash on Windows with `EBUSY`.
- Enemy skills are now real combat events instead of permanent decoration: monsters enter windup, resolve hit/miss on an impact frame, apply player HP damage, trigger short invulnerability, and can fail the run when HP reaches zero.
- UI motion now follows those events directly: enemy bitmap models enter `actor-model-attack`, player bitmap models enter `actor-model-hit` or `actor-model-defeated`, and monster skill VFX only renders while recent `enemy-attack` events exist.
- Mounted gameplay now has a 140 ms combat tick, so monster AI advances while the player pauses instead of only progressing on click/key actions.
- Class skill cooldowns now use the catalog `cooldownMs` field in combat state. Skill buttons expose remaining cooldown, hotkeys filter cooling skills, and reducer-level protection prevents stale DOM clicks from recasting.
- Latest read-only gameplay audit after cooldown found the next P0 gaps are equipment/set/build stats not entering combat formulas and class resources still sharing a generic heat model.
- Equipment is now part of combat math: equipped gear stats, active Epic set bonuses, reinforcement levels, amplification stats, and advancement passives feed max HP, outgoing damage, incoming damage reduction, cooldown speed, and resource gain.
- Directional model-motion audit found that adding `actor-model-*` classes was not enough by itself. Player and monster `<img>` nodes now carry CSS variables for facing, attack lunge, and hurt knockback, and keyframes consume those variables so left-facing attacks and monster lunges move the bitmap model in the correct direction.
- Hurt-lock synchronization matters for model credibility: if the player can attack during the recent hurt window while the UI still renders `actor-model-hit`, combat state and model motion disagree. The combat layer now blocks player actions while `hurtLockUntilMs` is active.
- Player attacks now use real hitboxes instead of "first alive enemy". Light/heavy attacks check facing, horizontal distance, lane distance, and nearest alive target, while out-of-range attacks emit miss events so the player bitmap still animates a whiff.
- Skill tags now affect hitbox behavior: area/trap/pull/ultimate skills can hit several enemies, range skills reach farther, and dash/slam/burst skills use tighter front ranges. This is a first playable layer; per-skill custom scripts remain a later fidelity gap.
- Browser validation split whiff and hit scenarios because the live 140 ms combat tick can let monsters interrupt if the automation waits too long. Final evidence showed far light attacks kept both enemies at 80/80 with no impact, then a refreshed near-range light attack reduced the first enemy to 54/80 and rendered one hit motion plus one impact.
- Four class resource identities now enter combat instead of only the class panel. `CombatPlayer.resource` snapshots the selected class resource id, display name, max, and current value from catalog data while `player.heat` remains a compatibility storage alias.
- Combat HUD, skill-button disable state, skill hotkeys, and skill casting now use the selected class resource value. Browser validation confirmed Liuli Blademage displays `璃息 40/100`, `liuli-rain` carries `data-resource-id="prism"`, and casting reduces it to `璃息 16/100`.
- Resource persistence now writes the combat resource value back to `GameState.player.heat` on room settlement. This preserves current save compatibility but is still a transitional model; a future migration should rename storage away from `heat` or add a proper resource field.
- Remaining class-resource fidelity gap: Ember, Liuli, Ink, and Iron still share the same basic gain/spend curve. DNF-like class identity needs unique rules such as heat burst windows, prism cycling, ink marks/traps, and guard gain from blocking or being hit.
- First-pass class-resource mechanics now exist in combat: Ember burst/ultimate skills gain high-heat bonus damage, Liuli alternate-skill casting refunds prism and shortens cooldown, Ink marking skills add target marks and detonation skills consume marks for bonus damage, and Iron Guardian gains guard resource when hit.
- UI now exposes structured class mechanic state for browser verification: `.combat-scene` carries class/resource data, `.combat-player` carries prism chain and last skill, and `.combat-enemy` carries ink marks.
- Browser validation confirmed the mechanics on the live app: Liuli `mirror-arc` changed prism to `34` with chain `1`, Ink `marking-bolt` put `2` marks on the hit enemy, and Iron Guardian gained guard to `12` while the player model was in hit motion.
- Remaining fidelity gap after this pass: the rules are mechanically distinct but still lightweight; next work should give individual skill tags real effects such as shield mitigation, trap zones, evade windows, reflect behavior, stagger/armor break, and per-target VFX.
- Skill status tags now have real combat effects instead of only broad hitbox behavior: shield reduces the next monster hit, evade turns a monster impact into `miss`, reflect returns damage to the attacker, trap/control delays monster attacks, and guard-break/stagger interrupt monster windup.
- Actor model motion now follows these status effects directly. Player bitmap nodes can render `actor-model-shield`, `actor-model-dodge`, and `actor-model-counter`; monster bitmap nodes can render `actor-model-controlled` and `actor-model-guard-break`.
- Browser validation confirmed the new state/action link on the live app: `molten-wall`, `mirror-arc`, `crow-feint`, `ink-snare`, and `earth-furnace-breaker` each produced the expected model class and structured DOM state.
- Remaining fidelity gap after status-action pass: these are still window/state mechanics rather than bespoke per-skill animation timelines. Later work should add per-skill multi-frame VFX, better class-specific hero art, and enemy-specific skill patterns.
- Class identity now has a visual equipment layer: each base class has dedicated hero art, five weapon appearance tiers, class-panel progression chips, and inventory weapon cards that choose the current appearance from class id plus weapon level.
- DNF-style hit feel now has a separate hit combo counter plus timed airborne and knockdown states. This is distinct from the old three-step light-attack `comboStep`, so the HUD can show total chain count while the combat layer still uses `comboStep` for cancel windows.
