# Progress Log

## Session: 2026-07-03

### Phase 1: Requirements, Research, and Brainstorm
- **Status:** complete
- **Started:** 2026-07-03 Asia/Shanghai
- Actions taken:
  - Read required skills: `superpowers:using-superpowers`, `superpowers:brainstorming`, `planning-with-files`, and `caveman`.
  - Attempted to create explicit Codex goal from `/goal`; existing unfinished goal prevented new goal creation.
  - Ran planning session catchup; no unsynced context reported.
  - Inspected project root and found only `.codex-local`.
  - Ran `git status --short`; workspace is not a git repository.
  - Ran `rg --files`; no source files found.
  - Created file-based planning artifacts.
  - User accepted visual companion.
  - Read visual companion guide and browser control skill.
  - Tried to start brainstorm server through `start-server.sh`; failed because WSL has no installed distro.
  - Read brainstorm server script and selected Node direct launch as alternate path.
  - Started visual companion server with bundled Node at `http://localhost:50336`.
  - Searched and opened official/reference pages for DFO combat, equipment growth, trading/auction, avatars, CERA shop, and sales/package patterns.
  - Created first visual companion screen: `approach-options.html`.
  - Opened `http://localhost:50336` in Codex in-app browser.
  - User selected approach B.
  - Spawned two subagents for combat-feel and economy-system brainstorming; both returned, both closed.
  - Created formal design spec at `docs/superpowers/specs/2026-07-03-dnf-inspired-hybrid-rpg-design.md`.
  - User requested detailed character imagery.
  - Read `imagegen` skill and updated design spec with character visual quality requirements.
  - Created third visual companion screen: `character-art-direction.html`.
  - User requested realistic, good-looking environment modeling.
  - Updated design spec with environment visual requirements.
  - Created fourth visual companion screen: `environment-art-direction.html`.
  - User selected `C`; recorded as environment emphasis C because latest screen was environment-art direction. No browser click event existed.
  - User requested Chinese-style maps.
  - Updated design spec with Chinese fantasy-industrial map direction and renamed first dungeons to `Cinder Kiln Alley` and `Liuli Furnace`.
  - Created fifth visual companion screen: `chinese-map-style.html`.
  - User requested background music consideration.
  - Updated design spec with audio/BGM/SFX requirements.
  - User requested story quest mode.
  - Updated design spec with story/quest mode requirements.
  - User requested equipment levels, Epic sets, and multiple build archetypes.
  - Updated design spec with expanded equipment/build system.
  - Created sixth visual companion screen: `equipment-builds.html`.
  - Verified design spec is valid UTF-8 and does not contain common mojibake markers.
  - Updated spec with Chinese display names and English internal IDs.
  - Committed localized naming revision: `48b803c Localize design names for Chinese fantasy setting`.
  - Committed updated design spec: `de630dd Expand action RPG systems design`.
  - User provided GitHub repository URL: `https://github.com/G1ow9711/MyDNF`.
  - Configured local git remote `origin` to `https://github.com/G1ow9711/MyDNF.git`.
  - Verified `git ls-remote --heads origin` succeeds and returns no remote heads.
  - Ran spec self-review scan for placeholders/TODOs/approval markers.
  - Reworded `Display title placeholder` to `Working display title`.
  - Initialized git repository.
  - Added `.gitignore`.
  - Committed design spec: `761f9ea Add hybrid action RPG design spec`.
- Files created/modified:
  - `task_plan.md` created
  - `findings.md` created
  - `progress.md` created

### Phase 2: Design Approval
- **Status:** complete
- Actions taken:
  - Prepared final approval state after user-driven design additions.
  - User approved development.
  - User required all git commit messages to be Chinese.
  - Added acceptance checklist for future completion audit without starting implementation.
- Files created/modified:
  - `docs/superpowers/specs/2026-07-03-dnf-inspired-hybrid-rpg-design.md` committed
  - `docs/superpowers/specs/2026-07-03-dnf-inspired-acceptance-checklist.md` created

### Phase 3: Implementation Plan
- **Status:** in_progress
- Actions taken:
  - Read `superpowers:writing-plans`.
  - Started implementation-plan workflow.
  - Created implementation plan at `docs/superpowers/plans/2026-07-03-mydnf-vertical-slice-implementation.md`.
  - Self-reviewed plan for required header, banned vague planning terms, mojibake markers, and Chinese commit-message examples.
  - Committed implementation plan: `edbc008 编写首个可玩版本实施计划`.
  - Pushed commits to GitHub `origin/main`.
  - Rewrote earlier English commit messages into Chinese to satisfy user requirement.
  - First rewrite attempt failed because `git filter-branch` msg-filter used PowerShell syntax inside sh.
  - Second rewrite attempt produced mojibake for the first three Chinese messages.
  - Third rewrite used a Python binary stdout msg-filter keyed by commit hash; all commit subjects became valid UTF-8 Chinese.
  - Force-with-lease pushed rewritten `main` to GitHub.
- Files created/modified:
- `docs/superpowers/plans/2026-07-03-mydnf-vertical-slice-implementation.md`

### Phase 4: Build Playable Prototype
- **Status:** in_progress
- Actions taken:
  - Read `superpowers:subagent-driven-development`, `superpowers:test-driven-development`, `superpowers:requesting-code-review`, and `superpowers:using-git-worktrees`.
  - Created isolated worktree `.worktrees/vertical-slice` on branch `feature/vertical-slice`.
  - Added `.worktrees/` to `.gitignore` on main before creating worktree.
  - Fixed implementation plan Task 1 so scaffold has a minimal `src/ui/app.ts` and smoke test.
  - Dispatched Task 1 implementer subagent.
  - Task 1 initial implementation committed `ac6d205 搭建前端项目骨架`.
  - Spec compliance review passed.
  - Code quality review found missing `package-lock.json` and missing `vite.config.ts` typecheck coverage.
  - Implementer fixed quality issues and committed `fb6a910 修复前端骨架质量问题`.
  - Spec re-review passed.
  - Code quality re-review approved.
  - Main agent ran `npm test` and `npm run build`; both passed.
  - Started Task 2 in `.worktrees/vertical-slice` on `feature/vertical-slice`.
  - Read `planning-with-files` and `superpowers:test-driven-development`; TDD red-green required.
  - Recorded exact non-mojibake Chinese catalog strings from current user request.
  - Wrote `src/tests/catalog.test.ts` before production code.
  - Ran `npm test -- src/tests/catalog.test.ts`; RED confirmed because `../data/catalog` module does not exist.

## Task 2 RED Evidence
| Test | Expected Failure | Actual Failure | Status |
|------|------------------|----------------|--------|
| `npm test -- src/tests/catalog.test.ts` | Missing catalog module before implementation | `Cannot find module '../data/catalog'` | pass |

## Task 2 Completion
- Created `src/game/types.ts` with unions/interfaces for rarity, gear slots, gear, Epic sets, skills, dungeons, quests, currencies, player state, and game state.
- Created `src/data/catalog.ts` exporting `catalog`, `skills`, `epicSets`, `gear`, `dungeons`, and `quests`.
- Catalog contains 6 `烬拳卫` skills, 2 required dungeons, 5 required Epic sets, and 60 Epic gear items across 12 slots.

## Task 2 Test Results
| Test | Result |
|------|--------|
| `npm test -- src/tests/catalog.test.ts` | pass, 7 tests |
| `npm test` | pass, 8 tests |
| `npm run build` | pass |

## Task 2 Review Fixes
- Expanded `src/tests/catalog.test.ts` first for unique/stable ids, mojibake guard, all 12 gear slots, rarity coverage, valid set references, and owned gear instance typing.
- RED history note: the controller executed the initial Task 2 RED run before production code with `npm test -- src/tests/catalog.test.ts`; the exact failure was `Cannot find module '../data/catalog'` from `src/tests/catalog.test.ts`. No separate tests-only commit was preserved. Rewriting history would be disproportionate and was not done.
- RED evidence:
  - `npm test -- src/tests/catalog.test.ts` failed on rarity coverage because existing catalog only emitted `epic`.
  - `npm run build` failed because `OwnedGearItem` was not exported and `PlayerState.inventory` still used strings.
- Implemented `OwnedGearItem` plus `AmplifyStat`; `PlayerState.inventory` now stores owned gear instances and equipment/loadouts reference owned instance ids.
- Updated gear catalog to 72 items across Common, Uncommon, Rare, Epic, and Mythic; lower rarities have no set membership, Epic/Mythic setIds reference existing Epic sets.
- Spec compliance fix added `炉山市集` town catalog data, requested `SkillDef`/`DungeonDef`/`QuestDef` aliases, `TownDef`, dungeon loot set validation, quest/town id checks, and exact level range 1..50.
- Code quality fix added tests first for set 5-piece reachability, semantic gear ids, Echo Slot data, no duplicate gear display names, and `OwnedGearItem` without stale `equipped` flag.
- RED evidence:
  - `npm test -- src/tests/catalog.test.ts` failed because `ash-1-weapon` was index-derived and `ember-artisan` only had 4 distinct set slots.
  - `npm run build` failed because `GearItem.amplification` did not exist and `OwnedGearItem.equipped` was still required.
- Implemented stable semantic gear ids, full Epic slot coverage for each set, Mythic set items with distinct display names, `GearItem.amplification.echoSlot`, and removed `OwnedGearItem.equipped`.
- Verification after fix:
  - `npm test -- src/tests/catalog.test.ts`: pass, 7 tests.
  - `npm test`: pass, 8 tests.
  - `npm run build`: pass.
- Spec compliance re-review passed after fixing town catalog data, public type aliases, level range, and loot table tests.
- Code quality re-review passed after fixing set reachability, semantic gear ids, Echo Slot data, display-name ambiguity, and owned gear source-of-truth shape.
- Final Task 2 commits:
  - `126f51b 添加核心数据目录和装备套装`
  - `182d15b 完善装备实例和数据校验`
  - `1d22239 修正数据目录规格缺口`
  - `d485fe8 修复装备目录质量问题`
- Task 2 files created/modified:
  - `src/game/types.ts`
  - `src/data/catalog.ts`
  - `src/tests/catalog.test.ts`
  - `progress.md`
  - `task_plan.md`

## Task 3 State, Inventory, Save
- Started Task 3 in `.worktrees/vertical-slice` on `feature/vertical-slice`.
- Read current `task_plan.md`, `findings.md`, `progress.md`, `src/data/catalog.ts`, and `src/game/types.ts`.
- Wrote `src/tests/state-inventory-save.test.ts` before production code.
- First focused test run failed for wrong reason because the test file was accidentally patched into the parent root. Removed that accidental root file and recreated it under the worktree.
- RED evidence:
  - `npm test -- src/tests/state-inventory-save.test.ts` failed because `../game/state` did not exist.
- Created `src/game/state.ts`, `src/systems/inventory.ts`, and `src/systems/save.ts`.
- GREEN verification after implementation:
  - `npm test -- src/tests/state-inventory-save.test.ts`: pass, 8 tests.
  - `npm test`: pass, 16 tests.
  - `npm run build`: pass.
- Task 3 quality-review fix started after review found duplicate owned ids, saved-loadout sell/dismantle reservation behavior, shallow save validation, and non-exact resource tests.
- Added regression tests first for duplicate catalog acquisitions, loadout-only conversion cleanup, exact sell/dismantle deltas, and malformed save structures.
- RED evidence:
  - `npm test -- src/tests/state-inventory-save.test.ts` failed because `nextOwnedGearSequence` was missing, saved-loadout refs blocked sell/dismantle, and malformed saves were accepted.
- Implemented explicit `createOwnedGear(catalogGearId, sequence)`, `nextOwnedGearSequence`, `addOwnedGear`, current-equipment-only conversion blocking, loadout ref cleanup after conversion, and structural save validation.
- Quality-fix verification:
  - `npm test -- src/tests/state-inventory-save.test.ts`: pass, 12 tests.
  - `npm test`: pass, 20 tests.
  - `npm run build`: pass.
- Task 3 second quality-review fix addressed incomplete save validation for `player.heroId`, player numeric fields, owned gear numeric fields, owned gear boolean flags, and optional `amplifyStat`.
- Added table-driven invalid-save tests first for hero id, player level/experience/heat, owned gear required fields, invalid current town, unknown quest/dungeon ids, and loadout refs.
- RED evidence:
  - `npm test -- src/tests/state-inventory-save.test.ts` failed on 8 invalid-save cases because scalar save fields were accepted.
- Implemented scalar validators in `src/systems/save.ts` for required id strings, finite minimum numbers, booleans, optional `amplifyStat`, and exact hero id.
- Second quality-fix verification:
  - `npm test -- src/tests/state-inventory-save.test.ts`: pass, 24 tests.
  - `npm test`: pass, 32 tests.
  - `npm run build`: pass.
- Spec compliance review passed.
- Code quality final re-review passed; only remaining note is optional integer validation for level-like numeric fields.
- Final Task 3 commits:
  - `d7e3b2c 实现存档背包和配装方案`
  - `8c70bf1 修复存档背包质量问题`
  - `360d237 完善存档结构校验`

## Task 4 Upgrade Systems
- Started Task 4 in `.worktrees/vertical-slice` on `feature/vertical-slice`.
- Read current plan/progress plus state, catalog, inventory, and existing tests.
- Wrote `src/tests/upgrades.test.ts` before production code.
- RED evidence:
  - `npm test -- src/tests/upgrades.test.ts` failed because `../systems/upgrades` did not exist.
- Created `src/systems/upgrades.ts` with immutable reinforcement, amplification, protection-ticket, and amplified-equipped-stat helpers.
- GREEN verification after implementation:
  - `npm test -- src/tests/upgrades.test.ts`: pass, 11 tests.
  - `npm test`: pass, 43 tests.
  - `npm run build`: pass.
- Task 4 files created/modified:
  - `src/systems/upgrades.ts`
  - `src/tests/upgrades.test.ts`
  - `progress.md`
- Spec compliance review passed.
- Task 4 quality-review fix:
  - Added reinforcement boundary coverage for failed attempts at +6, +9, and +10 with and without protection tickets.
  - Removed unused `replaceOwnedItem` test helper.
  - Added non-finite amplification stat RNG fallback coverage; RED showed `NaN` returned `undefined` and `Infinity` returned `moveSpeed`.
  - Guarded amplification stat selection so non-finite RNG output falls back to `crit`.
- Quality-review verification:
  - `npm test -- src/tests/upgrades.test.ts`: pass, 16 tests.
  - `npm test`: pass, 48 tests.
  - `npm run build`: pass.
- Code quality re-review passed.
- Final Task 4 commits:
  - `79f2ecc 实现强化和增幅系统`
  - `f8c5294 补充强化边界测试`

## Task 5 Economy Systems
- Started Task 5 in `.worktrees/vertical-slice` on `feature/vertical-slice`.
- Read current task plan, findings, progress, catalog, state, inventory, save, and upgrade-system context.
- Wrote `src/tests/economy.test.ts` before production economy modules.
- RED evidence:
  - `npm test -- src/tests/economy.test.ts` failed because `../systems/market` does not exist.
- Created `src/systems/market.ts` and `src/systems/shop.ts`, added explicit `market` and `shop` state branches, and initialized them in `createInitialState()`.
- Added economy save-validation coverage before extending `src/systems/save.ts`.
- RED evidence:
  - `npm test -- src/tests/economy.test.ts` failed because missing/malformed economy save branches were accepted.
- GREEN verification after implementation:
  - `npm test -- src/tests/economy.test.ts`: pass, 6 tests.
  - `npm test`: pass, 54 tests.
  - `npm run build`: pass.
- Spec compliance review passed.
- Local code-quality review found two economy-state risks: auction escrowed gear could collide with future owned instance ids, and save validation accepted unknown random-box keys.
- Added regression tests for auction escrow plus repeated pack purchase, unknown/empty boxes, unknown/unaffordable shop purchases, and unknown box save data.
- RED evidence:
  - `npm test -- src/tests/economy.test.ts` failed because escrowed `epic-liuli-flow-ring` reused `owned-epic-liuli-flow-ring-001`, and unknown shop box keys were accepted by save validation.
- Implemented owned-gear sequence allocation across inventory plus auction escrow, exported known box id checks, and tightened `shop.boxes` / `shop.boxPity` validation to known non-negative integer box counts.
- Quality-fix verification:
  - `npm test -- src/tests/economy.test.ts`: pass, 9 tests.
  - `npm test`: pass, 57 tests.
  - `npm run build`: pass.
- Task 5 spec compliance review passed.
- Code-quality review was completed locally because the subagent review hit the account usage limit; fixes above addressed the concrete findings.
- Final Task 5 verification:
  - `npm test -- src/tests/economy.test.ts`: pass, 9 tests.
  - `npm test`: pass, 57 tests.
  - `npm run build`: pass.
- Final Task 5 commits:
  - `2794281 实现交易拍卖和商城礼包`
  - `1859c4e 修复经济系统实例和箱子校验`
- Task 5 files created/modified:
  - `src/systems/market.ts`
  - `src/systems/shop.ts`
  - `src/tests/economy.test.ts`
  - `src/game/types.ts`
  - `src/game/state.ts`
  - `src/systems/save.ts`
  - `progress.md`

## Task 6 Class Roster and Advancement
- User expanded the active goal: at least four base classes, class advancement gameplay, and a mature shippable version are required.
- Researched official DFO class/advancement references and recorded the original adaptation direction in design docs.
- Updated design spec, acceptance checklist, implementation plan, findings, and task plan to include four base classes and advancement.
- Wrote `src/tests/classes.test.ts` before implementation.
- RED evidence:
  - `npm test -- src/tests/classes.test.ts` failed because `../systems/classes` did not exist.
- Added shared class/advancement types, catalog data for four base classes and eight advancement paths, class skill data, `PlayerState.classId`, optional `advancementId`, initial state class fields, class selection/preview/advancement helpers, and save validation for class/advancement ids.
- Fixed existing catalog test fixture to include `classId`.
- Checked UTF-8 file contents after PowerShell rendered Chinese as mojibake; source files contain real Chinese strings and no replacement characters.
- Updated `task_plan.md` so Task 6 is complete and current work moves to Task 7 story/quest system.
- Verification:
  - `npm test -- src/tests/classes.test.ts`: pass, 6 tests.
  - `npm test`: pass, 63 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
- Committed and pushed Task 6:
  - `8a140ce 实现职业和转职系统`
  - Pushed `feature/vertical-slice` to GitHub after user allowed push.

## Task 7 Story and Quest System
- Started Task 7 in `.worktrees/vertical-slice` on `feature/vertical-slice`.
- Read current `task_plan.md`, implementation plan, design spec, existing catalog/state/save tests, and current quest data.
- Wrote `src/tests/quests.test.ts` before production code.
- RED evidence:
  - `npm test -- src/tests/quests.test.ts` failed because `../systems/quests` did not exist.
- Added quest trigger and system id types.
- Expanded quest catalog with event triggers, `smith-first-spark`, next-quest activation, and system/dungeon unlock data.
- Created `src/systems/quests.ts` with `applyQuestEvent`, `claimQuestReward`, `getActiveQuestText`, and `isSystemUnlocked`.
- Tightened save validation so every catalog quest must have a saved status.
- Checked UTF-8 contents for quest files after PowerShell rendered Chinese as mojibake; no replacement characters or literal mojibake markers found.
- Updated `task_plan.md` so story/quest system is complete and current work moves to combat model.
- Verification:
  - `npm test -- src/tests/quests.test.ts`: pass, 7 tests.
  - `npm test`: pass, 70 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
- Committed and pushed Task 7:
  - `d8299c1 实现剧情任务和系统解锁`
  - Pushed `feature/vertical-slice` to GitHub.

## Task 8 Combat Model
- Started Task 8 in `.worktrees/vertical-slice` on `feature/vertical-slice`.
- Wrote `src/tests/combat.test.ts` before production code.
- RED evidence:
  - `npm test -- src/tests/combat.test.ts` failed because `../game/combat` did not exist.
- Created `src/game/input.ts` with keyboard-to-combat-input mapping.
- Created `src/game/combat.ts` with dungeon run setup, belt-scroll movement, light/heavy/class skill actions, hit events, combo cancel window, boss armor hitstop reduction, room completion, and deterministic loot events.
- Debug fix:
  - `npm run build` initially failed because `src/tests/combat.test.ts` accessed `CombatEvent` union fields without narrowing.
  - Added `lastHitEvent` type guard in the test; no production behavior change.
- Checked UTF-8 contents for combat files; no replacement characters or literal mojibake markers found.
- Updated `task_plan.md` so combat model is complete and current work moves to skills/VFX.
- Verification:
  - `npm test -- src/tests/combat.test.ts`: pass, 6 tests.
  - `npm test`: pass, 76 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
- Committed and pushed Task 8:
  - `489f5c9 实现核心战斗模型`
  - Pushed `feature/vertical-slice` to GitHub.

## Task 9 Rendering and Audio Hooks
- Started Task 9 in `.worktrees/vertical-slice` on `feature/vertical-slice`.
- Read current `task_plan.md` plus render/audio sections in the implementation plan and design spec.
- Wrote `src/tests/render-audio.test.ts` before production code.
- RED evidence:
  - `npm test -- src/tests/render-audio.test.ts` failed because `../game/render` did not exist.
- Created `src/game/render.ts` with Chinese-style scene palettes, skill VFX profiles, render command plans, no-UI-shake rule, player/enemy/hit-spark draw commands, and per-class VFX colors.
- Created `src/systems/audio.ts` with adaptive BGM layer selection, pure audio state, volume clamping, and queued BGM/SFX commands.
- Checked UTF-8 contents for render/audio files; no replacement characters or literal mojibake markers found.
- Updated `task_plan.md` so skills/VFX are complete and current work moves to UI/system integration.
- Verification:
  - `npm test -- src/tests/render-audio.test.ts`: pass, 6 tests.
  - `npm test`: pass, 82 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
- Committed and pushed Task 9:
  - `633e54b 实现技能特效和音频钩子`
  - Pushed `feature/vertical-slice` to GitHub.

## Task 10 Town UI and System Panels
- Started Task 10 in `.worktrees/vertical-slice` on `feature/vertical-slice`.
- Read current UI scaffold, styles, smoke test, shop/market systems, and current task plan.
- Wrote `src/tests/ui-smoke.test.ts` before production UI changes.
- RED evidence:
  - `npm test -- src/tests/ui-smoke.test.ts` failed because `../ui/panels` did not exist.
- Created `src/ui/panels.ts` with inventory, smith, auction, shop, quest, and settings panel renderers.
- Rebuilt `src/ui/app.ts` into a town-first app controller with navigation modes, dungeon entry, basic combat button handling, and pure `renderAppHtml`.
- Reworked `src/styles.css` into a playable town/combat layout with Chinese-style forge market scene, generated character portrait layers, responsive panels, and stable controls.
- Updated scaffold smoke test to assert the first screen includes `炉山市集`.
- Checked UTF-8 contents for UI files; no replacement characters or literal mojibake markers found.
- Updated `task_plan.md` with completed town UI/system panels and moved current work to full system interaction integration.
- Verification:
  - `npm test -- src/tests/ui-smoke.test.ts`: pass, 2 tests.
  - `npm test`: pass, 84 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
- Committed and pushed Task 10:
  - `248bc4d 实现城镇界面和系统面板`
  - Pushed `feature/vertical-slice` to GitHub.

## Task 11 Playable System Integration
- Started Task 11 in `.worktrees/vertical-slice` on `feature/vertical-slice`.
- Read upgrade, inventory, shop, market, save, and current app controller APIs.
- Wrote `src/tests/app-integration.test.ts` before production integration changes.
- RED evidence:
  - `npm test -- src/tests/app-integration.test.ts` failed because `createAppModel` did not exist.
  - Added loot/dungeon-clear test later; it failed because clearing rooms kept app mode in `combat` and did not write loot back to `GameState`.
  - Added trade/auction test later; it failed because reducer did not handle `acceptTrade`.
- Added `createAppModel` and `reduceAppAction` for testable app actions.
- Integrated UI actions for reinforcement, amplification, quest reward claim, shop pack purchase, box opening, trade offer acceptance, auction listing/resolution, save, and load.
- Connected room completion to currency/gear loot and dungeon-clear quest progression.
- Added actionable controls to shop, quest, settings, smith, trade, and auction panels.
- Added `docs/runbook.md` with install, dev server, test/build, and save instructions.
- Browser verification on `http://127.0.0.1:5173/`:
  - Desktop first screen shows `炉山市集`, `烬拳卫`, dungeon buttons, system nav, and quest panel.
  - Entered `灰窑巷`, used combat actions, saw hit sparks, HP reduction, and room transition.
  - Cleared all `灰窑巷` rooms; returned to town with `副本通关，战利品已入账`, quest became `可领取`, and inventory showed increased gold/iron dust plus dropped gear.
  - Claimed prologue quest; `琉璃熔炉` became enabled and next quest activated.
  - Reinforced gear through UI; currency was deducted and item reached `+1`.
  - Used save/load buttons; page showed `读取存档完成`.
  - Verified auction/trade buttons and actions; no browser console errors.
  - Mobile viewport `390x844` had no horizontal overflow (`scrollWidth 375`, `innerWidth 390`).
- Verification:
  - `npm test -- src/tests/app-integration.test.ts`: pass, 6 tests.
  - `npm test`: pass, 90 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
- Added final sound-feedback integration before handoff:
  - `AppModel` now carries `AudioState`.
  - App reducer queues BGM/SFX commands for town music, dungeon music, combat hits, loot, quest claim, reinforcement, amplification, shop, boxes, trade, auction, save, and load.
  - Verification after this change:
    - `npm test -- src/tests/app-integration.test.ts`: pass, 6 tests.
    - `npm test`: pass, 90 tests.
    - `npm run build`: pass.
    - `git diff --check`: pass; only CRLF conversion warnings.
    - Browser reload at `http://127.0.0.1:5173/`: no console errors.
- Updated `task_plan.md` so Phase 4 is complete and Phase 5 verification/delivery is in progress.

## Task 12 Class UI and Advancement Exposure
- Started after completion audit found a player-facing gap: four base classes and advancement rules existed in systems/data, but the app had no visible class panel or actions.
- Wrote regression tests before implementation:
  - `src/tests/ui-smoke.test.ts` now requires the first screen navigation to expose `职业` and a class panel with four base classes plus advancement choices.
  - `src/tests/app-integration.test.ts` now exercises `selectBaseClass`, `advanceClass`, and save/load round-trip for class/advancement state.
- RED evidence:
  - `npm test -- src/tests/ui-smoke.test.ts src/tests/app-integration.test.ts` failed because the nav did not contain `职业`, `renderClassPanel` was not exported, and the reducer did not apply `selectBaseClass`.
- Implemented:
  - `renderClassPanel(state)` with current class summary, four base class cards, advancement cards, requirement text, passive bonuses, and action buttons.
  - App mode `classes`, nav button `职业`, reducer actions `selectBaseClass` and `advanceClass`, and DOM click handling via `data-class-id` / `data-advancement-id`.
  - CSS for class summary, class cards, advancement cards, active state, and responsive mobile layout.
- Verification:
  - `npm test -- src/tests/ui-smoke.test.ts src/tests/app-integration.test.ts`: pass, 10 tests.
  - `npm test`: pass, 92 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
  - Browser desktop at `http://127.0.0.1:5173/`: `职业` nav visible; class panel shows `烬拳卫`, `琉璃剑客`, `墨影游侠`, `玄甲司炉`, `爆炉宗师`, and `镇山破卫`; no console errors.
  - Browser class switch: selecting `琉璃剑客` updates active class, shows `流光剑使` / `镜火术士`, and toast says `职业已切换：琉璃剑客`; no console errors.
  - Browser mobile viewport: `390x844` check showed four class cards, `职业` panel, no horizontal overflow.

## Task 13 Dungeon Quest Tracker and App Quest Events
- Started after acceptance audit found two player-facing quest gaps:
  - Dungeon mode hid the active objective because combat mode removed the quest panel.
  - App-level reinforcement did not emit quest progress even though the quest system supported `reinforced` events.
- Wrote regression tests first in `src/tests/app-integration.test.ts`.
- RED evidence:
  - `npm test -- src/tests/app-integration.test.ts` failed because `smith-first-spark` stayed `active` after reinforcing through the app reducer.
  - The same run failed because combat HTML did not contain `任务追踪`.
- Implemented:
  - Combat scene now renders a `任务追踪` HUD using `getActiveQuestText(state)`.
  - App reducer now applies quest events after reinforce, amplify, shop purchase, and successful auction sale resolution.
  - Added responsive `.quest-tracker` styling.
- Verification:
  - `npm test -- src/tests/app-integration.test.ts`: pass, 9 tests.
  - `npm test`: pass, 94 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
  - Browser at `http://127.0.0.1:5173/`: entered `灰窑巷`; combat scene showed `任务追踪` with `序章 - 炉火未熄：清理灰窑巷，查明异火来源。（进行中）`; no console errors and no horizontal overflow.

## Task 14 Trade Credits Currency
- Started after acceptance audit found `Trade Credits` were required but the current currency model only had Gold, Iron Dust, Arc Shards, Valor Tokens, and Protection Tickets.
- Wrote regression tests first:
  - `src/tests/state-inventory-save.test.ts` now expects starter `tradeCredit: 8`.
  - `src/tests/economy.test.ts` now requires NPC trade offers to spend or grant `tradeCredit`.
- RED evidence:
  - `npm test -- src/tests/state-inventory-save.test.ts src/tests/economy.test.ts` failed because `tradeCredit` was missing from starter currencies and no trade offer referenced it.
- Implemented:
  - Added `tradeCredit` to `CurrencyId`, starter state, save validation currency list, catalog test fixture, and UI currency strip as `商契`.
  - Reworked NPC trade templates so personal trade uses `tradeCredit` as its distinct economy currency.
- Verification:
  - `npm test -- src/tests/state-inventory-save.test.ts src/tests/economy.test.ts`: pass, 33 tests.
  - `npm test`: pass, 94 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
  - Browser at `http://127.0.0.1:5173/`: backpack currency strip showed `商契 8`; auction/trade panel accepted an NPC trade and showed `交易完成`; no console errors and no horizontal overflow.

## Task 15 Reset Save Confirmation
- Started after acceptance audit found the settings panel had save/load but no reset-save action with confirmation.
- Wrote regression tests first:
  - `src/tests/ui-smoke.test.ts` now expects settings to render `重置存档`.
  - `src/tests/app-integration.test.ts` now verifies unconfirmed reset keeps saved storage and confirmed reset removes `SAVE_KEY`, resets state, returns to town, and shows a reset message.
- RED evidence:
  - `npm test -- src/tests/ui-smoke.test.ts src/tests/app-integration.test.ts` failed because settings did not contain `重置存档` and `resetSave` was not handled by the reducer.
- Implemented:
  - Added `重置存档` settings button.
  - Added `resetSave` reducer action with explicit `confirmed` flag.
  - Browser click path now asks `confirm("确认重置本地存档？此操作不可撤销。")` before dispatching a reset.
- Verification:
  - `npm test -- src/tests/ui-smoke.test.ts src/tests/app-integration.test.ts`: pass, 13 tests.
  - `npm test`: pass, 95 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
  - Browser automation note: attempting to click the native confirm in the in-app browser caused the browser-control runtime to time out; no code changes were made from that attempt. Confirmation behavior is covered by reducer tests and the UI button is covered by smoke tests.

## Task 16 Inventory Item Actions
- Started after acceptance audit found inventory item operations were implemented in systems but not exposed enough in the player-facing inventory UI, and item locking did not block conversion.
- Wrote regression tests first:
  - `src/tests/state-inventory-save.test.ts` now verifies `setItemLock()` and locked-item rejection for sale/dismantle.
  - `src/tests/ui-smoke.test.ts` now requires the inventory panel to show `对比`, `装备`, `出售`, `分解`, and `锁定`.
  - `src/tests/app-integration.test.ts` now exercises equip, lock, locked-sale rejection, unlock, sell, and dismantle through app actions.
- RED evidence:
  - `npm test -- src/tests/state-inventory-save.test.ts src/tests/ui-smoke.test.ts src/tests/app-integration.test.ts` failed because `setItemLock` was not exported, inventory UI lacked operation controls, and `equipItem` app action did not update equipment.
- Implemented:
  - Added `setItemLock()` and locked-item guards to `sellItem()` / `dismantleItem()`.
  - Inventory rows now show item comparison text, lock state, reinforce level, and action buttons for equip/sell/dismantle/lock.
  - Added app reducer actions and DOM bindings for `equipItem`, `sellItem`, `dismantleItem`, and `toggleItemLock`.
  - Added compact responsive styling for inventory row controls.
- Verification:
  - `npm test -- src/tests/state-inventory-save.test.ts src/tests/ui-smoke.test.ts src/tests/app-integration.test.ts`: pass, 39 tests.
  - `npm test`: pass, 97 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
  - Browser note: current in-app browser automation was left unreliable by a previous native confirm dialog timeout, so this change was verified through reducer/UI smoke tests and production build rather than live browser clicks.

## Task 17 Equipment Set Bonuses and Mixed Builds
- Started after acceptance audit found Epic set data existed but active 2/3/5-piece bonuses and mixed 2+3 builds were not evaluated as gameplay state.
- Wrote regression tests first in `src/tests/builds.test.ts`.
- RED evidence:
  - `npm test -- src/tests/builds.test.ts` failed because `../systems/builds` did not exist.
- Implemented:
  - Added `evaluateEquipmentBuild(state)` to count equipped set pieces, split active/inactive bonuses, total active bonus stats, and emit build tags.
  - Inventory panel now shows `构筑标签`, active bonuses, inactive bonuses, and mixed set summaries.
- Verification:
  - `npm test -- src/tests/builds.test.ts`: pass, 2 tests.
  - `npm test`: pass, 99 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
  - Browser note: skipped live browser check because the in-app browser automation remained unreliable after the previous native confirm dialog timeout; UI behavior is covered by `renderInventoryPanel` tests.

## Task 18 Working Volume Controls
- Started after acceptance audit found settings rendered master/music/SFX sliders but did not wire them to `AudioState`.
- Wrote regression tests first:
  - `src/tests/ui-smoke.test.ts` now checks settings inputs expose `data-volume-kind` and render current audio volume percentages.
  - `src/tests/app-integration.test.ts` now verifies `setVolume` app action updates and clamps audio volumes.
- RED evidence:
  - `npm test -- src/tests/ui-smoke.test.ts src/tests/app-integration.test.ts` failed because settings inputs lacked `data-volume-kind` and reducer did not update `audio.volumes`.
- Implemented:
  - `renderSettingsPanel(audio)` now renders current volume values and `data-volume-kind` attributes.
  - Added `setVolume` app action using the existing audio-system clamp helper.
  - Added DOM `input` binding for settings sliders.
- Verification:
  - `npm test -- src/tests/ui-smoke.test.ts src/tests/app-integration.test.ts`: pass, 15 tests.
  - `npm test`: pass, 100 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.

## Task 19 Auction Market Depth
- Started after acceptance audit found auctions supported listing, fees, and sale settlement, but lacked recent sale prices and demand-aware market feedback.
- Wrote regression tests first:
  - `src/tests/economy.test.ts` now checks sold auctions record the last 5 prices, produce cold/hot demand states, and derive suggested price plus fee from recent sales.
  - `src/tests/economy.test.ts` now rejects malformed `market.priceHistory` save data.
  - `src/tests/ui-smoke.test.ts` now checks auction UI exposes recent prices, listing fee, demand, and data-backed suggested price.
- RED evidence:
  - `npm test -- src/tests/economy.test.ts src/tests/ui-smoke.test.ts` failed because `getAuctionPricing` was missing, `priceHistory` validation was absent, and the auction panel had no market metric attributes.
- Implemented:
  - Added auction price history to `MarketState` and initial state.
  - `resolveAuctions` now records sold listing prices by catalog gear id and retains the most recent 5.
  - Added `getAuctionPricing(state, catalogGearId)` with suggested price, listing fee, recent prices, and cold/normal/hot demand state.
  - Auction panel now shows suggested price, demand heat, listing fee, and recent sale prices; the listing button carries `data-auction-price`.
  - Auction click handling now uses the button-provided suggested price when present.
- Verification so far:
  - `npm test -- src/tests/economy.test.ts src/tests/ui-smoke.test.ts`: pass, 13 tests.
  - `npm test`: pass, 101 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
- Code review follow-up:
  - Reviewer found edited saves could keep oversized/unordered `priceHistory`, and old saves could load without the new field.
  - Added RED tests for unordered history normalization and legacy-save migration.
  - Implemented sorted last-5 price-history normalization for pricing, auction settlement, and save loading.
  - `npm test -- src/tests/economy.test.ts`: pass, 12 tests.
  - Final verification after review fixes: `npm test` pass, 103 tests; `npm run build` pass; `git diff --check` pass with only CRLF conversion warnings.

## Task 20 Procedural Background Music Playback
- Started after acceptance audit found audio state and music-layer choices existed, but the browser did not yet have a playback layer.
- Confirmed current implementation:
  - `src/systems/audio.ts` queued BGM/SFX commands and selected town/dungeon/boss tracks.
  - `src/ui/app.ts` updated audio state through reducer actions.
  - No real WebAudio processing existed yet.
- Wrote regression tests first in `src/tests/render-audio.test.ts`:
  - Procedural BGM/SFX plans must include track texture tags, note schedules, channel, loop timing, and effective volume.
  - Audio command processor must flush command queues once and restart music after volume changes.
  - Browser sink must safely no-op when WebAudio is unavailable.
- RED evidence:
  - `npm test -- src/tests/render-audio.test.ts` failed because `src/systems/audio-browser.ts` and audio plan exports did not exist.
- Implemented:
  - Added procedural note patterns for town, dungeon, boss, and key SFX.
  - Added `createAudioPlaybackPlan`, `flushAudioCommands`, and `createAudioCommandProcessor`.
  - Added `createBrowserAudioSink()` using WebAudio oscillators with looped music scheduling and no-op fallback.
  - Mounted the audio command processor in `mountApp` after user input/click dispatches.
- Verification so far:
  - `npm test -- src/tests/render-audio.test.ts`: pass, 9 tests.
  - `npm test`: pass, 106 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass; only CRLF conversion warnings.
- Code review follow-up:
  - Reviewer found stale BGM commands could double-play, BGM restart did not cancel scheduled nodes, WebAudio exceptions could escape, and SFX volume changes restarted BGM.
  - Added RED tests for stale BGM queues, SFX-only volume changes, WebAudio restart cleanup, and AudioContext construction failure.
  - Implemented latest-BGM queue filtering, music-only volume restart checks, scheduled-node cancellation, and guarded WebAudio sink operations.
  - `npm test -- src/tests/render-audio.test.ts`: pass, 13 tests.
  - Final verification after review fixes: `npm test` pass, 110 tests; `npm run build` pass; `git diff --check` pass with only CRLF conversion warnings.
- Second review follow-up:
  - Reviewer found ended music oscillator nodes could remain referenced until the next BGM restart.
  - Added RED test for `onended` cleanup before restart.
  - Browser audio sink now removes ended oscillator nodes from the active music list.
  - `npm test -- src/tests/render-audio.test.ts`: pass, 14 tests.
  - Final verification after second review fix: `npm test` pass, 111 tests; `npm run build` pass; `git diff --check` pass with only CRLF conversion warnings.

## Task 21 Detailed Character and Environment Bitmap Assets
- Started after visual-quality audit found the UI still relied on CSS shapes for the hero and scene backdrops.
- Generated original project-bound bitmap assets with the built-in `image_gen` path, then copied selected outputs into `public/assets/`:
  - `public/assets/hero-ember-warden.png`
  - `public/assets/forge-market-bg.png`
  - `public/assets/cinder-kiln-bg.png`
  - `public/assets/liuli-furnace-bg.png`
- Wrote regression test first in `src/tests/ui-smoke.test.ts`:
  - Town render must reference the forge market background and detailed hero art.
  - Combat render must reference cinder kiln and liuli furnace bitmap backgrounds.
- RED evidence:
  - `npm test -- src/tests/ui-smoke.test.ts` failed because the rendered HTML did not reference the bitmap assets.
- Implemented:
  - Town scene now renders `/assets/forge-market-bg.png` plus `/assets/hero-ember-warden.png`.
  - Combat scene now resolves dungeon-specific background art for cinder kiln and liuli furnace.
  - CSS now treats generated bitmaps as the primary scene art, with overlays for readability and preserved HUD layering.
- Verification:
  - `npm test -- src/tests/ui-smoke.test.ts`: pass, 4 tests.
  - `npm test`: pass, 112 tests.
  - `npm run build`: pass.
  - Asset copy check: all four files exist under `public/assets`, each ~2.4-2.7 MB.
  - Browser note: Vite launched at `http://127.0.0.1:5174/`, but in-app browser automation timed out even on basic tab inspection after reconnect; live screenshot verification is currently blocked by browser-control session state.
- Code review follow-up:
  - Reviewer flagged untracked PNG assets as a commit-time blocker and noted tests did not verify referenced asset files exist.
  - Added UI smoke coverage that checks every referenced bitmap is discoverable through Vite's asset glob under `public/assets`.
  - `npm test -- src/tests/ui-smoke.test.ts`: pass, 5 tests.
  - `npm run build` initially failed when the test used `node:fs` without Node type declarations; replaced it with `import.meta.glob`.
  - Re-verification: `npm test -- src/tests/ui-smoke.test.ts` pass, 5 tests; `npm run build` pass.
  - Final verification: `npm test` pass, 113 tests; `npm run build` pass; `git diff --check` pass with only CRLF conversion warnings.

## Task 22 Combat Skill Bar and Hotkeys
- Started after combat UX audit found the combat model had class skills and keyboard input mapping, but the UI only exposed one generic skill button and no concrete skill slots.
- Wrote regression test first in `src/tests/app-integration.test.ts`:
  - Combat render must show concrete class skill buttons with `data-combat-skill-id`, hotkey, and skill cost.
  - `combatActionForKeyCode()` must map `KeyJ` to light attack and `KeyU` to `anvil-crash`.
  - Reducer must execute the selected skill id and play skill SFX.
- RED evidence:
  - `npm test -- src/tests/app-integration.test.ts` failed because combat HTML did not contain `data-combat-skill-id="anvil-crash"`.
- Implemented:
  - Added state-aware combat skill discovery from base class and advancement skills.
  - Combat scene now renders individual skill buttons for L/U/I/O/Space skills, with hotkey and resource cost metadata.
  - App reducer now accepts a specific combat `skillId` instead of always casting `spark-combo`.
  - Button click handling reads `data-combat-skill-id`; `keydown` handling maps J/K/U/I/O/L/Space while in combat.
  - Combat button styling now separates command label from hotkey/cost text.
- Verification so far:
  - `npm test -- src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 18 tests.
  - `npm test`: pass, 114 tests.
  - `npm run build`: pass after replacing the union ternary with explicit action branches.
  - `git diff --check`: pass; only CRLF conversion warnings.
- Code review follow-up:
  - Reviewer found nested span clicks missed button datasets, global keydown lacked cleanup, hotkeys ignored current combat heat, and optional skill ids could mask missing datasets.
  - Added RED tests for unaffordable hotkey filtering, nested skill-label click handling, and mount cleanup.
  - Implemented `closest("button")` click delegation, current-heat hotkey filtering, required skill ids, and `mountApp()` cleanup return.
  - `npm test -- src/tests/app-integration.test.ts`: pass, 15 tests.
  - Final verification after review fixes: `npm test` pass, 116 tests; `npm run build` pass; `git diff --check` pass with only CRLF conversion warnings.

## Final Delivery Verification
- User allowed pushing to GitHub.
- Pushed latest gameplay commit `0a25966 完善战斗技能热键` to `origin/feature/vertical-slice`.
- Pushed final-record commit `1698f44 记录最终交付核验` to `origin/feature/vertical-slice`.
- Verified local `HEAD` matches `origin/feature/vertical-slice` after the final-record push.
- Final verification:
  - `npm test`: pass, 12 files and 116 tests.
  - `npm run build`: pass, production files emitted under `dist/`.
  - `git diff --check`: pass.
- Dev server verification: `http://127.0.0.1:5174/` returned HTTP 200 with `lang="zh-CN"`.
- Browser/play note: Vite dev server is available at `http://127.0.0.1:5174/` from the existing dev session. In-app browser automation remained unreliable after native-dialog/browser-control timeouts, so final confidence is based on integration tests, smoke tests, build, asset existence checks, and earlier successful browser checks.

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Project file scan | `rg --files` | Existing source list or empty | Empty output | pass |
| Visual companion server | bundled Node + `server.cjs` | Local URL and content/state dirs | `http://localhost:50336` started | pass |
| Visual board open | Codex in-app browser | Approach selection screen visible | URL opened with title `Superpowers Brainstorming` | pass |
| Design spec created | approach B selected | Formal design doc exists | `docs/superpowers/specs/2026-07-03-dnf-inspired-hybrid-rpg-design.md` created | pass |
| Design spec committed | git repo initialized | Commit exists | `9ccabf3 添加混合动作角色扮演设计规格` | pass |
| Updated design spec committed | equipment/story/audio/visual updates | Commit exists | `d64cfd6 扩展动作角色扮演系统设计` | pass |
| GitHub remote configured | user provided repo URL | origin points to repo | `origin https://github.com/G1ow9711/MyDNF.git` | pass |
| Localized naming committed | Chinese display names required | Commit exists and UTF-8 validates | `ccf3480 本地化中国风设定命名` | pass |
| Implementation plan created | approved development | Plan exists and self-review passed | `docs/superpowers/plans/2026-07-03-mydnf-vertical-slice-implementation.md` | pass |
| GitHub push | user allowed push | `main` pushed to `origin/main` | `4d0d1de` pushed after history rewrite | pass |
| Chinese commit messages | user required all commit messages in Chinese | `git log` has Chinese messages and UTF-8 decode passes | all current commits are Chinese | pass |
| Task 1 scaffold | implementation plan Task 1 | tests/build pass and reviews approve | `fb6a910 修复前端骨架质量问题` | pass |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-07-03 | `cannot create a new goal because this thread has an unfinished goal` | 1 | Continue under current active goal context |
| 2026-07-03 | `fatal: not a git repository (or any of the parent directories): .git` | 1 | Logged state; avoid git-dependent workflow unless initialized |
| 2026-07-03 | `适用于 Linux 的 Windows 子系统没有已安装的分发。` when running `bash start-server.sh` | 1 | Do not retry WSL path; launch brainstorm server with bundled Node directly |

| 2026-07-03 | `git-filter-branch: eval: syntax error near unexpected token '('` | 1 | Replaced PowerShell msg-filter with Python msg-filter |
| 2026-07-03 | `Warning: commit message did not conform to UTF-8` | 2 | Re-ran msg-filter with binary UTF-8 stdout keyed by commit hash |
| 2026-07-04 | `SyntaxError: unexpected character after line continuation character` from `python -c` with literal `\n` in PowerShell | 1 | Switched to semicolon/list-comprehension one-line Python checks |
| 2026-07-04 | `npm run build` failed because combat test accessed `CombatEvent` union fields without narrowing | 1 | Added `lastHitEvent` type guard in the test file |
| 2026-07-04 | PowerShell rejected `&&` while staging and committing | 1 | Switched to separate `git add` and `git commit` commands |
| 2026-07-04 | Tried to read missing `src/render/renderer.ts` | 1 | Used `rg --files` and read the actual `src/game/render.ts` file |
| 2026-07-04 | `npm run build` failed because test deleted non-optional `globalThis.AudioContext` | 1 | Replaced `delete` with `Reflect.deleteProperty` in the test cleanup |
| 2026-07-04 | `npm run build` failed because `combatAction` union did not narrow through nested ternary | 1 | Replaced ternary with explicit `if/else` branches |

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | Phase 3: implementation planning |
| Where am I going? | Write implementation plan, then execute build after plan workflow choice |
| What's the goal? | Build a playable offline DNF-inspired action RPG prototype with combat, economy, enhancement, amplification, shop, costumes, and packs |
| What have I learned? | User approved development; all git commit messages must be Chinese |
| What have I done? | Researched, brainstormed, wrote and committed spec, configured GitHub remote, started implementation planning |

---
*Update after completing each phase or encountering errors.*

## Task 23 Combat Visibility Fix
- Started after the user screenshot showed tasks and monsters were hard to see in combat.
- Root cause: `CombatRun` already stored player/enemy positions and render commands, but `renderCombatScene()` only rendered the bitmap background plus text lists. It did not render visible actor sprites. The quest tracker existed but had weak visual priority, and a cleared room did not make the settlement step obvious.
- Added RED coverage:
  - `src/tests/ui-smoke.test.ts` now requires visible combat actor layers, player art, enemy sprites, alive/defeated enemy states, a prominent quest tracker, and a cleared-room banner.
  - `src/tests/app-integration.test.ts` now verifies attacking an already-cleared room prompts settlement instead of throwing `No alive enemy target`.
- Implemented:
  - Combat scene now renders a player actor using the detailed hero bitmap, visible enemy actors with health bars, defeated enemy bodies, and position-aware actor placement.
  - Quest tracker now uses a prominent overlay in combat.
  - Cleared rooms now show a `房间已清理` banner, disable attack buttons, and highlight the settlement button.
  - Reducer now handles post-clear attack inputs with a Chinese settlement prompt instead of surfacing the English combat exception.
- Verification:
  - `npm test -- src/tests/ui-smoke.test.ts src/tests/app-integration.test.ts`: pass, 23 tests.
  - Browser check at `http://127.0.0.1:5174/`: after entering `灰窑巷`, DOM showed 1 player actor, 2 alive enemy actors, and 1 prominent quest tracker. After repeated heavy attacks, DOM showed 0 alive enemies, 2 defeated enemies, a cleared-room banner, disabled attack button, and highlighted settlement button.
  - Browser screenshot confirmed the player, defeated enemies, task tracker, and cleared-room prompt are visible over the dungeon background.
  - `npm test`: pass, 12 files and 119 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with only Windows line-ending warnings.
  - Read-only review agent found no blocking issues; noted residual risk is only that automated tests are DOM/logic based, which is covered by the manual browser screenshot check.

## Task 24 DNF-Style Keyboard Control and Room Settlement Gate
- Started after stricter continuation goal: follow DNF gameplay more closely and verify controls on the local computer.
- Gap found:
  - `finish` action still used `defeatAll()` in the UI reducer, allowing the player to skip combat and settle a room with live enemies.
  - Keyboard handling mapped attack/skill keys only; Arrow/WASD movement did not drive `stepCombat()` in the live app.
- Added RED coverage:
  - `src/tests/app-integration.test.ts` now verifies live enemies block room settlement with a Chinese prompt.
  - `src/tests/app-integration.test.ts` now verifies ArrowRight maps to a combat movement action and changes player position.
  - Existing dungeon-clear integration test now defeats each room with attacks before settling.
- Implemented:
  - Added `combatMove` app action and movement mapping for Arrow keys and WASD.
  - Added X/J light attack and Z/K heavy attack keyboard aliases.
  - Live keydown handler passes movement keys and Shift dash into combat movement.
  - Removed UI-level auto-kill settlement; rooms can only settle after all enemies are defeated.
  - Added an in-combat keyboard hint: `方向键/WASD 移动 · Shift 冲刺 · X/J 轻击 · Z/K 重击`.
- Verification:
  - `npm test -- src/tests/app-integration.test.ts`: pass, 18 tests.
  - `npm test`: pass, 12 files and 121 tests.
  - `npm run build`: pass.
  - Browser check at `http://127.0.0.1:5174/`: after entering `灰窑巷`, ArrowRight moved the player actor from left 96 to 131; clicking settlement with 2 live enemies showed `请先击败所有怪物，再结算房间`; pressing X changed first enemy HP from 80/80 to 56/80, heat from 0 to 8, combo to 1, and hit-spark count to 1.

## Task 25 Single-Player Save Flow and Shan Hai Jing Monster Upgrade
- Started after the user requested that the single-player game consider save functionality, while the earlier monster-modeling request remains open.
- Added RED coverage:
  - `src/tests/app-integration.test.ts` verifies startup reads an existing local save and explicit `initialState` still overrides it for tests/new-game flows.
  - `src/tests/app-integration.test.ts` verifies mounted persistent UI actions auto-save to `SAVE_KEY`.
  - `src/tests/ui-smoke.test.ts` requires the settings panel to explain local auto-save behavior.
- Implemented:
  - `createAppModel()` now auto-loads `SAVE_KEY` when storage is available and no explicit initial state is provided.
  - `mountApp()` now saves after dispatched actions that actually change `GameState`, excluding load and reset-save.
  - Settings panel now describes local single-player auto-save and manual save/load/reset controls.
- Verification:
  - `npm test -- src/tests/app-integration.test.ts`: pass, 20 tests.
  - `npm test -- src/tests/ui-smoke.test.ts`: pass, 7 tests.
- Continued after the user required non-static combat actors and visible skill effects for both player and monsters.
- Added RED coverage:
  - `src/tests/app-integration.test.ts` verifies idle combat actors expose motion state, a strike changes the player to attack motion, and the hit target changes to monster hit reaction.
  - `src/tests/app-integration.test.ts` verifies a cast skill renders a combat VFX layer, skill burst, VFX action marker, and damage number.
  - `src/tests/ui-smoke.test.ts` verifies trash, elite, and boss monsters render tier-specific monster skill VFX ids.
- Implemented:
  - `renderCombatActors()` now derives player motion and monster hit reaction from the latest hit event.
  - `renderCombatVfx()` now draws monster skill telegraphs, hit impacts, damage numbers, and player skill burst effects.
  - CSS animations now cover player light/heavy/skill movement, monster idle breathing, monster hit reaction, impact rings, slash cuts, skill bursts, damage float, and enemy cast telegraphs.
- Verification:
  - `npm test -- src/tests/app-integration.test.ts`: pass, 22 tests.
  - `npm test -- src/tests/ui-smoke.test.ts`: pass, 9 tests.
- Parallel review:
  - Spawned review agent `019f2bb2-28ba-7ff0-94a8-a3d90605fabe`.
  - Review found no blocking issues, but flagged stale hit/VFX state and malformed-save auto-overwrite as medium risks.
  - Added regressions for hit/VFX expiry, next-room VFX isolation, and malformed-save fallback auto-save protection.
  - Implemented timestamped hit events, recent-hit filtering, room event reset, and malformed-save auto-save disablement until explicit save/reset.
  - Added `AGENTS.md` with the project rule that independent work should use multiple agents in parallel when feasible.
  - Added Vite watch ignore for `.codex-local` after Edge headless verification profiles caused Windows `EBUSY` watcher failure.
- Final verification in progress:
  - `npm test -- src/tests/app-integration.test.ts`: pass, 24 tests.
  - `npm test`: pass, 12 files and 129 tests.
  - `npm run build`: pass after adding explicit render hit type narrowing.
  - Edge headless browser check on `http://127.0.0.1:5174/`: enemy PNG assets loaded with natural width 1619, monster skill VFX present, player attack motion `light`, one hit enemy, one impact, one damage number, player skill VFX `furnace-step`, auto-save wrote +1 reinforcement, reload read local save, and settings showed local auto-save note.
  - Browser screenshot saved at `.codex-local/tmp/monster-browser-check.png`.
- Follow-up after user clarified that character and monster models themselves must move with attacks:
  - Added regression assertions that player and enemy image nodes include `actor-model-*` motion classes.
  - Player and monster bitmap `<img>` nodes now receive `actor-model-idle/light/heavy/skill/hit/defeated` classes derived from combat state.
  - CSS animation selectors now target those model classes directly, so the bitmap models themselves translate, rotate, compress, and recover during attacks and hit reactions.
  - `npm test -- src/tests/app-integration.test.ts`: pass, 24 tests.
  - Browser check confirmed model classes at runtime: player `combat-player-art actor-model actor-model-light`, hit monster `enemy-art actor-model actor-model-hit`.

## Task 26 Monster Attack AI and Player Hurt Motion
- Started after the user required both player and monster models to follow attack actions, not remain static.
- Read `planning-with-files`, `superpowers:test-driven-development`, and `superpowers:dispatching-parallel-agents`.
- Used parallel explorer agent `019f2bfb-150e-7b20-9d37-c8dbee87b0df` for a read-only strict-DNF gameplay gap audit; it identified monster AI/player damage/death as the top missing loop.
- Added RED coverage:
  - `src/tests/combat.test.ts` verifies enemy windup does not damage early, impact frames damage player, lane dodge causes miss, and HP 0 marks the run failed.
  - `src/tests/app-integration.test.ts` verifies real enemy skills drive monster `actor-model-attack`, player `actor-model-hit`, player defeated UI, and post-death action blocking.
  - `src/tests/ui-smoke.test.ts` verifies monster skill VFX is not permanent decoration and only renders from enemy attack events.
- Implemented:
  - Enemy AI state now includes next attack timing, windup, impact, recovery, skill id, and hit resolution.
  - Enemy attacks now use tier-specific skills: `ash-ember-spit`, `zheng-shockwave`, and `taotie-flame-breath`.
  - Player state now has max HP, invulnerability, hurt lock, defeated flag, and failed combat state.
  - Combat UI now renders HP, failed objective state, disabled combat buttons, player hit/defeated model motion, monster attack model motion, and event-driven enemy VFX phases.
  - Mounted browser gameplay now runs a 140 ms combat tick, so monster AI can wind up and attack even when the player briefly stops input.
- Verification:
  - `npm test -- src/tests/combat.test.ts`: pass, 10 tests.
  - `npm test -- src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 35 tests before tick-loop addition.
  - `npm test -- src/tests/app-integration.test.ts`: pass, 27 tests after tick-loop addition.
  - `npm test`: pass, 12 files and 136 tests.
  - `npm run build`: pass.
  - Edge headless browser check on `http://127.0.0.1:5174/`: initial combat had 2 monster bitmap models and no permanent enemy skill VFX; after moving into range and waiting for the combat tick, DOM showed 2 attacking monsters, enemy `actor-model-attack`, `ash-ember-spit` VFX in `active`/`miss` phases, and HP reduced to 972/1000.
  - Browser screenshot saved at `.codex-local/tmp/monster-browser-check.png`.

## Task 27 Skill Cooldowns
- Started after strict-DNF audit identified missing per-skill cooldowns as the next combat-feel gap.
- Used parallel explorer agent `019f2c1c-ba47-7e12-90c3-fa4bccf4435d` for read-only gameplay gap review while implementing locally.
- Added RED coverage:
  - `src/tests/combat.test.ts` verifies a class skill writes a cooldown ready timestamp, rejects recast during cooldown, and allows recast after the timer expires.
  - `src/tests/app-integration.test.ts` verifies cooling skills render disabled with remaining time and hotkeys are filtered while a skill is cooling.
- Implemented:
  - `CombatPlayer.skillCooldowns` stores per-skill ready times.
  - `performAction()` checks `skillCooldownRemaining()` before casting and writes `run.elapsedMs + skill.cooldownMs` on cast.
  - Combat skill buttons expose `data-skill-cooldown-remaining`, `data-cooldown-state`, disabled state, and a `冷却 Ns` label.
  - Keyboard skill mapping now receives the current `CombatRun` and refuses cooling skill hotkeys.
  - Reducer catches stale cooldown casts and shows `技能冷却中` instead of throwing to the player.
- Verification:
  - RED confirmed: focused tests failed because `skillCooldowns` and cooldown button metadata were missing.
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts`: pass, 39 tests.
  - `npm test`: pass, 12 files and 138 tests.
  - `npm run build`: pass.
  - Edge headless browser check on `http://127.0.0.1:5174/`: after casting `furnace-step`, the button showed `data-cooldown-state="cooling"`, was disabled, had remaining cooldown `3460`, and displayed `冷却 3.5s`.
- Explorer follow-up found the next highest-priority gaps after this task:
  - P0: equipment, reinforcement, amplification, set bonuses, and build tags still do not enter combat damage/HP/cooldown formulas.
  - P0: class resources are still represented as generic heat in combat even though class data defines heat/prism/ink/guard.

## Task 28 Equipment Combat Formula
- Started after the cooldown follow-up audit identified equipment and build stats not entering combat formulas as the next P0 gap.
- Added RED coverage:
  - `src/tests/builds.test.ts` requires a combat profile that combines equipped gear stats, reinforcement, amplification, and active Epic set bonuses.
  - `src/tests/combat.test.ts` requires geared runs to gain higher max HP, deal higher hit damage, and receive reduced skill cooldowns.
  - `src/tests/app-integration.test.ts` requires the dungeon HUD to show attack, defense, and cooldown stats.
- Implemented:
  - Added `evaluateCombatProfile()` in `src/systems/builds.ts`.
  - Combat profile now folds in equipped gear base stats, active set bonuses, reinforcement attack/defense, amplified equipped stats, and class advancement passives.
  - `createCombatRun()` now snapshots combat profile and uses it for player max HP.
  - Player light/heavy/skill damage now scales from combat attack/element/crit.
  - Player skill cooldowns now use combat cooldown reduction.
  - Player resource gain uses heat-gain stats.
  - Enemy damage now applies defense-based damage reduction.
  - Combat HUD now displays attack, defense, and cooldown values.
- Verification:
  - RED confirmed: focused tests failed because `evaluateCombatProfile()` did not exist and combat HP stayed fixed at 1000.
  - `npm test -- src/tests/builds.test.ts src/tests/combat.test.ts`: pass, 15 tests.
  - `npm test -- src/tests/builds.test.ts src/tests/combat.test.ts src/tests/app-integration.test.ts`: pass, 44 tests.
  - `npm test`: pass, 12 files and 141 tests.
  - `npm run build`: pass.
  - Edge headless browser check on `http://127.0.0.1:5174/`: combat status showed `攻击 9 · 防御 0 · 冷却 0%`, monster attacks and skill cooldown VFX still rendered correctly, and screenshot was refreshed at `.codex-local/tmp/monster-browser-check.png`.

## Task 29 Directional Model Motion and Hurt-Lock Sync
- Started after the user clarified that character and monster attack models must move with actions.
- Used a parallel read-only explorer agent `019f2c3b-e3eb-7092-be89-3092411d0a69` to audit model-motion binding risks while implementing locally.
- Added RED coverage:
  - `src/tests/app-integration.test.ts` verifies left-facing player strikes put directional lunge and hurt-reaction variables on the player/enemy bitmap `<img>` nodes.
  - `src/tests/app-integration.test.ts` verifies monster attack direction and player hurt knockback variables are attached to bitmap `<img>` nodes.
  - `src/tests/combat.test.ts` verifies player attacks are blocked while monster-hit hurt lock is active.
  - `src/tests/app-integration.test.ts` verifies monster `actor-model-attack` stops after the real attack recovery ends.
- Implemented:
  - Player and monster bitmap models now receive CSS variables for facing scale, attack lunge direction, and hurt knockback direction.
  - CSS keyframes now consume those variables, so flips and action transforms are composed on the same bitmap node instead of fighting each other.
  - Monster model motion now uses real attack recovery state rather than only the recent VFX event window.
  - Enemy hits now create a longer hurt lock, and `performAction()` blocks player attacks during that lock.
  - Rewrote `AGENTS.md` as readable Chinese while preserving the project rule to use multiple agents in parallel where feasible.
- Verification:
  - RED confirmed: focused tests failed because bitmap nodes lacked motion variables, player attacks still landed during hurt lock, and recovered monsters kept `data-enemy-motion="attack"`.
  - `npm test -- src/tests/app-integration.test.ts`: pass, 31 tests after directional CSS variables.
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts`: pass, 45 tests.
  - `npm test`: pass, 12 files and 145 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Edge headless browser check via `.codex-local/tmp/motion-check.mjs`: player left-facing light attack rendered `combat-player-art actor-model actor-model-light` with `--model-scale-x: -1` and `--light-lunge-x: -24px`; hit monster rendered `enemy-art actor-model actor-model-hit` with hurt knockback variables; live monster attack rendered `enemy-art actor-model actor-model-attack` with `--enemy-lunge-x: -28px`.

## Task 30 Player Hitboxes, Miss Events, and Targeted Model Motion
- Started after the user required character and monster attack models to follow the action, with attacks no longer feeling like static first-target clicks.
- Used a parallel read-only explorer agent `019f2c4d-16c9-7eb0-8b6b-dc62e72319fb`; it confirmed the biggest current risk was that player attacks ignored facing, distance, lane, and nearest target.
- Added RED coverage:
  - `src/tests/combat.test.ts` verifies behind, out-of-range, and off-lane enemies are missed without HP loss.
  - `src/tests/combat.test.ts` verifies the nearest valid enemy in front is selected.
  - `src/tests/combat.test.ts` verifies area skills can hit multiple enemies inside the hitbox.
  - App/render tests now place enemies deliberately in range when the assertion expects hit motion or VFX.
- Implemented:
  - Added player hitbox selection for light, heavy, and skill actions.
  - Added `CombatMissEvent` so whiffed player actions still drive bitmap model motion without fake damage.
  - Light/heavy attacks now require correct facing, X range, Y lane range, and an alive target.
  - Skill tags now influence range, lane width, target cap, and front-only behavior.
  - App motion logic now reads recent hit or miss events, so player bitmap models animate on both hits and whiffs.
- Verification:
  - `npm test -- src/tests/combat.test.ts`: pass, 16 tests.
  - `npm test -- src/tests/app-integration.test.ts src/tests/render-audio.test.ts src/tests/ui-smoke.test.ts`: pass, 55 tests.
  - `npm test`: pass, 12 files and 148 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Edge headless browser check via `.codex-local/tmp/hitbox-check.mjs`: far light attack kept both enemies at `80/80`, rendered player `light` motion, and produced no hit/impact; refreshed near-range light attack moved the player from left `123.796875` to `414.0625`, reduced the first enemy to `54/80`, rendered one enemy hit motion, one impact, and a concrete target id.

## Task 31 Class Resource Identity in Combat
- Started after the continuation audit found four classes had catalog resource identities, but combat still displayed and processed every class as generic `heat`.
- Used parallel read-only explorer agent `019f2c64-9874-7533-b6d3-6b12685287e8`; it confirmed the main path still used `PlayerState.heat`, `CombatPlayer.heat`, hardcoded combat HUD text, and heat-based hotkey filtering.
- Added RED coverage:
  - `src/tests/combat.test.ts` verifies a Liuli run creates `CombatPlayer.resource` with `prism` / `璃息`, clamps current value to class max, and spends that resource on Liuli skills.
  - `src/tests/app-integration.test.ts` verifies the combat HUD shows the selected class resource name/max, skill buttons carry `data-resource-id`, hotkeys filter by that resource, and room settlement persists the current resource value.
- Implemented:
  - Added `CombatResource` and `CombatPlayer.resource`.
  - `createCombatRun()` now snapshots the active class resource metadata from catalog data.
  - Light/heavy gain, skill cost, skill gain, and skill affordability now use `run.player.resource.current`.
  - `run.player.heat` remains synchronized as a save-compatibility alias.
  - Combat HUD and skill buttons now display selected resource identity instead of hardcoded `热能`.
  - Room settlement writes combat resource current value back to `GameState.player.heat` before loot/quest updates.
- Verification:
  - RED confirmed: focused tests failed because `run.player.resource` was undefined and the HUD still showed `热能 40`.
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts`: pass, 52 tests.
  - `npm test`: pass, 12 files and 152 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Edge headless browser check via `.codex-local/tmp/resource-check.mjs`: after selecting Liuli Blademage and setting saved resource to 40, combat HUD showed `璃息 40/100`, `liuli-rain` button had `data-resource-id="prism"` and was enabled, casting it changed HUD to `璃息 16/100`, player motion became `skill`, and VFX id was `liuli-rain`.

## Task 32 First-Pass Class Resource Mechanics
- Started after Task 31 proved resource identity in combat but left the four classes sharing the same gain/spend curve.
- Used two read-only parallel agents:
  - `019f2c7b-f6f5-79a1-9fcf-c1cd4ca75440` reviewed the safest combat-layer insertion points.
  - `019f2c7c-2518-78c1-baea-7658aac608b0` reviewed DOM hooks and browser verification strategy.
- Added RED coverage:
  - `src/tests/combat.test.ts` verifies Ember high-heat burst skills deal more damage.
  - `src/tests/combat.test.ts` verifies Liuli prism cycling refunds resource, sets `prismChain`, remembers `lastSkillId`, and shortens cooldown.
  - `src/tests/combat.test.ts` verifies Ink mark skills add marks and detonation skills clear marks while adding bonus damage.
  - `src/tests/combat.test.ts` verifies Iron Guardian gains guard resource when hit by a monster.
  - `src/tests/app-integration.test.ts` verifies structured DOM data for class id, resource id/current, prism chain, last skill, and ink marks.
- Implemented:
  - Added `CombatEnemy.marks`.
  - Added `CombatPlayer.lastSkillId` and `CombatPlayer.prismChain`.
  - Added high-heat Ember burst damage scaling for burst/ultimate skills.
  - Added Liuli alternate-skill prism refund and cooldown reduction.
  - Added Ink mark application and mark detonation bonus damage.
  - Added Iron Guardian guard gain on player-hit impact.
  - Added browser-stable data attributes to `.combat-scene`, `.combat-player`, and `.combat-enemy`.
- Verification:
  - RED confirmed: `npm test -- src/tests/combat.test.ts` initially failed on missing prism refund, burst damage, marks, and guard gain.
  - `npm test -- src/tests/combat.test.ts`: pass, 22 tests.
  - `npm test -- src/tests/app-integration.test.ts`: pass, 35 tests.
  - `npm test`: pass, 12 files and 157 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Edge headless browser check via `.codex-local/tmp/mechanics-check.mjs`: Liuli `mirror-arc` showed resource `prism`, current `34`, chain `1`, and last skill `mirror-arc`; Ink `marking-bolt` showed resource `ink`, hit enemy marks `2`, and VFX `marking-bolt`; Iron Guardian showed resource `guard`, current `12`, and player motion `hit`.

## Task 33 Skill Status Actions and Actor Motion
- Started after the user required player and monster models to move with attacks, not remain static while numbers change.
- Used two read-only parallel agents:
  - `019f2c90-71ab-7e60-b214-475c8249440d` audited combat insertion points for skill status tags.
  - `019f2c90-85ba-7b43-961b-ccd6bb44bf38` audited UI/DOM hooks and browser verification strategy.
- Added RED coverage:
  - `src/tests/combat.test.ts` verifies shield mitigation, evade miss windows, reflect counters, trap/control state, and armor-break/stagger timing.
  - `src/tests/app-integration.test.ts` verifies player `shield/dodge/counter` model classes and enemy `controlled/guard-break` model classes plus data attributes.
- Implemented:
  - Added combat status tags for `shield`, `evade`, `reflect`, `trap`, `control`, `guard-break`, and `stagger`.
  - Added player defensive windows: shield mitigation, evade window, and reflect counter window.
  - Added monster status windows: controlled and armor-broken, including attack interruption and next-attack delay.
  - Monster impact now treats evade as a miss, shield as reduced damage, and reflect as a counter hit on the attacker.
  - UI now exposes `data-shield-active`, `data-evade-active`, `data-reflect-active`, `data-dodge-result`, `data-control-state`, and `data-armor-state`.
  - CSS now animates player shield/dodge/counter motions and monster controlled/guard-break motions on the bitmap model nodes.
- Verification:
  - RED confirmed: focused combat tests failed because the new status fields were undefined; focused app tests failed because DOM lacked status data/classes.
  - `npm test -- src/tests/combat.test.ts`: pass, 26 tests.
  - `npm test -- src/tests/app-integration.test.ts`: pass, 37 tests.
  - `npm test`: pass, 12 files and 163 tests.
  - `npm run build`: pass.
  - Edge headless browser check via `.codex-local/tmp/status-motion-check.mjs`: `molten-wall` rendered `actor-model-shield`, `mirror-arc` rendered `actor-model-counter`, `crow-feint` rendered `actor-model-dodge`, `ink-snare` rendered enemy `actor-model-controlled`, and `earth-furnace-breaker` rendered enemy `actor-model-guard-break`.

## Task 34 Class Hero Art and Weapon Appearance Progression
- Started after the user required character images to be more detailed, environments to remain high quality, and weapons to match each class identity across levels.
- Used two read-only parallel agents:
  - `019f2cad-9234-76e3-8275-eed629413d2f` audited class art insertion points in town, combat, and class panels.
  - `019f2cad-a640-7d81-a358-355d760760d2` audited browser verification hooks for class art and weapon DOM state.
- Added RED coverage:
  - `src/tests/ui-smoke.test.ts` verifies selected classes render class-specific hero PNGs in town and combat, and all class cards expose class art assets.
  - `src/tests/catalog.test.ts` verifies four classes each define five weapon appearance tiers at levels 1, 8, 16, 28, and 50.
  - `src/tests/ui-smoke.test.ts` verifies inventory weapon rows show current-class weapon appearance data and the class panel lists every weapon tier.
- Implemented:
  - Generated and added detailed class hero art for Liuli Blademage, Ink Shadow Ranger, and Iron Forge Guardian.
  - Added `heroAssetForClass()` so town, combat, and class cards select hero art by class id.
  - Added `WeaponAppearanceDefinition` and 20 class-specific weapon appearance definitions covering fists, glass swords, mechanism crossbows, and forge shields.
  - Added `weaponAppearanceFor()` to choose the highest unlocked appearance for the player's class and weapon level.
  - Added class-card weapon progression chips and inventory weapon appearance cards with distinct CSS silhouettes and palette-driven glow.
- Verification:
  - RED confirmed: the new class-panel weapon progression test initially failed because no `data-class-weapon-tier` markup existed.
  - `npm test -- src/tests/catalog.test.ts src/tests/ui-smoke.test.ts`: pass, 20 tests.
  - `npm test`: pass, 12 files and 167 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Edge headless browser check via `.codex-local/tmp/class-weapon-check.mjs`: Ink Shadow Ranger town hero loaded `/assets/hero-ink-shadow-ranger.png` at `864x1821`, the class panel loaded 4/4 class art images and 20 weapon tier chips, and the inventory rendered `weapon-ink-shadow-ranger-rare` with `weapon-shape-raven-crossbow`, `玄墨机关弩`, and `赤矿机括`.
  - Browser screenshots saved at `.codex-local/tmp/class-weapon-panel-check.png` and `.codex-local/tmp/class-weapon-check.png`; after visual review, the weapon progression chips were adjusted so level and weapon names remain visible in the class panel.

## Task 35 Combo, Airborne, and Knockdown Combat Feel
- Started after the continuation audit identified that skills still lacked DNF-like combo/launch/knockdown feel beyond damage tags.
- Used two read-only parallel agents:
  - `019f2ce1-9d37-7150-983c-a7df0b958b86` audited the combat-layer insertion points for hit flow, combo, launcher, and slam tags.
  - `019f2ce1-e203-7432-9d6f-cb474fd30d80` audited the UI/CSS/browser verification insertion points for motion classes and combo HUD.
- Added RED coverage:
  - `src/tests/combat.test.ts` verifies hit combo counter increments on consecutive hits and expires after a pause.
  - `src/tests/combat.test.ts` verifies launched enemies stay airborne, cannot attack while airborne, and naturally drop into knockdown.
  - `src/tests/combat.test.ts` verifies slam skills knock airborne enemies down immediately.
  - `src/tests/app-integration.test.ts` verifies combo HUD, `data-airborne-state`, `actor-model-airborne`, and `actor-model-knockdown`.
- Implemented:
  - Added `CombatRun.comboCount` and `comboExpiresAtMs`, separate from the existing light-chain `comboStep`.
  - Added timed `airborneUntilMs` and `downedUntilMs` states to enemies.
  - Added action tags for launcher, pull, and slam so skill tags can drive launch/down-smash behavior without mixing with status tags.
  - `stepCombat()` now ages combo and enemy air states; airborne/downed enemies cannot begin attacks.
  - UI now exposes combo count, airborne/knockdown data attributes, and enemy motion classes, with CSS animations for airborne float and knockdown drop.
- Verification:
  - RED confirmed: focused tests failed on missing `comboCount`, missing `airborneUntilMs`, missing `downedUntilMs`, and missing UI state.
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts`: pass, 67 tests.
  - `npm test`: pass, 12 files and 171 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Edge headless browser check via `.codex-local/tmp/combo-air-check.mjs`: heavy hit rendered combo `1`, `data-enemy-motion="airborne"`, `actor-model-airborne`, and `monster-airborne-float`; after state aging, the enemy rendered `data-enemy-motion="knockdown"`, `actor-model-knockdown`, and `monster-knockdown-drop`.

## Task 36 Equipped Weapon Layers and Class Weapon Types
- Started after the user required character weapons to be designed by class identity and level.
- Used two read-only parallel agents:
  - `019f2cfc-d736-7620-966b-ea212b90d837` audited weapon data/model insertion points.
  - `019f2cfd-49ca-7782-8457-7e419272cc0c` audited UI/CSS/render and browser-verification insertion points.
- Added RED coverage:
  - `src/tests/catalog.test.ts` verifies every class weapon appearance has rarity, weapon type, role flavor, town anchor, and combat anchor.
  - `src/tests/weapon-appearance.test.ts` verifies class/rarity weapon selection and the equipped-weapon helper.
  - `src/tests/ui-smoke.test.ts` verifies equipped weapons render as visible town and combat player layers.
- RED evidence:
  - Focused tests failed because weapon appearance rows had undefined `rarity`/`weaponType`, `equippedWeaponAppearanceFor()` did not exist, and town/combat markup lacked `.town-weapon` / `.combat-weapon`.
- Implemented:
  - Added `WeaponType` and `WeaponAnchor` plus rarity, weapon type, role flavor, and town/combat anchors to weapon appearances.
  - Added `equippedWeaponAppearanceFor(state)` to resolve the current equipped weapon instance, catalog gear, and class appearance.
  - Added `.town-weapon` and `.combat-weapon` actor layers with browser-stable data attributes.
  - Added CSS mount positioning, tier glow, class weapon silhouettes, and attack-following weapon swing animations.
- Verification:
  - `npm test -- src/tests/weapon-appearance.test.ts src/tests/catalog.test.ts src/tests/ui-smoke.test.ts`: pass, 24 tests.
  - `npm test`: pass, 13 files and 175 tests.
  - `npm run build`: pass.
  - Edge headless browser check via `.codex-local/tmp/weapon-layer-check.mjs`: town layer rendered `weapon-liuli-blademage-mythic`, combat layer rendered the same equipped weapon, and light attack triggered `weapon-light-swing`.

## Task 37 High-Fidelity SVG Weapon Assets
- Started after Task 36 proved weapon layers but still used CSS silhouettes as the primary weapon art.
- Used two read-only parallel agents:
  - `019f2d19-260d-75e1-b569-6a150fd2569d` audited data/UI insertion points for real weapon assets.
  - `019f2d19-a260-73d1-b0a3-01c5a15eb0a4` audited asset path conventions, Vite glob tests, and browser verification strategy.
- Added RED coverage:
  - `src/tests/catalog.test.ts` requires every weapon appearance to expose a 160x160 SVG asset definition with grip metadata.
  - `src/tests/weapon-appearance.test.ts` requires `weaponAppearanceFor()` and `equippedWeaponAppearanceFor()` to return asset metadata.
  - `src/tests/ui-smoke.test.ts` requires all 20 SVG files to exist and requires inventory, class panel, town, and combat renders to include `<img class="weapon-art">`.
- RED evidence:
  - Focused tests failed because `appearance.asset` was undefined, no SVG assets were present, and UI still rendered only `span.weapon-shape`.
- Implemented:
  - Added `WeaponAssetDefinition` and `appearance.asset` with `/assets/weapons/${appearance.id}.svg`, width/height, and grip metadata.
  - Added 20 class/tier SVG assets under `public/assets/weapons`.
  - Updated inventory rows, class progression chips, and town/combat weapon layers to render SVG `<img>` assets.
  - Kept old CSS silhouette as hidden fallback and adjusted weapon image sizing so the art does not cover the character.
- Verification:
  - `npm test -- src/tests/catalog.test.ts src/tests/weapon-appearance.test.ts src/tests/ui-smoke.test.ts`: pass, 25 tests.
  - `npm test`: pass, 13 files and 176 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Edge headless browser check via `.codex-local/tmp/weapon-layer-check.mjs`: town and combat weapon images loaded `/assets/weapons/weapon-liuli-blademage-mythic.svg`, `complete=true`, natural size `160x160`, and light attack still triggered `weapon-light-swing`.

## Task 38 Skill-Specific Animation Metadata and VFX Shapes
- Started after the user reiterated that character and weapon attacks must follow their class/skill identity instead of remaining static or generic.
- Read current planning files, `ClassSkillDefinition`, `classSkills`, combat event types, `renderCombatActors()`, `renderCombatVfx()`, `weaponLayerMarkup()`, current app integration tests, and CSS actor/weapon/VFX rules.
- Used two read-only parallel agents:
  - `019f2d39-5508-7e01-a055-1a4cd63fc676` audited type/catalog/combat insertion points.
  - `019f2d39-bdb7-7353-8d8b-1ce744e8986f` is auditing UI/CSS/browser verification paths.
- Discovery: combat events already carry `skillId`, `statusTags`, and `actionTags`; the next safe slice can keep combat formulas unchanged and drive presentation from catalog metadata.
- Added RED coverage:
  - `src/tests/catalog.test.ts` requires every class skill to define animation preset, duration, hit frame, lunge distance, weapon arc, VFX shape, and VFX anchor.
  - `src/tests/app-integration.test.ts` requires Liuli Rain to expose active skill id, animation preset, weapon arc, VFX shape, actor class, weapon arc data, and VFX anchor in combat HTML.
  - `src/tests/app-integration.test.ts` requires a missed Liuli Rain cast to still render skill-specific VFX metadata.
- RED evidence:
  - Focused tests first failed because `skill.animation` was undefined and the combat DOM lacked `data-active-skill-id`.
  - The miss-VFX test then failed because `renderCombatVfx()` only rendered player skill VFX from latest hit events.
- Implemented:
  - Added `SkillAnimationDefinition` and `SkillVfxAnchor` types.
  - Converted `classSkills` to attach animation metadata for every class skill.
  - Added active skill presentation lookup in `renderCombatActors()` and `renderCombatVfx()`.
  - Combat player, player image, equipped weapon layer, and player VFX now expose skill preset, weapon arc, VFX shape, and duration data.
  - Player model lunge and weapon motion variables now use skill animation metadata.
  - Added CSS for representative class-specific actor motion, weapon arcs, and VFX shapes: Ember uppercut/anvil crash, Liuli Rain, Ink Snare, and Iron Breaker.
- Verification:
  - `npm test -- src/tests/catalog.test.ts src/tests/app-integration.test.ts`: pass, 49 tests.
  - `npm test`: pass, 13 files and 179 tests.
  - `npm run build`: pass.
  - Edge headless browser check via `.codex-local/tmp/skill-animation-check.mjs`: Liuli Rain rendered player animation `player-liuli-rain-cast`, weapon animation `weapon-fan-arc`, VFX spark animation `glass-rain-fall`, loaded `/assets/weapons/weapon-liuli-blademage-mythic.svg` at `160x160`, and loaded Liuli hero art at `863x1822`.
  - Browser screenshot saved at `.codex-local/tmp/skill-animation-check.png`.

## Task 39 Feature Flow Closure
- Started after the user clarified that character models can be simpler for now and the priority is getting every feature path playable.
- Used a read-only parallel agent (`019f2d60-6625-7ca2-a748-0adafcbe6c56`) to audit the full UI/reducer flow from class selection through combat, loot, quest, equipment, upgrades, shop, auction/trade, and save.
- Added RED coverage:
  - `src/tests/ui-smoke.test.ts` requires the quest panel to render a core system flow checklist with combat, quest, inventory, reinforce, amplify, shop, trade, and save actions.
  - `src/tests/ui-smoke.test.ts` requires the shop panel to expose `liuli-gift-pack`, `reinforcement-pack`, and `forge-costume-pack`.
  - `src/tests/ui-smoke.test.ts` requires the smith panel to render per-gear reinforce/amplify buttons, including later Echo Slot gear.
  - `src/tests/app-integration.test.ts` requires room settlement to award experience so advancement can be reached through normal dungeon play.
- RED evidence:
  - Focused UI test failed on missing `data-shop-sku="reinforcement-pack"`, missing `data-flow-checklist="true"`, and missing `data-smith-gear-list="true"`.
  - Focused app integration test failed because player level stayed at 14 after room settlement.
  - A follow-up RED assertion caught the initial trade checklist state being wrongly marked done because `hasAuctionProgress` was referenced instead of called.
- Implemented:
  - Added room XP to combat loot and simple 100 XP per-level progression in app loot application.
  - Added an eight-step feature checklist to the quest panel with navigation/actions for combat, quest, inventory, reinforcement, amplification, shop, trade, and save.
  - Reworked the smith panel to list up to 12 inventory items with explicit per-item reinforce/amplify buttons and Echo Slot state.
  - Reworked the shop panel to show all three current SKUs plus the random box count.
- Verification:
  - `npm test -- src/tests/ui-smoke.test.ts`: pass, 16 tests.
  - `npm test -- src/tests/app-integration.test.ts`: pass, 41 tests.
  - `npm test`: pass, 13 files and 182 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - In-app browser validation on `http://127.0.0.1:5174/`: checklist rendered 8 steps, shop rendered 3 SKUs, smith rendered the gear list and per-item upgrade buttons.
  - Browser screenshot saved at `.codex-local/tmp/full-flow-ui-check.png`.

## Task 40 Strict Combat Presentation Timing
- Started after user clarified that model fidelity can be simpler, but combat motion smoothness, hit feel, player/enemy action changes, skill VFX, monster telegraphs, and monster skill effects must be strict.
- Used read-only parallel review (`019f2d8a-9e9b-7352-83d4-0b9b8359d6f8`) to audit the uncommitted combat presentation patch.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires skill hit events to occur at `elapsedMs + catalog.animation.hitFrameMs`, and hitstop to begin from the real hit event time.
  - `src/tests/app-integration.test.ts` requires multi-target skill input frames to show player motion/trail without impact sparks, then hit frames to show per-target sparks, damage numbers, hitstop, and screen shake.
  - `src/tests/app-integration.test.ts` requires skill VFX to stay alive for catalog duration from input start and clear after both cast duration and impact window expire.
  - `src/tests/app-integration.test.ts` and `src/tests/ui-smoke.test.ts` require monster windup telegraphs to be separate from active/miss monster skill VFX.
- RED evidence:
  - Focused tests failed because `hit.occurredAtMs - run.elapsedMs` was `0` instead of `260`, pre-hit HTML already showed hitstop/sparks, and monster windup rendered `data-enemy-skill-vfx`.
- Implemented:
  - Combat hit events now occur at true impact time using `inputToHitMs`; hitstop, combo expiry, airborne/downed, armor-break, and control timing now start from impact time.
  - UI active-hit filtering ignores future hit events for sparks, damage numbers, hit reactions, and screen shake.
  - Player action lookup now uses `occurredAtMs - inputToHitMs`, so cast motion and skill VFX start immediately even when impact is delayed.
  - Monster windup renders telegraph only; active/miss events render monster skill VFX only.
  - Skill duration is exposed as `--skill-duration` and consumed by player skill casts, weapon arcs, and player skill VFX animations.
- Verification:
  - `npm test -- src/tests/app-integration.test.ts src/tests/combat.test.ts`: pass, 73 tests.
  - `npm test`: pass, 13 files and 185 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - In-app browser validation on `http://127.0.0.1:5174/`: live samples confirmed `ash-ember-spit` windup has telegraph without skill VFX, and later active/miss has skill VFX without telegraph.
  - Browser screenshot saved at `.codex-local/tmp/combat-vfx-phase-check.png`.

## Task 41 Skill Script V1 and Guard Accessibility
- Started after the user clarified that character/monster models can stay simpler for now, but combat motion smoothness, hit feel, skill VFX, and action-state changes must stay strict.
- Used two read-only parallel agents:
  - `019f2da7-dcf4-7d82-be95-689fcf6d9e8e` audited per-skill behavior gaps and recommended the first script targets: true pull, volley multi-hit, guard/parry, and dash movement.
  - `019f2da8-1c5f-7b12-838d-620846ce88b9` audited dungeon/room flow and identified DNF-style room gate progression as the next major slice after skill scripting.
- Added RED coverage:
  - `src/tests/combat.test.ts` verifies `furnace-step` moves before hitbox resolution, `heat-bloom` pulls enemies toward its center, `black-rain-volley` emits staggered multi-hit events per target, and `anvil-guard` opens a mitigation window.
  - `src/tests/app-integration.test.ts` verifies zero-cost guard skills render as clickable combat skill buttons.
- RED evidence:
  - `npm test -- src/tests/combat.test.ts` initially failed because dash position stayed unchanged, pull moved enemies away, volley produced only 2 hit events instead of 6, and guard produced no shield window.
  - `npm test -- src/tests/app-integration.test.ts` failed because the combat UI did not contain `data-combat-skill-id="anvil-guard"`.
- Implemented:
  - Added skill startup movement for dash scripts before target selection.
  - Added pull-center hit behavior so pull skills move enemies toward a center instead of knockback away.
  - Added repeat-hit hitbox fields and wired `black-rain-volley` to 3 staggered hits per target.
  - Added `guard` as a real combat status that creates a short shield mitigation window.
  - Updated player motion selection so guard skills render shield motion.
  - Changed the combat skill button list to render J/K class skills as clickable buttons while preserving keyboard J/K as basic light/heavy attacks.
- Verification:
  - `npm test -- src/tests/combat.test.ts`: pass, 34 tests.
  - `npm test -- src/tests/app-integration.test.ts`: pass, 44 tests.
  - `npm test`: pass, 13 files and 190 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Browser validation on `http://127.0.0.1:5174/`: `furnace-step` moved the player from 23.67% to 36.58% X and rendered `furnace-trail`; `heat-bloom` pulled both enemies closer to center and rendered `heat-bloom`; `black-rain-volley` rendered `ink-volley` / `black-rain` with 6 damage numbers and 6 impact sparks; `anvil-guard` rendered `actor-model-shield`, `data-shield-active="true"`, and `guard-rune`.
  - Browser screenshot saved at `.codex-local/tmp/skill-script-v1-check.png`.

## Task 42 DNF-Style Room Gate Flow
- Started after the user clarified that simple character models are acceptable for now only as a modeling-fidelity compromise; combat motion, hit feel, skill VFX, monster skills, and action changes remain strict acceptance items.
- Used two read-only parallel agents:
  - `019f2dbb-fffe-7f71-a616-77f702648f5b` audited combat room completion and identified the lack of gate state and player-position-gated room entry.
  - `019f2dbc-1403-78e1-a19d-c7df437fba55` audited UI/CSS and recommended replacing the settlement button with a right-side room gate plus DOM state attributes.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires cleared rooms to open a gate, block entry until the player reaches it, reset player position in the next room, mark boss doors distinctly, and mark final clear as complete.
  - `src/tests/app-integration.test.ts` requires the app to render the visible open gate, remove `settle-button`, and enter the next room by walking right.
  - `src/tests/ui-smoke.test.ts` requires cleared combat rooms to expose gate state and target room attributes.
- RED evidence:
  - Focused tests first failed because `roomGateForRun` did not exist and the UI still rendered the old clear banner plus `settle-button`.
- Implemented:
  - Added `CombatRoomGate`, `roomGateForRun()`, `canEnterRoomGate()`, and `enterRoomGate()` to combat.
  - Reset player position/facing/action locks when entering a new room.
  - Reworked app movement so `combatMove` enters the gate when close enough, applies loot/XP/quest progress, and returns to town on final completion.
  - Rendered locked/open/boss/complete room-gate states and replaced the settlement button with a door status indicator.
  - Added CSS for the visible gate, open/boss/complete glow states, and gate pulse animation.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 97 tests.
  - `npm test`: pass, 13 files and 193 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Browser validation on `http://127.0.0.1:5174/`: entered `灰窑巷`, defeated two room-1 enemies through keyboard/buttons, verified `data-room-gate-state="open"` and clear banner, walked right through the gate, reached room 2 with player reset near entrance, new enemies spawned, `data-room-gate-state="locked"`, and toast `进入下一房间`.
  - Browser console error log: empty.
  - Browser screenshot saved at `.codex-local/tmp/room-gate-flow-check.png`.

## Task 43 Target-Bound Skill Impact VFX
- Started while continuing the strict DNF-like combat feel goal. Current user acceptance still allows lightweight character/monster modeling, but skill effects, impact readability, and actor/VFX state changes must remain strict.
- Used two read-only parallel agents:
  - `019f2dd5-adc0-7c20-b5cc-776c7e4e5e92` audited UI/VFX and identified the P0 gap that player skill VFX was single-point while multi-target skills lacked target-bound burst nodes.
  - `019f2dd5-455a-76e1-afce-2a49655777ad` audited skill scripting and recommended `meteor-knuckle` staged ultimate as a future high-value slice after the current VFX layer.
- Added RED coverage:
  - `src/tests/app-integration.test.ts` requires `black-rain-volley` to render `data-skill-impact-vfx="black-rain-volley"` on every target hit and across all six staggered hit events.
- RED evidence:
  - `npm test -- src/tests/app-integration.test.ts` failed because the new selector count was `0` instead of `2` on the first wave.
- Implemented:
  - Added a `skill-impact-burst` node for every active skill `hit` event.
  - Each burst is target-bound and exposes `data-skill-impact-vfx`, `data-impact-vfx-shape`, `data-impact-target-id`, `data-hit-event-id`, and `data-impact-hit-index`.
  - Added generic skill impact CSS plus a black-rain-specific impact burst with animated core/ring/shards.
  - Added UI smoke coverage for `black-rain-volley` target-bound impact bursts.
- Verification so far:
  - `npm test -- src/tests/app-integration.test.ts`: pass, 46 tests.
  - `npm test -- src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 63 tests.
  - `npm test`: pass, 13 files and 195 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Browser validation on `http://127.0.0.1:5174/.codex-local/tmp/target-vfx-check.html`: rendered the black-rain hit frame with 6 `data-skill-impact-vfx="black-rain-volley"` nodes, 6 damage numbers, 6 black-rain impact shapes, 2 distinct target ids, `data-hitstop-active="true"`, and `data-screen-shake="skill"`.
  - Browser console error log: empty.
  - Browser screenshot saved at `.codex-local/tmp/target-vfx-check.png`.
  - The browser was restored to `http://127.0.0.1:5174/` after validation.

## Task 44 Meteor Ultimate Combat Feel
- Started after user clarified that character modeling can stay simpler for now, but action smoothness, hit feel, skill effects, and monster/player state changes must be strict.
- Used two read-only parallel agents:
  - `019f2ded-3925-7602-984e-43a4fe2bcad4` audited combat scripting and recommended a dedicated `meteor-knuckle` staged script instead of generic repeat hits.
  - `019f2ded-6b74-79a1-a862-02dd854b0cfe` audited UI/CSS and recommended meteor-specific scene shake, screen flash, cast VFX, and impact burst styling.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires `meteor-knuckle` to emit fall+impact hit phases per target, with stronger final hitstop, guard-break, forced knockdown, and armor-break state.
  - `src/tests/app-integration.test.ts` requires cast-frame meteor metadata and final-frame ultimate shake, meteor flash, and meteor ground impact DOM.
  - `src/tests/ui-smoke.test.ts` requires static render coverage so meteor does not regress to generic skill feedback.
- RED evidence:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts` failed because `meteor-knuckle` emitted 2 hit events instead of 4.
- Implemented:
  - Added `CombatHitPhase` and `CombatVfxCue` to hit events so staged skills can drive UI without guessing from ids.
  - Added a dedicated `meteor-knuckle` script: locked targets once, emitted fall and impact phases per target, gave the impact phase stronger damage/hitstop, guard-break, stagger, and forced knockdown.
  - Added `knockdown` action tags and changed enemy visual priority so overlapping control/armor-break does not hide a forced knockdown model reaction.
  - Added scene and VFX-layer attributes for ultimate shake, meteor screen flash, and impact skill id.
  - Added meteor-specific CSS for player crash motion, weapon meteor-smash arc, falling meteor cast VFX, ground crack impact VFX, screen flash, and ultimate shake.
- Verification:
  - `npm test -- src/tests/app-integration.test.ts`: pass, 47 tests after fixing motion priority.
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 102 tests.
  - `npm test`: pass, 13 files and 198 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Browser validation on `http://127.0.0.1:5174/.codex-local/tmp/meteor-vfx-check.html`: confirmed `activeSkill=meteor-knuckle`, 4 impact bursts, 2 targets, `fall/fall/impact/impact`, `meteor-fall/meteor-impact`, hitstop active, ultimate shake, meteor flash, player `player-ember-meteor-crash`, weapon `weapon-meteor-smash`, and both enemies `data-enemy-motion="knockdown"`.
  - Browser screenshot saved at `.codex-local/tmp/meteor-vfx-check.png`.

## Task 45 Liuli Rain Staggered Combat Feel
- Started after user clarified that simple models only relax model fidelity; combat flow, animation smoothness, hit feel, and skill effects remain strict.
- Used two read-only parallel agents:
  - `019f2e18-d132-7190-9b01-e312b64f9261` audited Liuli combat skills and recommended `liuli-rain` as the next staged script target.
  - `019f2e19-3dbb-79e1-a3b8-7b52d303a8c3` audited UI/CSS and found `liuli-rain` had cast-side animation but lacked target-side `glass-rain` impact styling.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires `liuli-rain` to emit six hits as three staggered rain waves across two locked targets with `rain` phase and `glass-rain-fall` cue.
  - `src/tests/app-integration.test.ts` requires first-wave and final-wave DOM to show target-bound `glass-rain` impact bursts, hitstop, screen shake, damage numbers, and player motion trail.
  - `src/tests/ui-smoke.test.ts` requires static render coverage for six `liuli-rain` target impact nodes.
- RED evidence:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts` initially failed because `liuli-rain` emitted 2 hits instead of 6.
- Implemented:
  - Added `rain` hit phase and `glass-rain-fall` VFX cue support.
  - Added a dedicated `liuli-rain` script that locks targets once and emits three timed waves per target.
  - Added event-level `vfxWindowMs` so short multi-wave impacts expire before the full skill animation cleanup assertion.
  - Added target-side `skill-impact-shape-glass-rain` CSS with falling shard, ring, and shatter animations.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 104 tests.
  - `npm test`: pass, 13 files and 200 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Browser validation on `http://127.0.0.1:5174/.codex-local/tmp/liuli-rain-vfx-check.html`: confirmed 6 `liuli-rain` impact bursts, 6 hit sparks, 6 damage numbers, 2 target ids, all phases `rain`, all cues `glass-rain-fall`, hitstop active, skill shake, player `liuli-rain` motion, weapon arc `fan`, and CSS animations `glass-rain-target-core/ring/shatter`.
  - Browser console error log: empty.
  - Browser screenshot saved at `.codex-local/tmp/liuli-rain-vfx-check.png`.

## Task 46 Prism Step Path Pierce Combat Feel
- Started while continuing the full DNF-like offline action RPG goal. This slice keeps character/monster model detail lightweight but tightens combat motion, hit feel, and skill effects.
- Used two read-only parallel agents:
  - `019f2e82-d610-7271-8ab4-6125c5bb9e62` audited `prism-step` combat logic and found it moved the player 104px but then used generic landing-point target selection.
  - `019f2e82-ea22-7410-be56-a2044f6d9c91` was closed after the main thread already had enough UI/CSS evidence to proceed.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires `prism-step` to hit two enemies along the dash path with `pierce` phase and `prism-pierce` cue.
  - `src/tests/app-integration.test.ts` requires the app render `liuli-step`, `prism-dash`, `prism-afterimage`, skill trail, and two target-bound `prism-step` impact bursts.
  - `src/tests/ui-smoke.test.ts` requires static render coverage for two `prism-step` impact nodes with `prism-afterimage` shape.
- RED evidence:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts` initially failed because `prism-step` emitted 0 hits for enemies placed inside the dash path.
- Implemented:
  - Added `pierce` hit phase and `prism-pierce` VFX cue support.
  - Added a dedicated `prism-step` script that selects up to two living enemies inside the start-to-end dash path, then applies staggered pierce hits after the dash.
  - Added dedicated CSS for `liuli-step` player dash, `prism-dash` weapon motion, `prism-afterimage` cast VFX, and `skill-impact-shape-prism-afterimage` target bursts.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 107 tests.
  - `npm test`: pass, 13 files and 203 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Browser validation on `http://127.0.0.1:5174/.codex-local/tmp/prism-step-vfx-check.html`: confirmed player landed at 35.83% scene X, 2 `prism-step` impact bursts, 2 hit sparks, 2 damage numbers, 2 target ids, phases `pierce/pierce`, cues `prism-pierce/prism-pierce`, hitstop active, skill shake, player animation `player-liuli-step-dash`, weapon animation `weapon-prism-dash`, cast animation `prism-afterimage-core`, and impact animation `prism-pierce-core`.
  - Browser console error log: empty.
  - Browser screenshot saved at `.codex-local/tmp/prism-step-vfx-check.png`.

## Task 47 Monster Skill Pattern and Feedback
- Started after user clarified that simpler character/monster model detail is acceptable only for model fidelity; combat action smoothness, hit feel, skill VFX, monster skill VFX, and action-state changes stay strict.
- Used two read-only parallel agents:
  - `019f2e8f-d2c0-7552-b6f9-433365c12ecf` audited monster combat logic and recommended scheduled impact-time enemy skill feedback cues.
  - `019f2e8f-ffab-76d0-99f0-46cc0df585b2` audited UI/CSS and recommended target-side hit/miss feedback nodes plus skill-specific enemy attack motion.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires monster damage and player hurt locks to resolve on the scheduled `impactAtMs`, with enemy skill VFX metadata and player feedback cues.
  - `src/tests/combat.test.ts` requires boss `taotie-flame-breath` to become a three-pulse sustained attack instead of a single impact.
  - `src/tests/app-integration.test.ts` requires target-side hit and miss feedback nodes for monster skills.
  - `src/tests/ui-smoke.test.ts` requires boss flame-breath DOM metadata for pulse index, total hits, VFX cue, and boss-specific attack model class.
- RED evidence:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts` failed because monster impact events used current tick time `440` instead of scheduled time `360`, boss fire breath emitted only one active event, and UI had no `data-combat-feedback` or boss pulse metadata.
- Implemented:
  - Added enemy skill VFX cues, player feedback cues, pulse indexes, total hit counts, and VFX windows to monster attack/player-hit events.
  - Monster impacts now resolve at the scheduled impact time instead of the later combat tick time, so hitstop, hurt lock, invulnerability, and VFX timing line up with the skill frame.
  - `taotie-flame-breath` is now a three-pulse sustained boss attack with shorter per-pulse invulnerability and boss-specific model motion/VFX.
  - UI now renders target-side `combat-feedback` nodes for monster skill hit and miss results, plus monster-skill metadata on active VFX and actor nodes.
  - CSS now has skill-specific monster attack animations for ash spit, zheng stomp, and taotie breath, plus hit/miss feedback animations and wider sustained flame-breath VFX.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 110 tests.
  - `npm test`: pass, 13 files and 206 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Browser DOM validation on `http://127.0.0.1:5174/.codex-local/tmp/monster-skill-vfx-check.html`: confirmed boss skill `taotie-flame-breath`, cue `taotie-flame-breath-sustain`, hit index `1`, total hits `3`, boss model marker `actor-enemy-skill-taotie-flame-breath`, hit feedback `enemy-skill-hit`, miss feedback `enemy-skill-miss`, and miss phase `miss`.
  - Browser screenshot saved at `.codex-local/tmp/monster-skill-vfx-check.png`.
- Code review follow-up:
  - Read-only review found that active enemy skill events could show HIT feedback without a matching `player-hit` event when invulnerability absorbed the attack, and that interrupted boss pulses could leave `attackResolvedHits` in DOM state.
  - Added RED regression coverage for invulnerability-absorbed monster skills and interrupted boss pulse cleanup.
  - UI hit feedback now requires a matching recent `player-hit` event; miss feedback still follows actual enemy `miss` events.
  - Attack interruption and airborne/downed cleanup now also clear `attackResolvedHits`.
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts`: pass, 92 tests.
  - Final `npm test`: pass, 13 files and 208 tests.
  - Final `npm run build`: pass.
  - Final `git diff --check`: pass with Windows line-ending warnings only.
  - Final browser DOM check reconfirmed boss `taotie-flame-breath` three-hit metadata and both `enemy-skill-hit` / `enemy-skill-miss` feedback nodes.

## Task 48 Action Input Buffer
- Started after user clarified that lightweight character/monster modeling is acceptable only for model fidelity; combat flow, model action changes, smoothness, hit feel, and skill effects remain strict.
- Used two read-only parallel agents:
  - `019f2ea4-e918-7b73-bf6d-3f3a0f899081` audited combat input/action-lock flow and found locked non-cancel actions were discarded while the app reducer papered over it with a 220 ms pre-step.
  - `019f2ea5-40e4-7a52-97c1-c0accb58e3de` audited UI hooks and recommended combat-scene buffer data attributes for browser verification.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires a heavy action pressed during the 180 ms buffer window to queue during light attack lock and release on the unlock frame.
  - `src/tests/app-integration.test.ts` requires app actions to queue input instead of skipping the lock, render buffer DOM metadata, and show a buffer message.
- RED evidence:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts` initially failed because `bufferedAction` was undefined.
- Implemented:
  - Added `bufferedAction`, queued time, execute time, and a 180 ms action-buffer window to `CombatPlayer`.
  - `performAction()` now queues valid locked inputs near unlock instead of discarding them.
  - `stepCombat()` releases queued input at the scheduled unlock frame, with interpolated player position/facing.
  - Buffered actions are canceled when hurt lock interrupts the release frame or when monster damage lands.
  - App reducer no longer advances combat actions by 220 ms before executing; it preserves the pressed input as an explicit queued action.
  - Combat scene exposes buffer state data attributes for tests and browser checks.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts`: pass, 95 tests.
  - `npm test`: pass, 13 files and 211 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Browser DOM validation on `http://127.0.0.1:5174/.codex-local/tmp/input-buffer-check.html`: confirmed queued action `heavy`, scene state `queued`, execute frame `180`, released buffer cleared, heavy hit frame `265`, next action lock `440`, and message `输入已缓冲`.

## Task 49 Three-Step Normal Attack Combo
- Started while continuing the strict DNF-like keyboard-combat goal. This slice targets the most common player action path: repeated J/X normal attacks.
- Used two read-only parallel agents:
  - `019f2ebb-bbf3-7312-9bbe-06a30322c822` audited combat state and recommended making `comboStep` drive light attack step definitions plus resetting stale `comboStep` on chain expiry.
  - `019f2ebb-f249-7dc3-adaa-87cf728c69f7` audited UI/CSS and recommended machine-verifiable DOM hooks plus `actor-model-light-1/2/3` classes.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires three repeated light attacks to produce different damage, hit frames, combo counts, and a third-step launcher.
  - `src/tests/combat.test.ts` requires expired hit chains to clear `player.comboStep` and restart from step 1.
  - `src/tests/app-integration.test.ts` requires the third normal attack to render `data-player-combo-step="3"`, `data-player-normal-combo-step="3"`, and `actor-model-light-3`.
- RED evidence:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts` initially failed because light attack still emitted repeated `[26, 26]` damage, stale `comboStep` survived chain expiry, and DOM had no combo-step attributes.
- Implemented:
  - Added three light-combo step definitions with distinct damage, hit frames, hitstop, range, knockback, action locks, and third-step launcher tags.
  - `performAction(light)` now chooses the next step from active combo state and uses the step definition for hitbox/timing.
  - `stepCombat()` now clears stale `comboStep` when combo count expires, and preserves active combo state correctly at buffered release frames.
  - Combat UI now exposes `data-player-combo-step`, `data-player-combo-count`, and `data-player-normal-combo-step`.
  - Player and weapon CSS now render distinct second-step cross strike and third-step launch animations.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts`: pass, 98 tests.
  - `npm test`: pass, 13 files and 216 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Browser DOM validation on `http://127.0.0.1:5174/.codex-local/tmp/normal-combo-check.html`: confirmed damage `[26,33,41]`, hit frames `[55,65,78]`, combo counts `[1,2,3]`, third-step `launcher`, enemy airborne, `data-player-combo-step="3"`, `data-player-normal-combo-step="3"`, `actor-model-light-3`, and scene combo count `3`.
- Code review follow-up:
  - Read-only review caught that `weapon-light-cross` and `weapon-light-launch` dropped the equipped weapon anchor transform, scale, rotation, and facing variables.
  - Fixed both keyframes to preserve `translate(-50%, -50%)`, `scaleX(var(--weapon-facing))`, `var(--weapon-rotation)`, and `var(--weapon-scale)`.
  - Added regression coverage for buffered light input releasing as the next normal combo step and for skill cancel after the third normal combo step.
  - `npm test -- src/tests/combat.test.ts`: pass, 48 tests.
  - `npm test -- src/tests/app-integration.test.ts`: pass, 52 tests.
  - Final `npm test`: pass, 13 files and 216 tests.
  - Final `npm run build`: pass.
  - Final `git diff --check`: pass with Windows line-ending warnings only.
  - Final browser DOM check reconfirmed `[26,33,41]` normal combo damage, `[55,65,78]` hit frames, third-step launcher, enemy airborne, and `actor-model-light-3`.

## Task 50 Universal Backstep Dodge
- Started after user clarified that character/monster model detail can stay simple only for now; combat motion, action changes, hit feel, and skill/monster VFX remain strict.
- Used one read-only parallel agent:
  - `019f2ecd-d507-7e70-bdf8-ba7b987a70d8` audited combat/input/UI/CSS insertion points and confirmed `KeyC` should be routed before skill lookup while Space remains skill-bound.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires every class to backstep without resource cost, move opposite facing, keep facing unchanged, open evade/action-lock windows, emit no hit/miss events, and make an incoming monster skill miss.
  - `src/tests/app-integration.test.ts` requires `KeyC` to map to `backstep`, requires base and advancement skill hotkeys to remain available, and requires dodge DOM hooks plus the backstep button.
- RED evidence:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts` initially failed because `backstep` fell through to skill lookup and `KeyC` was unmapped.
- Implemented:
  - Extended `CombatActionInput` and `AppAction` with `backstep`.
  - Added a pure defensive backstep in `performAction()` with 74 px reverse movement, short evade/invulnerability windows, 260 ms action lock, and no hit/miss event output.
  - Added `KeyC` keyboard mapping, a `后跳` combat button, and updated the combat control hint.
  - Kept Space mapped through class skill lookup; advanced Liuli still maps Space to `flowing-light-chain`.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts`: pass, 102 tests.
  - `npm test`: pass, 13 files and 218 tests.
  - `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Browser DOM validation on `http://127.0.0.1:5174/`: clicked real `后跳 C` button, player moved from `--actor-x: 16.67%` to `--actor-x: 8.96%`, `data-player-motion="dodge"`, `data-evade-active="true"`, `actor-model-dodge`, and existing skill hotkeys remained present.
  - Browser screenshot saved at `.codex-local/tmp/backstep-dodge-check.png`.

## Task 51 Monster Body and Hurtbox Scale
- Started while continuing the full DNF-like offline action RPG goal. This slice targets monster model credibility: visible monster size should match combat reach and hit feel.
- Used two read-only parallel agents:
  - `019f2ed6-7808-79b1-81bb-8d5d57d6639a` audited monster size/hurtbox gaps and confirmed combat used center-point range checks while CSS used visual tier widths.
  - `019f2ed6-640a-7f52-adc8-20535146699c` audited remaining generic skill scripts and recommended `night-mark-detonation` as a next slice after the current hurtbox work.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires monsters to carry body/hurtbox sizes and lets a large boss be hit at its visible edge while a small trash enemy at the same center distance still misses.
  - `src/tests/ui-smoke.test.ts` requires enemy DOM to expose body/hurtbox dimensions and CSS variables for browser-scale verification.
- RED evidence:
  - `npm test -- src/tests/combat.test.ts src/tests/ui-smoke.test.ts` initially failed because `body/hurtbox` were undefined and DOM had no `data-enemy-body-*` / `data-enemy-hurtbox-*` attributes.
- Implemented:
  - Added `body` and `hurtbox` dimensions to `CombatEnemy` for trash, elite, and boss tiers.
  - Updated player hitbox selection, target sorting, `prism-step` path overlap, and enemy attack range checks to consume hurtbox edges instead of only center points.
  - Updated combat enemy DOM to expose body/hurtbox data attributes and CSS variables.
  - Updated enemy actor width and frame height CSS to use those variables, keeping visual size and combat size linked.
  - Tuned trash vertical hurtbox height so lane movement at arena edges can still dodge basic monster skills.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/ui-smoke.test.ts`: pass, 71 tests.
  - Browser DOM validation on `http://127.0.0.1:5174/.codex-local/tmp/hurtbox-check.html`: confirmed three rendered enemies with body sizes `144x116`, `188x148`, `260x216`; hurtbox sizes `82x52`, `132x96`, `190x128`; computed actor widths/heights increase from trash to elite to boss.
  - Browser screenshot saved at `.codex-local/tmp/hurtbox-check.png`.
  - Project instruction update: `AGENTS.md` now records that character/monster modeling can stay lightweight for the current prototype, but attack motion, hurt motion, movement transitions, player/enemy skill VFX, hitstop, and feedback remain strict acceptance items.
- Code review follow-up:
  - Read-only review caught a real front-only hitbox bug: large monster hurtboxes could overlap the player's front attack region while the monster center stayed behind the player, causing an incorrect miss.
  - Added RED coverage for front-facing hurtbox overlap; initial `npm test -- src/tests/combat.test.ts` failed with `Expected last combat event to be a hit`.
  - Added monster skill range boundary coverage at `range + hurtbox half width`, and strengthened UI tests to use production elite/boss rooms instead of mismatched `kind` mocks.
  - Fixed front-facing attacks to check attack-interval and hurtbox-interval overlap.
  - `npm test -- src/tests/combat.test.ts src/tests/ui-smoke.test.ts`: pass, 73 tests.
  - Browser DOM re-validation on `http://127.0.0.1:5174/.codex-local/tmp/hurtbox-check.html`: reconfirmed trash/elite/boss rendered dimensions `144x116`, `188x148`, `260x216`, hurtboxes `82x52`, `132x96`, `190x128`, and ascending computed actor sizes after the review fix.

## Task 52 Night Mark Detonation Skill Feel
- Started after user clarified that character/monster models can remain simple for now, but combat motion smoothness, hit feel, player/enemy action changes, skill VFX, and monster skill VFX remain strict.
- Used two read-only parallel agents:
  - `019f2eee-fbe7-7032-bae4-e1f0e5274cf0` audited `night-mark-detonation` combat logic and found it still used the generic single-target skill path.
  - `019f2eef-2f5a-7e60-ac0d-b8cab0cbc992` audited UI/CSS hooks and found catalog metadata existed but dedicated CSS and hit event cues were missing.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires `night-mark-detonation` to hit every marked target in lock/burst stages, keep marks before the lock frame, consume marks only on final detonation, knock targets down at the burst frame, and miss if no marked target exists.
  - `src/tests/app-integration.test.ts` requires advanced Ink Space skill rendering to show `ink-detonation`, `detonate-mark`, `night-detonation`, lock-frame marks, final burst cues, hitstop, screen shake, and knockdown enemy motion.
  - `src/tests/app-integration.test.ts` also covers a real reducer path: cast `marking-bolt`, advance combat time, then use the Space advancement hotkey to trigger `night-mark-detonation`.
  - `src/tests/ui-smoke.test.ts` requires static render coverage for four target-bound night detonation bursts plus dedicated CSS selectors/keyframes.
- RED evidence:
  - Focused tests initially failed because the generic skill path emitted one hit instead of four, hit unmarked/no-mark cases instead of missing, and CSS lacked `ink-detonation` / `detonate-mark` / `night-detonation` selectors.
  - Code-review RED follow-up failed because the first implementation cleared marks and knocked targets down immediately at cast time even though events were stamped for 310 ms and 490 ms.
- Implemented:
  - Added `mark-lock` and `detonate` hit phases plus `night-mark-lock` and `night-mark-burst` VFX cues.
  - Added a dedicated `night-mark-detonation` combat script that locks marked targets, performs a light lock pulse, then detonates all locked marks with stronger hitstop, bonus mark damage, stagger, and knockdown.
  - Added a narrow scheduled enemy hit queue for night detonation so enemy HP/marks/knockdown state resolves through `stepCombat()` at the actual event frames instead of at cast time.
  - Added dedicated CSS for player cast motion, weapon detonation arc, player-side night detonation cast VFX, and target-bound lock/burst night detonation impacts.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 132 tests.
  - Browser DOM validation on `http://127.0.0.1:5174/.codex-local/tmp/night-mark-detonation-check.html`: confirmed cast marks `[3,2]`, lock marks `[3,2]`, lock downed `[false,false]`, final marks `[0,0]`, final downed `[true,true]`, event frames `[310,310,490,490]`, phases `mark-lock/mark-lock/detonate/detonate`, 4 target impacts, `player-ink-detonation-cast`, `weapon-detonate-mark`, `night-detonation-cast-core`, and lock/burst impact animations.
  - Browser console error log: empty.
  - Final `npm test`: pass, 13 files and 228 tests.
  - Final `npm run build`: pass.
  - Final `git diff --check`: pass with Windows line-ending warnings only.

## Task 53 Mechanism Shadow Net Skill Feel
- Started after user clarified again that character/monster modeling may stay lightweight only while core playability is being completed; combat animation flow, hit feel, skill VFX, enemy motion changes, and monster/skill effects remain strict.
- Used two read-only parallel agents:
  - `019f2f08-cb14-7612-a4fe-777a6e31ebec` audited combat/data and recommended `mechanism-shadow-net` because it was still a generic field/trap skill despite having advancement identity and animation metadata.
  - `019f2f08-cc45-7543-bc95-35ff9b884f6b` audited UI/CSS and confirmed DOM hooks existed, but dedicated `ink-shadow-net`, `net-cast`, and `mechanism-net` CSS/keyframes were missing.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires `mechanism-shadow-net` to emit two stages across two targets, keep HP/control unchanged at cast time, bind on the hit frame, delay enemy attacks, then snap enemies inward on the second frame.
  - `src/tests/app-integration.test.ts` requires advanced Ink Space to map to `mechanism-shadow-net`, render `ink-shadow-net`, `net-cast`, `mechanism-net`, show bind/snap phases, enemy controlled motion, hitstop, screen shake, and damage numbers.
  - `src/tests/ui-smoke.test.ts` requires static render coverage for target-bound mechanism-net impacts plus dedicated CSS selectors/keyframes.
- RED evidence:
  - Focused tests initially failed because the generic path emitted 2 hits instead of 4 and CSS lacked `ink-shadow-net`, `net-cast`, and `mechanism-net` presentation.
- Implemented:
  - Added `trap-bind` and `trap-snap` hit phases plus `mechanism-net-bind` and `mechanism-net-snap` VFX cues.
  - Added a dedicated `mechanism-shadow-net` combat script with delayed scheduled enemy hit effects, first-frame bind/control, second-frame snap damage, pull-to-net-center movement, and stagger/control attack interruption.
  - Added dedicated CSS for player shadow-net cast motion, weapon net-cast arc, player-side mechanism net field VFX, and target-bound bind/snap mechanism-net impacts.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 136 tests.
  - Browser DOM/computed-style validation on `http://127.0.0.1:5174/.codex-local/tmp/mechanism-shadow-net-check.html`: confirmed `mechanism-shadow-net`, `ink-shadow-net`, `net-cast`, `mechanism-net`, player animation `player-ink-shadow-net-cast`, weapon animation `weapon-net-cast`, cast VFX `mechanism-net-cast-core`, bind phase count `2`, bind cue `mechanism-net-bind`, bind impact animation `mechanism-net-bind-core`, controlled enemy motion count `2`, snap impact count `4`, snap cue `mechanism-net-snap`, snap damage numbers `4`, hitstop active `true`, screen shake `skill`, and snap impact animation `mechanism-net-snap-core`.
  - Browser console error log: empty.
  - Browser screenshot saved at `.codex-local/tmp/mechanism-shadow-net-check.png`.
- Code review follow-up:
  - Read-only review found that generic area VFX anchoring could display the cast field between player and a target rather than at the actual net pull center.
  - Updated `playerSkillVfxStyle()` with a `mechanism-shadow-net` anchor path that matches combat's net center formula.
  - Strengthened tests so the pre-bind frame has no bind VFX, no damage numbers, and no controlled enemy motion.
  - Corrected the center assertion to use the actual runtime player position and arena width instead of a hard-coded visual lunge assumption.
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 136 tests.

## Task 54 Mountain Crack Hammer Skill Feel
- Started after user clarified that character/monster modeling can stay simple for now, but combat animation smoothness, hit feel, action changes, skill VFX, and monster skill VFX remain strict.
- Used two read-only parallel agents:
  - `019f2f1c-ab54-7882-9bcc-9315a4d6cbba` audited Iron Guardian skill gaps and recommended `mountain-crack-hammer` with delayed stagger/impact frames.
  - `019f2f1c-dff9-7222-a2b2-27a488f5ee83` audited UI/CSS hooks and identified missing `iron-mountain-crack`, `mountain-hammer`, and `mountain-crack` selectors/keyframes.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires `mountain-crack-hammer` to emit two staged hits across two targets, keep enemy HP/control/armor/knockdown unchanged at cast time, stagger and interrupt windup on the first frame, then armor-break/knockdown on impact.
  - `src/tests/app-integration.test.ts` requires Space mapping for advanced Iron, player/weapon/cast metadata, staged target-bound VFX, hitstop, screen shake, controlled motion, and knockdown motion.
  - `src/tests/ui-smoke.test.ts` requires rendered mountain-crack target impact metadata and dedicated CSS selectors/keyframes.
- RED evidence:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts` initially failed because the generic path emitted one hit instead of four and CSS lacked the dedicated mountain-crack presentation.
- Implemented:
  - Added `hammer-stagger` and `hammer-impact` phases plus `mountain-hammer-stagger` and `mountain-crack-impact` VFX cues.
  - Added a dedicated `mountain-crack-hammer` combat script that schedules enemy hit effects, interrupts enemy windup on stagger, applies heavier impact damage, armor-break, and knockdown at the true impact frame.
  - Added dedicated CSS for Iron player cast motion, mountain-hammer weapon arc, player-side mountain-crack cast VFX, and target-bound stagger/impact mountain-crack bursts.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 140 tests.
  - Browser DOM/computed-style validation on `http://127.0.0.1:5174/.codex-local/tmp/mountain-crack-hammer-check.html`: confirmed player animation `player-iron-mountain-crack-cast`, weapon animation `weapon-mountain-hammer`, cast VFX `mountain-crack-cast-core`, stagger impact count `2`, stagger cue `mountain-hammer-stagger`, stagger impact animation `mountain-hammer-stagger-core`, controlled enemy motion count `2`, impact count `4`, impact cue `mountain-crack-impact`, damage numbers `4`, hitstop active `true`, screen shake `skill`, impact animation `mountain-crack-impact-core`, and knockdown enemy motion count `2`.
  - Browser console error log: empty.
  - Browser screenshot saved at `.codex-local/tmp/mountain-crack-hammer-check.png`.
- Code review follow-up:
  - Read-only review caught a time-ordering bug: a large `stepCombat()` delta could cross an enemy hit at 200 ms and the hammer stagger at 290 ms, then resolve the delayed hammer stagger first and retroactively cancel the earlier enemy hit.
  - Added RED regression coverage requiring the 200 ms `ash-ember-spit` player-hit to survive before the 290 ms stagger and 380 ms impact; initial `npm test -- src/tests/combat.test.ts` failed with `expected [] to have a length of 1`.
  - Fixed scheduled enemy hit effects so each effect first resolves already-landed target enemy hits up to `effect.applyAtMs`, then applies stagger/guard-break interruption.
  - `npm test -- src/tests/combat.test.ts`: pass, 57 tests.
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 141 tests.
  - Follow-up review agent confirmed no blocking issue after the fix. Remaining non-blocking note: event arrays are not globally sorted by `occurredAtMs`, so future UI logic should keep filtering by event timestamps rather than using `events.at(-1)` as a time-order proxy.

## Task 55 Monster Skill Feedback VFX
- Started after user clarified that character/monster modeling can be simpler for now, but combat action smoothness, skill effects, hit feedback, and monster skill effects remain strict.
- Used two read-only parallel agents:
  - `019f2f33-62b2-7b43-9faa-e38f8227696f` audited monster combat events and recommended deeper monster attack patterns after the feedback layer is stable.
  - `019f2f33-9a41-7d41-b922-ec943673376e` audited UI/CSS and found enemy skill VFX existed, but target-side feedback was still generic across trash, elite, and boss skills.
- Added RED coverage:
  - `src/tests/app-integration.test.ts` requires every tick of sustained boss `taotie-flame-breath` to render player hit motion, boss skill VFX metadata, total hit count, VFX cue, and skill-specific target feedback.
  - `src/tests/ui-smoke.test.ts` requires trash, elite, and boss monster skill feedback to carry `combat-feedback-skill-*` classes and verifies dedicated CSS selectors/keyframes.
- RED evidence:
  - Focused tests initially failed because feedback rendered as `combat-feedback combat-feedback-hit|miss` without a skill-specific class, and CSS lacked dedicated ash/zheng/taotie feedback hooks.
- Implemented:
  - Enemy target-side feedback now includes `combat-feedback-skill-${skillId}` and `data-player-feedback-cue`, preserving the real combat event source.
  - Added `ash-ember-spit` projectile trail styling, `zheng-shockwave` impact-ring expansion, and separate `ash-ember`, `zheng-shock`, and `taotie-breath` hit-feedback animations.
  - Code review follow-up found trash/elite feedback initially differed only by color while inheriting the generic hit animation. Added RED smoke coverage for `ash-ember-hit-feedback` and `zheng-shock-hit-feedback`, then implemented both animations.
- Verification so far:
  - `npm test -- src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 85 tests.
  - Browser DOM/computed-style validation on `http://127.0.0.1:5174/.codex-local/tmp/monster-feedback-check.html`: confirmed 3 combat panels, 3 feedback nodes, `ash-ember-spit-trail`, `ash-ember-hit-feedback`, `zheng-shockwave-expand`, `zheng-shock-hit-feedback`, `taotie-breath-flow`, `taotie-breath-hit-feedback`, boss total hits `3`, cue `taotie-flame-breath-sustain`, and player hit animation `player-hurt-react`.
  - Browser console error log: empty.
  - Browser screenshot saved at `.codex-local/tmp/monster-feedback-check.png`.

## Task 56 Ash Crawler Burst Monster Pattern
- Started after user clarified that lightweight character/monster model detail is acceptable for the prototype, but combat action smoothness, model-following attack movement, hit feel, skill effects, and monster skill effects are strict requirements.
- Used two read-only parallel agents:
  - `019f2f43-d4d8-7731-bef4-b059e8a8f221` audited monster combat state and recommended adding persistent `attackProfileId` while keeping `attackSkillId` as active cast state.
  - `019f2f44-089c-7821-a6f2-5d54a974a72b` audited UI/CSS hooks and identified the required crawler-burst DOM classes, telegraph shape, VFX selectors, and keyframes.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires normal trash rooms to mix attack profiles, crawler enemies to rush into close range before impact, lane sidestep to produce a miss, and stagger to cancel the pending explosion.
  - `src/tests/app-integration.test.ts` requires crawler windup/active rendering with attack skill id, circle telegraph, active explosion cue, player hurt motion, and skill-specific feedback.
  - `src/tests/ui-smoke.test.ts` requires static render coverage plus dedicated crawler-burst CSS selectors/keyframes.
- RED evidence:
  - Focused tests initially failed because only the existing trash projectile profile existed, crawler rush/hit/miss/interruption behavior was absent, and UI/CSS had no `ash-crawler-burst` presentation.
- Implemented:
  - Added `EnemyAttackProfileId` and persistent `attackProfileId` on `CombatEnemy`.
  - Added close-range `ash-crawler-burst` attack definition with windup rush, short range, circle telegraph, explosion VFX cue, heavy player feedback, and stagger interruption through existing attack clearing.
  - Updated normal room enemy creation to mix one ranged trash enemy and one crawler burst enemy.
  - Added dedicated UI labels, telegraph shape, enemy model lunge animation, explosion ring/core/trail VFX, and hit/miss feedback styling.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts`: pass, 61 tests.
  - `npm test -- src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 86 tests.
  - Browser DOM/computed-style validation on `http://127.0.0.1:5174/.codex-local/tmp/crawler-burst-check.html`: confirmed 3 panels, windup `ash-crawler-burst` circle telegraph, enemy animation `monster-ash-crawler-burst`, active cue `ash-crawler-burst-explode`, ring/core/trail animations, hit feedback animation, player hurt animation, and miss feedback.
  - Browser screenshot saved at `.codex-local/tmp/crawler-burst-check.png`.
- Code review follow-up:
  - Read-only review found no Critical or Important issues.
  - Minor follow-up converted crawler rush from an instant windup-start coordinate jump into windup-time interpolated movement using stored rush start/target positions.
  - Added app integration coverage for `combat-feedback-miss combat-feedback-skill-ash-crawler-burst`.
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts`: pass, 121 tests.
  - Browser DOM/computed-style re-validation after the rush interpolation change confirmed crawler windup/active/miss panels, circle telegraph, `monster-ash-crawler-burst`, `ash-crawler-burst-explode`, hit/miss feedback classes, player hurt animation, and active core animation.
  - Final `npm test`: pass, 13 files and 244 tests.
  - Final `npm run build`: pass.
  - Final `git diff --check`: pass with Windows line-ending warnings only.

## Task 57 Zheng Horn Charge Elite Pattern
- Started from the remaining monster-pattern gap: elite and boss tiers still needed alternate archetypes beyond one skill per tier. This slice targets elite monsters first.
- Used two read-only parallel agents:
  - `019f308e-6dbe-73c0-ae37-b06966c3a9de` audited combat state and found non-trash `attackProfileId` was ignored, so elite alternate profiles could not work.
  - `019f308e-9ba6-7a21-8292-dd1db08342df` audited UI/CSS and identified the exact `enemySkillEffect`, line telegraph, VFX, and feedback hooks for `zheng-horn-charge`.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires elite rooms to spawn `zheng-shockwave`, `zheng-horn-charge`, and a trash minion.
  - `src/tests/combat.test.ts` requires `zheng-horn-charge` to wind up, rush across the line lane, hit on the impact frame, miss when sidestepped, and cancel when staggered mid-rush.
  - `src/tests/ui-smoke.test.ts` requires line telegraph, active VFX cue, hit feedback class, and dedicated CSS selectors/keyframes for `zheng-horn-charge`.
- RED evidence:
  - `npm test -- src/tests/combat.test.ts src/tests/ui-smoke.test.ts` initially failed 5 tests because the elite room lacked the new profile and the patched elite attack still rendered/resolved as `zheng-shockwave`.
- Implemented:
  - Added `zheng-horn-charge` to `EnemyAttackProfileId` and `CombatEnemyVfxCue`.
  - Added profile-kind validation so elite and boss profiles can use `attackProfileId` while active `attackSkillId` still locks the already-started attack definition.
  - Added the elite line-rush attack definition, elite room profile mix, display name `雷角狰`, and independent UI/CSS for model motion, line telegraph, electric impact VFX, and hit/miss feedback.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/ui-smoke.test.ts`: pass, 92 tests.
  - Browser DOM/computed-style validation on `http://127.0.0.1:5174/.codex-local/tmp/zheng-horn-charge-check.html`: confirmed 3 panels, line windup telegraph, enemy animation `monster-zheng-horn-charge`, active cue `zheng-horn-charge-impact`, ring/core/trail animations, hit and miss feedback animations, and player hurt animation.
  - Browser screenshot saved at `.codex-local/tmp/zheng-horn-charge-check.png`.
- Code review follow-up:
  - Read-only review found no Critical or Important issues.
  - Minor coverage follow-up added UI smoke coverage for the real elite room rendering two elite actors (`窑巷卫士`, `雷角狰`) plus one trash minion.
  - `npm test -- src/tests/combat.test.ts src/tests/ui-smoke.test.ts`: pass, 93 tests.
  - Final `npm test`: pass, 13 files and 249 tests.
  - Final `npm run build`: pass.
  - Final `git diff --check`: pass with Windows line-ending warnings only.

## Task 58 Taotie Devour Boss Pattern
- Started from the remaining monster-pattern gap: boss tier still had only `taotie-flame-breath` and needed another Shan Hai Jing style attack archetype with real movement and VFX.
- Used two read-only parallel agents:
  - `019f309a-9eac-7280-bbbe-cbf972ada840` audited boss combat logic and recommended a second boss profile with pattern rotation plus player pull behavior.
  - `019f309a-ccdb-7041-b452-4f5981cc1b25` audited UI/CSS and found the boss fallback in `enemySkillEffect()` would swallow new boss skills unless exact-matched before `enemy.kind === "boss"`.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires boss enemies to carry alternating `taotie-flame-breath` / `taotie-devour-pull` patterns.
  - `src/tests/combat.test.ts` requires `taotie-devour-pull` to pull the player during windup, resolve a close bite hit, miss after lane sidestep, and clear pull anchors when staggered.
  - `src/tests/app-integration.test.ts` requires reducer-rendered devour windup/active DOM to avoid flame fallback and show player hit motion.
  - `src/tests/ui-smoke.test.ts` requires devour telegraph, VFX cue, feedback class, and dedicated CSS selectors/keyframes.
- RED evidence:
  - Focused tests initially failed because boss `attackPatternIds` were undefined, devour patches resolved/rendered as `taotie-flame-breath`, player X was not pulled, and devour CSS did not exist.
- Implemented:
  - Added `taotie-devour-pull` to `EnemyAttackProfileId`, `taotie-devour-bite` to enemy VFX cues, and `player-hurt-devoured` feedback.
  - Added boss pattern rotation while preserving active `attackSkillId` priority so a flame breath cast cannot change mid-attack.
  - Added windup pull anchors and smooth horizontal player pull during windup; vertical movement remains player-controlled so sidestep can miss.
  - Added dedicated UI label, circle telegraph shape, model animation selector, vortex telegraph, bite VFX, and hit/miss feedback styling.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 158 tests.
  - Browser DOM/computed-style validation on `http://127.0.0.1:5174/.codex-local/tmp/taotie-devour-check.html`: confirmed 3 panels, windup `taotie-devour-pull` circle telegraph, no flame fallback, enemy animation `monster-taotie-devour-pull`, telegraph animations `taotie-devour-pull-telegraph` / `taotie-devour-pull-telegraph-edge`, active cue `taotie-devour-bite`, ring/core/trail animations `taotie-devour-vortex-ring` / `taotie-devour-vortex-core` / `taotie-devour-vortex-trail`, player `player-hurt-react`, hit feedback `taotie-devour-hit-feedback`, and miss feedback `taotie-devour-miss-feedback`.
  - Browser screenshot saved at `.codex-local/tmp/taotie-devour-check.png`.
  - Browser tool note: `waitForLoadState` does not support `networkidle`; switched to supported `load` state for validation.
- Code review follow-up:
  - Read-only review found three Important timing gaps: a large tick could skip windup pull before bite, delayed player skill effects could cross the devour bite without first applying windup pull, and dead enemies with stale pull anchors could keep pulling the player.
  - Added RED regression coverage for all three cases. Initial `npm test -- src/tests/combat.test.ts` failed with missing player pull/player-hit and stale dead-boss pull.
  - Implemented shared `advanceEnemyWindupState()` with clamped pull sampling at `Math.min(elapsedMs, attackImpactAtMs)`, reused it in normal enemy ticks and delayed-effect pre-resolution, and skipped windup movement for dead enemies.
  - `npm test -- src/tests/combat.test.ts`: pass, 73 tests.
  - Final `npm test`: pass, 13 files and 258 tests.
  - Final `npm run build`: pass.
  - Final `git diff --check`: pass with Windows line-ending warnings only.

## Task 59 Taotie Forge Collapse Boss Phase
- Started after user clarified that simpler character/monster modeling is acceptable only for near-term model fidelity; combat motion smoothness, skill effects, monster effects, and hit feedback remain strict.
- Used two read-only parallel agents:
  - `019f30ac-f03c-72d2-989d-5c3e404e116f` audited combat insertion points and recommended separate boss-phase / arena-hazard events rather than overloading enemy attack profiles.
  - `019f30ad-1600-7791-9c8f-1da1161fbc0a` audited UI/CSS insertion points and recommended an independent arena hazard layer instead of enemy-anchored skill VFX.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires Taotie to enter phase 2 once at half HP, emit a phase event, schedule three forge-collapse hazards, and resolve hit/miss only at the hazard impact frame.
  - `src/tests/app-integration.test.ts` requires reducer-rendered phase DOM, boss phase VFX, arena hazard telegraphs, active impact feedback, and no flame-breath fallback.
  - `src/tests/ui-smoke.test.ts` requires boss phase DOM, hazard DOM, and dedicated CSS/keyframes.
- RED evidence:
  - Focused tests initially failed because boss phase was undefined, no forge-collapse hazard events existed, and UI lacked phase/hazard DOM.
- Implemented:
  - Added `CombatBossPhaseEvent`, `CombatArenaHazardEvent`, and `scheduledArenaHazards`.
  - Added half-HP Taotie phase transition that interrupts current boss casts, delays the next attack, and schedules three arena hazards.
  - Added hazard impact resolution with active/miss events, player HP damage, hurt lock, hitstop, knockback, and `player-hurt-forge-collapse` feedback.
  - Added `data-boss-phase`, `data-boss-enraged`, `data-arena-danger`, `data-arena-hazard-layer`, phase-burst VFX, and forge-collapse hazard rendering.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 166 tests.
  - Browser DOM/computed-style validation on `http://127.0.0.1:5174/.codex-local/tmp/taotie-forge-collapse-check.html`: confirmed phase events `1`, hazard telegraphs `3`, active hazard `1`, dodge miss `1`, player hit `1`, dodge hit `0`, boss phase `2`, scheduled hazards `3`, and animations `monster-taotie-forge-enrage`, `taotie-forge-collapse-ring`, `taotie-forge-hazard-telegraph`, `taotie-forge-hazard-drop`, and `taotie-forge-collapse-hit-feedback`.
  - Browser console error log for the current verification page: empty.
  - Browser screenshot saved at `.codex-local/tmp/taotie-forge-collapse-check.png`.
- Code review follow-up:
  - Read-only review found four Important issues: light/heavy reward detection used the final event after phase/hazard events, hazard impacts used frame-end player position on large ticks, defeated runs could retain scheduled hazards and stale arena-danger UI, and reflect-triggered phase events used frame-end time instead of the real reflect hit frame.
  - Added regression coverage for all four cases. Initial focused tests failed on hit rewards, impact-frame sampling, failed-run queue clearing, reflect phase timing, and failed UI hazard rendering.
  - Implemented `actionAddedHitEvent()` for player action rewards, `CombatMovementSample` impact-frame hazard sampling, failed-run pending-effect cleanup, failed UI hazard suppression, and reflect `phaseTransitionAtMs` propagation.
  - `npm test -- src/tests/combat.test.ts src/tests/ui-smoke.test.ts src/tests/app-integration.test.ts`: pass, 171 tests.
  - Browser re-validation confirmed phase scene `data-arena-hazard-count="3"`, hit/miss panels, and dedicated animation names with no current-page console errors.
  - Final `npm test`: pass, 13 files and 267 tests.
  - Final `npm run build`: pass.
  - Final `git diff --check`: pass with Windows line-ending warnings only.
  - Follow-up review found one remaining Important case: reflect could trigger phase on the first pulse of a multi-hit boss attack while later pulses from the same attack still resolved in a large tick.
  - Added a regression assertion to the reflect test and confirmed it failed before the fix.
  - Fixed reflect-triggered phase interruption by breaking the current enemy hit loop when reflected damage kills the boss or crosses into phase 2.
  - `npm test -- src/tests/combat.test.ts -t "reflect damage pushes"`: pass.
  - `npm test -- src/tests/combat.test.ts src/tests/ui-smoke.test.ts src/tests/app-integration.test.ts`: pass, 171 tests.
  - Final post-review `npm test`: pass, 13 files and 267 tests.
  - Final post-review `npm run build`: pass.
  - Final post-review `git diff --check`: pass with Windows line-ending warnings only.

## Task 60 Prism Step Frame Motion
- Started after latest user clarification: model detail may stay lightweight, but combat motion smoothness, model-following attack movement, skill VFX, and monster VFX remain strict.
- Used two read-only parallel agents:
  - `019f317d-c03a-79f2-ae5d-c1ae0b4505b1` audited combat timing and identified instant player dash movement as the largest model-following gap.
  - `019f317d-f90f-77c3-929d-361ba83f776a` audited UI/CSS and identified `black-rain-volley` caster VFX as the next major visual polish gap after movement timing.
- Selected `prism-step` frame-motion first because it directly addresses "model follows action": cast should begin dash motion, mid-frame should be in transit, and impact frame should resolve endpoint hits and target-bound `prism-pierce` VFX.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires `prism-step` to keep the player at the cast x initially, move between start and endpoint mid-frame, delay target damage until the hit frame, sample arena hazards against the dash path, clear dash movement on monster interruption, and release buffered actions before later hazards.
  - `src/tests/app-integration.test.ts` requires reducer-rendered `data-player-skill-move="prism-step"`, no pre-hit target burst, endpoint prism impact bursts, and skill-specific player/weapon/VFX metadata.
  - `src/tests/ui-smoke.test.ts` requires target-bound prism afterimage impacts and CSS hooks for skill movement.
- RED evidence:
  - Focused tests initially failed because `prism-step` teleported to x 344 at cast time and emitted hit events immediately.
  - Review-driven regression tests then failed on four timing gaps: cast-time scheduled hit events, arena hazard sampling inside a large dash frame, stale dash movement after player interruption, and buffer release ordering before later hazards.
- Implemented:
  - Added timed `activeSkillMovement` for player skill movement and sampled it in `stepCombat()` instead of teleporting dash skills at cast time.
  - Changed scheduled enemy hit effects to append `CombatHitEvent` only at `applyAtMs`, preserving cast VFX without premature target damage or target bursts.
  - Split large-frame combat advancement around buffered input release, sampled arena hazards against active skill movement, and cleared active skill movement on monster or arena damage.
  - Added UI hooks for `data-player-skill-move`, movement progress, endpoint x, and CSS polish for the prism dash trail.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts -t "prism-step|arena hazards inside|enemy hit interrupts|buffered actions before"`: pass, 4 tests.
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 174 tests.
  - Final `npm test`: pass, 13 files and 270 tests.
  - Final `npm run build`: pass.
  - `git diff --check`: pass with Windows line-ending warnings only.
  - Browser DOM/computed-style validation on `http://127.0.0.1:5174/.codex-local/tmp/prism-step-frame-motion-check.html`: confirmed x 240 -> 291 -> 344, movement hook present at cast/mid frame, 0 pre-hit prism impacts, 2 endpoint prism impacts, player art animation `player-liuli-step-dash`, prism trail styling, and empty browser console error log.
  - Browser screenshot capture failed with the current in-app browser screenshot API; DOM and computed-style validation still passed.
- Final read-only review follow-up:
  - Agent `019f3198-ebd6-7721-9faf-a04cc15354cb` found two P1 timing issues: earlier hazard/player-hit events could be appended after later scheduled skill hits in a large frame, and player interruption cleared dash movement without clearing pending prism hits.
  - Added RED assertions requiring arena-hazard interruption at 82 ms to cancel 165/193 ms prism hits, preserve enemy HP, and requiring enemy-hit interruption to prevent later queued prism hits.
  - Implemented time-ordered mixed scheduled-effect resolution for due arena hazards and enemy hit effects, plus active-skill interruption cancellation for pending scheduled hit effects.
  - `npm test -- src/tests/combat.test.ts -t "arena hazards inside|enemy hit interrupts"`: failed before the fix, passed after the fix.
  - `npm test -- src/tests/combat.test.ts -t "prism-step|mountain-crack-hammer|mechanism-shadow-net|night marks"`: pass, 7 tests.
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 174 tests.
  - Final post-review `npm test`: pass, 13 files and 270 tests.
  - Final post-review `npm run build`: pass.
  - Final post-review `git diff --check`: pass with Windows line-ending warnings only.

## Task 61 Black Rain Volley Caster VFX
- Started after user clarified the current priority split: character models may remain simpler while the playable loop is built, but combat action flow, skill effects, and model-following attack motion must stay strict.
- Used two read-only parallel agents:
  - `019f31a3-7af4-7b21-a866-18601dcd9e36` audited combat timing and found `black-rain-volley` had staggered repeat hits but no hit-phase/VFX metadata.
  - `019f31a3-a20d-7021-a9db-a3cf5e0010e3` audited UI/CSS and found catalog DOM hooks existed for `ink-volley`, `rain-volley`, and `black-rain`, but CSS lacked dedicated caster, weapon, and cast-field animations.
- Added RED coverage:
  - `src/tests/combat.test.ts` requires `black-rain-volley` to emit three distinct repeat hit timings with `rain` phase, `black-rain-fall` VFX cue, and a 300 ms VFX window.
  - `src/tests/ui-smoke.test.ts` requires dedicated player, weapon, cast, and impact animation hooks for black rain volley.
- RED evidence:
  - Focused tests initially failed because repeat hits had no `hitPhase`, no `vfxCue`, and CSS did not define the dedicated black-rain caster/weapon/cast animations.
- Implemented:
  - Added repeat-hit presentation metadata for `black-rain-volley` without changing the generic repeat-hit timing for other skills.
  - Added player `player-ink-volley-cast`, weapon `weapon-rain-volley`, and black-rain cast core/ring/streak animations.
- Verification so far:
  - `npm test -- src/tests/combat.test.ts src/tests/ui-smoke.test.ts -t "volley skills|black rain volley"`: pass, 2 tests.
  - `npm test -- src/tests/app-integration.test.ts -t "skill-specific impact bursts"`: pass, 1 test.
  - Browser DOM/computed-style validation on `http://127.0.0.1:5174/.codex-local/tmp/black-rain-volley-cast-check.html`: confirmed `activeSkillId=black-rain-volley`, player animation `player-ink-volley-cast`, weapon animation `weapon-rain-volley`, cast animations `black-rain-cast-core`, `black-rain-cast-ring`, and `black-rain-cast-streaks`, first-wave 2 impacts, final-wave 6 impacts, and final target bursts with `black-rain-fall` cue plus `rain` phase.
  - Browser console error log for the current verification page: empty.
  - `npm test -- src/tests/combat.test.ts src/tests/app-integration.test.ts src/tests/ui-smoke.test.ts`: pass, 175 tests.
  - Final `npm test`: pass, 13 files and 271 tests.
  - Final `npm run build`: pass.
  - Final `git diff --check`: pass with Windows line-ending warnings only.
- Code review follow-up:
  - Read-only review found no P0/P1 issues and one P2 coverage gap: black-rain runtime DOM attrs for caster metadata and target hit cue/phase were not asserted.
  - Added app integration assertions for `data-active-skill-id`, `ink-volley`, `rain-volley`, `black-rain`, `black-rain-volley`, `black-rain-fall`, and `rain`.
  - `npm test -- src/tests/app-integration.test.ts -t "skill-specific impact bursts"`: pass.
