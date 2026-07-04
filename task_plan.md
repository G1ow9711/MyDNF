# Task Plan: DNF-Inspired Single-Player Action RPG Prototype

## Goal
Design and, after approval, implement a mature playable offline side-scrolling action RPG prototype inspired by Dungeon Fighter Online, with original assets/mechanics, flashy skills, combat feel, at least four base classes, class advancement gameplay, economy systems, enhancement/amplification, shop, costumes, gift packs, and high replay value.

## Current Phase
Phase 5 - Verification and Delivery

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
- **Status:** complete

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
- Remaining strict-DNF combat gaps: richer per-skill behavior beyond broad tag hitboxes, class-specific animation timelines, enemy hurtbox sizing, multi-target VFX per enemy, and a formal save migration from `heat` alias to class-resource storage.
- Implementation approved by user.
- Current gate: implementation plan must be written before scaffolding/code.
- GitHub push phrase to upload commits: `允许 push`.
- Active implementation branch/worktree: `feature/vertical-slice` at `.worktrees/vertical-slice`.
- Completion audit found the class/advancement system existed in data and reducers, but needed a visible player-facing panel before final handoff.
