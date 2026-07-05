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
- Weapon appearance audit found the old weapon system stopped at inventory/class-panel icons. Equipped weapons now carry class weapon type, rarity, role flavor, and town/combat mount anchors, and the current weapon renders as a visible town/combat actor layer that follows combat attack motion.
- Weapon asset upgrade added 20 real SVG files under `public/assets/weapons`, one for each 4-class x 5-tier weapon appearance. UI now loads these SVGs through `<img>` in inventory, class progression, town, and combat, while CSS silhouette remains only a hidden fallback.
- Skill-animation audit found the current combat event stream is sufficient for presentation lookup because hit and miss events already carry `skillId`, `statusTags`, and `actionTags`.
- Skill-animation audit also found the missing fidelity is catalog/UI/CSS data flow: `ClassSkillDefinition` lacks explicit animation metadata, `renderCombatActors()` renders every skill as generic `actor-model-skill`, `weaponLayerMarkup()` has no skill arc data, and `renderCombatVfx()` only exposes `data-player-skill-vfx`.
- The next implementation should keep combat math stable and look up animation metadata by `skillId`, then expose browser-stable attributes such as `data-skill-animation-preset`, `data-weapon-arc`, and `data-skill-vfx-shape`.
- Skill-specific animation metadata now covers every class skill with preset, duration, hit frame, lunge distance, weapon arc, VFX shape, and VFX anchor. UI reads the latest hit or miss player skill event, so a missed skill still renders its class-specific VFX and weapon arc.
- Browser validation confirmed Liuli Rain renders `player-liuli-rain-cast`, `weapon-fan-arc`, `glass-rain-fall`, a loaded mythic Liuli weapon SVG, and loaded Liuli hero art.

## Feature Flow Closure Findings
- Latest user direction lowered near-term character modeling priority: keep character/monster models simple enough for now and prioritize full playable feature flow.
- Follow-up clarification: "simple models" only relaxes static model fidelity. It does not relax action quality; combat motion smoothness, hit feel, player/enemy action changes, skill VFX, and monster skill VFX remain strict requirements.
- Read-only agent audit confirmed core reducers and systems exist, but the player-facing weak points were: smith panel fixed to the first inventory item, shop panel exposing only one of three SKUs, and no visible in-game checklist showing combat, quest, inventory, reinforce, amplify, shop, trade, and save progress.
- The smith reducer already supported explicit `gearId`; the missing layer was UI selection. The new smith list now exposes per-gear reinforce/amplify actions and disables amplify on non-Echo Slot gear.
- Advancement was not naturally reachable from play because no room experience was applied to `player.experience` or `player.level`. Room settlement now awards XP, levels use a simple 100 XP prototype threshold, and advancement can be reached after dungeon play once the prologue gate is ready/completed.
- Browser validation on `http://127.0.0.1:5174/` confirmed the quest flow checklist renders eight steps, shop renders `liuli-gift-pack`, `reinforcement-pack`, and `forge-costume-pack`, and smith renders a gear selection list with per-item upgrade buttons.

## Strict Combat Presentation Findings
- User clarified the acceptance split: character and monster model fidelity may stay lightweight for the first complete playable loop, but combat motion smoothness, hit feel, skill VFX, monster telegraphs, monster skill effects, and action-state changes are strict.
- Read-only review caught that `hitFrameMs` was previously metadata only: damage events, hit sparks, and hitstop still happened at input time. Combat hit events now occur at `elapsedMs + inputToHitMs`, and UI only treats hit events as active after their true hit frame.
- Player action presentation now starts from input time, while hit reaction, damage numbers, hit sparks, and screen shake start from the hit frame. This keeps anticipation/cast motion separate from impact feedback.
- Monster skill rendering is phase separated: windup events render telegraph zones only, while active/miss events render the actual monster skill VFX. This prevents the old mixed state where a monster could show warning and impact effect as the same phase.
- Skill animation duration now flows into DOM/CSS through `--skill-duration`, so player model skill casts, weapon arcs, and skill VFX child animations consume catalog animation timing instead of only preserving HTML metadata.
- Browser validation on `http://127.0.0.1:5174/` confirmed monster `ash-ember-spit` windup telegraph and later active/miss skill VFX on the live page. Screenshot saved at `.codex-local/tmp/combat-vfx-phase-check.png`.

## Skill Script V1 Findings
- User clarified that lightweight character/monster modeling is acceptable for the current playable slice, but combat motion smoothness, hit feel, player/enemy action changes, skill VFX, and monster skill VFX remain strict requirements.
- Read-only skill audit found the biggest skill-fidelity gap was broad tag hitboxes without per-skill behavior. The first targeted script pass now covers dash startup movement, pull/vacuum movement, staggered multi-hit volleys, and guard mitigation.
- Read-only dungeon-flow audit found the next highest DNF gap is room progression: clearing a room still uses a settlement button instead of opening a gate and walking into the next room. This is deferred to the next slice after skill-script V1.
- Browser validation on `http://127.0.0.1:5174/` confirmed `furnace-step` moved the player from 23.67% to 36.58% X while showing `furnace-trail`, `heat-bloom` pulled both enemies closer to its center and showed `heat-bloom` VFX, `black-rain-volley` showed `ink-volley` / `black-rain` with 6 damage numbers and 6 impact sparks, and `anvil-guard` rendered `actor-model-shield` with `data-shield-active="true"` and `guard-rune` VFX.
- Live browser validation exposed a playability gap: J/K class skills were filtered from the skill button bar, so `anvil-guard` was test-callable but not clickable. The UI now renders J/K class skills as mouse-clickable skill buttons while keyboard J/K remain light/heavy attack shortcuts.
- Screenshot evidence for the skill-script browser pass is saved at `.codex-local/tmp/skill-script-v1-check.png`.

## Room Gate Flow Findings
- User clarified the acceptance rule again: character models may stay lightweight while the prototype is being made playable, but combat motion smoothness, hit feel, skill VFX, monster skills, and action-state changes stay strict.
- Read-only room-flow audit found the old room finish flow was not DNF-like because clearing enemies exposed a UI settlement action instead of opening a physical room gate. The new flow keeps `finishRoom()` for compatibility but routes player-facing progress through `roomGateForRun()` and `enterRoomGate()`.
- Room gate state is now explicit: active rooms show `locked`, cleared normal rooms show `open`, the pre-boss transition shows `boss`, and the final cleared room shows `complete`.
- App integration now requires walking right into the gate before loot and the next room are applied. This preserves keyboard movement as part of the dungeon loop instead of converting clear-room into a menu action.
- UI no longer renders `settle-button`; the combat scene renders a visible right-side room gate plus a non-clickable door status indicator, so the player reads the goal as movement-based progression.

## Target-Bound Skill Impact Findings
- Follow-up visual audit found that player skill VFX had a main cast node, but target impact presentation still looked generic: each hit showed the same `hit-impact` ring and damage number without skill-specific per-target burst data.
- The gap is most obvious on multi-hit skills such as `black-rain-volley`: combat already emits six staggered hit events across two targets, but the UI previously had no `data-skill-impact-vfx` nodes to prove every target and every wave received a skill-shaped impact.
- The next reusable VFX layer should separate cast VFX from target-bound impact VFX. Cast VFX shows the skill being released, while impact VFX attaches to the target position and inherits the catalog `vfxShape`.
- `meteor-knuckle` remains a high-value next combat-script slice: it should become a staged ultimate with stronger hitstop/knockdown/ground-crack VFX instead of another generic ultimate hitbox.

## Meteor Ultimate Script Findings
- User clarified that lightweight character/monster modeling is acceptable only for mesh/detail fidelity; combat motion smoothness, hit timing, hitstop, player/enemy action changes, skill VFX, and monster skill VFX remain strict.
- Read-only combat audit found `meteor-knuckle` should not be implemented through generic `repeatHits`, because it needs two named phases, different hitstop/damage, forced knockdown, and armor-break on the final impact.
- Read-only UI audit found existing actor/weapon DOM is sufficient for `meteor-knuckle`; the missing pieces are ultimate-level scene shake, screen flash data, meteor-specific cast CSS, and meteor-specific target impact CSS.
- RED evidence: focused combat/app/UI tests failed because `meteor-knuckle` still emitted two single-stage hit events instead of four staged fall/impact hit events across two targets.
- Browser validation confirmed the staged ultimate DOM on `http://127.0.0.1:5174/.codex-local/tmp/meteor-vfx-check.html`: four meteor impacts across two targets, `fall/fall/impact/impact`, `meteor-fall/meteor-impact` cues, `data-screen-shake="ultimate"`, `data-screen-flash="meteor"`, `player-ember-meteor-crash`, `weapon-meteor-smash`, and enemy `data-enemy-motion="knockdown"`.
- UI motion priority matters for action credibility: meteor originally set enemy knockdown state but rendered `controlled` because control/armor-break took priority. Enemy visual motion now prioritizes airborne/knockdown over control/guard-break when those states overlap.

## Liuli Rain Staggered Skill Findings
- User clarified again that character and monster model detail may stay lightweight for the first playable flow, but combat model motion, action smoothness, hit feel, skill VFX, and monster skill VFX are strict.
- Read-only combat audit found `liuli-rain` was a high-value next skill script because the catalog already marks it as a ranged burst, but the generic hitbox path only produced one hit per target and no phase/cue data.
- Read-only UI/CSS audit found the actor-side Liuli cast animation and `glass-rain` player VFX already existed; the missing piece was target-bound `glass-rain` impact styling plus event-level phase/cue metadata.
- RED evidence: focused combat/app/UI tests failed because `liuli-rain` emitted 2 hit events instead of 6 staggered rain-wave hits across two locked targets.
- Implementation now locks targets once, emits three rain waves per target, adds `rain` hit phase and `glass-rain-fall` VFX cue, gives the final wave a stagger status, and uses a short event VFX window so the multi-wave target sparks do not linger after the catalog skill animation ends.

## Prism Step Path Pierce Findings
- Current user goal still prioritizes DNF-like combat feel over high-detail model mesh work; `prism-step` is a strong next slice because it should feel like a controlled dash-through attack rather than a generic point skill.
- Read-only combat audit found `prism-step` already had catalog animation metadata (`liuli-step`, `prism-dash`, `prism-afterimage`) and a 104px startup dash, but the generic skill path selected targets only after landing and capped dash skills at one target.
- RED evidence: focused combat/app/UI tests failed because enemies placed between the dash start and landing point produced 0 `prism-step` hit events.
- Implementation now selects targets along the start-to-end dash path, keeps the player landing movement, hits up to two path targets, adds `pierce` hit phase and `prism-pierce` VFX cue, and applies a short stagger to the pierced enemies.
- UI/CSS now has dedicated `liuli-step` player dash, `prism-dash` weapon motion, `prism-afterimage` cast VFX, and target-bound `prism-afterimage` pierce bursts.

## Monster Skill Pattern Findings
- User clarified the acceptance split again: lightweight character/monster model detail is acceptable for now, but combat animation smoothness, hit feel, player/enemy action changes, skill VFX, and monster skill VFX remain strict.
- Current monster attacks already have windup/active/miss phases and player HP damage, but trash, elite, and boss attacks are still mostly single-impact patterns with a shared `actor-model-attack` lunge.
- Read-only UI audit found the largest visible gap is result feedback: active/miss monster skill VFX is anchored on the enemy, player hit/dodge motion changes, but there is no target-side combat feedback node for enemy skill hit or miss.
- Next slice should add testable enemy-skill metadata and DOM hooks: boss `taotie-flame-breath` as a sustained multi-hit breath, plus generic target-side feedback for monster skill hit/miss.
- Implementation note: enemy-skill target feedback now carries `combat-feedback-skill-*` classes and `data-player-feedback-cue`, so hit/miss feedback is tied to the actual monster skill event rather than a generic HIT/MISS skin.
- Presentation note: `ash-ember-spit`, `zheng-shockwave`, and `taotie-flame-breath` now have separately verifiable VFX/feedback animation hooks. Browser computed styles confirmed `ash-ember-spit-trail`, `ash-ember-hit-feedback`, `zheng-shockwave-expand`, `zheng-shock-hit-feedback`, `taotie-breath-flow`, `taotie-breath-hit-feedback`, and player `player-hurt-react`.
- Remaining pattern gap: attack variety is still limited by `kind -> one monster skill`. A good next combat slice is adding a second trash/elite archetype such as a close-range rush/explode monster, after this feedback/VFX layer is stable.

## Input Buffer Findings
- Current DNF-like combat gap: keyboard actions during `actionLockUntilMs` are discarded unless they are a hit-confirm skill cancel. This makes repeated attacks and late skill chaining feel less like a brawler.
- App reducer currently advances `combatAction` by 220 ms before attempting the action. That can skip past the lock window instead of preserving the player's early key press as an intentional buffered input.
- Minimal implementation path: store a short-lived buffered combat action on `CombatPlayer`, execute it from `stepCombat()` when the lock reaches its scheduled release frame, and expose buffer state through combat scene DOM for browser verification.
- Implementation note: the first playable buffer window is 180 ms. Locked light/heavy/skill inputs can queue only near the end of `actionLockUntilMs`; `stepCombat()` releases the queued input exactly at the unlock frame while preserving movement interpolation.
- Interruption note: queued actions are canceled when the player is still in hurt lock at the release frame or when monster damage lands, preventing stale buffered attacks after a real hit-stun interruption.
- UI verification note: `.combat-scene` now exposes `data-action-buffer-state`, `data-buffered-action`, `data-buffered-skill-id`, `data-buffered-execute-at-ms`, `data-buffer-ms-remaining`, and `data-buffer-window-ms` so browser checks can prove real buffered input instead of reducer time-skipping.

## Normal Combo Findings
- Current DNF-like combat gap after input buffering: light attack repeated the same hitbox/timing instead of a normal three-step brawler combo, so the most common J/X attack path still felt flat.
- Combat audit found `comboStep` already existed but was only used as a counter and skill-cancel gate; it did not change light attack damage, hit frame, hitstop, action lock, knockback, or launch state.
- UI audit found player motion already came from hit/miss events, but combat DOM exposed only `data-player-motion="light"` and HUD text. Browser verification needed stable `data-player-combo-step`, `data-player-normal-combo-step`, and `actor-model-light-N` hooks.
- Implementation note: light attacks now use three normal-combo step definitions. Step 1 is quick, step 2 has later impact and stronger stagger, and step 3 has the longest startup/lock plus `launcher` feedback and airborne target state.
- Expiration note: when the hit chain expires, `stepCombat()` now clears `player.comboStep` along with `comboCount`, so stale UI state cannot show a later normal attack step after a pause.

## Universal Backstep Findings
- Current DNF-like control gap after normal combo: the player had skill-specific evade windows, but no universal defensive backstep available to every class without resource cost.
- Space is already reserved for advancement skills, so the safer keyboard binding is `KeyC`; this preserves base skill hotkeys and later Space advancement skills.
- Existing `dodge` presentation hooks are sufficient for the first backstep slice: `data-player-motion="dodge"`, `data-evade-active="true"`, and `actor-model-dodge` already drive player model motion.
- Implementation note: backstep is a pure defensive combat action. It moves opposite the current facing, keeps facing unchanged, opens a short evade/invulnerability window, starts an action lock, clears combo/cancel state, and emits no hit or miss events.
- Agent review confirmed the minimal hook set: extend `CombatActionInput`, route `KeyC` before skill lookup, add a `data-combat-action="backstep"` button, and keep Space flowing through skill lookup for advanced classes.

## Monster Body and Hurtbox Findings
- Current monster art had visible size tiers, but combat still treated enemies as center points. This made large Shan Hai Jing monsters feel like tiny targets and weakened model/action credibility.
- Read-only agent audit confirmed `CombatEnemy` lacked body/hurtbox dimensions, while player hitboxes, prism dash path checks, and enemy attack range checks all used center distance only.
- Implementation note: monster body size now drives rendered actor width/height through CSS variables, while hurtbox size drives player-to-enemy hit tests, prism dash path overlap, target sorting, and enemy attack reach.
- Balance note: trash enemies use a smaller vertical hurtbox than their full visual body so lane movement still dodges basic monster skills at the belt-scroll arena edges.
- Verification hook note: enemy DOM now exposes `data-enemy-body-width`, `data-enemy-body-height`, `data-enemy-hurtbox-width`, `data-enemy-hurtbox-height`, plus matching CSS variables for browser checks.
- Review follow-up: front-only player attacks must test overlap between the attack interval and the monster hurtbox interval, not only the monster center point. Otherwise large monsters whose center is behind the player but whose hurtbox crosses the attack origin can incorrectly miss.
- Test helper note: `cinder-kiln-alley` currently has three rooms; elite is room `1` and boss is room `2`. UI tests now use production room progression with a guard instead of hand-mutating `kind` without matching dimensions.

## Night Mark Detonation Findings
- User clarified that simpler character/monster modeling only lowers near-term model fidelity; combat animation smoothness, hit feel, player/enemy action changes, skill VFX, and monster VFX remain strict acceptance criteria.
- Read-only combat audit found `night-mark-detonation` was still a generic single-target skill despite its advancement fantasy. It did not prefer marked enemies, did not miss when no marks existed, and had no staged lock/burst event metadata.
- Read-only UI/CSS audit found catalog metadata already existed for `ink-detonation`, `detonate-mark`, and `night-detonation`; the missing pieces were dedicated CSS selectors/keyframes plus event-level `hitPhase` and `vfxCue`.
- Implementation note: `night-mark-detonation` now selects marked enemies inside a wider hitbox, emits `mark-lock` hits at the catalog hit frame, emits stronger `detonate` hits 180 ms later, consumes marks only on final burst, and applies stagger/knockdown feedback.
- Presentation note: target-bound night detonation VFX has distinct lock and burst cue styling, while player model and equipped weapon get dedicated cast and detonation arc keyframes.
- Code review follow-up found that future-stamped staged hits must not mutate enemy state at cast time. Night detonation now queues enemy hit effects and resolves them through `stepCombat()`, so cast keeps marks, the 310 ms lock frame keeps targets standing, and the 490 ms burst frame clears marks and applies knockdown.

## Mechanism Shadow Net Findings
- User's latest priority split remains active: keep model mesh/detail simple for now, but treat combat action timing, motion, hit feedback, skill effects, enemy action changes, and monster/skill VFX as strict.
- Read-only combat audit found `mechanism-shadow-net` was the strongest next slice because its advancement fantasy is a delayed field/trap, but the previous implementation used generic single-frame range hits.
- Read-only UI/CSS audit found the app already passed catalog animation metadata through DOM (`ink-shadow-net`, `net-cast`, `mechanism-net`) and rendered target-bound impact nodes, so the missing work was dedicated staged combat logic plus CSS animations.
- Implementation note: `mechanism-shadow-net` now schedules its hit effects instead of mutating enemy state at cast time. The bind frame applies trap/control and attack delay; the snap frame adds stronger damage/stagger and pulls enemies toward the net center.
- Presentation note: mechanism net uses separate player cast animation, equipped weapon net-cast arc, player-side cast field, and target-bound bind/snap impact styling. Browser computed styles confirmed the actual animation names, not only static DOM attributes.
- Review follow-up: skill cast VFX position must match the combat mechanic center. `mechanism-shadow-net` now anchors its cast field at the same player-relative net center used by the snap pull, and tests cover the frame just before bind to prevent premature VFX/damage/control regressions.

## Mountain Crack Hammer Findings
- User clarified that simple character/monster model fidelity is acceptable only for the current playable prototype; combat animation flow, hit timing, hit feedback, skill VFX, enemy action changes, and monster/skill effects remain strict.
- Read-only combat/UI audits selected `mountain-crack-hammer` as the next high-value Iron Guardian slice because the advancement fantasy should be a heavy two-step hammer break, but the generic skill path only produced one frame of damage and generic presentation.
- RED evidence: focused combat/app/UI tests failed because `mountain-crack-hammer` emitted one generic hit instead of staged stagger/impact hits across two targets, did not delay enemy state mutation, and CSS lacked `iron-mountain-crack`, `mountain-hammer`, and `mountain-crack` presentation.
- Implementation note: `mountain-crack-hammer` now schedules two hits per target. The 290 ms hammer-stagger frame interrupts enemy windup and applies control; the 380 ms hammer-impact frame applies heavier damage, guard-break, armor-break, and knockdown without mutating enemies at cast time.
- Presentation note: Iron mountain crack now uses dedicated player cast motion, equipped weapon mountain-hammer arc, player-side mountain-crack field, and target-bound stagger/impact bursts. Browser computed styles confirmed actual animation names: `player-iron-mountain-crack-cast`, `weapon-mountain-hammer`, `mountain-crack-cast-core`, `mountain-hammer-stagger-core`, and `mountain-crack-impact-core`.
- Code review follow-up found a time-ordering bug: if a large `stepCombat()` delta crossed both an enemy hit at 200 ms and the hammer stagger at 290 ms, the delayed stagger could clear the enemy attack before the earlier hit resolved. Scheduled enemy hit effects now first resolve already-landed target enemy hits up to the effect frame, and a regression test covers the 200 ms enemy hit before 290 ms stagger case.

## Ash Crawler Burst Monster Pattern Findings
- User clarified the current fidelity split again: character and monster models may stay relatively simple while the playable loop is being completed, but battle motion flow, hit feel, model-following attack movement, player/enemy action changes, skill VFX, and monster skill VFX are strict.
- Read-only combat audit found `CombatEnemy.attackSkillId` already tracks the active cast, so a persistent `attackProfileId` is needed to support multiple monster archetypes without losing active attack state.
- Read-only UI/CSS audit found monster windup, active VFX, and feedback hooks already exist, but `ash-crawler-burst` needed its own effect id, circle telegraph, model attack animation, explosion VFX, and hit/miss feedback styling.
- RED evidence: focused combat/app/UI tests initially failed because normal rooms only had the existing trash attack profile, crawler enemies did not rush before impact, sidestep miss/interruption cases were absent, and CSS had no crawler-burst selectors/keyframes.
- Implementation note: normal trash rooms now spawn one ranged `ash-ember-spit` enemy and one close-range `ash-crawler-burst` enemy. The crawler rushes toward the player during windup, explodes at a short-range impact frame, can miss on lane sidestep, and loses the pending explosion when staggered.
- Presentation note: browser computed styles confirmed dedicated animation names for crawler windup, circle telegraph, explosion ring/core/trail, hit feedback, and player hurt reaction.
- Code review follow-up: crawler rush is now a windup-time interpolated logic movement rather than an instant position jump at cast start, and app integration coverage now checks crawler miss feedback rendering.

## Zheng Horn Charge Elite Pattern Findings
- DFO reference pass reinforced that movement, X/Z style combo actions, skill hotkeys, and combo scoring are core brawler loops; this slice targets the matching monster-side need for readable attack lanes and punishable rush patterns.
- Read-only combat audit found `enemyAttackDefinition()` still ignored non-trash `attackProfileId`, so elite profile patches fell back to `zheng-shockwave`; active `attackSkillId` still needed to remain the priority to lock already-started attacks.
- Read-only UI audit found `enemySkillEffect()` also had an elite-kind fallback that would map every elite-only new skill back to `zheng-shockwave`; exact `zheng-horn-charge` matching must happen before kind fallback.
- RED evidence: focused combat/UI tests failed because elite rooms only spawned `elite + trash`, `zheng-horn-charge` produced no windup/active/miss events, and UI rendered `zheng-shockwave` circle telegraph instead of line charge.
- Implementation note: elite rooms now spawn two elite profiles plus one trash minion. `zheng-horn-charge` uses a narrow line lane, windup-time rush movement, heavier hitstop/knockback, `zheng-horn-charge-impact` VFX cue, and stagger interruption through the existing attack clear path.
- Presentation note: `zheng-horn-charge` has independent model charge, line telegraph, electric trail/core/ring VFX, and hit/miss feedback keyframes so it does not read like the old circular quake.

## Taotie Devour Boss Pattern Findings
- User's current acceptance split still treats model mesh detail as secondary to combat action timing, model-following movement, hit feedback, and skill/monster VFX.
- Read-only combat audit found the boss tier still relied on one default attack profile, `taotie-flame-breath`, so boss fights lacked alternate punish windows and movement pressure.
- Read-only UI audit found `enemySkillEffect()` used `enemy.kind === "boss"` as a fallback to `taotie-flame-breath`; any new boss skill must be exact-matched before that fallback or it will render as flame breath.
- RED evidence: focused combat/app/UI tests failed because boss enemies had no `attackPatternIds`, patched `taotie-devour-pull` attacks resolved as flame breath, no windup pull anchors existed, and CSS lacked devour selectors/keyframes.
- Implementation note: boss enemies now carry a two-profile attack queue, `taotie-flame-breath` then `taotie-devour-pull`. Active attacks are still locked by `attackSkillId`, while the next pattern index advances for the following cast.
- Combat note: `taotie-devour-pull` pulls the player horizontally during windup without overriding lane movement, then resolves a close bite hit or miss. Stagger/control clears both rush and pull anchors.
- Presentation note: `taotie-devour-pull` has a circle vortex telegraph, separate boss model animation, bite VFX cue, vortex ring/core/trail animations, and skill-specific hit/miss feedback so it is visually distinct from flame breath.
- Code review follow-up found windup pull had to be sampled at the impact frame when a large tick overshoots the bite frame, and scheduled player hit effects also need to resolve already-landed enemy bites after applying the same clamped windup pull. A shared windup-state helper now handles both paths and skips dead enemies.

## Taotie Forge Collapse Phase Findings
- Latest user clarification keeps character/monster mesh detail lightweight for now, but strict acceptance remains combat action flow, model-following motion, hit feel, player/enemy action changes, skill VFX, and monster/arena VFX.
- Read-only UI audit agreed that arena hazards should not be forced through `enemySkillEffect()` because those effects are anchored to enemy positions. The new forge-collapse hazards use independent arena coordinates and a dedicated hazard layer.
- Read-only combat audit recommended phase transition and arena hazard scheduling as separate combat events. The implementation now emits `boss-phase` plus `arena-hazard` events and keeps hazard damage delayed until the impact frame.
- Phase design note: the first forge-collapse marker locks onto the player's current lane for a clear response test; the other two markers pressure adjacent space, so the mechanic reads as a real arena pattern instead of another point attack.
- Presentation note: Taotie phase 2 sets boss DOM state, plays a boss model enrage animation, renders a phase-burst ring, renders three ground telegraphs, then resolves active/miss hazard feedback with dedicated forge-collapse animations.

## Prism Step Frame-Motion Findings
- Latest strict-combat audit found the largest player-side motion gap: monster rush/pull movement is sampled through windup time, but player dash skills still use immediate `applySkillStartupMovement()` position changes.
- `prism-step` is the best small slice because it is already a path-piercing skill with dedicated afterimage VFX; making it frame-sampled will directly improve model-following movement and pre-hit/impact separation.
- UI audit also found `black-rain-volley` still needs dedicated caster/weapon/cast VFX styling, but this is secondary to the time-based movement gap for the current "model follows action" requirement.
- Planned acceptance: casting `prism-step` should not teleport the player to the endpoint immediately; a mid-frame `stepCombat()` should place the actor between start and endpoint with no target impact; the hit frame should land at the endpoint and render existing `prism-pierce` target impacts.
- Implementation note: player skill movement is now stored as an active timed movement plan and sampled by `stepCombat()`. `prism-step` starts at the cast position, crosses the arena over the catalog hit window, and clears the plan at the impact frame or on interruption.
- Timing note: delayed enemy hit effects now append `CombatHitEvent` only when `applyAtMs` is reached. This prevents cast-time target VFX/damage from appearing before the model reaches the hit frame.
- Review follow-up note: large-frame processing now splits buffered input release before later arena hazards, samples hazards against active player skill movement, and clears skill movement when monster or arena damage interrupts the player.
- Browser note: DOM/computed-style validation confirmed `prism-step` panels at x 240 -> 291 -> 344, no target impacts before the hit frame, two target-bound prism impacts at the endpoint, actor animation `player-liuli-step-dash`, and no browser console errors.

## Black Rain Volley Caster VFX Findings
- Latest user clarification lowers near-term character mesh/model-detail priority only; combat action smoothness, model-following attack motion, hit feel, skill VFX, and monster VFX remain strict acceptance criteria.
- Read-only combat audit found `black-rain-volley` already produced staggered repeated hits, but those hits lacked per-hit presentation metadata, so target-bound VFX could not distinguish the rain phase from generic repeated damage.
- Read-only UI audit found catalog metadata already exposed `ink-volley`, `rain-volley`, and `black-rain` through combat DOM, but CSS still lacked dedicated caster, weapon, and cast-field animations for the skill.
- Implementation note: repeated `black-rain-volley` hits now carry `hitPhase: "rain"`, `vfxCue: "black-rain-fall"`, and a short VFX window so each target burst is tied to the actual rain hit frame.
- Presentation note: the skill now has a dedicated player cast animation, weapon rain-volley arc, black-rain cast core/ring/streak field, and existing target-bound black-rain burst styling. Browser computed-style validation confirmed actual animation names instead of only static class presence.
