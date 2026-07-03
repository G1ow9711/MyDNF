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
- User replied `C` after environment-art screen; interpreted as selecting interactive town scene emphasis. Character style remains recommended A unless changed.
- User requested Chinese-style maps. Updated environment direction to Chinese fantasy-industrial maps: interactive forge market town, abandoned kiln alley, and liuli furnace dungeon.
- User requested background music consideration. Updated design to include original/licensed Chinese fantasy-industrial BGM, adaptive town/dungeon/boss layers, SFX categories, and audio volume controls.
- User requested story quest mode. Updated design to include `烬璃纪元` premise, prologue, two chapters, epilogue hook, quest categories, quest UI, rewards, and data-driven quest tracking.
- User requested equipment levels, Epic sets, and multiple build archetypes. Updated design to include 12 gear slots, level 1-50 equipment, rarity tiers, 5 Epic sets, 2/3/5 set bonuses, mixed builds, build tags, and 3 saved loadouts.
- User expanded the goal on 2026-07-04: final deliverable needs at least four base classes, class advancement gameplay, and a complete mature shippable version rather than a one-class vertical slice.
- Completion audit found that data/model support is not enough for the user's "可玩性高" requirement; class selection and advancement must also be exposed in the player-facing UI and reducer actions.
- Quest progression must be checked through app actions, not only through pure quest-system tests; reinforcement initially failed this audit until the reducer emitted quest events.
- Economy audit found `Trade Credits` absent even though the acceptance checklist required distinct Gold, Valor Token, and Trade Credit usage; NPC trade now uses `tradeCredit` / `商契`.
- Native browser `confirm` dialogs can block the current in-app browser automation session; reset-save confirmation should be validated primarily through reducer tests plus UI smoke coverage.
- Inventory audit found system helpers for equip/sell/dismantle existed, but the player-facing inventory panel needed direct controls plus lock protection before it satisfied the economy checklist.
- Gear audit found Epic set definitions were present, but active 2/3/5-piece effects and mixed build tags needed explicit evaluation and UI evidence.
- Audio audit found settings sliders existed as static markup; they now read/write `AudioState` through reducer actions.
- Playback audit found audio commands were queued but not rendered; the app now creates procedural WebAudio BGM/SFX from command plans after user interaction, with no-op fallback when WebAudio is unavailable.
- Auction audit found listing fees and sale settlement existed, but recent prices and demand state were absent; market now records sold prices by catalog gear id and derives UI-facing suggested price, fee, and cold/normal/hot demand.
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
