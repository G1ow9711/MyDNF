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
