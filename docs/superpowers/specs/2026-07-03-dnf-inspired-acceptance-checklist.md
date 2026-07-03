# DNF-Inspired Prototype Acceptance Checklist

Date: 2026-07-03

Purpose: convert the approved design into verifiable completion criteria. This is not an implementation plan. It is the audit checklist to use before claiming the game is done.

## Scope
- Build an offline, single-player, browser-playable side-scrolling action RPG inspired by Dungeon Fighter Online.
- Use original names, visuals, music, data, UI, and gameplay content.
- Do not copy DNF assets, music, maps, character silhouettes, text, or exact data.

## Must-Have Gameplay
- Player can start in `炉山市集`.
- Player can enter `灰窑巷`.
- Player can enter `琉璃熔炉`.
- Player can clear a full dungeon run and return to town.
- Player can fight mobs, elite enemies, and a boss.
- Combat includes hitstop, knockback, screen shake, hit reactions, readable telegraphs, and cooldown/resource HUD.
- Player can perform a normal combo and cancel into at least one skill.
- `烬拳卫` has 6 active skills with visible VFX and gameplay differences.

## Must-Have Visuals
- Player character is detailed, not a placeholder or block figure.
- Player has battle art and town/portrait art.
- Main character art matches costume/shop thumbnails and VFX palette.
- Town uses detailed 中国风幻想工业 environment art.
- Dungeon backgrounds have foreground, midground, background, lighting, material detail, and readable combat lanes.
- Final playable version does not rely on plain color backgrounds or test rectangles.

## Must-Have Audio
- BGM exists for town, dungeon 1, dungeon 2, and boss.
- Combat SFX supports light hit, heavy hit, guard/armor spark, launcher, slam, skill burst, boss armor break.
- Economy SFX exists for loot, reinforce, amplify, protection ticket, shop purchase, and random box.
- Master/music/SFX volume controls work.
- Audio is original, generated, or properly licensed; no copyrighted copied tracks.

## Must-Have Story and Quest Mode
- Game includes working title `烬璃纪元`.
- Main story includes prologue, chapter 1, chapter 2, and epilogue hook.
- Quest log is visible in town or pause menu.
- Active objective tracker works in dungeon.
- Quest objectives update from combat, loot, trade, shop, reinforcement, and amplification events.
- Main quests unlock systems in sequence.
- Quest state persists after reload.

## Must-Have Economy
- Gold, Valor Tokens, and Trade Credits exist and are used by distinct systems.
- Inventory has gear, materials, consumables, costumes, and boxes.
- Items can be equipped, compared, sold, dismantled, locked, or used where relevant.
- Personal NPC trade simulation works.
- Auction house simulation supports listing, suggested price, recent prices, demand state, fees, and sale resolution after dungeon return.
- Shop supports costumes, gift packs, protection tickets, materials, and random boxes.
- Random boxes display rates before opening and track pity/history.
- No real-money purchase hook exists.

## Must-Have Gear and Builds
- Equipment has levels from 1 to 50.
- Equipment rarities include Common, Uncommon, Rare, Epic, and Mythic.
- At least 60 gear items exist in first playable content.
- At least 5 Epic sets exist:
  - `烬火宗匠`
  - `流光琉璃`
  - `窑影行者`
  - `镇山玄甲`
  - `市风游商`
- Set bonuses activate at 2-piece, 3-piece, and 5-piece thresholds.
- Mixed builds such as 2+3 are supported.
- At least 3 saved loadouts work.
- At least 4 distinct build archetypes can clear `琉璃熔炉`.

## Must-Have Upgrade Systems
- Reinforcement supports `+0` to `+12`.
- Reinforcement consumes Gold and Iron Dust.
- Reinforcement failure behavior changes by level band.
- Amplification supports `Amp +0` to `Amp +5`.
- Amplification requires Echo Slot gear and consumes Gold and Arc Shards.
- Amplification adds special stats and has stronger risk/cost than reinforcement.
- Protection tickets can prevent risky failure penalties while still consuming materials.

## Must-Have Save and Runtime
- Local save restores player stats, currency, inventory, equipment, costume, quest state, shop limits, auction state, and settings.
- Reset-save action has confirmation.
- Game runs locally without server dependency for gameplay.
- Dev server or static entry is documented.
- Project-local runtime/cache/dependency folders are used when feasible.

## Verification Before Completion
- Run available tests/lint/build.
- Launch game locally.
- Verify in browser with screenshots or equivalent visual checks.
- Verify gameplay loop from town to dungeon to loot to town.
- Verify at least one save/reload cycle.
- Verify no placeholder player/environment art remains in final playable delivery.
- Verify GitHub remote state if push is requested.
