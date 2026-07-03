# Task Plan: DNF-Inspired Single-Player Action RPG Prototype

## Goal
Design and, after approval, implement a playable offline side-scrolling action RPG prototype inspired by Dungeon Fighter Online, with original assets/mechanics, flashy skills, combat feel, economy systems, enhancement/amplification, shop, costumes, gift packs, and high replay value.

## Current Phase
Phase 4 - Task 2

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
- [ ] Decide whether to use subagents for independent work
- [ ] Prepare local runtime/cache paths under `.codex-local`
- **Status:** in_progress

### Phase 4: Build Playable Prototype
- [x] Scaffold game project
- [x] Implement Task 2 types and data catalog
- [ ] Implement core movement/combat/enemy loop
- [ ] Implement skills and visual effects
- [ ] Implement loot, inventory, trade, enhancement, amplification, shop, costumes, and packs
- [ ] Add sound/visual feedback where feasible
- **Status:** pending

### Phase 5: Verification and Delivery
- [ ] Run lint/build/tests where available
- [ ] Start local server or provide local HTML entry
- [ ] Verify gameplay in browser with screenshots/pixel checks if web-based
- [ ] Update progress and findings
- [ ] Final handoff with paths and run command
- **Status:** pending

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

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `git status --short` failed: not a git repository | 1 | Logged repo state; will not rely on git until initialized or requested |

## Notes
- Project root at start: `F:\My_DNF`.
- Current project contains only `.codex-local`.
- Browser/visual verification likely needed because this is a game/UI task.
- GitHub remote configured: `https://github.com/G1ow9711/MyDNF.git`.
- Do not push to GitHub until user confirms upload.
- Implementation approved by user.
- Current gate: implementation plan must be written before scaffolding/code.
- GitHub push phrase to upload commits: `允许 push`.
- Active implementation branch/worktree: `feature/vertical-slice` at `.worktrees/vertical-slice`.
