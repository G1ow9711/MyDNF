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

## Flowing Light Chain Findings
- User clarified the priority split again: character models can stay simpler while the full playable loop is being connected, but combat animation flow, model-following attacks, hit feel, player/enemy action changes, skill VFX, and monster VFX are strict acceptance criteria.
- Read-only combat audit selected `flowing-light-chain` because it was still falling through the generic skill branch even though its advancement fantasy is a fast multi-stage Liuli chain slash.
- Read-only UI/CSS audit found the catalog already carried `liuli-light-chain`, `chain-cut`, and `flowing-chain`; the missing work was dedicated combat staging plus actual player, weapon, cast-field, and target-impact animations.
- Implementation note: `flowing-light-chain` now starts timed player skill movement at cast time, delays target mutation until three path-slash hit frames at 220/340/470 ms, hits up to two enemies along the travel path, staggers on the final slash, and cancels pending hits when monster damage interrupts the dash.
- Presentation note: the skill now has dedicated player motion, weapon chain-cut arc, flowing-chain cast field, and target-bound open/cross/finish impact cues so the model and VFX follow the action instead of appearing as static stickers.
- Review follow-up: delayed player skill hits, active monster impact frames, and arena hazards must resolve from one timestamp-sorted queue. Otherwise a large `stepCombat()` frame can let later player skill hits mutate enemies before an earlier off-target monster impact interrupts the player.
- Timing note: delayed skill scheduling should not prewrite future `hitstopUntilMs`; hitstop belongs to the actual impact frame so interrupted skills cannot leave stale screen-shake/hitstop state.

## Furnace Step Shoulder Rush Findings
- User clarified the current prototype tradeoff: character model fidelity can stay simple, but combat action smoothness, model-following attack movement, hit feel, skill VFX, and monster skill VFX remain strict.
- Read-only combat audit found `furnace-step` was still the clearest Ember movement defect because it used immediate startup movement and generic skill hit resolution instead of a visible shoulder-rush timeline.
- Read-only UI/CSS audit found the catalog already exposed `ember-shoulder`, `dash-burst`, and `furnace-trail`; the missing work was scheduled impact logic plus actual player, weapon, cast-trail, and target-impact CSS.
- Implementation note: `furnace-step` now starts an active timed player movement at cast time, keeps cast-frame x unchanged, samples the player through the 170 ms rush window, schedules one path target hit at the shoulder impact frame, and cancels the pending hit when monster damage interrupts the rush.
- Presentation note: `furnace-step` now carries `shoulder-impact` / `furnace-shoulder-impact` hit metadata and has dedicated player rush, weapon dash-burst, furnace-trail cast, and furnace shoulder-impact burst styling.
- Review follow-up: path-based player skills still need directional target filtering and delayed whiff resolution. `furnace-step` now requires target centers to be in front of the player and schedules miss feedback for the 170 ms hit frame instead of writing a cast-frame miss event.

## Furnace Heart Overdrive Findings
- Current priority remains: character model complexity can stay lighter, but player skill action timing, model-following state, hit frames, hit feedback, and skill VFX are strict.
- Parallel read-only audits split recommendations: UI/CSS audit selected `heat-bloom` because its pull presentation is generic; combat audit selected `furnace-heart-overdrive` because it was an advancement skill still using the generic front-hit branch. The controller selected `furnace-heart-overdrive` first because it most directly violated the class-advancement fantasy and strict hit-frame requirement.
- RED evidence: focused tests failed because `furnace-heart-overdrive` had no scheduled hit/miss effects, damaged targets through the generic branch at cast time, and lacked `ember-overdrive`, `core-overdrive`, and `overdrive-core` dedicated presentation.
- Implementation note: `furnace-heart-overdrive` now starts a stationary active skill movement so the existing interruption queue can cancel it, schedules a 360 ms area pulse and 560 ms release around the player, hits targets behind and in front within the core radius, delays whiff feedback to 360 ms, and cancels pending hits when monster damage lands before the pulse.
- Presentation note: overdrive events now carry `overdrive-pulse` / `overdrive-release` hit phases and `overdrive-core-pulse` / `overdrive-core-release` VFX cues, with dedicated player, weapon, cast-core, pulse, and release animations.
- Review follow-up: same-frame monster impacts must resolve before delayed player whiff feedback, otherwise a 360 ms enemy hit and 360 ms overdrive miss can leave a false MISS after interruption. The scheduled-combat queue now has explicit same-timestamp priority: arena hazard, monster impact, delayed player hit, delayed player miss.
- Review follow-up: player skill cast VFX must stop when a later `player-hit` interrupts the cast. The UI latest-player-action lookup now treats later player-hit events as blockers, so hit-state models do not keep stale `furnace-heart-overdrive` cast metadata or core VFX.

## Heat Bloom Timeline Findings
- User clarified the near-term modeling tradeoff: character and monster model geometry may stay simpler for now, but combat motion smoothness, model-following attacks, hit feel, player/enemy action changes, skill VFX, and monster skill VFX remain strict.
- Parallel read-only audits selected `heat-bloom` because its Ember pull fantasy still used generic cast-frame behavior and generic presentation despite catalog metadata for `ember-bloom`, `pull-bloom`, and `heat-bloom`.
- RED evidence: focused tests failed because `heat-bloom` had no scheduled draw/eruption effects, damaged targets at cast time, lacked dedicated CSS animations, and later review tests showed dead draw-frame targets could still receive eruption feedback.
- Implementation note: `heat-bloom` now schedules a 240 ms draw and 390 ms eruption around a fixed cast center, pulls targets only on the draw frame, launches on eruption, and cancels pending effects through the existing interruption queue.
- Presentation note: browser computed-style validation confirmed actual animation names for player `player-ember-bloom-cast`, weapon `weapon-pull-bloom`, cast field `heat-bloom-cast-*`, draw impacts `heat-bloom-draw-*`, and eruption impacts `heat-bloom-eruption-*`.
- Review follow-up: delayed target effects now skip targets that are already dead at their impact frame, and skill hit/miss/cast events carry caster position/facing so fixed-field VFX stays aligned with the combat center even if the player position later changes.

## Shadow Roll Timeline Findings
- User clarified again that character/monster model detail may be simple for now, but combat action smoothness, model-following skill movement, hit frames, hit feedback, and skill VFX must be strict.
- Parallel read-only audits pointed to `shadow-roll`: catalog metadata already had `ink-roll`, `roll-shot`, and `shadow-smoke`, but combat still fell through the generic branch and CSS lacked dedicated player/weapon/smoke/impact presentation.
- RED evidence: focused combat/app/UI tests failed because `shadow-roll` emitted no scheduled effects; the generic path moved and resolved target state immediately instead of waiting for the 160 ms roll-shot frame.
- Implementation note: `shadow-roll` now starts a backward active skill movement, samples mid-roll position, delays damage until 160 ms, schedules roll-shot miss/hit feedback, and cancels pending effects when monster damage interrupts the roll before the shot.
- Presentation note: browser DOM/computed-style validation confirmed cast x 360, before-shot x 274.006 at 159 ms with zero impacts, shot x 274 at 160 ms with one `roll-shot` / `shadow-roll-shot` impact, player animation `player-ink-roll`, weapon animation `weapon-roll-shot`, cast animation `shadow-smoke-cast-core`, impact animation `shadow-roll-shot-core`, and empty browser warning/error log.
- Review follow-up: `shadow-roll` now stores a delayed dynamic hitbox rather than a cast-time target, so enemies moving out before 160 ms produce a miss and enemies moving in can be hit. Monster miss events during the roll no longer overwrite the player's frame-end roll position.

## Cinder Uppercut Launcher Findings
- Latest user clarification keeps model geometry lightweight for now, but strict action flow, model-following movement, hit frames, hit feedback, and skill VFX remain mandatory.
- Read-only combat audit selected `cinder-uppercut` over larger ultimates because it is a default high-frequency launcher starter; improving it directly affects normal DNF-style combo flow.
- RED evidence: focused combat/app/UI tests failed because `cinder-uppercut` still used the generic immediate skill branch, had no scheduled hit/miss, no active skill movement, no `uppercut` hit phase, no `cinder-uppercut-rise` cue, and no flame-column impact selector.
- Implementation note: `cinder-uppercut` now starts a forward timed skill movement, schedules a dynamic 180 ms hitbox, delays whiff feedback to the hit frame, cancels cleanly when monster damage lands first, and preserves combo-cancel metadata from a light hit.
- Presentation note: browser validation confirmed cast x 25.00% with no impact, 179 ms x 31.67% with no impact, 180 ms one `uppercut` / `cinder-uppercut-rise` impact, enemy airborne state, player animation `player-ember-uppercut`, weapon animation `weapon-uppercut-arc`, cast animation `flame-column-cast-core`, impact animation `cinder-uppercut-rise-core`, and empty browser warning/error log.
- Review follow-up: cast flame-column VFX now anchors at the 64 px uppercut endpoint instead of falling through to the generic 128 px front anchor, and tests cover target moving out/in before the 180 ms dynamic hit frame.

## Ink Shot Projectile Timeline Findings
- Latest user clarification keeps character/monster geometry simple for now, but treats combat action smoothness, model-following motion, strict hit frames, hit feedback, skill VFX, and monster skill VFX as hard acceptance criteria.
- Parallel read-only audits selected `ink-shot` because it is the Ink Shadow Ranger starter ranged skill and still needed a real projectile timing slice instead of generic instant skill behavior.
- RED evidence: focused combat/app/UI tests failed because `ink-shot` had no scheduled projectile hit, no 120 ms delayed target recheck, no interruption cancellation, and no dedicated `ink-bolt` / `ink-shot-pierce` presentation.
- Implementation note: `ink-shot` now starts a stationary cancelable cast, schedules a 120 ms dynamic front hitbox, samples live enemy rush movement before target selection, hits one target in the projectile lane, and cancels cleanly if monster damage interrupts before impact.
- Presentation note: the skill now carries `ink-bolt` / `ink-shot-pierce` metadata, uses cast-origin anchored front VFX so the bolt does not drift after later player movement, and has dedicated player, crossbow weapon, projectile cast, and pierce impact animations.

## Glass Cut Starter Timeline Findings
- Latest continuation keeps model geometry lightweight but requires starter skills to feel like real action states, not instant data mutations.
- Parallel audits surfaced two next candidates: combat audit picked Ember `spark-combo` as the remaining generic starter; UI audit picked Liuli `sword-prism-field` as the remaining ultimate presentation gap. The controller selected `glass-cut` first because it is the Liuli high-frequency J starter and had no strict timeline yet.
- RED evidence: focused tests failed because `glass-cut` had no scheduled hit effect, no delayed target recheck, no interruption behavior, and no dedicated `glass-slash` presentation.
- Implementation note: `glass-cut` now starts a 115 ms active skill movement, keeps cast-frame enemy HP unchanged, resolves a dynamic swept-path slash from the cast origin at the hit frame, and cancels pending damage when enemy impact interrupts before or on the same frame.
- Review follow-up: endpoint-only target selection could miss enemies passed through during the short slide. The dynamic hitbox now selects from the cast origin, and a regression covers a target between the start and slash endpoint.
- Presentation note: browser computed-style validation confirmed `player-liuli-glass-cut`, `weapon-glass-slash`, `glass-slash-cast-core`, and `glass-slash-impact-core` animation names, with no warning/error console output.

## Spark Combo Starter Timeline Findings
- Current user priority keeps player/monster geometry light for now, but requires starter actions to have strict timing, model-following movement, delayed hit frames, cancelable impacts, and dedicated VFX.
- RED evidence: focused tests failed because `spark-combo` still used the generic instant skill branch, had no scheduled 120 ms hitbox, no delayed whiff, no dynamic target recheck, and no dedicated `ember-combo` / `jab-chain` / `ember-sparks` presentation.
- Implementation note: `spark-combo` now starts a 26 px active forward movement, keeps cast-frame HP unchanged, resolves one front target at the 120 ms jab frame, delays miss feedback, and carries `jab-chain` / `ember-jab-chain` hit metadata for target-bound VFX.
- Review follow-up: the first implementation moved the model but sampled the hitbox from the cast origin. The delayed dynamic hitbox now samples from the movement endpoint, with a regression where only the endpoint can reach the target.
- Same-frame priority note: a `spark-combo` regression now covers monster impact and queued player jab at the same timestamp, relying on the shared scheduled queue priority that resolves monster impacts before delayed player hits.
- Presentation note: browser computed-style validation confirmed `player-ember-spark-combo`, `weapon-jab-chain`, `ember-sparks-cast-core`, and `ember-jab-chain-impact-core` animation names, with no warning/error console output.

## Sword Prism Field Timeline Findings
- Latest user clarification keeps character modeling simpler for now, but treats combat flow, model-following action, strict hit frames, cancel/interruption behavior, and player/monster skill VFX as non-negotiable.
- Parallel audits selected `sword-prism-field` because catalog metadata already exposed `liuli-prism-field`, `prism-field`, and `sword-prism-field`, while combat still fell through the generic instant branch and CSS lacked dedicated field/ultimate presentation.
- RED evidence: focused combat/app/UI tests failed because `sword-prism-field` produced no scheduled effects, no delayed lock/burst phases, no interruption cancellation, no prism-field flash, and no dedicated CSS hooks/keyframes.
- Implementation note: `sword-prism-field` now starts a stationary cancelable cast, fixes a field center 150 px in front of the caster, dynamically rechecks targets at 390 ms lock and 610 ms burst frames, emits delayed MISS only at the lock frame, and cancels pending effects when monster damage interrupts the cast.
- Presentation note: events now carry `prism-field-lock` / `prism-field-burst` phases and `sword-prism-field-lock` / `sword-prism-field-burst` VFX cues; the burst triggers ultimate shake plus `prism-field` screen flash.
- CSS note: dedicated player cast, prism-field weapon arc, field core/ring/sparks, target burst core/ring/shards, and prism-field screen flash animations now exist for this skill.
- Review follow-up: dynamic multi-stage fields should suppress later-stage empty MISS events after the first lock/whiff signal, and weapon keyframes must preserve `--weapon-facing` in every frame so left-facing casts stay mirrored.

## Anvil Crash Slam Timeline Findings
- Current user priority remains unchanged: character/monster mesh detail can stay lighter while combat motion, model-following attacks, strict hit frames, hit feedback, player/enemy action changes, and skill VFX stay strict.
- Parallel read-only combat audit selected `anvil-crash` because it is a high-frequency Ember U skill with a clear jump-slam fantasy but still used the generic instant skill branch.
- RED evidence: focused tests failed because `anvil-crash` had no scheduled effects, damaged at cast time, lacked dynamic landing-point target recheck, and had no target-bound `anvil-slam` / `anvil-crash-impact` presentation.
- Implementation note: `anvil-crash` now starts a 260 ms active hammer-drop movement, keeps cast-frame HP unchanged, resolves a dynamic landing-point hitbox at the slam frame, forces knockdown with strong hitstop, and cancels pending damage when a monster hit interrupts first or on the same frame.
- Presentation note: dedicated CSS now covers full-skill player jump-slam motion, hammer-drop weapon motion, anvil-sparks cast VFX, and target-bound anvil impact bursts.
- Review follow-up: the slam hitbox now behaves as a landing-area burst rather than a front-only wall-facing hitbox, so a right-wall clamp can still hit a target just left of the landing point.
- Review follow-up: `anvil-crash` cast VFX now anchors at the actual 74 px landing point, and the `ember-anvil` preset uses the same jump-slam animation after `activeSkillMovement` clears at the hit frame.
- Browser validation confirmed no pre-slam impact, two target-bound impact bursts, persistent `player-ember-anvil-jump` through recovery, correct 74 px cast VFX anchor, right-wall hit without MISS, and no warning/error console output.

## Earth Furnace Breaker Ultimate Timeline Findings
- Current user priority remains: character/monster geometry may stay lighter, but combat flow, model-following motion, strict hit frames, interruption, target action changes, skill VFX, and monster VFX remain strict.
- Parallel read-only audits confirmed `earth-furnace-breaker` still fell through the generic skill branch: cast-frame target locking/mutation, no active skill movement, no `hitPhase`/`vfxCue`, no ultimate screen flash, and no target-bound forge-quake impact shape.
- RED evidence: focused combat/app/UI tests failed because `earth-furnace-breaker` had no scheduled effects and runtime/CSS lacked the required staged forge-quake ultimate metadata.
- Implementation note: `earth-furnace-breaker` now schedules a 260 ms `earth-crack` dynamic hitbox and a 410 ms `furnace-eruption` dynamic hitbox, with model-following Iron charge movement until the main hit frame.
- Combat note: the crack stage staggers live targets at the hit frame; the eruption stage applies guard-break, stagger, slam/knockdown, stronger hitstop, and suppresses duplicate empty-stage MISS after the first whiff.
- Presentation note: the skill now uses a dedicated `furnace-breaker` weapon arc, `forge-quake` cast VFX, target-bound crack/eruption impact VFX, `player-iron-earth-breaker-charge`, `weapon-furnace-breaker`, and `forge-quake` ultimate screen flash.
- Browser validation confirmed scheduled times `[260, 410]`, no cast/pre-crack damage, 2 crack impacts, 4 cumulative eruption impacts, knockdown feedback, ultimate shake/flash, dedicated computed animations, stable cast VFX anchor, and no warning/error console output.
- Review follow-up: the eruption stage now emits MISS when a target leaves after the crack frame but before the 410 ms eruption frame, preserving dynamic hitbox semantics for both stages.
- Review follow-up: `weapon-furnace-breaker` keyframes now multiply lunge and rotation offsets by `--weapon-facing`, so left-facing casts no longer keep right-facing weapon travel.

## Taotie Ash Summon Boss Pattern Findings
- Current strict-combat priority remains: character and monster geometry can stay lighter for the prototype, but Boss actions, timed hit frames, interrupt behavior, summoned monster participation, and monster skill VFX must be real gameplay states.
- Parallel read-only audits agreed that summoning should not reuse `player-hit` or generic active/miss semantics. The implementation adds a dedicated `enemy-summon` event while still using `enemy-attack active` for the Boss impact/VFX frame.
- RED evidence: focused combat/app/UI tests failed before implementation because `taotie-ash-summon` was not a valid boss profile, fell back to flame breath in UI, spawned no minions, and had no summon rift CSS or Boss model animation.
- Implementation note: Taotie now rotates through flame breath, devour pull, and ash summon. The ash summon windup has no cast-frame spawn; the impact frame emits a rift VFX and adds two `ash-crawler-burst` trash enemies with delayed attack readiness.
- Timing note: summon resolution reuses the existing timestamp-sorted enemy-impact queue. Large-frame scheduled hits that trigger Boss phase 2 before the summon frame now clear the cast and prevent stale summons.
- Room-flow note: summoned crawlers are real room enemies. Killing the Boss alone keeps the room gate locked; the final gate opens only after the spawned crawlers are defeated too.
- Presentation note: UI renders a circle summon telegraph, Boss `monster-taotie-ash-summon` action, `taotie-ash-summon-rift-core` active VFX, two per-minion summon rifts, and `ash-minion-summon-emerge` for newly spawned monsters.
- Review follow-up: summon emerge styling is now limited to idle spawned monsters, so later attack motion can take over instead of being masked by the spawn animation.

## Taotie Forge Shackle Control-Chain Findings
- Current user priority allows simpler character/monster geometry, but strict combat timing, model-following actions, hit feedback, skill VFX, and monster/Boss skill VFX remain mandatory.
- Read-only audits found that Boss profile/rotation is driven by `EnemyAttackProfileId`, `enemyAttackDefinition()`, `beginEnemyAttack()`, and `applyEnemyImpact()`, while UI must add exact hooks before the boss flame-breath fallback in `enemySkillEffect()`.
- Control note: `hurtLockUntilMs` already blocks `performAction()`, but movement still flows through `advancePlayerFramePosition()`. A real Boss bind needs a separate player movement/control lock so the model cannot slide during the chain lock.
- RED evidence: focused combat/app/UI tests fail because `taotie-forge-shackle` is not a valid Boss profile, phase 2 does not add it to rotation, UI falls back to flame breath, and no bind/slam CSS or player bound data exists yet.

## Black Rain and Iron Palm Strict Combat Findings
- Current user clarification: character modeling can stay simpler for now, but attack smoothness, model-following combat motion, strict hit frames, player/enemy action changes, and skill VFX must be treated as hard acceptance criteria.
- Parallel read-only audits found two high-value gaps: `black-rain-volley` looked visually complete but still used the generic instant branch, while `iron-palm` was a high-frequency Iron starter with no dedicated timed shield-jab script.
- RED evidence: focused tests failed because neither `black-rain-volley` nor `iron-palm` produced scheduled hit effects; black rain could mutate targets at cast time, and Iron palm had no `iron-palm` / `shield-jab` / `iron-spark` runtime/CSS path.
- Implementation note: `black-rain-volley` now starts a stationary cancelable cast and schedules dynamic rain waves at 340/450/560 ms, with no cast-frame damage or impact VFX.
- Interruption note: black rain pending waves cancel if monster damage interrupts before the first rain or after the first rain, so later waves do not continue as detached damage.
- Implementation note: `iron-palm` now starts a 34 px active shield-jab movement, resolves a 150 ms endpoint-based dynamic hitbox, and uses `shield-jab` / `iron-shield-jab` metadata for target-bound VFX.
- Review follow-up: `weapon-shield-jab` keyframes now multiply lunge and rotation offsets by `--weapon-facing`, so left-facing shield jab weapon motion mirrors the hit direction.
- Presentation note: browser computed-style validation confirmed black rain has `player-ink-volley-cast`, `weapon-rain-volley`, and `black-rain-target-core`, while Iron palm has `player-iron-palm-jab`, `weapon-shield-jab`, and `iron-shield-jab-impact-core`, with no warning/error console output.

## DNF-Style Skill Hotbar Findings
- Reference note: DFO-style keyboard play uses arrow-key movement plus skill slots on `A/S/D/F/G/H`, while `X` is the default attack key. This supports shifting this prototype away from WASD movement conflicts and toward a DNF-like six-slot combat hotbar.
- Read-only input audit found `combatActionForKeyCode()` used `A/S/D/W` as movement before skill matching, so `A/S/D` could not be real skill hotkeys. It also found `J/K` skill labels were misleading because those keys already trigger light/heavy attacks.
- Read-only UI audit recommended a dedicated `data-dnf-skill-bar="true"` with fixed six slots, `data-dnf-hotkey`, `data-dnf-slot-index`, `data-legacy-hotkey`, and `data-dnf-slot-state`, while keeping legacy `U/I/O/L/Space` mappings working.
- RED evidence: focused App/Input/UI tests failed because arrow keys were not recognized by the low-level keyboard mapper, `KeyA` still moved instead of casting a skill, and rendered skill buttons had no DNF hotkey slot attributes or CSS badge hooks.
- Implementation note: direction movement now belongs to arrow keys, and `A/S/D/F/G/H` map to the first six current-class combat skills. Legacy `L/U/I/O/Space` skill keys still map to their catalog skills, so existing keyboard/button workflows remain available.
- Presentation note: combat UI now renders a fixed six-slot DNF hotbar with visible key badges, slot index/state, old key labels such as `F/U`, and cooling/locked/empty styling hooks.
- Browser validation note: in the live in-app browser, the DNF bar rendered one six-slot bar, slot badges included computed `F` pseudo content, the old WASD movement hint disappeared, pressing `A` after focusing the combat scene triggered the current Ink class `ink-shot` skill VFX, and console warn/error logs were empty.

## DNF-Style Command Input Findings
- Reference note: official DFO pages expose a Change Command flow and key-input UI guidance. The prototype now adapts that into original offline command inputs rather than copying any proprietary data.
- Read-only combat/input audit found the safest command buffer location is `mountApp()` rather than `GameState`, `CombatRun`, save data, or localStorage. This keeps command input ephemeral and prevents stale save migrations.
- Input priority note: `KeyZ` is both heavy attack and command terminal. Command matching now runs before heavy fallback; if a known command is matched but resource/cooldown blocks it, the terminal key is consumed instead of firing the wrong action.
- Matching note: command sequences must be longest-match-first, otherwise `↓→Z` is stolen by the shorter `→Z` slot command.
- Combat note: command casts pay 88% resource cost using `ceil()` and receive 92% cooldown duration. `anvil-crash` therefore costs 22 heat instead of 25 and sets 4784 ms cooldown instead of 5200 ms.
- Buffer note: `CombatActionInput` carries `inputMethod`, and action buffering preserves it, so a command skill released on the unlock frame keeps the same cost/cooldown reductions.
- UI note: direct hotkey availability and command availability are separate states. A slot can be direct-locked but command-available, which is shown with `data-command-slot-state="available-by-command"` and a command chip.
- Browser validation note: the live browser save lacked resource for the `↓→Z` slot, so live verification used zero-cost `→Z` to prove the same command pathway sets manual release metadata and command toast without console warnings; automated tests cover the `↓→Z` Ember/anvil VFX path.
- Review follow-up: repeated keydown must keep reaching movement/action fallback even when ignored by the command buffer. Command-buffer filtering and gameplay input dispatch cannot share the same early return.
- Review follow-up: generic fallback skills still need `skill-cast` events, otherwise command casts on non-scripted class skills lose manual release metadata even though cost/cooldown reductions apply.
- Review follow-up: command matching can return a buffered action when cooldown will recover before the current action lock ends; immediate cooldown bypass is still blocked.
- Review follow-up: `available-by-command` visual styling must be ordered after locked-slot styling because the same button can be direct-locked but command-available.

## Ink Snare Strict Control Findings
- Current user clarification: character/monster geometry can stay simple while the playable loop is completed, but combat action smoothness, strict hit frames, player/enemy action changes, hit feedback, skill VFX, and monster VFX remain mandatory.
- Parallel read-only audits found `ink-snare` still used the generic instant skill branch: cast-frame target selection, immediate HP/control mutation, and empty skill-specific target VFX cues.
- RED evidence: focused combat/app/UI tests failed because `ink-snare` had no scheduled effects, no delayed bind/snap frames, no delayed MISS, and no `.skill-impact-shape-ink-snare` target animation hooks.
- Implementation note: `ink-snare` now starts a short active skill movement and schedules a 250 ms dynamic `trap-bind` hitbox plus a 430 ms dynamic `trap-snap` hitbox around a fixed snare center.
- Combat note: bind applies `trap/control` only at the bind frame; snap applies stronger damage, stagger/control, and pulls targets toward the snare center. Monster damage before snap cancels remaining pending effects through the shared scheduled-combat queue.
- Dynamic targeting note: bind uses live hit-frame target selection, so targets leaving before bind create delayed MISS, while targets entering before bind can be caught.
- Presentation note: `ink-snare-bind` and `ink-snare-snap` VFX cues now drive dedicated target impact bursts, with browser validation confirming player, weapon, cast, bind, and snap animation names and no warning/error console output.
- Review follow-up: snap must only affect targets that the bind frame actually controlled. The snap hitbox now filters by `statusSourceSkillId`, so a target entering after a bind MISS does not receive late snap damage or pull.
- Presentation follow-up: the `ink-snare` cast field now uses the same fixed center as combat (`player.x + 112 * facing`) instead of drifting with generic player-skill VFX placement; browser validation confirmed the expected `--actor-x: 38.75%` anchor in the regression fixture.

## DNF-Style Player Jump Control Findings
- Current user clarification: models may stay simple while the full playable loop is connected, but combat flow, action smoothness, hit feedback, skill VFX, monster VFX, and actor state changes stay strict.
- Read-only input audit found `KeyC` still mapped to `backstep` and the UI still presented `C` as backstep, so the prototype lacked the DNF-style jump key.
- Read-only combat audit found player vertical motion needs a separate air-state model because existing `y` is lane position; using lane `y` for jump height would break hitbox and room-flow semantics.
- Implementation note: player jump now has explicit `jumping` / `landing` state, timed airborne and landing windows, stable lane `y`, and dedicated render hooks.
- Combat note: airborne player state makes close-range ground monster impacts MISS during the airborne window without reusing the backstep evade timer.
- Input note: `X/J` and `Z/K` remain light/heavy, `C` is now jump, and backstep remains available as a mouse/UI command without claiming the DNF jump key.
- Presentation note: browser validation confirmed `player-jump-rise` animation, `actor-model-jump`, `data-player-air-state="jumping"`, no stale `C` backstep hook, visible MISS feedback during airborne evasion, and empty warning/error console output.
- Review follow-up: air timers are now cleared only after enemy impact resolution, so a large frame crossing landing still evaluates jump evasion at the actual hit time.
- Review follow-up: jump repeat guard runs before action buffering, preventing C from queueing chained jumps during airborne or landing frames.
- Review follow-up: jump evasion is attack-profile gated through `jumpEvade`; ground-style attacks can miss while airborne, but projectile/spit/breath-style attacks still hit if their normal hitbox connects.

## DNF-Style Airborne Light Attack Findings
- Current user clarification: model detail can stay lighter for now, but combat action smoothness, model-following attacks, strict hit frames, hit feedback, skill VFX, and monster VFX stay mandatory.
- Read-only combat audit found jump action lock prevented midair light attacks. Reusing `{ type: "light" }` is the least invasive input path; adding a public `airLight` action would unnecessarily widen input/reducer/UI contracts.
- Read-only UI/CSS audit found `playerMotion()` prioritized `jump` before action checks, so a combat-only air hit would still look static unless `air-light` became an explicit motion state before generic jump rendering.
- Combat note: air-light now schedules a dynamic hitbox rather than using the existing instant ground-light path. This preserves a real input-to-hit frame and lets targets enter/leave before impact.
- Cancellation note: air-light hit resolution checks the actual `applyAtMs` against `airborneUntilMs`, `hurtLockUntilMs`, and `boundUntilMs`, preventing late landing hits and interrupted detached damage.
- Presentation note: air-light uses separate player, weapon, monster-hit, and impact animations instead of reusing `.actor-model-light`, so ground combo animation cannot mask airborne motion.
- Browser validation note: computed style confirmed `player-air-light-slash`, `weapon-air-light-slash`, `monster-air-light-hit-react`, and `air-light-impact-slash` on the project CSS with no console warning/error output.
- Review follow-up: because the scheduled air-light hitbox intentionally stores cast origin/facing, player movement and facing are frozen while `airAttackUntilMs` is active. This keeps the visible actor, weapon arc, and hitbox origin aligned instead of letting the model drift away from the pending strike.
- Review follow-up: player hit state now overrides `air-attacking` state, so interrupted air-light renders `data-player-motion="hit"` and `data-player-state="hit"` consistently.
- Review follow-up: the live air-light monster hit reaction selector is ordered after airborne/knockdown animation rules and scoped to alive enemies, so air-light impact can override float without masking defeated-state handling.

## DNF-Style Airborne Heavy Slam Findings
- Current user clarification keeps character/monster geometry lightweight for now, but treats smooth action flow, model-following attacks, strict hit frames, hit feedback, and player/monster VFX as hard acceptance criteria.
- Read-only combat audit found jump lock prevented midair heavy from becoming an airborne action. Before this slice, `heavy` during jump either returned the original run or buffered into the grounded launcher at landing.
- Read-only UI/CSS audit found every airborne-action presentation hook was hard-coded to `air-light`, so a second air action needed an explicit `airAttackType` and separate hit-phase mapping.
- Combat note: airborne heavy now schedules a 120 ms dynamic `air-heavy-slam` hitbox, freezes movement/facing through the 300 ms action window, rechecks targets at the slam frame, and uses `slam/knockdown` tags so the monster model and state change together.
- Cancellation note: the scheduled airborne-hit guard now covers both `air-light` and `air-heavy-slam`, so late landing, hurt lock, or bound lock prevents detached damage.
- Presentation note: browser computed-style validation confirmed `player-air-heavy-slam`, `weapon-air-heavy-slam`, `monster-air-heavy-hit-react`, and `air-heavy-impact-slam`, with `data-player-air-attack-type="heavy"` and empty warning/error console output.
- Review follow-up: heavy input during landing lock must not buffer into a grounded heavy attack. `performAction()` now routes heavy through the air-heavy guard for any non-grounded air state, producing a no-op when the slam window is no longer valid.

## DNF-Style Dash-Light Attack Findings
- Current user clarification remains: character models may stay simpler while combat motion smoothness, model-following attacks, hit frames, hit feedback, skill VFX, and monster VFX stay strict.
- Read-only combat audit found `Shift` only changed movement speed and never reached `{ type: "light" }`, so dash-light needed a recent-dash state on `CombatPlayer` rather than a widened keyboard action contract.
- Read-only UI/CSS audit found ground light would mask dash-light unless it received a distinct `hitPhase`, `playerMotion`, weapon data hook, target reaction hook, and impact class.
- RED evidence: focused combat/app/UI tests failed because recent dash movement produced no scheduled `dash-light` effect, no delayed dynamic hit frame, no dash-light DOM hooks, and no dedicated CSS animations.
- Combat note: `Shift + horizontal movement` now opens a short dash-light-ready window. A following `X/J` schedules a 90 ms `dash-light` hitbox, moves the player model 46 px toward the slash endpoint, rechecks targets at the hit frame, and cancels pending damage if a monster hit interrupts before impact.
- Presentation note: dash-light keeps `action: "light"` for normal screen shake/resource semantics while using `skillId: "dash-light"`, `hitPhase: "dash-light"`, and `vfxCue: "dash-light-slash"` for cancellation and rendering.
- Browser validation note: the temporary page on `http://127.0.0.1:5178/.codex-local/tmp/dash-light-check.html` confirmed HP 180 -> 143 only on the hit frame, `data-player-motion="dash-light"`, `data-player-state="dash-attacking"`, `data-weapon-dash-action="light"`, `data-enemy-hit-dash-action="light"`, `hit-impact-dash-light`, computed animations `player-dash-light-strike`, `weapon-dash-light-slash`, `monster-dash-light-hit-react`, `dash-light-impact-slash`, and empty warning/error console output.
- Review follow-up: dash-ready is now treated as room-local and control-state-local. Entering a new room clears dash-light ready/start/end timers, active dash movement, and buffered actions; hurt/bound frames cannot precharge a later dash-light.
- Presentation follow-up: player dash-light motion/state now expires on the real action window instead of the generic recent-hit cache, while target hit feedback can still use the recent hit window for impact readability.

## DNF-Style Quick Recover Findings
- Current goal remains strict DNF-like keyboard combat rather than heavier character modeling; the next player-control gap was recovery agency after strong monster hits.
- Parallel read-only audits confirmed the safest input path is to reuse `jump` / `KeyC` as a context-sensitive quick recover, because `KeyC` already maps to jump and `performAction()` owns the jump branch. The quick recover branch must run before the hurt-lock early return.
- Combat note: strong non-bound monster hits now open a short quick-recover window. Light projectile hits do not open the window, and hard bound/control chains such as Taotie forge shackle remain protected because bound frames block quick recover.
- Implementation note: successful quick recover consumes the window, clears hurt lock at the current frame, keeps the player grounded, sets a short recovery action lock, extends invulnerability, clears buffered/active movement state, and renders `quick-recover` motion instead of letting recent `player-hit` mask the animation.
- Presentation note: UI now exposes recovery/invulnerability/hurt-lock data hooks, `quick-recover` player motion, `recovering` player state, a `player-recovery-vfx` wake-invulnerability aura, and the C button label/hint as jump/recover context.
- Browser validation note: the temporary page on `http://127.0.0.1:5178/.codex-local/tmp/quick-recover-check.html` confirmed strong hit HP 962, quick recover at 321 ms, invulnerability until 881 ms, `data-player-motion="quick-recover"`, `data-player-state="recovering"`, computed animations `player-quick-recover-rise` and `player-quick-recover-ring`, `pointer-events: none` on recovery VFX, follow-up hit count 0, HP unchanged, and empty warning/error console output.

## DNF-Style Combo Cancel Presentation Findings
- Current priority remains strict DNF-like combat feel: models can stay lightweight, but action flow, hit-confirm clarity, skill follow-up feedback, and visible state changes must be strict.
- Parallel read-only audits found the combat reducer already supports a narrow ground-light hit-confirm cancel: `cancelWindowUntilMs` opens only after grounded light hit, skill input inside the window bypasses `actionLockUntilMs`, and emitted skill hits carry `canceledFromCombo: true`.
- Scope note: this slice deliberately did not change the deeper timing model where normal hits are selected at input time with future `occurredAtMs`. A stricter future slice can move cancel availability to the visual hit frame, but the immediate gap was that existing cancel behavior was invisible to players.
- RED evidence: focused App/UI tests failed because the combat scene had no combo-cancel window attributes, no cancel release source, no cancel toast, no skill-slot cancel highlight, and no CSS hook for a cancel flash.
- Implementation note: UI now derives cancel availability from real combat state (`comboStep > 0` plus live `cancelWindowUntilMs`) and derives cancel release from real `skill-cast.canceledFromCombo`; the player remains in `data-player-motion="skill"` so existing skill animations are not masked.
- Presentation note: combat scene, player actor, and skill slots now expose `data-combo-cancel-*` hooks; cancel release shows `data-skill-release-source="cancel"`, a `skill-cancel-toast`, and a player flash overlay using `skill-cancel-flash`.
- Browser validation note: the temporary page on `http://127.0.0.1:5178/.codex-local/tmp/combo-cancel-check.html` confirmed cancel window `available`, highlighted `spark-combo` slot border color `rgba(251, 191, 36, 0.82)`, cancel state `used`, `playerMotion="skill"`, `releaseSource="cancel"`, `castCanceledFromCombo=true`, toast text `CANCEL`, toast/player flash animation `skill-cancel-flash`, and empty warning/error console output.

## DNF-Style Ground-Light Hit Frame Findings
- Current priority remains strict combat feel over heavier model detail: basic attacks must animate immediately, but damage, resource gain, hit sparks, monster hit reaction, and cancel availability must occur only on the real hit frame.
- Parallel read-only audits found the old ground-light path selected targets and mutated HP at input time while giving the hit event a future `occurredAtMs`; this made cancel/resource timing mechanically earlier than the visual impact.
- Combat note: grounded light now uses the scheduled hitbox queue like dash/air attacks, rechecks targets at the hit frame, delays miss feedback, and cancels pending damage if monster damage interrupts the player before or on that frame.
- Presentation note: a separate normal-attack action window keeps `data-player-motion="light"` and the weapon swing visible before impact, while hit VFX and enemy `data-enemy-motion="hit"` still wait for the scheduled hit event.
- Buffer/cancel note: buffered actions now release from the advanced frame state, so the first scheduled light hit can confirm combo before a buffered second light or command skill releases. Combo cancel now requires `cancelWindowUntilMs > elapsedMs`, so an empty zero window cannot unlock skills.
- Browser validation note: the temporary page on `http://127.0.0.1:5178/.codex-local/tmp/ground-light-check.html` confirmed input-frame no-damage/no-spark state, 55 ms impact HP/resource/cancel changes, pre-hit cancel buffering, post-hit cancel release, `playerMotion="skill"` on cancel, and empty warning/error console output.

## DNF-Style Ground-Heavy Model-Following Findings
- Current user clarification: character geometry may stay lightweight while core systems are connected, but combat action smoothness, model-following attacks, strict hit frames, hit feedback, skill VFX, and monster VFX remain mandatory.
- Parallel read-only audits agreed grounded heavy still risked looking like only the bitmap/weapon moved unless the real combat actor coordinate changed during windup.
- Combat note: grounded heavy now creates a short `ground-heavy` timed movement from the sampled input-frame position to a 34 px launcher endpoint, then schedules the heavy hitbox from that endpoint. This means target selection uses the moved actor position, not the original standing coordinate.
- Presentation note: the player wrapper `--actor-x` now changes from input frame to hit frame, while UI exposes `data-player-normal-attack-move="ground-heavy"` plus start/end/hit X hooks. The skill-movement hook is filtered so ground-heavy does not masquerade as a catalog skill movement in DOM/CSS.
- Test note: regression coverage places an enemy just outside the old origin-based heavy range but inside the moved endpoint range, proving the hitbox follows the model instead of only extending the animation.
- Browser validation note: the check page must patch `enemy.position`, not ad-hoc `enemy.x/y`; after correcting that fixture, browser evidence confirmed wrapper X movement, hit-frame impact VFX, enemy airborne transition, and endpoint-based edge hit.

## DNF-Style Combat Tick Smoothness Findings
- Current user clarification: character and monster geometry can stay lighter while the full loop is connected, but combat action smoothness, model-following attacks, strict hit frames, hit feedback, skill VFX, and monster skill VFX remain mandatory.
- Parallel audits found the reducer and mounted app loop both advanced automatic combat by 140 ms per tick, which skipped over short windups such as the 85 ms grounded heavy and made the actor jump straight to impact.
- RED evidence confirmed the first automatic `combatTick` advanced elapsed time to 140 ms and immediately showed `hit-impact-heavy`, while the mounted interval accepted a 140 ms tick.
- Implementation note: `combatTickMs` now centralizes automatic combat updates at 48 ms for both reducer `combatTick` actions and the mounted app interval.
- Combat note: one automatic tick now leaves grounded heavy at 48 ms with actor movement in progress and no hit VFX; the second tick reaches 96 ms, resolves the scheduled 85 ms impact, and shows the heavy hit burst/airborne transition.
- Timing note: smaller automatic ticks make enemy attacks start closer to their scheduled absolute time instead of being delayed to the next 140 ms boundary. Existing scheduled hit effects still resolve by absolute `applyAtMs` / `impactAtMs` ordering.
- Browser validation note: the live check page confirmed `windupElapsedMs: 48`, in-between player X movement, no input-frame impact, then `impactElapsedMs: 96`, endpoint player X, `hit-impact-heavy`, and enemy airborne state.

## DNF-Style Ground-Light Model-Following Findings
- Current user clarification remains: character models may stay simpler while completing the playable loop, but action smoothness, model-following attacks, strict hit frames, hit feedback, skill VFX, and monster VFX are strict.
- Parallel read-only audits found grounded light already had scheduled 55/65/78 ms hit frames and light combo animations, but the scheduled dynamic origin was still the input-frame player position and `activeSkillMovement` was not set for light attacks.
- Implementation note: each grounded light combo step now creates `activeSkillMovement` with `skillId` `ground-light-1/2/3`, moving the real player actor 18/22/28 px to the slash point by the hit frame.
- Balance note: light hitbox `rangeX` is reduced by the same lunge distance, so the total front reach remains stable while the hitbox origin follows the moved actor. This preserves existing monster hurtbox edge behavior.
- UI note: `ground-light-*` is exposed through normal-attack movement hooks and filtered out of catalog skill movement hooks, so HTML proves it is normal-attack model movement rather than a fake skill dash.
- Browser validation note: the live check page confirmed windup X 240, mid-windup X 248.676, impact X 258 at 55 ms, `ground-light-1` movement metadata, one light hit, `data-hit-action="light"`, enemy hit state, and computed `player-light-strike` / `weapon-light-swing` animations with no warning/error logs.

## DNF-Style Ground-Light Hit VFX Findings
- Current user clarification: character and monster geometry can stay lighter for now, but attack motion, hit feedback, hit-frame VFX, monster reactions, and model-following action changes are hard acceptance criteria.
- Parallel audits found the current light combo already had per-step player/weapon animation and strict hit frames, but hit events still lacked grounded combo `hitPhase` / `vfxCue`. As a result, target-bound VFX and enemy reaction remained generic `hit-impact-light` / `monster-hit-react`.
- Combat note: `lightComboSteps` now owns per-step presentation metadata: `ground-light-1/2/3`, `ground-light-slash-1/2/3`, and 240/280/340 ms VFX windows. The scheduled hit queue preserves these fields through the real hit frame.
- UI note: render code now maps ground-light phases into `data-enemy-hit-ground-light-step` and `hit-impact-ground-light-1/2/3`, while preserving the existing `action: "light"` semantics for resource, hitstop, and combo behavior.
- CSS note: jab/cross/launch now have separate monster reaction keyframes and impact slash/ring styling. The launch reaction is specificity-protected so the third hit's airborne state does not override the impact reaction animation.
- Browser validation note: the live check page confirmed step 1/2/3 computed animations for player, weapon, enemy, and impact slash, including third-hit `monster-ground-light-launch-react` while `data-enemy-airborne="true"`.

## DNF-Style Impact Anchor Findings
- Current user clarification: character and monster models can stay simpler for now, but combat action smoothness, strict model-following attacks, hit feedback, skill VFX, and monster VFX are hard requirements.
- Combat audit found grounded light model-following had a visual mismatch: damage and enemy knockback resolved correctly, but target VFX could anchor to the post-knockback enemy position rather than the original strike contact point.
- Combat note: `CombatHitEvent` now carries `impactPosition`, recorded before knockback or scheduled enemy mutation. This gives the renderer a stable contact point while the target model remains free to move.
- Reflect note: mirror-reflect counter hits also carry `impactPosition`, so counter sparks follow the same contract as direct and scheduled player hits.
- UI note: target-bound skill bursts, hit sparks, and damage numbers now render from `impactPosition ?? target.position`, while the enemy actor wrapper still uses the live enemy position. This separates hit contact feedback from knockback presentation.
- Test note: regression coverage asserts grounded light contact at x 405 while the enemy model is knocked to x 427, and verifies DOM origins / actor percentages for both impact VFX and the enemy actor.

## DNF-Style Enemy Knockback Slide Findings
- Current priority remains combat feel over heavier character modeling: enemy models must show motion changes when struck, not teleport to their post-hit position.
- Combat audit found `applyHit` and `applyScheduledEnemyHitEffect` intentionally write `enemy.position` directly to the logical knockback or pull endpoint. Changing that core position into a gradual movement would affect hitbox sampling, projectiles, and enemy AI timing.
- UI decision: keep combat logic authoritative at the endpoint, and render a short visual-only slide from `CombatHitEvent.impactPosition` to `enemy.position`. This improves motion without making combat targeting depend on a transient visual frame.
- Presentation note: enemy root `--actor-x/y` now interpolates for 160 ms after a hit, while `.enemy-art` still runs the existing hit-react animation. The root handles stage movement; the bitmap handles impact recoil.
- Test note: regression coverage proves the logical enemy x is already 427 at hit frame, but rendered root x starts at 405, reaches 416 after 80 ms, and settles at 427 after 160 ms. Impact and damage origins remain at 405 throughout.

## DNF-Style Ground-Heavy Hit Frame Findings
- Current priority remains strict combat feel over heavier model detail: the launcher can use a simple model, but its windup, impact frame, enemy airborne transition, hitstop, resource gain, and VFX must align with real combat timing.
- Parallel read-only audits found grounded heavy still used `applyPlayerHitbox` at input time, immediately mutating HP/airborne/resource while writing a future `occurredAtMs: input + 85`.
- Combat note: grounded heavy now uses the scheduled dynamic hitbox queue with an 85 ms hit frame, live target recheck, delayed MISS, `launcher` action tag, and hit-only resource gain.
- Cancellation note: the existing scheduled normal-attack interruption guard now covers both ground light and ground heavy, so monster damage or bound lock before/on the launcher frame cancels pending heavy damage and prevents ghost airborne hits.
- Presentation note: a `normalAttackType` field keeps the player and weapon in `heavy` windup motion before impact while hit sparks, damage numbers, enemy airborne state, and `hit-impact-heavy` wait for the real hit event.
- Integration note: room-clear helpers that spam heavy now resolve the heavy hit frame before judging enemy HP, then advance only between hits when more enemies remain. This preserves final-room VFX for the “no stale VFX in next room” regression.

## DNF-Style Hitstop Actor Freeze Findings
- Current user clarification: character and monster model detail can stay simpler for now, but action smoothness, hit feel, skill VFX, monster VFX, and actor motion changes must be strict.
- Parallel UI/CSS audits found hitstop was only exposed on `.combat-vfx-layer`, while `.combat-actors` is a sibling. Player, enemy, and weapon animation selectors therefore could not reliably react to impact pause.
- UI note: `combatHitstopActive()` now centralizes the hitstop calculation and feeds both the VFX layer and the `.combat-scene` root, so actor and VFX presentation derive from the same combat state.
- CSS note: scene-level hitstop pauses `.combat-player-art`, `.enemy-art`, `.combat-weapon`, `.actor-model`, and motion-trail children, while leaving `.hit-impact`, `.damage-number`, and feedback VFX outside the freeze selector.
- Browser validation note: computed-style verification initially caught player/enemy animations still running because later `animation` shorthand rules reset `animation-play-state`. The freeze rule now uses `animation-play-state: paused !important` to preserve hitstop priority across all actor animation presets.

## DNF-Style Shield Quake Strict Slam Findings
- Current user clarification: character models may stay simpler while core functionality is completed, but combat action smoothness, hit-frame timing, model-following attacks, target reaction, skill VFX, and monster VFX remain strict acceptance criteria.
- Parallel combat audit confirmed `shield-quake` still fell through the generic skill path: enemy HP was mutated at input time while the hit event carried a future `occurredAtMs`, making it a visual delay instead of a real delayed hit.
- Parallel UI/CSS audit confirmed the DOM already exposed `iron-quake`, `shield-slam`, and `shield-quake` metadata, and the weapon animation existed, but the player cast animation plus shield-quake cast/impact VFX selectors were missing.
- Combat note: `shield-quake` now uses the scheduled dynamic hitbox queue at the 280 ms quake frame, rechecks live targets from a fixed quake origin in front of the player, emits delayed MISS when targets leave, and forces grounded knockdown only on the real hit frame.
- Presentation note: the player actor now moves 28 px into the shield slam before impact, cast VFX anchors at the same quake origin, and target-bound impact bursts emit `shield-quake` / `shield-quake-impact` metadata on each hit target.
- CSS note: `iron-quake` has a dedicated body slam animation, `shield-slam` remains the weapon arc, and `shield-quake` now has separate ground-ring cast and target impact keyframes.
- Browser validation note: the live check page confirmed quake time 280 ms, no cast/before-impact HP loss, two hit-frame impacts, both targets downed, computed animations `player-iron-shield-quake`, `weapon-shield-slam`, `shield-quake-cast-core`, `shield-quake-impact-core`, `shield-quake-impact-ring`, and empty warning/error console output.

## DNF-Style Furnace Taunt Strict Roar Findings
- Current user clarification: character models can stay simpler while the playable loop is completed, but fight flow, model-following action, hit-frame timing, skill VFX, monster VFX, and player/enemy action changes must be strict.
- Parallel combat audit confirmed `furnace-taunt` was still a generic skill candidate, meaning control damage could resolve at input time instead of the roar frame and could leave stale pending behavior if interrupted.
- Parallel UI/CSS audit confirmed the catalog already exposed `iron-taunt`, `taunt-ring`, and `furnace-roar` metadata, but no dedicated player, weapon, cast, or target impact CSS selectors/keyframes existed.
- Combat note: `furnace-taunt` now schedules a 230 ms dynamic roar hitbox, rechecks live area targets at the roar frame, emits delayed MISS when targets leave, pulls/control-staggers targets only on the real frame, and cancels the pending roar when monster damage interrupts the cast.
- Presentation note: the player model performs a short taunt movement while the furnace-roar field anchors ahead of the actor, and each hit target emits `furnace-roar` / `furnace-roar-impact` metadata for target-bound control bursts.
- Browser validation note: the live check page confirmed 230 ms roar timing, no cast/before-roar HP loss, two hit-frame target impacts, target control state, computed animations `player-iron-furnace-taunt`, `weapon-taunt-ring`, `furnace-roar-cast-core`, `furnace-roar-impact-core`, `furnace-roar-impact-ring`, and empty warning/error console output.

## DNF-Style Marking Bolt Strict Contract Findings
- Current user clarification: character/monster models can stay simpler for now, but battle action smoothness, strict hit frames, model-following attacks, player/enemy action changes, skill VFX, and monster VFX remain strict.
- Parallel combat audit selected `marking-bolt` because it still behaved like a generic marking skill and fed `night-mark-detonation` too early. Required behavior: no cast-frame marks, 180 ms live target recheck, delayed MISS, and monster-interruption cancellation.
- Parallel UI/CSS audit confirmed catalog metadata already existed (`ink-mark`, `mark-bolt`, `contract-mark`), but CSS lacked dedicated player, weapon, contract cast, and target seal impact animations.
- Combat note: `marking-bolt` now schedules a 180 ms dynamic single-target contract-mark hitbox, keeps cast-frame target marks at zero, rechecks live target position on the impact frame, emits `contract-mark` / `contract-mark-impact` metadata, and clears pending marks if monster damage interrupts before impact.
- Presentation note: the player model enters a short ink-mark cast motion, the equipped weapon uses a mark-bolt arc, the cast VFX renders a flying contract seal, and each hit target renders a target-bound seal burst with ink mark count visible on the enemy node.
- Test note: focused GREEN passed for combat, app integration, and UI smoke coverage after fixing the new fixtures so Ink resource exists and the interruption monster can actually hit the player.

## DNF-Style Crow Feint Strict Dodge Shot Findings
- Current priority remains strict combat timing over heavier model geometry: `crow-feint` must have punishable startup, a delayed dodge window, a live hit frame, model-following backward motion, and dedicated VFX.
- Parallel combat audit found the old generic evade path gave immediate `evadeUntilMs` / `invulnerableUntilMs` and immediate target mutation. This made startup unpunishable and turned the 190 ms value into visual metadata instead of a real hit frame.
- Combat note: `CombatPlayer` now separates window start and window end for evade/invulnerability, so delayed defensive frames can be represented without breaking immediate backstep/quick-recover windows.
- Combat note: `crow-feint` opens its defensive window at 90 ms, fires a dynamic `feint-shot` at 190 ms, rechecks target position on the shot frame, emits delayed MISS when the target leaves, and cancels pending shot effects if a monster hit lands during startup.
- Presentation note: `ink-feint`, `feint-shot`, and `crow-feint` now have dedicated player, weapon, cast, and impact CSS so the skill no longer falls back to generic dodge/skill visual treatment.
- Browser validation note: live computed-style verification confirmed `player-ink-feint`, `weapon-feint-shot`, `crow-feint-cast-core`, and `crow-feint-shot-core` on the local app with no console warning/error output.

## DNF-Style Mirror Arc Strict Counter Findings
- Current priority remains combat feel over heavier geometry: `mirror-arc` should behave like a visible parry/counter action with startup, active window, counter slash, target feedback, and VFX instead of a static reflect flag.
- Local audit found `mirror-arc` still falls through the generic skill branch. `applyPlayerSkillStatus()` opens `reflectUntilMs` immediately for any `reflect` tag, and the fallback skill hit resolves through generic scheduling/visuals instead of a dedicated mirror counter script.
- Combat note: the next implementation should add delayed reflect start timing for `mirror-arc`, a strict 210 ms `mirror-arc` hit frame, live target recheck, delayed MISS, startup interruption cancellation, and reflect counter events that use the real `mirror-arc` skill animation metadata.
- UI/CSS note: current counter presentation falls back to `actor-model-counter`, `player-counter-cut`, and `weapon-skill-flare`. Dedicated `liuli-mirror`, `mirror-parry`, `mirror-arc` cast/impact styling is missing, so the player/weapon/counter burst do not read as a class skill.
- Parallel agent note: two read-only agents were spawned for combat and UI audit, but after automatic goal continuation `wait_agent` returned `not_found`. Work continued from local source evidence instead of blocking.
- Combat note: `mirror-arc` now separates startup from active parry frames. The cast starts with no reflect, opens reflect at 90 ms, keeps the active window until 770 ms, and resolves the mirror slash only at the 210 ms scheduled hit frame.
- Cancellation note: a monster hit before the 90 ms active window lands on the player and clears pending mirror slash effects, so the skill no longer creates ghost counter/slash damage after interruption.
- Counter note: a monster hit during active frames is converted into a `mirror-counter` event on the same `mirror-arc` skill id with `mirror-counter-burst` VFX, preserving class-specific presentation instead of falling back to generic reflect.
- Presentation note: browser computed-style validation confirmed the player, weapon, cast field, slash impact, and counter burst use dedicated `player-liuli-mirror-parry`, `weapon-mirror-parry`, `mirror-arc-cast-core`, `mirror-arc-impact-core`, and `mirror-counter-burst-core` animations.

## DNF-Style Glass Lotus Strict Bind Bloom Findings
- Current priority remains combat feel over heavier geometry: `glass-lotus` may use the existing lightweight Liuli model, but it must be a readable two-stage control/burst skill with real hit frames and dedicated VFX.
- Parallel UI/CSS audit selected `glass-lotus` because tests were already RED and catalog metadata existed, while no combat script or CSS consumed `liuli-lotus`, `lotus-bloom`, and `glass-lotus`.
- Combat note: `glass-lotus` now schedules a 180 ms dynamic bind frame and 320 ms dynamic bloom frame. Neither frame mutates targets at cast time; both sample the live area from a fixed lotus field center.
- Target-action note: bind pulls enemies inward and applies `control`; bloom applies `stagger` plus forced knockdown. This gives monsters visible action-state changes without requiring heavier character models.
- Cancellation note: monster damage before bloom clears both pending lotus stages through the same scheduled-effect interruption guard used by other strict skills, preventing ghost damage or stale VFX.
- Presentation note: browser computed-style validation confirmed dedicated `player-liuli-lotus-cast`, `weapon-lotus-bloom`, `glass-lotus-cast-core`, `glass-lotus-bind-core`, and `glass-lotus-bloom-core` animations, with no fallback to generic player/weapon/impact animations.
- Audit queue note: the combat read-only agent selected `mirrorflame-burst` as the next high-value Liuli advancement gap after `glass-lotus`; it still falls through the generic skill path.

## DNF-Style Mirrorflame Burst Strict Lock Burst Findings
- Current priority remains strict combat feel over heavier geometry: `mirrorflame-burst` can use the lightweight Liuli model, but it must read as a staged advancement burst with real timing, target control, target knockdown, and dedicated VFX.
- Parallel combat and UI/CSS audits confirmed the old path had only catalog metadata. It used generic immediate hit logic and generic player/weapon/impact presentation instead of a `liuli-mirrorflame` action.
- Combat note: `mirrorflame-burst` now schedules a 180 ms dynamic lock frame and a 350 ms dynamic burst frame. It does not mutate target HP at cast time, and both frames sample live target positions from a fixed field center.
- Target-action note: the lock applies `control`, while the burst applies `stagger` plus forced knockdown. This gives readable monster state changes while keeping character geometry lightweight.
- Cancellation note: a monster hit before the burst clears both pending mirrorflame stages through the scheduled-effect interruption guard, preventing ghost damage and stale VFX.
- Presentation note: browser computed-style validation confirmed dedicated `player-liuli-mirrorflame-cast`, `weapon-mirrorflame-fan`, `mirrorflame-cast-core`, `mirrorflame-lock-core`, and `mirrorflame-burst-core` animations, with no fallback to generic player/weapon/impact animations.

## DNF-Style Mountain Guard Break Strict Impact Findings
- Current priority remains strict combat feel over heavier model geometry: `mountain-guard-break` should be a readable Ember advancement破防重击 with startup, forward model motion, hit-frame target recheck, and target-bound crack VFX.
- Parallel combat audit confirmed `mountain-guard-break` was still in the generic fallback path. The old behavior applied armor damage and `guard-break` state at cast time, making the 330 ms hit frame only metadata.
- Parallel UI/CSS audit confirmed the DOM already emitted `ember-mountain-break`, `guard-break`, and `mountain-crack`, but CSS did not consume those hooks with dedicated player/weapon keyframes.
- Combat note: `mountain-guard-break` now schedules a single 330 ms dynamic hitbox from the player's 32 px lunge endpoint. It does not mutate enemy HP/armor/status on cast, and live target movement can turn it into hit or delayed MISS.
- Cancellation note: a monster hit before 330 ms clears the pending impact and active movement, so interrupted casts do not create ghost damage, stale impact VFX, or fake MISS feedback.
- Presentation note: browser computed-style validation confirmed dedicated `player-ember-mountain-break`, `weapon-guard-break`, `mountain-guard-break-cast-core`, and `mountain-guard-break-impact-core` animations, with enemy motion shown as `guard-break`.
- Queue note: remaining fallback skills are now defensive Iron/Guardian-style skills: `anvil-guard`, `molten-wall`, and `black-furnace-aegis`. Their selectors must account for `data-player-motion="shield"` rather than only `skill`.

## DNF-Style Anvil Guard Strict Guard Window Findings
- Current priority remains strict combat feel over heavier model geometry: `anvil-guard` is a defensive skill, but it still needs startup, model-following shield raise, delayed active window, and clear guard-rune VFX.
- Parallel combat audit confirmed `anvil-guard`, `molten-wall`, and `black-furnace-aegis` were still generic fallback skills. `anvil-guard` opened mitigation immediately through `applyPlayerSkillStatus()` and could also flow through generic skill hitbox behavior.
- Parallel UI/CSS audit confirmed shield motion already exists through `data-player-motion="shield"`, so defensive skill selectors need to match shield motion. Missing hooks were dedicated `iron-guard`, `guard-raise`, and `guard-rune` selectors/keyframes.
- Combat note: `anvil-guard` now schedules a delayed player shield-status effect at the catalog 180 ms frame. Cast-frame mitigation is gone, enemy HP is not mutated by a generic skill hit, and the guard window opens only after startup.
- Cancellation note: because the delayed shield status lives in `scheduledEnemyHitEffects` with `skillId="anvil-guard"`, the existing interruption path clears it when a monster hit lands during startup.
- Presentation note: `anvil-guard` now has dedicated `player-iron-anvil-guard`, `weapon-guard-raise`, and `guard-rune-cast-*` animations. The cast can show shield-raise motion while `data-shield-active` remains false until the real guard frame.
- Queue note: `molten-wall` and `black-furnace-aegis` remain next defensive follow-ups; both should reuse the delayed shield-status pattern but with stronger wall/aegis VFX and different startup/window values.

## DNF-Style Molten Wall Strict Shield Frame Findings
- Current priority remains strict combat feel over heavier model geometry: character models can stay simpler for this prototype phase, but `molten-wall` must have visible brace movement, a real delayed wall frame, cancelable startup, and dedicated VFX.
- Parallel combat audit confirmed `molten-wall` still fell through the generic skill path and immediate `shield` status path. The RED tests failed with `Expected scheduled effects for molten-wall`.
- Parallel UI/CSS audit confirmed catalog metadata already existed (`iron-wall`, `wall-guard`, `molten-wall`), but CSS had no dedicated player, weapon, or molten-wall VFX selectors/keyframes.
- Combat note: `molten-wall` now schedules a delayed player shield-status effect at the catalog 260 ms frame, moves the actor 6 px into the brace, does not mutate enemy HP at cast time, and skips immediate `shield` status for this skill.
- Cancellation note: a monster hit before 260 ms clears the pending wall status through the existing scheduled-effect interruption path, so the shield does not open after startup interruption.
- Presentation note: `molten-wall` now uses dedicated `player-iron-molten-wall`, `weapon-wall-guard`, and `molten-wall-cast-*` animations. The DOM keeps `data-shield-active="false"` before the wall frame and flips to shield motion at the real frame.
- Browser validation note: live computed-style verification confirmed 260 ms wall timing, no cast-frame shield or enemy hit, movement 240 -> 246, post-wall monster hit damage 14 with shield consumed, startup interruption produced one player hit and no pending wall effect, computed animations `player-iron-molten-wall`, `weapon-wall-guard`, `molten-wall-cast-core`, `molten-wall-cast-ring`, `molten-wall-cast-sparks`, and empty warning/error console output.
- Queue note: `black-furnace-aegis` is now the remaining defensive fallback and should get its own RED coverage before implementation.

## DNF-Style Black Furnace Aegis Strict Shield Frame Findings
- Current priority remains strict combat feel over heavier model geometry: `black-furnace-aegis` is a defensive advancement skill, so it must read as a stronger staged shield action with real startup, model-following brace movement, cancelable pending status, and dedicated VFX.
- Parallel combat audit confirmed the old `black-furnace-aegis` path fell through generic skill fallback and immediate `shield` status. Generic `applyPlayerHitbox()` would mutate enemy HP at input time while only stamping a future impact time, and `applyPlayerSkillStatus()` still opened shield immediately.
- Parallel UI/CSS audit confirmed the catalog and DOM already expose `iron-aegis`, `aegis-raise`, and `black-aegis`; missing work was strict combat scheduling plus dedicated CSS selectors/keyframes and stronger DOM assertions.
- Combat note: `black-furnace-aegis` now schedules a delayed player shield-status effect at the catalog 280 ms frame, moves the actor 8 px into the brace, does not mutate enemy HP at cast time, and skips immediate `shield` status for this skill.
- Balance note: unlike `molten-wall`, `black-furnace-aegis` is an advancement shield and now opens a stronger 1800 ms / 58% mitigation window. With the `black-furnace-vanguard` defense passive active, the browser-validated ash hit was reduced to 9 damage.
- Cancellation note: a monster hit before 280 ms clears the pending aegis status through the existing scheduled-effect interruption path, so the shield does not open after startup interruption.
- Presentation note: `black-furnace-aegis` now uses dedicated `player-iron-black-aegis`, `weapon-aegis-raise`, and `black-aegis-cast-*` animations. DOM assertions also cover `data-advancement-id="black-furnace-vanguard"` and no pre-frame target impact/damage markup.
- Browser validation note: live computed-style verification confirmed 280 ms aegis timing, no cast-frame shield or enemy hit, movement 240 -> 248, shield active only at the aegis frame, post-aegis monster hit damage 9 with shield consumed, startup interruption produced one player hit and no pending aegis effect, computed animations `player-iron-black-aegis`, `weapon-aegis-raise`, `black-aegis-cast-core`, `black-aegis-cast-ring`, `black-aegis-cast-sparks`, and empty warning/error console output.
- Queue note: the known defensive fallback set is now covered; future strict-combat work should target remaining generic non-defense skills, broader target-bound VFX, enemy control chains, and resource/save cleanup.

## DNF-Style Meteor Knuckle Strict Staged Impact Findings
- Current priority follows the user's latest clarification: character/monster geometry can stay lightweight during prototype completion, but actor motion, hit-frame timing, hit feedback, and skill/monster VFX are strict acceptance gates.
- Parallel combat audit selected `meteor-knuckle` as the highest-value remaining combat gap because its old handler used direct hit application for staged fall/impact hits. That changed HP, knockdown, and armor-break state at cast time while only stamping future event times.
- Combat note: `meteor-knuckle` now schedules two dynamic hitbox frames at 420 ms and 640 ms, keeps cast-frame enemy HP/state unchanged, and rechecks live targets at the falling meteor frame so moving out can miss and moving in can be hit.
- Motion note: the player now keeps the cast-frame model position while `activeSkillMovement` carries a 38 px meteor lunge from x=240 to x=278, so the action follows the model instead of teleporting state.
- Cancellation note: a monster hit before the fall frame clears all pending `meteor-knuckle` effects, preventing ghost damage, stale VFX, or fake MISS feedback after interruption.
- Presentation note: browser computed-style validation confirmed cast has no impact VFX, fall has target-bound `meteor-fall` VFX, impact has target-bound `meteor-impact` VFX, player animation is `player-ember-meteor-crash`, weapon animation is `weapon-meteor-smash`, fall core is `meteor-fall-core`, impact core is `meteor-impact-core`, screen flash is `meteor`, knockdown is visible, and the page check reported an empty error list.
- Queue note: parallel UI/CSS audit recommends `taotie-flame-breath` tick-level VFX next because boss breath currently exposes hit-index hooks but core/ring styling still falls back to generic enemy cast animations. Parallel combat audit also flags `liuli-rain` as the next direct-hit staged skill to convert from fake delay to real scheduled frames.

## DNF-Style Taotie Flame Breath Tick VFX Findings
- Current priority remains strict monster action feedback: boss model geometry can stay lightweight, but each monster skill hit needs readable motion and skill-specific VFX instead of static/generic cast effects.
- Local UI/CSS audit found `taotie-flame-breath` already exposes `data-enemy-attack-hit-index`, `data-enemy-attack-total-hits`, and `data-enemy-vfx-cue="taotie-flame-breath-sustain"`, so this slice can reuse existing DOM hooks without adding new state.
- Presentation note: `taotie-flame-breath` now has sustain-cue selectors for `.enemy-cast-core` and `.enemy-cast-ring`, replacing inherited `enemy-core-flicker` and `enemy-cast-pulse` with `taotie-flame-breath-sustain-core` and `taotie-flame-breath-sustain-ring`.
- Tick note: hit indexes 1, 2, and 3 now use separate trail animations `taotie-flame-breath-tick-one`, `taotie-flame-breath-tick-two`, and `taotie-flame-breath-tick-three`, giving the sustained boss breath visible progression across hits.
- Telegraph note: boss breath windup now has dedicated `.enemy-telegraph-taotie-flame-breath` zone/edge styling and `taotie-flame-breath-telegraph` / `taotie-flame-breath-telegraph-edge` keyframes instead of only relying on generic line telegraph treatment.
- Miss-feedback note: `taotie-flame-breath` now has a dedicated miss feedback selector and `taotie-breath-miss-feedback` animation, so escaped breath ticks read as a boss-specific whiff rather than a generic enemy miss.
- Browser validation note: computed-style validation confirmed all three ticks used the sustain core/ring animations, the three trail animation names were distinct, telegraph zone/edge used dedicated animation names, miss feedback used `taotie-breath-miss-feedback`, and the temporary check page reported an empty error list.
- Queue note: the next high-value strict combat follow-up remains `liuli-rain`, which still needs conversion from staged-looking direct hit application to real scheduled/dynamic rain frames.

## DNF-Style Liuli Rain Strict Scheduled Waves Findings
- Current priority follows the user's clarification: Liuli character geometry can stay lightweight, but the skill must have real action timing, model-following cast state, hit-frame damage, and target VFX.
- Parallel combat audit confirmed `applyLiuliRain()` still called `applyHit()` inside the skill action reducer. That immediately mutated enemy HP/position/status while only stamping hit events with future `occurredAtMs`, making the old staggered rain a fake delay.
- Parallel UI/CSS audit confirmed `src/ui/app.ts` already exposes the needed player, weapon, cast VFX, hit phase, and `glass-rain-fall` target VFX hooks. No app renderer change was needed for strict scheduling.
- Combat note: `liuli-rain` now appends a cast event, opens an active `liuli-rain` skill movement window through the final rain frame, locks initial targets, and schedules fixed target hit effects at 260/355/450 ms instead of applying damage at cast.
- Cancellation note: because the active skill window now carries `liuli-rain`, existing monster-hit interruption logic can clear pending rain waves before they resolve. The new regression covers interruption before the first rain.
- Presentation note: browser validation confirmed no cast-frame hits, HP unchanged at cast, first rain emits 2 hits, final rain emits 6 hits, event input timings are 260/355/450, hit phase is `rain`, cue is `glass-rain-fall`, active movement is `liuli-rain`, and computed animations remain `player-liuli-rain-cast`, `weapon-fan-arc`, `glass-rain-fall`, plus glass-rain target core/ring/shatter.
- Queue note: future Liuli polish can add a skill-specific weapon fan keyframe and optional delayed no-target miss behavior, but the core fake-delay damage bug is now fixed.

## DNF-Style Liuli Rain Dedicated VFX Findings
- Current priority remains visual readability over heavier model geometry: the skill can use the lightweight Liuli actor, but the weapon, cast field, and target bursts must not all feel generic.
- Local audit found `liuli-rain` already had a dedicated player cast animation and target `glass-rain` bursts, but its weapon still used the generic `fan` animation and the cast field lacked dedicated core/wave keyframes.
- CSS note: `liuli-rain` now overrides the generic fan arc with `weapon-liuli-rain-fan`, and `.skill-vfx-liuli-rain.skill-vfx-shape-glass-rain` now animates `.skill-core` and `.skill-wave` through `glass-rain-cast-core` and `glass-rain-cast-wave`.
- Browser validation note: computed-style validation confirmed `player-liuli-rain-cast`, `weapon-liuli-rain-fan`, `glass-rain-cast-core`, `glass-rain-cast-wave`, `glass-rain-fall`, and the existing glass-rain target core/ring/shatter animations with an empty error list.
- Parallel audit note: a read-only UI/CSS pass found no other catalog skill obviously falling back to generic catalog animation hooks, but it also found that several checks remain string-based rather than computed-style browser validation.
- Queue note: next visual-combat work should target `meteor-knuckle` computed-style validation first because it is a high-visibility Ember ultimate and the current test coverage verifies hooks more than actual resolved animation names.

## DNF-Style Meteor Knuckle Resolved Animation Regression Findings
- Current priority remains strict action readability over heavier model geometry: the Ember ultimate must prove the player, weapon, cast field, and target impacts resolve to the intended animation keyframes, not just render matching HTML hooks.
- Test gap note: `ui-smoke.test.ts` previously verified `meteor-knuckle` HTML markers, screen shake, and screen flash, but it did not assert that CSS cascade selected `player-ember-meteor-crash`, `weapon-meteor-smash`, `meteor-fall`, `meteor-fall-core`, or `meteor-impact-core`.
- Regression note: `ui-smoke.test.ts` now includes a lightweight CSS animation resolver for the project's class/attribute selector subset and asserts `meteor-knuckle` resolved animation names, including negative checks against `player-skill-cast` and `weapon-skill-flare`.
- Browser validation note: live computed-style validation on a temporary local page confirmed actual browser `animationName` values `player-ember-meteor-crash`, `weapon-meteor-smash`, `meteor-fall`, `meteor-fall-core`, and `meteor-impact-core` with an empty error list.
- Queue note: continue using resolved-animation checks for future high-visibility skills before adding heavier character or monster model detail; this keeps the acceptance bar focused on motion and VFX correctness.

## DNF-Style Taotie Forge Shackle Cue-Driven VFX Findings
- Current priority remains strict monster skill feedback: Taotie phase-2 control-chain effects must be keyed by real bind/slam cues, not by a broad enemy skill class that could animate during the wrong phase.
- Parallel audit note: a read-only agent selected `taotie-forge-shackle` because it is a boss phase-2 control-chain skill with dedicated CSS animations but weak resolved/computed-style validation.
- Test gap note: the old CSS put bind ring/core/trail animations on `.enemy-skill-taotie-forge-shackle` without requiring `data-enemy-vfx-cue="taotie-forge-shackle-bind"`, so an uncued active VFX node would still play bind animation.
- CSS note: the base forge-shackle ring/core/trail now set `animation: none`, while bind and slam animations are selected only by their exact `data-enemy-vfx-cue` values.
- Browser validation note: live computed-style validation confirmed uncued forge-shackle VFX parts resolve to `none`, bind resolves to `taotie-forge-shackle-ring`, `taotie-forge-shackle-bind-core`, and `taotie-forge-shackle-chain-trail`, and slam resolves to `taotie-forge-shackle-slam-ring`, `taotie-forge-shackle-slam-core`, and `taotie-forge-shackle-slam-trail` with an empty error list.

## DNF-Style Taotie Devour And Ash Summon Cue-Driven VFX Findings
- Current priority remains strict boss skill feedback: phase-specific boss VFX must not animate from broad skill classes before an active cue exists.
- Local audit found `taotie-devour-pull` and `taotie-ash-summon` had the same broad-selector problem as forge shackle: ring/core/trail animations were attached directly to `.enemy-skill-*`, while combat events provide exact active cues `taotie-devour-bite` and `taotie-ash-summon-rift`.
- CSS note: both boss skills now set base ring/core/trail `animation: none`; `taotie-devour-bite` enables the devour vortex ring/core/trail, and `taotie-ash-summon-rift` enables the summon rift ring/core/trail.
- Browser validation note: live computed-style validation confirmed uncued devour/summon VFX parts resolve to `none`, devour active VFX resolves to `taotie-devour-vortex-ring/core/trail`, summon active VFX resolves to `taotie-ash-summon-rift-ring/core/trail`, and the temporary check page reported an empty error list.
- Queue note: a read-only follow-up audit selected `flowing-light-chain` next because its staged three-hit visual currently locks targets at cast time instead of rechecking live positions at hit frames.

## DNF-Style Flowing Light Chain Live Hit-Frame Recheck Findings
- Current priority follows the user's latest clarification: character modeling can stay simpler for now, but combat animation flow, model-following attacks, strict hit frames, hit feedback, skill VFX, monster VFX, and action-state changes remain hard acceptance criteria.
- Read-only audit found `flowing-light-chain` scheduled staged-looking hits, but still selected target ids at the cast frame. That meant enemies that moved out could still be hit, and enemies that moved into the slash path before the real hit frame could be ignored.
- RED note: the first live-recheck test was corrected to create a real third enemy. The initial helper only repositioned existing room enemies, and this room starts with two enemies.
- Combat note: `flowing-light-chain` now uses dynamic scheduled hitboxes for its 220/340/470 ms slash frames, rechecking live enemy positions at each frame instead of carrying cast-frame target ids.
- MISS note: no-target feedback is delayed until the 220 ms opening slash and only emits once; cross/finish frames do not spam MISS when still empty.
- Browser validation note: a temporary local page confirmed times `[220,340,470]`, three hits only on the moved-in third target, old target HP stayed `[180,180]`, MISS count stayed `0`, and computed animations resolved to `player-liuli-light-chain-cast`, `weapon-chain-cut`, `flowing-chain-cast-*`, and `flowing-chain-impact-*` with no browser warnings/errors.
- Cleanup note: the old `selectFlowingLightChainTargets()` cast-frame helper was removed to prevent future regression back to input-frame target locking.

## DNF-Style Prism Step Live Hit-Frame Recheck Findings
- Current priority remains strict combat feel over heavier character geometry: `prism-step` must behave like a real dash strike, with model-following movement, live target recheck, delayed MISS, target VFX, and no ghost hits on enemies that left the path.
- Read-only UI audit found `prism-step` already had DOM coverage for delayed path-pierce impact, but animation coverage was mostly string-level. The actual CSS selectors resolve `player-liuli-step-dash`, `weapon-prism-dash`, `prism-afterimage-*`, and `prism-pierce-*`; browser computed-style validation was therefore used for this slice.
- RED note: focused combat tests failed because old `selectPrismStepTargets()` carried cast-frame target ids, and an empty path produced immediate MISS with no scheduled hit frame.
- Combat note: `prism-step` now schedules one dynamic path hitbox at the 165 ms dash impact frame, centered on the dash path, targeting up to two live enemies. It keeps the existing 104 px model-following dash, `pierce` phase, `prism-pierce` cue, stagger tag, and target-bound VFX window.
- MISS note: empty-path feedback is now scheduled at the same 165 ms impact frame; there is no cast-frame MISS.
- Browser validation note: a temporary local page confirmed live hit count `1` only on the moved-in third target, old target HP stayed `[160,160]`, new target HP became `124`, MISS count stayed `0` before 165 ms and became `1` at 165 ms for the empty-path scenario, and computed animations resolved to `player-liuli-step-dash`, `weapon-prism-dash`, `prism-afterimage-core/wave/sparks`, and `prism-pierce-core/ring/shards` with no browser warnings/errors.
- Cleanup note: the old `selectPrismStepTargets()` cast-frame helper was removed so future work cannot silently reintroduce input-frame target locking.

## DNF-Style Mechanism Shadow Net Live Bind-Frame Recheck Findings
- Current priority remains strict combat feel over heavier model geometry: `mechanism-shadow-net` must read as a real staged control field, with live bind-frame target checks, snap-only-bound behavior, visible player/weapon cast motion, and cue-specific target VFX.
- Read-only UI/CSS audit found that app markup already exposes the needed hooks for player preset `ink-shadow-net`, weapon arc `net-cast`, cast field `mechanism-net`, target cues `mechanism-net-bind` / `mechanism-net-snap`, and controlled enemy motion. The main gap was combat target timing, not renderer plumbing.
- RED note: focused tests failed because the old implementation selected target ids during cast and scheduled fixed target effects. Moving the original enemies out before 290 ms still hit them, while an initially empty net emitted immediate MISS and had no scheduled bind/snap frame.
- Combat note: `mechanism-shadow-net` now schedules dynamic hitboxes at 290 ms and 470 ms. Bind rechecks live targets around the net center; snap uses `requiresStatusSourceSkillId` so only enemies controlled by this cast can be pulled and damaged.
- MISS note: empty-net feedback is delayed until the bind frame and emitted once. The snap frame has `missOnEmpty: false` so a missed bind does not create duplicate whiff feedback or ghost VFX.
- Presentation note: the skill now opens an `activeSkillMovement` window through the snap frame, so the actor/weapon/cast field animate during the staged trap even though the character model remains lightweight for the prototype phase.
- Browser validation note: a temporary local page confirmed bind/snap times `[290,470]`, only the moved-in target was hit twice, old target HP stayed `[260,240]`, empty-net MISS counts were `0/0/1/1`, no cast-frame damage or controlled enemy DOM appeared, and computed animations resolved to `player-ink-shadow-net-cast`, `weapon-net-cast`, `mechanism-net-cast-core/ring/sparks`, `mechanism-net-bind-core/ring/shards`, and `mechanism-net-snap-core/ring/shards` with no browser warnings/errors.
- Queue note: remaining staged control or ultimate skills that still use fixed target-id `scheduleEnemyHitEffect()` should be audited next. `mountain-crack-hammer` remains a likely candidate.

## DNF-Style Mountain Crack Hammer Live Stagger-Frame Recheck Findings
- Current priority remains strict combat feel over heavier model geometry: `mountain-crack-hammer` must behave like a real two-stage Iron hammer, with live stagger-frame target checks, impact-only-staggered behavior, delayed whiff feedback, visible control/knockdown enemy motion, and cue-specific VFX.
- Read-only UI/CSS audit found renderer hooks were already present for preset `iron-mountain-crack`, weapon arc `mountain-hammer`, cast VFX `mountain-crack`, target cues `mountain-hammer-stagger` / `mountain-crack-impact`, controlled enemy motion, and knockdown enemy motion. The gap was combat target timing plus lack of browser computed-style proof.
- RED note: focused tests failed because the old implementation selected target ids during cast and scheduled fixed target effects. Moving original enemies out before 290 ms still hit them, and an initially empty hammer emitted immediate MISS with no scheduled stagger/impact frames.
- Combat note: `mountain-crack-hammer` now schedules dynamic hitboxes at 290 ms and 380 ms. Stagger rechecks live targets and tags this skill as the status source; impact requires that source so late entrants do not receive final-hit ghost damage or knockdown.
- MISS note: empty-hammer feedback is delayed until the stagger frame and emitted once. The impact frame uses `missOnEmpty: false` to avoid duplicate whiffs after a missed stagger.
- Preservation note: the existing large-frame behavior remains covered: a monster hit that already landed at 200 ms does not delete later mountain hammer hits. This avoids changing old combat priority while fixing target-lock timing.
- Browser validation note: a temporary local page confirmed stagger/impact times `[290,380]`, only the moved-in target was hit twice, old target HP stayed `[280,260]`, empty-hammer MISS counts were `0/0/1/1`, no cast-frame damage appeared, and computed animations resolved to `player-iron-mountain-crack-cast`, `weapon-mountain-hammer`, `mountain-crack-cast-core/ring/sparks`, `mountain-hammer-stagger-core/ring/shards`, `mountain-crack-impact-core/ring/shards`, `monster-controlled-bind`, and `monster-knockdown-drop` with no browser warnings/errors.
- Queue note: continue auditing any remaining `scheduleEnemyHitEffect()` staged player skills; fixed-target scheduling should be reserved only for explicit lock-on designs such as mark detonation or already-documented target locks.

## DNF-Style Furnace Step Live Shoulder-Impact Recheck Findings
- Current priority follows the user's clarification: character and monster model geometry may stay lightweight for this playable prototype, but combat action flow, actor-following movement, strict hit frames, hit feedback, skill VFX, and monster VFX remain hard acceptance criteria.
- Read-only UI/CSS audit found `furnace-step` already had the required renderer hooks for `ember-shoulder`, `dash-burst`, `furnace-trail`, and `furnace-shoulder-impact`; the main issue was cast-frame target locking.
- RED note: focused tests failed because old `selectFurnaceStepTargets()` locked a target id at input time and emitted immediate scheduled MISS for an empty rush. Moving the old target away before 170 ms still hit it, while a target entering the path before impact was ignored.
- Combat note: `furnace-step` now schedules a dynamic path hitbox at 170 ms. The active player movement remains the source of the shoulder rush presentation, while the hitbox samples live enemy positions at the impact frame.
- Edge note: the dynamic path origin is shifted to the shoulder start point. This keeps a monster centered behind the player from being selected merely because its hurtbox edge overlaps the front boundary.
- MISS note: empty rushes now use the same scheduled impact effect and emit MISS only at the shoulder-impact frame. If an enemy enters the path before that frame, the attack hits instead of reporting a stale whiff.
- Browser validation note: a temporary local page confirmed a single dynamic scheduled effect with `hasTargetId=false`, `hasDynamicHitbox=true`, impact time `170`, zero pre-impact hits/bursts, moved-out targets ignored, moved-in targets hit, and computed animations resolving to `player-ember-shoulder-rush`, `weapon-dash-burst`, `furnace-trail-cast-core/ring/sparks`, and `furnace-shoulder-impact-core/ring/shards` with no browser warnings/errors.
- Queue note: continue auditing remaining staged player skills that still use fixed target-id scheduling. Treat fixed target scheduling as acceptable only for explicit lock-on designs.

## DNF-Style Heat Bloom Live Draw-Frame Recheck Findings
- Current priority remains strict combat feel over heavier geometry: `heat-bloom` must behave like a real delayed field, not a cast-frame target lock with delayed-looking VFX.
- Read-only UI/CSS audit found the renderer already exposes the required hooks for `ember-bloom`, `pull-bloom`, `heat-bloom`, `heat-bloom-draw`, `heat-bloom-eruption`, and airborne enemy feedback. The gap was combat target timing.
- RED note: focused tests failed because old `selectHeatBloomTargets()` selected targets at input time. Moving an old target out before 240 ms still drew it, and an initially empty field emitted immediate MISS with no scheduled dynamic draw/eruption effects.
- Combat note: `heat-bloom` now schedules dynamic hitboxes at 240 ms and 390 ms. Draw samples live enemies around the fixed bloom center and applies this skill as the status source.
- Eruption note: the eruption frame requires `requiresStatusSourceSkillId: "heat-bloom"`, so only enemies actually drawn by this cast can receive launcher damage. Enemies entering after draw no longer get ghost final-hit damage.
- MISS note: empty-field feedback is delayed until the 240 ms draw frame. The 390 ms eruption frame uses `missOnEmpty: false`, preventing duplicate whiffs after an empty draw.
- Browser validation note: a temporary local page confirmed queued effects were dynamic and targetless, times stayed `[240,390]`, no pre-draw impact burst appeared, moved-out targets were ignored, moved-in targets were drawn and erupted, initially empty fields could still catch a target entering before draw, airborne eruption feedback appeared, cast anchor stayed at `--actor-x: 36.67%`, and computed animations resolved to `player-ember-bloom-cast`, `weapon-pull-bloom`, `heat-bloom-cast-core/ring/sparks`, `heat-bloom-draw-core/ring/shards`, and `heat-bloom-eruption-core/ring/shards` with no browser warnings/errors.
- Queue note: `furnace-heart-overdrive` remains the main non-lock-on Ember skill still worth auditing for fixed target scheduling; keep explicit lock-on scripts such as marked detonations separate.
