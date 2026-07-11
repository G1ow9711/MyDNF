# Task Plan: DNF-Inspired Single-Player Action RPG Prototype

## Goal
Design and, after approval, implement a mature playable offline side-scrolling action RPG prototype inspired by Dungeon Fighter Online, with original assets/mechanics, flashy skills, combat feel, at least four base classes, class advancement gameplay, economy systems, enhancement/amplification, shop, costumes, gift packs, and high replay value.

## Current Phase
Phase 5 - Verification and Delivery (ongoing strict-combat continuation)

## Phases

### Phase 1: Requirements, Research, and Brainstorm
- [x] Inspect project state
- [x] Capture initial constraints
- [x] Research genre/system references
- [x] Brainstorm feasible feature set
- [x] Ask needed scope question
- **Status:** complete

### Phase 2: Design Approval
- [x] Propose 2-3 implementation approaches with trade-offs
- [x] Present focused design for first playable version
- [x] Get user approval before implementation
- [x] Write design doc under `docs/superpowers/specs/`
- **Status:** complete

### Phase 3: Implementation Plan
- [x] Read next required planning/implementation skills
- [x] Break approved design into build tasks
- [x] Decide whether to use subagents for independent work
- [x] Prepare local runtime/cache paths under `.codex-local`
- **Status:** complete

### Phase 4: Build Playable Prototype
- [x] Scaffold game project
- [x] Implement Task 2 types and data catalog
- [x] Implement Task 3 state, save, inventory, and loadouts
- [x] Implement Task 4 reinforcement and amplification systems
- [x] Implement Task 5 market, auction, shop, packs, and boxes
- [x] Implement Task 6 four base classes and advancement system
- [x] Implement story and quest system
- [x] Expose active quest tracker in dungeon and connect app actions to quest events
- [x] Implement core movement/combat/enemy loop
- [x] Implement skills and visual effects
- [x] Implement town UI and system panels
- [x] Expose class selection and advancement in player-facing UI
- [x] Expose inventory equip, compare, sell, dismantle, and lock actions
- [x] Implement loot, trade, enhancement, amplification, shop, costumes, and packs
- [x] Add Trade Credits as a distinct NPC-trade currency
- [x] Evaluate and show 2/3/5-piece set bonuses and mixed build tags
- [x] Make master/music/SFX volume controls update audio state
- [x] Add sound/visual feedback where feasible
- [x] Add formal per-class combat resource persistence with legacy `heat` save migration
- [x] Persist master/music/SFX settings separately from character saves
- **Status:** complete

### Phase 5: Verification and Delivery
- [x] Run lint/build/tests where available
- [x] Start local server or provide local HTML entry
- [x] Verify gameplay in browser with screenshots/pixel checks if web-based
- [x] Add reset-save confirmation flow
- [x] Update progress and findings
- [x] Final handoff with paths and run command
- [x] Add mounted town economy click acceptance and reload persistence
- [x] Verify flowing-light-chain slash origins follow the moving actor at every phase
- [x] Complete serial real-browser regression for keyboard combat, Boss, save, and economy
- [x] Add live Boss hazard sidestep and heavy-hit quick-recover keyboard acceptance
- [x] Complete fresh-save Cinder-to-Liuli campaign, chapter-two, and epilogue browser acceptance with reload persistence
- [x] Add Taotie phase-three armor pulse, bounded ash summons, room recovery, and serial real-browser combat acceptance
- [x] Add consumable quickbar, recovery/revival, combat drops, shop supplies, save migration, and serial real-browser acceptance
- [x] Add Ink marked-target detonation resource return and serial real-browser acceptance
- [x] Add skill-point growth, rank-scaled skills, local-save migration, and serial real-browser acceptance
- **Status:** ongoing for continuation polish; latest full verification is tracked in `progress.md`

## Key Questions
1. Should first delivery be a browser-playable prototype, a desktop executable prototype, or a code-heavy foundation?
2. Which scope should be prioritized first: combat feel, economy depth, or content breadth?
3. Can early mechanical tests use temporary placeholder art? Current answer: yes during internal mechanics work only; final playable delivery must replace player, environment, and key UI art with detailed original assets.

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Treat as original DNF-inspired prototype, not asset/code clone | Avoid IP infringement while matching requested genre feel and systems |
| Use project-local runtime/cache folders | User requested local storage under project via AGENTS instructions |
| Pause implementation until design approval | `superpowers:brainstorming` hard gate requires design approval before code/scaffold |
| Initialize git and commit design spec | Brainstorming workflow requires committing the written spec; repository was previously absent |
| Use Chinese display names in spec | User requested Chinese-style maps and Chinese-facing deliverables must avoid garbled or English-first naming |
| Treat approval as required before code | `superpowers:brainstorming` requires user review/approval of written spec before implementation planning or code |
| Use Chinese git commit messages | User explicitly required all git commit messages to be Chinese |
| Add at least four base classes and advancement gameplay | User expanded the goal on 2026-07-04; the earlier one-class vertical slice is no longer sufficient |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `git status --short` failed: not a git repository | 1 | Logged repo state; will not rely on git until initialized or requested |
| Browser ground-heavy follow check reported missing heavy impact | 1 | Root cause was the temporary check page writing `enemy.x/y` instead of real `enemy.position.x/y`; fixed the fixture and reran browser validation successfully |
| PowerShell rejected `&&` while staging | 1 | Re-ran staging and status as separate commands |
| `git add` found a stale worktree `index.lock` | 1 | Verified no `git.exe` process was running and removed the 0-byte stale lock |
| PowerShell treated an unescaped regex pipe as a command while auditing `marking-bolt` | 1 | Re-ran later searches with safer quoting and avoided pipe-heavy ad-hoc regex in shell |
| Focused `marking-bolt` RED initially failed on insufficient Ink resource | 1 | Updated the new fixtures to use an Ink class state with enough `heat`/resource for the skill cast |
| Focused `marking-bolt` interruption test expected a hit from an out-of-range monster setup | 1 | Moved the interruption fixture to a close enemy after the cast so the monster hit genuinely cancels the pending mark |
| Focused `glass-lotus` UI GREEN initially counted `data-vfx-cue` twice per hit | 1 | Scoped the new assertion to skill-impact burst nodes because generic hit sparks also expose the same cue for existing VFX consumers |
| PowerShell rejected double-quoted `rg` patterns containing `|` while auditing monster skills | 1 | Re-ran with simpler single-quoted searches and avoided pipe-heavy regex in shell commands |
| PowerShell rejected a double-quoted multi-pattern `rg` while auditing Iron/UI gaps | 1 | Re-ran narrower searches and avoided pipe-heavy regex in shell commands |
| Chain-cleave RED patch first hit the previous boss test fixture | 1 | Reviewed `git diff`, restored the unrelated forge-shackle coordinate, and reran focused boss tests |
| First real-browser computed-style RED failed while deleting the Edge profile lockfile | 1 | Updated the CDP helper to wait for browser process exit and retry profile deletion |
| Browser GREEN first failed because flame-breath trail kept shorthand duration | 1 | Increased runtime duration override specificity so hit-index trail selectors still use `--enemy-vfx-duration` |
| Full suite failed after CSS selector hardening because UI smoke expected the old flame-breath hit-index selectors | 1 | Updated the static smoke assertions to require the new cue-gated selectors |
| Build failed after adding `@types/node` because Node timer globals conflicted with browser timer assumptions | 1 | Limited build globals in `tsconfig.json`, excluded test sources from app typecheck, and changed browser audio timer storage to `ReturnType<typeof globalThis.setInterval>` |
| Default parallel browser suite stalled with many local Edge profiles | 1 | Verified only project-local test processes, stopped them, then ran browser regression serially with one Vitest worker |
| Flowing Light Chain could miss the finisher after actor movement | 1 | Added endpoint regression and made each chain stage resolve from the actor position sampled at that stage frame |
| Full serial town acceptance assumed the first reinforcement click always reached +1 | 1 | Kept real reinforcement randomness and changed the browser test to confirm each material-consuming click, retrying a bounded number of times until +1 is reached |
| Full serial combo-cancel acceptance used a fixed coordinate during an enemy attack window | 1 | Changed the real keyboard route to acquire the live enemy range, wait for a completed attack cycle and player recovery, then start the light-hit cancel |
| First multi-agent spawn rejected an incompatible full-history explorer role | 1 | Reissued the two independent read-only audits without full-history forking |
| Five-room Liuli Furnace browser route lost its execution context | 1 | Captured the failure in a project-local test log; keep the route pending targeted stage-level diagnosis instead of treating it as evidence of completion |
| Full serial chapter-two browser route accepted a mode change but the first real trade click did not update state | 1 | Stabilized the CDP click after scrolling with two animation frames and verified its center receives pointer events before dispatching real mouse input |
| Click helper stabilization expression used `await` in a non-async page function | 1 | Made the evaluated page function async, then reran the focused failing route and the complete browser suite |

## Notes
- Project root at start: `F:\My_DNF`.
- Current project contains only `.codex-local`.
- Browser/visual verification likely needed because this is a game/UI task.
- GitHub remote configured: `https://github.com/G1ow9711/MyDNF.git`.
- User has allowed pushing to GitHub.
- Latest verified delivery is pushed to `origin/feature/vertical-slice`; local and remote refs were checked after the final-record commit.
- Current stricter continuation goal: move closer to DNF-style keyboard-controlled room combat; do not treat the current prototype as final until keyboard movement, combat gating, room flow, enemy behavior, and player-side acceptance are verified.
- Current visual-combat continuation goal: combat actors must not be static; player strikes, player skills, monster hit reactions, monster skill telegraphs, facing flips, lunge direction, and hurt knockback need visible motion on the bitmap model nodes themselves.
- Current guard-combat progress: shield windows now absorb control disruption for their full configured duration while retaining reduced damage and hit feedback; mounted browser evidence now covers Iron Forge Vanguard class selection, advancement, keyboard skill animation/VFX, and live monster VFX.
- Current Liuli verification gap: do not treat a pre-unlocked or endgame local save as five-room campaign proof. The next route must verify Cinder clear, quest claim, Liuli unlock, keyboard dungeon entry, five-room completion, settlement claim, and reload in stages.
- Current combat-loop continuation goal: monster skills must be real attacks with windup, hit/miss, player HP loss, defeat state, automatic combat ticking, and model motion for both attacker and target.
- Current strict-DNF continuation gap after class-resource mechanics: class resources now have first-pass unique rules in combat, but skill kits still need deeper per-skill behavior, better class-specific art, and clearer long-term resource persistence.
- Current hitbox continuation progress: player light/heavy attacks now respect facing, X range, Y lane range, nearest valid target, and miss events. Area/range skill tags now drive wider or multi-target hitboxes, and whiffed attacks still move the player model.
- Current combo/air-state progress: hit combo counter now tracks total chain separately from light-chain `comboStep`, launcher/heavy hits create timed airborne state, airborne enemies cannot attack, and slam skills can force knockdown.
- Current weapon-appearance progress: class weapons now have weapon types, rarity-linked tiers, role flavor, town/combat anchors, 20 SVG weapon assets, and a visible equipped weapon layer on the character in town and combat.
- Current skill-animation continuation goal: class skills need explicit animation presets, weapon arcs, and VFX shapes so player model, equipped weapon, and skill effect do not all use the same generic `actor-model-skill` / `weapon-skill-flare` presentation.
- Current visual priority clarification: character and monster models may stay lightweight for the playable prototype, but combat motion, combo flow, hit feedback, player/enemy action changes, monster skill telegraphs, and skill VFX must remain strict acceptance criteria.
- Current strict-combat presentation progress: skill hit frames now drive real impact event timing, hitstop/sparks/screen shake start on the hit frame, player cast motion starts at input, monster windup telegraphs are separated from active/miss monster skill VFX, and CSS consumes catalog skill duration through `--skill-duration`.
- Current per-skill script progress: `furnace-step` now applies startup dash movement before resolving hitbox, `heat-bloom` pulls enemies toward a skill center, `black-rain-volley` now schedules real delayed rain-wave hit frames, `iron-palm` now uses a timed model-following shield jab, and `anvil-guard` opens a real guard mitigation window with shield motion in UI.
- Current playable-skill accessibility progress: J/K class skills such as `anvil-guard` now render as clickable skill buttons while keyboard J/K remain basic light/heavy attacks.
- Current DNF-style room-flow progress: clearing a room now opens a right-side gate/door, walking to the gate enters the next room or boss room, and final gate completion returns to town with loot/quest progress.
- Current target-bound VFX progress: skill hit events now render per-target skill impact bursts with skill id, target id, catalog VFX shape, hit event id, and stagger index; `black-rain-volley` shows six black-rain bursts across two targets.
- Current staged-ultimate progress: `meteor-knuckle` now has a scripted fall/impact timeline, stronger final hitstop, forced knockdown, armor-break, scene-level ultimate shake, meteor flash, target ground-crack VFX, and player/weapon meteor-smash animations.
- Current Liuli skill progress: `liuli-rain` now has strict scheduled 260/355/450 ms dynamic rain-wave hitboxes anchored to the cast rain field: cast frame only queues waves, each wave rechecks live targets, empty-lane MISS is delayed to the first wave only, monster interruption clears pending waves, and target-bound glass-rain VFX plus dedicated weapon/cast-field animations are browser-verified.
- Current Liuli dash progress: `prism-step` now pierces up to two live enemies along the dash path at its real 165 ms impact frame, delays empty-path MISS to that frame, carries `pierce`/`prism-pierce` event metadata, staggers targets, and has browser-verified player/weapon/cast/impact prism-afterimage presentation.
- Current Ink advancement progress: `night-mark-detonation` now targets marked enemies, misses when no marks exist, emits lock/burst staged hits, consumes marks on final detonation, knocks targets down, and has dedicated player/weapon/cast/impact night-detonation presentation.
- Current Ink mechanism progress: `mechanism-shadow-net` now has delayed bind/snap stages, scheduled enemy effects, no cast-frame enemy mutation, control/stagger/pull behavior, aligned cast-field center, and dedicated player/weapon/cast/target mechanism-net presentation.
- Current Iron advancement progress: `mountain-crack-hammer` now has delayed stagger/impact stages, scheduled enemy effects, windup interruption, armor-break/knockdown impact, and dedicated player/weapon/cast/target mountain-crack presentation.
- Current monster-skill feedback progress: `ash-ember-spit`, `zheng-shockwave`, and `taotie-flame-breath` now render skill-specific target feedback classes and dedicated VFX plus hit/miss feedback animations; boss breath also has tick-specific sustain trails and telegraph animations, while `taotie-devour-pull`, `taotie-ash-summon`, and `taotie-forge-shackle` active VFX now resolve from exact cue selectors with browser computed-style verification.
- Current visual priority clarification: character and monster model detail may stay lightweight while the playable loop is being completed; combat motion smoothness, model-following attack movement, strict hit frames, hit feel, player/enemy action changes, skill VFX, and monster skill VFX remain strict acceptance criteria.
- Current monster-pattern progress: normal trash rooms now mix ranged `ash-ember-spit` with close-range `ash-crawler-burst`, including windup rush, circle telegraph, active explosion VFX, hit/miss feedback, and stagger interruption.
- Current elite-pattern progress: elite rooms now include `zheng-shockwave` plus `zheng-horn-charge`, giving Shan Hai Jing elites both circular quake pressure and line-telegraphed rush attacks with separate model motion/VFX/feedback.
- Current boss-pattern progress: boss now rotates `taotie-flame-breath`, `taotie-devour-pull`, and `taotie-ash-summon`; the devour skill pulls the player during windup, and the ash summon opens a timed rift that spawns two real ash-crawler minions with independent room-clear participation and VFX.
- Current boss-phase progress: Taotie now enters phase 2 at half HP, interrupts its current cast, emits a phase-burst event, schedules three arena forge-collapse hazards, and resolves hazard hit/miss based on player position at the impact frame with dedicated VFX/feedback.
- Current Taotie chain progress: phase 2 now chains forge shackle into `taotie-chain-cleave`, a strict drag/smash boss skill with two hit frames, windup pull, first-hit bind, second-hit knockback, skill-specific model motion, line telegraph, active VFX cues, and hit feedback.
- Remaining strict-DNF combat gaps: live hit-frame recheck for remaining staged control/impact skills, deeper scripts for remaining skills, resolved/browser animation regressions for remaining high-visibility boss skills, broader class-specific animation timelines, enemy hurtbox tuning, broader target-bound VFX coverage, weapon atlas/frame animation beyond static SVG assets, and stronger room-transition staging.
- Current save progress: player combat resources now persist per class in `classResources`, old `heat`-only saves migrate into the active class resource pool, and the `heat` field remains as a compatibility alias for older save/UI paths.
- Current stage-linked burst progress: `glass-lotus`, `mirrorflame-burst`, and `sword-prism-field` now require targets to be hit by the same skill's bind/lock frame before their bloom/burst frame can damage or show impact VFX on that target.
- Current room-transition progress: cleared rooms now render an `open-rift` gate with a real core/rift/threshold animation cue, while locked next-room gates do not leak the open-rift state.
- Current player-action presentation progress: player skill casts now expose a unified `windup` / `active` / `recovery` DOM stage contract with hit-frame timing and progress, so model/weapon/VFX animation checks can target real action phases instead of only generic skill motion.
- Current Iron advancement motion progress: `mountain-crack-hammer` now uses its 30 px model-following hammer step through the impact frame and exposes the movement hook in combat UI while preserving the existing heavy-hammer superarmor timing behavior.
- Current enemy skill hook progress: enemy skill-specific classes now exist as real model image classes, while telegraph and active monster VFX consume runtime attack/VFX duration variables verified by browser computed styles.
- Remaining monster-pattern gap: boss tier now has alternating attacks, summon/minion pressure, and first half-HP arena hazard, but still needs broader control chains and later multi-phase behavior variety.
- Current player-combat priority: character models may remain lightweight while the playable loop is built, but player skill movement must be timed and model-following, with delayed hit frames, cancelable pending impacts, and dedicated skill/weapon/cast/target VFX.
- Current Ember advancement progress: `furnace-heart-overdrive` now uses dynamic 360 ms pulse and 560 ms release hitboxes around the self-centered core, rechecks live targets at pulse, releases only enemies pulsed by this cast, delays empty-core MISS to pulse, and keeps dedicated overdrive player/weapon/cast/pulse/release VFX. Character and monster geometry may stay lightweight for the prototype phase, but action flow, strict hit frames, actor state changes, hit feedback, and skill/monster VFX remain the hard acceptance gate.
- Current review-fix progress: interrupted overdrive now clears stale cast VFX, same-frame monster impacts resolve before delayed whiff feedback, and a large-frame 360/560 ms release path is covered by tests.
- Current heat-bloom progress: `heat-bloom` now uses dynamic 240 ms draw and 390 ms eruption hitboxes around the fixed cast center, rechecks live targets at draw, only erupts enemies actually drawn by this cast, delays empty-field MISS to the draw frame, catches enemies that enter before draw, and browser-verifies player/weapon/cast/draw/eruption animations plus airborne eruption feedback.
- Current shadow-roll progress: `shadow-roll` now uses backward timed player movement, a 160 ms dynamic endpoint roll-shot hit/miss frame, cancelable pending impact, hit-frame target recheck, monster-miss-safe movement continuation, and dedicated `ink-roll` / `roll-shot` / `shadow-smoke` player, weapon, cast, and target-impact VFX.
- Current cinder-uppercut progress: `cinder-uppercut` now has a strict 180 ms forward rising launcher timeline, dynamic hit-frame hitbox, delayed whiff feedback, monster-interruption cancellation, combo-cancel metadata, airborne target reaction, and dedicated flame-column cast/impact VFX.
- Current combat-fidelity priority: character and monster models may stay lighter while the full loop is connected, but smooth model-following attacks, strict hit frames, cancelable delayed effects, target action changes, skill VFX, and monster skill VFX remain hard acceptance criteria.
- Current Ink starter progress: `ink-shot` now uses a strict 120 ms delayed projectile timeline, stationary cancelable cast state, live dynamic target recheck, rushing-monster sampling before hit selection, single-target piercing impact metadata, cast-origin anchored bolt VFX, and dedicated player/weapon/cast/target animations.
- Current Liuli starter progress: `glass-cut` now uses a strict 115 ms short forward slash timeline, model-following movement, swept-path dynamic target recheck from cast origin, same-frame monster-impact priority coverage, cancelable pending impact, and dedicated glass slash player/weapon/cast/target VFX.
- Current Ember starter progress: `spark-combo` now uses a strict 120 ms delayed jab-chain timeline, 26 px model-following forward movement, endpoint-based dynamic target recheck, delayed whiff feedback, same-frame monster-impact priority coverage, cancelable pending impact, and dedicated ember spark player/weapon/cast/target VFX.
- Current Liuli ultimate progress: `sword-prism-field` now uses a strict stationary cast, fixed field center, 390 ms dynamic lock frame, 610 ms dynamic burst frame, delayed whiff feedback, monster-interruption cancellation, knockdown burst, ultimate screen shake, prism-field flash, and dedicated player/weapon/cast/target VFX.
- Current Ember slam progress: `anvil-crash` now uses a strict 260 ms hammer-drop landing timeline, model-following jump-slam movement, landing-area dynamic hitbox, no cast-frame damage, monster-interruption cancellation, forced knockdown, target-bound anvil impact VFX, full-duration jump-slam player animation, and cast VFX anchored to the actual 74 px landing point.
- Current next-candidate note: read-only UI/CSS audit selected `earth-furnace-breaker` as the next larger Iron ultimate candidate because Iron still has weaker class presentation and the ultimate still lacks strict staged combat/impact/flash behavior.
- Current Iron ultimate progress: `earth-furnace-breaker` now uses a strict 260 ms earth-crack and 410 ms furnace-eruption timeline, model-following Iron charge movement, dynamic hit-frame target recheck, monster-interruption cancellation, guard-break/knockdown eruption, target-bound forge-quake impact VFX, dedicated player/weapon/cast/target animations, and ultimate forge-quake screen flash.
- Current black-rain strictness progress: `black-rain-volley` no longer mutates HP or emits impact VFX at cast time; it schedules 340/450/560 ms dynamic rain-wave hit frames, cancels pending waves when interrupted, and renders dedicated cast, weapon, and target core/ring/burst animations only on real impact frames.
- Current Iron starter progress: `iron-palm` now uses a strict 150 ms forward shield-jab timeline, model-following movement, endpoint-based dynamic hitbox, left-facing weapon mirroring, target-bound iron-spark impact VFX, and interruption-safe scheduled damage.
- Current DNF hotbar progress: combat movement now prioritizes arrow keys, while `A/S/D/F/G/H` map to the first six current-class skill slots with a fixed six-slot UI bar, visible hotkey badges, slot state hooks, and preserved legacy `L/U/I/O/Space` skill mappings.
- Current DNF command-input progress: six hotbar slots now have manual command sequences, `Z` command matching runs before heavy fallback, command casts carry `inputMethod: "command"`, pay 88% resource cost, receive 92% cooldown duration, preserve metadata through action buffering, and expose command chips/toast/UI hooks.
- Current Ink control progress: `ink-snare` now uses strict delayed 250 ms bind and 430 ms snap hit frames, live target recheck, delayed MISS, monster-interruption cancellation, target pull/control, and dedicated player/weapon/cast/bind/snap VFX hooks. Review fixes now require snap targets to have been bound by the same `ink-snare` cast and align the cast VFX field to the combat snare center.
- Current DNF jump progress: `C` is now a real player jump, not backstep. Player jump uses separate timed `jumping` / `landing` air state without changing combat lane `y`, renders dedicated model motion hooks and `player-jump-rise` / `player-jump-land` animations, and makes ground monster impacts MISS while airborne.
- Current DNF air-combat progress: `X/J` during the airborne jump window triggers a one-per-jump air-light attack with a 65 ms delayed hit frame, while `Z/K` now triggers a one-per-jump air-heavy slam with a strict 120 ms dynamic hit frame, movement/facing freeze, forced knockdown, cancel-on-interrupt/landing guards, `air-heavy` player/weapon motion, monster hit reaction, and `air-heavy-impact` VFX.
- Current DNF dash-attack progress: recent `Shift + horizontal movement` now opens a short dash-light window; `X/J` triggers a model-following forward slash with a strict 90 ms dynamic hit frame, interrupt cancellation, `dash-light` player/weapon motion, monster dash-hit reaction, and `dash-light-slash` impact VFX.
- Current DNF combo-cancel presentation progress: grounded light hit-confirm cancel is now visible through scene/player/slot `data-combo-cancel-*` hooks, skill-slot cancel highlighting, `data-skill-release-source="cancel"`, `CANCEL` toast feedback, and a player cancel-flash overlay while preserving normal skill animations.
- Current DNF ground-light strictness progress: grounded light attacks now animate immediately but apply HP damage, resource gain, hitstop, hit sparks, monster hit reaction, combo count, and cancel-window opening only on the scheduled 55/65/78 ms hit frame, with live target recheck, delayed miss, and interruption-safe pending damage cancellation.
- Current DNF ground-heavy strictness progress: grounded heavy attacks now animate immediately but apply HP damage, resource gain, hitstop, launcher/airborne state, hit sparks, and heavy impact VFX only on the scheduled 85 ms hit frame, with live target recheck, delayed miss, and interruption-safe pending damage cancellation.
- Current DNF ground-heavy movement progress: grounded heavy now moves the actual player actor 34 px toward the launcher point during the 85 ms windup, and the scheduled hitbox resolves from that moved endpoint rather than the input-frame origin.
- Current DNF combat-tick progress: automatic combat updates now run at 48 ms instead of 140 ms, so short windups such as the 85 ms grounded heavy show intermediate actor movement before the real impact frame.
- Current DNF ground-light movement progress: grounded light combo steps now create short actor movement (`ground-light-1/2/3`) and resolve hitboxes from the moved slash point while compensating range so total front reach stays stable.
- Current DNF ground-light VFX progress: grounded light combo hit events now carry `ground-light-1/2/3` phases and `ground-light-slash-1/2/3` cues, with separate target reactions and impact ring/slash animations for jab, cross, and launch.
- Current DNF impact-anchor progress: hit events now preserve the contact-point `impactPosition`, so target sparks, skill bursts, and damage numbers stay on the strike point while enemy models can still knock back or move independently.
- Current DNF enemy knockback presentation progress: enemy roots now visually slide from hit contact point to logical knockback endpoint over 160 ms, while hit sparks and damage numbers remain anchored at the contact point.
- Current DNF hitstop presentation progress: combat scene now exposes hitstop state so player, monster, weapon, and motion-trail animations freeze during the impact pause, while hit sparks and damage numbers continue playing.
- Current Zheng shockwave strictness progress: `zheng-shockwave` now has regression coverage for windup/no-damage-before-impact, real quake impact frame, live lane MISS sampling, active cue metadata, heavy player feedback, and stagger cancellation.
- Current legacy monster VFX cue-gate progress: `ash-ember-spit`, `ash-crawler-burst`, `zheng-shockwave`, `zheng-horn-charge`, and `taotie-flame-breath` active VFX now keep ring/core/trail idle without exact cue selectors, and active cues resolve to dedicated skill keyframes instead of generic enemy pulse/flicker/trail fallback.
- Current Taotie chain-link strictness progress: `taotie-chain-cleave` now records real connected hit indexes and gates its smash frame on the drag frame actually hitting, so dodging drag and re-entering before smash no longer creates a fake second-stage hit.
- Current real-browser VFX regression progress: a durable Edge/Chrome CDP-backed Vitest now verifies legacy monster VFX in real `getComputedStyle()`, including cue-gated idle parts, active cue animation names, hit-index flame-breath trails, and runtime `--enemy-vfx-duration` overrides.
- Current Iron shield-quake progress: `shield-quake` now uses a strict 280 ms delayed quake hitbox, model-following shield-slam movement, live target recheck, forced knockdown, and dedicated cast/target quake VFX instead of the generic input-frame skill hit path.
- Current Iron furnace-taunt progress: `furnace-taunt` now uses a strict 230 ms delayed roar control hitbox, model-following taunt movement, live target recheck, monster-interruption cancellation, pull/control target reaction, and dedicated furnace-roar cast/target VFX. Character modeling remains lightweight by design for this prototype phase; combat timing, actor motion, and VFX strictness remain the acceptance bar.
- Current Ink marking-bolt progress: `marking-bolt` now uses a strict 180 ms delayed contract-mark frame, keeps cast-frame targets unmarked, rechecks live targets at impact, cancels pending marks on monster interruption, applies target-bound `contract-mark` VFX only on the real hit frame, and renders dedicated player/weapon/cast/impact animations. Character and monster geometry may stay lightweight for this prototype phase, but model-following action, hit-frame timing, hit feedback, and skill/monster VFX remain strict gates.
- Current Ink crow-feint progress: `crow-feint` now has punishable startup, a delayed 90 ms evade/invulnerability window, backward model-following movement, a strict 190 ms dynamic `feint-shot` frame, live target recheck, delayed MISS, startup interruption cancellation, and dedicated `ink-feint` / `feint-shot` / `crow-feint` player, weapon, cast, and target-impact VFX.
- Current Liuli counter progress: `mirror-arc` now has punishable startup, a delayed 90 ms parry window, active reflect through 770 ms, a strict 210 ms model-following mirror slash, startup interruption cancellation, class-specific `mirror-counter` feedback, and dedicated `liuli-mirror` / `mirror-parry` / `mirror-arc` / `mirror-counter-burst` VFX. Character and monster geometry may stay lightweight for this prototype phase, but smooth action flow, strict frames, and skill/monster VFX remain the hard gate.
- Current Liuli control progress: `glass-lotus` now uses strict 180 ms bind and 320 ms bloom frames, model-following cast movement, live area recheck, delayed bind MISS, interruption cancellation, pull/control target reaction, bloom knockdown, and dedicated `liuli-lotus` / `lotus-bloom` / `glass-lotus` cast/bind/bloom VFX. Character and monster geometry may stay lightweight, but the action flow and VFX strictness remain the acceptance gate.
- Current Liuli advancement progress: `mirrorflame-burst` now uses strict 180 ms lock and 350 ms burst frames, model-following cast movement, live area recheck, delayed lock MISS, interruption cancellation, control on lock, knockdown on burst, dedicated `liuli-mirrorflame` / `mirrorflame-fan` / `mirrorflame-burst` cast/lock/burst VFX, and cast-field anchoring at the actual mirrorflame center.
- Current Ember advancement progress: `mountain-guard-break` now uses a strict 330 ms dynamic破防 impact, 32 px model-following lunge, live target recheck, delayed MISS, monster-interruption cancellation, target-bound `mountain-crack` impact, `guard-break` enemy motion, and dedicated `ember-mountain-break` / `guard-break` / `mountain-guard-break` player, weapon, cast, and impact VFX. Character and monster geometry may stay lightweight, but action flow and VFX strictness remain the acceptance gate.
- Current Iron guard progress: `anvil-guard` now uses a strict 180 ms delayed guard-open frame, 10 px model-following shield raise, no generic cast-frame enemy hit, interruptible startup, shield mitigation only after the guard frame, and dedicated `iron-guard` / `guard-raise` / `guard-rune` player, weapon, and cast VFX.
- Current Molten Wall progress: `molten-wall` now uses a strict 260 ms delayed shield-open frame, 6 px model-following brace movement, no generic cast-frame enemy hit, interruptible startup, shield mitigation only after the wall frame, and dedicated `iron-wall` / `wall-guard` / `molten-wall` player, weapon, and cast VFX.
- Current Black Furnace Aegis progress: `black-furnace-aegis` now uses a strict 280 ms delayed aegis-open frame, 8 px model-following brace movement, no generic cast-frame enemy hit, interruptible startup, stronger 1800 ms / 58% advancement shield mitigation only after the aegis frame, and dedicated `iron-aegis` / `aegis-raise` / `black-aegis` player, weapon, and cast VFX.
- Current Meteor Knuckle progress: `meteor-knuckle` now uses real 420 ms fall and 640 ms impact frames, no cast-frame damage/status mutation, 38 px model-following lunge, live target recheck, interruption cancellation, dedicated meteor fall/impact VFX validation, and an automated resolved-animation regression for player, weapon, cast, fall, and impact keyframes.
- Current monster VFX progress: `taotie-flame-breath` now uses cue-specific sustain core/ring animations plus hit-index-specific tick-one/tick-two/tick-three flame trails, so the three boss breath hits no longer share generic enemy cast pulse/flicker/trail presentation. Next strict-combat candidate is `liuli-rain` fake-delayed hits.
- Current Flowing Light Chain progress: `flowing-light-chain` now keeps its model-following dash and three 220/340/470 ms slash frames, but rechecks live targets at each hit frame instead of locking cast-frame target ids; no-target MISS feedback is delayed until the opening slash and the stale cast-frame target helper was removed.
- Current Prism Step progress: `prism-step` now keeps its model-following dash, resolves one dynamic path hitbox at 165 ms, rechecks live enemies at impact, delays MISS to the impact frame, and no longer carries a cast-frame target helper.
- Current Mechanism Shadow Net progress: `mechanism-shadow-net` now schedules dynamic 290 ms bind and 470 ms snap hitboxes around the net center, rechecks live targets at bind, snaps only enemies bound by this cast, delays empty-net MISS to the bind frame, and browser-verifies player/weapon/cast/bind/snap mechanism-net animations. Character geometry remains lightweight by scope; staged action timing and VFX strictness remain the hard gate.
- Current Mountain Crack Hammer progress: `mountain-crack-hammer` now schedules dynamic 290 ms stagger and 380 ms impact hitboxes, rechecks live targets at stagger, impacts only enemies staggered by this cast, delays empty-hammer MISS to the stagger frame, preserves prior large-frame monster-hit priority, and browser-verifies player/weapon/cast/stagger/impact plus controlled/knockdown enemy animations.
- Current Ember dash progress: `furnace-step` now keeps its 170 ms model-following shoulder rush, but resolves one dynamic path hitbox at the real shoulder-impact frame instead of carrying cast-frame target ids. Empty-path MISS is delayed to the impact frame, enemies that leave the rush path are not hit, enemies that enter before impact can be hit, and browser computed-style validation confirms player rush, weapon dash, cast trail, and target shoulder-impact animations.
- Current monster model-motion progress: enemy bitmap attack nodes now expose runtime attack stage/progress/duration and use skill-specific lunge distances, so small spit, crawler burst, Zheng horn charge, Taotie breath, devour, summon, and shackle no longer share the same generic 28 px lunge or fixed CSS animation duration. Browser computed-style validation confirmed `zheng-horn-charge` at 64 px / 780 ms and `ash-ember-spit` at 20 px / 520 ms.
- Current next-candidate notes: combat audit suggested delaying `night-mark-detonation` lock to the real `mark-lock` frame while preserving marked-target semantics; UI audit suggested adding shield-open impact VFX for `anvil-guard` / `molten-wall` / `black-furnace-aegis` without creating fake damage events.
- Current Iron shield-open progress: `anvil-guard`, `molten-wall`, and `black-furnace-aegis` now emit non-damage `player-status` events only on their real open frames, and the UI renders targetless `player-status-vfx` shield bursts with cue-specific animations. This preserves the user's clarified scope: model geometry can stay simple, but action timing, skill VFX, and combat feedback must be strict.
- Current Ink night-mark progress: `night-mark-detonation` now keeps cast-frame presentation only, rechecks marked enemies on the real 310 ms `mark-lock` frame, applies control/source state at that frame, delays no-mark MISS feedback until lock, and detonates only targets locked by the same cast at 490 ms. Browser computed-style validation confirmed cast, lock, and burst animation names with no lock impact before the lock frame.
- Current room-transition progress: walking into an opened room gate now creates a 480 ms `entering` transition instead of synchronously spawning the next room. The transition locks movement/actions/buffered input, delays loot settlement until completion, exposes `enter-rift` / `data-room-transition-state="entering"` DOM hooks, and animates the gate, player model, and weapon during the crossing.
- Current strict-combat clarification: character and monster geometry may stay lightweight while the full loop is completed, but combat motion smoothness, model-following attacks, real hit frames, hitstop/feedback, skill VFX, and monster skill VFX remain the hard acceptance gate.
- Current clear-room action-lock progress: cleared rooms now block direct `performAction()` combat actions so the player cannot spend resources, start cooldowns, queue hitboxes, or create fake whiff/combat effects after all monsters are dead; gate movement remains available.
- Current Flowing Light Chain phase-motion progress: `flowing-light-chain` hit events now drive player and weapon phase hooks for `chain-open`, `chain-cross`, and `chain-finish`, so the model and weapon can follow the actual slash stage instead of using only one whole-skill animation.
- Current Iron ultimate stage-link progress: `earth-furnace-breaker` eruption now requires the same cast's `earth-crack` stage to have hit and marked the target first, preventing late entrants from receiving fake eruption damage, knockdown, armor-break, or target-bound VFX.
- Implementation approved by user.
- Current gate: implementation plan must be written before scaffolding/code.
- GitHub push phrase to upload commits: `允许 push`.
- Active implementation branch/worktree: `feature/vertical-slice` at `.worktrees/vertical-slice`.
- Completion audit found the class/advancement system existed in data and reducers, but needed a visible player-facing panel before final handoff.
- Current Liuli rain wave VFX progress: `liuli-rain` now keeps its strict 260/355/450 ms live-recheck waves, but each wave emits distinct `rain-open` / `rain-fall` / `rain-shatter` phases, distinct glass-rain cues, 300/340/420 ms VFX windows, and real-browser-verified target impact core/ring/shards animations.
- Current next-candidate notes: parallel audits selected `earth-furnace-breaker` duplicate MISS after an empty crack and forge-quake root VFX not consuming `earth-furnace-crack` / `earth-furnace-eruption` cues.
- Current Earth Furnace Breaker feedback progress: empty `earth-crack` now produces only the real crack-frame MISS and no fake delayed eruption MISS, while cracked targets that escape before eruption still produce eruption MISS. Forge-quake root VFX now consumes `earth-furnace-crack` and `earth-furnace-eruption` cues in real browser CSS.
- Current Black Rain strictness progress: `black-rain-volley` now splits its 340/450/560 ms waves into `black-rain-open` / `black-rain-fall` / `black-rain-burst`, uses 300/360/440 ms target VFX windows, browser-verifies distinct target core/ring/shards animations, and emits only the real opening MISS when all waves whiff.
- Current Overdrive root VFX progress: `furnace-heart-overdrive` root player skill VFX now consumes `overdrive-core-pulse` and `overdrive-core-release` cues in the browser cascade instead of staying on the cast-only core animation.
- Current Sword Prism and Mirrorflame VFX progress: `sword-prism-field` root lock/burst VFX and target lock/burst impact VFX now consume their real phase cues in the browser cascade, and `mirrorflame-burst` root lock/burst VFX no longer falls back to generic cast animation.
- Current Meteor Knuckle stage-link progress: `meteor-knuckle` impact now requires the same cast's fall-frame source mark, so enemies that enter only before the 640 ms impact frame do not receive fake impact damage, armor break, knockdown, or target-bound VFX.
- Current weapon silhouette progress: class/tier weapon layers now have real-browser coverage for gauntlet, blade, crossbow, and shield sizing plus mythic silhouette differences, and mythic weapon CSS now changes actual pseudo-element geometry instead of only changing art URLs/palette.
- Current Heat Bloom VFX progress: `heat-bloom` draw and eruption target impacts now consume their real cue windows in the browser cascade, so all target impact parts follow the 340 ms draw and 520 ms eruption windows.
- Current Taotie forge shackle progress: `taotie-forge-shackle` slam now requires the bind hit to connect first, preventing fake second-stage damage/hurt-lock when the player dodges bind and re-enters before slam.
- Current Spark Combo staging progress: `spark-combo` now resolves as three real delayed hit frames (`spark-jab`, `spark-cross`, `spark-finish`) with model-following origins, separate damage/knockback/hitstop, event-level VFX windows, and browser-verified player/weapon/root/target animations.
- Current Taotie forge-collapse motion progress: Taotie half-health phase events now drive the boss model into an attack motion with a phase skill id, runtime duration, lunge distance, and real-browser-verified `monster-taotie-forge-collapse` animation while hazards continue to resolve from their own strict impact frames.
- Current DNF hitstop combat-freeze progress: active hitstop now has a combat-frame branch that freezes player movement/position, skips normal effect and enemy-impact resolution during the pause, and shifts active monster attack timers plus arena hazard impacts by the frozen duration. Player scheduled skill hit frames remain on their catalog timelines.
- Current Ink/Iron trap root VFX progress: `ink-snare` and `mechanism-shadow-net` root player skill VFX now consume bind/snap cue metadata in the real browser cascade instead of falling back to generic cast animations.
- Current Flowing Light Chain target-impact progress: `flowing-light-chain` target-bound impact VFX now consumes `flowing-chain-open`, `flowing-chain-cross`, and `flowing-chain-finish` cues in the real browser cascade, with separate core/ring/shards keyframes and event-level 300/340/420 ms windows.
- Current mid-frame hitstop progress: when hitstop starts inside a large `stepCombat()` frame, active monster attack timers and arena hazards now shift for the already-consumed freeze time and any remaining freeze time, while player scheduled skill hit/miss frames stay on their catalog timelines. This preserves multi-stage player combo flow but prevents monsters/hazards from landing during the freeze.
- Current strict-combat clarification: character and monster geometry can stay lightweight while the full loop is completed, but attack motion flow, model-following actions, strict hit frames, hitstop, hit feedback, skill VFX, and monster skill VFX are hard gates.
- Current next-candidate notes: remaining high-value strict-combat candidates are broader target-impact duration hardening beyond flowing-light-chain, defensive guard/parry same-frame priority, and deeper animation-state coverage for monster/player model-following attacks.
- Current target-impact duration progress: `meteor-knuckle` fall/impact and `mirrorflame-burst` lock/burst target impacts now use cue-specific browser-resolved animations and event runtime windows, so target bursts do not fall back to generic or fixed-duration subparts.
- Current defensive-priority and boss-motion progress: defensive shield-open status effects now resolve before same-frame monster impacts, and `taotie-chain-cleave` drag/smash events now drive distinct boss model cues and browser-resolved model animations instead of one whole-skill lunge.
- Current project-agent rule: `AGENTS.md` is UTF-8 readable Chinese and explicitly requires multi-agent parallelism where safe, Chinese commit messages, lightweight models for this phase, and strict combat motion/VFX acceptance.
- Current mounted-control progress: mounted combat input now tracks held arrow and Shift keys across 48 ms combat ticks, so player movement continues while a key is held and stops on keyup instead of moving only once per keydown.
- Current room-gate control progress: held combat-tick movement is allowed after a room is cleared and can enter the opened gate, while combat actions remain blocked in cleared rooms.
- Current strict-combat clarification: character/monster geometry can stay lightweight for the playable prototype, but keyboard control feel, smooth continuous motion, model-following attacks, real hit frames, hitstop, hit feedback, skill VFX, and monster skill VFX remain hard gates.
- Current next-candidate notes: parallel audits identified `night-mark-detonation` target VFX duration/cue hardening and an `iron-palm` live-target/interruption guardrail as good next strict-combat candidates.
- Current night-mark target VFX progress: `night-mark-detonation` target lock/burst impact subparts now consume `data-vfx-cue` plus event `--skill-duration` in a real browser, so lock uses the 360 ms event window and burst uses the 520 ms event window instead of fixed CSS timings.
- Current DNF hotkey buffer progress: `A/S/D/F/G/H` and legacy skill hotkeys can now enter the action buffer when a skill cooldown will recover before the current action unlocks, matching command-input buffering for tighter keyboard combat feel.
- Current next-candidate notes: `iron-palm` dynamic target recheck/interruption has implementation support but still needs stronger dedicated regression coverage; broader mounted keyboard/browser acceptance remains high priority.
- Current mounted-control hardening progress: mounted combat now clears held movement/dash keys on browser `blur`, preventing missed keyup after Alt-Tab/focus loss from continuing to walk or entering gates.
- Current next-candidate notes: monster multi-hit feedback cues such as `player-hurt-forge-shackle` and `player-hurt-chain-smash` reach feedback events but still need player-actor/browser animation consumption coverage.
- Current player hurt cue progress: monster multi-hit feedback cues now drive `data-player-hurt-feedback-cue` on the player actor root and real-browser-verified cue-specific player hurt animations for forge bind/slam and chain drag/smash. This matches the user's clarified priority: models may stay lightweight, but hit reactions and skill feedback must be strict and dynamic.
- Current strict presentation progress: `iron-palm` target impact VFX now consumes the real 260 ms hit-event window; `taotie-forge-shackle` bind/slam cues now drive distinct boss model animations; Iron defensive skills no longer show `shield` player/weapon motion before the real shield-open frame.
- Current next-candidate notes: `iron-palm` already uses dynamic target recheck and interruption cancellation, but still deserves dedicated combat tests for moved-out, moved-in, and interrupted startup guardrails.
- Current Iron VFX timing progress: `anvil-guard`, `molten-wall`, and `black-furnace-aegis` shield-open status bursts now consume the real 520 ms open-frame status event window in browser CSS; `furnace-taunt` and `shield-quake` target impact bursts now consume their 380 ms / 360 ms hit-event windows instead of fixed subpart timings.
- Current next-candidate notes: strong follow-up candidates are dedicated `iron-palm` moved-out/moved-in/interrupted combat tests and a combined keyboard acceptance test for final-hit hitstop, buffered actions, cleared-room action lock, and held gate entry.
- Current cleared-room buffer progress: expired buffered combat actions are now cleared during last-hit hitstop when the room is already cleared, so a stale queued skill cannot survive after the final monster dies or create fake empty-room actions. Gate movement remains available after clear.
- Current Glass Lotus target VFX progress: `glass-lotus` bind and bloom target impact core/ring/shards now consume the real event `--skill-duration` windows in a browser cascade, so the 360 ms bind and 460 ms bloom impacts no longer mix fixed CSS subpart durations.
- Current strict-combat clarification: character and monster geometry can stay lightweight while the full loop is completed, but keyboard feel, model-following action, real hit frames, hitstop, hit feedback, skill VFX, and monster VFX remain strict gates.
- Current next-candidate notes: parallel audits identified `sword-prism-field` player/weapon phase motion and `iron-palm` same-frame/interruption guardrail tests as strong next strict-combat candidates.
- Current Sword Prism phase-motion progress: `sword-prism-field` lock and burst events now drive distinct player-body and weapon animations in the real browser cascade, so the actor no longer uses one whole-skill cast pose while the root/target VFX already shows lock/burst phases.
- Current next-candidate notes: `iron-palm` startup-interrupt and same-frame monster-impact guardrail tests remain the next focused combat coverage candidate; current audit expects them to pass but they would prove no fake shield-jab damage or lunge continuation after interruption.
- Current Iron Palm interruption guardrail progress: `iron-palm` now has dedicated combat coverage for same-frame monster impact preempting the shield jab and startup damage stopping the model-following lunge before the jab endpoint, with no fake hit/miss events and no leftover scheduled shield-jab effects.
- Current next-candidate notes: continue strict-combat coverage toward broader mounted keyboard acceptance and remaining high-value staged skill action/VFX gaps.
- Current keyboard-flow progress: final-hit heavy attack now has app-level regression coverage for model-following windup, late action buffering, hitstop, heavy impact VFX, open-gate transition, held movement entry, and stale buffer clearing after clear.
- Current monster VFX matrix progress: every `EnemyAttackProfileId` now has a typed presentation matrix entry and a UI-smoke test proving dedicated telegraph, active VFX cue, runtime duration metadata, and non-empty cue-specific ring/core/trail animations.
- Current strict-combat clarification: character and monster modeling can stay simple during loop completion, but combat motion, model-following attacks, keyboard response, real hit frames, hitstop, skill VFX, and monster skill VFX remain strict gates.
- Current real-browser keyboard progress: the live Vite app now has Edge/Chrome CDP-backed tests for keyboard dungeon entry, held movement across combat ticks, command-buffer-aware `Z` heavy attack, hitstop/impact VFX, and `A` hotkey `spark-combo` model-following skill motion with dedicated player/weapon animations.
- Current real-browser monster progress: the live Vite app now verifies natural monster windup telegraphs, active/miss monster skill VFX, non-idle monster model animation, cue-specific player hurt animations for every monster feedback cue, and a real keyboard-positioned natural monster hit that drives player hurt motion.
- Current real-browser command/phase progress: the live Vite app now verifies `spark-combo` jab/cross/finish phase progression with phase-specific player, weapon, and root VFX animations, plus DNF `ArrowRight` -> `KeyZ` command input priority over normal `KeyZ` heavy fallback.
- Current real-browser combo-cancel progress: character and monster geometry remain lightweight by current scope, but live keyboard combat now verifies a real `KeyX` light hit confirm into `KeyA` `spark-combo` cancel with active cancel window metadata, empty action buffer, cancel toast, dedicated player/weapon animations, and live skill VFX root.
- Current strict-combat clarification: character and monster models can stay simple while the full prototype loop is completed, but combat action smoothness, model-following attacks, strict hit frames, hitstop, player/enemy reactions, skill VFX, monster VFX, and real keyboard room flow remain hard gates.
- Current real-browser room-flow progress: the live Vite app now exposes stable dungeon/room/enemy/gate state hooks and verifies a real keyboard loop that enters the dungeon, clears room 0, opens the gate, walks through the transition, and lands in room 1 with new live enemies.
- Current save-loop progress: the live browser now verifies that combat rewards are written to `localStorage` during play and restored after a real reload, with app-shell hooks exposing mode, save key, currency, and inventory count.
- Current full-dungeon progression progress: app-level coverage now explicitly walks from elite room into the boss room, clears the boss, opens the completion gate, returns to town, and verifies quest/reward settlement.
- Current strict live-combat flow progress: the real browser now verifies a true keyboard run that clears room 0 and room 1, enters the boss room, and records live evidence for player skill motion, player skill VFX, hitstop, impact cues, monster attack motion, and monster skill VFX in the same play flow.
- Current strict-combat clarification: character and monster geometry can remain lightweight for this phase, but combat flow, model-following attacks, real hit frames, player/enemy action changes, hitstop, skill VFX, monster skill VFX, real room progression, and save behavior remain hard gates.
- Current boss-clear progress: the real browser now verifies a full true-keyboard dungeon run that clears two rooms, enters the Taotie boss room, triggers boss phase 2, sees arena hazards and boss skill VFX, clears all live enemies, uses the completion gate, and returns to town.
- Current Liuli advanced-skill progress: the real browser now seeds an offline Liuli Flowing Light Swordmaster save, enters the dungeon by keyboard, dashes into live-target range, casts `flowing-light-chain` with Space, and verifies `chain-open`, `chain-cross`, and `chain-finish` player, weapon, and root VFX animations from actual mounted combat state.
- Current strict-combat clarification: character and monster geometry can stay lightweight, but smooth keyboard-driven movement, model-following attacks, staged skill timing, hitstop/impact feedback, player/enemy action changes, skill VFX, monster VFX, boss mechanics, and offline save flow remain hard acceptance gates.
- Current town-ecosystem acceptance progress: real browser tests now operate the mounted town UI with CDP mouse clicks for shop purchase, gift-box opening, reinforcement, amplification, NPC trade, auction listing, auction settlement, and reload persistence. This supports the full single-player loop without relaxing the strict combat priority.
- Current strict-combat clarification: character and monster geometry may remain simpler while the whole game loop is connected, but combat action smoothness, model-following attacks, strict hit frames, hitstop, player/enemy reaction changes, player skill VFX, and monster skill VFX remain hard gates.

## Task 181 DNF-Style Skill Tree Respec
- [x] Define a paid full-tree reset that refunds only ranks invested above each skill's base rank.
- [x] Wire reset through the class panel, app reducer, audio feedback, auto-save, and disabled-state rules.
- [x] Add rule, rendering, and real-browser click/reload acceptance coverage.
- [x] Run full core and serial real-browser regression, then commit and push with a Chinese message.

## Task 182 Dungeon Preparation, Difficulty, and Fatigue
- [x] Audit combat, progression, and dungeon-loop gaps with three parallel read-only agents.
- [x] Select and document the dungeon preparation, three-difficulty, and persisted-fatigue design.
- [x] Implement domain rules and migration with RED/GREEN tests.
- [x] Apply difficulty to enemy HP, enemy damage, and room rewards.
- [x] Build mounted preparation UI plus mouse and keyboard control.
- [x] Run focused/full regression, document evidence, commit, and push in Chinese.

## Task 183 DNF Combat Control, Hitstun, and Super Armor
- [x] Lock the existing behavior into an implementation spec: `ArrowDown` then `KeyC` triggers backstep, while standalone `KeyC` remains jump/quick recover.
- [x] Add RED/GREEN coverage for a trash enemy's ordinary hitstun interrupt and recovery window.
- [x] Add RED/GREEN coverage for armored elite/Boss super armor and post-break interrupt/juggle behavior.
- [x] Expose mounted actor state and cue-specific motion/VFX for hitstun and super armor.
- [x] Verify the real keyboard path in Edge/Chrome CDP, run core regression/build, then commit and push in Chinese.

## Task 184 Dungeon Target Farming and Loot Results
- [x] Specify difficulty-aware dungeon loot using each dungeon's `lootSetIds` and deterministic offline rotation.
- [x] Add RED/GREEN coverage for normal/adventure/warrior room and boss rarity rules plus dungeon-pool isolation.
- [x] Apply active `goldFind` build stats to room gold/material rewards without double scaling difficulty.
- [x] Render concrete room and final-clear loot results, including rarity, set, slot, and reward totals.
- [x] Verify a real keyboard clear obtains the expected targeted set drop, persists it after reload, then commit and push with Chinese messages.

## Task 185 Discrete Critical Hits and Damage Feedback
- [x] Replace averaged critical damage with an explicit capped critical chance and deterministic offline accumulator.
- [x] Apply critical resolution once to direct and scheduled player hit frames without affecting monster damage or misses.
- [x] Emit critical metadata, stronger impact feedback, and model-following damage-number/VFX presentation.
- [x] Prove crit-focused gear materially changes hit outcomes while zero-crit builds never crit.
- [x] Verify critical hits through real keyboard combat, run full regression/build, then commit and push with Chinese messages.

### Errors Encountered
- A combined Task 185 evidence patch targeted `progress.md` with “move an initially valid target before” while the file contained “move an initially valid target out before”; patch verification rejected the entire edit. Re-read the tail and reapplied against the exact text; no partial file changes occurred.
- Task 185 first production build stopped on the manual reflect hit event missing required critical metadata. Classified fixed monster-derived reflect damage as non-critical, added explicit fields, and documented the accumulator exception.
- Task 185 first UI GREEN run passed the CSS smoke check but the app integration test errored before rendering because its new `createCombatRun` call was not added to the existing combat import. Added the missing test import; production behavior was not involved.
- Task 185 first RED run had three expected missing-feature failures plus one test-setup error: a completely out-of-range grounded light does not schedule a delayed miss. Reused the established live recheck setup by moving an initially valid target before the hit frame.
- A Task 185 RTK search for exact `kind: "hit"` literals returned an empty nonzero result despite the known production literal. No files were affected; subsequent work uses the authoritative interface and constructor ranges already read directly.
- The staged Task 184 diff check found one extra blank line at the end of the new design document. Removed it, re-staged the two touched records, and re-ran the authoritative raw Git check after RTK returned an empty nonzero result for the cached mode.
- Task 184 second full browser run again passed 29/30; the failure moved to the previously green town-ecosystem scenario. A real reinforcement click produced no toast or state change, and the helper's uncaught wait timeout bypassed its advertised four-attempt retry loop. Fix the helper to retry only this proven no-state-change timeout.
- Task 184 first full 30-scenario browser run passed 29/30. The default Cinder-to-Liuli campaign still expected the old every-other-room inventory totals (4 after Cinder, 7 after Liuli); the new explicit every-room matrix correctly yields 5 and 10. Updated all four exact progression assertions, leaving production behavior unchanged.
- Task 184 first GREEN run passed five of six focused checks. The remaining failure came from `toMatchObject({ setId: undefined })` treating an absent optional property differently from an explicit `undefined`; split it into rarity and `toBeUndefined()` assertions.
- A Task 184 PowerShell search used a double-quoted regular expression containing escaped quotes; PowerShell parsed it before `rg` and rejected the command. Re-ran with one simple single-quoted pattern; no project files were affected.
- Task 184 的一次 `rtk rg` 把 Windows 不支持的 `src/tests/render*.test.ts` 通配符作为路径传入并报错；其余明确文件搜索正常。后续只传目录或完整文件名。
- The first Task 184 findings patch targeted a stale section title (`Dungeon Target Farming and Loot Results`) instead of the actual `Target-Farming Audit` heading. No file changed; re-read the tail and patched the authoritative heading.
- Task 183 首次 29 场全浏览器回归为 28/29；新用例在全套负载下漏采 280 ms 硬直窗口，但末态 HP 已证明真实轻击命中。改为攻击前安装 MutationObserver 与 requestAnimationFrame 证据记录器，不修改游戏时长或放宽状态/动画断言。
- Task 183 首次真实浏览器路线已通过后跳中间帧，但杂兵硬直的计算样式仍被后置的普通轻击反应选择器覆盖。将硬直选择器绑定权威 `data-enemy-hitstun-active="true"` 并提高权重后重验。
- Task 183 的一次组合 `rg` 命令含未闭合 PowerShell 双引号，解析前即失败且未触碰项目文件。后续改用单引号简单模式和分段读取。
- PowerShell parsed an over-escaped `rg` alternation as file paths during the Task 182 audit. Replaced it with simple `rg` patterns and direct `Get-Content` ranges; no project files were affected.
- Two agent prompts containing JavaScript template-literal backticks were rejected by the orchestration parser before dispatch. Retried with newline-joined plain strings; no project files were affected.
- The first 27-scenario browser run passed 25/27 and stopped both Liuli routes in dungeon preparation. Root cause was a stale `minLevel: 20` content gate while the natural Cinder clear reaches level 4. Updated the Liuli gate to level 4 and the minimal seeded acceptance state to the same legal level; both focused routes and the final full suite passed.
- A final review found prep controls could lose native Enter activation to the global start shortcut. Added real focused-control browser coverage, then removed a test-only synthetic click that could mask CDP keyboard regressions. The final 28-scenario suite passed using only real browser key events.
