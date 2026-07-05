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
- **Status:** complete

### Phase 5: Verification and Delivery
- [x] Run lint/build/tests where available
- [x] Start local server or provide local HTML entry
- [x] Verify gameplay in browser with screenshots/pixel checks if web-based
- [x] Add reset-save confirmation flow
- [x] Update progress and findings
- [x] Final handoff with paths and run command
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

## Notes
- Project root at start: `F:\My_DNF`.
- Current project contains only `.codex-local`.
- Browser/visual verification likely needed because this is a game/UI task.
- GitHub remote configured: `https://github.com/G1ow9711/MyDNF.git`.
- User has allowed pushing to GitHub.
- Latest verified delivery is pushed to `origin/feature/vertical-slice`; local and remote refs were checked after the final-record commit.
- Current stricter continuation goal: move closer to DNF-style keyboard-controlled room combat; do not treat the current prototype as final until keyboard movement, combat gating, room flow, enemy behavior, and player-side acceptance are verified.
- Current visual-combat continuation goal: combat actors must not be static; player strikes, player skills, monster hit reactions, monster skill telegraphs, facing flips, lunge direction, and hurt knockback need visible motion on the bitmap model nodes themselves.
- Current combat-loop continuation goal: monster skills must be real attacks with windup, hit/miss, player HP loss, defeat state, automatic combat ticking, and model motion for both attacker and target.
- Current strict-DNF continuation gap after class-resource mechanics: class resources now have first-pass unique rules in combat, but skill kits still need deeper per-skill behavior, better class-specific art, and clearer long-term resource persistence.
- Current hitbox continuation progress: player light/heavy attacks now respect facing, X range, Y lane range, nearest valid target, and miss events. Area/range skill tags now drive wider or multi-target hitboxes, and whiffed attacks still move the player model.
- Current combo/air-state progress: hit combo counter now tracks total chain separately from light-chain `comboStep`, launcher/heavy hits create timed airborne state, airborne enemies cannot attack, and slam skills can force knockdown.
- Current weapon-appearance progress: class weapons now have weapon types, rarity-linked tiers, role flavor, town/combat anchors, 20 SVG weapon assets, and a visible equipped weapon layer on the character in town and combat.
- Current skill-animation continuation goal: class skills need explicit animation presets, weapon arcs, and VFX shapes so player model, equipped weapon, and skill effect do not all use the same generic `actor-model-skill` / `weapon-skill-flare` presentation.
- Current visual priority clarification: character and monster models may stay lightweight for the playable prototype, but combat motion, combo flow, hit feedback, player/enemy action changes, monster skill telegraphs, and skill VFX must remain strict acceptance criteria.
- Current strict-combat presentation progress: skill hit frames now drive real impact event timing, hitstop/sparks/screen shake start on the hit frame, player cast motion starts at input, monster windup telegraphs are separated from active/miss monster skill VFX, and CSS consumes catalog skill duration through `--skill-duration`.
- Current per-skill script progress: `furnace-step` now applies startup dash movement before resolving hitbox, `heat-bloom` pulls enemies toward a skill center, `black-rain-volley` emits staggered multi-hit events, and `anvil-guard` opens a real guard mitigation window with shield motion in UI.
- Current playable-skill accessibility progress: J/K class skills such as `anvil-guard` now render as clickable skill buttons while keyboard J/K remain basic light/heavy attacks.
- Current DNF-style room-flow progress: clearing a room now opens a right-side gate/door, walking to the gate enters the next room or boss room, and final gate completion returns to town with loot/quest progress.
- Current target-bound VFX progress: skill hit events now render per-target skill impact bursts with skill id, target id, catalog VFX shape, hit event id, and stagger index; `black-rain-volley` shows six black-rain bursts across two targets.
- Current staged-ultimate progress: `meteor-knuckle` now has a scripted fall/impact timeline, stronger final hitstop, forced knockdown, armor-break, scene-level ultimate shake, meteor flash, target ground-crack VFX, and player/weapon meteor-smash animations.
- Current Liuli skill progress: `liuli-rain` now has a dedicated three-wave target-locked script, `rain` hit phases, `glass-rain-fall` VFX cues, short per-event target VFX windows, and target-bound glass-rain burst styling.
- Current Liuli dash progress: `prism-step` now pierces up to two enemies along the dash path, carries `pierce`/`prism-pierce` event metadata, staggers targets, and has dedicated player/weapon/cast/impact prism-afterimage presentation.
- Current Ink advancement progress: `night-mark-detonation` now targets marked enemies, misses when no marks exist, emits lock/burst staged hits, consumes marks on final detonation, knocks targets down, and has dedicated player/weapon/cast/impact night-detonation presentation.
- Current Ink mechanism progress: `mechanism-shadow-net` now has delayed bind/snap stages, scheduled enemy effects, no cast-frame enemy mutation, control/stagger/pull behavior, aligned cast-field center, and dedicated player/weapon/cast/target mechanism-net presentation.
- Current Iron advancement progress: `mountain-crack-hammer` now has delayed stagger/impact stages, scheduled enemy effects, windup interruption, armor-break/knockdown impact, and dedicated player/weapon/cast/target mountain-crack presentation.
- Current monster-skill feedback progress: `ash-ember-spit`, `zheng-shockwave`, and `taotie-flame-breath` now render skill-specific target feedback classes and dedicated VFX plus hit-feedback animations, with browser computed-style verification.
- Current visual priority clarification: character and monster model detail may stay lightweight while the playable loop is being completed, but combat motion smoothness, model-following attack movement, hit feel, player/enemy action changes, skill VFX, and monster skill VFX are strict acceptance criteria.
- Current monster-pattern progress: normal trash rooms now mix ranged `ash-ember-spit` with close-range `ash-crawler-burst`, including windup rush, circle telegraph, active explosion VFX, hit/miss feedback, and stagger interruption.
- Current elite-pattern progress: elite rooms now include `zheng-shockwave` plus `zheng-horn-charge`, giving Shan Hai Jing elites both circular quake pressure and line-telegraphed rush attacks with separate model motion/VFX/feedback.
- Current boss-pattern progress: boss now alternates `taotie-flame-breath` and `taotie-devour-pull`; the devour skill pulls the player horizontally during windup, uses circular vortex telegraph, resolves a bite impact/miss, and has independent model/VFX/feedback animations.
- Current boss-phase progress: Taotie now enters phase 2 at half HP, interrupts its current cast, emits a phase-burst event, schedules three arena forge-collapse hazards, and resolves hazard hit/miss based on player position at the impact frame with dedicated VFX/feedback.
- Remaining strict-DNF combat gaps: deeper scripts for remaining skills, broader class-specific animation timelines, enemy hurtbox tuning, broader target-bound VFX coverage, weapon atlas/frame animation beyond static SVG assets, stronger room-transition staging, and a formal save migration from `heat` alias to class-resource storage.
- Remaining monster-pattern gap: boss tier now has alternating attacks plus first half-HP arena hazard, but still needs broader control, summon/minion pressure, and later multi-phase behavior variety.
- Current player-combat priority: character models may remain lightweight while the playable loop is built, but player skill movement must be timed and model-following, with delayed hit frames, cancelable pending impacts, and dedicated skill/weapon/cast/target VFX.
- Current Ember advancement progress: `furnace-heart-overdrive` now has a stationary charge timeline, delayed area pulse, delayed release/knockdown, cancelable pending hits, delayed whiff feedback, and dedicated overdrive player/weapon/cast/target VFX. `heat-bloom` remains the next Ember visual/mechanical candidate because its pull presentation is still generic.
- Current review-fix progress: interrupted overdrive now clears stale cast VFX, same-frame monster impacts resolve before delayed whiff feedback, and a large-frame 360/560 ms release path is covered by tests.
- Implementation approved by user.
- Current gate: implementation plan must be written before scaffolding/code.
- GitHub push phrase to upload commits: `允许 push`.
- Active implementation branch/worktree: `feature/vertical-slice` at `.worktrees/vertical-slice`.
- Completion audit found the class/advancement system existed in data and reducers, but needed a visible player-facing panel before final handoff.
