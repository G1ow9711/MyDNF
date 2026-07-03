# DNF-Inspired Hybrid Action RPG Design

Date: 2026-07-03

## Goal
Build a playable offline side-scrolling action RPG prototype inspired by Dungeon Fighter Online's arcade brawler structure and RPG economy, while using original names, visuals, data, and mechanics. First version must feel playable, not just a tech demo.

## Source-Informed References
- Official DFO equipment guide: reinforcement, refinement, amplification, failure penalties, and protection items.
- Official trading and auction guide: personal trade, auction registration, recent-price context, mail delivery, loot auction ideas.
- Official avatar and CERA guides: cosmetic avatar pieces, shop items, package sales, account-bound/tradable concepts.
- DFO gameplay overview: 2D room-by-room brawler flow, hotkey skills, optional command input, cancelable skills.

This design adapts system patterns only. It must not copy DFO art, names, maps, sounds, skill icons, UI, text, or data.

## Selected Approach
Approach B: Hybrid Playable RPG.

First playable target:
- Browser-playable local game.
- One original class.
- Two dungeons and one town hub.
- Real-time combat with combo canceling, flashy skills, hitstop, knockback, and screen shake.
- Loot, inventory, trading, auction simulation, reinforcement, amplification, shop, costumes, gift packs, random boxes, and local save.
- Character art direction: refined 2D action illustration by default.
- Environment direction: Chinese-style interactive town scene with realistic 2.5D dungeon scene plates.

## Player Fantasy
The first class is `Ember Warden`, an original gauntlet fighter using heat, sparks, pressure waves, and impact bursts. The class is readable, high-impact, and easy to animate with generated shapes and particle effects.

Resource:
- `Heat`, max 100.
- Normal attacks and some skills build Heat.
- Strong skills spend Heat.
- Ultimate consumes high Heat for a larger effect.

## Character Visual Standard
Character presentation is a hard quality requirement. The player character must not look like a placeholder, simple block figure, or flat icon.

Required character assets:
- High-detail character concept art for `Ember Warden`.
- Full-body town portrait with refined costume, face, hair, gauntlets, cloth folds, metal highlights, and readable silhouette.
- Battle sprite or sprite-sheet derived from the same design.
- Animation states: idle, run, dash, light chain, heavy finisher, launcher, 6 skills, hit, down, victory, and town idle.
- Costume layers for Head, Body, Legs, Back, and Weapon Skin. These should visibly change the character instead of only changing stats.
- Visual consistency between portrait, battle sprite, skill VFX colors, and costume shop thumbnails.

Art direction:
- Stylized 2D fantasy action, high-detail but still readable at gameplay scale.
- Strong silhouette: oversized ember gauntlets, short battle coat, heat vents, glowing seams, and asymmetric shoulder/arm design.
- Palette: charcoal, steel, ember orange, hot white highlights, limited cyan sparks for contrast.
- Avoid copying DFO character silhouettes, costumes, avatars, or weapon designs.
- Default selected style: refined 2D action illustration. This supports detailed portrait, polished battle sprite, and visible costume variants without the production cost of full 3D.

Implementation expectation:
- Use generated or hand-authored bitmap assets, not pure CSS boxes, for final playable character visuals.
- If generated assets are used, keep them in the project under `assets/characters/ember-warden/`.
- Use temporary placeholder shapes only during early mechanical testing; final delivery must replace them with detailed character imagery before claiming completion.

## Environment Visual Standard
Environment presentation is also a hard quality requirement. Dungeons and town must look real, layered, and atmospheric, not like flat test boxes.

Required environment assets:
- Detailed 2.5D battlefield backgrounds for each dungeon.
- Foreground, midground, and background layers for parallax.
- Ground plane with readable lane depth and collision-safe combat space.
- Realistic material detail: stone, scorched metal, cracked glass, ash, glowing furnace vents, dust, smoke, sparks, and reflected heat.
- Lighting model baked into art: rim light, warm/cool contrast, local glows, shadows under characters, and fog/atmosphere depth.
- Town hub background with believable architecture, shop stalls, smith forge, auction board, costume display, and dungeon gate.

Art direction:
- Overall map style: Chinese fantasy-industrial, not generic western fantasy.
- Architectural language: tiled roofs, carved wooden beams, stone archways, courtyard walls, hanging lanterns, bronze fixtures, paper talismans, ink-wash distant mountains, bamboo/old pines, worn stone slabs, glazed ceramic details, and furnace glow.
- `Cinder Kiln Alley`: abandoned kiln district, broken grey tiles, collapsed courtyard walls, ash-covered stone lions, ember pockets, blue night rim light, drifting ash.
- `Liuli Furnace`: molten-glass and weapon-forge complex, glowing crucibles, hanging bronze chains, glazed-tile reflections, heat distortion, red lanterns, smoke vents, bright skill-friendly silhouettes.
- Town hub: compact Chinese-style fantasy-industrial market plaza, forge courtyard, auction notice wall, costume pavilion with mannequins, tea-house style shop, and dungeon gate.
- Selected emphasis: interactive town scene. The town should feel like a real place with clickable system hotspots, not a static menu.

Implementation expectation:
- First implementation may use generated bitmap scene plates with depth layers, then animate particles and lighting in code.
- If 3D elements are introduced, use them as rendered or lightweight Three.js environment layers while preserving DNF-like 2.5D combat readability.
- Final playable delivery must not claim completion with plain color backgrounds, placeholder rectangles, or unlit test arenas.
- Environment art must preserve gameplay readability: enemies, player, hit VFX, and loot must remain visible against the scene.

## Core Game Loop
1. Start in town hub.
2. Enter dungeon.
3. Clear rooms, mobs, elite, and boss.
4. Receive gold, gear, materials, costume shards, and shop tokens.
5. Return to town.
6. Sell, dismantle, trade, auction, reinforce, amplify, buy shop items, equip costumes.
7. Re-enter harder dungeon tier for better drops and score.

Run length target: 5-8 minutes for a complete dungeon.

## Story and Quest Mode
The game needs a story-task mode, not only free dungeon runs. Story mode gives purpose to combat, unlocks systems gradually, and makes the town feel alive.

Premise:
- Working display title: `烬璃纪元`.
- The forge-market town was built around an ancient liuli furnace that powered weapons, trade, and avatar craft.
- The furnace cracked after an underground heat surge. Kiln districts collapsed, monsters appeared, and trade routes stopped.
- The player, `Ember Warden`, is a heat-gauntlet fighter hired by the town guild to recover furnace cores, reopen trade, and uncover who is corrupting the liuli furnace.

Main story structure for first version:
1. Prologue: town intro, movement/combat tutorial, meet smith and auction keeper.
2. Chapter 1: `Cinder Kiln Alley`.
   - Investigate abandoned kiln street.
   - Rescue trader NPC.
   - Defeat elite guard monster.
   - Unlock reinforcement and personal trade simulation.
3. Chapter 2: `Liuli Furnace`.
   - Enter furnace complex.
   - Collect Arc Shards.
   - Break boss armor and recover first furnace core.
   - Unlock amplification, auction house simulation, and costume pavilion.
4. Epilogue hook:
   - Boss drops corrupted liuli mark.
   - Town NPC hints at deeper furnace layer for future update.

Quest categories:
- Main Quests: one-time story progression, unlock systems and dungeons.
- Side Contracts: NPC requests, material collection, enemy kill goals, trade delivery.
- Smith Commissions: reinforce/amplify tutorial and material sink.
- Market Orders: list or sell items through trade/auction simulation.
- Costume Tasks: collect Tailor Marks, unlock first outfit, preview shop loop.
- Challenge Missions: clear dungeon under time, no potion, combo score, boss stagger count.
- Repeatable Bounties: offline-friendly rotating tasks after each dungeon clear.

Quest UI:
- Quest log accessible in town and pause menu.
- Active objective tracker in dungeon HUD.
- Dialogue panels should be short and skippable.
- Completed quests claim rewards from quest log or mailbox.
- Story scenes use character portraits and environment backdrop, not long text walls.

Rewards:
- Main quests unlock systems and give key gear.
- Side contracts give Gold, materials, Valor Tokens, and boxes.
- Challenge missions give titles/cosmetic VFX, not mandatory power.
- Repeatables keep endgame loop alive without real-time daily mechanics.

Implementation expectation:
- Quest definitions should be data-driven.
- Quest progress should hook into combat events, loot events, shop purchases, reinforcement/amplification results, and auction/trade events.
- Story mode must remain playable offline and save progress locally.

## Controls
Keyboard:
- `WASD`: move in 2.5D belt-scroll arena.
- `J`: light attack.
- `K`: heavy attack.
- `Shift`: dash, 220 ms movement, 450 ms cooldown.
- `U/I/O/L`: active skills.
- `Space`: special or ultimate.
- `H`: potion/debug heal in prototype.
- `Esc`: pause/menu.

Gamepad later:
- Left stick or D-pad move.
- `X`: light.
- `Y`: heavy.
- `A`: dash.
- Shoulder/trigger buttons: skills.
- `B`: ultimate.

## Combat Design
Movement:
- 2.5D belt-scroll arena with left/right movement and shallow up/down lane movement.
- No fall pits in first version.
- Player faces latest movement or attack direction.
- Soft wall clamp at room bounds.

Base combo:
- `Light -> Light -> Heavy -> Launcher`.
- `J` chains 3 light attacks.
- `K` executes heavy finisher, knockdown, or launcher depending on chain state.

Cancel rules:
- Normal attacks can cancel into skills during 80-180 ms after confirmed impact.
- Skills can cancel out of dash and final normal hit.
- Each skill adds about 0.8 s local cancel lockout to prevent infinite loops.
- Airborne enemies get reduced hitstun after 3 juggles.
- Downed enemies can only be hit by slam-tagged skills.

Impact tuning:
- Light hitstop: 35-45 ms on attacker and target.
- Heavy hitstop: 70 ms.
- Skill hitstop: 55-90 ms.
- Boss armor hitstop: about 25 ms.
- Light screenshake: 1-2 px for 80 ms.
- Heavy screenshake: 4 px for 120 ms.
- Big skill screenshake: 6-10 px for 160 ms.
- UI layer never shakes.
- Light knockback: 16-28 px.
- Heavy knockback: about 60 px.
- Launcher: vertical arc plus 40 px backward movement.
- Elite/boss wall bounce max once per combo.

## First Class Skills
1. `Spark Jab`
   - Fast forward punch.
   - 3 small hits.
   - Good combo starter.
   - Builds 12 Heat.

2. `Cinder Upper`
   - Rising uppercut launcher.
   - Cancel target from light chain.
   - Anti-crowd vertical hitbox.
   - Builds 8 Heat.

3. `Furnace Step`
   - Dash-through shoulder burst.
   - Small invulnerability during first 100 ms.
   - Spends 15 Heat for flame trail.

4. `Anvil Crash`
   - Overhead slam.
   - Hits downed enemies.
   - Big hitstop and ground crack effect.
   - Spends 25 Heat.

5. `Heat Bloom`
   - Radial burst around player.
   - Pulls small enemies inward and pops them up.
   - Panic button.
   - Spends 35 Heat.

6. `Meteor Knuckle`
   - Short charge super punch.
   - Hold up to 700 ms.
   - At 70+ Heat, consumes all Heat for cone blast, boss stagger, and large flash.

## Enemy Design
Trash:
- `Rust Imp`: rushes, single swipe, low HP.
- `Shard Archer`: keeps lane distance, fires slow projectile.
- `Bulwark Guard`: shield front, weak from rear or launcher.
- `Crawler Bomb`: runs in, flashes, explodes after delay.

Elite:
- Has armor meter.
- Armor blocks launcher until broken.
- Uses telegraphed lane attack.
- Drops higher Heat orbs and better material chance.

Boss:
- Three HP phases.
- Phase 1: slow slams and trash summon.
- Phase 2: lane-wide charge and projectile fan.
- Phase 3: armor pulse plus punish window after missed big attack.
- Target: boss staggers every 20-25 seconds when player plays well.

## Dungeons
Dungeon 1: `Cinder Kiln Alley`
- Short training dungeon.
- 3 rooms plus elite.
- Teaches lanes, dash, light/heavy chain, and first two skills.
- Drops common gear, Iron Dust, Gold, and low-tier consumables.
- Visual target: Chinese-style abandoned kiln alley with grey tiled roofs, ruined courtyard walls, ash heaps, ember pockets, cold blue rim light, drifting particles, and readable lane floor.

Dungeon 2: `Liuli Furnace`
- Full first version dungeon.
- 5 rooms plus boss.
- Uses all trash types and one elite.
- Boss drops one meaningful item every clear.
- Drops Arc Shards, costume shards, random boxes, and rare gear.
- Visual target: Chinese-style molten-glass and forge complex with glowing crucibles, glazed-tile reflections, smoke plumes, bronze chains, heat shimmer, lantern light, and boss arena depth.

## Town Hub
Town hub is the non-combat ecosystem screen.

Areas:
- Dungeon gate.
- Inventory and equipment.
- Smith: reinforcement, amplification, dismantle.
- NPC trade board.
- Auction house simulation.
- Shop.
- Costume closet.
- Mail/result log.

Navigation should be quick: top tabs or icon rail, no landing page.

Town visual target:
- Real environment plate, not menu-only screen.
- Interactive hotspots map to systems.
- Forge glow for smith, wooden notice wall for auction, mannequin pavilion for costumes, tea-house/shop counter for mall, stone arch/gate for dungeons.
- This is the selected environment emphasis from user choice C.
- Overall town should read as Chinese-style market plaza with fantasy-industrial forge elements.
- NPCs and quest markers should live in the scene: guild steward, smith, auction keeper, tailor, shopkeeper, rescued trader.

## Audio and Background Music
Background music is part of the experience target, not an optional polish item.

Music direction:
- Original or properly licensed music only. Do not use DFO music or other copyrighted tracks.
- Chinese fantasy-industrial style: guzheng, pipa, dizi, low drums, bronze percussion, forge hits, processed synth bass, and heat-like ambient textures.
- Town music: slower loop, warm market ambience, light plucked strings, forge pulse layer near smith area.
- `Cinder Kiln Alley`: tense exploration loop with ash wind, low drum, muted pipa motifs, and cold night ambience.
- `Liuli Furnace`: hotter combat loop with percussion, metallic hits, rising synth, glass shimmer, and furnace rumble.
- Boss music: faster percussion, heavier low end, stronger melody, phase 3 adds extra drum/choir/synth layer.

Adaptive music rules:
- Town idle layer loops continuously.
- Entering system hotspots can crossfade subtle local layers: forge, auction, shop, costume pavilion.
- Dungeon music starts with exploration layer, adds combat layer when enemies spawn, drops intensity after room clear.
- Boss fight has phase-based layers tied to HP thresholds.
- Low HP can add heartbeat or filtered high tension layer, but must not obscure hit SFX.

Sound effects:
- Hit SFX must support combat feel: light hit, heavy hit, guard spark, launcher, slam, skill burst, boss armor break.
- Economy SFX: coin gain, item drop, rare drop, reinforce success/fail, amplify success/fail, protection ticket trigger, shop purchase, random box open.
- UI sounds should be short and restrained to avoid fatigue.

Implementation expectation:
- First playable version can use small loopable original/generated/royalty-free placeholders, but final delivery must include distinct BGM loops for town, dungeon 1, dungeon 2, and boss.
- Audio files belong under `assets/audio/`.
- Provide volume controls for master, music, and SFX.

## Economy
Currencies:
- `Gold`: drops, vendor sales, quest rewards. Used for repair, NPC shop, reinforcement fees, auction listing.
- `Valor Tokens`: earned only by play milestones. Used for costumes, gift packs, protection tickets, and convenience items.
- `Trade Credits`: gained/spent in fake-market NPC trade simulation. Keeps personal trade economy separate.

No real-money currency and no paid-only power.

Loot:
- Rarity: Common, Uncommon, Rare, Epic, Mythic.
- Gear has slot, level, base stats, rarity, random affixes, bind state.
- Materials:
  - `Iron Dust`: reinforcement.
  - `Arc Shards`: amplification.
  - `Seal Wax`: bind/unbind for trade simulation.
  - `Tailor Marks`: costume unlocks.
- Boss always drops one meaningful item: gear, material bundle, box key, or costume shard.

Inventory:
- Tabs: Gear, Materials, Consumables, Costumes, Boxes.
- Item states:
  - Bound: only player usable.
  - Tradable: can enter trade or auction.
  - Sealed: tradable until equipped.
- Quick actions: equip, sell, dismantle, lock, compare.

## Trade and Auction
Personal trade simulation:
- Offline trade with generated NPC adventurers.
- NPC offers rotate after each dungeon.
- Trade screen supports item-for-gold and item-for-item.
- NPC personalities:
  - Collector pays more for rare costumes.
  - Smith buys upgrade materials.
  - Raider buys high-power gear.
- Abuse controls: NPC budget, price sanity range, cooldown after each trade.

Auction house simulation:
- Player lists item for fixed duration.
- NPC demand engine checks category, rarity, stat rolls, and current simulated supply.
- Sale chance resolves after each dungeon return.
- UI shows suggested price, recent simulated prices, and demand state: Low, Normal, Hot.
- Listing fee and sale tax remove Gold from economy.
- Purchased items or auction returns appear in mailbox/result log.

## Reinforcement and Amplification
Reinforcement:
- Cap: `+12` in first version.
- Uses Gold and Iron Dust.
- `+1` to `+6`: no hard fail.
- `+7` to `+10`: fail may drop one level.
- `+11` to `+12`: fail may reset to `+10` unless protected.
- Increases attack or defense only.

Amplification:
- Cap: `Amp +5` in first version.
- Requires item to have an `Echo Slot`.
- Uses Gold and Arc Shards.
- Adds one special stat: crit, skill cooldown, elemental bonus, or move speed.
- Higher risk and cost than reinforcement.
- Only two amplified gear pieces can be active at once in first version to limit runaway power.

Protection Ticket:
- Earned from milestones, rare drops, and Valor Token shop.
- On risky reinforcement/amplification failure:
  - Consumed automatically.
  - Prevents level drop or reset.
  - Still consumes Gold/materials.
- Convenience safety, not exclusive power.

## Shop, Costumes, and Gift Packs
Shop currency:
- Uses Valor Tokens, earned offline.
- Clear any dungeon: small token amount.
- First boss clear per tier: larger token amount.
- Local challenge milestone: largest token amount.

Costumes:
- Original visual pieces only.
- Slots: Head, Body, Legs, Back, Weapon Skin.
- Small utility perks, not core damage:
  - Move speed.
  - Extra inventory row.
  - Larger gold pickup radius.
- Full set bonus should be cosmetic VFX or tiny non-combat perk.
- Challenge scoring can normalize or disable costume power.

Gift packs:
- Bought with Valor Tokens.
- Example pack: costume selector, Iron Dust, protection tickets, random boxes, potions.
- Purchase limits by character or dungeon tier.
- Clear contents shown before purchase.

Random boxes:
- Exact rates shown before opening.
- Opening history shown.
- Pity counter included.
- Example gear cache:
  - Rare gear: 70%.
  - Epic gear: 25%.
  - Mythic gear: 5%.
  - After 20 boxes without Mythic, next box guarantees Mythic.
- Random boxes are earned or bought with gameplay currency only.

## Save System
Use local browser storage in first version.

Saved data:
- Player stats, level, currencies.
- Inventory, equipped gear, costumes.
- Reinforcement/amplification state.
- Auction listings and simulated market seed.
- Shop purchase limits.
- Dungeon clear records and score.
- Settings.

Provide reset-save button with confirmation.

## Technical Shape
Preferred first implementation after approval:
- TypeScript web app.
- Canvas or Phaser-style 2D renderer.
- Data-driven definitions for items, enemies, skills, packs, and dungeons.
- Project-local dependencies/cache only.
- No server required for gameplay; optional local dev server for development.

Main modules:
- `game`: loop, input, scenes, combat, VFX.
- `data`: items, skills, enemies, packs, dungeons, economy tables.
- `systems`: inventory, loot, market, reinforcement, amplification, shop, save.
- `ui`: town panels, HUD, item cards, shop, auction, smith.
- `audio`: BGM playback, adaptive layers, SFX triggers, volume settings.
- `quests`: quest definitions, objective tracking, dialogue state, rewards, unlocks.

## First Playable Content Count
Combat:
- 1 class with high-detail concept art, portrait, and battle sprite/sprite-sheet.
- 6 skills.
- 4 trash enemies.
- 1 elite.
- 1 boss.
- 2 dungeons.
- 2 detailed dungeon environment sets plus detailed town hub environment.
- 4 BGM loops: town, dungeon 1, dungeon 2, boss.
- Core SFX set for combat, loot, economy, shop, and UI feedback.

Economy:
- 30 gear items.
- 20 materials/consumables.
- 8 costumes.
- 4 gift packs.
- 3 random box types.
- 1 personal trade board.
- 1 auction NPC market.
- Reinforcement to `+12`.
- Amplification to `+5`.

Story/quests:
- 2 main chapters plus prologue and epilogue hook.
- 8-12 first-version quests total.
- 5 named NPCs in town.
- Quest tracker, quest log, dialogue panels, and rewards.

## Verification Criteria
Combat:
- Light combo input-to-hit target under 80 ms.
- Hitstop visible but controls do not feel stuck.
- Heavy hit clearly stronger than light through freeze, shake, sound, and enemy motion.
- Player can reliably execute `Light -> Light -> Skill`.
- Enemies react differently: stagger, launch, knockdown, armor spark.
- 5+ enemies can be hit without unreadable visual clutter.
- Boss attacks telegraph before damage frames.
- Skill cooldown/resource state is visible without reading long text.
- One 60-second room has no dead time longer than 2 seconds.

Systems:
- A full run can be completed from town to dungeon to loot to town.
- Player character has detailed visible art in town and battle, not placeholder geometry.
- Dungeon and town environments use detailed scene art or 3D-looking layered plates, not placeholder backgrounds.
- Combat readability remains high against realistic environments.
- Costume changes are visible on the character or represented by polished thumbnails when a full layered sprite is not yet available.
- Distinct BGM plays in town, dungeon, and boss fight; music volume and SFX volume can be adjusted.
- Combat SFX align with hitstop, shake, knockback, reinforcement, amplification, and loot events.
- Main story quests can be completed, unlock systems in sequence, and persist after save reload.
- Quest objectives update from combat, loot, trade, shop, reinforcement, and amplification events.
- Gear can be equipped, compared, sold, dismantled, reinforced, and amplified.
- Auction listing can sell to NPC market simulation after dungeon return.
- Shop purchases deduct Valor Tokens and add correct items.
- Costume equip changes appearance and applies allowed perk.
- Random box rates are visible before opening, and pity counter works.
- Save reload restores player state.

## Out of Scope for First Version
- Online multiplayer.
- Real-player trading.
- Real-money purchase or payment hooks.
- Copying DFO assets, names, UI, maps, sounds, text, or exact data.
- Copying DFO music or other copyrighted music.
- Full multi-class roster.
- Long story campaign.
- Branching dialogue with permanent story consequences.
- PvP.
- Mobile touch support.
- Native desktop installer.

## Open Approval Gate
Approved so far:
- Approach B: Hybrid Playable RPG.
- Environment emphasis C: interactive town scene with realistic environment presentation.
- Map/environment style: Chinese-style fantasy-industrial.

Needs user approval before implementation:
- Browser TypeScript/Canvas direction.
- Original `Ember Warden` class direction and refined 2D action illustration visual style.
- First playable content count and economy scope.

After approval, create detailed implementation plan, then scaffold code.
